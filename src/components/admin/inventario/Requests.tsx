
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Search, Hospital, Clock, AlertTriangle, Plus, Eye, CheckCircle, XCircle, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import DataPagination from '@/components/ui/data-pagination';
import { usePagination } from '@/hooks/usePagination';
import NewRequestForm from './NewRequestForm';
import AdminModal from '../common/AdminModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface Request {
  id: string;
  hospitalName: string;
  coordinatorName: string;
  requestDate: string;
  totalItems: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'preparing' | 'shipped' | 'delivered' | 'rejected';
  items: Array<{
    productName: string;
    quantity: number;
  }>;
}

const Requests: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [requests, setRequests] = useState<Request[]>([
    {
      id: '1',
      hospitalName: 'Hospital Marco Fidel Suárez',
      coordinatorName: 'María González',
      requestDate: '2024-01-18',
      totalItems: 25,
      priority: 'high',
      status: 'pending',
      items: [
        { productName: 'Uniforme Azul - Talla M', quantity: 15 },
        { productName: 'Bata Blanca - Talla L', quantity: 10 }
      ]
    },
    {
      id: '2',
      hospitalName: 'Hospital San Juan de Dios',
      coordinatorName: 'Carlos Pérez',
      requestDate: '2024-01-17',
      totalItems: 50,
      priority: 'medium',
      status: 'approved',
      items: [
        { productName: 'Tapabocas N95', quantity: 50 }
      ]
    },
    {
      id: '3',
      hospitalName: 'Hospital La Merced',
      coordinatorName: 'Ana Martínez',
      requestDate: '2024-01-16',
      totalItems: 8,
      priority: 'low',
      status: 'delivered',
      items: [
        { productName: 'Kit de Bienvenida', quantity: 8 }
      ]
    }
  ]);
  
  const { toast } = useToast();

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.hospitalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.coordinatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    paginatedData,
    goToPage,
    setItemsPerPage
  } = usePagination({
    data: filteredRequests,
    initialItemsPerPage: 10
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-blue-100 text-blue-700';
      case 'preparing': return 'bg-purple-100 text-purple-700';
      case 'shipped': return 'bg-orange-100 text-orange-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'approved': return 'Aprobado';
      case 'preparing': return 'Preparando';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregado';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  const handleViewRequest = (request: Request) => {
    setSelectedRequest(request);
  };

  const handleApproveRequest = (request: Request) => {
    setRequests(prevRequests => 
      prevRequests.map(r => 
        r.id === request.id 
          ? { ...r, status: 'approved' as const }
          : r
      )
    );
    
    toast({
      title: "Solicitud Aprobada",
      description: `La solicitud #${request.id} del ${request.hospitalName} ha sido aprobada exitosamente`,
      variant: "default"
    });
  };

  const handleRejectRequest = (request: Request) => {
    setRequests(prevRequests => 
      prevRequests.map(r => 
        r.id === request.id 
          ? { ...r, status: 'rejected' as const }
          : r
      )
    );
    
    toast({
      title: "Solicitud Rechazada",
      description: `La solicitud #${request.id} ha sido rechazada`,
      variant: "destructive"
    });
  };

  const handleNewRequestSuccess = () => {
    setShowNewRequestForm(false);
    toast({
      title: "Solicitud Creada",
      description: "La nueva solicitud ha sido creada exitosamente",
      variant: "default"
    });
  };

  const renderRequestActions = () => {
    if (!selectedRequest || selectedRequest.status !== 'pending') return null;
    
    return (
      <>
        <Button 
          onClick={() => handleApproveRequest(selectedRequest)}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Aprobar
        </Button>
        <Button 
          onClick={() => handleRejectRequest(selectedRequest)}
          variant="destructive"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Rechazar
        </Button>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Solicitudes de Implementos</h2>
          <p className="text-gray-600">Gestiona las solicitudes de los hospitales</p>
        </div>
        <Button 
          className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
          onClick={() => setShowNewRequestForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Solicitud
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar solicitudes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="preparing">Preparando</SelectItem>
                  <SelectItem value="shipped">Enviado</SelectItem>
                  <SelectItem value="delivered">Entregado</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las prioridades</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Requests Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ClipboardList className="h-5 w-5" />
              <span>Solicitudes ({totalItems})</span>
            </CardTitle>
            <CardDescription>
              Lista de solicitudes de implementos de los hospitales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>ID</TableHead>
                    <TableHead>Hospital</TableHead>
                    <TableHead>Coordinador</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((request) => (
                    <TableRow key={request.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <span className="font-mono text-sm">#{request.id}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Hospital className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{request.hospitalName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">{request.coordinatorName}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{new Date(request.requestDate).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{request.totalItems}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority === 'urgent' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {getPriorityLabel(request.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(request.status)}>
                          {getStatusLabel(request.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleViewRequest(request)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalles
                              </DropdownMenuItem>
                              {request.status === 'pending' && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleApproveRequest(request)}
                                    className="text-green-600 focus:text-green-600"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Aprobar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleRejectRequest(request)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Rechazar
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DataPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={goToPage}
              onItemsPerPageChange={setItemsPerPage}
              className="mt-4"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* New Request Form Modal - Using standardized AdminModal */}
      <AdminModal
        open={showNewRequestForm}
        onOpenChange={setShowNewRequestForm}
        title="Nueva Solicitud de Implementos"
        description="Crear una nueva solicitud para el hospital"
        size="4xl"
      >
        <NewRequestForm 
          onClose={() => setShowNewRequestForm(false)} 
          onSuccess={handleNewRequestSuccess}
        />
      </AdminModal>

      {/* Request Details Modal - Using standardized AdminModal */}
      <AdminModal
        open={!!selectedRequest}
        onOpenChange={() => setSelectedRequest(null)}
        title={`Detalles de Solicitud #${selectedRequest?.id}`}
        description="Información detallada de la solicitud"
        size="2xl"
        actions={renderRequestActions()}
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Hospital</label>
                <p className="text-gray-900">{selectedRequest.hospitalName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Coordinador</label>
                <p className="text-gray-900">{selectedRequest.coordinatorName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha de Solicitud</label>
                <p className="text-gray-900">{new Date(selectedRequest.requestDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Estado</label>
                <Badge className={getStatusColor(selectedRequest.status)}>
                  {getStatusLabel(selectedRequest.status)}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Prioridad</label>
                <Badge className={getPriorityColor(selectedRequest.priority)}>
                  {selectedRequest.priority === 'urgent' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {getPriorityLabel(selectedRequest.priority)}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Total de Items</label>
                <p className="text-gray-900 font-medium">{selectedRequest.totalItems}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Productos Solicitados</label>
              <div className="mt-2 space-y-2">
                {selectedRequest.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                      Cantidad: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
};

export default Requests;
