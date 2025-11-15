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
        // Si recibimos 401, limpiamos la sesión
        if (error.response?.status === 401) {
          logger.warn('Unauthorized request', {
            url: error.config?.url,
            status: error.response?.status,
          });
          
          // No limpiar sesión ni redirigir si estamos validando el token al cargar
          // La lógica de limpieza la maneja AuthContext
          const isAuthMeRequest = error.config?.url?.includes('/api/auth/me');
          
          if (!isAuthMeRequest) {
            this.clearSession();
            
            // Redirigir al login solo si no estamos ya ahí
            if (!window.location.pathname.includes('/auth/login')) {
              window.location.href = '/auth/login';
            }
          }
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
      
      // Manejar diferentes estructuras de respuesta
      let userData: AuthUser;
      
      // Si la respuesta tiene data.data (respuesta envuelta)
      if (response.data?.data) {
        userData = response.data.data;
      } 
      // Si la respuesta es directamente el objeto usuario
      else if (response.data?.id || response.data?.email) {
        userData = response.data;
      }
      // Si no tiene la estructura esperada
      else {
        throw new Error('Invalid response structure from /api/auth/me');
      }
      
      logger.info('User fetched successfully', { userId: userData.id });
      this.setUser(userData);
      return userData;
    } catch (error: any) {
      logger.error('Failed to fetch current user', {
        status: error.response?.status,
        message: error.response?.data?.message,
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
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      logger.error('Failed to save token', error);
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
    return !!this.getToken();
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

