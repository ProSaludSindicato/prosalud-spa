/**
 * Componente para mostrar error 403 - Permiso Denegado
 */

import React from 'react';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface PermissionDeniedProps {
  /**
   * Mensaje personalizado de error
   */
  message?: string;
  /**
   * Mostrar información de debug (solo en desarrollo)
   */
  showDebugInfo?: boolean;
  /**
   * Información adicional para debugging
   */
  debugInfo?: {
    url?: string;
    requiredPermission?: string;
    userPermissions?: string[];
  };
}

/**
 * PermissionDenied - Muestra un mensaje claro cuando el usuario no tiene permisos
 * 
 * Se usa automáticamente cuando hay un error 403 o cuando ProtectedRoute detecta falta de permisos
 */
export const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  message = 'No tienes permisos para acceder a esta funcionalidad.',
  showDebugInfo = process.env.NODE_ENV === 'development',
  debugInfo,
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900">
              Acceso Denegado
            </h2>

            {/* Message */}
            <p className="text-gray-600">
              {message}
            </p>

            {/* Debug Info (solo en desarrollo) */}
            {showDebugInfo && debugInfo && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left text-sm space-y-2">
                <p className="font-semibold text-gray-900">Información de Debug:</p>
                {debugInfo.url && (
                  <p className="text-gray-700">
                    <span className="font-medium">URL:</span> {debugInfo.url}
                  </p>
                )}
                {debugInfo.requiredPermission && (
                  <p className="text-gray-700">
                    <span className="font-medium">Permiso requerido:</span>{' '}
                    <code className="bg-gray-200 px-1 py-0.5 rounded">
                      {debugInfo.requiredPermission}
                    </code>
                  </p>
                )}
                {debugInfo.userPermissions && debugInfo.userPermissions.length > 0 && (
                  <div className="text-gray-700">
                    <p className="font-medium mb-1">Tus permisos:</p>
                    <div className="flex flex-wrap gap-1">
                      {debugInfo.userPermissions.map((perm, idx) => (
                        <code
                          key={idx}
                          className="bg-gray-200 px-2 py-0.5 rounded text-xs"
                        >
                          {perm}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-6">
              <Button
                onClick={() => navigate(-1)}
                variant="default"
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver Atrás
              </Button>
              <Button
                onClick={() => navigate('/admin')}
                variant="outline"
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Ir al Dashboard
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 mt-4">
              Si crees que deberías tener acceso a esta funcionalidad, contacta al administrador del sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

