import { RECAPTCHA_CONFIG } from '@/config/api';
import { logger } from '@/utils/logger';

// Declaración de tipos para grecaptcha en window (reCAPTCHA Enterprise)
declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
      // También puede tener métodos directos si se carga sin enterprise
      ready?: (callback: () => void) => void;
      execute?: (siteKey: string, options: { action: string }) => Promise<string>;
      render?: (container: string | HTMLElement, options: any) => number;
      reset?: (widgetId?: number) => void;
      getResponse?: (widgetId?: number) => string;
    };
  }
}

/**
 * Carga el script de reCAPTCHA Enterprise si no está disponible
 * 
 * @returns Promise que resuelve cuando el script está cargado
 */
function loadRecaptchaScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Si ya está cargado, resolver inmediatamente
    if (typeof window !== 'undefined' && window.grecaptcha && window.grecaptcha.enterprise) {
      resolve();
      return;
    }

    // Si el script ya se está cargando, esperar a que termine
    const existingScript = document.querySelector('script[src*="recaptcha/enterprise.js"]');
    if (existingScript) {
      // Esperar hasta que grecaptcha.enterprise esté disponible
      const checkInterval = setInterval(() => {
        if (window.grecaptcha && window.grecaptcha.enterprise) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout después de 10 segundos
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout esperando reCAPTCHA'));
      }, 10000);
      return;
    }

    // Cargar el script con el site key en la URL (requerido para Enterprise)
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_CONFIG.SITE_KEY}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Esperar a que grecaptcha.enterprise esté disponible después de cargar el script
      const checkInterval = setInterval(() => {
        if (window.grecaptcha && window.grecaptcha.enterprise) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout después de 10 segundos
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout esperando reCAPTCHA después de cargar script'));
      }, 10000);
    };

    script.onerror = () => {
      reject(new Error('Error al cargar el script de reCAPTCHA'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Obtiene un token de reCAPTCHA Enterprise para una acción específica
 * 
 * @param action - La acción para la cual se solicita el token (ej: 'login', 'request_otp', etc.)
 * @returns Promise que resuelve con el token de reCAPTCHA o null si no está disponible
 * 
 * @example
 * const token = await getRecaptchaToken('login');
 * if (token) {
 *   // Enviar token con la petición
 * }
 */
export async function getRecaptchaToken(action: string): Promise<string | null> {
  try {
    // Verificar que estemos en el navegador
    if (typeof window === 'undefined') {
      logger.warn('reCAPTCHA no está disponible (SSR). Continuando sin token.');
      return null;
    }

    // Intentar cargar el script si no está disponible
    if (!window.grecaptcha || !window.grecaptcha.enterprise) {
      try {
        await loadRecaptchaScript();
      } catch (error) {
        logger.warn('No se pudo cargar reCAPTCHA. Continuando sin token:', error);
        return null;
      }
    }

    // Verificar nuevamente después de intentar cargar
    if (!window.grecaptcha || !window.grecaptcha.enterprise) {
      logger.warn('reCAPTCHA Enterprise no está disponible después de intentar cargar. Continuando sin token.');
      return null;
    }

    // Esperar a que grecaptcha.enterprise esté listo usando callback
    await new Promise<void>((resolve) => {
      if (window.grecaptcha && window.grecaptcha.enterprise && window.grecaptcha.enterprise.ready) {
        window.grecaptcha.enterprise.ready(() => {
          resolve();
        });
      } else {
        // Si ready no está disponible, intentar ejecutar directamente
        resolve();
      }
    });

    // Verificar nuevamente después de ready
    if (!window.grecaptcha || !window.grecaptcha.enterprise) {
      logger.warn('reCAPTCHA Enterprise no está disponible después de ready. Continuando sin token.');
      return null;
    }

    // Ejecutar reCAPTCHA Enterprise con la acción especificada
    if (!window.grecaptcha.enterprise.execute) {
      logger.warn('reCAPTCHA Enterprise execute no está disponible. Continuando sin token.');
      return null;
    }

    const token = await window.grecaptcha.enterprise.execute(RECAPTCHA_CONFIG.SITE_KEY, {
      action: action,
    });

    return token;
  } catch (error) {
    logger.error('Error al obtener token de reCAPTCHA:', error);
    // No bloquear al usuario - permitir continuar sin token
    // El backend puede manejar la ausencia del token
    return null;
  }
}

/**
 * Verifica si reCAPTCHA está disponible en el navegador
 * 
 * @returns true si reCAPTCHA está disponible, false en caso contrario
 */
export function isRecaptchaAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.grecaptcha && !!window.grecaptcha.enterprise;
}

