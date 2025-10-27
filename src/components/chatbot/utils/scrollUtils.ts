/**
 * Utilidades para el scroll del chatbot
 */

import { SCROLL_RETRY_DELAY, SCROLL_RETRY_ATTEMPTS } from "../constants/chatbotConstants";

/**
 * Hace scroll al final del contenedor de mensajes
 */
export const scrollToBottom = (messagesEndRef: React.RefObject<HTMLDivElement>) => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }
};

/**
 * Hace scroll al final con reintentos
 */
export const scrollToBottomWithRetry = (
  messagesEndRef: React.RefObject<HTMLDivElement>,
  attempts: number = SCROLL_RETRY_ATTEMPTS
) => {
  let retries = 0;
  const tryScroll = () => {
    if (messagesEndRef.current && retries < attempts) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      retries++;
      setTimeout(tryScroll, SCROLL_RETRY_DELAY);
    }
  };
  tryScroll();
};

/**
 * Detecta si el usuario está cerca del final del scroll
 */
export const isNearBottom = (
  containerRef: React.RefObject<HTMLDivElement>,
  threshold: number = 100
): boolean => {
  if (!containerRef.current) return true;
  
  const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
  return scrollHeight - scrollTop - clientHeight < threshold;
};

