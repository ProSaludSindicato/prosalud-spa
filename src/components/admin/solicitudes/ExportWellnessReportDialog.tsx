import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Calendar, Filter, Building, User, FileText, Image } from 'lucide-react';
import { toast } from 'sonner';
import { wellnessRequestsService } from '@/services/wellnessRequestsApi';
import { logger } from '@/utils/logger';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/services/adminApi';
import { usePermissions } from '@/hooks/usePermissions';

interface ExportWellnessReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DateRangeFilter {
  includeAll: boolean;
  start?: Date;
  end?: Date;
}

// Centros de costos válidos según la documentación
const COST_CENTERS = [
  { value: 'Bello', label: 'Bello' },
  { value: 'Rionegro', label: 'Rionegro' },
  { value: 'La Maria asistencial', label: 'La María Asistencial' },
  { value: 'La Maria VIH', label: 'La María VIH' },
  { value: 'La Maria Cosalud', label: 'La María Cosalud' },
  { value: 'La Maria Enterritorio', label: 'La María Enterritorio' },
  { value: 'Carisma', label: 'Carisma' },
  { value: 'Admon', label: 'Administración' },
] as const;

// Estados válidos según la documentación
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En Revisión' },
  { value: 'resolved', label: 'Aprobada' },
  { value: 'rejected', label: 'Rechazada' },
] as const;

