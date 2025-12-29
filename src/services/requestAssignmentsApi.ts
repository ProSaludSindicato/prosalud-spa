import { authenticatedApi } from "./api";
import { getErrorMessage, sanitizeErrorForLogging } from "@/utils/errorSanitizer";
import { logger } from "@/utils/logger";

// Use authenticated API client for request assignments endpoints
const requestAssignmentsApi = authenticatedApi;

// Interfaces basadas en la documentación de la API
export interface RequestAssignmentsResponse {
  assignments: Record<string, string[]>;
  subtype_assignments: Record<string, Record<string, string[]>>;
}

export interface ApiAssignmentsResponse {
  success: boolean;
  data: RequestAssignmentsResponse;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface SaveAssignmentsPayload {
  assignments: Record<string, string[]>;
  subtype_assignments: Record<string, Record<string, string[]>>;
}

/**
 * Mapeo de tipos de solicitud del frontend al backend
 * El frontend usa 'solicitud-microcredito' pero el backend espera 'microcredito'
 */
const mapFrontendToBackendRequestType = (frontendType: string): string => {
  const typeMap: Record<string, string> = {
    'solicitud-microcredito': 'microcredito',
  };
  return typeMap[frontendType] || frontendType;
};

/**
 * Mapeo de tipos de solicitud del backend al frontend
 * El backend devuelve 'microcredito' pero el frontend usa 'solicitud-microcredito'
 */
const mapBackendToFrontendRequestType = (backendType: string): string => {
  const typeMap: Record<string, string> = {
    'microcredito': 'solicitud-microcredito',
  };
  return typeMap[backendType] || backendType;
};

/**
 * Convierte las claves de assignments del frontend al formato del backend
 */
const mapAssignmentsToBackend = (assignments: Record<string, string[]>): Record<string, string[]> => {
  const mapped: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(assignments)) {
    const backendKey = mapFrontendToBackendRequestType(key);
    mapped[backendKey] = value;
  }
  return mapped;
};

/**
 * Convierte las claves de assignments del backend al formato del frontend
 */
const mapAssignmentsToFrontend = (assignments: Record<string, string[]>): Record<string, string[]> => {
  const mapped: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(assignments)) {
    const frontendKey = mapBackendToFrontendRequestType(key);
    mapped[frontendKey] = value;
  }
  return mapped;
};

/**
 * Convierte las claves de subtype_assignments del frontend al formato del backend
 */
const mapSubtypeAssignmentsToBackend = (
    subtypeAssignments: Record<string, Record<string, string[]>>
): Record<string, Record<string, string[]>> => {
  const mapped: Record<string, Record<string, string[]>> = {};
  for (const [requestType, subtypes] of Object.entries(subtypeAssignments)) {
    const backendRequestType = mapFrontendToBackendRequestType(requestType);
    mapped[backendRequestType] = { ...subtypes };
  }
  return mapped;
};

/**
 * Convierte las claves de subtype_assignments del backend al formato del frontend
 */
const mapSubtypeAssignmentsToFrontend = (
    subtypeAssignments: Record<string, Record<string, string[]>>
): Record<string, Record<string, string[]>> => {
  const mapped: Record<string, Record<string, string[]>> = {};
  for (const [requestType, subtypes] of Object.entries(subtypeAssignments)) {
    const frontendRequestType = mapBackendToFrontendRequestType(requestType);
    mapped[frontendRequestType] = { ...subtypes };
  }
  return mapped;
};

/**
 * Maneja errores de la API de asignaciones
 */
const handleApiError = (error: any): never => {
  // Sanitizar error para logging - solo detalles seguros en producción
  const sanitizedError = sanitizeErrorForLogging(error);
  logger.error("Request assignments API error", sanitizedError);

  // Si hay errores de validación, construir mensaje detallado
  if (error.response?.status === 422 && error.response?.data?.errors) {
    const validationErrors = error.response.data.errors;
    const errorMessages = Object.entries(validationErrors)
        .flatMap(([field, messages]) =>
            Array.isArray(messages)
                ? messages.map((msg: string) => `${field}: ${msg}`)
                : [`${field}: ${messages}`]
        )
        .join('\n');
    throw new Error(`Errores de validación:\n${errorMessages}`);
  }

  // Si hay un mensaje de error del servidor
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }

  // Error genérico
  const errorMessage = getErrorMessage(error);
  throw new Error(errorMessage || "Error desconocido en la API de asignaciones");
};

/**
 * Servicio para gestión de asignaciones de solicitudes
 */
export const requestAssignmentsService = {
  /**
   * Obtener todas las asignaciones de solicitudes
   */
  async getAssignments(): Promise<RequestAssignmentsResponse> {
    try {
      logger.debug('Fetching request assignments from API');
      const response = await requestAssignmentsApi.get<ApiAssignmentsResponse>(
          "/api/request-assignments"
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Error al obtener asignaciones");
      }

      logger.debug('Request assignments fetched successfully', {
        assignmentsCount: Object.keys(response.data.data.assignments || {}).length,
        subtypeAssignmentsCount: Object.keys(response.data.data.subtype_assignments || {}).length,
      });

      // Mapear las claves del backend al formato del frontend
      return {
        assignments: mapAssignmentsToFrontend(response.data.data.assignments || {}),
        subtype_assignments: mapSubtypeAssignmentsToFrontend(response.data.data.subtype_assignments || {}),
      };
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  /**
   * Guardar/Actualizar asignaciones de solicitudes
   */
  async saveAssignments(payload: SaveAssignmentsPayload): Promise<RequestAssignmentsResponse> {
    try {
      logger.debug('Saving request assignments', {
        assignmentsCount: Object.keys(payload.assignments || {}).length,
        subtypeAssignmentsCount: Object.keys(payload.subtype_assignments || {}).length,
      });

      // Mapear las claves del frontend al formato del backend antes de enviar
      const backendPayload = {
        assignments: mapAssignmentsToBackend(payload.assignments || {}),
        subtype_assignments: mapSubtypeAssignmentsToBackend(payload.subtype_assignments || {}),
      };

      const response = await requestAssignmentsApi.put<ApiAssignmentsResponse>(
          "/api/request-assignments",
          backendPayload
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Error al guardar asignaciones");
      }

      logger.debug('Request assignments saved successfully');

      // Mapear las claves del backend al formato del frontend
      return {
        assignments: mapAssignmentsToFrontend(response.data.data.assignments || {}),
        subtype_assignments: mapSubtypeAssignmentsToFrontend(response.data.data.subtype_assignments || {}),
      };
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};
