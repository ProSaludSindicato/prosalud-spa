export type DocumentType = "CC" | "CE" | "PT";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CC: "Cédula de Ciudadanía",
  CE: "Cédula de Extranjería",
  PT: "Permiso por Protección Temporal",
};

export type Hospital = "Rionegro" | "La Maria" | "Bello" | "ADMON";

export interface Candidate {
  id: string;
  name: string;
  photo: string;
  position: string;
  /** Sede / hospital from backend (delegados file). */
  hospital: string;
  description?: string;
}

export interface ValidationData {
  documentType: DocumentType;
  documentNumber: string;
  expeditionDate: string;
}

export interface UserSession {
  hospital: string;
  position: string;
  documentType: DocumentType;
  documentNumber: string;
  hasVoted: boolean;
}

export interface VoteSubmission {
  candidateId: string;
  userId: string;
  timestamp: Date;
}
