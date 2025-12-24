
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, GraduationCap, Heart, BarChart3, Settings, Upload, Download, CheckCircle2,
  ClipboardList, Package, AlertCircle, ArrowRight, Clock, Loader2, TrendingUp, Activity,
  FileText, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import UserFormModal from '@/components/admin/usuarios/UserFormModal';
import { useNavigate } from 'react-router-dom';

import { adminExcelFilesService, type AdminExcelFileType, type AdminExcelFileInfo } from '@/services/adminExcelFilesService';
import { usersApi } from '@/services/adminApi';
import { requestsService } from '@/services/requestsServiceApi';
import { wellnessRequestsService } from '@/services/wellnessRequestsApi';
import { getWellnessEvents } from '@/services/wellnessEventsApi';
import { comfenalcoEventsApi } from '@/services/comfenalcoEventsApi';
import { inventoryApiService } from '@/services/inventoryApiService';
import { sstAdminService } from '@/services/sstAdminService';
import type { SstDeliveryRecord } from '@/types/adminSst';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { FILE_PERMISSIONS } from '@/config/permissions';
import { logger } from '@/utils/logger';

type DashboardUploadType = Extract<AdminExcelFileType, 'afiliados' | 'incapacidades' | 'liquidaciones' | 'compensaciones'>;

interface DashboardUploadConfig {
  buttonLabel: string;
  uploadingLabel: string;
  dialogTitle: string;
  description: string;
  resourceLabel: string;
  storageName: string;
  maxSizeMB: number;
  successFallback: string;
  errorFallback: string;
  additionalNote?: string;
}

const dashboardUploadConfigs: Record<DashboardUploadType, DashboardUploadConfig> = {
  afiliados: {
    buttonLabel: 'Actualizar afiliados',
    uploadingLabel: 'Cargando afiliados...',
    dialogTitle: 'Confirmar actualización de afiliados',
    description:
      'Estás a punto de reemplazar el archivo maestro de afiliados. Esta acción sobrescribe el archivo anterior, no mantiene historial y los cambios se reflejan inmediatamente en la plataforma.',
    resourceLabel: 'afiliados',
    storageName: 'PROSANET_INFORMACION_AFILIADOS.xlsx',
    maxSizeMB: 20,
    successFallback: 'Archivo de afiliados actualizado exitosamente.',
    errorFallback: 'No fue posible actualizar el archivo de afiliados.',
    additionalNote: 'La cache de afiliados se limpiará automáticamente después de la carga.',
  },
  incapacidades: {
    buttonLabel: 'Actualizar incapacidades',
    uploadingLabel: 'Cargando incapacidades...',
    dialogTitle: 'Confirmar actualización de incapacidades',
    description:
      'Se reemplazará el archivo de relación de incapacidades. Asegúrate de que el archivo corresponda a la versión oficial antes de continuar.',
    resourceLabel: 'incapacidades',
    storageName: 'RELACION_INCAPACIDADES.xlsx',
    maxSizeMB: 5,
    successFallback: 'Archivo de incapacidades actualizado exitosamente.',
    errorFallback: 'No fue posible actualizar el archivo de incapacidades.',
  },
  liquidaciones: {
    buttonLabel: 'Actualizar liquidaciones pendientes',
    uploadingLabel: 'Cargando liquidaciones...',
    dialogTitle: 'Confirmar actualización de liquidaciones pendientes',
    description:
      'Se sustituirá el archivo de liquidaciones pendientes. Verifica que la estructura coincida con la plantilla esperada antes de subirlo.',
    resourceLabel: 'liquidaciones',
    storageName: 'LIQUIDACIONES_PENDIENTES.xlsx',
    maxSizeMB: 5,
    successFallback: 'Archivo de liquidaciones actualizado exitosamente.',
    errorFallback: 'No fue posible actualizar el archivo de liquidaciones.',
  },
  compensaciones: {
    buttonLabel: 'Actualizar compensaciones de afiliados activos',
    uploadingLabel: 'Cargando compensaciones...',
    dialogTitle: 'Confirmar actualización de compensaciones de afiliados activos',
    description:
      'Se reemplazará el archivo de compensaciones de afiliados activos. El archivo debe contener una hoja llamada "DINAMICA" con las columnas: Documento, T. Basicos, T. Auxilios, T. Ingresos. Se creará un respaldo automático del archivo anterior.',
    resourceLabel: 'compensaciones',
    storageName: 'COMPENSACIONES_AFILIADOS_ACTIVOS.xlsx',
    maxSizeMB: 10,
    successFallback: 'Archivo de compensaciones actualizado exitosamente.',
    errorFallback: 'No fue posible actualizar el archivo de compensaciones.',
  },
};

// Función para obtener la etiqueta del tipo de solicitud
const getRequestTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    "certificado-convenio": "Certificado de Convenio",
    "compensacion-anual": "Compensación Anual Diferida",
    "verificacion-pagos": "Verificación de Pagos",
    "compensacion-descanso": "Compensación por Descanso",
    "descanso-laboral": "Compensación por Descanso", // Tipo del frontend mapeado desde backend
    "actualizar-datos-personales": "Actualizar Datos Personales",
    "solicitud-microcredito": "Solicitud de Microcrédito",
    "solicitud-retiro-sindical": "Solicitud de Retiro Sindical",
    "retiro-sindical": "Retiro Sindical",
    "microcredito": "Solicitud de Microcrédito",
    "incapacidad-licencia": "Incapacidades y Licencias",
    "permisos-cambio-turnos": "Permisos y Cambio de Turnos",
    "incapacidades-licencias": "Incapacidades y Licencias",
    "permisos-turnos": "Permisos y Cambio de Turnos",
    "solicitud-bienestar": "Solicitud de Bienestar",
  };
  return labels[type] || type;
};

