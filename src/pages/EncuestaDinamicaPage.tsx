import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import MainLayout from '@/components/layout/MainLayout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { SignaturePad, SignaturePadRef } from '@/components/admin/sst/SignaturePad';
import { tiposDocumentoEncuestas } from '@/components/actualizar-datos-personales/formOptions';
import { sanitizeId } from '@/utils/inputSanitizer';
import { getSurveyInfo, submitSurveyResponse, verifySurveyRespondent } from '@/services/surveyPublicApi';
import type { PublicSurveyInfo } from '@/services/surveyPublicApi';
import type { SurveyQuestion } from '@/services/surveyAdminApi';
import { Loader2, ClipboardList, Home, AlertCircle, CheckCircle2, User, ChevronLeft, ChevronRight, PenLine } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** Preguntas por pantalla en el formulario (evita listados muy largos en escritorio/móvil). */
const QUESTIONS_PER_PAGE = 5;

// ─── State machine ────────────────────────────────────────────────────────────

type PageState =
  | 'loading'
  | 'not_found'
  | 'auth_required'
  | 'form'
  | 'signature'
  | 'submitting'
  | 'success';

// ─── Auth schema ──────────────────────────────────────────────────────────────

const authSchema = z.object({
  respondent_document_type: z
    .string({
      required_error: 'Seleccione el tipo de documento.',
      invalid_type_error: 'Seleccione el tipo de documento.',
    })
    .min(1, 'Seleccione el tipo de documento.'),
  respondent_document_number: z
    .string({
      required_error: 'Ingrese el número de documento.',
      invalid_type_error: 'Ingrese el número de documento.',
    })
    .min(1, 'Ingrese el número de documento.')
    .refine((v) => /^[0-9]+$/.test(v), { message: 'El documento solo debe contener dígitos (sin puntos ni comas).' }),
  fecha_expedicion: z
    .string({
      required_error: 'Ingrese la fecha de expedición del documento.',
      invalid_type_error: 'Ingrese la fecha de expedición del documento.',
    })
    .min(1, 'Ingrese la fecha de expedición del documento.')
    .refine(
      (val) => {
        if (!val) return false;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
        const fecha = new Date(val);
        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999);
        return fecha <= hoy;
      },
      { message: 'La fecha de expedición no puede ser futura.' },
    ),
});

type AuthValues = z.infer<typeof authSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Cada clave (p. ej. A, B, C) con prioridad 1..n, todas distintas y usadas exactamente una vez. */
function isValidCompleteRanking(value: string, optionValues: string[]): boolean {
  if (optionValues.length === 0) {
    return true;
  }
  if (!value?.trim()) {
    return false;
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(value) as Record<string, unknown>;
  } catch {
    return false;
  }
  const n = optionValues.length;
  const usedRanks = new Set<string>();
  for (const key of optionValues) {
    const r = parsed[key];
    if (r === undefined || r === null) {
      return false;
    }
    const rs = String(r);
    if (!/^\d+$/.test(rs)) {
      return false;
    }
    const num = Number(rs);
    if (num < 1 || num > n) {
      return false;
    }
    if (usedRanks.has(rs)) {
      return false;
    }
    usedRanks.add(rs);
  }
  for (let i = 1; i <= n; i += 1) {
    if (!usedRanks.has(String(i))) {
      return false;
    }
  }
  return true;
}

/** Cada clave con prioridad 1..n; el mismo número puede repetirse en distintas claves. */
function isValidCompleteRankingWithRepeats(value: string, optionValues: string[]): boolean {
  if (optionValues.length === 0) {
    return true;
  }
  if (!value?.trim()) {
    return false;
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(value) as Record<string, unknown>;
  } catch {
    return false;
  }
  const n = optionValues.length;
  for (const key of optionValues) {
    const r = parsed[key];
    if (r === undefined || r === null) {
      return false;
    }
    const rs = String(r);
    if (!/^\d+$/.test(rs)) {
      return false;
    }
    const num = Number(rs);
    if (num < 1 || num > n) {
      return false;
    }
  }
  return true;
}

