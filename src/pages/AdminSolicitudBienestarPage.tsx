import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDateReadable, formatTime12Hour, parseLocalDate } from '@/utils/dateFormatter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  Send,
  Heart,
  Calendar,
  CalendarRange,
  Users,
  Building,
  MapPin,
  Pencil,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  TrendingUp,
  FileText,
  X,
  CheckCircle2,
  Globe,
  EyeOff,
  Package,
  Signature,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorSanitizer';
import DataPagination from '@/components/ui/data-pagination';
import { wellnessRequestsService, WellnessRequest } from '@/services/wellnessRequestsApi';
import { wellnessDeliveryService, WellnessDeliveryRequest, WellnessDeliveryType } from '@/services/wellnessDeliveryService';
import { TableLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SignaturePad, SignaturePadRef } from '@/components/admin/sst/SignaturePad';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RotateCw, Eraser } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import WellnessRequestForm from '@/components/admin/solicitudes/WellnessRequestForm';
import WellnessActivityRealizedForm from '@/components/admin/solicitudes/WellnessActivityRealizedForm';
import WellnessActivityReviewDialog from '@/components/admin/solicitudes/WellnessActivityReviewDialog';
import ExportWellnessReportDialog from '@/components/admin/solicitudes/ExportWellnessReportDialog';
import ExportWellnessDeliveryReportDialog from '@/components/admin/solicitudes/ExportWellnessDeliveryReportDialog';
import WellnessDeliveryFileManager from '@/components/admin/solicitudes/WellnessDeliveryFileManager';
import WellnessDeliveryTypeFormDialog, { WellnessDeliveryTypeFormValues } from '@/components/admin/solicitudes/WellnessDeliveryTypeFormDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Schema para cambiar el estado (simplificado, sin envío de correos)
// No incluye 'pending' porque una solicitud no puede volver a ese estado
const statusChangeSchema = z.object({
  newStatus: z.enum(['in_progress', 'resolved', 'rejected'], {
    required_error: 'Debe seleccionar un nuevo estado',
  }),
});

type StatusChangeFormValues = z.infer<typeof statusChangeSchema>;

// Schema para cambiar estado de entrega de bienestar
const deliveryStatusChangeSchema = z.object({
  estado: z.enum(['entregado', 'cancelado'], {
    required_error: 'Debe seleccionar un estado',
  }),
  firma_recibido: z.string().optional(),
  cantidad_entregada: z.union([z.string(), z.number()]).optional(),
  observaciones: z.string().optional(),
}).refine((data) => {
  // Si el estado es "entregado", firma_recibido es obligatorio
  if (data.estado === 'entregado') {
    return !!data.firma_recibido && data.firma_recibido.trim().length > 0;
  }
  return true;
}, {
  message: 'La firma de recibido es obligatoria cuando el estado es "entregado"',
  path: ['firma_recibido'],
}).refine((data) => {
  // Si el estado es "entregado", cantidad_entregada es obligatoria
  if (data.estado === 'entregado') {
    return data.cantidad_entregada !== undefined && data.cantidad_entregada !== '';
  }
  return true;
}, {
  message: 'La cantidad entregada es obligatoria cuando el estado es "entregado"',
  path: ['cantidad_entregada'],
});

type DeliveryStatusChangeFormValues = z.infer<typeof deliveryStatusChangeSchema>;

// Función helper para parsear el parentesco a un formato más amigable
const parseParentesco = (parentesco: string | undefined): string => {
  if (!parentesco) return '';
  
  switch (parentesco.toUpperCase()) {
    case 'HIJO_BIOLOGICO':
      return 'Hijo/a Biológico/a';
    case 'BENEFICIARIO_EN_CUSTODIA':
      return 'Beneficiario en Custodia';
    default:
      return parentesco;
  }
};

