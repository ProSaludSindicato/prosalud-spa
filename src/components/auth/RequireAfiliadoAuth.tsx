import React, { useEffect, useState } from 'react';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import AfiliadoAuthModal from './AfiliadoAuthModal';

interface RequireAfiliadoAuthProps {
  children: React.ReactNode;
}

const RequireAfiliadoAuth: React.FC<RequireAfiliadoAuthProps> = ({ children }) => {
  const { isAuthenticated } = useAfiliadoAuth();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

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
      />
    );
  }

  return <>{children}</>;
};

export default RequireAfiliadoAuth;
