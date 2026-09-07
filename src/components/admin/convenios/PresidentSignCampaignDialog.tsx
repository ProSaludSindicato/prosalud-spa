import { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import {
  previewPresidentSignCampaign,
  startPresidentSignCampaign,
} from '@/services/conveniosManualService';

interface PresidentSignCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: (batchId: number) => void;
}

export default function PresidentSignCampaignDialog({
  open,
  onOpenChange,
  onStarted,
}: PresidentSignCampaignDialogProps) {
  const [scope, setScope] = useState<'all' | 'date_range'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeErrors, setIncludeErrors] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewWarning, setPreviewWarning] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!open) {
      setPreviewCount(null);
      setPreviewWarning(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void loadPreview();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [open, scope, dateFrom, dateTo, includeErrors]);

  const loadPreview = async (): Promise<void> => {
    if (scope === 'date_range' && (!dateFrom || !dateTo)) {
      setPreviewCount(null);
      return;
    }

    setIsPreviewLoading(true);
    setPreviewWarning(null);
    try {
      const result = await previewPresidentSignCampaign({
        scope,
        date_from: scope === 'date_range' ? dateFrom : undefined,
        date_to: scope === 'date_range' ? dateTo : undefined,
        include_errors: includeErrors,
      });
      setPreviewCount(result.count);
    } catch (err: unknown) {
      const payload = err as { message?: string; count?: number; status?: number };
      const message = payload.message ?? 'No se pudo obtener el conteo.';
      if (payload.status === 422 && typeof payload.count === 'number') {
        setPreviewCount(payload.count);
        setPreviewWarning(message);
        return;
      }
      setPreviewCount(null);
      setPreviewWarning(null);
      toast.error(message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleStart = async (): Promise<void> => {
    setIsStarting(true);
    try {
      const result = await startPresidentSignCampaign({
        scope,
        date_from: scope === 'date_range' ? dateFrom : undefined,
        date_to: scope === 'date_range' ? dateTo : undefined,
        include_errors: includeErrors,
      });
      toast.success('Lote de firma iniciado', {
        description: `${result.accepted} convenio(s) encolados.`,
      });
      onStarted(result.batch_id);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'No se pudo iniciar la firma masiva.';
      toast.error(message);
    } finally {
      setIsStarting(false);
    }
  };

  const canStart =
    previewCount !== null &&
    previewCount > 0 &&
    previewWarning === null &&
    (scope === 'all' || (dateFrom.length > 0 && dateTo.length > 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            Firma masiva del presidente
          </DialogTitle>
          <DialogDescription>
            Encola la autofirma presidencial para convenios ya firmados por el afiliado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RadioGroup
            value={scope}
            onValueChange={(value) => setScope(value as 'all' | 'date_range')}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="scope-all" />
              <Label htmlFor="scope-all">Todos los firmados por afiliado</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="date_range" id="scope-dates" />
              <Label htmlFor="scope-dates">Rango de fechas (firma del afiliado)</Label>
            </div>
          </RadioGroup>

          {scope === 'date_range' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="date-from">Desde</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date-to">Hasta</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40">
            <Checkbox
              id="include-errors"
              checked={includeErrors}
              onCheckedChange={(checked) => setIncludeErrors(checked === true)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label htmlFor="include-errors" className="font-medium leading-snug">
                También reintentar convenios que fallaron
              </Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Incluye convenios que quedaron con error al aplicar la firma del presidente y aún no
                están completados.
              </p>
            </div>
          </div>

          <div
            className={
              previewWarning
                ? 'rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
                : previewCount !== null && !isPreviewLoading
                  ? 'rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100'
                  : 'rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950/20'
            }
          >
            {isPreviewLoading ? (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculando convenios elegibles…
              </span>
            ) : previewWarning ? (
              <span>{previewWarning}</span>
            ) : previewCount === null ? (
              <span className="text-muted-foreground">
                {scope === 'date_range' && (!dateFrom || !dateTo)
                  ? 'Indique el rango de fechas para ver el conteo.'
                  : 'No hay convenios elegibles con los filtros actuales.'}
              </span>
            ) : (
              <span>
                <strong className="text-base">{previewCount}</strong> convenio
                {previewCount !== 1 ? 's' : ''} listo{previewCount !== 1 ? 's' : ''} para firma
                presidencial.
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isStarting}>
            Cancelar
          </Button>
          <Button onClick={() => void handleStart()} disabled={!canStart || isStarting}>
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Encolando…
              </>
            ) : (
              'Iniciar firma masiva'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
