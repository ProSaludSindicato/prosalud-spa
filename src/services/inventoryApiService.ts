import { authenticatedApi as api } from './api';
import { logger } from '@/utils/logger';
import type {
  InventoryCategory,
  InventoryProduct,
  InventoryColorOption,
  InventoryGender,
  InventoryEntry,
  InventoryEntryItem,
  InventoryLocation,
  InventoryLocationDetail,
  InventoryLocationStockItem,
  InventoryVariantStock,
  InventoryHospital,
  InventoryStockMovement,
  InventoryStockMovementReason,
  HospitalRequest,
  HospitalRequestStatus,
  ApiPaginatedResponse,
  ApiSingleResponse,
  DashboardData,
} from '@/types/inventory';

const BASE_PATH = '/api/inventory';

// Helper to build query string
const buildQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};

// Normalize API responses to match frontend types
const normalizeHospital = (hospital: any): InventoryHospital => ({
  id: hospital.id,
  name: hospital.name,
  type: hospital.type,
});

const normalizeLocation = (location: any): InventoryLocation => ({
  id: location.id,
  name: location.name,
  type: location.type ?? location.location_type,
  isPrimary: location.is_primary ?? location.isPrimary ?? false,
  hospitalId: location.hospital_id ?? location.hospitalId,
  hospital: location.hospital ? normalizeHospital(location.hospital) : location.hospital ?? undefined,
  totalStock: location.total_stock ?? location.totalStock,
  totalReserved: location.total_reserved ?? location.totalReserved,
  totalVariants: location.total_variants ?? location.totalVariants,
  totalProducts: location.total_products ?? location.totalProducts,
  totalValue: location.total_value ?? location.totalValue,
  createdAt: location.created_at ?? location.createdAt,
  updatedAt: location.updated_at ?? location.updatedAt,
});

const normalizeLocationStockItem = (stock: any): InventoryLocationStockItem => ({
  id: stock.id ?? `${stock.product_id ?? stock.productId}-${stock.variant_id ?? stock.variantId}-${stock.location_id ?? stock.locationId ?? 'location'}`,
  productId: stock.product_id ?? stock.productId ?? '',
  productName: stock.product_name ?? stock.productName ?? '',
  productCategory: stock.product_category ?? stock.productCategory ?? undefined,
  productSubcategory: stock.product_subcategory ?? stock.productSubcategory ?? undefined,
  variantId: stock.variant_id ?? stock.variantId ?? '',
  variantSku: stock.variant_sku ?? stock.variantSku ?? undefined,
  variantLabel: stock.variant_label ?? stock.variantLabel ?? undefined,
  size: stock.size ?? stock.variant_size ?? undefined,
  colorId: stock.color_id ?? stock.colorId ?? stock.color?.id ?? undefined,
  colorLabel: stock.color_label ?? stock.colorLabel ?? stock.color?.label ?? undefined,
  colorHex: stock.color_hex ?? stock.colorHex ?? stock.color?.hex ?? undefined,
  stock: stock.stock ?? 0,
  reserved: stock.reserved ?? stock.reserved_stock ?? undefined,
  minStock: stock.min_stock ?? stock.minStock ?? undefined,
  maxStock: stock.max_stock ?? stock.maxStock ?? undefined,
  updatedAt: stock.updated_at ?? stock.updatedAt ?? undefined,
});

const normalizeVariantStock = (stock: any): InventoryVariantStock => ({
  locationId: stock.location_id ?? stock.locationId,
  stock: stock.stock ?? 0,
  reserved: stock.reserved ?? 0,
  available:
    stock.available ??
    (typeof stock.stock === 'number' && typeof stock.reserved === 'number' ? stock.stock - stock.reserved : stock.stock ?? 0),
  location: stock.location ? normalizeLocation(stock.location) : stock.location ?? undefined,
  updatedAt: stock.updated_at ?? stock.updatedAt,
});

