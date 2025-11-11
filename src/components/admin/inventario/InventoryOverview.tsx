import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  XCircle,
  Tag,
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
import { Link } from 'react-router-dom';

const InventoryOverview: React.FC = () => {
  const [expandedCategory, setExpandedCategory] = useState<string | undefined>(undefined);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [lowStockOpen, setLowStockOpen] = useState(false);
  // const [hospitalRequestsOpen, setHospitalRequestsOpen] = useState(false);

  const { 
    categories, 
    products, 
    colorOptions, 
    dashboardData, 
    dashboardLoading,
    dashboardError,
  } = useInventory();

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
      return dashboardData.low_stock_products.flatMap((product) =>
        product.variants.map((variant) => ({
          id: variant.id,
          name: `${product.name} - ${variant.label}`,
          current: variant.stock,
          min: variant.min_stock,
          category: product.category,
          status: getVariantStatus(variant.stock, variant.min_stock),
        })),
      );
    }

    return categoryStats.flatMap((category) =>
      category.variants
        .filter((variant) => variant.status !== 'ok')
        .map((variant) => ({
          id: variant.id,
          name: `${variant.productName}${variant.size ? ` - Talla ${variant.size}` : ''}${
            variant.colorLabel ? ` - ${variant.colorLabel}` : ''
          }`,
          current: variant.stock,
          min: variant.minStock,
          category: category.name,
          status: variant.status,
        })),
    );
  }, [dashboardData, categoryStats]);

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
            };
          }),
        })),
      };
    });
  }, [categories, products, colorOptions]);

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

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'low': return 'text-amber-600 bg-amber-50';
      case 'ok': return 'text-primary-prosalud bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'low': return 'secondary';
      case 'ok': return 'default';
      default: return 'outline';
    }
  };

  // const hospitalRequests = [
  //   { hospital: 'Hospital Marco Fidel Suárez', pending: 6, priority: 'high' },
  //   { hospital: 'Hospital San Juan de Dios', pending: 4, priority: 'urgent' },
  //   { hospital: 'Hospital La Merced', pending: 3, priority: 'urgent' },
  //   { hospital: 'Promotora Médica y Odontológica', pending: 3, priority: 'medium' },
  //   { hospital: 'Sociedad Médica Rionegro SOMER', pending: 2, priority: 'medium' },
  //   { hospital: 'Hospital Venancio Díaz', pending: 2, priority: 'high' }
  // ];

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {dashboardLoading && (
        <Card className="border shadow-sm">
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-prosalud mb-4"></div>
            <p className="text-gray-600">Cargando datos del inventario...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {dashboardError && (
        <Card className="border border-red-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Error al cargar el resumen</h3>
                <p className="text-sm text-red-700">{dashboardError}</p>
                <p className="text-xs text-gray-600 mt-2">
                  Mostrando datos disponibles en caché local.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories Overview */}
      <div className="relative">
        {categoryStats.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="py-10 text-center text-gray-500">
              Aún no hay categorías creadas para mostrar en el resumen.
            </CardContent>
          </Card>
        ) : (
          <Carousel
            opts={{ align: 'start', containScroll: 'trimSnaps' }}
            className="relative overflow-clip px-4 sm:px-6"
          >
            <CarouselContent className="-ml-4 pb-4">
        {categoryStats.map((category, index) => (
                <CarouselItem
                  key={category.name}
                  className="basis-full pl-4 sm:basis-1/2 xl:basis-1/3 2xl:basis-1/4"
                >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
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
                </CarouselItem>
        ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 border border-gray-200 bg-white/90 text-gray-700 shadow transition-colors hover:bg-primary-prosalud hover:text-white hover:-translate-y-1/2 focus-visible:-translate-y-1/2 focus-visible:ring-2 focus-visible:ring-primary-prosalud active:-translate-y-1/2" />
            <CarouselNext className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 border border-gray-200 bg-white/90 text-gray-700 shadow transition-colors hover:bg-primary-prosalud hover:text-white hover:-translate-y-1/2 focus-visible:-translate-y-1/2 focus-visible:ring-2 focus-visible:ring-primary-prosalud active:-translate-y-1/2" />
          </Carousel>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Inventory Products Accordion */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="xl:col-span-2"
        >
          <Card className="h-full border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-primary-prosalud">
                <Package className="h-5 w-5" />
                <span>Inventario por Categoría</span>
              </CardTitle>
              <CardDescription>
                Detalle de productos disponibles por categoría
              </CardDescription>
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
                          {category.products.map((product) => (
                            <div key={product.id} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="text-base font-semibold text-gray-900 leading-tight">{product.name}</p>
                                  {product.description && (
                                    <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                                  )}
                                </div>
                                <Badge className="bg-primary-prosalud/10 text-primary-prosalud">
                                  {product.variants.length} {product.variants.length === 1 ? 'variante' : 'variantes'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {product.variants.map((variant) => (
                                  <div key={variant.id} className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        {variant.color ? (
                                            <div className="mt-1 flex items-center gap-2 text-gray-900">
                                            <span
                                                className="h-3 w-3 rounded-full border border-gray-200"
                                                style={{ backgroundColor: variant.color.hex ?? '#ffffff' }}
                                            />
                                              <p className="text-sm font-semibold text-gray-900 leading-tight">
                                                {variant.label ?? variant.sku ?? 'Variante'}
                                              </p>
                                            </div>
                                        ) : (
                                            <p className="mt-1 text-gray-900"> Estándar </p>
                                        )}
                                        {/* <p className="text-xs text-gray-500">SKU: {variant.sku ?? '—'}</p> */ }
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
                                    {/*<div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                                      <div>
                                        <span className="font-medium text-gray-500 uppercase tracking-wide">Mínimo</span>
                                        <p className="text-gray-900">{variant.minStock ?? 0}</p>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-500 uppercase tracking-wide">Máximo</span>
                                        <p className="text-gray-900">{variant.maxStock ?? 0}</p>
                                      </div>
                                    </div> */ }
                          </div>
                        ))}
                      </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>

        {/* Low Stock Alert */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="xl:col-span-1 space-y-6"
        >
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Stock Bajo</span>
              </CardTitle>
              <CardDescription>
                Productos que requieren reposición
              </CardDescription>
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
                    <p className="text-xs text-gray-500">
                      y {lowStockItems.length - 4} productos más con alertas.
                    </p>
                  )}
              <Button 
                    className="mt-4 w-full bg-red-600 text-white hover:bg-red-700"
                onClick={() => setLowStockOpen(true)}
              >
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
              <CardDescription>
                Seguimiento rápido de solicitudes de hospitales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!requestsSummaryEntries.length ? (
                <p className="text-sm text-gray-500">
                  Aún no se han registrado solicitudes en el sistema.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Solicitudes totales</p>
                      <p className="text-xs text-gray-600">
                        Incluye todas las etapas del flujo operativo.
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-primary-prosalud">{totalRequests}</span>
                  </div>

                  <div className="space-y-3">
                    {requestsSummaryEntries.map(({ status, label, description, value, icon: Icon, badgeClass, bgClass }) => (
                      <div
                        key={status}
                        className={`flex items-center justify-between rounded-lg border px-4 py-3 ${bgClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-white p-2 shadow-sm">
                            <Icon className="h-4 w-4 text-primary-prosalud" />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{label}</p>
                            <p className="text-xs text-gray-600">{description}</p>
                          </div>
                        </div>
                        <Badge className={`text-xs font-semibold ${badgeClass}`}>
                          {value}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-primary-prosalud text-primary-prosalud hover:bg-primary-prosalud hover:text-white"
                    asChild
                  >
                    <Link to="/admin/inventario?tab=hospital-requests">
                      Gestionar Solicitudes
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Sección de solicitudes por hospital temporalmente deshabilitada */}
          {/*
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-primary-prosalud">
                <Hospital className="h-5 w-5" />
                <span>Solicitudes por Hospital</span>
              </CardTitle>
              <CardDescription>
                Estado de solicitudes pendientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hospitalRequests.map((request, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{request.hospital}</p>
                    <p className="text-xs text-gray-600">{request.pending} solicitudes pendientes</p>
                  </div>
                  <Badge 
                    variant={request.priority === 'urgent' ? 'destructive' :
                            request.priority === 'high' ? 'destructive' : 
                            request.priority === 'medium' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {request.priority === 'urgent' ? 'Urgente' :
                     request.priority === 'high' ? 'Alta' : 
                     request.priority === 'medium' ? 'Media' : 'Baja'}
                  </Badge>
                </div>
              ))}
              <Button 
                className="w-full mt-4 bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                onClick={() => setHospitalRequestsOpen(true)}
              >
                Gestionar Solicitudes
              </Button>
            </CardContent>
          </Card>
          */}
        </motion.div>
      </div>

      {/* Dialogs */}
      <QuickActionsDialog open={quickActionsOpen} onOpenChange={setQuickActionsOpen} />
      <LowStockDialog open={lowStockOpen} onOpenChange={setLowStockOpen} items={lowStockItems} />
      {/* <HospitalRequestsDialog open={hospitalRequestsOpen} onOpenChange={setHospitalRequestsOpen} /> */}
    </div>
  );
};

export default InventoryOverview;
