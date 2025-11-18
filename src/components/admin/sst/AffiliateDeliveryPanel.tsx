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
import { ClipboardCheck, ClipboardList, Eye, Signature, UploadCloud, ChevronDown, ChevronUp, CreditCard } from 'lucide-react';
import type {
  SstAffiliate,
  SstDeliveryDraft,
  SstDeliveryItemSelection,
  SstDeliveryRecord,
  SstDeliveryType,
  SstInventoryItem,
  SstInventoryVariant,
} from '@/types/adminSst';
import { cn } from '@/lib/utils';
import { SignatureCaptureDrawer } from '@/components/admin/sst/SignatureCaptureDrawer';
import { normalizeSstColorKey, resolveSstColorInfo } from './color-utils';

interface AffiliateDeliveryPanelProps {
  affiliate: SstAffiliate;
  inventory: SstInventoryItem[];
  deliveryHistory: SstDeliveryRecord[];
  onConfirmDelivery?: (draft: SstDeliveryDraft) => void;
  confirmedRecordId?: string | null;
  highlightedRecordId?: string | null;
  historyScrollRef?: React.RefObject<HTMLDivElement>;
}

interface SelectedItemState {
  quantity: number | '';
  variantIndex?: number;
}

type SelectedItemsMap = Record<string, SelectedItemState>;

const getInventoryItemSearchValue = (item: SstInventoryItem | undefined) => {
  if (!item) return '';
  const colorInfo = resolveSstColorInfo(item.defaultColor);
  const colorText = colorInfo?.label ?? '';
  const rawColor = item.defaultColor ?? '';
  return `${item.name} ${item.gender ?? ''} ${colorText} ${rawColor}`.toLowerCase();
};

const DELIVERY_TYPE_LABELS: Record<SstDeliveryType, string> = {
  first_time: 'Primera vez',
  periodic: 'Periódica',
};

const resolveRecordInventoryItem = (
  expandedInventory: SstInventoryItem[],
  recordItem: SstDeliveryItemSelection,
) => {
  const normalizedVariantColor = normalizeSstColorKey(recordItem.variant?.color);
  if (normalizedVariantColor) {
    const colorMatch = expandedInventory.find(
      (inv) =>
        (inv.baseId ?? inv.id) === recordItem.itemId &&
        normalizeSstColorKey(inv.defaultColor) === normalizedVariantColor,
    );
    if (colorMatch) {
      return colorMatch;
    }
  }

  return expandedInventory.find((inv) => (inv.baseId ?? inv.id) === recordItem.itemId) ?? undefined;
};

const GENERAL_SIZE_DEFAULT_VALUE = '__default__';