function buildAnswersSchema(questions: SurveyQuestion[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const q of questions) {
    const fieldName = `question_${q.id}`;
    const labelShort = q.label.length > 80 ? `${q.label.slice(0, 77)}…` : q.label;
    if (q.type === 'yes_no') {
      const ynMsg = `Seleccione Sí o No. «${labelShort}».`;
      if (q.is_required) {
        shape[fieldName] = z
          .string({
            required_error: `Responda esta pregunta: «${labelShort}».`,
            invalid_type_error: `Responda esta pregunta: «${labelShort}».`,
          })
          .min(1, `Esta pregunta es obligatoria: «${labelShort}».`)
          .refine((val) => val === 'yes' || val === 'no', { message: ynMsg });
      } else {
        shape[fieldName] = z
          .string({ invalid_type_error: `Valor no válido en: «${labelShort}».` })
          .refine((val) => !val || val === 'yes' || val === 'no', { message: ynMsg });
      }
      continue;
    }
    if (q.type === 'ranking') {
      const optionValues = (q.options ?? []).map((o) => o.value);
      const n = optionValues.length;
      const unique = q.ranking_unique_priority !== false;
      const rankingMsg = unique
        ? n > 0
          ? `Asigne una prioridad distinta a cada ítem (del 1 al ${n}). «${labelShort}».`
          : `Complete la priorización. «${labelShort}».`
        : n > 0
          ? `Asigne a cada ítem una prioridad entre 1 y ${n} (puede repetir números). «${labelShort}».`
          : `Complete la priorización. «${labelShort}».`;
      const check = (val: string): boolean =>
        unique
          ? isValidCompleteRanking(val, optionValues)
          : isValidCompleteRankingWithRepeats(val, optionValues);
      if (q.is_required) {
        shape[fieldName] = z
          .string({
            required_error: `Responda esta pregunta: «${labelShort}».`,
            invalid_type_error: `Responda esta pregunta: «${labelShort}».`,
          })
          .min(1, `Esta pregunta es obligatoria: «${labelShort}».`)
          .refine((val) => check(val), { message: rankingMsg });
      } else {
        shape[fieldName] = z
          .string({ invalid_type_error: `Valor no válido en: «${labelShort}».` })
          .refine((val) => !val || check(val), { message: rankingMsg });
      }
      continue;
    }
    if (q.is_required) {
      shape[fieldName] = z
        .string({
          required_error: `Responda esta pregunta: «${labelShort}».`,
          invalid_type_error: `Responda esta pregunta: «${labelShort}».`,
        })
        .min(1, `Esta pregunta es obligatoria: «${labelShort}».`);
    } else {
      shape[fieldName] = z
        .string({
          invalid_type_error: `Valor no válido en: «${labelShort}».`,
        })
        .optional();
    }
  }
  return z.object(shape);
}

function buildDefaultAnswers(questions: SurveyQuestion[]): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const q of questions) {
    defaults[`question_${q.id}`] = '';
  }
  return defaults;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

interface StepDef {
  key: PageState;
  label: string;
  icon: React.ReactNode;
}

