import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Search,
  Loader2,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Users,
  Download,
  Info,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AffiliateDeliveryPanel } from '@/components/admin/sst/AffiliateDeliveryPanel';
import { DeliveryConfirmationModal } from '@/components/admin/sst/DeliveryConfirmationModal';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import {
  SstAffiliate,
  SstDeliveryDraft,
  SstDeliveryRecord,
  SstDocumentType,
  SstInventoryItem,
  SstDeliveryType,
} from '@/types/adminSst';
import { sstAdminService } from '@/services/sstAdminService';
import { logger } from '@/utils/logger';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 },
  },
};

const getDeliveryTypeLabel = (type?: SstDeliveryType): string => {
  if (type === 'first_time') return 'Primera vez';
  if (type === 'periodic') return 'Periódica';
  return 'No especificado';
};

const AdminSstPage: React.FC = () => {
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState<SstAffiliate[]>([]);
  const [totalAffiliates, setTotalAffiliates] = useState(0);
  const [hospitalOptions, setHospitalOptions] = useState<string[]>([]);
  const [inventory, setInventory] = useState<SstInventoryItem[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<SstDeliveryRecord[]>([]);

  const [selectedAffiliate, setSelectedAffiliate] = useState<SstAffiliate | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState<string>('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [listFilterTerm, setListFilterTerm] = useState('');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportHospital, setExportHospital] = useState<string>('all');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportDocumentNumber, setExportDocumentNumber] = useState('');
  const [exportDeliveredBy, setExportDeliveredBy] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [isLoadingAffiliates, setIsLoadingAffiliates] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSearchingAffiliate, setIsSearchingAffiliate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<SstDeliveryDraft | null>(null);
  const [lastConfirmedRecordId, setLastConfirmedRecordId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<
    | {
        type: 'success' | 'error' | 'info';
        title: string;
        description: string;
      }
    | null
  >(null);
  const [showAffiliateList, setShowAffiliateList] = useState(true);

  const deliveryPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!feedbackBanner) return;
    const timeout = setTimeout(() => setFeedbackBanner(null), 6000);
    return () => clearTimeout(timeout);
  }, [feedbackBanner]);

  const showFeedbackBanner = useCallback(
    (type: 'success' | 'error' | 'info', title: string, description: string) => {
      setFeedbackBanner({ type, title, description });
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const fetchAffiliates = async () => {
      try {
        setIsLoadingAffiliates(true);
        const response = await sstAdminService.getAffiliates({
          page: currentPage,
          pageSize: itemsPerPage,
          hospital: hospitalFilter !== 'all' ? hospitalFilter : undefined,
          status: 'all',
          searchTerm: listFilterTerm || undefined,
          signal: controller.signal,
        });

        if (!isMounted) return;

        setAffiliates(response.items);
        setTotalAffiliates(response.total ?? 0);
        setErrorMessage(null);

        setHospitalOptions((prev) => {
          const next = new Set(prev);
          response.items.forEach((item) => {
            if (item.hospital) {
              next.add(item.hospital);
            }
          });
          return Array.from(next).sort((a, b) => a.localeCompare(b));
        });
      } catch (error) {
        if (!isMounted) return;
        logger.error('Error al cargar afiliados SST', error instanceof Error ? error.message : error);
        const message = error instanceof Error ? error.message : 'No fue posible cargar la lista de afiliados.';
        setAffiliates([]);
        setTotalAffiliates(0);
        setErrorMessage(message);
        showFeedbackBanner('error', 'Error al cargar afiliados', message);
      } finally {
        if (isMounted) {
          setIsLoadingAffiliates(false);
        }
      }
    };

    fetchAffiliates();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [currentPage, itemsPerPage, hospitalFilter, listFilterTerm, showFeedbackBanner]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchInventory = async () => {
      try {
        setIsLoadingInventory(true);
        const data = await sstAdminService.getInventory(controller.signal);
        if (isMounted) {
          setInventory(data);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        logger.error('Error al cargar inventario SST', error instanceof Error ? error.message : error);
        if (isMounted) {
          setErrorMessage('No fue posible cargar la información de inventario.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingInventory(false);
        }
      }
    };

    fetchInventory();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const fetchDeliveryHistory = useCallback(
    async (
      affiliateId: string,
      {
        signal,
        showLoading = true,
      }: { signal?: AbortSignal; showLoading?: boolean } = {},
    ) => {
      try {
        if (showLoading) {
          setIsLoadingHistory(true);
        }

        const response = await sstAdminService.getDeliveryHistory({
          affiliateId,
          page: 1,
          pageSize: 25,
          signal,
        });

        if (signal?.aborted) return;

        setDeliveryHistory(response.items);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        logger.error('Error al obtener historial de entregas SST', error instanceof Error ? error.message : error);
        const message = error instanceof Error ? error.message : 'No fue posible cargar el historial de entregas.';
        showFeedbackBanner('error', 'Error al obtener historial', message);
      } finally {
        if (!signal?.aborted && showLoading) {
          setIsLoadingHistory(false);
        }
      }
    },
    [showFeedbackBanner],
  );

  useEffect(() => {
    if (!selectedAffiliate) {
      setDeliveryHistory([]);
      setIsLoadingHistory(false);
      return;
    }

    const controller = new AbortController();

    fetchDeliveryHistory(selectedAffiliate.id, { signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [selectedAffiliate, fetchDeliveryHistory]);

  const totalItems = totalAffiliates;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const exportHospitalOptions = useMemo(() => {
    const options = new Set(hospitalOptions.filter((option) => option && option.trim().length > 0));
    return ['all', ...Array.from(options).sort((a, b) => a.localeCompare(b))];
  }, [hospitalOptions]);

  const sortedAffiliates = useMemo(() => {
    if (affiliates.length === 0) return [];
 
     const copy = [...affiliates];
     copy.sort((a, b) => {
       const nameA = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim().toLowerCase();
       const nameB = `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim().toLowerCase();
       return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
     });
     return copy;
  }, [affiliates]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


  const handleSelectAffiliate = (affiliate: SstAffiliate) => {
    setSelectedAffiliate(affiliate);
    setSearchTerm(affiliate.documentNumber);
    setShowAffiliateList(false);

    // Scroll to delivery panel
    setTimeout(() => {
      deliveryPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSearchAffiliate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchTerm.trim();

    if (!trimmed) {
      showFeedbackBanner('error', 'Búsqueda requerida', 'Ingresa un documento o nombre para realizar la búsqueda.');
      toast({
        title: 'Búsqueda requerida',
        description: 'Ingresa un documento o nombre para realizar la búsqueda.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    const controller = new AbortController();
    setIsSearchingAffiliate(true);
    try {
      // Try searching by document first
      let affiliate = await sstAdminService.getAffiliateByDocument('CC', trimmed, controller.signal);
      
      // If not found by document, search by name in the full list
      if (!affiliate) {
        const response = await sstAdminService.getAffiliates({
          page: 1,
          pageSize: itemsPerPage,
          searchTerm: trimmed,
          status: 'all',
          signal: controller.signal,
        });
        const totalMatches = response.total ?? response.items.length;

        if (response.items.length === 1 && totalMatches === 1) {
          affiliate = response.items[0];
        } else if (totalMatches > 1) {
          showFeedbackBanner(
            'info',
            'Múltiples resultados',
            `Se encontraron ${totalMatches} afiliados. Por favor, verifica la tabla de resultados.`,
          );
          toast({
            title: 'Múltiples resultados',
            description: `Se encontraron ${totalMatches} afiliados. Por favor, verifica la tabla.`,
            duration: 5000,
          });
          setAffiliates(response.items);
          setTotalAffiliates(totalMatches);
          setListFilterTerm(trimmed);
          setCurrentPage(1);
          setSelectedAffiliate(null);
          setShowAffiliateList(true);
          setIsSearchingAffiliate(false);
          return;
        }
      }
      
      if (!affiliate) {
        showFeedbackBanner(
          'error',
          'Afiliado no encontrado',
          'No se encontró un afiliado con el documento o nombre proporcionado.',
        );
        toast({
          title: 'Afiliado no encontrado',
          description: 'No se encontró un afiliado con el documento o nombre proporcionado.',
          variant: 'destructive',
          duration: 5000,
        });
        setSelectedAffiliate(null);
        setShowAffiliateList(true);
        return;
      }

      handleSelectAffiliate(affiliate);
      setListFilterTerm('');
      showFeedbackBanner(
        'success',
        'Afiliado encontrado',
        `Se cargó la información de ${affiliate.firstName} ${affiliate.lastName}.`,
      );
      toast({
        title: 'Afiliado encontrado',
        description: `Se cargó la información de ${affiliate.firstName} ${affiliate.lastName}.`,
        variant: 'success',
        duration: 5000,
      });
    } catch (error) {
      logger.error('Error al buscar afiliado SST', error instanceof Error ? error.message : error);
      showFeedbackBanner('error', 'Error de búsqueda', 'No fue posible buscar el afiliado. Intenta nuevamente.');
      toast({
        title: 'Error de búsqueda',
        description: 'No fue posible buscar el afiliado. Intenta nuevamente.',
        variant: 'destructive',
        duration: 5000,
      });
      setShowAffiliateList(true);
    } finally {
      setIsSearchingAffiliate(false);
      controller.abort();
    }
  };

  const handleResetSelection = () => {
    setSelectedAffiliate(null);
    setSearchTerm('');
    setListFilterTerm('');
    setShowAffiliateList(true);
  };

  const handleOpenExportDialog = () => {
    setExportHospital(hospitalFilter);
    setExportStartDate('');
    setExportEndDate('');
    setExportDocumentNumber('');
    setExportDeliveredBy('');
    setExportError(null);
    setIsExportDialogOpen(true);
  };

  const handleCloseExportDialog = () => {
    setIsExportDialogOpen(false);
    setExportError(null);
  };

  const handleOpenConfirmationModal = (record: SstDeliveryDraft) => {
    setPendingRecord(record);
    setConfirmationModalOpen(true);
    setLastConfirmedRecordId(null);
  };

  const handleConfirmDelivery = async (draft: SstDeliveryDraft) => {
    try {
      const { message, record } = await sstAdminService.registerDelivery(draft);

      showFeedbackBanner('success', 'Entrega registrada', message);
      toast({
        title: 'Entrega registrada',
        description: message,
        variant: 'success',
        duration: 5000,
      });

      await fetchDeliveryHistory(record.affiliateId, { showLoading: false });

      setAffiliates((prev) =>
        prev.map((affiliate) =>
          affiliate.id === record.affiliateId
            ? {
                ...affiliate,
                lastDeliveryAt: record.deliveredAt,
              }
            : affiliate,
        ),
      );

      setSelectedAffiliate((prev) =>
        prev && prev.id === record.affiliateId
          ? {
              ...prev,
              lastDeliveryAt: record.deliveredAt,
            }
          : prev,
      );

      setLastConfirmedRecordId(record.id);
      setPendingRecord(null);
      setConfirmationModalOpen(false);
    } catch (error) {
      logger.error('Error al registrar entrega SST', error instanceof Error ? error.message : error);
      const message = error instanceof Error ? error.message : 'No fue posible registrar la entrega. Intenta nuevamente.';
      showFeedbackBanner('error', 'Error al registrar la entrega', message);
      toast({
        title: 'Error al registrar la entrega',
        description: message,
        variant: 'destructive',
        duration: 5000,
      });
      throw error;
    }
  };

  const handleExportDeliveries = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isExporting) return;

    setExportError(null);

    if (exportStartDate && exportEndDate && new Date(exportStartDate) > new Date(exportEndDate)) {
      setExportError('La fecha inicial debe ser anterior o igual a la fecha final.');
      return;
    }

    setIsExporting(true);

    try {
      const startDateParam = exportStartDate || undefined;
      const endDateParam = exportEndDate || undefined;
      const startDateObj = startDateParam ? new Date(startDateParam) : undefined;
      const endDateObj = endDateParam ? new Date(endDateParam) : undefined;

      const filters = {
        hospital: exportHospital !== 'all' ? exportHospital : undefined,
        startDate: startDateParam,
        endDate: endDateParam,
        documentNumber: exportDocumentNumber.trim() || undefined,
        deliveredBy: exportDeliveredBy.trim() || undefined,
      };

      const deliveries: SstDeliveryRecord[] = [];
      const PAGE_SIZE = 200;
      let page = 1;
      let total = 0;

      do {
        const response = await sstAdminService.getDeliveryHistory({
          ...filters,
          page,
          pageSize: PAGE_SIZE,
        });
        deliveries.push(...response.items);
        total = response.total ?? deliveries.length;
        if (deliveries.length >= total || response.items.length === 0) {
          break;
        }
        page += 1;
      } while (page < 500);

      if (deliveries.length === 0) {
        const emptyMessage = 'No se encontraron entregas con los filtros seleccionados.';
        setExportError(emptyMessage);
        showFeedbackBanner('info', 'Sin entregas para exportar', emptyMessage);
        toast({
          title: 'Sin datos para exportar',
          description: emptyMessage,
        });
        return;
      }

      const uniqueAffiliateIds = Array.from(
        new Set(deliveries.map((record) => record.affiliateId).filter(Boolean)),
      );

      const affiliateMap = new Map<string, SstAffiliate>();
      affiliates.forEach((affiliate) => {
        affiliateMap.set(affiliate.id, affiliate);
      });
      if (uniqueAffiliateIds.length > 0) {
        const AFFILIATES_PAGE_SIZE = 200;
        let pageCounter = 1;
        let totalAffiliates = Infinity;

        while (affiliateMap.size < uniqueAffiliateIds.length && (pageCounter - 1) * AFFILIATES_PAGE_SIZE < totalAffiliates) {
          const response = await sstAdminService.getAffiliates({
            page: pageCounter,
            pageSize: AFFILIATES_PAGE_SIZE,
            hospital: exportHospital !== 'all' ? exportHospital : undefined,
            status: 'all',
          });

          response.items.forEach((affiliate) => {
            affiliateMap.set(affiliate.id, affiliate);
          });

          totalAffiliates = response.total ?? response.items.length;
          if (response.items.length === 0) {
            break;
          }

          pageCounter += 1;
        }
      }

      const affiliateCacheByDocument = new Map<string, SstAffiliate | null>();
      const affiliateFetchPromises: Promise<void>[] = [];

      deliveries.forEach((record) => {
        if (affiliateMap.has(record.affiliateId)) {
          return;
        }

        const affiliateIdParts = record.affiliateId?.split('-') ?? [];
        const fallbackDocType = affiliateIdParts.length > 1 ? (affiliateIdParts[0] as SstDocumentType) : undefined;
        const fallbackDocNumber =
          affiliateIdParts.length > 1 ? affiliateIdParts.slice(1).join('-') : record.affiliateId;

        const docType = (record.affiliateDocumentType ?? fallbackDocType) as SstDocumentType | undefined;
        const docNumber = record.affiliateDocumentNumber ?? fallbackDocNumber ?? '';

        if (!docType || !docNumber) {
          return;
        }

        const cacheKey = `${docType}-${docNumber}`;
        if (affiliateCacheByDocument.has(cacheKey)) {
          const cached = affiliateCacheByDocument.get(cacheKey);
          if (cached) {
            affiliateMap.set(cached.id, cached);
          }
          return;
        }

        affiliateCacheByDocument.set(cacheKey, null);
        affiliateFetchPromises.push(
          sstAdminService
            .getAffiliateByDocument(docType, docNumber)
            .then((result) => {
              if (result) {
                affiliateCacheByDocument.set(cacheKey, result);
                affiliateMap.set(result.id, result);
              }
            })
            .catch(() => {
              affiliateCacheByDocument.set(cacheKey, null);
            }),
        );
      });

      if (affiliateFetchPromises.length > 0) {
        await Promise.all(affiliateFetchPromises);
      }

      const inventoryMap = new Map(inventory.map((item) => [item.id, item]));

      const normalizeText = (value: string | null | undefined) =>
        value ? value.toString().trim().toLowerCase() : '';
      const hospitalFilterValue = filters.hospital ? normalizeText(filters.hospital) : '';
      const deliveredByFilterValue = filters.deliveredBy ? normalizeText(filters.deliveredBy) : '';
      const documentFilterValue = filters.documentNumber?.trim() ?? '';
      const startTimestamp = startDateObj
        ? new Date(
            startDateObj.getFullYear(),
            startDateObj.getMonth(),
            startDateObj.getDate(),
          ).getTime()
        : undefined;
      const endTimestamp = endDateObj
        ? new Date(
            endDateObj.getFullYear(),
            endDateObj.getMonth(),
            endDateObj.getDate(),
            23,
            59,
            59,
            999,
          ).getTime()
        : undefined;

      const filteredDeliveries = deliveries.filter((record) => {
        const affiliate = affiliateMap.get(record.affiliateId);
        const affiliateIdParts = record.affiliateId?.split('-') ?? [];
        const fallbackDocNumber =
          affiliateIdParts.length > 1 ? affiliateIdParts.slice(1).join('-') : record.affiliateId;

        const docNumberCandidate =
          record.affiliateDocumentNumber ??
          affiliate?.documentNumber ??
          fallbackDocNumber ??
          '';

        if (documentFilterValue && docNumberCandidate !== documentFilterValue) {
          return false;
        }

        if (hospitalFilterValue) {
          const recordHospitalRaw =
            record.affiliateHospital ??
            affiliate?.hospital ??
            '';
          if (normalizeText(recordHospitalRaw) !== hospitalFilterValue) {
            return false;
          }
        }

        if (deliveredByFilterValue) {
          const deliveredByRaw = record.deliveredByName ?? record.deliveredBy ?? '';
          if (!normalizeText(deliveredByRaw).includes(deliveredByFilterValue)) {
            return false;
          }
        }

        if (startTimestamp !== undefined || endTimestamp !== undefined) {
          const deliveredAtTime = new Date(record.deliveredAt).getTime();
          if (Number.isNaN(deliveredAtTime)) {
            return false;
          }
          if (startTimestamp !== undefined && deliveredAtTime < startTimestamp) {
            return false;
          }
          if (endTimestamp !== undefined && deliveredAtTime > endTimestamp) {
            return false;
          }
        }

        return true;
      });

      if (filteredDeliveries.length === 0) {
        const emptyMessage = 'No se encontraron entregas con los filtros seleccionados.';
        setExportError(emptyMessage);
        showFeedbackBanner('info', 'Sin entregas para exportar', emptyMessage);
        toast({
          title: 'Sin datos para exportar',
          description: emptyMessage,
        });
        return;
      }

      const deliveriesHeader: string[] = [
        'ID de entrega',
        'Fecha de entrega',
        'Hospital',
        'Afiliado tipo documento',
        'Afiliado número documento',
        'Afiliado nombre completo',
        'Proceso del afiliado',
        'Responsable de entrega',
        'Observaciones',
        'Tipo de entrega',
        'Artículo',
        'Categoría artículo',
        'Color',
        'Talla',
        'Cantidad',
        'Firma URL',
        'Firma imagen',
      ];
      const firmaImageColumnIndex = deliveriesHeader.indexOf('Firma imagen');

      const deliveriesRows: (string | number)[][] = [[...deliveriesHeader]];
      const signaturePlacements: { row: number; col: number; url: string }[] = [];
      const blankRowTemplate = Array(deliveriesHeader.length).fill('');
      let exportedDetailRows = 0;
      let firstTimeDeliveriesCount = 0;
      let periodicDeliveriesCount = 0;

      const deliveriesByHospital = new Map<string, { deliveries: number; units: number }>();
      const itemsByCategory = new Map<string, number>();
      const itemsByArticle = new Map<string, number>();
      const articleCategoryMap = new Map<string, string>();
      let totalUnitsDelivered = 0;
      let deliveriesWithNotes = 0;

      const imageDataCache = new Map<string, { data: string; extension: string }>();
      const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode(...chunk);
        }
        return btoa(binary);
      };

      const loadSignatureImage = async (url: string): Promise<{ data: string; extension: string }> => {
        const cached = imageDataCache.get(url);
        if (cached) {
          return cached;
        }

        if (url.startsWith('data:')) {
          const [meta, base64Data] = url.split(',', 2);
          if (!base64Data) {
            throw new Error('Formato de data URL inválido para la firma');
          }
          const mimeMatch = meta.match(/data:(.*?);/);
          const mime = mimeMatch?.[1] ?? 'image/png';
          const extension = mime.split('/')[1] ?? 'png';
          const result = { data: base64Data, extension };
          imageDataCache.set(url, result);
          return result;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const extension = (blob.type || 'image/png').split('/')[1] ?? 'png';
        const result = {
          data: arrayBufferToBase64(arrayBuffer),
          extension,
        };
        imageDataCache.set(url, result);
        return result;
      };

      const addRow = (row: (string | number)[]): number => {
        deliveriesRows.push(row);
        return deliveriesRows.length - 1;
      };

      const appendSeparatorRow = () => {
        deliveriesRows.push([...blankRowTemplate]);
      };

      filteredDeliveries.forEach((record) => {
        const affiliate = affiliateMap.get(record.affiliateId);
        const affiliateIdParts = record.affiliateId?.split('-') ?? [];
        const fallbackDocType = affiliateIdParts.length > 1 ? (affiliateIdParts[0] as SstDocumentType) : undefined;
        const fallbackDocNumber =
          affiliateIdParts.length > 1 ? affiliateIdParts.slice(1).join('-') : record.affiliateId;

        const docType =
          record.affiliateDocumentType ?? affiliate?.documentType ?? fallbackDocType ?? '';
        const docNumber =
          record.affiliateDocumentNumber ?? affiliate?.documentNumber ?? fallbackDocNumber ?? '';

        const affiliatePrimaryName = (record.affiliateFullName ?? '').trim();
        const affiliateSecondaryName = affiliate ? `${affiliate.firstName} ${affiliate.lastName}`.trim() : '';
        const affiliateFallbackName = [record.affiliateFirstName, record.affiliateLastName].filter(Boolean).join(' ');
        const affiliateName = (affiliatePrimaryName || affiliateSecondaryName || affiliateFallbackName || '').trim();

        const rawHospital =
          record.affiliateHospital ??
          affiliate?.hospital ??
          (exportHospital !== 'all' ? exportHospital : '') ??
          '';
        const hospital = rawHospital && rawHospital.trim().length > 0 ? rawHospital : 'No especificado';

        const rawRole =
          record.affiliateRole ??
          affiliate?.role ??
          '';
        const role = rawRole && rawRole.trim().length > 0 ? rawRole : 'No especificado';

        const recordUnits = record.items.reduce((acc, item) => acc + item.quantity, 0);
        totalUnitsDelivered += recordUnits;
        if (record.notes && record.notes.trim().length > 0) {
          deliveriesWithNotes += 1;
        }

        const hospitalStats = deliveriesByHospital.get(hospital) ?? { deliveries: 0, units: 0 };
        hospitalStats.deliveries += 1;
        hospitalStats.units += recordUnits;
        deliveriesByHospital.set(hospital, hospitalStats);

        const deliveryTypeLabel = getDeliveryTypeLabel(record.deliveryType as SstDeliveryType | undefined);
        if (record.deliveryType === 'first_time') {
          firstTimeDeliveriesCount += 1;
        } else if (record.deliveryType === 'periodic') {
          periodicDeliveriesCount += 1;
        }

        const baseRowData: (string | number)[] = [
          record.id,
          format(new Date(record.deliveredAt), 'yyyy-MM-dd HH:mm'),
          hospital,
          docType,
          docNumber,
          affiliateName || 'Sin información',
          role,
          record.deliveredByName ?? record.deliveredBy,
          record.notes ?? '',
          deliveryTypeLabel,
        ];
        const signatureUrl = record.signedDocumentUrl ?? '';

        if (!record.items.length) {
          const row = [
            ...baseRowData,
            'Sin artículos registrados',
            '',
            '',
            '',
            0,
            signatureUrl,
            '',
          ];
          const rowIndex = addRow(row);
          exportedDetailRows += 1;
          if (signatureUrl && firmaImageColumnIndex !== -1) {
            signaturePlacements.push({ row: rowIndex, col: firmaImageColumnIndex, url: signatureUrl });
          }
          appendSeparatorRow();
          return;
        }

        record.items.forEach((item, index) => {
          const inventoryItem = inventoryMap.get(item.itemId);
          const category = inventoryItem?.category ?? 'Sin categoría';
          const articleName = inventoryItem?.name ?? item.itemId;
          const colorLabel = item.variant?.color ?? inventoryItem?.defaultColor ?? '';
          const quantity = item.quantity ?? 0;

          itemsByCategory.set(category, (itemsByCategory.get(category) ?? 0) + quantity);
          itemsByArticle.set(articleName, (itemsByArticle.get(articleName) ?? 0) + quantity);
          if (!articleCategoryMap.has(articleName)) {
            articleCategoryMap.set(articleName, category);
          }

          const row = [
            ...baseRowData,
            articleName,
            category,
            colorLabel,
            item.variant?.size ?? '',
            quantity,
            signatureUrl,
            '',
          ];
          const rowIndex = addRow(row);
          exportedDetailRows += 1;

          if (signatureUrl && firmaImageColumnIndex !== -1 && index === 0) {
            signaturePlacements.push({ row: rowIndex, col: firmaImageColumnIndex, url: signatureUrl });
          }
        });

        appendSeparatorRow();
      });

      if (deliveriesRows.length > 1) {
        const lastRow = deliveriesRows[deliveriesRows.length - 1];
        if (lastRow.every((cell) => cell === '')) {
          deliveriesRows.pop();
        }
      }

      const workbook = XLSX.utils.book_new();
      const deliveriesSheet = XLSX.utils.aoa_to_sheet(deliveriesRows);

      if (signaturePlacements.length > 0 && firmaImageColumnIndex !== -1) {
        for (const placement of signaturePlacements) {
          try {
            const targetRow = deliveriesRows[placement.row];
            if (!targetRow) continue;

            const targetCell = targetRow[placement.col];
            if (typeof targetCell === 'object' && targetCell && 'f' in targetCell) continue;

            const { data, extension } = await loadSignatureImage(placement.url);
            targetRow[placement.col] = {
              f: `=IMAGE("data:image/${extension};base64,${data}", 4, 48, 48)`,
            } as unknown as string;
          } catch (error) {
            logger.warn(
              'No fue posible adjuntar la firma en el reporte',
              error instanceof Error ? error.message : error,
            );
          }
        }
      }

      XLSX.utils.book_append_sheet(workbook, deliveriesSheet, 'Entregas');
      if (deliveriesRows.length > 1 && deliveriesSheet['!ref']) {
        deliveriesSheet['!cols'] = [
          { wch: 18 },
          { wch: 20 },
          { wch: 26 },
          { wch: 12 },
          { wch: 18 },
          { wch: 30 },
          { wch: 24 },
          { wch: 24 },
          { wch: 36 },
          { wch: 18 },
          { wch: 28 },
          { wch: 20 },
          { wch: 18 },
          { wch: 12 },
          { wch: 14 },
          { wch: 36 },
          { wch: 18 },
        ];
        const filterRange = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: deliveriesRows.length - 1, c: deliveriesHeader.length - 1 },
        });
        deliveriesSheet['!autofilter'] = { ref: filterRange };
      }

      const summarySheetData: (string | number)[][] = [
        ['Filtros aplicados', '', ''],
        ['Hospital', exportHospital === 'all' ? 'Todos' : exportHospital, ''],
        ['Fecha desde', startDateObj ? format(startDateObj, 'yyyy-MM-dd') : 'Sin definir', ''],
        ['Fecha hasta', endDateObj ? format(endDateObj, 'yyyy-MM-dd') : 'Sin definir', ''],
        ['Número de documento', exportDocumentNumber.trim() || 'Sin definir', ''],
        ['Responsable (registrado por)', exportDeliveredBy.trim() || 'Sin definir', ''],
        [''],
        ['Indicadores generales', '', ''],
        ['Total entregas registradas', filteredDeliveries.length, ''],
        ['Total unidades entregadas', totalUnitsDelivered, ''],
        ['Entregas con observaciones', deliveriesWithNotes, ''],
        ['Entregas primera vez', firstTimeDeliveriesCount, ''],
        ['Entregas periódicas', periodicDeliveriesCount, ''],
        ['Afiliados únicos incluidos', new Set(filteredDeliveries.map((record) => record.affiliateId)).size, ''],
        ['Artículos diferentes entregados', itemsByArticle.size, ''],
        [''],
        ['Entregas por hospital', 'Entregas', 'Unidades entregadas'],
      ];

      if (deliveriesByHospital.size === 0) {
        summarySheetData.push(['Sin datos', 0, 0]);
      } else {
        Array.from(deliveriesByHospital.entries())
          .sort((a, b) => b[1].deliveries - a[1].deliveries)
          .forEach(([hospitalName, stats]) => {
            summarySheetData.push([hospitalName, stats.deliveries, stats.units]);
          });
      }

      summarySheetData.push(['']);
      summarySheetData.push(['Top artículos entregados', 'Unidades', '']);
      const topArticles = Array.from(itemsByArticle.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (topArticles.length === 0) {
        summarySheetData.push(['Sin artículos registrados', 0, '']);
      } else {
        topArticles.forEach(([articleName, quantity]) => {
          summarySheetData.push([articleName, quantity, '']);
        });
      }

      summarySheetData.push(['']);
      summarySheetData.push(['Artículos por categoría', 'Unidades', '']);
      if (itemsByCategory.size === 0) {
        summarySheetData.push(['Sin categoría', 0, '']);
      } else {
        Array.from(itemsByCategory.entries())
          .sort((a, b) => b[1] - a[1])
          .forEach(([category, quantity]) => {
            summarySheetData.push([category, quantity, '']);
          });
      }

      summarySheetData.push(['']);
      summarySheetData.push(['Generado el', format(new Date(), 'yyyy-MM-dd HH:mm'), '']);

      const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
      if (summarySheet['!ref']) {
        summarySheet['!cols'] = [{ wch: 36 }, { wch: 28 }, { wch: 24 }];
      }

      const articleTotalsSheetData = [
        ['Artículo', 'Categoría', 'Total unidades', 'Entregas registradas'],
        ...Array.from(itemsByArticle.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([articleName, quantity]) => {
            const matchingRecords = filteredDeliveries.filter((record) =>
              record.items.some((item) => {
                const inventoryItem = inventoryMap.get(item.itemId);
                const currentName = inventoryItem?.name ?? item.itemId;
                return currentName === articleName;
              }),
            );
            const deliveriesCount = matchingRecords.length;
            const categoryFromMatch = articleCategoryMap.get(articleName) ?? 'Sin categoría';
            return [articleName, categoryFromMatch, quantity, deliveriesCount];
          }),
      ];
      const articlesSheet = XLSX.utils.aoa_to_sheet(articleTotalsSheetData);
      XLSX.utils.book_append_sheet(workbook, articlesSheet, 'Totales por artículo');
      if (articlesSheet['!ref']) {
        const articleRange = XLSX.utils.decode_range(articlesSheet['!ref']);
        articlesSheet['!autofilter'] = { ref: XLSX.utils.encode_range(articleRange) };
        articlesSheet['!cols'] = [{ wch: 34 }, { wch: 22 }, { wch: 18 }, { wch: 20 }];
      }

      const filename = `reporte-dotacion-epp-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast({
        title: 'Reporte exportado',
        description: `Se generaron ${exportedDetailRows} filas detalladas en el reporte.`,
      });
      handleCloseExportDialog();
    } catch (error) {
      logger.error('Error al exportar entregas SST', error instanceof Error ? error.message : error);
      const message =
        error instanceof Error ? error.message : 'No fue posible generar el reporte en Excel.';
      setExportError(message);
      toast({
        title: 'Error al exportar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"
        >
          {feedbackBanner && (
            <Alert
              variant={feedbackBanner.type === 'error' ? 'destructive' : 'default'}
              className="border border-slate-200 bg-white shadow-sm"
            >
              {feedbackBanner.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : feedbackBanner.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-primary-prosalud" />
              ) : (
                <Info className="h-4 w-4 text-primary-prosalud" />
              )}
              <AlertTitle>{feedbackBanner.title}</AlertTitle>
              <AlertDescription>{feedbackBanner.description}</AlertDescription>
            </Alert>
          )}

          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                      <ShieldCheck className="h-8 w-8 text-primary-prosalud" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-primary-prosalud">
                        Gestión Dotación y EPP
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        Consulta afiliados activos, registra entregas de dotación y elementos de protección personal,
                        y guarda la firma de recibido como constancia.
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/*
          <motion.div variants={itemVariants}>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary-prosalud" />
                    Afiliados activos
                  </CardTitle>
                  <CardDescription>Total registrados en el sistema de Dotación y EPP</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold text-slate-800">{activeAffiliatesCount}</span>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary-prosalud" />
                    Capacitaciones pendientes
                  </CardTitle>
                  <CardDescription>Afiliados con capacitaciones o reinducciones por completar</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold text-slate-800">{affiliatesWithPendingTrainings}</span>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary-prosalud" />
                    Sin entregas registradas
                  </CardTitle>
                  <CardDescription>Afiliados sin historial de entrega registrado</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold text-slate-800">{affiliatesWithoutDelivery}</span>
                </CardContent>
              </Card>
            </div>
          </motion.div>
          */}

          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Search className="h-5 w-5 text-primary-prosalud" />
                      Buscar afiliado
                    </CardTitle>
                    <CardDescription>
                      Ingresa el documento o nombre del afiliado para registrar la entrega.
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-center gap-2 text-sm"
                      onClick={handleOpenExportDialog}
                    >
                      <Download className="h-4 w-4" />
                      Exportar reporte
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-start gap-2 text-sm text-primary-prosalud hover:text-white"
                      onClick={() =>
                        setShowAffiliateList((prev) => {
                          const next = !prev;
                          if (next) {
                            setSelectedAffiliate(null);
                          }
                          return next;
                        })
                      }
                      disabled={isSearchingAffiliate}
                    >
                      <Users className="h-4 w-4" />
                      {showAffiliateList ? 'Ocultar listado de afiliados' : 'Mostrar listado de afiliados'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearchAffiliate} className="grid gap-4 md:grid-cols-[1fr,auto]">
                  <div className="space-y-1">
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Número de documento o nombre completo"
                      autoComplete="off"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={isSearchingAffiliate || !searchTerm.trim()}
                      className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white w-full md:w-auto"
                    >
                      {isSearchingAffiliate ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Buscar
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetSelection}
                      disabled={isSearchingAffiliate && !selectedAffiliate}
                      className="w-full md:w-auto"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Limpiar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
          
          {showAffiliateList && (
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-xl">Afiliados activos en Dotación y EPP</CardTitle>
                    <CardDescription>
                      Lista general de afiliados activos.
                    </CardDescription>
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Filtrar por hospital
                    </label>
                    <Select
                      value={hospitalFilter}
                      onValueChange={(value) => {
                        setHospitalFilter(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los hospitales" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los hospitales</SelectItem>
                        {hospitalOptions.map((hospital) => (
                          <SelectItem key={hospital} value={hospital}>
                            {hospital}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {errorMessage && (
                  <>
                    <Alert variant="destructive" className="mx-4 mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No se pudo cargar la información</AlertTitle>
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                    <Separator />
                  </>
                )}
                <div>
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-50 shadow-sm">
                      <TableRow>
                        <TableHead className="w-[28%]">
                          Afiliado
                        </TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Hospital</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Última entrega</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingAffiliates ? (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Cargando afiliados activos...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : totalItems === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <div className="py-6 text-center text-sm text-slate-500">
                              No se encontraron afiliados que coincidan con la búsqueda.
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedAffiliates.map((affiliate) => {
                          const isSelected = selectedAffiliate?.id === affiliate.id;
                          return (
                            <TableRow
                              key={affiliate.id}
                              onClick={() => handleSelectAffiliate(affiliate)}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-primary-prosalud/10 hover:bg-primary-prosalud/20'
                                  : 'hover:bg-primary-prosalud/10'
                              }`}
                            >
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800">
                                    {affiliate.firstName} {affiliate.lastName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-700">{affiliate.documentNumber}</span>
                                  <span className="text-xs uppercase text-slate-400">{affiliate.documentType}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">{affiliate.hospital}</TableCell>
                              <TableCell className="text-sm text-slate-600">{affiliate.role}</TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {affiliate.lastDeliveryAt
                                  ? new Date(affiliate.lastDeliveryAt).toLocaleDateString()
                                  : 'Sin registro'}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Filter className="h-4 w-4" />
                    <span>
                      Mostrando {sortedAffiliates.length} de {totalItems} afiliados
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                     <div className="flex items-center gap-2 text-sm text-slate-600">
                       <span>Filas por página</span>
                       <Select
                         value={String(itemsPerPage)}
                         onValueChange={(value) => {
                           setItemsPerPage(Number(value));
                           setCurrentPage(1);
                         }}
                       >
                         <SelectTrigger className="h-8 w-20">
                           <SelectValue placeholder={itemsPerPage} />
                         </SelectTrigger>
                         <SelectContent>
                           {[10, 25, 50].map((size) => (
                             <SelectItem key={size} value={String(size)}>
                               {size}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                     <div className="flex items-center gap-2">
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                         disabled={currentPage === 1}
                         className="h-8 w-8 p-0"
                       >
                         <ChevronLeft className="h-4 w-4" />
                       </Button>
                       <span className="text-sm text-slate-600">
                         Página {currentPage} de {totalPages}
                       </span>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                         disabled={currentPage === totalPages}
                         className="h-8 w-8 p-0"
                       >
                         <ChevronRight className="h-4 w-4" />
                       </Button>
                     </div>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </motion.div>
          )}

          {selectedAffiliate && !showAffiliateList && (
            <motion.div variants={itemVariants} ref={deliveryPanelRef}>
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">
                    Registro de entrega para {selectedAffiliate.firstName} {selectedAffiliate.lastName}
                  </CardTitle>
                  <CardDescription>
                    Completa la selección de elementos de protección y captura la firma del afiliado como constancia.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <span className="text-xs uppercase text-slate-500">Tipo y número de documento</span>
                      <p className="font-medium text-slate-800">
                        {selectedAffiliate.documentType} {selectedAffiliate.documentNumber}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs uppercase text-slate-500">Hospital</span>
                      <p className="font-medium text-slate-800">{selectedAffiliate.hospital}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase text-slate-500">Proceso</span>
                      <p className="font-medium text-slate-800">{selectedAffiliate.role}</p>
                    </div>
                  </div>

                  <Separator />

                  {isLoadingInventory && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando inventario disponible...
                    </div>
                  )}

                  {!isLoadingInventory && inventory.length === 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Inventario no disponible</AlertTitle>
                      <AlertDescription>
                        No se encontraron elementos configurados en el inventario. Por favor, revisa la configuración
                        del módulo de Dotación y EPP.
                      </AlertDescription>
                    </Alert>
                  )}

                  {!isLoadingInventory && inventory.length > 0 && (
                    <AffiliateDeliveryPanel
                      affiliate={selectedAffiliate}
                      inventory={inventory}
                      deliveryHistory={deliveryHistory}
                      onConfirmDelivery={handleOpenConfirmationModal}
                      confirmedRecordId={lastConfirmedRecordId}
                    />
                  )}

                  {isLoadingHistory && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Consultando historial de entregas...
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>

        <Dialog
          open={isExportDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseExportDialog();
            }
          }}
        >
          <DialogContent className="max-w-3xl bg-white">
            <DialogHeader>
              <DialogTitle>Exportar entregas de Dotación y EPP</DialogTitle>
              <DialogDescription>
                Configura los filtros del reporte para obtener la trazabilidad y métricas de las entregas realizadas.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleExportDeliveries} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="export-hospital">Hospital</Label>
                  <Select
                    value={exportHospital}
                    onValueChange={(value) => setExportHospital(value)}
                    disabled={isExporting}
                  >
                    <SelectTrigger id="export-hospital">
                      <SelectValue placeholder="Selecciona un hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      {exportHospitalOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === 'all' ? 'Todos los hospitales' : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="export-delivered-by">Responsable que registró (opcional)</Label>
                  <Input
                    id="export-delivered-by"
                    placeholder="Nombre o identificador del responsable"
                    value={exportDeliveredBy}
                    onChange={(event) => setExportDeliveredBy(event.target.value)}
                    disabled={isExporting}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="export-start-date">Fecha desde</Label>
                  <Input
                    id="export-start-date"
                    type="date"
                    value={exportStartDate}
                    onChange={(event) => setExportStartDate(event.target.value)}
                    disabled={isExporting}
                    max={exportEndDate || undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="export-end-date">Fecha hasta</Label>
                  <Input
                    id="export-end-date"
                    type="date"
                    value={exportEndDate}
                    onChange={(event) => setExportEndDate(event.target.value)}
                    disabled={isExporting}
                    min={exportStartDate || undefined}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="export-document">Número de documento del afiliado (opcional)</Label>
                <Input
                  id="export-document"
                  placeholder="Ingresa solo números de documento"
                  value={exportDocumentNumber}
                  onChange={(event) => setExportDocumentNumber(event.target.value.replace(/\D+/g, ''))}
                  disabled={isExporting}
                  inputMode="numeric"
                  pattern="\d*"
                />
              </div>

              {exportError && (
                <p className="text-sm font-medium text-red-600">
                  {exportError}
                </p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseExportDialog}
                  disabled={isExporting}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="gap-2 bg-primary-prosalud hover:bg-primary-prosalud-dark" disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Exportar Excel
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <DeliveryConfirmationModal
          open={confirmationModalOpen}
          onOpenChange={setConfirmationModalOpen}
          record={pendingRecord}
          inventory={inventory}
          affiliateName={
            selectedAffiliate
              ? `${selectedAffiliate.firstName} ${selectedAffiliate.lastName}`
              : ''
          }
          onConfirm={handleConfirmDelivery}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminSstPage;


