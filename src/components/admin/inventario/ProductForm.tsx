
import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  category: z.enum(['uniforme', 'tapabocas', 'batas', 'regalo', 'implemento']),
  description: z.string().optional(),
  variants: z.array(z.object({
    size: z.string().optional(),
    color: z.string().optional(),
    stock: z.number().refine((val) => val >= 0, {
      message: 'El stock debe ser mayor o igual a 0',
    }),
    minStock: z.number().refine((val) => val >= 0, {
      message: 'El stock mínimo debe ser mayor o igual a 0',
    }),
    maxStock: z.number().refine((val) => val > 0, {
      message: 'El stock máximo debe ser mayor a 0',
    }),
    sku: z.string().min(1, 'El SKU es requerido')
  })).min(1, 'Debe tener al menos una variante')
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: any;
  onClose: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onClose }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      name: product.name,
      category: product.category,
      description: product.description,
      variants: product.variants?.map((v: any) => ({
        size: v.size || '',
        color: v.color || '',
        stock: v.stock || 0,
        minStock: v.minStock || 0,
        maxStock: v.maxStock || 100,
        sku: v.sku || `${product.name.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      })) || []
    } : {
      name: '',
      category: 'uniforme',
      description: '',
      variants: [{
        size: '',
        color: '',
        stock: 0,
        minStock: 0,
        maxStock: 100,
        sku: ''
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variants'
  });

  const selectedCategory = form.watch('category');

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: product ? "Producto actualizado" : "Producto creado",
        description: `El producto "${data.name}" ha sido ${product ? 'actualizado' : 'creado'} exitosamente.`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un problema al guardar el producto",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addVariant = () => {
    append({
      size: '',
      color: '',
      stock: 0,
      minStock: 0,
      maxStock: 100,
      sku: ''
    });
  };

  const generateSKU = (index: number) => {
    const productName = form.getValues('name');
    const variant = form.getValues(`variants.${index}`);
    
    if (productName) {
      const baseSKU = productName.substring(0, 3).toUpperCase();
      const sizePart = variant.size ? `-${variant.size}` : '';
      const colorPart = variant.color ? `-${variant.color.substring(0, 2).toUpperCase()}` : '';
      const randomPart = Math.random().toString(36).substr(2, 4).toUpperCase();
      
      const newSKU = `${baseSKU}${sizePart}${colorPart}-${randomPart}`;
      form.setValue(`variants.${index}.sku`, newSKU);
    }
  };

  const categoryOptions = [
    { value: 'uniforme', label: 'Uniformes' },
    { value: 'tapabocas', label: 'Tapabocas' },
    { value: 'batas', label: 'Batas' },
    { value: 'regalo', label: 'Regalos' },
    { value: 'implemento', label: 'Implementos' }
  ];

  const hasVariantFields = selectedCategory === 'uniforme' || selectedCategory === 'batas';

  return (
    <div className="bg-white min-h-full">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-prosalud/10 p-2 rounded-lg">
            <Package className="h-6 w-6 text-primary-prosalud" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {product ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <p className="text-sm text-gray-600">
              {product ? 'Modifica la información del producto' : 'Agrega un nuevo producto al inventario'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Información Básica */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Nombre del Producto *
                  </Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="Ej: Uniforme Quirúrgico"
                    className="bg-gray-50 border-gray-300"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                    Categoría *
                  </Label>
                  <Select
                    value={form.watch('category')}
                    onValueChange={(value) => form.setValue('category', value as any)}
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-300">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.category && (
                    <p className="text-sm text-red-500">{form.formState.errors.category.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Descripción detallada del producto..."
                  rows={3}
                  className="bg-gray-50 border-gray-300"
                />
              </div>
            </CardContent>
          </Card>

          {/* Variantes del Producto */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">Variantes del Producto</CardTitle>
                <Button type="button" onClick={addVariant} size="sm" variant="outline" className="border-primary-prosalud text-primary-prosalud hover:bg-primary-prosalud hover:text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Variante
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-white">Variante {index + 1}</Badge>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hasVariantFields && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Talla</Label>
                          <Select
                            value={form.watch(`variants.${index}.size`) || ''}
                            onValueChange={(value) => form.setValue(`variants.${index}.size`, value)}
                          >
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Seleccionar talla" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="XS">XS</SelectItem>
                              <SelectItem value="S">S</SelectItem>
                              <SelectItem value="M">M</SelectItem>
                              <SelectItem value="L">L</SelectItem>
                              <SelectItem value="XL">XL</SelectItem>
                              <SelectItem value="XXL">XXL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Color</Label>
                          <Select
                            value={form.watch(`variants.${index}.color`) || ''}
                            onValueChange={(value) => form.setValue(`variants.${index}.color`, value)}
                          >
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Seleccionar color" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Azul">Azul</SelectItem>
                              <SelectItem value="Verde">Verde</SelectItem>
                              <SelectItem value="Blanco">Blanco</SelectItem>
                              <SelectItem value="Gris">Gris</SelectItem>
                              <SelectItem value="Rosa">Rosa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Stock Actual *</Label>
                      <Input
                        type="number"
                        {...form.register(`variants.${index}.stock`, { 
                          valueAsNumber: true,
                          setValueAs: (value: string) => {
                            if (value === '') return 0;
                            const num = parseFloat(value);
                            return isNaN(num) ? 0 : num;
                          }
                        })}
                        placeholder="0"
                        className="bg-white border-gray-300"
                        value={form.watch(`variants.${index}.stock`) ?? ''}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Stock Mínimo *</Label>
                      <Input
                        type="number"
                        {...form.register(`variants.${index}.minStock`, { 
                          valueAsNumber: true,
                          setValueAs: (value: string) => {
                            if (value === '') return 0;
                            const num = parseFloat(value);
                            return isNaN(num) ? 0 : num;
                          }
                        })}
                        placeholder="0"
                        className="bg-white border-gray-300"
                        value={form.watch(`variants.${index}.minStock`) ?? ''}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Stock Máximo *</Label>
                      <Input
                        type="number"
                        {...form.register(`variants.${index}.maxStock`, { 
                          valueAsNumber: true,
                          setValueAs: (value: string) => {
                            if (value === '') return 0;
                            const num = parseFloat(value);
                            return isNaN(num) ? 0 : num;
                          }
                        })}
                        placeholder="100"
                        className="bg-white border-gray-300"
                        value={form.watch(`variants.${index}.maxStock`) ?? ''}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">SKU *</Label>
                      <div className="flex space-x-2">
                        <Input
                          {...form.register(`variants.${index}.sku`)}
                          placeholder="Código único"
                          className="bg-white border-gray-300"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => generateSKU(index)}
                        >
                          Generar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
            >
              {isSubmitting ? 'Guardando...' : (product ? 'Actualizar' : 'Crear')} Producto
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
