export type Feedback = 'like' | 'dislike';

export interface ChatbotConversation {
  id: number;
  conversation_id: string | null;
  user_question: string;
  bot_answer: string;
  feedback: Feedback | null;
  user_ip: string | null;
  user_agent: string | null;
  metadata: Record<string, any> | null;
  created_at: string; // ISO
  updated_at: string; // ISO
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  from: number | null;
  last_page: number;
  links: { url: string | null; label: string; active: boolean }[];
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface CreateConversationRequest {
  user_question: string;
  bot_answer: string;
  conversation_id?: string;
  feedback?: Feedback;
  metadata?: Record<string, any>;
}

export interface ConversationFilters {
  conversation_id?: string;
  from_date?: string; // YYYY-MM-DD
  to_date?: string;   // YYYY-MM-DD
  q?: string;
  per_page?: number;
  page?: number;
}
