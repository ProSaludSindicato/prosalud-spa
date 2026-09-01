import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import AdminLayout from '@/components/admin/AdminLayout';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import {
  FileSignature,
  Send,
  History,
  BarChart3,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Eye,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  X,
  Plus,
  FileText,
  FilePlus,
  User,
  Building2,
  DollarSign,
  Settings,
  IdCard,
  Hash,
  Download,
  FileDown,
  Upload,
  FileSpreadsheet,
  PenLine,
  CheckSquare,
} from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Checkbox } from '@/components/ui/checkbox';
// Manual signing service (ACTIVE)
import {
  getEmailHistory as getEmailHistoryManual,
  resendEmails as resendEmailsManual,
  getStatistics as getStatisticsManual,
  getTrackingDetail,
  generateAndSendConvenio,
  downloadGeneratedConvenio,
  exportTemplate,
  importBulkConvenios,
  downloadConvenioFinalPdf,
  downloadConvenioOriginalPdf,
  signAsPresident,
  signAsPresidentBulk,
  ConvenioEmailTracking,
  ConvenioDeliveryMode,
  EmailHistoryParams as ManualEmailHistoryParams,
  EmailHistoryEstadoFiltro,
  GenerateAndSendConvenioRequest,
  GenerateAndSendConvenioResponse,
  DownloadGeneratedConvenioResult,
  ImportBulkConveniosResponse,
  TrackingDetailResponse,
} from '@/services/conveniosManualService';
import {
  authenticateForDataUpdate,
  AuthenticateForDataUpdateRequest,
  AfiliadoDataForUpdate,
  ConvenioDataForUpdate,
} from '@/services/afiliadosDataUpdateService';
// DocuSign service (TEMPORARILY DISABLED - preserved for future use)
// El servicio documentSigningService.ts contiene toda la funcionalidad de DocuSign
// y está preservado para reactivación futura. Las rutas del backend están comentadas
// pero no eliminadas. Para reactivar, cambiar DOCUSIGN_ENABLED a true y descomentar
// las importaciones y código relacionado.
// import { sendBulkEmails, getEmailHistory, resendEmails, getStatistics, EmailTracking, EmailHistoryParams } from '@/services/documentSigningService';
import DataPagination from '@/components/ui/data-pagination';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { buildConvenioHospitalOptions } from '@/utils/hospitalDisplayName';

// Opciones de hospitales / sedes (catálogo alineado con backend Laravel)
const HOSPITAL_OPTIONS = buildConvenioHospitalOptions();

// Mapa de label de hospital a ciudad para prediligenciar ciudad cuando aplique
const HOSPITAL_CITY_MAP: Record<string, string> = {
  'E.S.E. Hospital La María': 'MEDELLÍN (ANT)',
  'E.S.E. Hospital Marco Fidel Suarez de Bello': 'BELLO (ANT)',
  'E.S.E. Hospital San Juan de Dios - Rionegro': 'RIONEGRO (ANT)',
  'E.S.E. Hospital Carisma': 'MEDELLÍN (ANT)',
};

// Schema de validación para el formulario de crear convenio
const createConvenioSchema = z.object({
  // Campos requeridos
  numero_documento: z.string().min(1, 'El número de documento es requerido').max(50, 'El número de documento no puede exceder 50 caracteres'),
  apellidos: z.string().min(1, 'Los apellidos son requeridos').max(255, 'Los apellidos no pueden exceder 255 caracteres'),
  nombres: z.string().min(1, 'Los nombres son requeridos').max(255, 'Los nombres no pueden exceder 255 caracteres'),
  fecha_nacimiento: z.string().min(1, 'La fecha de nacimiento es requerida').refine((val) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(val);
  }, 'La fecha de nacimiento debe estar en formato YYYY-MM-DD'),
  lugar_nacimiento: z.string().min(1, 'El lugar de nacimiento es requerido').max(255, 'El lugar de nacimiento no puede exceder 255 caracteres'),
  
  // Campos requeridos - Datos del Convenio
  proceso: z.string().min(1, 'El proceso es requerido').max(255, 'El proceso no puede exceder 255 caracteres'),
  ciudad: z.string().min(1, 'La ciudad es requerida').max(255, 'La ciudad no puede exceder 255 caracteres'),
  sede: z.string().min(1, 'La sede es requerida').max(255, 'La sede no puede exceder 255 caracteres'),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es requerida').refine((val) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(val);
  }, 'La fecha debe estar en formato YYYY-MM-DD'),
  fecha_finalizacion: z.string().optional().refine((val) => {
    if (!val) return true;
    return /^\d{4}-\d{2}-\d{2}$/.test(val);
  }, 'La fecha debe estar en formato YYYY-MM-DD'),
  direccion: z.string().min(1, 'La dirección es requerida').max(500, 'La dirección no puede exceder 500 caracteres'),
  celular: z.string().min(1, 'El celular es requerido').max(50, 'El celular no puede exceder 50 caracteres'),
  
  // Campos requeridos - Compensación
  tipo_compensacion: z.enum(['redactada', 'valores'], { required_error: 'Selecciona un tipo de compensación' }),
  compensacion_basica_redactada: z.string().optional(),
  
  // Campos opcionales - Valores de Compensación
  basico: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  auxilios: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  auxilio_especial: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  manutencion: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  provisiones: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  horas: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  valor_hora_diurna: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  valor_hora_nocturna: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  valor_hora_diurna_festiva: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  valor_hora_nocturna_festiva: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  auxilio_de_transporte: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  auxilio_de_manutencion: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  auxilio_de_encierro: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  auxilio_de_rodamiento: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  valor_auxilio_diurno: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  valor_auxilio_recargo_nocturno: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  valor_auxilio_recargo_festivo: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  valor_auxilio_recargo_festivo_nocturno: z.number().min(0, 'El valor debe ser mayor o igual a 0').optional(),
  
  // Campos opcionales - Techo (TEMPORALMENTE COMENTADO)
  // tiene_techo: z.boolean().optional(),
  
  // Campos opcionales - Opciones de Procesamiento
  send_email: z.boolean().optional(),
  email: z.string().email('El email debe tener un formato válido').max(255, 'El email no puede exceder 255 caracteres').optional(),
  download: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // Validar compensación según el tipo seleccionado
  if (data.tipo_compensacion === 'redactada') {
    if (!data.compensacion_basica_redactada || data.compensacion_basica_redactada.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La compensación redactada es requerida',
        path: ['compensacion_basica_redactada'],
      });
    }
  } else if (data.tipo_compensacion === 'valores') {
    // Validar que al menos un valor de compensación haya sido diligenciado
    const hasAnyValue =
      data.basico != null ||
      data.auxilios != null ||
      data.auxilio_especial != null ||
      data.manutencion != null ||
      data.provisiones != null ||
      data.valor_hora_diurna != null ||
      data.valor_hora_nocturna != null ||
      data.valor_hora_diurna_festiva != null ||
      data.valor_hora_nocturna_festiva != null ||
      data.auxilio_de_transporte != null ||
      data.auxilio_de_manutencion != null ||
      data.auxilio_de_encierro != null ||
      data.auxilio_de_rodamiento != null ||
      data.valor_auxilio_diurno != null ||
      data.valor_auxilio_recargo_nocturno != null ||
      data.valor_auxilio_recargo_festivo != null ||
      data.valor_auxilio_recargo_festivo_nocturno != null;

    if (!hasAnyValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debes diligenciar al menos un valor de compensación cuando se usan valores individuales',
        path: ['tipo_compensacion'],
      });
    }
  }
  
  // Validar email si send_email está activado
  if (data.send_email) {
    if (!data.email || data.email.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El correo electrónico es requerido cuando se activa el envío por correo',
        path: ['email'],
      });
    }
  }
});

type CreateConvenioFormValues = z.infer<typeof createConvenioSchema>;

/** Misma convención que AdminSolicitudBienestarPage / AdminUsuariosPage / AdminDashboard (grid en TabsList reparte el ancho). */
const CONVENIO_TAB_TRIGGER_CLASS =
  'flex w-full min-w-0 items-center justify-center gap-2 overflow-hidden data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-all duration-200';

