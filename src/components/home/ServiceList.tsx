
import React, { useMemo } from 'react';
import ServiceCard from '@/components/shared/ServiceCard';
import { 
  Search as SearchIconLucide, // Renamed to avoid conflict with Search component/icon if any
  FileText, 
  BedDouble, 
  Banknote, 
  ShieldCheck, 
  HardHat, 
  Landmark, 
  Image, 
  Coins, 
  Award as Certificate, 
  CalendarCheck,
  DollarSign,
  Hospital,
  BriefcaseMedical, 
  Users as Poll, 
  Store,
  Calendar,
  CalendarDays,
  CreditCard,
  LogOut,
  UserPlus
} from 'lucide-react';

// Definición de categorías (debe coincidir con QuickLinksSection)
export const serviceCategories = [
  "Todos",
  "Certificados y Documentos",
  "Gestión Personal y Sindical",
  "Pagos",
  "Bienestar y SST"
] as const;

export type ServiceCategory = typeof serviceCategories[number];

interface Service {
  icon: React.ElementType;
  title: string;
  description: string;
  linkTo: string;
  category: ServiceCategory;
  keywords: string[];
}

const newServices: Service[] = [
  { 
    icon: Certificate, 
    title: 'Certificado de convenio sindical', 
    description: 'Descarga tu constancia de afiliación al convenio sindical.', 
    linkTo: '/servicios/certificado-convenio', 
    category: 'Certificados y Documentos',
    keywords: ['certificado', 'convenio', 'sindical', 'afiliacion', 'constancia', 'documento', 'descarga']
  },
  { 
    icon: CalendarCheck, 
    title: 'Compensación por descanso', 
    description: 'Solicita tu compensación anual por descanso según tus condiciones actuales.',
    linkTo: '/servicios/compensacion-descanso',
    category: 'Gestión Personal y Sindical',
    keywords: ['descanso', 'solicitud', 'dias', 'vacaciones', 'permisos', 'ausentismo', 'tiempo libre']
  },
  { 
    icon: DollarSign, 
    title: 'Compensación anual diferida', 
    description: 'Gestiona el pago correspondiente a tu compensación anual.', 
    linkTo: '/servicios/compensacion-anual', 
    category: 'Pagos',
    keywords: ['compensacion', 'anual', 'diferida', 'pago', 'gestion', 'prima', 'bono', 'beneficio']
  },
  { 
    icon: SearchIconLucide, 
    title: 'Verificación de pagos', 
    description: 'Verifica los pagos realizados por concepto sindical.', 
    linkTo: '/servicios/consulta-pagos', 
    category: 'Pagos',
    keywords: ['consulta', 'pagos', 'verificacion', 'sindical', 'concepto', 'salario', 'nomina', 'estado']
  }, 
  { 
    icon: ShieldCheck, 
    title: 'Comprobante de aportes Seguridad social', 
    description: 'Obtén tu comprobante de aportes a la seguridad social de forma autónoma.', 
    linkTo: '/servicios/certificado-seguridad-social',
    category: 'Certificados y Documentos',
    keywords: ['seguridad', 'social', 'aportes', 'certificado', 'generar', 'salud', 'pensiones', 'arl']
  },
  { 
    icon: Banknote, 
    title: 'Actualizar cuenta bancaria', 
    description: 'Notifica un cambio en tu cuenta para recibir pagos.', 
    linkTo: '/servicios/actualizar-cuenta', 
    category: 'Pagos',
    keywords: ['cuenta', 'bancaria', 'actualizar', 'cambio', 'banco', 'pagos', 'datos', 'informacion']
  },
  { 
    icon: Hospital, 
    title: 'Incapacidades y licencias', 
    description: 'Reporta tu incapacidad o licencia de maternidad al sindicato.', 
    linkTo: '/servicios/incapacidad-maternidad', 
    category: 'Gestión Personal y Sindical',
    keywords: ['incapacidades', 'licencias', 'maternidad', 'reportar', 'salud', 'ausencia', 'medica']
  },
  { 
    icon: BriefcaseMedical, 
    title: 'Seguridad y salud en el trabajo (S.S.T)', 
    description: 'Accede a recursos y reportes relacionados con Seguridad y Salud en el Trabajo (SST).', 
    linkTo: '/servicios/sst', 
    category: 'Bienestar y SST',
    keywords: ['seguridad', 'salud', 'trabajo', 'sst', 'recursos', 'reportes', 'riesgos', 'prevencion']
  },
  { 
    icon: Poll, 
    title: 'Encuesta de bienestar', 
    description: 'Participa en encuestas para mejorar tu entorno y condiciones.', 
    linkTo: 'https://forms.gle/2YnLMixdN6EnZ7Qq6', 
    category: 'Bienestar y SST',
    keywords: ['encuesta', 'bienestar', 'participar', 'mejorar', 'entorno', 'condiciones', 'feedback']
  },
  { 
    icon: Image, 
    title: 'Bienestar', 
    description: 'Explora fotos y eventos organizados para tu bienestar.', 
    linkTo: '/servicios/galeria-bienestar', 
    category: 'Bienestar y SST',
    keywords: ['galeria', 'bienestar', 'fotos', 'eventos', 'explorar', 'actividades', 'imagenes']
  },
  { 
    icon: Calendar, 
    title: 'Permisos y cambio de turnos', 
    description: 'Diligencia el formato para solicitudes de permisos o ajustes en tus turnos.', 
    linkTo: '/servicios/permisos-turnos', 
    category: 'Certificados y Documentos',
    keywords: ['permisos', 'turnos', 'formato', 'diligenciar', 'solicitudes', 'cambio', 'ajustes', 'horario']
  },
  { 
    icon: CalendarDays, 
    title: 'Consulta Cuadro de turnos', 
    description: 'Consulta tu calendario de turnos asignados.', 
    linkTo: 'https://www.prosanet.com/#/shifts-employees/index', 
    category: 'Gestión Personal y Sindical',
    keywords: ['cuadro', 'turnos', 'calendario', 'consulta', 'asignados', 'horarios', 'programacion']
  },
  { 
    icon: CreditCard, 
    title: 'Solicitud de microcrédito', 
    description: 'Aplica a un microcrédito con condiciones especiales para afiliados.', 
    linkTo: '/servicios/microcredito', 
    category: 'Pagos',
    keywords: ['microcredito', 'solicitud', 'aplicar', 'credito', 'prestamo', 'condiciones', 'afiliados']
  },
  { 
    icon: UserPlus, 
    title: 'Afiliación a Comfenalco', 
    description: 'Conoce el proceso para afiliarte a Comfenalco Antioquia como beneficiario.', 
    linkTo: '/servicios/afiliacion-comfenalco', 
    category: 'Gestión Personal y Sindical',
    keywords: ['comfenalco', 'afiliacion', 'beneficio', 'proceso', 'vinculacion', 'registro', 'caja', 'compensacion']
  },
  { 
    icon: LogOut, 
    title: 'Solicitud de retiro sindical', 
    description: 'Inicia el proceso para retirarte del sindicato.', 
    linkTo: '/servicios/retiro-sindical', 
    category: 'Gestión Personal y Sindical',
    keywords: ['retiro', 'sindical', 'proceso', 'iniciar', 'salida', 'desvinculacion', 'abandono']
  },
];

