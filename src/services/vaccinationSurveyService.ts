import axios, { AxiosError } from 'axios';
import { API_CONFIG } from '@/config/api';

const publicApi = axios.create({
  baseURL: API_CONFIG.PUBLIC_BASE_URL,
  withCredentials: false,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  validateStatus: (status) => status >= 200 && status < 300,
});

/** Payload para enviar la encuesta de vacunación */
export interface VaccinationSurveyPayload {
  tipo_documento: string;
  numero_documento: string;
  fecha_nacimiento: string;
  primer_nombre: string;
  segundo_nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  /** Código del hospital/convenio asociado al afiliado (por ejemplo, HSJDRionegro, BELLO, LA MARIA). */
  hospital: string | null;
  fecha_aplicacion_srp: string | null;
  fecha_aplicacion_sr: string | null;
  fecha_aplicacion_fiebre_amarilla: string | null;
  /** Firma en base64 (data URL) como constancia. Requerida. */
  firma: string;
}

export interface VaccinationSurveySuccessResponse {
  success: boolean;
  message?: string;
  data?: {
    id?: number;
    created_at?: string;
  };
}

/** Respuesta de error del API (422, 429, 500) */
export interface VaccinationSurveyErrorResponse {
  success?: boolean;
  message: string;
  errors?: Record<string, string[]>;
  error?: string;
}

/** Error lanzado cuando el API devuelve 4xx/5xx; incluye status y body para mostrar en UI */
export class VaccinationSurveyApiError extends Error {
  status: number;
  body: VaccinationSurveyErrorResponse;

  constructor(status: number, body: VaccinationSurveyErrorResponse) {
    super(body.message || `Error ${status}`);
    this.name = 'VaccinationSurveyApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Envía la encuesta de vacunación (SRP, SR, fiebre amarilla).
 * API: POST /api/encuesta-vacunacion — éxito 201 Created; errores 422, 429, 500.
 */
export const submitVaccinationSurvey = async (
  payload: VaccinationSurveyPayload
): Promise<VaccinationSurveySuccessResponse> => {
  try {
    const response = await publicApi.post<VaccinationSurveySuccessResponse>(
      API_CONFIG.ENDPOINTS.ENCUESTA_VACUNACION,
      payload
    );
    return response.data;
  } catch (err) {
    const axiosError = err as AxiosError<VaccinationSurveyErrorResponse>;
    const status = axiosError.response?.status;
    const data = axiosError.response?.data;

    if (status != null && data != null) {
      throw new VaccinationSurveyApiError(status, {
        message: data.message ?? (status === 429 ? 'Demasiadas solicitudes. Intenta nuevamente más tarde.' : 'Error al procesar la encuesta.'),
        errors: data.errors,
        error: data.error,
      });
    }
    if (axiosError.message) {
      throw new Error(axiosError.message);
    }
    throw new Error('Error al enviar la encuesta de vacunación');
  }
};
