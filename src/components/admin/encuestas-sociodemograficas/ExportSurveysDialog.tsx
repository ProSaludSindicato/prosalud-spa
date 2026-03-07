import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Download, Calendar, Filter, Loader2, CheckCircle2, AlertCircle, FileSignature, FileText, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { socioDemographicSurveyApi } from '@/services/socioDemographicSurveyApi';
import { logger } from '@/utils/logger';
export interface ExportInitialFilters {
  year?: number;
  month?: number;
  hospitals?: string[];
  numero_documento?: string;
  survey_type?: string;
}

export interface ExportFilterOptions {
  hospitals: string[];
  years: number[];
}

interface ExportSurveysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Filtros actuales de la lista para prellenar el diálogo */
  initialFilters?: ExportInitialFilters;
  /** Opciones para año y hospitales (desde filter_options de la API) */
  filterOptions?: ExportFilterOptions;
}

interface DateRangeFilter {
  includeAll: boolean;
  start?: Date;
  end?: Date;
}

const currentCalendarYear = new Date().getFullYear();

const ExportSurveysDialog: React.FC<ExportSurveysDialogProps> = ({ 
  open, 
  onOpenChange,
  initialFilters,
  filterOptions = { hospitals: [], years: [] },
}) => {
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [surveyType, setSurveyType] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<number>(currentCalendarYear);
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [hospitalsFilter, setHospitalsFilter] = useState<string[]>([]);
  const [numeroDocumento, setNumeroDocumento] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    includeAll: true
  });
  const [profesion, setProfesion] = useState<string>('');
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const availableYears = useMemo(() => {
    const y = filterOptions.years?.length ? filterOptions.years.slice().sort((a, b) => b - a) : [currentCalendarYear, currentCalendarYear - 1, currentCalendarYear - 2];
    if (!y.includes(yearFilter)) y.push(yearFilter);
    return y.sort((a, b) => b - a);
  }, [filterOptions.years, yearFilter]);

  const availableMonths = useMemo(() => {
    const now = new Date();
    const maxMonth = yearFilter === now.getFullYear() ? now.getMonth() + 1 : 12;
    return Array.from({ length: maxMonth }, (_, i) => i + 1);
  }, [yearFilter]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Apply initial filters when dialog opens; reset when closes
  useEffect(() => {
    if (open && initialFilters) {
      if (initialFilters.year != null) setYearFilter(initialFilters.year);
      if (initialFilters.month != null) setMonthFilter(String(initialFilters.month));
      if (initialFilters.hospitals?.length) setHospitalsFilter(initialFilters.hospitals);
      if (initialFilters.numero_documento != null) setNumeroDocumento(initialFilters.numero_documento);
      if (initialFilters.survey_type != null) setSurveyType(initialFilters.survey_type);
    }
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
      setExportFormat('excel');
      setMonthFilter('');
      setHospitalsFilter([]);
      setNumeroDocumento('');
      setYearFilter(currentCalendarYear);
      setSurveyType('all');
      setProfesion('');
      setDateRange({ includeAll: true });
    }
  }, [open, initialFilters]);

  // Si el año es el actual y el mes seleccionado es futuro, limpiar mes
  useEffect(() => {
    const now = new Date();
    if (yearFilter === now.getFullYear() && monthFilter) {
      const m = parseInt(monthFilter, 10);
      if (m > now.getMonth() + 1) setMonthFilter('');
    }
  }, [yearFilter, monthFilter]);

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

  // Polling for PDF export (separate endpoint from Excel)
  const startPollingPdf = (jobId: string, maxAttempts: number = 360): void => {
    let attempts = 0;

    const poll = async () => {
      attempts++;

      try {
        const statusResult = await socioDemographicSurveyApi.checkPdfExportStatus(jobId);

        if (!statusResult.success && statusResult.message) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setExportStatus('failed');
          setExportError(statusResult.message);
          setIsGenerating(false);
          toast.error('Error al generar PDF', { description: statusResult.message });
          return;
        }

        if (statusResult.status === 'completed') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          try {
            const { blob, filename } = await socioDemographicSurveyApi.downloadPdfExport(
              jobId,
              statusResult.file_name
            );
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            setExportStatus('completed');
            setIsGenerating(false);
            toast.success('Reporte PDF generado', {
              description: statusResult.count != null
                ? `Se descargaron ${statusResult.count} encuestas.`
                : 'El PDF se ha descargado correctamente.',
            });
            onOpenChange(false);
          } catch (error) {
            setExportStatus('failed');
            setIsGenerating(false);
            const msg = error instanceof Error ? error.message : 'Error al descargar el PDF';
            setExportError(msg);
            toast.error('Error al descargar', { description: msg });
          }
          return;
        }

        if (statusResult.status === 'failed') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setExportStatus('failed');
          setIsGenerating(false);
          const errMsg = statusResult.error || 'Error al generar el PDF';
          setExportError(errMsg);
          toast.error('Error al generar PDF', { description: errMsg });
          return;
        }

        setExportStatus('processing');
        if (attempts >= maxAttempts) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setExportStatus('failed');
          setIsGenerating(false);
          setExportError('El PDF está tardando más de lo esperado. Intente de nuevo más tarde.');
          toast.error('Tiempo agotado', {
            description: 'El PDF está tardando más de lo esperado. Puede solicitar uno nuevo.',
          });
        }
      } catch (error) {
        logger.error('Error al verificar estado del PDF', error instanceof Error ? error.message : error);
        if (attempts >= maxAttempts) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setExportStatus('failed');
          setIsGenerating(false);
          const msg = error instanceof Error ? error.message : 'Error al verificar el estado del PDF';
          setExportError(msg);
          toast.error('Error', { description: msg });
        }
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    pollingIntervalRef.current = interval;
  };

  // Polling function for async report generation (Excel with signatures)
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

  const buildExportFilters = () => {
    const base = {
      year: yearFilter,
      month: monthFilter ? parseInt(monthFilter, 10) : undefined,
      hospitals: hospitalsFilter.length ? hospitalsFilter : undefined,
      numero_documento: numeroDocumento.trim() || undefined,
      survey_type: surveyType !== 'all' ? surveyType : undefined,
      profesion: profesion.trim() || undefined,
      date_range: {
        include_all: dateRange.includeAll,
        start_date: formatDateForApi(dateRange.start),
        end_date: formatDateForApi(dateRange.end),
      },
    };
    return base;
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
      logger.debug('Iniciando exportación de encuestas sociodemográficas desde backend', { format: exportFormat });
      const filters = buildExportFilters();

      if (exportFormat === 'pdf') {
        const result = await socioDemographicSurveyApi.exportToPdf(filters);

        setExportJobId(result.job_id);
        setExportStatus('processing');
        startPollingPdf(result.job_id);
        toast.info('Generando PDF', {
          description: 'El PDF se está generando en segundo plano. Se descargará automáticamente cuando esté listo.',
        });
        return;
      } else {
        const result = await socioDemographicSurveyApi.exportToExcel({
          ...filters,
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
      }
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
      <DialogContent className="max-sm:inset-x-4 sm:w-full sm:max-w-2xl lg:max-w-3xl bg-white max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900">
            Exportar Reporte de Encuestas
          </DialogTitle>
          <DialogDescription className="text-sm">
            Genera un reporte en Excel o PDF de todas las encuestas sociodemográficas y de salud
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format Selector - Visual Cards */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <h4 className="font-medium text-gray-900">Formato de Exportación</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Selecciona el formato del reporte a generar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setExportFormat('excel')}
                disabled={isGenerating}
                className={`relative flex flex-col items-start p-4 rounded-lg border-2 transition-all ${
                  exportFormat === 'excel'
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className={`p-2 rounded-lg ${
                    exportFormat === 'excel'
                      ? 'bg-emerald-100'
                      : 'bg-gray-100'
                  }`}>
                    <FileSpreadsheet className={`h-6 w-6 ${
                      exportFormat === 'excel'
                        ? 'text-emerald-600'
                        : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900">Excel (.xlsx)</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Ideal para análisis de datos
                    </div>
                  </div>
                  {exportFormat === 'excel' && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  )}
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setExportFormat('pdf')}
                disabled={isGenerating}
                className={`relative flex flex-col items-start p-4 rounded-lg border-2 transition-all ${
                  exportFormat === 'pdf'
                    ? 'border-red-500 bg-red-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className={`p-2 rounded-lg ${
                    exportFormat === 'pdf'
                      ? 'bg-red-100'
                      : 'bg-gray-100'
                  }`}>
                    <FileText className={`h-6 w-6 ${
                      exportFormat === 'pdf'
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900">PDF (.pdf)</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Formato visual completo
                    </div>
                  </div>
                  {exportFormat === 'pdf' && (
                    <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            </div>
            {exportFormat === 'pdf' && (
              <p className="text-xs text-gray-500 mt-2">
                El PDF incluirá todas las encuestas en páginas separadas con el mismo diseño que el PDF individual. 
                La generación puede tardar varios minutos si hay muchas encuestas; no cierres esta ventana mientras se procesa.
              </p>
            )}
          </div>

          {/* Filtros alineados con la API de consulta */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <Filter className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Filtros de exportación</h4>
                  <p className="text-sm text-gray-600">
                    Año, mes, hospitales, documento, tipo de encuesta y proceso/profesión
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Año</label>
                  <Select value={String(yearFilter)} onValueChange={(v) => setYearFilter(parseInt(v, 10))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Mes</label>
                  <Select value={monthFilter || 'all'} onValueChange={(v) => setMonthFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos los meses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los meses</SelectItem>
                      {availableMonths.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {format(new Date(2000, m - 1, 1), 'MMMM', { locale: es })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <label className="text-sm font-medium text-gray-700">Hospitales</label>
                  <MultiSelect
                    options={filterOptions.hospitals.map((h) => ({ value: h, label: h }))}
                    selected={hospitalsFilter}
                    onSelectionChange={setHospitalsFilter}
                    placeholder="Todos los hospitales"
                    emptyText="No hay hospitales"
                    maxDisplay={2}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Número de documento</label>
                  <Input
                    placeholder="Ej: 12345678"
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Tipo de encuesta</label>
                  <Select value={surveyType} onValueChange={setSurveyType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active_affiliate">Afiliados Activos</SelectItem>
                      <SelectItem value="new_entry">Nuevo Ingreso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <label className="text-sm font-medium text-gray-700">Proceso / Profesión</label>
                  <Input
                    type="text"
                    placeholder="Ej: Enfermería, Médico"
                    value={profesion}
                    onChange={(e) => setProfesion(e.target.value)}
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-gray-500">
                    Escribe el proceso exactamente como aparece en los reportes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rango de fechas e inclusión de firmas en una fila, dos columnas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-gray-200">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Rango de Fechas</h4>
                    <p className="text-sm text-gray-600">
                      Filtra por período específico (opcional)
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Incluir todas las encuestas
                  </label>
                  <Switch
                    checked={dateRange.includeAll}
                    onCheckedChange={handleIncludeAllChange}
                  />
                </div>

                {!dateRange.includeAll && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Desde</label>
                      <Input
                        type="date"
                        value={formatDateForInput(dateRange.start)}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        max={dateRange.end ? formatDateForInput(dateRange.end) : today}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Hasta</label>
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

            {exportFormat === 'excel' && (
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
            )}
          </div>

          {/* Processing Status */}
          {exportStatus === 'processing' && (
            <Card className="border border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">
                      {exportFormat === 'pdf' ? 'Generando PDF...' : 'Generando reporte...'}
                    </h4>
                    <p className="text-sm text-blue-800 mt-1">
                      {exportFormat === 'pdf'
                        ? 'El PDF se está generando en segundo plano. Se descargará automáticamente cuando esté listo.'
                        : 'El reporte se está generando en segundo plano. Te notificaremos cuando esté listo para descargar.'}
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

          {/* Report Info
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
                  {exportFormat === 'pdf' && <li>• Cada encuesta en una página separada</li>}
                  {exportFormat === 'pdf' && <li>• Firmas digitales incluidas automáticamente</li>}
                  {exportFormat === 'excel' && includeSignatures && <li>• Firmas digitales embebidas</li>}
                </ul>
              </CardContent>
            </Card>
          )} */}

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
                  Exportar {exportFormat === 'pdf' ? 'PDF' : 'Excel'}
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
