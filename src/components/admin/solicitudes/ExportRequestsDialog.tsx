
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Calendar, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { requestsService } from '@/services/requestsServiceApi';
import { logger } from '@/utils/logger';

interface ExportRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingRequestTypes?: string[];
  getRequestTypeLabel?: (type: string) => string;
}

// Solo Excel está disponible

interface DateRangeFilter {
  includeAll: boolean;
  start?: Date;
  end?: Date;
}

const ExportRequestsDialog: React.FC<ExportRequestsDialogProps> = ({ 
  open, 
  onOpenChange,
  existingRequestTypes = [],
  getRequestTypeLabel
}) => {
  const [requestType, setRequestType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    includeAll: true
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

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
    setIsGenerating(true);
    
    try {
      logger.debug('Iniciando exportación de solicitudes desde backend');
      
      // Call backend API to generate Excel report
      const { blob, filename } = await requestsService.exportToExcel({
        request_type: requestType !== 'all' ? requestType : undefined,
        date_range: {
          includeAll: dateRange.includeAll,
          start: dateRange.start,
          end: dateRange.end,
        },
      });

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
      
      toast({
        title: "Reporte Excel Generado",
        description: "El reporte de solicitudes en Excel se ha descargado exitosamente",
        duration: 4000,
      });

      logger.debug('Exportación de solicitudes completada');
      onOpenChange(false);
    } catch (error) {
      logger.error('Error al exportar solicitudes', error instanceof Error ? error.message : error);
      toast({
        title: "Error al Generar Reporte",
        description: error instanceof Error ? error.message : "No se pudo conectar con el servidor. Verifique su conexión.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Exportar Reporte de Solicitudes
          </DialogTitle>
          <DialogDescription>
            Genera un reporte en Excel de todas las solicitudes realizadas por los afiliados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Type Filter */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <Filter className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Tipo de Solicitud</h4>
                  <p className="text-sm text-gray-600">
                    Filtra las solicitudes por tipo específico
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Seleccionar tipo</label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos los tipos de solicitudes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos de solicitudes</SelectItem>
                    {existingRequestTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {getRequestTypeLabel ? getRequestTypeLabel(type) : type}
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
                    Filtra las solicitudes por período específico
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

          {/* Report Info */}
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h4 className="font-medium text-blue-900 mb-2">Información del Reporte</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Datos personales de los solicitantes</li>
                <li>• Tipos de solicitudes y estados</li>
                <li>• Fechas de creación y resolución</li>
                <li>• Estadísticas generales y resumen</li>
                <li>• Detalles específicos por tipo de solicitud</li>
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

export default ExportRequestsDialog;
