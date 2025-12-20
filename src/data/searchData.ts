export interface SearchItem {
  id: string;
  title: string;
  description: string;
  path: string;
  category: string;
  keywords: string[];
}

export const searchData: SearchItem[] = [
  {
    id: "home",
    title: "Inicio",
    description: "Página principal de ProSalud con servicios y novedades",
    path: "/",
    category: "Principal",
    keywords: ["inicio", "home", "principal", "bienvenida", "portada", "proSalud", "inicio pagina"]
  },
  {
    id: "contacto",
    title: "Información de Contacto",
    description: "Encuentra nuestros canales de comunicación, horarios y datos de contacto",
    path: "/contacto",
    category: "Información",
    keywords: ["contacto", "telefono", "direccion", "correo", "comunicacion", "horarios", "atencion", "sede", "ubicacion"]
  },
  {
    id: "login",
    title: "Iniciar Sesión",
    description: "Accede a tu cuenta de ProSalud",
    path: "/login",
    category: "Cuenta",
    keywords: ["login", "ingresar", "sesion", "cuenta", "acceder", "iniciar", "autenticarse"]
  },
  {
    id: "faq",
    title: "Preguntas Frecuentes",
    description: "Encuentra respuestas a las consultas más comunes sobre ProSalud",
    path: "/faq",
    category: "Ayuda",
    keywords: ["faq", "preguntas", "frecuentes", "ayuda", "consultas", "respuestas", "dudas", "soporte", "proSalud"]
  },
  {
    id: "quienes-somos",
    title: "¿Quiénes Somos?",
    description: "Conoce la historia, misión y visión de ProSalud",
    path: "/nosotros",
    category: "Nosotros",
    keywords: ["quienes", "somos", "historia", "mision", "vision", "nosotros", "organizacion", "sobre nosotros"]
  },
  {
    id: "estatutos",
    title: "Estatutos y Beneficios",
    description: "Normativas y beneficios sindicales de ProSalud",
    path: "/nosotros/estatutos",
    category: "Nosotros",
    keywords: ["estatutos", "beneficios", "normativas", "reglamento", "sindical", "derechos", "reglas"]
  },
  {
    id: "contrato-sindical",
    title: "Contrato Sindical",
    description: "Información sobre el contrato sindical",
    path: "/nosotros/contrato-sindical",
    category: "Nosotros",
    keywords: ["contrato", "sindical", "acuerdo", "laboral", "convenio", "trabajo", "negociacion"]
  },
  {
    id: "certificado-convenio",
    title: "Certificado de Convenio",
    description: "Solicita tu certificado de convenio sindical",
    path: "/servicios/certificado-convenio",
    category: "Servicios",
    keywords: ["certificado", "convenio", "solicitud", "documento", "descargar", "constancia"]
  },
  {
    id: "compensacion-descanso",
    title: "Solicitud de Compensación por Descanso",
    description: "Tramita tu solicitud de compensación por descanso",
    path: "/servicios/compensacion-descanso",
    category: "Servicios",
    keywords: ["descanso", "sindical", "vacaciones", "permiso", "receso", "tiempo libre"]
  },
  {
    id: "compensacion-anual",
    title: "Compensación Anual Diferida",
    description: "Solicita tu compensación anual diferida",
    path: "/servicios/compensacion-anual",
    category: "Servicios",
    keywords: ["compensacion", "anual", "diferida", "prima", "pago", "bono", "beneficio"]
  },
  {
    id: "consulta-pagos",
    title: "Verificación de Pagos",
    description: "Consulta y verifica el estado de tus pagos",
    path: "/servicios/consulta-pagos",
    category: "Servicios",
    keywords: ["pagos", "verificacion", "consulta", "estado", "salario", "comprobante", "recibo"]
  },
  {
    id: "certificado-seguridad-social",
    title: "Comprobante de Aportes Seguridad Social",
    description: "Obtén tu comprobante de aportes a la seguridad social",
    path: "/servicios/certificado-seguridad-social",
    category: "Servicios",
    keywords: ["seguridad", "social", "certificado", "salud", "pensiones", "afiliacion"]
  },
  {
    id: "actualizar-datos-personales",
    title: "Actualizar Datos Personales",
    description: "Actualiza tu información personal, cuenta bancaria, datos de contacto, nivel educativo, EPS y AFP",
    path: "/servicios/actualizar-datos-personales",
    category: "Servicios",
    keywords: ["datos", "personales", "actualizar", "cuenta", "bancaria", "contacto", "educacion", "eps", "afp", "informacion", "banco"]
  },
  {
    id: "incapacidades-licencias",
    title: "Incapacidades y Licencias",
    description: "Gestiona incapacidades y licencias de maternidad",
    path: "/servicios/incapacidades-licencias",
    category: "Servicios",
    keywords: ["incapacidad", "maternidad", "licencia", "salud", "ausencia", "permiso", "reposo"]
  },
  {
    id: "sst",
    title: "Salud y Seguridad en el Trabajo",
    description: "Información sobre SST y prevención de riesgos",
    path: "/servicios/sst",
    category: "Servicios",
    keywords: ["sst", "salud", "seguridad", "trabajo", "riesgos", "prevencion", "bienestar laboral", "accidente", "incidente"]
  },
  {
    id: "galeria-bienestar",
    title: "Bienestar",
    description: "Eventos y actividades de bienestar",
    path: "/servicios/galeria-bienestar",
    category: "Servicios",
    keywords: ["galeria", "bienestar", "eventos", "actividades", "fotos", "imagenes", "memorias"]
  },
  {
    id: "permisos-turnos",
    title: "Permisos y Cambio de Turnos",
    description: "Solicita permisos y cambios de turno",
    path: "/servicios/permisos-turnos",
    category: "Servicios",
    keywords: ["permisos", "turnos", "cambio", "horario", "trabajo", "ajuste", "turno laboral"]
  },
  {
    id: "microcredito",
    title: "Microcrédito",
    description: "Información sobre microcréditos disponibles",
    path: "/servicios/microcredito",
    category: "Servicios",
    keywords: ["microcredito", "prestamo", "credito", "financiacion", "dinero", "ayuda financiera"]
  },
  {
    id: "retiro-sindical",
    title: "Retiro Sindical",
    description: "Proceso de retiro del sindicato",
    path: "/servicios/retiro-sindical",
    category: "Servicios",
    keywords: ["retiro", "sindical", "salida", "desvinculacion", "renuncia", "abandono"]
  },
  {
    id: "convenios",
    title: "Convenios",
    description: "Convenios y alianzas estratégicas con entidades en Antioquia",
    path: "/#convenios",
    category: "Información",
    keywords: ["convenios", "alianzas", "acuerdos", "entidades", "antioquia", "instituciones", "hospitales", "centros"]
  },
  {
    id: "servicios",
    title: "Servicios",
    description: "Accede al listado de servicios y trámites disponibles",
    path: "/",
    category: "Información",
    keywords: ["servicios", "tramites", "solicitudes", "consultas", "peticiones", "gestiones", "opciones"]
  },
  {
    id: "comfenalco",
    title: "Comfenalco",
    description: "Servicios y experiencias de bienestar con la caja de compensación Comfenalco",
    path: "/#convenios",
    category: "Principal",
    keywords: ["comfenalco", "servicios", "experiencias", "bienestar", "beneficios", "caja", "antioquia", "compensacion"]
  },
  // Información EPS Sura
  {
    id: 'eps-sura',
    title: 'EPS Sura - Gestión y Trámites',
    description: 'Información completa sobre trámites y procedimientos con EPS Sura: traslados, cambio de IPS, retiro de beneficiarios, UPC adicional, certificados e incapacidades.',
    category: 'Información',
    keywords: ['eps', 'sura', 'traslado', 'ips', 'beneficiarios', 'upc', 'certificados', 'incapacidades', 'afiliación', 'retiro'],
    path: '/servicios/eps-sura'
  },
  {
    id: 'acceso-directo-movil',
    title: 'Instalar ProSalud como App',
    description: 'Aprende cómo crear un acceso directo a ProSalud en tu dispositivo móvil para acceder más rápido, ágil y seguro. Instrucciones paso a paso para Android e iOS.',
    category: 'Ayuda',
    keywords: ['app', 'móvil', 'acceso directo', 'instalar', 'android', 'iphone', 'ios', 'pantalla inicio', 'aplicación', 'celular', 'dispositivo móvil', 'instalar app', 'acceso rápido'],
    path: '/ayuda/acceso-directo-movil'
  }
];
