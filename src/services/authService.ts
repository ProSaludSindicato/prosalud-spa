import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '@/config/api';
import { logger } from '@/utils/logger';

/**
 * Tipos de respuesta del backend
 * NOTA: El campo 'token' puede estar presente en la respuesta, pero ya no se usa.
 * Los tokens ahora se almacenan en cookies HttpOnly por el backend.
 */
export interface LoginResponse {
  token?: string; // ✅ Opcional - ya no se usa, el token está en cookies HttpOnly
  token_type?: string;
  expires_at?: string;
  user: AuthUser;
}

export interface AuthUser {
  id: string | number;
  name: string;
  email: string;
  is_active: boolean;
  roles: string[];
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  device_name?: string;
  recaptcha_token?: string;
  recaptcha_action?: string;
}

/**
 * Constantes para el storage
 * NOTA: Los tokens ahora se almacenan en cookies HttpOnly por el backend
 * Solo almacenamos datos del usuario en localStorage (no sensibles)
 */
const USER_KEY = 'prosalud_auth_user';

/**
 * Servicio de autenticación con Bearer tokens
 */
class AuthService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      withCredentials: true, // ✅ Habilitado para enviar cookies HttpOnly automáticamente
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // ✅ Ya no necesitamos interceptor para agregar token Bearer
    // El backend envía tokens en cookies HttpOnly que se envían automáticamente

    // Interceptor para manejar errores de autenticación
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          const isAuthMeRequest = error.config?.url?.includes('/api/auth/me');
          const currentPath = window.location.pathname;
          const isAdminRoute = currentPath.startsWith('/admin');
          
          logger.warn('Unauthorized request in authService', {
            url: error.config?.url,
            status: error.response?.status,
            isAuthMeRequest,
            currentPath,
            isAdminRoute,
          });
          
          // Si es una petición de validación inicial, dejar que AuthContext lo maneje
          // Esto evita limpiar la sesión prematuramente durante la validación inicial
          if (!isAuthMeRequest && isAdminRoute) {
            // Si no es validación inicial y estamos en admin, limpiar y redirigir
            logger.info('Token expired in authService (non-validation request), clearing session and redirecting to login');
            this.clearSession();
            
            setTimeout(() => {
              window.location.href = '/auth/login';
            }, 100);
          }
          // Si es validación inicial, dejar que AuthContext lo maneje
        }

        // Si recibimos 403 cuenta desactivada
        if (error.response?.status === 403) {
          logger.warn('Account disabled or forbidden', {
            url: error.config?.url,
          });
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Login con credenciales
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const payload: any = {
        email: credentials.email,
        password: credentials.password,
        device_name: credentials.device_name || 'Panel Admin',
      };

      // Agregar token de reCAPTCHA si está disponible
      if (credentials.recaptcha_token) {
        payload.recaptcha_token = credentials.recaptcha_token;
      }
      if (credentials.recaptcha_action) {
        payload.recaptcha_action = credentials.recaptcha_action;
      }

      logger.info('Attempting login', { email: credentials.email });

      const response = await this.api.post<LoginResponse>('/api/auth/login', payload);
      const { data } = response;

      // ✅ El token ahora se almacena en cookies HttpOnly por el backend
      // Solo guardamos datos del usuario en localStorage (no sensibles)
      this.setUser(data.user);

      logger.info('Login successful', { userId: data.user.id });

      return data;
    } catch (error: any) {
      logger.error('Login failed', {
        email: credentials.email,
        status: error.response?.status,
        message: error.response?.data?.message,
      });

      // Re-lanzar con mensaje apropiado
      const message = error.response?.data?.message || 'Error de autenticación';
      throw new Error(message);
    }
  }

  /**
   * Obtener usuario autenticado actual
   */
  async me(): Promise<AuthUser> {
    try {
      logger.info('Fetching current user from backend');
      const response = await this.api.get('/api/auth/me');
      
      // Log la respuesta completa para debugging
      logger.debug('Response from /api/auth/me', {
        status: response.status,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
      });
      
      // Manejar diferentes estructuras de respuesta
      let userData: AuthUser | null = null;
      
      // Opción 1: Respuesta con user wrapper { user: { id, name, email, ... } }
      if (response.data?.user && typeof response.data.user === 'object') {
        userData = response.data.user;
        logger.debug('Using response.data.user structure');
      }
      // Opción 2: Respuesta envuelta { data: { user } }
      else if (response.data?.data && typeof response.data.data === 'object') {
        userData = response.data.data;
        logger.debug('Using response.data.data structure');
      } 
      // Opción 3: Respuesta directa { id, name, email, ... }
      else if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        // Verificar que tenga al menos un campo de usuario
        if (response.data.id || response.data.email || response.data.name) {
          userData = response.data;
          logger.debug('Using direct response.data structure');
        }
      }
      // Opción 4: Respuesta con success wrapper { success: true, data: { user } }
      else if (response.data?.success && response.data?.data) {
        userData = response.data.data;
        logger.debug('Using success wrapper structure');
      }
      
      // Si no se pudo extraer el usuario, lanzar error con detalles
      if (!userData) {
        logger.error('Invalid response structure from /api/auth/me', {
          responseData: response.data,
          responseStatus: response.status,
          responseHeaders: response.headers,
        });
        throw new Error(`Invalid response structure from /api/auth/me. Received: ${JSON.stringify(response.data)}`);
      }
      
      // Validar que el usuario tenga los campos mínimos requeridos
      if (!userData.id && !userData.email) {
        logger.error('User data missing required fields', { userData });
        throw new Error('User data missing required fields (id or email)');
      }
      
      // Asegurar que roles y permissions sean arrays
      if (!Array.isArray(userData.roles)) {
        userData.roles = [];
      }
      if (!Array.isArray(userData.permissions)) {
        userData.permissions = [];
      }
      
      logger.info('User fetched successfully', { 
        rolesCount: userData.roles?.length || 0,
        permissionsCount: userData.permissions?.length || 0,
      });
      
      this.setUser(userData);
      return userData;
    } catch (error: any) {
      logger.error('Failed to fetch current user', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        responseData: error.response?.data,
        url: error.config?.url,
      });
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await this.api.post('/api/auth/logout');
      logger.info('Logout successful');
    } catch (error: any) {
      logger.error('Logout failed', {
        status: error.response?.status,
        message: error.response?.data?.message,
      });
    } finally {
      // Siempre limpiar la sesión local
      this.clearSession();
    }
  }

  /**
   * ✅ REMOVIDO: Gestión del token en localStorage
   * Los tokens ahora se almacenan en cookies HttpOnly por el backend
   * No es necesario ni seguro leer/escribir tokens desde el frontend
   */

  /**
   * Gestión del usuario en localStorage
   */
  getUser(): AuthUser | null {
    try {
      const userJson = localStorage.getItem(USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }

  setUser(user: AuthUser): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      logger.error('Failed to save user', error);
    }
  }

  removeUser(): void {
    try {
      localStorage.removeItem(USER_KEY);
    } catch (error) {
      logger.error('Failed to remove user', error);
    }
  }

  /**
   * Limpiar sesión completa
   * ✅ Ya no limpiamos token de localStorage (está en cookies HttpOnly)
   */
  clearSession(): void {
    this.removeUser();
    // El backend maneja la limpieza de cookies HttpOnly en el endpoint de logout
  }

  /**
   * Verificar si hay una sesión activa
   * ✅ Ya no verificamos token en localStorage, el backend valida las cookies
   * Retornamos true si hay usuario en caché (indicador aproximado)
   */
  hasActiveSession(): boolean {
    const user = this.getUser();
    const hasSession = !!user;
    logger.debug('Checking active session', {
      hasSession,
    });
    return hasSession;
  }

  /**
   * Obtener la instancia de axios configurada
   * Útil para otros servicios que necesiten autenticación
   */
  getApiInstance(): AxiosInstance {
    return this.api;
  }
}

// Exportar instancia única del servicio
export const authService = new AuthService();
export default authService;

