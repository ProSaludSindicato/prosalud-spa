import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import {
  HospitalRequest,
  HospitalRequestStatus,
  InventoryCategory,
  InventoryColorOption,
  InventoryProduct,
  InventorySubcategory,
  ProductVariant,
  SupplierDelivery,
} from '@/types/inventory';

interface InventoryContextValue {
  categories: InventoryCategory[];
  products: InventoryProduct[];
  deliveries: SupplierDelivery[];
  hospitalRequests: HospitalRequest[];
  hospitalOptions: Array<{ id: string; name: string }>;
  colorOptions: InventoryColorOption[];
  sizeOptions: string[];
  addCategory: (payload: Omit<InventoryCategory, 'id' | 'subcategories'> & { subcategories?: InventorySubcategory[] }) => void;
  updateCategory: (id: string, payload: Partial<Omit<InventoryCategory, 'id'>>) => void;
  removeCategory: (id: string) => void;
  addSubcategory: (categoryId: string, subcategory: Omit<InventorySubcategory, 'id'>) => void;
  updateSubcategory: (categoryId: string, subcategoryId: string, payload: Partial<Omit<InventorySubcategory, 'id'>>) => void;
  removeSubcategory: (categoryId: string, subcategoryId: string) => void;
  addProduct: (product: Omit<InventoryProduct, 'id'>) => void;
  updateProduct: (id: string, payload: Partial<Omit<InventoryProduct, 'id'>>) => void;
  removeProduct: (id: string) => void;
  addHospitalRequest: (payload: Omit<HospitalRequest, 'id' | 'status' | 'createdAt' | 'timeline'>) => HospitalRequest;
  updateHospitalRequestStatus: (
    id: string,
    status: HospitalRequestStatus,
    event?: Omit<HospitalRequest['timeline'][number], 'id' | 'status' | 'timestamp'>,
  ) => void;
}

const InventoryContext = createContext<InventoryContextValue | undefined>(undefined);

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

const initialColorOptions: InventoryColorOption[] = [
  { id: 'AGUAMA', label: 'Aguama', hex: '#5FC7C0' },
  { id: 'BLANCO', label: 'Blanco', hex: '#FFFFFF' },
  { id: 'AZUL', label: 'Azul', hex: '#0056A3' },
  { id: 'GRIS', label: 'Gris', hex: '#9CA3AF' },
  { id: 'AZUL_CLARO', label: 'Azul Claro', hex: '#4DA3FF' },
  { id: 'AZUL_OSCURO', label: 'Azul Oscuro', hex: '#0B1D4D' },
  { id: 'AZUL_REY', label: 'Azul Rey', hex: '#003DA5' },
  { id: 'GRIS_RATON', label: 'Gris Ratón', hex: '#6B7280' },
  { id: 'GRIS_REFLECTIVO', label: 'Gris Reflectivo', hex: '#D1D5DB' },
  { id: 'NEGRA', label: 'Negra', hex: '#111827' },
  { id: 'PETROLEO', label: 'Petróleo', hex: '#1C4C5B' },
  { id: 'VERDE', label: 'Verde', hex: '#1F9D55' },
];

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];

const initialCategories: InventoryCategory[] = [
  {
    id: 'uniformes',
    name: 'Uniformes',
    description: 'Vestimenta profesional para personal de salud.',
    icon: 'Shirt',
    subcategories: [
      { id: 'quirurgicos', name: 'Quirúrgicos' },
      { id: 'pediatricos', name: 'Pediátricos' },
      { id: 'corporativos', name: 'Corporativos' },
    ],
  },
  {
    id: 'tapabocas',
    name: 'Tapabocas',
    description: 'Elementos de protección respiratoria.',
    icon: 'Shield',
    subcategories: [
      { id: 'n95', name: 'N95' },
      { id: 'quirurgicos', name: 'Quirúrgicos' },
      { id: 'tela', name: 'Tela' },
    ],
  },
  {
    id: 'batas',
    name: 'Batas',
    description: 'Batas médicas, de laboratorio y protección.',
    icon: 'Package',
    subcategories: [
      { id: 'laboratorio', name: 'Laboratorio' },
      { id: 'desechables', name: 'Desechables' },
    ],
  },
  {
    id: 'implementos',
    name: 'Implementos',
    description: 'Elementos médicos y de bioseguridad complementarios.',
    icon: 'Activity',
    subcategories: [
      { id: 'proteccion', name: 'Protección' },
      { id: 'instrumental', name: 'Instrumental' },
    ],
  },
  {
    id: 'regalos',
    name: 'Regalos',
    description: 'Material corporativo y kits promocionales.',
    icon: 'Gift',
    subcategories: [
      { id: 'kits', name: 'Kits' },
      { id: 'indumentaria', name: 'Indumentaria' },
    ],
  },
];

