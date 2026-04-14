import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { StatisticsCards } from "@/components/admin/votaciones/StatisticsCards";
import { VotesByCandidateChart } from "@/components/admin/votaciones/VotesByCandidate";
import { VotesByHospitalChart } from "@/components/admin/votaciones/VotesByHospital";
import { AuditFiltersComponent } from "@/components/admin/votaciones/AuditFilters";
import { StatisticsFiltersComponent } from "@/components/admin/votaciones/StatisticsFilters";
import { AuditTrailTable } from "@/components/admin/votaciones/AuditTrailTable";
import { CandidatesTable } from "@/components/admin/votaciones/CandidatesTable";
import { votacionesApi } from "@/services/votacionesApi";
import { generateVotacionesExcelReport } from "@/components/admin/votaciones/utils/votacionesExcelGenerator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Vote, BarChart3, Upload, Download, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { AuditFilters, Vote as VoteType, StatisticsFilters, StatisticsResponse } from "@/types/votaciones";
import { logger } from "@/utils/logger";
import { adminExcelFilesService, type AdminExcelFileType } from "@/services/adminExcelFilesService";
import { usePermissions } from "@/hooks/usePermissions";

type VotacionesUploadType = "activos" | "delegados";

interface VotacionesUploadConfig {
  buttonLabel: string;
  uploadingLabel: string;
  dialogTitle: string;
  description: string;
  storageName: string;
  maxSizeMB: number;
  successFallback: string;
  errorFallback: string;
  toastDescription?: (response: any) => string | undefined;
}

const votacionesUploadConfigs: Record<VotacionesUploadType, VotacionesUploadConfig & { serviceType: AdminExcelFileType }> = {
  activos: {
    serviceType: "afiliados",
    buttonLabel: "Actualizar Activos",
    uploadingLabel: "Actualizando...",
    dialogTitle: "Confirmar actualización de afiliados activos",
    description:
      "Actualizarás el listado de afiliados activos habilitados para votar. La acción reemplaza el archivo anterior y los cambios se reflejan inmediatamente.",
    storageName: "PROSANET_INFORMACION_AFILIADOS.xlsx",
    maxSizeMB: 10,
    successFallback: "Archivo de afiliados actualizado exitosamente.",
    errorFallback: "No fue posible actualizar el archivo de afiliados.",
    toastDescription: (response) =>
      response?.rows_count ? `Se procesaron ${response.rows_count} registros.` : undefined,
  },
  delegados: {
    serviceType: "delegados",
    buttonLabel: "Actualizar Candidatos",
    uploadingLabel: "Actualizando...",
    dialogTitle: "Confirmar actualización de candidatos",
    description:
      "Se reemplazará el archivo maestro de candidatos (delegados). Esta acción sobrescribe el archivo anterior y los cambios se reflejan inmediatamente.",
    storageName: "DELEGADOS.xlsx",
    maxSizeMB: 5,
    successFallback: "Archivo de candidatos actualizado exitosamente.",
    errorFallback: "No fue posible actualizar el archivo de candidatos.",
  },
};

