import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Calendar, Filter, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { socioDemographicSurveyApi } from '@/services/socioDemographicSurveyApi';
import { logger } from '@/utils/logger';

interface ExportSurveysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DateRangeFilter {
  includeAll: boolean;
  start?: Date;
  end?: Date;
}

const ExportSurveysDialog: React.FC<ExportSurveysDialogProps> = ({ 
  open, 
  onOpenChange,
}) => {
  const [surveyType, setSurveyType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    includeAll: true
  });
  const [hospital, setHospital] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

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

  const formatDateForApi = (date: Date | undefined): string | undefined => {
    if (!date) return undefined;
    return date.toISOString().split('T')[0];
  };

  const handleExport = async () => {
    // Validar fechas si no se incluyen todas
    if (!dateRange.includeAll) {
      if (!dateRange.start || !dateRange.end) {
        toast.error('Por favor, seleccione ambas fechas o active "Incluir todas las encuestas"');
        return;
      }
      if (dateRange.start > dateRange.end) {
        toast.error('La fecha de inicio debe ser anterior o igual a la fecha de fin');
        return;
      }
    }

    setIsGenerating(true);
    
    try {
      logger.debug('Iniciando exportación de encuestas sociodemográficas desde backend');
      
      // Call backend API to generate Excel report
      const { blob, filename } = await socioDemographicSurveyApi.exportToExcel({
        survey_type: surveyType !== 'all' ? surveyType : undefined,
        date_range: {
          include_all: dateRange.includeAll,
          start_date: formatDateForApi(dateRange.start),
          end_date: formatDateForApi(dateRange.end),
        },
        hospital: hospital.trim() || undefined,
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
      
      toast.success('Reporte Excel Generado', {
        description: 'El reporte de encuestas sociodemográficas en Excel se ha descargado exitosamente',
      });

      logger.debug('Exportación de encuestas completada');
      onOpenChange(false);
    } catch (error) {
      logger.error('Error al exportar encuestas', error instanceof Error ? error.message : error);
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
      <DialogContent className="max-sm:inset-x-4 sm:w-full sm:max-w-lg bg-white max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Exportar Reporte de Encuestas
          </DialogTitle>
          <DialogDescription>
            Genera un reporte en Excel de todas las encuestas sociodemográficas y de salud
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Survey Type Filter */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <Filter className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Tipo de Encuesta</h4>
                  <p className="text-sm text-gray-600">
                    Filtra las encuestas por tipo específico
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Seleccionar tipo</label>
                <Select value={surveyType} onValueChange={setSurveyType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos los tipos de encuestas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos de encuestas</SelectItem>
                    <SelectItem value="active_affiliate">Afiliados Activos</SelectItem>
                    <SelectItem value="bulk_entry">Ingreso Masivo</SelectItem>
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
                    Filtra las encuestas por período específico
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Incluir todas las encuestas disponibles
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

          {/* Hospital Filter */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <Building2 className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Hospital</h4>
                  <p className="text-sm text-gray-600">
                    Filtra las encuestas por hospital específico (opcional)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Código de Hospital</label>
                <Input
                  type="text"
                  placeholder="Ej: HOSP001 (dejar vacío para todos)"
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  className="w-full"
                  maxLength={255}
                />
              </div>
            </CardContent>
          </Card>

          {/* Report Info */}
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h4 className="font-medium text-blue-900 mb-2">Información del Reporte</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Datos personales de los afiliados</li>
                <li>• Información sociodemográfica completa</li>
                <li>• Condiciones de salud y limitaciones físicas</li>
                <li>• Recomendaciones laborales</li>
                <li>• Información de contacto de emergencia</li>
                <li>• Trazabilidad por tipo de encuesta</li>
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

export default ExportSurveysDialog;

