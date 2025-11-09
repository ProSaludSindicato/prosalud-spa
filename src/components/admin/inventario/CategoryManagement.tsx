import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useInventory } from '@/context/InventoryContext';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Edit,
  Shirt,
  Package,
  Gift,
  Shield,
  Activity,
  Truck,
  ClipboardList,
  ShoppingBag,
  Boxes,
  Tag,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CategoryFormState {
  name: string;
  description: string;
  icon?: string;
}

interface SubcategoryFormState {
  name: string;
  description: string;
}

const iconOptions = [
  { value: 'Package', icon: Package },
  { value: 'Shirt', icon: Shirt },
  { value: 'Gift', icon: Gift },
  { value: 'Shield', icon: Shield },
  { value: 'Activity', icon: Activity },
  { value: 'Truck', icon: Truck },
  { value: 'ClipboardList', icon: ClipboardList },
  { value: 'ShoppingBag', icon: ShoppingBag },
  { value: 'Boxes', icon: Boxes },
  { value: 'Tag', icon: Tag },
];

const getIconComponent = (value?: string) => {
  const match = iconOptions.find((option) => option.value === value);
  return match?.icon ?? Package;
};

const CategoryManagement: React.FC = () => {
  const {
    categories,
    addCategory,
    updateCategory,
    addSubcategory,
    updateSubcategory,
  } = useInventory();
  const { toast } = useToast();

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({
    name: '',
    description: '',
    icon: iconOptions[0].value,
  });
  const [editingSubcategory, setEditingSubcategory] = useState<{ categoryId: string; subcategoryId: string } | null>(null);
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryFormState>({ name: '', description: '' });
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', description: '', icon: iconOptions[0].value });
    setEditingCategoryId(null);
  };

  const resetSubcategoryForm = () => {
    setSubcategoryForm({ name: '', description: '' });
    setEditingSubcategory(null);
    setParentCategoryId(null);
  };

  const handleCreateCategory = () => {
    resetCategoryForm();
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    if (!category) return;
    setEditingCategoryId(categoryId);
    setCategoryForm({
      name: category.name,
      description: category.description ?? '',
      icon: category.icon ?? iconOptions[0].value,
    });
    setCategoryDialogOpen(true);
  };

  const handleSubmitCategory = () => {
    if (editingCategoryId) {
      updateCategory(editingCategoryId, {
        name: categoryForm.name,
        description: categoryForm.description,
        icon: categoryForm.icon,
      });
      toast({
        title: 'Categoría actualizada',
        description: `Se guardaron los cambios para "${categoryForm.name}".`,
      });
    } else {
      addCategory({
        name: categoryForm.name,
        description: categoryForm.description,
        icon: categoryForm.icon,
        subcategories: [],
      });
      toast({
        title: 'Categoría creada',
        description: `Se agregó la categoría "${categoryForm.name}" al inventario.`,
      });
    }
    setCategoryDialogOpen(false);
    resetCategoryForm();
  };

  const handleCreateSubcategory = (categoryId: string) => {
    resetSubcategoryForm();
    setParentCategoryId(categoryId);
    setSubcategoryDialogOpen(true);
  };

  const handleEditSubcategory = (categoryId: string, subcategoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    const subcategory = category?.subcategories.find((sub) => sub.id === subcategoryId);
    if (!category || !subcategory) return;
    setParentCategoryId(categoryId);
    setEditingSubcategory({ categoryId, subcategoryId });
    setSubcategoryForm({
      name: subcategory.name,
      description: subcategory.description ?? '',
    });
    setSubcategoryDialogOpen(true);
  };

  const handleSubmitSubcategory = () => {
    if (!parentCategoryId) return;
    if (editingSubcategory) {
      updateSubcategory(editingSubcategory.categoryId, editingSubcategory.subcategoryId, {
        name: subcategoryForm.name,
        description: subcategoryForm.description,
      });
      toast({
        title: 'Subcategoría actualizada',
        description: `Se guardaron los cambios para "${subcategoryForm.name}".`,
      });
    } else {
      addSubcategory(parentCategoryId, {
        name: subcategoryForm.name,
        description: subcategoryForm.description,
      });
      toast({
        title: 'Subcategoría creada',
        description: `Se agregó la subcategoría "${subcategoryForm.name}".`,
      });
    }

    setSubcategoryDialogOpen(false);
    resetSubcategoryForm();
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Categorías</h2>
          <p className="text-gray-600">
            Crea y organiza categorías y subcategorías para estructurar el inventario.
          </p>
        </div>
        <Button
          onClick={handleCreateCategory}
          className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {sortedCategories.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            Aún no has creado categorías. Empieza creando la primera categoría.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedCategories.map((category) => {
              const CategoryIcon = getIconComponent(category.icon);
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="h-full border border-gray-200">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-prosalud/10 text-primary-prosalud">
                            <CategoryIcon className="h-5 w-5" />
                          </span>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                            {category.description && (
                              <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-600 hover:text-gray-900"
                          onClick={() => handleEditCategory(category.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Subcategorías</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-primary-prosalud border-primary-prosalud hover:bg-primary-prosalud hover:text-white"
                          onClick={() => handleCreateSubcategory(category.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Añadir
                        </Button>
                      </div>

                      {category.subcategories.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Aún no hay subcategorías en esta categoría.
                        </p>
                      ) : (
                        <ScrollArea className="max-h-52 pr-2">
                          <div className="space-y-2">
                            {category.subcategories.map((subcategory) => (
                              <div
                                key={subcategory.id}
                                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {subcategory.name}
                                  </p>
                                  {subcategory.description && (
                                    <p className="text-xs text-gray-600">
                                      {subcategory.description}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-600 hover:text-gray-900"
                                  onClick={() =>
                                    handleEditSubcategory(category.id, subcategory.id)
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>
              {editingCategoryId ? 'Editar Categoría' : 'Nueva Categoría'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="category-name">
                Nombre de la categoría *
              </label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Ej: Uniformes"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="category-description">
                Descripción
              </label>
              <Textarea
                id="category-description"
                value={categoryForm.description}
                onChange={(event) =>
                  setCategoryForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Describe el tipo de productos que agrupa esta categoría."
                rows={3}
              />
            </div>
            <div className="space-y-3">
              <span className="text-sm font-medium text-gray-700">
                Icono de la categoría
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {iconOptions.map(({ value, icon: Icon }) => {
                  const isActive = categoryForm.icon === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCategoryForm((prev) => ({ ...prev, icon: value }))}
                      className={`flex items-center justify-center rounded-lg border p-3 transition-colors ${
                        isActive
                          ? 'border-primary-prosalud bg-primary-prosalud/10 text-primary-prosalud'
                          : 'border-gray-200 hover:border-primary-prosalud/50 hover:bg-primary-prosalud/5'
                      }`}
                      aria-label={`Seleccionar icono ${value}`}
                      aria-pressed={isActive}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">
                Selecciona un icono genérico para identificar visualmente la categoría en el inventario.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setCategoryDialogOpen(false); resetCategoryForm(); }}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitCategory}
                disabled={!categoryForm.name.trim()}
                className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
              >
                {editingCategoryId ? 'Guardar cambios' : 'Crear categoría'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subcategory Dialog */}
      <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>
              {editingSubcategory ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="subcategory-name">
                Nombre de la subcategoría *
              </label>
              <Input
                id="subcategory-name"
                value={subcategoryForm.name}
                onChange={(event) =>
                  setSubcategoryForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Ej: Quirúrgicos"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="subcategory-description">
                Descripción
              </label>
              <Textarea
                id="subcategory-description"
                value={subcategoryForm.description}
                onChange={(event) =>
                  setSubcategoryForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Describe los productos que pertenecen a esta subcategoría."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSubcategoryDialogOpen(false);
                  resetSubcategoryForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitSubcategory}
                disabled={!subcategoryForm.name.trim()}
                className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
              >
                {editingSubcategory ? 'Guardar cambios' : 'Agregar subcategoría'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManagement;


