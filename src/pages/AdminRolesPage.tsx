import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Key, 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  Save, 
  X, 
  Check,
  Search,
  Filter,
  Package,
  FileText,
  Settings,
  BarChart3,
  MessageSquare,
  Building2,
  ShoppingCart,
  Heart,
  Calendar,
  UserCheck,
  Lock,
  Plus,
  FileSignature,
  ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { rolesApiAdapter } from '@/services/rolesApiAdapter';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { Role, Permission } from '@/types/admin';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';

// Mapeo de módulos con iconos
const MODULE_ICONS: Record<string, React.ReactNode> = {
  'request_forms': <FileText className="h-4 w-4" />,
  'wellness_events': <Heart className="h-4 w-4" />,
  'comfenalco_events': <Calendar className="h-4 w-4" />,
  'users': <UserCheck className="h-4 w-4" />,
  'roles': <Shield className="h-4 w-4" />,
  'permissions': <Lock className="h-4 w-4" />,
  'requests': <FileText className="h-4 w-4" />,
  'votes': <BarChart3 className="h-4 w-4" />,
  'wellness_requests': <Heart className="h-4 w-4" />,
  'wellness_activity': <Heart className="h-4 w-4" />,
  'chatbot': <MessageSquare className="h-4 w-4" />,
  'dotacion': <Package className="h-4 w-4" />,
  'inventory': <ShoppingCart className="h-4 w-4" />,
  'hospital_requests': <Building2 className="h-4 w-4" />,
  'assembly': <Users className="h-4 w-4" />,
  'compensaciones_files': <FileText className="h-4 w-4" />,
  'socio_demographic_surveys': <ClipboardList className="h-4 w-4" />,
  'document_signing': <FileSignature className="h-4 w-4" />,
  'wellness_delivery': <Package className="h-4 w-4" />,
  'view_dashboard': <BarChart3 className="h-4 w-4" />,
};

const MODULE_LABELS: Record<string, string> = {
  'request_forms': 'Formularios de Solicitudes',
  'wellness_events': 'Eventos de Bienestar',
  'comfenalco_events': 'Eventos de Comfenalco',
  'users': 'Usuarios',
  'roles': 'Roles',
  'permissions': 'Permisos',
  'requests': 'Solicitudes',
  'votes': 'Votaciones',
  'wellness_requests': 'Solicitudes de Bienestar',
  'wellness_activity': 'Actividad de Bienestar',
  'chatbot': 'Chatbot',
  'dotacion': 'Dotación',
  'inventory': 'Inventario',
  'hospital_requests': 'Solicitudes de Hospital',
  'activos_files': 'Archivos de Activos',
  'afiliados_files': 'Archivos de Afiliados',
  'incapacidades_files': 'Archivos de Incapacidades',
  'liquidaciones_files': 'Archivos de Liquidaciones',
  'delegados_files': 'Archivos de Delegados',
  'assembly': 'Asamblea',
  'compensaciones_files': 'Archivos de Compensaciones',
  'socio_demographic_surveys': 'Encuestas Sociodemográficas',
  'document_signing': 'Firma de Convenios',
  'wellness_delivery': 'Entrega de Bienestar',
  'view_dashboard': 'Dashboard',
};

const ACTION_LABELS: Record<string, string> = {
  'view': 'Ver',
  'create': 'Crear',
  'edit': 'Editar',
  'delete': 'Eliminar',
  'manage': 'Gestionar',
  'respond': 'Responder',
  'update_status': 'Actualizar Estado',
  'download_files': 'Descargar Archivos',
  'statistics': 'Ver estadísticas',
  'hospital_statistics': 'Ver estadísticas hospitalarias',
  'audit': 'Auditoría',
  'export_all': 'Exportar todo',
  'publish': 'Publicar',
  'change_status': 'Cambiar estado',
};

