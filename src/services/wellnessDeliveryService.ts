import { authenticatedApi } from './api';
import { logger } from '@/utils/logger';
import axios from 'axios';
import type { SingleBeneficiaryResponse, MultipleBeneficiariesResponse } from './entregasBienestarService';

/** Un tipo activo en affiliate-lookup, con indicador de si este documento ya tiene solicitud */
export interface AffiliateLookupTipoActivo {
  id: number;
  nombre: string;
  modo_acceso: 'listado' | 'abierto';
  fecha_desde: string | null;
  fecha_hasta: string | null;
  siempre_activo: boolean;
  tiene_solicitud: boolean;
  solicitud_estado: 'pendiente' | 'entregado' | null;
  solicitud_id: number | null;
}

/** Respuesta plana del endpoint affiliate-lookup (documento sin fecha expedición) */
export interface AffiliateLookupFlatData {
  documento_afiliado: string;
  tipo_documento?: string;
  nombre_afiliado: string;
  /** Estado del afiliado en el sistema (ej. "Activo") para validación visual al entregar */
  estado?: string;
  hospital?: string | null;
  beneficiarios: Array<{ beneficiario: string; parentesco?: string; edad?: string }>;
  /** Lista de tipos de entrega activos hoy; el usuario elige uno para registrar */
  tipos_activos?: AffiliateLookupTipoActivo[];
  /** true si para algún tipo activo este documento ya tiene solicitud */
  solicitud_existente?: boolean;
  /**
   * true: hay al menos un tipo activo para el que este documento no tiene solicitud → mostrar formulario y selector.
   * false: para todos los tipos activos ya tiene solicitud → no permitir registrar, mostrar mensaje de bloqueo.
   */
  puede_registrar_otro_tipo?: boolean;
  /** Estado de la solicitud existente (por ejemplo, "pendiente" o "entregado") */
  solicitud_estado?: string;
  /** ID de la solicitud existente */
  solicitud_id?: number;
  /** Nombre del tipo de entrega asociado a la solicitud existente */
  tipo_entrega_nombre?: string;
  /**
   * Mensaje condicional: solo cuando solicitud_existente es true.
   * Si puede_registrar_otro_tipo es true → mostrar como aviso informativo.
   * Si puede_registrar_otro_tipo es false → mostrar como mensaje de bloqueo.
   */
  solicitud_existente_mensaje?: string;
}

/** Estructura de búsqueda por documento; puede ser plana (affiliate-lookup) o igual a authenticate */
export type AffiliateLookupData = AffiliateLookupFlatData | SingleBeneficiaryResponse | MultipleBeneficiariesResponse;

/**
 * Tipos para las solicitudes de entrega de bienestar
 */

export interface WellnessDeliveryBeneficiary {
  beneficiario: string;
  parentesco?: string;
  edad?: string;
}

export interface EntregadoPorUser {
  id: number;
  name: string;
  email: string;
}

