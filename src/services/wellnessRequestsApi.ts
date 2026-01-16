import { authenticatedApi } from './api';
import { getErrorMessage, sanitizeErrorForLogging } from '@/utils/errorSanitizer';
import { logger } from '@/utils/logger';

// Use authenticated API instance
const wellnessRequestsApi = authenticatedApi;

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
  logger.debug('Wellness Request API request', {
    method: config.method?.toUpperCase(),
    url: config.url,
  });
  return config;
});

wellnessRequestsApi.interceptors.response.use(
  (response) => {
    logger.debug('Wellness Request API response', {
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
    
    logger.error('Wellness Request API response error', {
      status,
      statusText: error.response?.statusText,
      message: error.message,
      url,
    });
    return Promise.reject(error);
  },
);

const handleApiError = (error: any) => {
  // Sanitizar error para logging - solo detalles seguros en producción
  const sanitizedError = sanitizeErrorForLogging(error);
  logger.error('Wellness Request API error', sanitizedError);

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

  /**
   * Get completed wellness requests without related activities
   * Used to show requests that can be linked to wellness events
   */
  async getCompletedWellnessRequestsWithoutActivities(filters?: {
    centroCostos?: string;
    solicitanteId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    busqueda?: string;
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<WellnessRequest>> {
    try {
      const response = await wellnessRequestsApi.get<PaginatedResponse<WellnessRequest>>(
        '/api/wellness-requests/completed/without-activities',
        {
          params: filters,
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al obtener las solicitudes completadas');
      }

      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  /**
   * Export wellness requests to Excel
   */
  async exportToExcel(filters: {
    cost_center?: string;
    requester_id?: number;
    status?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    include_images?: boolean;
  }): Promise<{ blob: Blob; filename: string }> {
    try {
      const response = await wellnessRequestsApi.post(
        '/api/wellness-requests/export/excel',
        filters,
        {
          responseType: 'blob', // Important: specify blob response type for Excel file
          headers: {
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        }
      );

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'Reporte_Bienestar_ProSalud.xlsx';
      
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
        throw new Error('No tiene permisos para exportar solicitudes de bienestar.');
      }

      if (error.response?.status === 500) {
        throw new Error('Error al generar el reporte. Por favor, intente nuevamente.');
      }

      handleApiError(error);
      throw error;
    }
  },
};

