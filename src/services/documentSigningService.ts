import { authenticatedApi } from './api';
import axios, { AxiosError } from 'axios';

export interface SendBulkEmailsRequest {
  document_numbers: string[];
  email_subject?: string;
  document_name?: string;
}

export interface SendBulkEmailsResponse {
  success: true;
  data: {
    total: number;
    success_count: number;
    failed_count: number;
    skipped_count: number;
    results: {
      success: Array<{
        document_number: string;
        envelope_id: string;
        email: string;
      }>;
      failed: Array<{
        document_number: string;
        error: string;
      }>;
      skipped: Array<{
        document_number: string;
        reason: string;
      }>;
    };
  };
}

export interface EmailTracking {
  id: number;
  envelope_id: string;
  document_number: string;
  recipient_email: string;
  recipient_name: string;
  provider: 'docusign' | 'signnow';
  email_status: 'pending' | 'sent' | 'delivered' | 'opened' | 'failed' | 'bounced';
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  signed_at: string | null;
  error_message: string | null;
  open_count: number;
  metadata: Record<string, any> | null;
  parent_tracking_id: number | null;
  resend_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmailHistoryResponse {
  success: true;
  data: {
    current_page: number;
    data: EmailTracking[];
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

export interface EmailHistoryParams {
  document_number?: string;
  email_status?: 'pending' | 'sent' | 'delivered' | 'opened' | 'failed' | 'bounced';
  provider?: 'docusign' | 'signnow';
  fecha_desde?: string; // YYYY-MM-DD
  fecha_hasta?: string; // YYYY-MM-DD
  per_page?: number;
  page?: number;
}

export interface ResendEmailsRequest {
  tracking_ids: number[];
  email_subject?: string;
}

export interface ResendEmailsResponse {
  success: true;
  data: {
    total: number;
    success_count: number;
    failed_count: number;
    results: {
      success: Array<{
        tracking_id: number;
        new_tracking_id: number;
        envelope_id: string;
      }>;
      failed: Array<{
        tracking_id: number;
        error: string;
      }>;
    };
  };
}

export interface StatisticsResponse {
  success: true;
  data: {
    total: number;
    by_status: {
      sent: number;
      delivered: number;
      opened: number;
      failed: number;
      bounced: number;
      pending: number;
    };
    by_provider: {
      docusign: number;
      signnow?: number;
    };
    sent_today: number;
    opened_today: number;
    signed_today: number;
  };
}

export interface StatisticsParams {
  fecha_desde?: string; // YYYY-MM-DD
  fecha_hasta?: string; // YYYY-MM-DD
}

/**
 * Envía correos masivos de firma de documentos
 */
export const sendBulkEmails = async (
  requestData: SendBulkEmailsRequest
): Promise<SendBulkEmailsResponse> => {
  try {
    const response = await authenticatedApi.post<SendBulkEmailsResponse>(
      '/api/document-signing/send-bulk-emails',
      requestData
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ success: false; message: string; errors?: Record<string, string[]> }>;
      
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
 * Obtiene el historial de envíos de correos
 */
export const getEmailHistory = async (
  params?: EmailHistoryParams
): Promise<EmailHistoryResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.document_number) {
      queryParams.append('document_number', params.document_number);
    }
    if (params?.email_status) {
      queryParams.append('email_status', params.email_status);
    }
    if (params?.provider) {
      queryParams.append('provider', params.provider);
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
      `/api/document-signing/email-history?${queryParams.toString()}`
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
      '/api/document-signing/resend-emails',
      requestData
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ success: false; message: string; errors?: Record<string, string[]> }>;
      
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
      `/api/document-signing/statistics?${queryParams.toString()}`
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

