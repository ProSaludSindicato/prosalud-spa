/**
 * Componente para el botón flotante de scroll al final
 */

import React from "react";
import { ChevronDown } from "lucide-react";

interface ScrollToBottomButtonProps {
  onClick: () => void;
}

export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-4 right-4 z-10 rounded-full bg-prosalud-salud p-3 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-prosalud-salud/90 focus:outline-none"
      title="Ir al final de la conversación"
      aria-label="Ir al final"
    >
      <ChevronDown className="h-5 w-5" />
    </button>
  );
};