// Traducir permiso completo (con módulo) - para uso general
const translatePermission = (permissionName: string): string => {
  const parts = permissionName.split('.');
  
  if (parts.length === 2) {
    const [module, action] = parts;
    
    // Caso especial: inventory.view_dashboard no debe mostrar "Ver"
    if (module === 'inventory' && action === 'view_dashboard') {
      return 'Dashboard de Inventario';
    }
    
    const translatedModule = MODULE_LABELS[module] || module;
    const translatedAction = ACTION_LABELS[action] || action;
    return `${translatedAction} ${translatedModule}`;
  } else if (parts.length === 3) {
    const [module, submodule, action] = parts;
    const translatedModule = MODULE_LABELS[module] || module;
    const translatedAction = ACTION_LABELS[action] || action;
    
    if (module === 'inventory') {
      const submoduleMap: Record<string, string> = {
        'categories': 'Categorías',
        'products': 'Productos',
        'colors': 'Colores',
        'entries': 'Entradas',
        'locations': 'Ubicaciones',
        'stock_movements': 'Movimientos de Stock',
        'view_dashboard': 'Dashboard',
      };
      const translatedSub = submoduleMap[submodule] || submodule;
      return `${translatedAction} ${translatedSub} de Inventario`;
    }
    
    return `${translatedAction} ${translatedModule}`;
  }
  
  return permissionName;
};

// Traducir solo la acción del permiso (sin módulo) - para uso cuando está agrupado
const translatePermissionAction = (permissionName: string): string => {
  const parts = permissionName.split('.');
  
  if (parts.length === 2) {
    const [module, action] = parts;
    
    // Caso especial: inventory.view_dashboard no debe mostrar "Ver"
    if (module === 'inventory' && action === 'view_dashboard') {
      return 'Dashboard';
    }
    
    // Permisos de archivos: cambiar "Ver" o "Gestionar" a "Cargar archivo"
    if (module.endsWith('_files') && (action === 'view' || action === 'manage')) {
      return 'Cargar archivo';
    }
    
    return ACTION_LABELS[action] || action;
  } else if (parts.length === 3) {
    const [module, submodule, action] = parts;
    
    // Permisos de inventario con "view": especificar qué se está viendo
    if (module === 'inventory' && action === 'view') {
      const submoduleMap: Record<string, string> = {
        'categories': 'Categorías',
        'products': 'Productos',
        'colors': 'Colores',
        'entries': 'Entradas',
        'locations': 'Ubicaciones',
        'stock_movements': 'Movimientos de Stock',
        'view_dashboard': 'Dashboard',
      };
      const translatedSub = submoduleMap[submodule] || submodule;
      return `Ver ${translatedSub}`;
    }
    
    // Permisos de archivos: cambiar "Ver" o "Gestionar" a "Cargar archivo"
    if (module.endsWith('_files') && (action === 'view' || action === 'manage')) {
      return 'Cargar archivo';
    }
    
    return ACTION_LABELS[action] || action;
  }
  
  // Si no tiene formato estándar, intentar extraer la última parte
  const lastPart = parts[parts.length - 1];
  return ACTION_LABELS[lastPart] || lastPart || permissionName;
};

const getModuleFromPermission = (permissionName: string): string => {
  const parts = permissionName.split('.');
  return parts[0] || 'other';
};

/**
 * Vista legacy de roles y permisos (ya reemplazada por:
 * - AdminRolesListPage (listado)
 * - AdminRoleDetailPage (detalle)
 * - AdminRoleEditPage (edición)
 *
 * Se mantiene el archivo por compatibilidad histórica, pero
 * NO se usa en el enrutador principal. Si se quiere limpiar
 * completamente, se puede eliminar este componente y su archivo
 * una vez confirmada la migración total.
 */
