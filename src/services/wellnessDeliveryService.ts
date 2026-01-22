import { authenticatedApi } from './api';
import { logger } from '@/utils/logger';
import axios from 'axios';

/**
 * Tipos para las solicitudes de entrega de bienestar
 */

export interface WellnessDeliveryBeneficiary {
  beneficiario: string;
  parentesco?: string;
  edad?: string;
}

export interface WellnessDeliveryRequest {
  id: number;
  tipo_entrega: string;
  tipo_entrega_text?: string;
  documento_afiliado: string;
  nombre_afiliado: string;
  hospital?: string;
  fecha_expedicion?: string;
  beneficiarios: WellnessDeliveryBeneficiary[];
  beneficiarios_nombres?: string;
  firma?: string;
  tipo_firma?: string;
  tipo_firma_text?: string;
  firma_recibido?: string; // Firma capturada al momento de la entrega
  estado: string;
  estado_text?: string;
  observaciones?: string | null;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface WellnessDeliveryRequestListResponse {
  success: boolean;
  data: WellnessDeliveryRequest[];
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface WellnessDeliveryRequestDetailResponse {
  success: boolean;
  data: WellnessDeliveryRequest;
  message?: string;
}

export interface WellnessDeliveryRequestFilters {
  tipo_entrega?: string;
  estado?: string;
  documento?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface UpdateDeliveryStatusRequest {
  estado: 'pendiente' | 'procesado' | 'entregado' | 'cancelado';
  firma_recibido?: string; // Base64 string, obligatorio cuando estado es "entregado"
  observaciones?: string;
}

export interface UpdateDeliveryStatusResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    estado: string;
    estado_text: string;
    observaciones?: string | null;
    tiene_firma_recibido: boolean;
    updated_at: string;
  };
}

export interface ExportDeliveryReportRequest {
  tipo_entrega?: 'kit_escolar' | 'desayuno' | 'lonchera';
  estado?: 'pendiente' | 'procesado' | 'entregado' | 'cancelado';
  fecha_desde?: string; // YYYY-MM-DD
  fecha_hasta?: string; // YYYY-MM-DD
  include_firmas?: boolean;
}

export interface ExportDeliveryReportAsyncResponse {
  success: boolean;
  message: string;
  job_id: string;
  status: 'processing';
  check_status_url: string;
}

export interface ExportDeliveryReportStatusResponse {
  success: boolean;
  job_id: string;
  status: 'processing' | 'completed' | 'failed';
  download_url?: string;
  file_name?: string;
  created_at?: string;
  error?: string;
}

/**
 * Servicio para gestionar solicitudes de entrega de bienestar
 */
class WellnessDeliveryService {
  /**
   * Listar solicitudes de entrega de bienestar
   * GET /api/wellness-delivery-requests
   */
  async getRequests(filters?: WellnessDeliveryRequestFilters): Promise<WellnessDeliveryRequestListResponse> {
    try {
      logger.debug('Obteniendo solicitudes de entrega de bienestar', { filters });

      const params = new URLSearchParams();
      
      if (filters?.tipo_entrega) {
        params.append('tipo_entrega', filters.tipo_entrega);
      }
      if (filters?.estado) {
        params.append('estado', filters.estado);
      }
      if (filters?.documento) {
        params.append('documento', filters.documento);
      }
      if (filters?.sort_by) {
        params.append('sort_by', filters.sort_by);
      }
      if (filters?.sort_order) {
        params.append('sort_order', filters.sort_order);
      }
      if (filters?.per_page) {
        params.append('per_page', String(filters.per_page));
      }
      if (filters?.page) {
        params.append('page', String(filters.page));
      }

      const queryString = params.toString();
      const endpoint = `/api/wellness-delivery-requests${queryString ? `?${queryString}` : ''}`;

      const response = await authenticatedApi.get<WellnessDeliveryRequestListResponse>(endpoint);

      logger.debug('Solicitudes de entrega de bienestar obtenidas', {
        count: response.data.data?.length || 0,
        pagination: response.data.pagination,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Error al obtener solicitudes de entrega de bienestar', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
      logger.error('Error inesperado al obtener solicitudes', { error });
      throw error;
    }
  }

  /**
   * Obtener detalles de una solicitud específica
   * GET /api/wellness-delivery-requests/{id}
   */
  async getRequestById(id: number): Promise<WellnessDeliveryRequestDetailResponse> {
    try {
      logger.debug('Obteniendo detalles de solicitud de entrega de bienestar', { id });

      const response = await authenticatedApi.get<WellnessDeliveryRequestDetailResponse>(
        `/api/wellness-delivery-requests/${id}`
      );

      logger.debug('Detalles de solicitud obtenidos', {
        id: response.data.data?.id,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Error al obtener detalles de solicitud', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
      logger.error('Error inesperado al obtener detalles', { error });
      throw error;
    }
  }

  /**
   * Actualizar estado de una solicitud de entrega
   * PATCH /api/wellness-delivery-requests/{id}/status
   */
  async updateStatus(
    id: number,
    data: UpdateDeliveryStatusRequest
  ): Promise<UpdateDeliveryStatusResponse> {
    try {
      logger.debug('Actualizando estado de solicitud de entrega', { id, estado: data.estado });

      const response = await authenticatedApi.patch<UpdateDeliveryStatusResponse>(
        `/api/wellness-delivery-requests/${id}/status`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      logger.debug('Estado actualizado exitosamente', {
        id: response.data.data?.id,
        estado: response.data.data?.estado,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Error al actualizar estado de solicitud', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
      logger.error('Error inesperado al actualizar estado', { error });
      throw error;
    }
  }

  /**
   * Generar reporte Excel de entregas de bienestar
   * POST /api/wellness-delivery-requests/export
   */
  async exportReport(filters: ExportDeliveryReportRequest): Promise<Blob | ExportDeliveryReportAsyncResponse> {
    try {
      logger.debug('Generando reporte Excel de entregas de bienestar', { filters });

      // Si incluye firmas, esperamos respuesta 202 con JSON
      if (filters.include_firmas) {
        const response = await authenticatedApi.post<ExportDeliveryReportAsyncResponse>(
          '/api/wellness-delivery-requests/export',
          filters,
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            responseType: 'json',
            validateStatus: (status) => status === 200 || status === 202, // Aceptar 200 y 202
          }
        );

        // Si es 202, es respuesta asíncrona
        if (response.status === 202) {
          logger.debug('Reporte asíncrono iniciado', { job_id: response.data.job_id });
          return response.data;
        }

        // Si es 200 pero incluye firmas, algo está mal
        throw new Error('Respuesta inesperada del servidor');
      }

      // Si no incluye firmas, esperamos respuesta 200 con Blob
      const response = await authenticatedApi.post<Blob>(
        '/api/wellness-delivery-requests/export',
        filters,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
          responseType: 'blob',
        }
      );

      logger.debug('Reporte Excel generado exitosamente', { size: response.data.size });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Error al generar reporte Excel', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
      logger.error('Error inesperado al generar reporte', { error });
      throw error;
    }
  }

  /**
   * Verificar estado del reporte asíncrono
   * GET /api/wellness-delivery-requests/export/status/{jobId}
   */
  async checkExportStatus(jobId: string): Promise<ExportDeliveryReportStatusResponse> {
    try {
      logger.debug('Verificando estado del reporte', { jobId });

      const response = await authenticatedApi.get<ExportDeliveryReportStatusResponse>(
        `/api/wellness-delivery-requests/export/status/${jobId}`
      );

      logger.debug('Estado del reporte obtenido', {
        jobId: response.data.job_id,
        status: response.data.status,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Error al verificar estado del reporte', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
      logger.error('Error inesperado al verificar estado', { error });
      throw error;
    }
  }

  /**
   * Descargar reporte completado
   * GET /api/wellness-delivery-requests/export/download/{jobId}
   */
  async downloadExport(jobId: string): Promise<Blob> {
    try {
      logger.debug('Descargando reporte completado', { jobId });

      const response = await authenticatedApi.get<Blob>(
        `/api/wellness-delivery-requests/export/download/${jobId}`,
        {
          responseType: 'blob',
        }
      );

      logger.debug('Reporte descargado exitosamente', { size: response.data.size });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Error al descargar reporte', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
      logger.error('Error inesperado al descargar reporte', { error });
      throw error;
    }
  }
}

export const wellnessDeliveryService = new WellnessDeliveryService();

