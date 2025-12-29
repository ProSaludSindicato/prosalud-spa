import { useCallback } from 'react';
import {
  sanitizeInput,
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeNumeric,
  sanitizeId,
  sanitizeGeneral,
  sanitizeHtml,
  validateEmailFormat,
  validatePhoneFormat,
  validateIdFormat,
  type SanitizationType,
  type SanitizationOptions,
} from '@/utils/inputSanitizer';

/**
 * Hook para sanitizar inputs de formularios
 * Proporciona funciones de sanitización y validación consistentes
 * 
 * @example
 * ```tsx
 * const { sanitize, validate } = useSanitizedInput();
 * 
 * <Input
 *   onChange={(e) => {
 *     const sanitized = sanitize(e.target.value, 'text', { maxLength: 50 });
 *     field.onChange(sanitized);
 *   }}
 * />
 * ```
 */
export const useSanitizedInput = () => {
  /**
   * Sanitiza un valor según el tipo especificado
   */
  const sanitize = useCallback(
    (
      value: string,
      type: SanitizationType = 'general',
      options?: SanitizationOptions
    ): string => {
      return sanitizeInput(value, type, options);
    },
    []
  );

  /**
   * Sanitiza texto (nombres, apellidos, etc.)
   */
  const sanitizeTextInput = useCallback(
    (value: string, options?: SanitizationOptions): string => {
      return sanitizeText(value, options);
    },
    []
  );

  /**
   * Sanitiza correo electrónico
   */
  const sanitizeEmailInput = useCallback(
    (value: string, options?: SanitizationOptions): string => {
      return sanitizeEmail(value, options);
    },
    []
  );

  /**
   * Sanitiza número de teléfono
   */
  const sanitizePhoneInput = useCallback(
    (value: string, options?: SanitizationOptions): string => {
      return sanitizePhone(value, options);
    },
    []
  );

  /**
   * Sanitiza números
   */
  const sanitizeNumericInput = useCallback(
    (value: string, options?: SanitizationOptions): string => {
      return sanitizeNumeric(value, options);
    },
    []
  );

  /**
   * Sanitiza número de identificación
   */
  const sanitizeIdInput = useCallback(
    (value: string, options?: SanitizationOptions): string => {
      return sanitizeId(value, options);
    },
    []
  );

  /**
   * Sanitiza HTML
   */
  const sanitizeHtmlInput = useCallback(
    (value: string, options?: SanitizationOptions): string => {
      return sanitizeHtml(value, options);
    },
    []
  );

  /**
   * Sanitiza texto general
   */
  const sanitizeGeneralInput = useCallback(
    (value: string, options?: SanitizationOptions): string => {
      return sanitizeGeneral(value, options);
    },
    []
  );

  /**
   * Valida formato de email
   */
  const validateEmail = useCallback((email: string): boolean => {
    return validateEmailFormat(email);
  }, []);

  /**
   * Valida formato de teléfono colombiano
   */
  const validatePhone = useCallback((phone: string): boolean => {
    return validatePhoneFormat(phone);
  }, []);

  /**
   * Valida formato de número de identificación
   */
  const validateId = useCallback((idNumber: string): boolean => {
    return validateIdFormat(idNumber);
  }, []);

  /**
   * Handler para onChange que sanitiza automáticamente
   */
  const createSanitizedHandler = useCallback(
    (
      type: SanitizationType,
      originalHandler: (value: string) => void,
      options?: SanitizationOptions
    ) => {
      return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const sanitized = sanitizeInput(e.target.value, type, options);
        originalHandler(sanitized);
      };
    },
    []
  );

  return {
    sanitize,
    sanitizeText: sanitizeTextInput,
    sanitizeEmail: sanitizeEmailInput,
    sanitizePhone: sanitizePhoneInput,
    sanitizeNumeric: sanitizeNumericInput,
    sanitizeId: sanitizeIdInput,
    sanitizeHtml: sanitizeHtmlInput,
    sanitizeGeneral: sanitizeGeneralInput,
    validateEmail,
    validatePhone,
    validateId,
    createSanitizedHandler,
  };
};

