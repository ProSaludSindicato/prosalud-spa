import axios from "axios";
import { API_CONFIG } from "../config/api";
import { logger } from "@/utils/logger";
import { authService } from "./authService";

const TOKEN_KEY = 'prosalud_auth_token';

// Bandera para evitar múltiples redirecciones simultáneas
let isRedirecting = false;

/**
 * Instancia de axios para peticiones públicas (sin autenticación)
 */
const api = axios.create({
    baseURL: API_CONFIG.PUBLIC_BASE_URL,
    withCredentials: false,
    timeout: 20000, // 20 segundos - timeout para peticiones públicas (envío de solicitudes por afiliados)
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    validateStatus: function (status) {
        return status >= 200 && status < 300;
    },
});

/**
 * Instancia de axios para peticiones autenticadas (con token Bearer)
 */
export const authenticatedApi = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    withCredentials: false,
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
 * Interceptor para agregar token Bearer a peticiones autenticadas
 */
authenticatedApi.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Si el body es FormData, eliminar Content-Type para que axios lo establezca automáticamente con boundary
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
    } catch (error) {
      logger.error('Failed to get token from localStorage', error);
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
      logger.error("CORS error detected", {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        message: error.message,
        code: error.code,
      });
      
      // Agregar información adicional al error para mejor diagnóstico
      const corsError = new Error('Error de CORS: El servidor no permite solicitudes desde este origen. Verifica la configuración del backend.');
      (corsError as any).isCorsError = true;
      (corsError as any).originalError = error;
      return Promise.reject(corsError);
    }
    
    logger.error("API request error", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      code: error.code,
    });
    
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
      
      logger.warn('Unauthorized request in authenticatedApi', {
        url,
        currentPath,
        isAuthValidation,
        isAdminRoute,
      });
      
      // Si es una petición de validación inicial, dejar que AuthContext lo maneje
      // Esto evita limpiar la sesión prematuramente durante la validación inicial
      if (isAuthValidation) {
        // NO limpiar ni redirigir aquí - AuthContext lo manejará
        // Solo loguear para debugging
      } else if (isAdminRoute && !isRedirecting) {
        // Si estamos en una ruta del admin y la sesión expiró, redirigir al login
        // Usar bandera para evitar múltiples redirecciones simultáneas
        isRedirecting = true;
        
        logger.info('Session expired in admin route, redirecting to login', {
          url,
          currentPath,
        });
        
        // Limpiar la sesión
        authService.clearSession();
        
        // Redirigir al login después de un pequeño delay para evitar problemas de estado
        // Usar window.location en lugar de navigate para forzar una recarga completa
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 100);
      }
    } else {
      // Para otros errores, loguear normalmente
      logger.error("Authenticated API request error", {
        url,
        method: error.config?.method,
        status,
        statusText: error.response?.statusText,
        message: error.message,
        code: error.code,
      });
    }
    
    return Promise.reject(error);
  },
);

export default api;
