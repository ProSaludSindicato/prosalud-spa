import type {
  SstAffiliate,
  SstAffiliatesResponse,
  SstDeliveryDraft,
  SstDeliveryRecord,
  SstDeliveriesResponse,
  SstDocumentType,
  SstInventoryItem,
  SstInventoryResponse,
  SstReturnDraft,
  SstReturnRecord,
  SstReturnsResponse,
} from '@/types/adminSst';
import { buildAdminApiUrl } from '@/config/api';
import { logger } from '@/utils/logger';

const BASE_PATH = '/api/dotacion-epp';

const endpoints = {
  affiliates: `${BASE_PATH}/affiliates`,
  inventory: `${BASE_PATH}/inventory`,
  deliveries: `${BASE_PATH}/deliveries`,
  returns: `${BASE_PATH}/returns`,
} as const;

interface GetAffiliatesParams {
  page?: number;
  pageSize?: number;
  documentType?: SstDocumentType;
  documentNumber?: string;
  hospital?: string;
  status?: 'active' | 'inactive' | 'all';
  searchTerm?: string;
  signal?: AbortSignal;
}

interface GetDeliveryHistoryParams {
  affiliateId?: string;
  deliveredBy?: string;
  hospital?: string;
  startDate?: string;
  endDate?: string;
  documentNumber?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

interface GetReturnHistoryParams {
  affiliateId?: string;
  receivedBy?: string;
  hospital?: string;
  startDate?: string;
  endDate?: string;
  documentNumber?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

const buildQueryString = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const parseErrorMessage = async (response: Response): Promise<never> => {
  let message = `Error ${response.status}`;

  try {
    const data = await response.json();
    if (data?.message) {
      message = data.message;
    }
  } catch (error) {
    logger.error('No fue posible parsear el mensaje de error del API Dotación & EPP', error instanceof Error ? error.message : error);
  }

  const apiError = new Error(message) as Error & { status?: number };
  apiError.status = response.status;
  throw apiError;
};

const mapAffiliate = (affiliate: any): SstAffiliate => ({
  id: affiliate.id,
  firstName: affiliate.firstName,
  lastName: affiliate.lastName,
  documentType: affiliate.documentType as SstDocumentType,
  documentNumber: affiliate.documentNumber,
  hospital: affiliate.hospital,
  role: affiliate.role,
  active: Boolean(affiliate.active ?? affiliate.status === 'ACTIVO'),
  status: affiliate.status ?? undefined,
  convenioStatus: affiliate.convenioStatus ?? undefined,
  lastDeliveryAt: affiliate.lastDeliveryAt ?? undefined,
  notes: affiliate.notes ?? null,
});

const mapDeliveryRecord = (record: any): SstDeliveryRecord => {
  const affiliateData = record.affiliate ?? record.affiliateData ?? record.affiliateDetails ?? null;
  const affiliateDocumentType =
    record.affiliateDocumentType ?? affiliateData?.documentType ?? record.documentType ?? undefined;
  const affiliateDocumentNumber =
    record.affiliateDocumentNumber ?? affiliateData?.documentNumber ?? record.documentNumber ?? undefined;
  const affiliateFirstName = affiliateData?.firstName ?? record.affiliateFirstName ?? undefined;
  const affiliateLastName = affiliateData?.lastName ?? record.affiliateLastName ?? undefined;
  const affiliatePrimaryFullName = record.affiliateFullName ?? '';
  const affiliateSecondaryFullName = affiliateData?.fullName ?? '';
  const affiliateFallbackFullName = [affiliateFirstName, affiliateLastName].filter(Boolean).join(' ');
  const affiliateFullName =
    affiliatePrimaryFullName ||
    affiliateSecondaryFullName ||
    (affiliateFallbackFullName !== '' ? affiliateFallbackFullName : undefined);
  const affiliateHospital = record.affiliateHospital ?? affiliateData?.hospital ?? undefined;
  const affiliateRole = record.affiliateRole ?? affiliateData?.role ?? undefined;

  return {
    id: record.id,
    affiliateId: record.affiliateId,
    deliveredAt: record.deliveredAt,
    deliveredBy: record.deliveredByName ?? record.deliveredBy,
    deliveredByName: record.deliveredByName ?? record.deliveredBy,
    affiliateDocumentType: affiliateDocumentType as SstDocumentType | undefined,
    affiliateDocumentNumber: affiliateDocumentNumber ?? undefined,
    affiliateFirstName,
    affiliateLastName,
    affiliateFullName,
    affiliateHospital,
    affiliateRole,
    items: Array.isArray(record.items)
      ? record.items.map((item: any) => ({
          itemId: item.itemId,
          variant: item.variant,
          quantity: item.quantity,
        }))
      : [],
    signedDocumentUrl: record.signedDocumentUrl ?? null,
    signedDocumentType: record.signedDocumentType as SstDocumentType | undefined,
    signedDocumentNumber: record.signedDocumentNumber ?? undefined,
    notes: record.notes ?? null,
    deliveryType: record.deliveryType ?? record.type ?? undefined,
  };
};

const mapReturnRecord = (record: any): SstReturnRecord => {
  const affiliateData = record.affiliate ?? record.affiliateData ?? record.affiliateDetails ?? null;
  const affiliateDocumentType =
    record.affiliateDocumentType ?? affiliateData?.documentType ?? record.documentType ?? undefined;
  const affiliateDocumentNumber =
    record.affiliateDocumentNumber ?? affiliateData?.documentNumber ?? record.documentNumber ?? undefined;
  const affiliateFirstName = affiliateData?.firstName ?? record.affiliateFirstName ?? undefined;
  const affiliateLastName = affiliateData?.lastName ?? record.affiliateLastName ?? undefined;
  const affiliatePrimaryFullName = record.affiliateFullName ?? '';
  const affiliateSecondaryFullName = affiliateData?.fullName ?? '';
  const affiliateFallbackFullName = [affiliateFirstName, affiliateLastName].filter(Boolean).join(' ');
  const affiliateFullName =
    affiliatePrimaryFullName ||
    affiliateSecondaryFullName ||
    (affiliateFallbackFullName !== '' ? affiliateFallbackFullName : undefined);
  const affiliateHospital = record.affiliateHospital ?? affiliateData?.hospital ?? undefined;
  const affiliateRole = record.affiliateRole ?? affiliateData?.role ?? undefined;

  return {
    id: record.id,
    affiliateId: record.affiliateId,
    returnedAt: record.returnedAt ?? record.returned_at ?? record.createdAt ?? record.created_at,
    receivedBy: record.receivedByName ?? record.receivedBy ?? record.received_by,
    receivedByName: record.receivedByName ?? record.receivedBy ?? record.received_by,
    affiliateDocumentType: affiliateDocumentType as SstDocumentType | undefined,
    affiliateDocumentNumber: affiliateDocumentNumber ?? undefined,
    affiliateFirstName,
    affiliateLastName,
    affiliateFullName,
    affiliateHospital,
    affiliateRole,
    items: Array.isArray(record.items)
      ? record.items.map((item: any) => ({
          itemId: item.itemId,
          variant: item.variant,
          quantity: item.quantity,
        }))
      : [],
    signedDocumentUrl: record.signedDocumentUrl ?? null,
    signedDocumentType: record.signedDocumentType as SstDocumentType | undefined,
    signedDocumentNumber: record.signedDocumentNumber ?? undefined,
    reason: record.reason ?? undefined,
    notes: record.notes ?? null,
  };
};

const mapInventoryItem = (item: any): SstInventoryItem => ({
  id: item.id,
  baseId: item.baseId ?? item.id,
  name: item.name,
  category: item.category,
  defaultColor: item.defaultColor ?? item.default_color ?? undefined,
  description: item.description ?? undefined,
  unit: item.unit ?? undefined,
  variants: Array.isArray(item.variants) ? item.variants : undefined,
  gender: item.gender ?? item.genero ?? undefined,
});

const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T | undefined> => {
  // Obtener token del localStorage
  const token = localStorage.getItem('prosalud_auth_token');
  
  const headers: HeadersInit = {
    Accept: 'application/json',
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers ?? {}),
  };

