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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { ConvenioEmailTracking } from '@/services/conveniosManualService';

interface InvalidateConvenioDialogProps {
  open: boolean;
  tracking: ConvenioEmailTracking | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}

export default function InvalidateConvenioDialog({
  open,
  tracking,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: InvalidateConvenioDialogProps) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open, tracking?.id]);

  const canSubmit = reason.trim().length >= 8;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!isSubmitting) {
        onOpenChange(nextOpen);
      }
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invalidar convenio</DialogTitle>
          <DialogDescription>
            {tracking?.firmado_afiliado_at || tracking?.signing_estado === 'firmado_afiliado'
              || tracking?.signing_estado === 'firmando_presidente'
              || tracking?.signing_estado === 'pendiente_revision'
              || tracking?.signing_estado === 'error_firma_presidente'
              ? 'Este convenio ya fue firmado por el afiliado. Al invalidarlo no podrá completarse ni firmarse por el presidente. Use esta acción solo si fue reemplazado por uno nuevo.'
              : 'El afiliado ya no podrá firmar este registro. Use esta acción si el convenio se envió por error o fue reemplazado por uno nuevo.'}
          </DialogDescription>
        </DialogHeader>

        {tracking && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="font-mono font-medium">{tracking.documento}</p>
              <p>{tracking.nombre_afiliado}</p>
              <p className="text-muted-foreground">{tracking.sede || tracking.nombre_convenio}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invalidate-convenio-reason">Motivo</Label>
              <Textarea
                id="invalidate-convenio-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Ejemplo: Convenio reemplazado por uno nuevo. Use el enlace más reciente."
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres. Quedará en el historial y se mostrará si el afiliado abre el enlace anterior.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit || isSubmitting || !tracking}
            onClick={() => onConfirm(reason.trim())}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Invalidar convenio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
