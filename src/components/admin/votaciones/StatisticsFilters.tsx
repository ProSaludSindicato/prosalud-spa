import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import type { CandidateVotingPeriod, StatisticsFilters } from "@/types/votaciones";

interface StatisticsFiltersProps {
  onFilterChange: (filters: StatisticsFilters) => void;
  currentFilters?: StatisticsFilters;
  isLoading?: boolean;
  periods?: CandidateVotingPeriod[];
}

export function StatisticsFiltersComponent({ onFilterChange, currentFilters, isLoading, periods = [] }: StatisticsFiltersProps) {
  const [filters, setFilters] = useState<StatisticsFilters>(currentFilters || {});

  // Sincronizar filtros locales con los filtros actuales desde el padre
  useEffect(() => {
    if (currentFilters) {
      setFilters(currentFilters);
    }
  }, [currentFilters]);

  const handleFilterChange = (key: keyof StatisticsFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
  };

  const applyFilters = () => {
    onFilterChange(filters);
  };

  const clearFilters = () => {
    const emptyFilters: StatisticsFilters = {};
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = Object.keys(filters).some(key => filters[key as keyof StatisticsFilters]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros de Estadísticas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="statistics_candidate_election_key">Periodo</Label>
            <Select
              value={filters.candidate_election_key ? filters.candidate_election_key : 'active'}
              onValueChange={(value) =>
                handleFilterChange('candidate_election_key', value === 'active' ? '' : value)
              }
              disabled={isLoading}
            >
              <SelectTrigger id="statistics_candidate_election_key">
                <SelectValue placeholder="Periodo activo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Periodo activo</SelectItem>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.election_key}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="statistics_hospital">Hospital</Label>
            <Select
              value={filters.hospital ? filters.hospital : 'all'}
              onValueChange={(value) => handleFilterChange('hospital', value === 'all' ? '' : value)}
              disabled={isLoading}
            >
              <SelectTrigger id="statistics_hospital">
                <SelectValue placeholder="Todos los hospitales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los hospitales</SelectItem>
                <SelectItem value="Bello">Bello</SelectItem>
                <SelectItem value="La Maria">La Maria</SelectItem>
                <SelectItem value="Rionegro">Rionegro</SelectItem>
                <SelectItem value="ADMON">ADMON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={applyFilters} disabled={isLoading}>
            <Filter className="mr-2 h-4 w-4" />
            Aplicar Filtros
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} disabled={isLoading}>
              <X className="mr-2 h-4 w-4" />
              Limpiar Filtros
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
