import axios from "axios";

const API_BASE_URL = "https://prosalud.test/api";

// Backend types
interface BackendPermission {
  id: number;
  name: string;
  guard_name?: string;
  created_at?: string;
  updated_at?: string;
}

interface BackendRole {
  id: number;
  name: string;
  guard_name: string;
  permissions: BackendPermission[];
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

// Axios instance
const rolesApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000,
});

// Request interceptor
rolesApi.interceptors.request.use(
  (config) => {
    console.log(`[Roles API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("[Roles API] Request error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor
rolesApi.interceptors.response.use(
  (response) => {
    console.log(`[Roles API] Response:`, response.data);
    return response;
  },
  (error) => {
    console.error("[Roles API] Response error:", error.response?.data || error.message);

    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      throw new Error("No se pudo conectar con el servidor. Verifica tu conexión a internet.");
    }

    if (error.response) {
      const message = error.response.data?.message || "Error en la solicitud";
      throw new Error(message);
    }

    throw error;
  },
);

// API methods
export const realRolesApi = {
  async getRoles(): Promise<BackendRolesResponse> {
    const response = await rolesApi.get<BackendRolesResponse>("/roles");
    return response.data;
  },

  async getRoleById(id: number): Promise<BackendRoleResponse> {
    const response = await rolesApi.get<BackendRoleResponse>(`/roles/${id}`);
    return response.data;
  },

  async updateRole(id: number, data: { name?: string; permissions?: number[] }): Promise<BackendRoleResponse> {
    const response = await rolesApi.put<BackendRoleResponse>(`/roles/${id}`, data);
    return response.data;
  },

  async getPermissions(): Promise<BackendPermissionsResponse> {
    const response = await rolesApi.get<BackendPermissionsResponse>("/permissions");
    return response.data;
  },

  async getPermissionById(id: number): Promise<BackendPermissionResponse> {
    const response = await rolesApi.get<BackendPermissionResponse>(`/permissions/${id}`);
    return response.data;
  },

  async updatePermission(id: number, data: { name?: string }): Promise<BackendPermissionResponse> {
    const response = await rolesApi.put<BackendPermissionResponse>(`/permissions/${id}`, data);
    return response.data;
  },
};
