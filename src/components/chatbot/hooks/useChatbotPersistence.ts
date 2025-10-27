/**
 * Hook para manejar la persistencia del estado del chatbot en localStorage
 */

import { useCallback } from "react";
import { Message, ConversationContext } from "../utils/categoryClassifier";
import { ConversationTokens, generateTokenReport } from "../utils/tokenCalculator";
import { CHATBOT_STORAGE_KEY } from "../constants/chatbotConstants";
import { generateConversationId } from "../utils/idGenerators";

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
        console.log("📥 Cargando estado persistido del chatbot:", parsed);
        return parsed;
      }
    } catch (error) {
      console.warn("⚠️ Error cargando estado persistido:", error);
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
        console.log("💾 Estado del chatbot guardado");

        // Log de tokens acumulados
        if (conversationTokens.requestCount > 0) {
          console.log("📊 TOKENS ACUMULADOS EN LA CONVERSACIÓN:", generateTokenReport(conversationTokens));
        }
      } catch (error) {
        console.warn("⚠️ Error guardando estado:", error);
      }
    },
    []
  );

  /**
   * Limpia el estado persistido
   */
  const clearPersistedState = useCallback((): string => {
    localStorage.removeItem(CHATBOT_STORAGE_KEY);
    console.log("🗑️ Estado persistido limpiado");
    // Generar nuevo conversation_id al limpiar
    return generateConversationId();
  }, []);

  return {
    loadPersistedState,
    saveStateToStorage,
    clearPersistedState,
  };
};

