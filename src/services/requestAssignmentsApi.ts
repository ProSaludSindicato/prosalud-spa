import { authenticatedApi } from "./api";
import { getErrorMessage } from "@/utils/errorSanitizer";
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
 * Maneja errores de la API de asignaciones
 */
const handleApiError = (error: any): never => {
  logger.error("Request assignments API error", {
    status: error.response?.status,
    statusText: error.response?.statusText,
    message: error.response?.data?.message,
    errors: error.response?.data?.errors,
  });

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

      return response.data.data;
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

      const response = await requestAssignmentsApi.put<ApiAssignmentsResponse>(
        "/api/request-assignments",
        payload
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Error al guardar asignaciones");
      }

      logger.debug('Request assignments saved successfully');

      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

