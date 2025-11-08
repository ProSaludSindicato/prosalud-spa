import axios from "axios";
import { API_CONFIG } from "../config/api";
import { logger } from "@/utils/logger";

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

export default api;
