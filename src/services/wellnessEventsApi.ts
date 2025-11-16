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
  created_at?: string;
  updated_at?: string;
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
  provider?: string;
  is_visible?: boolean;
  images?: File[];
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
    createdAt: apiEvent.created_at || new Date().toISOString().split('T')[0]
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
      logger.debug('Imágenes adjuntadas al crear evento', { total: data.images.length });
    }
    
    const totalCampos = Array.from(formData.keys()).length;
    logger.debug('FormData generado para creación de evento', { totalCampos });
    
    const response = await api.post<WellnessEventResponse>(
      '/api/wellness-events',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
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
    });
    
    const formData = new FormData();
    
    // Agregar campos principales (siempre se envían si están definidos)
    if (data.title !== undefined && data.title !== null) {
      formData.append('title', data.title);
    }
    if (data.date !== undefined && data.date !== null) {
      formData.append('date', data.date);
    }
    if (data.category !== undefined && data.category !== null) {
      formData.append('category', data.category);
    }
    if (data.location !== undefined && data.location !== null) {
      formData.append('location', data.location);
    }
    if (data.description !== undefined && data.description !== null) {
      formData.append('description', data.description);
    }
    if (data.attendees !== undefined && data.attendees !== null) {
      formData.append('attendees', String(data.attendees));
    }
    if (data.gift !== undefined && data.gift !== null) {
      formData.append('gift', data.gift);
    }
    if (data.provider !== undefined && data.provider !== null) {
      formData.append('provider', data.provider);
    }
    if (data.is_visible !== undefined && data.is_visible !== null) {
      formData.append('is_visible', String(data.is_visible));
    }
    
    // Agregar nuevas imágenes si existen (reemplazarán las anteriores)
    if (data.images && data.images.length > 0) {
      data.images.forEach((file, index) => {
        formData.append(`images[${index}]`, file);
      });
      logger.debug('Actualizando imágenes de evento', { total: data.images.length });
    }
    
    // Logging detallado del FormData
    const formDataEntries = Array.from(formData.entries());
    logger.debug('Campos preparados para actualización de evento', {
      totalEntries: formDataEntries.length,
    });
    
    if (formDataEntries.length === 0) {
      logger.error('Intento de actualizar evento sin cambios');
      throw new Error('No hay datos para actualizar');
    }
    
    const response = await api.put<WellnessEventResponse>(
      `/api/wellness-events/${id}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
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
  testConnectivity: testApiConnectivity,
};
