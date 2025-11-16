import { User, CreateUserData, UpdateUserData, PaginatedResponse } from '@/types/admin';
import { realUsersApi, BackendUser, BackendPaginatedResponse } from './realUsersApi';

// Adapter functions to convert between backend and frontend formats
function adaptBackendUserToFrontend(backendUser: BackendUser): User {
  const createdAtRaw = backendUser.created_at;
  const updatedAtRaw = backendUser.updated_at ?? backendUser.created_at ?? new Date().toISOString();

  return {
    id: String(backendUser.id),
    name: backendUser.name,
    email: backendUser.email,
    isActive: backendUser.is_active,
    role: backendUser.role,
    roles: backendUser.roles,
    createdAt: createdAtRaw ? createdAtRaw.split('T')[0] : '',
    updatedAt: updatedAtRaw ? updatedAtRaw.split('T')[0] : '',
  };
}

function adaptBackendPaginationToFrontend<T>(
  backendResponse: BackendPaginatedResponse<BackendUser>
): PaginatedResponse<User> {
  const adaptedData = backendResponse.data.map(adaptBackendUserToFrontend);
  
  return {
    data: adaptedData,
    total: backendResponse.pagination.total,
    page: backendResponse.pagination.current_page,
    pageSize: backendResponse.pagination.per_page,
    totalPages: backendResponse.pagination.last_page,
  };
}

// API adapter that connects to real backend only - no mock fallbacks
export const usersApiAdapter = {
  async getUsers(page = 1, pageSize = 10, search = '', status = ''): Promise<PaginatedResponse<User>> {
    const backendResponse = await realUsersApi.getUsers(page, search, status);
    return adaptBackendPaginationToFrontend(backendResponse);
  },

  async getUserById(id: string): Promise<User | null> {
    const backendUser = await realUsersApi.getUserById(id);
    return adaptBackendUserToFrontend(backendUser);
  },

  async createUser(userData: CreateUserData): Promise<User> {
    const createData = {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      // El backend se encarga de dejar al usuario inactivo y de enviar la invitación
    };
    const backendUser = await realUsersApi.createUser(createData);
    return adaptBackendUserToFrontend(backendUser);
  },

  async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    const updateData: { 
      name?: string; 
      email?: string; 
      password?: string;
      password_confirmation?: string;
      role?: string;
      is_active?: boolean;
    } = {};
    
    if (userData.name !== undefined) updateData.name = userData.name;
    if (userData.email !== undefined) updateData.email = userData.email;
    if (userData.password !== undefined) {
      updateData.password = userData.password;
      updateData.password_confirmation = userData.password_confirmation;
    }
    if (userData.role !== undefined) updateData.role = userData.role;
    if (userData.isActive !== undefined) updateData.is_active = userData.isActive;

    const backendUser = await realUsersApi.updateUser(id, updateData);
    return adaptBackendUserToFrontend(backendUser);
  },

  async toggleUserStatus(id: string): Promise<User> {
    const backendUser = await realUsersApi.toggleUserStatus(id);
    return adaptBackendUserToFrontend(backendUser);
  },
};