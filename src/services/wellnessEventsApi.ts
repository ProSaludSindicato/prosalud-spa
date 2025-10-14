import api from './api';
import { BienestarEvent } from '@/types/admin';

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
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedWellnessEvents {
  data: WellnessEventResponse[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

export interface WellnessEventFilters {
  is_visible?: boolean;
  category?: string;
  from_date?: string;
  to_date?: string;
  per_page?: number;
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
}

export interface UpdateWellnessEventData {
  title?: string;
  date?: string;
  category?: string;
  location?: string;
  description?: string;
  attendees?: number;
  gift?: string;
  is_visible?: boolean;
  images?: File[];
}

/**
 * Convierte la respuesta de la API al formato BienestarEvent usado en el frontend
 */
function mapToBienestarEvent(apiEvent: WellnessEventResponse): BienestarEvent {
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
    images: apiEvent.images.map(img => ({
      url: img.image_url,
      alt: apiEvent.title,
      isMain: img.is_main
    })),
    isVisible: apiEvent.is_visible,
    createdAt: apiEvent.created_at || new Date().toISOString().split('T')[0]
  };
}

/**
 * Listar eventos de bienestar con filtros opcionales
 */
export async function getWellnessEvents(filters?: WellnessEventFilters): Promise<BienestarEvent[]> {
  try {
    console.log('🔍 [GET] Solicitando eventos de bienestar:', { filters, url: '/api/wellness-events' });
    
    const response = await api.get<PaginatedWellnessEvents>('/api/wellness-events', {
      params: filters
    });
    
    console.log('✅ [GET] Respuesta exitosa:', { 
      status: response.status, 
      statusText: response.statusText,
      data: response.data 
    });
    
    // Validar que la respuesta tenga la estructura esperada
    if (!response.data || !response.data.data) {
      console.warn('⚠️ Respuesta de la API sin datos esperados:', response.data);
      return [];
    }
    
    const mappedEvents = response.data.data.map(mapToBienestarEvent);
    console.log('📦 Eventos mapeados:', mappedEvents.length);
    
    return mappedEvents;
  } catch (error: any) {
    console.error('❌ [GET] Error al obtener eventos de bienestar:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      fullError: error
    });
    
    // Mostrar mensaje específico según el tipo de error
    if (error.response?.status === 404) {
      console.error('🔴 Endpoint no encontrado. Verifica que el backend esté configurado correctamente.');
    } else if (error.response?.status === 500) {
      console.error('🔴 Error del servidor al obtener eventos.');
    } else if (error.code === 'ERR_NETWORK') {
      console.error('🔴 Error de red: No se pudo conectar al servidor. Verifica la URL base:', error.config?.baseURL);
    }
    
    // Retornar array vacío en caso de error para evitar crashes
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
    console.error('Error al obtener evento:', error);
    throw error;
  }
}

/**
 * Crear un nuevo evento de bienestar con imágenes
 */
export async function createWellnessEvent(data: CreateWellnessEventData): Promise<BienestarEvent> {
  try {
    console.log('📤 [POST] Creando evento de bienestar:', {
      data,
      url: '/api/wellness-events'
    });
    
    const formData = new FormData();
    
    // Agregar campos requeridos
    formData.append('title', data.title);
    formData.append('date', data.date);
    formData.append('category', data.category);
    formData.append('location', data.location);
    
    // Agregar campos opcionales
    if (data.description) formData.append('description', data.description);
    if (data.attendees !== undefined) formData.append('attendees', String(data.attendees));
    if (data.gift) formData.append('gift', data.gift);
    if (data.is_visible !== undefined) formData.append('is_visible', String(data.is_visible));
    
    // Agregar imágenes
    if (data.images && data.images.length > 0) {
      data.images.forEach((file, index) => {
        formData.append(`images[${index}]`, file);
      });
      console.log('📸 Adjuntando imágenes:', data.images.length);
    }
    
    console.log('📋 FormData enviado:', Array.from(formData.entries()).map(([key, value]) => ({
      key,
      value: value instanceof File ? `File: ${value.name}` : value
    })));
    
    const response = await api.post<WellnessEventResponse>(
      '/api/wellness-events',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    console.log('✅ [POST] Evento creado exitosamente:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    
    const mappedEvent = mapToBienestarEvent(response.data);
    console.log('📦 Evento mapeado:', mappedEvent);
    
    return mappedEvent;
  } catch (error: any) {
    console.error('❌ [POST] Error al crear evento:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      fullError: error
    });
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
    console.log('📝 [PUT] Actualizando evento:', {
      id,
      data,
      url: `/api/wellness-events/${id}`
    });
    
    const formData = new FormData();
    
    // Agregar solo los campos que se van a actualizar
    if (data.title) formData.append('title', data.title);
    if (data.date) formData.append('date', data.date);
    if (data.category) formData.append('category', data.category);
    if (data.location) formData.append('location', data.location);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.attendees !== undefined) formData.append('attendees', String(data.attendees));
    if (data.gift !== undefined) formData.append('gift', data.gift);
    if (data.is_visible !== undefined) formData.append('is_visible', String(data.is_visible));
    
    // Agregar nuevas imágenes si existen (reemplazarán las anteriores)
    if (data.images && data.images.length > 0) {
      data.images.forEach((file, index) => {
        formData.append(`images[${index}]`, file);
      });
      console.log('📸 Actualizando imágenes:', data.images.length);
    }
    
    console.log('📋 FormData enviado:', Array.from(formData.entries()).map(([key, value]) => ({
      key,
      value: value instanceof File ? `File: ${value.name}` : value
    })));
    
    const response = await api.put<WellnessEventResponse>(
      `/api/wellness-events/${id}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    console.log('✅ [PUT] Evento actualizado exitosamente:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    
    return mapToBienestarEvent(response.data);
  } catch (error: any) {
    console.error('❌ [PUT] Error al actualizar evento:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      fullError: error
    });
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
    console.log('🔄 [PATCH] Cambiando visibilidad:', {
      id,
      isVisible,
      url: `/api/wellness-events/${id}/visibility`
    });
    
    const response = await api.patch<WellnessEventResponse>(
      `/api/wellness-events/${id}/visibility`,
      { is_visible: isVisible },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('✅ [PATCH] Visibilidad cambiada exitosamente:', {
      status: response.status,
      data: response.data
    });
    
    return mapToBienestarEvent(response.data);
  } catch (error: any) {
    console.error('❌ [PATCH] Error al cambiar visibilidad:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      fullError: error
    });
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
    console.error('Error al agregar imágenes al evento:', error);
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
    console.error('Error al eliminar imagen:', error);
    throw error;
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
};