const AdminRolesPage: React.FC = () => {
  const { toast } = useToast();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  // Security: Use centralized sanitization hook
  const { sanitizeText } = useSanitizedInput();
  const [expandedRoles, setExpandedRoles] = useState<number[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [permissionSearchTerm, setPermissionSearchTerm] = useState('');

  const { data: roles = [], isLoading: rolesLoading, error: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApiAdapter.getRoles,
  });

  const { data: allPermissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesApiAdapter.getPermissions,
    enabled: !!editingRole || creatingRole, // Cargar cuando se está editando o creando
  });

  // Agrupar permisos por módulo
  const permissionsByModule = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    allPermissions.forEach(permission => {
      const module = getModuleFromPermission(permission.name);
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(permission);
    });
    return grouped;
  }, [allPermissions]);

  // Filtrar permisos por búsqueda en el diálogo
  const filteredPermissionsByModule = useMemo(() => {
    if (!permissionSearchTerm.trim()) {
      return permissionsByModule;
    }
    
    const searchLower = permissionSearchTerm.toLowerCase();
    const filtered: Record<string, Permission[]> = {};
    
    Object.entries(permissionsByModule).forEach(([module, permissions]) => {
      const matchingPermissions = permissions.filter(permission => 
        translatePermissionAction(permission.name).toLowerCase().includes(searchLower) ||
        translatePermission(permission.name).toLowerCase().includes(searchLower) ||
        permission.name.toLowerCase().includes(searchLower)
      );
      
      if (matchingPermissions.length > 0) {
        filtered[module] = matchingPermissions;
      }
    });
    
    return filtered;
  }, [permissionsByModule, permissionSearchTerm]);

  // Mutation para crear rol
  const createRoleMutation = useMutation({
    mutationFn: ({ name, description, permissions }: { name: string; description?: string; permissions: number[] }) =>
      rolesApiAdapter.createRole({ name, description, permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Rol creado',
        description: 'El rol se ha creado correctamente.',
      });
      setCreatingRole(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setSelectedPermissions([]);
      setPermissionSearchTerm('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo crear el rol',
        variant: 'destructive',
      });
    },
  });

  // Mutation para actualizar rol
  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, name, description, permissions }: { roleId: number; name?: string; description?: string; permissions: number[] }) =>
      rolesApiAdapter.updateRole(roleId, { name, description, permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Rol actualizado',
        description: 'El rol se ha actualizado correctamente.',
      });
      setEditingRole(null);
      setSelectedPermissions([]);
      setPermissionSearchTerm('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo actualizar el rol',
        variant: 'destructive',
      });
    },
  });

  const toggleRole = (roleId: number) => {
    setExpandedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del rol es requerido',
        variant: 'destructive',
      });
      return;
    }

    createRoleMutation.mutate({
      name: newRoleName.trim(),
      description: newRoleDescription.trim() || undefined,
      permissions: selectedPermissions,
    });
  };

  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDescription, setEditRoleDescription] = useState('');

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDescription(role.description || '');
    setSelectedPermissions(role.permissions.map(p => p.id));
    setPermissionSearchTerm('');
  };

  const handleSaveRole = () => {
    if (!editingRole) return;
    
    updateRoleMutation.mutate({
      roleId: editingRole.id,
      name: editRoleName.trim(),
      description: editRoleDescription.trim() || undefined,
      permissions: selectedPermissions,
    });
  };

  const handleTogglePermission = (permissionId: number) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSelectAllModule = (module: string) => {
    const modulePermissions = permissionsByModule[module] || [];
    const modulePermissionIds = modulePermissions.map(p => p.id);
    const allSelected = modulePermissionIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      // Deseleccionar todos los permisos del módulo
      setSelectedPermissions(prev => prev.filter(id => !modulePermissionIds.includes(id)));
    } else {
      // Seleccionar todos los permisos del módulo
      setSelectedPermissions(prev => [...new Set([...prev, ...modulePermissionIds])]);
    }
  };

  const getRoleDescription = (roleName: string) => {
    const descriptions: Record<string, string> = {
      admin: 'Acceso completo a todas las funcionalidades del sistema',
      auxiliar: 'Gestión de formularios de solicitudes, eventos de bienestar y eventos de Comfenalco',
      sst: 'Gestión de eventos de bienestar y eventos de Comfenalco',
      técnico: 'Gestión de eventos de bienestar, eventos de Comfenalco y usuarios',
    };
    return descriptions[roleName] || 'Sin descripción disponible';
  };

  const getRoleColor = (roleName: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 border-red-200',
      auxiliar: 'bg-blue-100 text-blue-800 border-blue-200',
      sst: 'bg-green-100 text-green-800 border-green-200',
      técnico: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return colors[roleName] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Agrupar permisos del rol por módulo
  const getRolePermissionsByModule = (role: Role) => {
    const grouped: Record<string, Permission[]> = {};
    role.permissions.forEach(permission => {
      const module = getModuleFromPermission(permission.name);
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(permission);
    });
    return grouped;
  };

  // Filtrar roles por búsqueda
  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (filterModule === 'all') return matchesSearch;
      
      const roleModules = Object.keys(getRolePermissionsByModule(role));
      return matchesSearch && roleModules.includes(filterModule);
    });
  }, [roles, searchTerm, filterModule]);

  // Obtener módulos únicos de todos los roles
  const allModules = useMemo(() => {
    const modules = new Set<string>();
    roles.forEach(role => {
      Object.keys(getRolePermissionsByModule(role)).forEach(module => modules.add(module));
    });
    return Array.from(modules).sort();
  }, [roles]);

  const canEdit = can('roles.manage');

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto"
        >
          {/* Header */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                    <Shield className="h-8 w-8 text-primary-prosalud" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl font-bold text-primary-prosalud">
                      Roles y Permisos
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                      Gestiona los roles del sistema y sus permisos asociados
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Info Alert */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Información importante</AlertTitle>
            <AlertDescription className="text-blue-800">
              Los roles están protegidos y no pueden ser eliminados. {canEdit ? 'Puedes modificar los permisos de cada rol haciendo clic en el botón "Editar".' : 'Solo los administradores pueden modificar los permisos de cada rol.'}
            </AlertDescription>
          </Alert>

          {/* Filtros y búsqueda */}
          <Card className="bg-white border shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar roles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">Todos los módulos</option>
                    {allModules.map(module => (
                      <option key={module} value={module}>
                        {MODULE_LABELS[module] || module}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roles List */}
          <Card className="bg-white border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Roles del Sistema ({filteredRoles.length})
                  </CardTitle>
                  <CardDescription>
                    Lista de todos los roles disponibles en el sistema
                  </CardDescription>
                </div>
                {/* Botón de creación de rol eliminado en la vista legacy.
                    La creación de roles se maneja ahora en AdminRolesListPage. */}
              </div>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-prosalud"></div>
                </div>
              ) : rolesError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error de conexión</AlertTitle>
                  <AlertDescription>
                    No se pudo cargar los roles. Verifique su conexión e intente nuevamente.
                    {rolesError instanceof Error && (
                      <div className="mt-2 text-sm">
                        Detalles: {rolesError.message}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {filteredRoles.map((role) => {
                    const permissionsByModule = getRolePermissionsByModule(role);
                    return (
                      <Collapsible
                        key={role.id}
                        open={expandedRoles.includes(role.id)}
                        onOpenChange={() => toggleRole(role.id)}
                      >
                        <Card className="border-2">
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="bg-primary-prosalud/10 p-2 rounded-lg">
                                    <Shield className="h-5 w-5 text-primary-prosalud" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      <CardTitle className="text-xl">
                                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                      </CardTitle>
                                      <Badge className={getRoleColor(role.name)}>
                                        {role.permissions.length} permisos
                                      </Badge>
                                    </div>
                                    <CardDescription className="mt-1">
                                      {getRoleDescription(role.name)}
                                    </CardDescription>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {canEdit && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditRole(role);
                                      }}
                                      className="gap-2"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                      Editar
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm">
                                    {expandedRoles.includes(role.id) ? (
                                      <ChevronUp className="h-5 w-5" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <div className="border-t pt-4 space-y-4">
                                <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                                  <Key className="h-4 w-4" />
                                  Permisos asignados por módulo:
                                </h4>
                                
                                {Object.keys(permissionsByModule).length === 0 ? (
                                  <p className="text-sm text-gray-500">No hay permisos asignados</p>
                                ) : (
                                  <div className="space-y-4">
                                    {Object.entries(permissionsByModule).map(([module, permissions]) => (
                                      <div key={module} className="border rounded-lg p-3 bg-gray-50">
                                        <div className="flex items-center gap-2 mb-2">
                                          {MODULE_ICONS[module] || <Package className="h-4 w-4" />}
                                          <h5 className="font-semibold text-sm text-gray-800">
                                            {MODULE_LABELS[module] || module}
                                          </h5>
                                          <Badge variant="outline" className="ml-auto text-xs">
                                            {permissions.length}
                                          </Badge>
                                        </div>
                                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-1.5">
                                          {permissions.map((permission) => (
                                            <Badge
                                              key={permission.id}
                                              variant="outline"
                                              className="justify-center py-1 px-2 text-xs bg-white truncate"
                                              title={permission.description || translatePermission(permission.name)}
                                            >
                                              {translatePermissionAction(permission.name)}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog de creación */}
          <Dialog open={creatingRole} onOpenChange={(open) => {
            if (!open) {
              setCreatingRole(false);
              setNewRoleName('');
              setSelectedPermissions([]);
              setPermissionSearchTerm('');
            }
          }}>
            <DialogContent className="max-sm:inset-x-4 sm:w-full sm:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Crear Nuevo Rol
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  Ingresa el nombre del rol y selecciona los permisos que deseas asignar. Los permisos están agrupados por módulo.
                </DialogDescription>
                <Separator />
              </DialogHeader>
              
              {/* Nombre del rol */}
              <div className="space-y-2">
                <Label htmlFor="role-name">Nombre del Rol *</Label>
                <Input
                  id="role-name"
                  placeholder="Ej: Coordinador, Supervisor, etc."
                  value={newRoleName}
                  onChange={(e) => {
                    // Security: Sanitize role name input with spaces allowed
                    const sanitized = sanitizeText(e.target.value, { maxLength: 100, allowSpaces: true });
                    setNewRoleName(sanitized);
                  }}
                  className="w-full"
                />
              </div>
              
              {/* Descripción del rol */}
              <div className="space-y-2">
                <Label htmlFor="role-description">Descripción (opcional)</Label>
                <Input
                  id="role-description"
                  placeholder="Describe el propósito y alcance de este rol..."
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="w-full"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">
                  {newRoleDescription.length}/500 caracteres
                </p>
              </div>
              
              {/* Búsqueda de permisos */}
              {!permissionsLoading && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar permisos..."
                    value={permissionSearchTerm}
                    onChange={(e) => setPermissionSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}
              
              {permissionsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-prosalud"></div>
                </div>
              ) : (
                <ScrollArea className="max-h-[55vh] pr-4">
                  <div className="space-y-3">
                    {Object.keys(filteredPermissionsByModule).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No se encontraron permisos que coincidan con la búsqueda.</p>
                      </div>
                    ) : (
                      Object.entries(filteredPermissionsByModule).map(([module, permissions]) => {
                        const modulePermissionIds = permissions.map(p => p.id);
                        const allSelected = modulePermissionIds.length > 0 && 
                          modulePermissionIds.every(id => selectedPermissions.includes(id));
                        
                        return (
                          <div key={module} className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {MODULE_ICONS[module] || <Package className="h-4 w-4" />}
                                <Label className="font-semibold text-sm cursor-pointer">
                                  {MODULE_LABELS[module] || module}
                                </Label>
                                <Badge variant="outline" className="text-xs">
                                  {permissions.length}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectAllModule(module)}
                                className="text-xs"
                              >
                                {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                              </Button>
                            </div>
                            <Separator className="mb-2" />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                              {permissions.map((permission) => {
                                const isSelected = selectedPermissions.includes(permission.id);
                                return (
                                  <div
                                    key={permission.id}
                                    className="flex items-center space-x-2 p-2 rounded hover:bg-white transition-colors"
                                  >
                                    <Checkbox
                                      id={`create-permission-${permission.id}`}
                                      checked={isSelected}
                                      onCheckedChange={() => handleTogglePermission(permission.id)}
                                    />
                                    <Label
                                      htmlFor={`create-permission-${permission.id}`}
                                      className="text-sm cursor-pointer flex-1"
                                    >
                                      {translatePermissionAction(permission.name)}
                                    </Label>
                                    {isSelected && (
                                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }))
                    }
                  </div>
                </ScrollArea>
              )}
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreatingRole(false);
                    setNewRoleName('');
                    setSelectedPermissions([]);
                    setPermissionSearchTerm('');
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateRole}
                  disabled={createRoleMutation.isPending || !newRoleName.trim()}
                  className="bg-primary-prosalud hover:bg-primary-prosalud-dark"
                >
                  {createRoleMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Crear Rol
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog de edición */}
          <Dialog open={!!editingRole} onOpenChange={(open) => {
            if (!open) {
              setEditingRole(null);
              setSelectedPermissions([]);
              setPermissionSearchTerm('');
            }
          }}>
            <DialogContent className="max-sm:inset-x-4 sm:w-full sm:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Editar Permisos del Rol: {editingRole?.name}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  Selecciona los permisos que deseas asignar a este rol. Los permisos están agrupados por módulo.
                </DialogDescription>
                <Separator />
              </DialogHeader>
              
              {/* Nombre y descripción del rol */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role-name">Nombre del Rol *</Label>
                  <Input
                    id="edit-role-name"
                    placeholder="Ej: Coordinador, Supervisor, etc."
                    value={editRoleName}
                    onChange={(e) => setEditRoleName(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-role-description">Descripción (opcional)</Label>
                  <Input
                    id="edit-role-description"
                    placeholder="Describe el propósito y alcance de este rol..."
                    value={editRoleDescription}
                    onChange={(e) => setEditRoleDescription(e.target.value)}
                    className="w-full"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500">
                    {editRoleDescription.length}/500 caracteres
                  </p>
                </div>
              </div>
              
              {/* Búsqueda de permisos */}
              {!permissionsLoading && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar permisos..."
                    value={permissionSearchTerm}
                    onChange={(e) => setPermissionSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}
              
              {permissionsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-prosalud"></div>
                </div>
              ) : (
                <ScrollArea className="max-h-[55vh] pr-4">
                  <div className="space-y-3">
                    {Object.keys(filteredPermissionsByModule).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No se encontraron permisos que coincidan con la búsqueda.</p>
                      </div>
                    ) : (
                      Object.entries(filteredPermissionsByModule).map(([module, permissions]) => {
                      const modulePermissionIds = permissions.map(p => p.id);
                      const allSelected = modulePermissionIds.length > 0 && 
                        modulePermissionIds.every(id => selectedPermissions.includes(id));
                      const someSelected = modulePermissionIds.some(id => selectedPermissions.includes(id));
                      
                      return (
                        <div key={module} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {MODULE_ICONS[module] || <Package className="h-4 w-4" />}
                              <Label className="font-semibold text-sm cursor-pointer">
                                {MODULE_LABELS[module] || module}
                              </Label>
                              <Badge variant="outline" className="text-xs">
                                {permissions.length}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectAllModule(module)}
                              className="text-xs"
                            >
                              {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                            </Button>
                          </div>
                          <Separator className="mb-2" />
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                            {permissions.map((permission) => {
                              const isSelected = selectedPermissions.includes(permission.id);
                              return (
                                <div
                                  key={permission.id}
                                  className="flex items-center space-x-2 p-2 rounded hover:bg-white transition-colors"
                                >
                                  <Checkbox
                                    id={`permission-${permission.id}`}
                                    checked={isSelected}
                                    onCheckedChange={() => handleTogglePermission(permission.id)}
                                  />
                                    <Label
                                      htmlFor={`permission-${permission.id}`}
                                      className="text-sm cursor-pointer flex-1"
                                    >
                                      {translatePermissionAction(permission.name)}
                                    </Label>
                                  {isSelected && (
                                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }))
                    }
                  </div>
                </ScrollArea>
              )}
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingRole(null);
                    setEditRoleName('');
                    setEditRoleDescription('');
                    setSelectedPermissions([]);
                    setPermissionSearchTerm('');
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveRole}
                  disabled={updateRoleMutation.isPending}
                  className="bg-primary-prosalud hover:bg-primary-prosalud-dark"
                >
                  {updateRoleMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminRolesPage;
