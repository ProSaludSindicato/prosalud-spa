import { authenticatedApi } from './api';
import axios, { AxiosError } from 'axios';

export type ConvenioDeliveryMode = 'production' | 'test';

export interface ConvenioTrackingAvailableActions {
  resend: boolean;
  download_original: boolean;
  download_final: boolean;
}

export interface ConvenioHistoryUiMetadata {
  tabs: Array<{ id: string; label: string }>;
  bulk_actions: Array<{
    id: string;
    label: string;
    endpoint: string;
    method: string;
    payload_key: string;
  }>;
  estado_filtros: Array<{ value: string; label: string }>;
  deprecated_endpoints?: Array<{ endpoint: string; replacement: string }>;
  alternative_flows?: Record<string, string>;
}

/**
 * Tracking de correo manual
 */
export type ConvenioSigningEstado =
  | 'pendiente_firma'
  | 'firmado_afiliado'
  | 'firmando_presidente'
  | 'error_firma_presidente'
  | 'completado'
  | 'rechazado';

export interface ConvenioEmailTracking {
  id: number;
  documento: string;
  nombre_afiliado: string;
  email_afiliado: string;
  nombre_convenio: string;
  nombre_archivo: string;
  ruta_archivo_pdf: string;
  estado: 'pendiente' | 'enviado' | 'fallido' | 'verificacion';
  is_test?: boolean;
  available_actions?: ConvenioTrackingAvailableActions;
  convenio_data?: Record<string, unknown> | null;
  generated_by_user_id?: number | null;
  enviado_at: string | null;
  error_message: string | null;
  intentos: number;
  created_at: string;
  updated_at: string;
  parent_tracking_id?: number | null;
  signing_token_hash?: string | null;
  token_expires_at?: string | null;
  signing_estado?: ConvenioSigningEstado | null;
  pdf_original_path?: string | null;
  pdf_firmado_afiliado_path?: string | null;
  pdf_final_path?: string | null;
  firmado_afiliado_at?: string | null;
  firmado_presidente_at?: string | null;
  rechazado_at?: string | null;
  motivo_rechazo?: string | null;
  sede?: string | null;
  president_sign_attempts?: number;
  president_sign_last_error?: string | null;
  president_sign_detection_method?: string | null;
  president_sign_queued_at?: string | null;
  president_sign_duration_ms?: number | null;
  pdf_original_sha256?: string | null;
  pdf_firmado_afiliado_sha256?: string | null;
  text_integrity_status?: 'matched' | 'unavailable' | null;
  signed_ip?: string | null;
  integrity_badge_label?: string | null;
}

export function visibleConvenioSendError(
  tracking: Pick<ConvenioEmailTracking, 'estado' | 'error_message'>,
): string | null {
  if (tracking.estado !== 'fallido') {
    return null;
  }

  return tracking.error_message;
}

export type ConvenioSigningAuditEvent = {
  id: string;
  type: string;
  timestamp: string;
  label?: string;
  detail?: string | null;
  metadata?: Record<string, unknown>;
};

export interface ConvenioSigningIntegrity {
  text_integrity_status: 'matched' | 'unavailable' | null;
  text_integrity_label: string | null;
  pdf_original_sha256: string | null;
  pdf_firmado_afiliado_sha256: string | null;
  firmado_afiliado_at: string | null;
  signed_ip: string | null;
  signed_user_agent: string | null;
  terms_accepted_at: string | null;
  signing_audit_log: {
    sessionId: string;
    startedAt: string;
    events: ConvenioSigningAuditEvent[];
    summary: {
      documentName: string | null;
      totalPages: number;
      signaturePage: number | null;
      signatureMethod: 'draw' | 'upload' | null;
      signatureMethodLabel?: string | null;
      submittedAt: string | null;
      downloadedAt: string | null;
    };
  } | null;
}

/**
 * Response del historial de correos
 */
