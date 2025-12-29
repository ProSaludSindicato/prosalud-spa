import { 
  ComfenalcoEvent, 
  CreateComfenalcoEventData, 
  UpdateComfenalcoEventData, 
  ApiError
} from '@/types/comfenalco';
import { buildApiUrl, API_CONFIG } from '@/config/api';

// Helper function to build correct image URLs
const buildImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it's a relative path, build the full URL using the backend base URL
  const baseUrl = API_CONFIG.BASE_URL;
  return `${baseUrl}/${imagePath}`;
};

class ComfenalcoEventsApiError extends Error {
  public status: number;
  public errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ComfenalcoEventsApiError';
    this.status = status;
    this.errors = errors;
  }
}

const handleApiError = async (response: Response): Promise<never> => {
  let errorData: ApiError;
  
  try {
    errorData = await response.json();
  } catch {
    errorData = {
      message: `HTTP ${response.status}: ${response.statusText}`,
    };
  }

  // Handle validation errors (422)
  if (response.status === 422 && errorData.errors) {
    const validationMessage = 'Los datos proporcionados no son válidos.';
    throw new ComfenalcoEventsApiError(
      validationMessage,
      response.status,
      errorData.errors
    );
  }

  throw new ComfenalcoEventsApiError(
    errorData.message,
    response.status,
    errorData.errors
  );
};

// ✅ Helper simplificado - Ya no agregamos token Bearer
// Los tokens ahora se envían automáticamente en cookies HttpOnly
const getAuthHeaders = (additionalHeaders?: HeadersInit): HeadersInit => {
  return {
    'Accept': 'application/json',
    ...(additionalHeaders ?? {}),
  };
};

const createFormData = (data: CreateComfenalcoEventData): FormData => {
  const formData = new FormData();
  
  formData.append('title', data.title);
  formData.append('banner_image', data.banner_image);
  formData.append('category', data.category);
  
  if (data.description) {
    formData.append('description', data.description);
  }
  
  if (data.display_size) {
    formData.append('display_size', data.display_size);
  }
  
  if (data.event_date) {
    formData.append('event_date', data.event_date);
  }
  
  if (data.registration_deadline) {
    formData.append('registration_deadline', data.registration_deadline);
  }
  
  if (data.registration_link) {
    formData.append('registration_link', data.registration_link);
  }
  
  if (data.is_visible !== undefined) {
    formData.append('is_visible', data.is_visible.toString());
  }
  
  return formData;
};

