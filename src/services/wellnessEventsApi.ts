import { authenticatedApi as api } from './api';
import { API_CONFIG } from '../config/api';
import { BienestarEvent } from '@/types/admin';
import { logger } from '@/utils/logger';

export interface WellnessEventImage {
  id: number;
  event_id: number;
  image_url: string;
  is_main: boolean;
}

export interface WellnessEventResponse {
  id: number;
  title: string;
  date: string;
  category: string;
  description?: string;
  location?: string;
  attendees?: number;
  gift?: string;
  provider: string;
  is_visible: boolean;
  images: WellnessEventImage[];
  attendance_list_path?: string;
  attendance_list?: {
    file_url: string;
    url_expires_at: string;
  };
  created_at?: string;
  updated_at?: string;
  // Campos de revisión
  review_status?: 'pending' | 'in_review' | 'approved' | 'rejected' | null;
  review_status_text?: string;
  wellness_request_id?: number | null;
  reviewed_at?: string | null;
  reviewed_by?: number | null;
  reviewer?: {
    id: number;
    name: string;
    email: string;
  } | null;
  wellness_request?: {
    id: number;
    activity_name: string;
    status: string;
  } | null;
  rejection_reason?: string | null;
}

export interface PaginatedWellnessEvents {
  data: WellnessEventResponse[];
  links: Array<{
    url: string | null;
    label: string;
    page: number | null;
    active: boolean;
  }>;
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
  // Campos adicionales que devuelve Laravel
  first_page_url: string;
  last_page_url: string;
  next_page_url: string | null;
  prev_page_url: string | null;
}

export interface WellnessEventFilters {
  is_visible?: boolean;
  category?: string;
  from_date?: string;
  to_date?: string;
  per_page?: number;
  review_status?: 'pending' | 'in_review' | 'approved' | 'rejected';
}

export interface CreateWellnessEventData {
  title: string;
  date: string;
  category: string;
  location: string;
  description?: string;
  attendees?: number;
  gift?: string;
  is_visible?: boolean;
  images?: File[];
  attendance_list?: File;
  wellness_request_id?: number; // ID de solicitud relacionada (opcional)
}

export interface UpdateWellnessEventData {
  title?: string;
  date?: string;
  category?: string;
  location?: string;
  description?: string | null;
  attendees?: number;
  gift?: string | null;
  provider?: string;
  is_visible?: boolean;
  images?: File[];
  attendance_list?: File;
  eliminar_attendance_list?: boolean;
}

/**
 * Convierte la respuesta de la API al formato BienestarEvent usado en el frontend
 */
function mapToBienestarEvent(apiEvent: WellnessEventResponse): BienestarEvent {
  logger.debug('Mapeando evento de bienestar', { id: apiEvent.id });
  
  // Validate required fields
  if (!apiEvent.id || !apiEvent.title || !apiEvent.date || !apiEvent.category) {
    throw new Error('Datos del evento incompletos en la respuesta del servidor');
  }
  
  return {
    id: String(apiEvent.id),
    title: apiEvent.title,
    date: apiEvent.date,
    category: apiEvent.category,
    description: apiEvent.description,
    location: apiEvent.location,
    attendees: apiEvent.attendees,
    gift: apiEvent.gift,
    provider: apiEvent.provider || 'ProSalud',
    images: (apiEvent.images || []).map(img => {
      // Normalizar URLs de imágenes
      let imageUrl = img.image_url;
      
      logger.debug('Procesando imagen de evento', {
        isRelative: imageUrl.startsWith('/storage/'),
        isCloudflare: imageUrl.includes('cloudflarestorage.com'),
      });
      
      // Si la URL es relativa, convertirla a absoluta
      if (imageUrl.startsWith('/storage/')) {
        imageUrl = `${API_CONFIG.PUBLIC_BASE_URL}${imageUrl}`;
        logger.debug('URL de imagen convertida a absoluta');
      }
      
      // Si la URL es de Cloudflare R2, mantenerla como está (ya es absoluta)
      if (imageUrl.includes('cloudflarestorage.com')) {
        logger.debug('URL de Cloudflare R2 detectada');
      }
      
      return {
        url: imageUrl,
        alt: apiEvent.title,
        isMain: Boolean(img.is_main)
      };
    }),
    isVisible: apiEvent.is_visible,
    createdAt: apiEvent.created_at || new Date().toISOString().split('T')[0],
    attendanceListPath: apiEvent.attendance_list_path,
    attendanceList: apiEvent.attendance_list ? {
      fileUrl: apiEvent.attendance_list.file_url,
      urlExpiresAt: apiEvent.attendance_list.url_expires_at,
    } : undefined,
    // Campos de revisión
    reviewStatus: apiEvent.review_status || null,
    reviewStatusText: apiEvent.review_status_text,
    wellnessRequestId: apiEvent.wellness_request_id || null,
    reviewedAt: apiEvent.reviewed_at || null,
    reviewedBy: apiEvent.reviewed_by || null,
    reviewer: apiEvent.reviewer || null,
    wellnessRequest: apiEvent.wellness_request || null,
    rejectionReason: apiEvent.rejection_reason || null,
  };
}

