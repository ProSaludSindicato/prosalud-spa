import { buildAdminApiUrl } from '@/config/api';
import { API_CONFIG } from '@/config/api';

export interface VaccinationSurveyExportFilters {
  date_range?: {
    include_all: boolean;
    start_date?: string;
    end_date?: string;
  };
}

/** Respuesta 202 al solicitar export: el reporte se genera en segundo plano. */
export interface VaccinationExportJobResponse {
  success: true;
  message: string;
  job_id: string;
  status: 'processing';
  check_status_url: string;
}

/** Respuesta de GET status (processing | completed | failed). */
export interface VaccinationExportStatusResponse {
  success: boolean;
  job_id: string;
  status: 'processing' | 'completed' | 'failed';
  download_url?: string;
  file_name?: string;
  error?: string;
  message?: string;
  created_at?: string;
}

/**
 * Solicita la generación del reporte Excel de encuestas de vacunación (flujo asíncrono).
 * POST /api/encuesta-vacunacion/export/excel
 * Respuesta 202: devuelve job_id; hay que consultar estado y luego descargar.
 * Requiere autenticación y permiso vaccination_surveys.view.
 */
export async function requestVaccinationSurveyExport(
  filters: VaccinationSurveyExportFilters = {}
): Promise<VaccinationExportJobResponse> {
  const url = buildAdminApiUrl(API_CONFIG.ENDPOINTS.ENCUESTA_VACUNACION_EXPORT_EXCEL);
  const body =
    filters.date_range != null
      ? { date_range: filters.date_range }
      : { date_range: { include_all: true } };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (response.status === 202) {
    const data = await response.json();
    if (!data.success || !data.job_id) {
      throw new Error(data.message || 'Error al iniciar la generación del reporte.');
    }
    return {
      success: true,
      message: data.message ?? 'El reporte se está generando.',
      job_id: data.job_id,
      status: 'processing',
      check_status_url: data.check_status_url ?? '',
    };
  }

  if (!response.ok) {
    let message = 'Error al generar el reporte. Por favor, intente nuevamente.';
    try {
      const text = await response.text();
      if (text) {
        const data = JSON.parse(text);
        if (data?.message) message = data.message;
      }
    } catch {
      // use default message
    }
    throw new Error(message);
  }

  // Por si el backend volviera a devolver 200 con blob (compatibilidad), no aplicable con contrato actual
  throw new Error('Respuesta inesperada del servidor.');
}

/**
 * Consulta el estado de un job de export de encuestas de vacunación.
 * GET /api/encuesta-vacunacion/export/status/{jobId}
 */
export async function getVaccinationExportStatus(
  jobId: string
): Promise<VaccinationExportStatusResponse> {
  const url = buildAdminApiUrl(
    `${API_CONFIG.ENDPOINTS.ENCUESTA_VACUNACION_EXPORT_STATUS}/${jobId}`
  );
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 404) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        job_id: jobId,
        status: 'failed',
        message: data?.message ?? 'Job no encontrado o expirado',
      };
    }
    throw new Error(`Error al verificar estado: ${response.status}`);
  }

  return response.json();
}

/**
 * Descarga el archivo Excel cuando el job está en estado completed.
 * GET /api/encuesta-vacunacion/export/download/{jobId}
 */
export async function downloadVaccinationExport(
  jobId: string,
  suggestedFileName?: string
): Promise<{ blob: Blob; filename: string }> {
  const url = buildAdminApiUrl(
    `${API_CONFIG.ENDPOINTS.ENCUESTA_VACUNACION_EXPORT_DOWNLOAD}/${jobId}`
  );
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 404) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.message ?? 'Job no encontrado o expirado.');
    }
    if (response.status === 400) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.message ?? 'El reporte aún no está listo.');
    }
    throw new Error(`Error al descargar: ${response.status}`);
  }

  const blob = await response.blob();
  let filename = suggestedFileName ?? 'Reporte_Encuesta_Vacunacion_ProSalud.xlsx';
  const contentDisposition = response.headers.get('Content-Disposition');
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match?.[1]) {
      filename = match[1].replace(/['"]/g, '').trim();
    }
  }
  return { blob, filename };
}
