import { authenticatedApi } from "./api";
import { logger } from "@/utils/logger";

// Backend types
interface BackendPermission {
  id: number;
  name: string;
  description?: string;
  guard_name?: string;
  created_at?: string;
  updated_at?: string;
}

interface BackendUser {
  id: number;
  name: string;
  email: string;
}

interface BackendRole {
  id: number;
  name: string;
  description?: string;
  guard_name: string;
  permissions: BackendPermission[];
  users?: BackendUser[];
  created_at: string;
  updated_at: string;
}

interface BackendRolesResponse {
  success: boolean;
  data: BackendRole[];
}

interface BackendRoleResponse {
  success: boolean;
  data: BackendRole;
}

interface BackendPermissionsResponse {
  success: boolean;
  data: BackendPermission[];
}

interface BackendPermissionResponse {
  success: boolean;
  data: BackendPermission;
}

// Use authenticated API instance
const rolesApi = authenticatedApi;

// API methods
export const realRolesApi = {
  async getRoles(): Promise<BackendRolesResponse> {
    const response = await rolesApi.get<BackendRolesResponse>("/api/roles");
    return response.data;
  },

  async getRoleById(id: number): Promise<BackendRoleResponse> {
    const response = await rolesApi.get<BackendRoleResponse>(`/api/roles/${id}`);
    return response.data;
  },

  async createRole(data: { name: string; description?: string; permissions?: number[] }): Promise<BackendRoleResponse> {
    const response = await rolesApi.post<BackendRoleResponse>('/api/roles', data);
    return response.data;
  },

  async updateRole(id: number, data: { name?: string; description?: string; permissions?: number[] }): Promise<BackendRoleResponse> {
    const response = await rolesApi.put<BackendRoleResponse>(`/api/roles/${id}`, data);
    return response.data;
  },

  async getPermissions(): Promise<BackendPermissionsResponse> {
    const response = await rolesApi.get<BackendPermissionsResponse>("/api/permissions");
    return response.data;
  },

  async getPermissionById(id: number): Promise<BackendPermissionResponse> {
    const response = await rolesApi.get<BackendPermissionResponse>(`/api/permissions/${id}`);
    return response.data;
  },

  async updatePermission(id: number, data: { name?: string }): Promise<BackendPermissionResponse> {
    const response = await rolesApi.put<BackendPermissionResponse>(`/api/permissions/${id}`, data);
    return response.data;
  },
};
