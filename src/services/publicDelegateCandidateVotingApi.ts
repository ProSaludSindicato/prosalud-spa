import { buildPublicApiUrl } from "@/config/api";
import type { Candidate, DocumentType } from "@/types/assemblyVoting";

export type SearchCandidateVotingResponse = {
  success: boolean;
  data?: {
    nombre_apellidos: string;
    hospital: string;
  } | null;
  found?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export type CheckVoteResponse = {
  success: boolean;
  has_voted?: boolean;
  selected_candidate_election_key?: string | null;
  active_candidate_election_key?: string | null;
  message?: string;
  errors?: Record<string, string[]>;
};

export type DelegadoApiRow = {
  id?: number;
  nombre_apellidos?: string;
  cedula?: string;
  sede?: string;
  proceso?: string;
  avatar_url?: string;
  estado_bd_1?: string;
  estado_bd_2?: string;
};

export type DelegadosBySedeResponse = {
  success: boolean;
  sede?: string;
  total?: number;
  delegados?: DelegadoApiRow[];
  message?: string;
};

export type SubmitVoteResponse = {
  success: boolean;
  message?: string;
  error_code?: string;
  vote_id?: number;
};

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function searchCandidateVoting(payload: {
  tipoDocumento: DocumentType;
  documento: string;
  fechaExpedicion: string;
}): Promise<SearchCandidateVotingResponse> {
  const response = await fetch(buildPublicApiUrl("/api/activos/search-candidate-voting"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      tipo_documento: payload.tipoDocumento,
      documento: payload.documento,
      fecha_expedicion: payload.fechaExpedicion,
    }),
  });

  const data = await parseJson<SearchCandidateVotingResponse>(response);
  if (!response.ok) {
    return {
      ...data,
      success: false,
    };
  }
  return data;
}

export async function checkDelegateVoteStatus(
  documentType: DocumentType,
  documentNumber: string
): Promise<CheckVoteResponse> {
  const params = new URLSearchParams({
    document_type: documentType,
    document_number: documentNumber,
  });
  const response = await fetch(buildPublicApiUrl(`/api/votes/check?${params.toString()}`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = await parseJson<CheckVoteResponse>(response);
  if (!response.ok) {
    return { ...data, success: false };
  }
  return data;
}

export async function getDelegadosBySede(sede: string): Promise<DelegadosBySedeResponse> {
  const params = new URLSearchParams({ sede });
  const response = await fetch(buildPublicApiUrl(`/api/delegados/by-sede?${params.toString()}`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = await parseJson<DelegadosBySedeResponse>(response);
  if (!response.ok) {
    return { ...data, success: false };
  }
  return data;
}

/**
 * Laravel puede serializar `array_filter` con huecos en claves como objeto JSON;
 * normalizamos a array para poder usar `.map`.
 */
export function coalesceDelegadosList(
  delegados: DelegadosBySedeResponse["delegados"] | Record<string, DelegadoApiRow> | null | undefined
): DelegadoApiRow[] {
  if (delegados == null) {
    return [];
  }
  if (Array.isArray(delegados)) {
    return delegados;
  }
  if (typeof delegados === "object") {
    return Object.values(delegados);
  }
  return [];
}

/**
 * Maps API delegado rows to UI Candidate model.
 */
export function mapDelegadosToCandidates(
  delegados: DelegadosBySedeResponse["delegados"] | Record<string, DelegadoApiRow> | null | undefined
): Candidate[] {
  return coalesceDelegadosList(delegados).map((d) => ({
    id: String(d.cedula ?? d.id ?? ""),
    name: String(d.nombre_apellidos ?? "").trim() || "Sin nombre",
    photo: d.avatar_url?.trim() || "",
    position: String(d.proceso ?? "").trim() || "Candidato",
    hospital: String(d.sede ?? "").trim() || "—",
    description: undefined,
  }));
}

export function buildVoteTimestampIso(): string {
  return new Date().toISOString();
}

export async function submitDelegateVote(payload: {
  voter: {
    documentType: DocumentType;
    documentNumber: string;
    hospital: string;
    position: string;
  };
  candidate: Candidate;
  timestamp: string;
}): Promise<SubmitVoteResponse & { status: number }> {
  const response = await fetch(buildPublicApiUrl("/api/votes"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      voter: {
        documentType: payload.voter.documentType,
        documentNumber: payload.voter.documentNumber,
        hospital: payload.voter.hospital,
        position: payload.voter.position,
      },
      candidate: {
        id: payload.candidate.id,
        name: payload.candidate.name,
        position: payload.candidate.position,
        hospital: payload.candidate.hospital,
      },
      timestamp: payload.timestamp,
    }),
  });

  const data = await parseJson<SubmitVoteResponse>(response);
  return { ...data, status: response.status };
}
