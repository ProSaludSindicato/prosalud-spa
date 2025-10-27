/**
 * Componente para el encabezado del chat
 */

import React from "react";
import {
  X,
  Maximize2,
  Minimize2,
  PlusCircle,
  Download,
  MessageSquare,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatHeaderProps {
  isFullscreen: boolean;
  onClose: () => void;
  onToggleFullscreen: () => void;
  onNewConversation: () => void;
  onExportConversation: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  isFullscreen,
  onClose,
  onToggleFullscreen,
  onNewConversation,
  onExportConversation,
}) => {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-primary-prosalud to-primary-prosalud-dark p-3 text-white shadow-md dark:border-gray-700">
      <div className="flex items-center space-x-2">
        <MessageSquare className="h-6 w-6" />
        <h3 className="font-semibold text-base">Asistente Virtual ProSalud</h3>
      </div>
      <div className="flex items-center space-x-1">
        {/* Botón para exportar conversación (TEMPORAL) */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onExportConversation}
                className="rounded-lg bg-white/10 p-1.5 transition-all duration-300 hover:bg-white/20 focus:outline-none"
              >
                <Download className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-gray-800 text-white border-gray-700">
              <p className="text-xs">Exportar conversación (temporal)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Botón para nueva conversación */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onNewConversation}
                className="rounded-lg bg-white/10 p-1.5 transition-all duration-300 hover:bg-white/20 focus:outline-none"
              >
                <PlusCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-gray-800 text-white border-gray-700">
              <p className="text-xs">Nueva conversación</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Botón para pantalla completa */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleFullscreen}
                className="rounded-lg bg-white/10 p-1.5 transition-all duration-300 hover:bg-white/20 focus:outline-none"
                aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-gray-800 text-white border-gray-700">
              <p className="text-xs">{isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Botón para cerrar */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onClose}
                className="rounded-lg bg-white/10 p-1.5 transition-all duration-300 hover:bg-white/20 focus:outline-none"
                aria-label="Cerrar chat"
              >
                <X className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-gray-800 text-white border-gray-700">
              <p className="text-xs">Cerrar chat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

