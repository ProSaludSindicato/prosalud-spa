import { authenticatedApi } from "./api";
import { getErrorMessage, sanitizeErrorForLogging } from "@/utils/errorSanitizer";
import { logger } from "@/utils/logger";

// Use authenticated API client for requests endpoints
const requestsApi = authenticatedApi;

// Request and response interfaces based on the API documentation
export interface ApiResponseAttachment {
  id: number;
  original_name: string;
  download_url: string | null;
  url_expires_at: string | null;
  created_at: string;
}

export interface ApiResponseResponder {
  id: number;
  name: string;
  email: string;
}

export interface ApiRequestResponse {
  id: number;
  status: "PENDING" | "IN_REVIEW" | "REJECTED" | "COMPLETED";
  email_subject: string;
  email_body: string;
  created_at: string;
  responded_by?: ApiResponseResponder | null;
  attachments?: ApiResponseAttachment[];
  attachments_count?: number;
}

export interface ApiRequestFile {
  original_name: string;
  mime_type: string;
  size: number;
  original_key: string;
  download_url: string | null;
  url_expires_at: string | null;
}

export interface ApiRequest {
  id: number;
  request_type: string;
  document_type: string;
  document_number: string;
  name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone_number: string;
  payload: Record<string, any>;
  status: "PENDING" | "IN_REVIEW" | "REJECTED" | "COMPLETED";
  created_at: string;
  formatted_created_at: string;
  processed_at: string | null;
  formatted_processed_at: string;
  validated_at?: string | null;
  validated_by?: string | null;
  responses?: ApiRequestResponse[];
  responses_count?: number;
  files?: Record<string, ApiRequestFile>;
  files_count?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string[]>;
}

// Add request/response interceptors for debugging (dev-only)
requestsApi.interceptors.request.use((config) => {
  logger.debug("Requests API request", {
    method: config.method?.toUpperCase(),
    url: config.url,
  });
  return config;
});

requestsApi.interceptors.response.use(
  (response) => {
    logger.debug("Requests API response", {
      status: response.status,
      url: response.config.url,
    });
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isDashboard = currentPath.includes('/admin') && (currentPath.endsWith('/admin') || currentPath === '/admin');
    const isDashboardQuery = url.includes('/dashboard') || url.includes('/stats') || url.includes('/deliveries');
    
    // No loguear errores 403 del dashboard - son lógica de negocio, no errores reales
    if (status === 403 && (isDashboard || isDashboardQuery)) {
      // Silenciar errores 403 del dashboard
      return Promise.reject(error);
    }
    
    // Sanitizar error para logging - solo detalles seguros en producción
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error("Requests API response error", sanitizedError);
    return Promise.reject(error);
  },
);

const handleApiError = (error: any) => {
  // Sanitizar error para logging - solo detalles seguros en producción
  const sanitizedError = sanitizeErrorForLogging(error);
  logger.error("Requests API error handled", sanitizedError);

  // Handle network errors
  if (error.code === "ERR_NETWORK" || error.message.includes("CORS")) {
    throw new Error("Error de conexión: Verifique que el servidor backend esté ejecutándose");
  }

  if (error.response?.data) {
    const apiError = error.response.data as ApiResponse<any>;
    if (!apiError.success && apiError.message) {
      throw new Error(apiError.message);
    }
  }

  throw new Error(error.message || "Error desconocido en la API");
};

