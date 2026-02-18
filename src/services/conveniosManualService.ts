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

/**
 * Request para generar y enviar convenio manual
 */
export interface GenerateAndSendConvenioRequest {
  // Campos requeridos
  numero_documento: string;
  apellidos: string;
  nombres: string;
  
  // Campos opcionales - Datos del Afiliado y Convenio
  proceso?: string;
  ciudad?: string;
  sede?: string;
  fecha_inicio?: string; // YYYY-MM-DD
  fecha_finalizacion?: string; // YYYY-MM-DD
  fecha_nacimiento?: string; // YYYY-MM-DD
  lugar_nacimiento?: string;
  direccion?: string;
  celular?: string;
  
  // Campos opcionales - Compensación
  compensacion_basica_redactada?: string;
  
  // Campos opcionales - Valores de Compensación
  basico?: number;
  auxilios?: number;
  auxilio_especial?: number;
  manutencion?: number;
  provisiones?: number;
  horas?: number;
  valor_hora_diurna?: number;
  valor_hora_nocturna?: number;
  valor_hora_diurna_festiva?: number;
  valor_hora_nocturna_festiva?: number;
  auxilio_de_transporte?: number;
  auxilio_de_manutencion?: number;
  auxilio_de_encierro?: number;
  auxilio_de_rodamiento?: number;
  valor_auxilio_diurno?: number;
  valor_auxilio_recargo_nocturno?: number;
  valor_auxilio_recargo_festivo?: number;
  valor_auxilio_recargo_festivo_nocturno?: number;
  
  // Campos opcionales - Techo (TEMPORALMENTE COMENTADO)
  // tiene_techo?: boolean;
  
  // Campos opcionales - Opciones de Procesamiento
  send_email?: boolean;
  email?: string;
  // Nuevo flag de control para modo síncrono/asíncrono (por ahora usamos siempre asíncrono desde el frontend)
  download?: boolean;
}

/**
 * Response de generación y envío de convenio
 */
// Response genérica de generación de convenio (puede ser síncrona o asíncrona)
export interface GenerateAndSendConvenioResponse {
  success: boolean;
  message: string;
  data?: any;
  warnings?: string[];
}

/**
 * Genera y envía un convenio manual
 */
export const generateAndSendConvenio = async (
  requestData: GenerateAndSendConvenioRequest
): Promise<GenerateAndSendConvenioResponse> => {
  try {
    const response = await authenticatedApi.post<GenerateAndSendConvenioResponse>(
      '/api/convenios-manual/generate-and-send',
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
        message: axiosError.response?.data?.message || 'Error al generar el convenio',
        errors: {},
      };
    }
    
    throw {
      success: false,
      message: 'Error desconocido al generar el convenio',
      errors: {},
    };
  }
};

export interface DownloadGeneratedConvenioResult {
  status: number;
  blob?: Blob;
  processing?: boolean; // true si el API indica que está en proceso
  message?: string; // Mensaje del API en caso de error
}

/**
 * Descarga un convenio generado de forma asíncrona (si ya existe archivo)
 * GET /api/convenios-manual/download-generated?numero_documento=...
 * 
 * Respuestas esperadas:
 * - 200: Archivo listo, devuelve el blob
 * - 404 con { status: 'processing' }: Aún en proceso, continuar polling
 * - 404 con otro mensaje: Error (directorio no existe, etc.)
 * - 500: Error del servidor
 */
