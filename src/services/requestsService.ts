import publicApi from './publicApi';
import axios, { AxiosError } from 'axios';

export interface RequestData {
  request_type: string;
  id_type: string;
  id_number: string;
  name: string;
  last_name: string;
  email: string;
  phone_number: string;
  payload: Record<string, any>;
  files?: Record<string, File | FileList>;
}

export interface ValidationError {
  success: false;
  message: string;
  errors: Record<string, string[]>;
}

export interface SuccessResponse {
  success: true;
  message: string;
  request: {
    id: string;
    request_type: string;
    status: string;
    created_at: string;
  };
  data: {
    id: string;
    request_type: string;
    status: string;
    created_at: string;
    files: Record<string, {
      original_name: string;
      mime_type: string;
      size: number;
      original_key: string;
      download_url: string;
      url_expires_at: string;
    }>;
    files_count: number;
  };
}

export const submitRequest = async (requestData: RequestData): Promise<SuccessResponse> => {
  try {
    const formData = new FormData();
    
    // Add basic request fields (all required)
    formData.append('request_type', requestData.request_type);
    formData.append('id_type', requestData.id_type);
    formData.append('id_number', requestData.id_number);
    formData.append('name', requestData.name);
    formData.append('last_name', requestData.last_name);
    formData.append('email', requestData.email);
    formData.append('phone_number', requestData.phone_number);
    
    // Add payload fields - only include non-empty values for optional fields
    Object.entries(requestData.payload).forEach(([key, value]) => {
      // Only append if value is not null, undefined, or empty string
      // For required fields, they should always have a value
      if (value !== null && value !== undefined && value !== '') {
        formData.append(`payload[${key}]`, String(value));
      }
    });
    
    // Add files if present
    if (requestData.files) {
      Object.entries(requestData.files).forEach(([key, fileOrFileList]) => {
        if (fileOrFileList) {
          // Handle both File and FileList
          let file: File;
          if (fileOrFileList instanceof FileList) {
            // Extract first file from FileList
            if (fileOrFileList.length > 0) {
              file = fileOrFileList[0];
            } else {
              return; // Skip if FileList is empty
            }
          } else if (fileOrFileList instanceof File) {
            file = fileOrFileList;
          } else {
            console.warn(`Invalid file type for key "${key}":`, fileOrFileList);
            return; // Skip invalid file types
          }
          
          formData.append(`files[${key}]`, file);
        }
      });
    }

    // Create a custom axios instance for this request to avoid Content-Type header conflicts
    // When sending FormData, axios automatically sets Content-Type to multipart/form-data
    const baseURL = publicApi.defaults.baseURL || 'https://prosalud.test';
    const response = await axios.post(
      `${baseURL}/api/requests`,
      formData,
      {
        headers: {
          'Accept': 'application/json',
          // Don't set Content-Type - let axios set it automatically with boundary
        },
        withCredentials: false,
      }
    );

    // Expect 201 Created for successful request
    if (response.status === 201) {
      return response.data as SuccessResponse;
    }

    return response.data;
  } catch (error) {
    // Handle validation errors (422)
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ValidationError>;
      
      if (axiosError.response?.status === 422) {
        // Validation error - return the error structure
        const validationError = axiosError.response.data;
        throw {
          ...validationError,
          isValidationError: true,
        };
      }
      
      // Handle other HTTP errors
      if (axiosError.response) {
        throw {
          success: false,
          message: axiosError.response.data?.message || 'Error al procesar la solicitud',
          errors: axiosError.response.data?.errors || {},
          status: axiosError.response.status,
        };
      }
      
      // Handle network errors
      if (axiosError.code === 'ERR_NETWORK') {
        throw {
          success: false,
          message: 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.',
          errors: {},
        };
      }
    }
    
    console.error('Error submitting request:', error);
    throw {
      success: false,
      message: 'Error desconocido al enviar la solicitud',
      errors: {},
    };
  }
};