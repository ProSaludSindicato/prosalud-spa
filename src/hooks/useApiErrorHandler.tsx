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
          const currentPath = window.location.pathname;
          
          // No mostrar toasts de permisos en el dashboard - es lógica de negocio, no un error
          const isDashboard = currentPath.includes('/admin') && currentPath.endsWith('/admin') || currentPath === '/admin';
          const isDashboardQuery = url.includes('/dashboard') || url.includes('/stats') || url.includes('/deliveries');
          
          // Solo loguear como info/debug, no como error o warning
          logger.debug('403 Forbidden - Permission denied (expected behavior)', {
            url,
            message,
            currentPath,
            isDashboard,
            isDashboardQuery,
          });

          // Solo mostrar toast si NO es una query del dashboard
          // Las queries del dashboard con permisos insuficientes son comportamiento esperado
          if (!isDashboard && !isDashboardQuery) {
            toast.error('Permiso Denegado', {
              description: message,
              duration: 5000,
            });
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      authenticatedApi.interceptors.response.eject(interceptor);
    };
  }, []);
};

