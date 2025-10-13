import axios from 'axios';
import { BienestarEvent } from '@/types/admin';

// Base URL - ajustar según el entorno
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
    const response = await axios.get<PaginatedWellnessEvents>(`${API_BASE_URL}/api/wellness-events`, {
      params: filters
    });
    
    return response.data.data.map(mapToBienestarEvent);
  } catch (error) {
    console.error('Error al obtener eventos de bienestar:', error);
    throw error;
  }
}

/**
 * Obtener un evento específico por ID
 */
export async function getWellnessEvent(id: number | string): Promise<BienestarEvent> {
  try {
    const response = await axios.get<WellnessEventResponse>(`${API_BASE_URL}/api/wellness-events/${id}`);
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
    }
    
    const response = await axios.post<WellnessEventResponse>(
      `${API_BASE_URL}/api/wellness-events`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return mapToBienestarEvent(response.data);
  } catch (error) {
    console.error('Error al crear evento:', error);
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
    }
    
    const response = await axios.put<WellnessEventResponse>(
      `${API_BASE_URL}/api/wellness-events/${id}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return mapToBienestarEvent(response.data);
  } catch (error) {
    console.error('Error al actualizar evento:', error);
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
    const response = await axios.patch<WellnessEventResponse>(
      `${API_BASE_URL}/api/wellness-events/${id}/visibility`,
      { is_visible: isVisible },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    return mapToBienestarEvent(response.data);
  } catch (error) {
    console.error('Error al cambiar visibilidad del evento:', error);
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
    
    const response = await axios.post<WellnessEventResponse>(
      `${API_BASE_URL}/api/wellness-events/${eventId}/images`,
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
    const response = await axios.delete(
      `${API_BASE_URL}/api/wellness-events/${eventId}/images/${imageId}`
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
