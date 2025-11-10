
import {
  ReportData,
  ReportCategory,
  ReportProduct,
  ReportSummary,
  RequestRecord,
  DeliveryRecord,
  DateRangeFilter,
  ReportType,
  StockStatus,
} from '../types/reportTypes';
import { InventoryCategory, InventoryProduct, HospitalRequest, SupplierDelivery } from '@/types/inventory';

interface BuildReportParams {
  categories: InventoryCategory[];
  products: InventoryProduct[];
  hospitalRequests: HospitalRequest[];
  deliveries: SupplierDelivery[];
  dateRange: DateRangeFilter;
  reportType: ReportType;
}

const isWithinRange = (dateString: string, range: DateRangeFilter): boolean => {
  if (range.includeAll || !range.start || !range.end) return true;
  const date = new Date(dateString);
  return date >= range.start && date <= range.end;
};

const getStockStatus = (stock: number, min: number): StockStatus => {
  if (stock <= 0) return 'critical';
  if (stock <= min) return 'low';
  return 'ok';
};

export const buildReportData = ({
  categories,
  products,
  hospitalRequests,
  deliveries,
  dateRange,
}: BuildReportParams): ReportData => {
  const categoryLookup = new Map(categories.map((category) => [category.id, category]));

  const relevantHospitalRequests = hospitalRequests.filter((request) => isWithinRange(request.createdAt, dateRange));
  const relevantDeliveries = deliveries.filter((delivery) => isWithinRange(delivery.deliveryDate, dateRange));

  const variantRequestMap = new Map<string, { quantity: number; hospitals: Set<string>; lastDate?: string }>();

  relevantHospitalRequests
    .filter((request) => request.status !== 'rejected' && request.status !== 'delivered')
    .forEach((request) => {
      request.items.forEach((item) => {
        const key = `${item.productId}-${item.variantId ?? 'default'}`;
        const current = variantRequestMap.get(key) ?? { quantity: 0, hospitals: new Set<string>() };
        current.quantity += item.quantity;
        if (request.hospitalName) {
          current.hospitals.add(request.hospitalName);
        }
        const lastDate = current.lastDate ? new Date(current.lastDate) : undefined;
        const requestDate = new Date(request.createdAt);
        if (!lastDate || requestDate > lastDate) {
          current.lastDate = request.createdAt;
        }
        variantRequestMap.set(key, current);
      });
    });

  const categoriesWithProducts: ReportCategory[] = categories.map((category) => {
    const categoryProducts: ReportProduct[] = products
      .filter((product) => {
        const productCategoryId = product.categoryId ?? product.category?.id;
        return productCategoryId === category.id;
      })
      .flatMap((product) => {
        return product.variants.map((variant) => {
          const key = `${product.id}-${variant.id ?? 'default'}`;
          const pending = variantRequestMap.get(key);
          const stock = variant.stock ?? 0;
          const min = variant.minStock ?? 0;
          const max = variant.maxStock ?? min * 2;
          const status = getStockStatus(stock, min);
          return {
            productId: product.id,
            variantId: variant.id,
          sku: variant.sku,
            name: `${product.name}${variant.size ? ` · Talla ${variant.size}` : ''}${
              variant.colorId ? ` · ${variant.colorId}` : ''
            }`,
            categoryName: category.name,
            stock,
            min,
            max,
            status,
            pendingRequests: pending?.quantity ?? 0,
            pendingHospitals: Array.from(pending?.hospitals ?? []),
            lastRequestDate: pending?.lastDate,
          } satisfies ReportProduct;
        });
      });

    const lowStockProducts = categoryProducts.filter((product) => product.status === 'low');
    const criticalProducts = categoryProducts.filter((product) => product.status === 'critical');

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      totalProducts: categoryProducts.length,
      lowStockProducts: lowStockProducts.length,
      criticalProducts: criticalProducts.length,
      products: categoryProducts,
    } satisfies ReportCategory;
  });

  const requestsRecords: RequestRecord[] = relevantHospitalRequests.map((request) => {
    const totalItems = request.items.reduce((sum, item) => sum + item.quantity, 0);
    const pendingItems = request.status === 'delivered' || request.status === 'rejected' ? 0 : totalItems;
    const lastTimeline = request.timeline?.[request.timeline.length - 1];
    return {
      id: request.id,
      hospital: request.hospitalName,
      coordinator: request.requestedBy,
      createdAt: request.createdAt,
      status: request.status,
      totalItems,
      pendingItems,
      lastUpdate: lastTimeline?.timestamp ?? request.createdAt,
    };
  });

  const deliveryRecords: DeliveryRecord[] = relevantDeliveries.map((delivery) => {
    const productNames = delivery.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const variant = product?.variants.find((v) => v.id === item.variantId);
      const baseName = product?.name ?? item.productId;
      if (variant) {
        const parts = [baseName];
        if (variant.size) parts.push(`Talla ${variant.size}`);
        if (variant.colorId) parts.push(variant.colorId);
        return parts.join(' · ');
      }
      return baseName;
    });

    const totalItems = delivery.items.reduce((sum, item) => sum + item.quantity, 0) || delivery.totalItems;

    return {
      id: delivery.id,
      supplier: delivery.supplierName,
      date: delivery.deliveryDate,
      totalItems,
      status: delivery.status,
      products: productNames,
    };
  });

  const allProducts = categoriesWithProducts.flatMap((category) => category.products);
  const lowStockCount = allProducts.filter((product) => product.status === 'low').length;
  const criticalStockCount = allProducts.filter((product) => product.status === 'critical').length;

  const summary: ReportSummary = {
    totalCategories: categories.length,
    totalProducts: products.length,
    totalVariants: allProducts.length,
    totalStock: allProducts.reduce((acc, product) => acc + product.stock, 0),
    lowStockCount,
    criticalStockCount,
    pendingHospitalRequests: relevantHospitalRequests.filter((request) => request.status === 'pending').length,
    preparingHospitalRequests: relevantHospitalRequests.filter((request) => request.status === 'preparing').length,
    shippedHospitalRequests: relevantHospitalRequests.filter((request) => request.status === 'shipped').length,
    deliveredHospitalRequests: relevantHospitalRequests.filter((request) => request.status === 'delivered').length,
    rejectedHospitalRequests: relevantHospitalRequests.filter((request) => request.status === 'rejected').length,
    pendingDeliveries: relevantDeliveries.filter((delivery) => delivery.status !== 'completed').length,
  };

  return {
    metadata: {
      generatedAt: new Date().toLocaleString('es-ES'),
      reportId: `REP-${Date.now()}`,
      generatedBy: 'Gestión de Inventario Prosalud',
      dateRange: !dateRange.includeAll && dateRange.start && dateRange.end
        ? {
            start: dateRange.start.toLocaleDateString('es-ES'),
            end: dateRange.end.toLocaleDateString('es-ES'),
          }
        : undefined,
    },
    summary,
    categories: categoriesWithProducts,
    requests: requestsRecords,
    deliveries: deliveryRecords,
  };
};

export const getFilteredData = (reportType: ReportType, data: ReportData): ReportData => {
  switch (reportType) {
    case 'operational': {
      const categories = data.categories.map((category) => ({
        ...category,
        products: category.products.filter((product) => product.pendingRequests > 0 || product.status !== 'ok'),
      }));

      return {
        ...data,
        categories: categories.filter((category) => category.products.length > 0),
        requests: data.requests.filter((request) => request.pendingItems > 0),
      };
    }
    case 'lowstock': {
      const categories = data.categories
        .map((category) => ({
          ...category,
          products: category.products.filter((product) => product.status !== 'ok'),
        }))
        .filter((category) => category.products.length > 0);

      return {
        ...data,
        categories,
        requests: data.requests.filter((request) => request.pendingItems > 0),
      };
    }
    case 'strategic':
    default:
      return data;
  }
};
