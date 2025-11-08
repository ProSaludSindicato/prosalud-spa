/**
 * Utilidad para exportar conversaciones del chatbot
 * TEMPORAL: Para propósitos de desarrollo y análisis
 */

import { Message } from "./categoryClassifier";
import { ConversationTokens } from "./tokenCalculator";
import { logger } from "@/utils/logger";

/**
 * Exporta la conversación a un archivo de texto
 */
export const exportConversation = (
  messages: Message[],
  conversationTokens: ConversationTokens
) => {
  const timestamp = new Date().toISOString();
  let exportText = `=== REPORTE DE CONVERSACIÓN CHATBOT PROSALUD ===\n`;
  exportText += `Fecha de exportación: ${new Date().toLocaleString("es-CO")}\n`;
  exportText += `Total de mensajes: ${messages.length}\n`;
  exportText += `\n--- MÉTRICAS DE LA CONVERSACIÓN ---\n`;
  exportText += `Tokens totales de entrada: ${conversationTokens.totalInput.toLocaleString()}\n`;
  exportText += `Tokens totales de salida: ${conversationTokens.totalOutput.toLocaleString()}\n`;
  exportText += `Tokens totales: ${(conversationTokens.totalInput + conversationTokens.totalOutput).toLocaleString()}\n`;
  exportText += `Total de requests: ${conversationTokens.requestCount}\n`;
  exportText += `Costo total aproximado: $${conversationTokens.totalCost.toFixed(6)} USD\n`;
  exportText += `\n--- CONVERSACIÓN ---\n\n`;

  // Agrupar mensajes por pares de pregunta-respuesta
  let questionNumber = 0;
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    if (message.role === "user") {
      questionNumber++;
      exportText += `\n[PREGUNTA #${questionNumber}]\n`;
      exportText += `Usuario: ${message.content}\n`;

      // Buscar la respuesta correspondiente del bot
      if (i + 1 < messages.length && messages[i + 1].isBot) {
        const botResponse = messages[i + 1];
        exportText += `\nAsistente: ${botResponse.content}\n`;

        // Agregar métricas por pregunta si están disponibles
        if (botResponse.tokens) {
          exportText += `\n--- Métricas de esta pregunta ---\n`;
          exportText += `Tokens de contexto (entrada): ${botResponse.tokens.input.toLocaleString()}\n`;
          exportText += `Tokens de respuesta (salida): ${botResponse.tokens.output.toLocaleString()}\n`;
          exportText += `Total tokens: ${(botResponse.tokens.input + botResponse.tokens.output).toLocaleString()}\n`;
          exportText += `Costo aproximado: $${botResponse.tokens.cost.toFixed(6)} USD\n`;
        }

        // Agregar rating si está disponible
        if (botResponse.rating) {
          exportText += `Calificación del usuario: ${botResponse.rating === "like" ? "👍 Me gusta" : "👎 No me gusta"}\n`;
        }

        exportText += `\n${"-".repeat(80)}\n`;
        i++; // Saltar el siguiente mensaje ya que lo procesamos
      }
    }
  }

  exportText += `\n\n=== RESUMEN FINAL ===\n`;
  exportText += `Total de preguntas: ${questionNumber}\n`;
  exportText += `Costo total aproximado: $${conversationTokens.totalCost.toFixed(6)} USD\n`;
  exportText += `\nNOTA: Los costos son aproximados y basados en el modelo google/gemini-2.5-flash\n`;
  exportText += `Tasa estimada: Input $0.00001875/1K tokens, Output $0.000075/1K tokens\n`;

  const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chatbot-conversacion-${timestamp.split("T")[0]}-${timestamp.split("T")[1].split(".")[0].replace(/:/g, "-")}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  logger.info("📥 Conversación exportada exitosamente");
};