interface ServiceListProps {
  searchTerm: string;
  selectedCategory: ServiceCategory;
}

const ServiceList: React.FC<ServiceListProps> = ({ searchTerm, selectedCategory }) => {
  const filteredServices = useMemo(() => {
    let servicesToFilter = newServices;

    if (selectedCategory && selectedCategory !== 'Todos') {
      servicesToFilter = servicesToFilter.filter(service => service.category === selectedCategory);
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      servicesToFilter = servicesToFilter.filter(service => 
        service.title.toLowerCase().includes(lowerSearchTerm) ||
        (service.description && service.description.toLowerCase().includes(lowerSearchTerm)) ||
        service.keywords.some(keyword => keyword.toLowerCase().includes(lowerSearchTerm))
      );
    }
    return servicesToFilter;
  }, [searchTerm, selectedCategory]);

  return (
    <>
      {filteredServices.length > 0 ? (
        <div 
          key={`${selectedCategory}-${searchTerm}`} // Key to re-trigger animation on filter/search change
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-6 md:gap-8 animate-fadeIn"
        >
          {filteredServices.map((service, index) => (
            <ServiceCard
              key={index} // React's internal key for list items
              icon={service.icon}
              title={service.title}
              description={service.description}
              linkTo={service.linkTo}
              className="animate-scale-in" // Keep existing animation for individual cards
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 animate-fadeIn"> {/* Added animation here too */}
          <SearchIconLucide size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-xl text-muted-foreground">No se encontraron trámites.</p>
          <p className="text-sm text-muted-foreground">Intenta con otras palabras clave o cambia la categoría.</p>
        </div>
      )}
    </>
  );
};

export default ServiceList;
