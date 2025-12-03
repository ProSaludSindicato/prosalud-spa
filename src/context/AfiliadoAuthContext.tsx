import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/services/api';
import { API_CONFIG } from '@/config/api';
import { toast } from 'sonner';
import { verifyOtp, VerifyOtpResponse } from '@/services/afiliadosOtpService';
import { authenticateForDataUpdate, AuthenticateForDataUpdateResponse } from '@/services/afiliadosDataUpdateService';

export interface Convenio {
  cliente: string | null;
  proceso: string | null;
  estado: string | null;
  fecha_fin?: string | null;
}

export interface Beneficiario {
  documento_afiliado: string;
  tipo_documento: string;
  documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  parentesco: string;
  sexo: string;
  estado: string | null;
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
  beneficiarios?: Beneficiario[];
  // Campos adicionales del OTP (opcionales, solo disponibles después de autenticación OTP)
  estado_civil?: string | null;
  direccion?: string | null;
  municipio?: string | null;
  telefono?: string | null;
  talla_uniforme?: string | null;
  talla_calzado?: string | null;
  nivel_educacion?: string | null;
  numero_cuenta?: string | null;
  tipo_cuenta?: string | null;
  banco?: string | null;
  eps?: string | null;
  afp?: string | null;
}

interface AfiliadoAuthContextType {
  afiliado: AfiliadoData | null;
  isAuthenticated: boolean;
  isOtpAuthenticated: boolean;
  isDataUpdateAuthenticated: boolean;
  fechaExpedicion: string | null;
  authenticate: (tipoDoc: string, numDoc: string, fechaExp: string) => Promise<AfiliadoData>;
  authenticateWithOtp: (tipoDoc: string, numDoc: string, fechaExp: string, sessionId: string, otp: string) => Promise<AfiliadoData>;
  authenticateForDataUpdate: (tipoDoc: string, numDoc: string, fechaExp: string) => Promise<AfiliadoData>;
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
  const [isOtpAuthenticated, setIsOtpAuthenticated] = useState<boolean>(false);
  const [isDataUpdateAuthenticated, setIsDataUpdateAuthenticated] = useState<boolean>(false);
  const [fechaExpedicion, setFechaExpedicion] = useState<string | null>(null);
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
      setIsOtpAuthenticated(false);
      setIsDataUpdateAuthenticated(false);
      setFechaExpedicion(null);
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
        const { afiliado: storedAfiliado, expiresAt: storedExpiry, isOtpAuthenticated: storedOtpAuth, isDataUpdateAuthenticated: storedDataUpdateAuth, fechaExpedicion: storedFechaExp } = JSON.parse(stored);
        if (storedExpiry && Date.now() < storedExpiry) {
          setAfiliado(storedAfiliado);
          setExpiresAt(storedExpiry);
          setIsOtpAuthenticated(storedOtpAuth || false);
          setIsDataUpdateAuthenticated(storedDataUpdateAuth || false);
          setFechaExpedicion(storedFechaExp || null);
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
        // Preservar flags de autenticación y fecha de expedición al extender sesión
        if (data.isOtpAuthenticated === undefined) {
          data.isOtpAuthenticated = isOtpAuthenticated;
        }
        if (data.isDataUpdateAuthenticated === undefined) {
          data.isDataUpdateAuthenticated = isDataUpdateAuthenticated;
        }
        if (data.fechaExpedicion === undefined) {
          data.fechaExpedicion = fechaExpedicion;
        }
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
      const response = await api.post(API_CONFIG.ENDPOINTS.AFILIADOS_AUTHENTICATE, {
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
      setIsOtpAuthenticated(false); // Autenticación básica, no OTP
      setIsDataUpdateAuthenticated(false);
      setFechaExpedicion(fechaExp); // Guardar fecha de expedición
      lastActivityRef.current = Date.now();
      hasShownExpirationToastRef.current = false;

      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        afiliado: data.afiliado,
        expiresAt: newExpiresAt,
        isOtpAuthenticated: false,
        isDataUpdateAuthenticated: false,
        fechaExpedicion: fechaExp,
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
    setIsOtpAuthenticated(false);
    setIsDataUpdateAuthenticated(false);
    setFechaExpedicion(null);
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

  const authenticateWithOtp = useCallback(async (
    tipoDoc: string,
    numDoc: string,
    fechaExp: string,
    sessionId: string,
    otp: string
  ): Promise<AfiliadoData> => {
    try {
      const response: VerifyOtpResponse = await verifyOtp({
        tipo_documento: tipoDoc,
        documento: numDoc,
        fecha_expedicion: fechaExp,
        session_id: sessionId,
        otp: otp,
      });

      if (!response.success || !response.data?.afiliado) {
        throw new Error('Respuesta inválida del servidor');
      }

      // Transformar los datos de la API al formato esperado por el contexto
      const afiliadoData: AfiliadoData = {
        tipo_documento: response.data.afiliado.tipo_documento || null,
        documento: response.data.afiliado.documento || null,
        nombres: response.data.afiliado.nombres || null,
        apellidos: response.data.afiliado.apellidos || null,
        estado: response.data.afiliado.estado || null,
        celular: response.data.afiliado.celular || null,
        correo_personal: response.data.afiliado.correo_personal || null,
        convenios: response.data.convenios.map((c) => ({
          cliente: c.cliente || null,
          proceso: c.proceso || null,
          estado: c.estado || null,
          fecha_fin: c.fecha_fin || null,
        })),
        beneficiarios: response.data.beneficiarios?.map((b) => {
          // El API parece intercambiar parentesco y sexo en algunos casos
          // parentesco puede venir como "M" (sexo) y sexo como "HIJO" (parentesco)
          const parentescoValue = b.parentesco || '';
          const sexoValue = b.sexo || '';
          
          // Determinar cuál es cuál basándose en los valores posibles
          const parentescosValidos = ['MADRE', 'PADRE', 'HIJA', 'HIJO', 'CONYUGUE'];
          const sexosValidos = ['M', 'F', 'MASCULINO', 'FEMENINO'];
          
          let parentescoFinal = parentescoValue;
          let sexoFinal = sexoValue;
          
          // Si parentesco tiene un valor de sexo, intercambiar
          if (sexosValidos.includes(parentescoValue.toUpperCase()) && parentescosValidos.includes(sexoValue.toUpperCase())) {
            parentescoFinal = sexoValue;
            sexoFinal = parentescoValue;
          } else if (sexosValidos.includes(parentescoValue.toUpperCase())) {
            // Solo parentesco es sexo
            sexoFinal = parentescoValue;
            parentescoFinal = sexoValue || '';
          } else if (parentescosValidos.includes(sexoValue.toUpperCase())) {
            // Solo sexo es parentesco
            parentescoFinal = sexoValue;
            sexoFinal = parentescoValue || '';
          }
          
          return {
            documento_afiliado: b.documento_afiliado || '',
            tipo_documento: b.tipo_documento || '',
            documento: b.documento || '',
            nombres: b.nombres || '',
            apellidos: b.apellidos || '',
            fecha_nacimiento: b.fecha_nacimiento || '',
            parentesco: parentescoFinal,
            sexo: sexoFinal,
            estado: b.estado || null,
          };
        }) || [],
        // Campos adicionales del OTP
        estado_civil: response.data.afiliado.estado_civil || null,
        direccion: response.data.afiliado.direccion || null,
        municipio: response.data.afiliado.municipio || null,
        telefono: response.data.afiliado.telefono || null,
        talla_uniforme: response.data.afiliado.talla_uniforme || null,
        talla_calzado: response.data.afiliado.talla_calzado || null,
        nivel_educacion: response.data.afiliado.nivel_educacion || null,
        numero_cuenta: response.data.afiliado.numero_cuenta || null,
        tipo_cuenta: response.data.afiliado.tipo_cuenta || null,
        banco: response.data.afiliado.banco || null,
        eps: response.data.afiliado.eps || null,
        afp: response.data.afiliado.afp || null,
      };

      const newExpiresAt = Date.now() + SESSION_DURATION;
      setAfiliado(afiliadoData);
      setExpiresAt(newExpiresAt);
      setIsOtpAuthenticated(true); // Autenticación con OTP
      setIsDataUpdateAuthenticated(false);
      setFechaExpedicion(fechaExp); // Guardar fecha de expedición
      lastActivityRef.current = Date.now();
      hasShownExpirationToastRef.current = false;

      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        afiliado: afiliadoData,
        expiresAt: newExpiresAt,
        isOtpAuthenticated: true,
        isDataUpdateAuthenticated: false,
        fechaExpedicion: fechaExp,
      }));

      return afiliadoData;
    } catch (error: any) {
      // El servicio ya maneja los errores y los convierte en mensajes de error descriptivos
      throw error;
    }
  }, []);

