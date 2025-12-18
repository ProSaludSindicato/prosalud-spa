import { BienestarEvent } from '@/types/admin';
import { buildPublicApiUrl, API_CONFIG } from '@/config/api';
import { logger } from '@/utils/logger';

class PublicWellnessEventsApiError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PublicWellnessEventsApiError';
    this.status = status;
  }
}

const handleApiError = async (response: Response): Promise<never> => {
  let errorMessage: string;
  
  try {
    const errorData = await response.json();
    errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
  } catch (parseError) {
    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
  }

  throw new PublicWellnessEventsApiError(errorMessage, response.status);
};

export interface PublicWellnessEventFilters {
  category?: string;
  from_date?: string;
  to_date?: string;
  per_page?: number;
  page?: number;
  sort?: 'date-desc' | 'date-asc';
}

export interface PaginatedPublicWellnessEventsResult {
  events: BienestarEvent[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

/**
 * Mapea la respuesta del API público al formato BienestarEvent
 */
function mapToBienestarEvent(apiEvent: any): BienestarEvent {
  // Normalizar URLs de imágenes
  const images = (apiEvent.images || []).map((img: any) => {
    let imageUrl = img.image_url;
    
    // Si la URL es relativa, convertirla a absoluta
    if (imageUrl && imageUrl.startsWith('/storage/')) {
      imageUrl = `${API_CONFIG.PUBLIC_BASE_URL}${imageUrl}`;
    }
    
    return {
      url: imageUrl,
      alt: apiEvent.title,
      isMain: Boolean(img.is_main),
    };
  });

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
    images,
    isVisible: apiEvent.is_visible,
    createdAt: apiEvent.created_at || new Date().toISOString().split('T')[0],
    // NO incluir attendanceListPath ni attendanceList en el API público
  };
}

export const publicWellnessEventsApi = {
  /**
   * Obtener eventos públicos de bienestar con paginación
   * GET /api/public/wellness-events
   */
  async getPublicEvents(
    filters?: PublicWellnessEventFilters,
    includePagination: boolean = false
  ): Promise<BienestarEvent[] | PaginatedPublicWellnessEventsResult> {
    try {
      const url = buildPublicApiUrl('/api/public/wellness-events');
      const params = new URLSearchParams();
      
      if (filters?.category) params.append('category', filters.category);
      if (filters?.from_date) params.append('from_date', filters.from_date);
      if (filters?.to_date) params.append('to_date', filters.to_date);
      if (filters?.per_page) params.append('per_page', String(filters.per_page));
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.sort) params.append('sort', filters.sort);
      
      const queryString = params.toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;
      
      logger.debug('Solicitando eventos públicos de bienestar', { 
        url: fullUrl,
        filters,
        includePagination 
      });
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const data = await response.json();
      
      // La respuesta puede venir como array directo o como objeto paginado
      let eventsData: any[] = [];
      let paginationMeta: any = null;
      
      if (Array.isArray(data)) {
        // Respuesta simple como array
        eventsData = data;
      } else if (data.data && Array.isArray(data.data)) {
        // Respuesta paginada
        eventsData = data.data;
        paginationMeta = data.meta;
      } else {
        logger.warn('Formato de respuesta inesperado del API público de bienestar', { data });
        eventsData = [];
      }
      
      const mappedEvents = eventsData.map(mapToBienestarEvent);
      
      logger.debug('Eventos públicos de bienestar mapeados', { 
        total: mappedEvents.length,
        hasPagination: !!paginationMeta
      });
      
      if (includePagination && paginationMeta) {
        return {
          events: mappedEvents,
          pagination: {
            current_page: paginationMeta.current_page || 1,
            last_page: paginationMeta.last_page || 1,
            per_page: paginationMeta.per_page || 50,
            total: paginationMeta.total || mappedEvents.length,
            from: paginationMeta.from || 0,
            to: paginationMeta.to || mappedEvents.length,
          },
        };
      }
      
      return mappedEvents;
    } catch (error) {
      logger.error('Error al obtener eventos públicos de bienestar', error);
      
      if (error instanceof PublicWellnessEventsApiError) {
        throw error;
      }
      
      if (includePagination) {
        return {
          events: [],
          pagination: {
            current_page: 1,
            last_page: 1,
            per_page: filters?.per_page || 50,
            total: 0,
            from: 0,
            to: 0,
          },
        };
      }
      
      return [];
    }
  },

  /**
   * Obtener un evento público específico por ID
   * GET /api/public/wellness-events/{id}
   */
  async getPublicEvent(id: number | string): Promise<BienestarEvent> {
    try {
      const url = buildPublicApiUrl(`/api/public/wellness-events/${id}`);
      
      logger.debug('Solicitando evento público de bienestar', { id, url });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const apiEvent = await response.json();
      const mappedEvent = mapToBienestarEvent(apiEvent);
      
      logger.debug('Evento público de bienestar mapeado', { id: mappedEvent.id });
      
      return mappedEvent;
    } catch (error) {
      logger.error('Error al obtener evento público de bienestar', error);
      
      if (error instanceof PublicWellnessEventsApiError) {
        throw error;
      }
      
      throw new PublicWellnessEventsApiError(
        'Error al obtener el evento público de bienestar',
        0
      );
    }
  },
};

export { PublicWellnessEventsApiError };

