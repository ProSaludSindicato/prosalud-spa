import { requestsApiService, ApiRequest, ApiRequestResponse, ApiRequestFile, ApiResponseAttachment, ApiResponseResponder, GetRequestsParams, ApiPagination } from './requestsApi';
import { Request, RequestResponse, RequestStats, RequestFile, ResponseAttachment, ResponseResponder } from '@/types/requests';
import { logger } from '@/utils/logger';

// Map API status to frontend status
const mapApiStatusToFrontendStatus = (apiStatus: string): Request['status'] => {
  switch (apiStatus) {
    case 'PENDING':
      return 'pending';
    case 'IN_REVIEW':
      return 'in_progress';
    case 'REJECTED':
      return 'rejected';
    case 'COMPLETED':
      return 'resolved';
    default:
      return 'pending';
  }
};

// Map API response attachment to frontend attachment
const mapApiAttachmentToFrontendAttachment = (apiAttachment: ApiResponseAttachment): ResponseAttachment => {
  return {
    id: apiAttachment.id,
    original_name: apiAttachment.original_name,
    download_url: apiAttachment.download_url,
    url_expires_at: apiAttachment.url_expires_at,
    created_at: apiAttachment.created_at,
  };
};

// Map API response responder to frontend responder
const mapApiResponderToFrontendResponder = (apiResponder: ApiResponseResponder): ResponseResponder => {
  return {
    id: apiResponder.id,
    name: apiResponder.name,
    email: apiResponder.email,
  };
};

// Map API response to frontend response
const mapApiResponseToFrontendResponse = (apiResponse: ApiRequestResponse): RequestResponse => {
  return {
    id: apiResponse.id,
    status: mapApiStatusToFrontendStatus(apiResponse.status),
    email_subject: apiResponse.email_subject,
    email_body: apiResponse.email_body,
    created_at: apiResponse.created_at,
    responded_by: apiResponse.responded_by ? mapApiResponderToFrontendResponder(apiResponse.responded_by) : null,
    attachments: apiResponse.attachments?.map(mapApiAttachmentToFrontendAttachment),
    attachments_count: apiResponse.attachments_count ?? apiResponse.attachments?.length ?? 0,
  };
};

// Map frontend status to API status
const mapFrontendStatusToApiStatus = (frontendStatus: Request['status']): 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED' => {
  switch (frontendStatus) {
    case 'pending':
      return 'PENDING';
    case 'in_progress':
      return 'IN_REVIEW';
    case 'resolved':
      return 'COMPLETED';
    case 'rejected':
      return 'REJECTED';
    default:
      return 'PENDING';
  }
};

// Map backend request type to frontend request type
const mapBackendRequestTypeToFrontend = (backendType: string): Request['request_type'] => {
  const typeMap: Record<string, Request['request_type']> = {
    'solicitud-retiro-sindical': 'retiro-sindical',
    'solicitud-microcredito': 'microcredito',
    'incapacidades-licencias': 'incapacidad-licencia',
    'compensacion-descanso': 'descanso-laboral',
    // Tipos que son iguales en backend y frontend
    'certificado-convenio': 'certificado-convenio',
    'compensacion-anual': 'compensacion-anual',
    'verificacion-pagos': 'verificacion-pagos',
    'actualizar-datos-personales': 'actualizar-datos-personales',
    'permisos-turnos': 'permisos-turnos',
    'solicitud-bienestar': 'solicitud-bienestar',
  };
  
  return typeMap[backendType] || (backendType as Request['request_type']);
};

const mapFrontendRequestTypeToBackend = (frontendType: string): string => {
  const typeMap: Record<string, string> = {
    'retiro-sindical': 'solicitud-retiro-sindical',
    'microcredito': 'solicitud-microcredito',
    'incapacidad-licencia': 'incapacidades-licencias',
    'descanso-laboral': 'compensacion-descanso',
  };

  return typeMap[frontendType] || frontendType;
};

