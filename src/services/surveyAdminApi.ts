import { authenticatedApi } from '@/services/api';
import { buildAdminApiUrl, API_CONFIG } from '@/config/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SurveyStatus = 'draft' | 'active' | 'closed';
export type SurveyAccessType = 'public' | 'authenticated' | 'restricted';
export type QuestionType =
  | 'text'
  | 'textarea'
  | 'yes_no'
  | 'single_choice'
  | 'multiple_choice'
  | 'date'
  | 'number'
  | 'scale'
  | 'ranking';

export interface QuestionOption {
  value: string;
  label: string;
}

export interface SurveyQuestion {
  id: number;
  survey_id: string;
  type: QuestionType;
  label: string;
  help_text?: string;
  is_required: boolean;
  order: number;
  options?: QuestionOption[];
  /** Solo aplica a `type === 'ranking'`. Si true (defecto), dos ítems no pueden compartir el mismo número de prioridad. */
  ranking_unique_priority?: boolean;
}

export interface Hospital {
  id: number;
  name: string;
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  status: SurveyStatus;
  access_type: SurveyAccessType;
  /** Statuses of affiliates allowed to respond. Only applies for authenticated/restricted surveys. */
  allowed_affiliate_statuses: string[];
  requires_signature: boolean;
  allows_multiple_responses: boolean;
  start_date?: string;
  end_date?: string;
  questions?: SurveyQuestion[];
  hospitals?: Hospital[];
  responses_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SurveyResponseAnswer {
  id: number;
  question_id: number;
  question_label?: string;
  question_type?: string;
  value?: string;
  decoded_value?: any;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_document_type?: string;
  respondent_document_number?: string;
  respondent_name?: string;
  hospital?: string;
  submitted_at: string;
  answers?: SurveyResponseAnswer[];
}

export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ExportJobResponse {
  success: boolean;
  job_id: string;
  status: 'processing';
  message: string;
}

export interface ExportStatusResponse {
  success: boolean;
  job_id: string;
  status: 'processing' | 'completed' | 'failed';
  download_url?: string;
  file_name?: string;
  error?: string;
}

export interface CreateSurveyQuestionData {
  type: QuestionType;
  label: string;
  help_text?: string;
  is_required: boolean;
  order: number;
  options?: QuestionOption[];
  ranking_unique_priority?: boolean;
}

export interface CreateSurveyData {
  title: string;
  description?: string;
  access_type: SurveyAccessType;
  /** Affiliate statuses allowed to respond. Only relevant for authenticated/restricted surveys. */
  allowed_affiliate_statuses?: string[];
  status: SurveyStatus;
  requires_signature: boolean;
  allows_multiple_responses: boolean;
  start_date?: string;
  end_date?: string;
  hospital_ids?: number[];
  questions: CreateSurveyQuestionData[];
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function listSurveys(params?: {
  status?: string;
  access_type?: string;
  page?: number;
  per_page?: number;
}): Promise<{ data: Survey[]; meta: PaginatedMeta }> {
  const response = await authenticatedApi.get<{ data: Survey[]; meta: PaginatedMeta }>(
    API_CONFIG.ENDPOINTS.SURVEYS,
    { params },
  );
  return response.data;
}

export async function getSurvey(id: string): Promise<Survey> {
  const response = await authenticatedApi.get<{ data: Survey }>(
    `${API_CONFIG.ENDPOINTS.SURVEYS}/${id}`,
  );
  return response.data.data;
}

export async function createSurvey(data: CreateSurveyData): Promise<Survey> {
  const response = await authenticatedApi.post<{ data: Survey }>(
    API_CONFIG.ENDPOINTS.SURVEYS,
    data,
  );
  return response.data.data;
}

export async function updateSurvey(
  id: string,
  data: Partial<CreateSurveyData>,
): Promise<Survey> {
  const response = await authenticatedApi.put<{ data: Survey }>(
    `${API_CONFIG.ENDPOINTS.SURVEYS}/${id}`,
    data,
  );
  return response.data.data;
}

export async function updateSurveyStatus(
  id: string,
  status: SurveyStatus,
): Promise<Survey> {
  const response = await authenticatedApi.patch<{ data: Survey }>(
    `${API_CONFIG.ENDPOINTS.SURVEYS}/${id}/status`,
    { status },
  );
  return response.data.data;
}

export async function deleteSurvey(id: string): Promise<void> {
  await authenticatedApi.delete(`${API_CONFIG.ENDPOINTS.SURVEYS}/${id}`);
}

export async function duplicateSurvey(id: string): Promise<Survey> {
  const response = await authenticatedApi.post<{ data: Survey }>(
    `${API_CONFIG.ENDPOINTS.SURVEYS}/${id}/duplicate`,
  );
  return response.data.data;
}

export async function listResponses(
  surveyId: string,
  params?: {
    hospital?: string;
    document?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
  },
): Promise<{ data: SurveyResponse[]; meta: PaginatedMeta }> {
  const response = await authenticatedApi.get<{
    data: SurveyResponse[];
    meta: PaginatedMeta;
  }>(`${API_CONFIG.ENDPOINTS.SURVEYS}/${surveyId}/responses`, { params });
  return response.data;
}

export async function getResponse(
  surveyId: string,
  responseId: string,
): Promise<SurveyResponse> {
  const response = await authenticatedApi.get<{ data: SurveyResponse }>(
    `${API_CONFIG.ENDPOINTS.SURVEYS}/${surveyId}/responses/${responseId}`,
  );
  return response.data.data;
}

export async function getFilterOptions(): Promise<{
  hospitals: Hospital[];
  statuses: { value: string; label: string }[];
  access_types: { value: string; label: string }[];
}> {
  const response = await authenticatedApi.get<{
    success: boolean;
    data: {
      hospitals: Hospital[];
      statuses: { value: string; label: string }[];
      access_types: { value: string; label: string }[];
    };
  }>(API_CONFIG.ENDPOINTS.SURVEYS_FILTER_OPTIONS);
  return response.data.data;
}

export async function requestExport(surveyId: string): Promise<ExportJobResponse> {
  const url = buildAdminApiUrl(
    `${API_CONFIG.ENDPOINTS.SURVEYS}/${surveyId}/export`,
  );
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'Error al iniciar la exportación.';
    try {
      const data = await response.json();
      if (data?.message) {
        message = data.message;
      }
    } catch {
      // use default message
    }
    throw new Error(message);
  }

  return response.json();
}

export async function getExportStatus(
  surveyId: string,
  jobId: string,
): Promise<ExportStatusResponse> {
  const url = buildAdminApiUrl(
    `${API_CONFIG.ENDPOINTS.SURVEYS}/${surveyId}/export/status/${jobId}`,
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
        error: data?.message ?? 'Job no encontrado o expirado',
      };
    }
    throw new Error(`Error al verificar estado: ${response.status}`);
  }

  return response.json();
}

export async function downloadExport(
  surveyId: string,
  jobId: string,
): Promise<void> {
  const url = buildAdminApiUrl(
    `${API_CONFIG.ENDPOINTS.SURVEYS}/${surveyId}/export/download/${jobId}`,
  );
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `Error al descargar el archivo: ${response.status}`;
    try {
      const data = await response.json();
      if (data?.message) {
        message = data.message;
      }
    } catch {
      // use default message
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  let filename = 'Reporte_Encuesta.xlsx';
  const contentDisposition = response.headers.get('Content-Disposition');
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match?.[1]) {
      filename = match[1].replace(/['"]/g, '').trim();
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
