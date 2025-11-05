// Tipos para Votaciones Asamblea

export interface VoteStatistics {
  total_votes: number;
  votes_by_candidate: VotesByCandidate[];
  votes_by_hospital: VotesByHospital[];
}

export interface VotesByCandidate {
  candidate_id: string;
  candidate_name: string;
  vote_count: number;
  hospital?: string;
}

export interface VotesByHospital {
  voter_hospital: string;
  vote_count: number;
}

export interface VotesByDate {
  vote_date: string;
  vote_count: number;
}

export interface StatisticsResponse {
  success: boolean;
  statistics: VoteStatistics;
}

export interface Voter {
  document_type: string;
  document_number: string;
  hospital: string;
  position: string;
  full_name: string | null;
}

export interface Vote {
  vote_id: number;
  voter: Voter;
  vote_timestamp: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface AuditPagination {
  current_page: number;
  per_page: number;
  total_votes: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

export interface SummaryStatistics {
  total_votes_in_period: number;
  votes_by_candidate: VotesByCandidate[];
  votes_by_hospital: VotesByHospital[];
  votes_by_date: VotesByDate[];
}

export interface AuditTrailResponse {
  success: boolean;
  pagination: AuditPagination;
  summary_statistics: SummaryStatistics;
  votes: Vote[];
}

export interface StatisticsFilters {
  candidate_id?: string;
  hospital?: string;
  start_date?: string;
  end_date?: string;
}

export interface AuditFilters extends StatisticsFilters {
  voter_document_type?: string;
  voter_document_number?: string;
  page?: number;
  per_page?: number;
}
