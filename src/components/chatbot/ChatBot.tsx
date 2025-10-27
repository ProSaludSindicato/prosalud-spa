/**
 * Componente principal del Chatbot refactorizado
 * Sigue principios SOLID y buenas prácticas de React
 */

"use client";

import React, { useEffect, useCallback } from "react";
import { MessageSquare, X, Bot } from "lucide-react";
import SyntaxHighlighter from "react-syntax-highlighter/dist/cjs/light";
import js from "react-syntax-highlighter/dist/cjs/languages/hljs/javascript";
import json from "react-syntax-highlighter/dist/cjs/languages/hljs/json";
import php from "react-syntax-highlighter/dist/cjs/languages/hljs/php";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Importar validadores
import {
  isValidUserInput,
  getSecurityMessage,
  getGreetingResponse,
  getThankYouResponse,
  getFarewellResponse,
} from "@/utils/inputValidator";

// Importar formularios
import IncapacidadForm from "./IncapacidadForm";
import LiquidacionForm from "./LiquidacionForm";

// Importar servicios
import { consultarIncapacidad } from "@/services/incapacidadService";
import { consultarLiquidacion } from "@/services/liquidacionService";

// Importar hooks
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatbotState } from "./hooks/useChatbotState";
import { useChatbotPersistence } from "./hooks/useChatbotPersistence";
import { useChatbotAPI } from "./hooks/useChatbotAPI";

// Importar tipos
import { Message, ChatbotFormData } from "./types/chatbot.types";
import { ConsultaIncapacidadRequest } from "@/services/incapacidadService";
import { ConsultaLiquidacionRequest } from "@/services/liquidacionService";

// Importar utilidades
import { classifyQuestion } from "./utils/categoryClassifier";
import { loadSelectiveContext, importContext } from "./utils/contextLoader";
import { estimateTokens, calculateTokenCost, updateConversationTokens } from "./utils/tokenCalculator";
import {
  generateNoDataResponse,
  generateServerErrorResponse,
  generateValidationErrorResponse,
  generateGenericErrorResponse,
  generateMultipleIncapacidadesResponse,
  generateIncapacidadResponse,
  generateLiquidacionNoDataResponse,
  generateLiquidacionResponse,
  formatIncapacidadesContext,
} from "./utils/responseGenerators";
import { buildSystemPrompt } from "./utils/promptBuilder";
import { scrollToBottom, scrollToBottomWithRetry, isNearBottom } from "./utils/scrollUtils";
import { exportConversation } from "./utils/exportConversation";
import { generateClientTurnId } from "./utils/idGenerators";

// Importar constantes
import {
  MAX_CHARS,
  MAX_QUESTIONS_PER_REQUEST,
  TOOLTIP_MESSAGES,
  DEFAULT_SUGGESTIONS,
  WELCOME_TOOLTIP_DURATION,
  TOOLTIP_ROTATION_INTERVAL,
} from "./constants/chatbotConstants";

// Importar componentes UI
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { QuickActions } from "./components/QuickActions";
import { SuggestionsPanel } from "./components/SuggestionsPanel";
import { RateLimitWarning } from "./components/RateLimitWarning";
import { TypingIndicator } from "./components/TypingIndicator";
import { ScrollToBottomButton } from "./components/ScrollToBottomButton";
import { markdownRenderers } from "./components/MarkdownRenderers";

// Registrar lenguajes para syntax highlighting
SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("php", php);

