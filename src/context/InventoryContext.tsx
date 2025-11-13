import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import {
  HospitalRequest,
  HospitalRequestStatus,
  InventoryCategory,
  InventoryColorOption,
  InventoryEntry,
  InventoryLocation,
  InventoryLocationDetail,
  InventoryProduct,
  InventorySubcategory,
  SupplierDelivery,
  InventoryStockMovement,
  ApiPaginatedResponse,
  DashboardData,
  INVENTORY_SIZES,
} from '@/types/inventory';
import { inventoryApiService } from '@/services/inventoryApiService';
import { logger } from '@/utils/logger';

interface InventoryContextValue {
  // Data
  categories: InventoryCategory[];
  products: InventoryProduct[];
  deliveries: SupplierDelivery[];
  entries: InventoryEntry[];
  hospitalRequests: HospitalRequest[];
  hospitalOptions: Array<{ id: string; name: string }>;
  locations: InventoryLocation[];
  primaryLocation: InventoryLocation | null;
  colorOptions: InventoryColorOption[];
  sizeOptions: string[];
  dashboardData: DashboardData | null;
  getLocationDetail: (id: string) => Promise<InventoryLocationDetail>;
  getStockMovements: (
    params?: {
      variantId?: string;
      reason?: string;
      fromLocationId?: string;
      toLocationId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
    }
  ) => Promise<ApiPaginatedResponse<InventoryStockMovement>>;
  
  // Loading states
  categoriesLoading: boolean;
  productsLoading: boolean;
  hospitalRequestsLoading: boolean;
  entriesLoading: boolean;
  dashboardLoading: boolean;
  locationsLoading: boolean;
  
  // Error states
  categoriesError: string | null;
  productsError: string | null;
  hospitalRequestsError: string | null;
  entriesError: string | null;
  dashboardError: string | null;
  locationsError: string | null;
  
