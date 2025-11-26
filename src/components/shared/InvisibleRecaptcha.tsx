import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

// Declaración de tipos para grecaptcha en window
declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      render: (container: string | HTMLElement, options: any) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
  }
}

export interface InvisibleRecaptchaRef {
  execute: () => Promise<string | null>;
  reset: () => void;
  isAvailable: () => boolean;
}

interface InvisibleRecaptchaProps {
  siteKey: string;
  onVerify: (token: string | null) => void;
  onError?: () => void;
  onExpire?: () => void;
}

const InvisibleRecaptcha = forwardRef<InvisibleRecaptchaRef, InvisibleRecaptchaProps>(
  ({ siteKey, onVerify, onError, onExpire }, ref) => {
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isAvailable, setIsAvailable] = useState(true);

    // Verificar disponibilidad de reCAPTCHA al montar
    useEffect(() => {
      const checkAvailability = () => {
        try {
          if (typeof window !== 'undefined' && window.grecaptcha) {
            setIsAvailable(true);
            setIsInitialized(true);
          } else {
            // Si no está disponible después de un tiempo, marcar como no disponible
            setTimeout(() => {
              if (!window.grecaptcha) {
                console.warn('reCAPTCHA no está disponible. El formulario continuará sin verificación.');
                setIsAvailable(false);
                setHasError(true);
              }
            }, 3000);
          }
        } catch (error) {
          console.warn('Error verificando disponibilidad de reCAPTCHA:', error);
          setIsAvailable(false);
          setHasError(true);
        }
      };

      checkAvailability();
    }, []);

    useImperativeHandle(ref, () => ({
      execute: async () => {
        // Si reCAPTCHA no está disponible, retornar null pero permitir continuar
        if (!isAvailable || !recaptchaRef.current) {
          console.warn('reCAPTCHA no disponible. Continuando sin token.');
          return null;
        }

        try {
          const token = await recaptchaRef.current.executeAsync();
          setHasError(false);
          return token;
        } catch (error) {
          console.error('Error ejecutando reCAPTCHA:', error);
          setHasError(true);
          // No llamar onError aquí - permitir que el usuario continúe
          // El backend puede manejar la ausencia del token
          return null;
        }
      },
      reset: () => {
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        setHasError(false);
      },
      isAvailable: () => isAvailable && !hasError,
    }));

    return (
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={siteKey}
        size="invisible"
        onChange={(token) => {
          setIsInitialized(true);
          setHasError(false);
          setIsAvailable(true);
          onVerify(token);
        }}
        onExpired={() => {
          onExpire?.();
        }}
        onErrored={() => {
          // Solo loguear errores, no bloquear al usuario
          console.warn('Error en reCAPTCHA');
          setHasError(true);
          
          // Si ya estaba inicializado y hay un error, notificar pero no bloquear
          if (isInitialized) {
            // Solo notificar si hay un callback, pero no bloquear
            onError?.();
          } else {
            // Error de inicialización - silencioso, permitir continuar
            setIsAvailable(false);
          }
        }}
      />
    );
  }
);

InvisibleRecaptcha.displayName = 'InvisibleRecaptcha';

export default InvisibleRecaptcha;