  const authenticateForDataUpdateMethod = useCallback(async (
    tipoDoc: string,
    numDoc: string,
    fechaExp: string
  ): Promise<AfiliadoData> => {
    try {
      const response: AuthenticateForDataUpdateResponse = await authenticateForDataUpdate({
        tipo_documento: tipoDoc,
        documento: numDoc,
        fecha_expedicion: fechaExp,
      });

      if (!response.success || !response.data?.afiliado) {
        throw new Error('Respuesta inválida del servidor');
      }

      // Transformar los datos de la API al formato esperado por el contexto
      const afiliadoData: AfiliadoData = {
        tipo_documento: response.data.afiliado.tipo_documento || null,
        documento: response.data.afiliado.documento || null,
        nombres: response.data.afiliado.nombres || null,
        apellidos: response.data.afiliado.apellidos || null,
        estado: response.data.afiliado.estado || null,
        celular: response.data.afiliado.celular || null,
        correo_personal: response.data.afiliado.correo_personal || null,
        convenios: response.data.convenios.map((c) => ({
          cliente: c.cliente || null,
          proceso: c.proceso || null,
          estado: c.estado || null,
          fecha_fin: c.fecha_fin || null,
        })),
        beneficiarios: response.data.beneficiarios?.map((b) => {
          // El API parece intercambiar parentesco y sexo en algunos casos
          // parentesco puede venir como "M" (sexo) y sexo como "HIJO" (parentesco)
          const parentescoValue = b.parentesco || '';
          const sexoValue = b.sexo || '';
          
          // Determinar cuál es cuál basándose en los valores posibles
          const parentescosValidos = ['MADRE', 'PADRE', 'HIJA', 'HIJO', 'CONYUGUE'];
          const sexosValidos = ['M', 'F', 'MASCULINO', 'FEMENINO'];
          
          let parentescoFinal = parentescoValue;
          let sexoFinal = sexoValue;
          
          // Si parentesco tiene un valor de sexo, intercambiar
          if (sexosValidos.includes(parentescoValue.toUpperCase()) && parentescosValidos.includes(sexoValue.toUpperCase())) {
            parentescoFinal = sexoValue;
            sexoFinal = parentescoValue;
          } else if (sexosValidos.includes(parentescoValue.toUpperCase())) {
            // Solo parentesco es sexo
            sexoFinal = parentescoValue;
            parentescoFinal = sexoValue || '';
          } else if (parentescosValidos.includes(sexoValue.toUpperCase())) {
            // Solo sexo es parentesco
            parentescoFinal = sexoValue;
            sexoFinal = parentescoValue || '';
          }
          
          return {
            documento_afiliado: b.documento_afiliado || '',
            tipo_documento: b.tipo_documento || '',
            documento: b.documento || '',
            nombres: b.nombres || '',
            apellidos: b.apellidos || '',
            fecha_nacimiento: '', // No viene en la respuesta por seguridad
            parentesco: parentescoFinal,
            sexo: sexoFinal,
            estado: b.estado || null,
          };
        }) || [],
        // Campos adicionales
        estado_civil: response.data.afiliado.estado_civil || null,
        direccion: response.data.afiliado.direccion || null,
        municipio: response.data.afiliado.municipio || null,
        telefono: response.data.afiliado.telefono || null,
        talla_uniforme: response.data.afiliado.talla_uniforme || null,
        talla_calzado: response.data.afiliado.talla_calzado || null,
        nivel_educacion: response.data.afiliado.nivel_educacion || null,
        numero_cuenta: response.data.afiliado.numero_cuenta || null,
        tipo_cuenta: response.data.afiliado.tipo_cuenta || null,
        banco: response.data.afiliado.banco || null,
        eps: response.data.afiliado.eps || null,
        afp: response.data.afiliado.afp || null,
      };

      const newExpiresAt = Date.now() + SESSION_DURATION;
      setAfiliado(afiliadoData);
      setExpiresAt(newExpiresAt);
      setIsOtpAuthenticated(false); // No es autenticación OTP
      setIsDataUpdateAuthenticated(true); // Autenticación para actualización de datos
      setFechaExpedicion(fechaExp); // Guardar fecha de expedición
      lastActivityRef.current = Date.now();
      hasShownExpirationToastRef.current = false;

      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        afiliado: afiliadoData,
        expiresAt: newExpiresAt,
        isOtpAuthenticated: false,
        isDataUpdateAuthenticated: true,
        fechaExpedicion: fechaExp,
      }));

      return afiliadoData;
    } catch (error: any) {
      // El servicio ya maneja los errores y los convierte en mensajes de error descriptivos
      throw error;
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
    isOtpAuthenticated,
    isDataUpdateAuthenticated,
    fechaExpedicion,
    authenticate,
    authenticateWithOtp,
    authenticateForDataUpdate: authenticateForDataUpdateMethod,
    logout,
    getActiveConvenio,
  }), [afiliado, isOtpAuthenticated, isDataUpdateAuthenticated, fechaExpedicion, authenticate, authenticateWithOtp, authenticateForDataUpdateMethod, logout, getActiveConvenio]);

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