const normalizeCategory = (category: any): InventoryCategory => ({
  id: category.id,
  name: category.name,
  description: category.description,
  icon: category.icon,
  subcategories: category.subcategories || [],
  created_at: category.created_at,
  updated_at: category.updated_at,
});

const normalizeVariant = (variant: any) => {
  const rawStocks =
    Array.isArray(variant.stocks) && variant.stocks.length > 0
      ? variant.stocks
      : Array.isArray(variant.inventory_variant_stocks)
        ? variant.inventory_variant_stocks
        : Array.isArray(variant.locations)
          ? variant.locations
          : Array.isArray(variant.location_stocks)
            ? variant.location_stocks
            : [];

  const normalizedStocks = rawStocks.length ? rawStocks.map(normalizeVariantStock) : undefined;

  return {
    id: variant.id,
    size: variant.size ?? undefined,
    colorId: variant.color_id ?? variant.colorId ?? undefined,
    color: variant.color ?? undefined,
    stock: variant.stock ?? 0,
    minStock: variant.min_stock ?? variant.minStock ?? 0,
    maxStock: variant.max_stock ?? variant.maxStock ?? 0,
    sku: variant.sku ?? '',
    is_low_stock: variant.is_low_stock,
    label: variant.label ?? undefined,
    stocks: normalizedStocks,
  };
};

const normalizeProduct = (product: any): InventoryProduct => ({
  id: product.id,
  name: product.name,
  categoryId: product.category?.id || product.category_id,
  category: product.category,
  subcategoryId: product.subcategory?.id || product.subcategory_id,
  subcategory: product.subcategory,
  description: product.description,
  gender: product.gender ?? product.genero ?? undefined,
  variantMode: product.variant_mode || product.variantMode,
  variants: Array.isArray(product.variants) ? product.variants.map(normalizeVariant) : [],
  total_stock: product.total_stock,
  is_low_stock: product.is_low_stock,
  created_at: product.created_at,
  updated_at: product.updated_at,
});

const normalizeEntryItem = (item: any): InventoryEntryItem => {
  const variant = item.variant ? normalizeVariant(item.variant) : undefined;
  const variantWithMeta = variant
    ? {
        ...variant,
        productId: item.variant.product_id ?? item.variant.productId,
        created_at: item.variant.created_at,
        updated_at: item.variant.updated_at,
      }
    : undefined;

  return {
    id: item.id,
    productId: item.product_id ?? item.productId,
    productName: item.product_name ?? item.productName ?? '',
    variantId: item.variant_id ?? item.variantId ?? undefined,
    variantLabel: item.variant_label ?? item.variantLabel,
    quantity: item.quantity ?? 0,
    previousStock: item.previous_stock ?? item.previousStock ?? 0,
    newStock: item.new_stock ?? item.newStock ?? 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    variant: variantWithMeta,
    product: item.product ? normalizeProduct(item.product) : undefined,
  };
};

const normalizeEntry = (entry: any): InventoryEntry => ({
  id: entry.id,
  supplierId: entry.supplier_id ?? entry.supplierId,
  supplierName: entry.supplier_name ?? entry.supplierName,
  receivedAt: entry.received_at ?? entry.receivedAt,
  locationId: entry.location_id ?? entry.locationId,
  location: entry.location ? normalizeLocation(entry.location) : entry.location ?? undefined,
  documentNumber: entry.document_number ?? entry.documentNumber ?? undefined,
  notes: entry.notes ?? undefined,
  createdBy: entry.created_by ?? entry.createdBy ?? '',
  createdByUserId: entry.created_by_user_id ?? entry.createdByUserId ?? undefined,
  totalItems: entry.total_items ?? entry.totalItems ?? (Array.isArray(entry.items) ? entry.items.length : 0),
  totalQuantity: entry.total_quantity ?? entry.totalQuantity ?? 0,
  items: Array.isArray(entry.items) ? entry.items.map(normalizeEntryItem) : [],
  createdAt: entry.created_at ?? entry.createdAt,
  updatedAt: entry.updated_at ?? entry.updatedAt,
});

