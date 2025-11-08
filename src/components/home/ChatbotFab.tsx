
import React, { useState } from 'react'; // Importar useState
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ChatbotFab: React.FC = () => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false); // Estado para controlar la visibilidad del tooltip

  const handleChatOpen = () => {
    // Lógica para abrir el chatbot (se implementará más adelante)
    setIsTooltipOpen(true); // Mostrar el tooltip al hacer clic
    // Por ejemplo, podrías usar un estado global o un context para manejar la visibilidad del chat.
  };

  return (
    <TooltipProvider delayDuration={100}>
      {/* Tooltip ahora es controlado por el estado isTooltipOpen */}
      <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
        <TooltipTrigger asChild>
          <Button
            onClick={handleChatOpen} // El onClick ahora también activa el tooltip
            className="fixed bottom-6 right-6 w-14 h-14 bg-prosalud-salud hover:bg-prosalud-salud/90 rounded-full shadow-xl z-50 flex items-center justify-center"
            aria-label="Abrir chat"
          >
            <MessageCircle className="text-white h-6 w-6" /> {/* Manteniendo el tamaño del icono h-6 w-6 */}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-gray-800 text-white border-gray-700">
          <p>¡Chatea con nosotros!</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ChatbotFab;