const initialProducts: InventoryProduct[] = [
  {
    id: 'prod-uniforme-azul',
    name: 'Uniforme Quirúrgico Azul',
    categoryId: 'uniformes',
    subcategoryId: 'quirurgicos',
    description: 'Uniforme quirúrgico de algodón con tratamiento antibacterial.',
    variantMode: 'size_color',
    variants: [
      { id: 'v1', size: 'S', colorId: 'AZUL', stock: 25, minStock: 10, maxStock: 80, sku: 'UNI-AZUL-S' },
      { id: 'v2', size: 'M', colorId: 'AZUL', stock: 3, minStock: 10, maxStock: 80, sku: 'UNI-AZUL-M' },
      { id: 'v3', size: 'L', colorId: 'AZUL', stock: 32, minStock: 10, maxStock: 80, sku: 'UNI-AZUL-L' },
      { id: 'v4', size: 'XL', colorId: 'AZUL', stock: 22, minStock: 10, maxStock: 80, sku: 'UNI-AZUL-XL' },
      { id: 'v5', size: 'XXL', colorId: 'AZUL', stock: 12, minStock: 10, maxStock: 80, sku: 'UNI-AZUL-XXL' },
    ],
  },
  {
    id: 'prod-uniforme-verde',
    name: 'Uniforme Quirúrgico Verde',
    categoryId: 'uniformes',
    subcategoryId: 'quirurgicos',
    description: 'Uniforme quirúrgico verde en tela antifluido.',
    variantMode: 'size_color',
    variants: [
      { id: 'v1', size: 'S', colorId: 'VERDE', stock: 28, minStock: 10, maxStock: 80, sku: 'UNI-VERDE-S' },
      { id: 'v2', size: 'M', colorId: 'VERDE', stock: 35, minStock: 10, maxStock: 80, sku: 'UNI-VERDE-M' },
      { id: 'v3', size: 'L', colorId: 'VERDE', stock: 22, minStock: 10, maxStock: 80, sku: 'UNI-VERDE-L' },
      { id: 'v4', size: 'XL', colorId: 'VERDE', stock: 18, minStock: 10, maxStock: 80, sku: 'UNI-VERDE-XL' },
      { id: 'v5', size: 'XXL', colorId: 'VERDE', stock: 16, minStock: 10, maxStock: 80, sku: 'UNI-VERDE-XXL' },
    ],
  },
  {
    id: 'prod-bata-lab',
    name: 'Bata de Laboratorio Premium',
    categoryId: 'batas',
    subcategoryId: 'laboratorio',
    description: 'Bata blanca antifluido, manga larga con bolsillos funcionales.',
    variantMode: 'size',
    variants: [
      { id: 'v1', size: 'S', stock: 15, minStock: 8, maxStock: 60, sku: 'BATA-PREM-S' },
      { id: 'v2', size: 'M', stock: 28, minStock: 8, maxStock: 60, sku: 'BATA-PREM-M' },
      { id: 'v3', size: 'L', stock: 2, minStock: 8, maxStock: 60, sku: 'BATA-PREM-L' },
      { id: 'v4', size: 'XL', stock: 31, minStock: 8, maxStock: 60, sku: 'BATA-PREM-XL' },
      { id: 'v5', size: 'XXL', stock: 20, minStock: 8, maxStock: 60, sku: 'BATA-PREM-XXL' },
    ],
  },
  {
    id: 'prod-tapabocas-n95',
    name: 'Tapabocas N95 Premium',
    categoryId: 'tapabocas',
    subcategoryId: 'n95',
    description: 'Tapabocas de alta filtración N95 certificado.',
    variantMode: 'simple',
    variants: [
      { id: 'v1', stock: 2340, minStock: 500, maxStock: 5000, sku: 'N95-STD' },
    ],
  },
  {
    id: 'prod-kit-bienvenida',
    name: 'Kit de Bienvenida ProSalud',
    categoryId: 'regalos',
    subcategoryId: 'kits',
    description: 'Kit con artículos promocionales para nuevos afiliados.',
    variantMode: 'simple',
    variants: [
      { id: 'v1', stock: 38, minStock: 20, maxStock: 150, sku: 'KIT-BIENVENIDA' },
    ],
  },
];

