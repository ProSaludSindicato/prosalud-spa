import publicApi from './publicApi';
import { logger } from '@/utils/logger';
import axios from 'axios';

/**
 * Tipos para la autenticación del Kit de Bienestar Escolar
 */

export interface AuthenticateRequest {
  tipo_documento: string;
  documento: string;
  fecha_expedicion: string; // Formato: dd/mm/aa
}

export interface SingleBeneficiaryResponse {
  cc: string;
  nombre: string;
  hospital: string;
  fecha_expedicion: string;
  beneficiario: string;
  parentesco: string;
  edad: string;
}

export interface MultipleBeneficiariesResponse {
  afiliado: {
    cc: string;
    nombre: string;
    hospital: string;
    fecha_expedicion: string;
  };
  beneficiarios: Array<{
    beneficiario: string;
    parentesco: string;
    edad: string;
  }>;
}

export type AuthenticateResponseData = SingleBeneficiaryResponse | MultipleBeneficiariesResponse;

export interface AuthenticateResponse {
  success: boolean;
  message: string;
  data: AuthenticateResponseData | null;
  errors?: Record<string, string[]>;
}

export interface SubmitInscriptionRequest {
  tipo_entrega: string; // "kit_escolar"
  documento_afiliado: string;
  nombre_afiliado: string;
  hospital?: string;
  fecha_expedicion: string;
  beneficiarios: Array<{
    beneficiario: string;
    parentesco?: string;
    edad?: string;
  }>;
  firma: string; // Base64 data URL de la firma
  tipo_firma?: string; // "digital" (default)
}

export interface SubmitInscriptionResponse {
  success: boolean;
  message: string;
  data: any;
}

/**
 * Servicio para el Kit de Bienestar Escolar
 */
class KitBienestarService {
  /**
   * Autenticar afiliado para verificar si cumple con los requisitos
   * POST /api/kit-bienestar/authenticate
   */
  async authenticate(data: AuthenticateRequest): Promise<AuthenticateResponse> {
    try {
      logger.debug('Autenticando afiliado para Kit de Bienestar Escolar', {
        documento: data.documento,
        tipo_documento: data.tipo_documento,
      });

      const response = await publicApi.post<AuthenticateResponse>(
        '/api/kit-bienestar/authenticate',
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      logger.debug('Respuesta de autenticación recibida', {
        success: response.data.success,
        hasData: !!response.data.data,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Manejar errores de validación (422)
        if (error.response?.status === 422) {
          return {
            success: false,
            message: error.response.data?.message || 'Datos de entrada inválidos',
            data: null,
            errors: error.response.data?.errors,
          };
        }

        // Manejar cuando no se encuentra (404)
        if (error.response?.status === 404) {
          return {
            success: false,
            message: error.response.data?.message || 'Lo sentimos, no cumples con los requisitos para reclamar el beneficio de los kits escolares en este momento.',
            data: null,
          };
        }

        // Manejar servicio no disponible (503)
        if (error.response?.status === 503) {
          return {
            success: false,
            message: error.response.data?.message || 'Servicio temporalmente no disponible',
            data: null,
          };
        }

        // Manejar error del servidor (500)
        if (error.response?.status === 500) {
          return {
            success: false,
            message: error.response.data?.message || 'Error interno del servidor',
            data: null,
          };
        }

        // Otros errores
        logger.error('Error al autenticar afiliado para Kit de Bienestar', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });

        return {
          success: false,
          message: error.response?.data?.message || 'Error al procesar la solicitud',
          data: null,
        };
      }

      logger.error('Error inesperado al autenticar afiliado', { error });
      throw error;
    }
  }

  /**
   * Enviar inscripción con firma
   * POST /api/kit-bienestar/request
   */
  async submitInscription(data: SubmitInscriptionRequest): Promise<SubmitInscriptionResponse> {
    try {
      logger.debug('Enviando inscripción de Kit de Bienestar Escolar', {
        documento: data.documento_afiliado,
      });

      // Preparar el request según el nuevo formato del API
      const requestData = {
        tipo_entrega: data.tipo_entrega || 'kit_escolar',
        documento_afiliado: data.documento_afiliado,
        nombre_afiliado: data.nombre_afiliado,
        hospital: data.hospital,
        fecha_expedicion: data.fecha_expedicion,
        beneficiarios: data.beneficiarios,
        firma: data.firma,
        tipo_firma: data.tipo_firma || 'digital',
      };

      const response = await publicApi.post<SubmitInscriptionResponse>(
        '/api/kit-bienestar/request',
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      logger.debug('Inscripción enviada exitosamente', {
        success: response.data.success,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Error al enviar inscripción de Kit de Bienestar', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });

        if (error.response?.status === 422) {
          return {
            success: false,
            message: error.response.data?.message || 'Datos de entrada inválidos',
            data: null,
          };
        }

        return {
          success: false,
          message: error.response?.data?.message || 'Error al procesar la inscripción',
          data: null,
        };
      }

      logger.error('Error inesperado al enviar inscripción', { error });
      throw error;
    }
  }
}

export const kitBienestarService = new KitBienestarService();

