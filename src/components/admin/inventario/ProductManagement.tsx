import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Edit, 
  Eye,
  AlertCircle,
  Package,
  Shirt,
  Gift,
  Shield,
  Activity,
  Truck,
  ClipboardList,
  ShoppingBag,
  Boxes,
  Tag,
  EllipsisVertical,
} from 'lucide-react';
import { motion } from 'framer-motion';
import ProductForm from './ProductForm';
import DataPagination from '@/components/ui/data-pagination';
import { usePagination } from '@/hooks/usePagination';
import { useInventory } from '@/context/InventoryContext';
import { InventoryCategory, InventoryProduct } from '@/types/inventory';

const ProductManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'details'>('form');
  const { 
    products, 
    categories, 
    colorOptions, 
    productsLoading, 
    productsError,
    categoriesLoading, 
  } = useInventory();

  const categoryOptionsList = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  const categoryMap = useMemo(() => {
    const map = new Map<string, InventoryCategory>();
    categories.forEach((category) => {
      map.set(category.id, category);
    });
    return map;
  }, [categories]);

  const productsWithMeta = useMemo(() => {
    return products.map((product) => {
      const category = categoryMap.get(product.categoryId);
      const subcategory = category?.subcategories.find((sub) => sub.id === product.subcategoryId);
      const totalStock = product.variants.reduce((acc, variant) => acc + (variant.stock ?? 0), 0);
      const lowStock = product.variants.some((variant) => variant.stock <= variant.minStock);
      return {
        product,
        category,
        subcategory,
        totalStock,
        lowStock,
      };
    });
  }, [products, categoryMap]);

  const filteredProducts = useMemo(() => {
    return productsWithMeta.filter(({ product, category, subcategory, lowStock }) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        product.name.toLowerCase().includes(term) ||
        (product.description ?? '').toLowerCase().includes(term) ||
        (subcategory?.name ?? '').toLowerCase().includes(term);
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
      const matchesLowStock = !showLowStock || lowStock;
    
    return matchesSearch && matchesCategory && matchesLowStock;
  });
  }, [productsWithMeta, searchTerm, selectedCategory, showLowStock]);

  const {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    paginatedData,
    goToPage,
    setItemsPerPage
  } = usePagination({
    data: filteredProducts,
    initialItemsPerPage: 10,
  });

  const getCategoryIcon = (category?: InventoryCategory) => {
    if (!category?.icon) {
      return Package;
    }

    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      Shirt,
      Shield,
      Package,
      Gift,
      Activity,
      Truck,
      ClipboardList,
      ShoppingBag,
      Boxes,
      Tag,
    };

    return iconMap[category.icon] ?? Package;
  };

  const getCategoryBadgeClass = (category?: InventoryCategory) => {
    if (!category) return 'bg-gray-100 text-gray-700';

    switch (category.id) {
      case 'uniformes':
        return 'bg-blue-100 text-blue-700';
      case 'tapabocas':
        return 'bg-green-100 text-green-700';
      case 'batas':
        return 'bg-purple-100 text-purple-700';
      case 'regalos':
        return 'bg-pink-100 text-pink-700';
      case 'implementos':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleViewProduct = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setViewMode('details');
    setIsProductDialogOpen(true);
  };

  const handleEditProduct = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setViewMode('form');
    setIsProductDialogOpen(true);
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
    setViewMode('form');
    setIsProductDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsProductDialogOpen(false);
    setSelectedProduct(null);
    setViewMode('form');
  };

  const renderDialogContent = () => {
    if (viewMode === 'details' && selectedProduct) {
      const category =
        selectedProduct.category ??
        (selectedProduct.categoryId ? categoryMap.get(selectedProduct.categoryId) : undefined);
      const subcategoryName =
        selectedProduct.subcategory?.name ??
        category?.subcategories?.find((sub) => sub.id === selectedProduct.subcategoryId)?.name;
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nombre del Producto</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded border">{selectedProduct.name}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Categoría</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded border">
                {category?.name ?? 'Sin categoría asignada'}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Subcategoría</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded border">
                {subcategoryName ?? 'Sin subcategoría asignada'}
            </p>
          </div>

          {selectedProduct.description && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded border">{selectedProduct.description}</p>
          </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Stock Total</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded border font-semibold">
              {selectedProduct.variants.reduce((acc, variant) => acc + (variant.stock ?? 0), 0)} unidades
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Variantes del Producto</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedProduct.variants.map((variant, index) => {
                const resolvedColor =
                  variant.color ??
                  (variant.colorId ? colorOptions.find((option) => option.id === variant.colorId) : undefined);
                const isLow =
                  (variant.is_low_stock ?? false) || (variant.stock ?? 0) <= (variant.minStock ?? 0);

                return (
                  <div
                    key={index}
                    className="flex h-full flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {resolvedColor ? (
                          <span
                            className="h-8 w-8 rounded-full border border-gray-200"
                            style={{ backgroundColor: resolvedColor.hex ?? '#ffffff' }}
                            title={resolvedColor.label}
                          />
                        ) : (
                          <span className="grid h-8 w-8 place-items-center rounded-full border border-dashed border-gray-300 text-xs text-gray-400">
                            —
                          </span>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {variant.label ?? variant.sku ?? 'Variante'}
                          </p>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            SKU: {variant.sku ?? '—'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={isLow ? 'destructive' : 'secondary'} className="text-xs">
                        Stock {variant.stock ?? 0}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs font-medium uppercase text-gray-500">Talla</span>
                        <p className="text-gray-900">{variant.size ?? '—'}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium uppercase text-gray-500">Color</span>
                        <p className="text-gray-900">
                          {resolvedColor?.label ?? variant.colorId ?? '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-medium uppercase text-gray-500">Stock mínimo</span>
                        <p className="text-gray-900">{variant.minStock ?? 0}</p>
                      </div>
                    <div>
                        <span className="text-xs font-medium uppercase text-gray-500">Stock máximo</span>
                        <p className="text-gray-900">{variant.maxStock ?? 0}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cerrar
            </Button>
            <Button 
              onClick={() => setViewMode('form')}
              className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Producto
            </Button>
          </div>
        </div>
      );
    }

    return (
      <ProductForm 
        product={selectedProduct}
        onClose={handleCloseDialog}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Productos</h2>
          <p className="text-gray-600">Administra el catálogo de productos del inventario</p>
        </div>
        <Button 
          onClick={handleNewProduct}
          className="bg-gradient-to-r from-primary-prosalud to-primary-prosalud-dark hover:shadow-lg transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px_auto] items-end">
              <div className="flex flex-col gap-2">
                <Label htmlFor="product-search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="product-search"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="product-category">Categoría</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="product-category" className="w-full">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                    {categoryOptionsList.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="sr-only">Stock bajo</Label>
              <Button
                variant={showLowStock ? "default" : "outline"}
                onClick={() => setShowLowStock(!showLowStock)}
                className="w-full md:w-auto"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Stock Bajo
              </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading/Error States */}
      {productsLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border shadow-sm">
            <CardContent className="p-8 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-prosalud mb-4"></div>
              <p className="text-gray-600">Cargando productos...</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {productsError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border border-red-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Error al cargar productos</h3>
                  <p className="text-sm text-red-700">{productsError}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Products Table */}
      {!productsLoading && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
          <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Productos ({totalItems})</span>
            </CardTitle>
            <CardDescription>
              Lista completa de productos en inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                      <TableHead>Subcategoría</TableHead>
                    <TableHead>Stock Total</TableHead>
                    <TableHead>Variantes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedData.map(({ product, category, subcategory, totalStock, lowStock }) => {
                    const Icon = getCategoryIcon(category);
                    return (
                      <TableRow key={product.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-600 line-clamp-1">{product.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryBadgeClass(category)}>
                            <Icon className="h-3 w-3 mr-1" />
                            {category?.name ?? 'Sin categoría'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-700">{subcategory?.name ?? '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{totalStock}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {product.variants.length} variante{product.variants.length !== 1 ? 's' : ''}
                          </span>
                        </TableCell>
                        <TableCell>
                          {lowStock ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Stock Bajo
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                              Normal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                                size="icon"
                                className="text-gray-600 hover:text-white hover:bg-accent"
                              >
                                <EllipsisVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                              onClick={() => handleViewProduct(product)}
                                className="gap-2"
                            >
                                <Eye className="h-4 w-4 text-primary-prosalud" />
                                Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                              onClick={() => handleEditProduct(product)}
                                className="gap-2"
                            >
                                <Edit className="h-4 w-4 text-primary-prosalud" />
                                Editar producto
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
      )}

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader className="pr-10">
            <DialogTitle>
              {viewMode === 'details'
                ? 'Detalles del Producto'
                : selectedProduct
                  ? 'Editar Producto'
                  : 'Nuevo Producto'}
            </DialogTitle>
            <DialogDescription>
              {viewMode === 'details'
                ? 'Consulta la información completa del producto seleccionado.'
                : 'Completa los campos para administrar el producto del inventario.'}
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-0">
            {renderDialogContent()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;