export interface EmailHistoryResponse {
  success: true;
  delivery_mode?: ConvenioDeliveryMode;
  digital_signing_enabled: boolean;
  auto_sign_enabled?: boolean;
  ui?: ConvenioHistoryUiMetadata;
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

/** Filtro unificado: correo (pendiente/enviado/fallido) o etapa de firma digital. */
export type EmailHistoryEstadoFiltro =
  | 'todos'
  | 'pendiente'
  | 'enviado'
  | 'fallido'
  | 'verificacion'
  | 'test'
  | 'firma_pendiente_firma'
  | 'firma_firmado_afiliado'
  | 'firma_completado'
  | 'firma_error_presidente';

/**
 * Parámetros para filtrar el historial
 */
export interface EmailHistoryParams {
  /** Búsqueda en documento o nombre de convenio (coincidencia parcial). */
  q?: string;
  estado_filtro?: EmailHistoryEstadoFiltro;
  /** Coincidencia parcial en sede o nombre de convenio. */
  sede?: string;
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
  delivery_mode?: ConvenioDeliveryMode;
  message?: string;
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
  delivery_mode?: ConvenioDeliveryMode;
  data: {
    digital_signing_enabled: boolean;
    auto_sign_enabled: boolean;
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
    signing?: {
      pendiente_firma: number;
      firmado_afiliado: number;
      firmando_presidente: number;
      error_firma_presidente: number;
      completado: number;
      rechazado: number;
    } | null;
    signing_derived?: {
      pendientes_firma: number;
      firmados_afiliado_o_finalizados: number;
      por_firmar_presidente: number;
      firmando_presidente: number;
      error_firma_presidente: number;
    } | null;
    by_sede?: Array<{
      sede: string;
      total: number;
      pendiente_firma?: number;
      firmado_afiliado?: number;
      completado?: number;
      rechazado?: number;
    }>;
  };
}

export interface ConvenioDataField {
  key: string;
  label: string;
  value: unknown;
}

export interface TrackingDetailResponse {
  success: true;
  delivery_mode?: ConvenioDeliveryMode;
  digital_signing_enabled: boolean;
  data: {
    tracking: ConvenioEmailTracking;
    integrity: ConvenioSigningIntegrity | null;
    convenio_data: Record<string, unknown> | null;
    convenio_data_fields: ConvenioDataField[];
    generated_by: {
      id: number;
      name: string;
      email: string;
    } | null;
  };
}

/**
 * Obtiene el historial de envíos de correos manuales
 */
export const getEmailHistory = async (
  params?: EmailHistoryParams
): Promise<EmailHistoryResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.q?.trim()) {
      queryParams.append('q', params.q.trim());
    }
    if (params?.estado_filtro && params.estado_filtro !== 'todos') {
      queryParams.append('estado_filtro', params.estado_filtro);
    }
    if (params?.sede) {
      queryParams.append('sede', params.sede);
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
      `/api/convenios-manual/email-history?${queryParams.toString()}`,
      {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      },
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
 * Obtiene el detalle de un registro del historial, incluyendo los datos usados para generar el convenio.
 */
export const getTrackingDetail = async (trackingId: number): Promise<TrackingDetailResponse> => {
  try {
    const response = await authenticatedApi.get<TrackingDetailResponse>(
      `/api/convenios-manual/tracking/${trackingId}`,
      {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      },
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ success: false; message: string }>;
      throw {
        success: false,
        message: axiosError.response?.data?.message || 'Error al obtener el detalle del convenio',
      };
    }

    throw {
      success: false,
      message: 'Error desconocido al obtener el detalle del convenio',
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
  delivery_mode?: ConvenioDeliveryMode;
  next_step?: string;
  data?: Record<string, unknown>;
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
  delivery_mode?: ConvenioDeliveryMode;
  next_step?: string;
  ui?: ConvenioHistoryUiMetadata;
  data: {
    procesados: number;
    exitosos: number;
    errores: number;
    filas_vacias: number;
    send_email: boolean;
    errors?: string[];
  };
}

export interface ImportPdfZipResponse {
  success: true;
  message: string;
  delivery_mode?: ConvenioDeliveryMode;
  next_step?: string;
  ui?: ConvenioHistoryUiMetadata;
  data: {
    batch_id: string;
    validos: number;
    rechazados: number;
    send_email: boolean;
    rejected: Array<{ entry: string; reason: string }>;
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

/**
 * Importa PDFs pregenerados desde un archivo ZIP
 * POST /api/convenios-manual/import-pdf-zip
 */
export const importPdfZip = async (
  file: File,
  send_email?: boolean
): Promise<ImportPdfZipResponse> => {
  try {
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (fileExtension !== '.zip') {
      throw {
        success: false,
        message: 'El archivo debe ser un ZIP (.zip)',
        isValidationError: true,
      };
    }

    const maxSizeBytes = 50 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw {
        success: false,
        message: 'El archivo no puede ser mayor a 50MB',
        isValidationError: true,
      };
    }

    const formData = new FormData();
    formData.append('file', file);
    if (send_email !== undefined) {
      formData.append('send_email', send_email.toString());
    }

    const response = await authenticatedApi.post<ImportPdfZipResponse>(
      '/api/convenios-manual/import-pdf-zip',
      formData,
      {
        headers: {
          Accept: 'application/json',
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
        data?: { rejected?: Array<{ entry: string; reason: string }> };
      }>;

      if (axiosError.response?.status === 422) {
        throw {
          success: false,
          message: axiosError.response.data?.message || 'Error de validación',
          errors: axiosError.response.data?.errors || {},
          rejected: axiosError.response.data?.data?.rejected,
          isValidationError: true,
        };
      }

      if (axiosError.response?.status === 413) {
        throw {
          success: false,
          message:
            axiosError.response.data?.message ||
            'El archivo ZIP supera el límite de carga del servidor. Intente con un ZIP más pequeño o pida al administrador aumentar los límites de PHP (post_max_size / upload_max_filesize).',
          errors: {},
          isValidationError: true,
        };
      }

      throw {
        success: false,
        message: axiosError.response?.data?.message || 'Error al importar el ZIP de PDFs',
        errors: {},
      };
    }

    if (typeof error === 'object' && error !== null && 'success' in error) {
      throw error;
    }

    throw {
      success: false,
      message: 'Error desconocido al importar el ZIP de PDFs',
      errors: {},
    };
  }
};

/** Descarga el PDF original generado o copiado para el envío (antes de firma del afiliado). */
export const downloadConvenioOriginalPdf = async (
  trackingId: number,
  documento: string,
): Promise<void> => {
  try {
    const response = await authenticatedApi.get<Blob>(
      `/api/convenios-manual/tracking/${trackingId}/download-original`,
      { responseType: 'blob' },
    );

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Convenio_${documento}_original.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      let message = 'No se pudo descargar el PDF original';
      if (axiosError.response?.data) {
        const data = axiosError.response.data;
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data) as { message?: string };
            message = parsed.message ?? message;
          } catch {
            message = data;
          }
        } else if (typeof data === 'object' && data !== null && 'message' in data) {
          message = (data as { message: string }).message;
        }
      }
      throw {
        success: false,
        message,
      };
    }

    throw {
      success: false,
      message: 'Error desconocido al descargar el PDF original',
    };
  }
};

