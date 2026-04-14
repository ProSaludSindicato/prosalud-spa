import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserSession } from "@/types/assemblyVoting";
import { LIVE_VOTE_OPTIONS, type AssemblyQuestion, type AssemblyVote } from "@/types/assembly";
import { assemblyApi } from "@/services/assemblyApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Clock, Info, Activity, SendHorizontal } from "lucide-react";
import { getAssemblyEcho } from "@/lib/assemblyEcho";
import { cn } from "@/lib/utils";

interface Props {
  session: UserSession;
  onLogout: () => void;
}

function votesRecordEqual(a: Record<string, AssemblyVote>, b: Record<string, AssemblyVote>): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) {
    return false;
  }
  for (let i = 0; i < keysA.length; i++) {
    if (keysA[i] !== keysB[i]) {
      return false;
    }
  }
  for (const id of keysA) {
    const va = a[id];
    const vb = b[id];
    if (!va || !vb) {
      return false;
    }
    const sa = [...(va.selectedOptions ?? [])].sort().join(",");
    const sb = [...(vb.selectedOptions ?? [])].sort().join(",");
    if (va.id !== vb.id || sa !== sb) {
      return false;
    }
  }
  return true;
}

/** Título generado por API cuando el moderador no escribe enunciado (AssemblyQuestionController). */
const PLACEHOLDER_TITLE_REGEX = /^Pregunta\s*#\s*\d+$/i;

function isPlaceholderQuestionTitle(title: string): boolean {
  return title.trim() === "" || PLACEHOLDER_TITLE_REGEX.test(title.trim());
}

const DELEGATE_LIVE_QUESTION_HEADLINE = "La pregunta se enuncia en vivo";

