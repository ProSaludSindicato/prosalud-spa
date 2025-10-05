import publicApi from './publicApi';
import { 
  ChatbotConversation, 
  PaginatedResponse, 
  CreateConversationRequest,
  ConversationFilters 
} from '@/types/chatbot';

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
      console.log('✅ Conversación guardada exitosamente:', response.data.id);
      return response.data;
    } catch (error: any) {
      // Log del error pero no interrumpir el flujo del chatbot
      console.error('❌ Error guardando conversación del chatbot:', {
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
      console.error('Error obteniendo conversaciones:', error);
      throw error;
    }
  },

  /**
   * Actualiza el feedback de una conversación existente
   */
  async updateFeedback(
    conversationId: number, 
    feedback: 'like' | 'dislike'
  ): Promise<ChatbotConversation | null> {
    try {
      const response = await publicApi.patch<ChatbotConversation>(
        `/api/chatbot-conversations/${conversationId}`,
        { feedback }
      );
      console.log(`✅ Feedback actualizado para conversación ${conversationId}:`, feedback);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error actualizando feedback:', error);
      return null;
    }
  }
};
