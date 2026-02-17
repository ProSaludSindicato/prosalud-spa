import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Calendar, Filter, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { requestsApiService } from '@/services/requestsApi';
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/errorSanitizer';

// Subtipos válidos para verificación de pagos
// Estos valores deben coincidir exactamente con los valores del backend (case-sensitive)
const VERIFICACION_PAGOS_SUBTIPOS = [
  { value: 'COMPENSACIÓN. FINAL (LIQUIDACIÓN)', label: 'Compensación Final' },
  { value: 'COMPENSACIÓN ANUAL DIFERIDA Y/O DESCANSO', label: 'Compensación Anual Diferida' },
  { value: 'COMPENSACIÓN POR DESCANSO', label: 'Compensación por Descanso' },
  { value: 'DESCUENTOS SEGURIDAD SOCIAL', label: 'Descuentos Seguridad Social' },
  { value: 'DUPLICADO COLILLAS', label: 'Duplicado Colillas' },
  { value: 'VIATICOS', label: 'Viáticos' },
  { value: 'Ceiisas', label: 'Ceiisas' },
  { value: 'COMPENSACIÓN. MENSUAL', label: 'Compensación Mensual' },
  { value: 'COMPENSACIÓN SEMESTRAL', label: 'Compensación Semestral' },
  { value: 'INCAPACIDADES', label: 'Incapacidades' },
  { value: 'SUBSIDIOS', label: 'Subsidios' },
];

interface BulkResponseTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingRequestTypes?: string[];
  getRequestTypeLabel?: (type: string) => string;
}

interface DateRangeFilter {
  includeAll: boolean;
  start?: Date;
  end?: Date;
}

const BulkResponseTemplateDialog: React.FC<BulkResponseTemplateDialogProps> = ({ 
  open, 
  onOpenChange,
  existingRequestTypes = [],
  getRequestTypeLabel
}) => {
  const [requestType, setRequestType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [subtype, setSubtype] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    includeAll: true
  });
  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      logger.debug('Iniciando descarga de plantilla de respuesta masiva');
      
      // Build filters
      const filters: {
        request_type?: string;
        status?: string;
        subtype?: string;
        date_range?: {
          include_all?: boolean;
          start_date?: string;
          end_date?: string;
        };
      } = {};

      if (requestType !== 'all') {
        filters.request_type = requestType;
      }

      if (status !== 'all') {
        filters.status = status;
      }

      // Solo incluir subtype si request_type es 'verificacion-pagos' y subtype no es 'all'
      if (requestType === 'verificacion-pagos' && subtype !== 'all') {
        filters.subtype = subtype;
      }

      if (!dateRange.includeAll) {
        filters.date_range = {
          include_all: false,
        };
        if (dateRange.start) {
          filters.date_range.start_date = formatDateForInput(dateRange.start);
        }
        if (dateRange.end) {
          filters.date_range.end_date = formatDateForInput(dateRange.end);
        }
      } else {
        filters.date_range = {
          include_all: true,
        };
      }

      // Call backend API to download template
      const { blob, filename } = await requestsApiService.exportBulkResponseTemplate(filters);

      logger.debug('Plantilla Excel recibida del backend', { filename, size: blob.size });

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
      
      toast.success('Plantilla descargada', {
        description: 'La plantilla Excel se ha descargado exitosamente. Complete las columnas editables y vuelva a subir el archivo.',
        duration: 5000,
      });

      logger.debug('Descarga de plantilla completada');
      onOpenChange(false);
    } catch (error) {
      logger.error('Error al descargar plantilla de respuesta masiva', error instanceof Error ? error.message : error);
      const errorMessage = getErrorMessage(error);
      
      // Determinar si es un error de regla de negocio (422) o un error técnico
      const isBusinessRuleError = error instanceof Error && 
        (errorMessage.includes('No hay solicitudes') || 
         errorMessage.includes('pendientes') || 
         errorMessage.includes('en revisión'));
      
      toast.error(
        isBusinessRuleError ? 'No se puede generar la plantilla' : 'Error al descargar plantilla',
        {
          description: errorMessage,
          duration: 5000,
        }
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-sm:inset-x-4 sm:w-full sm:max-w-lg bg-white max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Exportar Plantilla de Respuestas Masivas
          </DialogTitle>
          <DialogDescription>
            Descarga una plantilla Excel con las solicitudes pendientes o en revisión. Complete las columnas editables y procese el archivo para responder masivamente.
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
                    Filtra las solicitudes por tipo específico (opcional)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Seleccionar tipo</label>
                <Select value={requestType} onValueChange={(value) => {
                  setRequestType(value);
                  // Reset subtype cuando cambia el tipo de solicitud
                  if (value !== 'verificacion-pagos') {
                    setSubtype('all');
                  }
                }}>
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

          {/* Status Filter */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <Filter className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Estado de Solicitud</h4>
                  <p className="text-sm text-gray-600">
                    Filtra las solicitudes por estado (opcional). Por defecto se incluyen PENDING e IN_REVIEW.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Seleccionar estado</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos los estados (PENDING e IN_REVIEW por defecto)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                    <SelectItem value="IN_REVIEW">En Revisión</SelectItem>
                    <SelectItem value="COMPLETED">Completada</SelectItem>
                    <SelectItem value="REJECTED">Rechazada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Subtype Filter - Solo para verificacion-pagos */}
          {requestType === 'verificacion-pagos' && (
            <Card className="border border-gray-200">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <Filter className="h-5 w-5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Subtipo de Solicitud</h4>
                    <p className="text-sm text-gray-600">
                      Filtra las solicitudes de verificación de pagos por subtipo específico (opcional)
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Seleccionar subtipo</label>
                  <Select value={subtype} onValueChange={setSubtype}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos los subtipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los subtipos</SelectItem>
                      {VERIFICACION_PAGOS_SUBTIPOS.map((subtypeOption) => (
                        <SelectItem key={subtypeOption.value} value={subtypeOption.value}>
                          {subt