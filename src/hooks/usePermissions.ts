/**
 * Hook personalizado para facilitar el manejo de permisos
 */

import { useAuth } from '@/context/AuthContext';
import { canPerformAction, MODULES_CONFIG } from '@/config/permissions';

export const usePermissions = () => {
  const { user, can, canAny, canAll, hasRole, hasAnyRole, hasAllRoles } = useAuth();

  /**
   * Verificar si el usuario puede ver un módulo
   */
  const canViewModule = (moduleKey: string): boolean => {
    if (!user?.permissions) return false;
    const module = MODULES_CONFIG[moduleKey];
    if (!module) return false;
    
    // Si no requiere permisos, siempre visible
    if (module.permissions.view.length === 0) return true;
    
    // Verificar si tiene al menos uno de los permisos
    return module.permissions.view.some(perm => user.permissions.includes(perm));
  };

  /**
   * Verificar si el usuario puede crear en un módulo
   */
  const canCreate = (moduleKey: string): boolean => {
    if (!user?.permissions) return false;
    return canPerformAction(moduleKey, 'create', user.permissions);
  };

  /**
   * Verificar si el usuario puede editar en un módulo
   */
  const canEdit = (moduleKey: string): boolean => {
    if (!user?.permissions) return false;
    return canPerformAction(moduleKey, 'edit', user.permissions);
  };

  /**
   * Verificar si el usuario puede eliminar en un módulo
   */
  const canDelete = (moduleKey: string): boolean => {
    if (!user?.permissions) return false;
    return canPerformAction(moduleKey, 'delete', user.permissions);
  };

  /**
   * Verificar si el usuario puede realizar una acción custom en un módulo
   */
  const canDoAction = (moduleKey: string, action: string): boolean => {
    if (!user?.permissions) return false;
    return canPerformAction(moduleKey, action, user.permissions);
  };

  return {
    user,
    // Helpers básicos del AuthContext
    can,
    canAny,
    canAll,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    // Helpers de módulos
    canViewModule,
    canCreate,
    canEdit,
    canDelete,
    canDoAction,
  };
};

