import { useState, useEffect } from "react";
import { ValidationForm } from "@/components/assembly/ValidationForm";
import AssemblyVoting from "@/components/assembly/AssemblyVoting";
import type { UserSession } from "@/types/assemblyVoting";
import { useVotingMode } from "@/context/VotingModeContext";

const SESSION_STORAGE_KEY = "assembly:userSession";
const SESSION_EXPIRY_KEY = "assembly:userSessionExpiry";
const SESSION_DURATION_MS = 6 * 60 * 60 * 1000;

interface StoredSession {
  session: UserSession;
  expiry: number;
}

export default function AssemblyDelegatePage() {
  const { mode } = useVotingMode();
  const [session, setSession] = useState<UserSession | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        const expiryStr = localStorage.getItem(SESSION_EXPIRY_KEY);

        if (stored && expiryStr) {
          const expiry = parseInt(expiryStr, 10);
          const now = Date.now();

          if (now < expiry) {
            const data: StoredSession = JSON.parse(stored);
            return data.session;
          }
          localStorage.removeItem(SESSION_STORAGE_KEY);
          localStorage.removeItem(SESSION_EXPIRY_KEY);
        }
      } catch (error) {
        console.error("Error loading session from storage:", error);
        localStorage.removeItem(SESSION_STORAGE_KEY);
        localStorage.removeItem(SESSION_EXPIRY_KEY);
      }
    }
    return null;
  });

  useEffect(() => {
    if (session) {
      try {
        const expiry = Date.now() + SESSION_DURATION_MS;
        const data: StoredSession = {
          session,
          expiry,
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
        localStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
      } catch (error) {
        console.error("Error saving session to storage:", error);
      }
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_EXPIRY_KEY);
    }
  }, [session]);

  const handleValidation = (userSession: UserSession) => {
    setSession(userSession);
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
  };

  if (session && mode.type === "ASSEMBLY") {
    return <AssemblyVoting session={session} onLogout={handleLogout} />;
  }

  return <ValidationForm onValidation={handleValidation} />;
}
