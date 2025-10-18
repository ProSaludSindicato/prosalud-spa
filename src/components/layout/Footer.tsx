import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer: React.FC = () => {
  const logoUrl = "/images/logo_prosalud_fondo.png";
  const minsaludLogoUrl = "/images/minsalud.webp";

  return (
    <footer className="bg-slate-900 text-slate-300 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 mb-10">
          {/* Column 1: Logos and About */}
          <div className="space-y-4 lg:col-span-4">
            <div className="flex items-center space-x-4">
              {" "}
              {/* Container for both logos */}
              <Link to="https://www.minsalud.gov.co" target="_blank" rel="noopener noreferrer" className="inline-block">
                <img src={minsaludLogoUrl} alt="Minsalud Logo" className="h-28 md:h-32" width={500} height={56} />
              </Link>
              <Link to="/" className="inline-block">
                <img src={logoUrl} alt="ProSalud Logo" className="h-20 md:h-24" width={500} height={265} />
              </Link>
            </div>
            <p className="text-sm text-slate-400">
              Sindicato de Profesionales de la Salud comprometidos con tu bienestar y derechos.
            </p>
          </div>

          {/* Column 2: Enlaces Útiles */}
          <div className="lg:col-span-3">
            <h3 className="text-md font-semibold text-white mb-4 uppercase tracking-wider">Enlaces Útiles</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/faq" className="text-sm hover:text-secondary-prosaludgreen transition-colors">
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link to="/contacto" className="text-sm hover:text-secondary-prosaludgreen transition-colors">
                  Contacto
                </Link>
              </li>
              <li>
                <Link to="/terminos" className="text-sm hover:text-secondary-prosaludgreen transition-colors">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link to="/privacidad" className="text-sm hover:text-secondary-prosaludgreen transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link
                  to="/nosotros/quienes-somos"
                  className="text-sm hover:text-secondary-prosaludgreen transition-colors"
                >
                  ¿Quiénes somos?
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Servicios Destacados (Example) */}
          <div className="lg:col-span-3">
            <h3 className="text-md font-semibold text-white mb-4 uppercase tracking-wider">Servicios Clave</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/servicios/certificado-convenio"
                  className="text-sm hover:text-secondary-prosaludgreen transition-colors"
                >
                  Certificado de Convenio
                </Link>
              </li>
              <li>
                <Link
                  to="/servicios/consulta-pagos"
                  className="text-sm hover:text-secondary-prosaludgreen transition-colors"
                >
                  Consulta de Pagos
                </Link>
              </li>
              <li>
                <Link to="/servicios/sst" className="text-sm hover:text-secondary-prosaludgreen transition-colors">
                  Seguridad y Salud
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Síguenos */}
          <div className="lg:col-span-2">
            <h3 className="text-md font-semibold text-white mb-4 uppercase tracking-wider">Síguenos</h3>
            {/* <div className="flex space-x-4">
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-secondary-prosaludgreen transition-colors" aria-label="Facebook">
                <Facebook size={22} />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-secondary-prosaludgreen transition-colors" aria-label="Twitter">
                <Twitter size={22} />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-secondary-prosaludgreen transition-colors" aria-label="Instagram">
                <Instagram size={22} />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-secondary-prosaludgreen transition-colors" aria-label="LinkedIn">
                <Linkedin size={22} />
              </a>
            </div> */}
            <p className="text-xs text-slate-500 mt-4">Mantente al día con nuestras novedades y actividades.</p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-700 pt-8 text-center">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} ProSalud. Todos los derechos reservados.
          </p>
          {/*<p className="text-xs text-slate-500 mt-2">
            Algunas imágenes diseñadas por <a href="http://www.freepik.es/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">Freepik</a>.
          </p>*/}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
