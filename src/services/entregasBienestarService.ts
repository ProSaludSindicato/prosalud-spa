import publicApi from './publicApi';
import { logger } from '@/utils/logger';
import axios from 'axios';

/**
 * Tipo de entrega activo (campaña vigente para la fecha actual).
 * Puede ser siempre activo (sin rango) o con rango de fechas.
 */
export type ModoAcceso = 'listado' | 'abierto';

export interface WellnessDeliveryTypeActive {
  id: number;
  nombre: string;
  /** listado = requiere autenticación contra Excel; abierto = puede buscar por documento sin validar listado */
  modo_acceso?: ModoAcceso;
  /** Y-m-d o null si es siempre activo */
  fecha_desde: string | null;
  /** Y-m-d o null si es siempre activo */
  fecha_hasta: string | null;
  /** true cuando no tiene rango de fechas (activo todos los días) */
  siempre_activo: boolean;
}

export interface GetCurrentTypeResponse {
  success: boolean;
  message?: string;
  /** Array de tipos activos hoy (0, 1 o más). null cuando success === false. */
  data: WellnessDeliveryTypeActive[] | null;
}

/**
 * Tipos para la autenticación en solicitudes de entregas de bienestar
 */

export interface AuthenticateRequest {
  tipo_documento: string;
  documento: string;
  fecha_expedicion: string; // Formato: dd/mm/aa
  /** ID del tipo de entrega activo; obligatorio cuando hay varios tipos activos */
  wellness_delivery_type_id?: number;
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
  data: (AuthenticateResponseData & {
    wellness_delivery_type_id?: number;
    tipo_entrega_nombre?: string;
  }) | null;
  errors?: Record<string, string[]>;
  /** Código HTTP cuando success es false (para mostrar mensajes según 404/503) */
  status?: number;
}

export interface SubmitInscriptionRequest {
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
  /** ID del tipo de entrega; obligatorio cuando hay varios tipos activos (viene de authenticate) */
  wellness_delivery_type_id?: number;
}

export interface SubmitInscriptionResponseData {
  id: number;
  wellness_delivery_type_id?: number;
  tipo_entrega_text?: string;
  documento_afiliado: string;
  nombre_afiliado: string;
  estado: string;
  created_at: string;
}

export interface SubmitInscriptionResponse {
  success: boolean;
  message: string;
  data: SubmitInscriptionResponseData | null;
  errors?: Record<string, string[]>;
}

/**
 * Servicio para solicitudes de entregas de bienestar (tipos/campañas dinámicos)
 */
class EntregasBienestarService {
  /**
   * Obtener el tipo de entrega activo para la fecha actual
   * GET /api/kit-bienestar/current-type
   * Si no hay campaña activa, success es false y data es null.
   */
  async getCurrentType(): Promise<GetCurrentTypeResponse> {
    try {
      const response = await publicApi.get<GetCurrentTypeResponse>(
        '/api/kit-bienestar/current-type',
        { headers: { Accept: 'application/json' } }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 200) {
        return error.response.data as GetCurrentTypeResponse;
      }
      logger.error('Error al obtener tipo de entrega activo', {
        error: axios.isAxiosError(error) ? error.message : error,
      });
      return {
        success: false,
        message: 'No se pudo verificar si hay una campaña activa.',
        data: null,
      };
    }
  }

  /**
   * Autenticar afiliado para verificar si cumple con los requisitos
   * POST /api/kit-bienestar/authenticate
   */
  async authenticate(data: AuthenticateRequest): Promise<AuthenticateResponse> {
    try {
      logger.debug('Autenticando afiliado para entrega de bienestar', {
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
        // Manejar errores de validación (422) – puede ser "no hay campaña activa"
        if (error.response?.status === 422) {
          return {
            success: false,
            message: error.response.data?.message || 'Datos de entrada inválidos',
            data: null,
            errors: error.response.data?.errors,
            status: 422,
          };
        }

        // Manejar cuando no se encuentra (404) – no está en el listado (modo listado)
        if (error.response?.status === 404) {
          return {
            success: false,
            message: error.response.data?.message || 'No se encontró la información. La persona no está en el listado de afiliados permitidos para esta campaña.',
            data: null,
            status: 404,
          };
        }

        // Manejar servicio no disponible (503) – Excel no cargado (modo listado)
        if (error.response?.status === 503) {
          return {
            success: false,
            message: error.response.data?.message || 'El listado de afiliados para esta campaña aún no está disponible. Debe cargarse desde el panel de administración.',
            data: null,
            status: 503,
          };
        }

        // Manejar error del servidor (500)
        if (error.response?.status === 500) {
          return {
            success: false,
            message: error.response.data?.message || 'Error interno del servidor',
            data: null,
            status: 500,
          };
        }

        // Otros errores
        logger.error('Error al autenticar afiliado para entrega de bienestar', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });

        return {
          success: false,
          message: error.response?.data?.message || 'Error al procesar la solicitud',
          data: null,
          status: error.response?.status,
        };
      }

      logger.error('Error inesperado al autenticar afiliado', { error });
      throw error;
    }
  }

  /**
   * Enviar solicitud de entrega con firma
   * POST /api/kit-bienestar/request
   * El tipo de entrega no se envía; el backend asigna el tipo activo para la fecha actual.
   */
  async submitInscription(data: SubmitInscriptionRequest): Promise<SubmitInscriptionResponse> {
    try {
      logger.debug('Enviando solicitud de entrega de bienestar', {
        documento: data.documento_afiliado,
      });

      const requestData: Record<string, unknown> = {
        documento_afiliado: data.documento_afiliado,
        nombre_afiliado: data.nombre_afiliado,
        hospital: data.hospital,
        fecha_expedicion: data.fecha_expedicion,
        beneficiarios: data.beneficiarios,
        firma: data.firma,
        tipo_firma: data.tipo_firma || 'digital',
      };
      if (data.wellness_delivery_type_id != null) {
        requestData.wellness_delivery_type_id = data.wellness_delivery_type_id;
      }

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

      logger.debug('Solicitud enviada exitosamente', {
        success: response.data.success,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const body = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;

        logger.debug('Respuesta de error al enviar solicitud', {
          status,
          message: body?.message,
        });

        if (status === 409) {
          return {
            success: false,
            message: body?.message || 'Ya existe una solicitud (pendiente o entregada) para este documento en esta campaña.',
            data: null,
          };
        }

        if (status === 422) {
          return {
            success: false,
            message: body?.message || 'Datos de entrada inválidos',
            data: null,
            errors: body?.errors,
          };
        }

        return {
          success: false,
          message: body?.message || 'Error al procesar la solicitud',
          data: null,
          errors: body?.errors,
        };
      }

      logger.error('Error inesperado al enviar solicitud', { error });
      throw error;
    }
  }
}

export const entregasBienestarService = new EntregasBienestarService();
