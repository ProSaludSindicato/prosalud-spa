/**
 * Componente para mostrar botones de selección de incapacidades
 */

import React from "react";
import { FileText, List } from "lucide-react";

interface IncapacidadOption {
  index: number;
  radicado: string;
  periodo: string;
  dias: string;
  estado: string;
  valor?: string;
}

interface IncapacidadSelectionButtonsProps {
  options: IncapacidadOption[];
  onSelect: (selection: "todas" | number) => void;
}

export const IncapacidadSelectionButtons: React.FC<IncapacidadSelectionButtonsProps> = ({
  options,
  onSelect,
}) => {
  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case "PAGADA": return "✅";
      case "EN_PROCESO": return "🔄";
      case "PENDIENTE_DOCUMENTOS": return "📋";
      case "RECHAZADA": return "❌";
      default: return "ℹ️";
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
        Selecciona una incapacidad para ver más detalles:
      </div>
      
      {/* Botón para ver todas */}
      <button
        onClick={() => onSelect("todas")}
        className="w-full text-left rounded-lg bg-prosalud-salud/10 px-3 py-2.5 text-xs text-gray-700 dark:text-gray-200 shadow-sm transition-all duration-300 hover:bg-prosalud-salud/20 hover:shadow-md border border-prosalud-salud/30 flex items-center gap-2"
      >
        <List className="h-4 w-4 text-prosalud-salud flex-shrink-0" />
        <span className="font-medium">Ver todas las incapacidades en detalle</span>
      </button>

      {/* Botones individuales para cada incapacidad */}
      <div className="space-y-1.5">
        {options.map((option) => (
          <button
            key={option.index}
            onClick={() => onSelect(option.index)}
            className="w-full text-left rounded-lg bg-white dark:bg-gray-700 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 shadow-sm transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:shadow-md border border-gray-200 dark:border-gray-600 flex items-start gap-2"
          >
            <FileText className="h-4 w-4 text-prosalud-salud mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{getStatusIcon(option.estado)} Incapacidad #{option.index + 1}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {option.radicado}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 space-y-0.5">
                <div>Período: {option.periodo}</div>
                <div className="flex items-center gap-3">
                  <span>Días: {option.dias}</span>
                  <span>Estado: {option.estado}</span>
                </div>
                {option.valor && (
                  <div className="font-medium text-prosalud-salud dark:text-prosalud-salud-light">
                    Valor: {option.valor}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
