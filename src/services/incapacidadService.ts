import publicApi from './publicApi';
import { logger } from '@/utils/logger';

// Interfaces para la API real de incapacidades
export interface IncapacidadRecord {
  "N° Radicado": string;
  "fecha recibido": string;
  "Tipo": string;
  "Numero Documento": string;
  "Nombres": string;
  "Cargo": string;
  "Fecha Incio Incapacidad": string;
  "Fecha Fin Incapacidad": string;
  "Dias Incapacidad": string;
  "CODIGO CIE-10": string;
  "TIPO INCAPACIDAD": string;
  "CLASIFICACION": string;
  "ADMINISTRADORA": string;
  "FECHA ENVIO": string;
  "RADICADO": string;
  "estado": string;
  "detalles": string;
  "valor Incapacidad Recibido": string;
  "Hospital": string;
  "REPORTE FACTURA": string;
  "REPORTE VIVI": string;
}

export interface IncapacidadApiResponse {
  status: "success" | "not_found" | "error";
  data?: IncapacidadRecord[];
  message?: string;
}

export interface ConsultaIncapacidadRequest {
  tipoDocumento: string;
  numeroDocumento: string;
  fechaExpedicion: string;
}

/**
 * Consulta incapacidades usando la API real
 * @param datos Datos del formulario (tipoDocumento, numeroDocumento, fechaExpedicion)
 * @returns Array de registros de incapacidades o null si no se encontraron
 */
export const consultarIncapacidad = async (
  datos: ConsultaIncapacidadRequest
): Promise<IncapacidadRecord[] | null> => {
  try {
    const response = await publicApi.post<IncapacidadApiResponse>(
      '/api/incapacidades/search',
      {
        tipo: datos.tipoDocumento,
        numero_documento: datos.numeroDocumento,
        fecha_expedicion: datos.fechaExpedicion,
      }
    );

    // Manejo de respuesta exitosa
    if (response.data.status === 'success' && response.data.data) {
      logger.info('✅ Incapacidades encontradas:', response.data.data.length);
      return response.data.data;
    }

    // No se encontraron registros
    if (response.data.status === 'not_found') {
      logger.info('ℹ️ No se encontraron incapacidades para el documento consultado');
      return null;
    }

    // Otros casos
    logger.warn('⚠️ Respuesta inesperada de la API:', response.data);
    return null;

  } catch (error: any) {
    // Log detallado del error para soporte
    logger.error('❌ Error consultando incapacidades:', {
      status: error?.response?.status,
      message: error?.response?.data?.message,
      errors: error?.response?.data?.errors,
    });

    // Re-lanzar el error para que el componente pueda manejarlo
    throw error;
  }
};
