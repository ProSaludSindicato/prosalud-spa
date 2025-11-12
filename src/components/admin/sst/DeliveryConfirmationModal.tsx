import React, { useMemo, useState } from 'react';
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
import type { SstDeliveryDraft, SstDeliveryType, SstInventoryItem } from '@/types/adminSst';
import { logger } from '@/utils/logger';

interface DeliveryConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: SstDeliveryDraft | null;
  inventory: SstInventoryItem[];
  affiliateName: string;
  onConfirm: (record: SstDeliveryDraft) => Promise<void>;
}

const colorPalette: Record<string, string> = {
  aguamarina: '#14B8A6',
  aguama: '#14B8A6',
  'aguama ': '#14B8A6',
  aquamarina: '#14B8A6',
  amarillo: '#FACC15',
  azul: '#2563EB',
  'azul claro': '#93C5FD',
  'azul cielo': '#38BDF8',
  'azul marino': '#1E40AF',
  'azul oscuro': '#1F2937',
  'azul rey': '#1E3A8A',
  beige: '#D4C4A8',
  blanco: '#FFFFFF',
  cafe: '#92400E',
  café: '#92400E',
  gris: '#6B7280',
  'gris raton': '#4B5563',
  'gris ratón': '#4B5563',
  'gris oscuro': '#374151',
  'gris reflectivo': '#9CA3AF',
  morado: '#A855F7',
  naranja: '#FB923C',
  negro: '#000000',
  negra: '#000000',
  petroleo: '#0F172A',
  petróleo: '#0F172A',
  rojo: '#EF4444',
  rosa: '#F472B6',
  verde: '#22C55E',
  'verde agua': '#5EEAD4',
  'verde quirurgico': '#065F46',
  'verde quirúrgico': '#065F46',
  'vino tinto': '#881337',
};

const normalizeColorName = (color?: string) =>
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

const DELIVERY_TYPE_LABELS: Record<SstDeliveryType, string> = {
  first_time: 'Primera vez',
  periodic: 'Periódica',
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

  const confirmationTimestamp = new Date();

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(record);
      onOpenChange(false);
    } catch (error) {
      logger.error('Error al confirmar entrega en modal SST', error instanceof Error ? error.message : error);
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
                  Fecha y hora de registro
                </span>
                <p className="text-base font-medium text-slate-800">
                  {confirmationTimestamp.toLocaleString('es-CO', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Entregado por
                </span>
                <p className="text-base font-medium text-slate-800">{record.deliveredByName || record.deliveredBy}</p>
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
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tipo de entrega
                </span>
                <p className="text-base font-medium text-slate-800">
                  {DELIVERY_TYPE_LABELS[record.deliveryType] ?? 'No especificado'}
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
                const resolvedColor = item.variant?.color || inventoryItem?.defaultColor;
                return (
                  <li
                    key={`${item.itemId}-${index}`}
                    className="flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    {resolvedColor && renderColorSwatch(resolvedColor)}
                    <span className="font-semibold text-slate-800">
                      {inventoryItem?.name ?? item.itemId}
                    </span>
                    {resolvedColor && (
                      <span className="text-xs text-slate-500">
                        ({resolvedColor})
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

          {record.signatureData && (
            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Firma de recibido
              </h4>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <img
                  src={record.signatureData}
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