/**
 * Listar eventos de bienestar con filtros opcionales
 */
export async function getWellnessEvents(filters?: WellnessEventFilters): Promise<BienestarEvent[]> {
  try {
    logger.debug('Solicitando eventos de bienestar', { hasFilters: Boolean(filters) });
    
    const response = await api.get<PaginatedWellnessEvents>('/api/wellness-events', {
      params: filters,
      timeout: 15000 // Aumentar timeout para debugging
    });
    
    logger.debug('Respuesta recibida de eventos de bienestar', { status: response.status });
    
    // Validar que la respuesta tenga la estructura esperada
    if (!response.data || !response.data.data) {
      logger.warn('Respuesta de la API sin datos esperados al obtener eventos');
      return [];
    }
    
    const mappedEvents = response.data.data.map(mapToBienestarEvent);
    logger.debug('Eventos de bienestar mapeados', { total: mappedEvents.length });
    
    return mappedEvents;
  } catch (error: any) {
    logger.error('Error al obtener eventos de bienestar', error?.message || error);
    
    // Retornar array vacío en caso de error para evitar crashes manteniendo una respuesta segura
    return [];
  }
}

/**
 * Obtener un evento específico por ID
 */
export async function getWellnessEvent(id: number | string): Promise<BienestarEvent> {
  try {
    const response = await api.get<WellnessEventResponse>(`/api/wellness-events/${id}`);
    return mapToBienestarEvent(response.data);
  } catch (error) {
    logger.error('Error al obtener evento de bienestar', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Crear un nuevo evento de bienestar con imágenes
 */
export async function createWellnessEvent(data: CreateWellnessEventData): Promise<BienestarEvent> {
  try {
    logger.debug('Creando evento de bienestar');
    
    const formData = new FormData();
    
    // Agregar campos requeridos - todos como strings según la documentación
    formData.append('title', String(data.title));
    formData.append('date', String(data.date));
    formData.append('category', String(data.category));
    formData.append('location', String(data.location));
    
    // Agregar campos opcionales
    if (data.description) formData.append('description', String(data.description));
    if (data.attendees !== undefined) formData.append('attendees', String(data.attendees));
    if (data.gift) formData.append('gift', String(data.gift));
    if (data.is_visible !== undefined) {
      // Enviar como string 'true' o 'false' según la documentación
      formData.append('is_visible', data.is_visible ? 'true' : 'false');
    }
    
    // Agregar imágenes - usar 'images[]' (sin índice) según la documentación del backend
    if (data.images && data.images.length > 0) {
      data.images.forEach((file) => {
        formData.append('images[]', file);
      });
      logger.debug('Imágenes adjuntadas al crear evento', { total: data.images.length });
    }
    
    // Agregar listado de asistencia
    if (data.attendance_list) {
      formData.append('attendance_list', data.attendance_list);
      logger.debug('Listado de asistencia adjuntado al crear evento');
    }
    
    // Agregar relación con solicitud de bienestar (opcional)
    if (data.wellness_request_id !== undefined && data.wellness_request_id !== null) {
      formData.append('wellness_request_id', String(data.wellness_request_id));
      logger.debug('Relación con solicitud de bienestar establecida', { wellness_request_id: data.wellness_request_id });
    }
    
    const totalCampos = Array.from(formData.keys()).length;
    logger.debug('FormData generado para creación de evento', { totalCampos });
    
    // NO incluir Content-Type: el navegador lo agrega automáticamente con el boundary correcto
    // El interceptor de axios ya elimina Content-Type cuando detecta FormData
    const response = await api.post<WellnessEventResponse>(
      '/api/wellness-events',
      formData
    );
    
    logger.debug('Respuesta recibida al crear evento de bienestar', { status: response.status });
    
    // Validate response data before mapping
    if (!response.data) {
      throw new Error('La respuesta del servidor no contiene datos válidos');
    }
    
    const mappedEvent = mapToBienestarEvent(response.data);
    logger.debug('Evento de bienestar mapeado tras creación', { id: mappedEvent.id });
    
    return mappedEvent;
  } catch (error: any) {
    logger.error('Error al crear evento de bienestar', error?.message || error);
    throw error;
  }
}

/**
 * Actualizar un evento existente
 */
export async function updateWellnessEvent(
  id: number | string,
  data: UpdateWellnessEventData
): Promise<BienestarEvent> {
  try {
    logger.debug('Actualizando evento de bienestar', {
      id,
      hasImages: Boolean(data.images && data.images.length > 0),
      dataKeys: Object.keys(data),
      dataValues: {
        title: data.title,
        date: data.date,
        category: data.category,
        location: data.location,
        description: data.description,
        attendees: data.attendees,
        gift: data.gift,
        provider: data.provider,
        is_visible: data.is_visible,
      },
    });
    
    const formData = new FormData();
    
    // Agregar campos principales - SIEMPRE enviar si están definidos en el objeto data
    // IMPORTANTE: Todos los campos deben enviarse como strings en FormData según la documentación
    if (data.title !== undefined) {
      formData.append('title', String(data.title));
    }
    if (data.date !== undefined) {
      formData.append('date', String(data.date));
    }
    if (data.category !== undefined) {
      formData.append('category', String(data.category));
    }
    if (data.location !== undefined) {
      formData.append('location', String(data.location));
    }
    if (data.description !== undefined) {
      // Si es null, no enviar el campo (el backend lo interpretará como eliminación)
      // Si es string vacío, también tratarlo como null
      if (data.description !== null && data.description.trim() !== '') {
        formData.append('description', String(data.description));
      } else {
        // Enviar como string 'null' para que el backend lo interprete como null
        formData.append('description', 'null');
      }
    }
    if (data.attendees !== undefined && data.attendees !== null) {
      formData.append('attendees', String(data.attendees));
    }
    if (data.gift !== undefined) {
      // Si es null o string vacío, enviar como 'null' para indicar que se debe eliminar el valor
      if (data.gift === null || (typeof data.gift === 'string' && data.gift.trim() === '')) {
        formData.append('gift', 'null');
      } else {
        formData.append('gift', String(data.gift));
      }
    }
    if (data.provider !== undefined) {
      formData.append('provider', String(data.provider || ''));
    }
    if (data.is_visible !== undefined) {
      // Enviar como string 'true' o 'false' según la documentación
      formData.append('is_visible', data.is_visible ? 'true' : 'false');
    }
    
    // Agregar nuevas imágenes si existen (reemplazarán las anteriores)
    // IMPORTANTE: Usar 'images[]' (sin índice) según la documentación del backend
    if (data.images && data.images.length > 0) {
      data.images.forEach((file) => {
        formData.append('images[]', file);
      });
      logger.debug('Actualizando imágenes de evento', { total: data.images.length });
    }
    
    // Agregar listado de asistencia si existe (reemplaza el existente)
    if (data.attendance_list) {
      formData.append('attendance_list', data.attendance_list);
      logger.debug('Listado de asistencia adjuntado al actualizar evento');
    }
    
    // Eliminar listado de asistencia si se solicita
    if (data.eliminar_attendance_list === true) {
      formData.append('eliminar_attendance_list', 'true');
      logger.debug('Solicitando eliminación de listado de asistencia');
    }
    
    // Logging detallado del FormData
    const formDataEntries = Array.from(formData.entries());
    const formDataValues = formDataEntries.map(([key, value]) => {
      // Para archivos, mostrar solo el nombre y tipo
      if (value instanceof File) {
        return [key, { type: 'File', name: value.name, size: value.size }];
      }
      return [key, value];
    });
    
    logger.debug('Campos preparados para actualización de evento', {
      totalEntries: formDataEntries.length,
      entries: formDataValues,
    });
    
    if (formDataEntries.length === 0) {
      logger.error('Intento de actualizar evento sin cambios - FormData vacío', {
        receivedData: data,
        dataKeys: Object.keys(data),
      });
      throw new Error('No hay datos para actualizar');
    }
    
    // Usar PUT directamente según la documentación de la API
    // NO incluir Content-Type: el navegador lo agrega automáticamente con el boundary correcto
    // El interceptor de axios ya elimina Content-Type cuando detecta FormData
    const response = await api.put<WellnessEventResponse>(
      `/api/wellness-events/${id}`,
      formData
    );
    
    logger.debug('Evento de bienestar actualizado correctamente', { status: response.status });
    
    return mapToBienestarEvent(response.data);
  } catch (error: any) {
    logger.error('Error al actualizar evento de bienestar', error?.message || error);
    throw error;
  }
}

/**
 * Cambiar la visibilidad de un evento
 */
export async function toggleWellnessEventVisibility(
  id: number | string,
  isVisible: boolean
): Promise<BienestarEvent> {
  try {
    logger.debug('Cambiando visibilidad de evento de bienestar', { id, isVisible });
    
    const response = await api.patch<{ id: number; is_visible: boolean }>(
      `/api/wellness-events/${id}/visibility`,
      { is_visible: isVisible },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    logger.debug('Visibilidad de evento de bienestar actualizada', { status: response.status });
    
    // Después de cambiar la visibilidad, obtener el evento completo
    const fullEvent = await getWellnessEvent(id);
    return fullEvent;
  } catch (error: any) {
    logger.error('Error al cambiar visibilidad de evento', error?.message || error);
    throw error;
  }
}

/**
 * Agregar imágenes a un evento existente
 */
export async function addImagesToWellnessEvent(
  eventId: number | string,
  images: File[]
): Promise<BienestarEvent> {
  try {
    const formData = new FormData();
    
    images.forEach((file, index) => {
      formData.append(`images[${index}]`, file);
    });
    
    const response = await api.post<WellnessEventResponse>(
      `/api/wellness-events/${eventId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return mapToBienestarEvent(response.data);
  } catch (error) {
    logger.error('Error al agregar imágenes al evento de bienestar', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Eliminar una imagen específica de un evento
 */
export async function deleteWellnessEventImage(
  eventId: number | string,
  imageId: number
): Promise<{ message: string }> {
  try {
    const response = await api.delete(
      `/api/wellness-events/${eventId}/images/${imageId}`
    );
    
    return response.data;
  } catch (error) {
    logger.error('Error al eliminar imagen de evento de bienestar', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Poner un evento en revisión
 */
export async function reviewWellnessEvent(id: number | string): Promise<BienestarEvent> {
  try {
    logger.debug('Poniendo evento en revisión', { id });
    
    const response = await api.post<WellnessEventResponse>(
      `/api/wellness-events/${id}/review`,
      {}
    );
    
    logger.debug('Evento puesto en revisión', { status: response.status });
    
    return mapToBienestarEvent(response.data);
  } catch (error: any) {
    logger.error('Error al poner evento en revisión', error?.message || error);
    throw error;
  }
}

/**
 * Aprobar un evento de bienestar
 */
export async function approveWellnessEvent(
  id: number | string,
  isVisible: boolean = true
): Promise<BienestarEvent> {
  try {
    logger.debug('Aprobando evento de bienestar', { id, isVisible });
    
    const response = await api.post<WellnessEventResponse>(
      `/api/wellness-events/${id}/approve`,
      { is_visible: isVisible }
    );
    
    logger.debug('Evento aprobado', { status: response.status });
    
    return mapToBienestarEvent(response.data);
  } catch (error: any) {
    logger.error('Error al aprobar evento', error?.message || error);
    throw error;
  }
}

/**
 * Rechazar un evento de bienestar
 */
export async function rejectWellnessEvent(
  id: number | string,
  rejectionReason?: string
): Promise<BienestarEvent> {
  try {
    logger.debug('Rechazando evento de bienestar', { id, hasReason: !!rejectionReason });
    
    const payload: any = {};
    if (rejectionReason) {
      payload.rejection_reason = rejectionReason;
    }
    
    const response = await api.post<WellnessEventResponse>(
      `/api/wellness-events/${id}/reject`,
      payload
    );
    
    logger.debug('Evento rechazado', { status: response.status });
    
    return mapToBienestarEvent(response.data);
  } catch (error: any) {
    logger.error('Error al rechazar evento', error?.message || error);
    throw error;
  }
}

/**
 * Función de prueba para verificar conectividad básica
 */
export async function testApiConnectivity(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    logger.debug('Probando conectividad con API de bienestar');
    
    const response = await api.get('/api/wellness-events', {
      timeout: 5000,
      params: { per_page: 1 } // Solo pedir 1 elemento para prueba rápida
    });
    
    logger.debug('Conectividad con API de bienestar exitosa', { status: response.status });
    
    return {
      success: true,
      message: `API responde correctamente (${response.status})`,
      details: {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      }
    };
  } catch (error: any) {
    logger.error('Error de conectividad con API de bienestar', error?.message || error);
    
    return {
      success: false,
      message: `Error de conectividad: ${error.message}`,
      details: {
        code: error.code,
        message: error.message,
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        fullURL: error.config?.baseURL + error.config?.url
      }
    };
  }
}

// API wrapper para mantener compatibilidad con el código existente
export const wellnessEventsApi = {
  getEvents: getWellnessEvents,
  getEvent: getWellnessEvent,
  createEvent: createWellnessEvent,
  updateEvent: updateWellnessEvent,
  toggleVisibility: toggleWellnessEventVisibility,
  addImages: addImagesToWellnessEvent,
  deleteImage: deleteWellnessEventImage,
  review: reviewWellnessEvent,
  approve: approveWellnessEvent,
  reject: rejectWellnessEvent,
  testConnectivity: testApiConnectivity,
};