// Componente para el menú de acciones con hover
interface ActionMenuProps {
  solicitud: WellnessRequest;
  onViewDetails: (s: WellnessRequest) => void;
  onEdit: (s: WellnessRequest) => void;
  onChangeStatus: (s: WellnessRequest) => void;
  onAddActivityRealized?: (s: WellnessRequest) => void;
  onReviewActivity?: (s: WellnessRequest) => void;
  can: (permission: string) => boolean;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ 
  solicitud, 
  onViewDetails, 
  onEdit, 
  onChangeStatus,
  onAddActivityRealized,
  onReviewActivity,
  can,
}) => {
  const canEditSolicitud = (s: WellnessRequest): boolean => {
    return s.estado === 'pending' || 
           s.estado === 'in_progress' || 
           (can('wellness_requests.update_status') && s.estado === 'resolved');
  };

  const hasActivityRealized = !!solicitud.actividad_realizada;
  const canAddActivity = solicitud.estado === 'resolved';
  const isApproved = solicitud.estado === 'resolved';
  // isActivityProcessed: true cuando publicado_en_galeria no es null ni undefined (ya fue revisada)
  const isActivityProcessed = hasActivityRealized && 
    (solicitud.actividad_realizada.publicado_en_galeria !== null && 
     solicitud.actividad_realizada.publicado_en_galeria !== undefined);

  const canEdit = can('wellness_requests.edit') && canEditSolicitud(solicitud);
  const canChangeStatus = can('wellness_requests.update_status') && !isApproved;
  const canAddActivityAction =
    can('wellness_requests.edit') && canAddActivity && !hasActivityRealized && !!onAddActivityRealized;
  const canReviewActivityAction =
    can('wellness_activity.publish') && hasActivityRealized && !isActivityProcessed && !!onReviewActivity;

  const hasAnyAction = canEdit || canChangeStatus || canAddActivityAction || canReviewActivityAction;

  if (!hasAnyAction) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => onViewDetails(solicitud)}>
          <Eye className="h-4 w-4 mr-2" />
          Ver Detalles
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem onSelect={() => onEdit(solicitud)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
        )}
        {canChangeStatus && (
          <DropdownMenuItem onSelect={() => onChangeStatus(solicitud)}>
            <Send className="h-4 w-4 mr-2" />
            Cambiar Estado
          </DropdownMenuItem>
        )}
        {canAddActivityAction && onAddActivityRealized && (
          <DropdownMenuItem onSelect={() => onAddActivityRealized(solicitud)}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Actividad Realizada
          </DropdownMenuItem>
        )}
        {canReviewActivityAction && onReviewActivity && (
          <DropdownMenuItem onSelect={() => onReviewActivity(solicitud)}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Revisar y Publicar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const AdminSolicitudBienestarPage: React.FC = () => {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSolicitud, setSelectedSolicitud] = useState<WellnessRequest | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [solicitudToRespond, setSolicitudToRespond] = useState<WellnessRequest | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSolicitud, setEditingSolicitud] = useState<WellnessRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCentroCostos, setSelectedCentroCostos] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [sortBy, setSortBy] = useState<'id' | 'fechaPropuesta' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showActivityRealizedForm, setShowActivityRealizedForm] = useState(false);
  const [solicitudForActivity, setSolicitudForActivity] = useState<WellnessRequest | null>(null);
  const [showActivityReviewDialog, setShowActivityReviewDialog] = useState(false);
  const [solicitudForReview, setSolicitudForReview] = useState<WellnessRequest | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showExportDeliveryDialog, setShowExportDeliveryDialog] = useState(false);
  const [showFileManagerModal, setShowFileManagerModal] = useState(false);
  
  // Determinar qué tabs están disponibles según los permisos
  const canViewSolicitudes = can('wellness_requests.view');
  const canViewEntregas = can('wellness_delivery.view');
  
  // Persistir el tab activo en localStorage, pero ajustar según permisos disponibles
  const [activeTab, setActiveTab] = useState<'solicitudes' | 'entregas' | 'campañas'>(() => {
    const savedTab = localStorage.getItem('adminSolicitudBienestarActiveTab');
    if (savedTab === 'solicitudes' && canViewSolicitudes) return 'solicitudes';
    if (savedTab === 'entregas' && canViewEntregas) return 'entregas';
    if (savedTab === 'campañas' && canViewEntregas) return 'campañas';
    if (canViewSolicitudes) return 'solicitudes';
    if (canViewEntregas) return 'entregas';
    return 'solicitudes';
  });

  // Guardar el tab cuando cambia
  useEffect(() => {
    localStorage.setItem('adminSolicitudBienestarActiveTab', activeTab);
  }, [activeTab]);
  
  // Ajustar el tab activo si el actual no está disponible
  useEffect(() => {
    if (activeTab === 'solicitudes' && !canViewSolicitudes) {
      setActiveTab(canViewEntregas ? 'entregas' : 'solicitudes');
    } else if (activeTab === 'entregas' && !canViewEntregas) {
      setActiveTab(canViewSolicitudes ? 'solicitudes' : 'entregas');
    } else if (activeTab === 'campañas' && !canViewEntregas) {
      setActiveTab(canViewSolicitudes ? 'solicitudes' : 'entregas');
    }
  }, [canViewSolicitudes, canViewEntregas, activeTab]);
  
  // Estados para Entregas de Bienestar
  const [tipoEntregaFilter, setTipoEntregaFilter] = useState<string>('all');
  const [estadoEntregaFilter, setEstadoEntregaFilter] = useState<string>('all');
  const [documentoEntregaFilter, setDocumentoEntregaFilter] = useState<string>('');
  const [documentoEntregaFilterDebounced, setDocumentoEntregaFilterDebounced] = useState<string>('');
  const [fechaDesdeEntrega, setFechaDesdeEntrega] = useState<string>('');
  const [fechaHastaEntrega, setFechaHastaEntrega] = useState<string>('');
  const [currentPageEntregas, setCurrentPageEntregas] = useState<number>(1);
  const [itemsPerPageEntregas, setItemsPerPageEntregas] = useState<number>(15);
  const [showFiltrosEntregas, setShowFiltrosEntregas] = useState(false);
  
  // Debounce para el filtro de documento (esperar 500ms después de que el usuario deje de escribir)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDocumentoEntregaFilterDebounced(documentoEntregaFilter);
      setCurrentPageEntregas(1); // Resetear a la primera página cuando cambia el filtro
    }, 500);

    return () => clearTimeout(timer);
  }, [documentoEntregaFilter]);
  const [selectedDeliveryRequest, setSelectedDeliveryRequest] = useState<WellnessDeliveryRequest | null>(null);
  const [showDeliveryDetailModal, setShowDeliveryDetailModal] = useState(false);
  
  // Estados para controlar los menús desplegables en las tablas
  const [openRequestMenuId, setOpenRequestMenuId] = useState<number | null>(null);
  const [openDeliveryMenuId, setOpenDeliveryMenuId] = useState<number | null>(null);
  const [showDeliveryStatusDialog, setShowDeliveryStatusDialog] = useState(false);
  const [deliveryRequestToUpdate, setDeliveryRequestToUpdate] = useState<WellnessDeliveryRequest | null>(null);
  const [isSubmittingDeliveryStatus, setIsSubmittingDeliveryStatus] = useState(false);
  const [deliverySignature, setDeliverySignature] = useState<string | null>(null);
  const [showDeliverySignatureError, setShowDeliverySignatureError] = useState(false);
  const [showSignatureDrawer, setShowSignatureDrawer] = useState(false);
  const deliverySignaturePadRef = React.useRef<SignaturePadRef>(null);
  // Tipos de entrega (campañas): formulario crear/editar
  const [showDeliveryTypeFormDialog, setShowDeliveryTypeFormDialog] = useState(false);
  const [editingDeliveryType, setEditingDeliveryType] = useState<WellnessDeliveryType | null>(null);
  
  // Hooks para móvil y orientación
  const isMobile = useIsMobile();
  const { canRotate, lockToLandscape, unlockOrientation, currentOrientation } = useScreenOrientation();
  
  // Calcular altura del canvas de firma en móviles (reactivo a cambios de tamaño)
  const [signaturePadHeight, setSignaturePadHeight] = useState(400);
  
  useEffect(() => {
    if (isMobile && showSignatureDrawer) {
      const calculateHeight = () => {
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const isLandscape = viewportWidth > viewportHeight;
        
        // Calcular espacio disponible restando:
        // - Header: ~100px
        // - Mensaje de orientación (si está visible): ~60px
        // - Botones y padding: ~140px
        // - Espacios entre elementos: ~30px
        const headerHeight = 100;
        const orientationMessageHeight = (canRotate && currentOrientation === 'portrait') ? 60 : 0;
        const buttonsHeight = 140;
        const spacing = 30;
        const reservedSpace = headerHeight + orientationMessageHeight + buttonsHeight + spacing;
        
        // Altura disponible para el canvas (95vh es la altura del drawer)
        const availableHeight = viewportHeight * 0.95 - reservedSpace;
        
        // También considerar el ancho para evitar que sea demasiado ancho
        const maxWidthBasedHeight = viewportWidth * 0.85;
        
        // Usar el menor entre la altura disponible y la basada en el ancho
        const calculatedHeight = Math.min(
          availableHeight,
          maxWidthBasedHeight,
          500 // Máximo 500px para asegurar que quepan los botones
        );
        
        // Mínimo 250px para que sea usable
        setSignaturePadHeight(Math.max(calculatedHeight, 250));
      };
      
      // Calcular inmediatamente
      calculateHeight();
      
      // Recalcular después de un pequeño delay para asegurar que las dimensiones estén actualizadas
      const timeoutId = setTimeout(calculateHeight, 100);
      
      window.addEventListener('resize', calculateHeight);
      window.addEventListener('orientationchange', () => {
        // Delay adicional para orientationchange ya que las dimensiones pueden tardar en actualizarse
        setTimeout(calculateHeight, 200);
      });
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', calculateHeight);
        window.removeEventListener('orientationchange', calculateHeight);
      };
    } else if (showSignatureDrawer) {
      // Si no es móvil pero el drawer está abierto, usar altura por defecto
      setSignaturePadHeight(400);
    }
  }, [isMobile, showSignatureDrawer, currentOrientation, canRotate]);
  
  const queryClient = useQueryClient();

  const statusChangeForm = useForm<StatusChangeFormValues>({
    resolver: zodResolver(statusChangeSchema),
    defaultValues: {
      newStatus: 'in_progress',
    },
  });

  const deliveryStatusChangeForm = useForm<DeliveryStatusChangeFormValues>({
    resolver: zodResolver(deliveryStatusChangeSchema),
    defaultValues: {
      estado: 'entregado',
      observaciones: undefined,
    },
  });

  // Construir filtros para la API
  const apiFilters = useMemo(() => {
    const filters: any = {
      page: currentPage,
      per_page: itemsPerPage,
      ordenarPor: 'created_at',
      direccion: 'desc',
    };

    if (selectedStatus !== 'all') {
      filters.estado = selectedStatus;
    }

    if (selectedCentroCostos !== 'all') {
      filters.centroCostos = selectedCentroCostos;
    }

    if (searchTerm) {
      filters.busqueda = searchTerm;
    }

    return filters;
  }, [currentPage, itemsPerPage, selectedStatus, selectedCentroCostos, searchTerm]);

  const {
    data: wellnessRequestsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['wellness-requests', apiFilters],
    queryFn: () => wellnessRequestsService.getAllWellnessRequests(apiFilters),
    enabled: canViewSolicitudes,
    staleTime: 0, // Siempre considerar los datos como obsoletos para forzar refetch
  });

  const bienestarSolicitudes = wellnessRequestsData?.data || [];
  const pagination = wellnessRequestsData?.pagination;

  // Normalizar el filtro de documento (trim y convertir a string) - usar el valor con debounce
  const documentoFilterNormalized = useMemo(() => {
    return documentoEntregaFilterDebounced ? documentoEntregaFilterDebounced.trim().toLowerCase() : '';
  }, [documentoEntregaFilterDebounced]);

  // Filtros para Entregas de Bienestar (sin documento, se filtra en frontend)
  const entregasFilters = useMemo(() => {
    const filters: any = {
      page: 1, // Siempre obtener la primera página completa para filtrar en frontend
      per_page: 1000, // Obtener muchos registros para poder filtrar en frontend
      sort_by: 'created_at',
      sort_order: 'desc',
    };

    if (tipoEntregaFilter && tipoEntregaFilter !== 'all') {
      filters.tipo_entrega = tipoEntregaFilter;
    }
    if (estadoEntregaFilter && estadoEntregaFilter !== 'all') {
      filters.estado = estadoEntregaFilter;
    }
    if (fechaDesdeEntrega) {
      filters.fecha_desde = fechaDesdeEntrega;
    }
    if (fechaHastaEntrega) {
      filters.fecha_hasta = fechaHastaEntrega;
    }
    // No incluimos documento aquí, se filtra en frontend

    return filters;
  }, [tipoEntregaFilter, estadoEntregaFilter, fechaDesdeEntrega, fechaHastaEntrega]);

  // Query para Entregas de Bienestar (obtiene todos los datos para filtrar en frontend)
  const {
    data: entregasResponse,
    isLoading: isLoadingEntregas,
    error: errorEntregas,
    refetch: refetchEntregas,
  } = useQuery({
    queryKey: [
      'wellness-delivery-requests',
      tipoEntregaFilter,
      estadoEntregaFilter,
      fechaDesdeEntrega,
      fechaHastaEntrega,
    ],
    queryFn: () => wellnessDeliveryService.getRequests(entregasFilters),
    enabled: canViewEntregas && activeTab === 'entregas',
  });

  // Query para Tipos de entrega (campañas): usado en filtro de entregas y en tab Campañas
  const {
    data: deliveryTypesResponse,
    isLoading: isLoadingDeliveryTypes,
    refetch: refetchDeliveryTypes,
  } = useQuery({
    queryKey: ['wellness-delivery-types'],
    queryFn: () => wellnessDeliveryService.getDeliveryTypes({}),
    enabled: canViewEntregas,
  });
  const deliveryTypes = deliveryTypesResponse?.data ?? [];

  // Query para opciones de filtro: estados y tipos que realmente existen en los datos (sin filtrar por tipo/estado)
  const { data: filterOptionsResponse } = useQuery({
    queryKey: ['wellness-delivery-requests', 'filter-options'],
    queryFn: () => wellnessDeliveryService.getRequests({ per_page: 500 }),
    enabled: canViewEntregas,
  });
  const filterOptionsData = filterOptionsResponse?.data ?? [];

  // Estados únicos que existen en los datos (para filtro y export)
  const uniqueEstadosOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    const labelMap: Record<string, string> = {
      pendiente: 'Pendiente',
      procesado: 'Procesado',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
    };
    filterOptionsData.forEach((r) => {
      const e = r.estado?.toLowerCase?.() || r.estado;
      if (e && !seen.has(e)) {
        seen.add(e);
        out.push({
          value: r.estado,
          label: r.estado_text || labelMap[e] || r.estado,
        });
      }
    });
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [filterOptionsData]);

  // Tipos únicos que existen en los datos (para filtro y export): value puede ser id del tipo o "kit_escolar"
  const uniqueTiposOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    filterOptionsData.forEach((r) => {
      const id = r.wellness_delivery_type_id != null ? String(r.wellness_delivery_type_id) : (r.tipo_entrega || '');
      const key = id || 'unknown';
      if (key !== 'unknown' && !seen.has(key)) {
        seen.add(key);
        const label =
          r.tipo_entrega === 'kit_escolar'
            ? 'Kit escolar'
            : (r.tipo_entrega_text || deliveryTypes.find((t) => String(t.id) === key)?.nombre || key);
        out.push({ value: key, label });
      }
    });
    // Incluir siempre "Kit escolar" (legacy) por si hay registros que no estén en la muestra
    if (!seen.has('kit_escolar')) {
      out.push({ value: 'kit_escolar', label: 'Kit escolar' });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [filterOptionsData, deliveryTypes]);

  // Filtrar entregas por documento en el frontend
  const entregasFiltered = useMemo(() => {
    let filtered = entregasResponse?.data || [];
    
    // Filtrar por documento si hay un valor
    if (documentoFilterNormalized) {
      filtered = filtered.filter((entrega) =>
        entrega.documento_afiliado?.toLowerCase().includes(documentoFilterNormalized)
      );
    }
    
    return filtered;
  }, [entregasResponse?.data, documentoFilterNormalized]);

  // Aplicar paginación en el frontend
  const entregas = useMemo(() => {
    const startIndex = (currentPageEntregas - 1) * itemsPerPageEntregas;
    const endIndex = startIndex + itemsPerPageEntregas;
    return entregasFiltered.slice(startIndex, endIndex);
  }, [entregasFiltered, currentPageEntregas, itemsPerPageEntregas]);

  // Calcular paginación manual
  const entregasPagination = useMemo(() => {
    const total = entregasFiltered.length;
    const totalPages = Math.ceil(total / itemsPerPageEntregas);
    return {
      current_page: currentPageEntregas,
      per_page: itemsPerPageEntregas,
      total,
      total_pages: totalPages,
      last_page: totalPages,
      from: total > 0 ? (currentPageEntregas - 1) * itemsPerPageEntregas + 1 : 0,
      to: Math.min(currentPageEntregas * itemsPerPageEntregas, total),
    };
  }, [entregasFiltered.length, currentPageEntregas, itemsPerPageEntregas]);

  // Open modal from URL parameter
  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId && bienestarSolicitudes.length > 0) {
      const solicitud = bienestarSolicitudes.find(s => s.id.toString() === viewId);
      if (solicitud) {
        setSelectedSolicitud(solicitud);
        // Remove the view parameter from URL
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('view');
        setSearchParams(newSearchParams, { replace: true });
      }
    }
  }, [searchParams, bienestarSolicitudes, setSearchParams]);

  // Ordenamiento local (si el backend no lo hace automáticamente)
  const sortedSolicitudes = React.useMemo(() => {
    if (!sortBy) return bienestarSolicitudes;
    
    return [...bienestarSolicitudes].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'id') {
        comparison = a.id - b.id;
      } else if (sortBy === 'fechaPropuesta') {
        const dateA = new Date(a.fechaPropuesta).getTime();
        const dateB = new Date(b.fechaPropuesta).getTime();
        comparison = dateA - dateB;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [bienestarSolicitudes, sortBy, sortOrder]);

  const toggleSort = (field: 'id' | 'fechaPropuesta') => {
    if (sortBy === field) {
      // Si ya está ordenando por este campo, cambiar el orden
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Si es un campo nuevo, ordenar ascendente por defecto
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Lista de centros de costos únicos de las solicitudes
  const centrosCostosDisponibles = useMemo(() => {
    const centros = new Set<string>();
    bienestarSolicitudes.forEach((req) => {
      if (req.centroCostos) {
        centros.add(req.centroCostos);
      }
    });
    return Array.from(centros).sort();
  }, [bienestarSolicitudes]);

  // Calcular estadísticas (necesitaríamos un endpoint separado para esto, pero por ahora lo calculamos del lado del cliente)
  const stats = useMemo(() => {
    // Nota: Estas estadísticas son solo de la página actual, no del total
    // Idealmente debería venir del backend
    const total = pagination?.total || 0;
    const pending = bienestarSolicitudes.filter((r) => r.estado === 'pending').length;
    const in_progress = bienestarSolicitudes.filter((r) => r.estado === 'in_progress').length;
    const resolved = bienestarSolicitudes.filter((r) => r.estado === 'resolved').length;
    const rejected = bienestarSolicitudes.filter((r) => r.estado === 'rejected').length;
    
    // Calcular solicitudes del mes actual
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const this_month = bienestarSolicitudes.filter((r) => {
      const fecha = new Date(r.created_at);
      return fecha.getMonth() === currentMonth && fecha.getFullYear() === currentYear;
    }).length;

    return { total, pending, in_progress, resolved, rejected, this_month };
  }, [bienestarSolicitudes, pagination]);

  const totalItems = pagination?.total || 0;
  const totalPages = pagination?.last_page || 1;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'resolved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'in_progress':
        return 'En Revisión';
      case 'resolved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      default:
        return 'Desconocido';
    }
  };

  const canEditSolicitud = (solicitud: WellnessRequest): boolean => {
    return solicitud.estado === 'pending' || 
           solicitud.estado === 'in_progress' || 
           (can('wellness_requests.update_status') && solicitud.estado === 'resolved');
  };

  const handleEdit = React.useCallback((solicitud: WellnessRequest) => {
    if (!canEditSolicitud(solicitud)) {
      toast.error('No se puede editar', {
        description: 'Solo se pueden editar solicitudes pendientes, en revisión o aprobadas (con permiso de actualizar estado).',
      });
      return;
    }
    setEditingSolicitud(solicitud);
    setShowCreateForm(true);
  }, []);

  const handleViewDetails = React.useCallback((solicitud: WellnessRequest) => {
    setSelectedSolicitud(solicitud);
  }, []);

  // Función para ver detalles de entrega
  const handleViewDeliveryDetails = async (request: WellnessDeliveryRequest) => {
    try {
      const response = await wellnessDeliveryService.getRequestById(request.id);
      if (response.success && response.data) {
        setSelectedDeliveryRequest(response.data);
        setShowDeliveryDetailModal(true);
      }
    } catch (error) {
      toast.error('Error al cargar los detalles de la solicitud', {
        description: getErrorMessage(error),
      });
    }
  };

  // Formatear fecha para entregas (evita desfase de un día en fechas YYYY-MM-DD por UTC)
  const formatDeliveryDate = (dateString: string): string => {
    try {
      if (!dateString) return '';
      const s = String(dateString);
      if (!s.includes('T') && !s.includes(' ')) {
        return format(parseLocalDate(s), "dd 'de' MMMM 'de' yyyy", { locale: es });
      }
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  };

  // Función para abrir el diálogo de cambio de estado de entrega
  const handleOpenDeliveryStatusDialog = React.useCallback((request: WellnessDeliveryRequest) => {
    setDeliveryRequestToUpdate(request);
    
    // Pre-llenar cantidad_entregada usando beneficiarios_count que viene del API
    // Si beneficiarios_count es > 0 usarlo, de lo contrario usar 1 como valor por defecto
    const beneficiariosCount = request.beneficiarios_count ?? 0;
    const cantidadInicial = beneficiariosCount > 0 ? beneficiariosCount : 1;
    
    deliveryStatusChangeForm.reset({
      estado: 'entregado' as 'entregado' | 'cancelado', // Por defecto "entregado"
      observaciones: undefined,
      firma_recibido: undefined,
      cantidad_entregada: cantidadInicial,
    });
    setDeliverySignature(null);
    setShowDeliverySignatureError(false);
    if (deliverySignaturePadRef.current) {
      deliverySignaturePadRef.current.clear();
    }
    setShowDeliveryStatusDialog(true);
  }, [deliveryStatusChangeForm]);

  // Función para cerrar el diálogo de cambio de estado
  const handleCloseDeliveryStatusDialog = () => {
    setIsSubmittingDeliveryStatus(false);
    setShowDeliveryStatusDialog(false);
    setShowSignatureDrawer(false);
    setDeliveryRequestToUpdate(null);
    setDeliverySignature(null);
    setShowDeliverySignatureError(false);
    if (deliverySignaturePadRef.current) {
      deliverySignaturePadRef.current.clear();
    }
    deliveryStatusChangeForm.reset();
    // Desbloquear orientación al cerrar
    unlockOrientation();
  };

  // Función para manejar el cambio de firma
  const handleDeliverySignatureChange = (dataUrl: string | null) => {
    setDeliverySignature(dataUrl);
    setShowDeliverySignatureError(false);
    // Actualizar el formulario con la firma
    if (dataUrl) {
      deliveryStatusChangeForm.setValue('firma_recibido', dataUrl);
    } else {
      deliveryStatusChangeForm.setValue('firma_recibido', undefined);
    }
  };

  // Mutation para actualizar estado de entrega
  const updateDeliveryStatusMutation = useMutation({
    mutationFn: async (data: DeliveryStatusChangeFormValues) => {
      if (!deliveryRequestToUpdate) throw new Error('No hay solicitud seleccionada');
      
      const requestData: any = {
        estado: data.estado,
        observaciones: data.observaciones || undefined,
      };

      // Solo incluir firma_recibido y cantidad_entregada si el estado es "entregado"
      if (data.estado === 'entregado') {
        if (data.firma_recibido) {
          requestData.firma_recibido = data.firma_recibido;
        }
        if (data.cantidad_entregada) {
          requestData.cantidad_entregada = data.cantidad_entregada;
        }
      }

      return wellnessDeliveryService.updateStatus(deliveryRequestToUpdate.id, requestData);
    },
    onSuccess: async () => {
      toast.success('Estado actualizado exitosamente', {
        description: 'El estado de la solicitud de entrega ha sido actualizado.',
      });
      // Invalidar queries y refetch
      await queryClient.invalidateQueries({ queryKey: ['wellness-delivery-requests'] });
      await refetchEntregas();
      handleCloseDeliveryStatusDialog();
    },
    onError: (error: any) => {
      const errorMessage = getErrorMessage(error);
      toast.error('Error al actualizar el estado', {
        description: errorMessage,
      });
      setIsSubmittingDeliveryStatus(false);
    },
  });

  // Mutación para crear/actualizar tipo de entrega (campaña)
  const saveDeliveryTypeMutation = useMutation({
    mutationFn: async ({ data, id }: { data: WellnessDeliveryTypeFormValues; id?: number }) => {
      if (id != null) {
        return wellnessDeliveryService.updateDeliveryType(id, data);
      }
      return wellnessDeliveryService.createDeliveryType({
        nombre: data.nombre,
        modo_acceso: data.modo_acceso,
        activo: data.activo,
        fecha_desde: data.fecha_desde,
        fecha_hasta: data.fecha_hasta,
      });
    },
    onSuccess: (_, variables) => {
      toast.success(variables.id != null ? 'Campaña actualizada' : 'Campaña creada', {
        description: 'Los cambios se verán reflejados en la página de solicitud de entregas.',
      });
      queryClient.invalidateQueries({ queryKey: ['wellness-delivery-types'] });
      refetchDeliveryTypes();
      setShowDeliveryTypeFormDialog(false);
      setEditingDeliveryType(null);
    },
    onError: (error: any) => {
      toast.error('Error al guardar la campaña', { description: getErrorMessage(error) });
    },
  });

  const handleSaveDeliveryType = async (data: WellnessDeliveryTypeFormValues) => {
    await saveDeliveryTypeMutation.mutateAsync({ data, id: editingDeliveryType?.id });
  };

  // Función para enviar el cambio de estado
  const handleSubmitDeliveryStatusChange = async (data: DeliveryStatusChangeFormValues) => {
    // Validar firma y cantidad si el estado es "entregado"
    if (data.estado === 'entregado') {
      if (!data.firma_recibido) {
        setShowDeliverySignatureError(true);
        return;
      }
      if (!data.cantidad_entregada || data.cantidad_entregada === '') {
        toast.error('Cantidad requerida', {
          description: 'Debe ingresar la cantidad entregada para marcar como entregado.',
        });
        return;
      }
    }

    setIsSubmittingDeliveryStatus(true);
    updateDeliveryStatusMutation.mutate(data);
  };

  // Observar cambios en el estado para mostrar/ocultar el campo de firma
  const selectedEstado = deliveryStatusChangeForm.watch('estado');
  
  // Asegurar que la cantidad se establezca correctamente cuando se abre el diálogo
  useEffect(() => {
    if (showDeliveryStatusDialog && deliveryRequestToUpdate && selectedEstado === 'entregado') {
      // Usar beneficiarios_count de la solicitud seleccionada (detalles) si está disponible,
      // de lo contrario usar el de deliveryRequestToUpdate. Siempre priorizar el valor del API.
      const sourceRequest =
        selectedDeliveryRequest && selectedDeliveryRequest.id === deliveryRequestToUpdate.id
          ? selectedDeliveryRequest
          : deliveryRequestToUpdate;

      const beneficiariosCount = sourceRequest.beneficiarios_count ?? 0;
      const cantidadBeneficiarios = beneficiariosCount > 0 ? beneficiariosCount : 1;

      // Establecer el valor en el formulario
      deliveryStatusChangeForm.setValue('cantidad_entregada', cantidadBeneficiarios);
    }
  }, [showDeliveryStatusDialog, deliveryRequestToUpdate, selectedDeliveryRequest, selectedEstado, deliveryStatusChangeForm]);
  
  // Restaurar cantidad_entregada cuando el estado cambia a "entregado"
  useEffect(() => {
    if (selectedEstado === 'entregado' && deliveryRequestToUpdate) {
      // Usar beneficiarios_count para restaurar la cantidad cuando el estado es "entregado"
      const sourceRequest =
        selectedDeliveryRequest && selectedDeliveryRequest.id === deliveryRequestToUpdate.id
          ? selectedDeliveryRequest
          : deliveryRequestToUpdate;

      const beneficiariosCount = sourceRequest.beneficiarios_count ?? 0;
      const cantidadDefault = beneficiariosCount > 0 ? beneficiariosCount : 1;

      deliveryStatusChangeForm.setValue('cantidad_entregada', cantidadDefault);
    } else if (selectedEstado === 'cancelado') {
      // Limpiar cantidad cuando se cancela
      deliveryStatusChangeForm.setValue('cantidad_entregada', undefined);
    }
  }, [selectedEstado, deliveryRequestToUpdate, selectedDeliveryRequest, deliveryStatusChangeForm]);

  // Manejar orientación cuando se muestra el drawer de firma en móviles
  useEffect(() => {
    if (showSignatureDrawer && isMobile && selectedEstado === 'entregado') {
      // Intentar bloquear en landscape si es posible
      if (canRotate) {
        lockToLandscape();
      }
    } else if (!showSignatureDrawer) {
      // Desbloquear cuando se cierra el drawer
      unlockOrientation();
    }

    return () => {
      // Cleanup: desbloquear al desmontar
      if (!showSignatureDrawer) {
        unlockOrientation();
      }
    };
  }, [showSignatureDrawer, isMobile, selectedEstado, canRotate, lockToLandscape, unlockOrientation]);

  const handleAddActivityRealized = React.useCallback((solicitud: WellnessRequest) => {
    setSolicitudForActivity(solicitud);
    setShowActivityRealizedForm(true);
  }, []);

  const handleReviewActivity = React.useCallback((solicitud: WellnessRequest) => {
    if (!solicitud.actividad_realizada) {
      toast.error('No hay actividad realizada', {
        description: 'Esta solicitud no tiene información de actividad realizada.',
      });
      return;
    }
    setSolicitudForReview(solicitud);
    setShowActivityReviewDialog(true);
  }, []);

  const handleOpenStatusDialog = React.useCallback((solicitud: WellnessRequest) => {
    // Prevenir cambio de estado si está aprobada (resolved)
    if (solicitud.estado === 'resolved') {
      toast.error('No se puede cambiar el estado', {
        description: 'Una solicitud aprobada no puede cambiar su estado.',
      });
      return;
    }
    
    setSolicitudToRespond(solicitud);
    // Si el estado actual es 'pending', establecer 'in_progress' por defecto
    // De lo contrario, mantener el estado actual (si es in_progress o rejected)
    const currentStatus = solicitud.estado;
    let defaultStatus: 'in_progress' | 'resolved' | 'rejected' = 'in_progress';
    
    if (currentStatus === 'pending') {
      defaultStatus = 'in_progress';
    } else if (currentStatus === 'in_progress' || currentStatus === 'rejected') {
      defaultStatus = currentStatus;
    }
    
    statusChangeForm.reset({
      newStatus: defaultStatus,
    });
    setResponseDialogOpen(true);
  }, [statusChangeForm]);

  const handleCloseStatusDialog = () => {
    setIsSubmittingResponse(false);
    setResponseDialogOpen(false);
    setSolicitudToRespond(null);
    statusChangeForm.reset();
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (data: StatusChangeFormValues) => {
      if (!solicitudToRespond) throw new Error('No hay solicitud seleccionada');
      // Actualizar solo el estado de la solicitud
      return wellnessRequestsService.updateWellnessRequestStatus(solicitudToRespond.id, data.newStatus);
    },
    onSuccess: async () => {
      toast.success('Estado actualizado exitosamente', {
        description: 'El estado de la solicitud ha sido actualizado.',
      });
      // Invalidar y refetch para asegurar que se actualicen los datos
      await queryClient.invalidateQueries({ queryKey: ['wellness-requests'] });
      await refetch();
      handleCloseStatusDialog();
    },
    onError: (error: any) => {
      const errorMessage = getErrorMessage(error);
      toast.error('Error al actualizar el estado', {
        description: errorMessage,
      });
      setIsSubmittingResponse(false);
    },
  });

  const handleSubmitStatusChange = async (data: StatusChangeFormValues) => {
    // Prevenir cambio de estado si está aprobada (resolved)
    if (solicitudToRespond?.estado === 'resolved') {
      toast.error('No se puede cambiar el estado', {
        description: 'Una solicitud aprobada no puede cambiar su estado.',
      });
      return;
    }
    
    setIsSubmittingResponse(true);
    updateStatusMutation.mutate(data);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-4 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-primary-prosalud/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                      <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-primary-prosalud" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-prosalud">
                          Bienestar
                        </CardTitle>
                        {activeTab === 'solicitudes' && (
                          <Badge variant="secondary" className="text-sm sm:text-base px-2 sm:px-3 py-1 w-fit">
                            Total: {stats?.total || 0}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm sm:text-base mt-1 sm:mt-2">
                        {activeTab === 'solicitudes'
                          ? 'Gestiona las solicitudes de actividades de bienestar'
                          : activeTab === 'campañas'
                            ? 'Gestiona los tipos de entrega (campañas) para que los afiliados soliciten beneficios.'
                            : 'Gestiona las solicitudes de entregas de bienestar y otros beneficios'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                    {activeTab === 'solicitudes' && can('wellness_requests.view') && (
                      <Button
                        onClick={() => setShowExportDialog(true)}
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Exportar Reporte</span>
                        <span className="sm:hidden">Exportar</span>
                      </Button>
                    )}
                    {activeTab === 'entregas' && (
                      <>
                        {can('wellness_delivery.view') && (
                          <Button
                            onClick={() => setShowExportDeliveryDialog(true)}
                            variant="outline"
                            className="w-full sm:w-auto"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Exportar Reporte</span>
                            <span className="sm:hidden">Exportar</span>
                          </Button>
                        )}
                        {can('wellness_delivery.manage') && (
                          <Button
                            variant="default"
                            onClick={() => navigate('/admin/entregas-bienestar/registrar')}
                            className="w-full sm:w-auto bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                          >
                            <Package className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Registrar entrega</span>
                            <span className="sm:hidden">Registrar</span>
                          </Button>
                        )}
                      </>
                    )}
                    {activeTab === 'campañas' && can('wellness_delivery.manage') && (
                      <Button
                        onClick={() => {
                          setEditingDeliveryType(null);
                          setShowDeliveryTypeFormDialog(true);
                        }}
                        className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white w-full sm:w-auto"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Nueva campaña</span>
                        <span className="sm:hidden">Nueva</span>
                      </Button>
                    )}
                    {activeTab === 'solicitudes' && can('wellness_requests.create') && (
                      <Button
                        onClick={() => setShowCreateForm(true)}
                        className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white w-full sm:w-auto"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Nueva Solicitud</span>
                        <span className="sm:hidden">Nueva</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Tabs */}
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm bg-white">
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'solicitudes' | 'entregas' | 'campañas')} className="space-y-6">
                  <div className="p-4 sm:p-6 pb-0">
                    <TabsList className={`grid w-full bg-gray-50 border p-1 ${canViewEntregas ? (canViewSolicitudes ? 'grid-cols-3' : 'grid-cols-2') : 'grid-cols-1'}`}>
                      {canViewSolicitudes && (
                        <TabsTrigger
                          value="solicitudes"
                          className="flex items-center space-x-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-all duration-200"
                        >
                          <Heart className="h-4 w-4" />
                          <span>Solicitudes</span>
                        </TabsTrigger>
                      )}
                      {canViewEntregas && (
                        <TabsTrigger
                          value="entregas"
                          className="flex items-center space-x-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-all duration-200"
                        >
                          <Package className="h-4 w-4" />
                          <span>Entregas</span>
                        </TabsTrigger>
                      )}
                      {canViewEntregas && (
                        <TabsTrigger
                          value="campañas"
                          className="flex items-center space-x-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-all duration-200"
                        >
                          <CalendarRange className="h-4 w-4" />
                          <span>Campañas</span>
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </div>

                  <div className="p-4 sm:p-6 pt-0 min-w-0 overflow-x-hidden">
                    {/* Tab: Solicitudes de Bienestar */}
                    <TabsContent value="solicitudes" className="space-y-6 mt-0">
                      {!canViewSolicitudes ? (
                        <Card>
                          <CardContent className="p-6">
                            <p className="text-red-600">No tienes permisos para acceder a esta sección.</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <>
                          {/* Stats Cards */}
                          <motion.div variants={itemVariants}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Card className="border-l-4 border-l-yellow-500 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Pendientes</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</p>
                    </div>
                    <div className="p-2 rounded-full">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">En Revisión</p>
                      <p className="text-2xl font-bold text-blue-600">{stats?.in_progress || 0}</p>
                    </div>
                    <div className="p-2 rounded-full">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Aprobadas</p>
                      <p className="text-2xl font-bold text-green-600">{stats?.resolved || 0}</p>
                    </div>
                    <div className="p-2 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Rechazadas</p>
                      <p className="text-2xl font-bold text-red-600">{stats?.rejected || 0}</p>
                    </div>
                    <div className="p-2 rounded-full">
                      <X className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Este Mes</p>
                      <p className="text-2xl font-bold text-purple-600">{stats?.this_month || 0}</p>
                    </div>
                    <div className="p-2 rounded-full">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Filtros</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nombre, actividad, centro de costos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="in_progress">En Revisión</SelectItem>
                      <SelectItem value="resolved">Aprobada</SelectItem>
                      <SelectItem value="rejected">Rechazada</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedCentroCostos} onValueChange={setSelectedCentroCostos}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Todos los centros" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los centros de costos</SelectItem>
                      {centrosCostosDisponibles.map((centro) => (
                        <SelectItem key={centro} value={centro}>
                          {centro}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Table */}
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">Solicitudes de Bienestar ({totalItems})</CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  Lista completa de solicitudes de actividades de bienestar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <TableLoadingSkeleton columns={7} rows={5} />
                ) : error ? (
                  <div className="text-center py-8 text-red-600">
                    Error al cargar las solicitudes. Por favor, intente nuevamente.
                  </div>
                ) : totalItems === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg text-gray-600">
                      {searchTerm || selectedStatus !== 'all'
                        ? 'No se encontraron solicitudes con los filtros aplicados'
                        : 'No hay solicitudes de bienestar registradas'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View - Hidden on mobile */}
                    <div className="hidden lg:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <Button
                                variant="ghost"
                                onClick={() => toggleSort('id')}
                                className="flex items-center gap-2 h-auto px-2 py-1.5 font-semibold"
                              >
                                ID
                                {sortBy === 'id' ? (
                                  sortOrder === 'asc' ? (
                                    <ArrowUp className="h-4 w-4" />
                                  ) : (
                                    <ArrowDown className="h-4 w-4" />
                                  )
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 opacity-50" />
                                )}
                              </Button>
                            </TableHead>
                            <TableHead>Actividad</TableHead>
                            <TableHead>Centro de Costos</TableHead>
                            <TableHead>Sedes</TableHead>
                            <TableHead>Solicitante</TableHead>
                            <TableHead>
                              <Button
                                variant="ghost"
                                onClick={() => toggleSort('fechaPropuesta')}
                                className="flex items-center gap-2 h-auto px-2 py-1.5 font-semibold"
                              >
                                Fecha Propuesta
                                {sortBy === 'fechaPropuesta' ? (
                                  sortOrder === 'asc' ? (
                                    <ArrowUp className="h-4 w-4" />
                                  ) : (
                                    <ArrowDown className="h-4 w-4" />
                                  )
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 opacity-50" />
                                )}
                              </Button>
                            </TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedSolicitudes.map((solicitud) => (
                            <TableRow key={solicitud.id}>
                              <TableCell className="font-medium">#{solicitud.id}</TableCell>
                              <TableCell>
                                <div className="max-w-xs">
                                  <div className="font-medium text-gray-900 mb-1">
                                    {solicitud.nombreActividad || 'N/A'}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {solicitud.actividad_realizada && (
                                      <>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs whitespace-nowrap">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Realizada
                                        </Badge>
                                        {solicitud.actividad_realizada.publicado_en_galeria === true ? (
                                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs whitespace-nowrap">
                                            <Globe className="h-3 w-3 mr-1" />
                                            Publicado
                                          </Badge>
                                        ) : solicitud.actividad_realizada.publicado_en_galeria === false ? (
                                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs whitespace-nowrap">
                                            <EyeOff className="h-3 w-3 mr-1" />
                                            No publicado
                                          </Badge>
                                        ) : null}
                                      </>
                                    )}
                                  </div>
                                  {solicitud.numeroParticipantes && (
                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                      <Users className="h-3 w-3" />
                                      {solicitud.numeroParticipantes} participantes
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm">
                                    {solicitud.centroCostos || 'N/A'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {Array.isArray(solicitud.sedes) &&
                                  solicitud.sedes.length > 0 ? (
                                    solicitud.sedes.slice(0, 2).map((sede: string) => (
                                      <Badge key={sede} variant="outline" className="text-xs">
                                        {sede}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-sm text-gray-500">N/A</span>
                                  )}
                                  {Array.isArray(solicitud.sedes) &&
                                    solicitud.sedes.length > 2 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{solicitud.sedes.length - 2}
                                      </Badge>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {solicitud.solicitante?.name || `ID: ${solicitud.solicitanteId}`}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {solicitud.solicitante?.email || 'N/A'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  {solicitud.fechaPropuesta
                                    ? formatDateReadable(solicitud.fechaPropuesta)
                                    : 'N/A'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(solicitud.estado)}>
                                  {getStatusLabel(solicitud.estado)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <ActionMenu
                                  solicitud={solicitud}
                                  onViewDetails={handleViewDetails}
                                  onEdit={handleEdit}
                                  onChangeStatus={handleOpenStatusDialog}
                                  onAddActivityRealized={handleAddActivityRealized}
                                  onReviewActivity={handleReviewActivity}
                                  can={can}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View - Visible on mobile and tablet */}
                    <div className="lg:hidden space-y-3">
                      {sortedSolicitudes.map((solicitud) => (
                        <Card key={solicitud.id} className="border shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Header with ID and actions */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-gray-900 text-sm">
                                      #{solicitud.id}
                                    </p>
                                    <Badge className={getStatusColor(solicitud.estado)}>
                                      {getStatusLabel(solicitud.estado)}
                                    </Badge>
                                  </div>
                                </div>
                                {/* Botones de acción en móvil - En lugar del menú flotante */}
                                {(() => {
                                  const canEditSolicitud = (s: WellnessRequest): boolean => {
                                    return s.estado === 'pending' || 
                                           s.estado === 'in_progress' || 
                                           (can('wellness_requests.update_status') && s.estado === 'resolved');
                                  };
                                  const hasActivityRealized = !!solicitud.actividad_realizada;
                                  const canAddActivity = solicitud.estado === 'resolved';
                                  const isApproved = solicitud.estado === 'resolved';
                                  const isActivityProcessed = hasActivityRealized && 
                                    (solicitud.actividad_realizada.publicado_en_galeria !== null && 
                                     solicitud.actividad_realizada.publicado_en_galeria !== undefined);
                                  const canEdit = can('wellness_requests.edit') && canEditSolicitud(solicitud);
                                  const canChangeStatus = can('wellness_requests.update_status') && !isApproved;
                                  const canAddActivityAction = can('wellness_requests.edit') && canAddActivity && !hasActivityRealized && !!handleAddActivityRealized;
                                  const canReviewActivityAction = can('wellness_activity.publish') && hasActivityRealized && !isActivityProcessed && !!handleReviewActivity;
                                  const hasAnyAction = canEdit || canChangeStatus || canAddActivityAction || canReviewActivityAction;
                                  
                                  if (!hasAnyAction) return null;
                                  
                                  return (
                                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-xs"
                                        onClick={() => handleViewDetails(solicitud)}
                                      >
                                        <Eye className="h-3.5 w-3.5 mr-1" />
                                        Ver
                                      </Button>
                                      {canEdit && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 text-xs"
                                          onClick={() => handleEdit(solicitud)}
                                        >
                                          <Pencil className="h-3.5 w-3.5 mr-1" />
                                          Editar
                                        </Button>
                                      )}
                                      {canChangeStatus && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 text-xs"
                                          onClick={() => handleOpenStatusDialog(solicitud)}
                                        >
                                          <Send className="h-3.5 w-3.5 mr-1" />
                                          Estado
                                        </Button>
                                      )}
                                      {canAddActivityAction && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 text-xs"
                                          onClick={() => handleAddActivityRealized(solicitud)}
                                        >
                                          <Plus className="h-3.5 w-3.5 mr-1" />
                                          Actividad
                                        </Button>
                                      )}
                                      {canReviewActivityAction && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 text-xs"
                                          onClick={() => handleReviewActivity(solicitud)}
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                          Revisar
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Actividad */}
                              <div className="border-t pt-2">
                                <p className="text-xs font-medium text-gray-500 mb-1">Actividad</p>
                                <p className="font-medium text-gray-900 text-sm mb-2">
                                  {solicitud.nombreActividad || 'N/A'}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  {solicitud.actividad_realizada && (
                                    <>
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Realizada
                                      </Badge>
                                      {solicitud.actividad_realizada.publicado_en_galeria === true ? (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                          <Globe className="h-3 w-3 mr-1" />
                                          Publicado
                                        </Badge>
                                      ) : solicitud.actividad_realizada.publicado_en_galeria === false ? (
                                        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
                                          <EyeOff className="h-3 w-3 mr-1" />
                                          No publicado
                                        </Badge>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                                {solicitud.numeroParticipantes && (
                                  <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {solicitud.numeroParticipantes} participantes
                                  </div>
                                )}
                              </div>

                              {/* Centro de Costos y Sedes */}
                              <div className="border-t pt-2">
                                <div className="grid grid-cols-1 gap-2">
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">Centro de Costos</p>
                                    <div className="flex items-center gap-2">
                                      <Building className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-900">
                                        {solicitud.centroCostos || 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">Sedes</p>
                                    <div className="flex flex-wrap gap-1">
                                      {Array.isArray(solicitud.sedes) && solicitud.sedes.length > 0 ? (
                                        solicitud.sedes.slice(0, 2).map((sede: string) => (
                                          <Badge key={sede} variant="outline" className="text-xs">
                                            {sede}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-sm text-gray-500">N/A</span>
                                      )}
                                      {Array.isArray(solicitud.sedes) && solicitud.sedes.length > 2 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{solicitud.sedes.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Solicitante y Fecha */}
                              <div className="border-t pt-2">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Solicitante</p>
                                    <p className="text-sm text-gray-900 truncate">
                                      {solicitud.solicitante?.name || `ID: ${solicitud.solicitanteId}`}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {solicitud.solicitante?.email || 'N/A'}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Fecha Propuesta</p>
                                    <div className="flex items-center gap-2 text-sm">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-900">
                                        {solicitud.fechaPropuesta
                                          ? formatDateReadable(solicitud.fechaPropuesta)
                                          : 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

                    <DataPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalItems}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      onItemsPerPageChange={(newSize) => {
                        setItemsPerPage(newSize);
                        setCurrentPage(1); // Reset to first page when changing page size
                      }}
                      className="mt-4"
                    />
                        </>
                      )}
                    </TabsContent>

                    {/* Tab: Entregas de Bienestar */}
                    <TabsContent value="entregas" className="space-y-6 mt-0">
                      {!canViewEntregas ? (
                        <Card>
                          <CardContent className="p-6">
                            <p className="text-red-600">No tienes permisos para acceder a esta sección.</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <>
                          {/* Filtros (colapsables) - arriba de la tabla */}
                          <Collapsible open={showFiltrosEntregas} onOpenChange={setShowFiltrosEntregas}>
                            <Card className="border shadow-sm bg-white">
                              <CardHeader className="py-3">
                                <CollapsibleTrigger asChild>
                                  <button
                                    type="button"
                                    className="w-full flex items-center justify-between gap-2 p-0 h-auto rounded-md hover:bg-slate-100 text-left transition-colors"
                                  >
                                    <span className="flex items-center space-x-2 text-base font-medium text-gray-900">
                                      <Filter className="h-4 w-4 text-gray-600" />
                                      <span>Filtros</span>
                                    </span>
                                    {showFiltrosEntregas ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                                  </button>
                                </CollapsibleTrigger>
                              </CardHeader>
                              <CollapsibleContent>
                                <CardContent className="pt-0">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="relative sm:col-span-2 lg:col-span-2">
                                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                      <Input
                                        placeholder="Buscar por documento..."
                                        value={documentoEntregaFilter}
                                        onChange={(e) => {
                                          setDocumentoEntregaFilter(e.target.value);
                                          setCurrentPageEntregas(1);
                                        }}
                                        className="pl-10"
                                      />
                                    </div>
                                    <Select
                                      value={tipoEntregaFilter}
                                      onValueChange={(value) => {
                                        setTipoEntregaFilter(value);
                                        setCurrentPageEntregas(1);
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Tipo de entrega" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">Todos los tipos</SelectItem>
                                        {uniqueTiposOptions.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select
                                      value={estadoEntregaFilter}
                                      onValueChange={(value) => {
                                        setEstadoEntregaFilter(value);
                                        setCurrentPageEntregas(1);
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Estado" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">Todos los estados</SelectItem>
                                        {uniqueEstadosOptions.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                    <div>
                                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                                        Fecha desde
                                      </label>
                                      <Input
                                        type="date"
                                        value={fechaDesdeEntrega}
                                        onChange={(e) => {
                                          setFechaDesdeEntrega(e.target.value);
                                          setCurrentPageEntregas(1);
                                        }}
                                        max={fechaHastaEntrega || undefined}
                                        className="w-full"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                                        Fecha hasta
                                      </label>
                                      <Input
                                        type="date"
                                        value={fechaHastaEntrega}
                                        onChange={(e) => {
                                          setFechaHastaEntrega(e.target.value);
                                          setCurrentPageEntregas(1);
                                        }}
                                        min={fechaDesdeEntrega || undefined}
                                        className="w-full"
                                      />
                                    </div>
                                  </div>
                                </CardContent>
                              </CollapsibleContent>
                            </Card>
                          </Collapsible>

                          {/* Tabla de Entregas */}
                          <Card className="border shadow-sm bg-white">
                            <CardHeader>
                              <CardTitle className="text-2xl font-bold text-gray-900">
                                Entregas de Bienestar ({entregasPagination?.total || 0})
                              </CardTitle>
                              <CardDescription className="text-gray-600 mt-1">
                                Lista completa de solicitudes de entrega de bienestar
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              {isLoadingEntregas ? (
                                <TableLoadingSkeleton columns={7} rows={5} />
                              ) : errorEntregas ? (
                                <div className="text-center py-8 text-red-600">
                                  Error al cargar las entregas. Por favor, intente nuevamente.
                                  <Button onClick={() => refetchEntregas()} variant="outline" className="mt-4">
                                    Reintentar
                                  </Button>
                                </div>
                              ) : entregas.length === 0 ? (
                                <div className="text-center py-12">
                                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                  <p className="text-lg text-gray-600">
                                    {documentoEntregaFilter || tipoEntregaFilter !== 'all' || estadoEntregaFilter !== 'all' || fechaDesdeEntrega || fechaHastaEntrega
                                      ? 'No se encontraron entregas con los filtros aplicados'
                                      : 'No hay entregas de bienestar registradas'}
                                  </p>
                                </div>
                              ) : (
                                <>
                                  {/* Desktop Table View - Hidden on mobile */}
                                  <div className="hidden lg:block overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>ID</TableHead>
                                          <TableHead>Tipo</TableHead>
                                          <TableHead>Afiliado</TableHead>
                                          <TableHead>Documento</TableHead>
                                          <TableHead>Hospital</TableHead>
                                          <TableHead>Estado</TableHead>
                                          <TableHead>Fecha</TableHead>
                                          <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {entregas.map((request) => (
                                          <TableRow key={request.id}>
                                            <TableCell className="font-medium">#{request.id}</TableCell>
                                            <TableCell>
                                              {request.tipo_entrega_text || 
                                               (request.tipo_entrega === 'kit_escolar' ? 'Kit escolar' : request.tipo_entrega)}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate">
                                              {request.nombre_afiliado}
                                            </TableCell>
                                            <TableCell>{request.documento_afiliado}</TableCell>
                                            <TableCell>{request.hospital || '-'}</TableCell>
                                            <TableCell>
                                              <Badge className={
                                                request.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                                request.estado === 'procesado' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                                request.estado === 'entregado' ? 'bg-green-100 text-green-800 border border-green-300' :
                                                request.estado === 'cancelado' ? 'bg-red-100 text-red-800 border border-red-300' :
                                                'bg-gray-100 text-gray-800 border border-gray-300'
                                              }>
                                                {request.estado_text || 
                                                 (request.estado === 'pendiente' ? 'Pendiente' :
                                                  request.estado === 'procesado' ? 'Procesado' :
                                                  request.estado === 'entregado' ? 'Entregado' :
                                                  request.estado === 'cancelado' ? 'Cancelado' : request.estado)}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                              {formatDeliveryDate(request.created_at)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                  <DropdownMenuItem onSelect={() => handleViewDeliveryDetails(request)}>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Ver Detalles
                                                  </DropdownMenuItem>
                                                  {can('wellness_delivery.manage') && request.estado !== 'entregado' && request.estado !== 'cancelado' && (
                                                    <DropdownMenuItem onSelect={() => handleOpenDeliveryStatusDialog(request)}>
                                                      <Send className="h-4 w-4 mr-2" />
                                                      Cambiar Estado
                                                    </DropdownMenuItem>
                                                  )}
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>

                                  {/* Mobile Card View - Visible on mobile and tablet */}
                                  <div className="lg:hidden space-y-3">
                                    {entregas.map((request) => (
                                      <Card key={request.id} className="border shadow-sm hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                          <div className="space-y-3">
                                            {/* Header with ID and actions */}
                                            <div className="flex items-start justify-between gap-3">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <p className="font-medium text-gray-900 text-sm">
                                                    #{request.id}
                                                  </p>
                                                  <Badge className={
                                                    request.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                                    request.estado === 'procesado' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                                    request.estado === 'entregado' ? 'bg-green-100 text-green-800 border border-green-300' :
                                                    request.estado === 'cancelado' ? 'bg-red-100 text-red-800 border border-red-300' :
                                                    'bg-gray-100 text-gray-800 border border-gray-300'
                                                  }>
                                                    {request.estado_text || 
                                                     (request.estado === 'pendiente' ? 'Pendiente' :
                                                      request.estado === 'procesado' ? 'Procesado' :
                                                      request.estado === 'entregado' ? 'Entregado' :
                                                      request.estado === 'cancelado' ? 'Cancelado' : request.estado)}
                                                  </Badge>
                                                </div>
                                              </div>
                                              {/* Botones de acción en móvil - En lugar del menú flotante */}
                                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-8 px-2 text-xs"
                                                  onClick={() => handleViewDeliveryDetails(request)}
                                                >
                                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                                  Ver
                                                </Button>
                                                {can('wellness_delivery.manage') && request.estado !== 'entregado' && request.estado !== 'cancelado' && (
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-xs"
                                                    onClick={() => handleOpenDeliveryStatusDialog(request)}
                                                  >
                                                    <Send className="h-3.5 w-3.5 mr-1" />
                                                    Estado
                                                  </Button>
                                                )}
                                              </div>
                                            </div>

                                            {/* Tipo y Afiliado */}
                                            <div className="border-t pt-2">
                                              <div className="space-y-2">
                                                <div>
                                                  <p className="text-xs font-medium text-gray-500 mb-1">Tipo</p>
                                                  <p className="text-sm text-gray-900">
                                                    {request.tipo_entrega_text || 
                                                     (request.tipo_entrega === 'kit_escolar' ? 'Kit escolar' : request.tipo_entrega)}
                                                  </p>
                                                </div>
                                                <div>
                                                  <p className="text-xs font-medium text-gray-500 mb-1">Afiliado</p>
                                                  <p className="text-sm text-gray-900">{request.nombre_afiliado}</p>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Documento y Hospital */}
                                            <div className="border-t pt-2">
                                              <div className="grid grid-cols-1 gap-2">
                                                <div>
                                                  <p className="text-xs font-medium text-gray-500 mb-1">Documento</p>
                                                  <p className="text-sm text-gray-900">{request.documento_afiliado}</p>
                                                </div>
                                                {request.hospital && (
                                                  <div>
                                                    <p className="text-xs font-medium text-gray-500 mb-1">Hospital</p>
                                                    <p className="text-sm text-gray-900">{request.hospital}</p>
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Fecha */}
                                            <div className="border-t pt-2">
                                              <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                <span className="text-gray-600">
                                                  {formatDeliveryDate(request.created_at)}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                  {entregasPagination && (
                                    <div className="mt-4">
                                      <DataPagination
                                        currentPage={entregasPagination.current_page}
                                        totalPages={entregasPagination.last_page}
                                        itemsPerPage={entregasPagination.per_page}
                                        totalItems={entregasPagination.total}
                                        onPageChange={setCurrentPageEntregas}
                                        onItemsPerPageChange={(value) => {
                                          setItemsPerPageEntregas(value);
                                          setCurrentPageEntregas(1);
                                        }}
                                      />
                                    </div>
                                  )}
                                </>
                              )}
                            </CardContent>
                          </Card>
                        </>
                      )}
                    </TabsContent>

                    {/* Tab: Campañas (tipos de entrega) */}
                    <TabsContent value="campañas" className="space-y-6 mt-0 overflow-hidden">
                      {!canViewEntregas ? (
                        <Card>
                          <CardContent className="p-4 sm:p-6">
                            <p className="text-red-600 text-sm sm:text-base">No tienes permisos para acceder a esta sección.</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <>
                          <Card className="border shadow-sm bg-white overflow-hidden">
                            <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
                              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                <CalendarRange className="h-5 w-5 shrink-0" />
                                <span className="break-words">Campañas (tipos de entrega)</span>
                              </CardTitle>
                              <CardDescription className="text-sm">
                                Gestiona los tipos de entrega que aparecen en la página de solicitud. Solo una campaña activa aplica por fecha; el afiliado no elige el tipo, el sistema asigna el activo.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                              {isLoadingDeliveryTypes ? (
                                <TableLoadingSkeleton columns={5} rows={4} />
                              ) : deliveryTypes.length === 0 ? (
                                <div className="text-center py-8 sm:py-12 border rounded-lg bg-gray-50 px-4">
                                  <CalendarRange className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3" />
                                  <p className="text-gray-600 mb-1 text-sm sm:text-base">No hay campañas configuradas</p>
                                  <p className="text-xs sm:text-sm text-gray-500 mb-4">Crea una para que los afiliados puedan solicitar entregas en ese período.</p>
                                  {can('wellness_delivery.manage') && (
                                    <Button
                                      onClick={() => {
                                        setEditingDeliveryType(null);
                                        setShowDeliveryTypeFormDialog(true);
                                      }}
                                      className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white w-full sm:w-auto"
                                    >
                                      <Plus className="h-4 w-4 mr-2 shrink-0" />
                                      Nueva campaña
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  {/* Desktop: tabla */}
                                  <div className="hidden lg:block overflow-x-auto min-w-0">
                                    <Table className="min-w-[640px]">
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="text-xs sm:text-sm">Nombre</TableHead>
                                          <TableHead className="text-xs sm:text-sm">Modo</TableHead>
                                          <TableHead className="text-xs sm:text-sm">Activo</TableHead>
                                          <TableHead className="text-xs sm:text-sm">Desde</TableHead>
                                          <TableHead className="text-xs sm:text-sm">Hasta</TableHead>
                                          <TableHead className="text-xs sm:text-sm">Creado</TableHead>
                                          {can('wellness_delivery.manage') && <TableHead className="text-right text-xs sm:text-sm">Acciones</TableHead>}
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {deliveryTypes.map((t) => (
                                          <TableRow key={t.id}>
                                            <TableCell className="font-medium text-xs sm:text-sm min-w-[120px] max-w-[180px] sm:max-w-none truncate" title={t.nombre}>{t.nombre}</TableCell>
                                            <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                                              <Badge variant="outline" className="text-xs">
                                                {t.modo_acceso === 'abierto' ? 'Abierto' : 'Con listado'}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                                              <Badge
                                                variant="outline"
                                                className={`text-xs ${t.activo ? 'border-green-600 bg-green-50 text-green-800' : 'border-slate-300 bg-slate-100 text-slate-700'}`}
                                              >
                                                {t.activo ? 'Activo' : 'Inactivo'}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs sm:text-sm whitespace-nowrap">{format(parseLocalDate(t.fecha_desde), 'dd/MM/yyyy', { locale: es })}</TableCell>
                                            <TableCell className="text-xs sm:text-sm whitespace-nowrap">{format(parseLocalDate(t.fecha_hasta), 'dd/MM/yyyy', { locale: es })}</TableCell>
                                            <TableCell className="text-xs sm:text-sm text-gray-600 min-w-[100px]">
                                              {format(t.created_at && !String(t.created_at).includes('T') ? parseLocalDate(t.created_at) : new Date(t.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                                              {t.created_by?.name && (
                                                <span className="block text-xs text-gray-500">por {t.created_by.name}</span>
                                              )}
                                            </TableCell>
                                            {can('wellness_delivery.manage') && (
                                              <TableCell className="text-right whitespace-nowrap">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-8 px-2 sm:px-3"
                                                  onClick={() => {
                                                    setEditingDeliveryType(t);
                                                    setShowDeliveryTypeFormDialog(true);
                                                  }}
                                                >
                                                  <Pencil className="h-4 w-4 sm:mr-1" />
                                                  <span className="hidden sm:inline">Editar</span>
                                                </Button>
                                              </TableCell>
                                            )}
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>

                                  {/* Móvil: cards */}
                                  <div className="lg:hidden space-y-3">
                                    {deliveryTypes.map((t) => (
                                      <Card key={t.id} className="border shadow-sm">
                                        <CardContent className="p-4">
                                          <div className="flex flex-col gap-3">
                                            <div className="flex items-start justify-between gap-2">
                                              <p className="font-medium text-gray-900 break-words flex-1 min-w-0">{t.nombre}</p>
                                              <div className="flex items-center gap-2 flex-shrink-0">
                                                <Badge
                                                  variant="outline"
                                                  className={`text-xs ${t.activo ? 'border-green-600 bg-green-50 text-green-800' : 'border-slate-300 bg-slate-100 text-slate-700'}`}
                                                >
                                                  {t.activo ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                                {can('wellness_delivery.manage') && (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8"
                                                    onClick={() => {
                                                      setEditingDeliveryType(t);
                                                      setShowDeliveryTypeFormDialog(true);
                                                    }}
                                                  >
                                                    <Pencil className="h-4 w-4 mr-1" />
                                                    Editar
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 text-sm">
                                              <div className="flex justify-between gap-2">
                                                <span className="text-gray-500">Modo</span>
                                                <Badge variant="outline" className="text-xs w-fit">
                                                  {t.modo_acceso === 'abierto' ? 'Abierto' : 'Con listado'}
                                                </Badge>
                                              </div>
                                              <div className="flex justify-between gap-2">
                                                <span className="text-gray-500">Desde</span>
                                                <span className="text-gray-900">{format(parseLocalDate(t.fecha_desde), 'dd/MM/yyyy', { locale: es })}</span>
                                              </div>
                                              <div className="flex justify-between gap-2">
                                                <span className="text-gray-500">Hasta</span>
                                                <span className="text-gray-900">{format(parseLocalDate(t.fecha_hasta), 'dd/MM/yyyy', { locale: es })}</span>
                                              </div>
                                              <div className="flex justify-between gap-2">
                                                <span className="text-gray-500">Creado</span>
                                                <span className="text-gray-900 text-right">
                                                  {format(t.created_at && !String(t.created_at).includes('T') ? parseLocalDate(t.created_at) : new Date(t.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                                                  {t.created_by?.name && (
                                                    <span className="block text-xs text-gray-500">por {t.created_by.name}</span>
                                                  )}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        </>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Dialog de Detalles */}
        {selectedSolicitud && (
          <Dialog open={!!selectedSolicitud} onOpenChange={() => setSelectedSolicitud(null)}>
            <DialogContent className="max-sm:inset-x-4 sm:w-full sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
              <DialogTitle className="sr-only">
                Detalles de la Solicitud de Bienestar #{selectedSolicitud.id}
              </DialogTitle>
              <div className="bg-white min-h-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary-prosalud/10 p-2 rounded-lg flex-shrink-0">
                      <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-primary-prosalud" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                        Detalles de la Solicitud de Bienestar #{selectedSolicitud.id}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600">Información completa de la solicitud de bienestar</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Estado - Usando el mismo diseño que AdminSolicitudesPage */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                      Información de la Solicitud
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Estado Actual</label>
                        <p className="mt-1">
                          <Badge className={getStatusColor(selectedSolicitud.estado)}>
                            {getStatusLabel(selectedSolicitud.estado)}
                          </Badge>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">ID de Solicitud</label>
                        <p className="mt-1 text-sm text-gray-900">#{selectedSolicitud.id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Fecha de Creación</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(selectedSolicitud.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}{' '}
                          a las{' '}
                          {new Date(selectedSolicitud.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Última Actualización</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(selectedSolicitud.updated_at).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}{' '}
                          a las{' '}
                          {new Date(selectedSolicitud.updated_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Información de la Actividad */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                      Información de la Actividad
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nombre de la Actividad</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedSolicitud.nombreActividad || 'N/A'}
                      </p>
                    </div>
                    {selectedSolicitud.descripcionActividad && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Descripción</label>
                        <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                          {selectedSolicitud.descripcionActividad}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Centro de Costos y Sedes */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                      Centro de Costos y Sedes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Centro de Costos</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedSolicitud.centroCostos || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Sedes</label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {Array.isArray(selectedSolicitud.sedes) &&
                          selectedSolicitud.sedes.length > 0 ? (
                            selectedSolicitud.sedes.map((sede: string) => (
                              <Badge key={sede} variant="secondary" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {sede}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No especificadas</span>
                          )}
                        </div>
                      </div>
                      {selectedSolicitud.numeroParticipantes && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Número Estimado de Participantes
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {selectedSolicitud.numeroParticipantes}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Fecha y Horarios */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                      Fecha y Horarios
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Fecha Propuesta</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedSolicitud.fechaPropuesta
                            ? formatDateReadable(selectedSolicitud.fechaPropuesta)
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Hora Inicio</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {formatTime12Hour(selectedSolicitud.horaInicio)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Hora Fin</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {formatTime12Hour(selectedSolicitud.horaFin)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detalles/Souvenirs */}
                {selectedSolicitud.requiereDetalles && (
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6">
                      <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                        Detalles / Souvenirs
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      {Array.isArray(selectedSolicitud.detalles) &&
                      selectedSolicitud.detalles.length > 0 ? (
                        <div className="space-y-2">
                          {selectedSolicitud.detalles.map((detalle, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                            >
                              <span className="text-sm font-medium">{detalle.tipo}</span>
                              <Badge variant="outline">Cantidad: {detalle.cantidad}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No se especificaron detalles</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Información del Solicitante */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                      Información del Solicitante
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Nombre Completo</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedSolicitud.solicitante?.name || `ID: ${selectedSolicitud.solicitanteId}`}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedSolicitud.solicitante?.email || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">ID Solicitante</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedSolicitud.solicitanteId}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actividad Realizada */}
                {selectedSolicitud.actividad_realizada ? (
                  <Card className="border border-green-200 shadow-sm bg-green-50/30">
                    <CardHeader className="bg-green-50 border-b border-green-200">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          Actividad Realizada
                        </span>
                        {selectedSolicitud.actividad_realizada?.publicado_en_galeria === true && (
                          <Badge className="bg-green-600 text-white">
                            Publicado en Galería
                          </Badge>
                        )}
                        {selectedSolicitud.actividad_realizada?.publicado_en_galeria === false && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                            No publicado
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Fecha Realizada</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {selectedSolicitud.actividad_realizada.fecha_realizada
                              ? formatDateReadable(selectedSolicitud.actividad_realizada.fecha_realizada)
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Ubicación Real</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {selectedSolicitud.actividad_realizada.ubicacion_real || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Número de Asistentes</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {selectedSolicitud.actividad_realizada.numero_asistentes_real || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Evidencias</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {selectedSolicitud.actividad_realizada.evidencias?.length || 0} imágenes
                          </p>
                        </div>
                      </div>
                      {selectedSolicitud.actividad_realizada.descripcion_realizada && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Descripción</label>
                          <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                            {selectedSolicitud.actividad_realizada.descripcion_realizada}
                          </p>
                        </div>
                      )}
                      {selectedSolicitud.actividad_realizada.listado_asistencia && (
                        <div className="border-t border-gray-200 pt-4">
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Listado de Asistencia</label>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              {selectedSolicitud.actividad_realizada.listado_asistencia.file_url ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(selectedSolicitud.actividad_realizada!.listado_asistencia!.file_url, '_blank')}
                                  className="mt-2"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Abrir archivo en nueva pestaña
                                </Button>
                              ) : (
                                <p className="text-xs text-gray-500 mt-1">
                                  Archivo no disponible
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50 border-b border-gray-200">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Actividad Realizada
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      <p className="text-sm text-gray-500 mb-4">
                        Aún no se ha registrado información de la actividad realizada.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Botones de Acción */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 flex-wrap">
                  {canEditSolicitud(selectedSolicitud) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedSolicitud(null);
                        handleEdit(selectedSolicitud);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                  {selectedSolicitud.estado === 'resolved' && 
                   !selectedSolicitud.actividad_realizada && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedSolicitud(null);
                        handleAddActivityRealized(selectedSolicitud);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Actividad Realizada
                    </Button>
                  )}
                  {selectedSolicitud.actividad_realizada && 
                   (selectedSolicitud.actividad_realizada.publicado_en_galeria === null || 
                    selectedSolicitud.actividad_realizada.publicado_en_galeria === undefined) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedSolicitud(null);
                        handleReviewActivity(selectedSolicitud);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Revisar y Publicar
                    </Button>
                  )}
                  {selectedSolicitud.estado !== 'resolved' && (
                    <Button
                      onClick={() => {
                        setSelectedSolicitud(null);
                        handleOpenStatusDialog(selectedSolicitud);
                      }}
                      className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Cambiar Estado
                    </Button>
                  )}
                </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog de Cambio de Estado */}
        {responseDialogOpen && solicitudToRespond && (
          <Dialog open={responseDialogOpen} onOpenChange={handleCloseStatusDialog}>
            <DialogContent className="max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>Cambiar Estado de la Solicitud Bienestar #{solicitudToRespond.id}</DialogTitle>
                <DialogDescription>
                  Seleccione el nuevo estado para la solicitud de bienestar.
                </DialogDescription>
              </DialogHeader>

              <Form {...statusChangeForm}>
                <form onSubmit={statusChangeForm.handleSubmit(handleSubmitStatusChange)} className="space-y-4">
                  <FormField
                    control={statusChangeForm.control}
                    name="newStatus"
                    render={({ field }) => {
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case 'in_progress':
                            return 'border-blue-300 bg-blue-50';
                          case 'resolved':
                            return 'border-green-300 bg-green-50';
                          case 'rejected':
                            return 'border-red-300 bg-red-50';
                          default:
                            return '';
                        }
                      };

                      return (
                        <FormItem>
                          <FormLabel>Nuevo Estado</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={field.value ? getStatusColor(field.value) : ''}>
                                <SelectValue placeholder="Seleccione un estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem 
                              value="in_progress"
                              className="hover:bg-blue-50 focus:bg-blue-50 data-[highlighted]:bg-blue-50 hover:text-gray-900 focus:text-gray-900 data-[highlighted]:text-gray-900"
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                En Revisión
                              </span>
                            </SelectItem>
                            <SelectItem 
                              value="resolved"
                              className="hover:bg-green-50 focus:bg-green-50 data-[highlighted]:bg-green-50 hover:text-gray-900 focus:text-gray-900 data-[highlighted]:text-gray-900"
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Aprobada
                              </span>
                            </SelectItem>
                            <SelectItem 
                              value="rejected"
                              className="hover:bg-red-50 focus:bg-red-50 data-[highlighted]:bg-red-50 hover:text-gray-900 focus:text-gray-900 data-[highlighted]:text-gray-900"
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                Rechazada
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                      );
                    }}
                  />

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseStatusDialog}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmittingResponse || updateStatusMutation.isPending}
                      className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                    >
                      {isSubmittingResponse || updateStatusMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Actualizando...
                        </>
                      ) : (
                        <>
                          Actualizar Estado
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}

        {/* Formulario de Creación/Edición */}
        <WellnessRequestForm
          open={showCreateForm}
          onClose={() => {
            setShowCreateForm(false);
            setEditingSolicitud(null);
          }}
          solicitud={editingSolicitud}
          canUpdateStatus={can('wellness_requests.update_status')}
          onSuccess={async () => {
            // Invalidar queries y refetch para actualizar la vista
            await queryClient.invalidateQueries({ queryKey: ['wellness-requests'] });
            await refetch();
            setShowCreateForm(false);
            setEditingSolicitud(null);
          }}
        />

        {/* Formulario de Actividad Realizada */}
        {solicitudForActivity && (
          <WellnessActivityRealizedForm
            open={showActivityRealizedForm}
            onClose={() => {
              setShowActivityRealizedForm(false);
              setSolicitudForActivity(null);
            }}
            solicitud={solicitudForActivity}
            actividadRealizada={solicitudForActivity.actividad_realizada || null}
            onSuccess={async () => {
              await queryClient.invalidateQueries({ queryKey: ['wellness-requests'] });
              await refetch();
              setShowActivityRealizedForm(false);
              setSolicitudForActivity(null);
            }}
          />
        )}

        {/* Diálogo de Revisión y Publicación */}
        {solicitudForReview && solicitudForReview.actividad_realizada && (
          <WellnessActivityReviewDialog
            open={showActivityReviewDialog}
            onClose={() => {
              setShowActivityReviewDialog(false);
              setSolicitudForReview(null);
            }}
            solicitud={solicitudForReview}
            actividadRealizada={solicitudForReview.actividad_realizada!}
            onSuccess={async () => {
              await queryClient.invalidateQueries({ queryKey: ['wellness-requests'] });
              await queryClient.invalidateQueries({ queryKey: ['bienestar-events'] });
              await refetch();
              setShowActivityReviewDialog(false);
              setSolicitudForReview(null);
            }}
          />
        )}

        {/* Diálogo de Exportación de Reporte de Solicitudes */}
        <ExportWellnessReportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
        />

        {/* Diálogo de Exportación de Reporte de Entregas */}
        <ExportWellnessDeliveryReportDialog
          open={showExportDeliveryDialog}
          onOpenChange={setShowExportDeliveryDialog}
          availableEstados={uniqueEstadosOptions}
          availableTipos={uniqueTiposOptions}
        />

        {/* Modal de Detalles de Entrega */}
        <Dialog open={showDeliveryDetailModal} onOpenChange={setShowDeliveryDetailModal}>
          <DialogContent className="max-sm:inset-x-4 max-sm:max-w-[calc(100vw-2rem)] sm:w-full sm:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
            <DialogTitle className="sr-only">
              Detalles de la Solicitud de Entrega #{selectedDeliveryRequest?.id}
            </DialogTitle>
            <div className="bg-white min-h-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary-prosalud/10 p-2 rounded-lg flex-shrink-0">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary-prosalud" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                      Detalles de la Solicitud de Entrega #{selectedDeliveryRequest?.id}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600">Información completa de la solicitud de entrega de bienestar</p>
                  </div>
                </div>
                {selectedDeliveryRequest && can('wellness_delivery.manage') && selectedDeliveryRequest.estado !== 'entregado' && selectedDeliveryRequest.estado !== 'cancelado' && (
                  <Button
                    onClick={() => {
                      handleOpenDeliveryStatusDialog(selectedDeliveryRequest);
                      setShowDeliveryDetailModal(false);
                    }}
                    className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Cambiar Estado
                  </Button>
                )}
              </div>

              {selectedDeliveryRequest && (
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {/* Información de la Solicitud */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6">
                      <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                        Información de la Solicitud
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Tipo de Entrega</label>
                          <p className="mt-1 text-sm text-gray-900">
{selectedDeliveryRequest.tipo_entrega_text ||
                             (selectedDeliveryRequest.tipo_entrega === 'kit_escolar' ? 'Kit escolar' : selectedDeliveryRequest.tipo_entrega)}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Estado</label>
                          <p className="mt-1">
                            <Badge className={
                              selectedDeliveryRequest.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                              selectedDeliveryRequest.estado === 'procesado' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              selectedDeliveryRequest.estado === 'entregado' ? 'bg-green-100 text-green-800 border border-green-300' :
                              selectedDeliveryRequest.estado === 'cancelado' ? 'bg-red-100 text-red-800 border border-red-300' :
                              'bg-gray-100 text-gray-800 border border-gray-300'
                            }>
                              {selectedDeliveryRequest.estado_text || 
                               (selectedDeliveryRequest.estado === 'pendiente' ? 'Pendiente' :
                                selectedDeliveryRequest.estado === 'procesado' ? 'Procesado' :
                                selectedDeliveryRequest.estado === 'entregado' ? 'Entregado' :
                                selectedDeliveryRequest.estado === 'cancelado' ? 'Cancelado' : selectedDeliveryRequest.estado)}
                            </Badge>
                          </p>
                        </div>
                        {selectedDeliveryRequest.hospital && (
                            <div>
                              <label className="text-sm font-medium text-gray-700">Hospital</label>
                              <p className="mt-1 text-sm text-gray-900">{selectedDeliveryRequest.hospital}</p>
                            </div>
                        )}
                        {selectedDeliveryRequest.cantidad_entregada !== undefined && selectedDeliveryRequest.cantidad_entregada !== null && (
                          <div>
                            <label className="text-sm font-medium text-gray-700">Cantidad Entregada</label>
                            <p className="mt-1 text-sm text-gray-900 font-semibold">
                              {selectedDeliveryRequest.cantidad_entregada}
                            </p>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium text-gray-700">Fecha de Creación</label>
                          <p className="mt-1 text-sm text-gray-900">{formatDeliveryDate(selectedDeliveryRequest.created_at)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Última Actualización</label>
                          <p className="mt-1 text-sm text-gray-900">{formatDeliveryDate(selectedDeliveryRequest.updated_at)}</p>
                        </div>
                        {selectedDeliveryRequest.ip_address && (
                          <div>
                            <label className="text-sm font-medium text-gray-700">Dirección IP</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedDeliveryRequest.ip_address}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Información del Afiliado */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6">
                      <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                        Información del Afiliado
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Nombre Completo</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDeliveryRequest.nombre_afiliado}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Documento</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDeliveryRequest.documento_afiliado}</p>
                        </div>
                        {selectedDeliveryRequest.fecha_expedicion && (
                          <div>
                            <label className="text-sm font-medium text-gray-700">Fecha de Expedición del Documento</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedDeliveryRequest.fecha_expedicion}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Beneficiarios */}
                  {selectedDeliveryRequest.beneficiarios && selectedDeliveryRequest.beneficiarios.length > 0 && (
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Beneficiarios
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedDeliveryRequest.beneficiarios.map((beneficiario, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-sm font-medium text-gray-900">
                                {beneficiario.beneficiario}
                              </p>
                              {(beneficiario.parentesco || beneficiario.edad) && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {beneficiario.parentesco && (
                                    <Badge variant="outline" className="text-xs">
                                      {parseParentesco(beneficiario.parentesco)}
                                    </Badge>
                                  )}
                                  {beneficiario.edad && (
                                    <Badge variant="outline" className="text-xs">
                                      Edad: {beneficiario.edad} años
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Firmas Digitales */}
                  {(selectedDeliveryRequest.firma || selectedDeliveryRequest.firma_recibido) && (
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Signature className="h-5 w-5" />
                          Firmas Digitales
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          {/* Firma Digital del Afiliado */}
                          {selectedDeliveryRequest.firma && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Firma de solicitud</h4>
                              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border-2 border-gray-200 flex justify-center items-center" style={{ minHeight: '250px' }}>
                                <img
                                  src={selectedDeliveryRequest.firma}
                                  alt="Firma del afiliado"
                                  className="max-w-full h-auto rounded shadow-sm"
                                  style={{ maxHeight: '250px' }}
                                />
                              </div>
                              {selectedDeliveryRequest.tipo_firma_text && (
                                <p className="text-xs text-gray-600 mt-3 text-center">
                                  Tipo: {selectedDeliveryRequest.tipo_firma_text}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Firma de Recibido */}
                          {selectedDeliveryRequest.firma_recibido && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Firma de recibido</h4>
                              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border-2 border-gray-200 flex justify-center items-center" style={{ minHeight: '250px' }}>
                                <img
                                  src={selectedDeliveryRequest.firma_recibido}
                                  alt="Firma de recibido"
                                  className="max-w-full h-auto rounded shadow-sm"
                                  style={{ maxHeight: '250px' }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Observaciones */}
                  {selectedDeliveryRequest.observaciones && (
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                          Observaciones
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                        <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
                          {selectedDeliveryRequest.observaciones}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Información del Usuario que Realizó la Entrega/Cancelación */}
                  {selectedDeliveryRequest.entregado_por && 
                   (selectedDeliveryRequest.estado === 'entregado' || selectedDeliveryRequest.estado === 'cancelado') && (
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          {selectedDeliveryRequest.estado === 'entregado' 
                            ? 'Entregado por' 
                            : 'Cancelado por'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Nombre</label>
                            <p className="mt-1 text-sm text-gray-900">
                              {selectedDeliveryRequest.entregado_por.name}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Correo electrónico</label>
                            <p className="mt-1 text-sm text-gray-900">
                              {selectedDeliveryRequest.entregado_por.email}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Drawer de Cambio de Estado de Entrega */}
        {deliveryRequestToUpdate && (
          <Drawer 
            open={showDeliveryStatusDialog} 
            onOpenChange={(open) => {
              // Solo permitir cerrar con el botón Cancelar, no arrastrando
              if (!open) {
                handleCloseDeliveryStatusDialog();
              }
            }}
            dismissible={false}
          >
            <DrawerContent className={`${isMobile ? 'h-[95vh]' : 'h-[75vh]'} border-t border-slate-200 bg-white px-4 sm:px-6 flex flex-col overflow-hidden`}>
              <DrawerHeader className="pb-2 flex-shrink-0">
                <DrawerTitle className="text-lg sm:text-xl font-semibold text-slate-800">
                  Cambiar Estado de la Solicitud #{deliveryRequestToUpdate.id}
                </DrawerTitle>
                <DrawerDescription className="text-xs sm:text-sm text-slate-500">
                  Actualiza el estado de la solicitud de entrega de bienestar
                </DrawerDescription>
              </DrawerHeader>

              <Form {...deliveryStatusChangeForm}>
                <form onSubmit={deliveryStatusChangeForm.handleSubmit(handleSubmitDeliveryStatusChange)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-5 pr-2">
                  {/* Grid responsive: 1 columna en portrait, 2 columnas en landscape cuando hay espacio */}
                  <div className={`grid grid-cols-1 gap-4 sm:gap-5 ${currentOrientation === 'landscape' ? 'sm:grid-cols-2' : ''}`}>
                    <FormField
                      control={deliveryStatusChangeForm.control}
                      name="estado"
                      render={({ field }) => {
                        const getEstadoColor = (estado: string) => {
                          switch (estado) {
                            case 'pendiente':
                              return 'border-yellow-300 bg-yellow-50';
                            case 'procesado':
                              return 'border-blue-300 bg-blue-50';
                            case 'entregado':
                              return 'border-green-300 bg-green-50';
                            case 'cancelado':
                              return 'border-red-300 bg-red-50';
                            default:
                              return '';
                          }
                        };

                        return (
                          <FormItem className="w-full">
                            <FormLabel className="text-base sm:text-lg font-semibold text-gray-900">
                              Nuevo Estado
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className={`w-full max-w-full ${field.value ? getEstadoColor(field.value) : ''}`}>
                                  <SelectValue placeholder="Seleccione un estado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem 
                                  value="entregado"
                                  className="hover:bg-green-50 focus:bg-green-50 data-[highlighted]:bg-green-50 hover:text-gray-900 focus:text-gray-900 data-[highlighted]:text-gray-900"
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Entregado
                                  </span>
                                </SelectItem>
                                <SelectItem 
                                  value="cancelado"
                                  className="hover:bg-red-50 focus:bg-red-50 data-[highlighted]:bg-red-50 hover:text-gray-900 focus:text-gray-900 data-[highlighted]:text-gray-900"
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Cancelado
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* Campo de Cantidad Entregada - Solo cuando el estado es "entregado"
                        Ahora es solo de referencia visual (no editable) y muestra el valor
                        que el frontend prellena automáticamente. */}
                    {selectedEstado === 'entregado' && (
                      <FormField
                        control={deliveryStatusChangeForm.control}
                        name="cantidad_entregada"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base sm:text-lg font-semibold text-gray-900">
                              Cantidad Entregada
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                value={field.value ?? ''}
                                readOnly
                                disabled
                                className="text-base bg-gray-100 cursor-not-allowed text-black font-semibold"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Campo de Firma - Solo cuando el estado es "entregado" */}
                  {selectedEstado === 'entregado' && (
                    <FormField
                      control={deliveryStatusChangeForm.control}
                      name="firma_recibido"
                      render={({ field }) => (
                        <FormItem className="flex-shrink-0">
                          <FormLabel className="text-base sm:text-lg font-semibold text-gray-900">
                            Firma de Recibido <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-3 w-full">
                              {isMobile ? (
                                // En móviles: mostrar botón para abrir drawer de firma
                                <>
                                  <Button
                                    type="button"
                                    variant={deliverySignature ? "default" : "default"}
                                    onClick={() => setShowSignatureDrawer(true)}
                                    className={`w-full h-12 text-base ${
                                      deliverySignature 
                                        ? 'bg-green-600 hover:bg-green-700 text-white border-2 border-green-700' 
                                        : 'bg-primary-prosalud hover:bg-primary-prosalud-dark text-white'
                                    }`}
                                  >
                                    {deliverySignature ? (
                                      <>
                                        <CheckCircle2 className="h-5 w-5 mr-2" />
                                        Firma capturada - Toca para ver/editar
                                      </>
                                    ) : (
                                      <>
                                        <Signature className="h-5 w-5 mr-2" />
                                        Capturar Firma
                                      </>
                                    )}
                                  </Button>
                                  {deliverySignature && (
                                    <div className="mt-2 text-xs text-slate-500 text-center">
                                      <p>Firma registrada correctamente</p>
                                    </div>
                                  )}
                                  {canRotate && currentOrientation === 'portrait' && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 bg-blue-50 p-2 rounded">
                                      <RotateCw className="h-4 w-4" />
                                      <span>Puedes rotar tu dispositivo horizontalmente para más espacio</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                // En desktop: mostrar SignaturePad directamente
                                <>
                                  <div className="relative w-full border-2 border-gray-300 rounded-lg bg-white overflow-hidden">
                                    <div className="[&>div>div:last-child]:!hidden w-full">
                                      <SignaturePad
                                        ref={deliverySignaturePadRef}
                                        onChange={(dataUrl) => {
                                          handleDeliverySignatureChange(dataUrl);
                                          field.onChange(dataUrl || undefined);
                                        }}
                                        height={240}
                                      />
                                    </div>
                                    {!deliverySignature && (
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-2">
                                        <p className="text-sm text-slate-400 italic text-center">
                                          Firma aquí con el mouse o tu dedo
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (deliverySignaturePadRef.current) {
                                          deliverySignaturePadRef.current.clear();
                                        }
                                        setDeliverySignature(null);
                                        setShowDeliverySignatureError(false);
                                        field.onChange(undefined);
                                      }}
                                      className="text-sm text-slate-600 hover:text-slate-900 underline"
                                    >
                                      Limpiar firma
                                    </button>
                                  </div>
                                </>
                              )}
                              {showDeliverySignatureError && (
                                <Alert variant="destructive" className="py-2">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription className="text-sm font-medium">
                                    La firma de recibido es obligatoria cuando el estado es "entregado".
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  </div>

                  <DrawerFooter className="flex flex-col-reverse gap-2 pb-4 sm:pb-6 sm:flex-row sm:justify-end sm:gap-3 px-0 flex-shrink-0 border-t pt-4 mt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCloseDeliveryStatusDialog}
                      className="sm:w-40"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmittingDeliveryStatus || updateDeliveryStatusMutation.isPending}
                      className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white sm:w-48"
                    >
                      {isSubmittingDeliveryStatus || updateDeliveryStatusMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Actualizando...
                        </>
                      ) : (
                        <>
                          Actualizar Estado
                        </>
                      )}
                    </Button>
                  </DrawerFooter>
                </form>
              </Form>
            </DrawerContent>
          </Drawer>
        )}

        {/* Drawer de Firma en Móviles */}
        {isMobile && selectedEstado === 'entregado' && (
          <Drawer
            open={showSignatureDrawer}
            onOpenChange={(open) => {
              // Solo permitir cerrar con los botones, no arrastrando
              // Esto evita que se cierre accidentalmente al firmar
              if (!open) {
                return; // No cerrar si se intenta arrastrar
              }
            }}
            dismissible={false}
          >
            <DrawerContent className="h-[95vh] border-t border-slate-200 bg-white px-4 sm:px-6 flex flex-col overflow-hidden">
              <DrawerHeader className="pb-3 flex-shrink-0">
                <DrawerTitle className="text-lg sm:text-xl font-semibold text-slate-800">
                  Firma de Recibido
                </DrawerTitle>
                <DrawerDescription className="text-xs sm:text-sm text-slate-500">
                  {deliverySignature 
                    ? 'Revisa o modifica tu firma para confirmar la entrega' 
                    : 'Firma en el recuadro para confirmar la entrega'}
                </DrawerDescription>
              </DrawerHeader>

              {/* Mensaje de orientación si está disponible */}
              {canRotate && currentOrientation === 'portrait' && (
                <div className="mb-3 flex-shrink-0">
                  <Alert className="bg-blue-50 border-blue-200">
                    <RotateCw className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-blue-800">
                      Para más espacio, puedes rotar tu dispositivo horizontalmente
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Canvas de firma - altura calculada para que quepan los botones */}
              <div className="flex-1 flex flex-col min-h-0 mb-4">
                <div className="relative w-full border-2 border-gray-300 rounded-lg bg-white overflow-hidden" style={{ height: `${signaturePadHeight}px` }}>
                  <div className="[&>div>div:last-child]:!hidden w-full h-full">
                    <SignaturePad
                      ref={deliverySignaturePadRef}
                      onChange={(dataUrl) => {
                        handleDeliverySignatureChange(dataUrl);
                        deliveryStatusChangeForm.setValue('firma_recibido', dataUrl || undefined);
                      }}
                      height={signaturePadHeight}
                      initialValue={deliverySignature ?? undefined}
                    />
                  </div>
                  {!deliverySignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-4">
                      <p className="text-sm sm:text-base text-slate-400 italic text-center">
                        Firma aquí con tu dedo
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción - siempre visibles */}
              <div className="flex flex-col gap-2 pb-4 flex-shrink-0 border-t pt-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (deliverySignaturePadRef.current) {
                        deliverySignaturePadRef.current.clear();
                      }
                      setDeliverySignature(null);
                      setShowDeliverySignatureError(false);
                      deliveryStatusChangeForm.setValue('firma_recibido', undefined);
                    }}
                    className="flex-1 h-11 text-base"
                  >
                    <Eraser className="h-4 w-4 mr-2" />
                    Limpiar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (deliverySignature) {
                        setShowSignatureDrawer(false);
                        unlockOrientation();
                      } else {
                        setShowDeliverySignatureError(true);
                      }
                    }}
                    className="flex-1 h-11 text-base bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirmar Firma
                  </Button>
                </div>
                {showDeliverySignatureError && !deliverySignature && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm font-medium">
                      Debes capturar una firma antes de continuar
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        )}

        {/* Modal de Gestión de Archivo Excel */}
        <Dialog open={showFileManagerModal} onOpenChange={setShowFileManagerModal}>
          <DialogContent className="max-sm:inset-x-4 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-[90vw] sm:max-w-[90vw] max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Gestión de Archivo Excel
              </DialogTitle>
              <DialogDescription>
                Gestiona el archivo Excel utilizado para autenticar afiliados en las solicitudes de entregas de bienestar
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <WellnessDeliveryFileManager />
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog crear/editar tipo de entrega (campaña) */}
        <WellnessDeliveryTypeFormDialog
          open={showDeliveryTypeFormDialog}
          onOpenChange={setShowDeliveryTypeFormDialog}
          type={editingDeliveryType}
          onSubmit={handleSaveDeliveryType}
          isSubmitting={saveDeliveryTypeMutation.isPending}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminSolicitudBienestarPage;

