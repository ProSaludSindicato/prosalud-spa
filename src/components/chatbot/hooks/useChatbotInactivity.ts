/**
 * Hook para manejar la inactividad del chatbot y cierre automático de sesión
 */

import { useCallback, useEffect, useRef, useState } from "react";

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos en milisegundos

interface UseChatbotInactivityProps {
  isOpen: boolean;
  onTimeout: () => void;
}

export const useChatbotInactivity = ({ isOpen, onTimeout }: UseChatbotInactivityProps) => {
  const [isActive, setIsActive] = useState(true);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Actualiza el timestamp de última actividad
   */
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsActive(true);
  }, []);

  /**
   * Verifica si hay inactividad y ejecuta el callback si aplica
   */
  const checkInactivity = useCallback(() => {
    if (!isOpen) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
      console.log("⏱️ Sesión del chatbot inactiva por 15 minutos");
      setIsActive(false);
      onTimeout();
    }
  }, [isOpen, onTimeout]);

  /**
   * Resetea el timer de inactividad
   */
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Establecer nuevo timer para verificar inactividad
    inactivityTimerRef.current = setTimeout(() => {
      checkInactivity();
    }, INACTIVITY_TIMEOUT);
  }, [checkInactivity]);

  /**
   * Maneja eventos de actividad del usuario
   */
  useEffect(() => {
    if (!isOpen) {
      // Limpiar timer cuando el chat está cerrado
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    // Resetear actividad cuando se abre el chat
    updateActivity();
    resetInactivityTimer();

    // Cleanup
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [isOpen, updateActivity, resetInactivityTimer]);

  return {
    isActive,
    updateActivity,
    resetInactivityTimer,
  };
};
