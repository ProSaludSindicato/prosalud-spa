import { useEffect, useMemo, useState } from 'react';

/**
 * Modal de confirmación de duplicados en importación ZIP/Excel.
 * Desactivado temporalmente desde AdminDocumentSigningPage
 * (CONVENIO_DUPLICATE_IMPORT_CHECK_ENABLED = false). Conservar para reactivación futura.
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  ConvenioDuplicateAction,
  ConvenioDuplicateActionType,
  ConvenioDuplicateConflict,
} from '@/services/conveniosManualService';

interface ImportDuplicateConfirmDialogProps {
  open: boolean;
  conflicts: ConvenioDuplicateConflict[];
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (actions: ConvenioDuplicateAction[]) => void;
}

const DEFAULT_REASON = 'Este convenio fue reemplazado por uno nuevo. Use el enlace de firma más reciente.';

const ACTION_LABELS: Record<ConvenioDuplicateActionType, { title: string; hint: string }> = {
  invalidate_and_proceed: {
    title: 'Invalidar anterior y continuar',
    hint: 'El convenio pendiente dejará de admitir firma.',
  },
  skip: {
    title: 'Omitir este nuevo convenio',
    hint: 'No se importará el nuevo registro.',
  },
  proceed_anyway: {
    title: 'Importar de todos modos',
    hint: 'Se creará un registro adicional.',
  },
};

function signingEstadoLabel(estado: string | null): string {
  switch (estado) {
    case 'pendiente_firma':
      return 'Pendiente de firma';
    case 'firmado_afiliado':
      return 'Firmado por el afiliado';
    case 'completado':
      return 'Completado';
    case 'rechazado':
      return 'Invalidado';
    default:
      return estado || 'Sin firma digital';
  }
}

export default function ImportDuplicateConfirmDialog({
  open,
  conflicts,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: ImportDuplicateConfirmDialogProps) {
  const [actionsByKey, setActionsByKey] = useState<Record<string, ConvenioDuplicateActionType>>({});
  const [reasonsByKey, setReasonsByKey] = useState<Record<string, string>>({});
  const [defaultReason, setDefaultReason] = useState(DEFAULT_REASON);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextActions: Record<string, ConvenioDuplicateActionType> = {};
    const nextReasons: Record<string, string> = {};
    for (const conflict of conflicts) {
      nextActions[conflict.key] = conflict.recommended_action;
      nextReasons[conflict.key] = DEFAULT_REASON;
    }
    setActionsByKey(nextActions);
    setReasonsByKey(nextReasons);
    setDefaultReason(DEFAULT_REASON);
  }, [open, conflicts]);

  const invalidateKeys = useMemo(
    () => conflicts
      .map((conflict) => conflict.key)
      .filter((key) => actionsByKey[key] === 'invalidate_and_proceed'),
    [actionsByKey, conflicts],
  );

  const canSubmit = conflicts.length > 0
    && conflicts.every((conflict) => Boolean(actionsByKey[conflict.key]))
    && invalidateKeys.every((key) => (reasonsByKey[key]?.trim().length ?? 0) >= 8);

  const applyDefaultReason = () => {
    const trimmed = defaultReason.trim();
    if (trimmed.length < 8) {
      return;
    }

    setReasonsByKey((prev) => {
      const next = { ...prev };
      for (const key of invalidateKeys) {
        next[key] = trimmed;
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (!canSubmit) {
      return;
    }

    const actions = conflicts.map((conflict) => {
      const action = actionsByKey[conflict.key];
      const payload: ConvenioDuplicateAction = {
        documento: conflict.documento,
        sede: conflict.sede,
        action,
      };

      if (action === 'invalidate_and_proceed') {
        payload.invalidation_reason = reasonsByKey[conflict.key]?.trim();
      }

      return payload;
    });

    onConfirm(actions);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!isSubmitting) {
        onOpenChange(nextOpen);
      }
    }}>
      <DialogContent className="flex max-h-[92vh] max-sm:inset-x-4 max-sm:max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-4 sm:w-[96vw] sm:max-w-7xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Convenios duplicados</DialogTitle>
          <DialogDescription>
            Hay registros vigentes para las mismas personas y sede. Elija qué hacer con cada uno antes de continuar.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-50">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              Si el convenio anterior tenía errores, invalídelo para que el afiliado no pueda firmar el enlace viejo.
            </p>
          </div>

          {invalidateKeys.length > 0 && (
            <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950/30">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label htmlFor="duplicate-default-reason" className="text-sky-950 dark:text-sky-50">
                  Motivo predeterminado de invalidación
                </Label>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="shrink-0 shadow-sm"
                  disabled={defaultReason.trim().length < 8}
                  onClick={applyDefaultReason}
                >
                  Aplicar a filas que invalidan
                </Button>
              </div>
              <Textarea
                id="duplicate-default-reason"
                value={defaultReason}
                onChange={(event) => setDefaultReason(event.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Texto base para los convenios que se invaliden."
                className="border-sky-200 bg-white dark:border-sky-800 dark:bg-background"
              />
              <p className="text-xs text-sky-800/80 dark:text-sky-200/80">
                Puede usarlo como plantilla y ajustar el motivo de cada fila si hay particularidades.
              </p>
            </div>
          )}

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[22%] min-w-[10rem]">Afiliado</TableHead>
                  <TableHead className="w-[20%] min-w-[9rem]">Registro actual</TableHead>
                  <TableHead className="w-[24%] min-w-[11rem]">Decisión</TableHead>
                  <TableHead className="min-w-[14rem]">Motivo de invalidación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conflicts.map((conflict) => {
                  const selected = actionsByKey[conflict.key] ?? conflict.recommended_action;
                  const existing = conflict.existing[0];
                  const isInvalidating = selected === 'invalidate_and_proceed';

                  return (
                    <TableRow key={conflict.key} className="align-top">
                      <TableCell className="py-3">
                        <p className="font-mono text-sm font-semibold">{conflict.documento}</p>
                        <p className="text-sm leading-snug">
                          {conflict.incoming_nombre || existing?.nombre_afiliado || 'Afiliado'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Sede {conflict.sede}
                          {conflict.incoming_label ? ` · ${conflict.incoming_label}` : ''}
                        </p>
                      </TableCell>
                      <TableCell className="py-3 text-sm">
                        {existing ? (
                          <div className="space-y-1">
                            <p>{signingEstadoLabel(existing.signing_estado)}</p>
                            {existing.created_at && (
                              <p className="text-xs text-muted-foreground">Creado {existing.created_at}</p>
                            )}
                            {existing.affiliate_has_signed && (
                              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Ya firmado</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <Select
                          value={selected}
                          onValueChange={(value) => {
                            setActionsByKey((prev) => ({
                              ...prev,
                              [conflict.key]: value as ConvenioDuplicateActionType,
                            }));
                          }}
                        >
                          <SelectTrigger className="h-9 w-full min-w-[11rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {conflict.can_invalidate && (
                              <SelectItem value="invalidate_and_proceed">
                                {ACTION_LABELS.invalidate_and_proceed.title}
                              </SelectItem>
                            )}
                            <SelectItem value="skip">{ACTION_LABELS.skip.title}</SelectItem>
                            <SelectItem value="proceed_anyway">{ACTION_LABELS.proceed_anyway.title}</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {selected === 'proceed_anyway' && conflict.has_signed
                            ? 'El convenio ya firmado se conserva. Úselo solo si necesita otro envío.'
                            : ACTION_LABELS[selected]?.hint}
                        </p>
                      </TableCell>
                      <TableCell className="py-3">
                        {isInvalidating ? (
                          <div className="space-y-1.5">
                            <Textarea
                              value={reasonsByKey[conflict.key] ?? ''}
                              onChange={(event) => {
                                setReasonsByKey((prev) => ({
                                  ...prev,
                                  [conflict.key]: event.target.value,
                                }));
                              }}
                              maxLength={500}
                              rows={2}
                              placeholder="Motivo visible para el afiliado si abre el enlace anterior."
                              aria-label={`Motivo de invalidación para ${conflict.documento}`}
                            />
                            <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No aplica</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canSubmit || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continuar importación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
