export const API_CONFIG = {
  PUBLIC_BASE_URL: import.meta.env.VITE_PUBLIC_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://prosalud.laravel.cloud',
  ADMIN_BASE_URL: import.meta.env.VITE_ADMIN_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://prosalud.laravel.cloud',

  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://prosalud.laravel.cloud',
  // BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://prosalud.test',

  // Common endpoints
  ENDPOINTS: {
    COMFENALCO_EVENTS: '/api/comfenalco-events',
    WELLNESS_EVENTS: '/api/wellness-events',
    WELLNESS_REQUESTS: '/api/wellness-requests',
    REQUESTS: '/api/requests',
    USERS: '/api/users',
    ROLES: '/api/roles',
    INVENTORY: '/api/inventory',
    CHATBOT: '/api/chatbot',
    AFILIADOS_AUTHENTICATE: '/api/afiliados/authenticate',
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

// Environment configuration
export const ENV_CONFIG = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  publicApiUrl: API_CONFIG.PUBLIC_BASE_URL,
  adminApiUrl: API_CONFIG.ADMIN_BASE_URL,
} as const;
