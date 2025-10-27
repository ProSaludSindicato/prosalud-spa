/**
 * Componente para el área de entrada de texto del chat
 */

import React from "react";
import { Send } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SpellCheckSuggestions } from "../SpellCheckSuggestions";
import { MAX_CHARS } from "../constants/chatbotConstants";
import { RateLimitInfo } from "../hooks/useChatbotState";

interface ChatInputProps {
  inputMessage: string;
  isTyping: boolean;
  isFullscreen: boolean;
  showSpellCheckSuggestions: boolean;
  rateLimitInfo: RateLimitInfo;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSelectSuggestion: (suggestion: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputMessage,
  isTyping,
  isFullscreen,
  showSpellCheckSuggestions,
  rateLimitInfo,
  textareaRef,
  onInputChange,
  onKeyDown,
  onFocus,
  onBlur,
  onSelectSuggestion,
  onSubmit,
}) => {
  const currentChars = inputMessage.length;
  const isRateLimitExceeded = rateLimitInfo.messagesHour >= 15 || rateLimitInfo.messagesDay >= 50;

  return (
    <form
      onSubmit={onSubmit}
      className={`relative z-20 border-t border-gray-200 bg-white pb-safe pt-2 px-2 dark:border-gray-700 dark:bg-gray-800 flex-shrink-0 safe-area-inset-bottom ${
        isFullscreen ? "p-4" : ""
      }`}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 2rem)" }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-grow relative">
          {/* Sugerencias de corrección ortográfica y predictivas */}
          <SpellCheckSuggestions
            inputText={inputMessage}
            onSelectSuggestion={onSelectSuggestion}
            isVisible={showSpellCheckSuggestions && !isTyping}
          />

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
              className={`w-full resize-none overflow-hidden rounded-lg border border-gray-300 bg-gray-100 p-2 text-base text-gray-900 placeholder-gray-500 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-prosalud-salud dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:ring-prosalud-salud touch-manipulation ${
                isFullscreen ? "max-h-[120px] min-h-[3rem] p-3" : "max-h-[80px] min-h-[2.5rem]"
              }`}
              placeholder="Escribe tu pregunta aquí..."
              rows={1}
              aria-label="Mensaje"
              disabled={isTyping}
              maxLength={MAX_CHARS}
            />
            {/* Contador de caracteres */}
            <div className="absolute -bottom-5 left-0 right-0 flex justify-between items-center px-1">
              <div className={`text-xs ${currentChars >= 490 ? "text-red-500" : "text-gray-500"}`}>
                {currentChars}/{MAX_CHARS}
              </div>
              {currentChars >= 490 && (
                <div className="text-xs text-red-500">Límite de caracteres alcanzado</div>
              )}
            </div>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="submit"
                className={`transform rounded-lg bg-prosalud-salud p-2 text-white transition-all duration-300 hover:scale-105 hover:bg-prosalud-salud/90 focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex-shrink-0 ${
                  isFullscreen ? "p-3" : ""
                }`}
                disabled={isTyping || inputMessage.trim() === "" || inputMessage.length > MAX_CHARS || isRateLimitExceeded}
                title={isRateLimitExceeded ? "Límite de mensajes alcanzado" : "Enviar mensaje"}
                aria-label="Enviar mensaje"
              >
                <Send className={`${isFullscreen ? "h-6 w-6" : "h-4 w-4"}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" className="max-w-xs">
              <p className="text-sm">
                Cuanta más información incluyas en tu pregunta, más precisa y útil será la respuesta.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </form>
  );
};

