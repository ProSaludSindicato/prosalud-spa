import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';
import { rolesApiAdapter } from '@/services/rolesApiAdapter';
import { authenticatedApi } from '@/services/api';
import type { Role, Permission } from '@/types/admin';
import {Badge} from "@/components/ui/badge.tsx";

// Etiquetas amigables para los módulos de permisos
const MODULE_LABELS: Record<string, string> = {
  request_forms: 'Formularios de Solicitudes',
  wellness_events: 'Eventos de Bienestar',
  comfenalco_events: 'Eventos de Comfenalco',
  users: 'Usuarios',
  roles: 'Roles',
  permissions: 'Permisos',
  requests: 'Solicitudes',
  votes: 'Votaciones',
  wellness_requests: 'Solicitudes de Bienestar',
  wellness_activity: 'Actividad de Bienestar',
  chatbot: 'Chatbot',
  dotacion: 'Dotación',
  inventory: 'Inventario',
  hospital_requests: 'Solicitudes de Hospital',
  activos_files: 'Archivos de Activos',
  afiliados_files: 'Archivos de Afiliados',
  incapacidades_files: 'Archivos de Incapacidades',
  liquidaciones_files: 'Archivos de Liquidaciones',
  delegados_files: 'Archivos de Delegados',
  assembly: 'Asamblea',
  compensaciones_files: 'Archivos de Compensaciones',
  socio_demographic_surveys: 'Encuestas Sociodemográficas',
  document_signing: 'Firma de Convenios',
  wellness_delivery: 'Entrega de Bienestar',
  view_dashboard: 'Dashboard',
};

const AdminRolesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  // Security: Use centralized sanitization hook
  const { sanitizeText } = useSanitizedInput();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [permissionSearchTerm, setPermissionSearchTerm] = useState('');

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApiAdapter.getRoles,
  });

  const { data: allPermissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesApiAdapter.getPermissions,
    enabled: creatingRole,
  });

  const permissionsByModule = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    allPermissions.forEach(permission => {
      const module = permission.name.split('.')[0] || 'other';
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(permission);
    });
    return grouped;
  }, [allPermissions]);

  const filteredPermissionsByModule = useMemo(() => {
    if (!permissionSearchTerm.trim()) {
      return permissionsByModule;
    }

    const searchLower = permissionSearchTerm.toLowerCase();
    const filtered: Record<string, Permission[]> = {};

    Object.entries(permissionsByModule).forEach(([module, permissions]) => {
      const matchingPermissions = permissions.filter(permission =>
        permission.name.toLowerCase().includes(searchLower) ||
        (permission.description || '').toLowerCase().includes(searchLower)
      );

      if (matchingPermissions.length > 0) {
        filtered[module] = matchingPermissions;
      }
    });

    return filtered;
  }, [permissionsByModule, permissionSearchTerm]);

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
      setSelectedPermissions(prev => prev.filter(id => !modulePermissionIds.includes(id)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...modulePermissionIds])]);
    }
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

  // Filtrar roles por búsqueda
  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return roles;
    const searchLower = searchTerm.toLowerCase();
    return roles.filter(role => 
      role.name.toLowerCase().includes(searchLower)
    );
  }, [roles, searchTerm]);

  // Mutation para eliminar rol
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      // El backend no permite eliminar roles, pero intentamos
      try {
        await authenticatedApi.delete(`/api/roles/${roleId}`);
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Rol eliminado',
        description: 'El rol se ha eliminado correctamente.',
      });
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo eliminar el rol. Los roles no se pueden eliminar si tienen usuarios asignados.',
        variant: 'destructive',
      });
    },
  });

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (roleToDelete) {
      deleteRoleMutation.mutate(roleToDelete.id);
    }
  };

  const canEdit = can('roles.manage');

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
                    <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                      <Shield className="h-8 w-8 text-primary-prosalud" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-primary-prosalud">
                        Roles y Permisos
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        Gestiona los roles y sus permisos del sistema
                      </CardDescription>
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      onClick={() => setCreatingRole(true)}
                      className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Crear Rol
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Search and Filters */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Lista de Roles</CardTitle>
                <CardDescription>
                  {filteredRoles.length} {filteredRoles.length === 1 ? 'rol encontrado' : 'roles encontrados'}
                </CardDescription>
              </CardHeader>
              <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar roles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Table */}
            {rolesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-prosalud"></div>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No se encontraron roles</p>
                <p className="text-sm mt-1">
                  {searchTerm ? 'Intenta con otro término de búsqueda' : 'Crea tu primer rol para comenzar'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre del Rol</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Permisos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role) => (
                    <TableRow
                      key={role.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/admin/roles/${role.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary-prosalud" />
                          {role.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {role.description || 
                          (role.name === 'admin' 
                            ? 'Acceso completo a todas las funcionalidades del sistema'
                            : role.name === 'user'
                            ? 'Usuario estándar con permisos básicos'
                            : `Rol ${role.name} con permisos específicos`)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {role.permissions?.length || 0} {role.permissions?.length === 1 ? 'permiso' : 'permisos'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/roles/${role.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver
                            </DropdownMenuItem>
                            {canEdit && (
                              <>
                                <DropdownMenuItem onClick={() => navigate(`/admin/roles/${role.id}/edit`)}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(role)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar rol?</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer. El rol "{roleToDelete?.name}" será eliminado permanentemente.
                {roleToDelete && roleToDelete.permissions?.length > 0 && (
                  <span className="block mt-2 text-amber-600">
                    Advertencia: Este rol tiene {roleToDelete.permissions.length} permisos asignados.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setRoleToDelete(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteRoleMutation.isPending}
              >
                {deleteRoleMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de creación de rol (nuevo diseño integrado) */}
        <Dialog open={creatingRole} onOpenChange={(open) => {
          if (!open) {
            setCreatingRole(false);
            setNewRoleName('');
            setNewRoleDescription('');
            setSelectedPermissions([]);
            setPermissionSearchTerm('');
          }
        }}>
          <DialogContent className="max-sm:inset-x-4 sm:w-full sm:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto bg-white flex flex-col p-4 sm:p-6">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-xl font-bold text-gray-900">
                Crear Nuevo Rol
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Ingresa el nombre del rol y selecciona los permisos que deseas asignar. Los permisos están agrupados por módulo.
              </DialogDescription>
              <Separator />
            </DialogHeader>

            {/* Contenido scrollable del formulario */}
            <div className="flex-1 overflow-y-auto space-y-4">
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
                <Textarea
                  id="role-description"
                  placeholder="Describe el propósito y alcance de este rol..."
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="w-full resize-none"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500">
                  {newRoleDescription.length}/200 caracteres
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

              {/* Listado de permisos con scroll dentro del contenido */}
              {permissionsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-prosalud"></div>
                </div>
              ) : (
                <div className="space-y-3 border rounded-md p-3 bg-slate-50">
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
                        <div key={module} className="border rounded-lg p-3 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
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
                                  className="flex items-center space-x-2 p-2 rounded hover:bg-slate-50 transition-colors"
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
                                    {permission.description || permission.name}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Footer fijo dentro del modal */}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreatingRole(false);
                  setNewRoleName('');
                  setNewRoleDescription('');
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
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminRolesListPage;