export const downloadGeneratedConvenio = async (
  numero_documento: string
): Promise<DownloadGeneratedConvenioResult> => {
  try {
    // Primero intentar como blob (si está listo)
    const response = await authenticatedApi.get(
      '/api/convenios-manual/download-generated',
      {
        params: { numero_documento },
        responseType: 'blob',
        // Aceptar cualquier status para poder manejar 404 sin lanzar excepción automática
        validateStatus: () => true,
      }
    );

    if (response.status === 200) {
      return { status: 200, blob: response.data as Blob };
    }

    // Si es 404, intentar leer el JSON para ver si está en proceso
    if (response.status === 404) {
      try {
        // Convertir el blob a texto y parsear como JSON
        const text = await (response.data as Blob).text();
        const jsonData = JSON.parse(text);
        
        if (jsonData.status === 'processing') {
          return { 
            status: 404, 
            processing: true,
            message: jsonData.message || 'El convenio está en proceso'
          };
        }
        
        return { 
          status: 404, 
          processing: false,
          message: jsonData.message || 'El convenio no está disponible'
        };
      } catch (parseError) {
        // Si no se puede parsear, asumir que es un error
        return { 
          status: 404, 
          processing: false,
          message: 'El convenio no está disponible'
        };
      }
    }

    // Otros errores (500, etc.)
    try {
      const text = await (response.data as Blob).text();
      const jsonData = JSON.parse(text);
      return { 
        status: response.status, 
        processing: false,
        message: jsonData.message || `Error del servidor (${response.status})`
      };
    } catch {
      return { 
        status: response.status, 
        processing: false,
        message: `Error del servidor (${response.status})`
      };
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { 
        status: error.response?.status || 500, 
        processing: false,
        message: error.message || 'Error al consultar el estado del convenio'
      };
    }
    
    return { 
      status: 500, 
      processing: false,
      message: 'Error desconocido al consultar el estado del convenio'
    };
  }
};

/**
 * Response de importación masiva
 */
export interface ImportBulkConveniosResponse {
  success: true;
  message: string;
  data: {
    procesados: number;
    exitosos: number;
    errores: number;
    filas_vacias: number;
    send_email: boolean;
    errors?: string[];
  };
}

/**
 * Descarga la plantilla Excel para importación masiva
 * GET /api/convenios-manual/export-template
 */
export const exportTemplate = async (): Promise<Blob> => {
  try {
    const response = await authenticatedApi.get(
      '/api/convenios-manual/export-template',
      {
        responseType: 'blob',
      }
    );

    return response.data as Blob;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ 
        success: false; 
        message: string; 
      }>;
      
      throw {
        success: false,
        message: axiosError.response?.data?.message || 'Error al descargar la plantilla',
      };
    }
    
    throw {
      success: false,
      message: 'Error desconocido al descargar la plantilla',
    };
  }
};

/**
 * Importa y genera convenios masivamente desde un archivo Excel
 * POST /api/convenios-manual/import-bulk
 */
export const importBulkConvenios = async (
  file: File,
  send_email?: boolean
): Promise<ImportBulkConveniosResponse> => {
  try {
    // Validar tipo de archivo
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!allowedExtensions.includes(fileExtension)) {
      throw {
        success: false,
        message: 'El archivo debe ser un Excel (.xlsx o .xls)',
        isValidationError: true,
      };
    }

    // Validar tamaño (10MB máximo)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      throw {
        success: false,
        message: 'El archivo no puede ser mayor a 10MB',
        isValidationError: true,
      };
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('file', file);
    if (send_email !== undefined) {
      formData.append('send_email', send_email.toString());
    }

    const response = await authenticatedApi.post<ImportBulkConveniosResponse>(
      '/api/convenios-manual/import-bulk',
      formData,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ 
        success: false; 
        message: string; 
        errors?: Record<string, string[]>;
        missing_columns?: string[];
      }>;
      
      if (axiosError.response?.status === 422) {
        throw {
          success: false,
          message: axiosError.response.data?.message || 'Error de validación',
          errors: axiosError.response.data?.errors || {},
          missing_columns: axiosError.response.data?.missing_columns,
          isValidationError: true,
        };
      }
      
      throw {
        success: false,
        message: axiosError.response?.data?.message || 'Error al importar convenios',
        errors: {},
      };
    }
    
    // Si el error ya tiene la estructura esperada, re-lanzarlo
    if (typeof error === 'object' && error !== null && 'success' in error) {
      throw error;
    }
    
    throw {
      success: false,
      message: 'Error desconocido al importar convenios',
      errors: {},
    };
  }
};

