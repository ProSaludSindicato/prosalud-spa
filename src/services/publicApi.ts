import axios from "axios";
import { API_CONFIG } from "../config/api";

// API client for public endpoints (no authentication required)
const publicApi = axios.create({
  baseURL: API_CONFIG.PUBLIC_BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Suppress console errors in production for network failures
publicApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Detectar errores de CORS específicamente
    const isCorsError = 
      error.code === 'ERR_NETWORK' && 
      !error.response && 
      (error.message?.includes('CORS') || error.message?.includes('Network Error') || error.message?.includes('Failed to fetch'));
    
    if (isCorsError) {
      // Agregar información adicional al error para mejor diagnóstico
      const corsError = new Error('Error de CORS: El servidor no permite solicitudes desde este origen. Verifica la configuración del backend.');
      (corsError as any).isCorsError = true;
      (corsError as any).originalError = error;
      return Promise.reject(corsError);
    }
    
    // In production, silently handle network errors to prevent console logs
    if (import.meta.env.PROD && error.code === "ERR_NETWORK") {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);

export default publicApi;
