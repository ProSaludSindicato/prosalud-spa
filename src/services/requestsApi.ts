import axios from "axios";
import { API_CONFIG } from "../config/api";
import { getErrorMessage } from "@/utils/errorSanitizer";

// API client for requests endpoints (no authentication required)
const requestsApi = axios.create({
  baseURL: `${API_CONFIG.ADMIN_BASE_URL}/api`,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request and response interfaces based on the API documentation
export interface ApiRequestResponse {
  id: number;
  status: "PENDING" | "IN_REVIEW" | "REJECTED" | "COMPLETED";
  email_subject: string;
  email_body: string;
  created_at: string;
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

// Add request/response interceptors for debugging
requestsApi.interceptors.request.use((config) => {
  console.log("🚀 API Request:", config.method?.toUpperCase(), config.url, {
    params: config.params,
    data: config.data,
  });
  return config;
});

requestsApi.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", response.status, response.config.url, response.data);
    return response;
  },
  (error) => {
    console.error("❌ API Response Error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
    });
    return Promise.reject(error);
  },
);

const handleApiError = (error: any) => {
  console.error("API Error details:", error);

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
      const response = await requestsApi.get<ApiResponse<ApiRequest[]>>("/requests");

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
  async getRequestById(id: number): Promise<ApiRequest> {
    try {
      const response = await requestsApi.get<ApiResponse<ApiRequest>>(`/requests/${id}`);

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
    id: number,
    status: "PENDING" | "IN_REVIEW" | "COMPLETED" | "REJECTED",
  ): Promise<ApiRequest> {
    try {
      const response = await requestsApi.patch<ApiResponse<ApiRequest>>(`/requests/${id}/status`, {
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
    }
  ): Promise<ApiRequest> {
    try {
      // Validar que el ID es un string válido (10 dígitos)
      if (!id || typeof id !== 'string' || !/^\d{10}$/.test(id)) {
        throw new Error('ID inválido - debe ser un string de 10 dígitos');
      }

      // Si hay archivos adjuntos, usar FormData
      if (data.attachments && data.attachments.length > 0) {
        const formData = new FormData();
        formData.append('status', data.status);
        formData.append('email_subject', data.email_subject);
        formData.append('email_body', data.email_body);
        
        // Agregar archivos como attachments[0], attachments[1], etc.
        Array.from(data.attachments).forEach((file, index) => {
          formData.append(`attachments[${index}]`, file);
        });

        const response = await requestsApi.post<ApiResponse<ApiRequest>>(
          `/requests/${id}/respond`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
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
        // Sin archivos, usar JSON
        const response = await requestsApi.post<ApiResponse<ApiRequest>>(
          `/requests/${id}/respond`,
          {
            status: data.status,
            email_subject: data.email_subject,
            email_body: data.email_body,
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

  // Download a specific file from a request
  async downloadFile(requestId: string, fileKey: string): Promise<Blob> {
    try {
      // Validar que el ID es un string válido (10 dígitos)
      if (!requestId || typeof requestId !== 'string' || !/^\d{10}$/.test(requestId)) {
        throw new Error('ID inválido - debe ser un string de 10 dígitos');
      }

      const response = await requestsApi.get(
        `/requests/${requestId}/files/${fileKey}`,
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
};
