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
  talla_vestimenta?: string | null; // Talla de pijama/vestimenta
  nivel_educacion?: string | null;
  numero_cuenta?: string | null;
  tipo_cuenta?: string | null;
  banco?: string | null;
  eps?: string | null;
  afp?: string | null;
  nombre_contacto_emergencia?: string | null;
  relacion_contacto_emergencia?: string | null;
  telefono_contacto_emergencia?: string | null;
  contacto_emergencia?: string | null; // Campo combinado del backend: "telefono - nombre - relacion"
  rh?: string | null;
  fecha_expedicion?: string | null;
  lugar_nacimiento?: string | null;
  departamento?: string | null;
  pais_nacimiento?: string | null;
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

// Función mejorada para parsear el campo de contacto de emergencia
// Maneja múltiples formatos: nombre puede estar primero, teléfono puede estar en cualquier posición
// El nombre siempre está antes del parentesco/relación
const parseContactoEmergenciaImproved = (value: string | null | undefined): {
  telefono: string;
  nombre: string;
  relacion: string;
} => {
  if (!value || !value.trim()) {
    return { telefono: '', nombre: '', relacion: '' };
  }

  // Dividir por " - " (espacio, guion, espacio) - manejar espacios múltiples
  const parts = value.split(/\s*-\s*/).map((part: string) => part.trim()).filter((part: string) => part.length > 0);
  
  if (parts.length === 0) {
    return { telefono: '', nombre: '', relacion: '' };
  }

  // Función helper para detectar si una parte es un teléfono
  // Un teléfono es: solo números, o empieza con números (puede tener espacios pero principalmente números)
  const isPhone = (part: string): boolean => {
    // Remover espacios para verificar
    const cleaned = part.replace(/\s/g, '');
    // Debe tener al menos 7 dígitos y ser principalmente números (sin letras)
    // También puede empezar con números seguido solo de números
    if (/^\d{7,}$/.test(cleaned)) {
      return true;
    }
    // Si empieza con número y tiene al menos 7 caracteres, verificar que sea principalmente números
    if (/^\d/.test(cleaned) && cleaned.length >= 7) {
      // Debe ser al menos 80% números
      const digitCount = (cleaned.match(/\d/g) || []).length;
      return digitCount >= 7 && (digitCount / cleaned.length) >= 0.8;
    }
    return false;
  };

  // Lista de parentescos comunes para identificar relaciones
  // Incluye variaciones en mayúsculas, minúsculas, con acentos y con "/a"
  const parentescosComunes = [
    'madre', 'padre', 'mamá', 'mama', 'papá', 'papa',
    'hijo', 'hija', 'hijo/a', 'hija/a',
    'hermano', 'hermana', 'hermano/a', 'hermana/a',
    'conyuge', 'cónyuge', 'conyugue', 'cónyugue', 'esposo', 'esposa',
    'abuelo', 'abuela', 'abuelo/a', 'abuela/a',
    'tio', 'tío', 'tia', 'tía', 'tio/a', 'tía/a',
    'primo', 'prima', 'primo/a', 'prima/a',
    'amigo', 'amiga', 'amigo/a', 'amiga/a',
    'pareja', 'otro'
  ];

  // Función helper para detectar si una parte es un parentesco/relación
  const isRelacion = (part: string): boolean => {
    const normalized = part.toLowerCase().trim();
    return parentescosComunes.some(p => normalized === p || normalized.includes(p));
  };

  // Identificar qué parte es teléfono, nombre y relación
  let telefono = '';
  let nombre = '';
  let relacion = '';

  // Primero, identificar el teléfono (puede estar en cualquier posición)
  const phoneIndex = parts.findIndex(p => isPhone(p));
  if (phoneIndex !== -1) {
    telefono = parts[phoneIndex];
  }

  // Identificar la relación (puede estar en cualquier posición excepto donde está el teléfono)
  const relacionIndex = parts.findIndex((p, idx) => idx !== phoneIndex && isRelacion(p));
  if (relacionIndex !== -1) {
    relacion = parts[relacionIndex];
  }

  // El nombre es lo que queda: la parte que no es teléfono ni relación
  // REGLA: El nombre siempre está antes del parentesco/relación
  // Si el teléfono está primero, el nombre viene después del teléfono
  
  if (relacionIndex !== -1) {
    // Hay relación identificada
    if (phoneIndex !== -1) {
      // Hay teléfono y relación
      // El nombre es todo lo que está antes de la relación y no es el teléfono
      const nombreParts = parts.slice(0, relacionIndex).filter((p, idx) => idx !== phoneIndex);
      nombre = nombreParts.join(' ').trim();
      
      // Si no encontramos nombre pero hay 3 partes, asumir formato según posiciones
      if (!nombre && parts.length === 3) {
        if (phoneIndex === 0 && relacionIndex === 1) {
          // "telefono - relacion - nombre" → nombre al final
          nombre = parts[2];
        } else if (phoneIndex === 0 && relacionIndex === 2) {
          // "telefono - nombre - relacion" → nombre en medio
          nombre = parts[1];
        } else {
          // "nombre - relacion - telefono" (caso normal)
          nombre = parts[0];
        }
      }
    } else {
      // Hay relación pero no teléfono identificado
      // El nombre es todo lo que está antes de la relación
      nombre = parts.slice(0, relacionIndex).join(' ').trim();
    }
  } else if (phoneIndex !== -1) {
    // Hay teléfono pero no relación
    if (phoneIndex === 0) {
      // Teléfono está primero: "telefono - nombre"
      nombre = parts.slice(1).join(' ').trim();
    } else {
      // Teléfono está después: "nombre - telefono"
      nombre = parts.slice(0, phoneIndex).join(' ').trim();
    }
  } else {
    // No hay teléfono ni relación identificada, todo es nombre
    nombre = parts.join(' ').trim();
  }

  // Casos especiales para 3 partes cuando no identificamos relación:
  if (parts.length === 3 && phoneIndex !== -1 && relacionIndex === -1) {
    // La parte del medio probablemente es la relación (aunque no la reconocimos)
    relacion = parts[1];
    if (phoneIndex === 0) {
      // "telefono - relacion - nombre"
      nombre = parts[2];
    } else if (phoneIndex === 2) {
      // "nombre - relacion - telefono"
      nombre = parts[0];
    } else {
      // "nombre - telefono - relacion" (menos común)
      nombre = parts[0];
      relacion = parts[2];
    }
  }

  // Casos especiales para 3 partes cuando no identificamos teléfono:
  if (parts.length === 3 && phoneIndex === -1 && relacionIndex !== -1) {
    nombre = parts[0];
    // La última parte podría ser teléfono aunque no lo reconocimos
    if (parts[2] && /^\d/.test(parts[2].replace(/\s/g, ''))) {
      telefono = parts[2];
    }
  }

  return {
    telefono: telefono || '',
    nombre: nombre || '',
    relacion: relacion || '',
  };
};

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
        // Campos adicionales del OTP - según lista oficial de keys esperadas
        fecha_expedicion: response.data.afiliado.fecha_expedicion || fechaExp || null,
        lugar_nacimiento: response.data.afiliado.lugar_nacimiento || null,
        rh: response.data.afiliado.rh || null,
        estado_civil: response.data.afiliado.estado_civil || null,
        direccion: response.data.afiliado.direccion || null,
        departamento: response.data.afiliado.departamento || null,
        municipio: response.data.afiliado.municipio || null,
        telefono: response.data.afiliado.telefono || null,
        // celular ya está mapeado arriba
        // correo_personal ya está mapeado arriba
        contacto_emergencia: response.data.afiliado.contacto_emergencia || null,
        talla_uniforme: response.data.afiliado.talla_uniforme || null,
        talla_calzado: response.data.afiliado.talla_calzado || null,
        // Campos adicionales que pueden venir pero no están en la lista oficial
        talla_vestimenta: (response.data.afiliado as any).talla_vestimenta || (response.data.afiliado as any).talla_pijama || response.data.afiliado.talla_uniforme || null,
        nivel_educacion: (response.data.afiliado as any).nivel_educacion || null,
        numero_cuenta: (response.data.afiliado as any).numero_cuenta || null,
        tipo_cuenta: (response.data.afiliado as any).tipo_cuenta || null,
        banco: (response.data.afiliado as any).banco || null,
        eps: (response.data.afiliado as any).eps || null,
        afp: (response.data.afiliado as any).afp || null,
        pais_nacimiento: (response.data.afiliado as any).pais_nacimiento || null,
        // Si ya vienen separados, usarlos; si no, parsear desde contacto_emergencia
        ...((response.data.afiliado as any).contacto_emergencia && !(response.data.afiliado as any).telefono_contacto_emergencia ? (() => {
          // Parsear el campo combinado con función mejorada
          const contacto = (response.data.afiliado as any).contacto_emergencia;
          const parsed = parseContactoEmergenciaImproved(contacto);
          return {
            telefono_contacto_emergencia: parsed.telefono || '',
            nombre_contacto_emergencia: parsed.nombre || '',
            relacion_contacto_emergencia: parsed.relacion || '',
          };
        })() : {
          telefono_contacto_emergencia: (response.data.afiliado as any).telefono_contacto_emergencia || null,
          nombre_contacto_emergencia: (response.data.afiliado as any).nombre_contacto_emergencia || null,
          relacion_contacto_emergencia: (response.data.afiliado as any).relacion_contacto_emergencia || null,
        }),
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
            fecha_nacimiento: b.fecha_nacimiento || '', // Usar fecha_nacimiento del API si está disponible
            parentesco: parentescoFinal,
            sexo: sexoFinal,
            estado: b.estado || null,
          };
        }) || [],
        // Campos adicionales - según lista oficial de keys esperadas
        fecha_expedicion: response.data.afiliado.fecha_expedicion || fechaExp || null,
        lugar_nacimiento: response.data.afiliado.lugar_nacimiento || null,
        rh: response.data.afiliado.rh || null,
        estado_civil: response.data.afiliado.estado_civil || null,
        direccion: response.data.afiliado.direccion || null,
        departamento: response.data.afiliado.departamento || null,
        municipio: response.data.afiliado.municipio || null,
        telefono: response.data.afiliado.telefono || null,
        // celular ya está mapeado arriba
        // correo_personal ya está mapeado arriba
        contacto_emergencia: response.data.afiliado.contacto_emergencia || null,
        talla_uniforme: response.data.afiliado.talla_uniforme || null,
        talla_calzado: response.data.afiliado.talla_calzado || null,
        // Campos adicionales que pueden venir pero no están en la lista oficial
        talla_vestimenta: (response.data.afiliado as any).talla_vestimenta || (response.data.afiliado as any).talla_pijama || response.data.afiliado.talla_uniforme || null,
        nivel_educacion: (response.data.afiliado as any).nivel_educacion || null,
        numero_cuenta: (response.data.afiliado as any).numero_cuenta || null,
        tipo_cuenta: (response.data.afiliado as any).tipo_cuenta || null,
        banco: (response.data.afiliado as any).banco || null,
        eps: (response.data.afiliado as any).eps || null,
        afp: (response.data.afiliado as any).afp || null,
        pais_nacimiento: (response.data.afiliado as any).pais_nacimiento || null,
        // Si ya vienen separados, usarlos; si no, parsear desde contacto_emergencia
        ...(response.data.afiliado.contacto_emergencia && !response.data.afiliado.telefono_contacto_emergencia ? (() => {
          // Parsear el campo combinado con función mejorada
          const contacto = response.data.afiliado.contacto_emergencia;
          const parsed = parseContactoEmergenciaImproved(contacto);
          return {
            telefono_contacto_emergencia: parsed.telefono || '',
            nombre_contacto_emergencia: parsed.nombre || '',
            relacion_contacto_emergencia: parsed.relacion || '',
          };
        })() : {
          telefono_contacto_emergencia: response.data.afiliado.telefono_contacto_emergencia || null,
          nombre_contacto_emergencia: response.data.afiliado.nombre_contacto_emergencia || null,
          relacion_contacto_emergencia: response.data.afiliado.relacion_contacto_emergencia || null,
        }),
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
