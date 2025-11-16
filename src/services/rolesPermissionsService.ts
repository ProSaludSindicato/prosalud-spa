import { authenticatedApi } from './api';
import { logger } from '@/utils/logger';

/**
 * Tipos de respuesta del backend
 */
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
 * Servicio para gestión de Roles y Permisos
 */
class RolesPermissionsService {
  /**
   * ROLES
   */

  /**
   * Obtener listado de roles
   */
  async getRoles(): Promise<Role[]> {
    try {
      logger.info('Fetching roles list');
      const { data } = await authenticatedApi.get<Role[]>('/api/roles');
      return data;
    } catch (error: any) {
      logger.error('Failed to fetch roles', {
        status: error.response?.status,
        message: error.response?.data?.message,
      });
      throw error;
    }
  }

  /**
   * Obtener un rol por ID
   */
  async getRole(roleId: number): Promise<Role> {
    try {
      logger.info('Fetching role', { roleId });
      const { data } = await authenticatedApi.get<Role>(`/api/roles/${roleId}`);
      return data;
    } catch (error: any) {
      logger.error('Failed to fetch role', {
        roleId,
        status: error.response?.status,
        message: error.response?.data?.message,
      });
      throw error;
    }
  }

  /**
   * Crear un nuevo rol
   */
  async createRole(payload: CreateRolePayload): Promise<Role> {
    try {
      logger.info('Creating role', { name: payload.name });
      const { data } = await authenticatedApi.post<Role>('/api/roles', payload);
      logger.info('Role created successfully', { roleId: data.id });
      return data;
    } catch (error: any) {
      logger.error('Failed to create role', {
        payload,
        status: error.response?.status,
        message: error.response?.data?.message,
      });
      throw error;
    }
  }

  /**
   * Actualizar un rol existente
   */
  async updateRole(roleId: number, payload: UpdateRolePayload): Promise<Role> {
    try {
      logger.info('Updating role', { roleId, payload });
      const { data } = await authenticatedApi.put<Role>(`/api/roles/${roleId}`, payload);
      logger.info('Role updated successfully', { roleId });
      return data;
    } catch (error: any) {
      logger.error('Failed to update role', {
        roleId,
        payload,
        status: error.response?.status,
        message: error.response?.data?.message,
      });
      throw error;
    }
  }

  /**
   * Eliminar un rol (nota: el backend responde 403, roles no se pueden eliminar)
   */
  async deleteRole(roleId: number): Promise<void> {
    try {
      logger.info('Attempting to delete role', { roleId });
      await authenticatedApi.delete(`/api/roles/${roleId}`);
      logger.info('Role deleted successfully', { roleId });
    } catch (error: any) {
      logger.error('Failed to delete role', {
        roleId,
        status: error.response?.status,
        message: error.response?.data?.message,
      });
      throw error;
    }
  }

  /**
   * PERMISOS
   */

  /**
   * Obtener listado de permisos
   */
  async getPermissions(): Promise<Permission[]> {
    try {
      logger.info('Fetching permissions list');
      const { data } = await authenticatedApi.get<Permission[]>('/api/permissions');
      return data;
    } catch (error: any) {
      logger.error('Failed to fetch permissions', {
        status: error.response?.status,
        message: error.response?.data?.message,
      });
      throw error;
    }
  }

  /**
   * Obtener un permiso por ID
   */
  async getPermission(permissionId: number): Promise<Permission> {
    try {
      logger.info('Fetching permission', { permissionId });
      const { data } = await authenticatedApi.get<Permission>(`/api/permissions/${permissionId}`);
      return data;
    } catch (error: any) {
      logger.error('Failed to fetch permission', {
        permissionId,
        status: error.response?.status,
        message: error.response?.data?.message,
      });
      throw error;
    }
  }

  /**
   * Actualizar un permiso (renombrar)
   */
  async updatePermission(permissionId: number, payload: UpdatePermissionPayload): Promise<Permission> {
    try {
      logger.info('Updating permission', { permissionId, payload });
      const { data } = await authenticatedApi.put<Permission>(`/api/permissions/${permissionId}`, payload);
      logger.info('Permission updated successfully', { permissionId });
      return data;
    } catch (error: any) {
      logger.error('Failed to update permission', {
        permissionId,
        payload,
        status: error.response?.status,
        message: error.response?.data?.message,
      });
      throw error;
    }
  }

  /**
   * USUARIOS - Gestión de roles de usuarios
   */

  /**
   * Asignar rol a un usuario
   */
  async assignRoleToUser(userId: number, roleId: number): Promise<void> {
    try {
      logger.info('Assigning role to user', { userId, roleId });
      await authenticatedApi.post(`/api/users/${userId}/roles`, { role_id: roleId });
      logger.info('Role assigned successfully', { userId, roleId });
    } catch (error: any) {
      logger.error('Failed to assign role', {
        userId,
        roleId,
        status: error.response?.status,
        message: error.response?.data?.message,
      });
      throw error;
    }
  }

  /**
   * Remover rol de un usuario
   */
  async removeRoleFromUser(userId: number, roleId: number): Promise<void> {
    try {
      logger.info('Removing role from user', { userId, roleId });
      await authenticatedApi.delete(`/api/users/${userId}/roles/${roleId}`);
      logger.info('Role removed successfully', { userId, roleId });
    } catch (error: any) {
      logger.error('Failed to remove role', {
        userId,
        roleId,
        status: error.response?.status,
        message: error.response?.data?.message,
      });
      throw error;
    }
  }

  /**
   * Obtener roles de un usuario específico
   */
  async getUserRoles(userId: number): Promise<Role[]> {
    try {
      logger.info('Fetching user roles', { userId });
      const { data } = await authenticatedApi.get<Role[]>(`/api/users/${userId}/roles`);
      return data;
    } catch (error: any) {
      logger.error('Failed to fetch user roles', {
        userId,
        status: error.response?.status,
        message: error.response?.data?.message,
      });
      throw error;
    }
  }
}

// Exportar instancia única del servicio
export const rolesPermissionsService = new RolesPermissionsService();
export default rolesPermissionsService;


