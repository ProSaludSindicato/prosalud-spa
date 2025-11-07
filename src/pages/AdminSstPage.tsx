import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Search, Loader2, RefreshCw, Filter, ChevronLeft, ChevronRight, CheckCircle2, Users } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AffiliateDeliveryPanel } from '@/components/admin/sst/AffiliateDeliveryPanel';
import { DeliveryConfirmationModal } from '@/components/admin/sst/DeliveryConfirmationModal';
import { useToast } from '@/components/ui/use-toast';
import {
  SstAffiliate,
  SstDeliveryRecord,
  SstDocumentType,
  SstInventoryItem,
} from '@/types/adminSst';
import { sstAdminService } from '@/services/sstAdminService';

interface DocumentTypeOption {
  value: SstDocumentType;
  label: string;
}

const documentTypeOptions: DocumentTypeOption[] = [
  { value: 'CC', label: 'Cédula de ciudadanía (CC)' },
  { value: 'CE', label: 'Cédula de extranjería (CE)' },
  { value: 'PT', label: 'Permiso por Protección Temporal (PT)' },
];

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
    transition: { type: 'spring', stiffness: 100 },
  },
};

const AdminSstPage: React.FC = () => {
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState<SstAffiliate[]>([]);
  const [inventory, setInventory] = useState<SstInventoryItem[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<SstDeliveryRecord[]>([]);

  const [selectedAffiliate, setSelectedAffiliate] = useState<SstAffiliate | null>(null);

  const [documentType, setDocumentType] = useState<SstDocumentType>('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoadingAffiliates, setIsLoadingAffiliates] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSearchingAffiliate, setIsSearchingAffiliate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<SstDeliveryRecord | null>(null);
  const [lastConfirmedRecordId, setLastConfirmedRecordId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<
    | {
        type: 'success' | 'error';
        title: string;
        description: string;
      }
    | null
  >(null);
  const [showAffiliateList, setShowAffiliateList] = useState(true);

  const deliveryPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!feedbackBanner) return;
    const timeout = setTimeout(() => setFeedbackBanner(null), 6000);
    return () => clearTimeout(timeout);
  }, [feedbackBanner]);

  const showFeedbackBanner = useCallback(
    (type: 'success' | 'error', title: string, description: string) => {
      setFeedbackBanner({ type, title, description });
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const fetchAffiliates = async () => {
      try {
        setIsLoadingAffiliates(true);
        const response = await sstAdminService.getAffiliates();
        if (isMounted) {
          setAffiliates(response);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setErrorMessage('No fue posible cargar la lista de afiliados activos.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingAffiliates(false);
        }
      }
    };

    fetchAffiliates();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchInventory = async () => {
      try {
        setIsLoadingInventory(true);
        const data = await sstAdminService.getInventory();
        if (isMounted) {
          setInventory(data);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setErrorMessage('No fue posible cargar la información de inventario.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingInventory(false);
        }
      }
    };

    fetchInventory();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedAffiliate) {
      setDeliveryHistory([]);
      return;
    }

    let isMounted = true;

    const fetchHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const records = await sstAdminService.getDeliveryHistory(selectedAffiliate.id);
        if (isMounted) {
          setDeliveryHistory(records);
        }
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error al obtener el historial',
          description: 'No fue posible cargar el historial de entregas para el afiliado.',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [selectedAffiliate]);

  const hospitalOptions = useMemo(() => {
    const hospitals = Array.from(new Set(affiliates.map((affiliate) => affiliate.hospital))).sort();
    return hospitals;
  }, [affiliates]);

  const filteredAffiliates = useMemo(() => {
    const term = listSearchTerm.trim().toLowerCase();

    return affiliates
      .filter((affiliate) => {
        const matchesSearch =
          term.length === 0 ||
          `${affiliate.firstName} ${affiliate.lastName}`.toLowerCase().includes(term) ||
          affiliate.documentNumber.toLowerCase().includes(term) ||
          affiliate.hospital.toLowerCase().includes(term) ||
          affiliate.role.toLowerCase().includes(term);

        const matchesHospital =
          hospitalFilter === 'all' ||
          affiliate.hospital.toLowerCase() === hospitalFilter.toLowerCase();

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && affiliate.active) ||
          (statusFilter === 'inactive' && !affiliate.active);

        return matchesSearch && matchesHospital && matchesStatus;
      })
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [affiliates, listSearchTerm, hospitalFilter, statusFilter]);

  const totalItems = filteredAffiliates.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedAffiliates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAffiliates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAffiliates, currentPage, itemsPerPage]);


  const handleSelectAffiliate = (affiliate: SstAffiliate) => {
    setSelectedAffiliate(affiliate);
    setDocumentType(affiliate.documentType);
    setDocumentNumber(affiliate.documentNumber);
    setShowAffiliateList(false);

    // Scroll to delivery panel
    setTimeout(() => {
      deliveryPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSearchAffiliate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedDocument = documentNumber.trim();

    if (!trimmedDocument) {
      showFeedbackBanner('error', 'Documento requerido', 'Ingresa el número de documento para realizar la búsqueda.');
      toast({
        title: 'Documento requerido',
        description: 'Ingresa el número de documento para realizar la búsqueda.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    setIsSearchingAffiliate(true);
    try {
      const affiliate = await sstAdminService.getAffiliateByDocument(documentType, trimmedDocument);
      if (!affiliate) {
        showFeedbackBanner(
          'error',
          'Afiliado no encontrado',
          'No se encontró un afiliado activo con los datos proporcionados.',
        );
        toast({
          title: 'Afiliado no encontrado',
          description: 'No se encontró un afiliado activo con los datos proporcionados.',
          variant: 'destructive',
          duration: 5000,
        });
        setSelectedAffiliate(null);
        setShowAffiliateList(true);
        return;
      }

      handleSelectAffiliate(affiliate);
      showFeedbackBanner(
        'success',
        'Afiliado encontrado',
        `Se cargó la información de ${affiliate.firstName} ${affiliate.lastName}.`,
      );
      toast({
        title: 'Afiliado encontrado',
        description: `Se cargó la información de ${affiliate.firstName} ${affiliate.lastName}.`,
        variant: 'success',
        duration: 5000,
      });
    } catch (error) {
      console.error(error);
      showFeedbackBanner('error', 'Error de búsqueda', 'No fue posible buscar el afiliado. Intenta nuevamente.');
      toast({
        title: 'Error de búsqueda',
        description: 'No fue posible buscar el afiliado. Intenta nuevamente.',
        variant: 'destructive',
        duration: 5000,
      });
      setShowAffiliateList(true);
    } finally {
      setIsSearchingAffiliate(false);
    }
  };

  const handleResetSelection = () => {
    setSelectedAffiliate(null);
    setDocumentNumber('');
    setShowAffiliateList(true);
  };

  const handleOpenConfirmationModal = (record: SstDeliveryRecord) => {
    setPendingRecord(record);
    setConfirmationModalOpen(true);
    setLastConfirmedRecordId(null);
  };

  const handleConfirmDelivery = async (record: SstDeliveryRecord) => {
    try {
      await sstAdminService.registerDelivery(record);
      
      setDeliveryHistory((prev) => [record, ...prev]);
      setAffiliates((prev) =>
        prev.map((affiliate) =>
          affiliate.id === record.affiliateId
            ? {
                ...affiliate,
                lastDeliveryAt: record.deliveredAt,
              }
            : affiliate,
        ),
      );

      setSelectedAffiliate((prev) =>
        prev && prev.id === record.affiliateId
          ? {
              ...prev,
              lastDeliveryAt: record.deliveredAt,
            }
          : prev,
      );

      setLastConfirmedRecordId(record.id);
      setPendingRecord(null);
      setConfirmationModalOpen(false);

      const affiliateData =
        affiliates.find((affiliate) => affiliate.id === record.affiliateId) || selectedAffiliate;

      showFeedbackBanner(
        'success',
        'Entrega registrada',
        affiliateData
          ? `Se registró la entrega para ${affiliateData.firstName} ${affiliateData.lastName}.`
          : 'La entrega fue registrada correctamente.',
      );
      toast({
        title: 'Entrega registrada',
        description: affiliateData
          ? `Se registró la entrega para ${affiliateData.firstName} ${affiliateData.lastName}.`
          : 'La entrega fue registrada correctamente.',
        variant: 'success',
        duration: 5000,
      });
    } catch (error) {
      console.error(error);
      showFeedbackBanner(
        'error',
        'Error al registrar la entrega',
        'No fue posible guardar la entrega. Intente nuevamente.',
      );
      toast({
        title: 'Error al registrar la entrega',
        description: 'No fue posible guardar la entrega. Intente nuevamente.',
        variant: 'destructive',
        duration: 5000,
      });
      throw error;
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
          {feedbackBanner && (
            <Alert
              variant={feedbackBanner.type === 'error' ? 'destructive' : 'default'}
              className="border border-slate-200 bg-white shadow-sm"
            >
              {feedbackBanner.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-primary-prosalud" />
              )}
              <AlertTitle>{feedbackBanner.title}</AlertTitle>
              <AlertDescription>{feedbackBanner.description}</AlertDescription>
            </Alert>
          )}

          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                      <ShieldCheck className="h-8 w-8 text-primary-prosalud" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-primary-prosalud">
                        Gestión Dotación y EPP
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        Consulta afiliados activos, registra entregas de dotación y elementos de protección personal,
                        y guarda la firma de recibido como constancia.
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/*
          <motion.div variants={itemVariants}>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary-prosalud" />
                    Afiliados activos
                  </CardTitle>
                  <CardDescription>Total registrados en el sistema de Dotación y EPP</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold text-slate-800">{activeAffiliatesCount}</span>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary-prosalud" />
                    Capacitaciones pendientes
                  </CardTitle>
                  <CardDescription>Afiliados con capacitaciones o reinducciones por completar</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold text-slate-800">{affiliatesWithPendingTrainings}</span>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary-prosalud" />
                    Sin entregas registradas
                  </CardTitle>
                  <CardDescription>Afiliados sin historial de entrega registrado</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold text-slate-800">{affiliatesWithoutDelivery}</span>
                </CardContent>
              </Card>
            </div>
          </motion.div>
          */}

          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Search className="h-5 w-5 text-primary-prosalud" />
                      Buscar afiliado por documento
                    </CardTitle>
                    <CardDescription>
                      Ingresa el tipo y número de documento del afiliado para cargar automáticamente su ficha de entrega.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start gap-2 text-sm text-primary-prosalud hover:text-white"
                    onClick={() =>
                      setShowAffiliateList((prev) => {
                        const next = !prev;
                        if (next) {
                          setSelectedAffiliate(null);
                        }
                        return next;
                      })
                    }
                    disabled={isSearchingAffiliate}
                  >
                    <Users className="h-4 w-4" />
                    {showAffiliateList ? 'Ocultar listado de afiliados' : 'Mostrar listado de afiliados'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearchAffiliate} className="grid gap-4 md:grid-cols-[200px,1fr,auto]">
                  <Select value={documentType} onValueChange={(value) => setDocumentType(value as SstDocumentType)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tipo de documento" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    value={documentNumber}
                    onChange={(event) => setDocumentNumber(event.target.value)}
                    placeholder="Número de documento"
                    autoComplete="off"
                  />

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={isSearchingAffiliate || !documentNumber.trim()}
                      className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white w-full md:w-auto"
                    >
                      {isSearchingAffiliate ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Buscar
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetSelection}
                      disabled={isSearchingAffiliate && !selectedAffiliate}
                      className="w-full md:w-auto"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Limpiar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
          
          {showAffiliateList && (
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-xl">Afiliados activos en Dotación y EPP</CardTitle>
                    <CardDescription>
                      Lista general de afiliados con posibilidad de filtrar por nombre, documento, hospital o rol.
                    </CardDescription>
                  </div>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <Input
                        value={listSearchTerm}
                        onChange={(event) => {
                          setListSearchTerm(event.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Filtrar por nombre, documento, hospital o rol..."
                        className="w-full lg:w-72"
                      />
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Select
                          value={hospitalFilter}
                          onValueChange={(value) => {
                            setHospitalFilter(value);
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="Filtrar por hospital" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los hospitales</SelectItem>
                            {hospitalOptions.map((hospital) => (
                              <SelectItem key={hospital} value={hospital}>
                                {hospital}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={statusFilter}
                          onValueChange={(value: 'all' | 'active' | 'inactive') => {
                            setStatusFilter(value);
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-44">
                            <SelectValue placeholder="Filtrar por estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="active">Activos</SelectItem>
                            <SelectItem value="inactive">Inactivos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {errorMessage && (
                  <>
                    <Alert variant="destructive" className="mx-4 mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No se pudo cargar la información</AlertTitle>
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                    <Separator />
                  </>
                )}
                <div className="max-h-[420px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-50 shadow-sm">
                      <TableRow>
                        <TableHead>Afiliado</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Hospital</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Última entrega</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingAffiliates ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Cargando afiliados activos...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : totalItems === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <div className="py-6 text-center text-sm text-slate-500">
                              No se encontraron afiliados que coincidan con la búsqueda.
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedAffiliates.map((affiliate) => {
                          const isSelected = selectedAffiliate?.id === affiliate.id;
                          return (
                            <TableRow
                              key={affiliate.id}
                              onClick={() => handleSelectAffiliate(affiliate)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-primary-prosalud/10 hover:bg-primary-prosalud/20' : 'hover:bg-slate-50'
                              }`}
                            >
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800">
                                    {affiliate.firstName} {affiliate.lastName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-700">{affiliate.documentNumber}</span>
                                  <span className="text-xs uppercase text-slate-400">{affiliate.documentType}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">{affiliate.hospital}</TableCell>
                              <TableCell className="text-sm text-slate-600">{affiliate.role}</TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {affiliate.lastDeliveryAt
                                  ? new Date(affiliate.lastDeliveryAt).toLocaleDateString()
                                  : 'Sin registro'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={affiliate.active ? 'outline' : 'secondary'}>
                                  {affiliate.active ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Filter className="h-4 w-4" />
                    <span>
                      Mostrando {paginatedAffiliates.length} de {totalItems} afiliados
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>Filas por página</span>
                      <Select
                        value={String(itemsPerPage)}
                        onValueChange={(value) => {
                          setItemsPerPage(Number(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="h-8 w-20">
                          <SelectValue placeholder={itemsPerPage} />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 25, 50].map((size) => (
                            <SelectItem key={size} value={String(size)}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-slate-600">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          )}

          {selectedAffiliate && !showAffiliateList && (
            <motion.div variants={itemVariants} ref={deliveryPanelRef}>
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">
                    Registro de entrega para {selectedAffiliate.firstName} {selectedAffiliate.lastName}
                  </CardTitle>
                  <CardDescription>
                    Completa la selección de elementos de protección y captura la firma del afiliado como constancia.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <span className="text-xs uppercase text-slate-500">Tipo y número de documento</span>
                      <p className="font-medium text-slate-800">
                        {selectedAffiliate.documentType} {selectedAffiliate.documentNumber}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs uppercase text-slate-500">Hospital</span>
                      <p className="font-medium text-slate-800">{selectedAffiliate.hospital}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase text-slate-500">Proceso</span>
                      <p className="font-medium text-slate-800">{selectedAffiliate.role}</p>
                    </div>
                  </div>

                  <Separator />

                  {isLoadingInventory && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando inventario disponible...
                    </div>
                  )}

                  {!isLoadingInventory && inventory.length === 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Inventario no disponible</AlertTitle>
                      <AlertDescription>
                        No se encontraron elementos configurados en el inventario. Por favor, revisa la configuración
                        del módulo de Dotación y EPP.
                      </AlertDescription>
                    </Alert>
                  )}

                  {!isLoadingInventory && inventory.length > 0 && (
                    <AffiliateDeliveryPanel
                      affiliate={selectedAffiliate}
                      inventory={inventory}
                      deliveryHistory={deliveryHistory}
                      onConfirmDelivery={handleOpenConfirmationModal}
                      confirmedRecordId={lastConfirmedRecordId}
                    />
                  )}

                  {isLoadingHistory && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Consultando historial de entregas...
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>

        <DeliveryConfirmationModal
          open={confirmationModalOpen}
          onOpenChange={setConfirmationModalOpen}
          record={pendingRecord}
          inventory={inventory}
          affiliateName={
            selectedAffiliate
              ? `${selectedAffiliate.firstName} ${selectedAffiliate.lastName}`
              : ''
          }
          onConfirm={handleConfirmDelivery}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminSstPage;


