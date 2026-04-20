import { useState } from "react";
import { Switch } from "@/components/ui/switch";
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
import { useActiveVotingMode, useSetVotingMode } from "@/hooks/useActiveVotingMode";
import { toast } from "@/hooks/use-toast";
import type { ActiveVotingMode } from "@/services/votingModeApi";

interface VotingModeToggleProps {
  /** Which mode this toggle controls */
  mode: "candidate" | "assembly";
}

const LABELS: Record<"candidate" | "assembly", { label: string; enabledDesc: string; disabledDesc: string }> = {
  candidate: {
    label: "Elección de candidatos",
    enabledDesc: "Habilitado: los afiliados pueden votar por candidatos delegados.",
    disabledDesc: "Deshabilitado: la votación de candidatos no está activa.",
  },
  assembly: {
    label: "Votación asamblea en vivo",
    enabledDesc: "Habilitado: los delegados pueden votar en preguntas de la asamblea.",
    disabledDesc: "Deshabilitado: la votación de asamblea no está activa.",
  },
};

export function VotingModeToggle({ mode }: VotingModeToggleProps) {
  const { activeMode, isLoading } = useActiveVotingMode();
  const { mutateAsync, isPending } = useSetVotingMode();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState(false);

  const isEnabled = activeMode === mode;
  const otherIsActive = activeMode !== "none" && activeMode !== mode;
  const config = LABELS[mode];

  const handleCheckedChange = (checked: boolean) => {
    if (checked && otherIsActive) {
      setPendingEnabled(true);
      setConfirmOpen(true);
      return;
    }
    void applyMode(checked);
  };

  const applyMode = async (enable: boolean) => {
    const newMode: ActiveVotingMode = enable ? mode : "none";
    try {
      await mutateAsync(newMode);
      toast({
        title: enable ? `${config.label} habilitado` : `${config.label} deshabilitado`,
        description: enable ? config.enabledDesc : config.disabledDesc,
        variant: enable ? "success" : "default",
      });
    } catch {
      toast({
        title: "Error al actualizar el modo",
        description: "No se pudo cambiar el modo de votación. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    void applyMode(pendingEnabled);
  };

  return (
    <>
      <div className="flex max-w-md flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{config.label}</p>
            <p className="truncate text-sm font-semibold text-slate-900">{isEnabled ? "Activo" : "Inactivo"}</p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleCheckedChange}
            disabled={isLoading || isPending}
            aria-label={`Habilitar o deshabilitar ${config.label}`}
          />
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          {isEnabled ? config.enabledDesc : config.disabledDesc}
          {otherIsActive && !isEnabled && (
            <span className="mt-1 block font-medium text-amber-600">
              Activar esto desactivará el otro modo de votación.
            </span>
          )}
        </p>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar modo de votación</AlertDialogTitle>
            <AlertDialogDescription>
              Hay otro modo de votación activo. Al activar <strong>{config.label}</strong>, el otro modo se desactivará
              automáticamente. ¿Desea continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
