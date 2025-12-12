import { useQuery } from "@tanstack/react-query";
import { requestsApiService } from "@/services/requestsApi";
import { ApiRequest } from "@/services/requestsApi";
import { useEffect, useMemo } from "react";

/**
 * Hook para gestionar las solicitudes pendientes de actualización de datos personales
 * 
 * Características:
 * - Cachea los resultados por 1-2 minutos
 * - Refresca periódicamente si la vista está activa
 * - Proporciona funciones helper para verificar si un afiliado tiene actualización pendiente
 */
export const usePendingPersonalDataUpdates = (options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) => {
  const {
    enabled = true,
    refetchInterval = 120000, // 2 minutos por defecto
  } = options || {};

  const {
    data: pendingUpdates = [],
    isLoading,
    error,
    refetch,
  } = useQuery<ApiRequest[]>({
    queryKey: ["pending-personal-data-updates"],
    queryFn: () => requestsApiService.getPendingPersonalDataUpdates(),
    enabled,
    staleTime: 60000, // 1 minuto - considerar datos frescos
    gcTime: 120000, // 2 minutos - mantener en caché
    refetchInterval: enabled ? refetchInterval : false,
    refetchIntervalInBackground: false, // Solo refrescar cuando la pestaña está activa
  });

  /**
   * Verifica si un afiliado (por número de documento) tiene una actualización pendiente
   */
  const hasPendingUpdate = useMemo(() => {
    return (documentNumber: string): boolean => {
      if (!documentNumber || !pendingUpdates.length) return false;
      return pendingUpdates.some(
        (update) => update.document_number === documentNumber
      );
    };
  }, [pendingUpdates]);

  /**
   * Obtiene la solicitud de actualización pendiente para un afiliado específico
   */
  const getPendingUpdate = useMemo(() => {
    return (documentNumber: string): ApiRequest | undefined => {
      if (!documentNumber || !pendingUpdates.length) return undefined;
      return pendingUpdates.find(
        (update) => update.document_number === documentNumber
      );
    };
  }, [pendingUpdates]);

  /**
   * Obtiene todas las actualizaciones pendientes para un afiliado específico
   */
  const getPendingUpdatesForAffiliate = useMemo(() => {
    return (documentNumber: string): ApiRequest[] => {
      if (!documentNumber || !pendingUpdates.length) return [];
      return pendingUpdates.filter(
        (update) => update.document_number === documentNumber
      );
    };
  }, [pendingUpdates]);

  return {
    pendingUpdates,
    isLoading,
    error,
    refetch,
    hasPendingUpdate,
    getPendingUpdate,
    getPendingUpdatesForAffiliate,
  };
};
