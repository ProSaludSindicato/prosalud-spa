
export interface ComfenalcoEvent {
  id: number;
  title: string;
  banner_image: string;
  description?: string;
  registration_deadline?: string;
  event_date?: string;
  registration_link?: string;
  category: string;
  display_size: 'carousel' | 'mosaic';
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateComfenalcoEventData {
  title: string;
  banner_image: File;
  category: string;
  description?: string;
  display_size?: 'carousel' | 'mosaic';
  event_date?: string;
  registration_deadline?: string;
  registration_link?: string;
  is_visible?: boolean;
}

export interface UpdateComfenalcoEventData {
  title?: string;
  banner_image_url?: string;
  category?: string;
  description?: string;
  display_size?: 'carousel' | 'mosaic';
  event_date?: string;
  registration_deadline?: string;
  registration_link?: string;
  is_visible?: boolean;
}

export interface ComfenalcoEventResponse {
  id: number;
  title: string;
  banner_image_url: string;
  registration_link?: string;
  category: string;
  display_size: 'carousel' | 'mosaic';
  description?: string;
  registration_deadline?: string;
  event_date?: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
