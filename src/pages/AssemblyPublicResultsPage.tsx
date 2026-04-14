import { useCallback, useEffect, useState } from "react";
import type { AssemblyQuestion, AssemblyStats } from "@/types/assembly";
import { LIVE_VOTE_OPTIONS } from "@/types/assembly";
import { assemblyApi } from "@/services/assemblyApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Loader2, TrendingUp, Users, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { getAssemblyEcho } from "@/lib/assemblyEcho";

const STATUS_CONFIG: Record<
  AssemblyQuestion["status"],
  { label: string; variant: "default" | "secondary" | "outline"; className?: string }
> = {
  OPEN: { label: "Pregunta abierta", variant: "default", className: "bg-emerald-100 text-emerald-800" },
  CLOSED: { label: "Pregunta cerrada", variant: "secondary", className: "bg-slate-200 text-slate-800" },
  PENDING: { label: "Próxima pregunta", variant: "outline", className: "text-amber-600 border-amber-200" },
};

export default function AssemblyPublicResultsPage() {
  const [questions, setQuestions] = useState<AssemblyQuestion[]>([]);
  const [stats, setStats] = useState<Record<string, AssemblyStats>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const currentAssembly = await assemblyApi.getCurrentAssembly();
      if (!currentAssembly) {
        setQuestions([]);
        setStats({});
        setIsLoading(false);
        return;
      }

      const questionsData = await assemblyApi.getQuestions();
      setQuestions(questionsData);

      const statsData: Record<string, AssemblyStats> = {};
      for (const q of questionsData.filter((q) => q.resultsVisible)) {
        const stat = await assemblyApi.getQuestionResults(q.id);
        statsData[q.id] = stat;
      }
      setStats(statsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const echo = getAssemblyEcho();
    if (!echo) {
      void loadData();
      const interval = setInterval(() => void loadData(), 2000);
      return () => clearInterval(interval);
    }

    void loadData();

    const channel = echo.channel("assembly.results");
    const handler = ({ results }: { results: AssemblyStats }) => {
      setStats((prev) => ({
        ...prev,
        [results.questionId]: results,
      }));
      setQuestions((prev) =>
        prev.map((question) =>
          question.id === results.questionId ? { ...question, votesCount: results.totalVotes } : question,
        ),
      );
    };
    channel.listen(".vote.registered", handler);

    const metadataInterval = setInterval(() => void loadData(), 15000);

    return () => {
      channel.stopListening(".vote.registered");
      echo.leave("assembly.results");
      clearInterval(metadataInterval);
    };
  }, [loadData]);

  const visibleQuestions = questions.filter((q) => q.resultsVisible);
  const OPTION_COLORS: Record<string, { bar: string; progress: string }> = {
    agree: { bar: "hsl(160 84% 39%)", progress: "bg-emerald-600" },
    disagree: { bar: "hsl(0 72% 51%)", progress: "bg-red-600" },
  };
  const FALLBACK_COLORS = ["hsl(160 84% 39%)", "hsl(0 72% 51%)"];

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-slate-100">
        <div
          className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-5%,hsl(207_100%_90%_/_0.45),transparent_55%)]"
          aria-hidden
        />
        <Loader2 className="relative h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-100">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_0%,hsl(207_100%_92%_/_0.4),transparent_52%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,hsl(210_25%_96%)_0%,hsl(210_20%_94%)_45%,hsl(215_18%_92%)_100%)]"
        aria-hidden
      />

      <header className="relative border-b border-primary/10 bg-gradient-to-b from-white to-[hsl(207_55%_98%)] shadow-[0_4px_30px_-12px_rgba(0,82,155,0.18)]">
        <div className="h-1 w-full bg-gradient-to-r from-primary/30 via-primary to-primary/30" aria-hidden />
        <div className="container mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
            <img
              src="/images/logo_prosalud.webp"
              alt="Prosalud"
              className="h-16 w-auto shrink-0 object-contain sm:h-[4.5rem]"
            />
            <div className="flex min-w-0 flex-1 flex-col items-center text-center sm:items-center">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1 text-emerald-800 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.12em]">En vivo</span>
              </div>
              <h1 className="text-balance text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                Resultados en Tiempo Real
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">Asamblea ProSalud</p>
            </div>
            <div className="hidden w-[7.5rem] shrink-0 sm:block" aria-hidden />
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
          aria-hidden
        />
      </header>

      <main className="relative container mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {questions.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-12 pb-12 text-center">
              <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No hay asamblea activa</h2>
              <p className="text-muted-foreground">
                No hay una asamblea activa en este momento. Contacte al administrador.
              </p>
            </CardContent>
          </Card>
        ) : visibleQuestions.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-12 pb-12 text-center">
              <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Sin resultados disponibles</h2>
              <p className="text-muted-foreground">
                Los resultados se mostrarán cuando el administrador los habilite
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {visibleQuestions.map((question) => {
              const stat = stats[question.id];
              if (!stat) {
                return null;
              }

              const chartData = stat.optionResults.map((r) => ({
                name: r.optionText,
                votes: r.votes,
                percentage: r.percentage,
                optionId: r.optionId,
              }));

              const fallbackColors = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted))"];

              const fallbackTitle =
                question.title && question.title.trim().length > 0
                  ? question.title
                  : `Pregunta #${question.order ?? visibleQuestions.indexOf(question) + 1}`;

              return (
                <Card key={question.id} className="overflow-hidden shadow-xl">
                  <CardHeader className="space-y-4 bg-gradient-to-r from-primary/5 to-primary/10">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <CardTitle className="text-2xl mb-3">{fallbackTitle}</CardTitle>
                        <p className="text-muted-foreground">
                          La pregunta fue presentada por el moderador en vivo.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {(() => {
                          const config = STATUS_CONFIG[question.status];
                          return (
                            <Badge variant={config.variant} className={`text-sm ${config.className ?? ""}`}>
                              {config.label}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{stat.totalVotes} votos</span>
                      </div>
                      {stat.majorityAchieved ? (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-semibold">Mayoría alcanzada</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                          <XCircle className="h-5 w-5" />
                          <span className="font-semibold">Mayoría pendiente</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-8 pb-8 space-y-6">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            tick={{ fontSize: 14 }}
                          />
                          <YAxis tick={{ fontSize: 14 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number, name: string) => {
                              const item = chartData.find((d) => d.votes === value);
                              return [`${value} votos (${item?.percentage.toFixed(1)}%)`, name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="votes" name="Votos" radius={[8, 8, 0, 0]}>
                            {chartData.map((entry, index) => {
                              const color =
                                OPTION_COLORS[entry.optionId]?.bar ??
                                fallbackColors[index % fallbackColors.length];
                              return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                      {(stat.optionResults.length > 0
                        ? stat.optionResults
                        : LIVE_VOTE_OPTIONS.map((option) => ({
                            optionId: option.id,
                            optionText: option.text,
                            votes: 0,
                            percentage: 0,
                          }))
                      ).map((result, index) => {
                        const colors = OPTION_COLORS[result.optionId] ?? {
                          bar: FALLBACK_COLORS[index % FALLBACK_COLORS.length],
                          progress: "bg-primary",
                        };
                        return (
                          <div
                            key={result.optionId}
                            className="space-y-2 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-base font-semibold text-slate-800">{result.optionText}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xl font-bold" style={{ color: colors.bar }}>
                                  {result.votes}
                                </span>
                                <span
                                  className="text-sm font-semibold tabular-nums"
                                  style={{ color: colors.bar }}
                                >
                                  {result.percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            <Progress
                              value={result.percentage}
                              className="h-3 bg-slate-200"
                              indicatorClassName={colors.progress}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