function questionsDelegateViewEqual(a: AssemblyQuestion[], b: AssemblyQuestion[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const byId = new Map(b.map((q) => [q.id, q]));
  for (const q of a) {
    const o = byId.get(q.id);
    if (!o) {
      return false;
    }
    if (
      q.status !== o.status ||
      q.order !== o.order ||
      q.votesCount !== o.votesCount ||
      (q.title ?? "") !== (o.title ?? "") ||
      (q.openedAt ?? "") !== (o.openedAt ?? "") ||
      (q.closedAt ?? "") !== (o.closedAt ?? "") ||
      q.timeLimit !== o.timeLimit
    ) {
      return false;
    }
    if (q.options.length !== o.options.length) {
      return false;
    }
    for (let i = 0; i < q.options.length; i++) {
      if (q.options[i].id !== o.options[i].id || q.options[i].text !== o.options[i].text) {
        return false;
      }
    }
  }
  return true;
}

export default function AssemblyVoting({ session, onLogout }: Props) {
  void onLogout;
  const [questions, setQuestions] = useState<AssemblyQuestion[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, AssemblyVote>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [submittingQuestionId, setSubmittingQuestionId] = useState<string | null>(null);
  const [echoClient, setEchoClient] = useState<ReturnType<typeof getAssemblyEcho>>(null);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeChannelRef = useRef<{ stopListening: (e: string) => void; leave?: () => void } | null>(null);
  const initialFetchDoneRef = useRef(false);
  const voterIdentifier = useMemo(
    () => `${session.documentType}-${session.documentNumber}`,
    [session.documentType, session.documentNumber],
  );

  const loadQuestions = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    const isInitial = mode === "initial" || !initialFetchDoneRef.current;
    try {
      const currentAssembly = await assemblyApi.getCurrentAssembly();
      if (!currentAssembly) {
        initialFetchDoneRef.current = true;
        setQuestions([]);
        setUserVotes({});
        setIsLoading(false);
        return;
      }

      const questionsData = await assemblyApi.getQuestions();

      const questionsWithNewRefs = questionsData.map((q) => ({
        ...q,
        options: q.options.map((opt) => ({ ...opt })),
      }));

      const votes: Record<string, AssemblyVote> = {};
      for (const q of questionsData) {
        const vote = await assemblyApi.getUserVote(q.id, voterIdentifier);
        if (vote) {
          votes[q.id] = vote;
        }
      }

      const applyUpdate = () => {
        setQuestions((prev) => {
          if (!isInitial && questionsDelegateViewEqual(prev, questionsWithNewRefs)) {
            return prev;
          }
          return questionsWithNewRefs;
        });
        setUserVotes((prev) => {
          if (!isInitial && votesRecordEqual(prev, votes)) {
            return prev;
          }
          return votes;
        });
      };

      if (isInitial) {
        applyUpdate();
        initialFetchDoneRef.current = true;
      } else {
        startTransition(applyUpdate);
      }
    } catch (error) {
      console.error("Error loading questions:", error);
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  }, [voterIdentifier]);

  useEffect(() => {
    const echo = getAssemblyEcho();
    const startPolling = () => {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
      void loadQuestions("initial");
      fallbackIntervalRef.current = setInterval(() => void loadQuestions("refresh"), 5000);
    };

    if (!echo) {
      startPolling();
      return () => {
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
        }
      };
    }

    setEchoClient(echo);
    startPolling();

    return () => {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
      if (activeChannelRef.current) {
        activeChannelRef.current.stopListening(".vote.registered");
        activeChannelRef.current = null;
      }
    };
  }, [loadQuestions]);

  useEffect(() => {
    if (!echoClient) {
      return;
    }

    const resultsChannel = echoClient.channel("assembly.results");
    const refreshFromResults = () => void loadQuestions();
    resultsChannel.listen(".vote.registered", refreshFromResults);

    return () => {
      resultsChannel.stopListening(".vote.registered");
      echoClient.leave("assembly.results");
    };
  }, [echoClient, loadQuestions]);

  useEffect(() => {
    if (!echoClient || !activeQuestionId) {
      if (activeChannelRef.current) {
        activeChannelRef.current.stopListening(".vote.registered");
        if (echoClient && activeQuestionId) {
          echoClient.leave(`assembly.votes.${activeQuestionId}`);
        }
        activeChannelRef.current = null;
      }
      return;
    }

    const channelName = `assembly.votes.${activeQuestionId}`;
    const channel = echoClient.channel(channelName);
    activeChannelRef.current = channel;

    const handler = () => {
      void loadQuestions();
    };

    channel.listen(".vote.registered", handler);

    return () => {
      channel.stopListening(".vote.registered");
      echoClient.leave(channelName);
      activeChannelRef.current = null;
    };
  }, [echoClient, activeQuestionId, loadQuestions]);

  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];

    questions.forEach((q) => {
      if (q.status === "OPEN" && q.openedAt) {
        const openTime = new Date(q.openedAt).getTime();
        const endTime = openTime + q.timeLimit * 1000;

        const now = Date.now();
        const initialRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimers((prev) => ({ ...prev, [q.id]: initialRemaining }));

        if (initialRemaining > 0) {
          const interval = setInterval(() => {
            const currentTime = Date.now();
            const remaining = Math.max(0, Math.floor((endTime - currentTime) / 1000));
            setTimers((prev) => ({ ...prev, [q.id]: remaining }));

            if (remaining === 0) {
              clearInterval(interval);
            }
          }, 1000);

          intervals.push(interval);
        }
      } else {
        setTimers((prev) => {
          const next = { ...prev };
          delete next[q.id];
          return next;
        });
      }
    });

    return () => intervals.forEach(clearInterval);
  }, [questions]);

  const handleVoteSubmit = async () => {
    if (!activeQuestionId) {
      toast.error("Espere a que el moderador habilite la votación");
      return;
    }

    if (!selectedAnswers[activeQuestionId]) {
      toast.error("Debe elegir una respuesta antes de votar");
      return;
    }

    try {
      setSubmittingQuestionId(activeQuestionId);
      await assemblyApi.submitVote(
        activeQuestionId,
        voterIdentifier,
        voterIdentifier,
        [selectedAnswers[activeQuestionId]],
      );

      toast.success("Voto registrado", {
        description: "Su voto ha sido registrado exitosamente",
      });

      await loadQuestions("refresh");
      setSelectedAnswers({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el voto");
    } finally {
      setSubmittingQuestionId(null);
    }
  };

  const openQuestions = questions.filter((q) => q.status === "OPEN");
  const currentQuestion = openQuestions[0] ?? null;

  useEffect(() => {
    const newActiveId = currentQuestion?.id ?? null;
    setActiveQuestionId((prev) => {
      if (prev === newActiveId) {
        return prev;
      }
      setSelectedAnswers({});
      return newActiveId;
    });
  }, [currentQuestion?.id]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const questionOptions = currentQuestion?.options?.length
    ? currentQuestion.options
    : LIVE_VOTE_OPTIONS.map((o) => ({ id: o.id, text: o.text }));
  const activeUserVote = currentQuestion ? userVotes[currentQuestion.id] : null;
  const hasVoted = Boolean(activeUserVote);
  const selectedOption = currentQuestion ? selectedAnswers[currentQuestion.id] : undefined;
  const votedOptionText = hasVoted
    ? questionOptions.find((option) => (activeUserVote?.selectedOptions ?? []).includes(option.id))?.text
    : undefined;
  const hasTimer = currentQuestion ? (currentQuestion.timeLimit ?? 0) > 0 : false;
  const timeRemaining =
    hasTimer && currentQuestion ? timers[currentQuestion.id] ?? currentQuestion.timeLimit : 0;
  const progress =
    hasTimer && currentQuestion
      ? Math.max(0, Math.min(100, (timeRemaining / currentQuestion.timeLimit) * 100))
      : 0;
  const currentQuestionTitle = currentQuestion?.title?.trim() ?? "";
  const delegateQuestionHeadline =
    currentQuestion && isPlaceholderQuestionTitle(currentQuestionTitle)
      ? DELEGATE_LIVE_QUESTION_HEADLINE
      : currentQuestionTitle;

  const optionLabelClass = (optionId: string, isSelected: boolean): string => {
    if (optionId === "agree") {
      return isSelected
        ? "border-emerald-700 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-800/50"
        : "border-emerald-200 bg-emerald-50/40 text-emerald-900 hover:border-emerald-400 hover:bg-emerald-50/80";
    }
    if (optionId === "disagree") {
      return isSelected
        ? "border-red-700 bg-red-600 text-white shadow-md ring-2 ring-red-800/50"
        : "border-red-200 bg-red-50/40 text-red-900 hover:border-red-400 hover:bg-red-50/80";
    }
    return isSelected
      ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary"
      : "border-slate-200 bg-white text-foreground hover:border-primary/40";
  };

  const optionLabelTextClass = (optionId: string, isSelected: boolean): string => {
    if (isSelected && (optionId === "agree" || optionId === "disagree")) {
      return "text-base font-semibold text-white";
    }
    if (optionId === "agree") {
      return "text-base font-medium text-emerald-900";
    }
    if (optionId === "disagree") {
      return "text-base font-medium text-red-900";
    }
    return "text-base font-medium text-foreground";
  };

  const radioItemClass = (optionId: string, isSelected: boolean): string => {
    if (isSelected && (optionId === "agree" || optionId === "disagree")) {
      return "h-5 w-5 shrink-0 border-white text-white ring-offset-2 ring-offset-transparent data-[state=checked]:border-white";
    }
    return "h-5 w-5 shrink-0";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f4f6fb] via-white to-[#eef2ff]">
      <header className="sticky top-0 z-20 border-b border-white/40 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center gap-4 px-4 py-3">
          <img src="/images/logo_prosalud.webp" alt="Prosalud" className="h-20 w-20 object-contain" />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-primary/70">{session.position}</p>
            <h1 className="text-lg font-semibold text-primary">Votación en vivo</h1>
            <p className="text-xs text-muted-foreground">
              {session.documentType} {session.documentNumber}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16 pt-8">
        <Card className="rounded-3xl border-none bg-white/90 shadow-sm">
          <CardContent className="space-y-3 p-6 text-center">
            {currentQuestion ? (
              <>
                <p className="text-sm font-medium uppercase tracking-wide text-primary/70">
                  Pregunta #{currentQuestion.order ?? 1}
                </p>
                <p className="text-balance text-2xl font-semibold text-foreground">
                  {delegateQuestionHeadline}
                </p>
                <p className="text-sm text-muted-foreground">
                  {hasVoted
                    ? `Voto registrado${votedOptionText ? ` — ${votedOptionText}` : ""}.`
                    : "Elige una opción abajo para registrar tu voto - Pendiente por votar."}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium uppercase tracking-wide text-primary/70">Escucha al moderador</p>
                <p className="text-2xl font-semibold text-foreground">La pregunta se enuncia en vivo</p>
                <p className="text-sm text-muted-foreground">
                  Selecciona tu respuesta cuando el moderador abra la votación.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {!currentQuestion && (
          <Card className="rounded-3xl border-none bg-white/90 text-center shadow-sm">
            <CardContent className="space-y-4 p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Info className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Esperando la próxima votación</h2>
              <p className="text-sm text-muted-foreground">
                El moderador anunciará cuando la siguiente pregunta esté disponible.
              </p>
            </CardContent>
          </Card>
        )}

        {currentQuestion && (
          <Card className="rounded-3xl border-none bg-white shadow-lg shadow-primary/5">
            <CardHeader className="space-y-4 pb-2">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/90 pb-3">
                <div className="min-w-0 flex-1 space-y-1">
                  {hasTimer ? (
                    <>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tiempo</p>
                      <p className="flex items-center gap-2 text-base font-semibold text-slate-800">
                        <Clock className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                        {timeRemaining > 0
                          ? `Restante ${formatTime(timeRemaining)}`
                          : "Cierre inminente"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estado</p>
                      <p className="flex items-center gap-2 text-base font-semibold text-slate-800">
                        <Activity className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                        Votación abierta
                      </p>
                    </>
                  )}
                </div>
                <p className="shrink-0 text-right text-xs leading-tight text-slate-500">
                  <span className="block font-semibold tabular-nums text-slate-700">{currentQuestion.votesCount}</span>
                  votos en total
                </p>
              </div>
              {hasTimer && <Progress value={progress} className="h-2 rounded-full bg-slate-200" />}
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              {!hasVoted && (
                <>
                  <RadioGroup
                    value={selectedOption}
                    onValueChange={(value) =>
                      currentQuestion && setSelectedAnswers({ [currentQuestion.id]: value })
                    }
                    className="space-y-3"
                  >
                    {questionOptions.map((option) => {
                      const isSelected = selectedOption === option.id;
                      return (
                        <label
                          key={option.id}
                          htmlFor={`${currentQuestion.id}-${option.id}`}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-2xl border p-4 shadow-sm transition-all",
                            optionLabelClass(option.id, isSelected),
                          )}
                        >
                          <RadioGroupItem
                            id={`${currentQuestion.id}-${option.id}`}
                            value={option.id}
                            className={radioItemClass(option.id, isSelected)}
                          />
                          <div className={cn("flex-1", optionLabelTextClass(option.id, isSelected))}>
                            {option.text}
                          </div>
                        </label>
                      );
                    })}
                  </RadioGroup>
                  <Button
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-6 text-base font-semibold shadow-sm"
                    size="lg"
                    onClick={() => void handleVoteSubmit()}
                    disabled={!selectedOption || submittingQuestionId === currentQuestion.id}
                  >
                    {submittingQuestionId === currentQuestion.id ? (
                      <>
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                        Enviando voto…
                      </>
                    ) : (
                      <>
                        <SendHorizontal className="h-5 w-5 shrink-0" aria-hidden />
                        Enviar respuesta
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
