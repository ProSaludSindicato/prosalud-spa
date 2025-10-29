import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Vote, AuditPagination } from "@/types/votaciones";

interface AuditTrailTableProps {
  votes: Vote[];
  pagination: AuditPagination;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function AuditTrailTable({ votes, pagination, onPageChange, isLoading }: AuditTrailTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registro de Auditoría</CardTitle>
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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss", { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Registro de Auditoría de Votos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Mostrando {votes.length} de {pagination.total_votes} votos registrados
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Voto</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Hospital</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Fecha/Hora</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {votes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No se encontraron registros de votación
                  </TableCell>
                </TableRow>
              ) : (
                votes.map((vote) => (
                  <TableRow key={vote.vote_id}>
                    <TableCell className="font-medium">{vote.vote_id}</TableCell>
                    <TableCell>{vote.voter.full_name || 'N/A'}</TableCell>
                    <TableCell>
                      {vote.voter.document_type} {vote.voter.document_number}
                    </TableCell>
                    <TableCell>{vote.voter.hospital}</TableCell>
                    <TableCell className="text-sm">{vote.voter.position}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(vote.vote_timestamp)}
                    </TableCell>
                    <TableCell className="text-sm font-mono">{vote.ip_address}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Página {pagination.current_page} de {pagination.total_pages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.current_page - 1)}
                disabled={!pagination.has_prev_page}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.current_page + 1)}
                disabled={!pagination.has_next_page}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
