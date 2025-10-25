import { ComfenalcoEvent } from '@/types/comfenalco';
import { buildPublicApiUrl, API_CONFIG } from '@/config/api';

class PublicComfenalcoApiError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PublicComfenalcoApiError';
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

  throw new PublicComfenalcoApiError(errorMessage, response.status);
};

// Helper function to build correct image URLs
const buildImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it's a relative path, build the full URL using the backend base URL
  const baseUrl = API_CONFIG.PUBLIC_BASE_URL;
  return `${baseUrl}/${imagePath}`;
};

export const publicComfenalcoApi = {
  /**
   * Get all visible Comfenalco events for public display
   * GET /api/comfenalco-events (filter visible events on frontend)
   */
  async getPublicEvents(): Promise<ComfenalcoEvent[]> {
    try {
      const url = buildPublicApiUrl(API_CONFIG.ENDPOINTS.COMFENALCO_EVENTS);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const events: any[] = await response.json();
      
      // Transform API response to match our interface and filter visible events
      const transformedEvents = events
        .filter(event => event.is_visible === 1) // Only visible events
        .map(event => ({
          id: event.id,
          title: event.title,
          banner_image: buildImageUrl(event.banner_image), // Build correct image URL
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
      
      return transformedEvents;
    } catch (error) {
      if (error instanceof PublicComfenalcoApiError) {
        throw error;
      }
      throw new PublicComfenalcoApiError(
        'Error al obtener los eventos públicos de Comfenalco',
        0
      );
    }
  },
};

export { PublicComfenalcoApiError };
