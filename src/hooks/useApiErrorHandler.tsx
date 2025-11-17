/**
 * Hook para manejar errores de API globalmente
 */

import { useEffect } from 'react';
import { toast } from 'sonner';
import { authenticatedApi } from '@/services/api';
import { logger } from '@/utils/logger';

export const useApiErrorHandler = () => {
  useEffect(() => {
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

          toast.error('Permiso Denegado', {
            description: message,
            duration: 5000,
          });
        }

        return Promise.reject(error);
      }
    );

    return () => {
      authenticatedApi.interceptors.response.eject(interceptor);
    };
  }, []);
};