const parseApiPayload = (payload: unknown): Record<string, unknown> => {
  if (!payload) {
    return {};
  }

  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  return payload as Record<string, unknown>;
};

// Map API file to frontend file
const mapApiFileToFrontendFile = (apiFile: ApiRequestFile): RequestFile => {
  return {
    original_name: apiFile.original_name,
    mime_type: apiFile.mime_type,
    size: apiFile.size,
    original_key: apiFile.original_key,
    download_url: apiFile.download_url,
    url_expires_at: apiFile.url_expires_at,
  };
};

// Map API request to frontend request
const mapApiRequestToFrontendRequest = (apiRequest: ApiRequest): Request => {
  // Map files if present
  const files: Record<string, RequestFile> | undefined = apiRequest.files
    ? Object.entries(apiRequest.files).reduce((acc, [key, apiFile]) => {
        acc[key] = mapApiFileToFrontendFile(apiFile);
        return acc;
      }, {} as Record<string, RequestFile>)
    : undefined;

  return {
    id: apiRequest.id?.toString() || '',
    request_type: mapBackendRequestTypeToFrontend(apiRequest.request_type),
    request_subtype: apiRequest.request_subtype || null,
    id_type: apiRequest.document_type as Request['id_type'],
    id_number: apiRequest.document_number || '',
    name: apiRequest.name || '',
    last_name: apiRequest.last_name || '',
    email: apiRequest.email || '',
    phone_number: apiRequest.phone_number || '',
    payload: parseApiPayload(apiRequest.payload),
    status: mapApiStatusToFrontendStatus(apiRequest.status),
    rejection_reason: apiRequest.rejection_reason || undefined,
    status_reason: apiRequest.status_reason || undefined,
    created_at: apiRequest.created_at || '',
    processed_at: apiRequest.processed_at,
    resolved_at: (apiRequest.status === 'COMPLETED' || apiRequest.status === 'REJECTED') 
      ? apiRequest.processed_at 
      : undefined,
    validated_at: apiRequest.validated_at || undefined,
    validated_by: apiRequest.validated_by || undefined,
    responses: apiRequest.responses?.map(mapApiResponseToFrontendResponse) || [],
    responses_count: apiRequest.responses_count ?? apiRequest.responses?.length ?? 0,
    files,
    files_count: apiRequest.files_count,
    last_status_change: apiRequest.last_status_change || undefined,
  };
};

export interface RequestsListResult {
  data: Request[];
  pagination?: ApiPagination;
}

export interface GetRequestsServiceParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  requestType?: string;
  requestSubtype?: string;
  sortBy?: 'created_at' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// Service that connects to real API only - no mock fallbacks