const ExportWellnessReportDialog: React.FC<ExportWellnessReportDialogProps> = ({ 
  open, 
  onOpenChange,
}) => {
  const [costCenter, setCostCenter] = useState<string>('all');
  const [requesterId, setRequesterId] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    includeAll: true
  });
  const [includeImages, setIncludeImages] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { can } = usePermissions();
  const canViewUsers = can('users.view');

  // Obtener usuarios para el filtro de solicitante solo si el usuario tiene permiso de consulta
  const { data: usersResponse } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(1, 1000, '', ''),
    enabled: open && canViewUsers, // Solo cargar cuando el modal está abierto y tiene permiso de ver usuarios
    staleTime: 5 * 60 * 1000,
  });

  const users = usersResponse?.data || [];

  const handleIncludeAllChange = (includeAll: boolean) => {
    setDateRange({
      ...dateRange,
      includeAll,
      start: includeAll ? undefined : dateRange.start,
      end: includeAll ? undefined : dateRange.end
    });
  };

  const handleStartDateChange = (dateString: string) => {
    const start = dateString ? new Date(dateString) : undefined;
    setDateRange({
      ...dateRange,
      start
    });
  };

  const handleEndDateChange = (dateString: string) => {
    const end = dateString ? new Date(dateString) : undefined;
    setDateRange({
      ...dateRange,
      end
    });
  };

  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleExport = async () => {
    // Validar fechas si no se incluyen todas
    if (!dateRange.includeAll) {
      if (!dateRange.start || !dateRange.end) {
        toast.error('Por favor, seleccione ambas fechas o active "Incluir todas las solicitudes"');
        return;
      }
      if (dateRange.start > dateRange.end) {
        toast.error('La fecha de inicio debe ser anterior o igual a la fecha de fin');
        return;
      }
    }

    setIsGenerating(true);
    
    try {
      logger.debug('Iniciando exportación de solicitudes de bienestar desde backend');
      
      // Construir filtros según la documentación de la API
      const filters: {
        cost_center?: string;
        requester_id?: number;
        status?: string;
        fecha_desde?: string;
        fecha_hasta?: string;
        include_images?: boolean;
      } = {};

      if (costCenter !== 'all') {
        filters.cost_center = costCenter;
      }

      if (requesterId !== 'all') {
        filters.requester_id = parseInt(requesterId, 10);
      }

      if (status !== 'all') {
        filters.status = status;
      }

      if (!dateRange.includeAll && dateRange.start && dateRange.end) {
        filters.fecha_desde = formatDateForInput(dateRange.start);
        filters.fecha_hasta = formatDateForInput(dateRange.end);
      }

      // Incluir imágenes si está activado
      filters.include_images = includeImages;

      // Call backend API to generate Excel report
      const { blob, filename } = await wellnessRequestsService.exportToExcel(filters);

      logger.debug('Reporte Excel recibido del backend', { filename, size: blob.size });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.success('Reporte Excel Generado', {
        description: 'El reporte de solicitudes de bienestar en Excel se ha descargado exitosamente',
      });

      logger.debug('Exportación de solicitudes de bienestar completada');
      onOpenChange(false);
    } catch (error) {
      logger.error('Error al exportar solicitudes de bienestar', error instanceof Error ? error.message : error);
      toast.error('Error al Exportar Reporte', {
        description: error instanceof Error ? error.message : 'No se pudo conectar con el servidor. Verifique su conexión.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Exportar Reporte de Solicitudes de Bienestar
          </DialogTitle>
          <DialogDescription>
            Genera un reporte en Excel de todas las solicitudes y actividades de bienestar realizadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cost Center Filter */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Centro de Costos</h4>
                  <p className="text-sm text-gray-600">
                    Filtra las solicitudes por centro de costos (hospital)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Seleccionar centro</label>
                <Select value={costCenter} onValueChange={setCostCenter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos los centros de costos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los centros de costos</SelectItem>
                    {COST_CENTERS.map((center) => (
                      <SelectItem key={center.value} value={center.value}>
                        {center.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Requester Filter: solo visible si tiene permiso de consulta de usuarios */}
          {canViewUsers && (
            <Card className="border border-gray-200">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Solicitante</h4>
                    <p className="text-sm text-gray-600">
                      Filtra las solicitudes por usuario solicitante
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Seleccionar solicitante</label>
                  <Select value={requesterId} onValueChange={setRequesterId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos los solicitantes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los solicitantes</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Filter */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <Filter className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Estado</h4>
                  <p className="text-sm text-gray-600">
                    Filtra las solicitudes por estado
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Seleccionar estado</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Date Range Selector */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Rango de Fechas</h4>
                  <p className="text-sm text-gray-600">
                    Filtra las solicitudes por fecha propuesta de la actividad
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Incluir todas las solicitudes disponibles
                </label>
                <Switch
                  checked={dateRange.includeAll}
                  onCheckedChange={handleIncludeAllChange}
                />
              </div>

              {!dateRange.includeAll && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Fecha Desde</label>
                    <Input
                      type="date"
                      value={formatDateForInput(dateRange.start)}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      max={dateRange.end ? formatDateForInput(dateRange.end) : today}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Fecha Hasta</label>
                    <Input
                      type="date"
                      value={formatDateForInput(dateRange.end)}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      min={dateRange.start ? formatDateForInput(dateRange.start) : undefined}
                      max={today}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Include Images Option */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <Image className="h-5 w-5 text-gray-600" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Incluir Imágenes/Evidencias</h4>
                  <p className="text-sm text-gray-600">
                    Incluye imágenes embebidas en el reporte (aumenta el tamaño del archivo y el tiempo de generación)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Incluir imágenes en el reporte
                  </label>
                  <p className="text-xs text-gray-500">
                    Se incluirán hasta 3 imágenes por actividad. Las imágenes que excedan 2MB o no se puedan descargar se omitirán automáticamente.
                  </p>
                </div>
                <Switch
                  checked={includeImages}
                  onCheckedChange={setIncludeImages}
                />
              </div>
            </CardContent>
          </Card>

          {/* Report Info */}
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Información del Reporte</h4>
              </div>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Resumen general con estadísticas y gráficas</li>
                <li>• Detalle completo de todas las solicitudes</li>
                <li>• Actividades realizadas con comparación de participantes</li>
                <li>• Estadísticas por centro de costos</li>
                <li>• Estadísticas por solicitante</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleExport}
              disabled={isGenerating || (!dateRange.includeAll && (!dateRange.start || !dateRange.end))}
              className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Reporte
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportWellnessReportDialog;

