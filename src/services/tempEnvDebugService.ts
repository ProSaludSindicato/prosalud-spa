/**
 * SERVICIO TEMPORAL - SOLO PARA PRUEBAS EN PRODUCCIÓN
 * 
 * Este servicio llama a un endpoint temporal para verificar las variables de entorno.
 * 
 * RUTA DEL ENDPOINT: /functions/v1/temp-env-debug-check-verification
 * 
 * ⚠️ IMPORTANTE: Este servicio y endpoint deben ser ELIMINADOS después de verificar
 * las variables de entorno en producción.
 */

import { logger } from "@/utils/logger";

interface EnvDebugResponse {
  success: boolean;
  message?: string;
  timestamp?: string;
  frontend?: {
    status: Record<string, string>;
    values: Record<string, string>;
  };
  server?: {
    status: Record<string, string>;
  };
  error?: string;
}

/**
 * Verifica las variables de entorno enviándolas al endpoint temporal del servidor
 * para que se impriman en la consola del servidor.
 * 
 * @returns Promise con la respuesta del servidor
 */
export async function checkEnvironmentVariables(): Promise<EnvDebugResponse> {
  try {
    // Recopilar todas las variables de entorno del frontend
    const frontendEnvVars = {
      VITE_PUBLIC_API_BASE_URL: import.meta.env.VITE_PUBLIC_API_BASE_URL,
      VITE_ADMIN_API_BASE_URL: import.meta.env.VITE_ADMIN_API_BASE_URL,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_RECAPTCHA_SITE_KEY: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      VITE_APP_ENABLE_DEBUG_LOGS: import.meta.env.VITE_APP_ENABLE_DEBUG_LOGS,
      // Variables adicionales de Vite
      MODE: import.meta.env.MODE,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD,
    };

    logger.info("🔍 Enviando variables de entorno al endpoint temporal para verificación...");

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/temp-env-debug-check-verification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(frontendEnvVars),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("❌ Error al verificar variables de entorno", { 
        status: response.status, 
        error: errorText 
      });
      return {
        success: false,
        error: `Error ${response.status}: ${errorText}`,
      };
    }

    const data: EnvDebugResponse = await response.json();
    
    logger.info("✅ Variables de entorno verificadas. Revisa los logs del servidor para ver los detalles.");
    
    // También loguear en consola del navegador para referencia rápida
    console.log("📋 Resumen de variables de entorno:", data);
    
    return data;
  } catch (error) {
    logger.error("❌ Error al llamar al endpoint de verificación de variables de entorno", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Función de conveniencia para ejecutar desde la consola del navegador
 * 
 * Uso en consola del navegador:
 * ```javascript
 * import { checkEnvironmentVariables } from '@/services/tempEnvDebugService';
 * await checkEnvironmentVariables();
 * ```
 * 
 * O directamente:
 * ```javascript
 * const { checkEnvironmentVariables } = await import('/src/services/tempEnvDebugService.ts');
 * await checkEnvironmentVariables();
 * ```
 */
export default {
  checkEnvironmentVariables,
};

