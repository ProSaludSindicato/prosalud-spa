import api from './api';
import { authenticatedApi } from './api';
import { logger } from '@/utils/logger';

export interface ConsultarCertificadoRequest {
  documento: string;
  consecutivo: string;
}

export interface CertificadoData {
  document_number: string;
  consecutivo: string;
  generated_at: string;
  pdf_url: string;
  url_expires_at: string;
}

export interface ConsultarCertificadoResponse {
  success: true;
  data: CertificadoData;
}

export interface ConsultarCertificadoError {
  success: false;
  message: string;
  errors?: {
    documento?: string[];
    consecutivo?: string[];
  };
}

export type ConsultarCertificadoResult = ConsultarCertificadoResponse | ConsultarCertificadoError;

/**
 * Normaliza el número de documento removiendo puntos, espacios y guiones
 */
function normalizeDocument(document: string): string {
  return document.replace(/[.\s-]/g, '');
}

/**
 * Consulta un certificado de convenio por documento y consecutivo
 * @param documento - Número de documento del afiliado (sin puntos ni espacios)
 * @param consecutivo - Número consecutivo del certificado (formato: YYYYMMDD####)
 * @returns Datos del certificado o error
 */
export async function consultarCertificado(
  documento: string,
  consecutivo: string
): Promise<ConsultarCertificadoResult> {
  try {
    // Normalizar documento
    const documentoNormalizado = normalizeDocument(documento);

    logger.debug('Consultando certificado de convenio', {
      documento: documentoNormalizado,
      consecutivo,
    });

    const response = await api.post<ConsultarCertificadoResponse | ConsultarCertificadoError>(
      '/api/certificados/convenio/consultar',
      {
        documento: documentoNormalizado,
        consecutivo,
      }
    );

    if (response.data.success) {
      logger.debug('Certificado encontrado', {
        document_number: response.data.data.document_number,
        consecutivo: response.data.data.consecutivo,
      });
      return response.data as ConsultarCertificadoResponse;
    } else {
      const errorData = response.data as ConsultarCertificadoError;
      logger.warn('Certificado no encontrado', {
        message: errorData.message,
      });
      return response.data as ConsultarCertificadoError;
    }
  } catch (error: any) {
    logger.error('Error al consultar certificado', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    // Manejar diferentes tipos de errores
    if (error.response?.status === 404) {
      return {
        success: false,
        message: error.response?.data?.message || 'Certificado no encontrado. Verifique el número de documento y el consecutivo.',
      };
    }

    if (error.response?.status === 422) {
      return {
        success: false,
        message: 'Error de validación',
        errors: error.response?.data?.errors || {},
      };
    }

    if (error.response?.status === 500) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error del servidor al consultar el certificado.',
      };
    }

    // Error genérico
    return {
      success: false,
      message: error.response?.data?.message || 'Error al consultar el certificado. Por favor intente nuevamente.',
    };
  }
}

// Interfaces para el listado de certificados
export interface CertificadoListItem {
  id: number;
  document_number: string;
  consecutivo: string;
  generated_at: string;
  generated_at_formatted: string;
  storage_path: string;
  pdf_url: string | null;
  url_expires_at: string | null;
}

export interface ListarCertificadosParams {
  documento?: string;
  consecutivo?: string;
  fecha_desde?: string; // formato: YYYY-MM-DD
  fecha_hasta?: string; // formato: YYYY-MM-DD
  page?: number;
  per_page?: number;
}

export interface ListarCertificadosPagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}

export interface ListarCertificadosResponse {
  success: true;
  data: CertificadoListItem[];
  pagination: ListarCertificadosPagination;
}

export interface ListarCertificadosError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export type ListarCertificadosResult = ListarCertificadosResponse | ListarCertificadosError;

/**
 * Lista certificados de convenio con filtros y paginación
 * @param params - Parámetros de filtrado y paginación
 * @returns Lista de certificados con paginación o error
 */
