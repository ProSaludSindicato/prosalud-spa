import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import { toast } from 'sonner';
import { AlertCircle, Home, X } from 'lucide-react';
import AfiliadoAuthModal from './AfiliadoAuthModal';

interface RequireActiveAfiliadoAuthProps {
  children: React.ReactNode;
  procedureName: string;
  allowRetired?: boolean; // Permite que afiliados retirados también puedan acceder
}

const RequireActiveAfiliadoAuth: React.FC<RequireActiveAfiliadoAuthProps> = ({ children, procedureName, allowRetired = false }) => {
  const { isAuthenticated, afiliado } = useAfiliadoAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  const toastShownRef = useRef(false);

  // Manejar autenticación inicial
  useEffect(() => {
    if (!hasChecked) {
      if (!isAuthenticated) {
        setShowAuthModal(true);
      } else {
        setShowAuthModal(false);
      }
      setHasChecked(true);
    }
  }, [isAuthenticated, hasChecked]);

  // Cerrar modal de autenticación cuando el usuario se autentica
  useEffect(() => {
    if (isAuthenticated && showAuthModal) {
      setShowAuthModal(false);
    }
  }, [isAuthenticated, showAuthModal]);

  // Verificar estado después de autenticación
  useEffect(() => {
    if (isAuthenticated && afiliado && !hasCheckedStatus) {
      const isRetirado = afiliado.estado?.toLowerCase() === 'retirado';
      // Si allowRetired es true, permitir acceso incluso si está retirado
      if (isRetirado && !allowRetired) {
        setShowErrorModal(true);
        // Solo mostrar el toast una vez
        if (!toastShownRef.current) {
          toast.error('Acceso restringido', {
            description: `No puede realizar la solicitud de ${procedureName} porque se encuentra retirado del sindicato.`,
            duration: 5000,
            icon: <AlertCircle className="h-5 w-5 text-red-600" />,
          });
          toastShownRef.current = true;
        }
      }
      setHasCheckedStatus(true);
    }
  }, [isAuthenticated, afiliado, hasCheckedStatus, procedureName, allowRetired]);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const handleAuthClose = () => {
    navigate('/');
  };

  const handleErrorClose = () => {
    setShowErrorModal(false);
    navigate('/');
  };

  // Si está retirado, mostrar modal de error (no el contenido)
  if (showErrorModal) {
    return (
      <Dialog open={showErrorModal} onOpenChange={(isOpen) => !isOpen && handleErrorClose()}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 bg-white">
          <button
            onClick={handleErrorClose}
            className="absolute right-4 top-4 z-20 rounded-sm transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none bg-white hover:bg-gray-100 p-1.5 shadow-lg border border-gray-300"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
          
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex flex-col items-center mb-4">
              <div className="rounded-full bg-red-100 p-3 mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-gray-900">
              Acceso Restringido
            </DialogTitle>
            <div className="h-px bg-gray-200 mt-4"></div>
          </DialogHeader>
          
          <div className="px-6 pb-6 pt-4">
            <DialogDescription className="text-center text-gray-700 space-y-3">
              <p className="text-base">
                Lo sentimos, no puede realizar la solicitud de <strong>{procedureName}</strong> debido a que actualmente se encuentra retirado del sindicato.
              </p>
              <p className="text-sm text-gray-600">
                Este trámite está disponible únicamente para afiliados activos. Si considera que hay un error en su estado, por favor comuníquese con ProSalud al correo electrónico <strong>talentohumanosindicatoprosalud@gmail.com</strong>
              </p>
            </DialogDescription>
            
            <div className="flex justify-center mt-8 pt-6 border-t border-gray-200">
              <Button 
                onClick={handleErrorClose}
                className="bg-primary-prosalud-dark hover:bg-primary-prosalud-dark/90 text-white min-w-[140px]"
              >
                <Home className="mr-2 h-4 w-4" />
                Volver al Inicio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Si no está autenticado, mostrar modal de autenticación
  if (!isAuthenticated && hasChecked) {
    return (
      <AfiliadoAuthModal
        open={showAuthModal}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  // Si está autenticado, el estado ha sido verificado y no está retirado, mostrar el contenido
  if (isAuthenticated && afiliado && hasCheckedStatus && !showErrorModal) {
    return <>{children}</>;
  }

  // Estado inicial, no mostrar nada aún
  return null;
};

export default RequireActiveAfiliadoAuth;

