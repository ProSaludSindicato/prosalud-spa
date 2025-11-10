export type InventoryVariantMode = 'simple' | 'size' | 'color' | 'size_color';

export type InventorySize =
  | 'XS'
  | 'S'
  | 'M'
  | 'L'
  | 'XL'
  | 'XXL'
  | '3XL'
  | '4XL'
  | '5XL';

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
}

export interface InventoryProduct {
  id: string;
  name: string;
  categoryId?: string; // Made optional for API compatibility
  category?: InventoryCategory; // Added for API response
  subcategoryId?: string;
  subcategory?: InventorySubcategory; // Added for API response
  description?: string;
  variantMode?: InventoryVariantMode;
  variant_mode?: InventoryVariantMode; // Added for API compatibility
  variants: ProductVariant[];
  total_stock?: number; // Added for API response
  is_low_stock?: boolean; // Added for API response
  created_at?: string;
  updated_at?: string;
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
  | 'shipped'
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