export async function listarCertificados(
  params: ListarCertificadosParams = {}
): Promise<ListarCertificadosResult> {
  try {
    logger.debug('Listando certificados de convenio', params);

    const queryParams: Record<string, string | number> = {};
    
    if (params.documento) {
      queryParams.documento = params.documento;
    }
    if (params.consecutivo) {
      queryParams.consecutivo = params.consecutivo;
    }
    if (params.fecha_desde) {
      queryParams.fecha_desde = params.fecha_desde;
    }
    if (params.fecha_hasta) {
      queryParams.fecha_hasta = params.fecha_hasta;
    }
    if (params.page) {
      queryParams.page = params.page;
    }
    if (params.per_page) {
      queryParams.per_page = params.per_page;
    }

    const response = await authenticatedApi.get<ListarCertificadosResponse | ListarCertificadosError>(
      '/api/certificados/convenio',
      { params: queryParams }
    );

    if (response.data.success) {
      logger.debug('Certificados listados exitosamente', {
        total: response.data.pagination.total,
        current_page: response.data.pagination.current_page,
      });
      return response.data as ListarCertificadosResponse;
    } else {
      const errorData = response.data as ListarCertificadosError;
      logger.warn('Error al listar certificados', {
        message: errorData.message,
      });
      return errorData;
    }
  } catch (error: any) {
    logger.error('Error al listar certificados', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    // Manejar diferentes tipos de errores
    if (error.response?.status === 401) {
      return {
        success: false,
        message: 'No autorizado. Por favor inicie sesión nuevamente.',
      };
    }

    if (error.response?.status === 422) {
      return {
        success: false,
        message: 'Error de validación',
        errors: error.response?.data?.errors || {},
      };
    }

    if (error.response?.status === 500) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error del servidor al listar los certificados.',
      };
    }

    // Error genérico
    return {
      success: false,
      message: error.response?.data?.message || 'Error al listar los certificados. Por favor intente nuevamente.',
    };
  }
}

// Interfaces para estadísticas de certificados
export interface EstadisticasResumen {
  total_certificados: number;
  con_compensaciones: number;
  con_actividades: number;
  dirigidos_afp: number;
  subsidio_vivienda: number;
  bancolombia: number;
  subsidio_desempleo: number;
  basicos: number;
  otros: number;
}

export interface EstadisticasPorTipo {
  basico: number;
  bancolombia: number;
  subsidio_vivienda: number;
  subsidio_desempleo: number;
  con_actividades: number;
  dirigido_afp: number;
  otros: number;
}

export interface TopEntidad {
  entidad: string;
  cantidad: number;
}

export interface DistribucionMensual {
  mes: string; // formato: YYYY-MM
  cantidad: number;
}

export interface EstadisticasFiltros {
  fecha_desde: string | null;
  fecha_hasta: string | null;
}

export interface EstadisticasData {
  resumen: EstadisticasResumen;
  por_tipo: EstadisticasPorTipo;
  top_entidades: TopEntidad[];
  distribucion_mensual: DistribucionMensual[];
  filtros_aplicados: EstadisticasFiltros;
}

export interface EstadisticasParams {
  fecha_desde?: string; // formato: YYYY-MM-DD
  fecha_hasta?: string; // formato: YYYY-MM-DD
}

export interface EstadisticasResponse {
  success: true;
  data: EstadisticasData;
}

export interface EstadisticasError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export type EstadisticasResult = EstadisticasResponse | EstadisticasError;

/**
 * Obtiene estadísticas y métricas de trazabilidad de los certificados de convenio
 * @param params - Parámetros opcionales de filtrado por fechas
 * @returns Estadísticas de certificados o error
 */
export async function obtenerEstadisticas(
  params: EstadisticasParams = {}
): Promise<EstadisticasResult> {
  try {
    logger.debug('Obteniendo estadísticas de certificados de convenio', params);

    const queryParams: Record<string, string> = {};
    
    if (params.fecha_desde) {
      queryParams.fecha_desde = params.fecha_desde;
    }
    if (params.fecha_hasta) {
      queryParams.fecha_hasta = params.fecha_hasta;
    }

    const response = await authenticatedApi.get<EstadisticasResponse | EstadisticasError>(
      '/api/certificados/convenio/estadisticas',
      { params: queryParams }
    );

    if (response.data.success) {
      logger.debug('Estadísticas obtenidas exitosamente', {
        total_certificados: response.data.data.resumen.total_certificados,
      });
      return response.data as EstadisticasResponse;
    } else {
      const errorData = response.data as EstadisticasError;
      logger.warn('Error al obtener estadísticas', {
        message: errorData.message,
      });
      return errorData;
    }
  } catch (error: any) {
    logger.error('Error al obtener estadísticas', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    // Manejar diferentes tipos de errores
    if (error.response?.status === 401) {
      return {
        success: false,
        message: 'No autorizado. Por favor inicie sesión nuevamente.',
      };
    }

    if (error.response?.status === 422) {
      return {
        success: false,
        message: 'Error de validación',
        errors: error.response?.data?.errors || {},
      };
    }

    if (error.response?.status === 500) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error del servidor al obtener las estadísticas.',
      };
    }

    // Error genérico
    return {
      success: false,
      message: error.response?.data?.message || 'Error al obtener las estadísticas. Por favor intente nuevamente.',
    };
  }
}

