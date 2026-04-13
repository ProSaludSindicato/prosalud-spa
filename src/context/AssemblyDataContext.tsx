/* eslint-disable react-refresh/only-export-components -- hook co-located with provider */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { assemblyApi } from "@/services/assemblyApi";
import { getAssemblyEcho } from "@/lib/assemblyEcho";
import type { Assembly, AssemblyQuestion, AssemblyStats, QuorumConfig } from "@/types/assembly";

type VoteRegisteredPayload = {
  questionId: string;
  question?: AssemblyQuestion;
  results?: AssemblyStats;
};

type QuestionEventPayload = {
  question: AssemblyQuestion;
  results?: AssemblyStats;
  changes?: string[];
};

type QuorumEventPayload = {
  quorum: QuorumConfig & { updatedAt?: string };
};

type AssemblyDataContextValue = {
  questions: AssemblyQuestion[];
  results: Record<string, AssemblyStats>;
  quorum: QuorumConfig | null;
  currentAssembly: Assembly | null;
  isLoading: boolean;
  refreshQuestions: () => Promise<void>;
  refreshQuorum: () => Promise<void>;
  refreshCurrentAssembly: () => Promise<void>;
  getQuestionById: (id: string) => AssemblyQuestion | undefined;
  setQuorumState: (payload: QuorumConfig | null) => void;
};

const AssemblyDataContext = createContext<AssemblyDataContextValue | undefined>(undefined);

const cloneQuestion = (question: AssemblyQuestion): AssemblyQuestion => ({
  ...question,
  options: question.options.map((option) => ({ ...option })),
});

const buildQuestionsRecord = (list: AssemblyQuestion[]) =>
  list.reduce<Record<string, AssemblyQuestion>>((acc, question) => {
    acc[question.id] = cloneQuestion(question);
    return acc;
  }, {});

