import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  FileText, 
  AlertCircle, 
  ExternalLink, 
  Search,
  Filter,
  List,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  BarChart3,
  Activity
} from 'lucide-react';
import { 
  listarCertificados,
  ListarCertificadosParams,
  CertificadoListItem,
  consultarCertificado
} from '@/services/certificadoConvenioService';
import { toast } from 'sonner';
import DataPagination from '@/components/ui/data-pagination';

interface VerificarCertificadoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VerificarCertificadoModal: React.FC<VerificarCertificadoModalProps> = ({
  open,
  onOpenChange,
}) => {
  // Estados para filtros
  const [filters, setFilters] = useState<ListarCertificadosParams>({
    page: 1,
    per_page: 15,
  });
  const [documentoFilter, setDocumentoFilter] = useState('');
  const [consecutivoFilter, setConsecutivoFilter] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loadingPdf, setLoadingPdf] = useState<number | null>(null);

  // Query para listar certificados
  const { data: listadoData, isLoading: isLoadingListado, refetch: refetchListado } = useQuery({
    queryKey: ['certificados-listado', filters],
    queryFn: () => listarCertificados(filters),
    enabled: open,
    staleTime: 30 * 1000, // 30 segundos
  });

  // Query para métricas del mes actual
  const { data: mesActualData } = useQuery({
    queryKey: ['certificados-mes-actual'],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Formatear fechas en formato YYYY-MM-DD
      const fechaDesde = firstDay.toISOString().split('T')[0];
      const fechaHasta = lastDay.toISOString().split('T')[0];
      
      return listarCertificados({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        per_page: 100, // Obtener suficientes para calcular métricas
      });
    },
    enabled: open,
    staleTime: 60 * 1000, // 1 minuto
  });

  // Query para métricas del mes anterior (para comparación)
  const { data: mesAnteriorData } = useQuery({
    queryKey: ['certificados-mes-anterior'],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      
      // Formatear fechas en formato YYYY-MM-DD
      const fechaDesde = firstDay.toISOString().split('T')[0];
      const fechaHasta = lastDay.toISOString().split('T')[0];
      
      return listarCertificados({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        per_page: 100,
      });
    },
    enabled: open,
    staleTime: 60 * 1000,
  });

  // Query para certificados de hoy
  const { data: hoyData } = useQuery({
    queryKey: ['certificados-hoy'],
    queryFn: async () => {
      const today = new Date();
      const fechaHoy = today.toISOString().split('T')[0];
      
      return listarCertificados({
        fecha_desde: fechaHoy,
        fecha_hasta: fechaHoy,
        per_page: 100,
      });
    },
    enabled: open,
    staleTime: 30 * 1000, // 30 segundos (más frecuente para datos de hoy)
  });

  const handleClose = () => {
    setDocumentoFilter('');
    setConsecutivoFilter('');
    setFechaDesde('');
    setFechaHasta('');
    setFilters({ page: 1, per_page: 15 });
    setLoadingPdf(null);
    onOpenChange(false);
  };

  const isUrlExpired = (urlExpiresAt: string | null): boolean => {
    if (!urlExpiresAt) return true; // Si no hay fecha de expiración, considerar vencida
    
    try {
      const expiresAt = new Date(urlExpiresAt);
      const now = new Date();
      return now >= expiresAt;
    } catch {
      return true; // Si hay error al parsear, considerar vencida
    }
  };

  const handleOpenPdf = async (certificado: CertificadoListItem) => {
    setLoadingPdf(certificado.id);

    try {
      // Verificar si la URL está disponible y no está vencida
      if (certificado.pdf_url && !isUrlExpired(certificado.url_expires_at)) {
        // Abrir directamente el PDF
        window.open(certificado.pdf_url, '_blank', 'noopener,noreferrer');
        setLoadingPdf(null);
        return;
      }

      // Si la URL está vencida o no existe, consultar el API para obtener una nueva
      toast.info('Obteniendo enlace actualizado...', {
        description: 'El enlace anterior expiró, generando uno nuevo.',
      });

      const response = await consultarCertificado(
        certificado.document_number,
        certificado.consecutivo
      );

      if (response.success && response.data.pdf_url) {
        window.open(response.data.pdf_url, '_blank', 'noopener,noreferrer');
        toast.success('Certificado abierto', {
          description: 'El certificado se ha abierto en una nueva pestaña.',
        });
        // Refrescar la lista para obtener URLs actualizadas
        refetchListado();
      } else {
        const errorMessage = response.success === false 
          ? (response as { success: false; message: string }).message 
          : 'No se pudo generar el enlace al PDF.';
        toast.error('Error al obtener el certificado', {
          description: errorMessage,
        });
      }
    } catch (error: any) {
      toast.error('Error al abrir el certificado', {
        description: error?.message || 'No se pudo abrir el certificado. Por favor intente nuevamente.',
      });
    } finally {
      setLoadingPdf(null);
    }
  };

  const handleApplyFilters = () => {
    const newFilters: ListarCertificadosParams = {
      page: 1,
      per_page: filters.per_page || 15,
    };

    if (documentoFilter.trim()) {
      newFilters.documento = documentoFilter.trim();
    }
    if (consecutivoFilter.trim()) {
      newFilters.consecutivo = consecutivoFilter.trim();
    }
    if (fechaDesde) {
      newFilters.fecha_desde = fechaDesde;
    }
    if (fechaHasta) {
      newFilters.fecha_hasta = fechaHasta;
    }

    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setDocumentoFilter('');
    setConsecutivoFilter('');
    setFechaDesde('');
    setFechaHasta('');
    setFilters({ page: 1, per_page: filters.per_page || 15 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleItemsPerPageChange = (perPage: number) => {
    setFilters({ ...filters, page: 1, per_page: perPage });
  };

  // Calcular métricas avanzadas
  const calculateMetrics = () => {
    if (!listadoData?.success) return null;

    const now = new Date();

    // Certificados del mes actual (usar el total de la paginación)
    const certificadosMesActual = mesActualData?.success 
      ? (mesActualData.pagination?.total ?? 0)
      : 0;
    
    const certificadosMesAnterior = mesAnteriorData?.success 
      ? (mesAnteriorData.pagination?.total ?? 0)
      : 0;

    // Certificados de hoy (usar consulta específica o calcular desde datos disponibles)
    let certificadosHoy = 0;
    if (hoyData?.success && hoyData.pagination) {
      // Usar el total de la paginación de la consulta de hoy
      certificadosHoy = hoyData.pagination.total ?? 0;
    } else if (mesActualData?.success && mesActualData.data && mesActualData.data.length > 0) {
      // Fallback: calcular desde los datos del mes actual si la consulta de hoy no está disponible
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      
      certificadosHoy = mesActualData.data.filter(cert => {
        try {
          if (!cert.generated_at) return false;
          const certDate = new Date(cert.generated_at);
          certDate.setHours(0, 0, 0, 0);
          return certDate.getTime() === todayStart.getTime();
        } catch {
          return false;
        }
      }).length;
    }

    // Calcular promedio por día en el rango de fechas filtrado
    let promedioPorDia = 0;
    let frecuenciaGeneracion = 'N/A';
    
    if (filters.fecha_desde && filters.fecha_hasta) {
      const fechaDesde = new Date(filters.fecha_desde);
      const fechaHasta = new Date(filters.fecha_hasta);
      const diasDiferencia = Math.ceil((fechaHasta.getTime() - fechaDesde.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      if (diasDiferencia > 0) {
        promedioPorDia = listadoData.pagination.total / diasDiferencia;
        
        // Calcular cada cuánto tiempo se genera un certificado (en horas)
        if (listadoData.pagination.total > 0) {
          const horasTotales = diasDiferencia * 24;
          const horasPorCertificado = horasTotales / listadoData.pagination.total;
          
          if (horasPorCertificado < 1) {
            frecuenciaGeneracion = `${Math.round(horasPorCertificado * 60)} minutos`;
          } else if (horasPorCertificado < 24) {
            frecuenciaGeneracion = `${Math.round(horasPorCertificado * 10) / 10} horas`;
          } else {
            frecuenciaGeneracion = `${Math.round(horasPorCertificado / 24 * 10) / 10} días`;
          }
        }
      }
    } else if (listadoData.pagination.total > 0) {
      // Si no hay filtro de fechas, calcular basado en todos los certificados
      // Asumimos que el primer certificado es el más antiguo
      if (listadoData.data.length > 0) {
        const certificadosOrdenados = [...listadoData.data].sort((a, b) => 
          new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime()
        );
        const fechaMasAntigua = new Date(certificadosOrdenados[0].generated_at);
        const diasDiferencia = Math.ceil((now.getTime() - fechaMasAntigua.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diasDiferencia > 0) {
          promedioPorDia = listadoData.pagination.total / diasDiferencia;
          const horasPorCertificado = (diasDiferencia * 24) / listadoData.pagination.total;
          
          if (horasPorCertificado < 1) {
            frecuenciaGeneracion = `${Math.round(horasPorCertificado * 60)} minutos`;
          } else if (horasPorCertificado < 24) {
            frecuenciaGeneracion = `${Math.round(horasPorCertificado * 10) / 10} horas`;
          } else {
            frecuenciaGeneracion = `${Math.round(horasPorCertificado / 24 * 10) / 10} días`;
          }
        }
      }
    }

    // Calcular tendencia (comparación mes actual vs anterior)
    const tendencia = certificadosMesAnterior > 0
      ? ((certificadosMesActual - certificadosMesAnterior) / certificadosMesAnterior) * 100
      : 0;

    return {
      totalFiltrados: listadoData.pagination.total,
      certificadosMesActual,
      certificadosMesAnterior,
      certificadosHoy,
      promedioPorDia: Math.round(promedioPorDia * 10) / 10,
      frecuenciaGeneracion,
      tendencia: Math.round(tendencia * 10) / 10,
      currentPage: listadoData.pagination.current_page,
      lastPage: listadoData.pagination.last_page,
      showing: `${listadoData.pagination.from} - ${listadoData.pagination.to}`,
      perPage: filters.per_page || 15,
    };
  };

  const metrics = calculateMetrics();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary-prosalud" />
            Certificados de Convenio
          </DialogTitle>
          <DialogDescription>
            Consulte el listado completo de certificados generados con opciones de filtrado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Métricas */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-primary-prosalud">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Total (Filtros Aplicados)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary-prosalud">{metrics.totalFiltrados.toLocaleString()}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {filters.documento || filters.consecutivo || filters.fecha_desde || filters.fecha_hasta
                      ? 'Según filtros aplicados'
                      : 'Todos los certificados'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Este Mes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{metrics.certificadosMesActual.toLocaleString()}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {metrics.tendencia !== 0 && (
                      <>
                        {metrics.tendencia > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                        <p className={`text-xs ${metrics.tendencia > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {metrics.tendencia > 0 ? '+' : ''}{metrics.tendencia}% vs mes anterior
                        </p>
                      </>
                    )}
                    {metrics.tendencia === 0 && metrics.certificadosMesAnterior > 0 && (
                      <p className="text-xs text-gray-500">Sin cambios</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Hoy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{metrics.certificadosHoy.toLocaleString()}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Generados en el día de hoy
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Frecuencia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{metrics.frecuenciaGeneracion}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.promedioPorDia > 0 
                      ? `Promedio: ${metrics.promedioPorDia} por día`
                      : 'Cada certificado generado'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-documento">Documento</Label>
                  <Input
                    id="filter-documento"
                    type="text"
                    value={documentoFilter}
                    onChange={(e) => setDocumentoFilter(e.target.value)}
                    placeholder="Buscar por documento"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-consecutivo">Consecutivo</Label>
                  <Input
                    id="filter-consecutivo"
                    type="text"
                    value={consecutivoFilter}
                    onChange={(e) => setConsecutivoFilter(e.target.value)}
                    placeholder="Buscar por consecutivo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-fecha-desde">Fecha Desde</Label>
                  <Input
                    id="filter-fecha-desde"
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-fecha-hasta">Fecha Hasta</Label>
                  <Input
                    id="filter-fecha-hasta"
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    min={fechaDesde || undefined}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  onClick={handleApplyFilters}
                  className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Aplicar Filtros
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearFilters}
                >
                  Limpiar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Certificados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Listado de Certificados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingListado ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-prosalud" />
                </div>
              ) : listadoData?.success ? (
                <>
                  {listadoData.data.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No se encontraron certificados con los filtros aplicados.
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Documento</TableHead>
                              <TableHead>Consecutivo</TableHead>
                              <TableHead>Fecha de Generación</TableHead>
                              <TableHead>Estado URL</TableHead>
                              <TableHead>Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {listadoData.data.map((certificado: CertificadoListItem) => {
                              const urlExpired = isUrlExpired(certificado.url_expires_at);
                              const hasUrl = !!certificado.pdf_url;
                              
                              return (
                                <TableRow key={certificado.id}>
                                  <TableCell className="font-medium">{certificado.id}</TableCell>
                                  <TableCell>{certificado.document_number}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{certificado.consecutivo}</Badge>
                                  </TableCell>
                                  <TableCell>{certificado.generated_at_formatted}</TableCell>
                                  <TableCell>
                                    {hasUrl && !urlExpired ? (
                                      <Badge className="bg-green-100 text-green-800 border-green-200">
                                        Disponible
                                      </Badge>
                                    ) : hasUrl && urlExpired ? (
                                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                        Expirada
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                                        No disponible
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenPdf(certificado)}
                                      disabled={loadingPdf === certificado.id}
                                      className="text-primary-prosalud hover:text-primary-prosalud-dark"
                                    >
                                      {loadingPdf === certificado.id ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                          Cargando...
                                        </>
                                      ) : (
                                        <>
                                          <ExternalLink className="h-4 w-4 mr-1" />
                                          Ver PDF
                                        </>
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="mt-4">
                        <DataPagination
                          currentPage={listadoData.pagination.current_page}
                          totalPages={listadoData.pagination.last_page}
                          totalItems={listadoData.pagination.total}
                          itemsPerPage={listadoData.pagination.per_page}
                          onPageChange={handlePageChange}
                          onItemsPerPageChange={handleItemsPerPageChange}
                        />
                      </div>
                    </>
                  )}
                </>
              ) : listadoData && !listadoData.success ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{(listadoData as { success: false; message: string }).message}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VerificarCertificadoModal;
