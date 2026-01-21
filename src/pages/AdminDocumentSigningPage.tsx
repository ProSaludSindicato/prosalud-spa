import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  FileSignature,
  Send,
  History,
  BarChart3,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Eye,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  X,
  Plus,
  FileText,
} from 'lucide-react';
// Manual signing service (ACTIVE)
import {
  sendBulkEmails as sendBulkEmailsManual,
  getEmailHistory as getEmailHistoryManual,
  resendEmails as resendEmailsManual,
  getStatistics as getStatisticsManual,
  ConvenioEmailTracking,
  EmailHistoryParams as ManualEmailHistoryParams,
} from '@/services/conveniosManualService';
// DocuSign service (TEMPORARILY DISABLED - preserved for future use)
// El servicio documentSigningService.ts contiene toda la funcionalidad de DocuSign
// y está preservado para reactivación futura. Las rutas del backend están comentadas
// pero no eliminadas. Para reactivar, cambiar DOCUSIGN_ENABLED a true y descomentar
// las importaciones y código relacionado.
// import { sendBulkEmails, getEmailHistory, resendEmails, getStatistics, EmailTracking, EmailHistoryParams } from '@/services/documentSigningService';
import DataPagination from '@/components/ui/data-pagination';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

const AdminDocumentSigningPage: React.FC = () => {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState('history');
  const [documentNumbersList, setDocumentNumbersList] = useState<string[]>([]);
  const [currentDocumentNumber, setCurrentDocumentNumber] = useState('');
  const [emailsMap, setEmailsMap] = useState<Record<string, string>>({}); // Mapa de documento -> email
  const [isSending, setIsSending] = useState(false);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [selectedTrackingId, setSelectedTrackingId] = useState<number | null>(null);
  const [selectedTrackingInfo, setSelectedTrackingInfo] = useState<ConvenioEmailTracking | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resendEmailSubject, setResendEmailSubject] = useState('');
  const [isResending, setIsResending] = useState(false);
  
  // Filtros para historial (Manual)
  const [historyFilters, setHistoryFilters] = useState<ManualEmailHistoryParams>({
    per_page: 15,
    page: 1,
  });
  
  // Filtros para estadísticas (Manual)
  const [statsFilters, setStatsFilters] = useState<{ fecha_desde?: string; fecha_hasta?: string }>({});

  // Query para historial (Manual)
  const { data: historyData, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['convenios-manual-history', historyFilters],
    queryFn: () => getEmailHistoryManual(historyFilters),
    enabled: activeTab === 'history' && can('document_signing.view'),
  });

  // Query para estadísticas (Manual)
  const { data: statsData, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['convenios-manual-statistics', statsFilters],
    queryFn: () => getStatisticsManual(statsFilters),
    enabled: activeTab === 'statistics' && can('document_signing.view'),
  });

  const handleAddDocumentNumber = () => {
    const trimmed = currentDocumentNumber.trim();
    if (!trimmed) return;
    
    if (documentNumbersList.includes(trimmed)) {
      toast.warning('Número duplicado', {
        description: 'Este número de documento ya está en la lista.',
      });
      return;
    }

    setDocumentNumbersList([...documentNumbersList, trimmed]);
    setCurrentDocumentNumber('');
  };

  const handleRemoveDocumentNumber = (number: string) => {
    setDocumentNumbersList(documentNumbersList.filter(n => n !== number));
    // Remover email asociado si existe
    const newEmailsMap = { ...emailsMap };
    delete newEmailsMap[number];
    setEmailsMap(newEmailsMap);
  };

  const handleEmailChange = (documentNumber: string, email: string) => {
    setEmailsMap(prev => {
      const newMap = { ...prev };
      if (email.trim()) {
        newMap[documentNumber] = email.trim();
      } else {
        delete newMap[documentNumber];
      }
      return newMap;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDocumentNumber();
    }
  };

  // Handler para envío masivo (Manual)
  const handleSendBulkEmailsManual = async () => {
    if (documentNumbersList.length === 0) {
      toast.error('Error', {
        description: 'Por favor, agrega al menos un número de documento.',
      });
      return;
    }

    // Validar emails si se proporcionaron
    const invalidEmails: string[] = [];
    Object.entries(emailsMap).forEach(([doc, email]) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        invalidEmails.push(doc);
      }
    });

    if (invalidEmails.length > 0) {
      toast.error('Emails inválidos', {
        description: `Los siguientes documentos tienen emails inválidos: ${invalidEmails.join(', ')}`,
      });
      return;
    }

    setIsSending(true);
    try {
      const requestData: any = {
        document_numbers: documentNumbersList,
      };

      // Agregar emails solo si hay al menos uno
      // Formato requerido: emails debe ser un objeto asociativo donde las claves
      // son los números de documento (strings) y los valores son los correos electrónicos
      // Ejemplo: { "1234567890": "email@example.com", "9876543210": "otro@example.com" }
      if (Object.keys(emailsMap).length > 0) {
        requestData.emails = emailsMap;
      }

      const response = await sendBulkEmailsManual(requestData);

      const { total_requested, files_found, enqueued, errors } = response.data;

      // Mostrar confirmación inmediata
      toast.success('Proceso iniciado', {
        description: response.message || 'El proceso de envío masivo ha sido iniciado. Los correos se enviarán de forma asíncrona.',
        duration: 5000,
      });

      // Mostrar resumen
      if (errors > 0) {
        toast.warning('Algunos archivos no se encontraron', {
          description: `${errors} archivo(s) no se encontraron. Revisa el historial para más detalles.`,
          duration: 8000,
        });
      }

      // Limpiar formulario
      setDocumentNumbersList([]);
      setCurrentDocumentNumber('');
      setEmailsMap({});
      
      // Cambiar a historial para ver los nuevos envíos
      if (enqueued > 0) {
        setTimeout(() => {
          setActiveTab('history');
          refetchHistory();
        }, 1000);
      }
    } catch (error: any) {
      toast.error('Error al enviar correos', {
        description: error.message || 'Ocurrió un error al enviar los correos.',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Abrir modal de confirmación para reenvío
  const handleOpenResendDialog = (tracking: ConvenioEmailTracking) => {
    setSelectedTrackingId(tracking.id);
    setSelectedTrackingInfo(tracking);
    // Prediligenciar el correo actual si está disponible
    setResendEmail(tracking.email_afiliado || '');
    setResendEmailSubject('');
    setResendDialogOpen(true);
  };

  // Handler para reenvío (Manual) - después de confirmación
  const handleConfirmResend = async () => {
    if (!selectedTrackingId) return;

    // Validar email si se proporcionó
    if (resendEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(resendEmail.trim())) {
        toast.error('Email inválido', {
          description: 'Por favor, ingresa un email válido.',
        });
        return;
      }
    }

    setIsResending(true);
    try {
      const requestData: any = {
        tracking_ids: [selectedTrackingId],
      };

      // Agregar email si se proporcionó
      // Formato requerido: emails debe ser un objeto asociativo donde las claves
      // son los tracking_ids como strings y los valores son los correos electrónicos
      // Ejemplo: { "17": "nuevo-email@example.com" }
      if (resendEmail.trim()) {
        requestData.emails = {
          [selectedTrackingId.toString()]: resendEmail.trim(),
        };
      }

      // Agregar email_subject si se proporcionó
      if (resendEmailSubject.trim()) {
        requestData.email_subject = resendEmailSubject.trim();
      }

      const response = await resendEmailsManual(requestData);

      if (response.data.success_count > 0) {
        toast.success('Correo reenviado exitosamente');
        refetchHistory();
        setResendDialogOpen(false);
        setSelectedTrackingId(null);
        setSelectedTrackingInfo(null);
        setResendEmail('');
        setResendEmailSubject('');
      } else if (response.data.failed_count > 0) {
        const failed = response.data.results.failed.find(f => f.tracking_id === selectedTrackingId);
        toast.error('Error al reenviar', {
          description: failed?.error || 'No se pudo reenviar el correo.',
        });
      }
    } catch (error: any) {
      toast.error('Error al reenviar correo', {
        description: error.message || 'Ocurrió un error al reenviar el correo.',
      });
    } finally {
      setIsResending(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
      return dateString;
    }
  };

  // Badge de estado para Manual
  const getManualStatusBadge = (status: ConvenioEmailTracking['estado']) => {
    const statusConfig = {
      pendiente: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      enviado: { label: 'Enviado', variant: 'default' as const, icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-200' },
      fallido: { label: 'Fallido', variant: 'destructive' as const, icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200' },
    };

    const config = statusConfig[status] || statusConfig.pendiente;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Datos para gráficas de estadísticas
  const chartData = useMemo(() => {
    if (!statsData?.data) return null;

    const statusData = [
      { name: 'Pendiente', cantidad: statsData.data.by_status.pendiente || 0, color: '#eab308' },
      { name: 'Enviado', cantidad: statsData.data.by_status.enviado || 0, color: '#22c55e' },
      { name: 'Fallido', cantidad: statsData.data.by_status.fallido || 0, color: '#ef4444' },
    ];

    return {
      statusData: statusData.filter(item => item.cantidad > 0),
      total: statsData.data.total,
    };
  }, [statsData]);

  const chartConfig = {
    cantidad: { label: 'Cantidad de Envíos', color: '#8884d8' },
    Pendiente: { label: 'Pendiente', color: '#eab308' },
    Enviado: { label: 'Enviado', color: '#22c55e' },
    Fallido: { label: 'Fallido', color: '#ef4444' },
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Firma de Convenios</h1>
              <p className="text-gray-600 mt-1">
                Gestiona el envío masivo de correos para firma de convenios
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              {can('document_signing.view') && (
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-2" />
                  Historial
                </TabsTrigger>
              )}
              {can('document_signing.manage') && (
                <TabsTrigger value="send">
                  <Send className="h-4 w-4 mr-2" />
                  Envío Masivo
                </TabsTrigger>
              )}
              {can('document_signing.view') && (
                <TabsTrigger value="statistics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Estadísticas
                </TabsTrigger>
              )}
            </TabsList>

            {/* Tab: Historial (Manual) - Primero */}
            {can('document_signing.view') && (
              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Historial de Envíos Manuales</CardTitle>
                        <CardDescription>
                          Visualiza todos los correos enviados para firma manual de convenios
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchHistory()}
                        disabled={isLoadingHistory}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                        Actualizar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label>Buscar por Documento</Label>
                        <Input
                          placeholder="Número de documento"
                          value={historyFilters.documento || ''}
                          onChange={(e) =>
                            setHistoryFilters({ ...historyFilters, documento: e.target.value || undefined, page: 1 })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select
                          value={historyFilters.estado || 'all'}
                          onValueChange={(value) =>
                            setHistoryFilters({ ...historyFilters, estado: value === 'all' ? undefined : value as any, page: 1 })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todos los estados" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="enviado">Enviado</SelectItem>
                            <SelectItem value="fallido">Fallido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Nombre de Convenio</Label>
                        <Input
                          placeholder="Buscar convenio"
                          value={historyFilters.nombre_convenio || ''}
                          onChange={(e) =>
                            setHistoryFilters({ ...historyFilters, nombre_convenio: e.target.value || undefined, page: 1 })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Fecha Desde</Label>
                        <Input
                          type="date"
                          value={historyFilters.fecha_desde || ''}
                          onChange={(e) =>
                            setHistoryFilters({ ...historyFilters, fecha_desde: e.target.value || undefined, page: 1 })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Fecha Hasta</Label>
                        <Input
                          type="date"
                          value={historyFilters.fecha_hasta || ''}
                          onChange={(e) =>
                            setHistoryFilters({ ...historyFilters, fecha_hasta: e.target.value || undefined, page: 1 })
                          }
                        />
                      </div>
                    </div>

                    {/* Tabla */}
                    {isLoadingHistory ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                        <p className="text-gray-500 mt-2">Cargando historial...</p>
                      </div>
                    ) : historyData?.data.data.length === 0 ? (
                      <div className="text-center py-8">
                        <FileSignature className="h-12 w-12 mx-auto text-gray-400" />
                        <p className="text-gray-500 mt-2">No se encontraron registros</p>
                      </div>
                    ) : (
                      <>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Documento</TableHead>
                                <TableHead>Nombre del Afiliado</TableHead>
                                <TableHead>Correo</TableHead>
                                <TableHead>Nombre del Convenio</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Fecha de Envío</TableHead>
                                <TableHead>Reintentos</TableHead>
                                <TableHead>Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {historyData?.data.data.map((tracking) => (
                                <TableRow key={tracking.id}>
                                  <TableCell className="font-mono">{tracking.documento}</TableCell>
                                  <TableCell>{tracking.nombre_afiliado}</TableCell>
                                  <TableCell>{tracking.email_afiliado}</TableCell>
                                  <TableCell className="max-w-xs truncate" title={tracking.nombre_convenio}>
                                    {tracking.nombre_convenio}
                                  </TableCell>
                                  <TableCell>
                                    {getManualStatusBadge(tracking.estado)}
                                    {tracking.error_message && (
                                      <div className="mt-1">
                                        <span className="text-xs text-red-600" title={tracking.error_message}>
                                          {tracking.error_message.length > 50 
                                            ? `${tracking.error_message.substring(0, 50)}...` 
                                            : tracking.error_message}
                                        </span>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>{formatDate(tracking.enviado_at)}</TableCell>
                                  <TableCell>{tracking.intentos}</TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenResendDialog(tracking)}
                                      title="Reenviar correo"
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {historyData?.data && (
                          <DataPagination
                            currentPage={historyData.data.current_page}
                            totalPages={historyData.data.last_page}
                            totalItems={historyData.data.total}
                            itemsPerPage={historyData.data.per_page}
                            onPageChange={(page) =>
                              setHistoryFilters({ ...historyFilters, page })
                            }
                          />
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab: Envío Masivo (Manual) - Segundo */}
            {can('document_signing.manage') && (
              <TabsContent value="send" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Enviar Correos de Convenio Manual</CardTitle>
                    <CardDescription>
                      Ingresa los números de documento de los afiliados a los que deseas enviar el correo con el PDF del convenio adjunto.
                      El sistema buscará automáticamente el PDF y enviará el correo de forma asíncrona.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="documentNumber">Números de Documento *</Label>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            id="documentNumber"
                            placeholder="Ingresa un número de documento y presiona Enter o haz clic en Agregar"
                            value={currentDocumentNumber}
                            onChange={(e) => setCurrentDocumentNumber(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="font-mono"
                          />
                          <Button
                            type="button"
                            onClick={handleAddDocumentNumber}
                            disabled={!currentDocumentNumber.trim()}
                            variant="outline"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar
                          </Button>
                        </div>
                        
                        {documentNumbersList.length > 0 && (
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[200px]">Número de Documento</TableHead>
                                  <TableHead>Correo Electrónico (Opcional)</TableHead>
                                  <TableHead className="w-[100px]">Acción</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {documentNumbersList.map((number) => (
                                  <TableRow key={number}>
                                    <TableCell className="font-mono">{number}</TableCell>
                                    <TableCell>
                                      <Input
                                        type="email"
                                        placeholder="email@ejemplo.com (opcional)"
                                        value={emailsMap[number] || ''}
                                        onChange={(e) => handleEmailChange(number, e.target.value)}
                                        className="font-mono text-sm"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveDocumentNumber(number)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-500">
                          Agrega números de documento uno por uno. Opcionalmente, puedes especificar un correo electrónico para cada documento.
                          Si no proporcionas un correo, el sistema buscará automáticamente el email del afiliado en la base de datos.
                          {documentNumbersList.length > 0 && (
                            <span className="block mt-1 font-medium text-gray-700">
                              Total: {documentNumbersList.length} documento(s) agregado(s)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-4">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <AlertCircle className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-900 mb-1">Información importante</h4>
                          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                            <li>Los correos se enviarán de forma asíncrona con el PDF del convenio adjunto.</li>
                            <li>El proceso puede tardar varios minutos dependiendo de la cantidad de correos.</li>
                            <li>Puedes ver el progreso y estado de cada envío en la pestaña "Historial".</li>
                            <li>Si no proporcionas un correo, se usará el email del afiliado en la base de datos.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleSendBulkEmailsManual}
                      disabled={isSending || documentNumbersList.length === 0}
                      className="w-full md:w-auto"
                      size="lg"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Iniciando envío masivo...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Enviar Correos de Convenio Manual
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab: Estadísticas (Manual) */}
            {can('document_signing.view') && (
              <TabsContent value="statistics" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Estadísticas de Envíos Manuales</CardTitle>
                        <CardDescription>
                          Métricas y estadísticas de los correos de convenio enviados
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          placeholder="Fecha desde"
                          value={statsFilters.fecha_desde || ''}
                          onChange={(e) =>
                            setStatsFilters({ ...statsFilters, fecha_desde: e.target.value || undefined })
                          }
                          className="w-auto"
                        />
                        <Input
                          type="date"
                          placeholder="Fecha hasta"
                          value={statsFilters.fecha_hasta || ''}
                          onChange={(e) =>
                            setStatsFilters({ ...statsFilters, fecha_hasta: e.target.value || undefined })
                          }
                          className="w-auto"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refetchStats()}
                          disabled={isLoadingStats}
                        >
                          <RefreshCw className={`h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStats ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                        <p className="text-gray-500 mt-2">Cargando estadísticas...</p>
                      </div>
                    ) : statsData?.data ? (
                      <div className="space-y-6">
                        {/* Métricas principales */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-2xl font-bold">{statsData.data.total}</div>
                              <p className="text-sm text-gray-600">Total de Envíos</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-2xl font-bold text-blue-600">{statsData.data.sent_today}</div>
                              <p className="text-sm text-gray-600">Enviados Hoy</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-2xl font-bold text-yellow-600">{statsData.data.pending}</div>
                              <p className="text-sm text-gray-600">Pendientes</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-2xl font-bold text-red-600">{statsData.data.failed}</div>
                              <p className="text-sm text-gray-600">Fallidos</p>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Gráficas */}
                        {chartData && chartData.statusData.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Gráfica de Pie - Distribución por Estado */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Distribución por Estado</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ChartContainer
                                  config={chartConfig}
                                  className="h-[300px] w-full"
                                >
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={chartData.statusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="cantidad"
                                      >
                                        {chartData.statusData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                      </Pie>
                                      <ChartTooltip content={<ChartTooltipContent />} />
                                      <Legend />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </ChartContainer>
                              </CardContent>
                            </Card>

                            {/* Gráfica de Barras - Comparación por Estado */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Comparación por Estado</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ChartContainer
                                  config={chartConfig}
                                  className="h-[300px] w-full"
                                >
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.statusData}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" />
                                      <YAxis />
                                      <ChartTooltip content={<ChartTooltipContent />} />
                                      <Legend />
                                      <Bar dataKey="cantidad" fill="#8884d8" name="Cantidad de Envíos">
                                        {chartData.statusData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </ChartContainer>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Por estado - Cards */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Distribución por Estado</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-xl font-bold text-yellow-600">{statsData.data.by_status.pendiente || 0}</div>
                                <p className="text-sm text-gray-600">Pendiente</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-xl font-bold text-green-600">{statsData.data.by_status.enviado || 0}</div>
                                <p className="text-sm text-gray-600">Enviado</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-xl font-bold text-red-600">{statsData.data.by_status.fallido || 0}</div>
                                <p className="text-sm text-gray-600">Fallido</p>
                              </CardContent>
                            </Card>
                          </div>
                        </div>

                        {/* Tasa de éxito */}
                        {statsData.data.total > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Tasa de Éxito</h3>
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-3xl font-bold text-green-600">
                                  {((statsData.data.sent / statsData.data.total) * 100).toFixed(1)}%
                                </div>
                                <p className="text-sm text-gray-600">
                                  {statsData.data.sent} de {statsData.data.total} correos enviados exitosamente
                                </p>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="h-12 w-12 mx-auto text-gray-400" />
                        <p className="text-gray-500 mt-2">No hay estadísticas disponibles</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          {/* Modal de confirmación para reenvío */}
          <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Reenvío de Correo</DialogTitle>
                <DialogDescription>
                  ¿Estás seguro de que deseas reenviar el correo de convenio?
                </DialogDescription>
              </DialogHeader>
              {selectedTrackingInfo && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold">Documento:</span>
                      <p className="font-mono">{selectedTrackingInfo.documento}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Afiliado:</span>
                      <p>{selectedTrackingInfo.nombre_afiliado}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Correo actual:</span>
                      <p className="break-all">{selectedTrackingInfo.email_afiliado}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Convenio:</span>
                      <p className="truncate" title={selectedTrackingInfo.nombre_convenio}>
                        {selectedTrackingInfo.nombre_convenio}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold">Estado actual:</span>
                      <div>{getManualStatusBadge(selectedTrackingInfo.estado)}</div>
                    </div>
                    <div>
                      <span className="font-semibold">Reintentos:</span>
                      <p>{selectedTrackingInfo.intentos}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resendEmail">Correo Electrónico (Opcional)</Label>
                      <Input
                        id="resendEmail"
                        type="email"
                        placeholder="email@ejemplo.com"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500">
                        {selectedTrackingInfo.email_afiliado 
                          ? `Correo actual: ${selectedTrackingInfo.email_afiliado}. Puedes cambiarlo si lo deseas.`
                          : 'Si no proporcionas un correo, se usará el email del afiliado en la base de datos o el del registro original.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resendEmailSubject">Asunto del Correo (Opcional)</Label>
                      <Input
                        id="resendEmailSubject"
                        placeholder="Ej: Firma de Convenio de Afiliación"
                        value={resendEmailSubject}
                        onChange={(e) => setResendEmailSubject(e.target.value)}
                      />
                      <p className="text-xs text-gray-500">
                        Si no se proporciona, se usará el asunto por defecto.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResendDialogOpen(false);
                    setSelectedTrackingId(null);
                    setSelectedTrackingInfo(null);
                    setResendEmail('');
                    setResendEmailSubject('');
                  }}
                  disabled={isResending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmResend}
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reenviando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Confirmar Reenvío
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDocumentSigningPage;
