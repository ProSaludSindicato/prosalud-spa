
import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft, Compass, MapPin } from "lucide-react";
import { logger } from "@/utils/logger";

const NotFound = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    logger.warn("Se intentó acceder a una ruta inexistente", { path: location.pathname });
    
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-prosalud via-primary-prosalud-dark to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Animated 404 Number */}
        <div className="relative mb-8">
          <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text animate-bounce">
            404
          </h1>
          <div className="absolute inset-0 text-8xl md:text-9xl font-black text-blue-200/20 animate-pulse">404</div>
        </div>
        
        {/* Content */}
        <div className={`transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 md:p-12 border border-white/20 shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              ¡Oops! Página no encontrada
            </h2>
            <p className="text-base md:text-lg text-primary-prosalud-light/75 mb-8">
              La página que buscas no existe o ha sido movida.
            </p>

            {/* Route Info */}
            <div className="bg-black/20 rounded-lg p-4 mb-8 border-l-4 border-secondary-prosaludgreen">
              <p className="text-sm text-primary-prosalud-light/60 mb-1">Ruta solicitada:</p>
              <code className="text-secondary-prosaludgreen font-mono text-sm break-all">
                {location.pathname}
              </code>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.history.back()}
                className="text-white border-white/70 hover:bg-white/10 bg-white/10 px-8 py-6 transition-all duration-300 transform hover:scale-105"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Página Anterior
              </Button>
              <Link to="/">
                <Button
                  size="lg"
                  className="bg-secondary-prosaludgreen hover:bg-secondary-prosaludgreen/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-8 py-6"
                >
                  <Home className="mr-2 h-5 w-5" />
                  Volver al Inicio
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Helpful Links */}
        <div className={`transform transition-all duration-1000 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="mt-8 text-center">
            <p className="text-primary-prosalud-light/75 mb-4">¿Quizás estabas buscando?</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/faq">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-prosalud-light hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Search className="mr-1 h-4 w-4" />
                  FAQ
                </Button>
              </Link>
              <Link to="/servicios/certificado-convenio">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-prosalud-light hover:text-white hover:bg-white/10 transition-colors"
                >
                  Certificados
                </Button>
              </Link>
              <Link to="/servicios/consulta-pagos">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-prosalud-light hover:text-white hover:bg-white/10 transition-colors"
                >
                  Consulta de Pagos
                </Button>
              </Link>
              <Link to="/bienestar">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-prosalud-light hover:text-white hover:bg-white/10 transition-colors"
                >
                  Bienestar
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-secondary-prosaludgreen/20 rounded-full animate-pulse hidden md:block" />
        <div className="absolute bottom-10 right-10 w-16 h-16 bg-white/10 rounded-full animate-pulse hidden md:block" />
        <div className="absolute top-1/3 right-20 w-8 h-8 bg-secondary-prosaludgreen/30 rounded-full animate-bounce hidden lg:block" />
      </div>
    </div>
  );
};

export default NotFound;
