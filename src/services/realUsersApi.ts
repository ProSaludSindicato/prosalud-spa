import { authenticatedApi } from "./api";
import { logger } from "@/utils/logger";

// Backend API types
export interface BackendUser {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  role?: string;
  roles?: string[];
  created_at: string;
  updated_at: string;
}

export interface BackendPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export interface BackendResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface BackendErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: string;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
  role?: string;
  is_active?: boolean;
}

export interface UpdateUserStatusRequest {
  is_active: boolean;
}

// Use authenticated API instance
const backendApi = authenticatedApi;

export const realUsersApi = {
  async getUsers(page = 1, search = "", status = ""): Promise<BackendPaginatedResponse<BackendUser>> {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (status) params.append("is_active", status === "active" ? "true" : "false");
      params.append("per_page", "15");

      const response = await backendApi.get<BackendPaginatedResponse<BackendUser>>(`/api/users?${params}`);
      return response.data;
    } catch (error) {
      logger.error("Error al obtener usuarios", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  async getUserById(id: string): Promise<BackendUser> {
    try {
      const response = await backendApi.get<BackendResponse<BackendUser>>(`/api/users/${id}`);
      return response.data.data;
    } catch (error) {
      logger.error("Error al obtener usuario por id", {
        id,
        message: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  },

  async createUser(data: CreateUserRequest): Promise<BackendUser> {
    try {
      const response = await backendApi.post<BackendResponse<BackendUser>>("/api/users", data);
      return response.data.data;
    } catch (error) {
      logger.error("Error al crear usuario", error instanceof Error ? error.message : error);
      throw error;
    }
  },

  async updateUser(id: string, data: UpdateUserRequest): Promise<BackendUser> {
    try {
      const response = await backendApi.put<BackendResponse<BackendUser>>(`/api/users/${id}`, data);
      return response.data.data;
    } catch (error) {
      logger.error("Error al actualizar usuario", {
        id,
        message: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  },

  async toggleUserStatus(id: string): Promise<BackendUser> {
    try {
      // First get the current user to know their current status
      const currentUser = await this.getUserById(id);

      const updateData: UpdateUserStatusRequest = {
        is_active: !currentUser.is_active,
      };

      const response = await backendApi.patch<BackendResponse<BackendUser>>(`/api/users/${id}/status`, updateData);
      return response.data.data;
    } catch (error) {
      logger.error("Error al alternar estado de usuario", {
        id,
        message: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  },
};
