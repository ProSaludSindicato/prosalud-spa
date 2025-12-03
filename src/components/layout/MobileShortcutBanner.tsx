import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Smartphone, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Constante para controlar si el banner siempre se muestra (true) o solo la primera vez (false)
const ALWAYS_SHOW_BANNER = true;

const MobileShortcutBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // No mostrar el banner en la página de ayuda/acceso-directo-movil
    if (location.pathname === '/ayuda/acceso-directo-movil') {
      setIsVisible(false);
      return;
    }

    // Si ALWAYS_SHOW_BANNER es true, siempre mostrar el banner (ignorar localStorage)
    if (ALWAYS_SHOW_BANNER) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    // Si ALWAYS_SHOW_BANNER es false, usar la lógica original con localStorage
    const hasDismissed = localStorage.getItem('prosalud-mobile-shortcut-banner-dismissed');
    
    if (!hasDismissed) {
      // Show banner after a small delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('prosalud-mobile-shortcut-banner-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-secondary-prosaludgreen to-green-600 text-white shadow-lg animate-slide-down">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Smartphone className="h-5 w-5" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">
                Instala ProSalud como app y accede más rápido
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="bg-white text-primary-prosalud hover:bg-gray-100 text-xs font-semibold whitespace-nowrap"
            >
              <Link to="/ayuda/acceso-directo-movil" onClick={handleDismiss}>
                Ver cómo
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileShortcutBanner;



