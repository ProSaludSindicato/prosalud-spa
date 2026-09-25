import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { ConvenioEmailTracking } from '@/services/conveniosManualService';

interface RequestAffiliateResignDialogProps {
  open: boolean;
  tracking: ConvenioEmailTracking | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function RequestAffiliateResignDialog({
  open,
  tracking,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: RequestAffiliateResignDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar nueva firma del afiliado</DialogTitle>
          <DialogDescription>
            Se eliminará la firma actual del afiliado y del presidente, y se reenviará el convenio
            original por correo para que el afiliado lo firme nuevamente.
          </DialogDescription>
        </DialogHeader>

        {tracking && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-mono font-medium">{tracking.documento}</p>
            <p>{tracking.nombre_afiliado}</p>
            <p className="text-muted-foreground">{tracking.sede || tracking.nombre_convenio}</p>
            {tracking.president_sign_last_error && (
              <p className="mt-2 text-xs text-destructive">
                Motivo del rechazo: {tracking.president_sign_last_error}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting || !tracking}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reenviar para firma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
