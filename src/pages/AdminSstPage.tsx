import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
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
  FileText,
  Info,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RotateCcw,
  Package,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { AffiliateReturnPanel } from '@/components/admin/sst/AffiliateReturnPanel';
import { DeliveryConfirmationModal } from '@/components/admin/sst/DeliveryConfirmationModal';
import { ReturnConfirmationModal } from '@/components/admin/sst/ReturnConfirmationModal';
import { resolveSstColorInfo } from '@/components/admin/sst/color-utils';
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
import { format } from 'date-fns';
import {
  SstAffiliate,
  SstDeliveryDraft,
  SstDeliveryRecord,
  SstDocumentType,
  SstInventoryItem,
  SstDeliveryType,
  SstReturnDraft,
  SstReturnRecord,
} from '@/types/adminSst';
import { sstAdminService } from '@/services/sstAdminService';
import { logger } from '@/utils/logger';
import { Link } from 'react-router-dom';
import { buildAdminApiUrl } from '@/config/api';

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

const formatTimeElapsed = (dateString: string): string => {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffDays === 0) {
    return 'hoy';
  } else if (diffDays === 1) {
    return 'ayer';
  } else if (diffDays < 30) {
    return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  } else if (diffMonths < 12) {
    return `hace ${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`;
  } else {
    return `hace ${diffYears} año${diffYears > 1 ? 's' : ''}`;
  }
};

