import publicApi from './publicApi';
import { logger } from '@/utils/logger';

// Tipado laxo para evitar dependencias a tipos no presentes en el repo
type ChatbotConversation = any;
type PaginatedResponse<T> = any;
type CreateConversationRequest = any;
type ConversationFilters = any;

/**
 * Servicio para interactuar con el API de conversaciones del chatbot
 */
export const chatbotApi = {
  /**
   * Crea un nuevo registro de conversación (pregunta/respuesta)
   * Nota: Los errores se manejan silenciosamente para no afectar la UX del chatbot
   */
  async createConversation(data: CreateConversationRequest): Promise<ChatbotConversation | null> {
    try {
      const response = await publicApi.post<ChatbotConversation>(
        '/api/chatbot-conversations',
        data
      );
      return response.data;
    } catch (error: any) {
      // Log del error pero no interrumpir el flujo del chatbot
      logger.error('❌ Error guardando conversación del chatbot:', {
        error: error?.response?.data || error?.message || error,
        status: error?.response?.status,
        data: data
      });
      return null;
    }
  },

  /**
   * Lista conversaciones con filtros y paginación
   */
  async getConversations(
    filters?: ConversationFilters
  ): Promise<PaginatedResponse<ChatbotConversation>> {
    try {
      const response = await publicApi.get<PaginatedResponse<ChatbotConversation>>(
        '/api/chatbot-conversations',
        { params: filters }
      );
      return response.data;
    } catch (error: any) {
      logger.error('Error obteniendo conversaciones:', error);
      throw error;
    }
  },

  /**
   * Actualiza el feedback de una conversación existente por ID del backend
   */
  async updateFeedbackById(
    id: number,
    feedback: 'like' | 'dislike'
  ): Promise<ChatbotConversation | null> {
    try {
      const response = await publicApi.patch<ChatbotConversation>(
        `/api/chatbot-conversations/${id}/feedback`,
        { feedback }
      );
      logger.info(`✅ Feedback actualizado por id ${id}:`, feedback);
      return response.data;
    } catch (error: any) {
      logger.error('❌ Error actualizando feedback:', error);
      return null;
    }
  },

  /**
   * Actualiza el feedback usando el client_turn_id cuando no se dispone del id del backend
   */
  async updateFeedbackByClientTurnId(
    clientTurnId: string,
    feedback: 'like' | 'dislike'
  ): Promise<ChatbotConversation | null> {
    try {
      const response = await publicApi.patch<ChatbotConversation>(
        `/api/chatbot-conversations/client/${encodeURIComponent(clientTurnId)}/feedback`,
        { feedback }
      );
      logger.info(`✅ Feedback actualizado por client_turn_id ${clientTurnId}:`, feedback);
      return response.data;
    } catch (error: any) {
      logger.error('❌ Error actualizando feedback por client_turn_id:', error);
      return null;
    }
  },
};