const SurveyStepIndicator: React.FC<{
  pageState: PageState;
  requiresAuth: boolean;
  requiresSignature: boolean;
}> = ({ pageState, requiresAuth, requiresSignature }) => {
  const steps: StepDef[] = [
    ...(requiresAuth ? [{ key: 'auth_required' as PageState, label: 'Verificación', icon: <User className="h-3.5 w-3.5" /> }] : []),
    { key: 'form' as PageState, label: 'Preguntas', icon: <ClipboardList className="h-3.5 w-3.5" /> },
    ...(requiresSignature ? [{ key: 'signature' as PageState, label: 'Firma', icon: <PenLine className="h-3.5 w-3.5" /> }] : []),
    { key: 'success' as PageState, label: 'Completado', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  ];

  const activeIndex = steps.findIndex((s) => s.key === pageState);

  return (
    <div className="flex items-center justify-center gap-0 mb-6 overflow-x-auto py-1">
      {steps.map((step, i) => {
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={[
                  'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                  isDone
                    ? 'bg-primary-prosalud border-primary-prosalud text-white'
                    : isActive
                      ? 'bg-white border-primary-prosalud text-primary-prosalud'
                      : 'bg-white border-slate-200 text-slate-400',
                ].join(' ')}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
              </div>
              <span
                className={[
                  'text-[11px] font-medium whitespace-nowrap',
                  isActive ? 'text-primary-prosalud' : isDone ? 'text-slate-600' : 'text-slate-400',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  'h-0.5 w-8 sm:w-16 mx-1 mt-[-16px] shrink-0 transition-colors',
                  i < activeIndex ? 'bg-primary-prosalud' : 'bg-slate-200',
                ].join(' ')}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface RankingFieldProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  /** Si true, al elegir un número se libera de otros ítems; si false, se permiten repeticiones. */
  uniquePriority: boolean;
}

const RankingField: React.FC<RankingFieldProps> = ({ options, value, onChange, uniquePriority }) => {
  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.value.localeCompare(b.value, 'es', { numeric: true, sensitivity: 'base' })),
    [options],
  );
  const ranks = useMemo(
    () => sortedOptions.map((_, i) => String(i + 1)),
    [sortedOptions],
  );

  const parsed: Record<string, string> = (() => {
    try {
      return value ? (JSON.parse(value) as Record<string, string>) : {};
    } catch {
      return {};
    }
  })();

  const handleChange = (optionValue: string, rank: string): void => {
    const updated = { ...parsed };
    if (uniquePriority) {
      Object.keys(updated).forEach((k) => {
        if (updated[k] === rank) {
          delete updated[k];
        }
      });
    }
    if (rank) {
      updated[optionValue] = rank;
    } else {
      delete updated[optionValue];
    }
    onChange(JSON.stringify(updated));
  };

  const isComplete = sortedOptions.length > 0 && sortedOptions.every((o) => Boolean(parsed[o.value]));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 items-center">
        <span className="text-xs font-medium text-slate-500">Ítem (orden A–Z)</span>
        <span className="text-xs font-medium text-slate-500 text-center w-28">Prioridad (1 = mayor)</span>
        {sortedOptions.map((opt) => {
          const current = parsed[opt.value];
          return (
            <React.Fragment key={opt.value}>
              <div className="flex gap-2 min-w-0 items-start text-sm text-slate-800">
                <span className="shrink-0 font-semibold tabular-nums w-6 text-right" aria-hidden>
                  {opt.value}
                </span>
                <span className="min-w-0 text-slate-700 leading-snug">) {opt.label}</span>
              </div>
              <Select
                value={current || undefined}
                onValueChange={(rank) => {
                  handleChange(opt.value, rank);
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {ranks.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </React.Fragment>
          );
        })}
      </div>
      {sortedOptions.length > 0 && !isComplete && (
        <p className="text-xs text-slate-400">
          {uniquePriority
            ? 'Asigne una prioridad distinta a cada ítem (sin repetir) para continuar.'
            : 'Ingrese la prioridad de cada ítem (1 = mayor); puede repetir el mismo número en varios.'}
        </p>
      )}
    </div>
  );
};

interface QuestionFieldProps {
  question: SurveyQuestion;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
}

const QuestionField: React.FC<QuestionFieldProps> = ({ question, control }) => {
  const fieldName = `question_${question.id}`;

  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-semibold text-slate-900">
            {question.label}
            {question.is_required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          {question.help_text && (
            <p className="text-xs text-slate-500 -mt-1">{question.help_text}</p>
          )}
          <FormControl>
            {question.type === 'text' ? (
              <Input type="text" {...field} value={field.value ?? ''} />
            ) : question.type === 'textarea' ? (
              <Textarea {...field} value={field.value ?? ''} rows={4} />
            ) : question.type === 'date' ? (
              <Input type="date" {...field} value={field.value ?? ''} />
            ) : question.type === 'number' ? (
              <Input type="number" {...field} value={field.value ?? ''} />
            ) : question.type === 'yes_no' ? (
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value ?? ''}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id={`${fieldName}_yes`} />
                  <label htmlFor={`${fieldName}_yes`} className="text-sm text-slate-700 cursor-pointer">
                    Sí
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id={`${fieldName}_no`} />
                  <label htmlFor={`${fieldName}_no`} className="text-sm text-slate-700 cursor-pointer">
                    No
                  </label>
                </div>
              </RadioGroup>
            ) : question.type === 'single_choice' ? (
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value ?? ''}
                className="flex flex-col gap-2"
              >
                {question.options?.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.value} id={`${fieldName}_${opt.value}`} />
                    <label
                      htmlFor={`${fieldName}_${opt.value}`}
                      className="text-sm text-slate-700 cursor-pointer"
                    >
                      {opt.label}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            ) : question.type === 'multiple_choice' ? (
              <div className="flex flex-col gap-2">
                {question.options?.map((opt) => {
                  const currentValues: string[] = (() => {
                    try {
                      return field.value ? JSON.parse(field.value) : [];
                    } catch {
                      return [];
                    }
                  })();
                  const isChecked = currentValues.includes(opt.value);
                  return (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${fieldName}_${opt.value}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const updated = checked
                            ? [...currentValues, opt.value]
                            : currentValues.filter((v) => v !== opt.value);
                          field.onChange(JSON.stringify(updated));
                        }}
                      />
                      <label
                        htmlFor={`${fieldName}_${opt.value}`}
                        className="text-sm text-slate-700 cursor-pointer"
                      >
                        {opt.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : question.type === 'scale' ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((val) => (
                    <Button
                      key={val}
                      type="button"
                      variant={field.value === val ? 'default' : 'outline'}
                      size="sm"
                      className={[
                        'w-10 h-10 p-0 font-semibold transition-all',
                        field.value === val
                          ? 'bg-primary-prosalud border-primary-prosalud text-white shadow-md scale-110'
                          : 'hover:border-primary-prosalud hover:text-primary-prosalud',
                      ].join(' ')}
                      onClick={() => field.onChange(val)}
                    >
                      {val}
                    </Button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-slate-400 px-1">
                  <span>1 — Mínimo</span>
                  <span>10 — Máximo</span>
                </div>
              </div>
            ) : question.type === 'ranking' ? (
              <RankingField
                options={question.options ?? []}
                value={field.value ?? ''}
                onChange={field.onChange}
                uniquePriority={question.ranking_unique_priority !== false}
              />
            ) : (
              <Input type="text" {...field} value={field.value ?? ''} />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface SuccessData {
  id: string;
  submitted_at: string;
}

const EncuestaDinamicaPage: React.FC = () => {
  const { id: surveyId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [survey, setSurvey] = useState<PublicSurveyInfo | null>(null);
  const [authData, setAuthData] = useState<AuthValues | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState<string>('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [authVerifying, setAuthVerifying] = useState(false);
  const [authServerError, setAuthServerError] = useState<string | null>(null);
  const [questionPageIndex, setQuestionPageIndex] = useState(0);
  const [selectedHospital, setSelectedHospital] = useState<string>('');

  const signaturePadRef = useRef<SignaturePadRef>(null);

  useEffect(() => {
    setQuestionPageIndex(0);
  }, [survey?.id]);

  // ── Load survey info ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!surveyId) {
      setPageState('not_found');
      return;
    }

    setPageState('loading');
    getSurveyInfo(surveyId)
      .then((data) => {
        setSurvey(data);
        setPageState(data.access_type !== 'public' ? 'auth_required' : 'form');
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 404 || status === 410 || status === 403) {
          setPageState('not_found');
        } else {
          toast.error('Error al cargar la encuesta. Intenta de nuevo más tarde.');
          setPageState('not_found');
        }
      });
  }, [surveyId]);

  // ── Auth form ───────────────────────────────────────────────────────────────

  const authForm = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      respondent_document_type: 'CC',
      respondent_document_number: '',
      fecha_expedicion: '',
    },
  });

  const handleAuthSubmit = async (values: AuthValues): Promise<void> => {
    if (!surveyId) {
      return;
    }
    setAuthServerError(null);
    setAuthVerifying(true);
    try {
      await verifySurveyRespondent(surveyId, {
        respondent_document_type: values.respondent_document_type,
        respondent_document_number: values.respondent_document_number,
        fecha_expedicion: values.fecha_expedicion,
      });
      setAuthData(values);
      setPageState('form');
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } };
      };
      const body = err?.response?.data;
      const status = err?.response?.status;
      let summary = 'No se pudo verificar sus datos contra el registro de afiliados.';
      if (body?.errors && Object.keys(body.errors).length > 0) {
        const msgs = Object.values(body.errors).flat().filter(Boolean);
        summary =
          msgs.length > 0 ? msgs.join(' ') : (body.message ?? 'Revise los datos ingresados.');
      } else if (body?.message) {
        summary = body.message;
      } else if (status === 503) {
        summary = 'El servicio de verificación no está disponible en este momento. Intente más tarde.';
      }
      setAuthServerError(summary);
      toast.error('No se pudo verificar su identidad', { description: summary });
    } finally {
      setAuthVerifying(false);
    }
  };

  // ── Survey form ─────────────────────────────────────────────────────────────

  const answersSchema = survey ? buildAnswersSchema(survey.questions) : z.object({});
  const answersForm = useForm({
    resolver: zodResolver(answersSchema),
    defaultValues: survey ? buildDefaultAnswers(survey.questions) : {},
  });

  const handleAnswersSubmit = (values: Record<string, string>) => {
    setAnswers(values);
    if (survey?.requires_signature) {
      setPageState('signature');
    } else {
      void submitForm(values, '');
    }
  };

  // ── Signature step ──────────────────────────────────────────────────────────

  const handleSignatureConfirm = () => {
    const dataUrl = signaturePadRef.current?.toDataURL() ?? null;
    if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 100) {
      setSignatureError('La firma es requerida. Por favor, firme en el recuadro.');
      return;
    }
    setSignatureError(null);
    setSignature(dataUrl);
    void submitForm(answers, dataUrl);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const submitForm = async (formAnswers: Record<string, string>, sig: string) => {
    if (!surveyId || !survey) return;

    setPageState('submitting');
    setBackendError(null);

    const answersPayload = survey.questions
      .map((q) => ({
        question_id: q.id,
        value: formAnswers[`question_${q.id}`] ?? '',
      }))
      .filter((a) => a.value !== '');

    try {
      const result = await submitSurveyResponse(surveyId, {
        answers: answersPayload,
        respondent_document_type: authData?.respondent_document_type,
        respondent_document_number: authData?.respondent_document_number,
        fecha_expedicion: authData?.fecha_expedicion,
        hospital: survey.access_type === 'public' ? (selectedHospital || undefined) : undefined,
        signature: sig || undefined,
      });

      setSuccessData(result);
      setPageState('success');
      toast.success('Encuesta enviada correctamente');
    } catch (error: unknown) {
      const err = error as { response?: { status: number; data?: { message?: string; errors?: Record<string, string[]> } } };
      const status = err?.response?.status;
      const body = err?.response?.data;

      if (status === 422 && body?.errors && Object.keys(body.errors).length > 0) {
        const messages = Object.values(body.errors).flat().filter(Boolean);
        const description = messages.length > 0 ? messages.join('. ') : undefined;
        setBackendError(body.message ?? 'Errores de validación');
        toast.error(body.message ?? 'Errores de validación', { description });
        setPageState(survey.requires_signature ? 'signature' : 'form');
      } else if (status === 403) {
        setBackendError(body?.message ?? 'No tiene acceso para responder esta encuesta en su hospital.');
        setPageState(survey.requires_signature ? 'signature' : 'form');
      } else if (status === 503) {
        setBackendError(body?.message ?? 'Servicio temporalmente no disponible. Intente más tarde.');
        setPageState(survey.requires_signature ? 'signature' : 'form');
      } else {
        const msg = body?.message ?? (error instanceof Error ? error.message : 'Error al enviar la encuesta');
        setBackendError(msg);
        toast.error(msg);
        setPageState(survey.requires_signature ? 'signature' : 'form');
      }
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const totalQuestions = survey?.questions.length ?? 0;
  const questionPagesTotal =
    survey && totalQuestions > 0 ? Math.ceil(totalQuestions / QUESTIONS_PER_PAGE) : 1;
  const questionPageStart = questionPageIndex * QUESTIONS_PER_PAGE;
  const questionPageEnd = Math.min(questionPageStart + QUESTIONS_PER_PAGE, totalQuestions);
  const questionsOnThisPage = survey?.questions.slice(questionPageStart, questionPageEnd) ?? [];
  const isLastQuestionPage = questionPageIndex >= questionPagesTotal - 1;
  const questionProgressPercent =
    questionPagesTotal > 0 ? ((questionPageIndex + 1) / questionPagesTotal) * 100 : 0;

  const goToPreviousQuestionPage = (): void => {
    setQuestionPageIndex((p) => Math.max(0, p - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextQuestionPage = async (): Promise<void> => {
    const fields = questionsOnThisPage.map((q) => `question_${q.id}` as const);
    const valid = await answersForm.trigger(fields as unknown as string[]);
    if (!valid) {
      toast.error('Revise las preguntas de esta sección', {
        description: 'Hay campos obligatorios sin completar o con errores.',
      });
      return;
    }
    setQuestionPageIndex((p) => p + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <MainLayout>
      <div className="bg-slate-50 min-h-screen py-8">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <Breadcrumb className="mb-6">
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
                  <ClipboardList className="h-4 w-4" />
                  {survey?.title ?? 'Encuesta'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* ── Loading ─────────────────────────────────────────────────────── */}
          {pageState === 'loading' && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary-prosalud" />
              <p className="text-slate-600 text-sm">Cargando encuesta...</p>
            </div>
          )}

          {/* ── Not found ───────────────────────────────────────────────────── */}
          {pageState === 'not_found' && (
            <Card>
              <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Encuesta no disponible</h2>
                  <p className="text-slate-600 text-sm max-w-sm">
                    Esta encuesta no existe, ya fue cerrada o no está disponible en este momento.
                  </p>
                </div>
                <Button variant="outline" onClick={() => navigate('/')}>
                  Volver al inicio
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Auth required ────────────────────────────────────────────────── */}
          {pageState === 'auth_required' && survey && (
            <>
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">{survey.title}</h1>
                {survey.description && (
                  <p className="text-slate-600 text-sm">{survey.description}</p>
                )}
              </div>

              <SurveyStepIndicator
                pageState={pageState}
                requiresAuth={survey.access_type !== 'public'}
                requiresSignature={survey.requires_signature}
              />

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-primary-prosalud" />
                    Verificación de Identidad
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Esta encuesta requiere verificación contra el registro de afiliados (ProSanet). Solo podrá continuar si
                    los datos coinciden con un afiliado activo
                    {survey.access_type === 'restricted' ? ' y su hospital está autorizado para esta encuesta' : ''}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {authServerError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No se pudo verificar su identidad</AlertTitle>
                      <AlertDescription>{authServerError}</AlertDescription>
                    </Alert>
                  )}
                  <Form {...authForm}>
                    <form onSubmit={authForm.handleSubmit(handleAuthSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={authForm.control}
                          name="respondent_document_type"
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
                          name="respondent_document_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de documento</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Solo dígitos"
                                  onChange={(e) =>
                                    field.onChange(sanitizeId(e.target.value, { maxLength: 15 }))
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={authForm.control}
                          name="fecha_expedicion"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha de expedición</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  max={new Date().toISOString().split('T')[0]}
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Tal como aparece en su documento de identidad.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => navigate('/')}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" className="bg-primary-prosalud min-w-[120px]" disabled={authVerifying}>
                          {authVerifying ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Verificando…
                            </>
                          ) : (
                            'Continuar →'
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Survey form ──────────────────────────────────────────────────── */}
          {pageState === 'form' && survey && (
            <>
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">{survey.title}</h1>
                {survey.description && (
                  <p className="text-slate-600 text-sm text-justify">{survey.description}</p>
                )}
              </div>

              <SurveyStepIndicator
                pageState={pageState}
                requiresAuth={survey.access_type !== 'public'}
                requiresSignature={survey.requires_signature}
              />

              {backendError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error al enviar</AlertTitle>
                  <AlertDescription>{backendError}</AlertDescription>
                </Alert>
              )}

              <Card>
                <CardContent className="pt-6">
                  {totalQuestions > QUESTIONS_PER_PAGE && (
                    <div className="mb-6 space-y-2">
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-xs text-slate-600">
                        <span>
                          Sección {questionPageIndex + 1} de {questionPagesTotal}
                        </span>
                        <span className="text-slate-500">
                          Preguntas {questionPageStart + 1}–{questionPageEnd} de {totalQuestions}
                        </span>
                      </div>
                      <Progress
                        value={questionProgressPercent}
                        className="h-2"
                        indicatorClassName="bg-primary-prosalud"
                      />
                    </div>
                  )}

                  {survey.access_type === 'public' && survey.hospitals_for_form.length > 0 && questionPageIndex === 0 && (
                    <div className="mb-6 space-y-2">
                      <label className="text-sm font-semibold text-slate-900">
                        Hospital / Institución <span className="text-slate-400 font-normal">(opcional)</span>
                      </label>
                      <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione su hospital" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— No especificar —</SelectItem>
                          {survey.hospitals_for_form.map((h) => (
                            <SelectItem key={h.id} value={h.name}>
                              {h.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Form {...answersForm}>
                    <form
                      onSubmit={answersForm.handleSubmit((values) =>
                        handleAnswersSubmit(values as Record<string, string>),
                      )}
                      className="space-y-6"
                    >
                      {questionsOnThisPage.map((question, index) => {
                        const globalIndex = questionPageStart + index;
                        return (
                          <div key={question.id} className="space-y-2">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                              Pregunta {globalIndex + 1} de {totalQuestions}
                            </p>
                            <QuestionField question={question} control={answersForm.control} />
                          </div>
                        );
                      })}

                      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center pt-5 border-t">
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full sm:w-auto text-slate-500"
                          onClick={() => navigate('/')}
                        >
                          Cancelar
                        </Button>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:flex-1">
                          {questionPageIndex > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={goToPreviousQuestionPage}
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Anterior
                            </Button>
                          )}
                          {!isLastQuestionPage ? (
                            <Button
                              type="button"
                              className="bg-primary-prosalud w-full sm:w-auto min-w-[120px]"
                              onClick={() => void goToNextQuestionPage()}
                            >
                              Siguiente
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          ) : (
                            <Button type="submit" className="bg-primary-prosalud w-full sm:w-auto min-w-[140px]">
                              {survey.requires_signature ? (
                                <>
                                  <PenLine className="h-4 w-4 mr-2" />
                                  Continuar a firma
                                </>
                              ) : (
                                'Enviar encuesta'
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Signature ────────────────────────────────────────────────────── */}
          {pageState === 'signature' && survey && (
            <>
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">{survey.title}</h1>
                <p className="text-slate-600 text-sm">
                  Por favor, firme en el recuadro para confirmar la información registrada.
                </p>
              </div>

              <SurveyStepIndicator
                pageState={pageState}
                requiresAuth={survey.access_type !== 'public'}
                requiresSignature={survey.requires_signature}
              />

              {backendError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error al enviar</AlertTitle>
                  <AlertDescription>{backendError}</AlertDescription>
                </Alert>
              )}

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-1">Firma Digital</p>
                    <p className="text-xs text-slate-500">
                      Use el ratón o toque la pantalla para trazar su firma.
                    </p>
                  </div>
                  <SignaturePad
                    ref={signaturePadRef}
                    onChange={(dataUrl) => setSignature(dataUrl ?? '')}
                    height={200}
                  />
                  {signatureError && (
                    <p className="text-sm text-destructive">{signatureError}</p>
                  )}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-slate-500"
                      onClick={() => {
                        setBackendError(null);
                        setSignatureError(null);
                        setPageState('form');
                      }}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Volver
                    </Button>
                    <Button
                      type="button"
                      className="bg-primary-prosalud min-w-[140px]"
                      onClick={handleSignatureConfirm}
                    >
                      Enviar encuesta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Submitting ───────────────────────────────────────────────────── */}
          {pageState === 'submitting' && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary-prosalud" />
              <p className="text-slate-600 text-sm">Enviando respuestas...</p>
            </div>
          )}

          {/* ── Success ──────────────────────────────────────────────────────── */}
          {pageState === 'success' && successData && survey && (
            <>
              <SurveyStepIndicator
                pageState={pageState}
                requiresAuth={survey.access_type !== 'public'}
                requiresSignature={survey.requires_signature}
              />
            <Card>
              <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">
                    ¡Encuesta enviada exitosamente!
                  </h2>
                  <p className="text-slate-600 text-sm max-w-sm">
                    Gracias por participar. Sus respuestas han sido registradas correctamente.
                  </p>
                </div>
                <div className="w-full max-w-sm rounded-lg bg-green-50 border border-green-200 p-4 text-left space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">N.° de confirmación</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm font-semibold text-slate-900 font-mono cursor-default">{successData.id}</p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Guarde este código como comprobante de su envío.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fecha de envío</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {new Date(successData.submitted_at).toLocaleString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <Button className="bg-primary-prosalud" onClick={() => navigate('/')}>
                  Volver al inicio
                </Button>
              </CardContent>
            </Card>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default EncuestaDinamicaPage;
