import { useState, useEffect, useMemo } from "react";
import type { UserSession } from "@/types/assemblyVoting";
import { CandidateCard } from "@/components/assembly/CandidateCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Vote, LogOut, CheckCircle, AlertTriangle, CheckCircle2, Building2, ShieldCheck } from "lucide-react";
import { logger } from "@/utils/logger";
import {
  buildVoteTimestampIso,
  checkDelegateVoteStatus,
  getDelegadosBySede,
  mapDelegadosToCandidates,
  submitDelegateVote,
} from "@/services/publicDelegateCandidateVotingApi";
import type { Candidate } from "@/types/assemblyVoting";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PROSALUD_LOGO_URL = "https://prosalud.org.co/images/logo_prosalud_fondo.png";

interface DelegateCandidateVotingProps {
  session: UserSession;
  onLogout: () => void;
  /** Actualiza la sesión persistida cuando el voto queda registrado (éxito o ya constaba en el servidor). */
  onVoteRecorded?: () => void;
}

export default function DelegateCandidateVoting({ session, onLogout, onVoteRecorded }: DelegateCandidateVotingProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCheckDone, setVoteCheckDone] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationKey, setVerificationKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showLogo, setShowLogo] = useState(true);

  const selectedCandidateData = useMemo(
    () => candidates.find((c) => c.id === selectedCandidate),
    [candidates, selectedCandidate]
  );

  useEffect(() => {
    let cancelled = false;

    const verifyVoteStatus = async () => {
      setVoteCheckDone(false);
      setVerificationError(null);
      try {
        const status = await checkDelegateVoteStatus(session.documentType, session.documentNumber);
        if (cancelled) {
          return;
        }
        if (!status.success) {
          setVerificationError(status.message || "No se pudo comprobar si ya había votado.");
          setVoteCheckDone(true);
          return;
        }
        if (status.has_voted) {
          setHasVoted(true);
          onVoteRecorded?.();
        }
        setVoteCheckDone(true);
      } catch (error) {
        if (!cancelled) {
          logger.error("Error al verificar estado de voto", {
            message: error instanceof Error ? error.message : String(error),
          });
          setVerificationError(
            error instanceof Error ? error.message : "Error de conexión al verificar su voto."
          );
          setVoteCheckDone(true);
        }
      }
    };

    void verifyVoteStatus();

    return () => {
      cancelled = true;
    };
  }, [session.documentType, session.documentNumber, verificationKey, onVoteRecorded]);

  useEffect(() => {
    if (!voteCheckDone || hasVoted) {
      return;
    }

    let cancelled = false;

    const loadCandidates = async () => {
      setIsLoadingCandidates(true);
      setLoadError(null);
      try {
        const data = await getDelegadosBySede(session.hospital);
        if (cancelled) {
          return;
        }
        if (!data.success) {
          throw new Error(data.message || "Error al cargar candidatos");
        }
        const list = mapDelegadosToCandidates(data.delegados);
        if (list.length === 0) {
          setCandidates([]);
          toast.info("Sin candidatos disponibles", {
            description: `No hay candidatos para ${session.hospital}`,
          });
          return;
        }
        setCandidates(list);
      } catch (error) {
        if (!cancelled) {
          logger.error("Error loading candidates", {
            message: error instanceof Error ? error.message : String(error),
          });
          setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los candidatos");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCandidates(false);
        }
      }
    };

    void loadCandidates();

    return () => {
      cancelled = true;
    };
  }, [session.hospital, refreshKey, voteCheckDone, hasVoted]);

  const handleVoteClick = () => {
    if (!selectedCandidate) {
      toast.error("Por favor seleccione un candidato");
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmVote = async () => {
    if (!selectedCandidate || !selectedCandidateData) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitDelegateVote({
        voter: {
          documentType: session.documentType,
          documentNumber: session.documentNumber,
          hospital: session.hospital,
          position: session.position,
        },
        candidate: selectedCandidateData,
        timestamp: buildVoteTimestampIso(),
      });

      if (!result.success) {
        if (result.status === 409 && (result.error_code === "ALREADY_VOTED" || result.error_code === "DUPLICATE_VOTE")) {
          setHasVoted(true);
          onVoteRecorded?.();
          setShowConfirmDialog(false);
          return;
        }
        toast.error(result.message || "Error al registrar el voto", {
          description:
            result.error_code === "CANDIDATE_HOSPITAL_MISMATCH"
              ? "Seleccione un candidato de su sede."
              : undefined,
        });
        setShowConfirmDialog(false);
        return;
      }

      setHasVoted(true);
      onVoteRecorded?.();
      toast.success("¡Voto registrado exitosamente!", {
        style: {
          background: "hsl(122 39% 49%)",
          color: "white",
          border: "none",
        },
        classNames: { description: "text-white" },
      });
      setShowConfirmDialog(false);
    } catch (error) {
      toast.error("Error al registrar el voto", {
        description: error instanceof Error ? error.message : "Por favor intenta nuevamente",
        style: {
          background: "hsl(0 84.2% 60.2%)",
          color: "white",
          border: "none",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!voteCheckDone) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-lg font-medium text-foreground">Comprobando su voto…</p>
          <p className="text-sm text-muted-foreground">
            Verificamos en el servidor si ya participó en esta elección antes de mostrar los candidatos.
          </p>
        </div>
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">No se pudo verificar su voto</CardTitle>
            <CardDescription className="mt-2 text-base">{verificationError}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              onClick={() => {
                setVerificationError(null);
                setVoteCheckDone(false);
                setVerificationKey((k) => k + 1);
              }}
              className="w-full"
            >
              Reintentar
            </Button>
            <Button variant="outline" onClick={onLogout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError && !isLoadingCandidates) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">Error al cargar</CardTitle>
            <CardDescription className="mt-2 text-base">{loadError}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => {
                setLoadError(null);
                setRefreshKey((k) => k + 1);
              }}
              className="w-full"
            >
              Reintentar carga
            </Button>
            <Button variant="outline" onClick={onLogout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10">
              <CheckCircle className="h-12 w-12 text-secondary" />
            </div>
            <CardTitle className="text-2xl text-secondary">¡Voto registrado!</CardTitle>
            <CardDescription className="mt-2 text-base">
              Tu voto ha sido registrado exitosamente para el hospital {session.hospital}. Gracias por participar en la
              elección de delegados de ProSalud.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100/80 px-3 pb-28 pt-4 sm:px-4 sm:pt-6 md:pb-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl border border-primary/10 bg-white/95 p-4 shadow-sm backdrop-blur-sm sm:p-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {showLogo ? (
                <img
                  src={PROSALUD_LOGO_URL}
                  alt="Logo ProSalud"
                  className="h-14 w-auto rounded-md border border-primary/10 bg-white p-1 shadow-sm sm:h-16"
                  onError={() => setShowLogo(false)}
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-16 sm:w-16">
                  <ShieldCheck className="h-7 w-7" />
                </div>
              )}
              <div className="text-left">
                <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Votación ProSalud</h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Elección de delegados para la Asamblea General
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <Badge variant="secondary" className="gap-1.5 text-xs sm:text-sm">
                <Building2 className="h-3.5 w-3.5" />
                Sede: {session.hospital}
              </Badge>
              <Badge variant="outline" className="text-xs sm:text-sm">
                Voto único
              </Badge>
            </div>
          </div>
        </div>

        <Card className="mb-6 border-l-4 border-l-accent shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <ShieldCheck className="h-5 w-5 text-accent" />
              Instrucciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground sm:text-base">
              <li>Revise cuidadosamente los postulados para su hospital</li>
              <li>Seleccione un postulado haciendo clic en el botón &quot;Seleccionar&quot;</li>
              <li>Confirme su voto haciendo clic en &quot;Confirmar voto&quot;</li>
              <li>El voto es único y no podrá ser modificado una vez registrado</li>
            </ol>
          </CardContent>
        </Card>

        <div className="mb-8">
          <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-2xl font-bold text-foreground">Postulados — {session.hospital}</h2>
            {!isLoadingCandidates && candidates.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {candidates.length} {candidates.length === 1 ? "candidato disponible" : "candidatos disponibles"}
              </p>
            ) : null}
          </div>
          {isLoadingCandidates ? (
            <div className="space-y-4 py-12 text-center">
              <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-lg font-medium text-muted-foreground">Cargando candidatos...</p>
              <p className="text-sm text-muted-foreground">Hospital: {session.hospital}</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg text-muted-foreground">No hay candidatos disponibles para esta sede</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  isSelected={selectedCandidate === candidate.id}
                  onSelect={setSelectedCandidate}
                  disabled={hasVoted}
                />
              ))}
            </div>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 p-3 shadow-[0_-8px_24px_rgba(2,6,23,0.08)] backdrop-blur-sm md:static md:mt-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 md:items-center">
            <p className="truncate text-center text-xs text-muted-foreground sm:text-sm">
              {selectedCandidateData
                ? `Seleccionado: ${selectedCandidateData.name}`
                : "Seleccione un candidato para continuar"}
            </p>
            <Button
              size="lg"
              onClick={handleVoteClick}
              disabled={!selectedCandidate || hasVoted}
              className="w-full md:min-w-[260px] md:w-auto"
            >
              <Vote className="mr-2 h-5 w-5" />
              Confirmar voto
            </Button>
          </div>
        </div>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="bg-gradient-to-br from-card via-card to-secondary/5">
            <AlertDialogHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                <CheckCircle2 className="h-10 w-10 text-secondary" />
              </div>
              <AlertDialogTitle className="text-center text-2xl">Confirmar voto</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p className="text-center text-base">Está a punto de votar por:</p>
                <div className="rounded-lg border-l-4 border-secondary bg-secondary/10 p-4">
                  <p className="mb-1 text-xl font-bold text-foreground">{selectedCandidateData?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCandidateData?.position}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Hospital: {session.hospital}</p>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <p className="text-sm font-medium text-destructive">Esta acción no se puede deshacer. ¿Está seguro de su elección?</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-2">
              <AlertDialogCancel disabled={isSubmitting} className="w-full sm:w-auto">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void handleConfirmVote();
                }}
                disabled={isSubmitting}
                className="w-full bg-secondary hover:bg-secondary/90 sm:w-auto"
              >
                {isSubmitting ? "Registrando..." : "Confirmar voto"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
