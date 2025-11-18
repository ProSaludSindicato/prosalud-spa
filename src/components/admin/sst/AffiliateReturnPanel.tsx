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
import { RotateCcw, ChevronDown, ChevronUp, AlertTriangle, CreditCard, Signature, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SignatureCaptureDrawer } from '@/components/admin/sst/SignatureCaptureDrawer';
import type {
  SstAffiliate,
  SstReturnDraft,
  SstDeliveryItemSelection,
  SstDeliveryRecord,
  SstReturnRecord,
  SstReturnReason,
  SstInventoryItem,
  SstInventoryVariant,
} from '@/types/adminSst';
import { cn } from '@/lib/utils';
import { normalizeSstColorKey, resolveSstColorInfo } from './color-utils';

interface AffiliateReturnPanelProps {
  affiliate: SstAffiliate;
  inventory: SstInventoryItem[];
  deliveryHistory: SstDeliveryRecord[];
  returnHistory: SstReturnRecord[];
  onConfirmReturn?: (draft: SstReturnDraft) => void;
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

const RETURN_REASON_LABELS: Record<SstReturnReason, string> = {
  retirement: 'Retiro',
  replacement: 'Recambio',
  other: 'Otro',
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

// Helper function to create a unique key for an item with variant
const getItemKey = (itemId: string, variant?: SstInventoryVariant): string => {
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

export function AffiliateReturnPanel({
  affiliate,
  inventory,
  deliveryHistory,
  returnHistory,
  onConfirmReturn,
  confirmedRecordId,
  highlightedRecordId,
  historyScrollRef,
}: AffiliateReturnPanelProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedItems, setSelectedItems] = useState<SelectedItemsMap>({});
  const [notes, setNotes] = useState('');
  const [carnetSelected, setCarnetSelected] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSignatureDrawerOpen, setIsSignatureDrawerOpen] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [returnReason, setReturnReason] = useState<SstReturnReason>('replacement');
  const [generalDotationSize, setGeneralDotationSize] = useState<string | null>(null);
  const [generalDotationQuantity, setGeneralDotationQuantity] = useState<number | ''>('');

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

  // Calculate delivered and returned quantities (excluding EPP items)
  const deliveredQuantities = useMemo(
    () => calculateDeliveredQuantities(deliveryHistory, inventory),
    [deliveryHistory, inventory],
  );

  const returnedQuantities = useMemo(
    () => calculateReturnedQuantities(returnHistory, inventory),
    [returnHistory, inventory],
  );

  // Calculate available quantities (delivered - returned)
  const availableQuantities = useMemo(() => {
    const available = new Map<string, number>();
    deliveredQuantities.forEach((delivered, key) => {
      const returned = returnedQuantities.get(key) ?? 0;
      const availableQty = delivered - returned;
      if (availableQty > 0) {
        available.set(key, availableQty);
      }
    });
    return available;
  }, [deliveredQuantities, returnedQuantities]);

  useEffect(() => {
    resetForm();
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

  const asReturnItems = (): SstDeliveryItemSelection[] => {
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
    setNotes('');
    setSignatureDataUrl(null);
    setFormError(null);
    setReturnReason('replacement');
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

  // Get validation warnings for selected items
  const getValidationWarnings = (): Array<{ itemKey: string; message: string }> => {
    const warnings: Array<{ itemKey: string; message: string }> = [];
    
    Object.entries(selectedItems).forEach(([itemId, state]) => {
      const item = expandedInventoryMap.get(itemId);
      if (!item) return;
      
      // Skip EPP items from validation
      if (item.category === 'EPP') return;
      
      const variant =
        item.variants && item.variants.length > 0 ? item.variants[state.variantIndex ?? 0] : undefined;
      const quantity = typeof state.quantity === 'number' ? state.quantity : 0;
      
      if (quantity <= 0) return;
      
      const itemKey = getItemKey(item.baseId ?? itemId, variant);
      const available = availableQuantities.get(itemKey) ?? 0;
      const delivered = deliveredQuantities.get(itemKey) ?? 0;
      const returned = returnedQuantities.get(itemKey) ?? 0;
      
      // Build product description for the warning message
      const productParts: string[] = [item.name];
      if (item.gender) {
        productParts.push(item.gender);
      }
      if (variant?.color) {
        const colorInfo = resolveSstColorInfo(variant.color);
        productParts.push(colorInfo?.label ?? variant.color);
      }
      if (variant?.size) {
        productParts.push(`Talla ${variant.size}`);
      }
      const productDescription = productParts.join(' - ');
      
      if (delivered === 0) {
        warnings.push({
          itemKey,
          message: `Este elemento no tiene entregas registradas en el historial. Puede ser una devolución de elementos entregados antes de la implementación del sistema. (${productDescription})`,
        });
      } else if (quantity > available) {
        warnings.push({
          itemKey,
          message: `Se está devolviendo ${quantity} unidad(es), pero solo hay ${available} disponible(s) según el historial (${delivered} entregado(s) - ${returned} devuelto(s) previamente). (${productDescription})`,
        });
      }
    });
    
    // Note: Carnet is not validated against delivery history as it's not in inventory
    // Note: EPP items are excluded from validation as they are not returnable
    
    return warnings;
  };

  const handleRegisterReturn = async () => {
    if (selectedCount === 0) {
      setFormError('Selecciona al menos un elemento para devolver.');
      toast({
        title: 'Selecciona al menos un elemento',
        description: 'Debe seleccionar los elementos a devolver antes de registrar la devolución.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    const hasInvalidQuantities = Object.values(selectedItems).some((item) => {
      if (item?.quantity === '' || item?.quantity === undefined) return true;
      return item.quantity <= 0;
    });
    if (hasInvalidQuantities) {
      setFormError('Revisa las cantidades. Cada elemento seleccionado debe tener una cantidad mayor a cero.');
      toast({
        title: 'Cantidad inválida',
        description: 'Ajusta las cantidades de los elementos seleccionados antes de registrar la devolución.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    if (!signatureDataUrl) {
      setIsSignatureDrawerOpen(true);
      return;
    }

    setFormError(null);
    const cleanedNotes = notes.trim();
    const responsible = user?.name || user?.email || 'Usuario del sistema';

    const draft: SstReturnDraft = {
      affiliateId: affiliate.id,
      affiliateDocumentType: affiliate.documentType,
      affiliateDocumentNumber: affiliate.documentNumber,
      receivedBy: responsible,
      receivedByName: responsible,
      items: asReturnItems(),
      signatureData: signatureDataUrl,
      signedDocumentType: affiliate.documentType,
      signedDocumentNumber: affiliate.documentNumber,
      reason: returnReason,
      notes: cleanedNotes ? cleanedNotes : undefined,
    };

    onConfirmReturn?.(draft);
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

  const validationWarnings = useMemo(() => getValidationWarnings(), [selectedItems, expandedInventoryMap, availableQuantities, deliveredQuantities, returnedQuantities]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card className="border shadow-sm min-w-0">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Elementos a devolver</CardTitle>
              <CardDescription>
                Selecciona los elementos de EPP y dotación que el afiliado está devolviendo.
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
          
          {validationWarnings.length > 0 && (
            <Alert variant="default" className="border-yellow-300 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-700" />
              <AlertTitle className="text-yellow-900">Advertencias de validación</AlertTitle>
              <AlertDescription className="text-yellow-800">
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  {validationWarnings.map((warning, idx) => (
                    <li key={idx} className="text-sm">{warning.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
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
            Object.entries(inventoryByCategory)
              .filter(([category]) => category !== 'EPP') // Excluir EPP de devoluciones
              .map(([category, items]) => {
              const showCarnet = category === 'Dotación';
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
                        id={`carnet-return-${category}`}
                        checked={carnetSelected}
                        onCheckedChange={(checked) => setCarnetSelected(Boolean(checked))}
                        className="h-5 w-5 border-2 border-primary-prosalud/50 data-[state=checked]:bg-primary-prosalud data-[state=checked]:border-primary-prosalud"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`carnet-return-${category}`}
                          className="text-sm font-semibold text-slate-800 cursor-pointer flex items-center gap-2"
                        >
                          Carnet
                          <CreditCard className="h-4 w-4 text-primary-prosalud" />
                        </Label>
                        <p className="text-xs text-slate-600 ml-1">
                          Marca esta opción para indicar que la persona devolvió el carnet.
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
                        <TableHead className="w-32">Disponible</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const isSelected = Boolean(selectedItems[item.id]);
                        const itemState = selectedItems[item.id];
                        const hasVariants = item.variants && item.variants.length > 0;
                        const variant =
                          hasVariants && itemState?.variantIndex !== undefined
                            ? item.variants[itemState.variantIndex]
                            : undefined;
                        const itemKey = getItemKey(item.baseId ?? item.id, variant);
                        const available = availableQuantities.get(itemKey) ?? 0;
                        const delivered = deliveredQuantities.get(itemKey) ?? 0;

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
                            <TableCell>
                              {delivered > 0 ? (
                                <span className={cn(
                                  "text-sm font-medium",
                                  available > 0 ? "text-green-700" : "text-slate-500"
                                )}>
                                  {available} / {delivered}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">Sin historial</span>
                              )}
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
              <RotateCcw className="h-5 w-5 text-primary-prosalud" />
              Resumen de devolución
            </CardTitle>
            <CardDescription>
              Completa la información de devolución y registra los elementos devueltos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Motivo de devolución</Label>
                <Select
                  value={returnReason}
                  onValueChange={(value) => setReturnReason(value as SstReturnReason)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retirement">Retiro</SelectItem>
                    <SelectItem value="replacement">Recambio</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="notes">Observaciones</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Anota observaciones sobre la devolución."
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
                <p>El afiliado firmará la constancia al finalizar el registro de devolución.</p>
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
              onClick={handleRegisterReturn}
            >
              <RotateCcw className="h-4 w-4" />
              Registrar devolución
            </Button>
          </CardContent>
        </Card>

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

        <Card className="border shadow-sm w-full overflow-hidden" ref={historyScrollRef}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <RotateCcw className="h-5 w-5 text-primary-prosalud" />
              Historial de devoluciones
            </CardTitle>
            <CardDescription>
              Devoluciones registradas anteriormente para este afiliado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {returnHistory.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Aún no hay devoluciones registradas en el sistema para este afiliado.
              </div>
            ) : (
              <div className="space-y-4">
                {returnHistory.map((record) => {
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
                          {new Date(record.returnedAt).toLocaleString()}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {record.reason && (
                            <Badge variant="secondary">
                              {RETURN_REASON_LABELS[record.reason] ?? record.reason}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-500">
                        Recibido por: <span className="font-medium">{record.receivedBy}</span>
                      </p>
                      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between bg-slate-50 px-4 py-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Detalle de artículos devueltos
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
                                    No se registraron artículos en esta devolución.
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

                      {hasMoreItems && (
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleHistoryExpansion(record.id)}
                          >
                            {isExpanded ? 'Ver menos detalles' : 'Ver más detalles'}
                          </Button>
                        </div>
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
                                    Constancia correspondiente a la devolución realizada el {new Date(record.returnedAt).toLocaleString()}.
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
    </div>
  );
}

