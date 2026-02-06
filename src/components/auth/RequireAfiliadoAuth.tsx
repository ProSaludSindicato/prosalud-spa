import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import AfiliadoAuthModal from './AfiliadoAuthModal';

interface RequireAfiliadoAuthProps {
  children: React.ReactNode;
}

const RequireAfiliadoAuth: React.FC<RequireAfiliadoAuthProps> = ({ children }) => {
  const { isAuthenticated } = useAfiliadoAuth();
  const [searchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Leer datos de query params para prediligenciar el formulario
  const initialData = React.useMemo(() => {
    const tipoDocumento = searchParams.get('tipoDocumento');
    const numeroDocumento = searchParams.get('numeroDocumento');
    const fechaExpedicion = searchParams.get('fechaExpedicion');
    
    if (tipoDocumento || numeroDocumento || fechaExpedicion) {
      return {
        tipoDocumento: tipoDocumento || undefined,
        numeroDocumento: numeroDocumento || undefined,
        fechaExpedicion: fechaExpedicion || undefined,
      };
    }
    return undefined;
  }, [searchParams]);

  useEffect(() => {
    if (!hasChecked) {
      if (!isAuthenticated) {
        setShowModal(true);
      }
      setHasChecked(true);
    }
  }, [isAuthenticated, hasChecked]);

  const handleSuccess = () => {
    setShowModal(false);
  };

  const handleClose = () => {
    // No permitir cerrar sin autenticarse, redirigir al home
    window.location.href = '/';
  };

  if (!isAuthenticated && hasChecked) {
    return (
      <AfiliadoAuthModal
        open={showModal}
        onClose={handleClose}
        onSuccess={handleSuccess}
        initialData={initialData}
      />
    );
  }

  return <>{children}</>;
};

export default RequireAfiliadoAuth;
