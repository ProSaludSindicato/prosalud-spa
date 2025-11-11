
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReportType, DateRangeFilter } from './types/reportTypes';
import { buildReportData, getFilteredData } from './utils/reportData';
import { generateExcelReport } from './utils/excelReportGenerator';
import ReportTypeSelector from './components/ReportTypeSelector';
import ReportInfoCard from './components/ReportInfoCard';
import DateRangeSelector from './components/DateRangeSelector';
import * as XLSX from 'xlsx';
import { useInventory } from '@/context/InventoryContext';

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
  const { categories, products, hospitalRequests, deliveries } = useInventory();

  const handleExport = async () => {
    setIsGenerating(true);
    
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const baseData = buildReportData({
        categories,
        products,
        hospitalRequests,
        deliveries,
        dateRange,
      });

      const filteredData = getFilteredData(reportType, baseData);
      const workbook = generateExcelReport(filteredData, reportType);
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Reporte_${reportType.toUpperCase()}_${timestamp}.xlsx`);

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
      toast({
        title: 'Error al Generar Reporte',
        description: 'Hubo un problema al generar el reporte. Inténtalo de nuevo.',
        variant: 'destructive',
        duration: 4000,
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
                  Exportar a Excel
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