  let response: Response;

  try {
    response = await fetch(input, {
      ...init,
      headers,
    });
  } catch (error) {
    const networkError = new Error(
      'No fue posible conectar con el servicio de Dotación y EPP. Verifica tu conexión o intenta nuevamente más tarde.',
    ) as Error & { cause?: unknown };
    networkError.cause = error;
    throw networkError;
  }

  if (!response.ok) {
    await parseErrorMessage(response);
  }

  if (response.status === 204) {
    return undefined;
  }

  const data = (await response.json()) as T;
  return data;
};

export const sstAdminService = {
  async getAffiliates({
    page = 1,
    pageSize = 50,
    documentType,
    documentNumber,
    hospital,
    status = 'active',
    searchTerm,
    signal,
  }: GetAffiliatesParams = {}): Promise<SstAffiliatesResponse> {
    const queryString = buildQueryString({
      page,
      pageSize,
      documentType,
      documentNumber,
      hospital,
      status,
      searchTerm,
    });

    const data = (await fetchJson<any>(
      buildAdminApiUrl(`${endpoints.affiliates}${queryString}`),
      { method: 'GET', signal }
    )) ?? {};

    return {
      items: Array.isArray(data.items) ? data.items.map(mapAffiliate) : [],
      total: data.total ?? 0,
      page: data.page ?? page,
      pageSize: data.pageSize ?? pageSize,
    };
  },

  async getAffiliateByDocument(documentType: SstDocumentType, documentNumber: string, signal?: AbortSignal): Promise<SstAffiliate | null> {
    try {
      const data = await fetchJson<any>(
        buildAdminApiUrl(`${endpoints.affiliates}/${documentType}/${documentNumber}`),
        { method: 'GET', signal }
      );

      if (!data) {
        return null;
      }

      return mapAffiliate(data);
    } catch (error: any) {
      // Si es 404, retornar null (afiliado no encontrado)
      if (error?.status === 404) {
        return null;
      }
      // Para otros errores, re-lanzar
      throw error;
    }
  },

  async getInventory(signal?: AbortSignal): Promise<SstInventoryItem[]> {
    const data = await fetchJson<SstInventoryResponse>(
      buildAdminApiUrl(endpoints.inventory),
      { method: 'GET', signal }
    );

    const rawItems = Array.isArray(data?.items) ? (data.items as SstInventoryItem[]) : [];
    return rawItems.map(mapInventoryItem);
  },

  async getDeliveryHistory({
    affiliateId,
    deliveredBy,
    hospital,
    startDate,
    endDate,
    documentNumber,
    searchTerm,
    page = 1,
    pageSize = 25,
    signal,
  }: GetDeliveryHistoryParams = {}): Promise<SstDeliveriesResponse> {
    const queryString = buildQueryString({
      affiliateId,
      deliveredBy,
      hospital,
      startDate,
      endDate,
      documentNumber,
      searchTerm,
      page,
      pageSize,
    });
    const data = await fetchJson<any>(
      buildAdminApiUrl(`${endpoints.deliveries}${queryString}`),
      { method: 'GET', signal }
    );

    const rawItems = Array.isArray(data?.items) ? (data.items as any[]) : [];

    return {
      items: rawItems.map(mapDeliveryRecord),
      total: data?.total ?? 0,
      page: data?.page ?? page,
      pageSize: data?.pageSize ?? pageSize,
    };
  },

  async registerDelivery(draft: SstDeliveryDraft): Promise<{ message: string; record: SstDeliveryRecord }> {
    const payload = {
      affiliateId: draft.affiliateId,
      affiliateDocumentType: draft.affiliateDocumentType,
      affiliateDocumentNumber: draft.affiliateDocumentNumber,
      items: draft.items.map((item) => ({
        itemId: item.itemId,
        variant: item.variant ? { color: item.variant.color, size: item.variant.size } : undefined,
        quantity: item.quantity,
      })),
      signatureData: draft.signatureData,
      signedDocumentType: draft.signedDocumentType,
      signedDocumentNumber: draft.signedDocumentNumber,
      deliveredBy: draft.deliveredBy,
      deliveredByName: draft.deliveredByName,
      notes: draft.notes ?? null,
      deliveryType: draft.deliveryType,
    };

    const data = await fetchJson<any>(buildAdminApiUrl(endpoints.deliveries), {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!data) {
      throw new Error('El servicio de Dotación y EPP no retornó información de la entrega registrada.');
    }

    return {
      message: data.message ?? 'Entrega registrada exitosamente',
      record: mapDeliveryRecord(data.record),
    };
  },

  async getReturnHistory({
    affiliateId,
    receivedBy,
    hospital,
    startDate,
    endDate,
    documentNumber,
    searchTerm,
    page = 1,
    pageSize = 25,
    signal,
  }: GetReturnHistoryParams = {}): Promise<SstReturnsResponse> {
    const queryString = buildQueryString({
      affiliateId,
      receivedBy,
      hospital,
      startDate,
      endDate,
      documentNumber,
      searchTerm,
      page,
      pageSize,
    });
    const data = await fetchJson<any>(
      buildAdminApiUrl(`${endpoints.returns}${queryString}`),
      { method: 'GET', signal }
    );

    const rawItems = Array.isArray(data?.items) ? (data.items as any[]) : [];

    return {
      items: rawItems.map(mapReturnRecord),
      total: data?.total ?? 0,
      page: data?.page ?? page,
      pageSize: data?.pageSize ?? pageSize,
    };
  },

  async registerReturn(draft: SstReturnDraft): Promise<{ message: string; record: SstReturnRecord }> {
    const payload = {
      affiliateId: draft.affiliateId,
      affiliateDocumentType: draft.affiliateDocumentType,
      affiliateDocumentNumber: draft.affiliateDocumentNumber,
      items: draft.items.map((item) => ({
        itemId: item.itemId,
        variant: item.variant ? { color: item.variant.color, size: item.variant.size } : undefined,
        quantity: item.quantity,
      })),
      signatureData: draft.signatureData,
      signedDocumentType: draft.signedDocumentType,
      signedDocumentNumber: draft.signedDocumentNumber,
      receivedBy: draft.receivedBy,
      receivedByName: draft.receivedByName,
      reason: draft.reason ?? null,
      notes: draft.notes ?? null,
    };

    const data = await fetchJson<any>(buildAdminApiUrl(endpoints.returns), {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!data) {
      throw new Error('El servicio de Dotación y EPP no retornó información de la devolución registrada.');
    }

    return {
      message: data.message ?? 'Devolución registrada exitosamente',
      record: mapReturnRecord(data.record),
    };
  },
};


