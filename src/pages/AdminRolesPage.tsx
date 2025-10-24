import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Shield, Users, Key, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { rolesApiAdapter } from '@/services/rolesApiAdapter';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

const translatePermission = (permissionName: string): string => {
  const modules: Record<string, string> = {
    'request_forms': 'Formularios de Solicitudes',
    'wellness_events': 'Eventos de Bienestar',
    'comfenalco_events': 'Eventos de Comfenalco',
    'users': 'Usuarios',
    'roles': 'Roles',
    'permissions': 'Permisos'
  };

  const actions: Record<string, string> = {
    'view': 'Ver',
    'create': 'Crear',
    'edit': 'Editar',
    'delete': 'Eliminar'
  };

  const [module, action] = permissionName.split('.');
  const translatedModule = modules[module] || module;
  const translatedAction = actions[action] || action;

  return `${translatedAction} ${translatedModule}`;
};

const AdminRolesPage: React.FC = () => {
  const [expandedRoles, setExpandedRoles] = useState<number[]>([]);

  const { data: roles = [], isLoading, error } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApiAdapter.getRoles,
  });

  const toggleRole = (roleId: number) => {
    setExpandedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
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
              <div className="flex items-center gap-3">
                <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                  <Shield className="h-8 w-8 text-primary-prosalud" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold text-primary-prosalud">
                    Roles y Permisos
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    Visualiza los roles disponibles y sus permisos asociados
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Info Alert */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Información importante</AlertTitle>
            <AlertDescription className="text-blue-800">
              Los roles están protegidos y no pueden ser eliminados. Solo los administradores pueden modificar los permisos de cada rol.
            </AlertDescription>
          </Alert>

          {/* Roles List */}
          <Card className="bg-white border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Roles del Sistema ({roles.length})
              </CardTitle>
              <CardDescription>
                Lista de todos los roles disponibles en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-prosalud"></div>
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error de conexión</AlertTitle>
                  <AlertDescription>
                    No se pudo cargar los roles. Verifique su conexión e intente nuevamente.
                    {error instanceof Error && (
                      <div className="mt-2 text-sm">
                        Detalles: {error.message}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {roles.map((role) => (
                    <Collapsible
                      key={role.id}
                      open={expandedRoles.includes(role.id)}
                      onOpenChange={() => toggleRole(role.id)}
                    >
                      <Card className="border-2">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="bg-primary-prosalud/10 p-2 rounded-lg">
                                  <Shield className="h-5 w-5 text-primary-prosalud" />
                                </div>
                                <div>
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
                              <Button variant="ghost" size="sm">
                                {expandedRoles.includes(role.id) ? (
                                  <ChevronUp className="h-5 w-5" />
                                ) : (
                                  <ChevronDown className="h-5 w-5" />
                                )}
                              </Button>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <div className="border-t pt-4">
                              <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                                <Key className="h-4 w-4" />
                                Permisos asignados:
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {role.permissions.map((permission) => (
                                  <Badge
                                    key={permission.id}
                                    variant="outline"
                                    className="justify-start py-2 px-3 text-xs"
                                  >
                                    {translatePermission(permission.name)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminRolesPage;
