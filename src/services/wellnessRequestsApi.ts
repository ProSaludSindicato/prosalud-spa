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

export interface WellnessActivityEvidence {
  id?: number;
  image_url?: string;
  file?: File;
  is_selected_for_gallery?: boolean;
  order?: number;
  is_main?: boolean; // Indica si esta evidencia es la imagen principal del evento
}

export interface WellnessActivityRealized {
  id?: number;
  wellness_request_id: number;
  // Información de la actividad realizada
  fecha_realizada?: string;
  ubicacion_real?: string;
  numero_asistentes_real?: number;
  descripcion_realizada?: string;
  obsequio_entregado?: string;
  // Archivos
  evidencias?: WellnessActivityEvidence[]; // Imágenes de evidencia
  listado_asistencia?: {
    id?: number;
    file_url?: string; // URL temporal firmada (válida 1 hora)
    url_expires_at?: string | null; // ISO 8601 - fecha de expiración de la URL
    file?: File;
    original_name?: string;
  };
  // Control de publicación
  // null o undefined: No ha sido revisada aún
  // false: Fue revisada y se determinó no publicar (mantener oculto)
  // true: Fue revisada y se publicó en la galería
  publicado_en_galeria?: boolean | null;
  evento_galeria_id?: number;
  created_at?: string;
  updated_at?: string;
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
  // Nueva relación con actividad realizada
  actividad_realizada?: WellnessActivityRealized;
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

export interface CreateWellnessActivityRealizedData {
  wellness_request_id: number;
  fecha_realizada?: string;
  ubicacion_real?: string;
  numero_asistentes_real?: number;
  descripcion_realizada?: string;
  obsequio_entregado?: string;
  evidencias?: File[]; // Imágenes de evidencia
  listado_asistencia?: File; // Archivo de listado de asistencia
}

export interface UpdateWellnessActivityRealizedData {
  fecha_realizada?: string;
  ubicacion_real?: string;
  numero_asistentes_real?: number;
  descripcion_realizada?: string;
  obsequio_entregado?: string;
  evidencias?: File[]; // Nuevas imágenes a agregar
  evidencias_seleccionadas?: number[]; // IDs de evidencias seleccionadas para galería
  evidencias_eliminadas?: number[]; // IDs de evidencias a eliminar
  listado_asistencia?: File; // Nuevo archivo de listado
  eliminar_listado_asistencia?: boolean;
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

  /**
   * Create activity realized data for a wellness request
   */
  async createWellnessActivityRealized(
    data: CreateWellnessActivityRealizedData,
  ): Promise<WellnessActivityRealized> {
    try {
      const formData = new FormData();
      
      formData.append('wellness_request_id', String(data.wellness_request_id));
      
      if (data.fecha_realizada) formData.append('fecha_realizada', data.fecha_realizada);
      if (data.ubicacion_real) formData.append('ubicacion_real', data.ubicacion_real);
      if (data.numero_asistentes_real !== undefined) {
        formData.append('numero_asistentes_real', String(data.numero_asistentes_real));
      }
      if (data.descripcion_realizada) formData.append('descripcion_realizada', data.descripcion_realizada);
      if (data.obsequio_entregado) formData.append('obsequio_entregado', data.obsequio_entregado);
      
      // Agregar evidencias (imágenes)
      if (data.evidencias && data.evidencias.length > 0) {
        data.evidencias.forEach((file, index) => {
          formData.append(`evidencias[${index}]`, file);
        });
      }
      
      // Agregar listado de asistencia
      if (data.listado_asistencia) {
        formData.append('listado_asistencia', data.listado_asistencia);
      }
      
      const response = await wellnessRequestsApi.post<ApiResponse<WellnessActivityRealized>>(
        `/api/wellness-requests/${data.wellness_request_id}/activity-realized`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al crear la información de actividad realizada');
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
   * Update activity realized data for a wellness request
   */
  async updateWellnessActivityRealized(
    requestId: number,
    data: UpdateWellnessActivityRealizedData,
  ): Promise<WellnessActivityRealized> {
    try {
      const formData = new FormData();
      
      if (data.fecha_realizada !== undefined) formData.append('fecha_realizada', data.fecha_realizada || '');
      if (data.ubicacion_real !== undefined) formData.append('ubicacion_real', data.ubicacion_real || '');
      if (data.numero_asistentes_real !== undefined) {
        formData.append('numero_asistentes_real', String(data.numero_asistentes_real));
      }
      if (data.descripcion_realizada !== undefined) {
        formData.append('descripcion_realizada', data.descripcion_realizada || '');
      }
      if (data.obsequio_entregado !== undefined) {
        formData.append('obsequio_entregado', data.obsequio_entregado || '');
      }
      
      // Agregar nuevas evidencias
      if (data.evidencias && data.evidencias.length > 0) {
        data.evidencias.forEach((file, index) => {
          formData.append(`evidencias[${index}]`, file);
        });
      }
      
      // Evidencias seleccionadas para galería
      // El backend acepta JSON array o string separado por comas
      if (data.evidencias_seleccionadas && data.evidencias_seleccionadas.length > 0) {
        // Enviar como string separado por comas (más compatible)
        formData.append('evidencias_seleccionadas', data.evidencias_seleccionadas.join(','));
      }
      
      // Evidencias a eliminar
      // El backend acepta JSON array o string separado por comas
      if (data.evidencias_eliminadas && data.evidencias_eliminadas.length > 0) {
        // Enviar como string separado por comas (más compatible)
        formData.append('evidencias_eliminadas', data.evidencias_eliminadas.join(','));
      }
      
      // Nuevo listado de asistencia
      if (data.listado_asistencia) {
        formData.append('listado_asistencia', data.listado_asistencia);
      }
      
      // Eliminar listado de asistencia
      if (data.eliminar_listado_asistencia) {
        formData.append('eliminar_listado_asistencia', 'true');
      }
      
      const response = await wellnessRequestsApi.put<ApiResponse<WellnessActivityRealized>>(
        `/api/wellness-requests/${requestId}/activity-realized`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al actualizar la información de actividad realizada');
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
   * Get activity realized data for a wellness request
   */
  async getWellnessActivityRealized(
    requestId: number,
  ): Promise<WellnessActivityRealized> {
    try {
      const response = await wellnessRequestsApi.get<ApiResponse<WellnessActivityRealized>>(
        `/api/wellness-requests/${requestId}/activity-realized`,
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al obtener la información de actividad realizada');
      }

      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  /**
   * Publish activity realized as a public gallery event
   */
  async publishActivityToGallery(
    requestId: number,
    selectedEvidenceIds: number[],
    eventData?: {
      title?: string;
      category?: string;
      description?: string;
      is_visible?: boolean;
      evidencias_orden?: Record<string, number>; // Mapea ID de evidencia a su orden
      imagen_principal_id?: number;
    },
  ): Promise<any> {
    try {
      // El wellness_request_id viene en la URL, no es necesario en el body
      const payload: any = {
        evidencias_seleccionadas: selectedEvidenceIds,
      };
      
      if (eventData) {
        Object.assign(payload, eventData);
      }
      
      const response = await wellnessRequestsApi.post<ApiResponse<any>>(
        `/api/wellness-requests/${requestId}/publish-to-gallery`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al publicar en la galería');
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

