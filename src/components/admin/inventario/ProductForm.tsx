import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useInventory } from '@/context/InventoryContext';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';
import {
  InventoryProduct,
  InventoryVariantMode,
  ProductVariant,
  InventorySize,
  InventoryGender,
  INVENTORY_SIZES,
  INVENTORY_GENDERS,
  INVENTORY_CLOTHING_SIZES,
  INVENTORY_FOOTWEAR_SIZES,
  INVENTORY_MEN_PANTS_SIZES,
  INVENTORY_WOMEN_PANTS_SIZES,
} from '@/types/inventory';

type NumericVariantField = 'stock' | 'minStock' | 'maxStock';

const variantModeOptions: { value: InventoryVariantMode; label: string; description: string }[] = [
  {
    value: 'simple',
    label: 'Stock único',
    description: 'Mantiene un solo nivel de inventario sin combinaciones.',
  },
  {
    value: 'color',
    label: 'Variantes por color',
    description: 'Genera una fila de stock por cada color seleccionado.',
  },
  {
    value: 'size',
    label: 'Variantes por talla',
    description: 'Genera una fila de stock por cada talla seleccionada.',
  },
  {
    value: 'size_color',
    label: 'Talla + Color',
    description: 'Combina tallas y colores para generar todas las variantes necesarias.',
  },
];

const parseNumberInput = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '+') {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
};

const productSchema = z
  .object({
  name: z.string().min(1, 'El nombre es requerido'),
    categoryId: z.string().min(1, 'La categoría es requerida'),
    subcategoryId: z.string().optional(),
  description: z.string().optional(),
    gender: z.enum(INVENTORY_GENDERS).optional(),
    variantMode: z.enum(['simple', 'size', 'color', 'size_color']),
    selectedSizes: z.array(z.string()).optional(),
    selectedColors: z.array(z.string()).optional(),
    variants: z.array(
      z.object({
        id: z.string(),
        size: z.string().optional(), // Changed from enum to string
        colorId: z.string().optional(),
        stock: z.number().min(0, 'El stock debe ser mayor o igual a 0'),
        minStock: z.number().min(0, 'El stock mínimo debe ser mayor o igual a 0'),
        maxStock: z.number().min(1, 'El stock máximo debe ser mayor a 0'),
        sku: z.string(),
      }),
    ),
  })
  .superRefine((data, ctx) => {
    const sizes = data.selectedSizes ?? [];
    const colors = data.selectedColors ?? [];

    if (data.variantMode === 'simple' && data.variants.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['variants'],
        message: 'Debe existir exactamente una variante para productos sin combinaciones.',
      });
    }

    if ((data.variantMode === 'size' || data.variantMode === 'size_color') && !sizes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedSizes'],
        message: 'Selecciona al menos una talla.',
      });
    }

    if ((data.variantMode === 'color' || data.variantMode === 'size_color') && !colors.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedColors'],
        message: 'Selecciona al menos un color.',
      });
    }

    if (data.variantMode !== 'simple' && !data.variants.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['variants'],
        message: 'Configura al menos una combinación de variantes.',
      });
    }
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: InventoryProduct | null;
  onClose: () => void;
}

const inferVariantMode = (item?: InventoryProduct | null): InventoryVariantMode => {
  if (!item) return 'simple';
  if (item.variantMode) return item.variantMode;
  const variants = item.variants ?? [];
  const hasSize = variants.some((variant) => !!variant.size);
  const hasColor = variants.some((variant) => !!variant.colorId);
  if (hasSize && hasColor) return 'size_color';
  if (hasSize) return 'size';
  if (hasColor) return 'color';
  return 'simple';
};

const extractSelectedSizes = (item?: InventoryProduct | null) => {
  if (!item) return [];
  const set = new Set<string>();
  item.variants?.forEach((variant) => {
    if (variant.size) set.add(variant.size);
  });
  return Array.from(set);
};

