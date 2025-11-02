import { requestsApiService, ApiRequest, ApiRequestResponse, ApiRequestFile } from './requestsApi';
import { Request, RequestResponse, RequestStats, RequestFile } from '@/types/requests';

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

// Map API response to frontend response
const mapApiResponseToFrontendResponse = (apiResponse: ApiRequestResponse): RequestResponse => {
  return {
    id: apiResponse.id,
    status: mapApiStatusToFrontendStatus(apiResponse.status),
    email_subject: apiResponse.email_subject,
    email_body: apiResponse.email_body,
    created_at: apiResponse.created_at,
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
    request_type: apiRequest.request_type as Request['request_type'],
    id_type: apiRequest.document_type as Request['id_type'],
    id_number: apiRequest.document_number || '',
    name: apiRequest.name || '',
    last_name: apiRequest.last_name || '',
    email: apiRequest.email || '',
    phone_number: apiRequest.phone_number || '',
    payload: apiRequest.payload || {},
    status: mapApiStatusToFrontendStatus(apiRequest.status),
    created_at: apiRequest.created_at || '',
    processed_at: apiRequest.processed_at,
    resolved_at: (apiRequest.status === 'COMPLETED' || apiRequest.status === 'REJECTED') 
      ? apiRequest.processed_at 
      : undefined,
    responses: apiRequest.responses?.map(mapApiResponseToFrontendResponse) || [],
    responses_count: apiRequest.responses_count ?? apiRequest.responses?.length ?? 0,
    files,
    files_count: apiRequest.files_count,
  };
};

// Service that connects to real API only - no mock fallbacks
export const requestsService = {
  async getRequests(): Promise<Request[]> {
    console.log('🔄 Fetching requests from API...');
    const apiRequests = await requestsApiService.getAllRequests();
    console.log('✅ Successfully fetched from API:', apiRequests.length, 'requests');
    return apiRequests.map(mapApiRequestToFrontendRequest);
  },

  async getRequestById(id: string): Promise<Request | null> {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new Error('ID inválido - se requiere un ID numérico válido');
    }

    const apiRequest = await requestsApiService.getRequestById(numericId);
    return mapApiRequestToFrontendRequest(apiRequest);
  },

  async updateRequestStatus(id: string, status: Request['status'], notes?: string): Promise<Request> {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new Error('ID inválido - se requiere un ID numérico válido');
    }

    const apiStatus = mapFrontendStatusToApiStatus(status);
    const updatedApiRequest = await requestsApiService.updateRequestStatus(numericId, apiStatus);
    return mapApiRequestToFrontendRequest(updatedApiRequest);
  },

  async sendResponse(
    id: string,
    data: {
      newStatus: Request['status'];
      emailSubject: string;
      emailBody: string;
      attachments?: FileList;
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
      attachments: data.attachments,
    });
    
    return mapApiRequestToFrontendRequest(updatedApiRequest);
  },

  async getRequestStats(): Promise<RequestStats> {
    const requests = await this.getRequests();
    
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const in_progress = requests.filter(r => r.status === 'in_progress').length;
    const resolved = requests.filter(r => r.status === 'resolved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    
    const currentMonth = new Date().getMonth();
    const this_month = requests.filter(r => 
      new Date(r.created_at).getMonth() === currentMonth
    ).length;
    
    // Calculate average resolution time
    const resolvedRequests = requests.filter(r => r.status === 'resolved' && r.resolved_at);
    let avg_resolution_time = 0;
    
    if (resolvedRequests.length > 0) {
      const totalTime = resolvedRequests.reduce((acc, request) => {
        const created = new Date(request.created_at).getTime();
        const resolved = new Date(request.resolved_at!).getTime();
        return acc + (resolved - created);
      }, 0);
      
      // Convert to hours
      avg_resolution_time = Math.round(totalTime / (resolvedRequests.length * 1000 * 60 * 60));
    }
    
    return {
      total,
      pending,
      in_progress,
      resolved,
      rejected,
      this_month,
      avg_resolution_time
    };
  },

  async downloadFile(requestId: string, fileKey: string): Promise<Blob> {
    return requestsApiService.downloadFile(requestId, fileKey);
  },
};