export default function AdminVotacionesPage() {
  const { can } = usePermissions();

  const showBackToAssemblyHub = useMemo(
    () =>
      (can("votes.statistics.view") || can("votes.audit.view")) &&
      (can("assembly.questions.manage") || can("assembly.quorum.manage")),
    [can]
  );
  const [auditFilters, setAuditFilters] = useState<Omit<AuditFilters, 'page' | 'per_page'>>({});
  const [statisticsFilters, setStatisticsFilters] = useState<StatisticsFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [showUploadConfirmDialog, setShowUploadConfirmDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadContext, setUploadContext] = useState<VotacionesUploadType | null>(null);
  const [uploadingType, setUploadingType] = useState<VotacionesUploadType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Query para estadísticas usando el endpoint especializado de hospital-statistics
  const { data: statsData, isLoading: statsLoading, isFetching: statsFetching, error: statsError } = useQuery<StatisticsResponse>({
    queryKey: ['votaciones-hospital-statistics', statisticsFilters.hospital],
    queryFn: () => votacionesApi.getHospitalStatistics(statisticsFilters.hospital),
    staleTime: 0, // Siempre considerar los datos como obsoletos para refrescar cuando cambian los filtros
    refetchOnWindowFocus: false, // Evitar refetch automático al enfocar la ventana
  });

  // Query para auditoría - cargar todos los registros una vez
  const { data: auditData, isLoading: auditLoading, error: auditError } = useQuery({
    queryKey: ['votaciones-audit-all'],
    queryFn: () => votacionesApi.getAuditTrail(),
  });

  useEffect(() => {
    if (statsError) {
      toast.error("Error al cargar estadísticas de votación");
    }
    if (auditError) {
      toast.error("Error al cargar auditoría de votación");
    }
  }, [statsError, auditError]);

  const handleAuditFilterChange = (filters: Omit<AuditFilters, 'page' | 'per_page'>) => {
    setAuditFilters(filters);
    setCurrentPage(1); // Reset a la primera página cuando cambian los filtros
  };

  const handleStatisticsFilterChange = (filters: StatisticsFilters) => {
    // Solo mantener el filtro de hospital ya que el endpoint solo acepta ese parámetro
    const cleanFilters: StatisticsFilters = {};
    if (filters.hospital) cleanFilters.hospital = filters.hospital;
    setStatisticsFilters(cleanFilters);
  };

  // Aplicar filtros en el frontend
  const filteredVotes = useMemo(() => {
    if (!auditData?.votes) return [];
    
    return auditData.votes.filter((vote: VoteType) => {
      // Filtro por fecha inicio
      if (auditFilters.start_date) {
        const voteDate = new Date(vote.vote_timestamp);
        const startDate = new Date(auditFilters.start_date);
        startDate.setHours(0, 0, 0, 0);
        if (voteDate < startDate) return false;
      }

      // Filtro por fecha fin
      if (auditFilters.end_date) {
        const voteDate = new Date(vote.vote_timestamp);
        const endDate = new Date(auditFilters.end_date);
        endDate.setHours(23, 59, 59, 999);
        if (voteDate > endDate) return false;
      }

      // Filtro por hospital
      if (auditFilters.hospital) {
        if (vote.voter.hospital !== auditFilters.hospital) return false;
      }

      // Filtro por tipo de documento
      if (auditFilters.voter_document_type) {
        if (vote.voter.document_type !== auditFilters.voter_document_type) return false;
      }

      // Filtro por número de documento
      if (auditFilters.voter_document_number) {
        if (!vote.voter.document_number.includes(auditFilters.voter_document_number)) return false;
      }

      // Filtro por candidato (si hay información de candidato en el voto)
      // Nota: Esto podría necesitar ajuste dependiendo de la estructura real de los datos

      return true;
    });
  }, [auditData?.votes, auditFilters]);

  // Paginación en el frontend
  const paginatedVotes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredVotes.slice(startIndex, endIndex);
  }, [filteredVotes, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredVotes.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleExportStatistics = () => {
    try {
      if (!statsData?.statistics) {
        toast.error("No hay datos de estadísticas para exportar");
        return;
      }

      if (!auditData?.votes) {
        toast.error("No hay datos de auditoría para exportar");
        return;
      }

      const wb = generateVotacionesExcelReport(
        statsData.statistics,
        auditData.votes,
        statisticsFilters.hospital
      );

      const fileName = `Reporte_Votaciones_Asamblea_ProSalud_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success("Reporte exportado exitosamente");
    } catch (error) {
      logger.error("Error al exportar reporte de votaciones", error instanceof Error ? error.message : error);
      toast.error("Error al exportar reporte");
    }
  };

  const handleExportAudit = () => {
    try {
      if (!statsData?.statistics) {
        toast.error("No hay datos de estadísticas para exportar");
        return;
      }

      if (!auditData?.votes) {
        toast.error("No hay datos de auditoría para exportar");
        return;
      }

      const wb = generateVotacionesExcelReport(
        statsData.statistics,
        filteredVotes.length > 0 ? filteredVotes : auditData.votes,
        auditFilters.hospital
      );

      const fileName = `Reporte_Auditoria_Votaciones_ProSalud_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success("Reporte exportado exitosamente");
    } catch (error) {
      logger.error("Error al exportar reporte de auditoría de votaciones", error instanceof Error ? error.message : error);
      toast.error("Error al exportar reporte");
    }
  };

  const resetUploadState = ({ preserveContext = false }: { preserveContext?: boolean } = {}) => {
    if (selectedFileUrl) {
      URL.revokeObjectURL(selectedFileUrl);
    }
    setSelectedFileUrl(null);
    setSelectedFile(null);

    if (!preserveContext) {
      setUploadContext(null);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadDialogChange = (open: boolean) => {
    setShowUploadConfirmDialog(open);

    if (!open && !isUploading) {
      resetUploadState();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!uploadContext) {
      toast.error("Selecciona una acción de carga antes de elegir un archivo.");
      resetUploadState();
      return;
    }

    const config = votacionesUploadConfigs[uploadContext];

    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    const allowedExtensions = [".xlsx", ".xls"];
    if (!allowedExtensions.includes(extension)) {
      toast.error("Por favor selecciona un archivo Excel (.xlsx o .xls).");
      resetUploadState({ preserveContext: true });
      return;
    }

    const maxSizeBytes = config.maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`El archivo supera el tamaño máximo permitido (${config.maxSizeMB} MB).`);
      resetUploadState({ preserveContext: true });
      return;
    }

    if (selectedFileUrl) {
      URL.revokeObjectURL(selectedFileUrl);
    }

    const fileUrl = URL.createObjectURL(file);
    setSelectedFileUrl(fileUrl);
    setSelectedFile(file);
    setShowUploadConfirmDialog(true);
  };

  const handleUploadConfirm = async () => {
    if (!selectedFile || !uploadContext) return;

    const config = votacionesUploadConfigs[uploadContext];

    setIsUploading(true);
    setUploadingType(uploadContext);
    setShowUploadConfirmDialog(false);

    try {
      const response = await adminExcelFilesService.uploadExcelFile(config.serviceType, selectedFile);

      if (response.success) {
        toast.success(response.message || config.successFallback, {
          description: config.toastDescription?.(response),
        });
      } else {
        toast.error(response.message || config.errorFallback);
      }
    } catch (error: any) {
      logger.error("Error al cargar archivo de votaciones", error?.message || error);

      const backendMessage: string | undefined = error?.response?.data?.message;
      const statusCode: number | undefined = error?.response?.status;

      let errorMessage = backendMessage || config.errorFallback;

      if (statusCode === 422) {
        const lowerMessage = backendMessage?.toLowerCase() ?? "";
        if (lowerMessage.includes("formato")) {
          errorMessage = "El archivo debe ser un Excel válido (.xlsx o .xls).";
        } else if (lowerMessage.includes("tamaño") || lowerMessage.includes("tamano") || lowerMessage.includes("size")) {
          errorMessage = `El archivo supera el tamaño máximo permitido (${config.maxSizeMB} MB).`;
        } else if (lowerMessage.includes("vacío") || lowerMessage.includes("vacio")) {
          errorMessage = "El archivo Excel parece estar vacío.";
        }
      } else if (statusCode === 500) {
        errorMessage = backendMessage || "El servidor reportó un error al guardar el archivo.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadingType(null);
      resetUploadState();
    }
  };

  const handleUploadCancel = () => {
    setShowUploadConfirmDialog(false);
    resetUploadState();
  };

  const handleUploadButtonClick = (type: VotacionesUploadType) => {
    if (isUploading) return;
    resetUploadState({ preserveContext: false });
    setUploadContext(type);
    fileInputRef.current?.click();
  };

  const renderUploadButton = (type: VotacionesUploadType) => {
    const config = votacionesUploadConfigs[type];
    const isTypeLoading = isUploading && uploadingType === type;

    return (
      <Button
        key={type}
        onClick={() => handleUploadButtonClick(type)}
        disabled={isUploading}
        className="gap-2"
        variant={type === "activos" ? "secondary" : "default"}
      >
        <Upload className="h-4 w-4" />
        {isTypeLoading ? config.uploadingLabel : config.buttonLabel}
      </Button>
    );
  };

  const activeUploadConfig = uploadContext ? votacionesUploadConfigs[uploadContext] : null;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="space-y-2">
          {showBackToAssemblyHub && (
            <Button variant="ghost" size="sm" className="-ml-2 h-auto gap-2 px-2 text-slate-600 hover:text-slate-900" asChild>
              <Link to="/admin/asamblea-general">
                <ArrowLeft className="h-4 w-4 shrink-0" />
                Asamblea General
              </Link>
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Votaciones Asamblea</h1>
            <p className="text-muted-foreground">
              Estadísticas y auditoría del proceso de votación a asamblea general
            </p>
          </div>
        </div>

        <Tabs defaultValue={can("votes.statistics.view") ? "statistics" : "audit"} className="space-y-6">
          <TabsList>
            {can("votes.statistics.view") && (
              <TabsTrigger value="statistics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Estadísticas
              </TabsTrigger>
            )}
            {can("votes.audit.view") && (
              <TabsTrigger value="audit" className="gap-2">
                <Vote className="h-4 w-4" />
                Auditoría
              </TabsTrigger>
            )}
          </TabsList>

          {can("votes.statistics.view") && (
          <TabsContent value="statistics" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Estadísticas de Votación</h2>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {renderUploadButton("activos")}
                  {renderUploadButton("delegados")}
                  <Button
                    onClick={handleExportStatistics}
                    disabled={!statsData || statsLoading || statsFetching || !auditData}
                    className="gap-2"
                    variant="default"
                  >
                    <Download className="h-4 w-4" />
                    Exportar Reporte
                  </Button>
                </div>
              </div>
              <StatisticsFiltersComponent 
                onFilterChange={handleStatisticsFilterChange}
                currentFilters={statisticsFilters}
                isLoading={statsLoading || statsFetching}
              />
            </div>
            
            {statsData ? (
              <>
                {/* Tabla primero como se solicita */}
                <CandidatesTable
                  data={statsData.statistics?.votes_by_candidate || []}
                  isLoading={statsLoading || statsFetching}
                  currentHospital={statisticsFilters.hospital}
                />

                {/* Cards de estadísticas */}
                <StatisticsCards 
                  statistics={statsData.statistics} 
                  isLoading={statsLoading || statsFetching}
                />

                {/* Gráficas - importante especialmente cuando se filtra por hospital */}
                <div className="grid gap-6 md:grid-cols-2">
                  <VotesByCandidateChart 
                    data={statsData.statistics?.votes_by_candidate || []}
                    isLoading={statsLoading || statsFetching}
                    currentHospital={statisticsFilters.hospital}
                    hospitalsData={statsData.statistics?.votes_by_hospital || []}
                  />
                  <VotesByHospitalChart 
                    data={statsData.statistics?.votes_by_hospital || []}
                    isLoading={statsLoading || statsFetching}
                  />
                </div>
              </>
            ) : (
              !statsLoading && (
                <>
                  {/* Loading state: tabla primero */}
                  <div className="h-[400px] bg-muted rounded animate-pulse" />
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="h-24 bg-muted rounded animate-pulse" />
                    <div className="h-24 bg-muted rounded animate-pulse" />
                    <div className="h-24 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="h-[300px] bg-muted rounded animate-pulse" />
                    <div className="h-[300px] bg-muted rounded animate-pulse" />
                  </div>
                </>
              )
            )}
          </TabsContent>
          )}

          {can("votes.audit.view") && (
          <TabsContent value="audit" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Auditoría de Votación</h2>
                <Button
                  onClick={handleExportAudit}
                  disabled={!auditData || auditLoading || !statsData}
                  className="gap-2"
                  variant="default"
                >
                  <Download className="h-4 w-4" />
                  Exportar Reporte
                </Button>
              </div>
              <AuditFiltersComponent 
                onFilterChange={handleAuditFilterChange}
                isLoading={auditLoading}
              />
            </div>

            {auditData && (
              <AuditTrailTable
                votes={paginatedVotes}
                totalVotes={filteredVotes.length}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                isLoading={auditLoading}
              />
            )}
          </TabsContent>
          )}
        </Tabs>

        <Dialog open={showUploadConfirmDialog} onOpenChange={handleUploadDialogChange}>
          <DialogContent
            overlayClassName="fixed inset-0 z-50 bg-black/40 supports-[backdrop-filter]:backdrop-blur-sm dark:bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            className="sm:max-w-xl gap-6 bg-white"
          >
            {activeUploadConfig && (
              <>
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-2xl font-semibold text-slate-900">
                    {activeUploadConfig.dialogTitle}
                  </DialogTitle>
                </DialogHeader>
                <DialogDescription asChild>
                  <div className="space-y-4 text-left">
                    <p className="text-sm text-muted-foreground leading-6">
                      {activeUploadConfig.description}
                    </p>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">Archivo seleccionado</p>
                      <p className="text-sm text-slate-700">
                        {selectedFile?.name ?? "Sin archivo"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : "0 MB"}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Se almacenará como <span className="font-semibold">{activeUploadConfig.storageName}</span>.
                        Tamaño máximo permitido: {activeUploadConfig.maxSizeMB} MB.
                      </p>
                      {selectedFile && selectedFileUrl && (
                        <Button asChild variant="outline" size="sm" className="mt-3">
                          <a href={selectedFileUrl} download={selectedFile.name} className="flex items-center">
                            <Download className="mr-2 h-4 w-4" />
                            Descargar archivo seleccionado
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogDescription>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={handleUploadCancel} disabled={isUploading}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUploadConfirm} disabled={isUploading}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {isUploading ? "Subiendo..." : "Confirmar"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </AdminLayout>
  );
}
