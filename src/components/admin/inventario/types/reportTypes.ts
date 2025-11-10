
export type StockStatus = 'ok' | 'low' | 'critical';

export interface ReportMetadata {
  generatedAt: string;
  reportId: string;
  generatedBy: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ReportSummary {
  totalCategories: number;
  totalProducts: number;
  totalVariants: number;
  totalStock: number;
  lowStockCount: number;
  criticalStockCount: number;
  pendingHospitalRequests: number;
  preparingHospitalRequests: number;
  shippedHospitalRequests: number;
  deliveredHospitalRequests: number;
  rejectedHospitalRequests: number;
  pendingDeliveries: number;
}

export interface ReportProduct {
  productId: string;
  variantId?: string;
  sku: string;
  name: string;
  categoryName: string;
  stock: number;
  min: number;
  max: number;
  status: StockStatus;
  pendingRequests: number;
  pendingHospitals: string[];
  lastRequestDate?: string;
}

export interface ReportCategory {
  id: string;
  name: string;
  description?: string;
  totalProducts: number;
  lowStockProducts: number;
  criticalProducts: number;
  products: ReportProduct[];
}

export interface RequestRecord {
  id: string;
  hospital: string;
  coordinator?: string;
  createdAt: string;
  status: string;
  totalItems: number;
  pendingItems: number;
  lastUpdate: string;
}

export interface ReturnRecord {
  id: string;
  hospital: string;
  coordinator: string;
  date: string;
  products: string[];
  reason: string;
  status: 'pending' | 'processed';
}

export interface DeliveryRecord {
  id: string;
  supplier: string;
  date: string;
  totalItems: number;
  status: string;
  products: string[];
}

export interface ReportData {
  metadata: ReportMetadata;
  summary: ReportSummary;
  categories: ReportCategory[];
  requests: RequestRecord[];
  deliveries: DeliveryRecord[];
}

export type ReportType = 'strategic' | 'operational' | 'lowstock';

export interface DateRangeFilter {
  start?: Date;
  end?: Date;
  includeAll: boolean;
}