const normalizeHospitalRequest = (request: any): HospitalRequest => {
  const rawHospital = request.hospital ?? request.hospital_data ?? null;
  const rawTargetLocation = request.target_location ?? request.targetLocation ?? null;

  const normalizedHospital = rawHospital ? normalizeHospital(rawHospital) : undefined;
  const normalizedTargetLocation = rawTargetLocation ? normalizeLocation(rawTargetLocation) : undefined;

  return {
    id: request.id,
    hospitalId: request.hospital_id || request.hospitalId || (normalizedHospital ? String(normalizedHospital.id) : ''),
    hospitalName: request.hospital_name || request.hospitalName || normalizedHospital?.name || '',
    hospital: normalizedHospital,
    targetLocation: normalizedTargetLocation,
    target_location: normalizedTargetLocation,
    requestedBy: request.requested_by || request.requestedBy,
    createdAt: request.created_at || request.createdAt,
    status: request.status,
    items: Array.isArray(request.items)
      ? request.items.map((item: any) => ({
          id: item.id,
          productId: item.product_id ?? item.productId,
          variantId: item.variant_id ?? item.variantId,
          variantLabel: item.variant_label ?? item.variantLabel,
          size: item.size ?? undefined,
          colorId: item.color_id ?? item.colorId ?? undefined,
          quantity: item.quantity ?? 0,
          notes: item.notes ?? undefined,
          product: item.product ? normalizeProduct(item.product) : undefined,
          variant: item.variant ? normalizeVariant(item.variant) : undefined,
          currentStock: item.current_stock ?? item.currentStock,
        }))
      : [],
    observations: request.observations,
    timeline: request.timeline || [],
    updated_at: request.updated_at,
  };
};

const normalizeStockMovement = (movement: any): InventoryStockMovement => ({
  id: movement.id,
  variantId: movement.variant_id ?? movement.variantId,
  productId: movement.product_id ?? movement.productId,
  productName: movement.product_name ?? movement.productName ?? '',
  variantLabel: movement.variant_label ?? movement.variantLabel ?? undefined,
  quantity: movement.quantity ?? 0,
  reason: (movement.reason ?? 'manual_adjustment') as InventoryStockMovementReason,
  fromLocation: movement.from_location ? normalizeLocation(movement.from_location) : movement.fromLocation ?? undefined,
  fromSupplier: movement.from_supplier
    ? {
        id: movement.from_supplier.id ?? movement.from_supplier.supplier_id ?? movement.from_supplier.supplierId,
        supplierId: movement.from_supplier.supplier_id ?? movement.from_supplier.supplierId ?? movement.from_supplier.id,
        supplierName: movement.from_supplier.supplier_name ?? movement.from_supplier.supplierName,
      }
    : undefined,
  toLocation: movement.to_location ? normalizeLocation(movement.to_location) : movement.toLocation ?? undefined,
  referenceType: movement.reference_type ?? movement.referenceType ?? undefined,
  referenceId: movement.reference_id ?? movement.referenceId ?? undefined,
  movedAt: movement.moved_at ?? movement.movedAt,
  notes: movement.notes ?? undefined,
  actor: movement.actor ?? undefined,
  variant:
    movement.variant && typeof movement.variant === 'object'
      ? {
          id: movement.variant.id ?? movement.variant_id ?? movement.variantId,
          label: movement.variant.label ?? movement.variant_label ?? movement.variantLabel,
          size: movement.variant.size ?? movement.variant_size ?? movement.size,
          colorId: movement.variant.color_id ?? movement.variant.colorId,
          color:
            movement.variant.color && typeof movement.variant.color === 'object'
              ? {
                  id: movement.variant.color.id ?? movement.variant.color_id,
                  label: movement.variant.color.label ?? movement.variant.color_label,
                  hex: movement.variant.color.hex ?? movement.variant.color_hex,
                }
              : undefined,
        }
      : undefined,
});

interface GetCategoriesParams extends Record<string, string | number | boolean | undefined> {
  search?: string;
  page?: number;
  pageSize?: number;
}

