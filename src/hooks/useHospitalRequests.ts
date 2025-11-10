import { useCallback } from 'react';
import { HospitalRequest, HospitalRequestStatus } from '@/types/inventory';
import { useInventory } from '@/context/InventoryContext';

/**
 * useHospitalRequests
 *
 * Hook de conveniencia para centralizar la lógica de solicitudes de inventario
 * hacia hospitales. Por ahora trabaja sobre el estado local expuesto por el
 * InventoryContext, pero mantiene una interfaz pensada para integrarse a un
 * servicio/API real en el futuro cercano.
 *
 * TODO: reemplazar las implementaciones locales por llamadas a servicios
 * una vez que el backend y el sistema de permisos estén listos.
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
  } = useInventory();

  const createRequest = useCallback(
    async (payload: Omit<HospitalRequest, 'id' | 'status' | 'createdAt' | 'timeline'>) => {
      // Placeholder para futura llamada a API
      // await hospitalRequestsService.create(payload)
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
      // Placeholder para futura llamada a API
      // await hospitalRequestsService.updateStatus(id, status, options)
      updateHospitalRequestStatus(id, status, options);
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
  };
};

export default useHospitalRequests;

