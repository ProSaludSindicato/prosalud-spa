import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExportRequestsDialog from "@/components/admin/solicitudes/ExportRequestsDialog";
import {
  FileText,
  Download,
  Filter,
  Search,
  User,
  Eye,
  MoreHorizontal,
  Clock,
  CheckCircle,
  TrendingUp,
  Users,
  Brush,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import DataPagination from "@/components/ui/data-pagination";
import { usePagination } from "@/hooks/usePagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import JsonView from "@uiw/react-json-view";
import { requestsService } from "@/services/requestsServiceApi";
import { Request } from "@/types/requests";
import { useMemo } from "react";
import { TableLoadingSkeleton } from "@/components/ui/loading-skeleton";

const AdminSolicitudesPage: React.FC = () => {
  const [selectedSolicitud, setSelectedSolicitud] = useState<Request | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { toast } = useToast();

  // Fetch all requests from API
  const {
    data: allSolicitudes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-solicitudes"],
    queryFn: requestsService.getRequests,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter and sort requests locally for better performance
  const filteredSolicitudes = useMemo(() => {
    let filtered = [...allSolicitudes];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (request) =>
          request.name.toLowerCase().includes(searchLower) ||
          request.last_name.toLowerCase().includes(searchLower) ||
          request.email.toLowerCase().includes(searchLower) ||
          request.id_number.toLowerCase().includes(searchLower) ||
          getRequestTypeLabel(request.request_type).toLowerCase().includes(searchLower),
      );
    }

    // Apply status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter((request) => request.status === selectedStatus);
    }

    // Apply type filter
    if (selectedType !== "all") {
      filtered = filtered.filter((request) => request.request_type === selectedType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "name") {
        const nameA = `${a.name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.name} ${b.last_name}`.toLowerCase();
        return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      } else {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
    });

    return filtered;
  }, [allSolicitudes, searchTerm, selectedStatus, selectedType, sortBy, sortOrder]);

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["admin-solicitudes-stats"],
    queryFn: requestsService.getRequestStats,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  const handleViewDetails = (solicitud: Request) => {
    console.log("Ver detalles de solicitud:", solicitud);
    setSelectedSolicitud(solicitud);
  };

  const handleChangeStatus = async (id: string, newStatus: Request["status"]) => {
    try {
      const updatedRequest = await requestsService.updateRequestStatus(id, newStatus);

      const statusLabels = {
        in_progress: "Marcada en Revisión",
        resolved: "Marcada como Completada",
        rejected: "Rechazada",
      };

      toast({
        title: `Solicitud ${statusLabels[newStatus]}`,
        description: `La solicitud #${id} ha sido ${statusLabels[newStatus].toLowerCase()} exitosamente.`,
      });

      // Update selected request if it's being viewed
      if (selectedSolicitud?.id === id) {
        setSelectedSolicitud(updatedRequest);
      }

      refetch();
    } catch (error) {
      console.error("Error updating request status:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el estado de la solicitud",
        variant: "destructive",
      });
    }
  };

  const { currentPage, itemsPerPage, totalPages, totalItems, paginatedData, goToPage, setItemsPerPage } = usePagination(
    {
      data: filteredSolicitudes,
      initialItemsPerPage: 10,
    },
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "in_progress":
        return "bg-blue-100 text-blue-700";
      case "resolved":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "in_progress":
        return "En Revisión";
      case "resolved":
        return "Completado";
      case "rejected":
        return "Rechazado";
      default:
        return status;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "certificado-convenio": "Certificado de Convenio",
      "compensacion-anual": "Compensación Anual Diferida",
      "verificacion-pagos": "Verificación de Pagos",
      "compensacion-descanso": "Compensación por Descanso",
      "actualizar-cuenta": "Actualizar Cuenta Bancaria",
      "retiro-sindical": "Retiro Sindical",
      microcredito: "Microcrédito CEII",
      "incapacidad-maternidad": "Incapacidad de Maternidad",
      "permisos-turnos": "Permisos y Turnos",
    };
    return labels[type] || type;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
    setSelectedType("all");
  };

  const toggleSort = (column: "name" | "date") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                      <FileText className="h-8 w-8 text-primary-prosalud" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-primary-prosalud">Gestión de Solicitudes</CardTitle>
                      <CardDescription className="text-base mt-2">
                        Administra y procesa las solicitudes de los usuarios de ProSalud
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                    onClick={() => setExportDialogOpen(true)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-blue-500 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Solicitudes</p>
                      <p className="text-3xl font-bold text-blue-600">{stats?.total || 0}</p>
                    </div>
                    <div className="p-3 rounded-full">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Pendientes</p>
                      <p className="text-3xl font-bold text-yellow-600">{stats?.pending || 0}</p>
                    </div>
                    <div className="p-3 rounded-full">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Resueltas</p>
                      <p className="text-3xl font-bold text-green-600">{stats?.resolved || 0}</p>
                    </div>
                    <div className="p-3 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Este Mes</p>
                      <p className="text-3xl font-bold text-purple-600">{stats?.this_month || 0}</p>
                    </div>
                    <div className="rounded-full">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Filter className="h-5 w-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="Buscar por nombre, email o tipo de solicitud..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="in_progress">En Revisión</SelectItem>
                        <SelectItem value="resolved">Completado</SelectItem>
                        <SelectItem value="rejected">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Todos los tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        <SelectItem value="certificado-convenio">Certificado de Convenio</SelectItem>
                        <SelectItem value="compensacion-anual">Compensación Anual</SelectItem>
                        <SelectItem value="verificacion-pagos">Verificación de Pagos</SelectItem>
                        <SelectItem value="compensacion-descanso">Compensación por Descanso</SelectItem>
                        <SelectItem value="actualizar-cuenta">Actualizar Cuenta</SelectItem>
                        <SelectItem value="retiro-sindical">Retiro Sindical</SelectItem>
                        <SelectItem value="microcredito">Microcrédito</SelectItem>
                        <SelectItem value="incapacidad-maternidad">Incapacidad Maternidad</SelectItem>
                        <SelectItem value="permisos-turnos">Permisos y Turnos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Button variant="outline" onClick={clearFilters} className="h-10 w-full flex items-center gap-2">
                      <Brush className="w-4 h-4" />
                      Limpiar Filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Requests Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">Solicitudes ({totalItems})</CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  Lista completa de solicitudes realizadas por los afiliados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <TableLoadingSkeleton />
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error de conexión</AlertTitle>
                    <AlertDescription>
                      No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.
                      {error instanceof Error && <div className="mt-2 text-sm">Detalles: {error.message}</div>}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="w-1/4">
                              <Button
                                variant="ghost"
                                onClick={() => toggleSort("name")}
                                className="flex items-center gap-2"
                              >
                                Solicitante
                                {sortBy === "name" ? (
                                  sortOrder === "asc" ? (
                                    <ArrowUp className="h-4 w-4" />
                                  ) : (
                                    <ArrowDown className="h-4 w-4" />
                                  )
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 opacity-50" />
                                )}
                              </Button>
                            </TableHead>
                            <TableHead className="w-1/5">Tipo</TableHead>
                            <TableHead className="w-1/6">Estado</TableHead>
                            <TableHead className="w-1/6">
                              <Button
                                variant="ghost"
                                onClick={() => toggleSort("date")}
                                className="flex items-center gap-2"
                              >
                                Fecha
                                {sortBy === "date" ? (
                                  sortOrder === "asc" ? (
                                    <ArrowUp className="h-4 w-4" />
                                  ) : (
                                    <ArrowDown className="h-4 w-4" />
                                  )
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 opacity-50" />
                                )}
                              </Button>
                            </TableHead>
                            <TableHead className="w-16">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedData.map((solicitud) => (
                            <TableRow key={solicitud.id} className="hover:bg-gray-50 transition-colors">
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <div className="bg-gray-100 p-2 rounded-full">
                                    <User className="h-4 w-4 text-gray-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {solicitud.name} {solicitud.last_name}
                                    </p>
                                    <p className="text-sm text-gray-600">{solicitud.email}</p>
                                    <p className="text-xs text-gray-500">
                                      {solicitud.id_type}: {solicitud.id_number}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {getRequestTypeLabel(solicitud.request_type)}
                                  </p>
                                  <p className="text-sm text-gray-500">ID: {solicitud.id}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(solicitud.status)}>
                                  {getStatusLabel(solicitud.status)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm text-gray-900">
                                    {new Date(solicitud.created_at).toLocaleDateString("es-ES", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(solicitud.created_at).toLocaleTimeString("es-ES", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  {solicitud.status === "resolved" && solicitud.resolved_at && (
                                    <p className="text-xs text-green-600 font-medium mt-1">
                                      ✓ Resuelto:{" "}
                                      {new Date(solicitud.resolved_at).toLocaleDateString("es-ES", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                      ,{" "}
                                      {new Date(solicitud.resolved_at).toLocaleTimeString("es-ES", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => handleViewDetails(solicitud)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver Detalles
                                    </DropdownMenuItem>
                                    {solicitud.status === "pending" && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => handleChangeStatus(solicitud.id, "in_progress")}
                                        >
                                          <div className="h-4 w-4 mr-2 bg-blue-600 rounded-full"></div>
                                          Marcar en Revisión
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleChangeStatus(solicitud.id, "resolved")}>
                                          <div className="h-4 w-4 mr-2 bg-green-600 rounded-full"></div>
                                          Marcar como Completado
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleChangeStatus(solicitud.id, "rejected")}
                                          className="text-red-600 focus:text-red-600"
                                        >
                                          <div className="h-4 w-4 mr-2 bg-red-600 rounded-full"></div>
                                          Rechazar
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {solicitud.status === "in_progress" && (
                                      <DropdownMenuItem onClick={() => handleChangeStatus(solicitud.id, "resolved")}>
                                        <div className="h-4 w-4 mr-2 bg-green-600 rounded-full"></div>
                                        Marcar como Completado
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Export Dialog */}
          <ExportRequestsDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />

          {/* Request Details Dialog */}
          {selectedSolicitud && (
            <Dialog open={!!selectedSolicitud} onOpenChange={() => setSelectedSolicitud(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
                <div className="bg-white min-h-full">
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary-prosalud/10 p-2 rounded-lg">
                        <FileText className="h-6 w-6 text-primary-prosalud" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Detalles de Solicitud #{selectedSolicitud.id}
                        </h2>
                        <p className="text-sm text-gray-600">Información completa de la solicitud</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Información del Solicitante */}
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="bg-gray-50 border-b border-gray-200">
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          Información del Solicitante
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Documento</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <p className="text-gray-900">
                                {selectedSolicitud.id_type}: {selectedSolicitud.id_number}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Nombres</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <p className="text-gray-900">
                                {selectedSolicitud.name && selectedSolicitud.last_name
                                  ? `${selectedSolicitud.name} ${selectedSolicitud.last_name}`.trim()
                                  : selectedSolicitud.name || selectedSolicitud.last_name || "No especificado"}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Correo Electrónico</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <p className="text-gray-900">{selectedSolicitud.email || "No especificado"}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Teléfono</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <p className="text-gray-900">{selectedSolicitud.phone_number || "No especificado"}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Información de la Solicitud */}
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="bg-gray-50 border-b border-gray-200">
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          Información de la Solicitud
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Tipo de Solicitud</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <p className="text-gray-900">{getRequestTypeLabel(selectedSolicitud.request_type)}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Estado Actual</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <Badge className={getStatusColor(selectedSolicitud.status)}>
                                {getStatusLabel(selectedSolicitud.status)}
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Fecha de Creación</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <p className="text-gray-900">
                                {new Date(selectedSolicitud.created_at).toLocaleDateString("es-ES", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                })}{" "}
                                a las{" "}
                                {new Date(selectedSolicitud.created_at).toLocaleTimeString("es-ES", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">ID de Solicitud</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <p className="text-gray-900">#{selectedSolicitud.id}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Detalles Específicos */}
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="bg-gray-50 border-b border-gray-200">
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          Detalles Específicos de la Solicitud
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          {selectedSolicitud.payload &&
                          typeof selectedSolicitud.payload === "object" &&
                          Object.keys(selectedSolicitud.payload).length > 0 ? (
                            <div className="space-y-4">
                              {Object.entries(selectedSolicitud.payload).map(([key, value]) => (
                                <div
                                  key={key}
                                  className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center py-2 border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="md:col-span-1">
                                    <label className="text-sm font-medium text-gray-700 capitalize">
                                      {key.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                    </label>
                                  </div>
                                  <div className="md:col-span-2">
                                    <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                                      <p className="text-gray-900 text-sm">
                                        {value !== null && value !== undefined
                                          ? typeof value === "object"
                                            ? JSON.stringify(value, null, 2)
                                            : String(value)
                                          : "No especificado"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-500 text-sm text-center py-8">
                              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                              <p>No hay detalles adicionales disponibles</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Acciones */}
                    {selectedSolicitud.status === "pending" && (
                      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <Button
                          variant="outline"
                          onClick={() => handleChangeStatus(selectedSolicitud.id, "rejected")}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Rechazar
                        </Button>
                        <Button
                          onClick={() => handleChangeStatus(selectedSolicitud.id, "resolved")}
                          className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                        >
                          Resolver
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminSolicitudesPage;
