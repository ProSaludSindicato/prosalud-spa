import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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
const STORAGE_KEY = 'afiliado_auth';

export const AfiliadoAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [afiliado, setAfiliado] = useState<AfiliadoData | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  // Restaurar sesión del localStorage al cargar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { afiliado: storedAfiliado, expiresAt: storedExpiry } = JSON.parse(stored);
        if (storedExpiry && Date.now() < storedExpiry) {
          setAfiliado(storedAfiliado);
          setExpiresAt(storedExpiry);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Verificar expiración periódicamente
  useEffect(() => {
    if (!expiresAt) return;

    const checkExpiration = () => {
      if (Date.now() >= expiresAt) {
        setAfiliado(null);
        setExpiresAt(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    const interval = setInterval(checkExpiration, 60000); // Verificar cada minuto
    return () => clearInterval(interval);
  }, [expiresAt]);

  const authenticate = useCallback(async (tipoDoc: string, numDoc: string, fechaExp: string): Promise<AfiliadoData> => {
    const response = await fetch('https://prosalud.laravel.cloud/api/afiliados/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        tipo_documento: tipoDoc,
        documento: numDoc,
        fecha_expedicion: fechaExp,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Credenciales incorrectas. Verifica tu información.');
      } else if (response.status === 422) {
        throw new Error('Datos inválidos. Verifica la información ingresada.');
      } else if (response.status === 503) {
        throw new Error('Servicio temporalmente no disponible. Intenta más tarde.');
      }
      throw new Error(errorData.message || 'Error al autenticar');
    }

    const data = await response.json();
    if (!data.success || !data.afiliado) {
      throw new Error('Respuesta inválida del servidor');
    }

    const newExpiresAt = Date.now() + SESSION_DURATION;
    setAfiliado(data.afiliado);
    setExpiresAt(newExpiresAt);

    // Guardar en localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      afiliado: data.afiliado,
      expiresAt: newExpiresAt,
    }));

    return data.afiliado;
  }, []);

  const logout = useCallback(() => {
    setAfiliado(null);
    setExpiresAt(null);
    localStorage.removeItem(STORAGE_KEY);
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
