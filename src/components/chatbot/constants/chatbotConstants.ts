/**
 * Constantes y configuraciones del chatbot
 */

// Límites de entrada del usuario
export const MAX_CHARS = 500;
export const MAX_QUESTIONS_PER_REQUEST = 10;

// Rate limits
export const RATE_LIMITS = {
  messagesPerHour: 15,
  messagesPerDay: 50,
};

// Timeouts y duraciones
export const WELCOME_TOOLTIP_DURATION = 60000; // 60 segundos
export const TOOLTIP_ROTATION_INTERVAL = 5000; // 5 segundos
export const SCROLL_RETRY_DELAY = 100;
export const SCROLL_RETRY_ATTEMPTS = 5;

// Storage keys
export const CHATBOT_STORAGE_KEY = "prosalud-chatbot-state";
export const RATE_LIMIT_STORAGE_KEY = "chatbot_rate_limit";

// URLs y paths
export const AVATAR_URL = "/images/bot_avatar.webp";
export const CONTEXT_CONFIG_PATH = "/chatbot/contextConfig.json";

// Mensajes del tooltip rotativo
export const TOOLTIP_MESSAGES = [
  "¡Hola! Soy tu asistente virtual de ProSalud. ¿En qué puedo ayudarte hoy?",
  "Consulta el pago de una incapacidad aquí",
  "Consulta el estado de tu compensación final",
  "Puedo responder preguntas sobre incapacidades, servicios y más.",
  "Si tienes preguntas, no dudes en consultarme.",
  "¿Necesitas ayuda? Haz clic y hablamos.",
];

// Sugerencias predeterminadas
export const DEFAULT_SUGGESTIONS = [
  "¿Qué es ProSalud?",
  "Certificado de convenio sindical",
  "Información de contacto",
];

// Estimación de tokens (aproximación: ~2.5 caracteres = 1 token en español)
export const CHARS_PER_TOKEN = 2.5;

// Costos de API (Google Gemini 2.5 Flash)
export const API_COSTS = {
  inputTokenCost: 0.00001875, // Por 1K tokens
  outputTokenCost: 0.000075, // Por 1K tokens
};