const AdminDocumentSigningPage: React.FC = () => {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState('history');

  useEffect(() => {
    if (activeTab === 'send') {
      setActiveTab('history');
    }
  }, [activeTab]);

  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  
  // Estados para importación masiva
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bulkSendEmail, setBulkSendEmail] = useState(true);
  const [importResult, setImportResult] = useState<ImportBulkConveniosResponse | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [selectedTrackingId, setSelectedTrackingId] = useState<number | null>(null);
  const [selectedTrackingInfo, setSelectedTrackingInfo] = useState<ConvenioEmailTracking | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resendEmailSubject, setResendEmailSubject] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [isBulkResending, setIsBulkResending] = useState(false);
  const [trackingDetailOpen, setTrackingDetailOpen] = useState(false);
  const [trackingDetail, setTrackingDetail] = useState<TrackingDetailResponse['data'] | null>(null);
  const [isLoadingTrackingDetail, setIsLoadingTrackingDetail] = useState(false);
  
  // Estado para consulta de afiliado
  const [consultTipoDocumento, setConsultTipoDocumento] = useState<string>('CC');
  const [consultDocumento, setConsultDocumento] = useState<string>('');
  const [consultFechaExpedicion, setConsultFechaExpedicion] = useState<string>('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [consultedData, setConsultedData] = useState<{
    afiliado: AfiliadoDataForUpdate;
    convenios: ConvenioDataForUpdate[];
  } | null>(null);
  
  // Función para obtener el primer día del mes actual
  const getFirstDayOfCurrentMonth = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  // Form para crear convenio
  const createConvenioForm = useForm<CreateConvenioFormValues>({
    resolver: zodResolver(createConvenioSchema),
    defaultValues: {
      numero_documento: '',
      apellidos: '',
      nombres: '',
      fecha_nacimiento: '',
      lugar_nacimiento: '',
      proceso: '',
      ciudad: '',
      sede: '',
      fecha_inicio: getFirstDayOfCurrentMonth(),
      direccion: '',
      celular: '',
      send_email: true,
      download: true,
      tipo_compensacion: undefined,
      // tiene_techo: false, // TEMPORALMENTE COMENTADO
    },
  });
  
  // Observar el tipo de compensación seleccionado
  const tipoCompensacion = createConvenioForm.watch('tipo_compensacion');
  
  // Componente helper para input monetario
  const MoneyInput = ({ field, placeholder, ...props }: { field: any; placeholder?: string; [key: string]: any }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [localValue, setLocalValue] = useState<string>(() => 
      field.value !== undefined && field.value !== null ? field.value.toString() : ''
    );
    const isFocusedRef = useRef(false);
    const hasInitializedRef = useRef(false);
    
    // Función para formatear número con separadores de miles
    const formatNumber = (value: string): string => {
      if (!value || value === '') return '';
      // Remover cualquier formato existente
      const numericValue = value.replace(/\./g, '');
      // Formatear con puntos como separadores de miles
      return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };
    
    // Función para remover formato (solo números)
    const unformatNumber = (value: string): string => {
      return value.replace(/\./g, '');
    };
    
    // Inicializar el valor local solo una vez al montar o cuando cambia externamente (no desde el input)
    useEffect(() => {
      if (!isFocusedRef.current && !hasInitializedRef.current) {
        const newValue = field.value !== undefined && field.value !== null ? field.value.toString() : '';
        setLocalValue(newValue);
        hasInitializedRef.current = true;
      }
    }, []);
    
    // Sincronizar solo cuando el valor cambia externamente (reset del formulario, prediligenciado, etc.)
    // pero NO cuando el input está enfocado
    useEffect(() => {
      if (!isFocusedRef.current) {
        const newValue = field.value !== undefined && field.value !== null ? field.value.toString() : '';
        if (newValue !== localValue) {
          setLocalValue(newValue);
        }
      }
    }, [field.value]);
    
    // Valor formateado para mostrar (con puntos como separadores de miles)
    const displayValue = isFocusedRef.current 
      ? localValue // Mientras está enfocado, mostrar sin formato para facilitar edición
      : formatNumber(localValue); // Cuando no está enfocado, mostrar formateado
    
    return (
      <div className="flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="shrink-0 text-base text-muted-foreground select-none">$</div>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={displayValue}
          onFocus={() => {
            isFocusedRef.current = true;
            // Al enfocar, mostrar el valor sin formato para facilitar edición
            setLocalValue(unformatNumber(localValue));
          }}
          onChange={(e) => {
            const newValue = e.target.value;
            // Remover formato y permitir solo números
            const unformatted = unformatNumber(newValue);
            if (unformatted === '' || /^\d+$/.test(unformatted)) {
              setLocalValue(unformatted);
              // NO actualizar el formulario aquí para evitar re-renders
              // Solo actualizar en onBlur
            }
          }}
          onBlur={() => {
            isFocusedRef.current = false;
            // Actualizar el formulario solo cuando se pierde el foco
            const unformatted = unformatNumber(localValue);
            if (unformatted === '') {
              field.onChange(undefined);
            } else {
              const numValue = Number(unformatted);
              if (!isNaN(numValue)) {
                field.onChange(numValue);
              } else {
                field.onChange(undefined);
              }
            }
          }}
          className="block min-w-0 grow bg-background py-1.5 pr-3 pl-1 text-base text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-sm"
          {...props}
        />
        <div className="shrink-0 text-base text-muted-foreground select-none">COP</div>
      </div>
    );
  };
  
  // Función para consultar datos del afiliado
  const handleConsultAffiliate = async () => {
    if (!consultDocumento.trim() || !consultFechaExpedicion) {
      toast.error('Datos incompletos', {
        description: 'Por favor, ingresa el número de documento y la fecha de expedición.',
      });
      return;
    }

    setIsConsulting(true);
    try {
      const requestData: AuthenticateForDataUpdateRequest = {
        tipo_documento: consultTipoDocumento,
        documento: consultDocumento.trim(),
        fecha_expedicion: consultFechaExpedicion,
      };

      const response = await authenticateForDataUpdate(requestData);
      
      if (response.success && response.data) {
        setConsultedData({
          afiliado: response.data.afiliado,
          convenios: response.data.convenios,
        });
        
        // Prediligenciar formulario
        const afiliado = response.data.afiliado;
        const convenioActivo = response.data.convenios.find(c => c.estado === 'ACTIVO') || response.data.convenios[0];
        
        // Función helper para formatear fecha
        const formatDate = (dateString: string | null | undefined): string => {
          if (!dateString) return '';
          // Si ya está en formato YYYY-MM-DD, retornar directamente
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
          // Si tiene formato ISO con T, extraer solo la fecha
          if (dateString.includes('T')) return dateString.split('T')[0];
          // Intentar parsear y formatear
          try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } catch {
            // Si falla, retornar vacío
          }
          return '';
        };

        const toUpperSafe = (value: string | null | undefined) => (value || '').toUpperCase();

        // Función para normalizar texto (mayúsculas y sin acentos) para comparación
        const normalizeForComparison = (text: string): string => {
          return text
            .toUpperCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''); // Elimina acentos
        };

        // Buscar label legible de la sede a partir del código del convenio
        const rawSedeCode = convenioActivo?.cliente || '';
        const sedeOption = HOSPITAL_OPTIONS.find((opt) => opt.value === rawSedeCode);
        const sedeLabel = sedeOption?.label || rawSedeCode || '';
        
        // Buscar ciudad en el mapa usando comparación case-insensitive y sin acentos
        let ciudadDesdeSede = '';
        if (sedeLabel) {
          const normalizedSedeLabel = normalizeForComparison(sedeLabel);
          const matchingKey = Object.keys(HOSPITAL_CITY_MAP).find(
            key => normalizeForComparison(key) === normalizedSedeLabel
          );
          if (matchingKey) {
            ciudadDesdeSede = HOSPITAL_CITY_MAP[matchingKey];
          }
        }
        
        // Importante: no sobrescribir fecha_inicio.
        // Conservamos el valor actual del formulario (que por defecto es el primer día del mes en curso).
        const currentFechaInicio = createConvenioForm.getValues('fecha_inicio') || getFirstDayOfCurrentMonth();
        const currentFechaNacimiento = createConvenioForm.getValues('fecha_nacimiento') || '';
        const currentLugarNacimiento = createConvenioForm.getValues('lugar_nacimiento') || '';

        createConvenioForm.reset({
          numero_documento: afiliado.documento || '',
          apellidos: toUpperSafe(afiliado.apellidos),
          nombres: toUpperSafe(afiliado.nombres),
          fecha_nacimiento: (afiliado as any).fecha_nacimiento ? formatDate((afiliado as any).fecha_nacimiento) : currentFechaNacimiento,
          lugar_nacimiento: (afiliado as any).lugar_nacimiento ? toUpperSafe((afiliado as any).lugar_nacimiento) : currentLugarNacimiento,
          proceso: convenioActivo?.proceso ? toUpperSafe(convenioActivo.proceso) : '',
          ciudad: ciudadDesdeSede,
          sede: sedeLabel ? toUpperSafe(sedeLabel) : '',
          fecha_inicio: currentFechaInicio,
          fecha_finalizacion: formatDate(convenioActivo?.fecha_fin),
          direccion: afiliado.direccion || '',
          celular: afiliado.celular || '',
          send_email: true,
          email: afiliado.correo_personal || '',
          download: true,
          tipo_compensacion: undefined,
        });
        
        toast.success('Datos consultados exitosamente', {
          description: `Se encontraron los datos de ${afiliado.nombres} ${afiliado.apellidos}. El formulario ha sido prediligenciado.`,
          duration: 5000,
        });
      }
    } catch (error: any) {
      toast.error('Error al consultar', {
        description: error.message || 'No se pudo consultar los datos del afiliado. Verifica que el afiliado exista en el sistema.',
      });
      setConsultedData(null);
    } finally {
      setIsConsulting(false);
    }
  };
  
  // Filtros para historial (Manual)
  const [historyFilters, setHistoryFilters] = useState<ManualEmailHistoryParams>({
    per_page: 15,
    page: 1,
  });
  
  // Filtros para estadísticas (Manual)
  const [statsFilters, setStatsFilters] = useState<{ fecha_desde?: string; fecha_hasta?: string }>({});
  // Estado para selección múltiple (firma presidencial bulk)
  const [selectedTrackingIds, setSelectedTrackingIds] = useState<Set<number>>(new Set());
  const [isBulkSigning, setIsBulkSigning] = useState(false);
  const [forcePresidentPollingUntil, setForcePresidentPollingUntil] = useState<number | null>(null);
  const [pendingPresidentQueueUntil, setPendingPresidentQueueUntil] = useState<Record<number, number>>({});

  const shouldForcePresidentPolling =
    forcePresidentPollingUntil !== null && Date.now() < forcePresidentPollingUntil;

  // Query para historial (Manual) — con polling automático cuando hay firmas en curso
  const { data: historyData, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['convenios-manual-history', historyFilters],
    queryFn: () => getEmailHistoryManual(historyFilters),
    enabled: activeTab === 'history' && can('document_signing.view'),
    refetchInterval: (query) => {
      const data = query.state.data;
      const inProgress = (data?.data.data ?? []).some(
        (t) => t.signing_estado === 'firmando_presidente',
      );
      return inProgress || shouldForcePresidentPolling ? 8000 : false;
    },
  });

  // Query para estadísticas (Manual)
  const { data: statsData, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['convenios-manual-statistics', statsFilters],
    queryFn: () => getStatisticsManual(statsFilters),
    enabled: activeTab === 'statistics' && can('document_signing.view'),
  });

  // Feature flag: la firma digital se oculta cuando el backend la tiene deshabilitada.
  // Se obtiene desde la primera respuesta disponible (historial o estadísticas).
  const digitalSigningEnabled: boolean =
    historyData?.digital_signing_enabled ??
    statsData?.data?.digital_signing_enabled ??
    true;

  const autoSignEnabled: boolean =
    historyData?.auto_sign_enabled ??
    statsData?.data?.auto_sign_enabled ??
    false;

  const deliveryMode: ConvenioDeliveryMode =
    historyData?.delivery_mode ??
    statsData?.delivery_mode ??
    'production';

  const isTestDeliveryMode = deliveryMode === 'test';

  const presidentSignButtonClassName =
    'bg-accent text-accent-foreground shadow-sm hover:bg-accent/90 focus-visible:ring-accent';

  const shouldShowEmailResend = (tracking: ConvenioEmailTracking): boolean => {
    if (!digitalSigningEnabled) {
      return true;
    }

    const estado = tracking.signing_estado;
    if (!estado) {
      return true;
    }

    if (
      estado === 'firmado_afiliado' ||
      estado === 'firmando_presidente' ||
      estado === 'error_firma_presidente' ||
      estado === 'completado'
    ) {
      return false;
    }

    return true;
  };

  const canResendTracking = (tracking: ConvenioEmailTracking): boolean =>
    tracking.available_actions?.resend ?? shouldShowEmailResend(tracking);

  const queuePresidentProcessingFeedback = (trackingIds: number[], durationMs = 45000): void => {
    if (trackingIds.length === 0) {
      return;
    }

    const until = Date.now() + durationMs;
    setPendingPresidentQueueUntil((previous) => {
      const next = { ...previous };
      trackingIds.forEach((trackingId) => {
        next[trackingId] = until;
      });
      return next;
    });
    setForcePresidentPollingUntil(until);
  };

  // Estado para controlar descarga asíncrona
  const [isDownloadingConvenio, setIsDownloadingConvenio] = useState(false);
  const [lastCreateOptions, setLastCreateOptions] = useState<{ numero_documento: string; download: boolean } | null>(null);

  // Mutación para crear convenio
  const createConvenioMutation = useMutation({
    mutationFn: (data: GenerateAndSendConvenioRequest) => generateAndSendConvenio(data),
    onSuccess: (response: GenerateAndSendConvenioResponse) => {
      toast.success('Convenio generado exitosamente', {
        description: response.message || 'La generación del convenio ha sido encolada correctamente.',
        duration: 5000,
      });
      
      // Mostrar warnings si existen
      if (response.warnings && response.warnings.length > 0) {
        response.warnings.forEach((warning) => {
          toast.warning('Advertencia', {
            description: warning,
            duration: 8000,
          });
        });
      }
      
      const responseTestMode = response.delivery_mode === 'test' || isTestDeliveryMode;

      if (response.data?.email && responseTestMode) {
        toast.info('Modo test', {
          description: 'El convenio quedó en historial para verificación y el PDF se enviará a tu correo de usuario.',
          duration: 5000,
        });
      } else if (response.data?.email) {
        toast.info('Correo encolado', {
          description: `El correo se enviará a ${(response.data.email as { email?: string }).email ?? 'el afiliado'}.`,
          duration: 5000,
        });
      }

      if (response.next_step === 'email-history' || responseTestMode) {
        setTimeout(() => {
          setActiveTab('history');
          void refetchHistory();
        }, 800);
      }

      // Si el usuario activó la descarga, iniciar polling para descargar el convenio generado
      if (lastCreateOptions?.download && lastCreateOptions.numero_documento) {
        const numeroDocumento = lastCreateOptions.numero_documento;
        setIsDownloadingConvenio(true);

        const pollDownload = async (attempt: number = 1) => {
          try {
            const result: DownloadGeneratedConvenioResult = await downloadGeneratedConvenio(numeroDocumento);

            if (result.status === 200 && result.blob) {
              // Archivo listo, descargar
              const blobUrl = window.URL.createObjectURL(result.blob);
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = `Convenio_${numeroDocumento}.pdf`;
              document.body.appendChild(link);
              link.click();
              link.remove();
              window.URL.revokeObjectURL(blobUrl);

              toast.success('Convenio descargado', {
                description: 'El convenio ha sido generado y descargado correctamente.',
              });
              setIsDownloadingConvenio(false);
              return;
            }

            // Si es 404 y está en proceso, continuar polling
            if (result.status === 404 && result.processing === true) {
              // Máximo 20 intentos = ~1 minuto (cada 3 segundos)
              if (attempt >= 20) {
                toast.error('Tiempo de espera agotado', {
                  description: 'El convenio está tardando más de lo esperado. Por favor, intente nuevamente más tarde desde el historial.',
                  duration: 8000,
                });
                setIsDownloadingConvenio(false);
                return;
              }

              // Mostrar mensaje informativo cada 5 intentos (cada 15 segundos)
              if (attempt % 5 === 1 && attempt > 1) {
                toast.info('Generando convenio...', {
                  description: `El convenio está en proceso. Intentando descargar... (${attempt}/20)`,
                  duration: 3000,
                });
              }

              // Esperar 3 segundos antes del siguiente intento
              setTimeout(() => pollDownload(attempt + 1), 3000);
              return;
            }

            // Si es 404 pero no está en proceso, o cualquier otro error
            const errorMessage = result.message || `El servidor respondió con estado ${result.status}`;
            toast.error('Error al descargar el convenio', {
              description: errorMessage,
              duration: 8000,
            });
            setIsDownloadingConvenio(false);
          } catch (error: any) {
            toast.error('Error al descargar el convenio', {
              description: error?.message || 'Ocurrió un error al intentar descargar el convenio generado.',
              duration: 8000,
            });
            setIsDownloadingConvenio(false);
          }
        };

        // Iniciar polling
        pollDownload();
      }
      
      // Resetear formulario con valores por defecto explícitos
      createConvenioForm.reset({
        numero_documento: '',
        apellidos: '',
        nombres: '',
        fecha_nacimiento: '',
        lugar_nacimiento: '',
        proceso: '',
        ciudad: '',
        sede: '',
        fecha_inicio: getFirstDayOfCurrentMonth(),
        fecha_finalizacion: '',
        direccion: '',
        celular: '',
        send_email: true,
        email: '',
        download: true,
        tipo_compensacion: undefined,
      });
      
      // Cambiar a historial para ver el nuevo convenio
      setTimeout(() => {
        setActiveTab('history');
        refetchHistory();
      }, 2000);
    },
    onError: (error: any) => {
      if (error.isValidationError && error.errors) {
        // Mostrar errores de validación
        Object.entries(error.errors).forEach(([field, messages]) => {
          const fieldMessages = Array.isArray(messages) ? messages : [messages];
          fieldMessages.forEach((message: string) => {
            toast.error(`Error en ${field}`, {
              description: message,
            });
          });
        });
      } else {
        toast.error('Error al generar el convenio', {
          description: error.message || 'Ocurrió un error al generar el convenio.',
        });
      }
    },
  });

  const handleDownloadConvenioFinal = async (tracking: ConvenioEmailTracking) => {
    try {
      await downloadConvenioFinalPdf(tracking.id, tracking.documento, tracking.signing_estado);
      toast.success('Descarga iniciada');
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: string }).message === 'string'
          ? (error as { message: string }).message
          : 'No se pudo descargar el convenio firmado';
      toast.error(message);
    }
  };

  const canDownloadOriginalConvenio = (tracking: ConvenioEmailTracking): boolean =>
    tracking.signing_estado !== 'firmado_afiliado' && tracking.signing_estado !== 'completado';

  const handleDownloadConvenioOriginal = async (tracking: ConvenioEmailTracking) => {
    try {
      await downloadConvenioOriginalPdf(tracking.id, tracking.documento);
      toast.success('Descarga del PDF original iniciada');
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: string }).message === 'string'
          ? (error as { message: string }).message
          : 'No se pudo descargar el PDF original';
      toast.error(message);
    }
  };
  
  // Handler para crear convenio
  const handleCreateConvenio = (data: CreateConvenioFormValues) => {
    const toUpperTrim = (value: string) => value ? value.trim().toUpperCase() : value;

    // Guardar última configuración para saber si debemos descargar automáticamente
    setLastCreateOptions({
      numero_documento: data.numero_documento,
      download: data.download ?? true,
    });

    // Preparar datos para el API
    const requestData: GenerateAndSendConvenioRequest = {
      numero_documento: data.numero_documento,
      apellidos: toUpperTrim(data.apellidos),
      nombres: toUpperTrim(data.nombres),
      fecha_nacimiento: data.fecha_nacimiento,
      lugar_nacimiento: toUpperTrim(data.lugar_nacimiento),
    };
    
    // Agregar campos opcionales solo si tienen valor
    if (data.proceso) requestData.proceso = toUpperTrim(data.proceso);
    if (data.ciudad) requestData.ciudad = data.ciudad;
    if (data.sede) requestData.sede = toUpperTrim(data.sede);
    if (data.fecha_inicio) requestData.fecha_inicio = data.fecha_inicio;
    if (data.fecha_finalizacion) requestData.fecha_finalizacion = data.fecha_finalizacion;
    if (data.direccion) requestData.direccion = data.direccion;
    if (data.celular) requestData.celular = data.celular;
    
    // Compensación: solo agregar según el tipo seleccionado
    if (data.tipo_compensacion === 'redactada' && data.compensacion_basica_redactada) {
      requestData.compensacion_basica_redactada = data.compensacion_basica_redactada;
    } else if (data.tipo_compensacion === 'valores') {
      // Solo agregar valores si el tipo es 'valores'
      if (data.basico !== undefined) requestData.basico = data.basico;
      if (data.auxilios !== undefined) requestData.auxilios = data.auxilios;
      if (data.auxilio_especial !== undefined) requestData.auxilio_especial = data.auxilio_especial;
      if (data.manutencion !== undefined) requestData.manutencion = data.manutencion;
      if (data.provisiones !== undefined) requestData.provisiones = data.provisiones;
      if (data.horas !== undefined) requestData.horas = data.horas;
      if (data.valor_hora_diurna !== undefined) requestData.valor_hora_diurna = data.valor_hora_diurna;
      if (data.valor_hora_nocturna !== undefined) requestData.valor_hora_nocturna = data.valor_hora_nocturna;
      if (data.valor_hora_diurna_festiva !== undefined) requestData.valor_hora_diurna_festiva = data.valor_hora_diurna_festiva;
      if (data.valor_hora_nocturna_festiva !== undefined) requestData.valor_hora_nocturna_festiva = data.valor_hora_nocturna_festiva;
      if (data.auxilio_de_transporte !== undefined) requestData.auxilio_de_transporte = data.auxilio_de_transporte;
      if (data.auxilio_de_manutencion !== undefined) requestData.auxilio_de_manutencion = data.auxilio_de_manutencion;
      if (data.auxilio_de_encierro !== undefined) requestData.auxilio_de_encierro = data.auxilio_de_encierro;
      if (data.auxilio_de_rodamiento !== undefined) requestData.auxilio_de_rodamiento = data.auxilio_de_rodamiento;
      if (data.valor_auxilio_diurno !== undefined) requestData.valor_auxilio_diurno = data.valor_auxilio_diurno;
      if (data.valor_auxilio_recargo_nocturno !== undefined) requestData.valor_auxilio_recargo_nocturno = data.valor_auxilio_recargo_nocturno;
      if (data.valor_auxilio_recargo_festivo !== undefined) requestData.valor_auxilio_recargo_festivo = data.valor_auxilio_recargo_festivo;
      if (data.valor_auxilio_recargo_festivo_nocturno !== undefined) requestData.valor_auxilio_recargo_festivo_nocturno = data.valor_auxilio_recargo_festivo_nocturno;
    }
    
    // Techo (TEMPORALMENTE COMENTADO)
    // if (data.tiene_techo) {
    //   requestData.tiene_techo = true;
    // }
    
    // Opciones de procesamiento
    if (data.send_email !== undefined) requestData.send_email = data.send_email;
    if (data.email) requestData.email = data.email;
    // Siempre usamos flujo asíncrono desde el frontend (download=false)
    requestData.download = false;
    
    createConvenioMutation.mutate(requestData);
  };

  // Función para descargar plantilla Excel
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const blob = await exportTemplate();
      
      // Generar nombre de archivo con fecha actual (YYYY-MM-DD)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      const fileName = `Plantilla_Convenios_Masivos_${dateString}.xlsx`;
      
      // Crear URL temporal y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Plantilla descargada', {
        description: 'El archivo Excel se ha descargado correctamente.',
        duration: 3000,
      });
    } catch (error: any) {
      toast.error('Error al descargar la plantilla', {
        description: error.message || 'Ocurrió un error al descargar la plantilla.',
      });
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Función para manejar cambio de archivo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validar tipo de archivo
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('Archivo inválido', {
        description: 'El archivo debe ser un Excel (.xlsx o .xls).',
      });
      setSelectedFile(null);
      return;
    }

    // Validar tamaño (10MB máximo)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      toast.error('Archivo muy grande', {
        description: 'El archivo no puede ser mayor a 10MB.',
      });
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setImportResult(null); // Limpiar resultado anterior
  };

  // Mutación para importar convenios masivamente
  const importBulkMutation = useMutation({
    mutationFn: (data: { file: File; send_email: boolean }) => 
      importBulkConvenios(data.file, data.send_email),
    onSuccess: (response) => {
      setImportResult(response);
      const { procesados, exitosos, errores } = response.data;

      if (exitosos === 0 && errores > 0) {
        toast.error('Importación con errores', {
          description: response.message || `${errores} fila(s) tuvieron errores. Revisa los detalles abajo.`,
          duration: 8000,
        });
      } else if (exitosos > 0 && errores > 0) {
        toast.warning('Importación parcial', {
          description: response.message || `Se encolaron ${exitosos} de ${procesados} filas. ${errores} fila(s) tuvieron errores.`,
          duration: 8000,
        });
      } else if (exitosos > 0) {
        toast.success('Importación procesada', {
          description: response.message || `Se procesaron ${procesados} filas. ${exitosos} convenios encolados exitosamente.`,
          duration: 8000,
        });
      } else {
        toast.info('Importación completada', {
          description: response.message || 'No se encontraron filas con datos para procesar.',
          duration: 8000,
        });
      }

      if (exitosos > 0) {
        setTimeout(() => {
          setActiveTab('history');
          void refetchHistory();
        }, 1000);
      }
      
      // Limpiar archivo seleccionado
      setSelectedFile(null);
      const fileInput = document.getElementById('bulk-import-file') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    },
    onError: (error: any) => {
      if (error.isValidationError) {
        if (error.missing_columns && error.missing_columns.length > 0) {
          toast.error('Columnas requeridas faltantes', {
            description: `Faltan las siguientes columnas: ${error.missing_columns.join(', ')}. Descarga la plantilla para ver el formato correcto.`,
            duration: 10000,
          });
        } else if (error.errors) {
          Object.entries(error.errors).forEach(([field, messages]) => {
            const fieldMessages = Array.isArray(messages) ? messages : [messages];
            fieldMessages.forEach((message: string) => {
              toast.error(`Error en ${field}`, {
                description: message,
              });
            });
          });
        } else {
          toast.error('Error de validación', {
            description: error.message || 'El archivo no cumple con los requisitos.',
          });
        }
      } else {
        toast.error('Error al importar convenios', {
          description: error.message || 'Ocurrió un error al procesar el archivo.',
        });
      }
    },
  });

  // Función para importar convenios
  const handleImportBulk = () => {
    if (!selectedFile) {
      toast.error('Archivo requerido', {
        description: 'Por favor, selecciona un archivo Excel para importar.',
      });
      return;
    }

    importBulkMutation.mutate({
      file: selectedFile,
      send_email: bulkSendEmail,
    });
  };

  const handleBulkResend = async () => {
    if (resendEligibleSelectedIds.length === 0) {
      return;
    }

    setIsBulkResending(true);
    try {
      const response = await resendEmailsManual({
        tracking_ids: resendEligibleSelectedIds,
      });

      if (response.data.success_count > 0) {
        toast.success(
          resendEligibleSelectedIds.length > 1 ? 'Reenvíos encolados' : 'Reenvío encolado',
          {
            description:
              response.message ??
              (isTestDeliveryMode
                ? 'En modo test los correos llegarán al usuario que realiza la solicitud.'
                : 'Consulte el historial para ver el estado.'),
          },
        );
        setSelectedTrackingIds(new Set());
        void refetchHistory();
      } else if (response.data.failed_count > 0) {
        toast.error('No se pudieron reenviar algunos registros', {
          description: response.data.results.failed[0]?.error ?? 'Revise el historial.',
        });
      }
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: string }).message === 'string'
          ? (error as { message: string }).message
          : 'Ocurrió un error al reenviar los convenios seleccionados.';
      toast.error('Error al reenviar', { description: message });
    } finally {
      setIsBulkResending(false);
    }
  };

  const handleOpenTrackingDetail = async (tracking: ConvenioEmailTracking): Promise<void> => {
    setTrackingDetailOpen(true);
    setTrackingDetail(null);
    setIsLoadingTrackingDetail(true);

    try {
      const response = await getTrackingDetail(tracking.id);
      setTrackingDetail(response.data);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: string }).message === 'string'
          ? (error as { message: string }).message
          : 'No se pudo cargar el detalle del convenio.';
      toast.error('Error al cargar detalle', { description: message });
      setTrackingDetailOpen(false);
    } finally {
      setIsLoadingTrackingDetail(false);
    }
  };

  const handleOpenResendDialog = (tracking: ConvenioEmailTracking) => {
    setSelectedTrackingId(tracking.id);
    setSelectedTrackingInfo(tracking);
    // Prediligenciar el correo actual si está disponible
    setResendEmail(tracking.email_afiliado || '');
    setResendEmailSubject('');
    setResendDialogOpen(true);
  };

  // Handler para reenvío (Manual) - después de confirmación
  const handleConfirmResend = async () => {
    if (!selectedTrackingId) return;

    // Validar email si se proporcionó
    if (resendEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(resendEmail.trim())) {
        toast.error('Email inválido', {
          description: 'Por favor, ingresa un email válido.',
        });
        return;
      }
    }

    setIsResending(true);
    try {
      const requestData: any = {
        tracking_ids: [selectedTrackingId],
      };

      // Agregar email si se proporcionó
      // Formato requerido: emails debe ser un objeto asociativo donde las claves
      // son los tracking_ids como strings y los valores son los correos electrónicos
      // Ejemplo: { "17": "nuevo-email@example.com" }
      if (resendEmail.trim()) {
        requestData.emails = {
          [selectedTrackingId.toString()]: resendEmail.trim(),
        };
      }

      // Agregar email_subject si se proporcionó
      if (resendEmailSubject.trim()) {
        requestData.email_subject = resendEmailSubject.trim();
      }

      const response = await resendEmailsManual(requestData);

      if (response.data.success_count > 0) {
        const responseTestMode = response.delivery_mode === 'test' || isTestDeliveryMode;
        toast.success('Correo reenviado exitosamente', {
          description:
            response.message ??
            (responseTestMode
              ? 'En modo test el correo llegará al usuario que realiza la solicitud.'
              : 'Consulte el historial para ver el estado.'),
        });
        refetchHistory();
        setResendDialogOpen(false);
        setSelectedTrackingId(null);
        setSelectedTrackingInfo(null);
        setResendEmail('');
        setResendEmailSubject('');
      } else if (response.data.failed_count > 0) {
        const failed = response.data.results.failed.find(f => f.tracking_id === selectedTrackingId);
        toast.error('Error al reenviar', {
          description: failed?.error || 'No se pudo reenviar el correo.',
        });
      }
    } catch (error: any) {
      toast.error('Error al reenviar correo', {
        description: error.message || 'Ocurrió un error al reenviar el correo.',
      });
    } finally {
      setIsResending(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
      return dateString;
    }
  };

  // Badge de estado para Manual
  const getManualStatusBadge = (status: ConvenioEmailTracking['estado']) => {
    const statusConfig = {
      pendiente: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      enviado: { label: 'Enviado', variant: 'default' as const, icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-200' },
      fallido: { label: 'Fallido', variant: 'destructive' as const, icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200' },
      verificacion: { label: 'Verificación', variant: 'outline' as const, icon: Eye, color: 'bg-sky-100 text-sky-800 border-sky-200' },
    };

    const config = statusConfig[status] || statusConfig.pendiente;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`inline-flex w-fit items-center gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getSigningEstadoBadge = (tracking: ConvenioEmailTracking) => {
    const signingEstado = tracking.signing_estado;
    if (!signingEstado) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }

    if (signingEstado === 'pendiente_firma') {
      return (
        <Badge
          variant="outline"
          className="border-amber-400 bg-amber-50 text-xs text-amber-950 hover:bg-amber-50 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-50 dark:hover:bg-amber-950/50"
        >
          Pendiente firma
        </Badge>
      );
    }

    if (signingEstado === 'firmando_presidente') {
      return (
        <Badge
          variant="outline"
          className="border-blue-400 bg-blue-50 text-xs text-blue-900 hover:bg-blue-50 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-100 dark:hover:bg-blue-950/50"
        >
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Firmando presidente
        </Badge>
      );
    }

    if (signingEstado === 'error_firma_presidente') {
      const errorMsg = tracking.president_sign_last_error;
      const badge = (
        <Badge variant="destructive" className="cursor-help text-xs">
          Error firma presidente
        </Badge>
      );

      if (errorMsg) {
        return (
          <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>{badge}</HoverCardTrigger>
            <HoverCardContent className="max-w-xs text-xs" side="top">
              <p className="font-medium text-destructive">Error al firmar</p>
              <p className="mt-1 text-muted-foreground">{errorMsg}</p>
              {tracking.president_sign_attempts != null && (
                <p className="mt-1 text-muted-foreground">
                  Intentos: {tracking.president_sign_attempts}
                </p>
              )}
            </HoverCardContent>
          </HoverCard>
        );
      }

      return badge;
    }

    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      firmado_afiliado: { label: 'Firmado afiliado', variant: 'default' },
      completado: { label: 'Completado ✓', variant: 'outline' },
      rechazado: { label: 'Rechazado', variant: 'destructive' },
    };

    const cfg = map[signingEstado] ?? { label: signingEstado, variant: 'secondary' as const };

    return (
      <Badge variant={cfg.variant} className="text-xs">
        {cfg.label}
      </Badge>
    );
  };

  // Handler para firmar un convenio individual como presidente
  const handleSignAsPresident = async (tracking: ConvenioEmailTracking) => {
    try {
      await signAsPresident(tracking.id);
      toast.success('Firma encolada', {
        description: `El convenio de ${tracking.nombre_afiliado} fue enviado a la cola de firma presidencial.`,
      });
      queuePresidentProcessingFeedback([tracking.id]);
      void refetchHistory();
    } catch (err: any) {
      toast.error('Error al encolar firma', {
        description: err?.message ?? 'No se pudo enviar el convenio a firma presidencial.',
      });
    }
  };

  // Handler para firma presidencial masiva
  const handleBulkSignAsPresident = async () => {
    if (presidentSignEligibleSelectedIds.length === 0) return;
    setIsBulkSigning(true);
    try {
      const result = await signAsPresidentBulk(presidentSignEligibleSelectedIds);
      toast.success(`${result.accepted} convenio(s) encolados`, {
        description:
          result.rejected.length > 0
            ? `${result.rejected.length} rechazados por estado inválido.`
            : 'Todos los convenios fueron enviados correctamente.',
      });
      const rejectedIds = new Set(result.rejected.map((item) => item.tracking_id));
      const acceptedIds = presidentSignEligibleSelectedIds.filter((trackingId) => !rejectedIds.has(trackingId));
      queuePresidentProcessingFeedback(acceptedIds);
      setSelectedTrackingIds((prev) => {
        const next = new Set(prev);
        presidentSignEligibleSelectedIds.forEach((id) => next.delete(id));
        return next;
      });
      void refetchHistory();
    } catch (err: any) {
      toast.error('Error en firma masiva', {
        description: err?.message ?? 'No se pudo procesar la firma masiva.',
      });
    } finally {
      setIsBulkSigning(false);
    }
  };

  const isEligibleForPresidentSign = (tracking: ConvenioEmailTracking): boolean =>
    tracking.signing_estado === 'firmado_afiliado' ||
    tracking.signing_estado === 'error_firma_presidente';

  const canDownloadOriginalTracking = (tracking: ConvenioEmailTracking): boolean =>
    tracking.available_actions?.download_original ?? canDownloadOriginalConvenio(tracking);

  const selectableTrackingIds = useMemo(() => {
    const items = historyData?.data.data ?? [];
    return items
      .filter((t) => canResendTracking(t) || isEligibleForPresidentSign(t))
      .map((t) => t.id);
  }, [historyData]);

  const resendEligibleSelectedIds = useMemo(() => {
    const items = historyData?.data.data ?? [];
    return Array.from(selectedTrackingIds).filter((id) => {
      const tracking = items.find((t) => t.id === id);
      return tracking ? canResendTracking(tracking) : false;
    });
  }, [selectedTrackingIds, historyData]);

  const presidentSignEligibleSelectedIds = useMemo(() => {
    const items = historyData?.data.data ?? [];
    return Array.from(selectedTrackingIds).filter((id) => {
      const tracking = items.find((t) => t.id === id);
      return tracking ? isEligibleForPresidentSign(tracking) : false;
    });
  }, [selectedTrackingIds, historyData]);

  const isPresidentSigningProcessing = (tracking: ConvenioEmailTracking): boolean => {
    if (tracking.signing_estado === 'firmando_presidente') {
      return true;
    }

    const pendingUntil = pendingPresidentQueueUntil[tracking.id];
    return typeof pendingUntil === 'number' && pendingUntil > Date.now();
  };

  const getSignedDownloadButtonConfig = (
    tracking: ConvenioEmailTracking,
  ): {
    label: string;
    tooltip: string;
    variant: 'default' | 'outline';
    ariaLabel: string;
    buttonClassName?: string;
  } => {
    if (tracking.signing_estado === 'completado') {
      return {
        label: 'Final',
        tooltip: 'Descargar convenio final (afiliado + presidente)',
        variant: 'default',
        ariaLabel: 'Descargar convenio final con ambas firmas',
      };
    }

    return {
      label: 'Afiliado',
      tooltip: 'Descargar convenio firmado solo por afiliado',
      variant: 'default',
      ariaLabel: 'Descargar convenio firmado por afiliado',
      buttonClassName:
        'border border-emerald-700/30 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-700 dark:hover:bg-emerald-600',
    };
  };

  // Datos para gráficas de estadísticas
  const chartData = useMemo(() => {
    if (!statsData?.data) return null;

    const statusData = [
      { name: 'Pendiente', cantidad: statsData.data.by_status.pendiente || 0, color: '#eab308' },
      { name: 'Enviado', cantidad: statsData.data.by_status.enviado || 0, color: '#22c55e' },
      { name: 'Fallido', cantidad: statsData.data.by_status.fallido || 0, color: '#ef4444' },
    ];

    return {
      statusData: statusData.filter(item => item.cantidad > 0),
      total: statsData.data.total,
    };
  }, [statsData]);

  const signingChartData = useMemo(() => {
    if (!statsData?.data?.signing) {
      return null;
    }
    const s = statsData.data.signing;
    const rows = [
      { name: 'Pendiente firma', cantidad: s.pendiente_firma, color: '#f59e0b' },
      { name: 'Firmado afiliado', cantidad: s.firmado_afiliado, color: '#0ea5e9' },
      { name: 'Completado', cantidad: s.completado, color: '#10b981' },
    ].filter((row) => row.cantidad > 0);

    return rows.length > 0 ? rows : null;
  }, [statsData]);

  const statsEmailSuccessPct = useMemo(() => {
    if (!statsData?.data?.total) {
      return 0;
    }
    return (statsData.data.sent / statsData.data.total) * 100;
  }, [statsData]);

  const statsSigningProgressPct = useMemo(() => {
    if (!statsData?.data?.signing) {
      return 0;
    }
    const s = statsData.data.signing;
    const denom = s.pendiente_firma + s.firmado_afiliado + s.completado;
    if (denom <= 0) {
      return 0;
    }
    return ((s.firmado_afiliado + s.completado) / denom) * 100;
  }, [statsData]);

  const chartConfig = {
    cantidad: { label: 'Cantidad de Envíos', color: '#8884d8' },
    Pendiente: { label: 'Pendiente', color: '#eab308' },
    Enviado: { label: 'Enviado', color: '#22c55e' },
    Fallido: { label: 'Fallido', color: '#ef4444' },
  };

  const canViewDocumentSigning = can('document_signing.view');
  const canManageDocumentSigning = can('document_signing.manage');
  const convenioTabsListGridCols =
    canViewDocumentSigning && canManageDocumentSigning
      ? 'grid-cols-4'
      : canManageDocumentSigning
        ? 'grid-cols-2'
        : canViewDocumentSigning
          ? 'grid-cols-2'
          : 'grid-cols-1';

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Firma de Convenios</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Genera convenios en PDF, importa masivamente y gestiona envíos desde el historial
              </p>
            </div>
          </div>

          {isTestDeliveryMode && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Modo test activo: al generar con envío de correo recibirás el PDF en tu usuario autenticado. Los reenvíos también llegan a tu correo, no al afiliado. Usa &quot;Ver detalle&quot; en el historial para revisar los datos ingresados.
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList
              className={cn(
                'grid h-auto w-full items-stretch bg-gray-50 border p-1',
                convenioTabsListGridCols,
              )}
            >
              {canViewDocumentSigning && (
                <TabsTrigger value="history" className={CONVENIO_TAB_TRIGGER_CLASS}>
                  <History className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">Historial</span>
                </TabsTrigger>
              )}
              {canManageDocumentSigning && (
                <TabsTrigger value="create" className={CONVENIO_TAB_TRIGGER_CLASS}>
                  <FilePlus className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">Crear Convenio</span>
                </TabsTrigger>
              )}
              {canManageDocumentSigning && (
                <TabsTrigger value="bulk-import" className={CONVENIO_TAB_TRIGGER_CLASS}>
                  <FileSpreadsheet className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">Importación Masiva</span>
                </TabsTrigger>
              )}
              {canViewDocumentSigning && (
                <TabsTrigger value="statistics" className={CONVENIO_TAB_TRIGGER_CLASS}>
                  <BarChart3 className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">Estadísticas</span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Tab: Historial */}
            {can('document_signing.view') && (
              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg sm:text-xl">Historial y seguimiento</CardTitle>
                        <CardDescription className="text-sm">
                          Consulta envíos, descarga PDFs, reenvía seleccionados y gestiona la firma digital desde un solo lugar.
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchHistory()}
                        disabled={isLoadingHistory}
                        className="flex-shrink-0"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                        Actualizar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <TooltipProvider delayDuration={300}>
                    {/* Filtros: 7 columnas en xl para una sola fila (2+2+1+1+1) */}
                    <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
                      <div className="space-y-2 sm:col-span-2 xl:col-span-2">
                        <Label>Buscar</Label>
                        <Input
                          placeholder="Documento o nombre de convenio"
                          value={historyFilters.q || ''}
                          onChange={(e) =>
                            setHistoryFilters({ ...historyFilters, q: e.target.value || undefined, page: 1 })
                          }
                        />
                      </div>

                      <div className="space-y-2 sm:col-span-2 xl:col-span-2">
                        <Label>Estado (correo o firma)</Label>
                        <Select
                          value={historyFilters.estado_filtro ?? 'todos'}
                          onValueChange={(value) =>
                            setHistoryFilters({
                              ...historyFilters,
                              estado_filtro:
                                value === 'todos' ? undefined : (value as EmailHistoryEstadoFiltro),
                              page: 1,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectGroup>
                              <SelectLabel>Envío del correo</SelectLabel>
                              <SelectItem value="pendiente">Pendiente de envío</SelectItem>
                              <SelectItem value="enviado">Enviado</SelectItem>
                              <SelectItem value="fallido">Fallido</SelectItem>
                              <SelectItem value="verificacion">Verificación (modo test)</SelectItem>
                            </SelectGroup>
                            {digitalSigningEnabled && (
                              <SelectGroup>
                                <SelectLabel>Firma digital</SelectLabel>
                                <SelectItem value="firma_pendiente_firma">Pendiente de firma</SelectItem>
                                <SelectItem value="firma_firmado_afiliado">Firmado por afiliado</SelectItem>
                                {autoSignEnabled && (
                                  <SelectItem value="firma_error_presidente">Error firma presidente</SelectItem>
                                )}
                                <SelectItem value="firma_completado">Completado</SelectItem>
                              </SelectGroup>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 xl:col-span-1">
                        <Label>Fecha desde</Label>
                        <Input
                          type="date"
                          value={historyFilters.fecha_desde || ''}
                          onChange={(e) =>
                            setHistoryFilters({ ...historyFilters, fecha_desde: e.target.value || undefined, page: 1 })
                          }
                        />
                      </div>

                      <div className="space-y-2 xl:col-span-1">
                        <Label>Fecha hasta</Label>
                        <Input
                          type="date"
                          value={historyFilters.fecha_hasta || ''}
                          onChange={(e) =>
                            setHistoryFilters({ ...historyFilters, fecha_hasta: e.target.value || undefined, page: 1 })
                          }
                        />
                      </div>

                      <div className="space-y-2 sm:col-span-2 lg:col-span-3 xl:col-span-1">
                        <Label>Hospital / Convenio</Label>
                        <Input
                          placeholder="Coincide con sede o nombre de convenio"
                          value={historyFilters.sede || ''}
                          onChange={(e) =>
                            setHistoryFilters({ ...historyFilters, sede: e.target.value || undefined, page: 1 })
                          }
                        />
                      </div>
                    </div>

                    {/* Tabla */}
                    {isLoadingHistory ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                        <p className="text-gray-500 mt-2">Cargando historial...</p>
                      </div>
                    ) : historyData?.data.data.length === 0 ? (
                      <div className="text-center py-8">
                        <FileSignature className="h-12 w-12 mx-auto text-gray-400" />
                        <p className="text-gray-500 mt-2">No se encontraron registros</p>
                      </div>
                    ) : (
                      <>
                        {can('document_signing.manage') && selectedTrackingIds.size > 0 && (
                          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur">
                            <Badge variant="secondary" className="gap-1">
                              <CheckSquare className="h-3.5 w-3.5" />
                              {selectedTrackingIds.size} seleccionado{selectedTrackingIds.size !== 1 ? 's' : ''}
                            </Badge>
                            {resendEligibleSelectedIds.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleBulkResend()}
                                disabled={isBulkResending}
                                className="gap-1.5"
                              >
                                {isBulkResending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5" />
                                )}
                                Reenviar seleccionados ({resendEligibleSelectedIds.length})
                              </Button>
                            )}
                            {autoSignEnabled && presidentSignEligibleSelectedIds.length > 0 && (
                              <Button
                                size="sm"
                                onClick={() => void handleBulkSignAsPresident()}
                                disabled={isBulkSigning}
                                className={cn('gap-1.5', presidentSignButtonClassName)}
                              >
                                {isBulkSigning ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <PenLine className="h-3.5 w-3.5" />
                                )}
                                Firmar como presidente ({presidentSignEligibleSelectedIds.length})
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedTrackingIds(new Set())}
                            >
                              <X className="h-3.5 w-3.5" />
                              <span className="sr-only">Deseleccionar</span>
                            </Button>
                          </div>
                        )}

                        <div className="border rounded-lg overflow-hidden">
                          <Table className="table-fixed w-full">
                            <TableHeader>
                              <TableRow>
                                {can('document_signing.manage') && (
                                  <TableHead className="w-[36px] px-2">
                                    <Checkbox
                                      checked={
                                        selectableTrackingIds.length > 0 &&
                                        selectableTrackingIds.every((id) => selectedTrackingIds.has(id))
                                      }
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedTrackingIds(new Set(selectableTrackingIds));
                                        } else {
                                          setSelectedTrackingIds(new Set());
                                        }
                                      }}
                                      aria-label="Seleccionar todos los elegibles"
                                    />
                                  </TableHead>
                                )}
                                <TableHead className="w-[25%] min-w-0">Afiliado</TableHead>
                                <TableHead className="w-[20%] min-w-0">Convenio</TableHead>
                                <TableHead className="w-[24%] min-w-0">Estado envío y firma</TableHead>
                                <TableHead className="w-[17%] min-w-0">Sede y envío</TableHead>
                                <TableHead className="w-[14%] min-w-0 text-right pl-2 pr-4">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {historyData?.data.data.map((tracking) => {
                                const signedDownloadCfg = getSignedDownloadButtonConfig(tracking);
                                return (
                                <TableRow key={tracking.id}>
                                  {can('document_signing.manage') && (
                                    <TableCell className="px-2 align-top py-3">
                                      {(canResendTracking(tracking) || isEligibleForPresidentSign(tracking)) ? (
                                        <Checkbox
                                          checked={selectedTrackingIds.has(tracking.id)}
                                          onCheckedChange={(checked) => {
                                            setSelectedTrackingIds((prev) => {
                                              const next = new Set(prev);
                                              if (checked) {
                                                next.add(tracking.id);
                                              } else {
                                                next.delete(tracking.id);
                                              }
                                              return next;
                                            });
                                          }}
                                          aria-label={`Seleccionar convenio de ${tracking.nombre_afiliado}`}
                                        />
                                      ) : null}
                                    </TableCell>
                                  )}
                                  <TableCell className="align-top min-w-0 py-3">
                                    <div className="space-y-1">
                                      <p className="font-mono text-sm font-medium leading-tight">{tracking.documento}</p>
                                      <p className="text-sm leading-snug break-words" title={tracking.nombre_afiliado}>
                                        {tracking.nombre_afiliado}
                                      </p>
                                      <p
                                        className="text-xs text-muted-foreground break-all line-clamp-2"
                                        title={tracking.email_afiliado}
                                      >
                                        {tracking.email_afiliado}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="align-top min-w-0 py-3">
                                    <p className="text-sm leading-snug line-clamp-3" title={tracking.nombre_convenio}>
                                      {tracking.nombre_convenio}
                                    </p>
                                  </TableCell>
                                  <TableCell className="align-top min-w-0 py-3">
                                    <div className="flex flex-col gap-2">
                                      <div className="flex flex-wrap gap-1">
                                        {getManualStatusBadge(tracking.estado)}
                                        {digitalSigningEnabled && getSigningEstadoBadge(tracking)}
                                      </div>
                                      {autoSignEnabled && can('document_signing.manage') && isEligibleForPresidentSign(tracking) && (
                                        <Button
                                          variant="default"
                                          size="sm"
                                          className={cn('h-8 w-fit gap-1.5 px-2.5', presidentSignButtonClassName)}
                                          onClick={() => void handleSignAsPresident(tracking)}
                                          disabled={isPresidentSigningProcessing(tracking) || isBulkSigning}
                                          aria-label="Firmar como presidente"
                                        >
                                          {isPresidentSigningProcessing(tracking) ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <PenLine className="h-3.5 w-3.5" />
                                          )}
                                          <span className="text-xs">
                                            {isPresidentSigningProcessing(tracking)
                                              ? 'Procesando firma...'
                                              : 'Firmar presidente'}
                                          </span>
                                        </Button>
                                      )}
                                      {tracking.error_message && (
                                        <p className="text-xs text-red-600 leading-snug" title={tracking.error_message}>
                                          {tracking.error_message.length > 120
                                            ? `${tracking.error_message.substring(0, 120)}…`
                                            : tracking.error_message}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="align-top min-w-0 py-3">
                                    <div className="space-y-1.5">
                                      <p
                                        className="text-sm font-medium text-foreground line-clamp-2 leading-snug"
                                        title={tracking.sede || ''}
                                      >
                                        {tracking.sede?.trim() ? tracking.sede : '—'}
                                      </p>
                                      <p className="text-sm tabular-nums text-slate-800 dark:text-slate-100">
                                        {formatDate(tracking.enviado_at)}
                                      </p>
                                      <p className="text-sm text-slate-700 dark:text-slate-200">
                                        <span className="font-medium text-slate-600 dark:text-slate-300">Reintentos:</span>{' '}
                                        <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-50">
                                          {tracking.intentos}
                                        </span>
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="align-top min-w-0 py-3 pl-2 pr-4">
                                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                                      {can('document_signing.view') && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 shrink-0 px-2"
                                              onClick={() => void handleOpenTrackingDetail(tracking)}
                                              aria-label="Ver detalle del convenio"
                                            >
                                              <Eye className="h-4 w-4" />
                                              <span className="sr-only">Ver detalle</span>
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom">
                                            <p>Ver datos usados para generar el convenio</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      {canResendTracking(tracking) && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 shrink-0 px-2"
                                              onClick={() => handleOpenResendDialog(tracking)}
                                              aria-label="Reintento de envío"
                                            >
                                              <RefreshCw className="h-4 w-4" />
                                              <span className="sr-only">Reintento de envío</span>
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom">
                                            <p>Reintento de envío</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      {can('document_signing.view') && canDownloadOriginalTracking(tracking) && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-8 shrink-0 gap-1 px-2"
                                              onClick={() => void handleDownloadConvenioOriginal(tracking)}
                                              aria-label="Descargar convenio sin firmar"
                                            >
                                              <FileDown className="h-3.5 w-3.5" />
                                              <span className="hidden xl:inline text-xs">Original</span>
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom">
                                            <p>Descargar convenio sin firmar</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      {digitalSigningEnabled &&
                                        can('document_signing.view') &&
                                        (tracking.signing_estado === 'firmado_afiliado' ||
                                          tracking.signing_estado === 'completado') && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant={signedDownloadCfg.variant}
                                              size="sm"
                                              className={cn(
                                                'h-8 shrink-0 gap-1 px-2',
                                                signedDownloadCfg.buttonClassName,
                                              )}
                                              onClick={() => void handleDownloadConvenioFinal(tracking)}
                                              aria-label={signedDownloadCfg.ariaLabel}
                                            >
                                              <Download className="h-3.5 w-3.5" />
                                              <span className="hidden xl:inline text-xs">
                                                {signedDownloadCfg.label}
                                              </span>
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom">
                                            <p>{signedDownloadCfg.tooltip}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>

                        {historyData?.data && (
                          <DataPagination
                            currentPage={historyData.data.current_page}
                            totalPages={historyData.data.last_page}
                            totalItems={historyData.data.total}
                            itemsPerPage={historyData.data.per_page}
                            onPageChange={(page) =>
                              setHistoryFilters({ ...historyFilters, page })
                            }
                            onItemsPerPageChange={(perPage) =>
                              setHistoryFilters({ ...historyFilters, per_page: perPage, page: 1 })
                            }
                          />
                        )}
                      </>
                    )}
                    </TooltipProvider>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab: Crear Convenio */}
            {can('document_signing.manage') && (
              <TabsContent value="create" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Crear Nuevo Convenio</CardTitle>
                    <CardDescription className="text-sm">
                      Crea un convenio completamente nuevo pasando todos los datos y valores necesarios.
                      El sistema generará automáticamente el documento Word, lo convertirá a PDF y opcionalmente lo enviará por correo electrónico.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Sección de Consulta de Afiliado */}
                    <div className="mb-8 p-6 border-2 border-blue-200 rounded-lg bg-blue-50/50">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="flex-shrink-0 p-2 bg-blue-100 rounded-full">
                          <Search className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-blue-900 mb-1">Consultar Datos del Afiliado</h3>
                          <p className="text-sm text-blue-800 mb-4">
                            Consulta los datos del afiliado para prediligenciar el formulario automáticamente. 
                            Si el afiliado existe en el sistema, se cargarán sus datos y el convenio activo.
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="consultTipoDocumento" className="text-sm font-medium">
                            <IdCard className="h-4 w-4 inline mr-1" />
                            Tipo de Documento
                          </Label>
                          <Select
                            value={consultTipoDocumento}
                            onValueChange={setConsultTipoDocumento}
                            disabled={isConsulting}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                              <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                              <SelectItem value="TI">Tarjeta de Identidad (TI)</SelectItem>
                              <SelectItem value="PT">Permiso por Protección Temporal (PT)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="consultDocumento" className="text-sm font-medium">
                            <Hash className="h-4 w-4 inline mr-1" />
                            Número de Documento
                          </Label>
                          <Input
                            id="consultDocumento"
                            placeholder="1234567890"
                            value={consultDocumento}
                            onChange={(e) => setConsultDocumento(e.target.value)}
                            disabled={isConsulting}
                            className="font-mono"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !isConsulting) {
                                e.preventDefault();
                                handleConsultAffiliate();
                              }
                            }}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="consultFechaExpedicion" className="text-sm font-medium">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            Fecha de Expedición
                          </Label>
                          <Input
                            id="consultFechaExpedicion"
                            type="date"
                            value={consultFechaExpedicion}
                            onChange={(e) => setConsultFechaExpedicion(e.target.value)}
                            disabled={isConsulting}
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium opacity-0">Acción</Label>
                          <Button
                            type="button"
                            onClick={handleConsultAffiliate}
                            disabled={isConsulting || !consultDocumento.trim() || !consultFechaExpedicion}
                            className="w-full"
                            variant="default"
                          >
                            {isConsulting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Consultando...
                              </>
                            ) : (
                              <>
                                <Search className="mr-2 h-4 w-4" />
                                Consultar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {consultedData && (
                        <div className={`mt-4 p-4 border rounded-lg ${
                          consultedData.afiliado.estado?.toUpperCase() === 'RETIRADO' || 
                          consultedData.afiliado.estado?.toUpperCase() === 'RETIRO'
                            ? 'bg-yellow-50 border-yellow-300' 
                            : 'bg-green-50 border-green-200'
                        }`}>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className={`h-5 w-5 mt-0.5 ${
                              consultedData.afiliado.estado?.toUpperCase() === 'RETIRADO' || 
                              consultedData.afiliado.estado?.toUpperCase() === 'RETIRO'
                                ? 'text-yellow-600' 
                                : 'text-green-600'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-900">
                                  Datos consultados: {consultedData.afiliado.nombres} {consultedData.afiliado.apellidos}
                                </p>
                                {consultedData.afiliado.estado && (
                                  <Badge 
                                    variant={
                                      consultedData.afiliado.estado.toUpperCase() === 'RETIRADO' || 
                                      consultedData.afiliado.estado.toUpperCase() === 'RETIRO'
                                        ? 'destructive'
                                        : consultedData.afiliado.estado.toUpperCase() === 'ACTIVO'
                                        ? 'default'
                                        : 'secondary'
                                    }
                                    className={
                                      consultedData.afiliado.estado.toUpperCase() === 'RETIRADO' || 
                                      consultedData.afiliado.estado.toUpperCase() === 'RETIRO'
                                        ? 'bg-red-500 hover:bg-red-600'
                                        : ''
                                    }
                                  >
                                    {consultedData.afiliado.estado.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                              <p className={`text-xs mt-1 ${
                                consultedData.afiliado.estado?.toUpperCase() === 'RETIRADO' || 
                                consultedData.afiliado.estado?.toUpperCase() === 'RETIRO'
                                  ? 'text-yellow-800' 
                                  : 'text-green-700'
                              }`}>
                                El formulario ha sido prediligenciado con los datos encontrados. 
                                {consultedData.convenios.length > 0 && (
                                  <span> Se encontró {consultedData.convenios.length} convenio(s).</span>
                                )}
                                {(consultedData.afiliado.estado?.toUpperCase() === 'RETIRADO' || 
                                  consultedData.afiliado.estado?.toUpperCase() === 'RETIRO') && (
                                  <span className="block mt-1 font-semibold">
                                    ⚠️ Atención: Este afiliado está RETIRADO.
                                  </span>
                                )}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setConsultedData(null);
                                setConsultDocumento('');
                                setConsultFechaExpedicion('');
                                createConvenioForm.reset();
                              }}
                              className={
                                consultedData.afiliado.estado?.toUpperCase() === 'RETIRADO' || 
                                consultedData.afiliado.estado?.toUpperCase() === 'RETIRO'
                                  ? 'text-yellow-700 hover:text-yellow-900'
                                  : 'text-green-700 hover:text-green-900'
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <Separator className="my-6" />
                    
                    <Form {...createConvenioForm}>
                      <form onSubmit={createConvenioForm.handleSubmit(handleCreateConvenio)} className="space-y-8">
                        {/* Sección 1: Datos del Afiliado (Requeridos) */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <User className="h-5 w-5 text-primary-prosalud" />
                            <h3 className="text-lg font-semibold">Datos del Afiliado</h3>
                            <Badge variant="destructive" className="ml-auto">Requerido</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={createConvenioForm.control}
                              name="numero_documento"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Número de Documento *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="1234567890" {...field} className="font-mono" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createConvenioForm.control}
                              name="apellidos"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Apellidos *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="APELLIDOS DEL AFILIADO"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createConvenioForm.control}
                              name="nombres"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nombres *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="NOMBRES DEL AFILIADO"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createConvenioForm.control}
                              name="fecha_nacimiento"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fecha de Nacimiento *</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createConvenioForm.control}
                              name="lugar_nacimiento"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Lugar de Nacimiento *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="CIUDAD, DEPARTAMENTO"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createConvenioForm.control}
                              name="celular"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Celular *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="3000000000" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createConvenioForm.control}
                              name="direccion"
                              render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel>Dirección *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Dirección de residencia" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <Separator />

                        {/* Sección 2: Datos del Convenio (Requeridos) */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Building2 className="h-5 w-5 text-primary-prosalud" />
                            <h3 className="text-lg font-semibold">Datos del Convenio</h3>
                            <Badge variant="destructive" className="ml-auto">Requerido</Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <FormField
                              control={createConvenioForm.control}
                              name="proceso"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Proceso/Cargo *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Cargo o proceso"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createConvenioForm.control}
                              name="ciudad"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ciudad *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Ciudad" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createConvenioForm.control}
                              name="sede"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Sede *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Nombre de la sede"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createConvenioForm.control}
                              name="fecha_inicio"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fecha de Inicio *</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createConvenioForm.control}
                              name="fecha_finalizacion"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fecha de Finalización</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <Separator />

                        {/* Sección 3: Compensación (Requerida) */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <DollarSign className="h-5 w-5 text-primary-prosalud" />
                            <h3 className="text-lg font-semibold">Compensación</h3>
                            <Badge variant="destructive" className="ml-auto">Requerido</Badge>
                          </div>
                          
                          {/* Selector de tipo de compensación */}
                          <FormField
                            control={createConvenioForm.control}
                            name="tipo_compensacion"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo de Compensación *</FormLabel>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex gap-6"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="valores" id="compensacion-valores" />
                                      <label htmlFor="compensacion-valores" className="text-sm font-normal cursor-pointer">
                                        Valores Individuales
                                      </label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="redactada" id="compensacion-redactada" />
                                      <label htmlFor="compensacion-redactada" className="text-sm font-normal cursor-pointer">
                                        Compensación Redactada
                                      </label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormDescription>
                                  Selecciona si deseas ingresar la compensación como texto redactado o mediante valores individuales.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Compensación Redactada */}
                          {tipoCompensacion === 'redactada' && (
                            <FormField
                              control={createConvenioForm.control}
                              name="compensacion_basica_redactada"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Compensación Básica Redactada *</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Ingrese el texto completo de la compensación básica..."
                                      className="min-h-[120px]"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Ingresa el texto completo de la compensación básica. El backend puede generarlo automáticamente si no se proporciona.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Valores Individuales - Agrupados */}
                          {tipoCompensacion === 'valores' && (
                            <div className="space-y-6">
                              {/* Grupo 1: Salarios y Auxilios Básicos */}
                              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                                <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  Salarios y Auxilios Básicos
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="basico"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Salario Básico</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="auxilios"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Auxilios de compensación básica</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="manutencion"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Manutención</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="provisiones"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Provisiones</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="auxilio_especial"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Auxilio Especial</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Grupo 2: Horas y Valores por Hora */}
                              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                                <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  Horas y Valores por Hora
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="horas"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Horas</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            placeholder="0"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                            value={field.value || ''}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="valor_hora_diurna"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Valor Hora Diurna</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="valor_hora_nocturna"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Valor Hora Nocturna</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="valor_hora_diurna_festiva"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Valor Hora Diurna Festiva</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="valor_hora_nocturna_festiva"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Valor Hora Nocturna Festiva</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Grupo 3: Auxilios Especiales */}
                              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                                <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  Auxilios Especiales
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="auxilio_de_transporte"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Auxilio de Transporte</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="auxilio_de_manutencion"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Auxilio de Manutención</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="auxilio_de_encierro"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Auxilio de Encierro</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="auxilio_de_rodamiento"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Auxilio de Rodamiento</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Grupo 4: Auxilios con Recargos */}
                              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                                <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4" />
                                  Auxilios con Recargos
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="valor_auxilio_diurno"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Valor Auxilio Recargo Diurno</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="valor_auxilio_recargo_nocturno"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Valor Auxilio Recargo Nocturno</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="valor_auxilio_recargo_festivo"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Valor Auxilio Recargo Festivo</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="valor_auxilio_recargo_festivo_nocturno"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Valor Auxilio Recargo Festivo Nocturno</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="0" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Grupo 5: Techo (TEMPORALMENTE COMENTADO) */}
                              {/* <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                                <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4" />
                                  Techo del Convenio
                                </h4>
                                <FormField
                                  control={createConvenioForm.control}
                                  name="tiene_techo"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3 sm:p-4 bg-white gap-3 sm:gap-0">
                                      <div className="space-y-0.5 flex-1">
                                        <FormLabel className="text-sm sm:text-base">El convenio tiene techo</FormLabel>
                                        <FormDescription>
                                          Un convenio con techo limita el pago proporcional a un monto máximo cuando se superan las horas base definidas.
                                        </FormDescription>
                                      </div>
                                      <FormControl>
                                        <Switch
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div> */}
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Sección 4: Opciones (Opcional) */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Settings className="h-5 w-5 text-primary-prosalud" />
                            <h3 className="text-lg font-semibold">Opciones de Procesamiento</h3>
                            <Badge variant="secondary" className="ml-auto">Opcional</Badge>
                          </div>
                          <div className="space-y-4">
                            <FormField
                              control={createConvenioForm.control}
                              name="send_email"
                              render={({ field }) => (
                                <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3 sm:p-4 gap-3 sm:gap-0">
                                  <div className="space-y-0.5 flex-1">
                                    <FormLabel className="text-sm sm:text-base">Enviar por correo electrónico</FormLabel>
                                    <FormDescription className="text-xs sm:text-sm">
                                      Si está activado, el sistema enviará el convenio generado por correo electrónico al afiliado.
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            {createConvenioForm.watch('send_email') && (
                              <FormField
                                control={createConvenioForm.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Correo Electrónico *</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="email"
                                        placeholder="correo@ejemplo.com"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      El correo electrónico es requerido cuando se activa el envío por correo.
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            <FormField
                              control={createConvenioForm.control}
                              name="download"
                              render={({ field }) => (
                                <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3 sm:p-4 gap-3 sm:gap-0">
                                  <div className="space-y-0.5 flex-1">
                                    <FormLabel className="text-sm sm:text-base">Descargar convenio generado</FormLabel>
                                    <FormDescription className="text-xs sm:text-sm">
                                      Si está activado, el sistema descargará automáticamente el convenio cuando esté listo. De lo contrario, solo se generará en segundo plano.
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      disabled={isDownloadingConvenio || createConvenioMutation.isPending}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <Separator />

                        {/* Botones de acción */}
                        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => createConvenioForm.reset()}
                            disabled={createConvenioMutation.isPending}
                          >
                            Limpiar Formulario
                          </Button>
                          <Button
                            type="submit"
                            disabled={createConvenioMutation.isPending}
                            size="lg"
                          >
                            {createConvenioMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generando convenio...
                              </>
                            ) : (
                              <>
                                <FilePlus className="mr-2 h-4 w-4" />
                                Generar Convenio
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab: Importación Masiva */}
            {can('document_signing.manage') && (
              <TabsContent value="bulk-import" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Importación Masiva de Convenios</CardTitle>
                    <CardDescription className="text-sm">
                      Descarga la plantilla Excel, complétala con los datos de los convenios y súbela para generar PDFs.
                      Usa el interruptor de abajo para decidir si se envían correos al procesar; el seguimiento se hace desde el historial.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Paso 1: Descargar plantilla */}
                    <div className="p-6 border-2 border-blue-200 rounded-lg bg-blue-50/50">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 p-2 bg-blue-100 rounded-full">
                          <Download className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-blue-900 mb-2">Paso 1: Descargar Plantilla</h3>
                          <p className="text-sm text-blue-800 mb-4">
                            Descarga el archivo Excel con todas las columnas necesarias para crear convenios masivamente.
                            La plantilla incluye ejemplos y descripciones para cada campo.
                          </p>
                          <Button
                            type="button"
                            onClick={handleDownloadTemplate}
                            disabled={isDownloadingTemplate}
                            variant="default"
                          >
                            {isDownloadingTemplate ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Descargando...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Descargar Plantilla Excel
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Paso 2: Subir archivo */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 p-2 bg-green-100 rounded-full">
                          <Upload className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 space-y-4">
                          <div>
                            <h3 className="font-semibold text-green-900 mb-2">Paso 2: Importar Archivo</h3>
                            <p className="text-sm text-green-800 mb-4">
                              Selecciona el archivo Excel que has completado con los datos de los convenios.
                              El archivo debe ser .xlsx o .xls y no puede exceder 10MB.
                            </p>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="bulk-import-file" className="text-base font-medium">
                                Archivo Excel *
                              </Label>
                              <Input
                                id="bulk-import-file"
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                disabled={importBulkMutation.isPending}
                                className="mt-2"
                              />
                              {selectedFile && (
                                <div className="mt-2 p-3 bg-slate-50 rounded-md border border-slate-200">
                                  <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="h-4 w-4 text-slate-600" />
                                    <span className="text-sm font-medium text-slate-900">{selectedFile.name}</span>
                                    <span className="text-xs text-slate-500">
                                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedFile(null);
                                        const fileInput = document.getElementById('bulk-import-file') as HTMLInputElement;
                                        if (fileInput) {
                                          fileInput.value = '';
                                        }
                                      }}
                                      className="ml-auto h-6 w-6 p-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3 sm:p-4 bg-slate-50 gap-3 sm:gap-0">
                              <div className="space-y-0.5 flex-1">
                                <Label className="text-sm sm:text-base">Enviar correos al procesar</Label>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  {isTestDeliveryMode
                                    ? 'En modo test no se envía al afiliado: los PDFs quedarán en el historial para verificación.'
                                    : 'Si está activado, se generará el PDF y se enviará el correo a cada afiliado de forma asíncrona.'}
                                </p>
                              </div>
                              <Switch
                                checked={bulkSendEmail}
                                onCheckedChange={setBulkSendEmail}
                                disabled={importBulkMutation.isPending}
                              />
                            </div>

                            <Button
                              type="button"
                              onClick={handleImportBulk}
                              disabled={!selectedFile || importBulkMutation.isPending}
                              size="lg"
                              className="w-full"
                            >
                              {importBulkMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Procesando importación...
                                </>
                              ) : (
                                <>
                                  <Upload className="mr-2 h-4 w-4" />
                                  {bulkSendEmail
                                    ? isTestDeliveryMode
                                      ? 'Importar y generar para verificación'
                                      : 'Importar, generar y enviar'
                                    : 'Importar y generar PDFs'}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Resultados de la importación */}
                    {importResult && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg">Resultados de la Importación</h3>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {importResult.data.procesados}
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    Filas Procesadas
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-600">
                                    {importResult.data.exitosos}
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    Exitosos
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-red-600">
                                    {importResult.data.errores}
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    Errores
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-slate-600">
                                    {importResult.data.filas_vacias}
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    Filas Vacías
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {importResult.data.errors && importResult.data.errors.length > 0 && (
                            <Card className="border-red-200 bg-red-50">
                              <CardHeader>
                                <CardTitle className="text-red-900 flex items-center gap-2">
                                  <AlertCircle className="h-5 w-5" />
                                  Errores por Fila
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ul className="space-y-2">
                                  {importResult.data.errors.map((error, index) => (
                                    <li key={index} className="text-sm text-red-800">
                                      • {error}
                                    </li>
                                  ))}
                                </ul>
                                <p className="text-sm text-red-700 mt-4">
                                  Corrige estos errores en el archivo Excel y vuelve a importar.
                                </p>
                              </CardContent>
                            </Card>
                          )}

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900">
                              <strong>Nota:</strong> Los convenios se están generando de forma asíncrona en segundo plano.
                              Puedes consultar el historial para ver el estado de los convenios generados.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0 border-blue-300 bg-white hover:bg-blue-100"
                              onClick={() => {
                                setActiveTab('history');
                                void refetchHistory();
                              }}
                            >
                              <History className="h-4 w-4 mr-2" />
                              Ver historial
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab: Estadísticas (Manual) */}
            {can('document_signing.view') && (
              <TabsContent value="statistics" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-1">
                        <CardTitle>Estadísticas de Envíos Manuales</CardTitle>
                        <CardDescription className="max-w-2xl">
                          Los totales respetan el rango de fechas (opcional) según la fecha de creación de cada registro.
                          Compara el estado del correo (cola de envío) con el avance de la firma digital del afiliado.
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Input
                          type="date"
                          aria-label="Fecha desde"
                          value={statsFilters.fecha_desde || ''}
                          onChange={(e) =>
                            setStatsFilters({ ...statsFilters, fecha_desde: e.target.value || undefined })
                          }
                          className="w-[11rem]"
                        />
                        <Input
                          type="date"
                          aria-label="Fecha hasta"
                          value={statsFilters.fecha_hasta || ''}
                          onChange={(e) =>
                            setStatsFilters({ ...statsFilters, fecha_hasta: e.target.value || undefined })
                          }
                          className="w-[11rem]"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refetchStats()}
                          disabled={isLoadingStats}
                        >
                          <RefreshCw className={`h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStats ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                        <p className="text-gray-500 mt-2">Cargando estadísticas...</p>
                      </div>
                    ) : statsData?.data ? (
                      <div className="space-y-6">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Mail className="h-4 w-4 text-slate-600" />
                                Estado del correo
                              </CardTitle>
                              <CardDescription>
                                Indica si el sistema ya despachó el mensaje con el PDF. Los fallidos suelen requerir
                                corrección o reintento desde el historial.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {statsData.data.total > 0 && (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Correos enviados con éxito</span>
                                    <span className="font-medium tabular-nums">
                                      {statsEmailSuccessPct.toFixed(1)}%
                                    </span>
                                  </div>
                                  <Progress value={statsEmailSuccessPct} className="h-2" />
                                  <p className="text-xs text-muted-foreground">
                                    {statsData.data.sent} de {statsData.data.total} registros en el periodo tienen estado
                                    &quot;Enviado&quot;.
                                  </p>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-lg border bg-slate-50/80 p-3 dark:bg-slate-900/40">
                                  <p className="text-xs text-muted-foreground">Total registros</p>
                                  <p className="text-xl font-semibold tabular-nums">{statsData.data.total}</p>
                                </div>
                                <div className="rounded-lg border bg-blue-50/80 p-3 dark:bg-blue-950/30">
                                  <p className="text-xs text-muted-foreground">Enviados hoy</p>
                                  <p className="text-xl font-semibold tabular-nums text-blue-700 dark:text-blue-300">
                                    {statsData.data.sent_today}
                                  </p>
                                </div>
                                <div className="rounded-lg border bg-amber-50/80 p-3 dark:bg-amber-950/30">
                                  <p className="text-xs text-muted-foreground">Pendiente envío</p>
                                  <p className="text-xl font-semibold tabular-nums text-amber-800 dark:text-amber-200">
                                    {statsData.data.pending}
                                  </p>
                                </div>
                                <div className="rounded-lg border bg-red-50/80 p-3 dark:bg-red-950/30">
                                  <p className="text-xs text-muted-foreground">Fallido</p>
                                  <p className="text-xl font-semibold tabular-nums text-red-700 dark:text-red-300">
                                    {statsData.data.failed}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {digitalSigningEnabled && (
                            <Card className="border-slate-200">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <FileSignature className="h-4 w-4 text-slate-600" />
                                  Firma digital del afiliado
                                </CardTitle>
                                <CardDescription>
                                  Solo aplica a envíos con enlace de firma. &quot;Firmado&quot; y &quot;Completado&quot; indican que el
                                  afiliado ya firmó o que el flujo quedó cerrado con PDF final.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {statsData.data.signing && (
                                  <>
                                    {statsData.data.signing_derived &&
                                      statsData.data.signing.pendiente_firma +
                                        statsData.data.signing.firmado_afiliado +
                                        statsData.data.signing.completado >
                                        0 && (
                                        <div className="space-y-2">
                                          <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                              Firmados o finalizados frente a pendientes de firma
                                            </span>
                                            <span className="font-medium tabular-nums">
                                              {statsSigningProgressPct.toFixed(1)}%
                                            </span>
                                          </div>
                                          <Progress
                                            value={statsSigningProgressPct}
                                            className="h-2.5 bg-amber-100 dark:bg-amber-950/50"
                                            indicatorClassName="bg-emerald-600 dark:bg-emerald-500"
                                          />
                                          <p className="text-xs text-muted-foreground">
                                            {statsData.data.signing_derived.firmados_afiliado_o_finalizados} con firma del
                                            afiliado o proceso cerrado; {statsData.data.signing_derived.pendientes_firma}{' '}
                                            aún esperan la firma en el visor.
                                          </p>
                                        </div>
                                      )}
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                      <div className="rounded-lg border bg-amber-50/80 p-3 dark:bg-amber-950/30">
                                        <p className="text-xs text-muted-foreground">Pendiente firma</p>
                                        <p className="text-xl font-semibold tabular-nums text-amber-800 dark:text-amber-200">
                                          {statsData.data.signing.pendiente_firma}
                                        </p>
                                      </div>
                                      <div className="rounded-lg border bg-sky-50/80 p-3 dark:bg-sky-950/30">
                                        <p className="text-xs text-muted-foreground">Firmado afiliado</p>
                                        <p className="text-xl font-semibold tabular-nums text-sky-800 dark:text-sky-200">
                                          {statsData.data.signing.firmado_afiliado}
                                        </p>
                                      </div>
                                      <div className="rounded-lg border bg-emerald-50/80 p-3 dark:bg-emerald-950/30">
                                        <p className="text-xs text-muted-foreground">Completado</p>
                                        <p className="text-xl font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">
                                          {statsData.data.signing.completado}
                                        </p>
                                      </div>
                                    </div>
                                  </>
                                )}
                                {!statsData.data.signing && (
                                  <p className="text-sm text-muted-foreground">
                                    No hay datos de firma digital en este periodo.
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </div>

                        {/* Firma automática del presidente */}
                        {autoSignEnabled && statsData.data.signing && (
                          <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <PenLine className="h-4 w-4 text-slate-600" />
                                Firma automática del presidente
                              </CardTitle>
                              <CardDescription>
                                Estado de la segunda etapa de firma. &quot;Completado&quot; indica que el documento tiene ambas firmas
                                y el proceso está cerrado.
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-lg border bg-sky-50/80 p-3 dark:bg-sky-950/30">
                                  <p className="text-xs text-muted-foreground">Pend. firma presidente</p>
                                  <p className="text-xl font-semibold tabular-nums text-sky-800 dark:text-sky-200">
                                    {statsData.data.signing_derived?.por_firmar_presidente ?? 0}
                                  </p>
                                </div>
                                <div className="rounded-lg border bg-violet-50/80 p-3 dark:bg-violet-950/30">
                                  <p className="text-xs text-muted-foreground">Firmando presidente</p>
                                  <p className="text-xl font-semibold tabular-nums text-violet-800 dark:text-violet-200">
                                    {statsData.data.signing?.firmando_presidente ?? 0}
                                  </p>
                                </div>
                                <div className="rounded-lg border bg-red-50/80 p-3 dark:bg-red-950/30">
                                  <p className="text-xs text-muted-foreground">Error firma presidente</p>
                                  <p className="text-xl font-semibold tabular-nums text-red-700 dark:text-red-300">
                                    {statsData.data.signing?.error_firma_presidente ?? 0}
                                  </p>
                                </div>
                                <div className="rounded-lg border bg-emerald-50/80 p-3 dark:bg-emerald-950/30">
                                  <p className="text-xs text-muted-foreground">Completado (ambas firmas)</p>
                                  <p className="text-xl font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">
                                    {statsData.data.signing?.completado ?? 0}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {statsData.data.by_sede && statsData.data.by_sede.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-slate-600" />
                                Por sede u hospital
                              </CardTitle>
                              <CardDescription>
                                Agrupa los mismos registros del periodo según el campo sede guardado en el tracking (hasta
                                50 sedes con más volumen).
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Sede / hospital</TableHead>
                                    <TableHead className="text-right w-24">Total</TableHead>
                                    {digitalSigningEnabled && (
                                      <>
                                        <TableHead className="text-right w-28">Pend. firma</TableHead>
                                        <TableHead className="text-right w-28">Firmado</TableHead>
                                        <TableHead className="text-right w-28">Completado</TableHead>
                                      </>
                                    )}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {statsData.data.by_sede.map((row) => (
                                    <TableRow key={row.sede}>
                                      <TableCell className="max-w-[220px] truncate font-medium" title={row.sede}>
                                        {row.sede}
                                      </TableCell>
                                      <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                                      {digitalSigningEnabled && (
                                        <>
                                          <TableCell className="text-right tabular-nums text-amber-700 dark:text-amber-300">
                                            {row.pendiente_firma ?? 0}
                                          </TableCell>
                                          <TableCell className="text-right tabular-nums text-sky-700 dark:text-sky-300">
                                            {row.firmado_afiliado ?? 0}
                                          </TableCell>
                                          <TableCell className="text-right tabular-nums text-emerald-700 dark:text-emerald-300">
                                            {row.completado ?? 0}
                                          </TableCell>
                                        </>
                                      )}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        )}

                        {chartData && chartData.statusData.length > 0 && (
                          <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${digitalSigningEnabled ? 'lg:grid-cols-2' : ''}`}>
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Correo: proporción por estado</CardTitle>
                                <CardDescription>Distribución de pendiente, enviado y fallido.</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={chartData.statusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                        outerRadius={88}
                                        fill="#8884d8"
                                        dataKey="cantidad"
                                      >
                                        {chartData.statusData.map((entry, index) => (
                                          <Cell key={`cell-mail-${index}`} fill={entry.color} />
                                        ))}
                                      </Pie>
                                      <ChartTooltip content={<ChartTooltipContent />} />
                                      <Legend />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </ChartContainer>
                              </CardContent>
                            </Card>

                            {digitalSigningEnabled && (
                              signingChartData ? (
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg">Firma digital: proporción por estado</CardTitle>
                                    <CardDescription>
                                      Pendiente de firma, firmado por afiliado y completado entre registros con flujo de
                                      firma.
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                    <ChartContainer config={chartConfig} className="h-[280px] w-full">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                          <Pie
                                            data={signingChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                            outerRadius={88}
                                            fill="#8884d8"
                                            dataKey="cantidad"
                                          >
                                            {signingChartData.map((entry, index) => (
                                              <Cell key={`cell-sign-${index}`} fill={entry.color} />
                                            ))}
                                          </Pie>
                                          <ChartTooltip content={<ChartTooltipContent />} />
                                          <Legend />
                                        </PieChart>
                                      </ResponsiveContainer>
                                    </ChartContainer>
                                  </CardContent>
                                </Card>
                              ) : (
                                <Card className="flex items-center justify-center min-h-[200px]">
                                  <CardContent className="text-center text-sm text-muted-foreground py-8">
                                    No hay conteos de firma digital distintos de cero en este periodo.
                                  </CardContent>
                                </Card>
                              )
                            )}
                          </div>
                        )}

                        {chartData && chartData.statusData.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Correo: volumen por estado</CardTitle>
                              <CardDescription>Comparación numérica de los mismos totales del gráfico circular.</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={chartData.statusData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis allowDecimals={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Bar dataKey="cantidad" fill="#8884d8" name="Registros">
                                      {chartData.statusData.map((entry, index) => (
                                        <Cell key={`bar-mail-${index}`} fill={entry.color} />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </ChartContainer>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="h-12 w-12 mx-auto text-gray-400" />
                        <p className="text-gray-500 mt-2">No hay estadísticas disponibles</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          <Dialog open={trackingDetailOpen} onOpenChange={setTrackingDetailOpen}>
            <DialogContent className="w-[95vw] max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Detalle del convenio</DialogTitle>
                <DialogDescription>
                  Datos registrados al generar el convenio. Útil para confirmar si hubo un error de captura o del sistema.
                </DialogDescription>
              </DialogHeader>

              {isLoadingTrackingDetail ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Cargando detalle...</p>
                </div>
              ) : trackingDetail ? (
                <div className="space-y-4 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="font-semibold text-muted-foreground">Documento</span>
                      <p className="font-mono">{trackingDetail.tracking.documento}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground">Estado</span>
                      <div className="mt-1">{getManualStatusBadge(trackingDetail.tracking.estado)}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground">Afiliado</span>
                      <p>{trackingDetail.tracking.nombre_afiliado}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground">Convenio</span>
                      <p>{trackingDetail.tracking.nombre_convenio}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground">Archivo</span>
                      <p className="break-all text-xs">{trackingDetail.tracking.nombre_archivo}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground">Creado</span>
                      <p>{formatDate(trackingDetail.tracking.created_at)}</p>
                    </div>
                    {trackingDetail.generated_by && (
                      <div className="col-span-full">
                        <span className="font-semibold text-muted-foreground">Generado por</span>
                        <p>
                          {trackingDetail.generated_by.name}{' '}
                          <span className="text-muted-foreground">({trackingDetail.generated_by.email})</span>
                        </p>
                      </div>
                    )}
                    {trackingDetail.tracking.error_message && (
                      <div className="col-span-full rounded-md border border-red-200 bg-red-50 p-3">
                        <span className="font-semibold text-red-800">Error del sistema</span>
                        <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">{trackingDetail.tracking.error_message}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-semibold mb-3">Datos de generación</h3>
                    {trackingDetail.convenio_data_fields.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {trackingDetail.convenio_data_fields.map((field) => (
                          <div key={field.key} className="rounded-md border bg-slate-50 px-3 py-2">
                            <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                            <p className="text-sm break-words whitespace-pre-wrap">{String(field.value)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No hay datos de generación guardados para este registro (puede ser un envío anterior a esta funcionalidad).
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              <DialogFooter>
                <Button variant="outline" onClick={() => setTrackingDetailOpen(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de confirmación para reenvío */}
          <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Reenvío de Correo</DialogTitle>
                <DialogDescription>
                  ¿Estás seguro de que deseas reenviar el correo de convenio?
                </DialogDescription>
              </DialogHeader>
              {selectedTrackingInfo && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold">Documento:</span>
                      <p className="font-mono">{selectedTrackingInfo.documento}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Afiliado:</span>
                      <p>{selectedTrackingInfo.nombre_afiliado}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Correo actual:</span>
                      <p className="break-all">{selectedTrackingInfo.email_afiliado}</p>
                    </div>
                    <div>
                      <span className="font-semibold">Convenio:</span>
                      <p className="truncate" title={selectedTrackingInfo.nombre_convenio}>
                        {selectedTrackingInfo.nombre_convenio}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold">Estado actual:</span>
                      <div>{getManualStatusBadge(selectedTrackingInfo.estado)}</div>
                    </div>
                    <div>
                      <span className="font-semibold">Reintentos:</span>
                      <p>{selectedTrackingInfo.intentos}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resendEmail">Correo Electrónico (Opcional)</Label>
                      <Input
                        id="resendEmail"
                        type="email"
                        placeholder="email@ejemplo.com"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500">
                        {selectedTrackingInfo.email_afiliado 
                          ? `Correo actual: ${selectedTrackingInfo.email_afiliado}. Puedes cambiarlo si lo deseas.`
                          : 'Si no proporcionas un correo, se usará el email del afiliado en la base de datos o el del registro original.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resendEmailSubject">Asunto del Correo (Opcional)</Label>
                      <Input
                        id="resendEmailSubject"
                        placeholder="Ej: Firma de Convenio de Afiliación"
                        value={resendEmailSubject}
                        onChange={(e) => setResendEmailSubject(e.target.value)}
                      />
                      <p className="text-xs text-gray-500">
                        Si no se proporciona, se usará el asunto por defecto.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResendDialogOpen(false);
                    setSelectedTrackingId(null);
                    setSelectedTrackingInfo(null);
                    setResendEmail('');
                    setResendEmailSubject('');
                  }}
                  disabled={isResending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmResend}
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reenviando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Confirmar Reenvío
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDocumentSigningPage;
