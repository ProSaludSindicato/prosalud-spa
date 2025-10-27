/**
 * Componente para renderizar un mensaje individual del chat
 */

import React from "react";
import { Bot, User, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Message } from "../utils/categoryClassifier";
import { IncapacidadSelectionButtons } from "./IncapacidadSelectionButtons";

interface ChatMessageProps {
  message: Message;
  index: number;
  totalMessages: number;
  isLastMessage: boolean;
  isTyping: boolean;
  renderers: any;
  onFeedback: (index: number, isLike: boolean) => void;
  onIncapacidadSelect?: (selection: "todas" | number) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  index,
  totalMessages,
  isLastMessage,
  isTyping,
  renderers,
  onFeedback,
  onIncapacidadSelect,
}) => {
  // Si es un mensaje del bot con contenido vacío y está en proceso de streaming, no lo mostramos
  if (message.isBot && message.content === "" && isTyping) {
    return null;
  }

  return (
    <div
      className={`flex 
        ${message.isBot ? "justify-start" : "justify-end"} 
      `}
    >
      <div className="flex items-start space-x-2 max-w-[80%]">
        {/* Avatar */}
        {message.isBot && (
          <div className="flex-shrink-0">
            <Bot className="h-6 w-6 text-prosalud-salud bg-gray-200 rounded-full p-1" />
          </div>
        )}

        <div
          className={`rounded-lg sm:max-w-lg lg:max-w-2xl p-3 ${
            message.isBot
              ? "bg-white text-gray-900 shadow-md dark:bg-gray-700 dark:text-gray-100"
              : "bg-prosalud-salud sm:max-w-lg lg:max-w-2xl text-white"
          } overflow-x-auto transition-all duration-300 ease-out ${
            isLastMessage ? "animate-fadeIn" : ""
          }`}
        >
          <div className="text-sm break-words markdown-content">
            {message.isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-prosalud-salud"></div>
                <span>{message.content}</span>
              </div>
            ) : (
              <ReactMarkdown components={renderers}>
                {String(message.content ?? "")}
              </ReactMarkdown>
            )}
          </div>

          {/* Botones de selección de incapacidad */}
          {message.incapacidadSelectionOptions && onIncapacidadSelect && (
            <IncapacidadSelectionButtons
              options={message.incapacidadSelectionOptions}
              onSelect={onIncapacidadSelect}
            />
          )}

          {/* Botones de rating para mensajes del bot */}
          {message.isBot && !message.isStreaming && message.content && (
            <div className="mt-2 flex items-center gap-1 border-t border-gray-200 dark:border-gray-600 pt-2">
              <button
                onClick={() => onFeedback(index, true)}
                className={`p-1 rounded transition-colors ${
                  message.rating === "like"
                    ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
                    : "text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                }`}
                title="Me gusta"
              >
                <ThumbsUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => onFeedback(index, false)}
                className={`p-1 rounded transition-colors ${
                  message.rating === "dislike"
                    ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
                    : "text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                }`}
                title="No me gusta"
              >
                <ThumbsDown className="h-3 w-3" />
              </button>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">
                ¿Te fue útil?
              </span>
            </div>
          )}

          {!message.isBot && isLastMessage && !isTyping && (
            <div className="mt-1 flex justify-end">
              <Check className="h-3 w-3 text-gray-300" />
            </div>
          )}
        </div>

        {/* Avatar para usuario */}
        {!message.isBot && (
          <div className="flex-shrink-0">
            <User className="h-6 w-6 text-white bg-prosalud-salud rounded-full p-1" />
          </div>
        )}
      </div>
    </div>
  );
};

