import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ClipboardList, ChevronLeft, HelpCircle, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { createSurvey, getFilterOptions, type CreateSurveyData, type SurveyQuestion } from '@/services/surveyAdminApi';
import { SurveyQuestionBuilder } from '@/components/encuestas/SurveyQuestionBuilder';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ACCESS_TYPE_DESCRIPTIONS: Record<string, string> = {
  public: 'Cualquier persona con el enlace puede responder, sin necesidad de verificación.',
  authenticated: 'Solo afiliados verificados en ProSanet pueden responder (requiere documento y fecha de expedición).',
  restricted: 'Solo afiliados verificados que pertenezcan a los hospitales seleccionados pueden responder.',
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  draft: 'La encuesta se guarda sin publicarse. Puede activarla después desde el detalle.',
  active: 'La encuesta queda disponible de inmediato para los participantes.',
};

const schema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  description: z.string().optional(),
  access_type: z.enum(['public', 'authenticated', 'restricted']),
  allowed_affiliate_statuses: z.array(z.enum(['activo', 'retirado'])).min(1, 'Seleccione al menos un tipo de afiliado.'),
  status: z.enum(['draft', 'active']),
  requires_signature: z.boolean(),
  allows_multiple_responses: z.boolean(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  hospital_ids: z.array(z.number()).optional(),
});

type FormValues = z.infer<typeof schema>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
};

const AdminEncuestaCrearPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      access_type: 'public',
      allowed_affiliate_statuses: ['activo'],
      status: 'draft',
      requires_signature: false,
      allows_multiple_responses: false,
      start_date: '',
      end_date: '',
      hospital_ids: [],
    },
  });

  const accessType = watch('access_type');

  const { data: filterOptions } = useQuery({
    queryKey: ['survey-filter-options'],
    queryFn: getFilterOptions,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSurveyData) => createSurvey(data),
    onSuccess: (survey) => {
      toast({ title: 'Encuesta creada', description: 'La encuesta se ha creado correctamente.' });
      navigate(`/admin/encuestas/${survey.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error al crear',
        description: error?.response?.data?.message ?? 'No se pudo crear la encuesta.',
        variant: 'destructive',
      });
    },
  });

  function onSubmit(values: FormValues): void {
    if (questions.length === 0) {
      setQuestionsError('Debes agregar al menos una pregunta.');
      return;
    }
    setQuestionsError(null);

    const payload: CreateSurveyData = {
      title: values.title,
      description: values.description || undefined,
      access_type: values.access_type,
      allowed_affiliate_statuses: values.access_type !== 'public' ? values.allowed_affiliate_statuses : undefined,
      status: values.status,
      requires_signature: values.requires_signature,
      allows_multiple_responses: values.allows_multiple_responses,
      start_date: values.start_date || undefined,
      end_date: values.end_date || undefined,
      hospital_ids: values.access_type === 'restricted' ? values.hospital_ids : undefined,
      questions: questions.map((q, index) => ({
        type: q.type,
        label: q.label,
        help_text: q.help_text,
        is_required: q.is_required,
        order: index + 1,
        options: q.options,
        ...(q.type === 'ranking' ? { ranking_unique_priority: q.ranking_unique_priority !== false } : {}),
      })),
    };

    createMutation.mutate(payload);
  }

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
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => navigate('/admin/encuestas')}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Volver
                  </Button>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                      <ClipboardList className="h-8 w-8 text-primary-prosalud" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-primary-prosalud">
                      Nueva Encuesta
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <motion.div variants={itemVariants}>
              <Card className="border shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">Información básica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input id="title" {...register('title')} placeholder="Título de la encuesta" />
                    {errors.title && (
                      <p className="text-sm text-destructive">{errors.title.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      placeholder="Descripción opcional de la encuesta"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">Configuración</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <TooltipProvider>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label>Tipo de acceso</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold mb-1">Tipos de acceso:</p>
                            <ul className="space-y-1 text-xs">
                              <li><span className="font-medium">Pública:</span> Cualquier persona con el enlace puede responder.</li>
                              <li><span className="font-medium">Autenticada:</span> Solo afiliados verificados en ProSanet.</li>
                              <li><span className="font-medium">Restringida:</span> Solo afiliados de hospitales específicos.</li>
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Controller
                        control={control}
                        name="access_type"
                        render={({ field }) => (
                          <>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="public">Pública</SelectItem>
                                <SelectItem value="authenticated">Autenticada</SelectItem>
                                <SelectItem value="restricted">Restringida</SelectItem>
                              </SelectContent>
                            </Select>
                            {ACCESS_TYPE_DESCRIPTIONS[field.value] && (
                              <p className="text-xs text-muted-foreground leading-snug">
                                {ACCESS_TYPE_DESCRIPTIONS[field.value]}
                              </p>
                            )}
                          </>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label>Estado inicial</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Puede cambiar el estado en cualquier momento desde el detalle de la encuesta.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Controller
                        control={control}
                        name="status"
                        render={({ field }) => (
                          <>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Borrador</SelectItem>
                                <SelectItem value="active">Activa</SelectItem>
                              </SelectContent>
                            </Select>
                            {STATUS_DESCRIPTIONS[field.value] && (
                              <p className="text-xs text-muted-foreground leading-snug">
                                {STATUS_DESCRIPTIONS[field.value]}
                              </p>
                            )}
                          </>
                        )}
                      />
                    </div>
                  </div>
                  </TooltipProvider>

                  {/* Affiliate status filter — only for authenticated/restricted */}
                  {(accessType === 'authenticated' || accessType === 'restricted') && (
                    <Controller
                      control={control}
                      name="allowed_affiliate_statuses"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2 p-3 border rounded-lg bg-slate-50">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium">Tipo de afiliados permitidos</p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">Define qué afiliados pueden responder según su estado en ProSanet. Un afiliado <strong>activo</strong> tiene convenio vigente; un <strong>retirado</strong> ya no está activo pero sigue en el archivo.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="flex flex-wrap gap-4">
                            {(['activo', 'retirado'] as const).map((status) => (
                              <div key={status} className="flex items-center gap-2">
                                <Checkbox
                                  id={`status-${status}`}
                                  checked={field.value?.includes(status) ?? false}
                                  onCheckedChange={(checked) => {
                                    const current = field.value ?? [];
                                    if (checked) {
                                      field.onChange([...current, status]);
                                    } else {
                                      field.onChange(current.filter((s) => s !== status));
                                    }
                                  }}
                                />
                                <Label htmlFor={`status-${status}`} className="cursor-pointer capitalize">
                                  {status === 'activo' ? 'Activos' : 'Retirados'}
                                </Label>
                              </div>
                            ))}
                          </div>
                          {fieldState.error && (
                            <p className="text-xs text-destructive">{fieldState.error.message}</p>
                          )}
                        </div>
                      )}
                    />
                  )}

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Requiere firma</p>
                        <p className="text-xs text-muted-foreground">El respondente debe firmar digitalmente</p>
                      </div>
                      <Controller
                        control={control}
                        name="requires_signature"
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Permite múltiples respuestas</p>
                        <p className="text-xs text-muted-foreground">Un mismo usuario puede responder más de una vez</p>
                      </div>
                      <Controller
                        control={control}
                        name="allows_multiple_responses"
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">Fechas (opcionales)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Fecha de inicio</Label>
                    <Input id="start_date" type="date" {...register('start_date')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">Fecha de cierre</Label>
                    <Input id="end_date" type="date" {...register('end_date')} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {accessType === 'restricted' && filterOptions?.hospitals && (
              <motion.div variants={itemVariants}>
                <Card className="border shadow-sm bg-white border-l-4 border-l-primary-prosalud">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Hospitales con acceso</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Seleccione los hospitales cuyos afiliados podrán responder esta encuesta. Solo se admitirán usuarios verificados en ProSanet que pertenezcan a alguno de los hospitales marcados.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Controller
                      control={control}
                      name="hospital_ids"
                      render={({ field }) => (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {filterOptions.hospitals.map((hospital) => (
                            <div key={hospital.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`hospital-${hospital.id}`}
                                checked={field.value?.includes(hospital.id) ?? false}
                                onCheckedChange={(checked) => {
                                  const current = field.value ?? [];
                                  if (checked) {
                                    field.onChange([...current, hospital.id]);
                                  } else {
                                    field.onChange(current.filter((id) => id !== hospital.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`hospital-${hospital.id}`} className="cursor-pointer">
                                {hospital.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <motion.div variants={itemVariants}>
              <Card className="border shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">Preguntas</CardTitle>
                </CardHeader>
                <CardContent>
                  <SurveyQuestionBuilder questions={questions} onChange={setQuestions} />
                  {questionsError && (
                    <p className="text-sm text-destructive mt-2">{questionsError}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="flex justify-end gap-3 pb-8">
                <Button type="button" variant="outline" onClick={() => navigate('/admin/encuestas')}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className="min-w-[140px]"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando…
                    </>
                  ) : (
                    'Crear Encuesta'
                  )}
                </Button>
              </div>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminEncuestaCrearPage;