export default function ChatBot() {
  // Usar el hook de estado centralizado
  const state = useChatbotState();
  
  // Usar hooks de persistencia y API
  const { loadPersistedState, saveStateToStorage, clearPersistedState } = useChatbotPersistence();
  const { solicitarRespuestaConOpenAI, saveConversationToBackend, updateBackendRating, updateBackendRatingByClientTurnId, checkRateLimit } = useChatbotAPI();

  // Determinar si es móvil y el ancho del chat
  const isMobile = useIsMobile();
  const chatWidth = isMobile ? "w-80" : "w-[28rem]"; // Aumentado de w-96 (24rem) a w-[28rem]

  /**
   * Inicializa los mensajes del chat
   */
  const initializeMessages = useCallback(() => {
      const initialMessage = {
        role: "assistant",
        content: "¡Hola! Soy tu asistente de ProSalud. ¿Cómo puedo ayudarte hoy?",
        isBot: true,
      };

      state.setMessages([initialMessage]);
    },
    [state]
  );

  /**
   * Extrae la especialidad desde la URL
   */
  const extractSpecialtyFromURL = useCallback(() => {
    return {
      specialty: "general",
      specialtyPart: "general",
    };
  }, []);

  /**
   * Reinicia el chat
   */
  const resetChat = useCallback(
    async () => {
      try {
        state.setInputMessage("");
        state.setIsTyping(false);
        state.setShowSuggestions(true);
        state.setIsSuggestionsExpanded(false);
        state.setHasContext(false);

        // Reiniciar contexto conversacional
        state.setConversationContext({
          lastCategory: null,
          lastContextFiles: [],
          questionCount: 0,
        });

        // Limpiar estado persistido y generar nuevo ID de conversación
        const newConversationId = clearPersistedState();
        state.setConversationId(newConversationId);

        console.log("🔄 Contexto conversacional reiniciado");
      } catch (error) {
        console.error("Error generating initial message:", error);
        state.setMessages([
          {
            role: "assistant",
            content: "¡Hola! Soy tu asistente de ProSalud. ¿Cómo puedo ayudarte hoy?",
            isBot: true,
          },
        ]);
      }
    },
    [state, clearPersistedState]
  );

  /**
   * Inicializa el chat
   */
  const initializeChat = useCallback(async () => {
    // Intentar cargar estado persistido primero
    const persistedState = loadPersistedState();

    if (persistedState) {
      console.log("✅ Estado del chatbot restaurado desde localStorage");
      
      // Restaurar estados desde el estado persistido
      const filteredMessages = persistedState.messages.filter((msg) => msg.role !== "system");
      state.setMessages(filteredMessages);
      state.setConversationContext(persistedState.conversationContext);
      state.setConversationId(persistedState.conversationId);
      state.setHasContext(persistedState.hasContext);
      state.setAllPageContents(persistedState.allPageContents);
      
      return; // Si hay estado persistido, no inicializar desde cero
    }

        // Si no hay estado persistido, inicializar normalmente
    const newSpecialty = extractSpecialtyFromURL();
    const context = await importContext(newSpecialty.specialtyPart);

    const docs = context.docs;

    state.setAllPageContents(docs);
    state.setIndications(docs);
    state.setHasContext(true);

    await resetChat();
    state.setLocale("es");
    initializeMessages();
  }, [loadPersistedState, state, extractSpecialtyFromURL, resetChat, initializeMessages]);

  /**
   * Inicia una nueva conversación
   */
  const startNewChat = useCallback(async () => {
    await resetChat();
    initializeMessages();
  }, [resetChat, initializeMessages]);

  /**
   * Maneja el envío de mensajes
   */
  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      console.log("🚀 handleSendMessage called", { text: state.inputMessage.trim(), isTyping: state.isTyping });

      const text = state.inputMessage.trim();
      if (!text || state.isTyping) {
        console.log("❌ Early return:", { text, isTyping: state.isTyping });
        return;
      }

      // Incrementar contador de mensajes del usuario
      state.setUserMessageCount((prev) => prev + 1);

      // Validación de seguridad
      const validation = isValidUserInput(text);

      // Manejar saludos sin consumir API
      if (validation.isGreeting) {
        const greetingResponse = {
          role: "assistant",
          content: getGreetingResponse(),
          isBot: true,
        };

        const userMessage = {
          role: "user",
          content: text,
          isBot: false,
        };

        state.setMessages((prev: Message[]) => [...prev, userMessage, greetingResponse]);
        state.setInputMessage("");
        state.setIsSuggestionsExpanded(false);

        // Guardar saludo en backend
        saveConversationToBackend({
          conversation_id: state.conversationId,
          user_question: text,
          bot_answer: greetingResponse.content,
          metadata: { type: "greeting" },
        });

        if (state.textareaRef.current) {
          state.textareaRef.current.style.height = "auto";
        }
        return;
      }

      // Manejar agradecimientos sin consumir API
      if (validation.isThankYou) {
        const thankYouResponse = {
          role: "assistant",
          content: getThankYouResponse(),
          isBot: true,
        };

        const userMessage = {
          role: "user",
          content: text,
          isBot: false,
        };

        state.setMessages((prev: Message[]) => [...prev, userMessage, thankYouResponse]);
        state.setInputMessage("");
        state.setIsSuggestionsExpanded(false);

        saveConversationToBackend({
          conversation_id: state.conversationId,
          user_question: text,
          bot_answer: thankYouResponse.content,
          metadata: { type: "thank_you" },
        });

        if (state.textareaRef.current) {
          state.textareaRef.current.style.height = "auto";
        }
        return;
      }

      // Manejar despedidas sin consumir API
      if (validation.isFarewell) {
        const farewellResponse = {
          role: "assistant",
          content: getFarewellResponse(),
          isBot: true,
        };

        const userMessage = {
          role: "user",
          content: text,
          isBot: false,
        };

        state.setMessages((prev: Message[]) => [...prev, userMessage, farewellResponse]);
        state.setInputMessage("");
        state.setIsSuggestionsExpanded(false);

        saveConversationToBackend({
          conversation_id: state.conversationId,
          user_question: text,
          bot_answer: farewellResponse.content,
          metadata: { type: "farewell" },
        });

        if (state.textareaRef.current) {
          state.textareaRef.current.style.height = "auto";
        }
        return;
      }

      if (!validation.isValid) {
        // Verificar rate limit
        const rateLimitCheck = checkRateLimit(text, state.rateLimitInfo, state.setRateLimitInfo);

        if (rateLimitCheck.exceeded) {
          const rateLimitMessage = {
            role: "assistant",
            content: rateLimitCheck.message!,
            isBot: true,
          };

          const userMessage = {
            role: "user",
            content: text,
            isBot: false,
          };

          state.setMessages((prev: Message[]) => [...prev, userMessage, rateLimitMessage]);
          state.setInputMessage("");
          state.setIsSuggestionsExpanded(false);

          if (state.textareaRef.current) {
            state.textareaRef.current.style.height = "auto";
          }
          return;
        }

        // Mostrar mensaje de seguridad
        const securityMessage = {
          role: "assistant",
          content: getSecurityMessage(validation.reason),
          isBot: true,
        };

        const userMessage = {
          role: "user",
          content: text,
          isBot: false,
        };

        state.setMessages((prev: Message[]) => [...prev, userMessage, securityMessage]);
        state.setInputMessage("");
        state.setIsSuggestionsExpanded(false);

        saveConversationToBackend({
          conversation_id: state.conversationId,
          user_question: text,
          bot_answer: securityMessage.content,
          metadata: {
            type: "security_warning",
            reason: validation.reason,
          },
        });

        if (state.textareaRef.current) {
          state.textareaRef.current.style.height = "auto";
        }
        return;
      }

      // Validación de límite de preguntas
      const match = text.match(/dame\s+(\d+)\s+preguntas?/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > MAX_QUESTIONS_PER_REQUEST) {
          const warning = {
            role: "assistant",
            content: `Lo siento, puedo generar hasta ${MAX_QUESTIONS_PER_REQUEST} ítems (preguntas, recomendaciones, pasos, etc.) a la vez. ¿Podrías solicitar un número menor o acotar tu petición?`,
            isBot: true,
          };
          state.setMessages((prev: Message[]) => [
            ...prev,
            { role: "user", content: text, isBot: false },
            warning,
          ]);
          state.setInputMessage("");
          return;
        }
      }

      const newMessage = {
        role: "user",
        content: state.inputMessage.replace(/\n$/, ""),
        isBot: false,
      };

      let chatMessages: Message[] = [];

      state.setMessages((prevMessages: Message[]) => {
        chatMessages = [...prevMessages, newMessage];
        return chatMessages;
      });
      
      state.setInputMessage("");
      state.setIsSuggestionsExpanded(false);
      state.setHasContext(true);
      state.setIsTyping(true);

      if (state.textareaRef.current) {
        state.textareaRef.current.style.height = "auto";
      }

      try {
        // Si hay incapacidades múltiples en el estado, verificar si el usuario está seleccionando una
        if (state.currentMultipleIncapacidades && state.currentMultipleIncapacidades.length > 0) {
          const incapacidades = state.currentMultipleIncapacidades;
          const userSelection = text.trim().toLowerCase();
          
          // Verificar si es una selección por número (1, 2, 3, etc.)
          const numberMatch = userSelection.match(/^(\d+)$/);
          if (numberMatch) {
            const selectedIndex = parseInt(numberMatch[1]) - 1;
            if (selectedIndex >= 0 && selectedIndex < incapacidades.length) {
              // Usuario seleccionó una incapacidad por número
              const selectedIncapacidad = incapacidades[selectedIndex];
              const responseMessage = {
                role: "assistant",
                content: generateIncapacidadResponse(selectedIncapacidad),
                isBot: true,
              };
              
              state.setMessages((prev: Message[]) => [...prev, responseMessage]);
              state.setIsTyping(false);
              scrollToBottomWithRetry(state.messagesEndRef);
              return;
            }
          }
          
          // Verificar si es una selección por radicado
          const radicadoMatch = incapacidades.find(inc => 
            inc["N° Radicado"] && inc["N° Radicado"].toString().toLowerCase().includes(userSelection)
          );
          if (radicadoMatch) {
            // Usuario seleccionó una incapacidad por radicado
            const responseMessage = {
              role: "assistant",
              content: generateIncapacidadResponse(radicadoMatch),
              isBot: true,
            };
            
            state.setMessages((prev: Message[]) => [...prev, responseMessage]);
            state.setIsTyping(false);
            scrollToBottomWithRetry(state.messagesEndRef);
            return;
          }
          
          // Verificar si quiere ver todas
          if (userSelection === "todas") {
            let allIncapacidadesResponse = `📋 **Detalle completo de todas tus incapacidades**\n\n`;
            
            incapacidades.forEach((inc, index) => {
              allIncapacidadesResponse += generateIncapacidadResponse(inc, true, false);
              if (index < incapacidades.length - 1) {
                allIncapacidadesResponse += "\n---\n\n";
              }
            });
            
            allIncapacidadesResponse += `\n**🔒 Nota:** Esta información es confidencial y solo visible para ti.`;
            
            const responseMessage = {
              role: "assistant",
              content: allIncapacidadesResponse,
              isBot: true,
            };
            
            state.setMessages((prev: Message[]) => [...prev, responseMessage]);
            state.setIsTyping(false);
            scrollToBottomWithRetry(state.messagesEndRef);
            return;
          }
        }

        // Clasificar pregunta y cargar contexto selectivo
        console.log("🔍 Iniciando clasificación temática para:", text);
        const safeChatMessages = chatMessages || [];
        const detectedCategory = classifyQuestion(text, safeChatMessages, state.conversationContext);
        const selectiveContext = await loadSelectiveContext(detectedCategory);

        // Actualizar contexto conversacional
        state.setConversationContext((prev) => ({
          lastCategory: detectedCategory,
          lastContextFiles: prev.lastContextFiles,
          questionCount: prev.questionCount + 1,
        }));

        console.log(`📄 Contexto selectivo cargado: ${selectiveContext.length} caracteres`);
        console.log(`💡 Categoría detectada: ${detectedCategory}`);

        // Preparar contexto de incapacidades para el prompt
        let incapacidadesInfo = "";
        if (state.currentMultipleIncapacidades && state.currentMultipleIncapacidades.length > 0) {
          incapacidadesInfo = formatIncapacidadesContext(state.currentMultipleIncapacidades);
        }

        // Construir prompt dinámico del sistema
        const dynamicSystemPrompt = buildSystemPrompt(
          detectedCategory,
          selectiveContext,
          state.conversationContext,
          incapacidadesInfo
        );

        // Insertar mensaje dinámico del sistema justo antes de la pregunta
        const promptMessages = [
          { role: "system", content: dynamicSystemPrompt, isBot: true },
          ...chatMessages.slice(-8), // Últimos 8 mensajes para contexto
        ];

        console.log(`🚀 Enviando ${promptMessages.length} mensajes a OpenAI`);

        // Agregar mensaje temporal con animación de escritura
        const tempBotMessageId = Date.now();
        state.setMessages((prev: Message[]) => [
          ...prev,
          {
            role: "assistant",
            content: "",
            isBot: true,
            isStreaming: true,
            tempId: tempBotMessageId,
          },
        ]);

        // Llamar a la API
        const result = await solicitarRespuestaConOpenAI(promptMessages);

        // Validar que la respuesta tenga contenido
        if (!result || !result.text) {
          console.error("❌ Respuesta vacía del servidor");
          throw new Error("Error del servidor");
        }

        const botResponse = result.text;

        // Calcular tokens y costos
        const inputTokens = result.usageInfo?.input_tokens || estimateTokens(JSON.stringify(promptMessages));
        const outputTokens = result.usageInfo?.output_tokens || estimateTokens(botResponse);
        const cost = calculateTokenCost(inputTokens, outputTokens);

        // Actualizar tracking de tokens
        state.setConversationTokens((prev) =>
          updateConversationTokens(prev, {
            input: inputTokens,
            output: outputTokens,
            cost,
          })
        );

        console.log("📊 Tokens de esta solicitud:", {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
          cost: `$${cost.toFixed(6)}`,
        });

        // Actualizar mensaje temporal con la respuesta
        state.setMessages((prev: Message[]) => {
          const newMessages = [...prev];
          const tempMessageIndex = newMessages.findIndex(
            (m) => m.tempId === tempBotMessageId
          );

          if (tempMessageIndex !== -1) {
            newMessages[tempMessageIndex] = {
              role: "assistant",
              content: botResponse,
              isBot: true,
              isStreaming: false,
              tokens: {
                input: inputTokens,
                output: outputTokens,
                cost,
              },
              client_turn_id: generateClientTurnId(),
            };

            // Guardar en backend de forma asíncrona
            const finalMessage = newMessages[tempMessageIndex];
            (async () => {
              const created = await saveConversationToBackend({
                client_turn_id: finalMessage.client_turn_id,
                conversation_id: state.conversationId,
                user_question: text,
                bot_answer: botResponse,
                metadata: {
                  category: detectedCategory,
                  tokens: {
                    input: inputTokens,
                    output: outputTokens,
                    cost,
                  },
                },
              });

              if (created && created.id != null) {
                state.setMessages((curr: Message[]) => {
                  const copy = [...curr];
                  const idx = copy.findIndex((m) => m.client_turn_id === finalMessage.client_turn_id);
                  if (idx >= 0) {
                    copy[idx] = { ...copy[idx], backend_id: created.id };
                  }
                  return copy;
                });
              }
            })();
          }

          return newMessages;
        });

        state.setIsTyping(false);

        // Hacer scroll al final
        setTimeout(() => {
          scrollToBottomWithRetry(state.messagesEndRef);
        }, 100);
      } catch (error) {
        console.error("❌ Error en handleSendMessage:", error);

        let errorContent = "Lo siento, ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente.";

        if ((error as { status?: number; isRateLimit?: boolean })?.status === 429 || (error as { status?: number; isRateLimit?: boolean })?.isRateLimit) {
          errorContent = "⚠️ Has alcanzado el límite de mensajes. Por favor, espera un momento antes de continuar.";
        }

        state.setMessages((prev: Message[]) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: "assistant",
            content: errorContent,
            isBot: true,
            isStreaming: false,
          };
          return newMessages;
        });

        state.setIsTyping(false);
      }
    },
    [
      state.inputMessage,
      state.isTyping,
      state.setUserMessageCount,
      state.setMessages,
      state.setInputMessage,
      state.setIsSuggestionsExpanded,
      state.textareaRef,
      state.conversationId,
      state.setIsTyping,
      state.setShowIncapacidadForm,
      state.setShowLiquidacionForm,
      state.setIsConsultingIncapacidad,
      state.setIsConsultingLiquidacion,
      state.setRateLimitInfo,
      state.messagesEndRef,
      saveConversationToBackend,
      solicitarRespuestaConOpenAI,
      checkRateLimit,
      scrollToBottomWithRetry,
    ]
  );

  /**
   * Maneja el click en una sugerencia
   */
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      state.setInputMessage(suggestion);
      state.setIsSuggestionsExpanded(false);
      setTimeout(() => {
        state.textareaRef.current?.focus();
      }, 0);
    },
    [state]
  );

  /**
   * Maneja el cambio en el input
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      // Limitar a MAX_CHARS caracteres
      if (value.length <= MAX_CHARS) {
        state.setInputMessage(value);

        // Mostrar sugerencias si hay texto
        state.setShowSpellCheckSuggestions(value.trim().length > 0);

        adjustTextareaHeight();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Ajusta la altura del textarea
   */
  const adjustTextareaHeight = useCallback(() => {
    if (state.textareaRef.current) {
      state.textareaRef.current.style.height = "auto";
      const maxHeight = 80; // Altura máxima fija
      state.textareaRef.current.style.height = `${Math.min(state.textareaRef.current.scrollHeight, maxHeight)}px`;
    }
  }, [state.textareaRef]);

  /**
   * Maneja el evento de tecla presionada
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(e as React.FormEvent);
      }
    },
    [handleSendMessage]
  );

  /**
   * Maneja la selección de una sugerencia de corrección
   */
  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      state.setInputMessage(suggestion);
      state.setShowSpellCheckSuggestions(false);

      // Ajustar altura del textarea
      adjustTextareaHeight();

      // Enfocar el textarea
      if (state.textareaRef.current) {
        state.textareaRef.current.focus();
      }
    },
    [state, adjustTextareaHeight]
  );

  /**
   * Maneja el feedback (like/dislike) de un mensaje
   */
  const handleFeedback = useCallback(
    async (messageIndex: number, isLike: boolean) => {
      const rating = isLike ? "like" : "dislike";

      state.setMessages((prevMessages: Message[]) => {
        const newMessages = [...prevMessages];
        // Filtrar mensajes del sistema para obtener el índice correcto
        const visibleMessages = newMessages.filter((m) => m.role !== "system");
        const actualMessage = visibleMessages[messageIndex];
        const actualIndex = newMessages.indexOf(actualMessage);

        if (actualIndex >= 0) {
          newMessages[actualIndex] = {
            ...newMessages[actualIndex],
            rating,
          };

          // Actualizar en backend usando la lógica correcta
          if (newMessages[actualIndex].backend_id) {
            updateBackendRating(newMessages[actualIndex].backend_id, rating);
          } else if (newMessages[actualIndex].client_turn_id) {
            updateBackendRatingByClientTurnId(newMessages[actualIndex].client_turn_id, rating);
          }
        }

        return newMessages;
      });
    },
    [state, updateBackendRating, updateBackendRatingByClientTurnId]
  );

  /**
   * Abre el formulario de incapacidad
   */
  const openIncapacidadForm = useCallback(() => {
    state.setShowIncapacidadForm(true);
  }, [state]);

  /**
   * Cierra el formulario de incapacidad
   */
  const closeIncapacidadForm = useCallback(() => {
    state.setShowIncapacidadForm(false);
    // Hacer scroll al final después de cerrar el formulario
    setTimeout(() => {
      scrollToBottomWithRetry(state.messagesEndRef);
    }, 100);
  }, [state, scrollToBottomWithRetry]);

  /**
   * Abre el formulario de liquidación
   */
  const openLiquidacionForm = useCallback(() => {
    state.setShowLiquidacionForm(true);
  }, [state]);

  /**
   * Cierra el formulario de liquidación
   */
  const closeLiquidacionForm = useCallback(() => {
    state.setShowLiquidacionForm(false);
    // Hacer scroll al final después de cerrar el formulario
    setTimeout(() => {
      scrollToBottomWithRetry(state.messagesEndRef);
    }, 100);
  }, [state, scrollToBottomWithRetry]);

  /**
   * Maneja el envío del formulario de incapacidad
   */
  const handleIncapacidadFormSubmit = useCallback(
    async (formData: ChatbotFormData) => {
      state.setIsConsultingIncapacidad(true);
      state.setShowIncapacidadForm(false);

      const userQueryMessage = {
        role: "user",
        content: `Consultar pago de incapacidad para documento ${formData.tipoDocumento} ${formData.numeroDocumento}`,
        isBot: false,
      };

      const loadingMessage = {
        role: "assistant",
        content: "Consultando información de incapacidad...",
        isBot: true,
        isLoading: true,
      };

      state.setMessages((prev: Message[]) => [...prev, userQueryMessage, loadingMessage]);

      try {
        // Convertir datos del formulario al formato esperado por la API
        const apiRequest: ConsultaIncapacidadRequest = {
          tipoDocumento: formData.tipoDocumento,
          numeroDocumento: formData.numeroDocumento,
          fechaExpedicion: formData.fechaExpedicion,
        };
        
        const incapacidades = await consultarIncapacidad(apiRequest);

        let responseMessage: Message;

        if (!incapacidades || incapacidades.length === 0) {
          responseMessage = {
            role: "assistant",
            content: generateNoDataResponse(),
            isBot: true,
          };
        } else if (incapacidades.length === 1) {
          responseMessage = {
            role: "assistant",
            content: generateIncapacidadResponse(incapacidades[0]),
            isBot: true,
          };
        } else {
          // Guardar las incapacidades múltiples en el estado
          state.setCurrentMultipleIncapacidades(incapacidades);
          
          responseMessage = {
            role: "assistant",
            content: generateMultipleIncapacidadesResponse(incapacidades),
            isBot: true,
            multipleIncapacidades: incapacidades,
          };
        }

        state.setMessages((prev: Message[]) => {
          const newMessages = [...prev];
          const finalResponse = {
            ...responseMessage,
            client_turn_id: generateClientTurnId(),
          };
          newMessages[newMessages.length - 1] = finalResponse;

          // Guardar en backend de forma asíncrona
          (async () => {
            const created = await saveConversationToBackend({
              client_turn_id: finalResponse.client_turn_id,
              conversation_id: state.conversationId,
              user_question: userQueryMessage.content,
              bot_answer: finalResponse.content,
              metadata: {
                quick_action: true,
                action_type: "consultar_incapacidad",
                result_count: incapacidades.length,
                success: true,
              },
            });

            if (created && created.id != null) {
              state.setMessages((curr: Message[]) => {
                const copy = [...curr];
                const idx = copy.findIndex((m) => m.client_turn_id === finalResponse.client_turn_id);
                if (idx >= 0) {
                  copy[idx] = { ...copy[idx], backend_id: created.id };
                }
                return copy;
              });
            }
          })();

          return newMessages;
        });
      } catch (error) {
        console.error("Error en consulta de incapacidad:", error);

        let errorContent;
        if ((error as { response?: { status?: number } })?.response?.status === 500) {
          errorContent = generateServerErrorResponse();
        } else if ((error as { response?: { status?: number; data?: { errors?: unknown } } })?.response?.status === 422) {
          errorContent = generateValidationErrorResponse((error as { response?: { data?: { errors?: unknown } } })?.response?.data?.errors);
        } else {
          errorContent = generateGenericErrorResponse();
        }

        const errorMessage = {
          role: "assistant",
          content: errorContent,
          isBot: true,
        };

        state.setMessages((prev: Message[]) => {
          const newMessages = [...prev];
          const finalError = {
            ...errorMessage,
            client_turn_id: generateClientTurnId(),
          };
          newMessages[newMessages.length - 1] = finalError;

          (async () => {
            const created = await saveConversationToBackend({
              client_turn_id: finalError.client_turn_id,
              conversation_id: state.conversationId,
              user_question: userQueryMessage.content,
              bot_answer: errorContent,
              metadata: {
              quick_action: true,
              action_type: "consultar_incapacidad",
              success: false,
              error_status: (error as { response?: { status?: number } })?.response?.status || "unknown",
              },
            });

            if (created && created.id != null) {
              state.setMessages((curr: Message[]) => {
                const copy = [...curr];
                const idx = copy.findIndex((m) => m.client_turn_id === finalError.client_turn_id);
                if (idx >= 0) {
                  copy[idx] = { ...copy[idx], backend_id: created.id };
                }
                return copy;
              });
            }
          })();

          return newMessages;
        });
      } finally {
        state.setIsConsultingIncapacidad(false);
        setTimeout(() => {
          scrollToBottomWithRetry(state.messagesEndRef);
        }, 300);
      }
    },
    [state, saveConversationToBackend]
  );

  /**
   * Maneja el envío del formulario de liquidación
   */
  const handleLiquidacionFormSubmit = useCallback(
    async (formData: ChatbotFormData) => {
      state.setIsConsultingLiquidacion(true);
      state.setShowLiquidacionForm(false);

      const userQueryMessage = {
        role: "user",
        content: `Consultar estado de compensación final para documento ${formData.tipoDocumento} ${formData.numeroDocumento}`,
        isBot: false,
      };

      const loadingMessage = {
        role: "assistant",
        content: "Consultando información de compensación final...",
        isBot: true,
        isLoading: true,
      };

      state.setMessages((prev: Message[]) => [...prev, userQueryMessage, loadingMessage]);

      try {
        // Convertir datos del formulario al formato esperado por la API
        const apiRequest: ConsultaLiquidacionRequest = {
          tipoDocumento: formData.tipoDocumento,
          numeroDocumento: formData.numeroDocumento,
          fechaExpedicion: formData.fechaExpedicion,
        };
        
        const liquidacion = await consultarLiquidacion(apiRequest);
        
        console.log("🔍 DEBUG - Respuesta de consultarLiquidacion:", liquidacion);
        console.log("🔍 DEBUG - Tipo de liquidacion:", typeof liquidacion);
        console.log("🔍 DEBUG - Es array?", Array.isArray(liquidacion));
        if (Array.isArray(liquidacion)) {
          console.log("🔍 DEBUG - Longitud del array:", liquidacion.length);
          console.log("🔍 DEBUG - Primer elemento:", liquidacion[0]);
        }

        let responseMessage: Message;

        if (!liquidacion) {
          console.log("🔍 DEBUG - No hay liquidacion, usando respuesta de no datos");
          responseMessage = {
            role: "assistant",
            content: generateLiquidacionNoDataResponse(),
            isBot: true,
          };
        } else {
          console.log("🔍 DEBUG - Hay liquidacion, generando respuesta");
          // Si es un array, tomar el primer elemento; si es un objeto, usarlo directamente
          const liquidacionData = Array.isArray(liquidacion) ? liquidacion[0] : liquidacion;
          console.log("🔍 DEBUG - Datos de liquidacion a procesar:", liquidacionData);
          responseMessage = {
            role: "assistant",
            content: generateLiquidacionResponse(liquidacionData),
            isBot: true,
          };
        }

        state.setMessages((prev: Message[]) => {
          const newMessages = [...prev];
          const finalResponse = {
            ...responseMessage,
            client_turn_id: generateClientTurnId(),
          };
          newMessages[newMessages.length - 1] = finalResponse;

          (async () => {
            const created = await saveConversationToBackend({
              client_turn_id: finalResponse.client_turn_id,
              conversation_id: state.conversationId,
              user_question: userQueryMessage.content,
              bot_answer: finalResponse.content,
              metadata: {
                quick_action: true,
                action_type: "consultar_liquidacion",
                success: true,
              },
            });

            if (created && created.id != null) {
              state.setMessages((curr: Message[]) => {
                const copy = [...curr];
                const idx = copy.findIndex((m) => m.client_turn_id === finalResponse.client_turn_id);
                if (idx >= 0) {
                  copy[idx] = { ...copy[idx], backend_id: created.id };
                }
                return copy;
              });
            }
          })();

          return newMessages;
        });
      } catch (error) {
        console.error("Error en consulta de liquidación:", error);

        const errorContent = generateGenericErrorResponse();
        const errorMessage = {
          role: "assistant",
          content: errorContent,
          isBot: true,
        };

        state.setMessages((prev: Message[]) => {
          const newMessages = [...prev];
          const finalError = {
            ...errorMessage,
            client_turn_id: generateClientTurnId(),
          };
          newMessages[newMessages.length - 1] = finalError;

          (async () => {
            await saveConversationToBackend({
              client_turn_id: finalError.client_turn_id,
              conversation_id: state.conversationId,
              user_question: userQueryMessage.content,
              bot_answer: errorContent,
              metadata: {
                quick_action: true,
                action_type: "consultar_liquidacion",
                success: false,
              },
            });
          })();

          return newMessages;
        });
      } finally {
        state.setIsConsultingLiquidacion(false);
        setTimeout(() => {
          scrollToBottomWithRetry(state.messagesEndRef);
        }, 300);
      }
    },
    [state, saveConversationToBackend]
  );

  /**
   * Maneja el scroll del contenedor de mensajes
   */
  const handleScroll = useCallback(() => {
    const nearBottom = isNearBottom(state.chatContainerRef);
    state.setShowScrollButton(!nearBottom);
  }, [state]);

  /**
   * Toggle del chat
   */
  const toggleChat = useCallback(() => {
    state.setIsFullscreen(false);
    state.setIsOpen(!state.isOpen);
    if (!state.isOpen) {
      state.setShowWelcomeTooltip(false);
    }
  }, [state]);

  /**
   * Toggle de pantalla completa
   */
  const toggleFullscreen = useCallback(() => {
    state.setIsFullscreen(!state.isFullscreen);
  }, [state]);

  /**
   * Renderiza el indicador de escritura
   */
  const renderTypingIndicator = useCallback(() => {
    return <TypingIndicator typingDots={state.typingDots} />;
  }, [state.typingDots]);

  /**
   * Exporta la conversación actual
   */
  const handleExportConversation = useCallback(() => {
    exportConversation(state.messages, state.conversationTokens);
  }, [state.messages, state.conversationTokens]);

  // ========== EFECTOS ==========

  // Efecto para inicializar el chat
  useEffect(() => {
    initializeChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efecto para guardar estado cuando cambien los mensajes
  useEffect(() => {
    if (state.messages.length > 0) {
      const realMessages = state.messages.filter((msg) => msg.role !== "system");
      if (realMessages.length > 0) {
        saveStateToStorage(
          state.messages,
          state.conversationContext,
          state.conversationId,
          state.hasContext,
          state.allPageContents,
          state.conversationTokens
        );
      }
    }
  }, [state.messages, saveStateToStorage, state.conversationContext, state.conversationId, state.hasContext, state.allPageContents, state.conversationTokens]);

  // Efecto para guardar estado cuando cambie el contexto conversacional
  useEffect(() => {
    if (state.conversationContext.questionCount > 0) {
      saveStateToStorage(
        state.messages,
        state.conversationContext,
        state.conversationId,
        state.hasContext,
        state.allPageContents,
        state.conversationTokens
      );
    }
  }, [state.conversationContext]);

  // Efecto para hacer scroll automático cuando hay nuevos mensajes
  useEffect(() => {
    if (state.autoScroll) {
      scrollToBottom(state.messagesEndRef);
    }
  }, [state.messages, state.autoScroll, state.messagesEndRef]);

  // Efecto para hacer scroll al final cuando se abre el chatbot y hay mensajes previos
  useEffect(() => {
    if (state.isOpen && state.messages.length > 0) {
      // Usar un timeout más largo para asegurar que el DOM esté completamente renderizado
      setTimeout(() => {
        scrollToBottomWithRetry(state.messagesEndRef);
      }, 200);
    }
  }, [state.isOpen, state.messages.length, state.messagesEndRef]);

  // Efecto para rotar mensajes del tooltip
  useEffect(() => {
    if (!state.showWelcomeTooltip) return;

    const interval = setInterval(() => {
      state.setCurrentTooltipMessage((prev) => (prev + 1) % TOOLTIP_MESSAGES.length);
    }, TOOLTIP_ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [state.showWelcomeTooltip, state.setCurrentTooltipMessage]);

  // Efecto para ocultar tooltip de bienvenida después de tiempo
  useEffect(() => {
    const timer = setTimeout(() => {
      state.setShowWelcomeTooltip(false);
    }, WELCOME_TOOLTIP_DURATION);

    return () => clearTimeout(timer);
  }, []);

  // Efecto para cerrar trámites rápidos después de 3 mensajes
  useEffect(() => {
    if (state.userMessageCount >= 3) {
      state.setShowQuickActions(false);
    }
  }, [state.userMessageCount, state.setShowQuickActions]);

  // Efecto para animar los puntos de "escribiendo"
  useEffect(() => {
    if (!state.isTyping) return;

    const interval = setInterval(() => {
      state.setTypingDots((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 500);

    return () => clearInterval(interval);
  }, [state.isTyping, state.setTypingDots]);

  // Efecto para cerrar el chat con doble clic fuera
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let clickCount = 0;

    const handleClickOutside = (event: MouseEvent) => {
      if (state.chatContainerRef.current && !state.chatContainerRef.current.contains(event.target as Node)) {
        clickCount++;
        if (clickCount === 1) {
          timer = setTimeout(() => {
            clickCount = 0;
          }, 300); // 300ms para detectar doble clic
        } else if (clickCount === 2) {
          clearTimeout(timer);
          clickCount = 0;
          state.setIsOpen(false);
        }
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.chatContainerRef, state.setIsOpen]);

  // ========== RENDERIZADO ==========

  return (
    <>
      {/* Chat window */}
      {state.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-2 md:p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => state.setIsOpen(false)}></div>
          <div
            ref={state.chatContainerRef}
            className={`relative flex flex-col transition-all duration-300 ease-in-out ${
              state.isFullscreen
                ? "h-[100vh] w-full rounded-none md:h-[95vh] md:w-[95vw] md:rounded-2xl"
                : `h-[85vh] ${chatWidth} rounded-2xl md:h-[75vh]`
            } overflow-hidden bg-white shadow-2xl dark:bg-gray-800`}
          >
            {/* Header */}
            <ChatHeader
              isFullscreen={state.isFullscreen}
              onClose={toggleChat}
              onToggleFullscreen={toggleFullscreen}
              onNewConversation={startNewChat}
              onExportConversation={handleExportConversation}
            />

            {/* Body */}
            <div className="flex flex-col flex-grow overflow-hidden">
              {/* Formulario de Incapacidad */}
              {state.showIncapacidadForm ? (
                <div className="flex flex-col flex-grow overflow-hidden bg-gray-100 dark:bg-gray-900">
                  <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      Consultar Incapacidad
                    </h4>
                    <button
                      onClick={closeIncapacidadForm}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                      title="Volver al chatbot"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4">
                    <IncapacidadForm
                      onSubmit={handleIncapacidadFormSubmit}
                      isLoading={state.isConsultingIncapacidad}
                    />
                  </div>
                </div>
              ) : state.showLiquidacionForm ? (
                <div className="flex flex-col flex-grow overflow-hidden bg-gray-100 dark:bg-gray-900">
                  <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      Consultar Compensación Final
                    </h4>
                    <button
                      onClick={closeLiquidacionForm}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                      title="Volver al chatbot"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4">
                    <LiquidacionForm
                      onSubmit={handleLiquidacionFormSubmit}
                      isLoading={state.isConsultingLiquidacion}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className={`flex-grow space-y-3 overflow-y-auto bg-gray-100 px-3 pb-4 pt-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:bg-gray-900 dark:scrollbar-thumb-gray-700 ${
                    state.isFullscreen ? "px-6 text-lg space-y-4" : ""
                  }`}
                  style={{
                    height: "100%",
                    maxHeight: "100%",
                  }}
                  onScroll={handleScroll}
                >
                  {state.messages
                    .filter((message) => message.role !== "system")
                    .map((message, index: number) => {
                      const filteredMessages = state.messages.filter((m) => m.role !== "system");
                      return (
                        <ChatMessage
                          key={index}
                          message={message}
                          index={index}
                          totalMessages={filteredMessages.length}
                          isLastMessage={index === filteredMessages.length - 1}
                          isTyping={state.isTyping}
                          renderers={markdownRenderers}
                          onFeedback={handleFeedback}
                        />
                      );
                    })}

                  {/* Mostrar loader solo si está escribiendo y el último mensaje del bot está vacío */}
                  {state.isTyping &&
                    state.messages.length > 0 &&
                    state.messages[state.messages.length - 1].isBot &&
                    state.messages[state.messages.length - 1].content === "" && (
                      <div className="flex justify-start">
                        <div className="flex items-start space-x-2">
                          <div className="flex-shrink-0">
                            <Bot className="h-6 w-6 text-prosalud-salud bg-gray-200 rounded-full p-1" />
                          </div>
                          {renderTypingIndicator()}
                        </div>
                      </div>
                    )}
                  <div ref={state.messagesEndRef} />
                </div>
              )}

              {/* Botón flotante para scroll al final */}
              {!state.showIncapacidadForm && !state.showLiquidacionForm && state.showScrollButton && (
                <ScrollToBottomButton onClick={() => scrollToBottom(state.messagesEndRef)} />
              )}

              {/* Trámites rápidos */}
              {!state.showIncapacidadForm && !state.showLiquidacionForm && (
                <QuickActions
                  showQuickActions={state.showQuickActions}
                  onToggle={() => state.setShowQuickActions(!state.showQuickActions)}
                  onOpenIncapacidadForm={openIncapacidadForm}
                  onOpenLiquidacionForm={openLiquidacionForm}
                />
              )}

              {/* Preguntas sugeridas */}
              {!state.showIncapacidadForm && !state.showLiquidacionForm && state.showSuggestions && (
                <SuggestionsPanel
                  suggestions={DEFAULT_SUGGESTIONS}
                  isSuggestionsExpanded={state.isSuggestionsExpanded}
                  onToggle={() => state.setIsSuggestionsExpanded(!state.isSuggestionsExpanded)}
                  onSuggestionClick={handleSuggestionClick}
                />
              )}

              {/* Advertencia de rate limit */}
              {!state.showIncapacidadForm && !state.showLiquidacionForm && (
                <RateLimitWarning rateLimitInfo={state.rateLimitInfo} />
              )}

              {/* Input Form */}
              {!state.showIncapacidadForm && !state.showLiquidacionForm && (
                <ChatInput
                  inputMessage={state.inputMessage}
                  isTyping={state.isTyping}
                  isFullscreen={state.isFullscreen}
                  showSpellCheckSuggestions={state.showSpellCheckSuggestions}
                  textareaRef={state.textareaRef}
                  onInputChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => state.setShowSpellCheckSuggestions(state.inputMessage.trim().length > 0)}
                  onBlur={() => setTimeout(() => state.setShowSpellCheckSuggestions(false), 200)}
                  onSelectSuggestion={handleSelectSuggestion}
                  onSubmit={handleSendMessage}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      {state.showChatbot && (
        <TooltipProvider delayDuration={100}>
          <Tooltip open={state.showWelcomeTooltip || state.isTooltipOpen} onOpenChange={state.setIsTooltipOpen}>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  toggleChat();
                  state.setShowWelcomeTooltip(false);
                  state.setIsTooltipOpen(true);
                }}
                onMouseEnter={() => !state.showWelcomeTooltip && state.setIsTooltipOpen(true)}
                onMouseLeave={() => !state.showWelcomeTooltip && state.setIsTooltipOpen(false)}
                className={`fixed bottom-2 right-2 z-10 transform rounded-full bg-prosalud-salud p-4
                            text-white shadow-lg transition-all 
                            duration-300 hover:rotate-3 hover:scale-110 hover:bg-prosalud-salud/90 focus:outline-none
                            ${state.isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"}
                        `}
                title="Abrir chat de ayuda"
                aria-label="Abrir chat de ayuda"
              >
                <MessageSquare className="h-7 w-7" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-gray-800 text-white border-gray-700 max-w-xs relative">
              <div className="flex justify-between items-start gap-2">
                <p className="text-sm">{TOOLTIP_MESSAGES[state.currentTooltipMessage]}</p>
                {state.showWelcomeTooltip && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      state.setShowWelcomeTooltip(false);
                    }}
                    className="text-gray-400 hover:text-white flex-shrink-0 ml-2"
                    aria-label="Cerrar tooltip"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </>
  );
}

