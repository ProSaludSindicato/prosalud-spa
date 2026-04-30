import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Edit,
  Download,
  Loader2,
  ClipboardList,
  Calendar,
  Building2,
  CheckCircle2,
  Link2,
  Copy,
  Check,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  getSurvey,
  updateSurveyStatus,
  requestExport,
  getExportStatus,
  downloadExport,
} from '@/services/surveyAdminApi';
import { SurveyStatusBadge } from '@/components/encuestas/SurveyStatusBadge';
import { SurveyResponsesTable } from '@/components/encuestas/SurveyResponsesTable';
import { useToast } from '@/hooks/use-toast';
import { formatDateReadable } from '@/utils/dateFormatter';

const ACCESS_TYPE_LABELS: Record<string, string> = {
  public: 'Pública',
  authenticated: 'Autenticada',
  restricted: 'Restringida',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
};

const AdminEncuestaDetallePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isExporting, setIsExporting] = useState(false);
  const [publicLinkJustCopied, setPublicLinkJustCopied] = useState(false);
  const exportPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (exportPollingRef.current) {
        clearInterval(exportPollingRef.current);
      }
    };
  }, []);

  const { data: survey, isLoading, isError } = useQuery({
    queryKey: ['survey', id],
    queryFn: () => getSurvey(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: 'active' | 'closed') => updateSurveyStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey', id] });
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Estado actualizado', description: 'El estado de la encuesta se ha actualizado.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.response?.data?.message ?? 'No se pudo actualizar el estado.',
        variant: 'destructive',
      });
    },
  });

  async function handleExport(): Promise<void> {
    if (!id) {
      return;
    }

    const POLL_INTERVAL_MS = 3000;
    const MAX_POLL_ATTEMPTS = 100;

    const startPolling = (jobId: string) => {
      let attempts = 0;

      const poll = async () => {
        attempts++;
        try {
          const statusResult = await getExportStatus(id, jobId);

          if (statusResult.status === 'completed') {
            if (exportPollingRef.current) {
              clearInterval(exportPollingRef.current);
              exportPollingRef.current = null;
            }
            await downloadExport(id, jobId);
            setIsExporting(false);
            toast({ title: 'Reporte descargado', description: 'El archivo Excel se ha descargado correctamente.' });
            return;
          }

          if (statusResult.status === 'failed') {
            if (exportPollingRef.current) {
              clearInterval(exportPollingRef.current);
              exportPollingRef.current = null;
            }
            setIsExporting(false);
            toast({
              title: 'Error al generar el reporte',
              description: statusResult.error ?? 'Error desconocido.',
              variant: 'destructive',
            });
            return;
          }

          if (attempts >= MAX_POLL_ATTEMPTS) {
            if (exportPollingRef.current) {
              clearInterval(exportPollingRef.current);
              exportPollingRef.current = null;
            }
            setIsExporting(false);
            toast({
              title: 'Tiempo de espera excedido',
              description: 'El reporte está tardando más de lo habitual. Intente de nuevo más tarde.',
              variant: 'destructive',
            });
          }
        } catch {
          if (attempts >= MAX_POLL_ATTEMPTS) {
            if (exportPollingRef.current) {
              clearInterval(exportPollingRef.current);
              exportPollingRef.current = null;
            }
            setIsExporting(false);
            toast({ title: 'Error al verificar el estado', variant: 'destructive' });
          }
        }
      };

      poll();
      exportPollingRef.current = setInterval(poll, POLL_INTERVAL_MS);
    };

    setIsExporting(true);
    try {
      const result = await requestExport(id);
      toast({ title: 'Generando reporte…', description: 'Se descargará automáticamente cuando esté listo.' });
      startPolling(result.job_id);
    } catch (error) {
      setIsExporting(false);
      toast({
        title: 'Error al generar el reporte',
        description: error instanceof Error ? error.message : 'Error desconocido.',
        variant: 'destructive',
      });
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (isError || !survey) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-destructive">Error al cargar la encuesta.</p>
          <Button variant="outline" onClick={() => navigate('/admin/encuestas')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const publicRespondUrl = `${window.location.origin}/encuestas/${survey.id}`;

  const copyPublicRespondLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(publicRespondUrl);
      setPublicLinkJustCopied(true);
      toast({ title: 'Enlace copiado', description: 'Ya puede compartirlo con los participantes.' });
      window.setTimeout(() => setPublicLinkJustCopied(false), 2500);
    } catch {
      toast({
        title: 'No se pudo copiar',
        description: 'Seleccione el enlace y cópielo manualmente (Ctrl+C o Cmd+C).',
        variant: 'destructive',
      });
    }
  };

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
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Button variant="outline" size="sm" onClick={() => navigate('/admin/encuestas')}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Volver
                    </Button>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                        <ClipboardList className="h-8 w-8 text-primary-prosalud" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold text-primary-prosalud">
                          {survey.title}
                        </CardTitle>
                        {survey.description && (
                          <CardDescription className="text-base mt-1">
                            {survey.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {can('surveys.manage') && survey.status === 'draft' && (
                      <Button
                        onClick={() => statusMutation.mutate('active')}
                        disabled={statusMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Activar
                      </Button>
                    )}
                    {can('surveys.manage') && survey.status === 'active' && (
                      <Button
                        variant="outline"
                        onClick={() => statusMutation.mutate('closed')}
                        disabled={statusMutation.isPending}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Cerrar encuesta
                      </Button>
                    )}
                    {can('surveys.manage') && (
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/admin/encuestas/${survey.id}/editar`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleExport}
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generando…
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Exportar Excel
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm bg-white border-primary-prosalud/25">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-primary-prosalud" />
                  Enlace para participantes
                </CardTitle>
                <CardDescription>
                  Comparta esta dirección para que las personas respondan la encuesta en el sitio público. Solo se aceptan
                  respuestas cuando la encuesta está activa y, si definió fechas de inicio o cierre, la fecha actual está
                  dentro de ese rango.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input readOnly value={publicRespondUrl} className="font-mono text-sm bg-slate-50 dark:bg-slate-900/40" />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => void copyPublicRespondLink()}
                  >
                    {publicLinkJustCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar enlace
                      </>
                    )}
                  </Button>
                </div>
                {survey.status !== 'active' && (
                  <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                    {survey.status === 'draft'
                      ? 'La encuesta está en borrador. Actívela para que el enlace permita enviar respuestas.'
                      : 'La encuesta está cerrada. Quien abra el enlace verá que no está disponible.'}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm bg-white">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</p>
                    <SurveyStatusBadge status={survey.status} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de acceso</p>
                    <Badge variant="outline">
                      {ACCESS_TYPE_LABELS[survey.access_type] ?? survey.access_type}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Firma requerida</p>
                    <p className="text-sm font-medium">{survey.requires_signature ? 'Sí' : 'No'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Múltiples respuestas</p>
                    <p className="text-sm font-medium">{survey.allows_multiple_responses ? 'Sí' : 'No'}</p>
                  </div>
                  {survey.start_date && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fecha de inicio
                      </p>
                      <p className="text-sm font-medium">{formatDateReadable(survey.start_date)}</p>
                    </div>
                  )}
                  {survey.end_date && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fecha de cierre
                      </p>
                      <p className="text-sm font-medium">{formatDateReadable(survey.end_date)}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Respuestas</p>
                    <p className="text-sm font-medium">{survey.responses_count ?? 0}</p>
                  </div>
                </div>

                {survey.access_type === 'restricted' && survey.hospitals && survey.hospitals.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        Hospitales con acceso
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {survey.hospitals.map((h) => (
                          <Badge key={h.id} variant="secondary">
                            {h.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <SurveyResponsesTable surveyId={survey.id} />
          </motion.div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminEncuestaDetallePage;