const formatDateSpanish = (date: Date): string => {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day} de ${month} del ${year} a las ${hours}:${minutes}`;
};

const isRecentDelivery = (dateString: string): boolean => {
  return isRecentReturn(dateString);
};

const isRecentReturn = (dateString: string): boolean => {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays <= 30; // Last month
};

const AdminSstPage: React.FC = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [affiliates, setAffiliates] = useState<SstAffiliate[]>([]);
  const [totalAffiliates, setTotalAffiliates] = useState(0);
  const [hospitalOptions, setHospitalOptions] = useState<string[]>([]);
  const [inventory, setInventory] = useState<SstInventoryItem[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<SstDeliveryRecord[]>([]);
  const [returnHistory, setReturnHistory] = useState<SstReturnRecord[]>([]);

  const [selectedAffiliate, setSelectedAffiliate] = useState<SstAffiliate | null>(null);
  const [viewMode, setViewMode] = useState<'delivery' | 'return'>('delivery');

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
  const [exportDeliveredBy, setExportDeliveredBy] = useState<string>('__all__');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deliveredByUsers, setDeliveredByUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingDeliveredByUsers, setIsLoadingDeliveredByUsers] = useState(false);

  const [isLoadingAffiliates, setIsLoadingAffiliates] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingReturnHistory, setIsLoadingReturnHistory] = useState(false);
  const [isSearchingAffiliate, setIsSearchingAffiliate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [returnConfirmationModalOpen, setReturnConfirmationModalOpen] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<SstDeliveryDraft | null>(null);
  const [pendingReturnRecord, setPendingReturnRecord] = useState<SstReturnDraft | null>(null);
  const [lastConfirmedRecordId, setLastConfirmedRecordId] = useState<string | null>(null);
  const [lastConfirmedReturnId, setLastConfirmedReturnId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<
    | {
        type: 'success' | 'error' | 'info';
        title: string;
        description: string;
      }
    | null
  >(null);
  const [showAffiliateList, setShowAffiliateList] = useState(true);
  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);
  const [showLastDeliveryItems, setShowLastDeliveryItems] = useState(false);
  const [showLastReturnItems, setShowLastReturnItems] = useState(false);

  const deliveryPanelRef = useRef<HTMLDivElement>(null);
  const historyScrollRef = useRef<HTMLDivElement>(null);

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

  // Helper function to search affiliate by document number trying all document types
  const searchAffiliateByDocumentNumber = async (
    documentNumber: string,
    signal?: AbortSignal,
  ): Promise<SstAffiliate | null> => {
    // Try all possible document types: CC, CE, PT
    const documentTypes: SstDocumentType[] = ['CC', 'CE', 'PT'];
    
    for (const documentType of documentTypes) {
      if (signal?.aborted) {
        return null;
      }
      
      try {
        const affiliate = await sstAdminService.getAffiliateByDocument(documentType, documentNumber, signal);
        if (affiliate) {
          return affiliate; // Found, return immediately
        }
      } catch (error: any) {
        // If 404, continue to next type
        if (error?.status === 404) {
          continue;
        }
        // For other errors, re-throw
        throw error;
      }
    }
    
    return null; // Not found with any document type
  };

  // Read search parameter from URL and set searchTerm, then auto-search
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      const trimmed = searchParam.trim();
      // Remove the search parameter from URL immediately to prevent re-triggering
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('search');
      setSearchParams(newSearchParams, { replace: true });
      
      // Set search term
      setSearchTerm(trimmed);
      
      // Parse document type and number from format "TYPE-NUMBER" or just "NUMBER"
      let documentType: SstDocumentType | null = null;
      let documentNumber = trimmed;
      
      if (trimmed.includes('-')) {
        const parts = trimmed.split('-');
        const possibleType = parts[0].toUpperCase();
        // Check if first part is a valid document type (including PT)
        if (['CC', 'CE', 'TI', 'PA', 'PT'].includes(possibleType)) {
          documentType = possibleType as SstDocumentType;
          documentNumber = parts.slice(1).join('-');
        }
      }
      
      // Auto-execute search if document number is valid (only digits after parsing)
      if (documentNumber && /^\d+$/.test(documentNumber)) {
        const controller = new AbortController();
        setIsSearchingAffiliate(true);
        
        // If document type is specified, search only with that type
        // Otherwise, try all possible document types
        const searchPromise = documentType
          ? sstAdminService.getAffiliateByDocument(documentType, documentNumber, controller.signal)
          : searchAffiliateByDocumentNumber(documentNumber, controller.signal);
        
        searchPromise
          .then((affiliate) => {
            if (affiliate) {
              handleSelectAffiliate(affiliate);
            } else {
              showFeedbackBanner(
                'error',
                'Afiliado no encontrado',
                'No se encontró un afiliado con el número de documento proporcionado.',
              );
              toast({
                title: 'Afiliado no encontrado',
                description: 'No se encontró un afiliado con el número de documento proporcionado.',
                variant: 'destructive',
                duration: 5000,
              });
              setSelectedAffiliate(null);
              setShowAffiliateList(true);
            }
            setIsSearchingAffiliate(false);
          })
          .catch((error) => {
            if (error instanceof DOMException && error.name === 'AbortError') {
              return;
            }
            logger.error('Error al buscar afiliado automáticamente', error instanceof Error ? error.message : error);
            setIsSearchingAffiliate(false);
          });
        
        return () => {
          controller.abort();
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  const fetchReturnHistory = useCallback(
    async (
      affiliateId: string,
      {
        signal,
        showLoading = true,
      }: { signal?: AbortSignal; showLoading?: boolean } = {},
    ) => {
      try {
        if (showLoading) {
          setIsLoadingReturnHistory(true);
        }

        const response = await sstAdminService.getReturnHistory({
          affiliateId,
          page: 1,
          pageSize: 25,
          signal,
        });

        if (signal?.aborted) return;

        setReturnHistory(response.items);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        logger.error('Error al obtener historial de devoluciones SST', error instanceof Error ? error.message : error);
        const message = error instanceof Error ? error.message : 'No fue posible cargar el historial de devoluciones.';
        showFeedbackBanner('error', 'Error al obtener historial', message);
      } finally {
        if (!signal?.aborted && showLoading) {
          setIsLoadingReturnHistory(false);
        }
      }
    },
    [showFeedbackBanner],
  );

  useEffect(() => {
    if (!selectedAffiliate) {
      setDeliveryHistory([]);
      setReturnHistory([]);
      setIsLoadingHistory(false);
      setIsLoadingReturnHistory(false);
      return;
    }

    const controller = new AbortController();

    fetchDeliveryHistory(selectedAffiliate.id, { signal: controller.signal });
    fetchReturnHistory(selectedAffiliate.id, { signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [selectedAffiliate, fetchDeliveryHistory, fetchReturnHistory]);

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
      showFeedbackBanner('error', 'Búsqueda requerida', 'Ingresa un número de documento para realizar la búsqueda.');
      toast({
        title: 'Búsqueda requerida',
        description: 'Ingresa un número de documento para realizar la búsqueda.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    if (!/^\d+$/.test(trimmed)) {
      showFeedbackBanner('error', 'Documento inválido', 'El número de documento solo debe contener caracteres numéricos.');
      toast({
        title: 'Documento inválido',
        description: 'El número de documento solo debe contener caracteres numéricos.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    const controller = new AbortController();
    setIsSearchingAffiliate(true);
    try {
      // Search with all document types (CC, CE, PT) - independent of document type
      const affiliate = await searchAffiliateByDocumentNumber(trimmed, controller.signal);

      if (!affiliate) {
        showFeedbackBanner(
          'error',
          'Afiliado no encontrado',
          'No se encontró un afiliado con el número de documento proporcionado.',
        );
        toast({
          title: 'Afiliado no encontrado',
          description: 'No se encontró un afiliado con el número de documento proporcionado.',
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
    setExportDeliveredBy('__all__');
    setExportError(null);
    setIsExportDialogOpen(true);
  };

  // Cargar usuarios únicos que han entregado cuando se abre el modal
  useEffect(() => {
    if (!isExportDialogOpen) return;

    const controller = new AbortController();
    setIsLoadingDeliveredByUsers(true);

    const fetchDeliveredByUsers = async () => {
      try {
        // Obtener todas las entregas (con un pageSize grande para obtener la mayoría)
        const response = await sstAdminService.getDeliveryHistory({
          page: 1,
          pageSize: 1000,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        // Extraer usuarios únicos de las entregas
        const usersMap = new Map<string, string>();
        
        response.items.forEach((delivery) => {
          const deliveredBy = delivery.deliveredBy;
          const deliveredByName = delivery.deliveredByName || deliveredBy;
          
          // Usar deliveredBy como ID único, y displayedName como nombre a mostrar
          if (deliveredBy && !usersMap.has(deliveredBy)) {
            usersMap.set(deliveredBy, deliveredByName);
          }
        });

        // Convertir el Map a un array de objetos y ordenar alfabéticamente
        const usersList = Array.from(usersMap.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

        setDeliveredByUsers(usersList);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        logger.error('Error al cargar usuarios que han entregado', error instanceof Error ? error.message : error);
        // No mostrar error al usuario, simplemente dejar la lista vacía
        setDeliveredByUsers([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingDeliveredByUsers(false);
        }
      }
    };

    fetchDeliveredByUsers();

    return () => {
      controller.abort();
    };
  }, [isExportDialogOpen]);

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

  const handleOpenReturnConfirmation = (draft: SstReturnDraft) => {
    setPendingReturnRecord(draft);
    setReturnConfirmationModalOpen(true);
    setLastConfirmedReturnId(null);
  };

  const handleConfirmReturn = async (draft: SstReturnDraft) => {
    try {
      const { message, record } = await sstAdminService.registerReturn(draft);

      showFeedbackBanner('success', 'Devolución registrada', message);
      toast({
        title: 'Devolución registrada',
        description: message,
        variant: 'success',
        duration: 5000,
      });

      await fetchReturnHistory(record.affiliateId, { showLoading: false });
      // Also refresh delivery history to update available quantities
      await fetchDeliveryHistory(record.affiliateId, { showLoading: false });

      setLastConfirmedReturnId(record.id);
      setPendingReturnRecord(null);
      setReturnConfirmationModalOpen(false);
    } catch (error) {
      logger.error('Error al registrar devolución SST', error instanceof Error ? error.message : error);
      const message = error instanceof Error ? error.message : 'No fue posible registrar la devolución. Intenta nuevamente.';
      showFeedbackBanner('error', 'Error al registrar la devolución', message);
      toast({
        title: 'Error al registrar la devolución',
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

    // Validación de fechas
    if (exportStartDate && exportEndDate && new Date(exportStartDate) > new Date(exportEndDate)) {
      setExportError('La fecha inicial debe ser anterior o igual a la fecha final.');
      return;
    }

    setIsExporting(true);

    try {
      // Construir parámetros de consulta
      const params = new URLSearchParams();
      
      if (exportHospital) {
        params.append('hospital', exportHospital);
      }
      if (exportStartDate) {
        params.append('startDate', exportStartDate);
      }
      if (exportEndDate) {
        params.append('endDate', exportEndDate);
      }
      if (exportDocumentNumber.trim()) {
        params.append('documentNumber', exportDocumentNumber.trim());
      }
      if (exportDeliveredBy && exportDeliveredBy.trim() && exportDeliveredBy !== '__all__') {
        params.append('deliveredBy', exportDeliveredBy.trim());
      }
      
      // Opciones de firmas (valores por defecto según la documentación)
      params.append('includeSignatures', 'true');
      params.append('signatureWidth', '100');
      params.append('signatureHeight', '50');
      
      // Construir URL del endpoint
      const endpoint = `/api/dotacion-epp/reports/deliveries/excel${params.toString() ? `?${params.toString()}` : ''}`;
      const url = buildAdminApiUrl(endpoint);

      const headers: HeadersInit = {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      // Realizar petición al backend
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include', // ✅ Habilitado para enviar cookies HttpOnly automáticamente
      });

      // Manejar errores
      if (!response.ok) {
        let errorMessage = 'Error al generar el reporte';
        
        // Intentar parsear el error como JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // Si no se puede parsear, usar el mensaje por defecto
          }
        }
        
        throw new Error(errorMessage);
      }

      // Obtener el blob del archivo
      const blob = await response.blob();

      // Obtener nombre del archivo del header Content-Disposition si está disponible
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `reporte-dotacion-epp-${format(new Date(), 'yyyyMMdd-HHmmss')}.xlsx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Crear URL temporal y descargar
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Reporte exportado',
        description: 'El reporte se ha descargado exitosamente.',
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
              <CardHeader className="pb-4 sm:pb-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-primary-prosalud/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                      <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-primary-prosalud" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-prosalud">
                        Gestión Dotación y EPP
                      </CardTitle>
                      <CardDescription className="text-sm sm:text-base mt-1 sm:mt-2">
                        Consulta afiliados activos, registra entregas de dotación y elementos de protección personal,
                        y guarda la firma de recibido como constancia.
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <Button type="button" variant="outline" size="sm" className="gap-2 w-full sm:w-auto" asChild>
                      <Link to="/admin/inventario?tab=hospital-requests">
                        <ClipboardList className="h-4 w-4" />
                        <span className="hidden sm:inline">Solicitudes de hospitales</span>
                        <span className="sm:hidden">Solicitudes</span>
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 w-full sm:w-auto"
                      onClick={handleOpenExportDialog}
                    >
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Exportar Reporte</span>
                      <span className="sm:hidden">Exportar</span>
                    </Button>
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
                      Ingresa el número de documento del afiliado para registrar la entrega.
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-start gap-2 text-sm text-primary-prosalud hover:text-white w-full sm:w-auto"
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
                      <span className="hidden sm:inline">
                        {showAffiliateList ? 'Ocultar listado de afiliados' : 'Mostrar listado de afiliados'}
                      </span>
                      <span className="sm:hidden">
                        {showAffiliateList ? 'Ocultar listado' : 'Mostrar listado'}
                      </span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearchAffiliate} className="grid gap-4 md:grid-cols-[1fr,auto]">
                  <div className="space-y-1">
                    <Input
                      value={searchTerm}
                      onChange={(event) => {
                        const digitsOnly = event.target.value.replace(/\D/g, '');
                        setSearchTerm(digitsOnly);
                      }}
                      onPaste={(event) => {
                        const pasted = event.clipboardData.getData('text');
                        if (/^\d+$/.test(pasted)) {
                          return;
                        }

                        event.preventDefault();
                        const digitsOnly = pasted.replace(/\D/g, '');
                        if (!digitsOnly) {
                          return;
                        }

                        const input = event.target as HTMLInputElement;
                        const { selectionStart, selectionEnd, value } = input;
                        const start = selectionStart ?? value.length;
                        const end = selectionEnd ?? value.length;
                        const nextValue = `${value.slice(0, start)}${digitsOnly}${value.slice(end)}`;
                        setSearchTerm(nextValue);
                      }}
                      placeholder="Número de documento"
                      autoComplete="off"
                      inputMode="numeric"
                      pattern="[0-9]*"
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
              <CardHeader className="pb-3 p-4 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg sm:text-xl">Afiliados activos en Dotación y EPP</CardTitle>
                    <CardDescription className="text-sm">
                      Lista general de afiliados activos.
                    </CardDescription>
                  </div>
                  <div className="w-full sm:w-48 flex-shrink-0">
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
                {/* Desktop Table View - Hidden on mobile */}
                <div className="hidden lg:block">
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

                {/* Mobile Card View - Visible on mobile and tablet */}
                <div className="lg:hidden space-y-3 p-4">
                  {isLoadingAffiliates ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando afiliados activos...
                    </div>
                  ) : totalItems === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                      No se encontraron afiliados que coincidan con la búsqueda.
                    </div>
                  ) : (
                    sortedAffiliates.map((affiliate) => {
                      const isSelected = selectedAffiliate?.id === affiliate.id;
                      return (
                        <Card
                          key={affiliate.id}
                          onClick={() => handleSelectAffiliate(affiliate)}
                          className={`cursor-pointer transition-all border-2 ${
                            isSelected
                              ? 'border-primary-prosalud bg-primary-prosalud/10 shadow-md'
                              : 'border-slate-200 hover:border-primary-prosalud/50 hover:shadow-sm'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Header with name */}
                              <div>
                                <h3 className="font-semibold text-slate-800 text-base mb-1">
                                  {affiliate.firstName} {affiliate.lastName}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-700 text-sm">{affiliate.documentNumber}</span>
                                  <span className="text-xs uppercase text-slate-400">{affiliate.documentType}</span>
                                </div>
                              </div>

                              {/* Details */}
                              <div className="grid grid-cols-1 gap-2 border-t pt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-slate-500">Hospital</span>
                                  <span className="text-sm text-slate-700">{affiliate.hospital}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-slate-500">Rol</span>
                                  <span className="text-sm text-slate-700">{affiliate.role}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-slate-500">Última entrega</span>
                                  <span className="text-sm text-slate-600">
                                    {affiliate.lastDeliveryAt
                                      ? new Date(affiliate.lastDeliveryAt).toLocaleDateString()
                                      : 'Sin registro'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
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
              <Card className={`border-2 shadow-sm ${
                viewMode === 'delivery' 
                  ? 'border-green-200 bg-green-50/30' 
                  : 'border-orange-200 bg-orange-50/30'
              }`}>
                <CardHeader className="pb-3 p-4 sm:p-6">
                  <div className="flex flex-col gap-4">
                    <div>
                      <CardTitle className="text-lg sm:text-xl mb-2 break-words">
                        Registro para {selectedAffiliate.firstName} {selectedAffiliate.lastName}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Selecciona el tipo de operación que deseas realizar.
                      </CardDescription>
                    </div>
                    <Tabs 
                      value={viewMode} 
                      onValueChange={(value) => setViewMode(value as 'delivery' | 'return')}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
                        <TabsTrigger 
                          value="delivery" 
                          className="gap-2 font-semibold data-[state=active]:bg-white data-[state=active]:text-primary-prosalud data-[state=active]:shadow-sm"
                        >
                          <Package className="h-4 w-4" />
                          Entrega
                        </TabsTrigger>
                        <TabsTrigger 
                          value="return"
                          className="gap-2 font-semibold data-[state=active]:bg-white data-[state=active]:text-primary-prosalud data-[state=active]:shadow-sm"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Devolución
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="delivery" className="mt-4">
                        <Alert className="border-green-200 bg-green-50">
                          <Package className="h-4 w-4 text-green-600" />
                          <AlertTitle className="text-green-900">Modo: Registro de Entrega</AlertTitle>
                          <AlertDescription className="text-green-800">
                            Completa la selección de elementos de protección y captura la firma del afiliado como constancia.
                          </AlertDescription>
                        </Alert>
                      </TabsContent>
                      <TabsContent value="return" className="mt-4">
                        <Alert className="border-orange-200 bg-orange-50">
                          <RotateCcw className="h-4 w-4 text-orange-600" />
                          <AlertTitle className="text-orange-900">Modo: Registro de Devolución</AlertTitle>
                          <AlertDescription className="text-orange-800">
                            Selecciona los elementos que el afiliado está devolviendo. El sistema comparará con el historial de entregas.
                          </AlertDescription>
                        </Alert>
                      </TabsContent>
                    </Tabs>
                  </div>
                  {viewMode === 'delivery' && deliveryHistory.length > 0 && (() => {
                    const lastDelivery = deliveryHistory[0]; // Most recent delivery is first
                    const lastDeliveryDate = new Date(lastDelivery.deliveredAt);
                    const timeElapsed = formatTimeElapsed(lastDelivery.deliveredAt);
                    const formattedDate = formatDateSpanish(lastDeliveryDate);
                    const isRecent = isRecentDelivery(lastDelivery.deliveredAt);

                    const handleGoToHistory = () => {
                      setHighlightedRecordId(lastDelivery.id);
                      setTimeout(() => {
                        historyScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                      setTimeout(() => {
                        setHighlightedRecordId(null);
                      }, 3000);
                    };

                    return (
                      <div className="mt-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-700" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-900">
                              Última entrega registrada
                            </p>
                            <p className="text-xs mt-1 text-yellow-800">
                              {formattedDate} ({timeElapsed})
                            </p>
                            {(lastDelivery.deliveredBy || lastDelivery.deliveredByName) && (
                              <p className="text-xs mt-1 text-yellow-700">
                                Entregado por: <span className="font-medium">{lastDelivery.deliveredByName || lastDelivery.deliveredBy}</span>
                              </p>
                            )}
                            {lastDelivery.items.length > 0 && (
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-yellow-700">
                                    {lastDelivery.items.length} elemento{lastDelivery.items.length > 1 ? 's' : ''} entregado{lastDelivery.items.length > 1 ? 's' : ''}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowLastDeliveryItems(!showLastDeliveryItems)}
                                      className="h-6 px-2 text-xs text-yellow-700 hover:text-yellow-700 hover:bg-yellow-100"
                                    >
                                      {showLastDeliveryItems ? (
                                        <>
                                          <ChevronUp className="h-3 w-3 mr-1" />
                                          Ocultar elementos
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="h-3 w-3 mr-1" />
                                          Ver elementos
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleGoToHistory}
                                      className="h-6 px-2 text-xs text-yellow-700 hover:text-yellow-700 hover:bg-yellow-100"
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      Ir al historial
                                    </Button>
                                  </div>
                                </div>
                                {showLastDeliveryItems && (
                                  <div className="mt-2 rounded border border-slate-200 bg-white p-2 space-y-1.5">
                                    {lastDelivery.items.map((item, idx) => {
                                      const isCarnet = item.itemId === '__carnet__';
                                      const inventoryItem = inventory.find((inv) => inv.id === item.itemId || inv.baseId === item.itemId);
                                      const itemName = isCarnet 
                                        ? 'Carnet' 
                                        : (inventoryItem?.name ?? item.itemId);
                                      const colorInfo = item.variant?.color 
                                        ? resolveSstColorInfo(item.variant.color) 
                                        : (inventoryItem?.defaultColor ? resolveSstColorInfo(inventoryItem.defaultColor) : null);
                                      const colorLabel = colorInfo?.label ?? item.variant?.color ?? inventoryItem?.defaultColor;
                                      const sizeLabel = item.variant?.size;
                                      const genderLabel = inventoryItem?.gender;

                                      return (
                                        <div key={idx} className="flex items-center justify-between text-xs text-slate-600 py-1 border-b border-slate-100 last:border-0">
                                          <div className="flex items-center gap-2 flex-1">
                                            {!isCarnet && colorInfo && (
                                              <span
                                                className="inline-flex h-3 w-3 flex-shrink-0 rounded-full border border-slate-200"
                                                style={{ backgroundColor: colorInfo.hex ?? '#cbd5f5' }}
                                                aria-label={colorLabel}
                                                title={colorLabel}
                                              />
                                            )}
                                            <span className="font-medium">{itemName}</span>
                                            {genderLabel && <span className="text-slate-500">({genderLabel})</span>}
                                            {colorLabel && !isCarnet && <span className="text-slate-500">- {colorLabel}</span>}
                                            {sizeLabel && <span className="text-slate-500">- Talla {sizeLabel}</span>}
                                          </div>
                                          <span className="font-semibold text-slate-800">× {item.quantity}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  {viewMode === 'return' && returnHistory.length > 0 && (() => {
                    const lastReturn = returnHistory[0]; // Most recent return is first
                    const lastReturnDate = new Date(lastReturn.returnedAt);
                    const timeElapsed = formatTimeElapsed(lastReturn.returnedAt);
                    const formattedDate = formatDateSpanish(lastReturnDate);
                    const isRecent = isRecentReturn(lastReturn.returnedAt);

                    const handleGoToReturnHistory = () => {
                      setHighlightedRecordId(lastReturn.id);
                      setTimeout(() => {
                        historyScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                      setTimeout(() => {
                        setHighlightedRecordId(null);
                      }, 3000);
                    };

                    return (
                      <div className="mt-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-700" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-900">
                              Última devolución registrada
                            </p>
                            <p className="text-xs mt-1 text-yellow-800">
                              {formattedDate} ({timeElapsed})
                            </p>
                            {(lastReturn.receivedBy || lastReturn.receivedByName) && (
                              <p className="text-xs mt-1 text-yellow-700">
                                Recibido por: <span className="font-medium">{lastReturn.receivedByName || lastReturn.receivedBy}</span>
                              </p>
                            )}
                            {lastReturn.items.length > 0 && (
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-yellow-700">
                                    {lastReturn.items.length} elemento{lastReturn.items.length > 1 ? 's' : ''} devuelto{lastReturn.items.length > 1 ? 's' : ''}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowLastReturnItems(!showLastReturnItems)}
                                      className="h-6 px-2 text-xs text-yellow-700 hover:text-yellow-700 hover:bg-yellow-100"
                                    >
                                      {showLastReturnItems ? (
                                        <>
                                          <ChevronUp className="h-3 w-3 mr-1" />
                                          Ocultar elementos
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="h-3 w-3 mr-1" />
                                          Ver elementos
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleGoToReturnHistory}
                                      className="h-6 px-2 text-xs text-yellow-700 hover:text-yellow-700 hover:bg-yellow-100"
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      Ir al historial
                                    </Button>
                                  </div>
                                </div>
                                {showLastReturnItems && (
                                  <div className="mt-2 rounded border border-slate-200 bg-white p-2 space-y-1.5">
                                    {lastReturn.items.map((item, idx) => {
                                      const isCarnet = item.itemId === '__carnet__';
                                      const inventoryItem = inventory.find((inv) => inv.id === item.itemId || inv.baseId === item.itemId);
                                      const itemName = isCarnet 
                                        ? 'Carnet' 
                                        : (inventoryItem?.name ?? item.itemId);
                                      const colorInfo = item.variant?.color 
                                        ? resolveSstColorInfo(item.variant.color) 
                                        : (inventoryItem?.defaultColor ? resolveSstColorInfo(inventoryItem.defaultColor) : null);
                                      const colorLabel = colorInfo?.label ?? item.variant?.color ?? inventoryItem?.defaultColor;
                                      const sizeLabel = item.variant?.size;
                                      const genderLabel = inventoryItem?.gender;

                                      return (
                                        <div key={idx} className="flex items-center justify-between text-xs text-slate-600 py-1 border-b border-slate-100 last:border-0">
                                          <div className="flex items-center gap-2 flex-1">
                                            {!isCarnet && colorInfo && (
                                              <span
                                                className="inline-flex h-3 w-3 flex-shrink-0 rounded-full border border-slate-200"
                                                style={{ backgroundColor: colorInfo.hex ?? '#cbd5f5' }}
                                                aria-label={colorLabel}
                                                title={colorLabel}
                                              />
                                            )}
                                            <span className="font-medium">{itemName}</span>
                                            {genderLabel && <span className="text-slate-500">({genderLabel})</span>}
                                            {colorLabel && !isCarnet && <span className="text-slate-500">- {colorLabel}</span>}
                                            {sizeLabel && <span className="text-slate-500">- Talla {sizeLabel}</span>}
                                          </div>
                                          <span className="font-semibold text-slate-800">× {item.quantity}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <span className="text-xs uppercase text-slate-500">Tipo y número de documento</span>
                      <p className="font-medium text-slate-800 break-words">
                        {selectedAffiliate.documentType} {selectedAffiliate.documentNumber}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs uppercase text-slate-500">Hospital</span>
                      <p className="font-medium text-slate-800 break-words">{selectedAffiliate.hospital}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase text-slate-500">Proceso</span>
                      <p className="font-medium text-slate-800 break-words">{selectedAffiliate.role}</p>
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

                  {!isLoadingInventory && inventory.length > 0 && viewMode === 'delivery' && (
                    <AffiliateDeliveryPanel
                      affiliate={selectedAffiliate}
                      inventory={inventory}
                      deliveryHistory={deliveryHistory}
                      onConfirmDelivery={handleOpenConfirmationModal}
                      confirmedRecordId={lastConfirmedRecordId}
                      highlightedRecordId={highlightedRecordId}
                      historyScrollRef={historyScrollRef}
                    />
                  )}

                  {!isLoadingInventory && inventory.length > 0 && viewMode === 'return' && (
                    <AffiliateReturnPanel
                      affiliate={selectedAffiliate}
                      inventory={inventory}
                      deliveryHistory={deliveryHistory}
                      returnHistory={returnHistory}
                      onConfirmReturn={handleOpenReturnConfirmation}
                      confirmedRecordId={lastConfirmedReturnId}
                      highlightedRecordId={highlightedRecordId}
                      historyScrollRef={historyScrollRef}
                    />
                  )}

                  {isLoadingHistory && viewMode === 'delivery' && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Consultando historial de entregas...
                    </div>
                  )}

                  {isLoadingReturnHistory && viewMode === 'return' && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Consultando historial de devoluciones...
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
          <DialogContent className="max-sm:inset-x-4 sm:w-full sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl break-words">Exportar entregas de Dotación y EPP</DialogTitle>
              <DialogDescription className="text-sm">
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
                  <Select
                    value={exportDeliveredBy}
                    onValueChange={(value) => setExportDeliveredBy(value)}
                    disabled={isExporting || isLoadingDeliveredByUsers}
                  >
                    <SelectTrigger id="export-delivered-by">
                      <SelectValue placeholder={isLoadingDeliveredByUsers ? "Cargando usuarios..." : "Selecciona un responsable"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos los responsables</SelectItem>
                      {deliveredByUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="export-start-date">Fecha desde (opcional)</Label>
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
                  <Label htmlFor="export-end-date">Fecha hasta (opcional)</Label>
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

              <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseExportDialog}
                  disabled={isExporting}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="gap-2 bg-primary-prosalud hover:bg-primary-prosalud-dark text-white w-full sm:w-auto" disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Exportar Reporte</span>
                      <span className="sm:hidden">Exportar</span>
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

        <ReturnConfirmationModal
          open={returnConfirmationModalOpen}
          onOpenChange={setReturnConfirmationModalOpen}
          record={pendingReturnRecord}
          inventory={inventory}
          affiliateName={
            selectedAffiliate
              ? `${selectedAffiliate.firstName} ${selectedAffiliate.lastName}`
              : ''
          }
          deliveryHistory={deliveryHistory}
          returnHistory={returnHistory}
          onConfirm={handleConfirmReturn}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminSstPage;