export const requestsApiService = {
  // Get all requests
  async getAllRequests(): Promise<ApiRequest[]> {
    try {
      const response = await requestsApi.get<ApiResponse<ApiRequest[]>>("/api/requests");

      if (!response.data.success) {
        throw new Error(response.data.message || "Error al obtener solicitudes");
      }

      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Get specific request by ID
  async getRequestById(id: string): Promise<ApiRequest> {
    try {
      // Validar que el ID es un string válido (10 dígitos)
      if (!id || typeof id !== 'string' || !/^\d{10}$/.test(id)) {
        throw new Error('ID inválido - debe ser un string de 10 dígitos');
      }

      const response = await requestsApi.get<ApiResponse<ApiRequest>>(`/api/requests/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.message || "Error al obtener la solicitud");
      }

      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Update request status
  async updateRequestStatus(
    id: string,
    status: "PENDING" | "IN_REVIEW" | "COMPLETED" | "REJECTED",
  ): Promise<ApiRequest> {
    try {
      // Validar que el ID es un string válido (10 dígitos)
      if (!id || typeof id !== 'string' || !/^\d{10}$/.test(id)) {
        throw new Error('ID inválido - debe ser un string de 10 dígitos');
      }

      const response = await requestsApi.patch<ApiResponse<ApiRequest>>(`/api/requests/${id}/status`, {
        status,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Error al actualizar el estado");
      }

      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Respond to request (with email and optional attachments)
  async respondToRequest(
    id: string,
    data: {
      status: "PENDING" | "IN_REVIEW" | "COMPLETED" | "REJECTED";
      email_subject: string;
      email_body: string;
      attachments?: FileList;
      actividades?: string[];
    }
  ): Promise<ApiRequest> {
    try {
      // Validar que el ID es un string válido (10 dígitos)
      if (!id || typeof id !== 'string' || !/^\d{10}$/.test(id)) {
        throw new Error('ID inválido - debe ser un string de 10 dígitos');
      }

      // Si hay archivos adjuntos o actividades, usar FormData
      if ((data.attachments && data.attachments.length > 0) || (data.actividades && data.actividades.length > 0)) {
        const formData = new FormData();
        formData.append('status', data.status);
        formData.append('email_subject', data.email_subject);
        formData.append('email_body', data.email_body);
        
        // Agregar archivos como attachments[0], attachments[1], etc.
        if (data.attachments && data.attachments.length > 0) {
          Array.from(data.attachments).forEach((file, index) => {
            formData.append(`attachments[${index}]`, file);
          });
        }
        
        // Agregar actividades como actividades[0], actividades[1], etc.
        if (data.actividades && data.actividades.length > 0) {
          data.actividades.forEach((actividad, index) => {
            if (actividad.trim() !== '') {
              formData.append(`actividades[${index}]`, actividad.trim());
            }
          });
        }

        const response = await requestsApi.post<ApiResponse<ApiRequest>>(
          `/api/requests/${id}/respond`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: data.actividades && data.actividades.length > 0 ? 150000 : 120000, // 150 segundos si hay actividades, 120 segundos si solo hay archivos
          }
        );

        if (!response.data.success) {
          // Si hay errores de validación, construir mensaje detallado
          if (response.data.errors) {
            const errorMessages = Object.entries(response.data.errors)
              .flatMap(([field, messages]) => 
                Array.isArray(messages) 
                  ? messages.map(msg => `${field}: ${msg}`)
                  : [`${field}: ${messages}`]
              )
              .join('\n');
            throw new Error(`Errores de validación:\n${errorMessages}`);
          }
          throw new Error(response.data.message || "Error al enviar la respuesta");
        }

        return response.data.data;
      } else {
        // Sin archivos, usar JSON o FormData si hay actividades
        if (data.actividades && data.actividades.length > 0) {
          const formData = new FormData();
          formData.append('status', data.status);
          formData.append('email_subject', data.email_subject);
          formData.append('email_body', data.email_body);
          
          // Agregar actividades
          if (data.actividades && data.actividades.length > 0) {
            data.actividades.forEach((actividad, index) => {
              if (actividad.trim() !== '') {
                formData.append(`actividades[${index}]`, actividad.trim());
              }
            });
          }
          
          const response = await requestsApi.post<ApiResponse<ApiRequest>>(
            `/api/requests/${id}/respond`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              timeout: 150000, // 150 segundos - proceso largo que genera certificado con actividades y envía email
            }
          );

          if (!response.data.success) {
            if (response.data.errors) {
              const errorMessages = Object.entries(response.data.errors)
                .flatMap(([field, messages]) => 
                  Array.isArray(messages) 
                    ? messages.map(msg => `${field}: ${msg}`)
                    : [`${field}: ${messages}`]
                )
                .join('\n');
              throw new Error(`Errores de validación:\n${errorMessages}`);
            }
            throw new Error(response.data.message || "Error al enviar la respuesta");
          }

          return response.data.data;
        }
        
        // Sin archivos ni actividades, usar JSON
        const response = await requestsApi.post<ApiResponse<ApiRequest>>(
          `/api/requests/${id}/respond`,
          {
            status: data.status,
            email_subject: data.email_subject,
            email_body: data.email_body,
          },
          {
            timeout: 120000, // 120 segundos - proceso puede ser largo al generar documentos y enviar emails
          }
        );

        if (!response.data.success) {
          // Si hay errores de validación, construir mensaje detallado
          if (response.data.errors) {
            const errorMessages = Object.entries(response.data.errors)
              .flatMap(([field, messages]) => 
                Array.isArray(messages) 
                  ? messages.map(msg => `${field}: ${msg}`)
                  : [`${field}: ${messages}`]
              )
              .join('\n');
            throw new Error(`Errores de validación:\n${errorMessages}`);
          }
          throw new Error(response.data.message || "Error al enviar la respuesta");
        }

        return response.data.data;
      }
    } catch (error: any) {
      // Sanitizar el error para evitar exponer información técnica al usuario
      const sanitizedMessage = getErrorMessage(error);
      
      // Crear un nuevo error con el mensaje sanitizado
      const sanitizedError = new Error(sanitizedMessage);
      // Preservar información del error original para logging en consola (solo para desarrollo)
      if (error.response) {
        (sanitizedError as any).originalStatus = error.response.status;
        (sanitizedError as any).originalData = error.response.data;
      }
      
      throw sanitizedError;
    }
  },

  // Respond to request with manual compensaciones (for certificado-convenio)
  async respondWithCompensaciones(
    id: string,
    data: {
      status: "PENDING" | "IN_REVIEW" | "COMPLETED" | "REJECTED";
      email_subject: string;
      email_body: string;
      t_basicos: number;
      t_auxilios: number;
      attachments?: FileList;
    }
  ): Promise<ApiRequest> {
    try {
      // Validar que el ID es un string válido (10 dígitos)
      if (!id || typeof id !== 'string' || !/^\d{10}$/.test(id)) {
        throw new Error('ID inválido - debe ser un string de 10 dígitos');
      }

      // Validar que t_basicos y t_auxilios son números enteros no negativos
      if (typeof data.t_basicos !== 'number' || data.t_basicos < 0 || !Number.isInteger(data.t_basicos)) {
        throw new Error('t_basicos debe ser un número entero no negativo');
      }
      if (typeof data.t_auxilios !== 'number' || data.t_auxilios < 0 || !Number.isInteger(data.t_auxilios)) {
        throw new Error('t_auxilios debe ser un número entero no negativo');
      }

      // Si hay archivos adjuntos, usar FormData
      if (data.attachments && data.attachments.length > 0) {
        const formData = new FormData();
        formData.append('status', data.status);
        formData.append('email_subject', data.email_subject);
        formData.append('email_body', data.email_body);
        formData.append('t_basicos', data.t_basicos.toString());
        formData.append('t_auxilios', data.t_auxilios.toString());
        
        // Agregar archivos como attachments[0], attachments[1], etc.
        Array.from(data.attachments).forEach((file, index) => {
          formData.append(`attachments[${index}]`, file);
        });

        const response = await requestsApi.post<ApiResponse<ApiRequest>>(
          `/api/requests/${id}/respond-with-compensaciones`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 150000, // 150 segundos - proceso largo que genera certificado y envía email
          }
        );

        if (!response.data.success) {
          // Si hay errores de validación, construir mensaje detallado
          if (response.data.errors) {
            const errorMessages = Object.entries(response.data.errors)
              .flatMap(([field, messages]) => 
                Array.isArray(messages) 
                  ? messages.map(msg => `${field}: ${msg}`)
                  : [`${field}: ${messages}`]
              )
              .join('\n');
            throw new Error(`Errores de validación:\n${errorMessages}`);
          }
          throw new Error(response.data.message || "Error al enviar la respuesta con compensaciones");
        }

        return response.data.data;
      } else {
        // Sin archivos, usar JSON
        const response = await requestsApi.post<ApiResponse<ApiRequest>>(
          `/api/requests/${id}/respond-with-compensaciones`,
          {
            status: data.status,
            email_subject: data.email_subject,
            email_body: data.email_body,
            t_basicos: data.t_basicos,
            t_auxilios: data.t_auxilios,
          },
          {
            timeout: 150000, // 150 segundos - proceso largo que genera certificado y envía email
          }
        );

        if (!response.data.success) {
          // Si hay errores de validación, construir mensaje detallado
          if (response.data.errors) {
            const errorMessages = Object.entries(response.data.errors)
              .flatMap(([field, messages]) => 
                Array.isArray(messages) 
                  ? messages.map(msg => `${field}: ${msg}`)
                  : [`${field}: ${messages}`]
              )
              .join('\n');
            throw new Error(`Errores de validación:\n${errorMessages}`);
          }
          throw new Error(response.data.message || "Error al enviar la respuesta con compensaciones");
        }

        return response.data.data;
      }
    } catch (error: any) {
      // Sanitizar el error para evitar exponer información técnica al usuario
      const sanitizedMessage = getErrorMessage(error);
      
      // Crear un nuevo error con el mensaje sanitizado
      const sanitizedError = new Error(sanitizedMessage);
      // Preservar información del error original para logging en consola (solo para desarrollo)
      if (error.response) {
        (sanitizedError as any).originalStatus = error.response.status;
        (sanitizedError as any).originalData = error.response.data;
      }
      
      throw sanitizedError;
    }
  },

  // Download a specific file from a request
  async downloadFile(requestId: string, fileKey: string): Promise<Blob> {
    try {
      // Validar que el ID es un string válido (10 dígitos)
      if (!requestId || typeof requestId !== 'string' || !/^\d{10}$/.test(requestId)) {
        throw new Error('ID inválido - debe ser un string de 10 dígitos');
      }

      const response = await requestsApi.get(
        `/api/requests/${requestId}/files/${fileKey}`,
        {
          responseType: 'blob', // Important: specify blob response type
        }
      );

      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Download a response attachment
  async downloadResponseAttachment(responseId: number, attachmentId: number): Promise<Blob> {
    try {
      if (!responseId || typeof responseId !== 'number' || responseId <= 0) {
        throw new Error('ID de respuesta inválido');
      }
      if (!attachmentId || typeof attachmentId !== 'number' || attachmentId <= 0) {
        throw new Error('ID de anexo inválido');
      }

      const response = await requestsApi.get(
        `/api/requests/responses/${responseId}/attachments/${attachmentId}`,
        {
          responseType: 'blob', // Important: specify blob response type
        }
      );

      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Export requests to Excel
  async exportToExcel(filters: {
    request_type?: string;
    date_range?: {
      include_all: boolean;
      start_date?: string;
      end_date?: string;
    };
  }): Promise<{ blob: Blob; filename: string }> {
    try {
      const response = await requestsApi.post(
        '/api/requests/export/excel',
        {
          request_type: filters.request_type || 'all',
          date_range: filters.date_range || {
            include_all: true,
          },
        },
        {
          responseType: 'blob', // Important: specify blob response type for Excel file
          headers: {
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        }
      );

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'Reporte_Solicitudes_ProSalud.xlsx';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      return {
        blob: response.data,
        filename,
      };
    } catch (error: any) {
      // Handle validation errors (400)
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        
        // Try to parse error message from blob if it's JSON
        if (errorData instanceof Blob) {
          try {
            const text = await errorData.text();
            const jsonError = JSON.parse(text);
            if (jsonError.message) {
              throw new Error(jsonError.message);
            }
            if (jsonError.errors) {
              const errorMessages = Object.entries(jsonError.errors)
                .flatMap(([field, messages]) => 
                  Array.isArray(messages) 
                    ? messages.map((msg: string) => `${field}: ${msg}`)
                    : [`${field}: ${messages}`]
                )
                .join('\n');
              throw new Error(`Errores de validación:\n${errorMessages}`);
            }
          } catch (parseError) {
            // If parsing fails, use default error
          }
        } else if (errorData?.message) {
          throw new Error(errorData.message);
        } else if (errorData?.errors) {
          const errorMessages = Object.entries(errorData.errors)
            .flatMap(([field, messages]) => 
              Array.isArray(messages) 
                ? messages.map((msg: string) => `${field}: ${msg}`)
                : [`${field}: ${messages}`]
            )
            .join('\n');
          throw new Error(`Errores de validación:\n${errorMessages}`);
        }
      }

      // Handle other errors
      if (error.response?.status === 401) {
        throw new Error('No autorizado. Por favor, inicie sesión nuevamente.');
      }
      
      if (error.response?.status === 403) {
        throw new Error('No tiene permisos para exportar solicitudes.');
      }

      if (error.response?.status === 500) {
        throw new Error('Error al generar el reporte. Por favor, intente nuevamente.');
      }

      handleApiError(error);
      throw error;
    }
  },

  // Get pending personal data update requests
  async getPendingPersonalDataUpdates(): Promise<ApiRequest[]> {
    try {
      const response = await requestsApi.get<ApiResponse<ApiRequest[]>>("/api/requests/pending-personal-data-updates");

      if (!response.data.success) {
        throw new Error(response.data.message || "Error al obtener solicitudes pendientes de actualización");
      }

      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Validate request (manual validation step)
  async validateRequest(id: string): Promise<ApiRequest> {
    try {
      // Validar que el ID es un string válido (10 dígitos)
      if (!id || typeof id !== 'string' || !/^\d{10}$/.test(id)) {
        throw new Error('ID inválido - debe ser un string de 10 dígitos');
      }

      const response = await requestsApi.post<ApiResponse<ApiRequest>>(`/api/requests/${id}/validate`);

      if (!response.data.success) {
        throw new Error(response.data.message || "Error al validar la solicitud");
      }

      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};
