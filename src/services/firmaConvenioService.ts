import publicApi from './publicApi';
import axios, { AxiosError } from 'axios';

export interface FirmaConvenioRequest {
  tipo_documento: string;
  documento: string;
  fecha_expedicion: string;
  return_url: string;
  email_subject?: string;
  document_name?: string;
}

export interface FirmaConvenioResponse {
  success: true;
  data: {
    envelope_id: string;
    signing_url: string;
  };
}

export interface FirmaConvenioError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * Crea una solicitud de firma de convenio con DocuSign
 * @param requestData Datos del documento y firmante
 * @returns URL de firma de DocuSign embebida
 */
export const crearFirmaConvenio = async (
  requestData: FirmaConvenioRequest
): Promise<FirmaConvenioResponse> => {
  try {
    if (!publicApi.defaults.baseURL) {
      throw new Error('PUBLIC_BASE_URL no está configurada. Verifica VITE_PUBLIC_API_BASE_URL o VITE_API_BASE_URL en las variables de entorno.');
    }

    const baseURL = publicApi.defaults.baseURL;
    const response = await axios.post<FirmaConvenioResponse>(
      `${baseURL}/api/firma`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        withCredentials: false,
        timeout: 30000, // 30 segundos
      }
    );

    if (response.status === 200 && response.data.success) {
      return response.data;
    }

    throw new Error('Respuesta inválida del servidor');
  } catch (error) {
    // Handle validation errors (422)
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<FirmaConvenioError>;
      
      if (axiosError.response?.status === 422) {
        // Validation error
        const validationError = axiosError.response.data;
        throw {
          ...validationError,
          isValidationError: true,
        };
      }
      
      // Handle rate limiting (429)
      if (axiosError.response?.status === 429) {
        throw {
          success: false,
          message: 'Has excedido el límite de solicitudes. Por favor, intenta nuevamente en unos minutos.',
          errors: {},
          isRateLimitError: true,
        };
      }
      
      // Handle other HTTP errors
      if (axiosError.response) {
        throw {
          success: false,
          message: axiosError.response.data?.message || 'Error al procesar la solicitud de firma',
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
    
    throw {
      success: false,
      message: 'Error desconocido al crear la solicitud de firma',
      errors: {},
    };
  }
};