export const AssemblyDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [questionsMap, setQuestionsMap] = useState<Record<string, AssemblyQuestion>>({});
  const [results, setResults] = useState<Record<string, AssemblyStats>>({});
  const [quorum, setQuorum] = useState<QuorumConfig | null>(null);
  const [currentAssembly, setCurrentAssembly] = useState<Assembly | null>(null);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(true);
  const [isQuorumLoading, setIsQuorumLoading] = useState(true);
  const [isAssemblyLoading, setIsAssemblyLoading] = useState(true);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const questions = useMemo(
    () => Object.values(questionsMap).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [questionsMap],
  );

  const applyQuestionUpdate = useCallback((question?: AssemblyQuestion) => {
    if (!question) {
      return;
    }
    setQuestionsMap((prev) => ({
      ...prev,
      [question.id]: cloneQuestion(question),
    }));
  }, []);

  const applyResultsUpdate = useCallback((stats?: AssemblyStats) => {
    if (!stats) {
      return;
    }
    setResults((prev) => ({
      ...prev,
      [stats.questionId]: stats,
    }));
  }, []);

  const loadCurrentAssembly = useCallback(async () => {
    setIsAssemblyLoading(true);
    try {
      const assembly = await assemblyApi.getCurrentAssembly();
      setCurrentAssembly(assembly);
    } catch (error) {
      console.error("[AssemblyData] Failed to load current assembly:", error);
      setCurrentAssembly(null);
    } finally {
      setIsAssemblyLoading(false);
    }
  }, []);

  const loadQuestionsAndResults = useCallback(async () => {
    setIsQuestionsLoading(true);
    try {
      const questionsData = await assemblyApi.getQuestions();
      setQuestionsMap(buildQuestionsRecord(questionsData));

      const statsEntries = await Promise.all(
        questionsData
          .filter((question) => question.resultsVisible || question.status !== "PENDING")
          .map(async (question) => {
            try {
              const stats = await assemblyApi.getQuestionResults(question.id);
              return [question.id, stats] as const;
            } catch {
              return null;
            }
          }),
      );

      setResults((prev) => {
        const next = { ...prev };
        statsEntries.forEach((entry) => {
          if (entry) {
            next[entry[0]] = entry[1];
          }
        });
        return next;
      });
    } finally {
      setIsQuestionsLoading(false);
    }
  }, []);

  const loadQuorum = useCallback(async () => {
    setIsQuorumLoading(true);
    try {
      const quorumData = await assemblyApi.getQuorum();
      setQuorum(quorumData);
    } catch (error) {
      console.error("[AssemblyData] Failed to load quorum:", error);
    } finally {
      setIsQuorumLoading(false);
    }
  }, []);

  const refreshQuestions = useCallback(async () => {
    await loadQuestionsAndResults();
  }, [loadQuestionsAndResults]);

  const refreshQuorum = useCallback(async () => {
    await loadQuorum();
  }, [loadQuorum]);

  const refreshCurrentAssembly = useCallback(async () => {
    await loadCurrentAssembly();
  }, [loadCurrentAssembly]);

  const getQuestionById = useCallback((id: string) => questionsMap[id], [questionsMap]);

  const setQuorumState = useCallback((payload: QuorumConfig | null) => {
    setQuorum(payload);
  }, []);

  useEffect(() => {
    void loadCurrentAssembly();
  }, [loadCurrentAssembly]);

  useEffect(() => {
    if (currentAssembly) {
      void loadQuestionsAndResults();
      void loadQuorum();
    } else if (!isAssemblyLoading) {
      setQuestionsMap({});
      setResults({});
      setQuorum(null);
      setIsQuestionsLoading(false);
      setIsQuorumLoading(false);
    }
  }, [currentAssembly, isAssemblyLoading, loadQuestionsAndResults, loadQuorum]);

  useEffect(() => {
    const echo = getAssemblyEcho();

    if (!echo) {
      if (!fallbackIntervalRef.current) {
        fallbackIntervalRef.current = setInterval(loadQuestionsAndResults, 15000);
      }
      return () => {
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
        }
      };
    }

    const handleVoteRegistered = ({ question, results }: VoteRegisteredPayload) => {
      applyQuestionUpdate(question);
      applyResultsUpdate(results);
    };

    const handleQuestionEvent = ({ question, results }: QuestionEventPayload) => {
      applyQuestionUpdate(question);
      applyResultsUpdate(results);
    };

    const handleQuorumEvent = ({ quorum: nextQuorum }: QuorumEventPayload) => {
      if (nextQuorum) {
        setQuorum(nextQuorum);
      }
    };

    const resultsChannel = echo.channel("assembly.results");
    resultsChannel.listen(".vote.registered", handleVoteRegistered);

    const questionsChannel = echo.channel("assembly.questions");
    questionsChannel.listen(".assembly.question.opened", handleQuestionEvent);
    questionsChannel.listen(".assembly.question.closed", handleQuestionEvent);
    questionsChannel.listen(".assembly.question.updated", ({ question }: QuestionEventPayload) =>
      applyQuestionUpdate(question),
    );

    const quorumChannel = echo.channel("assembly.quorum");
    quorumChannel.listen(".assembly.quorum.updated", handleQuorumEvent);

    return () => {
      resultsChannel.stopListening(".vote.registered");
      echo.leave("assembly.results");

      questionsChannel.stopListening(".assembly.question.opened");
      questionsChannel.stopListening(".assembly.question.closed");
      questionsChannel.stopListening(".assembly.question.updated");
      echo.leave("assembly.questions");

      quorumChannel.stopListening(".assembly.quorum.updated");
      echo.leave("assembly.quorum");
    };
  }, [applyQuestionUpdate, applyResultsUpdate, loadQuestionsAndResults]);

  const isLoading = isQuestionsLoading || isQuorumLoading || isAssemblyLoading;

  return (
    <AssemblyDataContext.Provider
      value={{
        questions,
        results,
        quorum,
        currentAssembly,
        isLoading,
        refreshQuestions,
        refreshQuorum,
        refreshCurrentAssembly,
        getQuestionById,
        setQuorumState,
      }}
    >
      {children}
    </AssemblyDataContext.Provider>
  );
};

export const useAssemblyData = () => {
  const context = useContext(AssemblyDataContext);
  if (!context) {
    throw new Error("useAssemblyData must be used within an AssemblyDataProvider");
  }
  return context;
};
