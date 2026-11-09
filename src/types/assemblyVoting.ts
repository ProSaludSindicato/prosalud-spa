import type { RepresentedDelegate } from "@/types/assembly";

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
  /** Token firmado emitido por el servidor tras validar al votante (votación de delegados). */
  voterToken?: string;
  /** Delegados que este votante representa como apoderado; su voto cuenta también por ellos. */
  representedDelegates?: RepresentedDelegate[];
  /** false para un apoderado que no es delegado: solo vota por sus representados. */
  isDelegate?: boolean;
}

export interface VoteSubmission {
  candidateId: string;
  userId: string;
  timestamp: Date;
}