interface GetProductsParams extends Record<string, string | number | boolean | undefined> {
  search?: string;
  category?: string;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface GetHospitalRequestsParams extends Record<string, string | number | boolean | undefined> {
  hospitalId?: string;
  status?: HospitalRequestStatus | 'all';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  summary?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CreateCategoryPayload {
  name: string;
  description?: string;
  icon?: string;
  subcategories?: Array<{
    name: string;
    description?: string;
  }>;
}

interface UpdateCategoryPayload {
  name?: string;
  description?: string;
  icon?: string;
}

interface CreateSubcategoryPayload {
  name: string;
  description?: string;
}

interface CreateProductPayload {
  name: string;
  category_id: string;
  subcategory_id?: string;
  description?: string;
  gender?: InventoryGender;
  variant_mode: string;
  variants: Array<{
    size?: string;
    color_id?: string;
    stock: number;
    min_stock: number;
    max_stock?: number;
    sku: string;
  }>;
}

interface UpdateProductPayload {
  name?: string;
  category_id?: string;
  subcategory_id?: string;
  description?: string;
  gender?: InventoryGender;
  variant_mode?: string;
  variants?: Array<{
    id?: string;
    size?: string;
    color_id?: string;
    stock?: number;
    min_stock?: number;
    max_stock?: number;
    sku?: string;
    deleted?: boolean;
  }>;
}

interface CreateHospitalRequestPayload {
  hospital_id: string;
  hospital_name: string;
  requested_by?: string;
  observations?: string;
  items: Array<{
    product_id: string;
    variant_id?: string;
    quantity: number;
    notes?: string;
  }>;
}

interface UpdateHospitalRequestStatusPayload {
  status: HospitalRequestStatus;
  actor?: string;
  description?: string;
}

interface GetEntriesParams extends Record<string, string | number | boolean | undefined> {
  page?: number;
  pageSize?: number;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface CreateEntryPayload {
  supplier_id: string;
  supplier_name?: string;
  received_at: string;
  location_id?: string;
  document_number?: string;
  notes?: string;
  items: Array<{
    product_id: string;
    variant_id?: string;
    quantity: number;
  }>;
}

interface GetLocationsParams extends Record<string, string | number | boolean | undefined> {
  summary?: boolean;
  type?: string;
  isPrimary?: boolean;
  withHospital?: boolean;
}

interface GetStockMovementsParams extends Record<string, string | number | boolean | undefined> {
  variantId?: string;
  reason?: string;
  fromLocationId?: string;
  toLocationId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export const inventoryApiService = {
  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    try {
      const endpoint = `${BASE_PATH}/dashboard`;
      logger.debug('Fetching dashboard data', { endpoint });
      
      const response = await api.get<{ success: boolean; data: DashboardData } | ApiSingleResponse<DashboardData> | DashboardData>(endpoint);
      
      // Manejar diferentes estructuras de respuesta
      if (response.data && typeof response.data === 'object') {
        // Si tiene 'success' y 'data', es una respuesta envuelta (ApiSingleResponse o similar)
        if ('success' in response.data && 'data' in response.data) {
          return (response.data as { success: boolean; data: DashboardData }).data;
        }
        // Si tiene las propiedades de DashboardData directamente, es el objeto
        if ('categories' in response.data && 'low_stock_products' in response.data && 'requests_summary' in response.data) {
          return response.data as DashboardData;
        }
      }
      
      // Fallback: intentar cast directo
      return response.data as unknown as DashboardData;
    } catch (error: any) {
      const status = error?.response?.status || error?.status;
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isPublicRoute = !currentPath.startsWith('/admin');
      const isDashboard = currentPath.includes('/admin') && (currentPath.endsWith('/admin') || currentPath === '/admin');
      if (status !== 403 || (!isDashboard && !isPublicRoute)) {
        logger.error('Error fetching dashboard data', error);
      }
      throw error;
    }
  },

  // Categories
  async getCategories(params: GetCategoriesParams = {}): Promise<ApiPaginatedResponse<InventoryCategory>> {
    try {
      const queryString = buildQueryString(params as Record<string, string | number | boolean | undefined>);
      const endpoint = `${BASE_PATH}/categories${queryString ? `?${queryString}` : ''}`;
      logger.debug('Fetching categories', { endpoint, params });
      
      const response = await api.get<{ success: boolean; data: InventoryCategory[]; pagination?: any } | ApiPaginatedResponse<InventoryCategory>>(endpoint);
      
      // Manejar diferentes estructuras de respuesta
      let categoriesData: InventoryCategory[];
      let paginationData: any = {};
      
      if (response.data && 'success' in response.data && response.data.success) {
        // Estructura { success: true, data: [...], pagination: {...} }
        categoriesData = Array.isArray(response.data.data) ? response.data.data : [];
        paginationData = response.data.pagination || {};
      } else if (response.data && 'data' in response.data && Array.isArray(response.data.data)) {
        // Estructura ApiPaginatedResponse estándar
        categoriesData = response.data.data;
        paginationData = 'pagination' in response.data ? response.data.pagination : {};
      } else if (Array.isArray(response.data)) {
        // Si la respuesta es directamente un array
        categoriesData = response.data;
      } else {
        categoriesData = [];
      }
      
      // Normalize categories
      const normalizedData = categoriesData.map(normalizeCategory);
      
      return {
        success: true,
        data: normalizedData,
        pagination: paginationData,
      };
    } catch (error: any) {
      // No loguear errores 403 desde rutas públicas o dashboard - son lógica de negocio, no errores reales
      const status = error?.response?.status || error?.status;
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isPublicRoute = !currentPath.startsWith('/admin');
      const isDashboard = currentPath.includes('/admin') && (currentPath.endsWith('/admin') || currentPath === '/admin');
      if (status !== 403 || (!isDashboard && !isPublicRoute)) {
        logger.error('Error fetching categories', error);
      }
      throw error;
    }
  },

  async getCategoryById(id: string): Promise<InventoryCategory> {
    try {
      const endpoint = `${BASE_PATH}/categories/${id}`;
      logger.debug('Fetching category by ID', { endpoint, id });
      
      const response = await api.get<ApiSingleResponse<InventoryCategory>>(endpoint);
      return normalizeCategory(response.data.data);
    } catch (error) {
      logger.error('Error fetching category', error);
      throw error;
    }
  },

  async createCategory(payload: CreateCategoryPayload): Promise<InventoryCategory> {
    try {
      const endpoint = `${BASE_PATH}/categories`;
      logger.debug('Creating category', { endpoint, payload });
      
      const response = await api.post<ApiSingleResponse<InventoryCategory>>(endpoint, payload);
      return normalizeCategory(response.data.data);
    } catch (error) {
      logger.error('Error creating category', error);
      throw error;
    }
  },

  async updateCategory(id: string, payload: UpdateCategoryPayload): Promise<InventoryCategory> {
    try {
      const endpoint = `${BASE_PATH}/categories/${id}`;
      logger.debug('Updating category', { endpoint, id, payload });
      
      const response = await api.put<ApiSingleResponse<InventoryCategory>>(endpoint, payload);
      return normalizeCategory(response.data.data);
    } catch (error) {
      logger.error('Error updating category', error);
      throw error;
    }
  },

  async deleteCategory(id: string): Promise<void> {
    try {
      const endpoint = `${BASE_PATH}/categories/${id}`;
      logger.debug('Deleting category', { endpoint, id });
      
      await api.delete(endpoint);
    } catch (error) {
      logger.error('Error deleting category', error);
      throw error;
    }
  },

  // Subcategories
  async createSubcategory(categoryId: string, payload: CreateSubcategoryPayload): Promise<InventoryCategory> {
    try {
      const endpoint = `${BASE_PATH}/categories/${categoryId}/subcategories`;
      logger.debug('Creating subcategory', { endpoint, categoryId, payload });
      
      const response = await api.post<ApiSingleResponse<InventoryCategory>>(endpoint, payload);
      return normalizeCategory(response.data.data);
    } catch (error) {
      logger.error('Error creating subcategory', error);
      throw error;
    }
  },

  async updateSubcategory(
    categoryId: string,
    subcategoryId: string,
    payload: CreateSubcategoryPayload
  ): Promise<InventoryCategory> {
    try {
      const endpoint = `${BASE_PATH}/categories/${categoryId}/subcategories/${subcategoryId}`;
      logger.debug('Updating subcategory', { endpoint, categoryId, subcategoryId, payload });
      
      const response = await api.put<ApiSingleResponse<InventoryCategory>>(endpoint, payload);
      return normalizeCategory(response.data.data);
    } catch (error) {
      logger.error('Error updating subcategory', error);
      throw error;
    }
  },

  async deleteSubcategory(categoryId: string, subcategoryId: string): Promise<void> {
    try {
      const endpoint = `${BASE_PATH}/categories/${categoryId}/subcategories/${subcategoryId}`;
      logger.debug('Deleting subcategory', { endpoint, categoryId, subcategoryId });
      
      await api.delete(endpoint);
    } catch (error) {
      logger.error('Error deleting subcategory', error);
      throw error;
    }
  },

  // Products
  async getProducts(params: GetProductsParams = {}): Promise<ApiPaginatedResponse<InventoryProduct>> {
    try {
      const queryString = buildQueryString(params as Record<string, string | number | boolean | undefined>);
      const endpoint = `${BASE_PATH}/products${queryString ? `?${queryString}` : ''}`;
      logger.debug('Fetching products', { endpoint, params });
      
      const response = await api.get<ApiPaginatedResponse<InventoryProduct>>(endpoint);
      
      // Normalize products
      const normalizedData = response.data.data.map(normalizeProduct);
      
      return {
        ...response.data,
        data: normalizedData,
      };
    } catch (error: any) {
      // No loguear errores 403 desde rutas públicas o dashboard - son lógica de negocio, no errores reales
      const status = error?.response?.status || error?.status;
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isPublicRoute = !currentPath.startsWith('/admin');
      const isDashboard = currentPath.includes('/admin') && (currentPath.endsWith('/admin') || currentPath === '/admin');
      if (status !== 403 || (!isDashboard && !isPublicRoute)) {
        logger.error('Error fetching products', error);
      }
      throw error;
    }
  },

  async getProductById(id: string): Promise<InventoryProduct> {
    try {
      const endpoint = `${BASE_PATH}/products/${id}`;
      logger.debug('Fetching product by ID', { endpoint, id });
      
      const response = await api.get<ApiSingleResponse<InventoryProduct>>(endpoint);
      return normalizeProduct(response.data.data);
    } catch (error) {
      logger.error('Error fetching product', error);
      throw error;
    }
  },

  async createProduct(payload: CreateProductPayload): Promise<InventoryProduct> {
    try {
      const endpoint = `${BASE_PATH}/products`;
      logger.debug('Creating product', { endpoint, payload });
      
      const response = await api.post<ApiSingleResponse<InventoryProduct>>(endpoint, payload);
      return normalizeProduct(response.data.data);
    } catch (error) {
      logger.error('Error creating product', error);
      throw error;
    }
  },

  async updateProduct(id: string, payload: UpdateProductPayload): Promise<InventoryProduct> {
    try {
      const endpoint = `${BASE_PATH}/products/${id}`;
      logger.debug('Updating product', { endpoint, id, payload });
      
      const response = await api.put<ApiSingleResponse<InventoryProduct>>(endpoint, payload);
      return normalizeProduct(response.data.data);
    } catch (error) {
      logger.error('Error updating product', error);
      throw error;
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      const endpoint = `${BASE_PATH}/products/${id}`;
      logger.debug('Deleting product', { endpoint, id });
      
      await api.delete(endpoint);
    } catch (error) {
      logger.error('Error deleting product', error);
      throw error;
    }
  },

  // Inventory entries
  async getEntries(params: GetEntriesParams = {}): Promise<ApiPaginatedResponse<InventoryEntry>> {
    try {
      const queryString = buildQueryString(params as Record<string, string | number | boolean | undefined>);
      const endpoint = `${BASE_PATH}/entries${queryString ? `?${queryString}` : ''}`;
      logger.debug('Fetching inventory entries', { endpoint, params });

      const response = await api.get<ApiPaginatedResponse<any>>(endpoint);
      const normalizedData = response.data.data.map(normalizeEntry);

      return {
        ...response.data,
        data: normalizedData,
      };
    } catch (error: any) {
      // No loguear errores 403 desde rutas públicas o dashboard - son lógica de negocio, no errores reales
      const status = error?.response?.status || error?.status;
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isPublicRoute = !currentPath.startsWith('/admin');
      const isDashboard = currentPath.includes('/admin') && (currentPath.endsWith('/admin') || currentPath === '/admin');
      if (status !== 403 || (!isDashboard && !isPublicRoute)) {
        logger.error('Error fetching inventory entries', error);
      }
      throw error;
    }
  },

  async getEntryById(id: string): Promise<InventoryEntry> {
    try {
      const endpoint = `${BASE_PATH}/entries/${id}`;
      logger.debug('Fetching inventory entry by ID', { endpoint, id });

      const response = await api.get<ApiSingleResponse<any>>(endpoint);
      return normalizeEntry(response.data.data);
    } catch (error) {
      logger.error('Error fetching inventory entry', error);
      throw error;
    }
  },

  async createEntry(payload: CreateEntryPayload): Promise<InventoryEntry> {
    try {
      const endpoint = `${BASE_PATH}/entries`;
      logger.debug('Creating inventory entry', { endpoint, payload });

      const response = await api.post<ApiSingleResponse<any>>(endpoint, payload);
      const data = 'data' in response.data ? response.data.data : response.data;
      return normalizeEntry(data);
    } catch (error) {
      logger.error('Error creating inventory entry', error);
      throw error;
    }
  },

  // Colors
  async getColors(): Promise<InventoryColorOption[]> {
    try {
      const endpoint = `${BASE_PATH}/colors`;
      logger.debug('Fetching colors', { endpoint });
      
      const response = await api.get<ApiSingleResponse<InventoryColorOption[]>>(endpoint);
      return response.data.data;
    } catch (error: any) {
      // No loguear errores 403 desde rutas públicas o dashboard - son lógica de negocio, no errores reales
      const status = error?.response?.status || error?.status;
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isPublicRoute = !currentPath.startsWith('/admin');
      const isDashboard = currentPath.includes('/admin') && (currentPath.endsWith('/admin') || currentPath === '/admin');
      if (status !== 403 || (!isDashboard && !isPublicRoute)) {
        logger.error('Error fetching colors', error);
      }
      throw error;
    }
  },

  // Hospital Requests
  async getHospitalRequests(
    params: GetHospitalRequestsParams = {}
  ): Promise<ApiPaginatedResponse<HospitalRequest> | { success: boolean; data: any }> {
    try {
      const queryString = buildQueryString(params as Record<string, string | number | boolean | undefined>);
      const endpoint = `${BASE_PATH}/hospital-requests${queryString ? `?${queryString}` : ''}`;
      logger.debug('Fetching hospital requests', { endpoint, params });
      
      const response = await api.get<ApiPaginatedResponse<HospitalRequest> | { success: boolean; data: any }>(endpoint);
      
      // If summary=true, return as-is
      if (params.summary) {
        return response.data;
      }
      
      // Normalize requests
      const paginatedResponse = response.data as ApiPaginatedResponse<HospitalRequest>;
      const normalizedData = paginatedResponse.data.map(normalizeHospitalRequest);
      
      return {
        ...paginatedResponse,
        data: normalizedData,
      };
    } catch (error) {
      logger.error('Error fetching hospital requests', error);
      throw error;
    }
  },

  async getHospitalRequestById(id: string): Promise<HospitalRequest> {
    try {
      const endpoint = `${BASE_PATH}/hospital-requests/${id}`;
      logger.debug('Fetching hospital request by ID', { endpoint, id });
      
      const response = await api.get<ApiSingleResponse<HospitalRequest>>(endpoint);
      return normalizeHospitalRequest(response.data.data);
    } catch (error) {
      logger.error('Error fetching hospital request', error);
      throw error;
    }
  },

  async createHospitalRequest(payload: CreateHospitalRequestPayload): Promise<HospitalRequest> {
    try {
      const endpoint = `${BASE_PATH}/hospital-requests`;
      logger.debug('Creating hospital request', { endpoint, payload });
      
      const response = await api.post<ApiSingleResponse<HospitalRequest>>(endpoint, payload);
      return normalizeHospitalRequest(response.data.data);
    } catch (error) {
      logger.error('Error creating hospital request', error);
      throw error;
    }
  },

  async updateHospitalRequestStatus(
    id: string,
    payload: UpdateHospitalRequestStatusPayload
  ): Promise<HospitalRequest> {
    try {
      const endpoint = `${BASE_PATH}/hospital-requests/${id}/status`;
      logger.debug('Updating hospital request status', { endpoint, id, payload });
      
      const response = await api.put<ApiSingleResponse<HospitalRequest>>(endpoint, payload);
      return normalizeHospitalRequest(response.data.data);
    } catch (error) {
      logger.error('Error updating hospital request status', error);
      throw error;
    }
  },

  async getLocations(params: GetLocationsParams = { summary: true }): Promise<InventoryLocation[]> {
    try {
      const queryString = buildQueryString(params as Record<string, string | number | boolean | undefined>);
      const endpoint = `${BASE_PATH}/locations${queryString ? `?${queryString}` : ''}`;
      logger.debug('Fetching inventory locations', { endpoint, params });

      const response = await api.get<ApiSingleResponse<any> | ApiPaginatedResponse<any> | any[]>(endpoint);

      if (Array.isArray(response.data)) {
        return response.data.map((location: any) => normalizeLocation(location));
      }

      if ('data' in response.data) {
        const data = response.data.data;
        if (Array.isArray(data)) {
          return data.map((location: any) => normalizeLocation(location));
        }
        if (data) {
          return [normalizeLocation(data)];
        }
      }

      return [];
    } catch (error) {
      logger.error('Error fetching inventory locations', error);
      throw error;
    }
  },

  async getLocationById(id: string): Promise<InventoryLocationDetail> {
    try {
      const endpoint = `${BASE_PATH}/locations/${id}`;
      logger.debug('Fetching inventory location by ID', { endpoint, id });

      const response = await api.get<ApiSingleResponse<any>>(endpoint);
      const data = response.data.data;
      const normalizedLocation = normalizeLocation(data);
      const stocks = Array.isArray(data.stocks) ? data.stocks.map(normalizeLocationStockItem) : undefined;

      return {
        ...normalizedLocation,
        stocks,
      };
    } catch (error) {
      logger.error('Error fetching inventory location detail', error);
      throw error;
    }
  },

  async getStockMovements(params: GetStockMovementsParams = {}): Promise<ApiPaginatedResponse<InventoryStockMovement>> {
    try {
      const queryString = buildQueryString(params as Record<string, string | number | boolean | undefined>);
      const endpoint = `${BASE_PATH}/stock-movements${queryString ? `?${queryString}` : ''}`;
      logger.debug('Fetching inventory stock movements', { endpoint, params });

      const response = await api.get<ApiPaginatedResponse<any>>(endpoint);
      const normalizedData = response.data.data.map(normalizeStockMovement);

      return {
        ...response.data,
        data: normalizedData,
      };
    } catch (error) {
      logger.error('Error fetching inventory stock movements', error);
      throw error;
    }
  },
};

