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
  // Hospital,
  Shirt,
  Gift,
  Shield,
} from 'lucide-react';
import { motion } from 'framer-motion';
import QuickActionsDialog from './QuickActionsDialog';
import LowStockDialog from './LowStockDialog';
// import HospitalRequestsDialog from './HospitalRequestsDialog';
import { useInventory } from '@/context/InventoryContext';

const InventoryOverview: React.FC = () => {
  const [expandedCategory, setExpandedCategory] = useState<string | undefined>(undefined);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [lowStockOpen, setLowStockOpen] = useState(false);
  // const [hospitalRequestsOpen, setHospitalRequestsOpen] = useState(false);

  const { categories, products, colorOptions } = useInventory();

  const colorLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    colorOptions.forEach((color) => map.set(color.id, color.label));
    return map;
  }, [colorOptions]);

  const getVariantStatus = (stock: number, minStock: number) => {
    if (stock <= minStock) return 'critical';
    if (stock <= minStock * 1.25) return 'low';
    return 'ok';
  };

  const categoryStats = useMemo(() => {
    return categories.map((category) => {
      const categoryProducts = products.filter((product) => product.categoryId === category.id);

      const variants = categoryProducts.flatMap((product) =>
        product.variants.map((variant) => ({
          productId: product.id,
          productName: product.name,
          size: variant.size,
          colorLabel: variant.colorId ? colorLabelMap.get(variant.colorId) : undefined,
          stock: variant.stock,
          minStock: variant.minStock,
          maxStock: variant.maxStock,
          status: getVariantStatus(variant.stock, variant.minStock),
        })),
      );

      const totalStock = variants.reduce((acc, variant) => acc + variant.stock, 0);
      const totalCapacity = variants.reduce((acc, variant) => acc + (variant.maxStock ?? variant.stock), 0);
      const reserved = Math.max(totalCapacity - totalStock, 0);

      return {
        id: category.id,
        name: category.name,
        icon: category.icon === 'Shirt' ? Shirt :
              category.icon === 'Shield' ? Shield :
              category.icon === 'Gift' ? Gift :
              category.icon === 'Activity' ? Activity :
              Package,
        total: totalCapacity,
        available: totalStock,
        reserved,
        variants,
      };
    });
  }, [categories, products, colorLabelMap]);

  const lowStockItems = useMemo(() => {
    return categoryStats.flatMap((category) =>
      category.variants
        .filter((variant) => variant.status !== 'ok')
        .map((variant) => ({
          name: `${variant.productName}${variant.size ? ` - Talla ${variant.size}` : ''}${
            variant.colorLabel ? ` - ${variant.colorLabel}` : ''
          }`,
          current: variant.stock,
          min: variant.minStock,
          category: category.name,
          status: variant.status,
        })),
    );
  }, [categoryStats]);

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
      {/* Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {categoryStats.map((category, index) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-all duration-300 border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary-prosalud-light">
                    <category.icon className="h-6 w-6 text-primary-prosalud" />
                  </div>
                  <Badge variant="outline" className="font-medium">
                    {category.total} capacidad
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
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
                  <Progress 
                    value={category.total > 0 ? (category.available / category.total) * 100 : 0} 
                    className="h-2 mt-3"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
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
                {categoryStats.map((category) => (
                  <AccordionItem key={category.id} value={category.id} className="border-b">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-primary-prosalud-light">
                          <category.icon className="h-4 w-4 text-primary-prosalud" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{category.name}</p>
                          <p className="text-sm text-gray-600">{category.variants.length} variantes</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-2 pl-10">
                        {category.variants.map((variant, index) => (
                          <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${getStockStatusColor(variant.status)}`}>
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-900">
                                {variant.productName}
                                {variant.size ? ` · Talla ${variant.size}` : ''}
                                {variant.colorLabel ? ` · ${variant.colorLabel}` : ''}
                              </p>
                              <p className="text-xs text-gray-600">Mínimo: {variant.minStock}</p>
                            </div>
                            <div className="text-right flex items-center space-x-2">
                              <span className="font-medium text-lg">{variant.stock}</span>
                              <Badge variant={getStockStatusBadge(variant.status)} className="text-xs">
                                {variant.status === 'critical' ? 'Crítico' : 
                                 variant.status === 'low' ? 'Bajo' : 'OK'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
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
              {lowStockItems.length === 0 && (
                <p className="text-sm text-gray-500">No hay alertas de stock por el momento.</p>
              )}
              {lowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-600">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="text-xs">
                      {item.current}/{item.min}
                    </Badge>
                  </div>
                </div>
              ))}
              <Button 
                className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setLowStockOpen(true)}
              >
                Ver Todo el Stock Bajo
              </Button>
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
      <LowStockDialog open={lowStockOpen} onOpenChange={setLowStockOpen} />
      {/* <HospitalRequestsDialog open={hospitalRequestsOpen} onOpenChange={setHospitalRequestsOpen} /> */}
    </div>
  );
};

export default InventoryOverview;
