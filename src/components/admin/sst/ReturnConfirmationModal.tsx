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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RotateCcw, Loader2, CreditCard, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type { SstReturnDraft, SstReturnReason, SstInventoryItem, SstDeliveryRecord, SstReturnRecord, SstDeliveryItemSelection } from '@/types/adminSst';
import { logger } from '@/utils/logger';
import { resolveSstColorInfo, normalizeSstColorKey } from './color-utils';

interface ReturnConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: SstReturnDraft | null;
  inventory: SstInventoryItem[];
  affiliateName: string;
  deliveryHistory: SstDeliveryRecord[];
  returnHistory: SstReturnRecord[];
  onConfirm: (record: SstReturnDraft) => Promise<void>;
}

const RETURN_REASON_LABELS: Record<SstReturnReason, string> = {
  retirement: 'Retiro',
  replacement: 'Recambio',
  other: 'Otro',
};

const renderColorSwatch = (color?: string) => {
  if (!color) return null;
  const colorInfo = resolveSstColorInfo(color);
  const background = colorInfo?.hex ?? '#cbd5f5';

  return (
    <span
      className="inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full border border-slate-200"
      style={{ backgroundColor: background }}
      aria-label={colorInfo?.label ?? color}
      title={colorInfo?.label ?? color}
    />
  );
};

// Helper function to create a unique key for an item with variant
const getItemKey = (itemId: string, variant?: { color?: string; size?: string }): string => {
  const color = normalizeSstColorKey(variant?.color) ?? '';
  const size = variant?.size ?? '';
  return `${itemId}::${color}::${size}`;
};

// Calculate delivered quantities by item key (excluding EPP items)
const calculateDeliveredQuantities = (
  deliveryHistory: SstDeliveryRecord[],
  inventory: SstInventoryItem[],
): Map<string, number> => {
  const quantities = new Map<string, number>();
  
  deliveryHistory.forEach((record) => {
    record.items.forEach((item) => {
      // Skip EPP items and carnet
      if (item.itemId === '__carnet__') return;
      const inventoryItem = inventory.find((inv) => inv.id === item.itemId || inv.baseId === item.itemId);
      if (inventoryItem?.category === 'EPP') return;
      
      const key = getItemKey(item.itemId, item.variant);
      const current = quantities.get(key) ?? 0;
      quantities.set(key, current + item.quantity);
    });
  });
  
  return quantities;
};

// Calculate returned quantities by item key (excluding EPP items)
const calculateReturnedQuantities = (
  returnHistory: SstReturnRecord[],
  inventory: SstInventoryItem[],
): Map<string, number> => {
  const quantities = new Map<string, number>();
  
  returnHistory.forEach((record) => {
    record.items.forEach((item) => {
      // Skip EPP items and carnet
      if (item.itemId === '__carnet__') return;
      const inventoryItem = inventory.find((inv) => inv.id === item.itemId || inv.baseId === item.itemId);
      if (inventoryItem?.category === 'EPP') return;
      
      const key = getItemKey(item.itemId, item.variant);
      const current = quantities.get(key) ?? 0;
      quantities.set(key, current + item.quantity);
    });
  });
  
  return quantities;
};

