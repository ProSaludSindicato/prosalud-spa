// Enable debug logs in development mode or when explicitly enabled
const DEFAULT_DEBUG_ENABLED = import.meta.env.DEV || import.meta.env.MODE === 'development';
const EXPLICIT_DEBUG_FLAG =
  typeof import.meta.env.VITE_APP_ENABLE_DEBUG_LOGS === "string"
    ? import.meta.env.VITE_APP_ENABLE_DEBUG_LOGS === "true"
    : false;

// Always enable logs in development/test environments
const isDebugEnabled = DEFAULT_DEBUG_ENABLED || EXPLICIT_DEBUG_FLAG || import.meta.env.MODE !== 'production';

const originalConsole = {
  log: globalThis.console.log.bind(globalThis.console),
  info: globalThis.console.info.bind(globalThis.console),
  warn: globalThis.console.warn.bind(globalThis.console),
  error: globalThis.console.error.bind(globalThis.console),
  debug: (globalThis.console.debug ?? globalThis.console.log).bind(globalThis.console),
};

type Primitive = string | number | boolean | null | undefined;

const sanitizePayload = (value: unknown): Primitive | Record<string, Primitive> => {
  if (value === null || value === undefined) {
    return value as Primitive;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 3).map((item) => sanitizePayload(item)) as unknown as Primitive;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, 6)
      .map(([key, val]) => [key, sanitizePayload(val)]);
    return Object.fromEntries(entries);
  }

  return undefined;
};

const redactSensitive = (...args: unknown[]) =>
  args.map((arg) => sanitizePayload(arg));

export const logger = {
  debug: (...args: unknown[]) => {
    if (!isDebugEnabled) return;
    originalConsole.debug(...redactSensitive(...args));
  },
  info: (...args: unknown[]) => {
    if (!isDebugEnabled) return;
    originalConsole.info(...redactSensitive(...args));
  },
  warn: (...args: unknown[]) => {
    // Siempre mostrar warnings en desarrollo
    if (isDebugEnabled || import.meta.env.DEV) {
      originalConsole.warn(...redactSensitive(...args));
    } else {
      originalConsole.warn("Se registró un evento. Consulte el sistema de monitoreo para más detalles.");
    }
  },
  error: (...args: unknown[]) => {
    // Filtrar errores 403 del dashboard - son lógica de negocio, no errores reales
    const firstArg = args[0];
    if (typeof firstArg === 'string' && firstArg.includes('403')) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isDashboard = currentPath.includes('/admin') && (currentPath.endsWith('/admin') || currentPath === '/admin');
      if (isDashboard) {
        // No mostrar errores 403 del dashboard en la consola
        return;
      }
    }
    
    // Verificar si el error es un objeto con status 403
    if (typeof firstArg === 'object' && firstArg !== null) {
      const errorObj = firstArg as any;
      const status = errorObj?.response?.status || errorObj?.status;
      if (status === 403) {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const isDashboard = currentPath.includes('/admin') && (currentPath.endsWith('/admin') || currentPath === '/admin');
        const url = errorObj?.config?.url || errorObj?.url || '';
        const isDashboardQuery = url.includes('/dashboard') || url.includes('/stats') || url.includes('/deliveries');
        if (isDashboard || isDashboardQuery) {
          // No mostrar errores 403 del dashboard en la consola
          return;
        }
      }
    }
    
    // Siempre mostrar errores, especialmente en desarrollo
    if (isDebugEnabled || import.meta.env.DEV || import.meta.env.MODE !== 'production') {
      originalConsole.error(...redactSensitive(...args));
    } else {
      originalConsole.error("Se produjo un error. Consulte el sistema de monitoreo para más detalles.");
    }
  },
} as const;

export type Logger = typeof logger;

let guardsInstalled = false;
const GENERIC_WARNING = "Se registró un evento. Consulte el sistema de monitoreo autorizado.";
const GENERIC_ERROR = "Se produjo un error. Consulte el soporte autorizado si persiste.";

export const installConsoleGuards = () => {
  if (guardsInstalled) return;
  guardsInstalled = true;

  if (isDebugEnabled) {
    return;
  }

  globalThis.console.log = () => {};
  globalThis.console.info = () => {};
  globalThis.console.debug = () => {};
  globalThis.console.warn = () => {
    originalConsole.warn(GENERIC_WARNING);
  };
  globalThis.console.error = () => {
    originalConsole.error(GENERIC_ERROR);
  };
};


