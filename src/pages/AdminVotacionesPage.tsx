import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Vote, BarChart3, Upload, Download, CheckCircle2, ArrowLeft, Loader2, PlayCircle, Ban, Eye } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { AuditFilters, CandidateVotingPeriod, Vote as VoteType, StatisticsFilters, StatisticsResponse } from "@/types/votaciones";
import { logger } from "@/utils/logger";
import { adminExcelFilesService } from "@/services/adminExcelFilesService";
import { usePermissions } from "@/hooks/usePermissions";
import { FILE_PERMISSIONS } from "@/config/permissions";

interface DelegadosCandidatosUploadConfig {
  serviceType: "delegados";
  buttonLabel: string;
  uploadingLabel: string;
  dialogTitle: string;
  description: string;
  storageName: string;
  maxSizeMB: number;
  successFallback: string;
  errorFallback: string;
}

const delegadosCandidatosUploadConfig: DelegadosCandidatosUploadConfig = {
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
};

const delegadosPhotosZipConfig = {
  buttonLabel: "Actualizar fotos candidatos",
  uploadingLabel: "Subiendo fotos...",
  maxSizeMB: 30,
  successFallback: "Fotos de candidatos actualizadas exitosamente.",
  errorFallback: "No fue posible actualizar las fotos de candidatos.",
};

