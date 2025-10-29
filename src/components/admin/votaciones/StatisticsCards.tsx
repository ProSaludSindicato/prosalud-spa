import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Vote, Building2 } from "lucide-react";
import type { VoteStatistics } from "@/types/votaciones";

interface StatisticsCardsProps {
  statistics: VoteStatistics;
  isLoading?: boolean;
}

export function StatisticsCards({ statistics, isLoading }: StatisticsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-1" />
              <div className="h-3 bg-muted rounded w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Votos</CardTitle>
          <Vote className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.total_votes}</div>
          <p className="text-xs text-muted-foreground">
            Votos registrados en el sistema
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Candidatos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statistics.votes_by_candidate.length}
          </div>
          <p className="text-xs text-muted-foreground">
            Candidatos en la votación
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hospitales</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statistics.votes_by_hospital.length}
          </div>
          <p className="text-xs text-muted-foreground">
            Hospitales participantes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
