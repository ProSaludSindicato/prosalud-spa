import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import { createClientFacingError, isNetworkErrorWithoutResponse, isTimeoutError } from '@/utils/errorSanitizer';

// Create axios instance for data update authentication endpoints
const dataUpdateApi = axios.create({
  baseURL: API_CONFIG.PUBLIC_BASE_URL,
  withCredentials: false,
  timeout: 90000, // 90 segundos timeout - el proceso en el backend puede tomar más de 30 segundos (consulta Excel)
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  validateStatus: function (status) {
    return status >= 200 && status < 300;
  },
});

// Authenticate for data update types
export interface AuthenticateForDataUpdateRequest {
  tipo_documento: string;
  documento: string;
  fecha_expedicion: string;
}

export interface AfiliadoDataForUpdate {
  tipo_documento: string;
  documento: string;
  nombres: string;
  apellidos: string;
  estado: string;
  celular: string;
  correo_personal: string;
  fecha_nacimiento?: string | null;
  lugar_nacimiento?: string | null;
  estado_civil?: string | null;
  direccion?: string | null;
  municipio?: string | null;
  telefono?: string | null;
  talla_uniforme?: string | null;
  talla_calzado?: string | null;
  nivel_educacion?: string | null;
  numero_cuenta?: string | null;
  tipo_cuenta?: string | null;
  banco?: string | null;
  eps?: string | null;
  afp?: string | null;
  nombre_contacto_emergencia?: string | null;
  relacion_contacto_emergencia?: string | null;
  telefono_contacto_emergencia?: string | null;
  contacto_emergencia?: string | null; // Campo combinado del backend: "telefono - nombre - relacion"
}

export interface ConvenioDataForUpdate {
  cliente: string;
  proceso: string;
  estado: string;
  fecha_ingreso: string;
  fecha_fin: string | null;
}

export interface BeneficiarioDataForUpdate {
  documento_afiliado: string;
  tipo_documento: string;
  documento: string;
  nombres: string;
  apellidos: string;
  sexo: string;
  parentesco: string;
  estado?: string | null;
}

export interface AuthenticateForDataUpdateResponse {
  success: boolean;
  message: string;
  data: {
    afiliado: AfiliadoDataForUpdate;
    convenios: ConvenioDataForUpdate[];
    beneficiarios: BeneficiarioDataForUpdate[];
  };
}

// Error response types
export interface ApiErrorResponse {
  success?: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

/** Razón de fallo de autenticación (401) según el API */
export type AuthFailureReason = 'affiliate_not_found' | 'affiliate_data_mismatch';

export interface AuthFailureErrorResponse {
  success?: boolean;
  message: string;
  auth_failure_reason?: AuthFailureReason;
  afiliado?: null;
}

/** Error con razón de fallo para que el UI diferencie el comportamiento */
export class AfiliadoAuthFailureError extends Error {
  authFailureReason?: AuthFailureReason;
  constructor(message: string, authFailureReason?: AuthFailureReason) {
    super(message);
    this.name = 'AfiliadoAuthFailureError';
    this.authFailureReason = authFailureReason;
  }
}

/**
 * Autentica un afiliado para actualización de datos personales
 * Devuelve información completa sin requerir validación OTP
 */
export const authenticateForDataUpdate = async (
  data: AuthenticateForDataUpdateRequest
): Promise<AuthenticateForDataUpdateResponse> => {
  try {
    const response = await dataUpdateApi.post<AuthenticateForDataUpdateResponse>(
      API_CONFIG.ENDPOINTS.AFILIADOS_AUTHENTICATE_FOR_DATA_UPDATE,
      data
    );

    return response.data;
    } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const errorData: ApiErrorResponse & AuthFailureErrorResponse = error.response.data || {};

      if (status === 400) {
        const message = errorData.message || 'Los datos proporcionados no son válidos.';
        throw new Error(message);
      } else if (status === 401) {
        const reason = errorData.auth_failure_reason;
        const message = "No pudimos verificar tu identidad con los datos proporcionados. Confirma que tu número de documento, tipo de documento y fecha de expedición sean correctos. Si la información es correcta, por favor contacta al equipo de ProSalud para obtener ayuda.";
        throw new AfiliadoAuthFailureError(message, reason);
      } else if (status === 422) {
        const message = errorData.message || 'Datos de entrada inválidos';
        throw new Error(message);
      } else if (status === 500) {
        throw new Error('Error interno del servidor');
      } else if (status === 503) {
        throw new Error('Servicio temporalmente no disponible');
      }
      throw new Error(errorData.message || `Error al autenticar (${status})`);
    }

    if (isTimeoutError(error) || isNetworkErrorWithoutResponse(error)) {
      throw createClientFacingError(error);
    }

    throw createClientFacingError(error);
  }
};

