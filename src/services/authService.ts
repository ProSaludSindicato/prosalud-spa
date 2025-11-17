import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '@/config/api';
import { logger } from '@/utils/logger';

/**
 * Tipos de respuesta del backend
 */
export interface LoginResponse {
  token: string;
  token_type: string;
  expires_at: string;
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
}

/**
 * Constantes para el storage
 */
const TOKEN_KEY = 'prosalud_auth_token';
const USER_KEY = 'prosalud_auth_user';

/**
 * Servicio de autenticación con Bearer tokens
 */
class AuthService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      withCredentials: false,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Interceptor para incluir el token en todas las peticiones
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        logger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // Interceptor para manejar errores de autenticación
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Si recibimos 401, NO limpiar sesión aquí
        // Dejar que AuthContext maneje la limpieza de sesión completamente
        if (error.response?.status === 401) {
          const isAuthMeRequest = error.config?.url?.includes('/api/auth/me');
          
          logger.warn('Unauthorized request in authService', {
            url: error.config?.url,
            status: error.response?.status,
            isAuthMeRequest,
            currentPath: window.location.pathname,
          });
          
          // NO hacer nada aquí - dejar que AuthContext maneje todo
          // Esto evita limpiar la sesión prematuramente
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
      const payload = {
        email: credentials.email,
        password: credentials.password,
        device_name: credentials.device_name || 'Panel Admin',
      };

      logger.info('Attempting login', { email: credentials.email });

      const { data } = await this.api.post<LoginResponse>('/api/auth/login', payload);

      // Guardar token y usuario
      this.setToken(data.token);
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
   * Gestión del token en localStorage
   */
  getToken(): string | null {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      logger.debug('Getting token from localStorage', {
        hasToken: !!token,
      });
      return token;
    } catch (error) {
      logger.error('Failed to get token from localStorage', error);
      return null;
    }
  }

  setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      logger.debug('Token saved to localStorage');
    } catch (error) {
      logger.error('Failed to save token to localStorage', error);
    }
  }

  removeToken(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      logger.error('Failed to remove token', error);
    }
  }

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
   */
  clearSession(): void {
    this.removeToken();
    this.removeUser();
  }

  /**
   * Verificar si hay una sesión activa
   */
  hasActiveSession(): boolean {
    const token = this.getToken();
    const hasSession = !!token;
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

