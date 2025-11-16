import axios from "axios";
import { API_CONFIG } from "../config/api";
import { logger } from "@/utils/logger";

const TOKEN_KEY = 'prosalud_auth_token';

/**
 * Instancia de axios para peticiones públicas (sin autenticación)
 */
const api = axios.create({
    baseURL: API_CONFIG.PUBLIC_BASE_URL,
    withCredentials: false,
    timeout: 10000,
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
    timeout: 15000,
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
    logger.error("Authenticated API request error", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      code: error.code,
    });

    // Si recibimos 401, NO hacer nada aquí
    // Dejar que AuthContext maneje completamente la limpieza de sesión
    // Esto evita limpiar la sesión prematuramente durante la validación inicial
    if (error.response?.status === 401) {
      const isAuthValidation = error.config?.url?.includes('/api/auth/me');
      
      logger.warn('Unauthorized request in authenticatedApi', {
        url: error.config?.url,
        currentPath: window.location.pathname,
        isAuthValidation,
      });
      
      // NO limpiar ni redirigir aquí - AuthContext lo manejará
      // Solo loguear para debugging
    }

    // Si recibimos 403 (cuenta desactivada u otro error de autorización)
    if (error.response?.status === 403) {
      logger.warn('Forbidden access', {
        url: error.config?.url,
      });
    }
    
    return Promise.reject(error);
  },
);

export default api;
