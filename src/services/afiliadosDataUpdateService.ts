import axios from 'axios';
import { API_CONFIG } from '@/config/api';

// Create axios instance for data update authentication endpoints
const dataUpdateApi = axios.create({
  baseURL: API_CONFIG.PUBLIC_BASE_URL,
  withCredentials: false,
  timeout: 15000, // 15 segundos timeout
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
      const errorData: ApiErrorResponse = error.response.data || {};

      if (status === 400) {
        const message = errorData.message || 'Los datos proporcionados no son válidos.';
        throw new Error(message);
      } else if (status === 401) {
        throw new Error('Credenciales incorrectas o afiliado no encontrado');
      } else if (status === 422) {
        const message = errorData.message || 'Datos de entrada inválidos';
        throw new Error(message);
      } else if (status === 500) {
        throw new Error('Error interno del servidor');
      } else if (status === 503) {
        throw new Error('Servicio temporalmente no disponible');
      }
      throw new Error(errorData.message || `Error al autenticar (${status})`);
    } else if (error.code === 'ERR_NETWORK' || error.message.includes('Failed to fetch')) {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.');
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('La solicitud tardó demasiado. Por favor, intenta nuevamente.');
    }
    throw new Error(error.message || 'Error desconocido al autenticar');
  }
};

