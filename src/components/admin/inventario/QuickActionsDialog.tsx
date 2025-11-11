
import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Package, 
  ClipboardList,
  Eye,
  Tag,
  ArrowRight,
} from 'lucide-react';
import ProductForm from './ProductForm';
import LowStockDialog from './LowStockDialog';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '@/context/InventoryContext';

interface QuickActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QuickActionsDialog: React.FC<QuickActionsDialogProps> = ({ open, onOpenChange }) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const navigate = useNavigate();
  const { products, categories } = useInventory();

  const lowStockItems = useMemo(() => {
    const categoryMap = new Map(categories.map((category) => [category.id, category.name]));

    return products.flatMap((product) =>
      product.variants
        .filter((variant) => (variant.stock ?? 0) <= (variant.minStock ?? 0))
        .map((variant) => {
          const stock = variant.stock ?? 0;
          const minStock = variant.minStock ?? 0;
          const status: 'critical' | 'low' = stock <= 0 ? 'critical' : 'low';
          return {
            id: `${product.id}-${variant.id}`,
            name: `${product.name}${variant.size ? ` · Talla ${variant.size}` : ''}${
              variant.colorId ? ` · ${variant.colorId}` : ''
            }`,
            category: categoryMap.get(product.categoryId ?? product.category?.id ?? '') ?? 'Sin categoría',
            current: stock,
            min: minStock,
            status,
          };
        }),
    );
  }, [products, categories]);

  const actions: Array<{
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    textColor: string;
    onSelect?: () => void;
  }> = [
    {
      id: 'add-product',
      title: 'Agregar Producto',
      description: 'Registrar un nuevo producto en el inventario',
      icon: Package,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
    },
    {
      id: 'open-categories',
      title: 'Gestionar Categorías',
      description: 'Organiza categorías y subcategorías del inventario',
      icon: Tag,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      onSelect: () => {
        onOpenChange(false);
        navigate('/admin/inventario?tab=categories');
      },
    },
    {
      id: 'open-hospital-requests',
      title: 'Solicitudes de Hospitales',
      description: 'Revisa y gestiona las solicitudes de dotación',
      icon: ClipboardList,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      onSelect: () => {
        onOpenChange(false);
        navigate('/admin/inventario?tab=hospital-requests');
      },
    },
    {
      id: 'view-low-stock',
      title: 'Ver Stock Bajo',
      description: 'Revisar productos con stock bajo',
      icon: Eye,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
    },
  ];

  const handleActionSelect = (actionId: string) => {
    const action = actions.find((item) => item.id === actionId);
    if (action?.onSelect) {
      action.onSelect();
      return;
    }
    setSelectedAction(actionId);
  };

  const handleClose = () => {
    setSelectedAction(null);
    onOpenChange(false);
  };

  const renderActionForm = () => {
    switch (selectedAction) {
      case 'add-product':
        return (
          <Dialog open={true} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
              <ProductForm onClose={handleClose} />
            </DialogContent>
          </Dialog>
        );
      case 'view-low-stock':
        return <LowStockDialog open={true} onOpenChange={() => handleClose()} items={lowStockItems} />;
      default:
        return null;
    }
  };

  if (selectedAction) {
    if (selectedAction === 'add-product' || selectedAction === 'view-low-stock') {
      return renderActionForm();
    }
    
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          {renderActionForm()}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary-prosalud">Acciones Rápidas</DialogTitle>
          <DialogDescription>
            Selecciona una acción para realizar rápidamente
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-md transition-all duration-200 border-2 hover:border-primary-prosalud/30"
                  onClick={() => handleActionSelect(action.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${action.color} bg-opacity-10`}>
                          <Icon className={`h-6 w-6 ${action.textColor}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{action.title}</h3>
                          <p className="text-sm text-gray-600">{action.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickActionsDialog;
