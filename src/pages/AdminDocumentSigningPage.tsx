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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
} from 'lucide-react';
import { sendBulkEmails, getEmailHistory, resendEmails, getStatistics, EmailTracking, EmailHistoryParams } from '@/services/documentSigningService';
import DataPagination from '@/components/ui/data-pagination';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const AdminDocumentSigningPage: React.FC = () => {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState('send');
  const [documentNumbersList, setDocumentNumbersList] = useState<string[]>([]);
  const [currentDocumentNumber, setCurrentDocumentNumber] = useState('');
  const [emailSubject, setEmailSubject] = useState('Firma de Convenio de Afiliación');
  const [documentName, setDocumentName] = useState('Convenio de Afiliación');
  const [isSending, setIsSending] = useState(false);
  
  // Filtros para historial
  const [historyFilters, setHistoryFilters] = useState<EmailHistoryParams>({
    per_page: 15,
    page: 1,
  });
  
  // Filtros para estadísticas
  const [statsFilters, setStatsFilters] = useState<{ fecha_desde?: string; fecha_hasta?: string }>({});

  // Query para historial
  const { data: historyData, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['document-signing-history', historyFilters],
    queryFn: () => getEmailHistory(historyFilters),
    enabled: activeTab === 'history' && can('document_signing.view'),
  });

  // Query para estadísticas
  const { data: statsData, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['document-signing-statistics', statsFilters],
    queryFn: () => getStatistics(statsFilters),
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
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDocumentNumber();
    }
  };

  const handleSendBulkEmails = async () => {
    if (documentNumbersList.length === 0) {
      toast.error('Error', {
        description: 'Por favor, agrega al menos un número de documento.',
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await sendBulkEmails({
        document_numbers: documentNumbersList,
        email_subject: emailSubject || undefined,
        document_name: documentName || undefined,
      });

      const { success_count, failed_count, skipped_count, results } = response.data;

      // Mostrar resultados
      if (success_count > 0) {
        toast.success(`Correos enviados exitosamente: ${success_count}`, {
          description: `Se enviaron ${success_count} correo(s) de firma.`,
          duration: 5000,
        });
      }

      if (failed_count > 0) {
        toast.warning(`Algunos correos fallaron: ${failed_count}`, {
          description: results.failed.map(f => `${f.document_number}: ${f.error}`).join(', '),
          duration: 8000,
        });
      }

      if (skipped_count > 0) {
        toast.info(`Correos omitidos: ${skipped_count}`, {
          description: results.skipped.map(s => `${s.document_number}: ${s.reason}`).join(', '),
          duration: 8000,
        });
      }

      // Limpiar formulario
      setDocumentNumbersList([]);
      setCurrentDocumentNumber('');
      
      // Cambiar a historial para ver los nuevos envíos
      if (success_count > 0) {
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

  const handleResend = async (trackingId: number) => {
    try {
      const response = await resendEmails({
        tracking_ids: [trackingId],
        email_subject: emailSubject || undefined,
      });

      if (response.data.success_count > 0) {
        toast.success('Correo reenviado exitosamente');
        refetchHistory();
      }
    } catch (error: any) {
      toast.error('Error al reenviar correo', {
        description: error.message || 'Ocurrió un error al reenviar el correo.',
      });
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

  const getStatusBadge = (status: EmailTracking['email_status']) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock },
      sent: { label: 'Enviado', variant: 'default' as const, icon: Send },
      delivered: { label: 'Entregado', variant: 'default' as const, icon: Mail },
      opened: { label: 'Abierto', variant: 'default' as const, icon: Eye },
      failed: { label: 'Fallido', variant: 'destructive' as const, icon: XCircle },
      bounced: { label: 'Rebotado', variant: 'destructive' as const, icon: AlertCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };


  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Firma de Documentos</h1>
              <p className="text-gray-600 mt-1">
                Gestiona el envío masivo de correos para firma de convenios con DocuSign
              </p>
            </div>
          </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            {can('document_signing.manage') && (
              <TabsTrigger value="send">
                <Send className="h-4 w-4 mr-2" />
                Envío Masivo
              </TabsTrigger>
            )}
            {can('document_signing.view') && (
              <>
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-2" />
                  Historial
                </TabsTrigger>
                <TabsTrigger value="statistics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Estadísticas
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Tab: Envío Masivo */}
          {can('document_signing.manage') && (
            <TabsContent value="send" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Enviar Correos de Firma</CardTitle>
                  <CardDescription>
                    Ingresa los números de documento de los afiliados a los que deseas enviar el correo de firma.
                    Puedes ingresar múltiples números, uno por línea.
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
                        <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-slate-50 min-h-[60px]">
                          {documentNumbersList.map((number) => (
                            <Badge
                              key={number}
                              variant="secondary"
                              className="flex items-center gap-1 px-3 py-1.5 font-mono text-sm"
                            >
                              {number}
                              <button
                                type="button"
                                onClick={() => handleRemoveDocumentNumber(number)}
                                className="ml-1 hover:bg-slate-200 rounded-full p-0.5 transition-colors"
                                aria-label={`Eliminar ${number}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-500">
                        Agrega números de documento uno por uno. El sistema buscará automáticamente el PDF del convenio y el correo del afiliado.
                        {documentNumbersList.length > 0 && (
                          <span className="block mt-1 font-medium text-gray-700">
                            Total: {documentNumbersList.length} documento(s) agregado(s)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emailSubject">Asunto del Correo (Opcional)</Label>
                      <Input
                        id="emailSubject"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Firma de Convenio de Afiliación"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="documentName">Nombre del Documento (Opcional)</Label>
                      <Input
                        id="documentName"
                        value={documentName}
                        onChange={(e) => setDocumentName(e.target.value)}
                        placeholder="Convenio de Afiliación"
                      />
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
                        <p className="text-sm text-blue-800">
                          Los correos serán enviados automáticamente por DocuSign. El sistema rastreará el estado de cada envío
                          (enviado, entregado, abierto, firmado) mediante webhooks. Puedes ver el progreso en la pestaña "Historial".
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleSendBulkEmails}
                    disabled={isSending || documentNumbersList.length === 0}
                    className="w-full md:w-auto"
                    size="lg"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando correos...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar Correos de Firma
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Tab: Historial */}
          {can('document_signing.view') && (
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Historial de Envíos</CardTitle>
                      <CardDescription>
                        Visualiza todos los correos enviados para firma de documentos
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Buscar por Documento</Label>
                      <Input
                        placeholder="Número de documento"
                        value={historyFilters.document_number || ''}
                        onChange={(e) =>
                          setHistoryFilters({ ...historyFilters, document_number: e.target.value || undefined, page: 1 })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select
                        value={historyFilters.email_status || 'all'}
                        onValueChange={(value) =>
                          setHistoryFilters({ ...historyFilters, email_status: value === 'all' ? undefined : value as any, page: 1 })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los estados" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="sent">Enviado</SelectItem>
                          <SelectItem value="delivered">Entregado</SelectItem>
                          <SelectItem value="opened">Abierto</SelectItem>
                          <SelectItem value="failed">Fallido</SelectItem>
                          <SelectItem value="bounced">Rebotado</SelectItem>
                        </SelectContent>
                      </Select>
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
                              <TableHead>Afiliado</TableHead>
                              <TableHead>Correo</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Enviado</TableHead>
                              <TableHead>Entregado</TableHead>
                              <TableHead>Abierto</TableHead>
                              <TableHead>Firmado</TableHead>
                              <TableHead>Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {historyData?.data.data.map((tracking) => (
                              <TableRow key={tracking.id}>
                                <TableCell className="font-mono">{tracking.document_number}</TableCell>
                                <TableCell>{tracking.recipient_name}</TableCell>
                                <TableCell>{tracking.recipient_email}</TableCell>
                                <TableCell>{getStatusBadge(tracking.email_status)}</TableCell>
                                <TableCell>{formatDate(tracking.sent_at)}</TableCell>
                                <TableCell>{formatDate(tracking.delivered_at)}</TableCell>
                                <TableCell>
                                  {tracking.opened_at ? (
                                    <div className="flex items-center gap-1">
                                      {formatDate(tracking.opened_at)}
                                      {tracking.open_count > 1 && (
                                        <Badge variant="outline" className="ml-1">
                                          {tracking.open_count}x
                                        </Badge>
                                      )}
                                    </div>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                                <TableCell>{formatDate(tracking.signed_at)}</TableCell>
                                <TableCell>
                                  {tracking.email_status !== 'bounced' && !tracking.signed_at && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleResend(tracking.id)}
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  )}
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

          {/* Tab: Estadísticas */}
          {can('document_signing.view') && (
            <TabsContent value="statistics" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Estadísticas de Envíos</CardTitle>
                      <CardDescription>
                        Métricas y estadísticas de los correos de firma enviados
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
                            <div className="text-2xl font-bold text-green-600">{statsData.data.opened_today}</div>
                            <p className="text-sm text-gray-600">Abiertos Hoy</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-emerald-600">{statsData.data.signed_today}</div>
                            <p className="text-sm text-gray-600">Firmados Hoy</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Por estado */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Distribución por Estado</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {Object.entries(statsData.data.by_status).map(([status, count]) => (
                            <Card key={status}>
                              <CardContent className="pt-6">
                                <div className="text-xl font-bold">{count}</div>
                                <p className="text-sm text-gray-600 capitalize">{status}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      {/* Por proveedor */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Por Proveedor</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(statsData.data.by_provider).map(([provider, count]) => (
                            <Card key={provider}>
                              <CardContent className="pt-6">
                                <div className="text-xl font-bold">{count}</div>
                                <p className="text-sm text-gray-600 capitalize">{provider}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
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
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDocumentSigningPage;

