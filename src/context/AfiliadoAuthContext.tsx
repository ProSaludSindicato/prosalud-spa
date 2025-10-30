import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/services/api';
import { API_CONFIG } from '@/config/api';
import { toast } from 'sonner';
import axios from "axios";

export interface Convenio {
  cliente: string | null;
  proceso: string | null;
  estado: string | null;
  fecha_fin?: string | null;
}

export interface AfiliadoData {
  tipo_documento: string | null;
  documento: string | null;
  nombres: string | null;
  apellidos: string | null;
  estado: string | null;
  celular: string | null;
  correo_personal: string | null;
  convenios: Convenio[];
}

interface AfiliadoAuthContextType {
  afiliado: AfiliadoData | null;
  isAuthenticated: boolean;
  authenticate: (tipoDoc: string, numDoc: string, fechaExp: string) => Promise<AfiliadoData>;
  logout: () => void;
  getActiveConvenio: () => Convenio | null;
}

const AfiliadoAuthContext = createContext<AfiliadoAuthContextType | undefined>(undefined);

const SESSION_DURATION = 15 * 60 * 1000; // 15 minutos en milisegundos
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos de inactividad para expirar sesión
const STORAGE_KEY = 'afiliado_auth';

export const AfiliadoAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [afiliado, setAfiliado] = useState<AfiliadoData | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const expirationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownExpirationToastRef = useRef<boolean>(false);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Función para actualizar última actividad
  const updateLastActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Función para verificar inactividad y expirar sesión
  const checkInactivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    if (timeSinceLastActivity >= INACTIVITY_TIMEOUT && afiliado && !hasShownExpirationToastRef.current) {
      hasShownExpirationToastRef.current = true;
      setAfiliado(null);
      setExpiresAt(null);
      localStorage.removeItem(STORAGE_KEY);
      
      // Mostrar toast y redirigir
      toast.warning('Sesión expirada', {
        description: 'Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.',
        duration: 5000,
      });
      
      // Redirigir a la página principal después de un breve delay
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    }
  }, [afiliado]);

  // Restaurar sesión del localStorage al cargar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { afiliado: storedAfiliado, expiresAt: storedExpiry } = JSON.parse(stored);
        if (storedExpiry && Date.now() < storedExpiry) {
          setAfiliado(storedAfiliado);
          setExpiresAt(storedExpiry);
          lastActivityRef.current = Date.now();
          hasShownExpirationToastRef.current = false;
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Detectar actividad del usuario
  useEffect(() => {
    if (!afiliado) return;

    const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateLastActivity();
      
      // Throttle: solo extender sesión cada 30 segundos para evitar actualizaciones excesivas
      if (throttleTimerRef.current) return;
      
      throttleTimerRef.current = setTimeout(() => {
        throttleTimerRef.current = null;
      }, 30000); // 30 segundos
      
      // Si hay sesión activa, extender el tiempo de expiración
      if (expiresAt) {
        const newExpiresAt = Date.now() + SESSION_DURATION;
        setExpiresAt(newExpiresAt);
        // Actualizar en localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const data = JSON.parse(stored);
            data.expiresAt = newExpiresAt;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          } catch {
            // Ignorar errores de parsing
          }
        }
      }
    };

    // Agregar event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Limpiar listeners
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [afiliado, expiresAt, updateLastActivity]);

  // Verificar inactividad periódicamente
  useEffect(() => {
    if (!afiliado) {
      if (expirationTimerRef.current) {
        clearInterval(expirationTimerRef.current);
        expirationTimerRef.current = null;
      }
      return;
    }

    // Verificar inactividad cada minuto
    expirationTimerRef.current = setInterval(() => {
      checkInactivity();
    }, 60000);

    return () => {
      if (expirationTimerRef.current) {
        clearInterval(expirationTimerRef.current);
        expirationTimerRef.current = null;
      }
    };
  }, [afiliado, checkInactivity]);

  const authenticate = useCallback(async (tipoDoc: string, numDoc: string, fechaExp: string): Promise<AfiliadoData> => {
    try {
      const apiTest = axios.create({
        baseURL: 'https://prosalud.test',
        withCredentials: false, // Cambiar a false para APIs públicas
        timeout: 10000, // 10 segundos timeout
        // Ensure that status codes 200-299 are treated as success
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        },
      });

      // const response = await api.post(API_CONFIG.ENDPOINTS.AFILIADOS_AUTHENTICATE, {
      const response = await apiTest.post(API_CONFIG.ENDPOINTS.AFILIADOS_AUTHENTICATE, {
        tipo_documento: tipoDoc,
        documento: numDoc,
        fecha_expedicion: fechaExp,
      });

      const data = response.data;
      if (!data.success || !data.afiliado) {
        throw new Error('Respuesta inválida del servidor');
      }

      const newExpiresAt = Date.now() + SESSION_DURATION;
      setAfiliado(data.afiliado);
      setExpiresAt(newExpiresAt);
      lastActivityRef.current = Date.now();
      hasShownExpirationToastRef.current = false;

      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        afiliado: data.afiliado,
        expiresAt: newExpiresAt,
      }));

      return data.afiliado;
    } catch (error: any) {
      // Mejor manejo de errores con axios
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data || {};
        
        if (status === 401) {
          throw new Error('Credenciales incorrectas. Verifica tu información.');
        } else if (status === 422) {
          const message = errorData.message || 'Datos inválidos. Verifica la información ingresada.';
          throw new Error(message);
        } else if (status === 502) {
          // Error 502: Bad Gateway - el servidor backend no está respondiendo
          console.error('❌ Error 502 - Backend no disponible:', {
            endpoint: API_CONFIG.ENDPOINTS.AFILIADOS_AUTHENTICATE,
            baseURL: error.config?.baseURL,
            url: error.config?.url,
          });
          throw new Error('El servidor backend no está disponible en este momento (Error 502). Por favor, contacta al administrador o intenta más tarde.');
        } else if (status === 503) {
          throw new Error('Servicio temporalmente no disponible. Intenta más tarde.');
        } else if (status >= 500) {
          throw new Error('Error del servidor. Por favor, intenta más tarde.');
        }
        throw new Error(errorData.message || `Error al autenticar (${status})`);
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        // Detectar errores de CORS específicamente
        if (error.message.includes('CORS') || (error.code === 'ERR_NETWORK' && !error.response)) {
          throw new Error('Error de CORS: El servidor no permite solicitudes desde este origen. Contacta al administrador del sistema.');
        }
        throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.');
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('La solicitud tardó demasiado. Por favor, intenta nuevamente.');
      }
      throw new Error(error.message || 'Error desconocido al intentar autenticar');
    }
  }, []);

  const logout = useCallback(() => {
    setAfiliado(null);
    setExpiresAt(null);
    lastActivityRef.current = Date.now();
    hasShownExpirationToastRef.current = false;
    localStorage.removeItem(STORAGE_KEY);
    if (expirationTimerRef.current) {
      clearInterval(expirationTimerRef.current);
      expirationTimerRef.current = null;
    }
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
  }, []);

  const getActiveConvenio = useCallback((): Convenio | null => {
    if (!afiliado?.convenios || afiliado.convenios.length === 0) return null;

    // Buscar convenio activo
    const activeConvenio = afiliado.convenios.find(c => c.estado?.toLowerCase() === 'activo');
    if (activeConvenio) return activeConvenio;

    // Si no hay activo, buscar el más reciente por fecha_fin
    const conveniosConFecha = afiliado.convenios.filter(c => c.fecha_fin);
    if (conveniosConFecha.length === 0) return afiliado.convenios[0];

    return conveniosConFecha.reduce((latest, current) => {
      if (!latest.fecha_fin || !current.fecha_fin) return latest;
      return new Date(current.fecha_fin) > new Date(latest.fecha_fin) ? current : latest;
    });
  }, [afiliado]);

  const value = useMemo(() => ({
    afiliado,
    isAuthenticated: !!afiliado,
    authenticate,
    logout,
    getActiveConvenio,
  }), [afiliado, authenticate, logout, getActiveConvenio]);

  return (
    <AfiliadoAuthContext.Provider value={value}>
      {children}
    </AfiliadoAuthContext.Provider>
  );
};

export const useAfiliadoAuth = () => {
  const context = useContext(AfiliadoAuthContext);
  if (!context) {
    throw new Error('useAfiliadoAuth debe usarse dentro de AfiliadoAuthProvider');
  }
  return context;
};
