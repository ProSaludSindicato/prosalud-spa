import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserSession } from "@/types/assemblyVoting";
import { LIVE_VOTE_OPTIONS, type AssemblyQuestion, type AssemblyVote } from "@/types/assembly";
import { assemblyApi } from "@/services/assemblyApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Clock, CheckCircle, Info } from "lucide-react";
import { getAssemblyEcho } from "@/lib/assemblyEcho";

interface Props {
  session: UserSession;
  onLogout: () => void;
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
  const voterIdentifier = useMemo(
    () => `${session.documentType}-${session.documentNumber}`,
    [session.documentType, session.documentNumber],
  );

  const loadQuestions = useCallback(async () => {
    try {
      const currentAssembly = await assemblyApi.getCurrentAssembly();
      if (!currentAssembly) {
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

      setQuestions(() => questionsWithNewRefs);

      setUserVotes({});
      const votes: Record<string, AssemblyVote> = {};
      for (const q of questionsData) {
        const vote = await assemblyApi.getUserVote(q.id, voterIdentifier);
        if (vote) {
          votes[q.id] = vote;
        }
      }
      setUserVotes(votes);
    } catch (error) {
      console.error("Error loading questions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [voterIdentifier]);

  useEffect(() => {
    const echo = getAssemblyEcho();
    const startPolling = () => {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
      void loadQuestions();
      fallbackIntervalRef.current = setInterval(() => void loadQuestions(), 5000);
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

      await loadQuestions();
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
            <p className="text-sm font-medium uppercase tracking-wide text-primary/70">Escucha al moderador</p>
            <p className="text-2xl font-semibold text-foreground">La pregunta se enuncia en vivo</p>
            <p className="text-sm text-muted-foreground">Selecciona tu respuesta cuando el moderador abra la votación.</p>
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
            <CardHeader className="space-y-5">
              <div className="text-center text-xs font-semibold uppercase tracking-wide text-primary/60">
                Pregunta #{currentQuestion.order ?? 1}
              </div>
              <div className="rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <Clock className="h-4 w-4" />
                    {hasTimer
                      ? timeRemaining > 0
                        ? `Tiempo restante ${formatTime(timeRemaining)}`
                        : "Cierre inminente"
                      : "Votación abierta"}
                  </span>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {currentQuestion.votesCount} votos
                  </div>
                </div>
                {hasTimer && <Progress value={progress} className="mt-3 h-2 rounded-full bg-slate-200" />}
              </div>
              {currentQuestionTitle && (
                <CardTitle className="text-center text-xl font-semibold text-slate-900">{currentQuestionTitle}</CardTitle>
              )}
              <div
                className={[
                  "rounded-2xl border p-4 text-sm",
                  hasVoted
                    ? "border-emerald-100 bg-emerald-50/80 text-emerald-700"
                    : "border-amber-100 bg-amber-50/80 text-amber-600",
                ].join(" ")}
              >
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle className={hasVoted ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-amber-500"} />
                  {hasVoted ? "Voto registrado" : "Pendiente por votar"}
                </div>
                {hasVoted && votedOptionText && (
                  <p className="mt-1 text-emerald-600">
                    Respuesta enviada: <span className="font-semibold">{votedOptionText}</span>
                  </p>
                )}
              </div>
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
                          className={[
                            "flex cursor-pointer items-center gap-3 rounded-2xl border p-4 shadow-sm transition-all",
                            isSelected
                              ? "border-primary bg-primary/10 ring-2 ring-primary"
                              : "border-slate-200 bg-white hover:border-primary/40",
                          ].join(" ")}
                        >
                          <RadioGroupItem
                            id={`${currentQuestion.id}-${option.id}`}
                            value={option.id}
                            className="h-5 w-5"
                          />
                          <div className="flex-1 text-base font-medium text-foreground">{option.text}</div>
                        </label>
                      );
                    })}
                  </RadioGroup>
                  <Button
                    className="w-full rounded-2xl py-6 text-base font-semibold shadow-sm"
                    size="lg"
                    onClick={() => void handleVoteSubmit()}
                    disabled={!selectedOption || submittingQuestionId === currentQuestion.id}
                  >
                    {submittingQuestionId === currentQuestion.id ? "Enviando voto..." : "Enviar respuesta"}
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