export const requestsService = {
  async getRequests(params: GetRequestsServiceParams = {}): Promise<RequestsListResult> {
    logger.debug('Fetching requests from API', params);

    const apiParams: GetRequestsParams = {
      page: params.page,
      per_page: params.perPage,
      search: params.search,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      request_type: params.requestType && params.requestType !== 'all'
        ? mapFrontendRequestTypeToBackend(params.requestType)
        : undefined,
      request_subtype: params.requestSubtype && params.requestSubtype !== 'all'
        ? params.requestSubtype
        : undefined,
      sort_by: params.sortBy,
      sort_order: params.sortOrder,
    };

    const response = await requestsApiService.getRequests(apiParams);

    return {
      data: response.data.map(mapApiRequestToFrontendRequest),
      pagination: response.pagination,
    };
  },

  async getRequestById(id: string): Promise<Request | null> {
    // Validar que el ID es un string de 10 dígitos (preserva ceros iniciales)
    if (!id || typeof id !== 'string' || !/^\d{10}$/.test(id)) {
      throw new Error('ID inválido - debe ser un string de 10 dígitos');
    }

    const apiRequest = await requestsApiService.getRequestById(id);
    return mapApiRequestToFrontendRequest(apiRequest);
  },

  async updateRequestStatus(
    id: string,
    status: Request['status'],
    rejection_reason?: string | null,
    status_reason?: string | null,
  ): Promise<Request> {
    // Validar que el ID es un string de 10 dígitos (preserva ceros iniciales)
    if (!id || typeof id !== 'string' || !/^\d{10}$/.test(id)) {
      throw new Error('ID inválido - debe ser un string de 10 dígitos');
    }

    const apiStatus = mapFrontendStatusToApiStatus(status);
    const updatedApiRequest = await requestsApiService.updateRequestStatus(id, apiStatus, rejection_reason, status_reason);
    return mapApiRequestToFrontendRequest(updatedApiRequest);
  },

  async sendResponse(
    id: string,
    data: {
      newStatus: Request['status'];
      emailSubject: string;
      emailBody: string;
      rejection_reason?: string | null;
      status_reason?: string | null;
      attachments?: FileList;
      actividades?: string[];
    }
  ): Promise<Request> {
    // Validar que el ID es un string de 10 dígitos (preserva ceros iniciales)
    if (!id || typeof id !== 'string' || !/^\d{10}$/.test(id)) {
      throw new Error('ID inválido - debe ser un string de 10 dígitos');
    }

    const apiStatus = mapFrontendStatusToApiStatus(data.newStatus);
    const updatedApiRequest = await requestsApiService.respondToRequest(id, {
      status: apiStatus,
      email_subject: data.emailSubject,
      email_body: data.emailBody,
      rejection_reason: data.rejection_reason,
      status_reason: data.status_reason,
      attachments: data.attachments,
      actividades: data.actividades,
    });
    
    return mapApiRequestToFrontendRequest(updatedApiRequest);
  },

  async sendResponseWithCompensaciones(
    id: string,
    data: {
      newStatus: Request['status'];
      emailSubject: string;
      emailBody: string;
      rejection_reason?: string | null;
      status_reason?: string | null;
      mensaje_compensaciones_parte1?: string | null;
      t_basicos?: number;
      t_auxilios?: number;
      basico?: number;
      auxilios?: number;
      manutencion?: number;
      provisiones?: number;
      horas?: number;
      valor_hora_diurna?: number;
      valor_hora_nocturna?: number;
      valor_hora_diurna_festiva?: number;
      valor_hora_nocturna_festiva?: number;
      auxilio_de_transporte?: number;
      auxilio_de_manutencion?: number;
      auxilio_de_encierro?: number;
      auxilio_de_rodamiento?: number;
      auxilio_especial?: number;
      auxilio_prosalud?: number;
      valor_auxilio_diurno?: number;
      valor_auxilio_recargo_nocturno?: number;
      valor_auxilio_recargo_festivo?: number;
      valor_auxilio_recargo_festivo_nocturno?: number;
      attachments?: FileList;
    }
  ): Promise<Request> {
    if (!id || typeof id !== 'string' || !/^\d{10}$/.test(id)) {
      throw new Error('ID inválido - debe ser un string de 10 dígitos');
    }

    const apiStatus = mapFrontendStatusToApiStatus(data.newStatus);
    const updatedApiRequest = await requestsApiService.respondWithCompensaciones(id, {
      status: apiStatus,
      email_subject: data.emailSubject,
      email_body: data.emailBody,
      rejection_reason: data.rejection_reason,
      status_reason: data.status_reason,
      mensaje_compensaciones_parte1: data.mensaje_compensaciones_parte1,
      t_basicos: data.t_basicos,
      t_auxilios: data.t_auxilios,
      basico: data.basico,
      auxilios: data.auxilios,
      manutencion: data.manutencion,
      provisiones: data.provisiones,
      horas: data.horas,
      valor_hora_diurna: data.valor_hora_diurna,
      valor_hora_nocturna: data.valor_hora_nocturna,
      valor_hora_diurna_festiva: data.valor_hora_diurna_festiva,
      valor_hora_nocturna_festiva: data.valor_hora_nocturna_festiva,
      auxilio_de_transporte: data.auxilio_de_transporte,
      auxilio_de_manutencion: data.auxilio_de_manutencion,
      auxilio_de_encierro: data.auxilio_de_encierro,
      auxilio_de_rodamiento: data.auxilio_de_rodamiento,
      auxilio_especial: data.auxilio_especial,
      auxilio_prosalud: data.auxilio_prosalud,
      valor_auxilio_diurno: data.valor_auxilio_diurno,
      valor_auxilio_recargo_nocturno: data.valor_auxilio_recargo_nocturno,
      valor_auxilio_recargo_festivo: data.valor_auxilio_recargo_festivo,
      valor_auxilio_recargo_festivo_nocturno: data.valor_auxilio_recargo_festivo_nocturno,
      attachments: data.attachments,
    });

    return mapApiRequestToFrontendRequest(updatedApiRequest);
  },

  async getRequestStats(): Promise<RequestStats> {
    const stats = await requestsApiService.getRequestStats();

    return {
      total: stats.total,
      pending: stats.pending,
      in_progress: stats.in_progress,
      resolved: stats.resolved,
      rejected: stats.rejected,
      this_month: stats.this_month,
      avg_resolution_time: stats.avg_resolution_time,
      unvalidated: stats.unvalidated,
      monthly_counts: stats.monthly_counts,
    };
  },

  async getFilterOptions(): Promise<{ request_types: Request['request_type'][]; subtypes: Array<{ label: string; value: string }> }> {
    const options = await requestsApiService.getFilterOptions();

    return {
      request_types: [
        ...new Set(options.request_types.map(mapBackendRequestTypeToFrontend)),
      ],
      subtypes: options.subtypes,
    };
  },

  async downloadFile(requestId: string, fileKey: string): Promise<Blob> {
    return requestsApiService.downloadFile(requestId, fileKey);
  },

  async downloadResponseAttachment(responseId: number, attachmentId: number): Promise<Blob> {
    return requestsApiService.downloadResponseAttachment(responseId, attachmentId);
  },

  // Validate request (manual validation step)
  async validateRequest(id: string): Promise<Request> {
    // Validar que el ID es un string de 10 dígitos (preserva ceros iniciales)
    if (!id || typeof id !== 'string' || !/^\d{10}$/.test(id)) {
      throw new Error('ID inválido - debe ser un string de 10 dígitos');
    }

    const apiRequest = await requestsApiService.validateRequest(id);
    return mapApiRequestToFrontendRequest(apiRequest);
  },

  // Map frontend request type to backend request type
  mapRequestTypeToBackend(requestType: string): string {
    const typeMap: Record<string, string> = {
      'retiro-sindical': 'solicitud-retiro-sindical',
      'microcredito': 'solicitud-microcredito',
      'incapacidad-licencia': 'incapacidades-licencias',
      'descanso-laboral': 'compensacion-descanso',
      // Note: 'permisos-turnos' and 'solicitud-bienestar' are not in backend API
      // They will be sent as-is and backend should handle them or return an error
    };
    
    return typeMap[requestType] || requestType;
  },

  // Export requests to Excel
  async exportToExcel(filters: {
    request_type?: string;
    date_range?: {
      includeAll: boolean;
      start?: Date;
      end?: Date;
    };
  }): Promise<{ blob: Blob; filename: string }> {
    // Map request type to backend format
    const backendRequestType = filters.request_type && filters.request_type !== 'all'
      ? this.mapRequestTypeToBackend(filters.request_type)
      : 'all';

    // Format dates to YYYY-MM-DD
    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    const dateRange = filters.date_range
      ? {
          include_all: filters.date_range.includeAll,
          start_date: filters.date_range.start ? formatDate(filters.date_range.start) : undefined,
          end_date: filters.date_range.end ? formatDate(filters.date_range.end) : undefined,
        }
      : {
          include_all: true,
        };

    return requestsApiService.exportToExcel({
      request_type: backendRequestType,
      date_range: dateRange,
    });
  },
};