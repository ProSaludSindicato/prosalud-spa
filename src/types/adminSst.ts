export type SstDocumentType = 'CC' | 'CE' | 'PT';

export type SstInventoryCategory = 'EPP' | 'Dotación' | 'Otro';

export interface SstInventoryVariant {
  color?: string;
  /** Etiqueta humana desde inventory_colors (API); preferir sobre el mapa estático del front */
  colorLabel?: string;
  size?: string;
  stockAvailable?: number;
}

export interface SstInventoryItem {
  id: string;
  baseId?: string;
  name: string;
  category: SstInventoryCategory;
  variants?: SstInventoryVariant[];
  defaultColor?: string;
  description?: string;
  unit?: string;
  gender?: string;
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

export type SstDeliveryType = 'first_time' | 'periodic';

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
  deliveryType?: SstDeliveryType;
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
  deliveryType: SstDeliveryType;
}

export type SstReturnReason = 'retirement' | 'replacement' | 'other';

export interface SstReturnRecord {
  id: string;
  affiliateId: string;
  returnedAt: string;
  receivedBy: string;
  receivedByName?: string;
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
  reason?: SstReturnReason;
  notes?: string | null;
}

export interface SstReturnsResponse {
  items: SstReturnRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SstReturnDraft {
  affiliateId: string;
  affiliateDocumentType: SstDocumentType;
  affiliateDocumentNumber: string;
  receivedBy: string;
  receivedByName: string;
  items: SstDeliveryItemSelection[];
  signatureData: string;
  signedDocumentType: SstDocumentType;
  signedDocumentNumber: string;
  reason?: SstReturnReason;
  notes?: string;
}


