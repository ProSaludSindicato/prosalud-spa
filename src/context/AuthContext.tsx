import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, AuthUser, LoginCredentials } from '@/services/authService';
import { logger } from '@/utils/logger';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, deviceName?: string, recaptchaToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Helpers de permisos
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  canAll: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  /**
   * Cargar usuario desde el backend usando el token almacenado
   */
  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      
      // Verificar si hay token
      const token = authService.getToken();
      if (!token) {
        logger.info('No token found in localStorage');
        setUser(null);
        setLoading(false);
        setHasInitialized(true);
        return;
      }

      logger.debug('Token found, attempting to load user');

      // Primero, intentar cargar el usuario desde localStorage para UI instantánea
      const cachedUser = authService.getUser();
      if (cachedUser) {
        logger.debug('Cached user found, setting immediately for instant UI');
        setUser(cachedUser);
        // NO poner loading en false aquí - esperar validación del backend
      }

      // Luego, validar con el backend
      try {
        logger.debug('Validating token with backend...');
        const userData = await authService.me();
        
        // Verificar si el usuario está activo
        if (!userData.is_active) {
          logger.warn('User account is not active');
          authService.clearSession();
          setUser(null);
          setLoading(false);
          return;
        }

        // Actualizar con datos frescos del backend
        setUser(userData);
        logger.debug('User validated successfully with backend');
        setLoading(false);
        setHasInitialized(true);
      } catch (error: any) {
        const errorStatus = error.response?.status;
        const errorMessage = error.message || '';
        const isNetworkError = !errorStatus || errorStatus >= 500 || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';
        
        logger.warn('Error validating token with backend', {
          status: errorStatus,
          message: errorMessage,
          isNetworkError,
          url: error.config?.url,
        });
        
        // Si es error de estructura de respuesta, mantener caché si existe
        if (errorMessage.includes('Invalid response structure')) {
          logger.error('Invalid response structure from backend', {
            error: errorMessage,
            hasCachedUser: !!cachedUser,
          });
          // Si hay usuario en caché, mantenerlo
          if (cachedUser) {
            logger.info('Keeping cached user despite invalid response structure');
            setUser(cachedUser);
            setLoading(false);
            setHasInitialized(true);
            return;
          }
          // Solo limpiar si no hay caché
          authService.clearSession();
          setUser(null);
          setLoading(false);
          setHasInitialized(true);
          return;
        }
        
        // Si es 401 o 403, el token es inválido o la cuenta está desactivada
        if (errorStatus === 401 || errorStatus === 403) {
          const currentPath = window.location.pathname;
          const isAdminRoute = currentPath.startsWith('/admin');
          
          logger.warn('Token invalid or account disabled, clearing session', {
            status: errorStatus,
            message: errorMessage,
            currentPath,
            isAdminRoute,
          });
          
          // Solo limpiar si realmente no hay usuario en caché válido
          // Si hay usuario en caché y acabamos de hacer login, puede ser un problema temporal
          if (!cachedUser) {
            authService.clearSession();
            setUser(null);
            setLoading(false);
            setHasInitialized(true);
            
            // Si estamos en una ruta del admin, redirigir al login
            if (isAdminRoute) {
              logger.info('Redirecting to login from AuthContext due to expired session');
              setTimeout(() => {
                window.location.href = '/auth/login';
              }, 100);
            }
          } else {
            // Si hay usuario en caché, mantenerlo y solo loguear el error
            // Esto evita el ciclo de recarga después del login
            logger.warn('Token validation failed but keeping cached user (may be temporary)', {
              status: errorStatus,
              cachedUserId: cachedUser.id,
            });
            setUser(cachedUser);
            setLoading(false);
            setHasInitialized(true);
          }
          return;
        }
        
        // Para errores de red o timeout, mantener el usuario en caché si existe
        if (isNetworkError || !errorStatus) {
          if (cachedUser) {
            logger.info('Network error but keeping cached user', {
              error: errorMessage,
              cachedUserId: cachedUser.id,
            });
            setUser(cachedUser);
            setLoading(false);
            setHasInitialized(true);
            return;
          }
        }
        
        // Para otros errores (4xx que no sean 401/403), mantener caché si existe
        if (cachedUser) {
          logger.warn('Backend validation failed but keeping cached user', {
            error: errorMessage,
            status: errorStatus,
            cachedUserId: cachedUser.id,
          });
          setUser(cachedUser);
          setLoading(false);
          setHasInitialized(true);
          return;
        }
        
        // Si no hay usuario en caché y hay error, solo limpiar si es 401/403
        if (errorStatus === 401 || errorStatus === 403) {
          logger.error('No cached user and authentication failed', {
            error: errorMessage,
            status: errorStatus,
          });
          authService.clearSession();
          setUser(null);
        } else {
          logger.warn('No cached user but error is not auth-related, keeping token', {
            error: errorMessage,
            status: errorStatus,
          });
        }
        setLoading(false);
        setHasInitialized(true);
      }
    } catch (error: any) {
      logger.error('Unexpected error in loadUser', {
        error: error.message,
        status: error.response?.status,
      });
      // Solo limpiar sesión si es error de autenticación explícito
      const cachedUser = authService.getUser();
      const currentPath = window.location.pathname;
      const isAdminRoute = currentPath.startsWith('/admin');
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        if (!cachedUser) {
          authService.clearSession();
          setUser(null);
          
          // Si estamos en una ruta del admin, redirigir al login
          if (isAdminRoute) {
            logger.info('Redirecting to login from AuthContext (catch block) due to expired session');
            setTimeout(() => {
              window.location.href = '/auth/login';
            }, 100);
          }
        } else {
          // Mantener usuario en caché si existe
          setUser(cachedUser);
        }
      } else if (cachedUser) {
        // Mantener usuario en caché para otros errores
        setUser(cachedUser);
      } else {
        authService.clearSession();
        setUser(null);
      }
      setLoading(false);
      setHasInitialized(true);
    }
  }, []);

  /**
   * Login con credenciales
   */
  const login = useCallback(async (email: string, password: string, deviceName?: string, recaptchaToken?: string) => {
    try {
      const credentials: LoginCredentials = {
        email,
        password,
        device_name: deviceName || 'Panel Admin',
        recaptcha_token: recaptchaToken,
        recaptcha_action: 'login',
      };

      const response = await authService.login(credentials);
      
      // Verificar si el usuario está activo
      if (!response.user.is_active) {
        authService.clearSession();
        throw new Error('Tu cuenta está desactivada. Contacta al administrador.');
      }

      setUser(response.user);
      setLoading(false);
      setHasInitialized(true);
      logger.info('Login successful', { userId: response.user.id });
    } catch (error: any) {
      logger.error('Login failed', error);
      throw error;
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      logger.info('Logout successful');
    } catch (error) {
      logger.error('Logout failed', error);
      // Limpiar sesión incluso si falla
      authService.clearSession();
      setUser(null);
    }
  }, []);

  /**
   * Refrescar usuario (útil después de actualizar permisos)
   * 
   * A diferencia de loadUser (que intenta usar caché primero),
   * aquí forzamos una lectura fresca desde el backend para
   * evitar quedarnos con permisos desactualizados.
   */
  const refreshUser = useCallback(async () => {
    try {
      logger.info('Refreshing user from backend (refreshUser)');
      const userData = await authService.me();

      if (!userData.is_active) {
        logger.warn('Refreshed user is not active, clearing session', { userId: userData.id });
        authService.clearSession();
        setUser(null);
        return;
      }

      setUser(userData);
      logger.info('User refreshed successfully', {
        userId: userData.id,
        email: userData.email,
        roles: userData.roles,
        permissionsCount: userData.permissions?.length || 0,
      });
    } catch (error: any) {
      const status = error.response?.status;
      logger.error('Failed to refresh user', {
        status,
        message: error.message,
      });

      // Si es 401/403 durante refresh explícito, limpiar sesión
      if (status === 401 || status === 403) {
        const currentPath = window.location.pathname;
        const isAdminRoute = currentPath.startsWith('/admin');
        
        authService.clearSession();
        setUser(null);
        
        // Si estamos en una ruta del admin, redirigir al login
        if (isAdminRoute) {
          logger.info('Redirecting to login from AuthContext (refreshUser) due to expired session');
          setTimeout(() => {
            window.location.href = '/auth/login';
          }, 100);
        }
      }
    }
  }, []);

  /**
   * Helper: Verificar si el usuario tiene un permiso específico
   */
  const can = useCallback((permission: string): boolean => {
    if (!user) return false;
    return user.permissions?.includes(permission) || false;
  }, [user]);

  /**
   * Helper: Verificar si el usuario tiene alguno de los permisos
   */
  const canAny = useCallback((permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.some(permission => user.permissions?.includes(permission));
  }, [user]);

  /**
   * Helper: Verificar si el usuario tiene todos los permisos
   */
  const canAll = useCallback((permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.every(permission => user.permissions?.includes(permission));
  }, [user]);

  /**
   * Helper: Verificar si el usuario tiene un rol específico
   */
  const hasRole = useCallback((role: string): boolean => {
    if (!user) return false;
    return user.roles?.includes(role) || false;
  }, [user]);

  /**
   * Helper: Verificar si el usuario tiene alguno de los roles
   */
  const hasAnyRole = useCallback((roles: string[]): boolean => {
    if (!user) return false;
    return roles.some(role => user.roles?.includes(role));
  }, [user]);

  /**
   * Helper: Verificar si el usuario tiene todos los roles
   */
  const hasAllRoles = useCallback((roles: string[]): boolean => {
    if (!user) return false;
    return roles.every(role => user.roles?.includes(role));
  }, [user]);

  /**
   * Cargar usuario al montar el componente
   * Solo ejecutar una vez al inicio, no después de cada navegación
   */
  useEffect(() => {
    if (!hasInitialized) {
      loadUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
      can,
      canAny,
      canAll,
      hasRole,
      hasAnyRole,
      hasAllRoles,
    }),
    [user, loading, login, logout, refreshUser, can, canAny, canAll, hasRole, hasAnyRole, hasAllRoles]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
