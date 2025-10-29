import { useState, useEffect, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Vote, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import type { AuditFilters, Vote as VoteType, StatisticsFilters, StatisticsResponse } from "@/types/votaciones";

export default function AdminVotacionesPage() {
  const [auditFilters, setAuditFilters] = useState<Omit<AuditFilters, 'page' | 'per_page'>>({});
  const [statisticsFilters, setStatisticsFilters] = useState<StatisticsFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

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

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Votaciones Asamblea</h1>
          <p className="text-muted-foreground">
            Estadísticas y auditoría del proceso de votación a asamblea general
          </p>
        </div>

        <Tabs defaultValue="statistics" className="space-y-6">
          <TabsList>
            <TabsTrigger value="statistics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Estadísticas
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <Vote className="h-4 w-4" />
              Auditoría
            </TabsTrigger>
          </TabsList>

          <TabsContent value="statistics" className="space-y-6 mt-6">
            <StatisticsFiltersComponent 
              onFilterChange={handleStatisticsFilterChange}
              currentFilters={statisticsFilters}
              isLoading={statsLoading || statsFetching}
            />
            
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

          <TabsContent value="audit" className="space-y-6 mt-6">
            <AuditFiltersComponent 
              onFilterChange={handleAuditFilterChange}
              isLoading={auditLoading}
            />

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
        </Tabs>
      </div>
    </AdminLayout>
  );
}
