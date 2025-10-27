/**
 * Tipos y interfaces para el chatbot
 */

export interface IncapacidadSelectionOption {
  index: number;
  radicado: string;
  periodo: string;
  dias: string;
  estado: string;
  valor?: string;
}

export interface Message {
  role: string;
  content: string;
  isBot?: boolean;
  isLoading?: boolean;
  isStreaming?: boolean;
  tempId?: number;
  client_turn_id?: string;
  backend_id?: number;
  rating?: "like" | "dislike";
  tokens?: {
    input: number;
    output: number;
    cost: number;
  };
  multipleIncapacidades?: any[];
  incapacidadSelectionOptions?: IncapacidadSelectionOption[];
  [key: string]: any;
}

export interface ChatbotFormData {
  tipoDocumento: string;
  numeroDocumento: string;
  fechaExpedicion: string;
  radicado?: string;
}

