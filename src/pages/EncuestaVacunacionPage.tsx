import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { authenticateForDataUpdate, AfiliadoAuthFailureError } from '@/services/afiliadosDataUpdateService';
import type { AfiliadoDataForUpdate, ConvenioDataForUpdate } from '@/services/afiliadosDataUpdateService';
import { submitVaccinationSurvey, VaccinationSurveyApiError } from '@/services/vaccinationSurveyService';
import VaccinationSurveySuccessModal, { type VaccinationSurveySuccessData } from '@/components/home/VaccinationSurveySuccessModal';
import { tiposDocumentoEncuestas } from '@/components/actualizar-datos-personales/formOptions';
import { sanitizeId } from '@/utils/inputSanitizer';
import { SignaturePad, SignaturePadRef } from '@/components/admin/sst/SignaturePad';
import { Loader2, FileText, Home, User, AlertCircle } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { getHospitalDisplayName } from '@/utils/hospitalDisplayName';

const normalizeDateToISO = (value: string | null | undefined): string => {
  if (!value) return '';
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmySlash = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmySlash) {
    const [, day, month, year] = dmySlash;
    return `${year}-${month}-${day}`;
  }
  const dmyDash = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyDash) {
    const [, day, month, year] = dmyDash;
    return `${year}-${month}-${day}`;
  }
  return trimmed;
};

/** Divide "NOMBRES APELLIDOS" en primer y segundo (primera palabra / resto). */
function splitNames(full: string | null | undefined): { first: string; second: string } {
  if (!full || !full.trim()) return { first: '', second: '' };
  const parts = full.trim().split(/\s+/);
  const first = parts[0] ?? '';
  const second = parts.slice(1).join(' ') ?? '';
  return { first, second };
}

/** Obtiene el código de hospital del convenio activo del afiliado. */
function getActiveHospitalCode(convenios: ConvenioDataForUpdate[] | undefined | null): string | null {
  if (!convenios || convenios.length === 0) return null;

  // Primero, buscar un convenio con estado ACTIVO
  let active = convenios.find((c) => c.estado?.toUpperCase() === 'ACTIVO') ?? null;

  // Si no hay ACTIVO, usar el más reciente según fecha_fin
  if (!active) {
    const conveniosConFecha = convenios.filter((c) => c.fecha_fin);
    if (conveniosConFecha.length > 0) {
      active = conveniosConFecha.reduce((latest, current) => {
        if (!latest.fecha_fin || !current.fecha_fin) return latest;
        return new Date(current.fecha_fin) > new Date(latest.fecha_fin) ? current : latest;
      }, conveniosConFecha[0]);
    } else {
      // Como último recurso, tomar el primer convenio
      active = convenios[0];
    }
  }

  return active?.cliente ?? null;
}

const authSchema = z.object({
  tipoDocumento: z.string().min(1, 'Tipo de documento es requerido'),
  numeroDocumento: z.string().min(1, 'Número de documento es requerido').refine((v) => /^[0-9]+$/.test(v), { message: 'Solo dígitos (sin puntos ni comas)' }),
  fechaExpedicion: z.string().min(1, 'Fecha de expedición es requerida').refine((val) => {
    if (!val) return false;
    const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    if (!dateRegex.test(val)) return false;
    const fecha = new Date(val);
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    return fecha <= hoy;
  }, { message: 'Fecha no puede ser futura' }),
});

const formSchema = z
  .object({
    tieneVacunaSrp: z.enum(['si', 'no'], { required_error: 'Seleccione una opción' }),
    tieneVacunaSr: z.enum(['si', 'no'], { required_error: 'Seleccione una opción' }),
    tieneVacunaFiebreAmarilla: z.enum(['si', 'no'], { required_error: 'Seleccione una opción' }),
    fechaAplicacionSrp: z.string().optional(),
    fechaAplicacionSr: z.string().optional(),
    fechaAplicacionFiebreAmarilla: z.string().optional(),
    firma: z.string().min(1, 'La firma es requerida como constancia'),
  })
  .superRefine((data, ctx) => {
    if (data.tieneVacunaSrp === 'si' && !data.fechaAplicacionSrp?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe indicar la fecha de aplicación.',
        path: ['fechaAplicacionSrp'],
      });
    }
    if (data.tieneVacunaSr === 'si' && !data.fechaAplicacionSr?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe indicar la fecha de aplicación.',
        path: ['fechaAplicacionSr'],
      });
    }
    if (data.tieneVacunaFiebreAmarilla === 'si' && !data.fechaAplicacionFiebreAmarilla?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe indicar la fecha de aplicación.',
        path: ['fechaAplicacionFiebreAmarilla'],
      });
    }
  });

