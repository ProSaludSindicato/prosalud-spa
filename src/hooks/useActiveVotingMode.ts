import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveVotingMode, setActiveVotingMode } from "@/services/votingModeApi";
import type { ActiveVotingMode } from "@/services/votingModeApi";

const QUERY_KEY = ["voting-mode"] as const;

export function useActiveVotingMode() {
  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getActiveVotingMode,
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  return {
    activeMode: data?.active_mode ?? "none",
    isLoading,
    isError,
    isCandidateEnabled: data?.active_mode === "candidate",
    isAssemblyEnabled: data?.active_mode === "assembly",
    isVotingDisabled: !data || data.active_mode === "none",
  };
}

export function useSetVotingMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mode: ActiveVotingMode) => setActiveVotingMode(mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
