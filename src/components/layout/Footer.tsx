import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer: React.FC = () => {
  const logoUrl = "/images/logo_prosalud_fondo.png";
  const minsaludLogoUrl = "/images/minsalud.png";

  return (
    <footer className="bg-slate-900 text-slate-300 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 mb-10">
          {/* Column 1: Logos and About */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-5">
            <div className="flex items-center space-x-4">
              {" "}
              {/* Container for both logos */}
              <Link to="https://www.minsalud.gov.co" target="_blank" rel="noopener noreferrer" className="inline-block cursor-pointer clickable">
                <img src={minsaludLogoUrl} alt="Minsalud Logo" className="h-28 md:h-32" width={600} height={56} />
              </Link>
              <Link to="/" className="inline-block cursor-pointer clickable">
                <img src={logoUrl} alt="ProSalud Logo" className="h-20 md:h-24" width={400} height={265} />
              </Link>
            </div>
            <p className="text-sm text-slate-400">
              Sindicato de Profesionales de la Salud comprometidos con tu bienestar y derechos.
            </p>
          </div>

          {/* Column 2: Enlaces Útiles */}
          <div className="sm:col-span-1 lg:col-span-2">
            <h3 className="text-md font-semibold text-white mb-4 uppercase tracking-wider">Enlaces Útiles</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/faq" className="text-sm hover:text-secondary-prosaludgreen transition-colors cursor-pointer clickable">
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link to="/contacto" className="text-sm hover:text-secondary-prosaludgreen transition-colors cursor-pointer clickable">
                  Contacto
                </Link>
              </li>
              <li>
                <Link to="/ayuda/acceso-directo-movil" className="text-sm hover:text-secondary-prosaludgreen transition-colors cursor-pointer clickable">
                  Instalar como App
                </Link>
              </li>
              <li>
                <Link to="/terminos" className="text-sm hover:text-secondary-prosaludgreen transition-colors cursor-pointer clickable">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link to="/privacidad" className="text-sm hover:text-secondary-prosaludgreen transition-colors cursor-pointer clickable">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link
                  to="/nosotros/quienes-somos"
                  className="text-sm hover:text-secondary-prosaludgreen transition-colors cursor-pointer clickable"
                >
                  ¿Quiénes somos?
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Servicios Destacados (Example) */}
          <div className="sm:col-span-1 lg:col-span-2">
            <h3 className="text-md font-semibold text-white mb-4 uppercase tracking-wider">Servicios Clave</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/servicios/certificado-convenio"
                  className="text-sm hover:text-secondary-prosaludgreen transition-colors cursor-pointer clickable"
                >
                  Certificado de Convenio
                </Link>
              </li>
              <li>
                <Link
                  to="/servicios/consulta-pagos"
                  className="text-sm hover:text-secondary-prosaludgreen transition-colors cursor-pointer clickable"
                >
                  Consulta de Pagos
                </Link>
              </li>
              <li>
                <Link to="/servicios/sst" className="text-sm hover:text-secondary-prosaludgreen transition-colors cursor-pointer clickable">
                  Seguridad y Salud
                </Link>
              </li>
              <li>
                <Link
                  to="/servicios/actualizar-datos-personales"
                  className="text-sm hover:text-secondary-prosaludgreen transition-colors cursor-pointer clickable"
                >
                  Actualizar Datos Personales
                </Link>
              </li>
              <li>
                <Link
                  to="/servicios/incapacidades-licencias"
                  className="text-sm hover:text-secondary-prosaludgreen transition-colors cursor-pointer clickable"
                >
                  Incapacidades y Licencias
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Síguenos */}
          <div className="sm:col-span-2 lg:col-span-3">
            <h3 className="text-md font-semibold text-white mb-4 uppercase tracking-wider">Síguenos</h3>
            <p className="text-xs text-slate-500 mt-4">Mantente al día con nuestras novedades y actividades.</p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-700 pt-8 text-center">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} ProSalud. Todos los derechos reservados.
          </p>
          {/* Aviso de privacidad de reCAPTCHA (requerido por Google si se oculta el badge)
          <p className="text-xs text-slate-600 mt-2">
            Este sitio está protegido por reCAPTCHA y se aplican la{' '}
            <a 
              href="https://policies.google.com/privacy" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="underline hover:text-slate-300"
            >
              Política de Privacidad
            </a>
            {' '}y los{' '}
            <a 
              href="https://policies.google.com/terms" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="underline hover:text-slate-300"
            >
              Términos de Servicio
            </a>
            {' '}de Google.
          </p>*/}
          <p className="text-xs text-slate-500 mt-2">
            Algunas imágenes diseñadas por <a href="http://www.freepik.es/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300 cursor-pointer clickable">Freepik</a>.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
