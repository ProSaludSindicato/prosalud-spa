export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  redirectUrl?: string;
  redirectText?: string;
}

export interface FAQCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const faqCategories: FAQCategory[] = [
  {
    id: "general",
    name: "Información General",
    description: "Preguntas sobre ProSalud y sus servicios",
    icon: "Info",
  },
  {
    id: "servicios",
    name: "Servicios y Trámites",
    description: "Consultas sobre solicitudes y certificados",
    icon: "FileText",
  },
  {
    id: "afiliacion",
    name: "Afiliación",
    description: "Procesos de ingreso y retiro",
    icon: "Users",
  },
  {
    id: "beneficios",
    name: "Beneficios y Compensaciones",
    description: "Información sobre beneficios sindicales",
    icon: "Gift",
  },
  {
    id: "tecnico",
    name: "Soporte Técnico",
    description: "Ayuda con el portal web",
    icon: "Settings",
  },
];

export const faqData: FAQItem[] = [
  // Información General
  {
    id: "que-es-prosalud",
    question: "¿Qué es ProSalud?",
    answer:
      "ProSalud es el Sindicato de Profesionales de la Salud, un sindicato de gremio que funciona de conformidad con la Constitución Nacional. Está orientado al bienestar de los afiliados de manera autogestionaria y autónoma, con más de 10 años de experiencia y aproximadamente 1500 afiliados.",
    category: "general",
    keywords: ["prosalud", "sindicato", "profesionales", "salud", "que es"],
    redirectUrl: "/nosotros",
    redirectText: "Conoce más sobre nosotros",
  },
  {
    id: "mision-prosalud",
    question: "¿Cuál es la misión de ProSalud?",
    answer:
      "Nuestra misión es representar y fortalecer el oficio de los Profesionales de la Salud generando bienestar laboral y económico a todos sus afiliados partícipes, buscando así el mejoramiento en los estándares de calidad en la prestación de los servicios de las Instituciones contractuales.",
    category: "general",
    keywords: ["mision", "objetivo", "proposito"],
    redirectUrl: "/nosotros",
    redirectText: "Ver misión y visión completa",
  },

  // Servicios y Trámites
  {
    id: "certificado-convenio",
    question: "¿Cómo solicitar un certificado de convenio sindical?",
    answer:
      "Puede solicitar su certificado de convenio sindical a través del formulario en línea en nuestro portal web. Necesitará proporcionar sus datos personales, tipo de identificación, y especificar qué información requiere incluir en el certificado. El certificado será enviado a su correo electrónico en los próximos días hábiles.",
    category: "servicios",
    keywords: ["certificado", "convenio", "solicitud", "tramite"],
    redirectUrl: "/servicios/certificado-convenio",
    redirectText: "Solicitar certificado ahora",
  },
  {
    id: "verificacion-pagos",
    question: "¿Cómo verificar el estado de mis pagos?",
    answer:
      "Para verificar sus pagos, acceda al servicio de Verificación de Pagos en nuestro portal. Deberá completar el formulario con sus datos personales y describir la novedad o consulta específica sobre sus pagos. También puede adjuntar documentos de soporte si es necesario.",
    category: "servicios",
    keywords: ["pagos", "verificacion", "consulta", "salarios"],
    redirectUrl: "/servicios/consulta-pagos",
    redirectText: "Verificar pagos",
  },
  {
    id: "compensacion-descanso",
    question: "¿Cómo solicitar compensación por descanso?",
    answer:
      "La compensación por descanso se solicita a través del formulario en línea. Debe completar sus datos personales, información del proceso donde labora, fechas del descanso solicitado y adjuntar el formato diligenciado correspondiente. La solicitud será procesada según los requisitos establecidos.",
    category: "servicios",
    keywords: ["descanso", "compensación", "vacaciones", "permisos"],
    redirectUrl: "/servicios/compensacion-descanso",
    redirectText: "Solicitar compensación por descanso",
  },
  {
    id: "compensacion-anual",
    question: "¿Qué es la compensación anual diferida y cómo solicitarla?",
    answer:
      "La compensación anual diferida es un beneficio que requiere el cumplimiento de ciertos requisitos. Para solicitarla, acceda al formulario correspondiente, complete sus datos personales, información del proceso, motivo de la solicitud y adjunte obligatoriamente el formato diligenciado y la evidencia de soporte.",
    category: "servicios",
    keywords: ["compensacion", "anual", "diferida", "beneficio"],
    redirectUrl: "/servicios/compensacion-anual",
    redirectText: "Solicitar compensación",
  },
  {
    id: "seguridad-social",
    question: "¿Cómo obtener el comprobante de aportes a la seguridad social?",
    answer:
      "El comprobante de aportes a la seguridad social se obtiene de manera autónoma a través del portal de ARUS SUAPORTE. En nuestra página encontrará el enlace directo y las instrucciones para acceder al sistema externo donde podrá generar su comprobante.",
    category: "servicios",
    keywords: ["seguridad", "social", "aportes", "certificado", "arus"],
    redirectUrl: "/servicios/certificado-seguridad-social",
    redirectText: "Acceder al servicio",
  },

  // Afiliación
  {
    id: "como-afiliarse",
    question: "¿Cómo puedo afiliarme a ProSalud?",
    answer:
      "Para información sobre el proceso de afiliación, por favor contacte directamente a ProSalud a través de nuestros canales oficiales. Los requisitos y procedimientos de afiliación varían según su situación laboral y profesional en el sector salud.",
    category: "afiliacion",
    keywords: ["afiliacion", "ingreso", "como", "unirse"],
  },
  {
    id: "retiro-sindical",
    question: "¿Cómo solicitar el retiro del sindicato?",
    answer:
      "Para solicitar el retiro sindical, debe descargar el formato específico desde nuestra página, diligenciarlo completamente y enviarlo según las instrucciones proporcionadas. El proceso requiere documentación específica y seguir los procedimientos establecidos en los estatutos.",
    category: "afiliacion",
    keywords: ["retiro", "salida", "desvinculacion", "sindical"],
    redirectUrl: "/servicios/retiro-sindical",
    redirectText: "Iniciar proceso de retiro",
  },

  // Beneficios y Compensaciones
  {
    id: "contrato-sindical-definicion",
    question: "¿Qué es un contrato sindical?",
    answer:
      "El contrato sindical es el que celebran uno o varios sindicatos de trabajadores con uno o varios empleadores para la prestación de servicios o ejecución de una obra por medio de sus afiliados. Es de naturaleza colectiva y los afiliados partícipes tienen derecho a compensaciones por su participación.",
    category: "beneficios",
    keywords: ["contrato", "sindical", "definicion", "naturaleza"],
    redirectUrl: "/nosotros/contrato-sindical",
    redirectText: "Ver información completa",
  },
  {
    id: "compensaciones-beneficios",
    question: "¿Qué compensaciones y beneficios ofrece ProSalud?",
    answer:
      "ProSalud establece compensaciones, auxilios y beneficios según la asamblea, el reglamento o contrato sindical. Los afiliados partícipes en contratos sindicales tienen derecho a reconocimiento económico denominado compensación. Los detalles específicos están en nuestros estatutos disponibles en el sitio web.",
    category: "beneficios",
    keywords: ["compensaciones", "beneficios", "auxilios", "economico"],
    redirectUrl: "/nosotros/estatutos",
    redirectText: "Ver estatutos y beneficios",
  },

  // Soporte Técnico
  {
    id: "problemas-formulario",
    question: "Tengo problemas para enviar un formulario, ¿qué hago?",
    answer:
      "Si experimenta dificultades técnicas con los formularios: 1) Verifique su conexión a internet, 2) Asegúrese de completar todos los campos obligatorios, 3) Verifique que los archivos adjuntos cumplan los requisitos de tamaño y formato, 4) Intente usar un navegador diferente. Si el problema persiste, contacte nuestro soporte técnico.",
    category: "tecnico",
    keywords: ["formulario", "problemas", "envio", "tecnico"],
  },
  {
    id: "tipos-archivos",
    question: "¿Qué tipos de archivos puedo adjuntar en las solicitudes?",
    answer:
      "Generalmente se aceptan archivos PDF (.pdf) e imágenes (.jpg, .jpeg, .png). El tamaño máximo suele ser de 4 MB por archivo. Cada servicio puede tener requisitos específicos que se indican en el formulario correspondiente.",
    category: "tecnico",
    keywords: ["archivos", "adjuntar", "pdf", "imagenes", "tamaño"],
  },
  {
    id: "no-recibo-respuesta",
    question: "No he recibido respuesta a mi solicitud, ¿qué debo hacer?",
    answer:
      "Si no ha recibido respuesta: 1) Verifique su carpeta de spam/correo no deseado, 2) Asegúrese de haber agregado comunicaciones@sindicatoprosalud.com a sus contactos, 3) Verifique que proporcionó la dirección de correo correcta. Recuerde que solo nos comunicamos en caso de inconsistencias, de lo contrario recibirá la respuesta directamente.",
    category: "tecnico",
    keywords: ["respuesta", "correo", "spam", "contacto"],
  },
  {
    id: "acceso-directo-movil",
    question: "¿Cómo puedo instalar ProSalud como app en mi móvil?",
    answer:
      "Puedes crear un acceso directo a ProSalud en tu dispositivo móvil para acceder más rápido y de forma más segura. En Android: abre el navegador, toca el menú (tres puntos) y selecciona 'Agregar a pantalla de inicio'. En iPhone: abre Safari, toca el botón de compartir y selecciona 'Agregar a pantalla de inicio'. Visita nuestra página de ayuda para ver el video instructivo completo con todos los pasos detallados.",
    category: "tecnico",
    keywords: ["app", "móvil", "acceso directo", "instalar", "android", "iphone", "ios", "pantalla inicio"],
    redirectUrl: "/ayuda/acceso-directo-movil",
    redirectText: "Ver instrucciones completas",
  },
];
