import { buildPublicApiUrl } from "@/config/api";
import { authenticatedApi } from "@/services/api";

export type ActiveVotingMode = "none" | "candidate" | "assembly";

export type VotingModeResponse = {
  active_mode: ActiveVotingMode;
  active_candidate_election_key?: string | null;
};

export type UpdateVotingModeResponse = {
  success: boolean;
  active_mode: ActiveVotingMode;
  active_candidate_election_key?: string | null;
  message?: string;
};

export async function getActiveVotingMode(): Promise<VotingModeResponse> {
  const response = await fetch(buildPublicApiUrl("/api/voting/mode"), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return response.json() as Promise<VotingModeResponse>;
}

export async function setActiveVotingMode(mode: ActiveVotingMode): Promise<UpdateVotingModeResponse> {
  const response = await authenticatedApi.put<UpdateVotingModeResponse>("/api/voting/mode", {
    active_mode: mode,
  });
  return response.data;
}