const extractSelectedColors = (item?: InventoryProduct | null) => {
  if (!item) return [];
  const set = new Set<string>();
  item.variants?.forEach((variant) => {
    if (variant.colorId) set.add(variant.colorId);
  });
  return Array.from(set);
};

const variantKey = (size?: string, colorId?: string) => `${size ?? ''}__${colorId ?? ''}`;

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const createSku = (productName: string, size?: string, colorId?: string) => {
  const sanitizedName = productName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const base = sanitizedName.substring(0, 3) || 'SKU';
  const sizePart = size ? `-${size}` : '';
  const colorPart = colorId ? `-${colorId}` : '';
  return `${base}${sizePart}${colorPart}`;
};

const ProductForm: React.FC<ProductFormProps> = ({ product, onClose }) => {
  const { toast } = useToast();
  const { categories, colorOptions, sizeOptions, addProduct, updateProduct } = useInventory();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Security: Use centralized sanitization hook
  const { sanitizeText, sanitizeGeneral } = useSanitizedInput();

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  const defaultVariantMode = inferVariantMode(product);
  const defaultSelectedSizes = extractSelectedSizes(product);
  const defaultSelectedColors = extractSelectedColors(product);

  const firstVariant = product?.variants?.[0];
  const [defaultVariantValues, setDefaultVariantValues] = useState<{ stock?: number; minStock?: number; maxStock?: number }>(() => ({
    stock: firstVariant?.stock,
    minStock: firstVariant?.minStock,
    maxStock: firstVariant?.maxStock,
  }));

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      categoryId: product?.categoryId || product?.category?.id || sortedCategories[0]?.id || '',
      subcategoryId: product?.subcategoryId || product?.subcategory?.id,
      description: product?.description ?? '',
      gender: product?.gender ?? undefined,
      variantMode: product?.variantMode || product?.variant_mode || defaultVariantMode,
      selectedSizes: defaultSelectedSizes,
      selectedColors: defaultSelectedColors,
      variants:
        product?.variants?.map((variant) => ({
          id: variant.id,
          size: variant.size ?? undefined,
          colorId: variant.colorId ?? undefined,
          stock: variant.stock ?? defaultVariantValues.stock,
          minStock: variant.minStock ?? defaultVariantValues.minStock,
          maxStock: variant.maxStock ?? defaultVariantValues.maxStock,
          sku: variant.sku,
        })) ?? [
          {
            id: generateId(),
            size: undefined,
            colorId: undefined,
            stock: defaultVariantValues.stock,
            minStock: defaultVariantValues.minStock,
            maxStock: defaultVariantValues.maxStock,
            sku: '',
          },
        ],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'variants',
  });

  const {
    formState: { errors: formErrors },
  } = form;

  const selectedCategoryId = useWatch({ control: form.control, name: 'categoryId' });
  const selectedSubcategoryId = useWatch({ control: form.control, name: 'subcategoryId' });
  const variantMode = useWatch({ control: form.control, name: 'variantMode' });
  const selectedSizes = useWatch({ control: form.control, name: 'selectedSizes' }) ?? [];
  const selectedColors = useWatch({ control: form.control, name: 'selectedColors' }) ?? [];
  const genderValue = useWatch({ control: form.control, name: 'gender' }) as InventoryGender | undefined;
  const genderSelectValue = (genderValue ?? '__none__') as InventoryGender | '__none__';
  const clothingSizes = useMemo(() => INVENTORY_SIZES.filter((size) => INVENTORY_CLOTHING_SIZES.includes(size as any)), []);
  const footwearSizes = useMemo(() => INVENTORY_SIZES.filter((size) => INVENTORY_FOOTWEAR_SIZES.includes(size as any)), []);
  const menPantsSizes = useMemo(() => INVENTORY_MEN_PANTS_SIZES, []);
  const womenPantsSizes = useMemo(() => INVENTORY_WOMEN_PANTS_SIZES, []);
  const selectedClothingSizes = selectedSizes.filter((size) => clothingSizes.includes(size as InventorySize)) as InventorySize[];
  const selectedFootwearSizes = selectedSizes.filter((size) => footwearSizes.includes(size as InventorySize)) as InventorySize[];
  const selectedMenPantsSizes = selectedSizes.filter((size) => menPantsSizes.includes(size as any));
  const selectedWomenPantsSizes = selectedSizes.filter((size) => womenPantsSizes.includes(size as any));
 
   const handleToggleSize = useCallback(
    (size: string, category: 'clothing' | 'footwear' | 'menPants' | 'womenPants') => {
      const isClothing = clothingSizes.includes(size as InventorySize);
      const isFootwear = footwearSizes.includes(size as InventorySize);
      const isMenPants = menPantsSizes.includes(size as any);
      const isWomenPants = womenPantsSizes.includes(size as any);
      const current = new Set(selectedSizes);

      // Check if size exists in multiple categories
      const existsInMultiple = [
        (isClothing ? 1 : 0) + (isFootwear ? 1 : 0) + (isMenPants ? 1 : 0) + (isWomenPants ? 1 : 0)
      ].filter(Boolean).length > 1;

      // Clear other main categories when selecting from a different main category
      // But allow mixing within pants categories (men + women)
      if (category === 'clothing' && (selectedFootwearSizes.length > 0 || selectedMenPantsSizes.length > 0 || selectedWomenPantsSizes.length > 0)) {
        footwearSizes.forEach((footwearSize) => current.delete(footwearSize));
        menPantsSizes.forEach((menPantsSize) => current.delete(menPantsSize));
        womenPantsSizes.forEach((womenPantsSize) => current.delete(womenPantsSize));
      }
      if (category === 'footwear' && (selectedClothingSizes.length > 0 || selectedMenPantsSizes.length > 0 || selectedWomenPantsSizes.length > 0)) {
        clothingSizes.forEach((clothingSize) => current.delete(clothingSize));
        menPantsSizes.forEach((menPantsSize) => current.delete(menPantsSize));
        womenPantsSizes.forEach((womenPantsSize) => current.delete(womenPantsSize));
      }
      if (category === 'menPants' && (selectedClothingSizes.length > 0 || selectedFootwearSizes.length > 0)) {
        // Only clear clothing and footwear, allow mixing with women's pants
        clothingSizes.forEach((clothingSize) => current.delete(clothingSize));
        footwearSizes.forEach((footwearSize) => current.delete(footwearSize));
      }
      if (category === 'womenPants' && (selectedClothingSizes.length > 0 || selectedFootwearSizes.length > 0)) {
        // Only clear clothing and footwear, allow mixing with men's pants
        clothingSizes.forEach((clothingSize) => current.delete(clothingSize));
        footwearSizes.forEach((footwearSize) => current.delete(footwearSize));
      }

      if (current.has(size)) {
        current.delete(size);
      } else {
        current.add(size);
      }

      const nextSizes = Array.from(current);
      form.setValue('selectedSizes', nextSizes, { shouldDirty: true, shouldValidate: true });
    },
    [clothingSizes, footwearSizes, menPantsSizes, womenPantsSizes, form, selectedSizes, selectedClothingSizes.length, selectedFootwearSizes.length, selectedMenPantsSizes.length, selectedWomenPantsSizes.length],
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );
  const subcategoryOptions = selectedCategory?.subcategories ?? [];

  useEffect(() => {
    if (!selectedCategory) {
      form.setValue('subcategoryId', undefined);
      return;
    }

    const isStillValid = subcategoryOptions.some((subcategory) => subcategory.id === selectedSubcategoryId);
    if (!isStillValid) {
      form.setValue('subcategoryId', undefined);
    }
  }, [selectedCategory, selectedSubcategoryId, subcategoryOptions, form]);

  useEffect(() => {
    if (variantMode === 'simple') {
      if (selectedSizes.length) form.setValue('selectedSizes', []);
      if (selectedColors.length) form.setValue('selectedColors', []);
    } else if (variantMode === 'size' && selectedColors.length) {
      form.setValue('selectedColors', []);
    } else if (variantMode === 'color' && selectedSizes.length) {
      form.setValue('selectedSizes', []);
    }
  }, [variantMode, selectedSizes.length, selectedColors.length, form]);

  useEffect(() => {
    const currentVariants = form.getValues('variants');
    const existingMap = new Map<string, ProductVariant>();
    currentVariants.forEach((variant) => {
      if (variant.id && variant.sku) {
        existingMap.set(variantKey(variant.size, variant.colorId), variant as ProductVariant);
      }
    });

    const productName = form.getValues('name');

    if (variantMode === 'simple') {
      const existing = currentVariants[0];
      replace([
        {
          id: existing?.id ?? generateId(),
          size: undefined,
          colorId: undefined,
          stock: existing?.stock ?? defaultVariantValues.stock,
          minStock: existing?.minStock ?? defaultVariantValues.minStock,
          maxStock: existing?.maxStock ?? defaultVariantValues.maxStock,
          sku: existing?.sku ?? createSku(productName, undefined, undefined),
        },
      ]);
      return;
    }

    const combos: Array<{ size?: string; colorId?: string }> = [];
    if (variantMode === 'size') {
      selectedSizes.forEach((size) => combos.push({ size }));
    } else if (variantMode === 'color') {
      selectedColors.forEach((colorId) => combos.push({ colorId }));
    } else if (variantMode === 'size_color') {
      selectedSizes.forEach((size) => {
        selectedColors.forEach((colorId) => combos.push({ size, colorId }));
      });
    }

    const nextVariants = combos.map(({ size, colorId }) => {
      const existing = existingMap.get(variantKey(size, colorId));
      return {
        id: existing?.id ?? generateId(),
        size,
        colorId,
        stock: existing?.stock ?? defaultVariantValues.stock,
        minStock: existing?.minStock ?? defaultVariantValues.minStock,
        maxStock: existing?.maxStock ?? defaultVariantValues.maxStock,
        sku: existing?.sku ?? createSku(productName, size, colorId),
      };
    });

    replace(nextVariants);
  }, [variantMode, selectedSizes.join(','), selectedColors.join(','), defaultVariantValues, replace, form]);

  const updateDefaultValue = useCallback(
    (field: NumericVariantField, rawValue: string) => {
      const safeValue = parseNumberInput(rawValue);
      setDefaultVariantValues((prev) => ({ ...prev, [field]: safeValue }));

      const current = form.getValues('variants');
      if (!current.length) return;

      current.forEach((_, index) => {
        form.setValue(`variants.${index}.${field}` as const, safeValue, { shouldDirty: true });
      });
    },
    [form],
  );

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));

      const ensureSku = (variant: ProductVariant): ProductVariant => ({
        ...variant,
        sku: createSku(data.name, variant.size, variant.colorId),
      });

      if (product) {
        const variants: ProductVariant[] = data.variants.map((variant, index) => {
          const existingId = product.variants[index]?.id;
          return ensureSku({
            id: variant.id ?? existingId,
            size: variant.size || undefined,
            colorId: variant.colorId || undefined,
            stock: variant.stock,
            minStock: variant.minStock,
            maxStock: variant.maxStock,
            sku: variant.sku,
          });
        });

        updateProduct(product.id, {
          name: data.name,
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId || undefined,
          description: data.description,
          gender: data.gender,
          variantMode: data.variantMode,
          variants,
        });
      } else {
        addProduct({
          name: data.name,
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId || undefined,
          description: data.description,
          gender: data.gender,
          variantMode: data.variantMode,
          variants: data.variants.map((variant) =>
            ensureSku({
              id: variant.id,
              size: variant.size || undefined,
              colorId: variant.colorId || undefined,
              stock: variant.stock,
              minStock: variant.minStock,
              maxStock: variant.maxStock,
              sku: variant.sku,
            }),
          ),
        });
      }
      
      toast({
        title: product ? 'Producto actualizado' : 'Producto creado',
        description: `El producto "${data.name}" ha sido ${product ? 'actualizado' : 'creado'} exitosamente.`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Hubo un problema al guardar el producto',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateVariantValue = useCallback(
    (index: number, field: NumericVariantField, rawValue: string) => {
      const safeValue = parseNumberInput(rawValue);
      form.setValue(`variants.${index}.${field}` as const, safeValue, { shouldDirty: true });
    },
    [form],
  );
  const getVariantFieldError = useCallback(
    (index: number, field: NumericVariantField): string | undefined => {
      const variantError = (formErrors.variants as Array<any> | undefined)?.[index];
      if (!variantError) return undefined;
      const fieldError = variantError?.[field];
      if (!fieldError) return undefined;
      if (typeof fieldError === 'string') return fieldError;
      return fieldError.message;
    },
    [formErrors.variants],
  );

  const variantValues = useWatch({ control: form.control, name: 'variants' }) ?? [];
      
  const toggleColor = (colorId: string) => {
    const current = new Set(selectedColors);
    if (current.has(colorId)) {
      current.delete(colorId);
    } else {
      current.add(colorId);
    }
    form.setValue('selectedColors', Array.from(current), { shouldDirty: true });
  };

  const getInputClass = (error?: string) => {
    if (error) {
      return 'bg-red-50 border-red-500 text-red-900 placeholder-red-700 focus:ring-red-500 focus:border-red-500';
    }
    return 'bg-white border-gray-300';
  };

  const renderVariantRows = () => {
    if (variantMode === 'simple') {
      return variantValues.map((variant, index) => {
        const stockError = getVariantFieldError(index, 'stock');
        const minStockError = getVariantFieldError(index, 'minStock');
        const maxStockError = getVariantFieldError(index, 'maxStock');

  return (
          <div key={fields[index]?.id ?? index} className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Stock actual *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  className={getInputClass(stockError)}
                  aria-invalid={!!stockError}
                  value={variant.stock ?? ''}
                  onChange={(event) => updateVariantValue(index, 'stock', event.target.value)}
                />
                {stockError && <p className="text-xs text-red-500">{stockError}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Stock mínimo *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  className={getInputClass(minStockError)}
                  aria-invalid={!!minStockError}
                  value={variant.minStock ?? ''}
                  onChange={(event) => updateVariantValue(index, 'minStock', event.target.value)}
                />
                {minStockError && <p className="text-xs text-red-500">{minStockError}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Stock máximo *</Label>
                <Input
                  type="number"
                  placeholder="100"
                  className={getInputClass(maxStockError)}
                  aria-invalid={!!maxStockError}
                  value={variant.maxStock ?? ''}
                  onChange={(event) => updateVariantValue(index, 'maxStock', event.target.value)}
                />
                {maxStockError && <p className="text-xs text-red-500">{maxStockError}</p>}
              </div>
            </div>
          </div>
        );
      });
    }

    if (!variantValues.length) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
          Selecciona tallas y/o colores para generar las combinaciones de inventario.
        </div>
      );
    }

    if (variantMode === 'color' || variantMode === 'size') {
      return (
        <div className="space-y-3">
          {variantValues.map((variant, index) => {
            const stockError = getVariantFieldError(index, 'stock');
            const minStockError = getVariantFieldError(index, 'minStock');
            const maxStockError = getVariantFieldError(index, 'maxStock');
            const color = colorOptions.find((option) => option.id === variant.colorId);

            return (
              <div
                key={fields[index]?.id ?? index}
                className="grid grid-cols-1 md:grid-cols-5 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-center gap-3 md:col-span-2">
                  {variantMode === 'color' ? (
                    <>
                      <span
                        className="h-8 w-8 rounded-full border border-gray-200"
                        style={{ backgroundColor: color?.hex ?? '#ffffff' }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{color?.label ?? 'Color'}</span>
                      </div>
                    </>
                  ) : (
                    <Badge className="bg-primary-prosalud/10 text-primary-prosalud">Talla {variant.size ?? '—'}</Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Stock *</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    className={getInputClass(stockError)}
                    aria-invalid={!!stockError}
                    value={variant.stock ?? ''}
                    onChange={(event) => updateVariantValue(index, 'stock', event.target.value)}
                  />
                  {stockError && <p className="text-xs text-red-500">{stockError}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Mínimo *</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    className={getInputClass(minStockError)}
                    aria-invalid={!!minStockError}
                    value={variant.minStock ?? ''}
                    onChange={(event) => updateVariantValue(index, 'minStock', event.target.value)}
                  />
                  {minStockError && <p className="text-xs text-red-500">{minStockError}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Máximo *</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    className={getInputClass(maxStockError)}
                    aria-invalid={!!maxStockError}
                    value={variant.maxStock ?? ''}
                    onChange={(event) => updateVariantValue(index, 'maxStock', event.target.value)}
                  />
                  {maxStockError && <p className="text-xs text-red-500">{maxStockError}</p>}
                </div>
          </div>
            );
          })}
        </div>
      );
    }

    if (variantMode === 'size_color') {
      const grouped = variantValues.reduce<
        Record<string, { size?: string; items: { variant: typeof variantValues[number]; index: number }[] }>
      >((acc, variant, index) => {
        const key = variant.size ?? 'Sin talla';
        if (!acc[key]) {
          acc[key] = { size: variant.size, items: [] };
        }
        acc[key].items.push({ variant, index });
        return acc;
      }, {});

      return (
        <div className="space-y-5">
          {Object.entries(grouped).map(([sizeKey, group]) => (
            <div key={sizeKey} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary-prosalud/10 text-primary-prosalud">Talla {group.size ?? '—'}</Badge>
                <span className="text-xs text-gray-500">
                  {group.items.length} color{group.items.length !== 1 ? 'es' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {group.items.map(({ variant, index }) => {
                  const color = colorOptions.find((option) => option.id === variant.colorId);
                  const stockError = getVariantFieldError(index, 'stock');
                  const minStockError = getVariantFieldError(index, 'minStock');
                  const maxStockError = getVariantFieldError(index, 'maxStock');

                  return (
                    <div key={fields[index]?.id ?? index} className="space-y-3 rounded-md border border-gray-200 bg-white p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-6 w-6 rounded-full border border-gray-200"
                          style={{ backgroundColor: color?.hex ?? '#ffffff' }}
                        />
                        <div className="flex flex-col leading-tight">
                          <span className="text-sm font-medium text-gray-900">{color?.label ?? 'Color'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-gray-600">Stock</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            className={getInputClass(stockError)}
                            aria-invalid={!!stockError}
                            value={variant.stock ?? ''}
                            onChange={(event) => updateVariantValue(index, 'stock', event.target.value)}
                          />
                          {stockError && <p className="text-[11px] text-red-500">{stockError}</p>}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-gray-600">Mínimo</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            className={getInputClass(minStockError)}
                            aria-invalid={!!minStockError}
                            value={variant.minStock ?? ''}
                            onChange={(event) => updateVariantValue(index, 'minStock', event.target.value)}
                          />
                          {minStockError && <p className="text-[11px] text-red-500">{minStockError}</p>}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-gray-600">Máximo</Label>
                          <Input
                            type="number"
                            placeholder="100"
                            className={getInputClass(maxStockError)}
                            aria-invalid={!!maxStockError}
                            value={variant.maxStock ?? ''}
                            onChange={(event) => updateVariantValue(index, 'maxStock', event.target.value)}
                          />
                          {maxStockError && <p className="text-[11px] text-red-500">{maxStockError}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    value={form.watch('name')}
                    placeholder="Ej: Uniforme Quirúrgico"
                    className="bg-gray-50 border-gray-300"
                    onChange={(e) => {
                      // Security: Sanitize product name input
                      const sanitized = sanitizeText(e.target.value, { maxLength: 200, allowSpaces: true });
                      form.setValue('name', sanitized, { shouldValidate: true });
                    }}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                <Label htmlFor="categoryId" className="text-sm font-medium text-gray-700">
                    Categoría *
                  </Label>
                  <Select
                  value={selectedCategoryId || undefined}
                  onValueChange={(value) => form.setValue('categoryId', value)}
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-300">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                    {sortedCategories.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                {form.formState.errors.categoryId && (
                  <p className="text-sm text-red-500">{form.formState.errors.categoryId.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subcategoryId" className="text-sm font-medium text-gray-700">
                    Subcategoría
                  </Label>
                  <Select
                    value={form.watch('subcategoryId') || undefined}
                    onValueChange={(value) =>
                      form.setValue('subcategoryId', value === '__none__' ? undefined : value, {
                        shouldDirty: true,
                      })
                    }
                    disabled={!subcategoryOptions.length}
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-300">
                      {subcategoryOptions.length ? (
                        <SelectValue placeholder="Seleccionar subcategoría" />
                      ) : (
                        <span className="text-sm text-gray-400">No hay subcategorías disponibles</span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin subcategoría</SelectItem>
                      {subcategoryOptions.map((subcategory) => (
                        <SelectItem key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Género</Label>
                  <Select
                    value={genderSelectValue}
                    onValueChange={(value) =>
                      form.setValue('gender', value === '__none__' ? undefined : (value as InventoryGender), {
                        shouldDirty: true,
                      })
                    }
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-300">
                      <SelectValue placeholder="Sin especificar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin especificar</SelectItem>
                      {INVENTORY_GENDERS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  value={form.watch('description') || ''}
                  placeholder="Descripción detallada del producto..."
                  rows={3}
                  className="bg-gray-50 border-gray-300"
                  onChange={(e) => {
                    // Security: Sanitize description input
                    const sanitized = sanitizeGeneral(e.target.value, { maxLength: 1000 });
                    form.setValue('description', sanitized, { shouldValidate: true });
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">Variantes del Producto</CardTitle>
            </CardHeader>
          <CardContent className="p-6 space-y-6">
                        <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Tipo de variación *</Label>
                          <Select
                value={variantMode}
                onValueChange={(value) => form.setValue('variantMode', value as InventoryVariantMode)}
                          >
                <SelectTrigger className="bg-white border-gray-300 justify-start">
                  <SelectValue className="text-left" />
                            </SelectTrigger>
                            <SelectContent>
                  {variantModeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="group">
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-gray-500 group-hover:text-white">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                            </SelectContent>
                          </Select>
                        </div>

            {variantMode !== 'simple' && (
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Stock actual por defecto</Label>
                      <Input
                        type="number"
                        value={defaultVariantValues.stock ?? ''}
                        onChange={(event) => updateDefaultValue('stock', event.target.value)}
                        className="bg-white border-gray-300"
                      />
                    </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Stock mínimo por defecto</Label>
                      <Input
                        type="number"
                        value={defaultVariantValues.minStock ?? ''}
                        onChange={(event) => updateDefaultValue('minStock', event.target.value)}
                        className="bg-white border-gray-300"
                      />
                    </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Stock máximo por defecto</Label>
                      <Input
                        type="number"
                        value={defaultVariantValues.maxStock ?? ''}
                        onChange={(event) => updateDefaultValue('maxStock', event.target.value)}
                          className="bg-white border-gray-300"
                        />
                      </div>
                    </div>
                  </div>
            )}

            {(variantMode === 'size' || variantMode === 'size_color') && (
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700">Selecciona las tallas disponibles</Label>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ropa / Vestuario</p>
                  <div className="flex flex-wrap gap-2">
                    {clothingSizes.map((size) => {
                      const isActive = selectedClothingSizes.includes(size as InventorySize);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleToggleSize(size as string, 'clothing')}
                          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'border-primary-prosalud bg-primary-prosalud/10 text-primary-prosalud'
                              : 'border-gray-200 hover:border-primary-prosalud/40 hover:bg-primary-prosalud/5'
                          }`}
                          aria-pressed={isActive}
                        >
                          {size}
                        </button>
                      );
                    })}
                      </div>
                    </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Calzado</p>
                  <div className="flex flex-wrap gap-2">
                    {footwearSizes.map((size) => {
                      const isActive = selectedFootwearSizes.includes(size as InventorySize);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleToggleSize(size as string, 'footwear')}
                          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'border-primary-prosalud bg-primary-prosalud/10 text-primary-prosalud'
                              : 'border-gray-200 hover:border-primary-prosalud/40 hover:bg-primary-prosalud/5'
                          }`}
                          aria-pressed={isActive}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pantalones Hombre</p>
                  <div className="flex flex-wrap gap-2">
                    {menPantsSizes.map((size) => {
                      const isActive = selectedMenPantsSizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleToggleSize(size, 'menPants')}
                          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'border-primary-prosalud bg-primary-prosalud/10 text-primary-prosalud'
                              : 'border-gray-200 hover:border-primary-prosalud/40 hover:bg-primary-prosalud/5'
                          }`}
                          aria-pressed={isActive}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pantalones Mujer</p>
                  <div className="flex flex-wrap gap-2">
                    {womenPantsSizes.map((size) => {
                      const isActive = selectedWomenPantsSizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleToggleSize(size, 'womenPants')}
                          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'border-primary-prosalud bg-primary-prosalud/10 text-primary-prosalud'
                              : 'border-gray-200 hover:border-primary-prosalud/40 hover:bg-primary-prosalud/5'
                          }`}
                          aria-pressed={isActive}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.formState.errors.selectedSizes && (
                  <p className="text-xs text-red-500">{form.formState.errors.selectedSizes.message}</p>
                )}
              </div>
            )}

            {(variantMode === 'color' || variantMode === 'size_color') && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">Selecciona los colores disponibles</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {colorOptions.map((color) => {
                    const isActive = selectedColors.includes(color.id);
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => toggleColor(color.id)}
                        className={`flex flex-col items-center gap-2 rounded-md border p-3 transition-colors ${
                          isActive
                            ? 'border-primary-prosalud bg-primary-prosalud/10 text-primary-prosalud'
                            : 'border-gray-200 hover:border-primary-prosalud/40 hover:bg-primary-prosalud/5'
                        }`}
                        aria-label={`Seleccionar color ${color.label}`}
                        aria-pressed={isActive}
                      >
                        <span
                          className="h-6 w-6 rounded-full border border-gray-200"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="text-xs font-medium text-center leading-tight">{color.label}</span>
                      </button>
                    );
                  })}
                </div>
                {form.formState.errors.selectedColors && (
                  <p className="text-xs text-red-500">{form.formState.errors.selectedColors.message}</p>
                )}
              </div>
            )}

            <div className="space-y-4">
              {renderVariantRows()}
              {form.formState.errors.variants && 'message' in form.formState.errors.variants && (
                <p className="text-sm text-red-500">{form.formState.errors.variants.message}</p>
              )}
            </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
            >
            {isSubmitting ? 'Guardando...' : product ? 'Actualizar Producto' : 'Crear Producto'}
            </Button>
          </div>
        </form>
    </div>
  );
};

export default ProductForm;
