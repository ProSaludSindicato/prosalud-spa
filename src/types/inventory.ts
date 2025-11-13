export const INVENTORY_SIZES = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '3XL',
  '4XL',
  '5XL',
  '35',
  '36',
  '37',
  '38',
  '39',
  '37 - 38',
  '39 - 40',
  '41 - 42',
  '43 - 44',
] as const;

export const INVENTORY_CLOTHING_SIZES = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '3XL',
  '4XL',
  '5XL',
] as const;

export const INVENTORY_FOOTWEAR_SIZES = [
  '35',
  '36',
  '37',
  '38',
  '39',
  '37 - 38',
  '39 - 40',
  '41 - 42',
  '43 - 44',
] as const;

export type InventorySize = typeof INVENTORY_SIZES[number];

export const INVENTORY_GENDERS = ['Hombre', 'Mujer', 'Mixto'] as const;

export type InventoryGender = typeof INVENTORY_GENDERS[number];

export type InventoryVariantMode = 'simple' | 'size' | 'color' | 'size_color';

export interface InventoryHospital {
  id: string | number;
  name: string;
  type?: string;
}

export interface InventoryLocation {
  id: string;
  name: string;
  type?: string;
  isPrimary?: boolean;
  hospitalId?: string | number;
  hospital?: InventoryHospital;
  totalStock?: number;
  totalReserved?: number;
  totalVariants?: number;
  totalProducts?: number;
  totalValue?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryVariantStock {
  locationId: string;
  stock: number;
  reserved?: number;
  available?: number;
  location?: InventoryLocation;
  updatedAt?: string;
}

export interface InventoryColorOption {
  id: string;
  label: string;
  hex: string;
}

export interface InventorySubcategory {
  id: string;
  name: string;
  description?: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  subcategories: InventorySubcategory[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductVariant {
  id: string;
  size?: InventorySize;
  colorId?: string;
  color?: InventoryColorOption; // Added for API response
  stock: number;
  minStock: number;
  maxStock: number;
  sku: string;
  is_low_stock?: boolean; // Added for API response
  label?: string; // Added for API response
  stocks?: InventoryVariantStock[];
}

export interface InventoryProduct {
  id: string;
  name: string;
  categoryId?: string; // Made optional for API compatibility
  category?: InventoryCategory; // Added for API response
  subcategoryId?: string;
  subcategory?: InventorySubcategory; // Added for API response
  description?: string;
  gender?: InventoryGender;
  variantMode?: InventoryVariantMode;
  variant_mode?: InventoryVariantMode; // Added for API compatibility
  variants: ProductVariant[];
  total_stock?: number; // Added for API response
  is_low_stock?: boolean; // Added for API response
  created_at?: string;
  updated_at?: string;
}

export interface EntryVariantDetails extends ProductVariant {
  productId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryEntryItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  createdAt?: string;
  updatedAt?: string;
  variant?: EntryVariantDetails;
  product?: InventoryProduct;
}

export interface InventoryEntry {
  id: string;
  supplierId: string;
  supplierName: string;
  receivedAt: string;
  locationId?: string;
  location?: InventoryLocation;
  documentNumber?: string;
  notes?: string;
  createdBy: string;
  createdByUserId?: string;
  totalItems: number;
  totalQuantity: number;
  items: InventoryEntryItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierDeliveryItem {
  productId: string;
  variantId?: string;
  quantity: number;
  received: number;
}

export interface SupplierDelivery {
  id: string;
  supplierName: string;
  deliveryDate: string;
  totalItems: number;
  status: 'pending' | 'received' | 'completed';
  items: SupplierDeliveryItem[];
}

export type HospitalRequestStatus =
  | 'pending'
  | 'approved'
  | 'preparing'
  | 'delivered'
  | 'rejected';

export interface HospitalRequestItem {
  id?: string;
  productId: string;
  variantId?: string;
  variantLabel?: string;
  size?: string;
  colorId?: string;
  quantity: number;
  notes?: string;
  product?: InventoryProduct;
  variant?: ProductVariant;
  currentStock?: number;
}

export interface HospitalRequestTimelineEvent {
  id: string;
  status: HospitalRequestStatus;
  timestamp: string;
  description?: string;
  actor?: string;
}

export interface HospitalRequest {
  id: string;
  hospitalId: string;
  hospital_id?: string; // API compatibility
  hospitalName: string;
  hospital_name?: string; // API compatibility
  hospital?: InventoryHospital;
  targetLocation?: InventoryLocation;
  target_location?: InventoryLocation; // API compatibility
  requestedBy?: string;
  requested_by?: string; // API compatibility
  createdAt: string;
  created_at?: string; // API compatibility
  status: HospitalRequestStatus;
  items: HospitalRequestItem[];
  observations?: string;
  timeline?: HospitalRequestTimelineEvent[];
  updated_at?: string;
}

export interface InventoryLocationStockItem {
  id: string;
  productId: string;
  productName: string;
  productCategory?: string;
  productSubcategory?: string;
  variantId: string;
  variantSku?: string;
  variantLabel?: string;
  size?: InventorySize;
  colorId?: string;
  colorLabel?: string;
  colorHex?: string;
  stock: number;
  reserved?: number;
  minStock?: number;
  maxStock?: number;
  updatedAt?: string;
}

export interface InventoryLocationDetail extends InventoryLocation {
  stocks?: InventoryLocationStockItem[];
}

export type InventoryStockMovementReason =
  | 'manual_adjustment'
  | 'inventory_entry'
  | 'inventory_exit'
  | 'hospital_request'
  | 'return'
  | 'transfer'
  | string;

export interface InventoryStockMovement {
  id: string;
  variantId: string;
  productId?: string;
  productName: string;
  variantLabel?: string;
  quantity: number;
  reason: InventoryStockMovementReason;
  fromLocation?: InventoryLocation | null;
  fromSupplier?: {
    id?: string;
    supplierId?: string;
    supplierName?: string;
  } | null;
  toLocation?: InventoryLocation | null;
  referenceType?: string;
  referenceId?: string;
  movedAt: string;
  notes?: string;
  actor?: string;
  variant?: {
    id?: string;
    label?: string;
    size?: InventorySize | string | null;
    colorId?: string | null;
    color?: InventoryColorOption | { id?: string; label?: string; hex?: string } | null;
  } | null;
}

// API Response types
export interface ApiPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

export interface ApiSingleResponse<T> {
  success: boolean;
  data: T;
}

export interface DashboardLowStockItem {
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_label: string;
  stock: number;
  min_stock: number;
}

export interface DashboardCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  total_stock: number;
  available_stock: number;
  reserved_stock: number;
  low_stock_items: DashboardLowStockItem[];
  subcategories: InventorySubcategory[];
}

export interface DashboardLowStockProduct {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  variants: Array<{
    id: string;
    label: string;
    stock: number;
    min_stock: number;
  }>;
}

export interface DashboardRequestsSummary {
  pending: number;
  approved: number;
  preparing: number;
  shipped: number;
  delivered?: number;
  rejected?: number;
}

export interface DashboardData {
  categories: DashboardCategory[];
  low_stock_products: DashboardLowStockProduct[];
  requests_summary: DashboardRequestsSummary;
}


