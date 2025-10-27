/**
 * Componente para las acciones rápidas del chatbot
 */

import React from "react";
import { ChevronUp, ChevronDown, CreditCard, FileText, GitPullRequestDraft } from "lucide-react";

interface QuickActionsProps {
  showQuickActions: boolean;
  onToggle: () => void;
  onOpenIncapacidadForm: () => void;
  onOpenLiquidacionForm: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  showQuickActions,
  onToggle,
  onOpenIncapacidadForm,
  onOpenLiquidacionForm,
}) => {
  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer"
        onClick={onToggle}
      >
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <span className="p-1.5 border border-current rounded-md flex items-center justify-center text-primary-prosalud-dark">
            <GitPullRequestDraft className="h-4 w-4 text-primary-prosalud-dark" />
          </span>
          Trámites rápidos
        </p>
        <button
          className="text-gray-600 transition-colors duration-300 hover:text-prosalud-salud focus:outline-none dark:text-gray-400 dark:hover:text-prosalud-salud"
          aria-label={showQuickActions ? "Ocultar trámites" : "Mostrar trámites"}
        >
          {showQuickActions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {showQuickActions && (
        <div className="px-3 pb-3 space-y-2">
          <button
            onClick={onOpenIncapacidadForm}
            className="w-full text-left rounded-lg bg-white px-3 py-2 text-xs text-gray-700 shadow-sm transition-all duration-300 hover:bg-prosalud-salud/10 hover:text-gray-900 hover:shadow-md dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-prosalud-salud/20 border border-gray-200 dark:border-gray-500 flex items-start gap-2"
          >
            <CreditCard className="h-4 w-4 text-prosalud-salud mt-0.5 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">Consultar pago de una incapacidad</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Verifica el estado del pago por incapacidad médica
              </span>
            </div>
          </button>
          <button
            onClick={onOpenLiquidacionForm}
            className="w-full text-left rounded-lg bg-white px-3 py-2 text-xs text-gray-700 shadow-sm transition-all duration-300 hover:bg-prosalud-salud/10 hover:text-gray-900 hover:shadow-md dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-prosalud-salud/20 border border-gray-200 dark:border-gray-500 flex items-start gap-2"
          >
            <FileText className="h-4 w-4 text-prosalud-salud mt-0.5 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">Consultar estado de compensación final</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Revisa el progreso y verifica si tienes documentos pendientes
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

