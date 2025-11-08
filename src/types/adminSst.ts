export type SstDocumentType = 'CC' | 'CE' | 'PT';

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
  status?: string;
  convenioStatus?: string;
  lastDeliveryAt?: string;
  pendingTrainings?: string[];
  notes?: string | null;
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
  deliveredByName?: string;
  affiliateDocumentType?: SstDocumentType;
  affiliateDocumentNumber?: string;
  affiliateFirstName?: string;
  affiliateLastName?: string;
  affiliateFullName?: string;
  affiliateHospital?: string;
  affiliateRole?: string;
  items: SstDeliveryItemSelection[];
  signedDocumentUrl?: string | null;
  signedDocumentType?: SstDocumentType;
  signedDocumentNumber?: string;
  notes?: string | null;
}

export interface SstAffiliatesResponse {
  items: SstAffiliate[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SstInventoryResponse {
  items: SstInventoryItem[];
}

export interface SstDeliveriesResponse {
  items: SstDeliveryRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SstDeliveryDraft {
  affiliateId: string;
  affiliateDocumentType: SstDocumentType;
  affiliateDocumentNumber: string;
  deliveredBy: string;
  deliveredByName: string;
  items: SstDeliveryItemSelection[];
  signatureData: string;
  signedDocumentType: SstDocumentType;
  signedDocumentNumber: string;
  notes?: string;
}


