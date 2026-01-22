import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Calendar, Filter, Package, FileText, Signature, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { wellnessDeliveryService, ExportDeliveryReportRequest } from '@/services/wellnessDeliveryService';
import { logger } from '@/utils/logger';

interface ExportWellnessDeliveryReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPO_ENTREGA_OPTIONS = [
  { value: 'kit_escolar', label: 'Kit Escolar' },
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'lonchera', label: 'Lonchera' },
] as const;

const ESTADO_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'procesado', label: 'Procesado' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
] as const;

const ExportWellnessDeliveryReportDialog: React.FC<ExportWellnessDeliveryReportDialogProps> = ({ 
  open, 
  onOpenChange,
}) => {
  const [tipoEntrega, setTipoEntrega] = useState<string>('all');
  const [estado, setEstado] = useState<string>('all');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [includeFirmas, setIncludeFirmas] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar polling al cerrar el diálogo
  useEffect(() => {
    if (!open) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // Resetear estados
      setExportStatus('idle');
      setJobId(null);
      setErrorMessage(null);
      setIsGenerating(false);
    }
  }, [open]);

  // Limpiar polling al desmontar
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const startPolling = (jobId: string) => {
    // Limpiar intervalo anterior si existe
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    let attempts = 0;
    const maxAttempts = 120; // 10 minutos máximo (120 * 5 segundos)

    const checkStatus = async () => {
      attempts++;
      
      try {
        const status = await wellnessDeliveryService.checkExportStatus(jobId);
        
        if (status.status === 'completed') {
          // Detener polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          setExportStatus('completed');
          
          // Descargar el archivo
          try {
            const blob = await wellnessDeliveryService.downloadExport(jobId);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = status.file_name || `reporte-entregas-bienestar-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
            
            toast.success('Reporte Excel Generado', {
              description: 'El reporte de entregas de bienestar se ha descargado exitosamente',
            });
            
            setIsGenerating(false);
            onOpenChange(false);
          } catch (downloadError) {
            logger.error('Error al descargar reporte', downloadError);
            toast.error('Error al Descargar Reporte', {
              description: 'El reporte se generó pero no se pudo descargar. Intente nuevamente.',
            });
            setExportStatus('failed');
            setErrorMessage('Error al descargar el archivo');
            setIsGenerating(false);
          }
        } else if (status.status === 'failed') {
          // Detener polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          setExportStatus('failed');
          setErrorMessage(status.error || 'Error desconocido al generar el reporte');
          setIsGenerating(false);
          
          toast.error('Error al Generar Reporte', {
            description: status.error || 'No se pudo generar el reporte. Intente nuevamente.',
          });
        } else if (status.status === 'processing') {
          // Continuar polling
          setExportStatus('processing');
        }
      } catch (error) {
        logger.error('Error al verificar estado del reporte', error);
        
        // Si es 404, el job expiró
        if (error instanceof Error && error.message.includes('404')) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          setExportStatus('failed');
          setErrorMessage('El reporte expiró. Por favor, genere uno nuevo.');
          setIsGenerating(false);
          
          toast.error('Reporte Expirado', {
            description: 'El reporte expiró después de 24 horas. Por favor, genere uno nuevo.',
          });
        }
        // Si alcanzamos el máximo de intentos, detener polling
        if (attempts >= maxAttempts) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          setExportStatus('failed');
          setErrorMessage('El reporte está tomando más tiempo del esperado. Por favor, intente nuevamente más tarde.');
          setIsGenerating(false);
          
          toast.error('Tiempo de Espera Agotado', {
            description: 'El reporte está tomando más tiempo del esperado. Por favor, intente nuevamente más tarde.',
          });
        }
      }
    };

    // Verificar inmediatamente
    checkStatus();
    
    // Luego verificar cada 5 segundos
    pollingIntervalRef.current = setInterval(checkStatus, 5000);
  };

  const handleExport = async () => {
    // Validar fechas
    if (fechaDesde && fechaHasta && new Date(fechaDesde) > new Date(fechaHasta)) {
      toast.error('La fecha de inicio debe ser anterior o igual a la fecha de fin');
      return;
    }

    setIsGenerating(true);
    setExportStatus('idle');
    setErrorMessage(null);
    
    try {
      logger.debug('Iniciando exportación de entregas de bienestar');
      
      // Construir filtros
      const filters: ExportDeliveryReportRequest = {};

      if (tipoEntrega !== 'all') {
        filters.tipo_entrega = tipoEntrega as 'kit_escolar' | 'desayuno' | 'lonchera';
      }

      if (estado !== 'all') {
        filters.estado = estado as 'pendiente' | 'procesado' | 'entregado' | 'cancelado';
      }

      if (fechaDesde) {
        filters.fecha_desde = fechaDesde;
      }

      if (fechaHasta) {
        filters.fecha_hasta = fechaHasta;
      }

      filters.include_firmas = includeFirmas;

      // Generar reporte
      const result = await wellnessDeliveryService.exportReport(filters);

      // Si es respuesta asíncrona (con job_id)
      if (typeof result === 'object' && 'job_id' in result) {
        setJobId(result.job_id);
        setExportStatus('processing');
        startPolling(result.job_id);
        
        toast.info('Generando Reporte', {
          description: 'El reporte se está generando. Te notificaremos cuando esté listo.',
        });
      } else {
        // Si es respuesta síncrona (Blob)
        const blob = result as Blob;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-entregas-bienestar-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
        
        toast.success('Reporte Excel Generado', {
          description: 'El reporte de entregas de bienestar se ha descargado exitosamente',
        });

        logger.debug('Exportación de entregas de bienestar completada');
        setIsGenerating(false);
        onOpenChange(false);
      }
    } catch (error) {
      logger.error('Error al exportar entregas de bienestar', error instanceof Error ? error.message : error);
      toast.error('Error al Exportar Reporte', {
        description: error instanceof Error ? error.message : 'No se pudo conectar con el servidor. Verifique su conexión.',
      });
      setIsGenerating(false);
      setExportStatus('failed');
      setErrorMessage(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Exportar Reporte de Entregas de Bienestar
          </DialogTitle>
          <DialogDescription>
            Genera un reporte en Excel de todas las entregas de bienestar (kits escolares, desayunos, loncheras, etc.)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tipo de Entrega Filter */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <Package className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Tipo de Entrega</h4>
                  <p className="text-sm text-gray-600">
                    Filtra las entregas por tipo de beneficio
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Seleccionar tipo</label>
                <Select value={tipoEntrega} onValueChange={setTipoEntrega}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {TIPO_ENTREGA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Estado Filter */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <Filter className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Estado</h4>
                  <p className="text-sm text-gray-600">
                    Filtra las entregas por estado
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Seleccionar estado</label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {ESTADO_OPTIONS.map((option) => (
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
                    Filtra las entregas por fecha de creación
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Fecha Desde</label>
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    max={fechaHasta || today}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Fecha Hasta</label>
                  <Input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    min={fechaDesde || undefined}
                    max={today}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Include Signatures Option */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <Signature className="h-5 w-5 text-gray-600" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Incluir Firmas</h4>
                  <p className="text-sm text-gray-600">
                    Incluye las firmas digitales en el reporte (aumenta el tamaño del archivo y el tiempo de generación)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Incluir firmas en el reporte
                  </label>
                  <p className="text-xs text-gray-500">
                    Se incluirán las firmas del afiliado y de recibido (si aplica). La generación será asíncrona y tomará más tiempo.
                  </p>
                </div>
                <Switch
                  checked={includeFirmas}
                  onCheckedChange={setIncludeFirmas}
                />
              </div>
            </CardContent>
          </Card>

          {/* Status Indicator */}
          {exportStatus === 'processing' && (
            <Card className="border border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">Generando Reporte...</h4>
                    <p className="text-sm text-blue-800">
                      El reporte se está generando. Esto puede tomar varios minutos. Te notificaremos cuando esté listo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {exportStatus === 'failed' && errorMessage && (
            <Card className="border border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900">Error al Generar Reporte</h4>
                    <p className="text-sm text-red-800">{errorMessage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Report Info */}
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Información del Reporte</h4>
              </div>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Resumen general con estadísticas</li>
                <li>• Detalle completo de todas las entregas</li>
                <li>• Información de afiliados y beneficiarios</li>
                <li>• Filtros automáticos en todas las columnas</li>
                <li>• Firmas embebidas (si se incluyen)</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isGenerating && exportStatus === 'processing'}
            >
              {exportStatus === 'processing' ? 'Cerrar (Generando...)' : 'Cancelar'}
            </Button>
            <Button 
              onClick={handleExport}
              disabled={isGenerating || (fechaDesde && fechaHasta && new Date(fechaDesde) > new Date(fechaHasta))}
              className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {exportStatus === 'processing' ? 'Generando...' : 'Generando...'}
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

export default ExportWellnessDeliveryReportDialog;