const initialDeliveries: SupplierDelivery[] = [
  {
    id: 'ent-001',
    supplierName: 'MedSupply S.A.S',
    deliveryDate: '2025-01-15',
    totalItems: 150,
    status: 'completed',
    items: [
      { productId: 'prod-uniforme-azul', variantId: 'v2', quantity: 50, received: 50 },
      { productId: 'prod-uniforme-verde', variantId: 'v3', quantity: 30, received: 30 },
      { productId: 'prod-bata-lab', variantId: 'v1', quantity: 70, received: 70 },
    ],
  },
  {
    id: 'ent-002',
    supplierName: 'Textiles ProSalud',
    deliveryDate: '2025-01-18',
    totalItems: 200,
    status: 'received',
    items: [
      { productId: 'prod-tapabocas-n95', quantity: 200, received: 180 },
    ],
  },
  {
    id: 'ent-003',
    supplierName: 'Implementos Médicos',
    deliveryDate: '2025-01-20',
    totalItems: 80,
    status: 'pending',
    items: [
      { productId: 'prod-kit-bienvenida', quantity: 50, received: 0 },
      { productId: 'prod-bata-lab', variantId: 'v2', quantity: 30, received: 0 },
    ],
  },
];

const hospitalOptions = [
  { id: 'hospital-marco-fidel', name: 'Hospital Marco Fidel Suárez - Bello' },
  { id: 'hospital-san-juan', name: 'Hospital San Juan de Dios - Rionegro' },
  { id: 'hospital-santa-elena', name: 'Hospital Santa Elena - Fredonia' },
  { id: 'hospital-venancio', name: 'Hospital Venancio Díaz Díaz - La Ceja' },
  { id: 'hospital-general', name: 'Hospital General de Medellín' },
  { id: 'clinica-cardio', name: 'Clínica Cardiovascular Santa María' },
];

