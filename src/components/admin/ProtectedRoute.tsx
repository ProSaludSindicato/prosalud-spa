import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Permisos requeridos. Si se especifican, el usuario debe tener al menos uno de ellos.
   */
  requiredPermissions?: string[];
  /**
   * Si es true, el usuario debe tener todos los permisos especificados.
   * Si es false (default), el usuario debe tener al menos uno de los permisos.
   */
  requireAll?: boolean;
  /**
   * Roles requeridos. Si se especifican, el usuario debe tener al menos uno de ellos.
   */
  requiredRoles?: string[];
  /**
   * Mensaje personalizado cuando el usuario no tiene permisos
   */
  forbiddenMessage?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermissions, 
  requireAll = false,
  requiredRoles,
  forbiddenMessage = 'No tienes permisos para acceder a esta sección.'
}) => {
  const { user, loading, can, canAny, canAll, hasRole, hasAnyRole } = useAuth();
  const location = useLocation();

  // Mostrar skeleton mientras carga
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Verificar permisos si se especificaron
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasPermission = requireAll 
      ? canAll(requiredPermissions) 
      : canAny(requiredPermissions);

    if (!hasPermission) {
      // Log para debugging
      console.warn('Access denied - Missing permissions', {
        requiredPermissions,
        userPermissions: user?.permissions || [],
        userRoles: user?.roles || [],
        userId: user?.id,
        requireAll,
      });

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
            <p className="text-gray-600 mb-6">{forbiddenMessage}</p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-left text-xs">
                <p className="font-semibold">Debug Info:</p>
                <p>Usuario: {user?.email || user?.name || 'N/A'}</p>
                <p>Roles: {user?.roles?.join(', ') || 'Ninguno'}</p>
                <p>Permisos requeridos: {requiredPermissions.join(', ')}</p>
                <p>Permisos del usuario: {user?.permissions?.join(', ') || 'Ninguno'}</p>
              </div>
            )}
            <div className="space-y-2 mt-4">
              <button
                onClick={() => window.history.back()}
                className="w-full px-4 py-2 bg-primary-prosalud text-white rounded-md hover:bg-primary-prosalud-dark transition-colors"
              >
                Volver
              </button>
              <button
                onClick={() => window.location.href = '/admin'}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Ir al Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // Verificar roles si se especificaron
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = hasAnyRole(requiredRoles);

    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
            <p className="text-gray-600 mb-6">
              Tu rol no tiene acceso a esta sección. Se requiere uno de los siguientes roles: {requiredRoles.join(', ')}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => window.history.back()}
                className="w-full px-4 py-2 bg-primary-prosalud text-white rounded-md hover:bg-primary-prosalud-dark transition-colors"
              >
                Volver
              </button>
              <button
                onClick={() => window.location.href = '/admin'}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Ir al Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

