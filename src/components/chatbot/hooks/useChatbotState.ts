/**
 * Hook para gestionar el estado principal del chatbot
 */

import { useState, useRef } from "react";
import { Message, ConversationContext } from "../utils/categoryClassifier";
import { ConversationTokens } from "../utils/tokenCalculator";
import { generateConversationId } from "../utils/idGenerators";

export interface RateLimitInfo {
  messagesHour: number;
  messagesDay: number;
  showWarning: boolean;
  timeRemaining?: number; // minutos restantes hasta poder enviar de nuevo
}

export const useChatbotState = () => {
  // Estados de UI
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSuggestionsExpanded, setIsSuggestionsExpanded] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showChatbot, setShowChatbot] = useState(true);

  // Estados de formularios
  const [showIncapacidadForm, setShowIncapacidadForm] = useState(false);
  const [showLiquidacionForm, setShowLiquidacionForm] = useState(false);
  const [isConsultingIncapacidad, setIsConsultingIncapacidad] = useState(false);
  
  // Estado para incapacidades múltiples
  const [currentMultipleIncapacidades, setCurrentMultipleIncapacidades] = useState<any[] | null>(null);
  const [isConsultingLiquidacion, setIsConsultingLiquidacion] = useState(false);

  // Estados de mensajes e input
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [userMessageCount, setUserMessageCount] = useState(0);

  // Estados de contexto y especialidad
  const [specialty, setSpecialty] = useState("");
  const [hasContext, setHasContext] = useState(false);
  const [indications, setIndications] = useState("");
  const [allPageContents, setAllPageContents] = useState("");
  const [locale, setLocale] = useState("");

  // Estados de sugerencias y tooltips
  const [showSpellCheckSuggestions, setShowSpellCheckSuggestions] = useState(false);
  const [suggestionsHeight, setSuggestionsHeight] = useState(0);
  const [showWelcomeTooltip, setShowWelcomeTooltip] = useState(true);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [currentTooltipMessage, setCurrentTooltipMessage] = useState(0);
  const [typingDots, setTypingDots] = useState(1);

  // Estados de scroll
  const [autoScroll, setAutoScroll] = useState(true);

  // Estados de contexto conversacional
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    lastCategory: null,
    lastContextFiles: [],
    questionCount: 0,
  });

  // Estados de tracking
  const [conversationId, setConversationId] = useState<string>(() => generateConversationId());
  
  const [conversationTokens, setConversationTokens] = useState<ConversationTokens>({
    totalInput: 0,
    totalOutput: 0,
    totalCost: 0,
    requestCount: 0,
  });

  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>({
    messagesHour: 0,
    messagesDay: 0,
    showWarning: false,
  });

  // Referencias
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const suggestionsContentRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  return {
    // Estados
    isOpen,
    setIsOpen,
    isFullscreen,
    setIsFullscreen,
    isTyping,
    setIsTyping,
    showSuggestions,
    setShowSuggestions,
    isSuggestionsExpanded,
    setIsSuggestionsExpanded,
    showQuickActions,
    setShowQuickActions,
    showScrollButton,
    setShowScrollButton,
    showChatbot,
    setShowChatbot,
    showIncapacidadForm,
    setShowIncapacidadForm,
    showLiquidacionForm,
    setShowLiquidacionForm,
    isConsultingIncapacidad,
    setIsConsultingIncapacidad,
    currentMultipleIncapacidades,
    setCurrentMultipleIncapacidades,
    isConsultingLiquidacion,
    setIsConsultingLiquidacion,
    messages,
    setMessages,
    inputMessage,
    setInputMessage,
    userMessageCount,
    setUserMessageCount,
    specialty,
    setSpecialty,
    hasContext,
    setHasContext,
    indications,
    setIndications,
    allPageContents,
    setAllPageContents,
    locale,
    setLocale,
    showSpellCheckSuggestions,
    setShowSpellCheckSuggestions,
    suggestionsHeight,
    setSuggestionsHeight,
    showWelcomeTooltip,
    setShowWelcomeTooltip,
    isTooltipOpen,
    setIsTooltipOpen,
    currentTooltipMessage,
    setCurrentTooltipMessage,
    typingDots,
    setTypingDots,
    autoScroll,
    setAutoScroll,
    conversationContext,
    setConversationContext,
    conversationId,
    setConversationId,
    conversationTokens,
    setConversationTokens,
    rateLimitInfo,
    setRateLimitInfo,

    // Referencias
    messagesEndRef,
    formContainerRef,
    textareaRef,
    suggestionsRef,
    suggestionsContentRef,
    chatContainerRef,
  };
};

