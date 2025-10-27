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

  const isLimitExceeded = rateLimitInfo.messagesHour >= 15 || rateLimitInfo.messagesDay >= 50;

  return (
    <div className={`flex-shrink-0 border-t ${isLimitExceeded ? 'border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20' : 'border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20'}`}>
      <div className="px-3 py-2">
        <div className={`flex items-start gap-2 text-xs ${isLimitExceeded ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
          <HelpCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              {isLimitExceeded ? 'Límite alcanzado' : 'Límite de uso del chatbot'}
            </p>
            <p className={`mt-1 ${isLimitExceeded ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
              {isLimitExceeded ? (
                <>
                  Has alcanzado el límite de mensajes.
                  {rateLimitInfo.timeRemaining && ` Intenta de nuevo en aproximadamente ${rateLimitInfo.timeRemaining} minutos.`}
                </>
              ) : (
                <>
                  Has usado {rateLimitInfo.messagesDay}/50 mensajes hoy.
                  {rateLimitInfo.messagesHour >= 12 && ` (${rateLimitInfo.messagesHour}/15 esta hora)`}
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

