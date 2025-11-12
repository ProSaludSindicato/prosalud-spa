import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DataPagination from '@/components/ui/data-pagination';
import {
  Package, 
  AlertTriangle, 
  Activity,
  Shirt,
  Gift,
  Shield,
  ClipboardList,
  Clock,
  CheckCircle2,
  Truck,
  Archive,
  Building2,
  XCircle,
  Tag,
  Plus,
  Eye,
  Trash2,
  ArrowRightLeft,
  MapPin,
  Info,
  Search,
  History,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import QuickActionsDialog from './QuickActionsDialog';
import LowStockDialog, { type LowStockItem } from './LowStockDialog';
// import HospitalRequestsDialog from './HospitalRequestsDialog';
import { useInventory } from '@/context/InventoryContext';
import type {
  InventoryEntry,
  InventoryLocation,
  InventoryLocationDetail,
  InventoryProduct,
  InventoryStockMovement,
} from '@/types/inventory';
import { Link } from 'react-router-dom';
import { usePagination } from '@/hooks/usePagination';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const MOVEMENT_REASON_LABELS: Record<string, string> = {
  entry: 'Entrada de inventario',
  // inventory_entry: 'Entrada de inventario',
  // manual_adjustment: 'Ajuste manual',
  // inventory_exit: 'Salida de inventario',
  // exit: 'Salida de inventario',
  hospital_request: 'Solicitud hospitalaria',
  // transfer: 'Transferencia',
  // return: 'Devolución',
};

const DEFAULT_MOVEMENT_REASONS = Object.keys(MOVEMENT_REASON_LABELS);

type EntryItemDraft = {
  id: string;
  productId: string;
  variantId?: string;
  quantity: string;
};

const generateTempId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);

