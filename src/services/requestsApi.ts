import axios from 'axios';

// API client for requests endpoints (no authentication required)
const requestsApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || "https://prosalud.test"}/api`,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request and response interfaces based on the API documentation
export interface ApiRequest {
  id: number;
  request_type: string;
  document_type: string;
  document_number: string;
  name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone_number: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'IN_REVIEW' | 'REJECTED' | 'COMPLETED';
  created_at: string;
  formatted_created_at: string;
  processed_at: string | null;
  formatted_processed_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string[]>;
}

// Add request/response interceptors for debugging
requestsApi.interceptors.request.use((config) => {
  console.log('🚀 API Request:', config.method?.toUpperCase(), config.url, {
    params: config.params,
    data: config.data
  });
  return config;
});

requestsApi.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

const handleApiError = (error: any) => {
  console.error('API Error details:', error);
  
  // Handle network errors
  if (error.code === 'ERR_NETWORK' || error.message.includes('CORS')) {
    throw new Error('Error de conexión: Verifique que el servidor backend esté ejecutándose');
  }
  
  if (error.response?.data) {
    const apiError = error.response.data as ApiResponse<any>;
    if (!apiError.success && apiError.message) {
      throw new Error(apiError.message);
    }
  }
  
  throw new Error(error.message || 'Error desconocido en la API');
};

export const requestsApiService = {
  // Get all requests
  async getAllRequests(): Promise<ApiRequest[]> {
    try {
      const response = await requestsApi.get<ApiResponse<ApiRequest[]>>('/requests');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al obtener solicitudes');
      }
      
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Get specific request by ID
  async getRequestById(id: number): Promise<ApiRequest> {
    try {
      const response = await requestsApi.get<ApiResponse<ApiRequest>>(`/requests/${id}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al obtener la solicitud');
      }
      
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Update request status
  async updateRequestStatus(id: number, status: 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED'): Promise<ApiRequest> {
    try {
      const response = await requestsApi.patch<ApiResponse<ApiRequest>>(`/requests/${id}/status`, {
        status
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al actualizar el estado');
      }
      
      return response.data.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }
};