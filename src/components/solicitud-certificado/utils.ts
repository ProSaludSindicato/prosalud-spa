
export const formatFileSize = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

/**
 * NOTA IMPORTANTE DE SEGURIDAD - VALIDACIÓN DE TIPOS DE ARCHIVO:
 * 
 * La validación de tipos de archivo en el frontend (usando estas constantes) es SOLO para
 * mejorar la experiencia del usuario (UX), proporcionando retroalimentación inmediata.
 * 
 * La validación REAL y definitiva se realiza en el BACKEND usando magic bytes (análisis
 * del contenido real del archivo), no solo la extensión o el MIME type reportado por el
 * navegador. Esto es crítico por seguridad:
 * 
 * - Un atacante puede modificar fácilmente las solicitudes HTTP (DevTools, Postman, curl)
 *   para bypassear la validación del frontend
 * - Puede alterar el MIME type o extensión del archivo
 * - La validación del backend usando magic bytes verifica el tipo real del archivo
 *   basándose en su contenido, no en metadatos modificables
 * 
 * Por lo tanto, estas constantes son para UX solamente. El backend DEBE re-validar
 * todos los archivos usando magic bytes antes de procesarlos o almacenarlos.
 * 
 * Referencia: CWE-434 (Unrestricted Upload of File with Dangerous Type)
 */
// Tipos de archivos permitidos - Actualizados para incluir Word, PDF e imágenes
export const ALLOWED_FILE_TYPES_PDF = ['application/pdf'];
export const ALLOWED_FILE_TYPES_IMAGES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ALLOWED_FILE_TYPES_WORD = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
export const ALLOWED_FILE_TYPES_PDF_WORD = [...ALLOWED_FILE_TYPES_PDF, ...ALLOWED_FILE_TYPES_WORD];
export const ALLOWED_FILE_TYPES_PDF_IMAGES = [...ALLOWED_FILE_TYPES_PDF, ...ALLOWED_FILE_TYPES_IMAGES];
export const ALLOWED_FILE_TYPES_WORD_IMAGES = [...ALLOWED_FILE_TYPES_WORD, ...ALLOWED_FILE_TYPES_IMAGES];
export const ALLOWED_FILE_TYPES_ALL = [...ALLOWED_FILE_TYPES_PDF, ...ALLOWED_FILE_TYPES_WORD, ...ALLOWED_FILE_TYPES_IMAGES];

// Compatibilidad hacia atrás - usar ALLOWED_FILE_TYPES_ALL para permitir todos los tipos
export const ALLOWED_FILE_TYPES_GENERAL = ALLOWED_FILE_TYPES_ALL;
export const ALLOWED_FILE_TYPES_PDF_WORD_IMAGES = ALLOWED_FILE_TYPES_ALL;
