export interface RequestResponse {
  id: number;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  email_subject: string;
  email_body: string;
  created_at: string;
}

export interface Request {
  id: string;
  request_type: 'certificado-convenio' | 'compensacion-anual' | 'descanso-laboral' | 'verificacion-pagos' | 'retiro-sindical' | 'actualizar-cuenta' | 'microcredito' | 'incapacidad-licencia' | 'permisos-turnos';
  id_type: 'CC' | 'CE' | 'TI' | 'PP';
  id_number: string;
  name: string;
  last_name: string;
  email: string;
  phone_number: string;
  payload: Record<string, any>;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  created_at: string;
  processed_at?: string;
  resolved_at?: string;
  responses?: RequestResponse[];
  responses_count?: number;
}

export interface RequestFilters {
  status?: string;
  request_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface RequestStats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  rejected: number;
  this_month: number;
  avg_resolution_time: number;
}