type AuthValues = z.infer<typeof authSchema>;
type FormValues = z.infer<typeof formSchema>;

const buildDescriptionText = (hospitalDisplayName: string): string =>
  `Señor afiliado participe ${hospitalDisplayName}, por medio de la presente encuesta se dará cumplimiento al requerimiento enviado por la Coordinadora de PAI del municipio de Rionegro el cual tiene como finalidad sobre el fortalecimiento de la vacunación contra sarampión, rubéola y síndrome de rubéola congénita (SRC) en todo el territorio nacional y el inicio del plan de preparación ante eventos masivos por la Copa Mundial FIFA 2026; la Circular 012 y la Resolución 691 de 2025 relacionadas con las directrices por alerta de fiebre amarilla.`;

const MANDATORY_NOTICE =
  'Es de anotar que el diligenciamiento de la encuesta es de carácter obligatorio. Para cada vacuna podrá indicar si la tiene aplicada o no; solo en caso afirmativo se le pedirá la fecha de aplicación. Si no cuenta con alguna de las vacunas, seleccione “No”. Solo la firma digital es obligatoria.';

const EncuestaVacunacionPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<0 | 1>(0);
  const [authError, setAuthError] = useState<{ reason: string; message: string } | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [afiliado, setAfiliado] = useState<AfiliadoDataForUpdate | null>(null);
  const [authDoc, setAuthDoc] = useState<{ tipoDocumento: string; numeroDocumento: string; fechaExpedicion: string } | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successResponse, setSuccessResponse] = useState<VaccinationSurveySuccessData | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [hospitalCode, setHospitalCode] = useState<string | null>(null);
  const signaturePadRef = useRef<SignaturePadRef>(null);

  const authForm = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      tipoDocumento: 'CC',
      numeroDocumento: '',
      fechaExpedicion: '',
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tieneVacunaSrp: 'si',
      tieneVacunaSr: 'si',
      tieneVacunaFiebreAmarilla: 'si',
      fechaAplicacionSrp: '',
      fechaAplicacionSr: '',
      fechaAplicacionFiebreAmarilla: '',
      firma: '',
    },
  });

  const handleSignatureChange = (dataUrl: string | null) => {
    form.setValue('firma', dataUrl || '', { shouldValidate: true });
  };

  const handleAuthenticate = async (tipoDoc: string, numDoc: string, fechaExp: string) => {
    setAuthError(null);
    setIsAuthenticating(true);
    try {
      const response = await authenticateForDataUpdate({
        tipo_documento: tipoDoc,
        documento: sanitizeId(numDoc, { maxLength: 15 }),
        fecha_expedicion: fechaExp,
      });

      const afiliadoData = response.data.afiliado;
      const isActive = afiliadoData.estado && afiliadoData.estado.toUpperCase() === 'ACTIVO';

      if (!isActive) {
        setAuthError({
          reason: 'affiliate_inactive',
          message: 'Solo pueden diligenciar esta encuesta afiliados activos. Su estado actual no permite continuar.',
        });
        toast.error('Afiliado no activo');
        return;
      }

      setAfiliado(afiliadoData);
      const nuevoHospitalCode = getActiveHospitalCode(response.data.convenios);
      setHospitalCode(nuevoHospitalCode);
      setAuthDoc({ tipoDocumento: tipoDoc, numeroDocumento: sanitizeId(numDoc, { maxLength: 15 }), fechaExpedicion: fechaExp });
      setStep(1);
    } catch (error: any) {
      const reason = error instanceof AfiliadoAuthFailureError ? error.authFailureReason : (error?.authFailureReason as string | undefined);
      if (reason === 'affiliate_data_mismatch') {
        setAuthError({
          reason: 'affiliate_data_mismatch',
          message: 'La información ingresada no coincide con nuestros registros. Verifica tipo de documento, número y fecha de expedición e intenta nuevamente.',
        });
        toast.error('Datos no coinciden');
        return;
      }
      if (reason === 'affiliate_not_found') {
        setAuthError({
          reason: 'affiliate_not_found',
          message: 'No se encontró un afiliado con ese número de documento. Verifica los datos o comunícate con ProSalud.',
        });
        toast.error('Afiliado no encontrado');
        return;
      }
      setAuthError({
        reason: 'error',
        message: error?.message || 'Error al verificar los datos. Intenta de nuevo.',
      });
      toast.error(error?.message || 'Error al autenticar');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!afiliado || !authDoc) return;
    setIsSubmitting(true);
    try {
      const nombresSplit = splitNames(afiliado.nombres);
      const apellidosSplit = splitNames(afiliado.apellidos);
      const fechaNac = normalizeDateToISO(afiliado.fecha_nacimiento);

      const response = await submitVaccinationSurvey({
        tipo_documento: authDoc.tipoDocumento,
        numero_documento: authDoc.numeroDocumento,
        fecha_nacimiento: fechaNac,
        primer_nombre: nombresSplit.first,
        segundo_nombre: nombresSplit.second,
        primer_apellido: apellidosSplit.first,
        segundo_apellido: apellidosSplit.second,
        hospital: hospitalCode ?? null,
        fecha_aplicacion_srp: values.fechaAplicacionSrp?.trim() || null,
        fecha_aplicacion_sr: values.fechaAplicacionSr?.trim() || null,
        fecha_aplicacion_fiebre_amarilla: values.fechaAplicacionFiebreAmarilla?.trim() || null,
        firma: values.firma?.trim() || '',
      });

      setSuccessResponse({
        message: response.message,
        id: response.data?.id,
        created_at: response.data?.created_at,
        tipo_documento: authDoc.tipoDocumento,
        numero_documento: authDoc.numeroDocumento,
      });
      setSubmitSuccess(true);
      toast.success(response.message ?? 'Encuesta enviada correctamente');
    } catch (error: unknown) {
      if (error instanceof VaccinationSurveyApiError) {
        const { status, body } = error;
        if (status === 422 && body.errors && Object.keys(body.errors).length > 0) {
          const messages = Object.values(body.errors).flat().filter(Boolean);
          toast.error(body.message ?? 'Errores de validación', {
            description: messages.length > 0 ? messages.join('. ') : undefined,
          });
        } else if (status === 429) {
          toast.error(body.message ?? 'Demasiadas solicitudes. Intenta nuevamente más tarde.');
        } else {
          toast.error(body.message ?? 'Error al procesar la encuesta. Por favor, intente nuevamente.');
        }
      } else {
        toast.error(error instanceof Error ? error.message : 'Error al enviar la encuesta');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessModalClose = () => {
    setSubmitSuccess(false);
    setSuccessResponse(null);
    navigate('/');
  };

  return (
    <MainLayout>
      <>
      <div className={`bg-slate-50 ${step === 0 ? 'pt-8 pb-32' : 'min-h-screen py-8'}`}>
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <Breadcrumb className={step === 0 ? 'mb-4' : 'mb-6'}>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Inicio
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Encuesta de vacunación
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className={step === 0 ? 'mb-5' : 'mb-8'}>
          <h1 className={`${step === 0 ? 'text-2xl mb-1' : 'text-3xl mb-2'} font-bold text-slate-900`}>
            Encuesta de verificación de vacunación
          </h1>
          {step === 0 ? (
            <p className="text-slate-600 text-sm mb-3">
              Para continuar, por favor ingrese sus datos de identificación.
            </p>
          ) : (
            <>
              <p className="text-slate-600 whitespace-pre-line text-base text-justify">
                {buildDescriptionText(
                  hospitalCode
                    ? getHospitalDisplayName(hospitalCode) || 'ESE Hospital San Juan de Dios de Rionegro'
                    : 'ESE Hospital San Juan de Dios de Rionegro'
                )}
              </p>
              <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">Importante</AlertTitle>
                <AlertDescription>{MANDATORY_NOTICE}</AlertDescription>
              </Alert>
            </>
          )}
        </div>

        {step === 0 && (
          <Card className="mb-8">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary-prosalud" />
                Verificación de Identidad
              </CardTitle>
              <CardDescription className="text-sm">
                Por favor, ingrese su tipo de documento, número de documento y fecha de expedición para continuar
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {authError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{authError.message}</AlertDescription>
                </Alert>
              )}
              <Form {...authForm}>
                <form
                  onSubmit={authForm.handleSubmit((data) =>
                    handleAuthenticate(data.tipoDocumento, data.numeroDocumento, data.fechaExpedicion)
                  )}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={authForm.control}
                      name="tipoDocumento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de documento</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tiposDocumentoEncuestas.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={authForm.control}
                      name="numeroDocumento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de documento</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              inputMode="numeric"
                              placeholder="Solo dígitos (sin puntos ni comas)"
                              onChange={(e) => field.onChange(sanitizeId(e.target.value, { maxLength: 15 }))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={authForm.control}
                      name="fechaExpedicion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de expedición del documento</FormLabel>
                          <FormControl>
                            <Input type="date" max={new Date().toISOString().split('T')[0]} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t">
                    <Button type="button" variant="outline" onClick={() => setShowCancelConfirm(true)} size="sm">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isAuthenticating} className="bg-primary-prosalud" size="sm">
                      {isAuthenticating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        'Continuar'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {step === 1 && afiliado && authDoc && (
          <Card>
            <CardContent className="pt-6 space-y-6">
              <p className="text-sm font-medium text-slate-800">
                Para cada vacuna, indique primero si la tiene aplicada o no. Si responde que sí, deberá registrar la fecha
                de aplicación correspondiente. Si no la tiene, seleccione “No”. Solo la firma digital es obligatoria para
                enviar la encuesta.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 rounded-lg bg-slate-50 border border-slate-200 p-4 md:p-5">
                  <div>
                    <label className="text-xs font-medium text-slate-500">Primer nombre</label>
                    <p className="text-sm font-semibold text-slate-900">
                      {splitNames(afiliado.nombres).first || '—'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Segundo nombre</label>
                    <p className="text-sm font-semibold text-slate-900">
                      {splitNames(afiliado.nombres).second || '—'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Primer apellido</label>
                    <p className="text-sm font-semibold text-slate-900">
                      {splitNames(afiliado.apellidos).first || '—'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Segundo apellido</label>
                    <p className="text-sm font-semibold text-slate-900">
                      {splitNames(afiliado.apellidos).second || '—'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Fecha de nacimiento</label>
                    <p className="text-sm font-semibold text-slate-900">
                      {afiliado.fecha_nacimiento ? normalizeDateToISO(afiliado.fecha_nacimiento) : '—'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Documento de identidad</label>
                    <p className="text-sm font-semibold text-slate-900">
                      {authDoc.tipoDocumento} {authDoc.numeroDocumento}
                    </p>
                  </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                      <FormField
                        control={form.control}
                        name="tieneVacunaSrp"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex flex-col gap-2 min-h-[88px]">
                              <FormLabel className="text-sm font-semibold text-slate-900">
                                Vacuna SRP (Sarampión, Rubéola, Parotiditis)
                              </FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={field.value === 'si'}
                                    onCheckedChange={(checked) => {
                                      const value = checked ? 'si' : 'no';
                                      field.onChange(value);
                                      form.clearErrors('tieneVacunaSrp');
                                      if (!checked) {
                                        form.setValue('fechaAplicacionSrp', '');
                                      }
                                    }}
                                  />
                                  <span className="text-xs text-slate-600">
                                    {field.value === 'si' ? 'Sí, la tengo aplicada' : 'No la tengo aplicada'}
                                  </span>
                                </div>
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {form.watch('tieneVacunaSrp') === 'si' && (
                        <FormField
                          control={form.control}
                          name="fechaAplicacionSrp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-slate-600">Fecha de aplicación</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  max={new Date().toISOString().split('T')[0]}
                                  {...field}
                                  value={field.value ?? ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                      <FormField
                        control={form.control}
                        name="tieneVacunaSr"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex flex-col gap-2 min-h-[88px]">
                              <FormLabel className="text-sm font-semibold text-slate-900">
                                Vacuna SR (Sarampión, Rubéola)
                              </FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={field.value === 'si'}
                                    onCheckedChange={(checked) => {
                                      const value = checked ? 'si' : 'no';
                                      field.onChange(value);
                                      form.clearErrors('tieneVacunaSr');
                                      if (!checked) {
                                        form.setValue('fechaAplicacionSr', '');
                                      }
                                    }}
                                  />
                                  <span className="text-xs text-slate-600">
                                    {field.value === 'si' ? 'Sí, la tengo aplicada' : 'No la tengo aplicada'}
                                  </span>
                                </div>
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {form.watch('tieneVacunaSr') === 'si' && (
                        <FormField
                          control={form.control}
                          name="fechaAplicacionSr"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-slate-600">Fecha de aplicación</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  max={new Date().toISOString().split('T')[0]}
                                  {...field}
                                  value={field.value ?? ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                      <FormField
                        control={form.control}
                        name="tieneVacunaFiebreAmarilla"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex flex-col gap-2 min-h-[88px]">
                              <FormLabel className="text-sm font-semibold text-slate-900">
                                Vacuna Fiebre Amarilla
                              </FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={field.value === 'si'}
                                    onCheckedChange={(checked) => {
                                      const value = checked ? 'si' : 'no';
                                      field.onChange(value);
                                      form.clearErrors('tieneVacunaFiebreAmarilla');
                                      if (!checked) {
                                        form.setValue('fechaAplicacionFiebreAmarilla', '');
                                      }
                                    }}
                                  />
                                  <span className="text-xs text-slate-600">
                                    {field.value === 'si' ? 'Sí, la tengo aplicada' : 'No la tengo aplicada'}
                                  </span>
                                </div>
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {form.watch('tieneVacunaFiebreAmarilla') === 'si' && (
                        <FormField
                          control={form.control}
                          name="fechaAplicacionFiebreAmarilla"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-slate-600">Fecha de aplicación</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  max={new Date().toISOString().split('T')[0]}
                                  {...field}
                                  value={field.value ?? ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">Recuerde:</span> si selecciona “No” para alguna vacuna, se registrará
                    que no cuenta con ella. Si selecciona “Sí”, debe indicar la fecha de aplicación correspondiente.
                  </p>
                    <div className="space-y-3">
                      <FormLabel className="text-base font-semibold text-slate-900">Firma Digital</FormLabel>
                      <FormDescription>Firme en el recuadro para dar constancia de la información registrada. Es obligatorio.</FormDescription>
                      <SignaturePad
                        ref={signaturePadRef}
                        onChange={handleSignatureChange}
                        height={200}
                      />
                      <FormField
                        control={form.control}
                        name="firma"
                        render={() => (
                          <FormItem>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCancelConfirm(true)}
                        size="sm"
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSubmitting} className="bg-primary-prosalud" size="sm">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          'Enviar encuesta'
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
      <VaccinationSurveySuccessModal
        open={submitSuccess}
        onClose={handleSuccessModalClose}
        data={successResponse}
      />

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar y volver al inicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Si cancela, los datos ingresados no se guardarán y deberá volver a comenzar si desea enviar la encuesta más tarde. ¿Desea salir de todos modos?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, continuar aquí</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCancelConfirm(false);
                navigate('/');
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, volver al inicio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    </MainLayout>
  );
};

export default EncuestaVacunacionPage;
