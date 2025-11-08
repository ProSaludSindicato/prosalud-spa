/**
 * Clasificador de categorías del chatbot
 * Clasifica las preguntas del usuario en categorías temáticas
 */

import {
  CATEGORY_KEYWORDS,
  FOLLOW_UP_INDICATORS,
  CONTEXTUAL_WORDS,
  CategoryType,
} from "../constants/categoryKeywords";

export interface ConversationContext {
  lastCategory: CategoryType | null;
  lastContextFiles: string[];
  questionCount: number;
}

export interface Message {
  role: string;
  content: string;
  isBot?: boolean;
  [key: string]: any;
}

/**
 * Clasifica una pregunta en una categoría temática
 */
export const classifyQuestion = (
  question: string,
  history: Message[] = [],
  conversationContext: ConversationContext
): CategoryType => {
  const questionLower = question.toLowerCase().trim();
  
  // Asegurar que history sea un array válido
  const safeHistory = Array.isArray(history) ? history : [];

  // Detectar si es una pregunta de seguimiento
  const hasFollowUpIndicator = FOLLOW_UP_INDICATORS.some((indicator) =>
    questionLower.includes(indicator)
  );

  // Si es una pregunta de seguimiento y hay contexto previo, usar la categoría anterior
  if (
    hasFollowUpIndicator &&
    conversationContext.lastCategory &&
    safeHistory.length > 0
  ) {
    return conversationContext.lastCategory;
  }

  // Buscar coincidencias directas en cada categoría
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const hasMatch = keywords.some((keyword) =>
      questionLower.includes(keyword.toLowerCase())
    );
    if (hasMatch) {
      return category as CategoryType;
    }
  }

  // Si no hay coincidencia directa pero hay contexto previo, considerar la categoría anterior
  if (conversationContext.lastCategory && safeHistory.length > 0) {
    // Verificar si la pregunta podría estar relacionada con el contexto previo
    const hasContextualReference = CONTEXTUAL_WORDS.some((word) =>
      questionLower.includes(word)
    );

    if (hasContextualReference) {
      return conversationContext.lastCategory;
    }
  }

  return "general";
};

