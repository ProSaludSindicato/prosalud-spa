import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ClipboardCheck, ClipboardList, Eye, Signature, UploadCloud, ChevronDown, ChevronUp } from 'lucide-react';
import type {
  SstAffiliate,
  SstDeliveryItemSelection,
  SstDeliveryRecord,
  SstInventoryItem,
  SstInventoryVariant,
} from '@/types/adminSst';
import { cn } from '@/lib/utils';
import { SignatureCaptureDrawer } from '@/components/admin/sst/SignatureCaptureDrawer';

interface AffiliateDeliveryPanelProps {
  affiliate: SstAffiliate;
  inventory: SstInventoryItem[];
  deliveryHistory: SstDeliveryRecord[];
  onConfirmDelivery?: (record: SstDeliveryRecord) => void;
  confirmedRecordId?: string | null;
}

interface SelectedItemState {
  quantity: number;
  variantIndex?: number;
}

type SelectedItemsMap = Record<string, SelectedItemState>;

const colorPalette: Record<string, string> = {
  aguamarina: '#14b8a6',
  aquamarina: '#14b8a6',
  blanco: '#f8fafc',
  'azul claro': '#60a5fa',
  'azul oscuro': '#1e3a8a',
  'azul rey': '#1d4ed8',
  azul: '#3b82f6',
  'gris raton': '#6b7280',
  'gris ratón': '#6b7280',
  'gris reflectivo': '#94a3b8',
  gris: '#9ca3af',
  negro: '#0f172a',
  petroleo: '#0d9488',
  petróleo: '#0d9488',
  verde: '#22c55e',
  aguama: '#14b8a6',
  'aguama ': '#14b8a6',
  'azul cielo': '#38bdf8',
};

const normalizeColorName = (color?: string) =>
  color
    ? color
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    : undefined;

