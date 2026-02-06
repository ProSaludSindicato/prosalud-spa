import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Calendar, Filter, Loader2, CheckCircle2, AlertCircle, FileSignature } from 'lucide-react';
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
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setExportStatus('idle');
      setExportError(null);
      setExportJobId(null);
      setIsGenerating(false);
      setIncludeSignatures(false);
    }
  }, [open]);

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

  // Helper function to check export status
  const checkExportStatus = async (jobId: string): Promise<{
    success: boolean;
    status: 'processing' | 'completed' | 'failed';
    download_url?: string;
    file_name?: string;
    error?: string;
    message?: string;
  }> => {
    return await socioDemographicSurveyApi.checkExportStatus(jobId);
  };

  // Helper function to download completed report
  const downloadReport = async (jobId: string): Promise<void> => {
    const { blob, filename } = await socioDemographicSurveyApi.downloadExport(jobId);
    
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  };

  // Polling function for async report generation
  const startPolling = (jobId: string, maxAttempts: number = 60): void => {
    let attempts = 0;
    
    const poll = async () => {
      attempts++;
      
      try {
        const statusResult = await checkExportStatus(jobId);
        
        if (!statusResult.success && statusResult.message) {
          // Job not found or expired
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setExportStatus('failed');
          setExportError(statusResult.message);
          setIsGenerating(false);
          toast.error('Error al generar reporte', {
            description: statusResult.message,
          });
          return;
        }

        if (statusResult.status === 'completed' && statusResult.download_url) {
          // Report is ready, download it
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          try {
            await downloadReport(jobId);
            setExportStatus('completed');
            setIsGenerating(false);
            toast.success('Reporte exportado', {
              description: 'El reporte se ha descargado exitosamente.',
            });
            onOpenChange(false);
          } catch (error) {
            setExportStatus('failed');
            setIsGenerating(false);
            const message = error instanceof Error ? error.message : 'Error al descargar el reporte';
            setExportError(message);
            toast.error('Error al descargar', {
              description: message,
            });
          }
        } else if (statusResult.status === 'failed') {
          // Report generation failed
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setExportStatus('failed');
          setIsGenerating(false);
          const errorMessage = statusResult.error || 'Error al generar el reporte';
          setExportError(errorMessage);
          toast.error('Error al generar reporte', {
            description: errorMessage,
          });
        } else if (statusResult.status === 'processing') {
          // Still processing, continue polling
          setExportStatus('processing');
          if (attempts >= maxAttempts) {
            // Max attempts reached
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setExportStatus('failed');
            setIsGenerating(false);
            setExportError('El reporte está tardando más de lo esperado. Por favor, intenta nuevamente.');
            toast.error('Timeout', {
              description: 'El reporte está tardando más de lo esperado. Por favor, intenta nuevamente.',
            });
          }
        }
      } catch (error) {
        logger.error('Error al verificar estado del reporte', error instanceof Error ? error.message : error);
        // Continue polling on error (might be temporary network issue)
        if (attempts >= maxAttempts) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setExportStatus('failed');
          setIsGenerating(false);
          const message = error instanceof Error ? error.message : 'Error al verificar el estado del reporte';
          setExportError(message);
          toast.error('Error', {
            description: message,
          });
        }
      }
    };

    // Start polling immediately, then every 5 seconds
    poll();
    const interval = setInterval(poll, 5000);
    pollingIntervalRef.current = interval;
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

    setExportError(null);
    setExportStatus('idle');
    setIsGenerating(true);
    
    try {
      logger.debug('Iniciando exportación de encuestas sociodemográficas desde backend');
      
      const result = await socioDemographicSurveyApi.exportToExcel({
        survey_type: surveyType !== 'all' ? surveyType : undefined,
        date_range: {
          include_all: dateRange.includeAll,
          start_date: formatDateForApi(dateRange.start),
          end_date: formatDateForApi(dateRange.end),
        },
        include_signatures: includeSignatures,
      });

      // Si incluye firmas, es asíncrono (retorna job_id)
      if ('job_id' in result) {
        setExportJobId(result.job_id);
        setExportStatus('processing');
        startPolling(result.job_id);
        toast.info('Generando reporte', {
          description: 'El reporte se está generando en segundo plano. Te notificaremos cuando esté listo.',
        });
        return; // Don't close dialog, keep it open to show progress
      }

      // Si no incluye firmas, es síncrono (retorna blob)
      const { blob, filename } = result;
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
      setIsGenerating(false);
      onOpenChange(false);
    } catch (error) {
      logger.error('Error al exportar encuestas', error instanceof Error ? error.message : error);
      const message = error instanceof Error ? error.message : 'No se pudo conectar con el servidor. Verifique su conexión.';
      setExportError(message);
      setExportStatus('failed');
      setIsGenerating(false);
      toast.error('Error al Exportar Reporte', {
        description: message,
      });
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
                    <SelectItem value="new_entry">Nuevo Ingreso</SelectItem>
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

          {/* Include Signatures Option */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <FileSignature className="h-5 w-5 text-gray-600" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Incluir Firmas Digitales</h4>
                  <p className="text-sm text-gray-600">
                    Si está activado, el proceso tomará más tiempo (se ejecuta en segundo plano)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include-signatures" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Incluir firmas digitales embebidas en el reporte
                </Label>
                <Switch
                  id="include-signatures"
                  checked={includeSignatures}
                  onCheckedChange={(checked) => setIncludeSignatures(checked === true)}
                  disabled={isGenerating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Processing Status */}
          {exportStatus === 'processing' && (
            <Card className="border border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">Generando reporte...</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      El reporte se está generando en segundo plano. Te notificaremos cuando esté listo para descargar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Status */}
          {exportStatus === 'failed' && exportError && (
            <Card className="border border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900">Error al generar reporte</h4>
                    <p className="text-sm text-red-800 mt-1">{exportError}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Report Info */}
          {exportStatus === 'idle' && (
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
                  {includeSignatures && <li>• Firmas digitales embebidas</li>}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={exportStatus === 'processing'}
            >
              {exportStatus === 'processing' ? 'Generando...' : 'Cancelar'}
            </Button>
            <Button 
              onClick={handleExport}
              disabled={
                isGenerating || 
                exportStatus === 'processing' ||
                (!dateRange.includeAll && (!dateRange.start || !dateRange.end))
              }
              className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
            >
              {exportStatus === 'processing' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando...
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
