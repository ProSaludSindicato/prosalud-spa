
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Filter, Edit, UserX, UserCheck, MoreVertical, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/admin/AdminLayout';
import UserFormModal from '@/components/admin/usuarios/UserFormModal';
import UserStatusConfirmationDialog from '@/components/admin/usuarios/UserStatusConfirmationDialog';
import RequestAssignmentManager from '@/components/admin/usuarios/RequestAssignmentManager';
import UserAvatar from '@/components/admin/UserAvatar';
import DataPagination from '@/components/ui/data-pagination';
import { usePagination } from '@/hooks/usePagination';
import { usersApi } from '@/services/adminApi';
import { User } from '@/types/admin';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const AdminUsuariosPage: React.FC = () => {
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowForm(true);
      setSelectedUser(null);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const { data: usersResponse, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(1, 1000, '', ''),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const users = usersResponse?.data || [];
  
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.id.toString().includes(searchTerm) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    paginatedData: paginatedUsers,
    goToPage,
    setItemsPerPage
  } = usePagination({
    data: filteredUsers,
    initialItemsPerPage: 10
  });

  const handleCreate = () => {
    setSelectedUser(null);
    setShowForm(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowForm(true);
  };

  const handleToggleStatus = (user: User) => {
    setSelectedUser(user);
    setShowStatusDialog(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedUser(null);
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
                      <Users className="h-8 w-8 text-primary-prosalud" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-primary-prosalud">
                        Gestión de Usuarios
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        Administra los usuarios del panel administrativo y las asignaciones de solicitudes
                      </CardDescription>
                    </div>
                  </div>
                  {activeTab === 'users' && (
                  <PermissionGuard permissions={['users.create']}>
                    <Button
                      onClick={handleCreate}
                      className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Nuevo Usuario
                    </Button>
                  </PermissionGuard>
                  )}
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Tabs */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white shadow-sm">
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <div className="p-6 pb-0">
                    <TabsList className="grid w-full grid-cols-2 bg-gray-50 border p-1">
                      <TabsTrigger
                        value="users"
                        className="flex items-center space-x-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-all duration-200"
                      >
                        <Users className="h-4 w-4" />
                        <span>Usuarios</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="assignments"
                        className="flex items-center space-x-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-all duration-200"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Asignación de Solicitudes</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-6 pt-0">
                    <TabsContent value="users" className="space-y-6 mt-0">

          {/* Filters */}
          <Card className="bg-white border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filtro de búsqueda: ocupa 2/3 */}
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por ID, nombre o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
            
                {/* Filtro por estado: ocupa 1/3 */}
                <div className="md:col-span-1">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card className="bg-white border shadow-sm">
            <CardHeader>
              <CardTitle>Usuarios ({totalItems})</CardTitle>
              <CardDescription>
                Lista de todos los usuarios registrados en el sistema
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
                    No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.
                    {error instanceof Error && (
                      <div className="mt-2 text-sm">
                        Detalles: {error.message}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {paginatedUsers.map((user) => (
                    <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar>
                          <AvatarFallback className="bg-muted/30 text-foreground">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <h3 className="font-semibold text-text-dark">
                              {user.name}
                            </h3>
                            <Badge variant={user.isActive ? "secondary" : "destructive"}>
                              {user.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                            {(user.role || user.roles?.[0]) && (
                              <Badge variant="outline" className="bg-primary-prosalud/10 text-primary-prosalud border-primary-prosalud/20">
                                {(user.role || user.roles?.[0] || '').charAt(0).toUpperCase() + (user.role || user.roles?.[0] || '').slice(1)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-text-gray text-sm">{user.email}</p>
                          <p className="text-xs text-gray-500">
                            Creado: {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/** Mostrar menú solo si hay al menos una acción permitida */} 
                        {(can('users.edit') || can('users.change_status')) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {can('users.edit') && (
                                <DropdownMenuItem onClick={() => handleEdit(user)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                              )}
                              {can('users.change_status') && (
                                <DropdownMenuItem 
                                  onClick={() => handleToggleStatus(user)}
                                  className={user.isActive ? "text-red-600" : "text-green-600"}
                                >
                                  {user.isActive ? (
                                    <>
                                      <UserX className="h-4 w-4 mr-2" />
                                      Desactivar
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Activar
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <DataPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={goToPage}
                onItemsPerPageChange={setItemsPerPage}
                className="mt-6"
              />
            </CardContent>
          </Card>
                    </TabsContent>

                    <TabsContent value="assignments" className="space-y-6 mt-0">
                      <RequestAssignmentManager />
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>

      {/* Modals */}
      <UserFormModal
        open={showForm}
        onOpenChange={handleCloseForm}
        user={selectedUser}
      />

      <UserStatusConfirmationDialog
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        user={selectedUser}
      />
    </AdminLayout>
  );
};

export default AdminUsuariosPage;
