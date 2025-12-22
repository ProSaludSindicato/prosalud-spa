import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorSanitizer';
import DataPagination from '@/components/ui/data-pagination';
import { wellnessRequestsService, WellnessRequest } from '@/services/wellnessRequestsApi';
import { TableLoadingSkeleton } from '@/components/ui/loading-skeleton';
import WellnessRequestForm from '@/components/admin/solicitudes/WellnessRequestForm';
import WellnessActivityRealizedForm from '@/components/admin/solicitudes/WellnessActivityRealizedForm';
import WellnessActivityReviewDialog from '@/components/admin/solicitudes/WellnessActivityReviewDialog';
import ExportWellnessReportDialog from '@/components/admin/solicitudes/ExportWellnessReportDialog';

// Schema para cambiar el estado (simplificado, sin envío de correos)
// No incluye 'pending' porque una solicitud no puede volver a ese estado
const statusChangeSchema = z.object({
  newStatus: z.enum(['in_progress', 'resolved', 'rejected'], {
    required_error: 'Debe seleccionar un nuevo estado',
  }),
});

type StatusChangeFormValues = z.infer<typeof statusChangeSchema>;

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
    return s.estado === 'pending' || s.estado === 'in_progress';
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
      <DropdownMenuContent
        align="end"
        className="w-56"
      >
        <DropdownMenuItem onClick={() => onViewDetails(solicitud)}>
          <Eye className="h-4 w-4 mr-2" />
          Ver Detalles
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit(solicitud)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
        )}
        {canChangeStatus && (
          <DropdownMenuItem onClick={() => onChangeStatus(solicitud)}>
            <Send className="h-4 w-4 mr-2" />
            Cambiar Estado
          </DropdownMenuItem>
        )}
        {canAddActivityAction && onAddActivityRealized && (
          <DropdownMenuItem onClick={() => onAddActivityRealized(solicitud)}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Actividad Realizada
          </DropdownMenuItem>
        )}
        {canReviewActivityAction && onReviewActivity && (
          <DropdownMenuItem onClick={() => onReviewActivity(solicitud)}>
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
  const queryClient = useQueryClient();

  const statusChangeForm = useForm<StatusChangeFormValues>({
    resolver: zodResolver(statusChangeSchema),
    defaultValues: {
      newStatus: 'in_progress',
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
    staleTime: 0, // Siempre considerar los datos como obsoletos para forzar refetch
  });

  const bienestarSolicitudes = wellnessRequestsData?.data || [];
  const pagination = wellnessRequestsData?.pagination;

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
    return solicitud.estado === 'pending' || solicitud.estado === 'in_progress';
  };

  const handleEdit = React.useCallback((solicitud: WellnessRequest) => {
    if (!canEditSolicitud(solicitud)) {
      toast.error('No se puede editar', {
        description: 'Solo se pueden editar solicitudes pendientes o en revisión.',
      });
      return;
    }
    setEditingSolicitud(solicitud);
    setShowCreateForm(true);
  }, []);

  const handleViewDetails = React.useCallback((solicitud: WellnessRequest) => {
    setSelectedSolicitud(solicitud);
  }, []);

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
                          Solicitudes de Bienestar
                        </CardTitle>
                        <Badge variant="secondary" className="text-sm sm:text-base px-2 sm:px-3 py-1 w-fit">
                          Total: {stats?.total || 0}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm sm:text-base mt-1 sm:mt-2">
                        Gestiona las solicitudes de actividades de bienestar
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                    {can('wellness_requests.view') && (
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
                    {can('wellness_requests.create') && (
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
                                    ? new Date(solicitud.fechaPropuesta).toLocaleDateString('es-ES')
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
                                <ActionMenu
                                  solicitud={solicitud}
                                  onViewDetails={handleViewDetails}
                                  onEdit={handleEdit}
                                  onChangeStatus={handleOpenStatusDialog}
                                  onAddActivityRealized={handleAddActivityRealized}
                                  onReviewActivity={handleReviewActivity}
                                  can={can}
                                />
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
                                          ? new Date(solicitud.fechaPropuesta).toLocaleDateString('es-ES')
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
                            ? new Date(selectedSolicitud.fechaPropuesta).toLocaleDateString('es-ES')
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Hora Inicio</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedSolicitud.horaInicio || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Hora Fin</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedSolicitud.horaFin || 'N/A'}
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
                              ? new Date(selectedSolicitud.actividad_realizada.fecha_realizada).toLocaleDateString('es-ES')
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

        {/* Diálogo de Exportación de Reporte */}
        <ExportWellnessReportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminSolicitudBienestarPage;

