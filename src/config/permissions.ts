/**
 * Configuración centralizada de permisos para el sistema
 * Basado en el catálogo oficial de permisos del backend
 */

import {
  Users, GraduationCap, BarChart3, Settings, Heart,
  ClipboardList, Package, MessageSquare, Vote, Images, ShieldCheck, FileText, FileSignature, Megaphone,
} from 'lucide-react';

export interface ModulePermissions {
  /** Permisos requeridos para ver el módulo en el sidebar y acceder a la ruta principal */
  view: string[];
  /** Permisos requeridos para crear recursos */
  create?: string[];
  /** Permisos requeridos para editar recursos */
  edit?: string[];
  /** Permisos requeridos para eliminar recursos */
  delete?: string[];
  /** Permisos adicionales específicos del módulo */
  custom?: Record<string, string[]>;
}

export interface ModuleConfig {
  name: string;
  href: string;
  icon: any;
  permissions: ModulePermissions;
}

/**
 * Configuración de módulos con sus permisos
 */
export const MODULES_CONFIG: Record<string, ModuleConfig> = {
  dashboard: {
    name: 'Dashboard',
    href: '/admin',
    icon: BarChart3,
    permissions: {
      view: [], // Dashboard es visible para todos los usuarios autenticados
    },
  },
  users: {
    name: 'Usuarios',
    href: '/admin/usuarios',
    icon: Users,
    permissions: {
      view: ['users.view'],
      create: ['users.create'],
      edit: ['users.edit'],
      custom: {
        changeStatus: ['users.change_status'],
      },
    },
  },
  roles: {
    name: 'Roles y Permisos',
    href: '/admin/roles',
    icon: Settings,
    permissions: {
      view: ['roles.manage'],
      create: ['roles.manage'],
      edit: ['roles.manage'],
    },
  },
  inventory: {
    name: 'Inventario',
    href: '/admin/inventario',
    icon: Package,
    permissions: {
      view: [
        'inventory.view_dashboard',
        'inventory.categories.view',
        'inventory.products.view',
        'inventory.entries.view',
        'inventory.locations.view',
        'inventory.stock_movements.view',
      ],
      create: ['inventory.entries.manage', 'inventory.products.manage'],
      edit: ['inventory.entries.manage', 'inventory.products.manage'],
      custom: {
        categories: ['inventory.categories.view'],
        categoriesManage: ['inventory.categories.manage'],
        products: ['inventory.products.view'],
        productsManage: ['inventory.products.manage'],
        entries: ['inventory.entries.view'],
        entriesManage: ['inventory.entries.manage'],
        locations: ['inventory.locations.view'],
        stockMovements: ['inventory.stock_movements.view'],
        hospitalRequests: ['hospital_requests.view'],
        hospitalRequestsCreate: ['hospital_requests.create'],
        hospitalRequestsUpdateStatus: ['hospital_requests.update_status'],
      },
    },
  },
  dotacion: {
    name: 'Dotación y EPP',
    href: '/admin/dotacion-epp',
    icon: ShieldCheck,
    permissions: {
      view: ['dotacion.view'],
      create: ['dotacion.deliveries.create'],
    },
  },
  requests: {
    name: 'Solicitudes',
    href: '/admin/solicitudes',
    icon: ClipboardList,
    permissions: {
      view: ['requests.view'],
      custom: {
        respond: ['requests.respond'],
      },
    },
  },
  wellnessRequests: {
    name: 'Bienestar',
    href: '/admin/solicitudes-bienestar',
    icon: Heart,
    permissions: {
      // Incluir permisos de solicitudes de bienestar y entrega de bienestar
      // Si el usuario tiene cualquiera de estos permisos, puede ver el módulo
      view: ['wellness_requests.view', 'wellness_delivery.view', 'wellness_delivery.manage'],
      create: ['wellness_requests.create'],
      edit: ['wellness_requests.edit'],
      custom: {
        updateStatus: ['wellness_requests.update_status'],
        publishActivity: ['wellness_activity.publish'],
      },
    },
  },
  wellness: {
    name: 'Galería Bienestar',
    href: '/admin/bienestar',
    icon: Images,
    permissions: {
      view: ['wellness_events.view'],
      create: ['wellness_events.create'],
      edit: ['wellness_events.edit'],
    },
  },
  comfenalco: {
    name: 'Experiencias Comfenalco',
    href: '/admin/comfenalco',
    icon: GraduationCap,
    permissions: {
      view: ['comfenalco_events.view'],
      create: ['comfenalco_events.create'],
      edit: ['comfenalco_events.edit'],
      delete: ['comfenalco_events.delete'],
    },
  },
  chatbot: {
    name: 'Chatbot',
    href: '/admin/chatbot',
    icon: MessageSquare,
    permissions: {
      view: ['chatbot.manage'],
      edit: ['chatbot.manage'],
    },
  },
  votes: {
    name: 'Votaciones Asamblea',
    href: '/admin/votaciones',
    icon: Vote,
    permissions: {
      view: ['votes.statistics.view', 'votes.audit.view'],
      custom: {
        statistics: ['votes.statistics.view'],
        audit: ['votes.audit.view'],
        manage: ['votes.manage'],
      },
    },
  },
  assemblyLive: {
    name: 'Asamblea en vivo',
    href: '/admin/asamblea-en-vivo',
    icon: Megaphone,
    permissions: {
      view: ['assembly.questions.manage', 'assembly.quorum.manage'],
    },
  },
  documentSigning: {
    name: 'Firma de Convenios',
    href: '/admin/firma-convenios',
    icon: FileSignature,
    permissions: {
      view: ['document_signing.view'],
      create: ['document_signing.manage'],
      edit: ['document_signing.manage'],
    },
  },
  socioDemographicSurveys: {
    name: 'Encuestas Sociodemográficas',
    href: '/admin/encuestas-sociodemograficas',
    icon: FileText,
    permissions: {
      view: ['socio_demographic_surveys.view'],
      custom: {
        exportVaccination: ['vaccination_surveys.view'],
      },
    },
  },
};