  // Category operations
  addCategory: (payload: Omit<InventoryCategory, 'id' | 'subcategories'> & { subcategories?: InventorySubcategory[] }) => Promise<void>;
  updateCategory: (id: string, payload: Partial<Omit<InventoryCategory, 'id'>>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  
  // Subcategory operations
  addSubcategory: (categoryId: string, subcategory: Omit<InventorySubcategory, 'id'>) => Promise<void>;
  updateSubcategory: (categoryId: string, subcategoryId: string, payload: Partial<Omit<InventorySubcategory, 'id'>>) => Promise<void>;
  removeSubcategory: (categoryId: string, subcategoryId: string) => Promise<void>;
  
  // Product operations
  addProduct: (product: Omit<InventoryProduct, 'id'>) => Promise<void>;
  updateProduct: (id: string, payload: Partial<Omit<InventoryProduct, 'id'>>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  addEntry: (payload: {
    supplierId: string;
    supplierName?: string;
    receivedAt: string;
    locationId?: string;
    documentNumber?: string;
    notes?: string;
    items: Array<{ productId: string; variantId?: string; quantity: number }>;
  }) => Promise<InventoryEntry>;
  refreshEntries: () => Promise<void>;
  getEntryById: (id: string) => Promise<InventoryEntry>;
  
  // Hospital request operations
  addHospitalRequest: (payload: Omit<HospitalRequest, 'id' | 'status' | 'createdAt' | 'timeline'>) => Promise<HospitalRequest>;
  updateHospitalRequestStatus: (
    id: string,
    status: HospitalRequestStatus,
    event?: Omit<HospitalRequest['timeline'][number], 'id' | 'status' | 'timestamp'>,
  ) => Promise<void>;
  
  // Refresh operations
  refreshCategories: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshHospitalRequests: () => Promise<void>;
  refreshEntries: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshLocations: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextValue | undefined>(undefined);

const sizeOptions = [...INVENTORY_SIZES];

// Initial static data for fallback
const initialColorOptions: InventoryColorOption[] = [
  { id: 'AGUAMA', label: 'Aguamarina', hex: '#14B8A6' },
  { id: 'AMARILLO', label: 'Amarillo', hex: '#FACC15' },
  { id: 'AZUL', label: 'Azul', hex: '#2563EB' },
  { id: 'AZUL_CLARO', label: 'Azul Claro', hex: '#93C5FD' },
  { id: 'AZUL_MARINO', label: 'Azul Marino', hex: '#1E40AF' },
  { id: 'AZUL_OSCURO', label: 'Azul Oscuro', hex: '#1F2937' },
  { id: 'AZUL_REY', label: 'Azul Rey', hex: '#1E3A8A' },
  { id: 'BEIGE', label: 'Beige', hex: '#D4C4A8' },
  { id: 'BLANCO', label: 'Blanco', hex: '#FFFFFF' },
  { id: 'CAFE', label: 'Café', hex: '#92400E' },
  { id: 'GRIS', label: 'Gris', hex: '#6B7280' },
  { id: 'GRIS_OSCURO', label: 'Gris Oscuro', hex: '#374151' },
  { id: 'GRIS_RATON', label: 'Gris Ratón', hex: '#4B5563' },
  { id: 'GRIS_REFLECTIVO', label: 'Gris Reflectivo', hex: '#9CA3AF' },
  { id: 'MORADO', label: 'Morado', hex: '#A855F7' },
  { id: 'NARANJA', label: 'Naranja', hex: '#FB923C' },
  { id: 'NEGRO', label: 'Negro', hex: '#000000' },
  { id: 'NEGRA', label: 'Negra', hex: '#000000' },
  { id: 'PETROLEO', label: 'Petróleo', hex: '#0F172A' },
  { id: 'ROJO', label: 'Rojo', hex: '#EF4444' },
  { id: 'ROSA', label: 'Rosa', hex: '#F472B6' },
  { id: 'VERDE', label: 'Verde', hex: '#22C55E' },
  { id: 'VERDE_AGUA', label: 'Verde Agua', hex: '#5EEAD4' },
  { id: 'VERDE_QUIRURGICO', label: 'Verde Quirúrgico', hex: '#065F46' },
  { id: 'VINO_TINTO', label: 'Vino Tinto', hex: '#881337' },
];

const fallbackHospitalOptions = [
  { id: 'hospital-bello', name: 'Hospital Bello' },
  { id: 'hospital-rionegro', name: 'Hospital Rionegro' },
  { id: 'hospital-la-maria', name: 'Hospital La Maria' },
  { id: 'hospital-admon', name: 'ADMON' },
];

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Data states
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [deliveries] = useState<SupplierDelivery[]>([]); // Deliveries not implemented in API yet
  const [entries, setEntries] = useState<InventoryEntry[]>([]);
  const [hospitalRequests, setHospitalRequests] = useState<HospitalRequest[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [colorOptions, setColorOptions] = useState<InventoryColorOption[]>(initialColorOptions);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  // Loading states
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [hospitalRequestsLoading, setHospitalRequestsLoading] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  
  // Error states
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [hospitalRequestsError, setHospitalRequestsError] = useState<string | null>(null);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  // Fetch categories
  const refreshCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const response = await inventoryApiService.getCategories({ page: 1, pageSize: 100 });
      setCategories(response.data);
      logger.debug('Categories loaded', { count: response.data.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar categorías';
      setCategoriesError(message);
      logger.error('Error loading categories', error);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const refreshLocations = useCallback(async () => {
    setLocationsLoading(true);
    setLocationsError(null);
    try {
      const data = await inventoryApiService.getLocations({ summary: true, withHospital: true });
      setLocations(data);
      logger.debug('Inventory locations loaded', { count: data.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar bodegas';
      setLocationsError(message);
      logger.error('Error loading inventory locations', error);
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  const refreshEntries = useCallback(async () => {
    setEntriesLoading(true);
    setEntriesError(null);
    try {
      const response = await inventoryApiService.getEntries({ page: 1, pageSize: 50 });
      setEntries(response.data);
      logger.debug('Inventory entries loaded', { count: response.data.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar entradas de inventario';
      setEntriesError(message);
      logger.error('Error loading entries', error);
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  // Fetch products
  const refreshProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const response = await inventoryApiService.getProducts({ page: 1, pageSize: 100 });
      setProducts(response.data);
      logger.debug('Products loaded', { count: response.data.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar productos';
      setProductsError(message);
      logger.error('Error loading products', error);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // Fetch hospital requests
  const refreshHospitalRequests = useCallback(async () => {
    setHospitalRequestsLoading(true);
    setHospitalRequestsError(null);
    try {
      const response = await inventoryApiService.getHospitalRequests({ page: 1, pageSize: 100 });
      if ('pagination' in response) {
        setHospitalRequests(response.data);
        logger.debug('Hospital requests loaded', { count: response.data.length });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar solicitudes';
      setHospitalRequestsError(message);
      logger.error('Error loading hospital requests', error);
    } finally {
      setHospitalRequestsLoading(false);
    }
  }, []);

  // Fetch dashboard
  const refreshDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await inventoryApiService.getDashboard();
      setDashboardData(data);
      logger.debug('Dashboard data loaded');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar resumen';
      setDashboardError(message);
      logger.error('Error loading dashboard', error);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // Fetch colors
  const fetchColors = useCallback(async () => {
    try {
      const colors = await inventoryApiService.getColors();
      setColorOptions(colors);
      logger.debug('Colors loaded', { count: colors.length });
    } catch (error) {
      logger.error('Error loading colors, using fallback', error);
      // Keep initial color options as fallback
    }
  }, []);

  // Initial data load
  useEffect(() => {
    refreshCategories();
    refreshProducts();
    refreshHospitalRequests();
    refreshEntries();
    refreshDashboard();
    fetchColors();
    refreshLocations();
  }, [refreshCategories, refreshProducts, refreshHospitalRequests, refreshEntries, refreshDashboard, fetchColors, refreshLocations]);

  // Category operations
  const addCategory = useCallback<InventoryContextValue['addCategory']>(
    async (payload) => {
      try {
        await inventoryApiService.createCategory({
          name: payload.name,
          description: payload.description,
          icon: payload.icon,
          subcategories: payload.subcategories,
        });
        await refreshCategories();
      } catch (error) {
        logger.error('Error adding category', error);
        throw error;
      }
    },
    [refreshCategories]
  );

  const updateCategory = useCallback<InventoryContextValue['updateCategory']>(
    async (id, payload) => {
      try {
        await inventoryApiService.updateCategory(id, {
          name: payload.name,
          description: payload.description,
          icon: payload.icon,
        });
        await refreshCategories();
      } catch (error) {
        logger.error('Error updating category', error);
        throw error;
      }
    },
    [refreshCategories]
  );

  const removeCategory = useCallback<InventoryContextValue['removeCategory']>(
    async (id) => {
      try {
        await inventoryApiService.deleteCategory(id);
        await refreshCategories();
        await refreshProducts(); // Products might be affected
      } catch (error) {
        logger.error('Error removing category', error);
        throw error;
      }
    },
    [refreshCategories, refreshProducts]
  );

  // Subcategory operations
  const addSubcategory = useCallback<InventoryContextValue['addSubcategory']>(
    async (categoryId, subcategory) => {
      try {
        await inventoryApiService.createSubcategory(categoryId, {
          name: subcategory.name,
          description: subcategory.description,
        });
        await refreshCategories();
      } catch (error) {
        logger.error('Error adding subcategory', error);
        throw error;
      }
    },
    [refreshCategories]
  );

  const updateSubcategory = useCallback<InventoryContextValue['updateSubcategory']>(
    async (categoryId, subcategoryId, payload) => {
      try {
        await inventoryApiService.updateSubcategory(categoryId, subcategoryId, {
          name: payload.name,
          description: payload.description,
        });
        await refreshCategories();
      } catch (error) {
        logger.error('Error updating subcategory', error);
        throw error;
      }
    },
    [refreshCategories]
  );

  const removeSubcategory = useCallback<InventoryContextValue['removeSubcategory']>(
    async (categoryId, subcategoryId) => {
      try {
        await inventoryApiService.deleteSubcategory(categoryId, subcategoryId);
        await refreshCategories();
        await refreshProducts(); // Products might be affected
      } catch (error) {
        logger.error('Error removing subcategory', error);
        throw error;
      }
    },
    [refreshCategories, refreshProducts]
  );

  // Product operations
  const addProduct = useCallback<InventoryContextValue['addProduct']>(
    async (product) => {
      try {
        await inventoryApiService.createProduct({
          name: product.name,
          category_id: product.categoryId || '',
          subcategory_id: product.subcategoryId,
          description: product.description,
          variant_mode: product.variantMode || 'simple',
          variants: product.variants.map((v) => ({
            size: v.size,
            color_id: v.colorId,
            stock: v.stock,
            min_stock: v.minStock,
            max_stock: v.maxStock,
            sku: v.sku,
          })),
        });
        await refreshProducts();
        await refreshDashboard(); // Dashboard might be affected
        await refreshLocations(); // Stock distribution updates
        await refreshHospitalRequests(); // Requests may depend on product metadata
      } catch (error) {
        logger.error('Error adding product', error);
        throw error;
      }
    },
    [refreshProducts, refreshDashboard, refreshLocations, refreshHospitalRequests]
  );

  const updateProduct = useCallback<InventoryContextValue['updateProduct']>(
    async (id, payload) => {
      try {
        await inventoryApiService.updateProduct(id, {
          name: payload.name,
          category_id: payload.categoryId,
          subcategory_id: payload.subcategoryId,
          description: payload.description,
          variant_mode: payload.variantMode,
          variants: payload.variants?.map((v) => ({
            id: v.id,
            size: v.size,
            color_id: v.colorId,
            stock: v.stock,
            min_stock: v.minStock,
            max_stock: v.maxStock,
            sku: v.sku,
          })),
        });
        await refreshProducts();
        await refreshDashboard(); // Dashboard might be affected
        await refreshLocations(); // Stock distribution updates
        await refreshHospitalRequests(); // Requests may depend on product metadata
      } catch (error) {
        logger.error('Error updating product', error);
        throw error;
      }
    },
    [refreshProducts, refreshDashboard, refreshLocations, refreshHospitalRequests]
  );

  const removeProduct = useCallback<InventoryContextValue['removeProduct']>(
    async (id) => {
      try {
        await inventoryApiService.deleteProduct(id);
        await refreshProducts();
        await refreshDashboard(); // Dashboard might be affected
        await refreshLocations(); // Stock distribution updates
        await refreshHospitalRequests(); // Requests may depend on product availability
      } catch (error) {
        logger.error('Error removing product', error);
        throw error;
      }
    },
    [refreshProducts, refreshDashboard, refreshLocations, refreshHospitalRequests]
  );

  const addEntry = useCallback<InventoryContextValue['addEntry']>(
    async (payload) => {
      try {
        const entry = await inventoryApiService.createEntry({
          supplier_id: payload.supplierId,
          supplier_name: payload.supplierName,
          received_at: payload.receivedAt,
          location_id: payload.locationId,
          document_number: payload.documentNumber,
          notes: payload.notes,
          items: payload.items.map((item) => ({
            product_id: item.productId,
            variant_id: item.variantId,
            quantity: item.quantity,
          })),
        });

        await refreshEntries();
        await refreshProducts(); // Stock updates
        await refreshDashboard(); // Overview updates
        await refreshLocations(); // Stock distribution updates
        await refreshHospitalRequests(); // Update pending request stock snapshots

        return entry;
      } catch (error) {
        logger.error('Error adding inventory entry', error);
        throw error;
      }
    },
    [refreshEntries, refreshProducts, refreshDashboard, refreshLocations, refreshHospitalRequests]
  );

  const getEntryById = useCallback<InventoryContextValue['getEntryById']>(
    async (id) => {
      try {
        return await inventoryApiService.getEntryById(id);
      } catch (error) {
        logger.error('Error fetching inventory entry by id', error);
        throw error;
      }
    },
    []
  );

  // Hospital request operations
  const addHospitalRequest = useCallback<InventoryContextValue['addHospitalRequest']>(
    async (payload) => {
      try {
        const newRequest = await inventoryApiService.createHospitalRequest({
          hospital_id: payload.hospitalId,
          hospital_name: payload.hospitalName,
          requested_by: payload.requestedBy,
          observations: payload.observations,
          items: payload.items.map((item) => ({
            product_id: item.productId,
            variant_id: item.variantId,
            quantity: item.quantity,
            notes: item.notes,
          })),
        });
        await refreshHospitalRequests();
        await refreshDashboard(); // Dashboard might be affected
        await refreshLocations(); // Reserved stock updates
        await refreshProducts(); // Product stock/reservations updates
        return newRequest;
      } catch (error) {
        logger.error('Error adding hospital request', error);
        throw error;
      }
    },
    [refreshHospitalRequests, refreshDashboard, refreshLocations, refreshProducts]
  );

  const updateHospitalRequestStatus = useCallback<InventoryContextValue['updateHospitalRequestStatus']>(
    async (id, status, event) => {
      try {
        await inventoryApiService.updateHospitalRequestStatus(id, {
          status,
          actor: event?.actor,
          description: event?.description,
        });
        await refreshHospitalRequests();
        await refreshDashboard(); // Dashboard might be affected
        await refreshProducts(); // Stock might change
        await refreshLocations(); // Reserved / stock distribution changes
      } catch (error) {
        logger.error('Error updating hospital request status', error);
        throw error;
      }
    },
    [refreshHospitalRequests, refreshDashboard, refreshProducts, refreshLocations]
  );

  const hospitalOptions = useMemo(
    () =>
      locations.length
        ? locations
            .filter((location) => !location.isPrimary)
            .map((location) => ({
              id: location.hospital?.id !== undefined ? String(location.hospital.id) : location.hospitalId ? String(location.hospitalId) : location.id,
              name: location.hospital?.name ?? location.name,
            }))
        : fallbackHospitalOptions,
    [locations],
  );

  const getLocationDetail = useCallback<InventoryContextValue['getLocationDetail']>(
    async (id) => inventoryApiService.getLocationById(id),
    [],
  );

  const getStockMovements = useCallback<InventoryContextValue['getStockMovements']>(
    async (params) => inventoryApiService.getStockMovements(params),
    [],
  );

  const value = useMemo(
    () => ({
      categories,
      products,
      deliveries,
      entries,
      hospitalRequests,
      hospitalOptions,
      locations,
      primaryLocation: locations.find((location) => location.isPrimary) ?? null,
      colorOptions,
      sizeOptions,
      dashboardData,
      getLocationDetail,
      getStockMovements,
      categoriesLoading,
      productsLoading,
      hospitalRequestsLoading,
      entriesLoading,
      dashboardLoading,
      locationsLoading,
      categoriesError,
      productsError,
      hospitalRequestsError,
      entriesError,
      dashboardError,
      locationsError,
      addCategory,
      updateCategory,
      removeCategory,
      addSubcategory,
      updateSubcategory,
      removeSubcategory,
      addProduct,
      updateProduct,
      removeProduct,
      addEntry,
      addHospitalRequest,
      updateHospitalRequestStatus,
      refreshCategories,
      refreshProducts,
      refreshHospitalRequests,
      refreshEntries,
      refreshDashboard,
      refreshLocations,
      getEntryById,
    }),
    [
      categories,
      products,
      deliveries,
      entries,
      hospitalRequests,
      hospitalOptions,
      locations,
      colorOptions,
      dashboardData,
      getLocationDetail,
      getStockMovements,
      categoriesLoading,
      productsLoading,
      hospitalRequestsLoading,
      entriesLoading,
      dashboardLoading,
      locationsLoading,
      categoriesError,
      productsError,
      hospitalRequestsError,
      entriesError,
      dashboardError,
      locationsError,
      addCategory,
      updateCategory,
      removeCategory,
      addSubcategory,
      updateSubcategory,
      removeSubcategory,
      addProduct,
      updateProduct,
      removeProduct,
      addEntry,
      addHospitalRequest,
      updateHospitalRequestStatus,
      refreshCategories,
      refreshProducts,
      refreshHospitalRequests,
      refreshEntries,
      refreshDashboard,
      refreshLocations,
      getEntryById,
    ]
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
