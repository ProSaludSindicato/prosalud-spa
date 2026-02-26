import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Check,
  X,
  Search,
  Key,
  FileText,
  Heart,
  Calendar,
  UserCheck,
  Lock,
  BarChart3,
  MessageSquare,
  Package,
  ShoppingCart,
  Building2,
  Edit,
  Filter,
  ArrowLeft,
  FileSignature,
  ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { rolesApiAdapter } from '@/services/rolesApiAdapter';
import type { Role, Permission, User } from '@/types/admin';

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
  'activos_files': <FileText className="h-4 w-4" />,
  'afiliados_files': <FileText className="h-4 w-4" />,
  'incapacidades_files': <FileText className="h-4 w-4" />,
  'liquidaciones_files': <FileText className="h-4 w-4" />,
  'delegados_files': <FileText className="h-4 w-4" />,
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
    
    // Caso especial para votes.hospital_statistics.view
    if (module === 'votes' && submodule === 'hospital_statistics') {
      return `${translatedAction} ${MODULE_LABELS['hospital_requests'] || 'Solicitudes de Hospital'}`;
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
    
    // Caso especial para votes.hospital_statistics.view
    if (module === 'votes' && submodule === 'hospital_statistics') {
      return ACTION_LABELS[action] || action;
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

const AdminRoleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [permissionSearchTerm, setPermissionSearchTerm] = useState('');
  const [permissionModuleFilter, setPermissionModuleFilter] = useState<string>('all');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [permissionPage, setPermissionPage] = useState(1);
  const modulesPerPage = 3; // Número de módulos completos por página

  const roleId = id ? parseInt(id, 10) : null;

  // Obtener rol
  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => rolesApiAdapter.getRoleById(roleId!),
    enabled: !!roleId,
  });

  // Obtener todos los permisos
  const { data: allPermissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesApiAdapter.getPermissions,
  });

  // Usar usuarios del rol directamente del API (ya viene en la respuesta del rol)
  const usersWithRole = useMemo(() => {
    if (!role || !role.users) return [];
    // Adaptar usuarios del API al formato esperado
    return role.users.map(user => ({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      isActive: true, // El API no devuelve isActive, asumimos true
      createdAt: '',
      updatedAt: '',
    }));
  }, [role]);

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

  // Filtrar permisos por búsqueda y módulo
  const filteredPermissionsByModule = useMemo(() => {
    let filtered: Record<string, Permission[]> = { ...permissionsByModule };
    
    // Filtrar por módulo
    if (permissionModuleFilter !== 'all') {
      const moduleFiltered: Record<string, Permission[]> = {};
      if (filtered[permissionModuleFilter]) {
        moduleFiltered[permissionModuleFilter] = filtered[permissionModuleFilter];
      }
      filtered = moduleFiltered;
    }
    
    // Filtrar por búsqueda
    if (permissionSearchTerm.trim()) {
      const searchLower = permissionSearchTerm.toLowerCase();
      const searchFiltered: Record<string, Permission[]> = {};
      
      Object.entries(filtered).forEach(([module, permissions]) => {
        const matchingPermissions = permissions.filter(permission => 
          translatePermission(permission.name).toLowerCase().includes(searchLower) ||
          translatePermissionAction(permission.name).toLowerCase().includes(searchLower) ||
          permission.name.toLowerCase().includes(searchLower)
        );
        
        if (matchingPermissions.length > 0) {
          searchFiltered[module] = matchingPermissions;
        }
      });
      
      filtered = searchFiltered;
    }
    
    return filtered;
  }, [permissionsByModule, permissionSearchTerm, permissionModuleFilter]);

  // Convertir módulos a array para paginación por grupos completos
  const modulesArray = useMemo(() => {
    return Object.entries(filteredPermissionsByModule).map(([module, permissions]) => ({
      module,
      permissions: permissions.map(permission => ({ permission, module })),
    }));
  }, [filteredPermissionsByModule]);

  // Paginación por módulos completos (no por permisos individuales)
  const paginatedModules = useMemo(() => {
    const start = (permissionPage - 1) * modulesPerPage;
    const end = start + modulesPerPage;
    return modulesArray.slice(start, end);
  }, [modulesArray, permissionPage, modulesPerPage]);

  const totalPermissionPages = Math.ceil(modulesArray.length / modulesPerPage);

  // Aplanar permisos de los módulos paginados para mostrar
  const paginatedPermissions = useMemo(() => {
    const flat: Array<{ permission: Permission; module: string }> = [];
    paginatedModules.forEach(({ permissions }) => {
      flat.push(...permissions);
    });
    return flat;
  }, [paginatedModules]);

  // Filtrar usuarios por búsqueda
  const filteredUsers = useMemo(() => {
    if (!userSearchTerm.trim()) return usersWithRole;
    const searchLower = userSearchTerm.toLowerCase();
    return usersWithRole.filter(user => 
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  }, [usersWithRole, userSearchTerm]);

  // Permisos del rol (IDs)
  const rolePermissionIds = useMemo(() => {
    return new Set(role?.permissions?.map(p => p.id) || []);
  }, [role]);

  const canEdit = can('roles.manage');

  // Agrupar permisos paginados por módulo para mostrar headers (ya están agrupados por módulo completo)
  const groupedPaginatedPermissions = useMemo(() => {
    const grouped: Record<string, Array<{ permission: Permission; module: string }>> = {};
    paginatedModules.forEach(({ module, permissions }) => {
      grouped[module] = permissions;
    });
    return grouped;
  }, [paginatedModules]);

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  // Obtener lista de módulos únicos para el filtro
  const availableModules = useMemo(() => {
    return Object.keys(permissionsByModule).sort();
  }, [permissionsByModule]);

  if (roleLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-prosalud"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!role) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">Rol no encontrado</p>
          <Button onClick={() => navigate('/admin/roles')} className="mt-4">
            Volver a la lista
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate('/admin/roles')}
                      className="h-10 w-10"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                      <Shield className="h-8 w-8 text-primary-prosalud" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-primary-prosalud">
                        {role.name}
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        {role.description || 
                          (role.name === 'admin' 
                            ? 'Acceso completo a todas las funcionalidades del sistema'
                            : role.name === 'user'
                            ? 'Usuario estándar con permisos básicos'
                            : `Rol ${role.name} con permisos específicos`)}
                      </CardDescription>
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      onClick={() => navigate(`/admin/roles/${role.id}/edit`)}
                      className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                    >
                      <Edit className="h-5 w-5 mr-2" />
                      Editar Rol
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Permisos Section */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Permisos del Rol
                </CardTitle>
                <CardDescription>
                  Gestiona los permisos asignados a este rol. {role.permissions?.length || 0} de {allPermissions.length} permisos asignados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar permisos..."
                        value={permissionSearchTerm}
                        onChange={(e) => {
                          setPermissionSearchTerm(e.target.value);
                          setPermissionPage(1); // Reset to first page on search
                        }}
                        className="pl-10"
                      />
                    </div>
                    <div>
                      <Select value={permissionModuleFilter} onValueChange={(value) => {
                        setPermissionModuleFilter(value);
                        setPermissionPage(1); // Reset to first page on filter change
                      }}>
                        <SelectTrigger>
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <SelectValue placeholder="Filtrar por módulo" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los módulos</SelectItem>
                          {availableModules.map((module) => (
                            <SelectItem key={module} value={module}>
                              {MODULE_LABELS[module] || module}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

            {permissionsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-prosalud"></div>
              </div>
            ) : paginatedPermissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Key className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No se encontraron permisos</p>
                <p className="text-sm mt-1">Intenta con otro término de búsqueda</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permiso</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(groupedPaginatedPermissions).map(([module, permissions]) => (
                      <React.Fragment key={module}>
                        {/* Header del módulo */}
                        <TableRow className="bg-slate-200">
                          <TableCell colSpan={4} className="font-semibold py-3">
                            <div className="flex items-center gap-2">
                              {MODULE_ICONS[module] || <Package className="h-4 w-4" />}
                              {MODULE_LABELS[module] || module}
                              <Badge variant="outline" className="ml-2 bg-white">
                                {permissions.length} {permissions.length === 1 ? 'permiso' : 'permisos'}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Permisos del módulo */}
                        {permissions.map(({ permission }) => {
                          const hasPermission = rolePermissionIds.has(permission.id);
                          return (
                            <TableRow key={permission.id}>
                              <TableCell className="font-medium">
                                {translatePermission(permission.name)}
                              </TableCell>
                              <TableCell className="text-gray-600 text-sm">
                                {permission.description || permission.name}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={hasPermission ? "default" : "outline"}>
                                  {hasPermission ? (
                                    <span className="flex items-center gap-1">
                                      <Check className="h-3 w-3" />
                                      Concedido
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <X className="h-3 w-3" />
                                      No concedido
                                    </span>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-sm text-gray-400">Solo lectura</span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>

                {/* Paginación */}
                {totalPermissionPages > 1 && (
                  <div className="mt-4 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPermissionPage(p => Math.max(1, p - 1));
                            }}
                            className={permissionPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPermissionPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setPermissionPage(page);
                              }}
                              isActive={permissionPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPermissionPage(p => Math.min(totalPermissionPages, p + 1));
                            }}
                            className={permissionPage === totalPermissionPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Usuarios Section */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios con este Rol
            </CardTitle>
            <CardDescription>
              Lista de usuarios que tienen asignado este rol. {usersWithRole.length} {usersWithRole.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No hay usuarios con este rol</p>
                <p className="text-sm mt-1">
                  {userSearchTerm ? 'Intenta con otro término de búsqueda' : 'Ningún usuario tiene asignado este rol'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo Electrónico</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-gray-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminRoleDetailPage;
