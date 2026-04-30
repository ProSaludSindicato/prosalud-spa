import api from '@/services/api';
import { API_CONFIG } from '@/config/api';
import type { SurveyAccessType, SurveyQuestion } from './surveyAdminApi';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublicHospital {
  id: number;
  name: string;
}

export interface PublicSurveyInfo {
  id: string;
  title: string;
  description?: string;
  access_type: SurveyAccessType;
  requires_signature: boolean;
  questions: SurveyQuestion[];
  hospitals_for_form: PublicHospital[];
}

export interface SubmitResponseData {
  respondent_document_type?: string;
  respondent_document_number?: string;
  respondent_name?: string;
  hospital?: string;
  fecha_expedicion?: string;
  signature?: string;
  answers: Array<{
    question_id: number;
    value: string;
  }>;
}

export interface SubmitResponseResult {
  id: string;
  submitted_at: string;
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getSurveyInfo(surveyId: string): Promise<PublicSurveyInfo> {
  const response = await api.get<{ success: boolean; data: PublicSurveyInfo; hospitals_for_form: PublicHospital[] }>(
    `${API_CONFIG.ENDPOINTS.SURVEYS}/${surveyId}/info`,
  );
  return {
    ...response.data.data,
    hospitals_for_form: response.data.hospitals_for_form ?? [],
  };
}

/** Valida documento y fecha contra ProSanet antes de mostrar el formulario (encuestas autenticadas/restringidas). */
export async function verifySurveyRespondent(
  surveyId: string,
  data: {
    respondent_document_type: string;
    respondent_document_number: string;
    fecha_expedicion: string;
  },
): Promise<void> {
  await api.post<{ success: boolean; message?: string }>(
    `${API_CONFIG.ENDPOINTS.SURVEYS}/${surveyId}/verify-respondent`,
    data,
  );
}

export async function submitSurveyResponse(
  surveyId: string,
  data: SubmitResponseData,
): Promise<SubmitResponseResult> {
  const response = await api.post<{ data: SubmitResponseResult }>(
    `${API_CONFIG.ENDPOINTS.SURVEYS}/${surveyId}/responses`,
    data,
  );
  return response.data.data;
}
