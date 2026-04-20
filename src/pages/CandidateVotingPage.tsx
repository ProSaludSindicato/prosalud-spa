import { useState, useEffect, useCallback } from "react";
import { CandidateValidationForm } from "@/components/assembly/CandidateValidationForm";
import DelegateCandidateVoting from "@/components/assembly/DelegateCandidateVoting";
import type { UserSession } from "@/types/assemblyVoting";
import { useActiveVotingMode } from "@/hooks/useActiveVotingMode";
import { AlertTriangle, Loader2 } from "lucide-react";

const SESSION_KEY = "candidateVoting:userSession";
const SESSION_EXPIRY_KEY = "candidateVoting:userSessionExpiry";
const SESSION_DURATION_MS = 6 * 60 * 60 * 1000;

interface StoredSession {
  session: UserSession;
  expiry: number;
}

function loadStoredSession(): UserSession | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    const expiryStr = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (stored && expiryStr && Date.now() < parseInt(expiryStr, 10)) {
      return (JSON.parse(stored) as StoredSession).session;
    }
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
  }
  return null;
}

export default function CandidateVotingPage() {
  const { isCandidateEnabled, isLoading } = useActiveVotingMode();
  const [session, setSession] = useState<UserSession | null>(() =>
    typeof window !== "undefined" ? loadStoredSession() : null,
  );

  useEffect(() => {
    if (session) {
      try {
        const expiry = Date.now() + SESSION_DURATION_MS;
        localStorage.setItem(SESSION_KEY, JSON.stringify({ session, expiry }));
        localStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
      } catch {
        /* ignore */
      }
    } else {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_EXPIRY_KEY);
    }
  }, [session]);

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
  };

  const handleVoteRecorded = useCallback(() => {
    setSession((prev) => (prev ? { ...prev, hasVoted: true } : null));
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isCandidateEnabled) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gradient-to-b from-white to-slate-100 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Votación no disponible</h1>
        <p className="max-w-sm text-slate-600">
          La elección de candidatos delegados no está habilitada en este momento. Intente más tarde.
        </p>
        <img src="/images/logo_prosalud.webp" alt="ProSalud" className="mt-4 h-16 w-16 object-contain opacity-60" />
      </div>
    );
  }

  if (session) {
    return (
      <DelegateCandidateVoting session={session} onLogout={handleLogout} onVoteRecorded={handleVoteRecorded} />
    );
  }

  return <CandidateValidationForm onValidation={setSession} />;
}
