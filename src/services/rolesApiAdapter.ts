import { Role, Permission } from '@/types/admin';
import { realRolesApi } from './rolesApi';

// Adapter functions
function adaptBackendRoleToFrontend(backendRole: any): Role {
  return {
    id: backendRole.id,
    name: backendRole.name,
    guard_name: backendRole.guard_name,
    permissions: backendRole.permissions.map((p: any) => ({
      id: p.id,
      name: p.name,
      guard_name: p.guard_name,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
    createdAt: backendRole.created_at,
    updatedAt: backendRole.updated_at,
  };
}

function adaptBackendPermissionToFrontend(backendPermission: any): Permission {
  return {
    id: backendPermission.id,
    name: backendPermission.name,
    guard_name: backendPermission.guard_name,
    createdAt: backendPermission.created_at,
    updatedAt: backendPermission.updated_at,
  };
}

// API adapter
export const rolesApiAdapter = {
  async getRoles(): Promise<Role[]> {
    const response = await realRolesApi.getRoles();
    return response.data.map(adaptBackendRoleToFrontend);
  },

  async getRoleById(id: number): Promise<Role> {
    const response = await realRolesApi.getRoleById(id);
    return adaptBackendRoleToFrontend(response.data);
  },

  async updateRole(id: number, data: { name?: string; permissions?: number[] }): Promise<Role> {
    const response = await realRolesApi.updateRole(id, data);
    return adaptBackendRoleToFrontend(response.data);
  },

  async getPermissions(): Promise<Permission[]> {
    const response = await realRolesApi.getPermissions();
    return response.data.map(adaptBackendPermissionToFrontend);
  },

  async getPermissionById(id: number): Promise<Permission> {
    const response = await realRolesApi.getPermissionById(id);
    return adaptBackendPermissionToFrontend(response.data);
  },

  async updatePermission(id: number, data: { name?: string }): Promise<Permission> {
    const response = await realRolesApi.updatePermission(id, data);
    return adaptBackendPermissionToFrontend(response.data);
  },
};
