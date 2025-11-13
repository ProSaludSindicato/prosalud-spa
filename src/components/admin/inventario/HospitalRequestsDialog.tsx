
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Hospital, 
  Search, 
  Calendar, 
  Package, 
  AlertTriangle, 
  Eye,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Clock,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import DataPagination from '@/components/ui/data-pagination';
import { usePagination } from '@/hooks/usePagination';
import { useToast } from '@/hooks/use-toast';

interface HospitalRequest {
  id: string;
  hospitalName: string;
  coordinatorName: string;
  requestDate: string;
  totalItems: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'preparing' | 'delivered' | 'rejected';
  items: Array<{
    productName: string;
    quantity: number;
  }>;
}

interface HospitalRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HospitalRequestsDialog: React.FC<HospitalRequestsDialogProps> = ({ open, onOpenChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<HospitalRequest | null>(null);
  const [requests, setRequests] = useState<HospitalRequest[]>([
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
    }
  ]);

  const { toast } = useToast();

  const filteredRequests = requests.filter(request =>
    request.hospitalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.coordinatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      case 'delivered': return 'bg-cyan-100 text-cyan-800';
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

  const handleViewRequest = (request: HospitalRequest) => {
    setSelectedRequest(request);
  };

  const handleApproveRequest = (request: HospitalRequest) => {
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

  const handleRejectRequest = (request: HospitalRequest) => {
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

  const handlePrepareRequest = (request: HospitalRequest) => {
    setRequests(prevRequests => 
      prevRequests.map(r => 
        r.id === request.id 
          ? { ...r, status: 'preparing' as const }
          : r
      )
    );
    
    toast({
      title: "Solicitud en Preparación",
      description: `La solicitud #${request.id} está siendo preparada`,
      variant: "default"
    });
  };

  return (
    <>
      <Dialog open={open && !selectedRequest} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary-prosalud">
              Gestión de Solicitudes de Hospitales
            </DialogTitle>
            <DialogDescription>
              Administra las solicitudes de implementos de los hospitales afiliados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar solicitudes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50"
              />
            </div>

            {/* Requests Table */}
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
                          <Calendar className="h-4 w-4 text-gray-400" />
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
                          <DropdownMenu>
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
                              {request.status === 'approved' && (
                                <DropdownMenuItem 
                                  onClick={() => handlePrepareRequest(request)}
                                  className="text-blue-600 focus:text-blue-600"
                                >
                                  <Clock className="h-4 w-4 mr-2" />
                                  Preparar
                                </DropdownMenuItem>
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
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Details Dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <div className="bg-white min-h-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary-prosalud/10 p-2 rounded-lg">
                    <Hospital className="h-6 w-6 text-primary-prosalud" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Detalles de Solicitud #{selectedRequest.id}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Información detallada de la solicitud
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRequest(null)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Hospital</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded border">{selectedRequest.hospitalName}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Coordinador</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded border">{selectedRequest.coordinatorName}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Fecha de Solicitud</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded border">{new Date(selectedRequest.requestDate).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Estado</label>
                    <div className="bg-gray-50 p-3 rounded border">
                      <Badge className={getStatusColor(selectedRequest.status)}>
                        {getStatusLabel(selectedRequest.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Prioridad</label>
                    <div className="bg-gray-50 p-3 rounded border">
                      <Badge className={getPriorityColor(selectedRequest.priority)}>
                        {selectedRequest.priority === 'urgent' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {getPriorityLabel(selectedRequest.priority)}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Total de Items</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded border font-medium">{selectedRequest.totalItems}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Productos Solicitados</label>
                  <div className="space-y-2">
                    {selectedRequest.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                          Cantidad: {item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                    Cerrar
                  </Button>
                  {selectedRequest.status === 'pending' && (
                    <>
                      <Button 
                        onClick={() => {
                          handleRejectRequest(selectedRequest);
                          setSelectedRequest(null);
                        }}
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rechazar
                      </Button>
                      <Button 
                        onClick={() => {
                          handleApproveRequest(selectedRequest);
                          setSelectedRequest(null);
                        }}
                        className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprobar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default HospitalRequestsDialog;
