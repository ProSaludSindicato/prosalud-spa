import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import AfiliadoAuthModal from './AfiliadoAuthModal';
import { consumeAffiliatePrefill, clearAffiliatePrefill } from '@/utils/affiliatePrefill';

interface RequireAfiliadoAuthProps {
  children: React.ReactNode;
}

const RequireAfiliadoAuth: React.FC<RequireAfiliadoAuthProps> = ({ children }) => {
  const { isAuthenticated } = useAfiliadoAuth();
  const [searchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Prellenar el formulario con los datos traspasados por el chatbot (no viajan en la URL)
  const [initialData] = useState(() => {
    const stashed = consumeAffiliatePrefill();
    // Compatibilidad con enlaces antiguos: leer los parámetros y retirarlos de la URL
    const tipoDocumento = searchParams.get('tipoDocumento');
    const numeroDocumento = searchParams.get('numeroDocumento');
    const fechaExpedicion = searchParams.get('fechaExpedicion');
    if (tipoDocumento || numeroDocumento || fechaExpedicion) {
      window.history.replaceState(null, '', window.location.pathname);
      return {
        tipoDocumento: tipoDocumento || undefined,
        numeroDocumento: numeroDocumento || undefined,
        fechaExpedicion: fechaExpedicion || undefined,
      };
    }
    return stashed;
  });

  useEffect(() => {
    clearAffiliatePrefill();
  }, []);

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
