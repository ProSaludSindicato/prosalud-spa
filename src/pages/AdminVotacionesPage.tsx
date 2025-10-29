import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { StatisticsCards } from "@/components/admin/votaciones/StatisticsCards";
import { VotesByCandidateChart } from "@/components/admin/votaciones/VotesByCandidate";
import { VotesByHospitalChart } from "@/components/admin/votaciones/VotesByHospital";
import { AuditFiltersComponent } from "@/components/admin/votaciones/AuditFilters";
import { AuditTrailTable } from "@/components/admin/votaciones/AuditTrailTable";
import { votacionesApi } from "@/services/votacionesApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Vote, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import type { AuditFilters } from "@/types/votaciones";

export default function AdminVotacionesPage() {
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({ page: 1, per_page: 50 });

  // Query para estadísticas generales
  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['votaciones-statistics'],
    queryFn: () => votacionesApi.getStatistics(),
  });

  // Query para auditoría
  const { data: auditData, isLoading: auditLoading, error: auditError } = useQuery({
    queryKey: ['votaciones-audit', auditFilters],
    queryFn: () => votacionesApi.getAuditTrail(auditFilters),
  });

  useEffect(() => {
    if (statsError) {
      toast.error("Error al cargar estadísticas de votación");
    }
    if (auditError) {
      toast.error("Error al cargar auditoría de votación");
    }
  }, [statsError, auditError]);

  const handleFilterChange = (filters: AuditFilters) => {
    setAuditFilters({ ...filters, page: 1, per_page: 50 });
  };

  const handlePageChange = (page: number) => {
    setAuditFilters(prev => ({ ...prev, page }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
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

          <TabsContent value="statistics" className="space-y-6">
            {statsData && (
              <>
                <StatisticsCards 
                  statistics={statsData.statistics} 
                  isLoading={statsLoading}
                />

                <div className="grid gap-6 md:grid-cols-2">
                  <VotesByCandidateChart 
                    data={statsData.statistics.votes_by_candidate}
                    isLoading={statsLoading}
                  />
                  <VotesByHospitalChart 
                    data={statsData.statistics.votes_by_hospital}
                    isLoading={statsLoading}
                  />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <AuditFiltersComponent 
              onFilterChange={handleFilterChange}
              isLoading={auditLoading}
            />

            {auditData && (
              <AuditTrailTable
                votes={auditData.votes}
                pagination={auditData.pagination}
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
