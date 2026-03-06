// Validación de variables de entorno para URLs de API
// IMPORTANTE: Las variables de entorno deben estar configuradas - sin fallbacks hardcodeados por seguridad
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!VITE_API_BASE_URL) {
  throw new Error(
    'VITE_API_BASE_URL debe estar definida en las variables de entorno. ' +
    'Esta variable es requerida para el funcionamiento de la aplicación.'
  );
}

// PUBLIC_BASE_URL puede usar VITE_PUBLIC_API_BASE_URL específica o VITE_API_BASE_URL como fallback
const PUBLIC_BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL || VITE_API_BASE_URL;

// ADMIN_BASE_URL puede usar VITE_ADMIN_API_BASE_URL específica o VITE_API_BASE_URL como fallback
const ADMIN_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || VITE_API_BASE_URL;

export const API_CONFIG = {
  PUBLIC_BASE_URL,
  ADMIN_BASE_URL,
  BASE_URL: VITE_API_BASE_URL,

  // Common endpoints
  ENDPOINTS: {
    COMFENALCO_EVENTS: '/api/comfenalco-events',
    WELLNESS_EVENTS: '/api/wellness-events',
    REQUESTS: '/api/requests',
    USERS: '/api/users',
    ROLES: '/api/roles',
    INVENTORY: '/api/inventory',
    CHATBOT: '/api/chatbot',
    // Afiliados authentication endpoints
    AFILIADOS_AUTHENTICATE: '/api/afiliados/authenticate',
    AFILIADOS_REQUEST_OTP: '/api/afiliados/request-otp',
    AFILIADOS_VERIFY_OTP: '/api/afiliados/verify-otp',
    AFILIADOS_AUTHENTICATE_FOR_DATA_UPDATE: '/api/afiliados/authenticate-for-data-update',
    // Socio Demographic Survey endpoint
    SOCIO_DEMOGRAPHIC_SURVEYS: '/api/socio-demographic-surveys',
    // Kit Bienestar / Entregas de bienestar (públicos)
    KIT_BIENESTAR_CURRENT_TYPE: '/api/kit-bienestar/current-type',
    KIT_BIENESTAR_AUTHENTICATE: '/api/kit-bienestar/authenticate',
    KIT_BIENESTAR_REQUEST: '/api/kit-bienestar/request',
    // Encuesta de vacunación (acceso solo por enlace)
    ENCUESTA_VACUNACION: '/api/encuesta-vacunacion',
    ENCUESTA_VACUNACION_EXPORT_EXCEL: '/api/encuesta-vacunacion/export/excel',
    // Wellness Delivery Requests endpoints
    WELLNESS_DELIVERY_REQUESTS: '/api/wellness-delivery-requests',
  },
} as const;

// Helper functions to build full API URLs
export const buildPublicApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.PUBLIC_BASE_URL}${endpoint}`;
};

export const buildAdminApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.ADMIN_BASE_URL}${endpoint}`;
};

// Legacy function for backward compatibility
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// reCAPTCHA configuration (Enterprise)
// IMPORTANTE: VITE_RECAPTCHA_SITE_KEY debe estar definida en las variables de entorno
// Sin fallback por seguridad - la aplicación fallará claramente si no está configurada
if (!import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  throw new Error(
    'VITE_RECAPTCHA_SITE_KEY debe estar definida en las variables de entorno. ' +
    'Esta variable es requerida para el funcionamiento de reCAPTCHA Enterprise.'
  );
}

export const RECAPTCHA_CONFIG = {
  SITE_KEY: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
} as const;

// Environment configuration
export const ENV_CONFIG = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  publicApiUrl: API_CONFIG.PUBLIC_BASE_URL,
  adminApiUrl: API_CONFIG.ADMIN_BASE_URL,
} as const;
