import { useState, useEffect, useCallback } from 'react';

interface UseScreenOrientationReturn {
  isLandscape: boolean;
  canRotate: boolean;
  lockToLandscape: () => Promise<void>;
  unlockOrientation: () => Promise<void>;
  currentOrientation: 'portrait' | 'landscape' | 'unknown';
}

/**
 * Hook para manejar la orientación de pantalla
 * Permite bloquear/desbloquear la orientación en dispositivos que lo soporten
 */
export function useScreenOrientation(): UseScreenOrientationReturn {
  const [isLandscape, setIsLandscape] = useState(false);
  const [canRotate, setCanRotate] = useState(false);
  const [currentOrientation, setCurrentOrientation] = useState<'portrait' | 'landscape' | 'unknown'>('unknown');

  useEffect(() => {
    // Verificar soporte de Screen Orientation API
    const checkSupport = () => {
      if (
        typeof screen !== 'undefined' &&
        'orientation' in screen &&
        screen.orientation &&
        ('lock' in screen.orientation || 'lockOrientation' in screen)
      ) {
        setCanRotate(true);
      } else if (
        typeof screen !== 'undefined' &&
        'orientation' in screen &&
        screen.orientation
      ) {
        // Algunos navegadores soportan la API pero no el lock
        setCanRotate(false);
      }
    };

    checkSupport();

    // Detectar orientación actual
    const updateOrientation = () => {
      if (typeof window !== 'undefined') {
        const angle = window.orientation;
        if (angle === 90 || angle === -90) {
          setIsLandscape(true);
          setCurrentOrientation('landscape');
        } else if (angle === 0 || angle === 180) {
          setIsLandscape(false);
          setCurrentOrientation('portrait');
        } else {
          // Fallback para navegadores que no soportan window.orientation
          const width = window.innerWidth;
          const height = window.innerHeight;
          if (width > height) {
            setIsLandscape(true);
            setCurrentOrientation('landscape');
          } else {
            setIsLandscape(false);
            setCurrentOrientation('portrait');
          }
        }
      }
    };

    updateOrientation();

    // Listeners para cambios de orientación
    window.addEventListener('orientationchange', updateOrientation);
    window.addEventListener('resize', updateOrientation);

    if (typeof screen !== 'undefined' && 'orientation' in screen && screen.orientation) {
      screen.orientation.addEventListener('change', updateOrientation);
    }

    return () => {
      window.removeEventListener('orientationchange', updateOrientation);
      window.removeEventListener('resize', updateOrientation);
      if (typeof screen !== 'undefined' && 'orientation' in screen && screen.orientation) {
        screen.orientation.removeEventListener('change', updateOrientation);
      }
    };
  }, []);

  const lockToLandscape = useCallback(async () => {
    if (!canRotate) {
      console.warn('Screen Orientation API no está disponible en este dispositivo');
      return;
    }

    try {
      if (
        typeof screen !== 'undefined' &&
        'orientation' in screen &&
        screen.orientation &&
        'lock' in screen.orientation
      ) {
        await screen.orientation.lock('landscape');
        setIsLandscape(true);
        setCurrentOrientation('landscape');
      } else if (
        typeof screen !== 'undefined' &&
        'orientation' in screen &&
        'lockOrientation' in screen.orientation
      ) {
        // Fallback para navegadores más antiguos
        (screen.orientation as any).lockOrientation('landscape');
        setIsLandscape(true);
        setCurrentOrientation('landscape');
      }
    } catch (err) {
      // En iOS y algunos navegadores, el lock puede fallar silenciosamente
      // Esto es normal y no es un error crítico
      console.warn('No se pudo bloquear orientación (esto es normal en algunos dispositivos):', err);
    }
  }, [canRotate]);

  const unlockOrientation = useCallback(async () => {
    if (!canRotate) {
      return;
    }

    try {
      if (
        typeof screen !== 'undefined' &&
        'orientation' in screen &&
        screen.orientation &&
        'unlock' in screen.orientation
      ) {
        await screen.orientation.unlock();
      } else if (
        typeof screen !== 'undefined' &&
        'orientation' in screen &&
        'unlockOrientation' in screen.orientation
      ) {
        // Fallback para navegadores más antiguos
        (screen.orientation as any).unlockOrientation();
      }
      // No forzamos portrait aquí, dejamos que el dispositivo vuelva a su orientación preferida
    } catch (err) {
      console.warn('No se pudo desbloquear orientación:', err);
    }
  }, [canRotate]);

  return {
    isLandscape,
    canRotate,
    lockToLandscape,
    unlockOrientation,
    currentOrientation,
  };
}

