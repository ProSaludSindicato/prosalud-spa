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
}

export interface ProductVariant {
  id: string;
  size?: InventorySize;
  colorId?: string;
  stock: number;
  minStock: number;
  maxStock: number;
  sku: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  categoryId: string;
  subcategoryId?: string;
  description?: string;
  variantMode?: InventoryVariantMode;
  variants: ProductVariant[];
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
  productId: string;
  variantId?: string;
  variantLabel?: string;
  size?: string;
  colorId?: string;
  quantity: number;
  notes?: string;
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
  hospitalName: string;
  requestedBy?: string;
  createdAt: string;
  status: HospitalRequestStatus;
  items: HospitalRequestItem[];
  observations?: string;
  timeline?: HospitalRequestTimelineEvent[];
}


