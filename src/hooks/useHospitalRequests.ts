import { useCallback } from 'react';
import { HospitalRequest, HospitalRequestStatus } from '@/types/inventory';
import { useInventory } from '@/context/InventoryContext';

/**
 * useHospitalRequests
 *
 * Hook de conveniencia para centralizar la lógica de solicitudes de inventario
 * hacia hospitales. Integrado con el API del backend a través del InventoryContext.
 */
export const useHospitalRequests = () => {
  const {
    hospitalRequests,
    hospitalOptions,
    addHospitalRequest,
    updateHospitalRequestStatus,
    products,
    categories,
    colorOptions,
    hospitalRequestsLoading,
    hospitalRequestsError,
    refreshHospitalRequests,
  } = useInventory();

  const createRequest = useCallback(
    async (payload: Omit<HospitalRequest, 'id' | 'status' | 'createdAt' | 'timeline'>) => {
      return addHospitalRequest(payload);
    },
    [addHospitalRequest],
  );

  const changeStatus = useCallback(
    async (
      id: string,
      status: HospitalRequestStatus,
      options?: { description?: string; actor?: string },
    ) => {
      await updateHospitalRequestStatus(id, status, options);
    },
    [updateHospitalRequestStatus],
  );

  return {
    requests: hospitalRequests,
    hospitalOptions,
    products,
    categories,
    colorOptions,
    createRequest,
    changeStatus,
    loading: hospitalRequestsLoading,
    error: hospitalRequestsError,
    refresh: refreshHospitalRequests,
  };
};

export default useHospitalRequests;

