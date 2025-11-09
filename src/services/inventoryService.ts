
import { Product, SupplierDelivery, Return, InventoryRequest, Hospital } from './types/mockTypes';
import { mockProducts, mockSupplierDeliveries, mockReturns, mockInventoryRequests, mockHospitals } from './mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const inventoryService = {
  // Products
  async getProducts(): Promise<Product[]> {
    await delay(400);
    return [...mockProducts];
  },

  async getProductById(id: string): Promise<Product | null> {
    await delay(300);
    return mockProducts.find(product => product.id === id) || null;
  },

  async createProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    await delay(800);
    const newProduct: Product = {
      ...productData,
      id: String(mockProducts.length + 1),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockProducts.push(newProduct);
    return newProduct;
  },

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    await delay(600);
    const productIndex = mockProducts.findIndex(product => product.id === id);
    if (productIndex === -1) throw new Error('Producto no encontrado');
    
    mockProducts[productIndex] = { 
      ...mockProducts[productIndex], 
      ...productData, 
      updated_at: new Date().toISOString() 
    };
    return mockProducts[productIndex];
  },

  // Supplier Deliveries
  async getSupplierDeliveries(): Promise<SupplierDelivery[]> {
    await delay(400);
    return [...mockSupplierDeliveries];
  },

  async createSupplierDelivery(deliveryData: Omit<SupplierDelivery, 'id' | 'created_at'>): Promise<SupplierDelivery> {
    await delay(800);
    const newDelivery: SupplierDelivery = {
      ...deliveryData,
      id: String(mockSupplierDeliveries.length + 1),
      created_at: new Date().toISOString()
    };
    mockSupplierDeliveries.push(newDelivery);
    return newDelivery;
  },

  async updateSupplierDelivery(id: string, deliveryData: Partial<SupplierDelivery>): Promise<SupplierDelivery> {
    await delay(600);
    const deliveryIndex = mockSupplierDeliveries.findIndex(delivery => delivery.id === id);
    if (deliveryIndex === -1) throw new Error('Entrega no encontrada');
    
    mockSupplierDeliveries[deliveryIndex] = { ...mockSupplierDeliveries[deliveryIndex], ...deliveryData };
    return mockSupplierDeliveries[deliveryIndex];
  },

  // Inventory Requests
  async getInventoryRequests(): Promise<InventoryRequest[]> {
    await delay(400);
    return [...mockInventoryRequests];
  },

  async createInventoryRequest(requestData: Omit<InventoryRequest, 'id' | 'created_at'>): Promise<InventoryRequest> {
    await delay(800);
    const newRequest: InventoryRequest = {
      ...requestData,
      id: String(mockInventoryRequests.length + 1),
      created_at: new Date().toISOString()
    };
    mockInventoryRequests.push(newRequest);
    return newRequest;
  },

  async updateInventoryRequest(id: string, requestData: Partial<InventoryRequest>): Promise<InventoryRequest> {
    await delay(600);
    const requestIndex = mockInventoryRequests.findIndex(request => request.id === id);
    if (requestIndex === -1) throw new Error('Solicitud no encontrada');
    
    mockInventoryRequests[requestIndex] = { ...mockInventoryRequests[requestIndex], ...requestData };
    return mockInventoryRequests[requestIndex];
  },

  // Returns
  async getReturns(): Promise<Return[]> {
    await delay(400);
    return [...mockReturns];
  },

  async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return> {
    await delay(800);
    const newReturn: Return = {
      ...returnData,
      id: String(mockReturns.length + 1),
      created_at: new Date().toISOString()
    };
    mockReturns.push(newReturn);
    return newReturn;
  },

  async updateReturn(id: string, returnData: Partial<Return>): Promise<Return> {
    await delay(600);
    const returnIndex = mockReturns.findIndex(returnItem => returnItem.id === id);
    if (returnIndex === -1) throw new Error('Devolución no encontrada');
    
    mockReturns[returnIndex] = { ...mockReturns[returnIndex], ...returnData };
    return mockReturns[returnIndex];
  },

  // Hospitals
  async getHospitals(): Promise<Hospital[]> {
    await delay(300);
    return [...mockHospitals];
  }
};
