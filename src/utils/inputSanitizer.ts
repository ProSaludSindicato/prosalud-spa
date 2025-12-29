import DOMPurify from 'dompurify';

/**
 * Tipos de sanitización disponibles
 */
export type SanitizationType = 
  | 'text'           // Texto plano (nombres, apellidos, etc.)
  | 'email'          // Correo electrónico
  | 'phone'          // Número de teléfono
  | 'numeric'        // Solo números
  | 'alphanumeric'   // Letras y números
  | 'html'           // HTML (se sanitiza con DOMPurify)
  | 'url'            // URL
  | 'id'             // Número de identificación
  | 'general';       // Sanitización general (texto con caracteres especiales limitados)

/**
 * Opciones de sanitización
 */
export interface SanitizationOptions {
  maxLength?: number;
  allowSpaces?: boolean;
  allowSpecialChars?: boolean;
  trim?: boolean;
}

/**
 * Sanitiza texto plano (nombres, apellidos, etc.)
 * Solo permite letras, espacios y acentos básicos
 * NOTA: No aplica trim() mientras el usuario escribe para permitir espacios
 */
export const sanitizeText = (value: string, options: SanitizationOptions = {}): string => {
  if (!value || typeof value !== 'string') return '';
  
  const { maxLength = 100, allowSpaces = true, trim = false } = options; // trim = false por defecto para permitir espacios mientras se escribe
  
  let sanitized = value;
  
  // Solo aplicar trim si se solicita explícitamente (útil para validación final, no durante escritura)
  if (trim) {
    sanitized = sanitized.trim();
  }
  
  // Solo letras, espacios y acentos básicos
  const pattern = allowSpaces 
    ? /[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g
    : /[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g;
  
  sanitized = sanitized.replace(pattern, '');
  
  // Limitar longitud
  if (maxLength > 0) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Sanitiza correo electrónico
 */
export const sanitizeEmail = (value: string, options: SanitizationOptions = {}): string => {
  if (!value || typeof value !== 'string') return '';
  
  const { maxLength = 100, trim = true } = options;
  
  let sanitized = value;
  
  if (trim) {
    sanitized = sanitized.trim();
  }
  
  // Remover caracteres peligrosos para XSS pero mantener formato de email válido
  sanitized = sanitized.replace(/[<>\"'&]/g, '');
  
  // Limitar longitud
  if (maxLength > 0) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Sanitiza número de teléfono (solo números)
 */
export const sanitizePhone = (value: string, options: SanitizationOptions = {}): string => {
  if (!value || typeof value !== 'string') return '';
  
  const { maxLength = 15, trim = true } = options;
  
  let sanitized = value;
  
  if (trim) {
    sanitized = sanitized.trim();
  }
  
  // Solo números
  sanitized = sanitized.replace(/[^0-9]/g, '');
  
  // Limitar longitud
  if (maxLength > 0) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Sanitiza números (solo dígitos)
 */
export const sanitizeNumeric = (value: string, options: SanitizationOptions = {}): string => {
  if (!value || typeof value !== 'string') return '';
  
  const { maxLength = 20, trim = true } = options;
  
  let sanitized = value;
  
  if (trim) {
    sanitized = sanitized.trim();
  }
  
  // Solo números
  sanitized = sanitized.replace(/[^0-9]/g, '');
  
  // Limitar longitud
  if (maxLength > 0) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Sanitiza alfanumérico (letras y números)
 * Por defecto permite espacios para mayor flexibilidad en inputs de texto
 * NOTA: No aplica trim() mientras el usuario escribe para permitir espacios
 */
export const sanitizeAlphanumeric = (value: string, options: SanitizationOptions = {}): string => {
  if (!value || typeof value !== 'string') return '';
  
  const { maxLength = 100, allowSpaces = true, trim = false } = options; // trim = false por defecto para permitir espacios mientras se escribe
  
  let sanitized = value;
  
  if (trim) {
    sanitized = sanitized.trim();
  }
  
  // Letras, números y opcionalmente espacios
  const pattern = allowSpaces 
    ? /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s]/g
    : /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ]/g;
  
  sanitized = sanitized.replace(pattern, '');
  
  // Limitar longitud
  if (maxLength > 0) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Sanitiza HTML usando DOMPurify
 */
export const sanitizeHtml = (value: string, options: SanitizationOptions = {}): string => {
  if (!value || typeof value !== 'string') return '';
  
  const { maxLength = 5000, trim = true } = options;
  
  let sanitized = value;
  
  if (trim) {
    sanitized = sanitized.trim();
  }
  
  // Sanitizar con DOMPurify
  if (typeof window !== 'undefined' && DOMPurify) {
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  } else {
    // Fallback: remover tags HTML si DOMPurify no está disponible
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }
  
  // Limitar longitud
  if (maxLength > 0) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Sanitiza URL
 */
export const sanitizeUrl = (value: string, options: SanitizationOptions = {}): string => {
  if (!value || typeof value !== 'string') return '';
  
  const { maxLength = 500, trim = true } = options;
  
  let sanitized = value;
  
  if (trim) {
    sanitized = sanitized.trim();
  }
  
  // Remover caracteres peligrosos
  sanitized = sanitized.replace(/[<>\"'&]/g, '');
  
  // Limitar longitud
  if (maxLength > 0) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Sanitiza número de identificación
 */
export const sanitizeId = (value: string, options: SanitizationOptions = {}): string => {
  if (!value || typeof value !== 'string') return '';
  
  const { maxLength = 15, trim = true } = options;
  
  let sanitized = value;
  
  if (trim) {
    sanitized = sanitized.trim();
  }
  
  // Solo números
  sanitized = sanitized.replace(/[^0-9]/g, '');
  
  // Limitar longitud
  if (maxLength > 0) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Sanitización general (texto con caracteres especiales limitados)
 * Usado para descripciones, notas, etc. que pueden contener saltos de línea
 * NOTA: No aplica trim() mientras el usuario escribe para permitir saltos de línea
 */
export const sanitizeGeneral = (value: string, options: SanitizationOptions = {}): string => {
  if (!value || typeof value !== 'string') return '';
  
  const { maxLength = 500, trim = false } = options; // trim = false por defecto para permitir saltos de línea mientras se escribe
  
  let sanitized = value;
  
  // Solo aplicar trim si se solicita explícitamente (útil para validación final, no durante escritura)
  if (trim) {
    sanitized = sanitized.trim();
  }
  
  // Remover caracteres peligrosos para XSS (pero mantener saltos de línea \n y retornos de carro \r)
  sanitized = sanitized.replace(/[<>\"'&]/g, '');
  
  // Limitar longitud
  if (maxLength > 0) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Función principal de sanitización que selecciona el método según el tipo
 */
export const sanitizeInput = (
  value: string,
  type: SanitizationType = 'general',
  options: SanitizationOptions = {}
): string => {
  switch (type) {
    case 'text':
      return sanitizeText(value, options);
    case 'email':
      return sanitizeEmail(value, options);
    case 'phone':
      return sanitizePhone(value, options);
    case 'numeric':
      return sanitizeNumeric(value, options);
    case 'alphanumeric':
      return sanitizeAlphanumeric(value, options);
    case 'html':
      return sanitizeHtml(value, options);
    case 'url':
      return sanitizeUrl(value, options);
    case 'id':
      return sanitizeId(value, options);
    case 'general':
    default:
      return sanitizeGeneral(value, options);
  }
};

/**
 * Valida formato de email
 */
export const validateEmailFormat = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * Valida formato de teléfono colombiano
 */
export const validatePhoneFormat = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^[3][0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Valida formato de número de identificación
 */
export const validateIdFormat = (idNumber: string): boolean => {
  if (!idNumber || typeof idNumber !== 'string') return false;
  const idRegex = /^[0-9]{6,15}$/;
  return idRegex.test(idNumber);
};

