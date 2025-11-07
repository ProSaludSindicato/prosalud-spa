import { sstAffiliatesMock } from '@/data/sstAffiliatesMock';
import { sstInventoryMock } from '@/data/sstInventoryMock';
import type {
  SstAffiliate,
  SstDeliveryRecord,
  SstDocumentType,
  SstInventoryItem,
} from '@/types/adminSst';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let deliveryRecords: SstDeliveryRecord[] = [];

export interface AffiliateSearchParams {
  documentType?: SstDocumentType;
  documentNumber?: string;
  includeInactive?: boolean;
}

export const sstAdminService = {
  async getAffiliates(params: AffiliateSearchParams = {}): Promise<SstAffiliate[]> {
    await delay(200);

    const { documentType, documentNumber, includeInactive } = params;

    let results = includeInactive
      ? [...sstAffiliatesMock]
      : sstAffiliatesMock.filter((affiliate) => affiliate.active);

    if (documentType) {
      results = results.filter(
        (affiliate) => affiliate.documentType.toUpperCase() === documentType.toUpperCase(),
      );
    }

    if (documentNumber) {
      results = results.filter((affiliate) =>
        affiliate.documentNumber.toLowerCase().includes(documentNumber.toLowerCase()),
      );
    }

    return results;
  },

  async getAffiliateByDocument(documentType: SstDocumentType, documentNumber: string) {
    await delay(150);
    return sstAffiliatesMock.find(
      (affiliate) =>
        affiliate.documentType === documentType && affiliate.documentNumber === documentNumber,
    );
  },

  async getInventory(): Promise<SstInventoryItem[]> {
    await delay(220);
    return [...sstInventoryMock];
  },

  async getDeliveryHistory(affiliateId: string): Promise<SstDeliveryRecord[]> {
    await delay(180);
    return deliveryRecords.filter((record) => record.affiliateId === affiliateId);
  },

  async registerDelivery(record: SstDeliveryRecord): Promise<SstDeliveryRecord> {
    await delay(250);
    deliveryRecords = [record, ...deliveryRecords];
    return record;
  },
};