export function ReturnConfirmationModal({
  open,
  onOpenChange,
  record,
  inventory,
  affiliateName,
  deliveryHistory,
  returnHistory,
  onConfirm,
}: ReturnConfirmationModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  // Calculate quantities - hooks must be called before any conditional returns
  // Exclude EPP items from calculations
  const deliveredQuantities = useMemo(
    () => calculateDeliveredQuantities(deliveryHistory, inventory),
    [deliveryHistory, inventory],
  );

  const returnedQuantities = useMemo(
    () => calculateReturnedQuantities(returnHistory, inventory),
    [returnHistory, inventory],
  );

  // Calculate what's being returned now (excluding EPP items)
  const returningQuantities = useMemo(() => {
    if (!record) return new Map<string, number>();
    const quantities = new Map<string, number>();
    record.items.forEach((item) => {
      // Skip EPP items and carnet
      if (item.itemId === '__carnet__') return;
      const inventoryItem = inventory.find((inv) => inv.id === item.itemId || inv.baseId === item.itemId);
      if (inventoryItem?.category === 'EPP') return;
      
      const key = getItemKey(item.itemId, item.variant);
      const current = quantities.get(key) ?? 0;
      quantities.set(key, current + item.quantity);
    });
    return quantities;
  }, [record?.items, inventory]);

  // Calculate pending items (delivered - already returned - being returned now)
  const pendingQuantities = useMemo(() => {
    const pending = new Map<string, number>();
    deliveredQuantities.forEach((delivered, key) => {
      const alreadyReturned = returnedQuantities.get(key) ?? 0;
      const returningNow = returningQuantities.get(key) ?? 0;
      const pendingQty = delivered - alreadyReturned - returningNow;
      if (pendingQty > 0) {
        pending.set(key, pendingQty);
      }
    });
    return pending;
  }, [deliveredQuantities, returnedQuantities, returningQuantities]);

  const hasPendingItems = pendingQuantities.size > 0;
  const [isPendingListOpen, setIsPendingListOpen] = useState(false);

  // Calculate pending items with inventory details
  const pendingItemsList = useMemo(() => {
    if (!record) return [];
    const items: Array<{
      itemKey: string;
      itemId: string;
      variant?: { color?: string; size?: string };
      quantity: number;
      inventoryItem?: SstInventoryItem;
    }> = [];

    pendingQuantities.forEach((quantity, key) => {
      const parts = key.split('::');
      const itemId = parts[0] || '';
      const color = parts[1] && parts[1] !== '' ? parts[1] : undefined;
      const size = parts[2] && parts[2] !== '' ? parts[2] : undefined;
      const variant = color || size ? { color, size } : undefined;
      const inventoryItem = inventory.find((inv) => inv.id === itemId || inv.baseId === itemId);
      items.push({
        itemKey: key,
        itemId,
        variant,
        quantity,
        inventoryItem,
      });
    });

    return items;
  }, [pendingQuantities, inventory, record]);

  const handleConfirm = async () => {
    if (!record) return;
    setIsConfirming(true);
    try {
      await onConfirm(record);
      onOpenChange(false);
    } catch (error) {
      logger.error('Error al confirmar devolución en modal SST', error instanceof Error ? error.message : error);
    } finally {
      setIsConfirming(false);
    }
  };

  if (!record) return null;

  const confirmationTimestamp = new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <RotateCcw className="h-6 w-6 text-primary-prosalud" />
            Confirmar devolución de dotación y EPP
          </DialogTitle>
          <DialogDescription>
            Revisa el resumen de la devolución y la comparación con el historial antes de confirmar el registro definitivo.
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
                  Recibido por
                </span>
                <p className="text-base font-medium text-slate-800">{record.receivedByName || record.receivedBy}</p>
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
                  Motivo de devolución
                </span>
                <p className="text-base font-medium text-slate-800">
                  {record.reason ? RETURN_REASON_LABELS[record.reason] : 'No especificado'}
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
              Elementos a devolver
            </h4>
            <ul className="space-y-2">
              {record.items.map((item, index) => {
                // Handle special "Carnet" item
                if (item.itemId === '__carnet__') {
                  return (
                    <li
                      key={`carnet-${index}`}
                      className="flex flex-wrap items-center gap-2.5 rounded-lg border border-primary-prosalud/30 bg-gradient-to-br from-primary-prosalud/5 to-primary-prosalud/10 p-3 shadow-sm"
                    >
                      <CreditCard className="h-5 w-5 text-primary-prosalud flex-shrink-0" />
                      <span className="font-semibold text-slate-800">
                        Carnet
                      </span>
                      <span className="text-xs text-slate-500">
                        (Documento de identificación)
                      </span>
                      <Badge variant="outline" className="ml-auto">
                        × {item.quantity}
                      </Badge>
                    </li>
                  );
                }

                const inventoryItem = inventory.find((inv) => inv.id === item.itemId || inv.baseId === item.itemId);
                // Skip EPP items from display
                if (inventoryItem?.category === 'EPP') return null;
                
                const rawColor = item.variant?.color || inventoryItem?.defaultColor;
                const colorInfo = resolveSstColorInfo(rawColor);
                const resolvedColor = colorInfo?.label ?? rawColor;
                const itemKey = getItemKey(item.itemId, item.variant);
                const delivered = deliveredQuantities.get(itemKey) ?? 0;
                const alreadyReturned = returnedQuantities.get(itemKey) ?? 0;
                const returningNow = item.quantity;
                const willRemain = delivered - alreadyReturned - returningNow;

                return (
                  <li
                    key={`${item.itemId}-${index}`}
                    className="flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    {rawColor && renderColorSwatch(rawColor)}
                    <span className="font-semibold text-slate-800">
                      {inventoryItem?.name ?? item.itemId}
                      {inventoryItem?.gender && (
                        <span className="font-bold"> ({inventoryItem.gender})</span>
                      )}
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
                    {delivered > 0 && (
                      <div className="w-full mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                        <span className="font-medium">Historial: </span>
                        <span className="text-green-700">{delivered} entregado{delivered !== 1 ? 's' : ''}</span>
                        {alreadyReturned > 0 && (
                          <>
                            {' - '}
                            <span className="text-orange-700">{alreadyReturned} devuelto{alreadyReturned !== 1 ? 's' : ''} previamente</span>
                          </>
                        )}
                        {' - '}
                        <span className="text-blue-700">{returningNow} devolviendo ahora</span>
                        {willRemain > 0 && (
                          <>
                            {' = '}
                            <span className="text-slate-700 font-semibold">{willRemain} pendiente{willRemain !== 1 ? 's' : ''}</span>
                          </>
                        )}
                        {willRemain <= 0 && (
                          <>
                            {' = '}
                            <span className="text-green-700 font-semibold">Todo devuelto</span>
                          </>
                        )}
                      </div>
                    )}
                    {delivered === 0 && (
                      <div className="w-full mt-2 pt-2 border-t border-slate-100 text-xs text-amber-600">
                        <span className="font-medium">⚠️ Sin entregas registradas en el historial</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {hasPendingItems && (
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-900">Elementos pendientes por devolver</AlertTitle>
              <AlertDescription className="text-yellow-800">
                Después de esta devolución, aún quedan elementos pendientes por devolver según el historial de entregas.
              </AlertDescription>
              <div className="mt-3">
                <Collapsible open={isPendingListOpen} onOpenChange={setIsPendingListOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-yellow-900 hover:text-yellow-700 transition-colors w-full">
                    <span>Ver listado de elementos pendientes ({pendingItemsList.length})</span>
                    {isPendingListOpen ? (
                      <ChevronUp className="h-4 w-4 transition-transform duration-200" />
                    ) : (
                      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    <div className="rounded-lg border border-yellow-200 bg-white p-3 max-h-60 overflow-y-auto">
                      <ul className="space-y-2">
                        {pendingItemsList.map((item) => {
                          const rawColor = item.variant?.color || item.inventoryItem?.defaultColor;
                          const colorInfo = resolveSstColorInfo(rawColor);
                          const resolvedColor = colorInfo?.label ?? rawColor;
                          return (
                            <li
                              key={item.itemKey}
                              className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"
                            >
                              {rawColor && renderColorSwatch(rawColor)}
                              <span className="flex-1 text-sm font-medium text-slate-800">
                                {item.inventoryItem?.name ?? item.itemId}
                                {item.inventoryItem?.gender && (
                                  <span className="font-bold"> ({item.inventoryItem.gender})</span>
                                )}
                              </span>
                              {resolvedColor && (
                                <span className="text-xs text-slate-500">
                                  {resolvedColor}
                                </span>
                              )}
                              {item.variant?.size && (
                                <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                                  {item.variant.size}
                                </Badge>
                              )}
                              <Badge variant="outline" className="font-semibold">
                                × {item.quantity}
                              </Badge>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </Alert>
          )}

          {record.signatureData && (
            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Firma de constancia
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
                Confirmar devolución
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