const InventoryOverview: React.FC = () => {
  const [expandedCategory, setExpandedCategory] = useState<string | undefined>();
  const [expandedProduct, setExpandedProduct] = useState<string | undefined>();
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [lowStockOpen, setLowStockOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'network' | 'entries'>('dashboard');
  const [createEntryOpen, setCreateEntryOpen] = useState(false);
  const [entrySupplier, setEntrySupplier] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [entryDocument, setEntryDocument] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [entryLocationId, setEntryLocationId] = useState<string | undefined>();
  const [entryItems, setEntryItems] = useState<EntryItemDraft[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<InventoryEntry | null>(null);
  const [entryDetailLoading, setEntryDetailLoading] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [locationDetailOpen, setLocationDetailOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [locationDetail, setLocationDetail] = useState<InventoryLocationDetail | null>(null);
  const [locationDetailLoading, setLocationDetailLoading] = useState(false);
  const [locationDetailError, setLocationDetailError] = useState<string | null>(null);
  const [locationStocksFilter, setLocationStocksFilter] = useState('');
  const [locationStocksSort, setLocationStocksSort] = useState<'stock-desc' | 'reserved-desc'>('stock-desc');
  const [locationStocksFilterMode, setLocationStocksFilterMode] = useState<'all' | 'inStock' | 'reserved'>('all');
  const [locationTab, setLocationTab] = useState<'stocks' | 'movements'>('stocks');
  const [locationMovements, setLocationMovements] = useState<InventoryStockMovement[]>([]);
  const [allLocationMovements, setAllLocationMovements] = useState<InventoryStockMovement[]>([]);
  const [locationMovementsLoading, setLocationMovementsLoading] = useState(false);
  const [locationMovementsError, setLocationMovementsError] = useState<string | null>(null);
  const [locationMovementsPage, setLocationMovementsPage] = useState(1);
  const [locationMovementsPageSize, setLocationMovementsPageSize] = useState(8);
  const [locationMovementsTotalPages, setLocationMovementsTotalPages] = useState(1);
  const [locationMovementsTotalItems, setLocationMovementsTotalItems] = useState(0);
  const [movementReasonFilter, setMovementReasonFilter] = useState<string>('all');

  const { toast } = useToast();

  const {
    categories,
    products,
    entries,
    entriesLoading,
    entriesError,
    colorOptions,
    dashboardData,
    dashboardLoading,
    dashboardError,
    locations,
    locationsLoading,
    locationsError,
    primaryLocation,
    addEntry,
    getEntryById,
    getLocationDetail,
    getStockMovements,
  } = useInventory();

  useEffect(() => {
    if (locations.length > 0 && entryLocationId && !locations.some((location) => location.id === entryLocationId)) {
      setEntryLocationId(primaryLocation?.id);
      return;
    }
    if (!entryLocationId && primaryLocation?.id) {
      setEntryLocationId(primaryLocation.id);
    }
  }, [entryLocationId, locations, primaryLocation]);

  const suppliers = useMemo(
    () => [
      { id: 'supplier-rionegro', name: 'Proveedor Rionegro' },
      { id: 'supplier-aldemar', name: 'Aldemar' },
    ],
    [],
  );

  const {
    currentPage: entriesPage,
    itemsPerPage: entriesItemsPerPage,
    totalPages: entriesTotalPages,
    totalItems: entriesTotalItems,
    paginatedData: entriesPaginated,
    goToPage: goToEntriesPage,
    setItemsPerPage: setEntriesItemsPerPage,
  } = usePagination({ data: entries, initialItemsPerPage: 8 });

  const productById = useMemo(() => {
    const map = new Map<string, InventoryProduct>();
    products.forEach((product) => map.set(product.id, product));
    return map;
  }, [products]);

  const resolveLocationTypeLabel = (location?: InventoryLocation | null) => {
    if (!location) return 'Sin clasificar';
    if (location.isPrimary) return 'Principal';
    if (location.type) {
      switch (location.type) {
        case 'hospital':
          return 'Hospital';
        case 'satellite':
          return 'Satélite';
        case 'warehouse':
          return 'Bodega';
        default:
          return location.type.charAt(0).toUpperCase() + location.type.slice(1);
      }
    }
    return 'Secundaria';
  };

  const resolveLocationBadgeClass = (location?: InventoryLocation | null) => {
    if (location?.isPrimary) {
      return 'bg-primary-prosalud/10 text-primary-prosalud border border-primary-prosalud/20';
    }
    switch (location?.type) {
      case 'hospital':
        return 'bg-sky-100 text-sky-800 border border-sky-200';
      case 'satellite':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const locationOptions = useMemo(
    () =>
      locations.map((location) => ({
        id: location.id,
        name: location.name,
        label: location.name,
        isPrimary: Boolean(location.isPrimary),
        typeLabel: resolveLocationTypeLabel(location),
        badgeClass: resolveLocationBadgeClass(location),
      })),
    [locations],
  );

  const formatGender = (gender?: string | null) => {
    if (!gender) return undefined;
    const lower = gender.toString();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const productSelectOptions = useMemo<SearchableSelectOption[]>(
    () =>
      products.map((p) => ({
        value: p.id,
        label: `${p.name}${formatGender(p.gender) ? ` (${formatGender(p.gender)})` : ''}`,
        searchText: `${p.name} ${formatGender(p.gender) ?? ''}`,
      })),
    [products],
  );

  const resetEntryForm = () => {
    setEntrySupplier('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setEntryDocument('');
    setEntryNotes('');
    setEntryLocationId(primaryLocation?.id);
    setEntryItems([]);
  };

  const handleAddEntryItem = () => {
    if (!products.length) {
      toast({
        title: 'No hay productos disponibles',
        description: 'Registra productos antes de crear entradas.',
        variant: 'destructive',
      });
      return;
    }
    const defaultProduct = products[0];
    const defaultVariant = defaultProduct.variants[0];
    setEntryItems((prev) => [
      ...prev,
      {
        id: generateTempId(),
        productId: defaultProduct.id,
        variantId: defaultVariant?.id,
        quantity: '1',
      },
    ]);
  };

  const handleEntryItemProductChange = (itemId: string, productId: string) => {
    const product = products.find((prod) => prod.id === productId);
    const defaultVariant = product?.variants[0];
    setEntryItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              productId,
              variantId: defaultVariant?.id,
            }
          : item,
      ),
    );
  };

  const handleEntryItemVariantChange = (itemId: string, variantId?: string) => {
    setEntryItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, variantId } : item)),
    );
  };

  const handleEntryItemQuantity = (itemId: string, quantity: string) => {
    if (/^\d*$/.test(quantity)) {
      setEntryItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
      );
    }
  };

  const handleRemoveEntryItem = (itemId: string) => {
    setEntryItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSaveEntry = async () => {
    if (!entrySupplier || !entryDate || !entryItems.length) {
      toast({
        title: 'Información incompleta',
        description: 'Selecciona un proveedor, define la fecha y agrega al menos un producto.',
        variant: 'destructive',
      });
      return;
    }

    setSavingEntry(true);
    try {
      const supplier = suppliers.find((option) => option.id === entrySupplier);
      for (const item of entryItems) {
        const quantityValue = Number(item.quantity || '0');
        if (Number.isNaN(quantityValue) || quantityValue <= 0) {
          toast({
            title: 'Cantidad inválida',
            description: 'Cada producto debe tener una cantidad mayor a 0.',
            variant: 'destructive',
          });
          setSavingEntry(false);
          return;
        }
      }

      const payload = {
        supplierId: entrySupplier,
        supplierName: supplier?.name,
        receivedAt: new Date(entryDate).toISOString(),
        locationId: entryLocationId,
        documentNumber: entryDocument || undefined,
        notes: entryNotes || undefined,
        items: entryItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: Number(item.quantity || '0'),
        })),
      };

      await addEntry(payload);

      const location = entryLocationId
        ? locations.find((loc) => loc.id === entryLocationId) ?? null
        : primaryLocation;

      toast({
        title: 'Entrada registrada',
        description: location
          ? `El stock de ${location.name} se actualizó correctamente.`
          : 'La entrada se registró correctamente y el stock ha sido actualizado.',
      });

      resetEntryForm();
      setCreateEntryOpen(false);
    } catch (error) {
      const message = isAxiosError(error)
        ? error.response?.data?.message ?? error.message
        : 'Intenta nuevamente.';
      toast({
        title: 'Error al registrar la entrada',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSavingEntry(false);
    }
  };

  const handleViewEntry = async (entry: InventoryEntry) => {
    setSelectedEntry(entry);
    setEntryDetailLoading(true);
    try {
      const detailedEntry = await getEntryById(entry.id);
      setSelectedEntry(detailedEntry);
    } catch (error) {
      const message = isAxiosError(error)
        ? error.response?.data?.message ?? 'No fue posible obtener el detalle.'
        : 'No fue posible obtener el detalle.';
      toast({
        title: 'Error al cargar detalle',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setEntryDetailLoading(false);
    }
  };

  const colorLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    colorOptions.forEach((color) => map.set(color.id, color.label));
    return map;
  }, [colorOptions]);

  const getVariantStatus = (stock: number, minStock: number): 'critical' | 'low' | 'ok' => {
    if (stock <= minStock) return 'critical';
    if (stock <= minStock * 1.25) return 'low';
    return 'ok';
  };

  const resolveCategoryIcon = (icon?: string) => {
    switch (icon) {
      case 'Shirt':
        return Shirt;
      case 'Shield':
        return Shield;
      case 'Gift':
        return Gift;
      case 'Activity':
        return Activity;
      case 'Tag':
        return Tag;
      default:
        return Package;
    }
  };

  // Use dashboard data from API if available, otherwise fall back to client-side calculation
  const categoryStats = useMemo(() => {
    if (dashboardData?.categories) {
      return dashboardData.categories.map((category) => {
        const IconComponent = resolveCategoryIcon(category.icon);
        return {
          id: category.id,
          name: category.name,
          icon: IconComponent,
          total: category.total_stock,
          available: category.available_stock,
          reserved: category.reserved_stock,
          variants: category.low_stock_items.map((item) => ({
            id: item.variant_id,
            productId: item.product_id,
            productName: item.product_name,
            size: undefined,
            colorLabel: undefined,
            stock: item.stock,
            minStock: item.min_stock,
            maxStock: item.stock,
            status: getVariantStatus(item.stock, item.min_stock),
          })),
        };
      });
    }

    return categories.map((category) => {
      const IconComponent = resolveCategoryIcon(category.icon);
      const categoryProducts = products.filter((product) => {
        const id = product.categoryId ?? product.category?.id;
        return id === category.id;
      });

      const variants = categoryProducts.flatMap((product) =>
        product.variants.map((variant) => ({
          id: variant.id ?? `${product.id}-${variant.size ?? 'std'}-${variant.colorId ?? 'color'}`,
          productId: product.id,
          productName: product.name,
          size: variant.size,
          colorLabel: variant.colorId ? colorLabelMap.get(variant.colorId) : undefined,
          stock: variant.stock ?? 0,
          minStock: variant.minStock ?? 0,
          maxStock: variant.maxStock ?? 0,
          status: getVariantStatus(variant.stock ?? 0, variant.minStock ?? 0),
        })),
      );

      const totalStock = variants.reduce((acc, variant) => acc + variant.stock, 0);
      const totalCapacity = variants.reduce((acc, variant) => acc + (variant.maxStock ?? variant.stock), 0);
      const reserved = Math.max(totalCapacity - totalStock, 0);

      return {
        id: category.id,
        name: category.name,
        icon: IconComponent,
        total: totalCapacity,
        available: totalStock,
        reserved,
        variants,
      };
    });
  }, [dashboardData, categories, products, colorLabelMap]);

  const lowStockItems = useMemo<LowStockItem[]>(() => {
    if (dashboardData?.low_stock_products) {
      return dashboardData.low_stock_products.flatMap((product) => {
        const matchedProduct = products.find((p) => p.id === product.id);
        const baseName = matchedProduct?.gender ? `${product.name} (${matchedProduct.gender})` : product.name;

        return product.variants.map((variant) => ({
          id: variant.id,
          name: `${baseName} - ${variant.label}`,
          current: variant.stock,
          min: variant.min_stock,
          category: product.category,
          status: getVariantStatus(variant.stock, variant.min_stock),
        }));
      });
    }

    return categoryStats.flatMap((category) =>
      category.variants
        .filter((variant) => variant.status !== 'ok')
        .map((variant) => ({
          id: variant.id,
          name: `${(() => {
            const matchedProduct = products.find((p) => p.id === variant.productId);
            const baseName = matchedProduct ? `${matchedProduct.name}${matchedProduct.gender ? ` (${matchedProduct.gender})` : ''}` : variant.productName;
            return baseName;
          })()}${variant.size ? ` - Talla ${variant.size}` : ''}${
            variant.colorLabel ? ` - ${variant.colorLabel}` : ''
          }`,
          current: variant.stock,
          min: variant.minStock,
          category: category.name,
          status: variant.status,
        })),
    );
  }, [dashboardData, categoryStats, products]);

  const categoryInventory = useMemo(() => {
    return categories.map((category) => {
      const IconComponent = resolveCategoryIcon(category.icon);
      const categoryProducts = products.filter((product) => {
        const id = product.categoryId ?? product.category?.id;
        return id === category.id;
      });

      return {
        id: category.id,
        name: category.name,
        icon: IconComponent,
        products: categoryProducts.map((product) => ({
          id: product.id,
          name: product.name,
          gender: product.gender,
          description: product.description,
          variants: product.variants.map((variant) => {
            const resolvedColor =
              variant.color ?? (variant.colorId ? colorOptions.find((option) => option.id === variant.colorId) : undefined);
            return {
              id: variant.id,
              label:
                variant.label ??
                (([
                  variant.size,
                  resolvedColor?.label ?? variant.colorId,
                ]
                  .filter(Boolean)
                  .join(' · ')) || variant.sku),
              size: variant.size,
              color: resolvedColor,
              stock: variant.stock,
              minStock: variant.minStock,
              maxStock: variant.maxStock,
              sku: variant.sku,
              stocks: variant.stocks,
            };
          }),
        })),
      };
    });
  }, [categories, products, colorOptions]);

  const locationStockSummary = useMemo(() => {
    const aggregatedByVariant = new Map<
      string,
      {
        stock: number;
        reserved: number;
        variantCount: number;
        productIds: Set<string>;
      }
    >();

    products.forEach((product) => {
      product.variants.forEach((variant) => {
        const stocks = Array.isArray(variant.stocks) ? variant.stocks : [];
        if (!stocks.length) {
          return;
        }

        stocks.forEach((stockEntry) => {
          const key = stockEntry.locationId ?? stockEntry.location?.id;
          if (!key) return;

          const existing = aggregatedByVariant.get(key);
          if (!existing) {
            aggregatedByVariant.set(key, {
              stock: stockEntry.stock ?? 0,
              reserved: stockEntry.reserved ?? 0,
              variantCount: 1,
              productIds: new Set([product.id]),
            });
          } else {
            existing.stock += stockEntry.stock ?? 0;
            existing.reserved += stockEntry.reserved ?? 0;
            existing.variantCount += 1;
            existing.productIds.add(product.id);
          }
        });
      });
    });

    const summaries = locations.map((location) => {
      const aggregated = aggregatedByVariant.get(location.id);
      const stock = location.totalStock ?? aggregated?.stock ?? 0;
      const reserved = location.totalReserved ?? aggregated?.reserved ?? 0;
      const isPrimaryLocation = Boolean(location.isPrimary);
      const available =
        location.totalStock !== undefined
          ? isPrimaryLocation
            ? Math.max(location.totalStock - reserved, 0)
            : location.totalStock
          : isPrimaryLocation
            ? Math.max((aggregated?.stock ?? 0) - reserved, 0)
            : aggregated?.stock ?? 0;

      return {
        id: location.id,
        location,
        stock,
        reserved,
        available,
        incoming: isPrimaryLocation ? 0 : reserved,
        variantCount: location.totalVariants ?? aggregated?.variantCount ?? 0,
        productCount: location.totalProducts ?? aggregated?.productIds.size ?? 0,
      };
    });

    aggregatedByVariant.forEach((aggregated, id) => {
      if (!summaries.some((summary) => summary.id === id)) {
        const fallbackLocation = locations.find((location) => location.id === id) ?? null;
        const reserved = aggregated?.reserved ?? 0;
        const stock = aggregated?.stock ?? 0;
        const isPrimaryLocation = Boolean(fallbackLocation?.isPrimary);
        summaries.push({
          id,
          location: fallbackLocation,
          stock,
          reserved,
          available: isPrimaryLocation ? Math.max(stock - reserved, 0) : stock,
          incoming: isPrimaryLocation ? 0 : reserved,
          variantCount: aggregated?.variantCount ?? 0,
          productCount: aggregated?.productIds.size ?? 0,
        });
      }
    });

    return summaries.sort((a, b) => {
      if (a.location?.isPrimary && !b.location?.isPrimary) return -1;
      if (!a.location?.isPrimary && b.location?.isPrimary) return 1;
      return (a.location?.name ?? '').localeCompare(b.location?.name ?? '');
    });
  }, [locations, products]);

  const totalNetworkStock = useMemo(
    () => locationStockSummary.reduce((acc, entry) => acc + entry.stock, 0),
    [locationStockSummary],
  );

  const selectedLocationSummary = useMemo(
    () => (selectedLocationId ? locationStockSummary.find((summary) => summary.id === selectedLocationId) ?? null : null),
    [locationStockSummary, selectedLocationId],
  );

  const filteredLocationStocks = useMemo(() => {
    if (!locationDetail?.stocks) return [];
    const term = locationStocksFilter.trim().toLowerCase();
    const filtered = locationDetail.stocks.filter((stock) => {
      const matchesSearch = term
        ? [
            stock.productName,
            stock.variantLabel,
            stock.size,
            stock.colorLabel,
            stock.variantSku,
            stock.productCategory,
            stock.productSubcategory,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(term)
        : true;

      const matchesMode =
        locationStocksFilterMode === 'all'
          ? true
          : locationStocksFilterMode === 'inStock'
            ? (stock.stock ?? 0) > 0
            : (stock.reserved ?? 0) > 0;

      return matchesSearch && matchesMode;
    });

    return filtered.sort((a, b) => {
      switch (locationStocksSort) {
        case 'reserved-desc': {
          return (b.reserved ?? 0) - (a.reserved ?? 0);
        }
        case 'stock-desc':
        default: {
          return (b.stock ?? 0) - (a.stock ?? 0);
        }
      }
    });
  }, [locationDetail, locationStocksFilter, locationStocksFilterMode, locationStocksSort]);

  const locationStocksTotals = useMemo(() => {
    if (locationDetail?.stocks?.length) {
      return locationDetail.stocks.reduce(
        (acc, stock) => {
          acc.stock += stock.stock ?? 0;
          acc.reserved += stock.reserved ?? 0;
          return acc;
        },
        { stock: 0, reserved: 0 },
      );
    }
    return {
      stock: locationDetail?.totalStock ?? selectedLocationSummary?.stock ?? 0,
      reserved: locationDetail?.totalReserved ?? selectedLocationSummary?.reserved ?? 0,
    };
  }, [locationDetail, selectedLocationSummary]);

  const movementReasonOptions = useMemo(() => {
    const reasons = new Set<string>(DEFAULT_MOVEMENT_REASONS);
    allLocationMovements.forEach((movement) => {
      if (movement.reason) reasons.add(movement.reason);
    });
    return ['all', ...Array.from(reasons).sort()];
  }, [allLocationMovements]);

  const resolveMovementReasonLabel = (reason: string) =>
    MOVEMENT_REASON_LABELS[reason] ?? reason.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

  const formatMovementVariantLabel = (movement: InventoryStockMovement) => {
    if (movement.variant?.label) {
      return movement.variant.label;
    }
    const parts: string[] = [];
    if (movement.variant?.size) {
      parts.push(`Talla ${movement.variant.size}`);
    }
    const colorLabel =
      movement.variant?.color?.label ??
      (typeof movement.variant?.colorId === 'string' ? movement.variant.colorId : undefined);
    if (colorLabel) {
      parts.push(colorLabel);
    }
    if (parts.length === 0) {
      return 'Estándar';
    }
    return parts.join(' · ');
  };

  const activeLocation = useMemo(() => {
    if (locationDetail) return locationDetail;
    if (selectedLocationSummary?.location) return selectedLocationSummary.location;
    if (selectedLocationId) {
      return locations.find((location) => location.id === selectedLocationId) ?? null;
    }
    return null;
  }, [locationDetail, locations, selectedLocationId, selectedLocationSummary]);

  const primaryLocationSummary = useMemo(
    () => locationStockSummary.find((summary) => summary.location?.isPrimary) ?? locationStockSummary[0] ?? null,
    [locationStockSummary],
  );

  const highestStockLocation = useMemo(() => {
    if (!locationStockSummary.length) return null;
    return locationStockSummary.reduce((prev, current) => (current.stock > prev.stock ? current : prev));
  }, [locationStockSummary]);

  const locationsWithoutStock = useMemo(
    () => locationStockSummary.filter((summary) => summary.stock === 0).length,
    [locationStockSummary],
  );

  const locationsWithHighReservations = useMemo(
    () =>
      locationStockSummary.filter((summary) => {
        if (!summary.location?.isPrimary) {
          return false;
        }
        const denominator = summary.stock + summary.reserved;
        if (denominator <= 0) {
          return false;
        }
        return summary.reserved / denominator >= 0.35;
      }).length,
    [locationStockSummary],
  );

  const formatPercentage = (value: number, total: number) => {
    if (total <= 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  const resolveReservedCopy = useCallback(
    (location?: InventoryLocation | null) => {
      if (location?.isPrimary) {
        return {
          label: 'Reservadas',
          hint: 'Unidades comprometidas para pedidos en preparación o envío.',
        };
      }

      if (location?.type === 'hospital' || location?.type === 'satellite') {
        return {
          label: 'Pendientes por recibir',
          hint: 'Unidades en tránsito desde la bodega principal que aún no ingresan al stock.',
        };
      }

      return {
        label: 'Reservadas',
        hint: 'Unidades comprometidas sin movimiento finalizado.',
      };
    },
    [],
  );

  const reservedCopy = useMemo(() => resolveReservedCopy(activeLocation), [activeLocation, resolveReservedCopy]);

  const networkHighlights = useMemo(() => {
    const highlights: Array<{
      title: string;
      tone: 'warning' | 'info' | 'success';
      description: string;
      icon: React.ReactNode;
    }> = [];

    if (primaryLocationSummary) {
      highlights.push({
        title: 'Bodega principal',
        tone: 'info',
        icon: <Building2 className="h-4 w-4 text-primary-prosalud" />,
        description: `${primaryLocationSummary.location?.name ?? 'Bodega principal'} concentra ${formatPercentage(
          primaryLocationSummary.stock,
          totalNetworkStock,
        )} del stock (${primaryLocationSummary.stock.toLocaleString('es-CO')} uds).`,
      });

      if (primaryLocationSummary.reserved > 0) {
        highlights.push({
          title: 'Reservas activas',
          tone: 'info',
          icon: <ClipboardList className="h-4 w-4 text-amber-600" />,
          description: `${primaryLocationSummary.reserved.toLocaleString(
            'es-CO',
          )} uds comprometidas para entregas desde la bodega principal.`,
        });
      }
    }

    if (highestStockLocation && highestStockLocation.id !== primaryLocationSummary?.id) {
      highlights.push({
        title: 'Mayor inventario secundario',
        tone: 'info',
        icon: <Package className="h-4 w-4 text-sky-600" />,
        description: `${highestStockLocation.location?.name ?? 'Ubicación secundaria'} tiene ${
          highestStockLocation.stock.toLocaleString('es-CO')
        } unidades disponibles (${formatPercentage(highestStockLocation.stock, totalNetworkStock)} del total).`,
      });
    }

    highlights.push({
      title: 'Reservas elevadas',
      tone: locationsWithHighReservations > 0 ? 'warning' : 'success',
      icon: (
        <AlertTriangle
          className={cn('h-4 w-4', locationsWithHighReservations > 0 ? 'text-amber-600' : 'text-emerald-600')}
        />
      ),
      description:
        locationsWithHighReservations > 0
          ? `${locationsWithHighReservations} ${
              locationsWithHighReservations === 1 ? 'ubicación' : 'ubicaciones'
            } de la bodega principal presentan reservas superiores al 35%. Revisa envíos pendientes o libera inventario.`
          : 'Las reservas de la bodega principal se mantienen en niveles saludables.',
    });

    const inboundLocations = locationStockSummary.filter(
      (summary) => !summary.location?.isPrimary && summary.reserved > 0,
    ).length;

    if (inboundLocations > 0) {
      highlights.push({
        title: 'Pedidos en tránsito',
        tone: 'info',
        icon: <Truck className="h-4 w-4 text-primary-prosalud" />,
        description: `${inboundLocations} ${
          inboundLocations === 1 ? 'sede' : 'sedes'
        } tienen unidades en camino desde la bodega principal.`,
      });
    }

    if (locationsWithoutStock > 0) {
      highlights.push({
        title: 'Ubicaciones sin stock',
        tone: 'warning',
        icon: <Info className="h-4 w-4 text-amber-600" />,
        description: `${locationsWithoutStock} ${
          locationsWithoutStock === 1 ? 'ubicación no tiene' : 'ubicaciones no tienen'
        } inventario disponible actualmente.`,
      });
    }

    return highlights.slice(0, 4);
  }, [
    highestStockLocation,
    locationsWithHighReservations,
    locationsWithoutStock,
    primaryLocationSummary,
    totalNetworkStock,
  ]);

  const handleOpenLocationDetail = (locationId: string) => {
    setSelectedLocationId(locationId);
    setLocationDetailOpen(true);
    setLocationTab('stocks');
    setLocationStocksFilter('');
    setMovementReasonFilter('all');
    setLocationMovementsPage(1);
  };

  const handleCloseLocationDetail = () => {
    setLocationDetailOpen(false);
    setSelectedLocationId(null);
    setLocationDetail(null);
    setLocationDetailError(null);
    setLocationDetailLoading(false);
    setAllLocationMovements([]);
    setLocationMovements([]);
    setLocationMovementsError(null);
    setLocationMovementsLoading(false);
    setLocationMovementsPage(1);
    setLocationMovementsTotalPages(1);
    setLocationMovementsTotalItems(0);
  };

  useEffect(() => {
    const fetchLocationDetail = async (locationId: string) => {
      setLocationDetailLoading(true);
      setLocationDetailError(null);
      try {
        const detail = await getLocationDetail(locationId);
        setLocationDetail(detail);
      } catch (error) {
        const message = isAxiosError(error)
          ? error.response?.data?.message ?? error.message
          : error instanceof Error
            ? error.message
            : 'No fue posible obtener el detalle de la bodega. Intenta nuevamente.';
        setLocationDetailError(message);
      } finally {
        setLocationDetailLoading(false);
      }
    };

    if (locationDetailOpen && selectedLocationId) {
      fetchLocationDetail(selectedLocationId);
    }
  }, [getLocationDetail, locationDetailOpen, selectedLocationId]);

  useEffect(() => {
    if (!locationDetailOpen) {
      return;
    }
    if (locationTab !== 'movements') {
      return;
    }
    if (!selectedLocationId) {
      return;
    }

    const fetchMovements = async () => {
      setLocationMovementsLoading(true);
      setLocationMovementsError(null);
      try {
        const commonParams = {
          page: 1,
          pageSize: 200,
          reason: movementReasonFilter === 'all' ? undefined : movementReasonFilter,
        } as const;

        const [outgoingResponse, incomingResponse] = await Promise.all([
          getStockMovements({
            ...commonParams,
            fromLocationId: selectedLocationId,
          }),
          getStockMovements({
            ...commonParams,
            toLocationId: selectedLocationId,
          }),
        ]);

        const combined = [
          ...outgoingResponse.data,
          ...incomingResponse.data,
        ];

        const deduplicated = Array.from(
          new Map(combined.map((movement) => [movement.id, movement])).values(),
        );

        const sorted = deduplicated.sort((a, b) => {
          const aTime = a.movedAt ? new Date(a.movedAt).getTime() : 0;
          const bTime = b.movedAt ? new Date(b.movedAt).getTime() : 0;
          return bTime - aTime;
        });

        setAllLocationMovements(sorted);
      } catch (error) {
        const message = isAxiosError(error)
          ? error.response?.data?.message ?? error.message
          : error instanceof Error
            ? error.message
            : 'No fue posible obtener los movimientos de inventario. Intenta nuevamente.';
        setLocationMovementsError(message);
        setAllLocationMovements([]);
        setLocationMovements([]);
        setLocationMovementsTotalItems(0);
        setLocationMovementsTotalPages(1);
      } finally {
        setLocationMovementsLoading(false);
      }
    };

    fetchMovements();
  }, [
    getStockMovements,
    locationDetailOpen,
    locationTab,
    movementReasonFilter,
    selectedLocationId,
  ]);

  useEffect(() => {
    if (!locationDetailOpen || locationTab !== 'movements') {
      return;
    }

    const totalItems = allLocationMovements.length;
    if (totalItems === 0) {
      setLocationMovements([]);
      setLocationMovementsTotalItems(0);
      setLocationMovementsTotalPages(1);
      if (locationMovementsPage !== 1) {
        setLocationMovementsPage(1);
      }
      return;
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / locationMovementsPageSize));
    if (locationMovementsPage > totalPages) {
      setLocationMovementsPage(totalPages);
      return;
    }

    const startIndex = (locationMovementsPage - 1) * locationMovementsPageSize;
    const pageItems = allLocationMovements.slice(
      startIndex,
      startIndex + locationMovementsPageSize,
    );

    setLocationMovements(pageItems);
    setLocationMovementsTotalItems(totalItems);
    setLocationMovementsTotalPages(totalPages);
  }, [
    allLocationMovements,
    locationDetailOpen,
    locationMovementsPage,
    locationMovementsPageSize,
    locationTab,
  ]);

  useEffect(() => {
    if (locationTab === 'movements') {
      setLocationMovementsPage(1);
    }
  }, [locationTab, movementReasonFilter, selectedLocationId]);

  const resolvedSelectedEntryLocation = useMemo(() => {
    if (!selectedEntry) return null;
    return (
      selectedEntry.location ??
      locations.find((location) => location.id === selectedEntry.locationId) ??
      (selectedEntry.locationId ? null : primaryLocation) ??
      null
    );
  }, [locations, primaryLocation, selectedEntry]);

  const requestsSummary = useMemo(() => dashboardData?.requests_summary ?? null, [dashboardData]);

  const requestSummaryConfig: Record<
    'pending' | 'approved' | 'preparing' | 'shipped' | 'delivered' | 'rejected',
    {
      label: string;
      description: string;
      icon: React.ComponentType<{ className?: string }>;
      badgeClass: string;
      bgClass: string;
    }
  > = {
    pending: {
      label: 'Pendientes',
      description: 'En espera de revisión',
      icon: Clock,
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
      bgClass: 'bg-amber-50 border-amber-100',
    },
    approved: {
      label: 'Aprobadas',
      description: 'Listas para preparación',
      icon: CheckCircle2,
      badgeClass: 'bg-green-100 text-green-800 border border-green-200',
      bgClass: 'bg-green-50 border-green-100',
    },
    preparing: {
      label: 'Preparando',
      description: 'Surtiendo inventario',
      icon: ClipboardList,
      badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200',
      bgClass: 'bg-blue-50 border-blue-100',
    },
    shipped: {
      label: 'Enviadas',
      description: 'En tránsito hacia el hospital',
      icon: Truck,
      badgeClass: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
      bgClass: 'bg-cyan-50 border-cyan-100',
    },
    delivered: {
      label: 'Entregadas',
      description: 'Recibidas por hospital',
      icon: Archive,
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      bgClass: 'bg-emerald-50 border-emerald-100',
    },
    rejected: {
      label: 'Rechazadas',
      description: 'Revisión requerida',
      icon: XCircle,
      badgeClass: 'bg-red-100 text-red-700 border border-red-200',
      bgClass: 'bg-red-50 border-red-100',
    },
  };

  const requestsSummaryEntries = useMemo(() => {
    if (!requestsSummary) return [];
    return (Object.keys(requestSummaryConfig) as Array<keyof typeof requestSummaryConfig>)
      .filter((status) => requestsSummary[status] !== undefined)
      .map((status) => ({
        status,
        value: requestsSummary[status] ?? 0,
        ...requestSummaryConfig[status],
      }));
  }, [requestsSummary]);

  const totalRequests = useMemo(
    () => requestsSummaryEntries.reduce((acc, entry) => acc + entry.value, 0),
    [requestsSummaryEntries],
  );

  const renderCategoryCard = (category: typeof categoryStats[number], index: number) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
      className="h-full"
    >
      <Card className="flex h-full min-h-[260px] flex-col border shadow-sm transition-all duration-300 hover:shadow-lg">
        <CardContent className="flex h-full flex-col p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="rounded-xl bg-primary-prosalud-light p-3">
                    <category.icon className="h-6 w-6 text-primary-prosalud" />
                  </div>
                  <Badge variant="outline" className="font-medium">
              {category.total} capacidad
                  </Badge>
                </div>
          <div className="flex flex-1 flex-col justify-between">
                <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 line-clamp-2" title={category.name}>
                {category.name}
              </h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Disponible</span>
                      <span className="font-medium text-primary-prosalud">{category.available}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Capacidad restante</span>
                      <span className="font-medium text-gray-600">{category.reserved}</span>
                </div>
                    </div>
                  </div>
                  <Progress 
              value={category.total > 0 ? (category.available / category.total) * 100 : 0}
              className="mt-4 h-2"
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative inline-grid grid-cols-3 items-center rounded-full bg-primary-prosalud/30 px-1 py-1 text-white shadow-md">
          <div
            className="absolute top-1 bottom-1 rounded-full bg-primary-prosalud shadow transition-all duration-300 ease-[cubic-bezier(0.47,1.64,0.41,0.8)]"
            style={{
              width: 'calc(33.33% - 0.5rem)',
              left:
                viewMode === 'dashboard'
                  ? '0.25rem'
                  : viewMode === 'network'
                    ? 'calc(33.33% + 0.25rem)'
                    : 'calc(66.66% + 0.25rem)',
            }}
          />
          <button
            type="button"
            onClick={() => setViewMode('dashboard')}
            className={cn(
              'relative z-10 rounded-full px-6 py-2 text-sm font-medium transition-colors',
              viewMode === 'dashboard' ? 'text-white' : 'text-white/70',
            )}
          >
            Resumen
          </button>
          <button
            type="button"
            onClick={() => setViewMode('network')}
            className={cn(
              'relative z-10 rounded-full px-6 py-2 text-sm font-medium transition-colors',
              viewMode === 'network' ? 'text-white' : 'text-white/70',
            )}
          >
            Distribución
          </button>
          <button
            type="button"
            onClick={() => setViewMode('entries')}
            className={cn(
              'relative z-10 rounded-full px-6 py-2 text-sm font-medium transition-colors',
              viewMode === 'entries' ? 'text-white' : 'text-white/70',
            )}
          >
            Entradas de Inventario
          </button>
        </div>
        {viewMode === 'entries' && (
          <Button className="bg-primary-prosalud text-white gap-2" onClick={() => { resetEntryForm(); setCreateEntryOpen(true); }}>
            <Plus className="h-4 w-4" /> Registrar entrada
          </Button>
        )}
      </div>

      {viewMode === 'dashboard' && (
        <div className="space-y-6">
          {dashboardLoading && (
            <Card className="border shadow-sm">
              <CardContent className="p-8 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-prosalud mb-4"></div>
                <p className="text-gray-600">Cargando datos del inventario...</p>
              </CardContent>
            </Card>
          )}

          {dashboardError && (
            <Card className="border border-red-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">Error al cargar el resumen</h3>
                    <p className="text-sm text-red-700">{dashboardError}</p>
                    <p className="text-xs text-gray-600 mt-2">Mostrando datos disponibles en caché local.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="relative">
            {categoryStats.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="py-10 text-center text-gray-500">
                  Aún no hay categorías creadas para mostrar en el resumen.
                </CardContent>
              </Card>
            ) : (
              <Carousel opts={{ align: 'start', containScroll: 'trimSnaps' }} className="relative w-full overflow-hidden px-2 sm:px-4">
                <CarouselContent className="pb-4 ml-0">
                  {categoryStats.map((category, index) => (
                    <CarouselItem key={category.name} className="basis-full px-2 md:basis-1/2 xl:basis-1/3 2xl:basis-1/4">
                      {renderCategoryCard(category, index)}
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="border border-gray-200 bg-white/90 text-gray-700 shadow transition-colors hover:bg-primary-prosalud hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-prosalud" />
                <CarouselNext className="border border-gray-200 bg-white/90 text-gray-700 shadow transition-colors hover:bg-primary-prosalud hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-prosalud" />
              </Carousel>
            )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="xl:col-span-2">
          <Card className="h-full border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-primary-prosalud">
                <Tag className="h-5 w-5" />
                <span>Inventario por Categoría</span>
              </CardTitle>
                  <CardDescription>Detalle de productos disponibles por categoría</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible value={expandedCategory} onValueChange={setExpandedCategory}>
                    {categoryInventory.map((category) => (
                  <AccordionItem key={category.id} value={category.id} className="border-b">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-primary-prosalud-light">
                          <category.icon className="h-4 w-4 text-primary-prosalud" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{category.name}</p>
                              <p className="text-sm text-gray-600">
                                {category.products.length}
                                {category.products.length === 1 ? ' producto' : ' productos'}
                              </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                          {category.products.length === 0 ? (
                            <div className="pl-10 text-sm text-gray-500">No hay productos registrados en esta categoría.</div>
                          ) : (
                            <div className="space-y-3 pl-6">
                              <Accordion type="single" collapsible value={expandedProduct} onValueChange={setExpandedProduct} className="space-y-3">
                                {category.products.map((product) => (
                                  <AccordionItem key={product.id} value={product.id} className="border border-gray-200 rounded-lg bg-white shadow-sm">
                                    <AccordionTrigger className="group flex items-center gap-3 px-4 py-3 hover:no-underline">
                                      <div className="flex flex-col text-left flex-1">
                                        <p className="text-base font-semibold text-gray-900 leading-tight">
                                          {product.name}
                                          {product.gender && <span className="font-bold"> ({product.gender})</span>}
                                        </p>
                                        {product.description && <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>}
                                      </div>
                                      <Badge className="bg-primary-prosalud/10 text-primary-prosalud whitespace-nowrap ml-auto">
                                        {product.variants.length} {product.variants.length === 1 ? 'variante' : 'variantes'}
                                      </Badge>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                        {product.variants.map((variant) => {
                                          const displayLabel =
                                            variant.label ||
                                            [variant.size, variant.color?.label ?? variant.color?.id ?? '']
                                              .filter(Boolean)
                                              .join(' · ') ||
                                            'Variante';
                                          const variantLocations = Array.isArray(variant.stocks) ? variant.stocks : [];
                                          const variantTotalStock = variantLocations.reduce(
                                            (acc, stockEntry) => acc + (stockEntry.stock ?? 0),
                                            0,
                                          );

                                          return (
                                            <div key={variant.id} className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                                              <div className="flex items-start justify-between gap-2">
                                                <div>
                                                  {variant.color ? (
                                                    <div className="mt-1 flex items-center gap-2 text-gray-900">
                                                      <span
                                                        className="h-3 w-3 rounded-full border border-gray-200"
                                                        style={{ backgroundColor: variant.color.hex ?? '#ffffff' }}
                                                      />
                                                      <p className="text-sm font-semibold text-gray-900 leading-tight">{displayLabel}</p>
                                                    </div>
                                                  ) : (
                                                    <p className="mt-1 text-sm font-semibold text-gray-900 leading-tight">{displayLabel}</p>
                                                  )}
                                                </div>
                                                <Badge
                                                  className={`text-xs ${
                                                    (variant.stock ?? 0) <= (variant.minStock ?? 0)
                                                      ? 'bg-red-100 text-red-700 border border-red-200'
                                                      : 'bg-green-100 text-green-700 border border-green-200'
                                                  }`}
                                                >
                                                  {variant.stock ?? 0} uds
                                                </Badge>
                                              </div>

                                              {variantLocations.length > 0 ? (
                                                <div className="space-y-2">
                                                  {variantLocations
                                                    .slice()
                                                    .sort((a, b) => {
                                                      if (a.location?.isPrimary && !b.location?.isPrimary) return -1;
                                                      if (!a.location?.isPrimary && b.location?.isPrimary) return 1;
                                                      return (a.location?.name ?? '').localeCompare(b.location?.name ?? '');
                                                    })
                                                    .map((stockEntry, index) => {
                                                      const locationRef =
                                                        stockEntry.location ??
                                                        locations.find((location) => location.id === stockEntry.locationId) ??
                                                        null;
                                                      const ratio =
                                                        variantTotalStock > 0
                                                          ? Math.min((stockEntry.stock / variantTotalStock) * 100, 100)
                                                          : 0;

                                                      return (
                                                        <div
                                                          key={stockEntry.locationId ?? `${variant.id}-stock-${index}`}
                                                          className="space-y-1 rounded-md border border-dashed border-gray-200 bg-white p-2"
                                                        >
                                                          <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                                                            <div className="flex items-center gap-2">
                                                              <Badge className={`text-[10px] ${resolveLocationBadgeClass(locationRef)}`}>
                                                                {resolveLocationTypeLabel(locationRef)}
                                                              </Badge>
                                                              <span className="font-medium text-gray-800">
                                                                {locationRef?.name ?? 'Ubicación sin nombre'}
                                                              </span>
                                                            </div>
                                                            <span className="font-semibold text-gray-900">
                                                              {stockEntry.stock ?? 0} uds
                                                            </span>
                                                          </div>
                                                          <Progress value={ratio} className="h-1 bg-gray-200" />
                                                        </div>
                                                      );
                                                    })}
                                                </div>
                                              ) : (
                                                <p className="text-xs text-gray-500">
                                                  Esta variante aún no tiene distribución registrada por bodegas.
                                                </p>
                                              )}
                                            </div>
                                          );
                                        })}
                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </div>
                          )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="xl:col-span-1 space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Stock Bajo</span>
              </CardTitle>
                  <CardDescription>Productos que requieren reposición</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                  {lowStockItems.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay alertas de stock por el momento.</p>
                  ) : (
                    <>
                      {lowStockItems.slice(0, 4).map((item, index) => (
                        <div key={index} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-600">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="text-xs">
                      {item.current}/{item.min}
                    </Badge>
                  </div>
                </div>
              ))}
                      {lowStockItems.length > 4 && (
                        <p className="text-xs text-gray-500">y {lowStockItems.length - 4} productos más con alertas.</p>
                      )}
                      <Button className="mt-4 w-full bg-red-600 text-white hover:bg-red-700" onClick={() => setLowStockOpen(true)}>
                Ver Todo el Stock Bajo
              </Button>
                    </>
                  )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-primary-prosalud">
                    <ClipboardList className="h-5 w-5" />
                    <span>Estado de Solicitudes</span>
                  </CardTitle>
                  <CardDescription>Seguimiento rápido de solicitudes de hospitales</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!requestsSummaryEntries.length ? (
                    <p className="text-sm text-gray-500">Aún no se han registrado solicitudes en el sistema.</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Solicitudes totales</p>
                          <p className="text-xs text-gray-600">Incluye todas las etapas del flujo operativo.</p>
                        </div>
                        <span className="text-2xl font-bold text-primary-prosalud">{totalRequests}</span>
                      </div>

                      <div className="space-y-3">
                        {requestsSummaryEntries.map(({ status, label, description, value, icon: Icon, badgeClass, bgClass }) => (
                          <div key={status} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${bgClass}`}>
                            <div className="flex items-center gap-3">
                              <span className="rounded-full bg-white p-2 shadow-sm">
                                <Icon className="h-4 w-4 text-primary-prosalud" />
                              </span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{label}</p>
                                <p className="text-xs text-gray-600">{description}</p>
                              </div>
                            </div>
                            <Badge className={`text-xs font-semibold ${badgeClass}`}>{value}</Badge>
                          </div>
                        ))}
                      </div>

                      <Button variant="outline" className="w-full border-primary-prosalud text-primary-prosalud hover:bg-primary-prosalud hover:text-white" asChild>
                        <Link to="/admin/inventario?tab=hospital-requests">Ir a solicitudes</Link>
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      )}

      {viewMode === 'network' && (
        <div className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-primary-prosalud">
                <MapPin className="h-5 w-5" />
                <span>Red de inventario</span>
              </CardTitle>
              <CardDescription>
                Revisa las ubicaciones activas y abre su detalle para conocer existencias y movimientos recientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {locationStockSummary.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                  Aún no hay inventario registrado para visualizar la red.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="overflow-x-auto pb-2">
                    <div className="flex min-w-full gap-4 py-4 px-4">
                      {locationStockSummary.map((summary) => {
                        const isPrimary = Boolean(summary.location?.isPrimary);
                        const participation = formatPercentage(summary.stock, totalNetworkStock);
                        const reservedBase = isPrimary
                          ? summary.stock + summary.reserved
                          : summary.stock + (summary.incoming ?? summary.reserved);
                        const reservedPercentage =
                          reservedBase > 0 ? Math.round((summary.reserved / reservedBase) * 100) : 0;
                        const reservedLabel = isPrimary ? 'Reservado' : 'Pendiente por recibir';
                        const availableLabel = isPrimary ? 'Disponible' : 'En inventario';
                        const availableValue = summary.available;
                        return (
                          <button
                            key={summary.id}
                            type="button"
                            onClick={() => handleOpenLocationDetail(summary.id)}
                            className={cn(
                              'flex min-w-[240px] flex-col gap-3 rounded-2xl border border-primary-prosalud/10 bg-white/95 p-4 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg',
                              isPrimary && 'ring-2 ring-primary-prosalud/40',
                              summary.stock === 0 && 'opacity-80',
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-900">
                                  {summary.location?.name ?? 'Ubicación'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {summary.productCount} {summary.productCount === 1 ? 'producto' : 'productos'} ·{' '}
                                  {summary.variantCount} {summary.variantCount === 1 ? 'variante' : 'variantes'}
                                </span>
                              </div>
                              <Badge className={`text-[10px] ${resolveLocationBadgeClass(summary.location)}`}>
                                {resolveLocationTypeLabel(summary.location)}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-primary-prosalud">
                                {summary.stock.toLocaleString('es-CO')} uds
                              </p>
                              <p className="text-xs text-gray-500">Participación: {participation}</p>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-gray-500">
                                <span>{reservedLabel}</span>
                                <span>
                                  {summary.reserved.toLocaleString('es-CO')} uds · {Math.min(reservedPercentage, 100)}%
                                </span>
                              </div>
                              <Progress value={Math.min(reservedPercentage, 100)} className="h-2 bg-gray-100" />
                              <div className="flex items-center justify-between text-[11px] text-gray-500">
                                <span>{availableLabel}</span>
                                <span>{availableValue.toLocaleString('es-CO')} uds</span>
                              </div>
                              {!isPrimary && summary.incoming ? (
                                <div className="text-[11px] text-gray-500">
                                  En tránsito: {summary.incoming.toLocaleString('es-CO')} uds
                                </div>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                    <Card className="border border-primary-prosalud/10 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-primary-prosalud">
                          <Tag className="h-5 w-5" />
                          Distribución por bodega
                        </CardTitle>
                        <CardDescription>Comparativo del inventario disponible por cada ubicación.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {locationStockSummary.map((summary) => {
                          const percent = totalNetworkStock > 0 ? Math.round((summary.stock / totalNetworkStock) * 100) : 0;
                          return (
                            <div key={summary.id} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full bg-primary-prosalud" />
                                  <span className="font-medium text-gray-900">{summary.location?.name ?? 'Bodega'}</span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {summary.stock.toLocaleString('es-CO')} uds · {percent}%
                                </span>
                              </div>
                              <div className="h-3 rounded-full bg-gray-100">
                                <div
                                  className="h-3 rounded-full bg-primary-prosalud transition-all"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>

                    <Card className="border shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-primary-prosalud">
                          <History className="h-5 w-5" />
                          Indicadores clave
                        </CardTitle>
                        <CardDescription>
                          Señales rápidas para priorizar traslados o ajustes en la red de inventario.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm text-gray-700">
                        {networkHighlights.map((highlight, index) => (
                          <div
                            key={index}
                            className={cn(
                              'flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3',
                              highlight.tone === 'warning' && 'border-amber-200 bg-amber-50/80',
                              highlight.tone === 'success' && 'border-emerald-200 bg-emerald-50/80',
                            )}
                          >
                            {highlight.icon}
                            <div>
                              <p className="font-medium text-gray-900">{highlight.title}</p>
                              <p className="text-xs text-gray-600">{highlight.description}</p>
                            </div>
                          </div>
                        ))}
                        {networkHighlights.length === 0 && (
                          <p className="text-xs text-gray-500">
                            Aún no se generan indicadores en base a la información disponible. Actualiza el inventario o registra movimientos para poblar esta sección.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'entries' && (
        <div className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary-prosalud">
                <Truck className="h-5 w-5" />
                <span>Entradas registradas</span>
              </CardTitle>
              <CardDescription>Visualiza las entradas de inventario y su impacto en el stock.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Bodega</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entriesLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-[180px] text-center text-gray-500">
                        Cargando entradas...
                      </TableCell>
                    </TableRow>
                  ) : entriesError ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-[180px] text-center text-red-600">
                        {entriesError}
                      </TableCell>
                    </TableRow>
                  ) : entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-[180px] text-center text-gray-500">
                        Aún no se han registrado entradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    entriesPaginated.map((entry) => {
                      const entryLocation =
                        entry.location ??
                        locations.find((location) => location.id === entry.locationId) ??
                        (entry.locationId ? undefined : primaryLocation) ??
                        null;

                      return (
                        <TableRow key={entry.id} className="hover:bg-gray-50">
                          <TableCell>
                            {new Date(entry.receivedAt).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-gray-900">{entry.supplierName}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-gray-900">
                                {entryLocation?.name ?? primaryLocation?.name ?? 'Bodega principal'}
                              </span>
                              <Badge className={`w-fit text-[10px] ${resolveLocationBadgeClass(entryLocation)}`}>
                                {resolveLocationTypeLabel(entryLocation)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{entry.documentNumber ?? '—'}</TableCell>
                          <TableCell>{entry.createdBy}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {entry.totalItems} productos · {entry.totalQuantity} unidades
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate text-xs text-gray-600">{entry.notes ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleViewEntry(entry)}>
                              <Eye className="h-4 w-4 text-primary-prosalud hover:text-white" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <div className="border-t p-4">
                <DataPagination
                  currentPage={entriesPage}
                  totalPages={entriesTotalPages}
                  totalItems={entriesTotalItems}
                  itemsPerPage={entriesItemsPerPage}
                  onPageChange={goToEntriesPage}
                  onItemsPerPageChange={setEntriesItemsPerPage}
                />
                </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog
        open={locationDetailOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseLocationDetail();
          } else {
            setLocationDetailOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden bg-white">
          <DialogHeader>
            <div className="flex flex-col gap-2">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <MapPin className="h-5 w-5 text-primary-prosalud" />
                {activeLocation?.name ?? 'Detalle de bodega'}
              </DialogTitle>
              <DialogDescription>
                Visualiza la distribución del stock en esta ubicación y su historial de movimientos.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={`flex items-center gap-1 text-xs ${resolveLocationBadgeClass(activeLocation)}`}>
                <Info className="h-3.5 w-3.5" />
                {resolveLocationTypeLabel(activeLocation)}
              </Badge>
              {activeLocation?.hospital && (
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  <Building2 className="h-3.5 w-3.5" />
                  {activeLocation.hospital.name}
                </Badge>
              )}
              {locationDetailError && (
                <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {locationDetailError}
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="space-y-6 pb-4">
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total de unidades</CardDescription>
                      <CardTitle className="flex items-center gap-2 text-2xl text-primary-prosalud">
                        <Package className="h-5 w-5" />
                        <span>{locationStocksTotals.stock.toLocaleString('es-CO')}</span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{reservedCopy.label}</CardDescription>
                      <CardTitle className="flex items-center gap-2 text-2xl text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                        <span>{locationStocksTotals.reserved.toLocaleString('es-CO')}</span>
                      </CardTitle>
                      {reservedCopy.hint && (
                        <p className="text-xs text-gray-500">{reservedCopy.hint}</p>
                      )}
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Variantes</CardDescription>
                      <CardTitle className="flex items-center gap-2 text-2xl text-sky-600">
                        <Tag className="h-5 w-5" />
                        <span>{selectedLocationSummary?.variantCount ?? locationDetail?.stocks?.length ?? 0}</span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    className={cn(
                      'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      locationTab === 'stocks'
                        ? 'bg-accent text-accent-foreground shadow'
                        : 'text-gray-500 hover:text-primary-prosalud',
                    )}
                    onClick={() => setLocationTab('stocks')}
                  >
                    Inventario
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      locationTab === 'movements'
                        ? 'bg-accent text-accent-foreground shadow'
                        : 'text-gray-500 hover:text-primary-prosalud',
                    )}
                    onClick={() => setLocationTab('movements')}
                  >
                    Movimientos
                  </button>
                </div>

                {locationTab === 'stocks' ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative ml-2 flex-grow sm:flex-grow-0 sm:basis-64">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            value={locationStocksFilter}
                            onChange={(event) => setLocationStocksFilter(event.target.value)}
                            placeholder="Buscar por producto, variante, color o talla"
                            className="pl-9"
                          />
                        </div>
                      <Select
                        value={locationStocksFilterMode}
                        onValueChange={(value: 'all' | 'inStock' | 'reserved') => setLocationStocksFilterMode(value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filtrar inventario" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="inStock">Con stock disponible</SelectItem>
                          <SelectItem value="reserved">
                            {reservedCopy.label === 'Reservadas' ? 'Con reservas' : 'Pendientes por recibir'}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={locationStocksSort}
                        onValueChange={(value: 'stock-desc' | 'reserved-desc') => setLocationStocksSort(value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stock-desc">Ordenar por stock (mayor primero)</SelectItem>
                          <SelectItem value="reserved-desc">
                            Ordenar por {reservedCopy.label.toLowerCase()} (mayor primero)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-sm text-gray-500 whitespace-nowrap ml-auto">
                        {filteredLocationStocks.length} registros encontrados
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200">
                      <div className="max-h-[360px] overflow-y-auto min-h-[240px] pr-1">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead>Producto</TableHead>
                              <TableHead>Variante</TableHead>
                              <TableHead className="text-right">Stock</TableHead>
                              <TableHead className="text-right hidden sm:table-cell">{reservedCopy.label}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {locationDetailLoading ? (
                              <TableRow>
                                <TableCell colSpan={4} className="h-[160px] text-center text-gray-500">
                                  Cargando detalle de inventario...
                                </TableCell>
                              </TableRow>
                            ) : locationDetailError ? (
                              <TableRow>
                                <TableCell colSpan={4} className="h-[160px] text-center text-red-600">
                                  {locationDetailError}
                                </TableCell>
                              </TableRow>
                            ) : !filteredLocationStocks.length ? (
                              <TableRow>
                                <TableCell colSpan={4} className="h-[160px] text-center text-gray-500">
                                  {locationStocksFilter
                                    ? 'No se encontraron coincidencias para el criterio de búsqueda.'
                                    : 'Aún no hay registros de stock detallado en esta bodega.'}
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredLocationStocks.map((stock) => {
                                const productDetail = productById.get(stock.productId);
                                const productGender = formatGender(productDetail?.gender);
                                const hasSize = Boolean(stock.size);
                                const hasColor = Boolean(stock.colorLabel);
                                let variantPrimaryLabel =
                                  stock.variantLabel ??
                                  stock.variantSku ??
                                  (hasSize ? `Talla ${stock.size}` : hasColor ? stock.colorLabel : 'Estándar');
                                const sizeMentioned =
                                  hasSize &&
                                  variantPrimaryLabel.toLowerCase().includes(String(stock.size).toLowerCase());
                                const variantSecondaryLabel =
                                  hasSize && !sizeMentioned ? `Talla ${stock.size}` : '';

                                return (
                                  <TableRow key={`${stock.variantId}-${stock.productId}`}>
                                    <TableCell className="max-w-[200px]">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">
                                          {stock.productName}
                                          {productGender && <span className="font-bold text-gray-700"> ({productGender})</span>}
                                        </span>
                                        {(stock.productCategory || stock.productSubcategory) && (
                                          <span className="text-xs text-gray-500">
                                            {[stock.productCategory, stock.productSubcategory].filter(Boolean).join(' · ')}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2 text-sm text-gray-700">
                                        {stock.colorHex && (
                                          <span
                                            className="h-3.5 w-3.5 rounded-full border border-gray-200 shadow-inner"
                                            style={{ backgroundColor: stock.colorHex }}
                                          />
                                        )}
                                        <div className="flex flex-col">
                                          <span className="font-medium text-gray-900">{variantPrimaryLabel}</span>
                                          {variantSecondaryLabel && (
                                            <span className="text-xs text-gray-500">{variantSecondaryLabel}</span>
                                          )}
                                        </div>
                                        {hasColor && (
                                          <Badge variant="secondary" className="text-[10px]">
                                            {stock.colorLabel}
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-gray-900">
                                      {stock.stock.toLocaleString('es-CO')}
                                    </TableCell>
                                    <TableCell className="hidden text-right text-sm text-gray-600 sm:table-cell">
                                      {(stock.reserved ?? 0).toLocaleString('es-CO')}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Select
                          value={movementReasonFilter}
                          onValueChange={(value) => setMovementReasonFilter(value)}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Filtrar por motivo" />
                          </SelectTrigger>
                          <SelectContent>
                            {movementReasonOptions.map((reason) => {
                              const label = reason === 'all' ? 'Todos los motivos' : resolveMovementReasonLabel(reason);
                              return (
                                <SelectItem key={reason} value={reason}>
                                  {label}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Badge variant="outline" className="flex items-center gap-1 text-xs">
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          {locationMovementsTotalItems} movimientos
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        Los movimientos consideran entradas y salidas donde participa esta bodega.
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200">
                      <div className="max-h-[360px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead>Fecha</TableHead>
                              <TableHead>Producto</TableHead>
                                  <TableHead>Origen → Destino</TableHead>
                              <TableHead className="text-right">Cantidad</TableHead>
                              <TableHead className="text-center">Motivo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {locationMovementsLoading ? (
                              <TableRow>
                                <TableCell colSpan={6} className="h-[160px] text-center text-gray-500">
                                  Cargando movimientos...
                                </TableCell>
                              </TableRow>
                            ) : locationMovementsError ? (
                              <TableRow>
                                <TableCell colSpan={6} className="h-[160px] text-center text-red-600">
                                  {locationMovementsError}
                                </TableCell>
                              </TableRow>
                            ) : locationMovements.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="h-[160px] text-center text-gray-500">
                                  No se han registrado movimientos para esta bodega en el periodo seleccionado.
                                </TableCell>
                              </TableRow>
                            ) : (
                              locationMovements.map((movement) => {
                                const productDetail = movement.productId ? productById.get(movement.productId) : undefined;
                                const productGender = formatGender(productDetail?.gender);

                                return (
                                  <TableRow key={movement.id}>
                                    <TableCell className="text-sm text-gray-700">
                                      {new Date(movement.movedAt).toLocaleString('es-CO')}
                                    </TableCell>
                                    <TableCell className="max-w-[220px]">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">
                                          {movement.productName}
                                          {productGender && <span className="font-bold text-gray-700"> ({productGender})</span>}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                          {movement.variant?.color?.hex && (
                                            <span
                                              className="h-3 w-3 rounded-full border border-gray-200 shadow-inner"
                                              style={{ backgroundColor: movement.variant.color.hex }}
                                            />
                                          )}
                                          <span>
                                            {movement.variant?.label ??
                                              movement.variantLabel ??
                                              formatMovementVariantLabel(movement) ??
                                              'Estándar'}
                                            {productGender ? ` · ${productGender}` : ''}
                                          </span>
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col gap-1 text-xs text-gray-600">
                                        {movement.fromSupplier ? (
                                          <span className="inline-flex items-center gap-1 text-gray-700">
                                            <span className="font-medium text-gray-900">
                                              {movement.fromSupplier.supplierName ?? movement.fromSupplier.supplierId ?? 'Proveedor'}
                                            </span>
                                        <ArrowRightLeft className="h-3 w-3 text-gray-400" />
                                            <span className="font-medium text-gray-900">
                                              {movement.toLocation?.name ?? '—'}
                                            </span>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1">
                                            <span className="font-medium text-gray-900">
                                              {movement.fromLocation?.name ?? '—'}
                                            </span>
                                            <ArrowRightLeft className="h-3 w-3 text-gray-400" />
                                            <span className="font-medium text-gray-900">
                                              {movement.toLocation?.name ?? '—'}
                                            </span>
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell
                                      className={cn(
                                        'text-right font-semibold',
                                        movement.quantity >= 0 ? 'text-emerald-700' : 'text-red-600',
                                      )}
                                    >
                                      {movement.quantity.toLocaleString('es-CO')}
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            'text-right'
                                        )}
                                    >
                                      <Badge variant="outline" className="text-xs">
                                        {resolveMovementReasonLabel(movement.reason)}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <DataPagination
                      currentPage={locationMovementsPage}
                      totalPages={locationMovementsTotalPages}
                      totalItems={locationMovementsTotalItems}
                      itemsPerPage={locationMovementsPageSize}
                      onPageChange={setLocationMovementsPage}
                      onItemsPerPageChange={(value) => {
                        setLocationMovementsPageSize(value);
                        setLocationMovementsPage(1);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <QuickActionsDialog open={quickActionsOpen} onOpenChange={setQuickActionsOpen} />
      <LowStockDialog open={lowStockOpen} onOpenChange={setLowStockOpen} items={lowStockItems} />

      <Dialog open={createEntryOpen} onOpenChange={(open) => { setCreateEntryOpen(open); if (!open) resetEntryForm(); }}>
        <DialogContent className="max-w-4xl bg-white">
          <DialogHeader>
            <DialogTitle>Registrar nueva entrada</DialogTitle>
            <DialogDescription>
              Registra ingresos provenientes de proveedores y define la bodega donde quedará disponible el stock.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proveedor *</Label>
                <Select value={entrySupplier} onValueChange={setEntrySupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bodega destino</Label>
                <div className="flex items-center justify-between rounded-md border border-dashed border-primary-prosalud/30 bg-primary-prosalud/5 px-3 py-2 text-sm text-gray-700">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">
                      {primaryLocation?.name ?? 'Bodega principal'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Todas las entradas se registran automáticamente en la bodega.
                    </span>
                  </div>
                  <Badge className={`text-[10px] ${resolveLocationBadgeClass(primaryLocation)}`}>
                    {resolveLocationTypeLabel(primaryLocation)}
                  </Badge>
                </div>
                {locationsError && (
                  <p className="text-xs text-red-600">
                    {locationsError}. Se continuará usando la bodega principal por defecto.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Fecha de recepción *</Label>
                <Input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Número de documento</Label>
                <Input value={entryDocument} onChange={(event) => setEntryDocument(event.target.value)} placeholder="Ej: Factura 12345" />
              </div>

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea value={entryNotes} onChange={(event) => setEntryNotes(event.target.value)} rows={3} placeholder="Notas adicionales sobre la entrada" />
              </div>
            </div>

            <Card className="border border-dashed border-primary-prosalud/40 bg-primary-prosalud/5">
              <CardHeader>
                <CardTitle className="text-base">Productos a ingresar</CardTitle>
                <CardDescription>Selecciona los productos y variantes que estás recibiendo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="border-primary-prosalud text-primary-prosalud" onClick={handleAddEntryItem}>
                  <Plus className="h-4 w-4 mr-2" /> Agregar producto
                </Button>

                {entryItems.length === 0 ? (
                  <div className="rounded-md border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500 text-center">
                    No has agregado productos a esta entrada.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {entryItems.map((item) => {
                      const product = products.find((p) => p.id === item.productId);
                      const variantOptions = product?.variants ?? [];
                      const variantValue = item.variantId ?? (variantOptions.length ? variantOptions[0].id : '__default__');

                      const variantSelectOptions: SearchableSelectOption[] = variantOptions.length
                        ? variantOptions.map((v) => {
                            const colorHex = v.color?.hex;
                            const colorLabel = v.color?.label ?? v.colorId ?? '';
                            const sizeLabel = v.size ?? '';
                            const combinedLabel =
                              v.label ||
                              [sizeLabel, colorLabel].filter(Boolean).join(' · ') ||
                              'Variante';

                            return {
                              value: v.id,
                              label: combinedLabel,
                              searchText: [sizeLabel, colorLabel].filter(Boolean).join(' '),
                              renderLabel: (
                                <>
                                  {colorHex && (
                                    <span
                                      className="h-3.5 w-3.5 shrink-0 rounded-full border border-white shadow-inner ring-1 ring-black/10"
                                      style={{ backgroundColor: colorHex }}
                                    />
                                  )}
                                  <span className="truncate">{combinedLabel}</span>
                                </>
                              ),
                            };
                          })
                        : [{ value: '__default__', label: 'Única', searchText: 'unica' }];

                      return (
                        <div key={item.id} className="rounded border border-gray-200 bg-white p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2.5fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto] gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-gray-600">Producto *</Label>
                              <SearchableSelect
                                options={productSelectOptions}
                                value={item.productId}
                                onValueChange={(value) => handleEntryItemProductChange(item.id, value)}
                                placeholder="Seleccionar producto"
                                emptyText="No se encontraron productos"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs text-gray-600">Variante</Label>
                              <SearchableSelect
                                options={variantSelectOptions}
                                value={variantValue}
                                onValueChange={(value) =>
                                  handleEntryItemVariantChange(item.id, value === '__default__' ? undefined : value)
                                }
                                placeholder="Seleccionar variante"
                                emptyText="No se encontraron variantes"
                                disabled={!variantOptions.length}
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs text-gray-600">Cantidad *</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={item.quantity}
                                onChange={(event) => handleEntryItemQuantity(item.id, event.target.value)}
                                className="w-full md:w-[120px]"
                              />
                            </div>

                            <div className="flex items-end justify-end">
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveEntryItem(item.id)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => { setCreateEntryOpen(false); resetEntryForm(); }}>Cancelar</Button>
              <Button
                className="bg-primary-prosalud text-white"
                onClick={handleSaveEntry}
                disabled={savingEntry || !entrySupplier || !entryDate || !entryItems.length}
              >
                {savingEntry ? 'Registrando...' : 'Registrar entrada'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedEntry !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEntry(null);
            setEntryDetailLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl bg-white">
          <DialogHeader>
            <DialogTitle>Detalle de entrada</DialogTitle>
            <DialogDescription>Información completa del ingreso seleccionado.</DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Proveedor</p>
                  <p className="text-sm text-gray-900">{selectedEntry.supplierName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Fecha</p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedEntry.receivedAt).toLocaleString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Documento</p>
                  <p className="text-sm text-gray-900">{selectedEntry.documentNumber ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Bodega</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-900">
                    <Badge className={`text-[10px] ${resolveLocationBadgeClass(resolvedSelectedEntryLocation)}`}>
                      {resolveLocationTypeLabel(resolvedSelectedEntryLocation)}
                    </Badge>
                    <span>{resolvedSelectedEntryLocation?.name ?? primaryLocation?.name ?? 'Bodega principal'}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Registrado por</p>
                  <p className="text-sm text-gray-900">{selectedEntry.createdBy}</p>
                </div>
              </div>

              {selectedEntry.notes && (
                <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Notas</p>
                  {selectedEntry.notes}
                </div>
              )}

              <div className="rounded-md border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Producto</TableHead>
                      <TableHead>Variante</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Stock previo</TableHead>
                      <TableHead>Stock resultante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entryDetailLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-[120px] text-center text-gray-500">
                          Cargando detalle...
                        </TableCell>
                      </TableRow>
                    ) : selectedEntry.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-[120px] text-center text-gray-500">
                          No se registraron productos en esta entrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedEntry.items.map((item) => {
                        const productDetail = item.product ?? productById.get(item.productId);
                        const productGender = formatGender(productDetail?.gender);
                        const variantDetail =
                          item.variant ?? productDetail?.variants?.find((variant) => variant.id === item.variantId);
                        const variantColorHex = variantDetail?.color?.hex;
                        const variantColorLabel = variantDetail?.color?.label ?? '';
                        const variantSizeLabel = variantDetail?.size ?? '';
                        const variantFallbackLabel = [variantSizeLabel, variantColorLabel].filter(Boolean).join(' · ');
                        const variantDisplay = item.variantLabel ?? (variantFallbackLabel || '—');

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-gray-900">
                              <span>{item.productName}</span>
                              {productGender && <span className="font-bold text-gray-700"> ({productGender})</span>}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                {variantColorHex && (
                                  <span
                                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-white shadow-inner ring-1 ring-black/10"
                                    style={{ backgroundColor: variantColorHex }}
                                  />
                                )}
                                <span>{variantDisplay}</span>
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.previousStock}</TableCell>
                            <TableCell>{item.newStock}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryOverview;
