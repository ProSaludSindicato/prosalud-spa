import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { SstDeliveryRecord, SstInventoryItem } from '@/types/adminSst';

interface DeliveryConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: SstDeliveryRecord | null;
  inventory: SstInventoryItem[];
  affiliateName: string;
  onConfirm: (record: SstDeliveryRecord) => Promise<void>;
}

const colorPalette: Record<string, string> = {
  aguamarina: '#7FDBFF',
  blanco: '#FFFFFF',
  azul: '#0074D9',
  gris: '#AAAAAA',
  negro: '#111111',
  petroleo: '#17505F',
  verde: '#2ECC40',
};

const normalizeColorName = (color: string): string | undefined =>
  color
    ? color
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    : undefined;

const renderColorSwatch = (color?: string) => {
  if (!color) return null;
  const normalized = normalizeColorName(color);
  const background = (normalized && colorPalette[normalized]) || '#cbd5f5';

  return (
    <span
      className="inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full border border-slate-200"
      style={{ backgroundColor: background }}
      aria-label={color}
      title={color}
    />
  );
};

export function DeliveryConfirmationModal({
  open,
  onOpenChange,
  record,
  inventory,
  affiliateName,
  onConfirm,
}: DeliveryConfirmationModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!record) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(record);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CheckCircle2 className="h-6 w-6 text-primary-prosalud" />
            Confirmar entrega de dotación y EPP
          </DialogTitle>
          <DialogDescription>
            Revisa el resumen de la entrega antes de confirmar el registro definitivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Afiliado
                </span>
                <p className="text-base font-semibold text-slate-800">{affiliateName}</p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fecha y hora
                </span>
                <p className="text-base font-medium text-slate-800">
                  {new Date(record.deliveredAt).toLocaleString('es-CO', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Entregado por
                </span>
                <p className="text-base font-medium text-slate-800">{record.deliveredBy}</p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total de elementos
                </span>
                <p className="text-base font-medium text-slate-800">
                  {record.items.length}{' '}
                  {record.items.length === 1 ? 'elemento' : 'elementos'}
                </p>
              </div>
            </div>

            {record.notes && (
              <>
                <Separator className="my-3" />
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Observaciones
                  </span>
                  <p className="mt-1 text-sm text-slate-700">{record.notes}</p>
                </div>
              </>
            )}
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Elementos entregados
            </h4>
            <ul className="space-y-2">
              {record.items.map((item, index) => {
                const inventoryItem = inventory.find((inv) => inv.id === item.itemId);
                return (
                  <li
                    key={`${item.itemId}-${index}`}
                    className="flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    {inventoryItem?.defaultColor && renderColorSwatch(inventoryItem.defaultColor)}
                    <span className="font-semibold text-slate-800">
                      {inventoryItem?.name ?? item.itemId}
                    </span>
                    {inventoryItem?.defaultColor && (
                      <span className="text-xs text-slate-500">
                        ({inventoryItem.defaultColor})
                      </span>
                    )}
                    {item.variant?.size && (
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                        {item.variant.size}
                      </Badge>
                    )}
                    <Badge variant="outline" className="ml-auto">
                      × {item.quantity}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </div>

          {record.signedDocumentUrl && (
            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Firma de recibido
              </h4>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <img
                  src={record.signedDocumentUrl}
                  alt="Firma del afiliado"
                  className="mx-auto max-h-60 w-full object-contain"
                />
                {record.signedDocumentType && record.signedDocumentNumber && (
                  <p className="mt-3 text-xs text-slate-500">
                    Documento firmado: {record.signedDocumentType} {record.signedDocumentNumber}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className="bg-primary-prosalud hover:bg-primary-prosalud-dark"
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirmar entrega
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

