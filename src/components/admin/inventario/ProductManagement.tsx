import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Eye,
  AlertCircle,
  Package,
  Shirt,
  Gift,
  Shield,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import ProductForm from './ProductForm';
import DataPagination from '@/components/ui/data-pagination';
import { usePagination } from '@/hooks/usePagination';

interface ProductWithVariants {
  id: string;
  name: string;
  category: 'uniforme' | 'tapabocas' | 'batas' | 'regalo' | 'implemento';
  description: string;
  totalStock: number;
  variants: Array<{
    size?: string;
    color?: string;
    stock: number;
    minStock: number;
  }>;
  lowStock: boolean;
}

const ProductManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'details'>('form');

  // Mock data - en producción vendría de una API
  const mockProducts: ProductWithVariants[] = [
    {
      id: '1',
      name: 'Uniforme Quirúrgico',
      category: 'uniforme',
      description: 'Uniforme quirúrgico de algodón con tratamiento antibacterial',
      totalStock: 145,
      variants: [
        { size: 'S', color: 'Azul', stock: 25, minStock: 10 },
        { size: 'M', color: 'Azul', stock: 3, minStock: 10 },
        { size: 'L', color: 'Azul', stock: 32, minStock: 10 },
        { size: 'S', color: 'Verde', stock: 28, minStock: 10 },
        { size: 'M', color: 'Verde', stock: 35, minStock: 10 },
        { size: 'L', color: 'Verde', stock: 22, minStock: 10 }
      ],
      lowStock: true
    },
    {
      id: '2',
      name: 'Tapabocas N95',
      category: 'tapabocas',
      description: 'Tapabocas de alta filtración N95 certificado',
      totalStock: 2340,
      variants: [
        { stock: 2340, minStock: 500 }
      ],
      lowStock: false
    },
    {
      id: '3',
      name: 'Bata de Laboratorio',
      category: 'batas',
      description: 'Bata blanca de laboratorio, manga larga',
      totalStock: 76,
      variants: [
        { size: 'S', stock: 15, minStock: 8 },
        { size: 'M', stock: 28, minStock: 8 },
        { size: 'L', stock: 2, minStock: 8 },
        { size: 'XL', stock: 31, minStock: 8 }
      ],
      lowStock: true
    },
    {
      id: '4',
      name: 'Kit de Bienvenida',
      category: 'regalo',
      description: 'Kit con artículos promocionales para nuevos afiliados',
      totalStock: 38,
      variants: [
        { stock: 38, minStock: 20 }
      ],
      lowStock: false
    }
  ];

  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesLowStock = !showLowStock || product.lowStock;
    
    return matchesSearch && matchesCategory && matchesLowStock;
  });

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
    initialItemsPerPage: 10
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'uniforme': return Shirt;
      case 'tapabocas': return Shield;
      case 'batas': return Package;
      case 'regalo': return Gift;
      default: return Package;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'uniforme': return 'bg-blue-100 text-blue-700';
      case 'tapabocas': return 'bg-green-100 text-green-700';
      case 'batas': return 'bg-purple-100 text-purple-700';
      case 'regalo': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'uniforme': return 'Uniformes';
      case 'tapabocas': return 'Tapabocas';
      case 'batas': return 'Batas';
      case 'regalo': return 'Regalos';
      case 'implemento': return 'Implementos';
      default: return category;
    }
  };

  const handleViewProduct = (product: ProductWithVariants) => {
    setSelectedProduct(product);
    setViewMode('details');
    setIsProductDialogOpen(true);
  };

  const handleEditProduct = (product: ProductWithVariants) => {
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
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nombre del Producto</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded border">{selectedProduct.name}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Categoría</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded border">{getCategoryLabel(selectedProduct.category)}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded border">{selectedProduct.description}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Stock Total</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded border font-semibold">{selectedProduct.totalStock} unidades</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Variantes del Producto</label>
            <div className="space-y-3">
              {selectedProduct.variants.map((variant, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded border">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {variant.size && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Talla:</span>
                        <p className="text-gray-900">{variant.size}</p>
                      </div>
                    )}
                    {variant.color && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Color:</span>
                        <p className="text-gray-900">{variant.color}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-600">Stock:</span>
                      <p className={`font-semibold ${variant.stock <= variant.minStock ? 'text-red-600' : 'text-green-600'}`}>
                        {variant.stock} / {variant.minStock} min
                      </p>
                    </div>
                  </div>
                </div>
              ))}
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
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
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
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="uniforme">Uniformes</SelectItem>
                  <SelectItem value="tapabocas">Tapabocas</SelectItem>
                  <SelectItem value="batas">Batas</SelectItem>
                  <SelectItem value="regalo">Regalos</SelectItem>
                  <SelectItem value="implemento">Implementos</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showLowStock ? "default" : "outline"}
                onClick={() => setShowLowStock(!showLowStock)}
                className="w-full md:w-auto"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Stock Bajo
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Products Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-md">
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
                    <TableHead>Stock Total</TableHead>
                    <TableHead>Variantes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((product) => {
                    const Icon = getCategoryIcon(product.category);
                    return (
                      <TableRow key={product.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-600 line-clamp-1">{product.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(product.category)}>
                            <Icon className="h-3 w-3 mr-1" />
                            {getCategoryLabel(product.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{product.totalStock}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {product.variants.length} variante{product.variants.length !== 1 ? 's' : ''}
                          </span>
                        </TableCell>
                        <TableCell>
                          {product.lowStock ? (
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
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewProduct(product)}
                              className="hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                              className="hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
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

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseDialog}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-6">
            {renderDialogContent()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;
