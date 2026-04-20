import { authenticatedApi } from './api';
import type {
  StatisticsResponse,
  AuditTrailResponse,
  StatisticsFilters,
  AuditFilters,
  CandidateVotingPeriodsResponse,
} from '@/types/votaciones';

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
    
    const response = await authenticatedApi.get<StatisticsResponse>(
      '/api/votes/statistics',
      { params }
    );
    
    return response.data;
  },

  /**
   * Obtiene estadísticas de votos por hospital (endpoint especializado)
   * Solo acepta filtro por hospital
   */
  async getHospitalStatistics(hospital?: string): Promise<StatisticsResponse> {
    const params = new URLSearchParams();
    
    if (hospital) {
      params.append('hospital', hospital);
    }
    
    const response = await authenticatedApi.get<StatisticsResponse>(
      '/api/votes/hospital-statistics',
      { params }
    );
    
    return response.data;
  },

  async getHospitalStatisticsByElection(
    hospital?: string,
    candidateElectionKey?: string
  ): Promise<StatisticsResponse> {
    const params = new URLSearchParams();
    if (hospital) {
      params.append('hospital', hospital);
    }
    if (candidateElectionKey) {
      params.append('candidate_election_key', candidateElectionKey);
    }

    const response = await authenticatedApi.get<StatisticsResponse>(
      '/api/votes/hospital-statistics',
      { params }
    );

    return response.data;
  },

  /**
   * Obtiene todos los registros de auditoría de votaciones (sin paginación)
   * La paginación y filtros se manejan en el frontend
   * Hace múltiples peticiones paginadas para obtener todos los registros
   */
  async getAuditTrail(filters?: AuditFilters): Promise<AuditTrailResponse> {
    const allVotes: any[] = [];
    let currentPage = 1;
    let hasMorePages = true;
    let perPage = 100; // Empezar con tamaño razonable
    const baseParams = new URLSearchParams();
    if (filters?.candidate_election_key) baseParams.append('candidate_election_key', filters.candidate_election_key);
    
    // Intentar primero sin parámetros para ver si el backend devuelve todos los registros
    try {
      const firstResponse = await authenticatedApi.get<AuditTrailResponse>('/api/votes/audit-trail', {
        params: baseParams,
      });
      
      const firstData = firstResponse.data;
      if (firstData.votes && firstData.votes.length > 0) {
        // Si el backend devuelve todos los registros sin paginación
        if (!firstData.pagination || firstData.pagination.total_pages === 1) {
          return firstData;
        }
        
        // Si hay paginación, agregar los primeros registros y continuar
        allVotes.push(...firstData.votes);
        if (firstData.pagination) {
          hasMorePages = firstData.pagination.has_next_page || false;
          currentPage = 2;
        } else {
          hasMorePages = false;
        }
      } else {
        return firstData; // No hay registros
      }
    } catch (error: any) {
      // Si falla, probar con paginación desde el inicio
      if (error.response?.status === 422) {
        // Si el error es 422, intentar con paginación
        perPage = 50;
        currentPage = 1;
        hasMorePages = true;
      } else {
        throw error;
      }
    }
    
    // Continuar obteniendo páginas si es necesario
    while (hasMorePages) {
      try {
        const response = await authenticatedApi.get<AuditTrailResponse>(
          '/api/votes/audit-trail',
          {
            params: {
              ...Object.fromEntries(baseParams.entries()),
              page: currentPage,
              per_page: perPage,
            },
          }
        );
        
        const data = response.data;
        if (data.votes && data.votes.length > 0) {
          allVotes.push(...data.votes);
          
          // Verificar si hay más páginas
          if (data.pagination) {
            hasMorePages = data.pagination.has_next_page || false;
            currentPage++;
          } else {
            hasMorePages = false;
          }
        } else {
          hasMorePages = false;
        }
      } catch (error: any) {
        // Si falla con per_page grande, intentar con uno más pequeño
        if (error.response?.status === 422 && perPage > 25 && currentPage === 1) {
          perPage = 25;
          currentPage = 1;
          continue;
        }
        throw error;
      }
    }
    
    // Retornar un objeto con la estructura esperada
    return {
      success: true,
      votes: allVotes,
      pagination: {
        current_page: 1,
        per_page: allVotes.length,
        total_votes: allVotes.length,
        total_pages: 1,
        has_next_page: false,
        has_prev_page: false,
      },
      summary_statistics: {
        total_votes_in_period: allVotes.length,
        votes_by_candidate: [],
        votes_by_hospital: [],
        votes_by_date: [],
      },
      selected_candidate_election_key: filters?.candidate_election_key ?? null,
    };
  },

  async getCandidateVotingPeriods(): Promise<CandidateVotingPeriodsResponse> {
    const response = await authenticatedApi.get<CandidateVotingPeriodsResponse>('/api/candidate-voting-periods');
    return response.data;
  },

  async createCandidateVotingPeriod(payload: {
    name: string;
    activate?: boolean;
  }): Promise<{ success: boolean; message?: string }> {
    const response = await authenticatedApi.post('/api/candidate-voting-periods', payload);
    return response.data;
  },

  async activateCandidateVotingPeriod(id: number): Promise<{ success: boolean; message?: string }> {
    const response = await authenticatedApi.patch(`/api/candidate-voting-periods/${id}/activate`);
    return response.data;
  },

  async closeCandidateVotingPeriod(id: number): Promise<{ success: boolean; message?: string }> {
    const response = await authenticatedApi.patch(`/api/candidate-voting-periods/${id}/close`);
    return response.data;
  },
};
