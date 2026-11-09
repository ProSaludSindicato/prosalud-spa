import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assemblyApi } from "@/services/assemblyApi";
import type { RepresentedDelegate } from "@/types/assembly";

interface ProxyDeclarationStepProps {
  delegateName: string;
  /** Un apoderado que no es delegado solo puede confirmar: no tiene voto propio. */
  isDelegate: boolean;
  voterToken: string | undefined;
  listed: RepresentedDelegate[];
  alreadyRegistered: RepresentedDelegate[];
  onDone: (representedDelegates: RepresentedDelegate[]) => void;
  onSessionExpired: () => void;
}

/**
 * Tras validar su identidad, el delegado que figura como apoderado en el listado declara si asiste
 * en representación de esos delegados; su voto contará también por ellos.
 */
export function ProxyDeclarationStep({
  delegateName,
  isDelegate,
  voterToken,
  listed,
  alreadyRegistered,
  onDone,
  onSessionExpired,
}: ProxyDeclarationStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const result = await assemblyApi.declareProxies(voterToken);

      result.skipped.forEach((delegate) => {
        toast.warning(`${delegate.name}: ${delegate.message}`, {
          duration: 8000,
        });
      });

      if (result.registered.length > 0) {
        toast.success(
          result.registered.length === 1
            ? "Representación registrada. Su voto contará también por 1 delegado."
            : `Representación registrada. Su voto contará también por ${result.registered.length} delegados.`,
        );
      }

      onDone(result.registered);
    } catch (error) {
      const data = axios.isAxiosError(error) ? error.response?.data : undefined;
      if (data?.error_code === "VOTER_SESSION_INVALID") {
        toast.error(
          "Su sesión de votación expiró. Valide nuevamente su documento.",
        );
        onSessionExpired();
        return;
      }
      toast.error(
        typeof data?.message === "string"
          ? data.message
          : "No se pudo registrar la representación",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-white via-slate-50 to-slate-100/90">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-3 pb-8 pt-4 sm:px-4 sm:pt-6">
        <header className="text-center">
          <div className="mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center sm:h-24 sm:w-24">
            <img
              src="/images/logo_prosalud.webp"
              alt="ProSalud"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="mt-2 text-balance text-xl font-bold tracking-tight text-primary sm:text-2xl">
            Hola, {delegateName}
          </h1>
          <p className="mt-1 text-pretty text-sm text-muted-foreground sm:text-base">
            Su asistencia quedó registrada.
          </p>
        </header>

        <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-foreground">
                Usted figura como apoderado de:
              </h2>
              <p className="text-sm text-muted-foreground">
                {isDelegate
                  ? "Si asiste en representación de estos delegados, su voto contará también por cada uno de ellos."
                  : "Usted no es delegado: confirme la representación para votar en nombre de estos delegados."}
              </p>
            </div>
          </div>

          <ul className="flex flex-col gap-2">
            {listed.map((delegate) => {
              const isRegistered = alreadyRegistered.some(
                (item) => item.document === delegate.document,
              );
              return (
                <li
                  key={delegate.document}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {delegate.name || delegate.document}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      CC {delegate.document}
                    </p>
                  </div>
                  {isRegistered && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700">
                      <UserCheck className="h-4 w-4" aria-hidden />
                      Registrado
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="h-12 w-full touch-manipulation text-base font-semibold shadow-md"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Registrando…
              </>
            ) : isDelegate ? (
              "Sí, asisto como su apoderado"
            ) : (
              "Confirmar representación"
            )}
          </Button>
          {isDelegate && (
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full touch-manipulation text-base"
              onClick={() => onDone(alreadyRegistered)}
              disabled={isSubmitting}
            >
              No, solo asisto como delegado
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
