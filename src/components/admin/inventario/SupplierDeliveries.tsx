import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Truck, Plus, Search, Calendar, Package, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import DataPagination from '@/components/ui/data-pagination';
import { usePagination } from '@/hooks/usePagination';
import NewDeliveryForm from './NewDeliveryForm';
import { useToast } from '@/hooks/use-toast';
import { useInventory } from '@/context/InventoryContext';

interface Delivery {
  id: string;
  supplierName: string;
  deliveryDate: string;
  totalItems: number;
  status: 'pending' | 'received' | 'completed';
  items: Array<{
    productName: string;
    quantity: number;
    received: number;
  }>;
}

const SupplierDeliveries: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewDeliveryForm, setShowNewDeliveryForm] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const { toast } = useToast();
  const { deliveries, products, colorOptions } = useInventory();

  const colorLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    colorOptions.forEach((color) => map.set(color.id, color.label));
    return map;
  }, [colorOptions]);

  const productLookup = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((product) => {
      product.variants.forEach((variant) => {
        const key = `${product.id}${variant.id ? `__${variant.id}` : ''}`;
        const variantLabelParts = [
          product.name,
          variant.size ? `Talla ${variant.size}` : null,
          variant.colorId ? (colorLabelMap.get(variant.colorId) ?? variant.colorId) : null,
        ].filter(Boolean);
        map.set(key, variantLabelParts.join(' · '));
      });
      // fallback entry without variant id
      map.set(product.id, product.name);
    });
    return map;
  }, [products, colorLabelMap]);

  const normalizedDeliveries = useMemo<Delivery[]>(() => {
    return deliveries.map((delivery) => ({
      id: delivery.id,
      supplierName: delivery.supplierName,
      deliveryDate: delivery.deliveryDate,
      totalItems: delivery.totalItems,
      status: delivery.status,
      items: delivery.items.map((item) => {
        const displayKey = item.variantId ? `${item.productId}__${item.variantId}` : item.productId;
        const displayName = productLookup.get(displayKey) ?? item.productId;
        return {
          productName: displayName,
          quantity: item.quantity,
          received: item.received,
        };
      }),
    }));
  }, [deliveries, productLookup]);

  const filteredDeliveries = normalizedDeliveries.filter(delivery =>
    delivery.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    paginatedData,
    goToPage,
    setItemsPerPage
  } = usePagination({
    data: filteredDeliveries,
    initialItemsPerPage: 10
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-primary-prosalud text-white';
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'received': return 'Recibido';
      case 'pending': return 'Pendiente';
      default: return status;
    }
  };

  const handleViewDetails = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    toast({
      title: "Entrega Visualizada",
      description: `Mostrando detalles de la entrega #${delivery.id} de ${delivery.supplierName}`,
      variant: "default"
    });
  };

  const handleNewDeliverySuccess = () => {
    setShowNewDeliveryForm(false);
    toast({
      title: "Entrega Registrada",
      description: "La nueva entrega ha sido registrada exitosamente en el sistema",
      variant: "success"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Entregas de Proveedores</h2>
          <p className="text-gray-600">Gestiona las entregas y recepciones de inventario</p>
        </div>
        <Button 
          className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
          onClick={() => setShowNewDeliveryForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Entrega
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar entregas por proveedor o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Deliveries Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Truck className="h-5 w-5" />
              <span>Entregas ({totalItems})</span>
            </CardTitle>
            <CardDescription>
              Historial de entregas de proveedores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>ID</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Fecha de Entrega</TableHead>
                    <TableHead>Total Items</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((delivery) => (
                    <TableRow key={delivery.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <span className="font-mono text-sm">#{delivery.id}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{delivery.supplierName}</p>
                          <p className="text-sm text-gray-600">{delivery.items.length} producto{delivery.items.length !== 1 ? 's' : ''}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{new Date(delivery.deliveryDate).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{delivery.totalItems}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(delivery.status)}>
                          {delivery.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {getStatusLabel(delivery.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewDetails(delivery)}
                          className="hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                        >
                          Ver Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DataPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={goToPage}
              onItemsPerPageChange={setItemsPerPage}
              className="mt-4"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* New Delivery Form Dialog */}
      <Dialog open={showNewDeliveryForm} onOpenChange={setShowNewDeliveryForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <NewDeliveryForm 
            onClose={() => setShowNewDeliveryForm(false)}
            onSuccess={handleNewDeliverySuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Delivery Details Dialog */}
      {selectedDelivery && (
        <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
          <DialogContent className="max-w-2xl bg-white">
            <DialogHeader>
              <DialogTitle>Detalles de Entrega #{selectedDelivery.id}</DialogTitle>
              <DialogDescription>
                Información detallada de la entrega
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Proveedor</label>
                  <p className="text-gray-900">{selectedDelivery.supplierName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha</label>
                  <p className="text-gray-900">{new Date(selectedDelivery.deliveryDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Productos</label>
                <div className="mt-2 space-y-2">
                  {selectedDelivery.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>{item.productName}</span>
                      <span className="text-sm text-gray-600">
                        {item.received}/{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SupplierDeliveries;
