import React, { useEffect, useState } from 'react';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import AfiliadoDataUpdateAuthModal from './AfiliadoDataUpdateAuthModal';

interface RequireAfiliadoDataUpdateAuthProps {
  children: React.ReactNode;
}

const RequireAfiliadoDataUpdateAuth: React.FC<RequireAfiliadoDataUpdateAuthProps> = ({ children }) => {
  const { isAuthenticated, isDataUpdateAuthenticated, afiliado, fechaExpedicion, authenticateForDataUpdate } = useAfiliadoAuth();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loadingText, setLoadingText] = useState('Autenticando...');

  useEffect(() => {
    if (!hasChecked) {
      // Si ya está autenticado con el API de actualización de datos, no hacer nada
      if (isAuthenticated && isDataUpdateAuthenticated) {
        setHasChecked(true);
        return;
      }

      // Si está autenticado pero NO con el API de actualización de datos
      // Y tenemos la fecha de expedición guardada, autenticar automáticamente
      if (isAuthenticated && !isDataUpdateAuthenticated && afiliado && fechaExpedicion) {
        setIsAuthenticating(true);
        setLoadingText('Autenticando...');
        
        // Cambiar el texto después de 2 segundos
        const textTimer = setTimeout(() => {
          setLoadingText('Consultando información...');
        }, 2000);
        
        authenticateForDataUpdate(
          afiliado.tipo_documento || '',
          afiliado.documento || '',
          fechaExpedicion
        )
          .then(() => {
            // Autenticación exitosa, no mostrar modal
            clearTimeout(textTimer);
            setHasChecked(true);
            setIsAuthenticating(false);
          })
          .catch((error) => {
            // Si falla la autenticación automática, mostrar modal
            clearTimeout(textTimer);
            console.warn('Autenticación automática falló, mostrando modal:', error);
            setShowModal(true);
            setHasChecked(true);
            setIsAuthenticating(false);
          });
        return;
      }

      // Si no está autenticado o no tenemos fecha de expedición, mostrar modal
      if (!isAuthenticated || !fechaExpedicion) {
        setShowModal(true);
        setHasChecked(true);
      }
    }
  }, [isAuthenticated, isDataUpdateAuthenticated, hasChecked, afiliado, fechaExpedicion, authenticateForDataUpdate]);

  const handleSuccess = () => {
    setShowModal(false);
  };

  const handleClose = () => {
    // No permitir cerrar sin autenticarse, redirigir al home
    window.location.href = '/';
  };

  // Mostrar loading mientras se autentica automáticamente
  if (isAuthenticating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="flex flex-col items-center mb-6">
            <img 
              src="/images/logo_prosalud.webp" 
              alt="ProSalud Logo" 
              className="h-16 w-auto mb-6"
            />
          </div>
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-prosalud-dark border-r-transparent"></div>
          <p className="mt-4 text-gray-600 text-base">{loadingText}</p>
        </div>
      </div>
    );
  }

  // Mostrar modal si no está autenticado O si está autenticado pero NO con el API de actualización de datos
  if (hasChecked && (!isAuthenticated || !isDataUpdateAuthenticated)) {
    return (
      <AfiliadoDataUpdateAuthModal
        open={showModal}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );
  }

  return <>{children}</>;
};

export default RequireAfiliadoDataUpdateAuth;

