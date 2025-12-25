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
  // Algunos endpoints (como createUser) pueden no devolver updated_at aún
  updated_at?: string;
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
  role: string;
  // El backend crea la contraseña mediante invitación; se mantienen campos opcionales solo por compatibilidad
  password?: string;
  password_confirmation?: string;
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
      // Obtener todos los usuarios sin paginación del backend
      // Hacemos llamadas iterativas hasta obtener todos los usuarios
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (status) params.append("is_active", status === "active" ? "true" : "false");
      // Usar un número grande para intentar obtener todos los usuarios en una sola llamada
      params.append("per_page", "1000");

      const firstResponse = await backendApi.get<BackendPaginatedResponse<BackendUser>>(`/api/users?${params}`);
      
      // Si hay más páginas, hacer llamadas adicionales para obtener todos los usuarios
      let allUsers = [...firstResponse.data.data];
      let currentPage = firstResponse.data.pagination.current_page;
      const lastPage = firstResponse.data.pagination.last_page;
      
      // Si hay más de una página, obtener todas las páginas restantes
      while (currentPage < lastPage) {
        currentPage++;
        const pageParams = new URLSearchParams();
        if (search) pageParams.append("search", search);
        if (status) pageParams.append("is_active", status === "active" ? "true" : "false");
        pageParams.append("per_page", "1000");
        pageParams.append("page", String(currentPage));
        
        const pageResponse = await backendApi.get<BackendPaginatedResponse<BackendUser>>(`/api/users?${pageParams}`);
        allUsers = [...allUsers, ...pageResponse.data.data];
      }
      
      // Retornar todos los usuarios en una sola respuesta sin paginación
      return {
        success: firstResponse.data.success,
        data: allUsers,
        pagination: {
          current_page: 1,
          per_page: allUsers.length,
          total: allUsers.length,
          last_page: 1,
          from: 1,
          to: allUsers.length,
        },
      };
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
