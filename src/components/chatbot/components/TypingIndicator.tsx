/**
 * Componente para el indicador de escritura del bot
 */

import React from "react";

interface TypingIndicatorProps {
  typingDots: number;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingDots }) => {
  return (
    <div className="rounded-lg bg-white p-3 shadow-md dark:bg-gray-700">
      <div className="flex items-center space-x-1">
        <div
          className={`h-2 w-2 rounded-full bg-gray-400 transition-opacity duration-300 ${typingDots >= 1 ? "opacity-100" : "opacity-30"}`}
        ></div>
        <div
          className={`h-2 w-2 rounded-full bg-gray-400 transition-opacity duration-300 ${typingDots >= 2 ? "opacity-100" : "opacity-30"}`}
        ></div>
        <div
          className={`h-2 w-2 rounded-full bg-gray-400 transition-opacity duration-300 ${typingDots >= 3 ? "opacity-100" : "opacity-30"}`}
        ></div>
      </div>
    </div>
  );
};

