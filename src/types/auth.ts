/**
 * Tipos relacionados con autenticación, roles y permisos
 */

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

export interface LoginResponse {
  token: string;
  token_type: string;
  expires_at: string;
  user: AuthUser;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: Permission[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissions: number[]; // IDs de permisos
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permissions?: number[];
}

export interface UpdatePermissionPayload {
  name: string;
  description?: string;
}

/**
 * Tipos de helpers de autenticación
 */
export interface AuthHelpers {
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  canAll: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
}


