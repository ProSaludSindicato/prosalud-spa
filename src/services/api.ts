import axios from "axios";
import { API_CONFIG } from "../config/api";

// Debug: Log the base URL being used
console.log('🔧 API Base URL:', API_CONFIG.PUBLIC_BASE_URL);

const api = axios.create({
    baseURL: API_CONFIG.PUBLIC_BASE_URL,
    withCredentials: false, // Cambiar a false para APIs públicas
    timeout: 10000, // 10 segundos timeout
    // Ensure that status codes 200-299 are treated as success
    validateStatus: function (status) {
        return status >= 200 && status < 300;
    },
});

// Remover configuración de CSRF para APIs públicas
// api.defaults.xsrfCookieName = "XSRF-TOKEN";
// api.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

// Suppress console errors in production for network failures
api.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    if (import.meta.env.DEV) {
      console.log(`✅ API Response ${response.status}:`, {
        url: response.config.url,
        method: response.config.method,
        status: response.status,
        statusText: response.statusText
      });
    }
    return response;
  },
  (error) => {
    // Log errors for debugging
    console.error(`❌ API Error:`, {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      code: error.code,
      baseURL: error.config?.baseURL,
      fullURL: error.config?.baseURL + error.config?.url,
      headers: error.config?.headers,
      timeout: error.config?.timeout
    });
    
    // Log additional network error details
    if (error.code === "ERR_NETWORK") {
      console.error('🌐 Network Error Details:', {
        message: error.message,
        code: error.code,
        config: {
          baseURL: error.config?.baseURL,
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
          withCredentials: error.config?.withCredentials
        }
      });
    }
    
    return Promise.reject(error);
  },
);

export default api;