export interface WellnessDeliveryRequest {
  id: number;
  wellness_delivery_type_id?: number | null;
  tipo_entrega?: string; // legacy
  tipo_entrega_text?: string; // nombre del tipo para mostrar
  documento_afiliado: string;
  nombre_afiliado: string;
  hospital?: string;
  fecha_expedicion?: string;
  beneficiarios: WellnessDeliveryBeneficiary[];
  // Cantidad de beneficiarios asociados a la solicitud (tamaño del array beneficiarios)
  // 0 si no hay arreglo o está vacío
  beneficiarios_count?: number;
  beneficiarios_nombres?: string;
  firma?: string;
  tipo_firma?: string;
  tipo_firma_text?: string;
  firma_recibido?: string; // Firma capturada al momento de la entrega
  cantidad_entregada?: number | string; // Cantidad de elementos entregados
  estado: string;
  estado_text?: string;
  observaciones?: string | null;
  ip_address?: string;
  user_agent?: string;
  entregado_por_user_id?: number;
  entregado_por?: EntregadoPorUser;
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
  tipo_entrega?: string | number; // ID del tipo o valor legacy
  estado?: string;
  documento?: string;
  fecha_desde?: string; // YYYY-MM-DD - Fecha de inicio del rango (incluye todo el día desde 00:00:00)
  fecha_hasta?: string; // YYYY-MM-DD - Fecha de fin del rango (incluye todo el día hasta 23:59:59)
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface UpdateDeliveryStatusRequest {
  estado: 'pendiente' | 'procesado' | 'entregado' | 'cancelado';
  firma_recibido?: string; // Base64 string, obligatorio cuando estado es "entregado"
  cantidad_entregada?: number; // obligatorio cuando estado es "entregado", mínimo 1
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

/** Request para POST /api/wellness-delivery-requests/open (modo_acceso === 'abierto') */
export interface SubmitOpenDeliveryRequest {
  documento_afiliado: string;
  nombre_afiliado: string;
  firma: string;
  hospital?: string;
  fecha_expedicion?: string;
  beneficiarios?: Array<{ beneficiario: string; parentesco?: string; edad?: string }>;
  /** ID del tipo de entrega; obligatorio cuando hay varios tipos activos */
  wellness_delivery_type_id?: number;
}

/** Respuesta de POST /api/wellness-delivery-requests/open */
export interface SubmitOpenDeliveryResponseData {
  id: number;
  wellness_delivery_type_id?: number;
  tipo_entrega_text?: string;
  documento_afiliado: string;
  nombre_afiliado: string;
  estado: string;
  entregado_por_user_id?: number;
  created_at: string;
}

export interface SubmitOpenDeliveryResponse {
  success: boolean;
  message?: string;
  data: SubmitOpenDeliveryResponseData | null;
  errors?: Record<string, string[]>;
}

export interface ExportDeliveryReportRequest {
  tipo_entrega?: number | string; // ID del tipo o valor legacy
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
 * Tipos para la gestión del archivo Excel de Kit de Bienestar
 */

export interface UploadedByUser {
  id: number;
  name: string;
  email: string;
}

export interface WellnessDeliveryFileVersion {
  id: number;
  file_name: string;
  s3_path: string;
  is_active: boolean;
  uploaded_by: UploadedByUser | null;
  created_at: string;
  updated_at: string;
}

export interface UploadFileResponse {
  success: boolean;
  message: string;
  data: WellnessDeliveryFileVersion;
}

export interface FileVersionsResponse {
  success: boolean;
  data: WellnessDeliveryFileVersion[];
}

/**
 * Tipo de entrega (campaña) – administrable desde el panel
 */
export type ModoAccesoType = 'listado' | 'abierto';

export interface WellnessDeliveryType {
  id: number;
  nombre: string;
  activo?: boolean; // legacy; la vigencia se define por rango o siempre_activo
  /** listado = requiere Excel de afiliados; abierto = cualquiera puede solicitar (opcional en respuestas legacy) */
  modo_acceso?: ModoAccesoType;
  /** Y-m-d o null si es siempre activo */
  fecha_desde: string | null;
  /** Y-m-d o null si es siempre activo */
  fecha_hasta: string | null;
  /** true cuando fecha_desde y fecha_hasta son null */
  siempre_activo?: boolean;
  created_by?: { id: number; name: string } | null;
  created_at: string;
  updated_at?: string;
}

export interface WellnessDeliveryTypeListResponse {
  success: boolean;
  data: WellnessDeliveryType[];
}

export interface WellnessDeliveryTypeDetailResponse {
  success: boolean;
  data: WellnessDeliveryType;
}

export interface CreateWellnessDeliveryTypeRequest {
  nombre: string;
  modo_acceso: ModoAccesoType;
  /** Si true, no enviar fecha_desde ni fecha_hasta (tipo siempre activo). Si false, ambas fechas obligatorias. */
  fecha_desde?: string | null; // Y-m-d o null para siempre activo
  fecha_hasta?: string | null; // Y-m-d o null para siempre activo
}

export interface UpdateWellnessDeliveryTypeRequest {
  nombre?: string;
  modo_acceso?: ModoAccesoType;
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
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
      
      if (filters?.tipo_entrega !== undefined && filters?.tipo_entrega !== '') {
        params.append('tipo_entrega', String(filters.tipo_entrega));
      }
      if (filters?.estado) {
        params.append('estado', filters.estado);
      }
      if (filters?.documento) {
        params.append('documento', filters.documento);
      }
      if (filters?.fecha_desde) {
        params.append('fecha_desde', filters.fecha_desde);
      }
      if (filters?.fecha_hasta) {
        params.append('fecha_hasta', filters.fecha_hasta);
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

      logger.debug('Endpoint y parámetros de búsqueda', {
        endpoint,
        queryString,
        documento: filters?.documento,
        tipo_entrega: filters?.tipo_entrega,
        estado: filters?.estado,
      });

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

  /**
   * Subir/Actualizar archivo Excel de Kit de Bienestar
   * POST /api/wellness-delivery-requests/file/upload
   */
  async uploadFile(file: File): Promise<UploadFileResponse> {
    try {
      logger.debug('Subiendo archivo Excel de Kit de Bienestar', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      // Validar tipo de archivo
      const allowedExtensions = ['.xlsx', '.xls'];
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error('El archivo debe ser un Excel (.xlsx o .xls)');
      }

      // Validar tamaño (10MB máximo)
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSizeBytes) {
        throw new Error('El archivo no puede ser mayor a 10MB');
      }

      // Crear FormData
      const formData = new FormData();
      formData.append('file', file);

      // Realizar petición
      // El interceptor de authenticatedApi elimina automáticamente Content-Type para FormData
      // permitiendo que axios lo establezca con el boundary correcto
      const response = await authenticatedApi.post<UploadFileResponse>(
        '/api/wellness-delivery-requests/file/upload',
        formData,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      logger.debug('Archivo subido exitosamente', {
        id: response.data.data?.id,
        fileName: response.data.data?.file_name,
        isActive: response.data.data?.is_active,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Error al subir archivo Excel', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
      logger.error('Error inesperado al subir archivo', { error });
      throw error;
    }
  }

  /**
   * Listar versiones del archivo Excel de Kit de Bienestar
   * GET /api/wellness-delivery-requests/file/versions
   */
  async getFileVersions(): Promise<FileVersionsResponse> {
    try {
      logger.debug('Obteniendo versiones del archivo Excel de Kit de Bienestar');

      const response = await authenticatedApi.get<FileVersionsResponse>(
        '/api/wellness-delivery-requests/file/versions'
      );

      logger.debug('Versiones obtenidas exitosamente', {
        count: response.data.data?.length || 0,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Error al obtener versiones del archivo', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw error;
      }
      logger.error('Error inesperado al obtener versiones', { error });
      throw error;
    }
  }

  /**
   * Listar tipos de entrega (campañas)
   * GET /api/wellness-delivery-types
   */
  async getDeliveryTypes(params?: { activo?: boolean; fecha?: string }): Promise<WellnessDeliveryTypeListResponse> {
    try {
      const search = new URLSearchParams();
      if (params?.activo !== undefined) search.set('activo', String(params.activo));
      if (params?.fecha) search.set('fecha', params.fecha);
      const query = search.toString();
      const url = `/api/wellness-delivery-types${query ? `?${query}` : ''}`;
      const response = await authenticatedApi.get<WellnessDeliveryTypeListResponse>(url);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Error al listar tipos de entrega', { status: error.response?.status, data: error.response?.data });
        throw error;
      }
      throw error;
    }
  }

  /**
   * Obtener un tipo de entrega por ID
   * GET /api/wellness-delivery-types/{id}
   */
  async getDeliveryTypeById(id: number): Promise<WellnessDeliveryTypeDetailResponse> {
    try {
      const response = await authenticatedApi.get<WellnessDeliveryTypeDetailResponse>(`/api/wellness-delivery-types/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Error al obtener tipo de entrega', { id, status: error.response?.status });
        throw error;
      }
      throw error;
    }
  }

  /**
   * Crear tipo de entrega
   * POST /api/wellness-delivery-types
   */
  async createDeliveryType(data: CreateWellnessDeliveryTypeRequest): Promise<WellnessDeliveryTypeDetailResponse & { message?: string }> {
    try {
      const response = await authenticatedApi.post<WellnessDeliveryTypeDetailResponse & { message?: string }>(
        '/api/wellness-delivery-types',
        data,
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Error al crear tipo de entrega', { status: error.response?.status, data: error.response?.data });
        throw error;
      }
      throw error;
    }
  }

  /**
   * Actualizar tipo de entrega
   * PUT/PATCH /api/wellness-delivery-types/{id}
   */
  async updateDeliveryType(id: number, data: UpdateWellnessDeliveryTypeRequest): Promise<WellnessDeliveryTypeDetailResponse & { message?: string }> {
    try {
      const response = await authenticatedApi.patch<WellnessDeliveryTypeDetailResponse & { message?: string }>(
        `/api/wellness-delivery-types/${id}`,
        data,
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Error al actualizar tipo de entrega', { id, status: error.response?.status });
        throw error;
      }
      throw error;
    }
  }

  /**
   * Registrar entrega en modo abierto (solo cuando el tipo activo tiene modo_acceso === 'abierto').
   * Requiere autenticación y permiso wellness_delivery.manage.
   * La solicitud se crea con estado = 'entregado' y entregado_por = usuario autenticado.
   * POST /api/wellness-delivery-requests/open
   */
  async submitOpenDelivery(data: SubmitOpenDeliveryRequest): Promise<SubmitOpenDeliveryResponse> {
    try {
      logger.debug('Enviando solicitud de entrega (modo abierto)', { documento: data.documento_afiliado });
      const response = await authenticatedApi.post<SubmitOpenDeliveryResponse>(
        '/api/wellness-delivery-requests/open',
        data,
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const body = error.response?.data as { success?: boolean; message?: string; data?: unknown; errors?: Record<string, string[]> };
        if (status === 422) {
          return {
            success: false,
            message: body?.message || 'No se pudo registrar la entrega.',
            data: null,
            errors: body?.errors,
          };
        }
        if (status === 409) {
          return {
            success: false,
            message: body?.message || 'Ya existe una solicitud para este documento y tipo de entrega.',
            data: null,
          };
        }
        logger.error('Error al registrar entrega (modo abierto)', { status, data: error.response?.data });
        throw error;
      }
      throw error;
    }
  }

  /**
   * Búsqueda de afiliado por documento (modo interno, sin validar fecha de expedición).
   * Para que un usuario interno registre la entrega: buscar por documento, obtener datos y enviar solicitud con firma.
   * GET /api/wellness-delivery-requests/affiliate-lookup?documento=XXX
   */
  async lookupAffiliateForDelivery(documento: string): Promise<{ success: boolean; data: AffiliateLookupData | null; message?: string }> {
    try {
      const doc = String(documento).trim();
      if (!doc) {
        return { success: false, data: null, message: 'El documento es requerido.' };
      }
      const response = await authenticatedApi.get<{ success: boolean; data: AffiliateLookupData | null; message?: string }>(
        `/api/wellness-delivery-requests/affiliate-lookup?documento=${encodeURIComponent(doc)}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const body = error.response?.data as { message?: string } | undefined;
        if (status === 404) {
          return { success: false, data: null, message: body?.message || 'No se encontró un afiliado con ese documento.' };
        }
        logger.error('Error al buscar afiliado para entrega', { status, data: error.response?.data });
        return { success: false, data: null, message: body?.message || 'Error al buscar el afiliado.' };
      }
      throw error;
    }
  }
}

export const wellnessDeliveryService = new WellnessDeliveryService();

