/**
 * Generadores de IDs únicos para el chatbot
 */

/**
 * Genera un ID único para una conversación
 */
export const generateConversationId = (): string => {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Genera un ID único para un turno de cliente
 */
export const generateClientTurnId = (): string => {
  return `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

