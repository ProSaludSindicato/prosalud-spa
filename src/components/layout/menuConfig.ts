
import { Briefcase, Home, Users, FileText, FolderArchive, Shield, LucideIcon } from 'lucide-react';

// Define types for menu items
export interface MenuSubItem {
  name: string;
  path?: string; // Path is optional, especially if it's a header for another submenu
  external?: boolean;
  url?: string;
  submenu?: MenuSubItem[];
}

export interface BaseMenuItem {
  name: string;
  icon: LucideIcon;
}

export interface TopLevelMenuItemWithSubmenu extends BaseMenuItem {
  submenu: MenuSubItem[];
  path?: undefined; 
  url?: undefined;
}

export interface TopLevelMenuItemDirectLink extends BaseMenuItem {
  path: string;
  submenu?: undefined; 
  url?: undefined;
}

export interface TopLevelMenuItemExternalLink extends BaseMenuItem {
  url: string;
  submenu?: undefined;
  path?: undefined;
}

export type MenuItemType = TopLevelMenuItemWithSubmenu | TopLevelMenuItemDirectLink | TopLevelMenuItemExternalLink;

// Define menu structure for dropdown navigation
export const menuItems: MenuItemType[] = [
  {
    name: 'Inicio',
    icon: Home,
    path: '/'
  },
  {
    name: 'Nosotros',
    icon: Users,
    submenu: [
      { name: '¿Quiénes somos?', path: '/nosotros' },
      { name: 'Estatutos y beneficios sindicales', path: '/nosotros/estatutos' },
      { name: 'Contrato sindical', path: '/nosotros/contrato-sindical' },
    ]
  },
  {
    name: 'Seguridad y Salud en el Trabajo',
    icon: Shield,
    submenu: [
      {
        name: 'Campañas',
        submenu: [
          { name: 'Estilo de Vida y Trabajo Saludable', path: '/servicios/sst' },
        ]
      },
    ]
  },
  {
    name: 'Documentos y formatos',
    icon: FileText,
    submenu: [
      /*{
        name: 'Documentos públicos',
        submenu: [
          { name: 'Formatos de dotación', path: '/documentos-formatos/documentos-publicos/formatos-dotacion' },
          { name: 'Listados de asistencia', path: '/documentos-formatos/documentos-publicos/listados-asistencia' },
          { name: 'Retefuente: documentos Requeridos', path: '/documentos-formatos/documentos-publicos/retefuente-documentos-requeridos' },
        ]
      },*/
      {
        name: 'Solicitudes de afiliados',
        submenu: [
          { name: 'Verificación de pagos', path: '/servicios/consulta-pagos' },
          { name: 'Certificado de Convenio', path: '/servicios/certificado-convenio' }, 
          { name: 'Compensación por Descanso', path: '/servicios/compensacion-descanso' },
          { name: 'Solicitud anual diferida', path: '/servicios/compensacion-anual' },
          { name: 'Solicitud de Retiro Sindical', path: '/servicios/retiro-sindical' },
        ]
      },
    ]
  },
  {
    name: 'Archivo Digital',
    icon: FolderArchive,
    url: 'http://orgs.ddns.net:8091/'
  },
  {
    name: 'Recursos',
    icon: Briefcase,
    submenu: [
      { name: 'Video ProSanet (YouTube)', external: true, url: 'https://www.youtube.com/watch?v=GnaElswl7SI&feature=youtu.be' },
      { name: 'Acceso a ProSanet', external: true, url: 'https://www.prosanet.com/#/shifts-employees/index' },
      { name: 'Bienestar', path: '/servicios/galeria-bienestar' },
      { name: 'Instalar como App', path: '/ayuda/acceso-directo-movil' },
    ]
  },
];

// Simplified nav items for mobile view - Adjusted to pick first sensible path
export const mobileNavItems = menuItems.map(item => {
  let path = '/'; // Default path
  if (item.submenu && item.submenu.length > 0) {
    const firstSubItem = item.submenu[0];
    if (firstSubItem.path) {
      path = firstSubItem.path;
    } else if (firstSubItem.submenu && firstSubItem.submenu.length > 0) {
      // Drill down to the first actual link if the first sub-item is also a group
      const firstNestedSubItem = firstSubItem.submenu[0];
      if (firstNestedSubItem.path) {
        path = firstNestedSubItem.path;
      }
    }
  } else if (item.path) {
    path = item.path;
  }
  return {
    name: item.name,
    path: path,
    icon: item.icon
  };
});