const initialHospitalRequests: HospitalRequest[] = [
  {
    id: 'req-001',
    hospitalId: 'hospital-marco-fidel',
    hospitalName: 'Hospital Marco Fidel Suárez - Bello',
    requestedBy: 'Laura Gómez',
    createdAt: '2025-01-10T08:30:00Z',
    status: 'preparing',
    observations: 'Prioridad alta por ingreso de nuevo personal.',
    items: [
      {
        productId: 'prod-uniforme-azul',
        variantId: 'v2',
        variantLabel: 'Talla M · Azul',
        size: 'M',
        colorId: 'AZUL',
        quantity: 10,
      },
      {
        productId: 'prod-uniforme-azul',
        variantId: 'v3',
        variantLabel: 'Talla L · Azul',
        size: 'L',
        colorId: 'AZUL',
        quantity: 8,
      },
      {
        productId: 'prod-tapabocas-n95',
        variantId: 'v1',
        variantLabel: 'Estándar',
        quantity: 250,
      },
    ],
    timeline: [
      {
        id: generateId(),
        status: 'pending',
        timestamp: '2025-01-10T08:30:00Z',
        description: 'Solicitud creada por hospital.',
        actor: 'Laura Gómez',
      },
      {
        id: generateId(),
        status: 'approved',
        timestamp: '2025-01-10T12:00:00Z',
        description: 'Solicitud aprobada por sede principal.',
        actor: 'Coordinador Inventarios',
      },
      {
        id: generateId(),
        status: 'preparing',
        timestamp: '2025-01-11T09:15:00Z',
        description: 'Preparación de dotaciones en curso.',
        actor: 'Almacén Central',
      },
    ],
  },
  {
    id: 'req-002',
    hospitalId: 'hospital-san-juan',
    hospitalName: 'Hospital San Juan de Dios - Rionegro',
    requestedBy: 'Carlos Ruiz',
    createdAt: '2025-01-08T14:45:00Z',
    status: 'delivered',
    observations: 'Reponer stock utilizado en jornada de brigada.',
    items: [
      {
        productId: 'prod-bata-lab',
        variantId: 'v2',
        variantLabel: 'Talla M',
        size: 'M',
        quantity: 12,
      },
      {
        productId: 'prod-bata-lab',
        variantId: 'v3',
        variantLabel: 'Talla L',
        size: 'L',
        quantity: 8,
      },
      {
        productId: 'prod-kit-bienvenida',
        variantId: 'v1',
        variantLabel: 'Kit estándar',
        quantity: 40,
      },
    ],
    timeline: [
      {
        id: generateId(),
        status: 'pending',
        timestamp: '2025-01-08T14:45:00Z',
        actor: 'Carlos Ruiz',
      },
      {
        id: generateId(),
        status: 'approved',
        timestamp: '2025-01-08T18:10:00Z',
        actor: 'Coordinador Inventarios',
      },
      {
        id: generateId(),
        status: 'shipped',
        timestamp: '2025-01-09T10:30:00Z',
        description: 'Envío coordinado con transportadora.',
      },
      {
        id: generateId(),
        status: 'delivered',
        timestamp: '2025-01-10T16:20:00Z',
        description: 'Entrega confirmada por hospital.',
        actor: 'Carlos Ruiz',
      },
    ],
  },
  {
    id: 'req-003',
    hospitalId: 'hospital-santa-elena',
    hospitalName: 'Hospital Santa Elena - Fredonia',
    requestedBy: 'Valentina Múnera',
    createdAt: '2025-01-12T09:05:00Z',
    status: 'pending',
    items: [
      {
        productId: 'prod-uniforme-verde',
        variantId: 'v2',
        variantLabel: 'Talla M · Verde',
        size: 'M',
        colorId: 'VERDE',
        quantity: 5,
      },
      {
        productId: 'prod-uniforme-verde',
        variantId: 'v3',
        variantLabel: 'Talla L · Verde',
        size: 'L',
        colorId: 'VERDE',
        quantity: 7,
      },
      {
        productId: 'prod-tapabocas-n95',
        variantId: 'v1',
        variantLabel: 'Estándar',
        quantity: 150,
      },
    ],
  },
];

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<InventoryCategory[]>(initialCategories);
  const [products, setProducts] = useState<InventoryProduct[]>(initialProducts);
  const [deliveries] = useState<SupplierDelivery[]>(initialDeliveries);
  const [hospitalRequests, setHospitalRequests] = useState<HospitalRequest[]>(initialHospitalRequests);

  const addCategory = useCallback<InventoryContextValue['addCategory']>((payload) => {
    const id = generateId();
    const newCategory: InventoryCategory = {
      id,
      name: payload.name,
      description: payload.description,
      icon: payload.icon,
      subcategories: payload.subcategories ?? [],
    };
    setCategories((prev) => [...prev, newCategory]);
  }, []);

  const updateCategory = useCallback<InventoryContextValue['updateCategory']>((id, payload) => {
    setCategories((prev) =>
      prev.map((category) =>
        category.id === id
          ? {
              ...category,
              name: payload.name ?? category.name,
              description: payload.description ?? category.description,
              icon: payload.icon ?? category.icon,
              subcategories: payload.subcategories ?? category.subcategories,
            }
          : category,
      ),
    );
  }, []);

  const removeCategory = useCallback<InventoryContextValue['removeCategory']>((id) => {
    setCategories((prev) => prev.filter((category) => category.id !== id));
    setProducts((prev) => prev.filter((product) => product.categoryId !== id));
  }, []);

  const addSubcategory = useCallback<InventoryContextValue['addSubcategory']>((categoryId, subcategory) => {
    setCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              subcategories: [
                ...category.subcategories,
                { id: generateId(), name: subcategory.name, description: subcategory.description },
              ],
            }
          : category,
      ),
    );
  }, []);

  const updateSubcategory = useCallback<InventoryContextValue['updateSubcategory']>(
    (categoryId, subcategoryId, payload) => {
      setCategories((prev) =>
        prev.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                subcategories: category.subcategories.map((sub) =>
                  sub.id === subcategoryId
                    ? {
                        ...sub,
                        name: payload.name ?? sub.name,
                        description: payload.description ?? sub.description,
                      }
                    : sub,
                ),
              }
            : category,
        ),
      );
    },
    [],
  );

  const removeSubcategory = useCallback<InventoryContextValue['removeSubcategory']>((categoryId, subcategoryId) => {
    setCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              subcategories: category.subcategories.filter((sub) => sub.id !== subcategoryId),
            }
          : category,
      ),
    );
    setProducts((prev) =>
      prev.map((product) =>
        product.subcategoryId === subcategoryId ? { ...product, subcategoryId: undefined } : product,
      ),
    );
  }, []);

  const addProduct = useCallback<InventoryContextValue['addProduct']>((product) => {
    const newProduct: InventoryProduct = {
      ...product,
      id: generateId(),
      variantMode: product.variantMode,
      variants: product.variants.map<ProductVariant>((variant) => ({
        ...variant,
        id: generateId(),
      })),
    };
    setProducts((prev) => [...prev, newProduct]);
  }, []);

  const updateProduct = useCallback<InventoryContextValue['updateProduct']>((id, payload) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === id
          ? {
              ...product,
              name: payload.name ?? product.name,
              categoryId: payload.categoryId ?? product.categoryId,
              subcategoryId: payload.subcategoryId ?? product.subcategoryId,
              description: payload.description ?? product.description,
              variantMode: payload.variantMode ?? product.variantMode,
              variants: payload.variants
                ? payload.variants.map((variant) => ({
                    ...variant,
                    id: variant.id ?? generateId(),
                  }))
                : product.variants,
            }
          : product,
      ),
    );
  }, []);

  const removeProduct = useCallback<InventoryContextValue['removeProduct']>((id) => {
    setProducts((prev) => prev.filter((product) => product.id !== id));
  }, []);

  const addHospitalRequest = useCallback<InventoryContextValue['addHospitalRequest']>((payload) => {
    const newRequest: HospitalRequest = {
      id: `req-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      timeline: [
        {
          id: generateId(),
          status: 'pending',
          timestamp: new Date().toISOString(),
          description: 'Solicitud registrada en el sistema.',
          actor: payload.requestedBy ?? 'Coordinador Hospital',
        },
      ],
      ...payload,
    };

    setHospitalRequests((prev) => [newRequest, ...prev]);
    return newRequest;
  }, []);

  const updateHospitalRequestStatus = useCallback<InventoryContextValue['updateHospitalRequestStatus']>(
    (id, status, event) => {
      setHospitalRequests((prev) =>
        prev.map((request) => {
          if (request.id !== id) return request;

          const nextTimeline: HospitalRequest['timeline'] = [
            ...(request.timeline ?? []),
            {
              id: generateId(),
              status,
              timestamp: new Date().toISOString(),
              description: event?.description,
              actor: event?.actor,
            },
          ];

          return {
            ...request,
            status,
            timeline: nextTimeline,
          };
        }),
      );
    },
    [],
  );

  const value = useMemo(
    () => ({
      categories,
      products,
      deliveries,
      hospitalRequests,
      hospitalOptions,
      colorOptions: initialColorOptions,
      sizeOptions,
      addCategory,
      updateCategory,
      removeCategory,
      addSubcategory,
      updateSubcategory,
      removeSubcategory,
      addProduct,
      updateProduct,
      removeProduct,
      addHospitalRequest,
      updateHospitalRequestStatus,
    }),
    [
      categories,
      products,
      deliveries,
      hospitalRequests,
      hospitalOptions,
      addCategory,
      updateCategory,
      removeCategory,
      addSubcategory,
      updateSubcategory,
      removeSubcategory,
      addProduct,
      updateProduct,
      removeProduct,
      addHospitalRequest,
      updateHospitalRequestStatus,
    ],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

export const useInventory = (): InventoryContextValue => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};


