import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BASE_TITLE = 'ProSalud - Sindicato de Profesionales de la Salud';

const ROUTE_TITLES: Record<string, string> = {
  '/': BASE_TITLE,
  '/contacto': 'Contacto - ProSalud',
  '/nosotros': '¿Quiénes somos? - ProSalud',
  '/nosotros/estatutos': 'Estatutos y beneficios - ProSalud',
  '/nosotros/contrato-sindical': 'Contrato sindical - ProSalud',
  '/faq': 'Preguntas frecuentes - ProSalud',
  '/auth/login': 'Iniciar sesión - ProSalud',
  '/auth/forgot-password': 'Recuperar contraseña - ProSalud',
  '/auth/restablecer-contraseña': 'Restablecer contraseña - ProSalud',
  '/auth/definir-contraseña': 'Definir contraseña - ProSalud',
  '/ayuda/acceso-directo-movil': 'Instalar ProSalud como app - ProSalud',
  '/servicios/certificado-convenio': 'Certificado de convenio - ProSalud',
  '/servicios/compensacion-descanso': 'Compensación por descanso - ProSalud',
  '/servicios/compensacion-anual': 'Compensación anual diferida - ProSalud',
  '/servicios/consulta-pagos': 'Verificación de pagos - ProSalud',
  '/servicios/certificado-seguridad-social': 'Comprobante seguridad social - ProSalud',
  '/servicios/actualizar-datos-personales': 'Actualizar datos personales - ProSalud',
  '/servicios/incapacidades-licencias': 'Incapacidades y licencias - ProSalud',
  '/servicios/sst': 'Salud y seguridad en el trabajo - ProSalud',
  '/servicios/galeria-bienestar': 'Bienestar - ProSalud',
  '/servicios/permisos-turnos': 'Permisos y cambio de turnos - ProSalud',
  '/servicios/microcredito': 'Microcrédito - ProSalud',
  '/servicios/retiro-sindical': 'Retiro sindical - ProSalud',
  '/servicios/afiliacion-comfenalco': 'Afiliación Comfenalco - ProSalud',
  '/servicios/eps-sura': 'EPS Sura - ProSalud',
  '/encuesta-vacunacion': 'Encuesta de vacunación - ProSalud',
};

const SetPageTitle = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const title = ROUTE_TITLES[pathname] ?? BASE_TITLE;
    document.title = title;
  }, [pathname]);

  return null;
};

export default SetPageTitle;
