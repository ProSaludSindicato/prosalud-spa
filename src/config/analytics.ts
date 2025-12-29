
// Configuración de Google Analytics
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

// Función para inicializar Google Analytics
export const initGA = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_title: document.title,
      page_location: window.location.href,
    });
  }
};

// Eventos predefinidos para tracking
export const AnalyticsEvents = {
  // Formularios
  FORM_SUBMIT: 'form_submit',
  FORM_START: 'form_start',
  FORM_ERROR: 'form_error',
  
  // Navegación
  PAGE_VIEW: 'page_view',
  LINK_CLICK: 'link_click',
  FILE_DOWNLOAD: 'file_download',
  
  // Servicios
  SERVICE_REQUEST: 'service_request',
  CERTIFICATE_REQUEST: 'certificate_request',
  
  // Engagement
  SCROLL_DEPTH: 'scroll_depth',
  TIME_ON_PAGE: 'time_on_page',
} as const;

// Categorías de eventos
export const AnalyticsCategories = {
  FORMS: 'forms',
  NAVIGATION: 'navigation',
  SERVICES: 'services',
  ENGAGEMENT: 'engagement',
  DOWNLOADS: 'downloads',
} as const;
