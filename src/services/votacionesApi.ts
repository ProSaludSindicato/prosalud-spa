import axios from 'axios';
import type {
  StatisticsResponse,
  AuditTrailResponse,
  StatisticsFilters,
  AuditFilters,
} from '@/types/votaciones';

const API_BASE_URL = 'https://prosalud.laravel.cloud';

export const votacionesApi = {
  /**
   * Obtiene estadísticas agregadas de votaciones
   */
  async getStatistics(filters?: StatisticsFilters): Promise<StatisticsResponse> {
    const params = new URLSearchParams();
    
    if (filters?.candidate_id) params.append('candidate_id', filters.candidate_id);
    if (filters?.hospital) params.append('hospital', filters.hospital);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    
    const response = await axios.get<StatisticsResponse>(
      `${API_BASE_URL}/api/votes/statistics`,
      { params }
    );
    
    return response.data;
  },

  /**
   * Obtiene el registro de auditoría de votaciones con paginación
   */
  async getAuditTrail(filters?: AuditFilters): Promise<AuditTrailResponse> {
    const params = new URLSearchParams();
    
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.candidate_id) params.append('candidate_id', filters.candidate_id);
    if (filters?.hospital) params.append('voter_hospital', filters.hospital);
    if (filters?.voter_document_type) params.append('voter_document_type', filters.voter_document_type);
    if (filters?.voter_document_number) params.append('voter_document_number', filters.voter_document_number);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.per_page) params.append('per_page', filters.per_page.toString());
    
    const response = await axios.get<AuditTrailResponse>(
      `${API_BASE_URL}/api/votes/audit-trail`,
      { params }
    );
    
    return response.data;
  },
};
