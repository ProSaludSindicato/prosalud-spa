/**
 * Hook para manejar la persistencia del estado del chatbot en localStorage
 */

import { useCallback } from "react";
import { Message, ConversationContext } from "../utils/categoryClassifier";
import { ConversationTokens, generateTokenReport } from "../utils/tokenCalculator";
import { CHATBOT_STORAGE_KEY } from "../constants/chatbotConstants";
import { generateConversationId } from "../utils/idGenerators";
import { logger } from "@/utils/logger";

interface ChatbotPersistedState {
  messages: Message[];
  conversationContext: ConversationContext;
  conversationId: string;
  hasContext: boolean;
  allPageContents: string;
  timestamp: number;
}

export const useChatbotPersistence = () => {
  /**
   * Carga el estado persistido desde localStorage
   */
  const loadPersistedState = useCallback((): ChatbotPersistedState | null => {
    try {
      const saved = localStorage.getItem(CHATBOT_STORAGE_KEY);
      if (saved) {
        const parsed: ChatbotPersistedState = JSON.parse(saved);
        logger.debug("Cargando estado persistido del chatbot");
        return parsed;
      }
    } catch (error) {
      logger.warn("Error cargando estado persistido del chatbot", error instanceof Error ? error.message : error);
      localStorage.removeItem(CHATBOT_STORAGE_KEY);
    }
    return null;
  }, []);

  /**
   * Guarda el estado actual en localStorage
   */
  const saveStateToStorage = useCallback(
    (
      messages: Message[],
      conversationContext: ConversationContext,
      conversationId: string,
      hasContext: boolean,
      allPageContents: string,
      conversationTokens: ConversationTokens
    ) => {
      try {
        const stateToSave: ChatbotPersistedState = {
          messages: messages.filter((msg) => msg.role !== "system"),
          conversationContext,
          conversationId,
          hasContext,
          allPageContents,
          timestamp: Date.now(),
        };
        localStorage.setItem(CHATBOT_STORAGE_KEY, JSON.stringify(stateToSave));
        logger.debug("Estado del chatbot guardado en localStorage");

        // Log de tokens acumulados
        if (conversationTokens.requestCount > 0) {
          logger.debug("Tokens acumulados en la conversación", generateTokenReport(conversationTokens));
        }
      } catch (error) {
        logger.warn("Error guardando estado del chatbot", error instanceof Error ? error.message : error);
      }
    },
    []
  );

  /**
   * Limpia el estado persistido
   */
  const clearPersistedState = useCallback((): string => {
    localStorage.removeItem(CHATBOT_STORAGE_KEY);
    logger.debug("Estado persistido del chatbot limpiado");
    // Generar nuevo conversation_id al limpiar
    return generateConversationId();
  }, []);

  return {
    loadPersistedState,
    saveStateToStorage,
    clearPersistedState,
  };
};