const AdminDashboard: React.FC = () => {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUploadConfirmDialog, setShowUploadConfirmDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [uploadContext, setUploadContext] = useState<DashboardUploadType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingType, setUploadingType] = useState<AdminExcelFileType | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasProcessedUploadParam = useRef(false);
  const [compensacionesFileInfo, setCompensacionesFileInfo] = useState<AdminExcelFileInfo | null>(null);
  const [isLoadingFileInfo, setIsLoadingFileInfo] = useState(false);
  const [isDownloadingFile, setIsDownloadingFile] = useState(false);
  const [isCompensacionesCardExpanded, setIsCompensacionesCardExpanded] = useState(true);

  const handleUploadButtonClick = (type: DashboardUploadType) => {
    if (isUploading) return;

    if (selectedFileUrl) {
      URL.revokeObjectURL(selectedFileUrl);
      setSelectedFileUrl(null);
    }
    setSelectedFile(null);
    setUploadContext(type);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    fileInputRef.current?.click();
  };

  // Verificar si hay un parámetro de URL para abrir el diálogo de carga
  useEffect(() => {
    const uploadParam = searchParams.get('upload');
    
    // Solo procesar si hay parámetro, tenemos permisos, no estamos subiendo, y no lo hemos procesado ya
    if (uploadParam === 'afiliados' && can(FILE_PERMISSIONS.afiliados) && !isUploading && !hasProcessedUploadParam.current) {
      // Marcar como procesado INMEDIATAMENTE para evitar ejecuciones múltiples
      hasProcessedUploadParam.current = true;
      
      // Remover el parámetro de la URL primero
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('upload');
      setSearchParams(newSearchParams, { replace: true });
      
      // Abrir el diálogo de carga después de un pequeño delay
      // Usar una función que no dependa del estado para evitar re-ejecuciones
      const timer = setTimeout(() => {
        if (fileInputRef.current && !isUploading) {
          setUploadContext('afiliados');
          fileInputRef.current.value = '';
          fileInputRef.current.click();
        }
      }, 300);
      
      return () => {
        clearTimeout(timer);
      };
    }
    
    // Resetear el flag cuando el parámetro ya no está presente y no estamos en proceso de carga
    if (!searchParams.get('upload') && !isUploading && uploadContext !== 'afiliados') {
      hasProcessedUploadParam.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, can, isUploading, uploadContext]);
  
  // Fetch real data from various modules
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['dashboard-users'],
    queryFn: () => usersApi.getUsers(1, 1000, '', ''),
    enabled: can('users.view'),
    retry: false,
    retryOnMount: false,
  });

  const { data: requestsStats, isLoading: loadingRequests } = useQuery({
    queryKey: ['dashboard-requests-stats'],
    queryFn: () => requestsService.getRequestStats(),
    enabled: can('requests.view'),
    retry: false,
    retryOnMount: false,
  });

  const { data: allRequests, isLoading: loadingAllRequests } = useQuery({
    queryKey: ['dashboard-all-requests'],
    queryFn: () => requestsService.getRequests(),
    enabled: can('requests.view'),
    retry: false,
    retryOnMount: false,
  });

  const { data: wellnessRequestsData, isLoading: loadingWellnessRequests } = useQuery({
    queryKey: ['dashboard-wellness-requests'],
    queryFn: () => wellnessRequestsService.getAllWellnessRequests({ per_page: 1000 }),
    enabled: can('wellness_requests.view'),
    retry: false,
    retryOnMount: false,
  });

  const { data: wellnessEvents, isLoading: loadingWellnessEvents } = useQuery({
    queryKey: ['dashboard-wellness-events'],
    queryFn: () => getWellnessEvents(),
    enabled: can('wellness_events.view'),
    retry: false,
    retryOnMount: false,
  });

  const { data: comfenalcoEvents, isLoading: loadingComfenalcoEvents } = useQuery({
    queryKey: ['dashboard-comfenalco-events'],
    queryFn: () => comfenalcoEventsApi.getEvents(),
    enabled: can('comfenalco_events.view'),
    retry: false,
    retryOnMount: false,
  });

  const { data: inventoryDashboard, isLoading: loadingInventory } = useQuery({
    queryKey: ['dashboard-inventory'],
    queryFn: () => inventoryApiService.getDashboard(),
    enabled: can('inventory.view_dashboard') || can('inventory.products.view') || can('hospital_requests.view'),
    retry: false,
    retryOnMount: false,
  });

  const { data: deliveriesData, isLoading: loadingDeliveries } = useQuery({
    queryKey: ['dashboard-deliveries'],
    queryFn: async () => {
      const result = await sstAdminService.getDeliveryHistory({ page: 1, pageSize: 5 });
      console.log('📦 Deliveries Data from API:', result);
      console.log('📦 Deliveries Items:', result?.items);
      if (result?.items && result.items.length > 0) {
        console.log('📦 First Delivery Item:', result.items[0]);
        console.log('📦 First Delivery Keys:', Object.keys(result.items[0]));
      }
      return result;
    },
    enabled: can('dotacion.view'),
    retry: false,
    retryOnMount: false,
  });

  // Calculate metrics based on real data
  const metrics = useMemo(() => {
    const activeUsers = usersData?.data.filter(u => u.isActive).length || 0;
    const totalUsers = usersData?.total || 0;
    
    const pendingRequests = requestsStats?.pending || 0;
    const inProgressRequests = requestsStats?.in_progress || 0;
    const resolvedRequests = requestsStats?.resolved || 0;
    const rejectedRequests = requestsStats?.rejected || 0;
    const totalRequests = requestsStats?.total || 0;
    const thisMonthRequests = requestsStats?.this_month || 0;

    const pendingWellnessRequests = wellnessRequestsData?.data.filter(r => r.estado === 'pending').length || 0;
    const inProgressWellnessRequests = wellnessRequestsData?.data.filter(r => r.estado === 'in_progress').length || 0;
    const resolvedWellnessRequests = wellnessRequestsData?.data.filter(r => r.estado === 'resolved').length || 0;
    const totalWellnessRequests = wellnessRequestsData?.pagination.total || 0;

    const visibleWellnessEvents = wellnessEvents?.filter(e => e.isVisible).length || 0;
    const totalWellnessEvents = wellnessEvents?.length || 0;

    const visibleComfenalcoEvents = comfenalcoEvents?.filter(e => e.is_visible).length || 0;
    const totalComfenalcoEvents = comfenalcoEvents?.length || 0;

    const inventoryRequests = inventoryDashboard?.requests_summary || {
      pending: 0,
      approved: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      rejected: 0,
    };
    const lowStockProducts = inventoryDashboard?.low_stock_products.length || 0;

    return {
      users: { active: activeUsers, total: totalUsers },
      requests: {
        pending: pendingRequests,
        inProgress: inProgressRequests,
        resolved: resolvedRequests,
        rejected: rejectedRequests,
        total: totalRequests,
        thisMonth: thisMonthRequests,
        avgResolutionTime: requestsStats?.avg_resolution_time || 0,
      },
      wellnessRequests: {
        pending: pendingWellnessRequests,
        inProgress: inProgressWellnessRequests,
        resolved: resolvedWellnessRequests,
        total: totalWellnessRequests,
      },
      wellnessEvents: {
        visible: visibleWellnessEvents,
        total: totalWellnessEvents,
      },
      comfenalcoEvents: {
        visible: visibleComfenalcoEvents,
        total: totalComfenalcoEvents,
      },
      inventory: {
        requests: inventoryRequests,
        lowStock: lowStockProducts,
      },
    };
  }, [
    usersData,
    requestsStats,
    wellnessRequestsData,
    wellnessEvents,
    comfenalcoEvents,
    inventoryDashboard,
  ]);

  // Calculate chart data
  const chartData = useMemo(() => {
    // Requests status distribution
    const requestsStatusData = can('requests.view') ? [
      { name: 'Pendientes', value: metrics.requests.pending, color: '#f59e0b' },
      { name: 'En Progreso', value: metrics.requests.inProgress, color: '#3b82f6' },
      { name: 'Resueltas', value: metrics.requests.resolved, color: '#10b981' },
      { name: 'Rechazadas', value: metrics.requests.rejected, color: '#ef4444' },
    ].filter(item => item.value > 0) : [];

    // Wellness requests status distribution
    const wellnessRequestsStatusData = can('wellness_requests.view') ? [
      { name: 'Pendientes', value: metrics.wellnessRequests.pending, color: '#f59e0b' },
      { name: 'En Progreso', value: metrics.wellnessRequests.inProgress, color: '#3b82f6' },
      { name: 'Resueltas', value: metrics.wellnessRequests.resolved, color: '#10b981' },
    ].filter(item => item.value > 0) : [];

    // Inventory requests status
    const inventoryStatusData = (can('inventory.view_dashboard') || can('hospital_requests.view')) ? [
      { name: 'Pendientes', value: metrics.inventory.requests.pending, color: '#f59e0b' },
      { name: 'Aprobadas', value: metrics.inventory.requests.approved, color: '#3b82f6' },
      { name: 'Preparando', value: metrics.inventory.requests.preparing, color: '#8b5cf6' },
      { name: 'Enviadas', value: metrics.inventory.requests.shipped, color: '#06b6d4' },
      { name: 'Entregadas', value: metrics.inventory.requests.delivered || 0, color: '#10b981' },
      { name: 'Rechazadas', value: metrics.inventory.requests.rejected || 0, color: '#ef4444' },
    ].filter(item => item.value > 0) : [];

    // Monthly trends (last 6 months) - Calculate from real data
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.toLocaleDateString('es-ES', { month: 'short' }),
        fullMonth: date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
      });
    }

    // Calculate monthly data from actual requests
    const monthlyRequestsData = months.map((m) => {
      let solicitudesCount = 0;
      let bienestarCount = 0;

      // Count requests by month from actual data
      if (allRequests && can('requests.view')) {
        solicitudesCount = allRequests.filter((req) => {
          const reqDate = new Date(req.created_at);
          return reqDate.getFullYear() === m.year && reqDate.getMonth() === m.monthIndex;
        }).length;
      }

      // Count wellness requests by month from actual data
      if (wellnessRequestsData?.data && can('wellness_requests.view')) {
        bienestarCount = wellnessRequestsData.data.filter((req) => {
          const reqDate = new Date(req.created_at);
          return reqDate.getFullYear() === m.year && reqDate.getMonth() === m.monthIndex;
        }).length;
      }

      return {
        month: m.month,
        solicitudes: solicitudesCount,
        bienestar: bienestarCount,
      };
    });

    return {
      requestsStatus: requestsStatusData,
      wellnessRequestsStatus: wellnessRequestsStatusData,
      inventoryStatus: inventoryStatusData,
      monthlyTrends: monthlyRequestsData,
    };
  }, [metrics, can, allRequests, wellnessRequestsData]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const resetFileInput = ({ preserveContext = false }: { preserveContext?: boolean } = {}) => {
    if (selectedFileUrl) {
      URL.revokeObjectURL(selectedFileUrl);
    }
    setSelectedFileUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSelectedFile(null);

    if (!preserveContext) {
      setUploadContext(null);
    }
  };

  const handleUploadDialogChange = (open: boolean) => {
    setShowUploadConfirmDialog(open);

    if (!open && !isUploading) {
      resetFileInput();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!uploadContext) {
      toast.error('Selecciona una acción de carga antes de elegir un archivo.');
      resetFileInput();
      return;
    }

    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    const allowedExtensions = ['.xlsx', '.xls'];
    if (!allowedExtensions.includes(extension)) {
      toast.error('Por favor selecciona un archivo Excel (.xlsx o .xls).');
      resetFileInput({ preserveContext: true });
      return;
    }

    const config = dashboardUploadConfigs[uploadContext];
    const maxSizeBytes = config.maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`El archivo supera el tamaño máximo permitido (${config.maxSizeMB} MB).`);
      resetFileInput({ preserveContext: true });
      return;
    }

    if (selectedFileUrl) {
      URL.revokeObjectURL(selectedFileUrl);
    }

    const fileUrl = URL.createObjectURL(file);
    setSelectedFileUrl(fileUrl);
    setSelectedFile(file);
    setShowUploadConfirmDialog(true);
  };

  const handleUploadCancel = () => {
    setShowUploadConfirmDialog(false);
    resetFileInput();
  };

  const handleUploadConfirm = async () => {
    if (!selectedFile || !uploadContext) return;

    const type = uploadContext;
    const config = dashboardUploadConfigs[type];

    setIsUploading(true);
    setUploadingType(type);
    setShowUploadConfirmDialog(false);

    try {
      const response = await adminExcelFilesService.uploadExcelFile(type, selectedFile);

      if (response.success) {
        toast.success(response.message || config.successFallback);
        // Refresh file info if it's compensaciones
        if (type === 'compensaciones') {
          await fetchCompensacionesFileInfo();
        }
      } else {
        toast.error(response.message || config.errorFallback);
      }
    } catch (error: any) {
      const backendMessage: string | undefined = error?.response?.data?.message;
      const statusCode: number | undefined = error?.response?.status;

      let errorMessage = backendMessage || config.errorFallback;

      if (statusCode === 422) {
        const lowerMessage = backendMessage?.toLowerCase() ?? '';
        if (lowerMessage.includes('formato')) {
          errorMessage = 'El archivo debe ser un Excel válido (.xlsx o .xls).';
        } else if (lowerMessage.includes('tamaño') || lowerMessage.includes('tamano') || lowerMessage.includes('size')) {
          errorMessage = `El archivo supera el tamaño máximo permitido (${config.maxSizeMB} MB).`;
        } else if (lowerMessage.includes('vacío') || lowerMessage.includes('vacio')) {
          errorMessage = 'El archivo Excel parece estar vacío.';
        } else {
          errorMessage = backendMessage || `El archivo de ${config.resourceLabel} no es válido.`;
        }
      } else if (statusCode === 500) {
        errorMessage = backendMessage || 'El servidor reportó un error al guardar el archivo.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadingType(null);
      resetFileInput();
    }
  };

  const fetchCompensacionesFileInfo = async () => {
    try {
      setIsLoadingFileInfo(true);
      const info = await adminExcelFilesService.getFileInfo('compensaciones');
      setCompensacionesFileInfo(info);
    } catch (error) {
      logger.error('Error al obtener información del archivo de compensaciones', error);
      toast.error('No fue posible obtener la información del archivo actual.');
    } finally {
      setIsLoadingFileInfo(false);
    }
  };

  const handleDownloadCompensacionesFile = async () => {
    if (isDownloadingFile) return;
    
    try {
      setIsDownloadingFile(true);
      const blob = await adminExcelFilesService.downloadFile('compensaciones');
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'COMPENSACIONES_AFILIADOS_ACTIVOS.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Archivo descargado exitosamente');
    } catch (error) {
      logger.error('Error al descargar archivo de compensaciones', error);
      toast.error('No fue posible descargar el archivo. Intenta nuevamente.');
    } finally {
      setIsDownloadingFile(false);
    }
  };

  // Fetch file info on mount if user has permission
  useEffect(() => {
    if (can(FILE_PERMISSIONS.compensaciones)) {
      fetchCompensacionesFileInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderUploadButton = (type: DashboardUploadType) => {
    const config = dashboardUploadConfigs[type];
    const isTypeLoading = isUploading && uploadingType === type;
    const isCompensaciones = type === 'compensaciones';

    return (
      <motion.button
        key={type}
        type="button"
        onClick={() => handleUploadButtonClick(type)}
        whileHover={{ scale: isUploading ? 1 : 1.02 }}
        whileTap={{ scale: isUploading ? 1 : 0.98 }}
        disabled={isUploading}
        className={`flex items-center space-x-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-300 border border-slate-200 disabled:opacity-60 disabled:cursor-not-allowed ${
          isCompensaciones ? 'justify-start' : ''
        }`}
      >
        <Upload className="h-8 w-8 text-primary-prosalud flex-shrink-0" />
        <span className={`font-medium text-text-dark ${isCompensaciones ? 'text-left' : ''}`}>
          {isTypeLoading ? config.uploadingLabel : config.buttonLabel}
        </span>
      </motion.button>
    );
  };

  const activeUploadConfig = uploadContext ? dashboardUploadConfigs[uploadContext] : null;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                      <BarChart3 className="h-8 w-8 text-primary-prosalud" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-primary-prosalud">
                        Panel Administrativo
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        Gestiona usuarios, contenidos y métricas de la plataforma ProSalud desde un solo lugar.
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Metrics Section - Moved before Quick Actions */}
          <motion.div variants={itemVariants}>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Métricas del Sistema</h2>
              <p className="text-sm text-gray-600">Resumen de actividad y estado de los módulos</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Users Metric */}
              {can('users.view') && (
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  className="cursor-pointer"
                  onClick={() => navigate('/admin/usuarios')}
                >
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 hover:shadow-lg transition-shadow h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4 min-h-[60px]">
                      <CardTitle className="text-xs font-medium text-blue-700 line-clamp-2 flex-1">
                        Usuarios Activos
                      </CardTitle>
                      <Users className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between px-4 pb-4 min-h-[80px]">
                      <div className="mt-auto">
                        <div className="text-2xl font-bold text-blue-900 mb-1">
                          {loadingUsers ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            metrics.users.active.toLocaleString()
                          )}
                        </div>
                        <p className="text-xs text-blue-600">
                          {loadingUsers ? 'Cargando...' : `de ${metrics.users.total.toLocaleString()} registrados`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Requests Metric */}
              {can('requests.view') && (
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  className="cursor-pointer"
                  onClick={() => navigate('/admin/solicitudes')}
                >
                  <Card className="bg-gradient-to-br from-orange-50 to-red-100 border-orange-200 hover:shadow-lg transition-shadow h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4 min-h-[60px]">
                      <CardTitle className="text-xs font-medium text-orange-700 line-clamp-2 flex-1">
                        Solicitudes Pendientes
                      </CardTitle>
                      <ClipboardList className="h-4 w-4 text-orange-600 flex-shrink-0 ml-2" />
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between px-4 pb-4 min-h-[80px]">
                      <div className="mt-auto">
                        <div className="text-2xl font-bold text-orange-900 mb-1">
                          {loadingRequests ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            metrics.requests.pending
                          )}
                        </div>
                        <p className="text-xs text-orange-600">
                          {loadingRequests ? 'Cargando...' : (
                            <>
                              {metrics.requests.total} total{metrics.requests.thisMonth > 0 && ` • ${metrics.requests.thisMonth} este mes`}
                            </>
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Wellness Requests Metric */}
              {can('wellness_requests.view') && (
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  className="cursor-pointer"
                  onClick={() => navigate('/admin/solicitudes-bienestar')}
                >
                  <Card className="bg-gradient-to-br from-pink-50 to-rose-100 border-pink-200 hover:shadow-lg transition-shadow h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4 min-h-[60px]">
                      <CardTitle className="text-xs font-medium text-pink-700 line-clamp-2 flex-1">
                        Solicitudes Bienestar Pendientes
                      </CardTitle>
                      <Heart className="h-4 w-4 text-pink-600 flex-shrink-0 ml-2" />
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between px-4 pb-4 min-h-[80px]">
                      <div className="mt-auto">
                        <div className="text-2xl font-bold text-pink-900 mb-1">
                          {loadingWellnessRequests ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            metrics.wellnessRequests.pending
                          )}
                        </div>
                        <p className="text-xs text-pink-600">
                          {loadingWellnessRequests ? 'Cargando...' : (
                            `${metrics.wellnessRequests.total} total`
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Wellness Events Metric */}
              {can('wellness_events.view') && (
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  className="cursor-pointer"
                  onClick={() => navigate('/admin/bienestar')}
                >
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 hover:shadow-lg transition-shadow h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4 min-h-[60px]">
                      <CardTitle className="text-xs font-medium text-green-700 line-clamp-2 flex-1">
                        Eventos Bienestar Visibles
                      </CardTitle>
                      <Heart className="h-4 w-4 text-green-600 flex-shrink-0 ml-2" />
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between px-4 pb-4 min-h-[80px]">
                      <div className="mt-auto">
                        <div className="text-2xl font-bold text-green-900 mb-1">
                          {loadingWellnessEvents ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            metrics.wellnessEvents.visible
                          )}
                        </div>
                        <p className="text-xs text-green-600">
                          {loadingWellnessEvents ? 'Cargando...' : (
                            `de ${metrics.wellnessEvents.total} eventos`
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Comfenalco Events Metric */}
              {can('comfenalco_events.view') && (
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  className="cursor-pointer"
                  onClick={() => navigate('/admin/comfenalco')}
                >
                  <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 hover:shadow-lg transition-shadow h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4 min-h-[60px]">
                      <CardTitle className="text-xs font-medium text-purple-700 line-clamp-2 flex-1">
                        Eventos Comfenalco Visibles
                      </CardTitle>
                      <GraduationCap className="h-4 w-4 text-purple-600 flex-shrink-0 ml-2" />
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between px-4 pb-4 min-h-[80px]">
                      <div className="mt-auto">
                        <div className="text-2xl font-bold text-purple-900 mb-1">
                          {loadingComfenalcoEvents ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            metrics.comfenalcoEvents.visible
                          )}
                        </div>
                        <p className="text-xs text-purple-600">
                          {loadingComfenalcoEvents ? 'Cargando...' : (
                            `de ${metrics.comfenalcoEvents.total} eventos`
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Inventory Metric */}
              {(can('inventory.view_dashboard') || can('hospital_requests.view')) && (
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  className="cursor-pointer"
                  onClick={() => navigate('/admin/inventario')}
                >
                  <Card className="bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-200 hover:shadow-lg transition-shadow h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4 min-h-[60px]">
                      <CardTitle className="text-xs font-medium text-amber-700 line-clamp-2 flex-1">
                        Solicitudes Hospitales Pendientes
                      </CardTitle>
                      <Package className="h-4 w-4 text-amber-600 flex-shrink-0 ml-2" />
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between px-4 pb-4 min-h-[80px]">
                      <div className="mt-auto">
                        <div className="text-2xl font-bold text-amber-900 mb-1">
                          {loadingInventory ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            metrics.inventory.requests.pending
                          )}
                        </div>
                        <p className="text-xs text-amber-600">
                          {loadingInventory ? 'Cargando...' : (
                            <>
                              {metrics.inventory.lowStock > 0 ? `${metrics.inventory.lowStock} productos con stock bajo` : 'Sin alertas'}
                            </>
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <Settings className="h-6 w-6 text-primary-prosalud" />
                  <span>Acciones Rápidas</span>
                </CardTitle>
                <CardDescription>
                  Accede a las funciones más utilizadas del panel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {can('users.create') && (
                    <motion.button
                      type="button"
                      onClick={() => setShowUserModal(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-300 border border-slate-200"
                    >
                      <Users className="h-8 w-8 text-primary-prosalud flex-shrink-0" />
                      <span className="font-medium text-text-dark">Crear Usuario</span>
                    </motion.button>
                  )}

                  {can('wellness_events.create') && (
                    <motion.button
                      type="button"
                      onClick={() => navigate('/admin/bienestar?action=create')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-300 border border-slate-200"
                    >
                      <Heart className="h-8 w-8 text-primary-prosalud flex-shrink-0" />
                      <span className="font-medium text-text-dark">Nuevo Evento Bienestar</span>
                    </motion.button>
                  )}

                  {can('comfenalco_events.create') && (
                    <motion.button
                      type="button"
                      onClick={() => navigate('/admin/comfenalco?action=create')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-300 border border-slate-200"
                    >
                      <GraduationCap className="h-8 w-8 text-primary-prosalud flex-shrink-0" />
                      <span className="font-medium text-text-dark">Nuevo Evento Comfenalco</span>
                    </motion.button>
                  )}

                  {can('requests.view') && (
                    <motion.button
                      type="button"
                      onClick={() => navigate('/admin/solicitudes')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-300 border border-slate-200"
                    >
                      <ClipboardList className="h-8 w-8 text-primary-prosalud flex-shrink-0" />
                      <span className="font-medium text-text-dark">Ver Solicitudes</span>
                    </motion.button>
                  )}

                  {can('wellness_requests.view') && (
                    <motion.button
                      type="button"
                      onClick={() => navigate('/admin/solicitudes-bienestar')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-300 border border-slate-200"
                    >
                      <Heart className="h-8 w-8 text-primary-prosalud flex-shrink-0" />
                      <span className="font-medium text-text-dark">Solicitudes Bienestar</span>
                    </motion.button>
                  )}

                  {can('inventory.view_dashboard') && (
                    <motion.button
                      type="button"
                      onClick={() => navigate('/admin/inventario')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-300 border border-slate-200"
                    >
                      <Package className="h-8 w-8 text-primary-prosalud flex-shrink-0" />
                      <span className="font-medium text-text-dark">Gestionar Inventario</span>
                    </motion.button>
                  )}

                  {can(FILE_PERMISSIONS.afiliados) && renderUploadButton('afiliados')}
                  {can(FILE_PERMISSIONS.incapacidades) && renderUploadButton('incapacidades')}
                  {can(FILE_PERMISSIONS.liquidaciones) && renderUploadButton('liquidaciones')}
                  {can(FILE_PERMISSIONS.compensaciones) && renderUploadButton('compensaciones')}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity Section - Moved to top */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Actividad Reciente</h2>
              <p className="text-gray-600">Últimas acciones y registros del sistema</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Requests */}
              {can('requests.view') && (
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary-prosalud" />
                        Solicitudes Afiliados Recientes
                      </CardTitle>
                      <CardDescription>
                        Últimas 5 solicitudes registradas por los afiliados
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingAllRequests ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary-prosalud" />
                        </div>
                      ) : allRequests && allRequests.length > 0 ? (
                        <div className="space-y-3">
                          {allRequests
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .slice(0, 5)
                            .map((request) => {
                              const statusColors = {
                                pending: 'bg-amber-100 text-amber-800',
                                in_progress: 'bg-blue-100 text-blue-800',
                                resolved: 'bg-green-100 text-green-800',
                                rejected: 'bg-red-100 text-red-800',
                              };
                              const statusLabels = {
                                pending: 'Pendiente',
                                in_progress: 'En Progreso',
                                resolved: 'Resuelta',
                                rejected: 'Rechazada',
                              };
                              return (
                                <div
                                  key={request.id}
                                  className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                  onClick={() => navigate(`/admin/solicitudes?view=${request.id}`)}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-slate-900 truncate">
                                        {request.name} {request.last_name}
                                      </span>
                                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[request.status]}`}>
                                        {statusLabels[request.status]}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-600 truncate">
                                      {getRequestTypeLabel(request.request_type)}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      {new Date(request.created_at).toLocaleDateString('es-ES', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  </div>
                                  <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0 ml-2" />
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <ClipboardList className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                          <p>No hay solicitudes recientes</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Recent Wellness Requests */}
              {can('wellness_requests.view') && (
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-pink-600" />
                        Solicitudes de Bienestar Recientes
                      </CardTitle>
                      <CardDescription>
                        Últimas 5 solicitudes de bienestar
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingWellnessRequests ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
                        </div>
                      ) : wellnessRequestsData?.data && wellnessRequestsData.data.length > 0 ? (
                        <div className="space-y-3">
                          {wellnessRequestsData.data
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .slice(0, 5)
                            .map((request) => {
                              const statusColors = {
                                pending: 'bg-amber-100 text-amber-800',
                                in_progress: 'bg-blue-100 text-blue-800',
                                resolved: 'bg-green-100 text-green-800',
                                rejected: 'bg-red-100 text-red-800',
                              };
                              const statusLabels = {
                                pending: 'Pendiente',
                                in_progress: 'En Progreso',
                                resolved: 'Resuelta',
                                rejected: 'Rechazada',
                              };
                              return (
                                <div
                                  key={request.id}
                                  className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                  onClick={() => navigate(`/admin/solicitudes-bienestar?view=${request.id}`)}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-slate-900 truncate">
                                        {request.nombreActividad}
                                      </span>
                                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[request.estado]}`}>
                                        {statusLabels[request.estado]}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-600 truncate">
                                      {request.solicitante?.name || 'Solicitante no disponible'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      {new Date(request.created_at).toLocaleDateString('es-ES', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  </div>
                                  <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0 ml-2" />
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <Heart className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                          <p>No hay solicitudes de bienestar recientes</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Recent Events */}
              {can('wellness_events.view') && (
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-green-600" />
                        Eventos Bienestar Recientes
                      </CardTitle>
                      <CardDescription>
                        Últimos 5 eventos de bienestar
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingWellnessEvents ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                        </div>
                      ) : wellnessEvents && wellnessEvents.length > 0 ? (
                        <div className="space-y-3">
                          {wellnessEvents
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .slice(0, 5)
                            .map((event) => (
                              <div
                                key={event.id}
                                className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => navigate(`/admin/bienestar?id=${event.id}`)}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-slate-900 truncate">
                                      {event.title}
                                    </span>
                                    {event.isVisible && (
                                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">
                                        Visible
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-600 truncate">
                                    {event.category}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {new Date(event.date).toLocaleDateString('es-ES', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0 ml-2" />
                              </div>
                ))}
              </div>
            ) : (
                        <div className="text-center py-8 text-slate-500">
                          <Heart className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                          <p>No hay eventos de bienestar recientes</p>
                        </div>
            )}
                    </CardContent>
                  </Card>
          </motion.div>
              )}

              {/* Recent Deliveries */}
              {can('dotacion.view') && (
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-amber-600" />
                        Últimas Entregas Dotación y EPP
                      </CardTitle>
                      <CardDescription>
                        Últimas 5 entregas realizadas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingDeliveries ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                        </div>
                      ) : deliveriesData?.items && deliveriesData.items.length > 0 ? (
                        <div className="space-y-3">
                          {deliveriesData.items
                            .sort((a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime())
                            .slice(0, 5)
                            .map((delivery) => {
                              const deliveryTypeLabels = {
                                first_time: 'Primera vez',
                                periodic: 'Periódica',
                              };
                              
                              // Extract document number from affiliateId (format: "CC-1143254525") or use signedDocumentNumber
                              const documentNumber = delivery.signedDocumentNumber || 
                                (delivery.affiliateId && delivery.affiliateId.includes('-') 
                                  ? delivery.affiliateId.split('-').slice(1).join('-')
                                  : delivery.affiliateId);
                              
                              // Extract document type from affiliateId or use signedDocumentType
                              const documentType = delivery.signedDocumentType || 
                                (delivery.affiliateId && delivery.affiliateId.includes('-')
                                  ? delivery.affiliateId.split('-')[0]
                                  : null);
                              
                              // Build display text for affiliate
                              const affiliateDisplay = documentType && documentNumber
                                ? `${documentType} ${documentNumber}`
                                : documentNumber || delivery.affiliateId || 'Sin información';
                              
                              // Count items delivered
                              const itemsCount = delivery.items?.length || 0;
                              const itemsText = itemsCount > 0 
                                ? `${itemsCount} ${itemsCount === 1 ? 'producto' : 'productos'}`
                                : 'Sin productos';
                              
                              return (
                                <div
                                  key={delivery.id}
                                  className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                  onClick={() => {
                                    if (documentNumber) {
                                      navigate(`/admin/dotacion-epp?search=${documentNumber}`);
                                    } else {
                                      navigate('/admin/dotacion-epp');
                                    }
                                  }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-slate-900 truncate">
                                        {affiliateDisplay}
                                      </span>
                                      {delivery.deliveryType && (
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                          delivery.deliveryType === 'first_time' 
                                            ? 'bg-blue-100 text-blue-800' 
                                            : 'bg-amber-100 text-amber-800'
                                        }`}>
                                          {deliveryTypeLabels[delivery.deliveryType]}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-slate-600 truncate">
                                      {itemsText} • Entregado por: {delivery.deliveredByName || delivery.deliveredBy || 'N/A'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      {new Date(delivery.deliveredAt).toLocaleDateString('es-ES', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  </div>
                                  <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0 ml-2" />
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <Package className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                          <p>No hay entregas recientes</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
        </motion.div>
              )}
            </div>
          </motion.div>

          {/* Compensaciones File Info Section */}
          {can(FILE_PERMISSIONS.compensaciones) && (
            <motion.div variants={itemVariants}>
              <Card className="bg-white border shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-6 w-6 text-primary-prosalud" />
                      <div>
                        <CardTitle className="text-xl">
                          Archivo de Compensaciones Actual
                        </CardTitle>
                        <CardDescription>
                          Información del archivo de compensaciones de afiliados activos actualmente en uso
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCompensacionesCardExpanded(!isCompensacionesCardExpanded)}
                      className="flex items-center gap-2"
                    >
                      {isCompensacionesCardExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          <span className="hidden sm:inline">Ocultar</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          <span className="hidden sm:inline">Mostrar</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {isCompensacionesCardExpanded && (
                  <CardContent>
                    {isLoadingFileInfo ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary-prosalud" />
                        <span className="ml-2 text-slate-600">Cargando información del archivo...</span>
                      </div>
                    ) : compensacionesFileInfo?.exists ? (
                      <div className="space-y-4">
                        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-900">Estado:</span>
                            <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                              Archivo disponible
                            </span>
                          </div>
                          {compensacionesFileInfo.file_path && (
                            <div className="flex items-start justify-between">
                              <span className="text-sm font-semibold text-slate-900">Ruta:</span>
                              <span className="text-sm text-slate-700 text-right break-all ml-4">
                                {compensacionesFileInfo.file_path}
                              </span>
                            </div>
                          )}
                          {compensacionesFileInfo.file_size && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-900">Tamaño:</span>
                              <span className="text-sm text-slate-700">
                                {(compensacionesFileInfo.file_size / (1024 * 1024)).toFixed(2)} MB
                              </span>
                            </div>
                          )}
                          {compensacionesFileInfo.last_modified && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-900">Última modificación:</span>
                              <span className="text-sm text-slate-700">
                                {new Date(compensacionesFileInfo.last_modified).toLocaleString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleDownloadCompensacionesFile}
                            disabled={isDownloadingFile}
                            className="flex items-center gap-2"
                          >
                            {isDownloadingFile ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Descargando...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4" />
                                Descargar archivo actual
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={fetchCompensacionesFileInfo}
                            disabled={isLoadingFileInfo}
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className={`h-4 w-4 ${isLoadingFileInfo ? 'animate-spin' : ''}`} />
                            Actualizar información
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                          <div>
                            <p className="text-sm font-semibold text-amber-900">
                              Archivo no encontrado
                            </p>
                            <p className="text-sm text-amber-700 mt-1">
                              {compensacionesFileInfo?.message || 'No hay un archivo de compensaciones cargado en el sistema.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </motion.div>
          )}

          {/* Charts Section */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Análisis y Tendencias</h2>
              <p className="text-gray-600">Visualización de datos y patrones del sistema</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Requests Status Distribution */}
              {can('requests.view') && chartData.requestsStatus.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary-prosalud" />
                        Distribución de Solicitudes
                      </CardTitle>
                      <CardDescription>
                        Estado actual de todas las solicitudes
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          value: { label: "Cantidad", color: "#00529B" },
                        }}
                        className="h-[250px] sm:h-[300px] w-full"
                      >
                        <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                          <PieChart>
                            <Pie
                              data={chartData.requestsStatus}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius="70%"
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.requestsStatus.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-slate-600">Total</span>
                          <span className="font-semibold">{metrics.requests.total}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-slate-600">Este mes</span>
                          <span className="font-semibold">{metrics.requests.thisMonth}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Wellness Requests Status Distribution */}
              {can('wellness_requests.view') && chartData.wellnessRequestsStatus.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-pink-600" />
                        Distribución de Solicitudes Bienestar
                      </CardTitle>
                      <CardDescription>
                        Estado de las solicitudes de bienestar
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          value: { label: "Cantidad", color: "#ec4899" },
                        }}
                        className="h-[250px] sm:h-[300px] w-full"
                      >
                        <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                          <PieChart>
                            <Pie
                              data={chartData.wellnessRequestsStatus}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius="70%"
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.wellnessRequestsStatus.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-slate-600">Total</span>
                          <span className="font-semibold">{metrics.wellnessRequests.total}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-slate-600">Pendientes</span>
                          <span className="font-semibold text-amber-600">{metrics.wellnessRequests.pending}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Inventory Requests Status */}
              {(can('inventory.view_dashboard') || can('hospital_requests.view')) && chartData.inventoryStatus.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-amber-600" />
                        Estado de Solicitudes Hospitales
                      </CardTitle>
                      <CardDescription>
                        Distribución de solicitudes de inventario
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          value: { label: "Cantidad", color: "#f59e0b" },
                        }}
                        className="h-[250px] sm:h-[300px] w-full"
                      >
                        <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                          <BarChart data={chartData.inventoryStatus} margin={{ top: 5, right: 5, left: 5, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45}
                              textAnchor="end"
                              height={60}
                              tick={{ fontSize: 11 }}
                              interval={0}
                            />
                            <YAxis tick={{ fontSize: 11 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]}>
                              {chartData.inventoryStatus.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                      {metrics.inventory.lowStock > 0 && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2 text-amber-800">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-semibold">{metrics.inventory.lowStock} productos requieren atención por stock bajo</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Monthly Trends - Now next to Inventory */}
              {(can('requests.view') || can('wellness_requests.view')) && (
                <motion.div variants={itemVariants}>
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary-prosalud" />
                        Tendencias Mensuales
                      </CardTitle>
                      <CardDescription>
                        Evolución de solicitudes en los últimos 6 meses
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          solicitudes: { label: "Solicitudes", color: "#f97316" },
                          bienestar: { label: "Bienestar", color: "#ec4899" },
                        }}
                        className="h-[250px] sm:h-[300px] w-full"
                      >
                        <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                          <AreaChart data={chartData.monthlyTrends} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <defs>
                              <linearGradient id="colorSolicitudes" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                              </linearGradient>
                              <linearGradient id="colorBienestar" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 11 }}
                            />
                            <YAxis tick={{ fontSize: 11 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            {can('requests.view') && (
                              <Area
                                type="monotone"
                                dataKey="solicitudes"
                                stroke="#f97316"
                                fill="url(#colorSolicitudes)"
                                strokeWidth={2}
                              />
                            )}
                            {can('wellness_requests.view') && (
                              <Area
                                type="monotone"
                                dataKey="bienestar"
                                stroke="#ec4899"
                                fill="url(#colorBienestar)"
                                strokeWidth={2}
                              />
                            )}
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Modals */}
      <UserFormModal
        open={showUserModal}
        onOpenChange={setShowUserModal}
      />

      <Dialog open={showUploadConfirmDialog} onOpenChange={handleUploadDialogChange}>
        <DialogContent
          overlayClassName="fixed inset-0 z-50 bg-black/40 supports-[backdrop-filter]:backdrop-blur-sm dark:bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          className="sm:max-w-xl gap-6 bg-white"
        >
          {activeUploadConfig && (
            <>
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-2xl font-semibold text-slate-900">
                  {activeUploadConfig.dialogTitle}
                </DialogTitle>
              </DialogHeader>
              <DialogDescription asChild>
                <div className="space-y-4 text-left">
                  <p className="text-sm text-muted-foreground leading-6">
                    {activeUploadConfig.description}
                  </p>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Archivo seleccionado</p>
                    <p className="text-sm text-slate-700">
                      {selectedFile?.name ?? 'Sin archivo'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : '0 MB'}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Se almacenará como <span className="font-semibold">{activeUploadConfig.storageName}</span>.
                      Tamaño máximo permitido: {activeUploadConfig.maxSizeMB} MB.
                    </p>
                    {activeUploadConfig.additionalNote && (
                      <p className="text-xs text-slate-500 mt-1">{activeUploadConfig.additionalNote}</p>
                    )}
                    {selectedFile && selectedFileUrl && (
                      <Button asChild variant="outline" size="sm" className="mt-3">
                        <a href={selectedFileUrl} download={selectedFile.name} className="flex items-center">
                          <Download className="mr-2 h-4 w-4" />
                          Descargar archivo seleccionado
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </DialogDescription>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleUploadCancel} disabled={isUploading}>
                  Cancelar
                </Button>
                <Button onClick={handleUploadConfirm} disabled={isUploading}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {isUploading ? 'Subiendo...' : 'Confirmar'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
};

export default AdminDashboard;