/** Encola la firma presidencial de un convenio individual. */
export const signAsPresident = async (trackingId: number): Promise<void> => {
  try {
    await authenticatedApi.post(
      `/api/convenios-manual/tracking/${trackingId}/president-sign`,
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string; success?: boolean }>;
      throw {
        success: false,
        message:
          axiosError.response?.data?.message ||
          'No se pudo enviar el convenio a firma presidencial',
      };
    }
    throw {
      success: false,
      message: 'Error desconocido al enviar a firma presidencial',
    };
  }
};

/** Encola la firma presidencial de varios convenios (bulk). */
export interface BulkPresidentSignResponse {
  success: boolean;
  accepted: number;
  rejected: Array<{ tracking_id: number; reason: string }>;
}

export const signAsPresidentBulk = async (
  trackingIds: number[],
): Promise<BulkPresidentSignResponse> => {
  try {
    const response = await authenticatedApi.post<BulkPresidentSignResponse>(
      '/api/convenios-manual/tracking/president-sign-bulk',
      { tracking_ids: trackingIds },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw {
        success: false,
        message:
          axiosError.response?.data?.message ||
          'No se pudo enviar los convenios a firma presidencial',
      };
    }
    throw {
      success: false,
      message: 'Error desconocido al enviar a firma presidencial masiva',
    };
  }
};

/** Descarga el PDF firmado por el afiliado (o PDF final histórico si el estado es completado). */
export const downloadConvenioFinalPdf = async (
  trackingId: number,
  documento: string,
  signingEstado: ConvenioSigningEstado | null | undefined,
): Promise<void> => {
  try {
    const response = await authenticatedApi.get<Blob>(
      `/api/convenios-manual/tracking/${trackingId}/download-final`,
      { responseType: 'blob' },
    );

    const suffix =
      signingEstado === 'completado' ? 'final' : 'firmado_afiliado';
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Convenio_${documento}_${suffix}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw {
        success: false,
        message: axiosError.response?.data?.message || 'No se pudo descargar el convenio firmado',
      };
    }

    throw {
      success: false,
      message: 'Error desconocido al descargar el convenio firmado',
    };
  }
};

