export interface ResponseAttachment {
  id: number;
  original_name: string;
  download_url: string | null;
  url_expires_at: string | null;
  created_at: string;
}

export interface ResponseResponder {
  id: number;
  name: string;
  email: string;
}

export interface RequestResponse {
  id: number;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  email_subject: string;
  email_body: string;
  created_at: string;
  responded_by?: ResponseResponder | null;
  attachments?: ResponseAttachment[];
  attachments_count?: number;
}

export interface RequestFile {
  original_name: string;
  mime_type: string;
  size: number;
  original_key: string;
  download_url: string | null;
  url_expires_at: string | null;
}

export interface Request {
  id: string;
  request_type: 'certificado-convenio' | 'compensacion-anual' | 'descanso-laboral' | 'verificacion-pagos' | 'retiro-sindical' | 'actualizar-datos-personales' | 'microcredito' | 'incapacidad-licencia' | 'permisos-turnos' | 'solicitud-bienestar';
  request_subtype?: string | null;
  id_type: 'CC' | 'CE' | 'TI' | 'PP';
  id_number: string;
  name: string;
  last_name: string;
  email: string;
  phone_number: string;
  payload: Record<string, any>;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
  processed_at?: string;
  resolved_at?: string;
  validated_at?: string;
  validated_by?: string;
  responses?: RequestResponse[];
  responses_count?: number;
  files?: Record<string, RequestFile>;
  files_count?: number;
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
