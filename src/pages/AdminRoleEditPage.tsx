import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  ArrowLeft,
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
  Save,
  Filter,
  FileSignature,
  ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { logger } from '@/utils/logger';
import { rolesApiAdapter } from '@/services/rolesApiAdapter';
import { usersApiAdapter } from '@/services/usersApiAdapter';
import type { Role, Permission, User } from '@/types/admin';

// Mapeo de módulos con iconos (mismo que AdminRoleDetailPage)
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
};

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
    
    if (module === 'votes' && submodule === 'hospital_statistics') {
      return `${translatedAction} ${MODULE_LABELS['hospital_requests'] || 'Solicitudes de Hospital'}`;
    }
    
    return `${translatedAction} ${translatedModule}`;
  }
  
  return permissionName;
};

const translatePermissionAction = (permissionName: string): string => {
  const parts = permissionName.split('.');
  
  if (parts.length === 2) {
    const [module, action] = parts;
    
    // Caso especial: inventory.view_dashboard no debe mostrar "Ver"
    if (module === 'inventory' && action === 'view_dashboard') {
      return 'Dashboard';
    }
    
    if (module.endsWith('_files') && (action === 'view' || action === 'manage')) {
      return 'Cargar archivo';
    }
    return ACTION_LABELS[action] || action;
  } else if (parts.length === 3) {
    const [module, submodule, action] = parts;
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
    if (module.endsWith('_files') && (action === 'view' || action === 'manage')) {
      return 'Cargar archivo';
    }
    return ACTION_LABELS[action] || action;
  }
  const lastPart = parts[parts.length - 1];
  return ACTION_LABELS[lastPart] || lastPart || permissionName;
};

const getModuleFromPermission = (permissionName: string): string => {
  const parts = permissionName.split('.');
  return parts[0] || 'other';
};

const AdminRoleEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can, user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [roleName, setRoleName] = useState('');
  const [permissionSearchTerm, setPermissionSearchTerm] = useState('');
  const [permissionModuleFilter, setPermissionModuleFilter] = useState<string>('all');
  const [permissionPage, setPermissionPage] = useState(1);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const modulesPerPage = 3; // Número de módulos completos por página

  const roleId = id ? parseInt(id, 10) : null;

  // Obtener rol
  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => rolesApiAdapter.getRoleById(roleId!),
    enabled: !!roleId,
  });

  const [roleDescription, setRoleDescription] = useState('');

  // Inicializar nombre, descripción y permisos cuando se carga el rol
  useEffect(() => {
    if (role) {
      setRoleName(role.name);
      setRoleDescription(role.description || '');
      setSelectedPermissions(role.permissions?.map(p => p.id) || []);
    }
  }, [role]);

  // Obtener todos los permisos
  const { data: allPermissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesApiAdapter.getPermissions,
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

  // Agrupar permisos paginados por módulo (ya están agrupados por módulo completo)
  const groupedPaginatedPermissions = useMemo(() => {
    const grouped: Record<string, Array<{ permission: Permission; module: string }>> = {};
    paginatedModules.forEach(({ module, permissions }) => {
      grouped[module] = permissions;
    });
    return grouped;
  }, [paginatedModules]);

  // Obtener lista de módulos únicos para el filtro
  const availableModules = useMemo(() => {
    return Object.keys(permissionsByModule).sort();
  }, [permissionsByModule]);

  // Verificar si hay cambios sin guardar
  const hasUnsavedChanges = useMemo(() => {
    if (!role) return false;
    const nameChanged = roleName.trim() !== role.name;
    const descriptionChanged = roleDescription !== (role.description || '');
    const permissionsChanged = JSON.stringify(selectedPermissions.sort()) !== 
      JSON.stringify((role.permissions?.map(p => p.id) || []).sort());
    return nameChanged || descriptionChanged || permissionsChanged;
  }, [role, roleName, roleDescription, selectedPermissions]);

  // Mutation para actualizar rol
  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, name, description, permissions }: { roleId: number; name: string; description?: string; permissions: number[] }) =>
      rolesApiAdapter.updateRole(roleId, { name, description, permissions }),
    onSuccess: async (updatedRole) => {
      queryClient.invalidateQueries({ queryKey: ['role', roleId] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      
      // Verificar si el rol actualizado es del usuario actual
      const currentUserRoles = user?.roles || [];
      const isCurrentUserRole = currentUserRoles.includes(updatedRole.name);
      
      if (isCurrentUserRole) {
        logger.info('Updated role belongs to current user, refreshing permissions', {
          roleName: updatedRole.name,
          userId: user?.id,
        });
        
        // Refrescar permisos del usuario
        try {
          await refreshUser();
          toast({
            title: 'Rol y permisos actualizados',
            description: 'Tu rol se ha actualizado. Tus permisos han sido refrescados.',
          });
        } catch (error) {
          logger.error('Failed to refresh user permissions', error);
          toast({
            title: 'Rol actualizado',
            description: 'El rol se ha actualizado. Por favor, recarga la página para ver los cambios en tus permisos.',
            variant: 'default',
          });
        }
      } else {
        toast({
          title: 'Rol actualizado',
          description: 'El rol se ha actualizado correctamente.',
        });
      }
      
      navigate(`/admin/roles/${roleId}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo actualizar el rol',
        variant: 'destructive',
      });
    },
  });

  const handleTogglePermission = (permissionId: number) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleToggleModulePermissions = (module: string, permissions: Array<{ permission: Permission; module: string }>) => {
    const modulePermissionIds = permissions.map(({ permission }) => permission.id);
    const allSelected = modulePermissionIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      // Deseleccionar todos los permisos del módulo
      setSelectedPermissions(prev => prev.filter(id => !modulePermissionIds.includes(id)));
    } else {
      // Seleccionar todos los permisos del módulo
      setSelectedPermissions(prev => [...new Set([...prev, ...modulePermissionIds])]);
    }
  };

  const handleSave = () => {
    if (!role || !roleName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del rol es requerido',
        variant: 'destructive',
      });
      return;
    }

    updateRoleMutation.mutate({
      roleId: role.id,
      name: roleName.trim(),
      description: roleDescription.trim() || undefined,
      permissions: selectedPermissions,
    });
  };

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

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

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
                      onClick={() => navigate(`/admin/roles/${role.id}`)}
                      className="h-10 w-10"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                      <Shield className="h-8 w-8 text-primary-prosalud" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-primary-prosalud">
                        Editar Rol: {role.name}
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        Modifica el nombre, descripción y permisos del rol
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={handleSave}
                    disabled={updateRoleMutation.isPending || !roleName.trim()}
                    className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                  >
                    {updateRoleMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-2" />
                        Guardar Cambios
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Información del Rol */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Información del Rol</CardTitle>
                <CardDescription>Modifica el nombre y descripción del rol</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">Nombre del Rol *</Label>
                    <Input
                      id="role-name"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      placeholder="Ej: Coordinador, Supervisor, etc."
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="role-description">Descripción (opcional)</Label>
                    <Textarea
                      id="role-description"
                      value={roleDescription}
                      onChange={(e) => setRoleDescription(e.target.value)}
                      placeholder="Describe el propósito y alcance de este rol..."
                      rows={3}
                      maxLength={200}
                      className="resize-none"
                    />
                    <p className="text-xs text-gray-500">
                      {roleDescription.length}/200 caracteres
                    </p>
                  </div>
                </div>
                {hasUnsavedChanges && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-800 flex items-center gap-2">
                      <span className="font-semibold">⚠️ Tienes cambios sin guardar.</span>
                      <span>No olvides hacer clic en "Guardar Cambios" para aplicar las modificaciones.</span>
                    </p>
                  </div>
                )}
              </CardContent>
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
              Selecciona los permisos que deseas asignar a este rol. {selectedPermissions.length} de {allPermissions.length} permisos seleccionados.
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
            ) : Object.keys(groupedPaginatedPermissions).length === 0 ? (
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
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {MODULE_ICONS[module] || <Package className="h-4 w-4" />}
                                {MODULE_LABELS[module] || module}
                                <Badge variant="outline" className="ml-2 bg-white">
                                  {permissions.length} {permissions.length === 1 ? 'permiso' : 'permisos'}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleModulePermissions(module, permissions)}
                                className="text-xs h-7 px-2"
                              >
                                {permissions.every(({ permission }) => selectedPermissions.includes(permission.id))
                                  ? 'Desactivar todos'
                                  : 'Activar todos'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Permisos del módulo */}
                        {permissions.map(({ permission }) => {
                          const hasPermission = selectedPermissions.includes(permission.id);
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
                                      Seleccionado
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <X className="h-3 w-3" />
                                      No seleccionado
                                    </span>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Switch
                                  checked={hasPermission}
                                  onCheckedChange={() => handleTogglePermission(permission.id)}
                                  className="data-[state=checked]:!bg-accent"
                                />
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
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminRoleEditPage;

