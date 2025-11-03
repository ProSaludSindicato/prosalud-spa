import axios from 'axios';
import { API_CONFIG } from '../config/api';
import { getErrorMessage } from '@/utils/errorSanitizer';

// API client for wellness requests endpoints
const wellnessRequestsApi = axios.create({
  baseURL: API_CONFIG.ADMIN_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request and response interfaces
export interface WellnessRequestDetail {
  tipo: string;
  cantidad: number;
}

export interface CreateWellnessRequestData {
  nombreActividad: string;
  descripcionActividad?: string;
  centroCostos: string;
  sedes: string[];
  fechaPropuesta: string;
  horaInicio?: string;
  horaFin?: string;
  numeroParticipantes?: number;
  requiereDetalles: boolean;
  detalles: WellnessRequestDetail[];
  solicitanteId: string;
}

export interface WellnessRequest {
  id: number;
  nombreActividad: string;
  descripcionActividad?: string;
  centroCostos: string;
  sedes: string[];
  fechaPropuesta: string;
  horaInicio?: string;
  horaFin?: string;
  numeroParticipantes?: number;
  requiereDetalles: boolean;
  detalles: WellnessRequestDetail[];
  solicitanteId: string;
  solicitante?: {
    id: number;
    name: string;
    email: string;
  };
  estado: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface UpdateWellnessRequestData {
  nombreActividad?: string;
  descripcionActividad?: string;
  centroCostos?: string;
  sedes?: string[];
  fechaPropuesta?: string;
  horaInicio?: string;
  horaFin?: string;
  numeroParticipantes?: number;
  requiereDetalles?: boolean;
  detalles?: WellnessRequestDetail[];
}

export interface WellnessRequestFilters {
  estado?: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  centroCostos?: string;
  solicitanteId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  busqueda?: string;
  ordenarPor?: 'proposed_date' | 'created_at' | 'activity_name';
  direccion?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string[]>;
}

// Add request/response interceptors for debugging
wellnessRequestsApi.interceptors.request.use((config) => {
  if (import.meta.env.DEV) {
    console.log('🚀 Wellness Request API:', config.method?.toUpperCase(), config.url, {
      data: config.data,
    });
  }
  return config;
});

wellnessRequestsApi.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('✅ Wellness Request API Response:', response.status, response.config.url, response.data);
    }
    return response;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('❌ Wellness Request API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
      });
    }
    return Promise.reject(error);
  },
);

const handleApiError = (error: any) => {
  console.error('Wellness Request API Error details:', error);

  // Handle network errors
  if (error.code === 'ERR_NETWORK' || error.message.includes('CORS')) {
    throw new Error('Error de conexión: Verifique que el servidor backend esté ejecutándose');
  }

  if (error.response?.data) {
    const apiError = error.response.data as ApiResponse<any>;
    if (!apiError.success && apiError.message) {
      throw new Error(apiError.message);
    }
    // Si hay errores de validación, construirlos en un mensaje
    if (apiError.errors) {
      const errorMessages = Object.entries(apiError.errors)
        .flatMap(([field, messages]) =>
          Array.isArray(messages)
            ? messages.map((msg) => `${field}: ${msg}`)
            : [`${field}: ${messages}`],
        )
        .join('\n');
      throw new Error(`Errores de validación:\n${errorMessages}`);
    }
  }

  throw new Error(error.message || 'Error desconocido en la API');
};

export const wellnessRequestsService = {
  /**
   * Create a new wellness request
   */
  async createWellnessRequest(data: CreateWellnessRequestData): Promise<WellnessRequest> {
    try {
      const response = await wellnessRequestsApi.post<ApiResponse<WellnessRequest>>(
        '/api/wellness-requests',
        data,
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al crear la solicitud de bienestar');
      }

      return response.data.data;
    } catch (error) {
      const sanitizedMessage = getErrorMessage(error);
      const sanitizedError = new Error(sanitizedMessage);
      
      if ((error as any).response) {
        (sanitizedError as any).originalStatus = (error as any).response.status;
        (sanitizedError as any).originalData = (error as any).response.data;
      }
      
      throw sanitizedError;
    }
  },

  /**
   * Get all wellness requests with filters and pagination
   */
  async getAllWellnessRequests(filters?: WellnessRequestFilters): Promise<PaginatedResponse<WellnessRequest>> {
    try {
      const response = await wellnessRequestsApi.get<PaginatedResponse<WellnessRequest>>(
        '/api/wellness-requests',
        {
          params: filters,
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al obtener las solicitudes de bienestar');
      }

      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  /**
   * Get a specific wellness request by ID
   */
  async getWellnessRequestById(id: number): Promise<WellnessRequest> {
    try {
      const response = await wellnessRequestsApi.get<ApiResponse<WellnessRequest>>(
        `/api/wellness-requests/${id}`,
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al obtener la solicitud de bienestar');
      }

      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  /**
   * Update wellness request (partial update)
   * Only works for requests with pending or in_progress status
   */
  async updateWellnessRequest(
    id: number,
    data: UpdateWellnessRequestData,
  ): Promise<WellnessRequest> {
    try {
      const response = await wellnessRequestsApi.put<ApiResponse<WellnessRequest>>(
        `/api/wellness-requests/${id}`,
        data,
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al actualizar la solicitud de bienestar');
      }

      return response.data.data;
    } catch (error) {
      const sanitizedMessage = getErrorMessage(error);
      const sanitizedError = new Error(sanitizedMessage);
      
      if ((error as any).response) {
        (sanitizedError as any).originalStatus = (error as any).response.status;
        (sanitizedError as any).originalData = (error as any).response.data;
      }
      
      throw sanitizedError;
    }
  },

  /**
   * Update wellness request status
   * Uses the same PUT endpoint as updateWellnessRequest but only updates the status field
   */
  async updateWellnessRequestStatus(
    id: number,
    status: 'pending' | 'in_progress' | 'resolved' | 'rejected',
  ): Promise<WellnessRequest> {
    try {
      // Usar el mismo endpoint PUT pero solo con el campo estado
      const response = await wellnessRequestsApi.put<ApiResponse<WellnessRequest>>(
        `/api/wellness-requests/${id}`,
        { estado: status },
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al actualizar el estado de la solicitud');
      }

      return response.data.data;
    } catch (error) {
      const sanitizedMessage = getErrorMessage(error);
      const sanitizedError = new Error(sanitizedMessage);
      
      if ((error as any).response) {
        (sanitizedError as any).originalStatus = (error as any).response.status;
        (sanitizedError as any).originalData = (error as any).response.data;
      }
      
      throw sanitizedError;
    }
  },
};

