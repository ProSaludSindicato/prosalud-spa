import { buildAdminApiUrl } from '@/config/api';
import { API_CONFIG } from '@/config/api';

export interface VaccinationSurveyExportFilters {
  date_range?: {
    include_all: boolean;
    start_date?: string;
    end_date?: string;
  };
}

/**
 * Exporta encuestas de vacunación a Excel (admin).
 * POST /api/encuesta-vacunacion/export/excel
 * Requiere autenticación y permiso vaccination_surveys.view.
 */
export async function exportVaccinationSurveyToExcel(
  filters: VaccinationSurveyExportFilters = {}
): Promise<{ blob: Blob; filename: string }> {
  const url = buildAdminApiUrl(API_CONFIG.ENDPOINTS.ENCUESTA_VACUNACION_EXPORT_EXCEL);
  const body =
    filters.date_range != null
      ? { date_range: filters.date_range }
      : {};

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

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

  const blob = await response.blob();
  let filename = 'Reporte_Encuesta_Vacunacion_ProSalud.xlsx';
  const contentDisposition = response.headers.get('Content-Disposition');
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match?.[1]) {
      filename = match[1].replace(/['"]/g, '').trim();
    }
  }

  return { blob, filename };
}
