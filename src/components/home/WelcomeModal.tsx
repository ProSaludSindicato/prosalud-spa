
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  MessageSquare,
  Settings, 
  CheckCircle, 
  X 
} from 'lucide-react';

// Feature flag to control modal visibility
const SHOW_WELCOME_MODAL = true;

const WelcomeModal: React.FC = () => {
  const navigate = useNavigate();
  
  // TODO: TEMPORAL - Siempre mostrar el modal del kit escolar, sin controlar localStorage
  // Initialize as open if feature flag is enabled
  const [isOpen, setIsOpen] = useState(() => {
    if (!SHOW_WELCOME_MODAL) return false;
    return true; // Siempre mostrar el modal
  });

  const handleClose = () => {
    setIsOpen(false);
    // TODO: TEMPORAL - No guardar en localStorage para que siempre se muestre
  };

  const handleImageClick = () => {
    handleClose();
    navigate('/kit-bienestar-escolar');
  };

  // TODO: TEMPORAL - Código comentado para mostrar imagen del kit escolar
  // Restaurar el código original cuando se termine la promoción del kit escolar
  /*
  const features = [
    {
      icon: Settings,
      title: 'Procesos de Autogestión Mejorados',
      description: 'Formularios más intuitivos, certificados de convenio automáticos y procesos simplificados para tus trámites.'
    },
    {
      icon: MessageSquare,
      title: 'Chatbot Inteligente',
      description: 'Asistente virtual disponible 24/7 para resolver tus dudas instantáneamente.'
    },
    {
      icon: Sparkles,
      title: 'Diseño Renovado',
      description: 'Interfaz moderna y adaptativa para una mejor experiencia de usuario. Instala ProSalud como app y accede más rápido desde tu celular.'
    }
  ];
  */

  if (!SHOW_WELCOME_MODAL) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className="sm:max-w-2xl w-[calc(100vw-3rem)] max-w-[calc(100vw-3rem)] sm:w-full p-0 overflow-visible border-0 shadow-none bg-transparent mx-auto max-h-[90vh] flex flex-col rounded-lg"
        overlayClassName="fixed inset-0 z-50 bg-black/60 supports-[backdrop-filter]:backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      >
        {/* TODO: TEMPORAL - Mostrar imagen del kit escolar en lugar del modal de bienvenida original */}
        {/* Imagen del kit escolar - TEMPORAL */}
        <div 
          onClick={handleImageClick}
          className="cursor-pointer w-full flex items-center justify-center overflow-hidden rounded-lg relative"
        >
          <img
            src="/images/Imagen_aviso_beneficio_kit_escolar.png"
            alt="Aviso beneficio kit escolar"
            className="w-full h-auto object-contain max-h-[85vh] rounded-lg"
          />
          {/* Close button - posicionado sobre la imagen dentro del contenedor */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="absolute right-2 top-2 z-20 p-1.5 rounded-full bg-white/90 hover:bg-white transition-colors shadow-sm"
            style={{ margin: 0 }}
          >
            <X className="h-4 w-4 text-gray-700" />
          </button>
        </div>

        {/* TODO: TEMPORAL - Código original del modal de bienvenida comentado */}
        {/* 
        <div className="bg-gradient-to-br from-primary-prosalud to-primary-prosalud-dark text-white px-4 sm:px-6 py-5 sm:py-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white/15 p-2.5 sm:p-3 rounded-full backdrop-blur-sm">
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
            </div>
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-3xl sm:text-4xl font-bold justify-center text-center text-white mb-2 leading-tight">
                ¡Bienvenido a <span className="text-prosalud-pro">Pro</span><span className="text-prosalud-salud">Salud</span>!
              </DialogTitle>
            </DialogHeader>
            <p className="text-white/90 text-sm sm:text-base leading-relaxed px-2">
              Hemos rediseñado nuestro sitio web pensando en ti
            </p>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="space-y-3 sm:space-y-4">
            <div className="text-center mb-3 sm:mb-4">
              <h3 className="text-base sm:text-xl font-semibold text-gray-900 mb-1.5">
                ¿Qué hay de nuevo?
              </h3>
              <p className="text-gray-600 text-xs sm:text-base leading-relaxed px-2">
                Descubre las mejoras que hemos implementado para brindarte un mejor servicio
              </p>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex gap-3 p-2.5 sm:p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100/50 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="p-1.5 sm:p-2 bg-primary-prosalud/10 rounded-lg">
                      <feature.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-prosalud" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 mb-1 text-xs sm:text-sm leading-tight">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3 mt-3">
              <div className="flex gap-2.5 sm:gap-3">
                <div>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>¡Prueba nuestro chatbot!</strong> Haz clic en el ícono de chat en la esquina inferior derecha 
                    para obtener ayuda instantánea con tus consultas.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2 sm:pt-3">
              <Button 
                onClick={handleClose}
                className="bg-primary-prosalud hover:bg-primary-prosalud-dark px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium w-full sm:w-auto"
              >
                Explorar el nuevo sitio
              </Button>
            </div>
          </div>
        </div>
        */}
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeModal;
