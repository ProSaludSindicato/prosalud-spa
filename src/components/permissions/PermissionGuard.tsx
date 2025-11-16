/**
 * Componente para renderizado condicional basado en permisos
 */

import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  /** Permisos requeridos (al menos uno) */
  permissions?: string[];
  /** Si es true, requiere todos los permisos especificados */
  requireAll?: boolean;
  /** Componente o elemento a mostrar si no tiene permisos */
  fallback?: React.ReactNode;
}

/**
 * PermissionGuard - Muestra children solo si el usuario tiene los permisos requeridos
 * 
 * @example
 * ```tsx
 * <PermissionGuard permissions={['users.create']}>
 *   <Button>Crear Usuario</Button>
 * </PermissionGuard>
 * ```
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permissions = [],
  requireAll = false,
  fallback = null,
}) => {
  const { canAny, canAll } = usePermissions();

  // Si no se especifican permisos, mostrar children
  if (permissions.length === 0) {
    return <>{children}</>;
  }

  // Verificar permisos
  const hasPermission = requireAll ? canAll(permissions) : canAny(permissions);

  // Mostrar children si tiene permisos, sino fallback
  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

interface ModuleGuardProps {
  children: React.ReactNode;
  /** Clave del módulo (ej: 'users', 'inventory', 'wellness') */
  module: string;
  /** Acción requerida ('view', 'create', 'edit', 'delete', o custom) */
  action?: 'view' | 'create' | 'edit' | 'delete' | string;
  /** Componente o elemento a mostrar si no tiene permisos */
  fallback?: React.ReactNode;
}

/**
 * ModuleGuard - Muestra children solo si el usuario puede realizar la acción en el módulo
 * 
 * @example
 * ```tsx
 * <ModuleGuard module="users" action="create">
 *   <Button>Crear Usuario</Button>
 * </ModuleGuard>
 * ```
 */
export const ModuleGuard: React.FC<ModuleGuardProps> = ({
  children,
  module,
  action = 'view',
  fallback = null,
}) => {
  const { canViewModule, canCreate, canEdit, canDelete, canDoAction } = usePermissions();

  let hasPermission = false;

  switch (action) {
    case 'view':
      hasPermission = canViewModule(module);
      break;
    case 'create':
      hasPermission = canCreate(module);
      break;
    case 'edit':
      hasPermission = canEdit(module);
      break;
    case 'delete':
      hasPermission = canDelete(module);
      break;
    default:
      // Acción custom
      hasPermission = canDoAction(module, action);
      break;
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

