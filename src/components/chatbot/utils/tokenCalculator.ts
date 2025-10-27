/**
 * Calculadora de tokens y costos
 */

import { CHARS_PER_TOKEN, API_COSTS } from "../constants/chatbotConstants";

export interface TokenUsage {
  input: number;
  output: number;
  cost: number;
}

export interface ConversationTokens {
  totalInput: number;
  totalOutput: number;
  totalCost: number;
  requestCount: number;
}

/**
 * Estima la cantidad de tokens para un texto
 * Aproximación: ~2.5 caracteres = 1 token en español
 */
export const estimateTokens = (text: string | any): number => {
  if (typeof text !== "string") {
    text = JSON.stringify(text);
  }
  return Math.ceil(text.length / CHARS_PER_TOKEN);
};

/**
 * Calcula el costo estimado de tokens
 */
export const calculateTokenCost = (
  inputTokens: number,
  outputTokens: number
): number => {
  const inputCost = (inputTokens / 1000) * API_COSTS.inputTokenCost;
  const outputCost = (outputTokens / 1000) * API_COSTS.outputTokenCost;
  return inputCost + outputCost;
};

/**
 * Actualiza el tracking de tokens acumulados
 */
export const updateConversationTokens = (
  current: ConversationTokens,
  usage: TokenUsage
): ConversationTokens => {
  return {
    totalInput: current.totalInput + usage.input,
    totalOutput: current.totalOutput + usage.output,
    totalCost: current.totalCost + usage.cost,
    requestCount: current.requestCount + 1,
  };
};

/**
 * Genera un reporte de tokens para logging
 */
export const generateTokenReport = (tokens: ConversationTokens) => {
  return {
    "Total requests": tokens.requestCount,
    "Tokens de entrada (contexto)": tokens.totalInput.toLocaleString(),
    "Tokens de salida (respuestas)": tokens.totalOutput.toLocaleString(),
    "Tokens totales": (tokens.totalInput + tokens.totalOutput).toLocaleString(),
    "Costo aproximado (USD)": `$${tokens.totalCost.toFixed(4)}`,
  };
};