export default function AdminVotacionesPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();

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
  const [isUploadingCandidatePhotos, setIsUploadingCandidatePhotos] = useState(false);
  const [delegadosUploadIntent, setDelegadosUploadIntent] = useState(false);
  const [isDownloadingCandidatos, setIsDownloadingCandidatos] = useState(false);
  const [selectedPeriodKeyForManagement, setSelectedPeriodKeyForManagement] = useState<string>("active");
  const [isPeriodActionLoading, setIsPeriodActionLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photosZipInputRef = useRef<HTMLInputElement>(null);

  const {
    data: periodsData,
    isLoading: periodsLoading,
  } = useQuery({
    queryKey: ['candidate-voting-periods'],
    queryFn: () => votacionesApi.getCandidateVotingPeriods(),
  });

  const candidateVotingPeriods = useMemo<CandidateVotingPeriod[]>(
    () => periodsData?.data ?? [],
    [periodsData?.data]
  );

  const activeCandidateVotingPeriod = useMemo(
    () => candidateVotingPeriods.find((period) => period.is_active) ?? null,
    [candidateVotingPeriods]
  );

  // Query para estadísticas usando el endpoint especializado de hospital-statistics
  const { data: statsData, isLoading: statsLoading, isFetching: statsFetching, error: statsError } = useQuery<StatisticsResponse>({
    queryKey: ['votaciones-hospital-statistics', statisticsFilters.hospital, statisticsFilters.candidate_election_key],
    queryFn: () =>
      votacionesApi.getHospitalStatisticsByElection(
        statisticsFilters.hospital,
        statisticsFilters.candidate_election_key
      ),
    staleTime: 0, // Siempre considerar los datos como obsoletos para refrescar cuando cambian los filtros
    refetchOnWindowFocus: false, // Evitar refetch automático al enfocar la ventana
  });

  // Query para auditoría - cargar todos los registros una vez
  const { data: auditData, isLoading: auditLoading, error: auditError } = useQuery({
    queryKey: ['votaciones-audit-all', auditFilters.candidate_election_key],
    queryFn: () => votacionesApi.getAuditTrail({ candidate_election_key: auditFilters.candidate_election_key }),
  });

  useEffect(() => {
    if (statsError) {
      toast.error("Error al cargar estadísticas de votación");
    }
    if (auditError) {
      toast.error("Error al cargar auditoría de votación");
    }
  }, [statsError, auditError]);

  /**
   * Solo fija el periodo seleccionado cuando aún no hay uno válido (estado inicial "active"
   * o clave que ya no existe). Si el usuario elige otro periodo en el desplegable, no lo
   * sobrescribimos al tener un periodo activo.
   */
  useEffect(() => {
    if (candidateVotingPeriods.length === 0) {
      return;
    }
    const keys = new Set(candidateVotingPeriods.map((p) => p.election_key));
    const needsDefault =
      selectedPeriodKeyForManagement === "active" || !keys.has(selectedPeriodKeyForManagement);
    if (needsDefault) {
      setSelectedPeriodKeyForManagement(
        activeCandidateVotingPeriod?.election_key ?? candidateVotingPeriods[0].election_key
      );
    }
  }, [candidateVotingPeriods, activeCandidateVotingPeriod, selectedPeriodKeyForManagement]);

  /** Cuando el usuario cambia el select de periodo, sincroniza los filtros de datos. */
  const handlePeriodSelectChange = (electionKey: string) => {
    setSelectedPeriodKeyForManagement(electionKey);
    const activeKey = activeCandidateVotingPeriod?.election_key;
    const filterKey = electionKey === activeKey ? undefined : electionKey;
    setStatisticsFilters((prev) => ({ ...prev, candidate_election_key: filterKey }));
    setAuditFilters((prev) => ({ ...prev, candidate_election_key: filterKey }));
    setCurrentPage(1);
  };

  const handleAuditFilterChange = (filters: Omit<AuditFilters, 'page' | 'per_page'>) => {
    setAuditFilters(filters);
    setCurrentPage(1); // Reset a la primera página cuando cambian los filtros
  };

  const handleStatisticsFilterChange = (filters: StatisticsFilters) => {
    // Endpoint de estadísticas acepta hospital + periodo
    const cleanFilters: StatisticsFilters = {};
    if (filters.hospital) cleanFilters.hospital = filters.hospital;
    if (filters.candidate_election_key) cleanFilters.candidate_election_key = filters.candidate_election_key;
    setStatisticsFilters(cleanFilters);
  };

  const refreshVotingQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['candidate-voting-periods'] }),
      queryClient.invalidateQueries({ queryKey: ['votaciones-hospital-statistics'] }),
      queryClient.invalidateQueries({ queryKey: ['votaciones-audit-all'] }),
    ]);
  };

  const handleCreatePeriod = async () => {
    const now = new Date();
    const semester = now.getMonth() < 6 ? "1" : "2";
    const defaultPeriodName = `${now.getFullYear()}-${semester}`;

    const name = window.prompt(
      "Nombre del periodo.\n\nSi ese periodo ya aparece en la lista de arriba, no lo cree de nuevo: selecciónelo y use «Activar periodo».",
      defaultPeriodName
    );
    if (!name || name.trim() === "") {
      return;
    }

    const activate = window.confirm("¿Activar este periodo inmediatamente?");
    setIsPeriodActionLoading(true);
    try {
      const response = await votacionesApi.createCandidateVotingPeriod({
        name: name.trim(),
        activate,
      });
      toast.success(response.message || "Periodo creado correctamente.");
      await refreshVotingQueries();
    } catch (error: any) {
      logger.error("Error al crear periodo de votación", error instanceof Error ? error.message : error);
      const data = error?.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
      const fieldMessages = data?.errors ? Object.values(data.errors).flat().filter(Boolean) : [];
      const detail =
        fieldMessages.length > 0
          ? fieldMessages.join(" ")
          : data?.message;
      toast.error(detail || "No fue posible crear el periodo.");
    } finally {
      setIsPeriodActionLoading(false);
    }
  };

  const handleActivateSelectedPeriod = async () => {
    const target = candidateVotingPeriods.find((period) => period.election_key === selectedPeriodKeyForManagement);
    if (!target) {
      toast.error("Seleccione un periodo válido para activar.");
      return;
    }

    setIsPeriodActionLoading(true);
    try {
      const response = await votacionesApi.activateCandidateVotingPeriod(target.id);
      toast.success(response.message || "Periodo activado correctamente.");
      await refreshVotingQueries();
    } catch (error: unknown) {
      logger.error("Error al activar periodo de votación", error instanceof Error ? error.message : error);
      const data = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errBody = data?.response?.data;
      const fromFields = errBody?.errors ? Object.values(errBody.errors).flat().filter(Boolean).join(" ") : "";
      toast.error(fromFields || errBody?.message || "No fue posible activar el periodo.");
    } finally {
      setIsPeriodActionLoading(false);
    }
  };

  const handleCloseActivePeriod = async () => {
    if (!activeCandidateVotingPeriod) {
      toast.error("No hay un periodo activo para cerrar.");
      return;
    }

    const confirmed = window.confirm(
      `¿Cerrar el periodo activo "${activeCandidateVotingPeriod.name}"? Esta acción desactiva la elección actual.`
    );
    if (!confirmed) {
      return;
    }

    setIsPeriodActionLoading(true);
    try {
      const response = await votacionesApi.closeCandidateVotingPeriod(activeCandidateVotingPeriod.id);
      toast.success(response.message || "Periodo cerrado correctamente.");
      await refreshVotingQueries();
    } catch (error: unknown) {
      logger.error("Error al cerrar periodo de votación", error instanceof Error ? error.message : error);
      const data = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errBody = data?.response?.data;
      const fromFields = errBody?.errors ? Object.values(errBody.errors).flat().filter(Boolean).join(" ") : "";
      toast.error(fromFields || errBody?.message || "No fue posible cerrar el periodo.");
    } finally {
      setIsPeriodActionLoading(false);
    }
  };

  // Aplicar filtros en el frontend
  const filteredVotes = useMemo(() => {
    if (!auditData?.votes) return [];
    
    return auditData.votes.filter((vote: VoteType) => {
      if (auditFilters.candidate_election_key) {
        if (vote.candidate_election_key !== auditFilters.candidate_election_key) return false;
      }

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

      const periodSuffix = statsData.selected_candidate_election_key
        ? `_${statsData.selected_candidate_election_key}`
        : "_sin_periodo";
      const fileName = `Reporte_Votaciones_Asamblea_ProSalud${periodSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
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

      const periodSuffix = auditData.selected_candidate_election_key
        ? `_${auditData.selected_candidate_election_key}`
        : "_sin_periodo";
      const fileName = `Reporte_Auditoria_Votaciones_ProSalud${periodSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      setDelegadosUploadIntent(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (photosZipInputRef.current) {
      photosZipInputRef.current.value = "";
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

    if (!delegadosUploadIntent) {
      toast.error("Use el botón «Actualizar Candidatos» para elegir un archivo.");
      resetUploadState();
      return;
    }

    const config = delegadosCandidatosUploadConfig;

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
    if (!selectedFile || !delegadosUploadIntent) return;

    const config = delegadosCandidatosUploadConfig;

    setIsUploading(true);
    setShowUploadConfirmDialog(false);

    try {
      const response = await adminExcelFilesService.uploadExcelFile(config.serviceType, selectedFile);

      if (response.success) {
        toast.success(response.message || config.successFallback);
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
      resetUploadState();
    }
  };

  const handleUploadCancel = () => {
    setShowUploadConfirmDialog(false);
    resetUploadState();
  };

  const handleDelegadosUploadButtonClick = () => {
    if (isUploading || isDownloadingCandidatos || isUploadingCandidatePhotos) return;
    resetUploadState({ preserveContext: false });
    setDelegadosUploadIntent(true);
    fileInputRef.current?.click();
  };

  const handleCandidatePhotosUploadButtonClick = () => {
    if (isUploading || isDownloadingCandidatos || isUploadingCandidatePhotos) return;
    photosZipInputRef.current?.click();
  };

  const handleCandidatePhotosZipSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (extension !== ".zip") {
      toast.error("Por favor selecciona un archivo .zip con las fotos.");
      if (photosZipInputRef.current) {
        photosZipInputRef.current.value = "";
      }
      return;
    }

    const maxSizeBytes = delegadosPhotosZipConfig.maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`El archivo supera el tamaño máximo permitido (${delegadosPhotosZipConfig.maxSizeMB} MB).`);
      if (photosZipInputRef.current) {
        photosZipInputRef.current.value = "";
      }
      return;
    }

    try {
      setIsUploadingCandidatePhotos(true);
      const response = await adminExcelFilesService.uploadDelegadosPhotosZip(file);
      toast.success(response.message || delegadosPhotosZipConfig.successFallback, {
        description: response.stored_photos_count
          ? `Se actualizaron ${response.stored_photos_count} fotos en el bucket público.`
          : undefined,
      });
    } catch (error: any) {
      logger.error("Error al subir ZIP de fotos de candidatos", error?.message || error);

      const backendMessage: string | undefined = error?.response?.data?.message;
      const statusCode: number | undefined = error?.response?.status;
      let errorMessage = backendMessage || delegadosPhotosZipConfig.errorFallback;

      if (statusCode === 422) {
        const lowerMessage = backendMessage?.toLowerCase() ?? "";
        if (lowerMessage.includes("zip")) {
          errorMessage = "El archivo debe ser un ZIP válido.";
        } else if (lowerMessage.includes("imágenes válidas") || lowerMessage.includes("validas")) {
          errorMessage = "El ZIP debe incluir imágenes .jpg, .jpeg o .png nombradas con la cédula del candidato.";
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsUploadingCandidatePhotos(false);
      if (photosZipInputRef.current) {
        photosZipInputRef.current.value = "";
      }
    }
  };

  const handleDownloadCandidatosArchivo = async () => {
    if (isDownloadingCandidatos || isUploading || isUploadingCandidatePhotos) return;
    try {
      setIsDownloadingCandidatos(true);
      const blob = await adminExcelFilesService.downloadFile("delegados");
      const filename = adminExcelFilesService.getDefaultFilename("delegados");
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Archivo de candidatos descargado");
    } catch (error) {
      logger.error("Error al descargar archivo de candidatos", error instanceof Error ? error.message : error);
      toast.error("No fue posible descargar el archivo de candidatos.");
    } finally {
      setIsDownloadingCandidatos(false);
    }
  };

  const activeUploadConfig = delegadosUploadIntent && selectedFile ? delegadosCandidatosUploadConfig : null;

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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Votaciones Asamblea</h1>
              <p className="text-muted-foreground">
                Estadísticas y auditoría del proceso de votación a asamblea general
              </p>
            </div>
          </div>
        </div>

        {(() => {
          const selectedPeriod = candidateVotingPeriods.find(
            (p) => p.election_key === selectedPeriodKeyForManagement
          ) ?? null;
          const isSelectedActive = selectedPeriod?.is_active ?? false;
          const isViewingNonActive =
            selectedPeriod !== null && !isSelectedActive;

          return (
            <div className="rounded-lg border bg-white shadow-sm">
              {/* Header */}
              <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">Periodos de votación de delegados</h2>
                  {isViewingNonActive ? (
                    <div className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                      <Eye className="h-3.5 w-3.5 shrink-0" />
                      Histórico: {selectedPeriod?.name}
                    </div>
                  ) : activeCandidateVotingPeriod ? (
                    <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Activo: {activeCandidateVotingPeriod.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Sin periodo activo
                    </Badge>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                {/* Select */}
                <Select
                  value={selectedPeriodKeyForManagement}
                  onValueChange={handlePeriodSelectChange}
                  disabled={periodsLoading || candidateVotingPeriods.length === 0 || isPeriodActionLoading}
                >
                  <SelectTrigger className="w-full sm:w-[260px]">
                    <SelectValue placeholder="Seleccione un periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidateVotingPeriods.map((period) => (
                      <SelectItem key={period.id} value={period.election_key}>
                        <span className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${period.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
                          />
                          {period.name}
                          {period.is_active && (
                            <span className="text-xs text-emerald-600">(activo)</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {!isSelectedActive && (
                    <Button
                      type="button"
                      variant="default"
                      onClick={handleActivateSelectedPeriod}
                      disabled={isPeriodActionLoading || candidateVotingPeriods.length === 0}
                      className="gap-2 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                      title="Activar el periodo seleccionado"
                    >
                      <PlayCircle className="h-4 w-4" aria-hidden />
                      Activar periodo
                    </Button>
                  )}
                  {isSelectedActive && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleCloseActivePeriod}
                      disabled={isPeriodActionLoading}
                      className="gap-2 shadow-sm"
                      title={`Cerrar el periodo activo "${activeCandidateVotingPeriod?.name}"`}
                    >
                      <Ban className="h-4 w-4" aria-hidden />
                      Cerrar activo
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreatePeriod}
                    disabled={isPeriodActionLoading}
                    className="gap-2"
                  >
                    + Nuevo periodo
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

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
                  <input
                    ref={photosZipInputRef}
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    onChange={handleCandidatePhotosZipSelect}
                    className="hidden"
                  />
                  {can(FILE_PERMISSIONS.delegados) && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        disabled={isUploading || isDownloadingCandidatos}
                        onClick={handleDownloadCandidatosArchivo}
                      >
                        {isDownloadingCandidatos ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            Descargando…
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            Descargar candidatos
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        className="gap-2"
                        disabled={isUploading || isDownloadingCandidatos || isUploadingCandidatePhotos}
                        onClick={handleCandidatePhotosUploadButtonClick}
                      >
                        {isUploadingCandidatePhotos ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            {delegadosPhotosZipConfig.uploadingLabel}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            {delegadosPhotosZipConfig.buttonLabel}
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleDelegadosUploadButtonClick}
                        disabled={isUploading || isDownloadingCandidatos || isUploadingCandidatePhotos}
                        className="gap-2"
                        variant="default"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploading ? delegadosCandidatosUploadConfig.uploadingLabel : delegadosCandidatosUploadConfig.buttonLabel}
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    onClick={handleExportStatistics}
                    disabled={!statsData || statsLoading || statsFetching || !auditData}
                    variant="default"
                    className="gap-2 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md focus-visible:ring-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
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
                periods={candidateVotingPeriods}
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
                  type="button"
                  onClick={handleExportAudit}
                  disabled={!auditData || auditLoading || !statsData}
                  variant="default"
                  className="gap-2 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md focus-visible:ring-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  <Download className="h-4 w-4" />
                  Exportar Reporte
                </Button>
              </div>
              <AuditFiltersComponent
                onFilterChange={handleAuditFilterChange}
                currentFilters={auditFilters}
                isLoading={auditLoading}
                periods={candidateVotingPeriods}
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
