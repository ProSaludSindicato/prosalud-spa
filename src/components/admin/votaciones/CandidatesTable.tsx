import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Table2 } from "lucide-react";
import type { VotesByCandidate } from "@/types/votaciones";

interface CandidatesTableProps {
  data: VotesByCandidate[];
  isLoading?: boolean;
  currentHospital?: string; // Hospital del filtro principal para mostrar en el encabezado
}

type SortOrder = 'desc' | 'asc';

export function CandidatesTable({ data, isLoading, currentHospital }: CandidatesTableProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Ordenar datos por cantidad de votos
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const sorted = [...data];
    sorted.sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.vote_count - a.vote_count;
      } else {
        return a.vote_count - b.vote_count;
      }
    });

    return sorted;
  }, [data, sortOrder]);

  const handleSortToggle = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tabla de Candidatos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Table2 className="h-5 w-5" />
          Tabla de Candidatos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          {currentHospital && (
            <p className="text-sm text-muted-foreground">
              Filtrando por: <span className="font-medium">{currentHospital}</span>
            </p>
          )}
          <Button
            variant="outline"
            onClick={handleSortToggle}
            className="gap-2"
          >
            {sortOrder === 'desc' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
            {sortOrder === 'desc' ? 'Más votos primero' : 'Menos votos primero'}
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>ID Candidato</TableHead>
                <TableHead>Nombre del Candidato</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSortToggle}
                    className="gap-2 h-8"
                  >
                    Cantidad de Votos
                    {sortOrder === 'desc' ? (
                      <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No hay candidatos para los filtros seleccionados
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((candidate, index) => (
                  <TableRow key={candidate.candidate_id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{candidate.candidate_id}</TableCell>
                    <TableCell className="font-medium">{candidate.candidate_name}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {candidate.vote_count}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {sortedData.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Mostrando {sortedData.length} candidato{sortedData.length !== 1 ? 's' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
