
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReportType, DateRangeFilter } from './types/reportTypes';
import ReportTypeSelector from './components/ReportTypeSelector';
import ReportInfoCard from './components/ReportInfoCard';
import DateRangeSelector from './components/DateRangeSelector';
import { API_CONFIG } from '@/config/api';

interface ExportReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ExportReportDialog: React.FC<ExportReportDialogProps> = ({ open, onOpenChange }) => {
  const [reportType, setReportType] = useState<ReportType>('strategic');
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    includeAll: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  /**
   * Obtiene el token de autenticación desde localStorage
   */
  const getAuthToken = (): string | null => {
    try {
      return localStorage.getItem('prosalud_auth_token');
    } catch (error) {
      console.error('Error al obtener token:', error);
      return null;
    }
  };

  /**
   * Descarga un blob como archivo
   */
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExport = async () => {
    setIsGenerating(true);
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No se encontró el token de autenticación. Por favor, inicia sesión nuevamente.');
      }

      // Construir el body de la petición
      const body: {
        reportType: string;
        dateRange?: {
          start: string;
          end: string;
        };
      } = {
        reportType,
      };

      // Agregar rango de fechas si está especificado
      if (!dateRange.includeAll && dateRange.start && dateRange.end) {
        body.dateRange = {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        };
      }

      // Realizar la petición al backend
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/inventory/reports/excel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // Manejar errores de respuesta
      if (!response.ok) {
        let errorMessage = 'Error al generar el reporte';
        
        if (response.status === 401) {
          errorMessage = 'No autorizado. Por favor, inicia sesión nuevamente.';
        } else if (response.status === 403) {
          errorMessage = 'Acceso denegado. No tienes permisos para generar reportes.';
        } else if (response.status === 400) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = 'Parámetros inválidos para el reporte.';
          }
        } else if (response.status === 500) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || 'Error interno del servidor al generar el reporte.';
          } catch {
            errorMessage = 'Error interno del servidor al generar el reporte.';
          }
        }

        throw new Error(errorMessage);
      }

      // Obtener el blob del archivo Excel
      const blob = await response.blob();

      // Generar nombre de archivo
      const timestamp = new Date().toISOString().split('T')[0];
      const reportTypeUpper = reportType.toUpperCase();
      const filename = `Reporte_${reportTypeUpper}_${timestamp}.xlsx`;

      // Descargar el archivo
      downloadBlob(blob, filename);

      const reportLabel =
        reportType === 'strategic'
          ? 'estratégico'
          : reportType === 'operational'
            ? 'operacional'
            : 'de stock crítico';
        
      toast({
        title: 'Reporte Excel Generado',
        description: `Se descargó el reporte ${reportLabel} del inventario en formato Excel.`,
        duration: 4000,
      });

      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Hubo un problema al generar el reporte. Inténtalo de nuevo.';
      
      toast({
        title: 'Error al Generar Reporte',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">Exportar Reporte de Inventario</DialogTitle>
          <DialogDescription>
            Genera un reporte en formato Excel con la información clave del inventario, su distribución por categorías y el estado de solicitudes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <ReportTypeSelector value={reportType} onChange={setReportType} />
          
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          
          <ReportInfoCard type={reportType} />

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

export default ExportReportDialog;
