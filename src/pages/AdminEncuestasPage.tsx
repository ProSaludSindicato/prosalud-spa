import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Eye, Edit, Trash2, ClipboardList, Copy, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import DataPagination from '@/components/ui/data-pagination';
import { listSurveys, deleteSurvey, duplicateSurvey, type Survey, type SurveyStatus } from '@/services/surveyAdminApi';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SurveyStatusBadge } from '@/components/encuestas/SurveyStatusBadge';
import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/usePagination';

const ACCESS_TYPE_LABELS: Record<string, string> = {
  public: 'Pública',
  authenticated: 'Autenticada',
  restricted: 'Restringida',
};

const ACCESS_TYPE_BADGE_CLASSES: Record<string, string> = {
  public: 'bg-blue-50 text-blue-700 border-blue-200',
  authenticated: 'bg-amber-50 text-amber-700 border-amber-200',
  restricted: 'bg-purple-50 text-purple-700 border-purple-200',
};

const ACCESS_TYPE_DESCRIPTIONS: Record<string, string> = {
  public: 'Cualquier persona con el enlace puede responder.',
  authenticated: 'Solo afiliados verificados en ProSanet.',
  restricted: 'Solo afiliados de hospitales específicos.',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
};

type TabFilter = 'all' | SurveyStatus;

const AdminEncuestasPage: React.FC = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['surveys', tabFilter],
    queryFn: () =>
      listSurveys({
        status: tabFilter !== 'all' ? tabFilter : undefined,
        per_page: 200,
      }),
  });

  const surveys: Survey[] = data?.data ?? [];

  const {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    paginatedData: paginatedSurveys,
    goToPage,
    setItemsPerPage,
  } = usePagination({ data: surveys, initialItemsPerPage: 10 });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateSurvey(id),
    onMutate: (id) => setDuplicatingId(id),
    onSuccess: (copy) => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({
        title: 'Encuesta duplicada',
        description: `Se creó "${copy.title}" como borrador.`,
      });
      setDuplicatingId(null);
      navigate(`/admin/encuestas/${copy.id}/editar`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error al duplicar',
        description: error?.response?.data?.message ?? 'No se pudo duplicar la encuesta.',
        variant: 'destructive',
      });
      setDuplicatingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSurvey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Encuesta eliminada', description: 'La encuesta se ha eliminado correctamente.' });
      setSurveyToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error al eliminar',
        description: error?.response?.data?.message ?? 'No se pudo eliminar la encuesta.',
        variant: 'destructive',
      });
      setSurveyToDelete(null);
    },
  });

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto"
        >
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                      <ClipboardList className="h-8 w-8 text-primary-prosalud" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-primary-prosalud">
                        Encuestas Dinámicas
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        Gestiona las encuestas y sus respuestas
                      </CardDescription>
                    </div>
                  </div>
                  {can('surveys.manage') && (
                    <Button
                      onClick={() => navigate('/admin/encuestas/crear')}
                      className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Encuesta
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm bg-white">
              <CardContent className="pt-6 space-y-4">
                <Tabs value={tabFilter} onValueChange={(v) => setTabFilter(v as TabFilter)}>
                  <TabsList>
                    <TabsTrigger value="all">Todas</TabsTrigger>
                    <TabsTrigger value="draft">Borrador</TabsTrigger>
                    <TabsTrigger value="active">Activas</TabsTrigger>
                    <TabsTrigger value="closed">Cerradas</TabsTrigger>
                  </TabsList>
                </Tabs>

                {isLoading ? (
                  <div className="py-12 text-center text-muted-foreground">Cargando encuestas...</div>
                ) : surveys.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    No hay encuestas en esta categoría.
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead>Tipo acceso</TableHead>
                          <TableHead>Firma</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-center"># Respuestas</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TooltipProvider>
                        {paginatedSurveys.map((survey) => (
                          <TableRow key={survey.id}>
                            <TableCell className="font-medium max-w-[240px] truncate">
                              {survey.title}
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className={ACCESS_TYPE_BADGE_CLASSES[survey.access_type] ?? ''}
                                  >
                                    {ACCESS_TYPE_LABELS[survey.access_type] ?? survey.access_type}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{ACCESS_TYPE_DESCRIPTIONS[survey.access_type] ?? ''}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              {survey.requires_signature ? (
                                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">Con firma</Badge>
                              ) : (
                                <Badge variant="secondary">Sin firma</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <SurveyStatusBadge status={survey.status} />
                            </TableCell>
                            <TableCell className="text-center font-medium tabular-nums">
                              {survey.responses_count ?? 0}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => navigate(`/admin/encuestas/${survey.id}`)}
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span className="sr-only">Ver</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver detalle</TooltipContent>
                                </Tooltip>
                                {can('surveys.manage') && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate(`/admin/encuestas/${survey.id}/editar`)}
                                      >
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Editar</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar encuesta</TooltipContent>
                                  </Tooltip>
                                )}
                                {can('surveys.manage') && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={duplicatingId === survey.id}
                                        onClick={() => duplicateMutation.mutate(survey.id)}
                                      >
                                        {duplicatingId === survey.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Copy className="h-4 w-4" />
                                        )}
                                        <span className="sr-only">Duplicar</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Duplicar como borrador</TooltipContent>
                                  </Tooltip>
                                )}
                                {can('surveys.manage') && survey.status !== 'active' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => setSurveyToDelete(survey)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Eliminar</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Eliminar encuesta</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        </TooltipProvider>
                      </TableBody>
                    </Table>

                    <DataPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalItems}
                      itemsPerPage={itemsPerPage}
                      onPageChange={goToPage}
                      onItemsPerPageChange={setItemsPerPage}
                      className="mt-4"
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>

      <AlertDialog open={!!surveyToDelete} onOpenChange={(open) => { if (!open) { setSurveyToDelete(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar encuesta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la encuesta{' '}
              <span className="font-semibold">{surveyToDelete?.title}</span> y todas sus respuestas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => surveyToDelete && deleteMutation.mutate(surveyToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminEncuestasPage;
