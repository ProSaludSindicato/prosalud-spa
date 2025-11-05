import axios from 'axios';
import { API_CONFIG } from '@/config/api';

// Create axios instance for OTP endpoints
const otpApi = axios.create({
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

// Request OTP types
export interface RequestOtpRequest {
  tipo_documento: string;
  documento: string;
  fecha_expedicion: string;
}

export interface RequestOtpResponse {
  success: boolean;
  message: string;
  session_id: string;
  email_obfuscated: string;
}

// Verify OTP types
export interface VerifyOtpRequest {
  tipo_documento: string;
  documento: string;
  fecha_expedicion: string;
  session_id: string;
  otp: string;
}

export interface AfiliadoData {
  tipo_documento: string;
  documento: string;
  nombres: string;
  apellidos: string;
  estado: string;
  fecha_expedicion: string;
  fecha_nacimiento: string;
  lugar_nacimiento: string;
  sexo: string;
  rh: string;
  fecha_ingreso: string;
  estado_civil: string;
  carnet: string;
  direccion: string;
  departamento: string;
  municipio: string;
  telefono: string;
  celular: string;
  correo_personal: string;
  archivo_liquidado: string | null;
  fecha_liquidacion: string | null;
  talla_uniforme: string;
  talla_calzado: string;
  nivel_educacion: string;
  otros_estudios: string | null;
  numero_cuenta: string;
  tipo_cuenta: string;
  banco: string;
  fecha_rethus: string;
  compensacion_basica: string;
  tipo_afiliacion: string;
  eps: string;
  afp: string;
  arl: string;
  caja_compensacion: string;
  nivel_riesgo: string;
  fecha_vencimiento_poliza: string;
  emisor_poliza: string;
  detalles: string | null;
}

export interface ConvenioData {
  documento_afiliado: string;
  nombre_afiliado: string;
  apellidos_afiliado: string;
  cliente: string;
  sucursal: string;
  proceso: string;
  estado: string;
  fecha_ingreso: string;
  fecha_fin: string;
  notas: string | null;
}

export interface BeneficiarioData {
  documento_afiliado: string;
  tipo_documento: string;
  documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  parentesco: string;
  sexo: string;
  estado: string | null;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  data: {
    afiliado: AfiliadoData;
    convenios: ConvenioData[];
    beneficiarios: BeneficiarioData[];
  };
}

// Error response types
export interface ApiErrorResponse {
  success?: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * Solicita un código OTP para autenticación de afiliado
 */
export const requestOtp = async (data: RequestOtpRequest): Promise<RequestOtpResponse> => {
  try {
    const response = await otpApi.post<RequestOtpResponse>(
      API_CONFIG.ENDPOINTS.AFILIADOS_REQUEST_OTP,
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
        throw new Error('Credenciales incorrectas o el afiliado no tiene correo electrónico registrado');
      } else if (status === 429) {
        throw new Error('Has solicitado demasiados códigos. Por favor, espera un momento antes de intentar nuevamente.');
      } else if (status === 500) {
        throw new Error('Error al enviar el código de verificación. Por favor, intenta nuevamente más tarde.');
      } else if (status === 503) {
        throw new Error('Servicio temporalmente no disponible');
      }
      throw new Error(errorData.message || `Error al solicitar código OTP (${status})`);
    } else if (error.code === 'ERR_NETWORK' || error.message.includes('Failed to fetch')) {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.');
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('La solicitud tardó demasiado. Por favor, intenta nuevamente.');
    }
    throw new Error(error.message || 'Error desconocido al solicitar código OTP');
  }
};

/**
 * Verifica el código OTP y obtiene la información completa del afiliado
 */
export const verifyOtp = async (data: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
  try {
    const response = await otpApi.post<VerifyOtpResponse>(
      API_CONFIG.ENDPOINTS.AFILIADOS_VERIFY_OTP,
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
        throw new Error('Código OTP inválido o expirado. Por favor, solicita un nuevo código.');
      } else if (status === 500) {
        throw new Error('Error al obtener información del afiliado');
      } else if (status === 503) {
        throw new Error('Servicio temporalmente no disponible');
      }
      throw new Error(errorData.message || `Error al verificar código OTP (${status})`);
    } else if (error.code === 'ERR_NETWORK' || error.message.includes('Failed to fetch')) {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.');
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('La solicitud tardó demasiado. Por favor, intenta nuevamente.');
    }
    throw new Error(error.message || 'Error desconocido al verificar código OTP');
  }
};

