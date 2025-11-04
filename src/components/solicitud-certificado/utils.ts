
export const formatFileSize = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

// Tipos de archivos permitidos - Actualizados para incluir Word, PDF e imágenes
export const ALLOWED_FILE_TYPES_PDF = ['application/pdf'];
export const ALLOWED_FILE_TYPES_IMAGES = ['image/jpeg', 'image/jpg', 'image/png'];
export const ALLOWED_FILE_TYPES_WORD = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
export const ALLOWED_FILE_TYPES_PDF_WORD = [...ALLOWED_FILE_TYPES_PDF, ...ALLOWED_FILE_TYPES_WORD];
export const ALLOWED_FILE_TYPES_PDF_IMAGES = [...ALLOWED_FILE_TYPES_PDF, ...ALLOWED_FILE_TYPES_IMAGES];
export const ALLOWED_FILE_TYPES_WORD_IMAGES = [...ALLOWED_FILE_TYPES_WORD, ...ALLOWED_FILE_TYPES_IMAGES];
export const ALLOWED_FILE_TYPES_ALL = [...ALLOWED_FILE_TYPES_PDF, ...ALLOWED_FILE_TYPES_WORD, ...ALLOWED_FILE_TYPES_IMAGES];

// Compatibilidad hacia atrás - usar ALLOWED_FILE_TYPES_ALL para permitir todos los tipos
export const ALLOWED_FILE_TYPES_GENERAL = ALLOWED_FILE_TYPES_ALL;
export const ALLOWED_FILE_TYPES_PDF_WORD_IMAGES = ALLOWED_FILE_TYPES_ALL;
