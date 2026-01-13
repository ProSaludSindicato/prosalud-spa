import { authenticatedApi } from './api';
import publicApi from './publicApi';

export interface SurveyConfig {
  allow_bulk_entry_mode: boolean;
  updated_at: string;
}

export interface SurveyConfigResponse {
  success: true;
  data: SurveyConfig;
}

export interface SurveyConfigErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface UpdateSurveyConfigRequest {
  allow_bulk_entry_mode: boolean;
}

export interface UpdateSurveyConfigResponse {
  success: true;
  message: string;
  data: SurveyConfig;
}

class SurveyConfigApi {
  /**
   * Obtener configuración de encuestas (público, sin autenticación)
   */
  async getPublicConfig(): Promise<SurveyConfigResponse> {
    const response = await publicApi.get<SurveyConfigResponse>(
      '/api/survey-config/public'
    );
    return response.data;
  }

  /**
   * Obtener configuración de encuestas (admin, requiere autenticación)
   */
  async getConfig(): Promise<SurveyConfigResponse> {
    const response = await authenticatedApi.get<SurveyConfigResponse>(
      '/api/survey-config'
    );
    return response.data;
  }

  /**
   * Actualizar configuración de encuestas (admin, requiere autenticación)
   */
  async updateConfig(data: UpdateSurveyConfigRequest): Promise<UpdateSurveyConfigResponse> {
    const response = await authenticatedApi.put<UpdateSurveyConfigResponse>(
      '/api/survey-config',
      data
    );
    return response.data;
  }
}

export const surveyConfigApi = new SurveyConfigApi();

