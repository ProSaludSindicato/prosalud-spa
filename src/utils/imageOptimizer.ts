import imageCompression, { type Options } from 'browser-image-compression';
import { logger } from '@/utils/logger';

/**
 * Tipos MIME de imágenes soportadas
 */
const IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Verifica si un archivo es una imagen
 */
export function isImageFile(file: File): boolean {
  return IMAGE_TYPES.includes(file.type.toLowerCase());
}

/**
 * Calcula el tamaño máximo objetivo en MB basado en el tamaño original del archivo
 * La reducción es proporcional: archivos más grandes se reducen más agresivamente
 * pero siempre manteniendo calidad visual aceptable
 * 
 * @param originalSizeMB Tamaño original del archivo en MB
 * @returns Tamaño máximo objetivo en MB
 */
function calculateTargetSizeMB(originalSizeMB: number): number {
  if (originalSizeMB > 5) {
    // Archivos muy grandes (>5MB): reducir a ~25% del original (reducción del 75%)
    return Math.max(0.5, originalSizeMB * 0.25);
  } else if (originalSizeMB > 2) {
    // Archivos grandes (2-5MB): reducir a ~35% del original (reducción del 65%)
    return Math.max(0.4, originalSizeMB * 0.35);
  } else if (originalSizeMB > 1) {
    // Archivos medianos (1-2MB): reducir a ~45% del original (reducción del 55%)
    return Math.max(0.3, originalSizeMB * 0.45);
  } else if (originalSizeMB > 0.5) {
    // Archivos pequeños (0.5-1MB): reducir a ~60% del original (reducción del 40%)
    return Math.max(0.2, originalSizeMB * 0.6);
  } else {
    // Archivos muy pequeños (<0.5MB): reducir a ~70% del original (reducción del 30%)
    return Math.max(0.1, originalSizeMB * 0.7);
  }
}

/**
 * Verifica si el navegador soporta WebP
 */
function supportsWebP(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Optimiza una imagen:
 * - Reduce el peso del archivo de forma proporcional al tamaño original
 * - Elimina metadatos innecesarios
 * - Convierte a WebP siempre que sea posible (mejor compresión)
 * 
 * @param file Archivo de imagen a optimizar
 * @param options Opciones personalizadas de compresión (opcional)
 * @returns Promise con el archivo optimizado
 */
export async function optimizeImage(
  file: File,
  options?: Partial<Options>
): Promise<File> {
  if (!isImageFile(file)) {
    throw new Error('El archivo no es una imagen válida');
  }

  // Calcular tamaño objetivo basado en el tamaño original
  const originalSizeMB = file.size / (1024 * 1024);
  const targetSizeMB = calculateTargetSizeMB(originalSizeMB);

  // Determinar si debemos convertir a WebP
  // WebP ofrece mejor compresión que JPG/PNG, así que siempre intentamos usarlo
  const shouldConvertToWebP = supportsWebP() && 
    (file.type.toLowerCase() === 'image/jpeg' || 
     file.type.toLowerCase() === 'image/jpg' || 
     file.type.toLowerCase() === 'image/png' ||
     file.type.toLowerCase() === 'image/gif');

  // Configurar opciones de compresión
  // Calidad más alta para WebP (0.85) ya que WebP comprime mejor
  // Calidad media para otros formatos (0.75)
  const quality = shouldConvertToWebP ? 0.85 : 0.75;

  const compressionOptions: Options = {
    maxSizeMB: targetSizeMB,
    maxWidthOrHeight: 1920, // Reducir resolución solo si es necesario (mantiene calidad)
    useWebWorker: true,
    fileType: shouldConvertToWebP ? 'image/webp' : undefined, // Convertir a WebP si es posible
    initialQuality: quality,
    alwaysKeepResolution: false, // Permite reducir resolución para lograr el tamaño objetivo
    exifOrientation: 1, // Elimina metadatos EXIF
    ...options, // Permitir sobrescribir opciones
  };

  try {
    // Comprimir la imagen
    const compressedFile = await imageCompression(file, compressionOptions);

    // Obtener el nombre del archivo sin extensión
    const originalName = file.name.replace(/\.[^/.]+$/, '');
    
    // Determinar la extensión final
    // Si convertimos a WebP, usar .webp, sino usar el tipo comprimido
    let finalType: string;
    let finalExtension: string;

    if (shouldConvertToWebP && compressedFile.type === 'image/webp') {
      finalType = 'image/webp';
      finalExtension = 'webp';
    } else if (compressedFile.type === 'image/webp') {
      // Ya era WebP o se convirtió exitosamente
      finalType = 'image/webp';
      finalExtension = 'webp';
    } else if (compressedFile.type.includes('jpeg') || compressedFile.type.includes('jpg')) {
      finalType = 'image/jpeg';
      finalExtension = 'jpg';
    } else if (compressedFile.type === 'image/png') {
      finalType = 'image/png';
      finalExtension = 'png';
    } else {
      // Fallback al tipo original
      finalType = compressedFile.type;
      finalExtension = compressedFile.type.split('/')[1] || 'jpg';
    }

    // Crear un nuevo File con el nombre y tipo correctos
    const optimizedFile = new File(
      [compressedFile],
      `${originalName}.${finalExtension}`,
      {
        type: finalType,
        lastModified: Date.now(),
      }
    );

    return optimizedFile;
  } catch (error) {
    logger.error('Error al optimizar la imagen:', error);
    throw new Error('No se pudo optimizar la imagen. Por favor, intente nuevamente.');
  }
}

/**
 * Optimiza múltiples imágenes en paralelo
 * 
 * @param files Array de archivos de imagen a optimizar
 * @param options Opciones personalizadas de compresión (opcional)
 * @returns Promise con array de archivos optimizados
 */
export async function optimizeImages(
  files: File[],
  options?: Partial<Options>
): Promise<File[]> {
  // Separar imágenes de otros archivos
  const imageFiles = files.filter(isImageFile);
  const nonImageFiles = files.filter(file => !isImageFile(file));

  // Optimizar solo las imágenes
  const optimizedImages = await Promise.all(
    imageFiles.map(file => optimizeImage(file, options))
  );

  // Combinar imágenes optimizadas con archivos no-imagen (sin modificar)
  return [...optimizedImages, ...nonImageFiles];
}

/**
 * Procesa archivos de FileList, optimizando solo las imágenes
 * 
 * @param fileList FileList original
 * @param options Opciones personalizadas de compresión (opcional)
 * @returns Promise con array de archivos (imágenes optimizadas + otros archivos sin modificar)
 */
export async function optimizeFileList(
  fileList: FileList,
  options?: Partial<Options>
): Promise<File[]> {
  const files = Array.from(fileList);
  return optimizeImages(files, options);
}

