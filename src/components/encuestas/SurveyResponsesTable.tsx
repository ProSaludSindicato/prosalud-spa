import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DataPagination from '@/components/ui/data-pagination';
import { listResponses, getFilterOptions, type SurveyResponse } from '@/services/surveyAdminApi';
import { formatDateReadable } from '@/utils/dateFormatter';
import SurveyResponseDetailModal from './SurveyResponseDetailModal';

interface SurveyResponsesTableProps {
  surveyId: string;
}

export function SurveyResponsesTable({ surveyId }: SurveyResponsesTableProps) {
  const [documentFilter, setDocumentFilter] = useState('');
  const [documentFilterDebounced, setDocumentFilterDebounced] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDocumentFilterDebounced(documentFilter);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [documentFilter]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [hospitalFilter, startDate, endDate]);

  const { data: filterOptions } = useQuery({
    queryKey: ['survey-filter-options'],
    queryFn: getFilterOptions,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['survey-responses', surveyId, documentFilterDebounced, hospitalFilter, startDate, endDate, currentPage],
    queryFn: () =>
      listResponses(surveyId, {
        document: documentFilterDebounced || undefined,
        hospital: hospitalFilter !== 'all' ? hospitalFilter : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page: currentPage,
      }),
  });

  const responses: SurveyResponse[] = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.last_page ?? 1;
  const totalItems = meta?.total ?? 0;

  return (
    <>
      <Card className="border shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Respuestas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por documento..."
                value={documentFilter}
                onChange={(e) => setDocumentFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Hospital" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los hospitales</SelectItem>
                {(filterOptions?.hospitals ?? []).map((h) => (
                  <SelectItem key={h.id} value={h.name}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full md:w-[180px]"
              placeholder="Fecha inicio"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full md:w-[180px]"
              placeholder="Fecha fin"
            />
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Cargando respuestas...</div>
          ) : isError ? (
            <div className="py-12 text-center text-destructive">Error al cargar las respuestas.</div>
          ) : responses.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No se encontraron respuestas con los filtros aplicados.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha envío</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Hospital</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow
                      key={response.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setSelectedResponseId(response.id)}
                    >
                      <TableCell>{formatDateReadable(response.submitted_at)}</TableCell>
                      <TableCell>{response.respondent_name ?? '—'}</TableCell>
                      <TableCell>
                        {response.respondent_document_type && response.respondent_document_number
                          ? `${response.respondent_document_type} ${response.respondent_document_number}`
                          : response.respondent_document_number ?? '—'}
                      </TableCell>
                      <TableCell>{response.hospital ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResponseId(response.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <DataPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
                className="mt-4"
              />
            </>
          )}
        </CardContent>
      </Card>

      <SurveyResponseDetailModal
        surveyId={surveyId}
        responseId={selectedResponseId}
        onClose={() => setSelectedResponseId(null)}
      />
    </>
  );
}
