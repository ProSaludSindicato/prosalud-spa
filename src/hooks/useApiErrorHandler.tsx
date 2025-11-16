/**
 * Hook para manejar errores de API globalmente
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authenticatedApi } from '@/services/api';
import { logger } from '@/utils/logger';

export const useApiErrorHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Interceptor de respuesta para manejar errores 403
    const interceptor = authenticatedApi.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 403) {
          const url = error.config?.url || '';
          const message = error.response?.data?.message || 'No tienes permisos para realizar esta acción.';
          
          logger.warn('403 Forbidden - Permission denied', {
            url,
            message,
            user: error.response?.data?.user,
          });

          // Mostrar toast con mensaje claro
          toast.error('Permiso Denegado', {
            description: message,
            duration: 5000,
          });

          // No redirigir, solo mostrar el toast
          // El usuario puede ver el mensaje y decidir qué hacer
        }

        return Promise.reject(error);
      }
    );

    // Cleanup: remover interceptor al desmontar
    return () => {
      authenticatedApi.interceptors.response.eject(interceptor);
    };
  }, [navigate]);
};

