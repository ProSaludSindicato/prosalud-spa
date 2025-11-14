import React, { useEffect, useState } from 'react';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import AfiliadoOtpAuthModal from './AfiliadoOtpAuthModal';

interface RequireAfiliadoOtpAuthProps {
  children: React.ReactNode;
}

const RequireAfiliadoOtpAuth: React.FC<RequireAfiliadoOtpAuthProps> = ({ children }) => {
  const { isAuthenticated, isOtpAuthenticated } = useAfiliadoAuth();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!hasChecked) {
      // Mostrar modal si no está autenticado O si está autenticado pero NO con OTP
      if (!isAuthenticated || !isOtpAuthenticated) {
        setShowModal(true);
      }
      setHasChecked(true);
    }
  }, [isAuthenticated, isOtpAuthenticated, hasChecked]);

  const handleSuccess = () => {
    setShowModal(false);
  };

  const handleClose = () => {
    // No permitir cerrar sin autenticarse, redirigir al home
    window.location.href = '/';
  };

  // Mostrar modal si no está autenticado O si está autenticado pero NO con OTP
  if (hasChecked && (!isAuthenticated || !isOtpAuthenticated)) {
    return (
      <AfiliadoOtpAuthModal
        open={showModal}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );
  }

  return <>{children}</>;
};

export default RequireAfiliadoOtpAuth;

