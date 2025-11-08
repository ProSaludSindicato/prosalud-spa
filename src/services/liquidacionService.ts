import publicApi from './publicApi';
import { logger } from '@/utils/logger';

// Interfaces para la API real de liquidaciones
export interface LiquidacionRecord {
  "TIPO DE DOCUMENTO": string;
  "N° DOCUMENTO": string;
  "FECHA EXPEDICION": string;
  "NOMBRE": string;
  "HOSPITAL": string;
  "PROCESO": string;
  "FECHA INGRESO": string;
  "FECHA RETIRO": string;
  "ESTADO BD": string;
  "CONVENIOS": string;
  "N° CONVENIOS FIRMADOS": string;
  "N° CONVENIOS PENDIENTES": string;
  "SOLICITUD AFILIACION": string;
  "ACTA DE ENTENDIMIENTO": string;
  "ACTA DE COMPROMISO": string;
  "MOTIVO DE RETIRO": string;
  "CARTA RETIRO": string;
  "DTOS PENDIENTES": string;
  "OBSERVACIONES": string;
}

export interface LiquidacionApiResponse {
  status: "success" | "not_found" | "error";
  data?: LiquidacionRecord[];
  message?: string;
}

export interface ConsultaLiquidacionRequest {
  tipoDocumento: string;
  numeroDocumento: string;
  fechaExpedicion: string;
}

/**
 * Consulta liquidaciones usando la API real
 * @param datos Datos del formulario (tipoDocumento, numeroDocumento, fechaExpedicion)
 * @returns Array de registros de liquidaciones o null si no se encontraron
 */
export const consultarLiquidacion = async (
  datos: ConsultaLiquidacionRequest
): Promise<LiquidacionRecord[] | null> => {
  try {
    const response = await publicApi.post<LiquidacionApiResponse>(
      '/api/liquidaciones/search',
      {
        tipo: datos.tipoDocumento,
        numero_documento: datos.numeroDocumento,
        fecha_expedicion: datos.fechaExpedicion,
      }
    );

    // Manejo de respuesta exitosa
    if (response.data.status === 'success' && response.data.data) {
      logger.debug('Compensaciones finales encontradas', { total: response.data.data.length });
      return response.data.data;
    }

    // No se encontraron registros
    if (response.data.status === 'not_found') {
      logger.debug('No se encontraron compensaciones finales para el documento consultado');
      return null;
    }

    // Otros casos
    logger.warn('Respuesta inesperada al consultar compensaciones finales', {
      status: response.data.status,
    });
    return null;

  } catch (error: any) {
    // Log detallado del error para soporte
    logger.error('Error consultando compensaciones finales', {
      status: error?.response?.status,
      message: error?.response?.data?.message,
    });

    // Re-lanzar el error para que el componente pueda manejarlo
    throw error;
  }
};