export function AffiliateDeliveryPanel({
  affiliate,
  inventory,
  deliveryHistory,
  onConfirmDelivery,
  confirmedRecordId,
  highlightedRecordId,
  historyScrollRef,
}: AffiliateDeliveryPanelProps) {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<SelectedItemsMap>({});
  const [deliveredBy, setDeliveredBy] = useState('');
  const [notes, setNotes] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSignatureDrawerOpen, setIsSignatureDrawerOpen] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const defaultDeliveryType = deliveryHistory.length === 0 ? 'first_time' : 'periodic';
  const [deliveryType, setDeliveryType] = useState<SstDeliveryType>(defaultDeliveryType);
  const [generalDotationSize, setGeneralDotationSize] = useState<string | null>(null);
  const [generalDotationQuantity, setGeneralDotationQuantity] = useState<number | ''>('');
  const [carnetSelected, setCarnetSelected] = useState(false);

  const expandedInventory = useMemo(() => {
    return inventory.flatMap((item) => {
      const baseId = item.baseId ?? item.id;
      const variants = Array.isArray(item.variants) ? item.variants : [];
      const colorGroups = new Map<
        string,
        {
          label?: string;
          colorId?: string;
          hex?: string;
          variants: SstInventoryVariant[];
        }
      >();

      if (variants.length === 0) {
        const colorInfo = resolveSstColorInfo(item.defaultColor);
        const key = normalizeSstColorKey(item.defaultColor) ?? '__no_color__';
        colorGroups.set(key, {
          label: colorInfo?.label ?? item.defaultColor ?? undefined,
          colorId: colorInfo?.id ?? item.defaultColor ?? undefined,
          hex: colorInfo?.hex,
          variants,
        });
      } else {
        variants.forEach((variant) => {
          const colorLabel = variant.color ?? item.defaultColor ?? undefined;
        const colorInfo = resolveSstColorInfo(colorLabel);
          const key = normalizeSstColorKey(colorLabel) ?? '__no_color__';
          const existing =
            colorGroups.get(key) ??
            {
              label: colorInfo?.label ?? colorLabel,
              colorId: colorInfo?.id ?? colorLabel,
              hex: colorInfo?.hex,
              variants: [] as SstInventoryVariant[],
            };
          if (!existing.label && colorLabel) {
            existing.label = colorInfo?.label ?? colorLabel;
          }
          if (!existing.colorId && (colorInfo?.id ?? colorLabel)) {
            existing.colorId = colorInfo?.id ?? colorLabel;
          }
          if (!existing.hex && colorInfo?.hex) {
            existing.hex = colorInfo.hex;
          }
          existing.variants.push(variant);
          colorGroups.set(key, existing);
        });
      }

      if (colorGroups.size <= 1) {
        const entry = colorGroups.values().next().value as
          | { label?: string; colorId?: string; hex?: string; variants: SstInventoryVariant[] }
          | undefined;
        return [
          {
            ...item,
            id: baseId,
            baseId,
            defaultColor: entry?.colorId ?? item.defaultColor ?? undefined,
            variants: entry?.variants ?? variants,
          },
        ];
      }

      return Array.from(colorGroups.entries()).map(([key, entry]) => ({
        ...item,
        id: `${baseId}::${key}`,
        baseId,
        defaultColor: entry.colorId ?? item.defaultColor ?? undefined,
        variants: entry.variants,
      }));
    });
  }, [inventory]);

  const expandedInventoryMap = useMemo(
    () => new Map(expandedInventory.map((item) => [item.id, item])),
    [expandedInventory],
  );

  useEffect(() => {
    resetForm();
    setIsSignatureDrawerOpen(false);
    setExpandedHistory({});
  }, [affiliate.id]);

  useEffect(() => {
    if (!generalDotationSize) return;
    setSelectedItems((prev) => {
      const next = { ...prev };
      Object.entries(next).forEach(([itemId, state]) => {
        const item = expandedInventoryMap.get(itemId);
        if (!item || item.category !== 'Dotación' || !item.variants || item.variants.length === 0) {
          return;
        }
        const matchIndex = item.variants.findIndex(
          (variant) =>
            variant.size?.trim().toLowerCase() === generalDotationSize.trim().toLowerCase(),
        );
        if (matchIndex >= 0) {
          next[itemId] = { ...state, variantIndex: matchIndex };
        }
      });
      return next;
    });
  }, [generalDotationSize, expandedInventoryMap]);

  useEffect(() => {
    if (generalDotationQuantity === '') return;
    if (typeof generalDotationQuantity !== 'number' || generalDotationQuantity <= 0) return;
    setSelectedItems((prev) => {
      const next: SelectedItemsMap = { ...prev };
      Object.entries(next).forEach(([itemId, state]) => {
        const item = expandedInventoryMap.get(itemId);
        if (!item || item.category !== 'Dotación') return;
        next[itemId] = { ...state, quantity: generalDotationQuantity };
      });
      return next;
    });
  }, [generalDotationQuantity, expandedInventoryMap]);

  const filteredInventory = useMemo(() => {
    const term = itemSearchTerm.trim().toLowerCase();

    return expandedInventory.filter((item) => {
      if (term === '') return true;
      return getInventoryItemSearchValue(item).includes(term);
    });
  }, [expandedInventory, itemSearchTerm]);

  const inventoryByCategory = useMemo(() => {
    return filteredInventory.reduce<Record<string, SstInventoryItem[]>>((acc, item) => {
      const key = item.category;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }, [filteredInventory]);

  const selectedCount = Object.keys(selectedItems).length + (carnetSelected ? 1 : 0);

  const dotationSizeOptions = useMemo(() => {
    const dotationItems = expandedInventory.filter((item) => item.category === 'Dotación');
    const sizeSet = new Set<string>();

    dotationItems.forEach((item) => {
      item.variants?.forEach((variant) => {
        const size = variant.size?.trim();
        if (size) {
          sizeSet.add(size);
        }
      });
    });

    const ORDER = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];
    const orderIndex = (size: string) => {
      const normalized = size.toUpperCase();
      const index = ORDER.indexOf(normalized);
      return index === -1 ? ORDER.length : index;
    };

    return Array.from(sizeSet).sort((a, b) => {
      const orderDiff = orderIndex(a) - orderIndex(b);
      if (orderDiff !== 0) return orderDiff;
      return a.localeCompare(b);
    });
  }, [inventory]);

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

  const VariantMeta = ({ variant }: { variant?: SstInventoryVariant }) => {
    if (!variant?.color && !variant?.size) {
      return <span className="text-xs text-slate-500">Única</span>;
    }

    return (
      <span className="flex items-center gap-2">
        {variant?.color && (
          <div className="flex items-center gap-2">
            {renderColorSwatch(variant.color)}
            <span className="text-xs font-medium text-slate-600">
              {resolveSstColorInfo(variant.color)?.label ?? variant.color}
            </span>
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
    const items = Object.entries(selectedItems).map(([itemId, state]) => {
      const item = expandedInventoryMap.get(itemId);
      const variant =
        item?.variants && item.variants.length > 0 ? item.variants[state.variantIndex ?? 0] : undefined;
      const quantity = typeof state.quantity === 'number' ? state.quantity : 0;

      return {
        itemId: item?.baseId ?? itemId,
        variant,
        quantity,
      };
    });

    // Add Carnet if selected
    if (carnetSelected) {
      items.push({
        itemId: '__carnet__',
        variant: undefined,
        quantity: 1,
      });
    }

    return items;
  };

  const resetForm = () => {
    setSelectedItems({});
    setDeliveredBy('');
    setNotes('');
    setSignatureDataUrl(null);
    setFormError(null);
    setDeliveryType(deliveryHistory.length === 0 ? 'first_time' : 'periodic');
    setCarnetSelected(false);
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
        let resolvedVariantIndex: number | undefined =
          item.variants && item.variants.length > 0 ? 0 : undefined;

        if (item.category === 'Dotación' && generalDotationSize && item.variants && item.variants.length > 0) {
          const matchIndex = item.variants.findIndex(
            (variant) =>
              variant.size?.trim().toLowerCase() === generalDotationSize.trim().toLowerCase(),
          );
          if (matchIndex >= 0) {
            resolvedVariantIndex = matchIndex;
          }
        }

        const rawQuantity =
          item.category === 'Dotación' && generalDotationQuantity !== '' ? generalDotationQuantity : 1;
        const resolvedQuantity =
          typeof rawQuantity === 'number' && rawQuantity > 0 ? rawQuantity : 1;

        next[item.id] = {
          quantity: resolvedQuantity,
          variantIndex: resolvedVariantIndex,
        };
      } else {
        delete next[item.id];
      }
      return next;
    });
  };

  const handleQuantityChange = (itemId: string, rawValue: string) => {
    setSelectedItems((prev) => {
      const current = prev[itemId];
      if (!current) return prev;

      if (rawValue === '') {
        return {
          ...prev,
          [itemId]: { ...current, quantity: '' },
        };
      }

      const numericValue = Number(rawValue);
      if (Number.isNaN(numericValue)) {
        return prev;
      }

      return {
        ...prev,
        [itemId]: { ...current, quantity: Math.max(0, numericValue) },
      };
    });
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

    // Validate that if only Carnet is selected, it's still valid
    if (selectedCount === 1 && carnetSelected && Object.keys(selectedItems).length === 0) {
      // This is valid - only Carnet selected
    } else if (Object.keys(selectedItems).length > 0) {
      // Validate quantities for inventory items
      const hasInvalidQuantities = Object.values(selectedItems).some((item) => {
        if (item?.quantity === '' || item?.quantity === undefined) return true;
        return item.quantity <= 0;
      });
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

    setFormError(null);
    const cleanedNotes = notes.trim();
    const responsible = deliveredBy.trim() || 'Responsable Dotación y EPP';

    const draft: SstDeliveryDraft = {
      affiliateId: affiliate.id,
      affiliateDocumentType: affiliate.documentType,
      affiliateDocumentNumber: affiliate.documentNumber,
      deliveredBy: responsible,
      deliveredByName: responsible,
      items: asDeliveryItems(),
      signatureData: signatureDataUrl,
      signedDocumentType: affiliate.documentType,
      signedDocumentNumber: affiliate.documentNumber,
      notes: cleanedNotes ? cleanedNotes : undefined,
      deliveryType,
    };

    onConfirmDelivery?.(draft);
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

  useEffect(() => {
    const nextDefault = deliveryHistory.length === 0 ? 'first_time' : 'periodic';
    setDeliveryType((prev) => (prev === nextDefault ? prev : nextDefault));
  }, [deliveryHistory.length]);

  useEffect(() => {
    if (deliveryType && formError?.includes('tipo de entrega')) {
      setFormError(null);
    }
  }, [deliveryType, formError]);

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
          <div className="space-y-2">
            <Label htmlFor="item-search" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Buscar artículo
            </Label>
            <div className="flex gap-2">
              <Input
                id="item-search"
                value={itemSearchTerm}
                onChange={(event) => setItemSearchTerm(event.target.value)}
                placeholder="Nombre del artículo"
              />
              {itemSearchTerm && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setItemSearchTerm('')}>
                  Limpiar
                </Button>
              )}
            </div>
          </div>
          {formError && (
            <Alert variant="destructive">
              <AlertTitle>Acción requerida</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          {Object.entries(inventoryByCategory).length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No se encontraron artículos con los filtros aplicados.
            </div>
          ) : (
            Object.entries(inventoryByCategory).map(([category, items]) => {
              const showCarnet = category === 'Dotación' || category === 'EPP';
              return (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-700">{category}</h3>
                <span className="text-sm text-slate-500">{items.length} artículos</span>
              </div>
              {showCarnet && (
                <div className="rounded-lg border-2 border-primary-prosalud/30 bg-gradient-to-br from-primary-prosalud/5 to-primary-prosalud/10 p-4 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`carnet-${category}`}
                      checked={carnetSelected}
                      onCheckedChange={(checked) => setCarnetSelected(Boolean(checked))}
                      className="h-5 w-5 border-2 border-primary-prosalud/50 data-[state=checked]:bg-primary-prosalud data-[state=checked]:border-primary-prosalud"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`carnet-${category}`}
                        className="text-sm font-semibold text-slate-800 cursor-pointer flex items-center gap-2"
                      >
                        Carnet
                        <CreditCard className="h-4 w-4 text-primary-prosalud" />
                      </Label>
                      <p className="text-xs text-slate-600 ml-1">
                        Marca esta opción para indicar que la persona recibió el carnet. Esta opción no depende del inventario.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {category === 'Dotación' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="general-dotation-size"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Talla general
                    </Label>
                    <Select
                      value={generalDotationSize ?? GENERAL_SIZE_DEFAULT_VALUE}
                      onValueChange={(value) => {
                        if (value === GENERAL_SIZE_DEFAULT_VALUE) {
                          setGeneralDotationSize(null);
                        } else {
                          setGeneralDotationSize(value);
                        }
                      }}
                    >
                      <SelectTrigger id="general-dotation-size">
                        <SelectValue placeholder="Selecciona una talla para aplicar por defecto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={GENERAL_SIZE_DEFAULT_VALUE}>Usar talla por defecto del artículo</SelectItem>
                        {dotationSizeOptions.length === 0 ? (
                          <SelectItem value="__no_sizes" disabled>
                            No hay tallas registradas
                          </SelectItem>
                        ) : (
                          dotationSizeOptions.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-slate-500">
                      Al seleccionar un artículo de dotación se asignará esta talla automáticamente, si está disponible.
                    </span>
                  </div>
                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="general-dotation-quantity"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Cantidad general
                    </Label>
                    <Input
                      id="general-dotation-quantity"
                      type="number"
                      min={1}
                      value={generalDotationQuantity}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === '') {
                          setGeneralDotationQuantity('');
                          return;
                        }
                        const parsed = Number.parseInt(value, 10);
                        setGeneralDotationQuantity(Number.isNaN(parsed) ? '' : Math.max(1, parsed));
                      }}
                      placeholder="Ej. 2"
                    />
                    <span className="text-xs text-slate-500">
                      Al seleccionar un artículo de dotación se usará esta cantidad inicial.
                    </span>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto rounded-lg border">
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
                              onCheckedChange={(checked) => handleToggleItem(item, Boolean(checked))}
                              aria-label={`Seleccionar ${item.name}${item.gender ? ` (${item.gender})` : ''}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              {item.defaultColor && renderColorSwatch(item.defaultColor)}
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800">
                                {item.name}
                                {item.gender && <span className="font-bold"> ({item.gender})</span>}
                              </span>
                                {item.defaultColor && (
                                  <span className="text-xs text-slate-600">
                                    {resolveSstColorInfo(item.defaultColor)?.label ?? item.defaultColor}
                                  </span>
                                )}
                              {/* item.unit && (
                                <span className="text-xs text-slate-500">Unidad: {item.unit}</span>
                              ))*/}
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
                              value={
                                !isSelected
                                  ? ''
                                  : itemState?.quantity === ''
                                  ? ''
                                  : itemState?.quantity ?? ''
                              }
                              onChange={(event) =>
                                handleQuantityChange(item.id, event.target.value)
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
            );
            })
          )}
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
                <Label>Tipo de entrega</Label>
                <Select
                  value={deliveryType}
                  onValueChange={(value) => setDeliveryType(value as SstDeliveryType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la periodicidad de la entrega" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_time">Primera vez</SelectItem>
                    <SelectItem value="periodic">Periódica</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-slate-500">Campo requerido.</span>
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

        <Card className="border shadow-sm w-full overflow-hidden" ref={historyScrollRef}>
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
                  const visibleItems = isExpanded ? record.items : record.items.slice(0, 4);
                  const hasMoreItems = record.items.length > visibleItems.length;
                  const remainingItems = hasMoreItems ? record.items.length - visibleItems.length : 0;
                  const totalUnits = record.items.reduce((acc, item) => acc + item.quantity, 0);
                  const totalVariants = record.items.length;

                  const isHighlighted = highlightedRecordId === record.id;
                  return (
                  <div
                    key={record.id}
                    className={`rounded-lg border p-4 shadow-sm transition-all duration-500 ${
                      isHighlighted
                        ? 'border-primary-prosalud bg-primary-prosalud/10 shadow-lg ring-2 ring-primary-prosalud/30'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">
                        {new Date(record.deliveredAt).toLocaleString()}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {record.deliveryType && (
                          <Badge variant="secondary">
                            {DELIVERY_TYPE_LABELS[record.deliveryType] ?? record.deliveryType}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">
                      Entregado por: <span className="font-medium">{record.deliveredBy}</span>
                    </p>
                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between bg-slate-50 px-4 py-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Detalle de artículos entregados
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {totalVariants} artículo{totalVariants === 1 ? '' : 's'} · {totalUnits}{' '}
                          unidad{totalUnits === 1 ? '' : 'es'}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                          <thead className="bg-slate-50">
                            <tr className="text-xs uppercase tracking-wide text-slate-500">
                              <th className="px-4 py-2 text-left font-semibold">Artículo</th>
                              <th className="px-4 py-2 text-left font-semibold">Color</th>
                              <th className="px-4 py-2 text-left font-semibold">Talla</th>
                              <th className="px-4 py-2 text-right font-semibold">Cantidad</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {visibleItems.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-3 text-center text-sm text-slate-500">
                                  No se registraron artículos en esta entrega.
                                </td>
                              </tr>
                            ) : (
                              visibleItems.map((item) => {
                                // Handle special "Carnet" item
                                if (item.itemId === '__carnet__') {
                                  return (
                                    <tr
                                      key={`${record.id}-carnet`}
                                      className="hover:bg-primary-prosalud/5 transition-colors"
                                    >
                                      <td className="px-4 py-2 align-top font-medium text-slate-700">
                                        <div className="flex items-center gap-2">
                                          <CreditCard className="h-4 w-4 text-primary-prosalud flex-shrink-0" />
                                          <div>
                                            <span className="font-medium text-slate-700">Carnet</span>
                                            <span className="block text-xs font-normal text-slate-500">
                                              Documento de identificación
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 align-top">
                                        <span className="text-sm text-slate-400">—</span>
                                      </td>
                                      <td className="px-4 py-2 align-top">
                                        <span className="text-sm text-slate-400">—</span>
                                      </td>
                                      <td className="px-4 py-2 text-right font-semibold text-slate-700">
                                        {item.quantity}
                                      </td>
                                    </tr>
                                  );
                                }

                                const inventoryItem =
                                  resolveRecordInventoryItem(expandedInventory, item) ??
                                  inventory.find((inv) => inv.id === item.itemId);
                                const rawColor = item.variant?.color ?? inventoryItem?.defaultColor ?? null;
                                const colorInfo = resolveSstColorInfo(rawColor ?? undefined);
                                const colorLabel = colorInfo?.label ?? rawColor;
                                const sizeLabel = item.variant?.size ?? 'Única';

                                return (
                                  <tr
                                    key={`${record.id}-${item.itemId}-${item.variant?.color ?? 'default'}-${
                                      item.variant?.size ?? 'unique'
                                    }`}
                                    className="hover:bg-primary-prosalud/5 transition-colors"
                                  >
                                    <td className="px-4 py-2 align-top font-medium text-slate-700">
                                      <span className="font-medium text-slate-700">
                                        {inventoryItem?.name ?? item.itemId}
                                        {inventoryItem?.gender && (
                                          <span className="font-bold"> ({inventoryItem.gender})</span>
                                        )}
                                      </span>
                                      {inventoryItem?.category && (
                                        <span className="block text-xs font-normal text-slate-500">
                                          {inventoryItem.category}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 align-top">
                                      {colorLabel ? (
                                        <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                                          {renderColorSwatch(rawColor ?? colorLabel)}
                                          <span>{colorLabel}</span>
                                        </span>
                                      ) : (
                                        <span className="text-sm text-slate-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 align-top">
                                      {sizeLabel ? (
                                        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                          {sizeLabel}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-slate-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-right font-semibold text-slate-700">
                                      {item.quantity}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
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
                              variant="outline"
                              size="sm"
                              onClick={() => toggleHistoryExpansion(record.id)}
                            >
                              {isExpanded ? 'Ver menos detalles' : 'Ver más detalles'}
                            </Button>
                          )}
                        </div>
                      )}

                      {record.notes && (
                        <div className="mt-4 space-y-1">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Observaciones
                          </h4>
                          <p className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm text-slate-600">
                            {record.notes}
                          </p>
                        </div>
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


