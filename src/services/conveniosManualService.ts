import { authenticatedApi } from './api';
import axios, { AxiosError } from 'axios';

/**
 * Request para envío masivo de correos
 */
export interface SendBulkEmailsRequest {
  document_numbers: string[];
  emails?: Record<string, string>; // Objeto asociativo: { "documento": "email" }
  email_subject?: string;
  document_name?: string;
}

/**
 * Response del envío masivo
 */
export interface SendBulkEmailsResponse {
  success: true;
  message: string;
  data: {
    total_requested: number;
    files_found: number;
    enqueued: number;
    errors: number;
    status: 'queued';
    note: string;
  };
}

/**
 * Tracking de correo manual
 */
export interface ConvenioEmailTracking {
  id: number;
  documento: string;
  nombre_afiliado: string;
  email_afiliado: string;
  nombre_convenio: string;
  nombre_archivo: string;
  ruta_archivo_pdf: string;
  estado: 'pendiente' | 'enviado' | 'fallido';
  enviado_at: string | null;
  error_message: string | null;
  intentos: number;
  created_at: string;
  updated_at: string;
}

/**
 * Response del historial de correos
 */
export interface EmailHistoryResponse {
  success: true;
  data: {
    current_page: number;
    data: ConvenioEmailTracking[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: Array<{
      url: string | null;
      label: string;
      active: boolean;
    }>;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
  };
}

/**
 * Parámetros para filtrar el historial
 */
export interface EmailHistoryParams {
  documento?: string;
  estado?: 'pendiente' | 'enviado' | 'fallido';
  nombre_convenio?: string;
  fecha_desde?: string; // YYYY-MM-DD
  fecha_hasta?: string; // YYYY-MM-DD
  per_page?: number;
  page?: number;
}

/**
 * Request para reenviar correos
 */
export interface ResendEmailsRequest {
  tracking_ids: number[];
  emails?: Record<string, string>; // Objeto asociativo: { "tracking_id": "email" }
  email_subject?: string;
}

/**
 * Response del reenvío
 */
export interface ResendEmailsResponse {
  success: true;
  data: {
    total: number;
    success_count: number;
    failed_count: number;
    results: {
      success: Array<{
        tracking_id: number;
        documento: string;
      }>;
      failed: Array<{
        tracking_id: number;
        error: string;
      }>;
    };
  };
}

/**
 * Parámetros para estadísticas
 */
export interface StatisticsParams {
  fecha_desde?: string; // YYYY-MM-DD
  fecha_hasta?: string; // YYYY-MM-DD
}

/**
 * Response de estadísticas
 */
export interface StatisticsResponse {
  success: true;
  data: {
    total: number;
    by_status: {
      pendiente: number;
      enviado: number;
      fallido: number;
    };
    sent_today: number;
    pending: number;
    sent: number;
    failed: number;
  };
}

/**
 * Envía correos masivos de convenio manual
 */
export const sendBulkEmails = async (
  requestData: SendBulkEmailsRequest
): Promise<SendBulkEmailsResponse> => {
  try {
    const response = await authenticatedApi.post<SendBulkEmailsResponse>(
      '/api/convenios-manual/send-bulk-emails',
      requestData
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ 
        success: false; 
        message: string; 
        errors?: Record<string, string[]> 
      }>;
      
      if (axiosError.response?.status === 422) {
        throw {
          success: false,
          message: axiosError.response.data?.message || 'Error de validación',
          errors: axiosError.response.data?.errors || {},
          isValidationError: true,
        };
      }
      
      if (axiosError.response?.status === 404) {
        throw {
          success: false,
          message: axiosError.response.data?.message || 'No se encontraron archivos PDF',
          errors: {},
        };
      }
      
      throw {
        success: false,
        message: axiosError.response?.data?.message || 'Error al enviar correos masivos',
        errors: {},
      };
    }
    
    throw {
      success: false,
      message: 'Error desconocido al enviar correos masivos',
      errors: {},
    };
  }
};

/**
 * Obtiene el historial de envíos de correos manuales
 */
export const getEmailHistory = async (
  params?: EmailHistoryParams
): Promise<EmailHistoryResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.documento) {
      queryParams.append('documento', params.documento);
    }
    if (params?.estado) {
      queryParams.append('estado', params.estado);
    }
    if (params?.nombre_convenio) {
      queryParams.append('nombre_convenio', params.nombre_convenio);
    }
    if (params?.fecha_desde) {
      queryParams.append('fecha_desde', params.fecha_desde);
    }
    if (params?.fecha_hasta) {
      queryParams.append('fecha_hasta', params.fecha_hasta);
    }
    if (params?.per_page) {
      queryParams.append('per_page', params.per_page.toString());
    }
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }

    const response = await authenticatedApi.get<EmailHistoryResponse>(
      `/api/convenios-manual/email-history?${queryParams.toString()}`
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ success: false; message: string }>;
      throw {
        success: false,
        message: axiosError.response?.data?.message || 'Error al obtener el historial',
      };
    }
    
    throw {
      success: false,
      message: 'Error desconocido al obtener el historial',
    };
  }
};

/**
 * Reenvía correos a uno o varios destinatarios
 */
export const resendEmails = async (
  requestData: ResendEmailsRequest
): Promise<ResendEmailsResponse> => {
  try {
    const response = await authenticatedApi.post<ResendEmailsResponse>(
      '/api/convenios-manual/resend-emails',
      requestData
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ 
        success: false; 
        message: string; 
        errors?: Record<string, string[]> 
      }>;
      
      if (axiosError.response?.status === 422) {
        throw {
          success: false,
          message: axiosError.response.data?.message || 'Error de validación',
          errors: axiosError.response.data?.errors || {},
          isValidationError: true,
        };
      }
      
      throw {
        success: false,
        message: axiosError.response?.data?.message || 'Error al reenviar correos',
        errors: {},
      };
    }
    
    throw {
      success: false,
      message: 'Error desconocido al reenviar correos',
      errors: {},
    };
  }
};

/**
 * Obtiene estadísticas de envíos
 */
export const getStatistics = async (
  params?: StatisticsParams
): Promise<StatisticsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.fecha_desde) {
      queryParams.append('fecha_desde', params.fecha_desde);
    }
    if (params?.fecha_hasta) {
      queryParams.append('fecha_hasta', params.fecha_hasta);
    }

    const response = await authenticatedApi.get<StatisticsResponse>(
      `/api/convenios-manual/statistics?${queryParams.toString()}`
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ success: false; message: string }>;
      throw {
        success: false,
        message: axiosError.response?.data?.message || 'Error al obtener estadísticas',
      };
    }
    
    throw {
      success: false,
      message: 'Error desconocido al obtener estadísticas',
    };
  }
};