export const comfenalcoEventsApi = {
  /**
   * Get all Comfenalco events
   * GET /api/comfenalco-events
   */
  async getEvents(): Promise<ComfenalcoEvent[]> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.COMFENALCO_EVENTS), {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include', // ✅ Habilitado para enviar cookies HttpOnly automáticamente
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const events: any[] = await response.json();
      
      // Transform API response to match our interface
      return events.map(event => ({
        id: event.id,
        title: event.title,
        banner_image: event.banner_image_url || event.banner_image, // Use banner_image_url from API
        description: event.description,
        registration_deadline: event.registration_deadline,
        event_date: event.event_date,
        registration_link: event.registration_link,
        category: event.category,
        display_size: event.display_size,
        is_visible: event.is_visible === 1, // Convert 1/0 to boolean
        created_at: event.created_at,
        updated_at: event.updated_at,
      }));
    } catch (error) {
      if (error instanceof ComfenalcoEventsApiError) {
        throw error;
      }
      throw new ComfenalcoEventsApiError(
        'Error al obtener los eventos de Comfenalco',
        0
      );
    }
  },

  /**
   * Get a specific Comfenalco event by ID
   * GET /api/comfenalco-events/{id}
   */
  async getEvent(id: number): Promise<ComfenalcoEvent> {
    try {
      const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.COMFENALCO_EVENTS)}/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include', // ✅ Habilitado para enviar cookies HttpOnly automáticamente
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const event: any = await response.json();
      
      // Transform API response to match our interface
      return {
        id: event.id,
        title: event.title,
        banner_image: event.banner_image_url || event.banner_image, // Use banner_image_url from API
        description: event.description,
        registration_deadline: event.registration_deadline,
        event_date: event.event_date,
        registration_link: event.registration_link,
        category: event.category,
        display_size: event.display_size,
        is_visible: event.is_visible === 1, // Convert 1/0 to boolean
        created_at: event.created_at,
        updated_at: event.updated_at,
      };
    } catch (error) {
      if (error instanceof ComfenalcoEventsApiError) {
        throw error;
      }
      throw new ComfenalcoEventsApiError(
        'Error al obtener el evento de Comfenalco',
        0
      );
    }
  },

  /**
   * Create a new Comfenalco event
   * POST /api/comfenalco-events
   */
  async createEvent(data: CreateComfenalcoEventData): Promise<ComfenalcoEvent> {
    try {
      const formData = createFormData(data);
      
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.COMFENALCO_EVENTS), {
        method: 'POST',
        headers: getAuthHeaders(), // No incluir Content-Type para FormData, el navegador lo hace automáticamente
        credentials: 'include', // ✅ Habilitado para enviar cookies HttpOnly automáticamente
        body: formData,
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const event: any = await response.json();
      
      // Transform API response to match our interface
      return {
        id: event.id,
        title: event.title,
        banner_image: event.banner_image_url || event.banner_image, // Use banner_image_url from API
        description: event.description,
        registration_deadline: event.registration_deadline,
        event_date: event.event_date,
        registration_link: event.registration_link,
        category: event.category,
        display_size: event.display_size,
        is_visible: event.is_visible === 1, // Convert 1/0 to boolean
        created_at: event.created_at,
        updated_at: event.updated_at,
      };
    } catch (error) {
      if (error instanceof ComfenalcoEventsApiError) {
        throw error;
      }
      throw new ComfenalcoEventsApiError(
        'Error al crear el evento de Comfenalco',
        0
      );
    }
  },

  /**
   * Update a Comfenalco event
   * PUT /api/comfenalco-events/{id}
   * PATCH /api/comfenalco-events/{id}
   * Supports both JSON and FormData (when updating with new image)
   */
  async updateEvent(id: number, data: UpdateComfenalcoEventData | (UpdateComfenalcoEventData & { banner_image?: File })): Promise<ComfenalcoEvent> {
    try {
      // Check if we need to send FormData (when banner_image is present)
      const hasNewImage = 'banner_image' in data && data.banner_image instanceof File;
      
      let response: Response;
      
      if (hasNewImage) {
        // Use FormData when updating with new image
        const formData = new FormData();
        const updateData = data as UpdateComfenalcoEventData & { banner_image?: File };
        
        if (updateData.title) formData.append('title', updateData.title);
        if (updateData.banner_image) formData.append('banner_image', updateData.banner_image);
        if (updateData.category) formData.append('category', updateData.category);
        if (updateData.description) formData.append('description', updateData.description);
        if (updateData.display_size) formData.append('display_size', updateData.display_size);
        if (updateData.event_date) formData.append('event_date', updateData.event_date);
        if (updateData.registration_deadline) formData.append('registration_deadline', updateData.registration_deadline);
        if (updateData.registration_link) formData.append('registration_link', updateData.registration_link);
        if (updateData.is_visible !== undefined) formData.append('is_visible', updateData.is_visible.toString());
        
        response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.COMFENALCO_EVENTS)}/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(), // No incluir Content-Type para FormData
          credentials: 'include', // ✅ Habilitado para enviar cookies HttpOnly automáticamente
          body: formData,
        });
      } else {
        // Use JSON for regular updates
        response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.COMFENALCO_EVENTS)}/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders({
            'Content-Type': 'application/json',
          }),
          credentials: 'include', // ✅ Habilitado para enviar cookies HttpOnly automáticamente
          body: JSON.stringify(data),
        });
      }

      if (!response.ok) {
        await handleApiError(response);
      }

      const event: any = await response.json();
      
      // Transform API response to match our interface
      return {
        id: event.id,
        title: event.title,
        banner_image: event.banner_image_url || event.banner_image, // Use banner_image_url from API
        description: event.description,
        registration_deadline: event.registration_deadline,
        event_date: event.event_date,
        registration_link: event.registration_link,
        category: event.category,
        display_size: event.display_size,
        is_visible: event.is_visible === 1, // Convert 1/0 to boolean
        created_at: event.created_at,
        updated_at: event.updated_at,
      };
    } catch (error) {
      if (error instanceof ComfenalcoEventsApiError) {
        throw error;
      }
      throw new ComfenalcoEventsApiError(
        'Error al actualizar el evento de Comfenalco',
        0
      );
    }
  },

  /**
   * Update event visibility
   * PATCH /api/comfenalco-events/{id}/visibility
   */
  async updateEventVisibility(id: number, isVisible: boolean): Promise<ComfenalcoEvent> {
    try {
      const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.COMFENALCO_EVENTS)}/${id}/visibility`, {
        method: 'PATCH',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'include', // ✅ Habilitado para enviar cookies HttpOnly automáticamente
        body: JSON.stringify({ is_visible: isVisible }),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const event: any = await response.json();
      
      // Transform API response to match our interface
      return {
        id: event.id,
        title: event.title,
        banner_image: event.banner_image_url || event.banner_image, // Use banner_image_url from API
        description: event.description,
        registration_deadline: event.registration_deadline,
        event_date: event.event_date,
        registration_link: event.registration_link,
        category: event.category,
        display_size: event.display_size,
        is_visible: event.is_visible === 1, // Convert 1/0 to boolean
        created_at: event.created_at,
        updated_at: event.updated_at,
      };
    } catch (error) {
      if (error instanceof ComfenalcoEventsApiError) {
        throw error;
      }
      throw new ComfenalcoEventsApiError(
        'Error al actualizar la visibilidad del evento',
        0
      );
    }
  },

  /**
   * Delete a Comfenalco event
   * DELETE /api/comfenalco-events/{id}
   */
  async deleteEvent(id: number): Promise<void> {
    try {
      const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.COMFENALCO_EVENTS)}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include', // ✅ Habilitado para enviar cookies HttpOnly automáticamente
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      // The API returns a success message, but we don't need to parse it
      await response.json();
    } catch (error) {
      if (error instanceof ComfenalcoEventsApiError) {
        throw error;
      }
      throw new ComfenalcoEventsApiError(
        'Error al eliminar el evento de Comfenalco',
        0
      );
    }
  },
};

export { ComfenalcoEventsApiError };
