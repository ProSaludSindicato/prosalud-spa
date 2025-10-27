/**
 * Componente para mostrar advertencia de límite de uso
 */

import React from "react";
import { HelpCircle } from "lucide-react";
import { RateLimitInfo } from "../hooks/useChatbotState";

interface RateLimitWarningProps {
  rateLimitInfo: RateLimitInfo;
}

export const RateLimitWarning: React.FC<RateLimitWarningProps> = ({ rateLimitInfo }) => {
  if (!rateLimitInfo.showWarning) return null;

  return (
    <div className="flex-shrink-0 border-t border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20">
      <div className="px-3 py-2">
        <div className="flex items-start gap-2 text-xs text-yellow-800 dark:text-yellow-200">
          <HelpCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Límite de uso del chatbot</p>
            <p className="mt-1 text-yellow-700 dark:text-yellow-300">
              Has usado {rateLimitInfo.messagesDay}/50 mensajes hoy.
              {rateLimitInfo.messagesHour >= 12 && ` (${rateLimitInfo.messagesHour}/15 esta hora)`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

