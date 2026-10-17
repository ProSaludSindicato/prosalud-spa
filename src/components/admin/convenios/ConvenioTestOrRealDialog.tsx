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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FlaskConical, Send } from 'lucide-react';

export type ConvenioDeliveryChoice = 'test' | 'real';

interface ConvenioTestOrRealDialogProps {
  open: boolean;
  /** Qué se va a hacer, p. ej. "Generar y enviar el convenio de 123 - JUAN PEREZ". */
  actionLabel: string;
  /** Destino del correo si es real, p. ej. "afiliado@correo.com" o "cada afiliado". */
  realRecipientLabel: string;
  /** Hay envío de correo; si no, la elección solo marca el registro. */
  sendsEmail: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (isTest: boolean) => void;
}

/**
 * Con el modo TEST habilitado, obliga a elegir explícitamente si el convenio es de prueba o real
 * antes de crearlo/enviarlo. No hay opción preseleccionada para evitar envíos accidentales.
 */
export default function ConvenioTestOrRealDialog({
  open,
  actionLabel,
  realRecipientLabel,
  sendsEmail,
  onOpenChange,
  onConfirm,
}: ConvenioTestOrRealDialogProps) {
  const [choice, setChoice] = useState<ConvenioDeliveryChoice | null>(null);

  useEffect(() => {
    if (open) {
      setChoice(null);
    }
  }, [open]);

  const options: Array<{
    value: ConvenioDeliveryChoice;
    title: string;
    description: string;
    icon: typeof FlaskConical;
    selectedClassName: string;
  }> = [
    {
      value: 'test',
      title: 'Prueba (TEST)',
      description: sendsEmail
        ? 'El correo llega a tu usuario, nunca al afiliado. Queda marcado como TEST en el historial.'
        : 'Queda marcado como TEST en el historial. Si se reenvía, llegará a tu usuario, nunca al afiliado.',
      icon: FlaskConical,
      selectedClassName: 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40',
    },
    {
      value: 'real',
      title: 'Real',
      description: sendsEmail
        ? `El correo se envía a ${realRecipientLabel}, igual que en producción.`
        : `Queda como convenio productivo. Si se reenvía, llegará a ${realRecipientLabel}.`,
      icon: Send,
      selectedClassName: 'border-primary bg-primary/5',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>¿Es un convenio de prueba o real?</DialogTitle>
          <DialogDescription>
            El modo TEST está habilitado. {actionLabel}: elige cómo debe tratarse.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={choice ?? ''}
          onValueChange={(value) => setChoice(value as ConvenioDeliveryChoice)}
          className="gap-3"
        >
          {options.map((option) => {
            const Icon = option.icon;
            const selected = choice === option.value;

            return (
              <Label
                key={option.value}
                htmlFor={`convenio-delivery-${option.value}`}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors hover:bg-muted',
                  selected && option.selectedClassName,
                )}
              >
                <RadioGroupItem id={`convenio-delivery-${option.value}`} value={option.value} className="mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Icon className="h-4 w-4 shrink-0" />
                    {option.title}
                  </span>
                  <span className="block break-words text-sm text-muted-foreground">{option.description}</span>
                </div>
              </Label>
            );
          })}
        </RadioGroup>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={choice === null}
            onClick={() => {
              if (choice !== null) {
                onConfirm(choice === 'test');
              }
            }}
          >
            {choice === 'real'
              ? sendsEmail
                ? 'Enviar como REAL'
                : 'Continuar como REAL'
              : choice === 'test'
                ? sendsEmail
                  ? 'Enviar como PRUEBA'
                  : 'Continuar como PRUEBA'
                : 'Elige una opción'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
