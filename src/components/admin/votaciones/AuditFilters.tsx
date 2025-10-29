import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import type { AuditFilters } from "@/types/votaciones";

interface AuditFiltersProps {
  onFilterChange: (filters: AuditFilters) => void;
  isLoading?: boolean;
}

export function AuditFiltersComponent({ onFilterChange, isLoading }: AuditFiltersProps) {
  const [filters, setFilters] = useState<AuditFilters>({});

  const handleFilterChange = (key: keyof AuditFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const applyFilters = () => {
    onFilterChange(filters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => filters[key as keyof AuditFilters]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros de Búsqueda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="start_date">Fecha Inicio</Label>
            <Input
              id="start_date"
              type="date"
              value={filters.start_date || ''}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">Fecha Fin</Label>
            <Input
              id="end_date"
              type="date"
              value={filters.end_date || ''}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hospital">Hospital</Label>
            <Select
              value={filters.hospital || ''}
              onValueChange={(value) => handleFilterChange('hospital', value)}
              disabled={isLoading}
            >
              <SelectTrigger id="hospital">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="Bello">Bello</SelectItem>
                <SelectItem value="La Maria">La Maria</SelectItem>
                <SelectItem value="Rionegro">Rionegro</SelectItem>
                <SelectItem value="ADMON">ADMON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_type">Tipo de Documento</Label>
            <Select
              value={filters.voter_document_type || ''}
              onValueChange={(value) => handleFilterChange('voter_document_type', value)}
              disabled={isLoading}
            >
              <SelectTrigger id="document_type">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="CC">CC</SelectItem>
                <SelectItem value="CE">CE</SelectItem>
                <SelectItem value="PT">PT</SelectItem>
                <SelectItem value="TI">TI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_number">Número de Documento</Label>
            <Input
              id="document_number"
              type="text"
              placeholder="Ej: 12345678"
              value={filters.voter_document_number || ''}
              onChange={(e) => handleFilterChange('voter_document_number', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate_id">ID Candidato</Label>
            <Input
              id="candidate_id"
              type="text"
              placeholder="Ej: 123"
              value={filters.candidate_id || ''}
              onChange={(e) => handleFilterChange('candidate_id', e.target.value)}
              disabled={isLoading}
            />
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