export function AffiliateDeliveryPanel({
  affiliate,
  inventory,
  deliveryHistory,
  onConfirmDelivery,
  confirmedRecordId,
}: AffiliateDeliveryPanelProps) {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<SelectedItemsMap>({});
  const [deliveredBy, setDeliveredBy] = useState('');
  const [notes, setNotes] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSignatureDrawerOpen, setIsSignatureDrawerOpen] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  useEffect(() => {
    resetForm();
    setIsSignatureDrawerOpen(false);
    setExpandedHistory({});
  }, [affiliate.id]);

  const inventoryByCategory = useMemo(() => {
    return inventory.reduce<Record<string, SstInventoryItem[]>>((acc, item) => {
      const key = item.category;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }, [inventory]);

  const selectedCount = Object.keys(selectedItems).length;

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

  const VariantMeta = ({ variant }: { variant?: SstInventoryVariant }) => {
    if (!variant?.color && !variant?.size) {
      return <span className="text-xs text-slate-500">Única</span>;
    }

    return (
      <span className="flex items-center gap-2">
        {variant?.color && (
          <div className="flex items-center gap-2">
            {renderColorSwatch(variant.color)}
            <span className="text-xs font-medium text-slate-600">{variant.color}</span>
          </div>
        )}
        {variant?.size && (
          <span className="inline-flex items-center rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {variant.size}
          </span>
        )}
      </span>
    );
  };

  const asDeliveryItems = (): SstDeliveryItemSelection[] => {
    return Object.entries(selectedItems).map(([itemId, state]) => {
      const item = inventory.find((inv) => inv.id === itemId);
      const variant =
        item?.variants && item.variants.length > 0
          ? item.variants[state.variantIndex ?? 0]
          : undefined;

      return {
        itemId,
        variant,
        quantity: state.quantity,
      };
    });
  };

  const resetForm = () => {
    setSelectedItems({});
    setDeliveredBy('');
    setNotes('');
    setSignatureDataUrl(null);
    setFormError(null);
  };

  const toggleHistoryExpansion = (recordId: string) => {
    setExpandedHistory((prev) => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
  };

  const handleToggleItem = (item: SstInventoryItem, checked: boolean) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (checked) {
        next[item.id] = {
          quantity: 1,
          variantIndex: item.variants && item.variants.length > 0 ? 0 : undefined,
        };
      } else {
        delete next[item.id];
      }
      return next;
    });
  };

  const handleQuantityChange = (itemId: string, value: number) => {
    if (Number.isNaN(value)) return;
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: Math.max(0, value) },
    }));
  };

  const handleVariantChange = (itemId: string, index: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], variantIndex: index },
    }));
  };

  const handleRegisterDelivery = async () => {
    if (selectedCount === 0) {
      setFormError('Selecciona al menos un elemento para entregar.');
      toast({
        title: 'Selecciona al menos un elemento',
        description: 'Debe seleccionar los elementos a entregar antes de registrar la entrega.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    if (!signatureDataUrl) {
      setFormError('Captura la firma del afiliado para poder continuar.');
      toast({
        title: 'Firma requerida',
        description: 'Captura la firma del afiliado para finalizar el registro.',
        variant: 'destructive',
        duration: 5000,
      });
      setIsSignatureDrawerOpen(true);
      return;
    }

    const hasInvalidQuantities = Object.values(selectedItems).some((item) => (item?.quantity ?? 0) <= 0);
    if (hasInvalidQuantities) {
      setFormError('Revisa las cantidades. Cada elemento seleccionado debe tener una cantidad mayor a cero.');
      toast({
        title: 'Cantidad inválida',
        description: 'Ajusta las cantidades de los elementos seleccionados antes de registrar la entrega.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    setFormError(null);
      const record: SstDeliveryRecord = {
        id: `sst-delivery-${Date.now()}`,
        affiliateId: affiliate.id,
        deliveredAt: new Date().toISOString(),
        deliveredBy: deliveredBy || 'Encargado SST',
        items: asDeliveryItems(),
        signedDocumentUrl: signatureDataUrl,
      signedDocumentType: affiliate.documentType,
      signedDocumentNumber: affiliate.documentNumber,
        notes: notes.trim() || undefined,
      };

    // Trigger confirmation modal
    onConfirmDelivery?.(record);
  };

  useEffect(() => {
    if (!confirmedRecordId) return;
      resetForm();
  }, [confirmedRecordId]);

  useEffect(() => {
    if (selectedCount > 0 && formError?.includes('elemento')) {
      setFormError(null);
    }
  }, [selectedCount, formError]);

  useEffect(() => {
    if (signatureDataUrl && formError?.includes('firma')) {
      setFormError(null);
    }
  }, [signatureDataUrl, formError]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card className="border shadow-sm min-w-0">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Elementos disponibles</CardTitle>
              <CardDescription>
                Selecciona los elementos de EPP y dotación que se entregarán al afiliado.
              </CardDescription>
            </div>
            {selectedCount > 0 && (
              <Badge variant="secondary" className="text-sm">
                {selectedCount} elementos seleccionados
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {formError && (
            <Alert variant="destructive">
              <AlertTitle>Acción requerida</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          {Object.entries(inventoryByCategory).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-700">{category}</h3>
                <span className="text-sm text-slate-500">{items.length} artículos</span>
              </div>
              <div className="max-h-[360px] overflow-y-auto overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12" />
                      <TableHead>Artículo</TableHead>
                      <TableHead>Talla</TableHead>
                      <TableHead className="w-32">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const isSelected = Boolean(selectedItems[item.id]);
                      const itemState = selectedItems[item.id];
                      const hasVariants = item.variants && item.variants.length > 0;

                      return (
                        <TableRow key={item.id} className={cn(isSelected && 'bg-primary-prosalud/5')}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleToggleItem(item, Boolean(checked))
                              }
                              aria-label={`Seleccionar ${item.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              {item.defaultColor && renderColorSwatch(item.defaultColor)}
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800">{item.name}</span>
                                {item.defaultColor && (
                                  <span className="text-xs text-slate-600">{item.defaultColor}</span>
                                )}
                              {item.unit && (
                                <span className="text-xs text-slate-500">Unidad: {item.unit}</span>
                              )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {hasVariants ? (
                              <Select
                                disabled={!isSelected}
                                value={String(itemState?.variantIndex ?? 0)}
                                onValueChange={(value) =>
                                  handleVariantChange(item.id, Number.parseInt(value, 10))
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Selecciona la talla" />
                                </SelectTrigger>
                                <SelectContent>
                                  {item.variants?.map((variant, index) => (
                                    <SelectItem
                                      key={`${item.id}-${index}`}
                                      value={String(index)}
                                      className="group data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                                    >
                                      <span className="inline-flex items-center rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 group-data-[highlighted]:bg-primary-prosalud group-data-[highlighted]:border-primary-prosalud group-data-[highlighted]:text-white">
                                        {variant.size || 'Única'}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm text-slate-500">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              disabled={!isSelected}
                              value={itemState?.quantity ?? 1}
                              onChange={(event) =>
                                handleQuantityChange(item.id, Number(event.target.value))
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-6 min-w-0">
        <Card className="border shadow-sm w-full overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ClipboardList className="h-5 w-5 text-primary-prosalud" />
              Resumen de entrega
            </CardTitle>
            <CardDescription>
              Completa la información de entrega y captura la firma como constancia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="deliveredBy">Entregado por</Label>
                <Input
                  id="deliveredBy"
                  placeholder="Nombre del responsable"
                  value={deliveredBy}
                  onChange={(event) => setDeliveredBy(event.target.value)}
                />
                <span className="text-xs text-slate-500">
                  Si se deja en blanco se registrará como &quot;Encargado SST&quot;.
                </span>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="notes">Observaciones</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Anota observaciones o requerimientos especiales del afiliado."
                  rows={3}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                <Signature className="h-4 w-4 text-primary-prosalud" />
                Firma de constancia
              </Label>
              <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                <p>El afiliado firmará la constancia al finalizar el cargue de elementos.</p>
                {signatureDataUrl ? (
                  <div className="flex flex-col gap-3">
                    <span className="text-xs uppercase text-slate-500">Firma registrada</span>
                    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <span className="text-xs text-slate-500">Firma guardada correctamente.</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSignatureDrawerOpen(true)}
                        className="text-xs"
                      >
                        Ver / actualizar firma
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSignatureDrawerOpen(true)}
                    className="text-xs"
                  >
                    Capturar firma del afiliado
                  </Button>
                )}
                {formError?.includes('firma') && (
                  <p className="text-xs font-semibold text-red-600">
                    Captura la firma del afiliado para finalizar el registro.
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-500">
                La firma quedará asociada a la fecha y hora de registro para su consulta futura.
              </p>
            </div>

            <Button
              className="w-full gap-2 bg-primary-prosalud hover:bg-primary-prosalud-dark"
              onClick={handleRegisterDelivery}
            >
              <ClipboardCheck className="h-4 w-4" />
              Registrar entrega
            </Button>
          </CardContent>
        </Card>

        <Card className="border shadow-sm w-full overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UploadCloud className="h-5 w-5 text-primary-prosalud" />
              Historial reciente
            </CardTitle>
            <CardDescription>
              Entregas registradas anteriormente para este afiliado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deliveryHistory.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Aún no hay entregas registradas en el sistema para este afiliado.
              </div>
            ) : (
              <div className="space-y-4">
                {deliveryHistory.map((record) => {
                  const isExpanded = expandedHistory[record.id] ?? false;
                  const visibleItems = isExpanded ? record.items : record.items.slice(0, 3);
                  const hasMoreItems = record.items.length > 3;
                  const remainingItems = record.items.length - visibleItems.length;

                  return (
                  <div
                    key={record.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">
                        {new Date(record.deliveredAt).toLocaleString()}
                      </span>
                      <Badge variant="outline">{record.items.length} elementos</Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      Entregado por: <span className="font-medium">{record.deliveredBy}</span>
                    </p>
                      {record.signedDocumentType && record.signedDocumentNumber && (
                        <p className="text-xs text-slate-500">
                          Documento verificado: <span className="font-medium">{record.signedDocumentType}</span>{' '}
                          <span className="font-semibold">{record.signedDocumentNumber}</span>
                        </p>
                      )}
                      <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        {visibleItems.map((item) => {
                        const inventoryItem = inventory.find((inv) => inv.id === item.itemId);
                        return (
                            <li
                              key={`${record.id}-${item.itemId}-${item.variant?.color ?? 'default'}-${
                                item.variant?.size ?? 'unique'
                              }`}
                              className="flex flex-wrap items-center gap-2"
                            >
                              {inventoryItem?.defaultColor && renderColorSwatch(inventoryItem.defaultColor)}
                              <span className="font-medium text-slate-700">
                                {inventoryItem?.name ?? item.itemId}
                              </span>
                              {inventoryItem?.defaultColor && (
                                <span className="text-xs text-slate-500">({inventoryItem.defaultColor})</span>
                              )}
                              {item.variant?.size && (
                                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                  {item.variant.size}
                                </span>
                              )}
                              <span className="text-xs text-slate-500">× {item.quantity}</span>
                          </li>
                        );
                      })}
                    </ul>
                      {hasMoreItems && !isExpanded && (
                        <p className="mt-2 text-xs text-slate-500">
                          + {remainingItems} elemento{remainingItems === 1 ? '' : 's'} adicional{remainingItems === 1 ? '' : 'es'}
                        </p>
                      )}

                      {(record.signedDocumentUrl || hasMoreItems) && (
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          {record.signedDocumentUrl && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="inline-flex items-center gap-2 text-primary-prosalud hover:bg-primary-prosalud/10 hover:text-primary-prosalud-dark focus-visible:text-primary-prosalud-dark"
                                >
                                  <Eye className="h-4 w-4" /> Ver firma registrada
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-2xl border border-slate-200 bg-white shadow-xl">
                                <DialogHeader>
                                  <DialogTitle>Firma del afiliado</DialogTitle>
                                  <DialogDescription>
                                    Constancia correspondiente a la entrega realizada el {new Date(record.deliveredAt).toLocaleString()}.
                                    {record.signedDocumentType && record.signedDocumentNumber && (
                                      <span className="block text-xs text-slate-500 mt-1">
                                        Documento: {record.signedDocumentType} {record.signedDocumentNumber}
                                      </span>
                                    )}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                  <img
                                    src={record.signedDocumentUrl}
                                    alt="Firma del afiliado"
                                    className="mx-auto max-h-96 w-full rounded-md border border-slate-200 bg-white object-contain p-4"
                                  />
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}

                          {hasMoreItems && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="inline-flex items-center gap-2 text-primary-prosalud hover:text-primary-prosalud-dark"
                              onClick={() => toggleHistoryExpansion(record.id)}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4" /> Ver menos detalles
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4" /> Ver más detalles
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )}

                      {isExpanded && record.notes && (
                        <p className="mt-2 text-sm text-slate-600">
                          Observaciones: <span className="font-medium">{record.notes}</span>
                        </p>
                      )}
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SignatureCaptureDrawer
        open={isSignatureDrawerOpen}
        onOpenChange={setIsSignatureDrawerOpen}
        onSubmit={(dataUrl) => {
          setSignatureDataUrl(dataUrl);
          setFormError((prev) => (prev && prev.includes('firma') ? null : prev));
        }}
        onCancel={() => {
          if (!signatureDataUrl) {
            setFormError((prev) => (prev && prev.includes('firma') ? prev : null));
          }
        }}
        initialSignature={signatureDataUrl}
      />
    </div>
  );
}


