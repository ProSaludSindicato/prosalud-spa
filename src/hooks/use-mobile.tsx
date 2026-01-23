import * as React from "react"

const MOBILE_BREAKPOINT = 768 // Aumentado para detectar móviles en landscape

/**
 * Detecta si el dispositivo es móvil usando múltiples métodos:
 * 1. User Agent (más confiable)
 * 2. Touch screen
 * 3. Tamaño de pantalla (ancho o alto menor al breakpoint)
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const detectMobile = (): boolean => {
      // Método 1: Detectar por User Agent (más confiable)
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      
      // Método 2: Detectar touch screen
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Método 3: Detectar por tamaño de pantalla (ancho O alto menor al breakpoint)
      // Esto funciona tanto en portrait como landscape
      const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT || window.innerHeight < MOBILE_BREAKPOINT;
      
      // Método 4: Detectar si es un dispositivo móvil por características
      // Los móviles generalmente tienen una relación ancho/alto específica
      const aspectRatio = window.innerWidth / window.innerHeight;
      const isMobileAspectRatio = aspectRatio < 1.5 && (window.innerWidth < 1024 || window.innerHeight < 1024);
      
      // Método 5: Detectar por tamaño físico del dispositivo
      // Los móviles raramente tienen más de 1024px en ninguna dimensión
      const maxDimension = Math.max(window.innerWidth, window.innerHeight);
      const isSmallDevice = maxDimension < 1024;
      
      // Método 6: Detectar si está en landscape pero sigue siendo móvil
      // Si tiene touch Y (ancho < 1024 O alto < 768), probablemente es móvil
      const isMobileBySize = hasTouchScreen && (window.innerWidth < 1024 || window.innerHeight < 768);
      
      // Combinar métodos: si es mobile por user agent O (tiene touch Y pantalla pequeña)
      // O si tiene touch Y aspecto de móvil O si tiene touch Y tamaño de móvil
      return isMobileUserAgent || 
             (hasTouchScreen && (isSmallScreen || isMobileAspectRatio || isSmallDevice || isMobileBySize));
    };

    const updateMobile = () => {
      setIsMobile(detectMobile());
    };

    // Detectar inicialmente
    updateMobile();

    // Escuchar cambios de tamaño y orientación
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const mqlHeight = window.matchMedia(`(max-height: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      updateMobile();
    };
    
    mql.addEventListener("change", onChange);
    mqlHeight.addEventListener("change", onChange);
    window.addEventListener('resize', updateMobile);
    window.addEventListener('orientationchange', updateMobile);
    
    return () => {
      mql.removeEventListener("change", onChange);
      mqlHeight.removeEventListener("change", onChange);
      window.removeEventListener('resize', updateMobile);
      window.removeEventListener('orientationchange', updateMobile);
    };
  }, [])

  return !!isMobile
}
