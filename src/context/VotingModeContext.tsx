/* eslint-disable react-refresh/only-export-components -- hook co-located with provider */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { VotingMode } from "@/types/assembly";

interface VotingModeContextType {
  mode: VotingMode;
  setMode: (mode: VotingMode) => void;
}

const VotingModeContext = createContext<VotingModeContextType | undefined>(undefined);

const STORAGE_KEY = "assembly:voting-mode";

export function VotingModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<VotingMode>(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return { type: "ASSEMBLY" };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as VotingMode;
        if (parsed && typeof parsed === "object" && parsed.type === "ASSEMBLY") {
          return { type: "ASSEMBLY" };
        }
        if (parsed && typeof parsed === "object" && parsed.type === "CANDIDATE") {
          return { type: "CANDIDATE" };
        }
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
    } catch (error) {
      console.error("Error loading voting mode from localStorage:", error);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    return { type: "ASSEMBLY" };
  });

  const setMode = (newMode: VotingMode) => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newMode));
      } catch (error) {
        console.error("Error saving voting mode to localStorage:", error);
      }
    }
    setModeState(newMode);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as VotingMode;
          if (parsed && typeof parsed === "object" && (parsed.type === "ASSEMBLY" || parsed.type === "CANDIDATE")) {
            setModeState(parsed);
          } else {
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              /* ignore */
            }
          }
        } catch (error) {
          console.error("Error parsing voting mode from storage event:", error);
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            /* ignore */
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return <VotingModeContext.Provider value={{ mode, setMode }}>{children}</VotingModeContext.Provider>;
}

export function useVotingMode() {
  const context = useContext(VotingModeContext);
  if (!context) {
    throw new Error("useVotingMode must be used within VotingModeProvider");
  }
  return context;
}