/**
 * Permisos específicos para archivos masivos
 */
export const FILE_PERMISSIONS = {
  activos: 'activos_files.manage',
  afiliados: 'afiliados_files.manage',
  incapacidades: 'incapacidades_files.manage',
  liquidaciones: 'liquidaciones_files.manage',
  delegados: 'delegados_files.manage',
  compensaciones: 'compensaciones_files.manage',
} as const;

/**
 * Helper para obtener los módulos que el usuario puede ver
 */
export const getVisibleModules = (userPermissions: string[]): ModuleConfig[] => {
  return Object.values(MODULES_CONFIG).filter(module => {
    // Si no requiere permisos (como dashboard), siempre visible
    if (module.permissions.view.length === 0) {
      return true;
    }
    // Verificar si el usuario tiene al menos uno de los permisos requeridos
    return module.permissions.view.some(perm => userPermissions.includes(perm));
  });
};

/**
 * Helper para verificar si el usuario puede realizar una acción en un módulo
 */
export const canPerformAction = (
  moduleKey: string,
  action: 'view' | 'create' | 'edit' | 'delete' | string,
  userPermissions: string[]
): boolean => {
  const module = MODULES_CONFIG[moduleKey];
  if (!module) return false;

  let requiredPermissions: string[] = [];

  // Acciones estándar
  if (action === 'view' || action === 'create' || action === 'edit' || action === 'delete') {
    requiredPermissions = module.permissions[action] || [];
  } else {
    // Acciones custom
    requiredPermissions = module.permissions.custom?.[action] || [];
  }

  // Si no hay permisos requeridos, denegar por defecto
  if (requiredPermissions.length === 0) return false;

  // Verificar si el usuario tiene al menos uno de los permisos requeridos
  return requiredPermissions.some(perm => userPermissions.includes(perm));
};

