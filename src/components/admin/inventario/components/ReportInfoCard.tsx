
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { ReportType } from '../types/reportTypes';

interface ReportInfoCardProps {
  type: ReportType;
}

const ReportInfoCard: React.FC<ReportInfoCardProps> = ({ type }) => {
  const getReportDescription = () => {
    switch (type) {
      case 'strategic':
        return 'Incluye métricas globales, comportamiento por categoría y estado de solicitudes y entregas.';
      case 'operational':
        return 'Resalta variaciones con potencial riesgo, pendientes de abastecimiento y coordinación logística.';
      case 'critical_stock':
        return 'Enfocado exclusivamente en variantes con stock crítico o bajo para priorizar reposiciones.';
      default:
        return '';
    }
  };

  return (
    <Card className="border border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Información del Reporte</h4>
            <p className="text-sm text-blue-700 mt-1">{getReportDescription()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportInfoCard;
