export type SstDocumentType = 'CC' | 'CE' | 'TI' | 'PA';

export type SstInventoryCategory = 'EPP' | 'Dotación' | 'Otro';

export interface SstInventoryVariant {
  color?: string;
  size?: string;
  stockAvailable?: number;
}

export interface SstInventoryItem {
  id: string;
  name: string;
  category: SstInventoryCategory;
  variants?: SstInventoryVariant[];
  defaultColor?: string;
  description?: string;
  unit?: string;
}

export interface SstAffiliate {
  id: string;
  firstName: string;
  lastName: string;
  documentType: SstDocumentType;
  documentNumber: string;
  hospital: string;
  role: string;
  active: boolean;
  lastDeliveryAt?: string;
  pendingTrainings?: string[];
  notes?: string;
}

export interface SstDeliveryItemSelection {
  itemId: string;
  variant?: SstInventoryVariant;
  quantity: number;
}

export interface SstDeliveryRecord {
  id: string;
  affiliateId: string;
  deliveredAt: string;
  deliveredBy: string;
  items: SstDeliveryItemSelection[];
  signedDocumentUrl?: string;
  signedDocumentType?: SstDocumentType;
  signedDocumentNumber?: string;
  notes?: string;
}


