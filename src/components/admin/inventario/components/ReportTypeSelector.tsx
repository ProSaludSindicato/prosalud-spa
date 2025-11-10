
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReportType } from '../types/reportTypes';

interface ReportTypeSelectorProps {
  value: ReportType;
  onChange: (value: ReportType) => void;
}

const ReportTypeSelector: React.FC<ReportTypeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Tipo de Reporte</label>
      <Select value={value} onValueChange={(val) => onChange(val as ReportType)}>
        <SelectTrigger className="justify-start text-left">
          <SelectValue placeholder="Seleccionar tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="strategic" className="group">
            <div className="flex flex-col">
              <span className="font-medium group-hover:text-white">Reporte Estratégico</span>
              <span className="text-xs text-gray-500 group-hover:text-white">Visión integral: categorías, productos y solicitudes.</span>
            </div>
          </SelectItem>
          <SelectItem value="operational" className="group">
            <div className="flex flex-col">
              <span className="font-medium group-hover:text-white">Reporte Operacional</span>
              <span className="text-xs text-gray-500 group-hover:text-white">Enfoque en tareas pendientes y abastecimiento.</span>
            </div>
          </SelectItem>
          <SelectItem value="lowstock" className="group">
            <div className="flex flex-col">
              <span className="font-medium group-hover:text-white">Stock Crítico</span>
              <span className="text-xs text-gray-500 group-hover:text-white">Prioriza variantes con riesgo de ruptura.</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ReportTypeSelector;
