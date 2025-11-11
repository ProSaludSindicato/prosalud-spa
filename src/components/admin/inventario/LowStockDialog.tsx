
import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Search, Package, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

export interface LowStockItem {
  id?: string;
  name: string;
  category: string;
  current: number;
  min: number;
  max?: number;
  status: 'critical' | 'low' | 'ok';
  lastOrder?: string;
  supplier?: string;
}

interface LowStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items?: LowStockItem[];
}

const LowStockDialog: React.FC<LowStockDialogProps> = ({ open, onOpenChange, items = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const normalizedItems = useMemo(
    () =>
      items.filter((item) => item.status === 'low' || item.status === 'critical'),
    [items],
  );

  const filteredItems = normalizedItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'low': return 'bg-amber-100 text-amber-700';
      case 'ok': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'critical': return 'Crítico';
      case 'low': return 'Bajo';
      case 'ok': return 'Adecuado';
      default: return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <span>Productos con Stock Bajo</span>
          </DialogTitle>
          <DialogDescription>
            Monitorea los productos que requieren reposición urgente
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="low">Bajo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-red-600">Stock Crítico</p>
                <p className="text-2xl font-bold text-red-700">
                  {normalizedItems.filter(item => item.status === 'critical').length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border border-amber-200 bg-amber-50 p-4"
          >
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-sm text-amber-600">Stock Bajo</p>
                <p className="text-2xl font-bold text-amber-700">
                  {normalizedItems.filter(item => item.status === 'low').length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-lg border border-blue-200 bg-blue-50 p-4"
          >
            <div className="flex items-center space-x-3">
              <Truck className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600">Total Productos</p>
                <p className="text-2xl font-bold text-blue-700">{normalizedItems.length}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Items Table */}
        <div className="overflow-hidden rounded-md border">
          {normalizedItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No hay productos con alertas de stock en este momento.
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No se encontraron productos que coincidan con los filtros seleccionados.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Stock Actual</TableHead>
                    <TableHead>Stock Mínimo</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, index) => (
                    <TableRow key={item.id ?? `${item.name}-${index}`} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          {item.id && <p className="text-sm text-gray-600">ID: {item.id}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${item.status === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                          {item.current}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">{item.min}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(item.status)}>
                          {getStatusLabel(item.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end border-t bg-gray-50 px-4 py-2">
                <p className="text-sm text-gray-600">
                  Mostrando {filteredItems.length} de {normalizedItems.length} productos con alertas.
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LowStockDialog;
