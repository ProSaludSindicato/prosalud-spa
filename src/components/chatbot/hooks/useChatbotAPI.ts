/**
 * Hook para manejar las llamadas a la API del chatbot
 */

import { useCallback } from "react";
import { Message } from "../utils/categoryClassifier";
import { RateLimitInfo } from "./useChatbotState";
import { RATE_LIMITS, RATE_LIMIT_STORAGE_KEY } from "../constants/chatbotConstants";

export const useChatbotAPI = () => {
  /**
   * Solicita una respuesta de la API de OpenAI
   */
  const solicitarRespuestaConOpenAI = useCallback(async (messages: Message[]) => {
    try {
      console.log("🚀 Iniciando llamada a Lovable AI con mensajes:", messages.length);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prosalud-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages }),
        }
      );

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      // Leer el contenido primero
      const responseText = await response.text();
      console.log("Response raw text:", responseText);

      if (!response.ok) {
        // Usar mensaje genérico sin exponer detalles técnicos
        let errorMessage = "Error del servidor";
        let isRateLimitError = false;
        try {
          const errorData = JSON.parse(responseText);
          // Solo usar mensajes de error seguros y genéricos
          if (errorData.error && typeof errorData.error === "string") {
            // Solo permitir mensajes de error específicos y seguros
            if (
              errorData.error.includes("rate limit") ||
              errorData.error.includes("Rate limit")
            ) {
              errorMessage = "Demasiadas solicitudes. Por favor, espera un momento.";
            } else {
              errorMessage = "Error del servidor";
            }
          }

          // Manejar rate limit específicamente
          if (response.status === 429 && errorData.rateLimitExceeded) {
            isRateLimitError = true;
          }
        } catch (e) {
          // Si no se puede parsear, usar mensaje genérico
        }

        console.error("Response no OK:", response.status, errorMessage);

        // Lanzar error con código de estado y flag de rate limit
        const error: any = new Error(errorMessage);
        error.status = response.status;
        error.isRateLimit = isRateLimitError;
        throw error;
      }

      if (!responseText || responseText.trim() === "") {
        throw new Error("Error del servidor");
      }

      // Intentar parsear como JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parseando respuesta JSON:", parseError);
        throw new Error("Error del servidor");
      }

      if (!data || !data.generatedText) {
        throw new Error("Error del servidor");
      }

      return {
        text: data.generatedText,
        usageInfo: data.usageInfo || null,
      };
    } catch (error) {
      console.error("❌ Error en llamada a OpenAI:", error);
      throw error;
    }
  }, []);

  /**
   * Guarda una conversación en el backend
   */
  const saveConversationToBackend = useCallback(async (payload: any) => {
    try {
      const { chatbotApi } = await import("@/services/chatbotApi");
      const created = await chatbotApi.createConversation(payload);
      return created; // puede ser null si falla
    } catch (error) {
      console.error("⚠️ Error guardando conversación (no afecta funcionamiento):", error);
      return null;
    }
  }, []);

  /**
   * Actualiza el rating de un mensaje en el backend
   */
  const updateBackendRating = useCallback(async (backendId: number, rating: string) => {
    try {
      const { chatbotApi } = await import("@/services/chatbotApi");
      await chatbotApi.updateFeedbackById(backendId, rating as 'like' | 'dislike');
      console.log(`✅ Rating actualizado en backend: ${rating}`);
    } catch (error) {
      console.error("⚠️ Error actualizando rating (no afecta funcionamiento):", error);
    }
  }, []);

  /**
   * Actualiza el rating usando client_turn_id cuando no hay backend_id
   */
  const updateBackendRatingByClientTurnId = useCallback(async (clientTurnId: string, rating: string) => {
    try {
      const { chatbotApi } = await import("@/services/chatbotApi");
      await chatbotApi.updateFeedbackByClientTurnId(clientTurnId, rating as 'like' | 'dislike');
      console.log(`✅ Rating actualizado por client_turn_id: ${rating}`);
    } catch (error) {
      console.error("⚠️ Error actualizando rating por client_turn_id (no afecta funcionamiento):", error);
    }
  }, []);

  /**
   * Verifica el rate limit
   */
  const checkRateLimit = useCallback(
    (
      inputText: string,
      rateLimitInfo: RateLimitInfo,
      setRateLimitInfo: (info: RateLimitInfo) => void
    ): { exceeded: boolean; message?: string } => {
      const { messagesHour, messagesDay } = rateLimitInfo;

      if (
        messagesHour >= RATE_LIMITS.messagesPerHour ||
        messagesDay >= RATE_LIMITS.messagesPerDay
      ) {
        const now = Date.now();
        const oneHourMs = 60 * 60 * 1000;
        const rateLimitStorage = JSON.parse(
          localStorage.getItem(RATE_LIMIT_STORAGE_KEY) || "{}"
        );
        const firstMessageTime = rateLimitStorage.firstMessageTime || now;
        const timeElapsed = now - firstMessageTime;
        const timeRemaining = oneHourMs - timeElapsed;
        const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));

        return {
          exceeded: true,
          message: `⚠️ Has alcanzado el límite de ${RATE_LIMITS.messagesPerHour} mensajes por hora. Intenta de nuevo en aproximadamente ${minutesRemaining} minutos.`,
        };
      }

      return { exceeded: false };
    },
    []
  );

  return {
    solicitarRespuestaConOpenAI,
    saveConversationToBackend,
    updateBackendRating,
    updateBackendRatingByClientTurnId,
    checkRateLimit,
  };
};

