import axios from "axios";
import { API_CONFIG } from "../config/api";
import { logger } from "@/utils/logger";
import { authService } from "./authService";
import { sanitizeErrorForLogging } from "@/utils/errorSanitizer";

// ✅ REMOVIDO: TOKEN_KEY - Los tokens ahora están en cookies HttpOnly

// Bandera para evitar múltiples redirecciones simultáneas
let isRedirecting = false;

/**
 * Instancia de axios para peticiones públicas (sin autenticación)
 */
const api = axios.create({
    baseURL: API_CONFIG.PUBLIC_BASE_URL,
    withCredentials: false,
    timeout: 90000, // 90 segundos - timeout para peticiones públicas (autenticación de afiliados puede tomar más de 30 segundos en el backend)
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    validateStatus: function (status) {
        return status >= 200 && status < 300;
    },
});

/**
 * Instancia de axios para peticiones autenticadas
 * ✅ Los tokens ahora se envían automáticamente en cookies HttpOnly
 */
export const authenticatedApi = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    withCredentials: true, // ✅ Habilitado para enviar cookies HttpOnly automáticamente
    timeout: 60000, // 60 segundos - timeout general para peticiones autenticadas
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    validateStatus: function (status) {
        return status >= 200 && status < 300;
    },
});

/**
 * ✅ Interceptor simplificado - Ya no agregamos token Bearer
 * El backend envía tokens en cookies HttpOnly que se envían automáticamente
 */
authenticatedApi.interceptors.request.use(
  (config) => {
    // Si el body es FormData, eliminar Content-Type para que axios lo establezca automáticamente con boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    logger.error('Request interceptor error', error);
    return Promise.reject(error);
  }
);

/**
 * Interceptor de respuestas para APIs públicas
 */
api.interceptors.response.use(
  (response) => {
    logger.debug(`API response ${response.status}`, {
      url: response.config.url,
      method: response.config.method,
      statusText: response.statusText,
    });
    return response;
  },
  (error) => {
    // Detectar errores de CORS específicamente
    const isCorsError = 
      error.code === 'ERR_NETWORK' && 
      !error.response && 
      (error.message?.includes('CORS') || error.message?.includes('Network Error') || error.message?.includes('Failed to fetch'));
    
    if (isCorsError) {
      // En desarrollo, log completo; en producción, sanitizado
      if (import.meta.env.DEV) {
        logger.error("CORS error detected", {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          message: error.message,
          code: error.code,
        });
      } else {
        logger.error("CORS error detected", {
          url: error.config?.url,
          method: error.config?.method,
          code: error.code,
        });
      }
      
      // Agregar información adicional al error para mejor diagnóstico
      const corsError = new Error('Error de CORS: El servidor no permite solicitudes desde este origen. Verifica la configuración del backend.');
      (corsError as any).isCorsError = true;
      (corsError as any).originalError = error;
      return Promise.reject(corsError);
    }
    
    // Sanitizar error para logging en producción
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error("API request error", sanitizedError);
    
    return Promise.reject(error);
  },
);

/**
 * Interceptor de respuestas para APIs autenticadas
 */
authenticatedApi.interceptors.response.use(
  (response) => {
    logger.debug(`Authenticated API response ${response.status}`, {
      url: response.config.url,
      method: response.config.method,
      statusText: response.statusText,
    });
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const currentPath = window.location.pathname;
    const isDashboard = currentPath.includes('/admin') && (currentPath.endsWith('/admin') || currentPath === '/admin');
    const isDashboardQuery = url.includes('/dashboard') || url.includes('/stats') || url.includes('/deliveries');

    // Para errores 403 (permisos), no loguear como error - es lógica de negocio
    if (status === 403) {
      logger.debug('403 Forbidden - Permission denied (expected behavior)', {
        url,
        currentPath,
        isDashboard,
        isDashboardQuery,
      });
    } else if (status === 401) {
      const isAuthValidation = url.includes('/api/auth/me');
      const isAdminRoute = currentPath.startsWith('/admin');
      const hasUser = !!authService.getUser(); // ✅ Verificamos usuario en caché en lugar de token
      
      logger.warn('Unauthorized request in authenticatedApi', {
        url,
        currentPath,
        isAuthValidation,
        isAdminRoute,
        hasUser,
      });
      
      // Si es una petición de validación inicial, dejar que AuthContext lo maneje
      // Esto evita limpiar la sesión prematuramente durante la validación inicial
      if (isAuthValidation) {
        // NO limpiar ni redirigir aquí - AuthContext lo manejará
        // Solo loguear para debugging
      } else if (!isRedirecting) {
        // Si recibimos 401 en cualquier otra petición, el token ha expirado
        // Limpiar sesión y redirigir al login automáticamente
        isRedirecting = true;
        
        logger.info('Token expired (401 received), clearing session and redirecting to login', {
          url,
          currentPath,
          isAdminRoute,
          hadUser: !!authService.getUser(),
        });
        
        // Limpiar la sesión
        authService.clearSession();
        
        // Redirigir al login después de un pequeño delay para evitar problemas de estado
        // Usar window.location en lugar de navigate para forzar una recarga completa
        setTimeout(() => {
          window.location.href = '/auth/login';
          // Resetear la bandera después de un tiempo para permitir futuras redirecciones
          setTimeout(() => {
            isRedirecting = false;
          }, 2000);
        }, 100);
      }
    } else {
      // Para otros errores, sanitizar para logging en producción
      const sanitizedError = sanitizeErrorForLogging(error);
      logger.error("Authenticated API request error", sanitizedError);
    }
    
    return Promise.reject(error);
  },
);

export default api;
