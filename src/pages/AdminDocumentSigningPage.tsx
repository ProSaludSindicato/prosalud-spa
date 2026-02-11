import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import AdminLayout from '@/components/admin/AdminLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
// Manual signing service (ACTIVE)
import {
  sendBulkEmails as sendBulkEmailsManual,
  getEmailHistory as getEmailHistoryManual,
  resendEmails as resendEmailsManual,
  getStatistics as getStatisticsManual,
  generateAndSendConvenio,
  ConvenioEmailTracking,
  EmailHistoryParams as ManualEmailHistoryParams,
  GenerateAndSendConvenioRequest,
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

// Opciones de hospitales / sedes para mapear códigos internos a nombres legibles
const HOSPITAL_OPTIONS = [
  { value: 'ABEJORRAL', label: 'E.S.E. Hospital San Juan de Dios' },
  { value: 'ABEJORRAL - ADMON', label: 'E.S.E. Hospital San Juan de Dios' },
  { value: 'ABEJORRAL - ADMON ', label: 'E.S.E. Hospital San Juan de Dios' },
  { value: 'ABEJORRAL - ASIST', label: 'E.S.E. Hospital San Juan de Dios' },
  { value: 'ABEJORRAL - BUEN COMIENZO', label: 'E.S.E. Hospital San Juan de Dios' },
  { value: 'ABEJORRAL - CBA', label: 'E.S.E. Hospital San Juan de Dios' },
  { value: 'ABEJORRAL - SALUD P', label: 'E.S.E. Hospital San Juan de Dios' },
  { value: 'ABEJORRAL SP', label: 'E.S.E. Hospital San Juan de Dios' },
  { value: 'ADMON', label: 'Sede Administrativa' },
  { value: 'ADMON-HSJDRionegro', label: 'E.S.E. Hospital San Juan de Dios' },
  { value: 'BARBOSA', label: 'E.S.E. Hospital San Vicente de Paul' },
  { value: 'BELLO', label: 'E.S.E. Hospital Marco Fidel Suarez' },
  { value: 'BETANIA', label: 'E.S.E. Hospital San Antonio de Betania' },
  { value: 'CALDAS', label: 'E.S.E. Hospital San Vicente de Paúls' },
  { value: 'CENTRO NEUROLOGICO', label: 'Centro Neurológico' },
  { value: 'CISNEROS', label: 'E.S.E. Hospital San Antonio - Cisneros (Ant)' },
  { value: 'CIUDAD BOLIVAR', label: 'E.S.E. Hospital La Merced - Ciudad Bolivar (Ant)' },
  { value: 'CIUDADBOLIVAR', label: 'E.S.E. Hospital La Merced - Ciudad Bolivar (Ant)' },
  { value: 'COPACABANA', label: 'E.S.E. Hospital Santa Margarita' },
  { value: 'COPACABANA ', label: 'E.S.E. Hospital Santa Margarita' },
  { value: 'E.S.E CARISMA ADMON ', label: 'E.S.E. Hospital Carisma' },
  { value: 'E.S.E CARISMA ASISTENCIAL', label: 'E.S.E. Hospital Carisma' },
  { value: 'E.S.ECARISMA', label: 'E.S.E. Hospital Carisma' },
  { value: 'FREDONIA', label: 'E.S.E. Hospital Santa Lucia - Fredonia (Ant)' },
  { value: 'HGM SEDE 80 ADMON', label: 'E.S.E. Hospital General de Medellín - Sede 80' },
  { value: 'HGM SEDE 80 ASISTENCIAL', label: 'E.S.E. Hospital General de Medellín - Sede 80' },
  { value: 'HGM SEDE 80 ASISTENCIAL ', label: 'E.S.E. Hospital General de Medellín - Sede 80' },
  { value: 'HLM - GRUPO 1', label: 'E.S.E. Hospital La María' },
  { value: 'HLM - GRUPO 2', label: 'E.S.E. Hospital La María' },
  { value: 'HLM - GRUPO 3', label: 'E.S.E. Hospital La María' },
  { value: 'HMFS - BELLO', label: 'E.S.E. Hospital Marco Fidel Suarez' },
  { value: 'HSJD Rionegro - ADMON', label: 'E.S.E. Hospital San Juan de Dios' },
  { value: 'HSJD Rionegro - ASISTENCIAL', label: 'Centro Neurológico' },
  { value: 'HSJD Rionegro - PIC ', label: 'E.S.E. Hospital San Antonio - Cisneros (Ant)' },
  { value: 'HSJDRionegro', label: 'E.S.E. Hospital San Juan de Dios' },
  { value: 'HSRI', label: 'E.S.E. Hospital San Rafael de Itagüí' },
  { value: 'HSRI ', label: 'E.S.E. Hospital San Rafael de Itagüí' },
  { value: 'JARDIN', label: 'E.S.E. Hospital Gabriel Peláez Montoya' },
  { value: 'LA MARIA', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - 000065-2021', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - 262-2021', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - COOSALUD', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - ENTERRITORIO', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - ENTERRITORIO 1 - 044', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - ENTERRITORIO 2', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - ENTERRITORIO 2 - 045', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - INFECCIOSA PS 268', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - ITS 257', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - PROGRAMA ESPECIAL SAVIA SALUD EPS - VIH-SIDA', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - TRANSMISIBLES', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - TRANSMISIBLES - 122 - 2023', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - TRANSMISIBLES 176', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - UNION TEMPORAL', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - UNION TEMPORAL 020 - 2023', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - VIH', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA - VIH - 1', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA 216 - 2021', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA 317 COOSALUD', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA COOSALUD - 046', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA COOSALUD 191', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA COOSALUD 36-2022', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA ENTERRITORIO - 287', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA ENTERRITORIO 038', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA ENTERRITORIO 238', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA- INFECCIOSA PS 268', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA ITS ', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA ITS 127', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA ITS- 376', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA PAI ', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA TB 137', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA TB Y LEPRA  319-2021', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA TBC', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA TRANSMISIBLES - 122', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA TRANSMISIBLES - 275', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA TRANSMISIBLES 234', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA UPAI - 0028 - 2023', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA UPAI - 140 - 2023', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA UPAI - 271', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA UPAI 0028 - 2023', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA UPAI 245', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA UPAI 35', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA VIH - 158', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA VIH 037', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA VIH 131', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA VIH 131 - 2023', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA VIH 158', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA VIH 188', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA VIH N°043', label: 'E.S.E. Hospital La María' },
  { value: 'LA MARIA VIH UT ', label: 'E.S.E. Hospital La María' },
  { value: 'LAMARIACOOSALUD36', label: 'E.S.E. Hospital La María' },
  { value: 'LAMARIAENTERRITORIO038', label: 'E.S.E. Hospital La María' },
  { value: 'LAMARIAITS127', label: 'E.S.E. Hospital La María' },
  { value: 'LAMARIATB2022', label: 'E.S.E. Hospital La María' },
  { value: 'LAMARIAUPAI35', label: 'E.S.E. Hospital La María' },
  { value: 'LAMARIAVIH037', label: 'E.S.E. Hospital La María' },
  { value: 'POLICLINICO', label: 'POLICLINICO' },
  { value: 'PROMOTORA MEDICA Y ODONTOLOGICA DE ANTIOQUIA S.A.', label: 'PROMOTORA MEDICA Y ODONTOLOGICA DE ANTIOQUIA S.A.' },
  { value: 'PUERTO BERRIO', label: 'E.S.E. Hospital La Cruz' },
  { value: 'SOMER', label: 'SOMER' },
  { value: 'STA GERTRUDIS', label: 'E.S.E. Santa Gertrudis' },
  { value: 'UNION TEMPORAL - 020 - 2023', label: 'E.S.E. Hospital La María' },
  { value: 'VENANCIO', label: 'E.S.E. Hospital Venancio Diaz Diaz' },
  { value: 'VENANCIO -  SALUD MENTAL ', label: 'E.S.E. Hospital Venancio Diaz Diaz' },
  { value: 'VENANCIO - ADMON', label: 'E.S.E. Hospital Venancio Diaz Diaz' },
  { value: 'VENANCIO - ASIST', label: 'E.S.E. Hospital Venancio Diaz Diaz' },
  { value: 'VENANCIO - ASIST ', label: 'E.S.E. Hospital Venancio Diaz Diaz' },
  { value: 'VENANCIO - PIC ', label: 'E.S.E. Hospital Venancio Diaz Diaz' },
  { value: 'VENANCIO - SALUD MENTAL ', label: 'E.S.E. Hospital Venancio Diaz Diaz' },
  { value: 'VENANCIO - SALUD P.', label: 'E.S.E. Hospital Venancio Diaz Diaz' },
  { value: 'VENANCIO - UCI', label: 'E.S.E. Hospital Venancio Diaz Diaz' },
  { value: 'VENANCIO ADMON - APH', label: 'E.S.E. Hospital Venancio Diaz Diaz' },
  { value: 'VENECIA', label: 'ESE Hospital San Rafael de Venecia' },
] as const;

// Mapa de label de hospital a ciudad para prediligenciar ciudad cuando aplique
const HOSPITAL_CITY_MAP: Record<string, string> = {
  'E.S.E. Hospital La María': 'MEDELLÍN (ANT)',
  'E.S.E. HOSPITAL MARCO FIDEL SUÁREZ': 'BELLO (ANT)',
  'E.S.E. HOSPITAL SAN JUAN DE DIOS': 'RIONEGRO (ANT)',
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
  telefono: z.string().max(50, 'El teléfono no puede exceder 50 caracteres').optional(),
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

const AdminDocumentSigningPage: React.FC = () => {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState('history');
  const [documentNumbersList, setDocumentNumbersList] = useState<string[]>([]);
  const [currentDocumentNumber, setCurrentDocumentNumber] = useState('');
  const [emailsMap, setEmailsMap] = useState<Record<string, string>>({}); // Mapa de documento -> email
  const [isSending, setIsSending] = useState(false);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [selectedTrackingId, setSelectedTrackingId] = useState<number | null>(null);
  const [selectedTrackingInfo, setSelectedTrackingInfo] = useState<ConvenioEmailTracking | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resendEmailSubject, setResendEmailSubject] = useState('');
  const [isResending, setIsResending] = useState(false);
  
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
      telefono: '',
      celular: '',
      send_email: true,
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
          telefono: afiliado.telefono || '',
          celular: afiliado.celular || '',
          send_email: true,
          email: afiliado.correo_personal || '',
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

  // Query para historial (Manual)
  const { data: historyData, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['convenios-manual-history', historyFilters],
    queryFn: () => getEmailHistoryManual(historyFilters),
    enabled: activeTab === 'history' && can('document_signing.view'),
  });

  // Query para estadísticas (Manual)
  const { data: statsData, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['convenios-manual-statistics', statsFilters],
    queryFn: () => getStatisticsManual(statsFilters),
    enabled: activeTab === 'statistics' && can('document_signing.view'),
  });

  // Mutación para crear convenio
  const createConvenioMutation = useMutation({
    mutationFn: (data: GenerateAndSendConvenioRequest) => generateAndSendConvenio(data),
    onSuccess: (response) => {
      toast.success('Convenio generado exitosamente', {
        description: response.message || 'El convenio se ha generado correctamente.',
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
      
      // Si se envió por correo, mostrar información
      if (response.data.email) {
        toast.info('Correo encolado', {
          description: `El correo se enviará a ${response.data.email.email}.`,
          duration: 5000,
        });
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
        telefono: '',
        celular: '',
        send_email: true,
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
  
  // Handler para crear convenio
  const handleCreateConvenio = (data: CreateConvenioFormValues) => {
    const toUpperTrim = (value: string) => value ? value.trim().toUpperCase() : value;

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
    if (data.telefono) requestData.telefono = data.telefono;
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
    if (data.send_email) requestData.send_email = true;
    if (data.email) requestData.email = data.email;
    
    createConvenioMutation.mutate(requestData);
  };

  const handleAddDocumentNumber = () => {
    const trimmed = currentDocumentNumber.trim();
    if (!trimmed) return;
    
    if (documentNumbersList.includes(trimmed)) {
      toast.warning('Número duplicado', {
        description: 'Este número de documento ya está en la lista.',
      });
      return;
    }

    setDocumentNumbersList([...documentNumbersList, trimmed]);
    setCurrentDocumentNumber('');
  };

  const handleRemoveDocumentNumber = (number: string) => {
    setDocumentNumbersList(documentNumbersList.filter(n => n !== number));
    // Remover email asociado si existe
    const newEmailsMap = { ...emailsMap };
    delete newEmailsMap[number];
    setEmailsMap(newEmailsMap);
  };

  const handleEmailChange = (documentNumber: string, email: string) => {
    setEmailsMap(prev => {
      const newMap = { ...prev };
      if (email.trim()) {
        newMap[documentNumber] = email.trim();
      } else {
        delete newMap[documentNumber];
      }
      return newMap;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDocumentNumber();
    }
  };

  // Handler para envío masivo (Manual)
  const handleSendBulkEmailsManual = async () => {
    if (documentNumbersList.length === 0) {
      toast.error('Error', {
        description: 'Por favor, agrega al menos un número de documento.',
      });
      return;
    }

    // Validar emails si se proporcionaron
    const invalidEmails: string[] = [];
    Object.entries(emailsMap).forEach(([doc, email]) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        invalidEmails.push(doc);
      }
    });

    if (invalidEmails.length > 0) {
      toast.error('Emails inválidos', {
        description: `Los siguientes documentos tienen emails inválidos: ${invalidEmails.join(', ')}`,
      });
      return;
    }

    setIsSending(true);
    try {
      const requestData: any = {
        document_numbers: documentNumbersList,
      };

      // Agregar emails solo si hay al menos uno
      // Formato requerido: emails debe ser un objeto asociativo donde las claves
      // son los números de documento (strings) y los valores son los correos electrónicos
      // Ejemplo: { "1234567890": "email@example.com", "9876543210": "otro@example.com" }
      if (Object.keys(emailsMap).length > 0) {
        requestData.emails = emailsMap;
      }

      const response = await sendBulkEmailsManual(requestData);

      const { total_requested, files_found, enqueued, errors } = response.data;

      // Mostrar confirmación inmediata
      toast.success('Proceso iniciado', {
        description: response.message || 'El proceso de envío masivo ha sido iniciado. Los correos se enviarán de forma asíncrona.',
        duration: 5000,
      });

      // Mostrar resumen
      if (errors > 0) {
        toast.warning('Algunos archivos no se encontraron', {
          description: `${errors} archivo(s) no se encontraron. Revisa el historial para más detalles.`,
          duration: 8000,
        });
      }

      // Limpiar formulario
      setDocumentNumbersList([]);
      setCurrentDocumentNumber('');
      setEmailsMap({});
      
      // Cambiar a historial para ver los nuevos envíos
      if (enqueued > 0) {
        setTimeout(() => {
          setActiveTab('history');
          refetchHistory();
        }, 1000);
      }
    } catch (error: any) {
      toast.error('Error al enviar correos', {
        description: error.message || 'Ocurrió un error al enviar los correos.',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Abrir modal de confirmación para reenvío
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
        toast.success('Correo reenviado exitosamente');
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
    };

    const config = statusConfig[status] || statusConfig.pendiente;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
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

  const chartConfig = {
    cantidad: { label: 'Cantidad de Envíos', color: '#8884d8' },
    Pendiente: { label: 'Pendiente', color: '#eab308' },
    Enviado: { label: 'Enviado', color: '#22c55e' },
    Fallido: { label: 'Fallido', color: '#ef4444' },
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Firma de Convenios</h1>
              <p className="text-gray-600 mt-1">
                Gestiona el envío masivo de correos para firma de convenios
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              {can('document_signing.view') && (
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-2" />
                  Historial
                </TabsTrigger>
              )}
              {can('document_signing.manage') && (
                <TabsTrigger value="create">
                  <FilePlus className="h-4 w-4 mr-2" />
                  Crear Convenio
                </TabsTrigger>
              )}
              {can('document_signing.manage') && (
                <TabsTrigger value="send">
                  <Send className="h-4 w-4 mr-2" />
                  Envío Masivo
                </TabsTrigger>
              )}
              {can('document_signing.view') && (
                <TabsTrigger value="statistics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Estadísticas
                </TabsTrigger>
              )}
            </TabsList>

            {/* Tab: Historial (Manual) - Primero */}
            {can('document_signing.view') && (
              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Historial de Envíos Manuales</CardTitle>
                        <CardDescription>
                          Visualiza todos los correos enviados para firma manual de convenios
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchHistory()}
                        disabled={isLoadingHistory}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                        Actualizar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label>Buscar por Documento</Label>
                        <Input
                          placeholder="Número de documento"
                          value={historyFilters.documento || ''}
                          onChange={(e) =>
                            setHistoryFilters({ ...historyFilters, documento: e.target.value || undefined, page: 1 })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select
                          value={historyFilters.estado || 'all'}
                          onValueChange={(value) =>
                            setHistoryFilters({ ...historyFilters, estado: value === 'all' ? undefined : value as any, page: 1 })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todos los estados" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="enviado">Enviado</SelectItem>
                            <SelectItem value="fallido">Fallido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Nombre de Convenio</Label>
                        <Input
                          placeholder="Buscar convenio"
                          value={historyFilters.nombre_convenio || ''}
                          onChange={(e) =>
                            setHistoryFilters({ ...historyFilters, nombre_convenio: e.target.value || undefined, page: 1 })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Fecha Desde</Label>
                        <Input
                          type="date"
                          value={historyFilters.fecha_desde || ''}
                          onChange={(e) =>
                            setHistoryFilters({ ...historyFilters, fecha_desde: e.target.value || undefined, page: 1 })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Fecha Hasta</Label>
                        <Input
                          type="date"
                          value={historyFilters.fecha_hasta || ''}
                          onChange={(e) =>
                            setHistoryFilters({ ...historyFilters, fecha_hasta: e.target.value || undefined, page: 1 })
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
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Documento</TableHead>
                                <TableHead>Nombre del Afiliado</TableHead>
                                <TableHead>Correo</TableHead>
                                <TableHead>Nombre del Convenio</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Fecha de Envío</TableHead>
                                <TableHead>Reintentos</TableHead>
                                <TableHead>Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {historyData?.data.data.map((tracking) => (
                                <TableRow key={tracking.id}>
                                  <TableCell className="font-mono">{tracking.documento}</TableCell>
                                  <TableCell>{tracking.nombre_afiliado}</TableCell>
                                  <TableCell>{tracking.email_afiliado}</TableCell>
                                  <TableCell className="max-w-xs truncate" title={tracking.nombre_convenio}>
                                    {tracking.nombre_convenio}
                                  </TableCell>
                                  <TableCell>
                                    {getManualStatusBadge(tracking.estado)}
                                    {tracking.error_message && (
                                      <div className="mt-1">
                                        <span className="text-xs text-red-600" title={tracking.error_message}>
                                          {tracking.error_message.length > 50 
                                            ? `${tracking.error_message.substring(0, 50)}...` 
                                            : tracking.error_message}
                                        </span>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>{formatDate(tracking.enviado_at)}</TableCell>
                                  <TableCell>{tracking.intentos}</TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenResendDialog(tracking)}
                                      title="Reenviar correo"
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
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
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab: Envío Masivo (Manual) - Segundo */}
            {can('document_signing.manage') && (
              <TabsContent value="send" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Enviar Correos de Convenio Manual</CardTitle>
                    <CardDescription>
                      Ingresa los números de documento de los afiliados a los que deseas enviar el correo con el PDF del convenio adjunto.
                      El sistema buscará automáticamente el PDF y enviará el correo de forma asíncrona.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="documentNumber">Números de Documento *</Label>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            id="documentNumber"
                            placeholder="Ingresa un número de documento y presiona Enter o haz clic en Agregar"
                            value={currentDocumentNumber}
                            onChange={(e) => setCurrentDocumentNumber(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="font-mono"
                          />
                          <Button
                            type="button"
                            onClick={handleAddDocumentNumber}
                            disabled={!currentDocumentNumber.trim()}
                            variant="outline"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar
                          </Button>
                        </div>
                        
                        {documentNumbersList.length > 0 && (
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[200px]">Número de Documento</TableHead>
                                  <TableHead>Correo Electrónico (Opcional)</TableHead>
                                  <TableHead className="w-[100px]">Acción</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {documentNumbersList.map((number) => (
                                  <TableRow key={number}>
                                    <TableCell className="font-mono">{number}</TableCell>
                                    <TableCell>
                                      <Input
                                        type="email"
                                        placeholder="email@ejemplo.com (opcional)"
                                        value={emailsMap[number] || ''}
                                        onChange={(e) => handleEmailChange(number, e.target.value)}
                                        className="font-mono text-sm"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveDocumentNumber(number)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-500">
                          Agrega números de documento uno por uno. Opcionalmente, puedes especificar un correo electrónico para cada documento.
                          Si no proporcionas un correo, el sistema buscará automáticamente el email del afiliado en la base de datos.
                          {documentNumbersList.length > 0 && (
                            <span className="block mt-1 font-medium text-gray-700">
                              Total: {documentNumbersList.length} documento(s) agregado(s)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-4">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <AlertCircle className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-900 mb-1">Información importante</h4>
                          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                            <li>Los correos se enviarán de forma asíncrona con el PDF del convenio adjunto.</li>
                            <li>El proceso puede tardar varios minutos dependiendo de la cantidad de correos.</li>
                            <li>Puedes ver el progreso y estado de cada envío en la pestaña "Historial".</li>
                            <li>Si no proporcionas un correo, se usará el email del afiliado en la base de datos.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleSendBulkEmailsManual}
                      disabled={isSending || documentNumbersList.length === 0}
                      className="w-full md:w-auto"
                      size="lg"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Iniciando envío masivo...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Enviar Correos de Convenio Manual
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab: Crear Convenio */}
            {can('document_signing.manage') && (
              <TabsContent value="create" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Crear Nuevo Convenio</CardTitle>
                    <CardDescription>
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
                            placeholder="1000757150"
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
                                    <Input placeholder="1000757150" {...field} className="font-mono" />
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
                                      placeholder="RESTREPO RAMIREZ"
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
                                      placeholder="MARIANA"
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
                                      placeholder="MEDELLÍN, ANTIOQUIA"
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
                                    <Input placeholder="3001234567" {...field} />
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
                                    <Input placeholder="Calle 123 #45-67" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createConvenioForm.control}
                              name="telefono"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Teléfono</FormLabel>
                                  <FormControl>
                                    <Input placeholder="6041234567" {...field} />
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={createConvenioForm.control}
                              name="proceso"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Proceso/Cargo *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="AUXILIAR DE ENFERMERIA - PISO"
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
                                    <Input placeholder="Medellín" {...field} />
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
                                      placeholder="E.S.E. HOSPITAL LA MARIA - MEDELLÍN (ANT)"
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
                                      placeholder="La compensación básica será de $1.500.000 mensuales, más auxilios de transporte por $100.000 y manutención por $80.000."
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="basico"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Salario Básico</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="1500000" />
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
                                          <MoneyInput field={field} placeholder="500000" />
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
                                          <MoneyInput field={field} placeholder="300000" />
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
                                          <MoneyInput field={field} placeholder="200000" />
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
                                          <MoneyInput field={field} placeholder="250000" />
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="horas"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Horas</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            placeholder="48"
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
                                          <MoneyInput field={field} placeholder="15000" />
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
                                          <MoneyInput field={field} placeholder="18000" />
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
                                          <MoneyInput field={field} placeholder="20000" />
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
                                          <MoneyInput field={field} placeholder="25000" />
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="auxilio_de_transporte"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Auxilio de Transporte</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="100000" />
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
                                          <MoneyInput field={field} placeholder="80000" />
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
                                          <MoneyInput field={field} placeholder="50000" />
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
                                          <MoneyInput field={field} placeholder="60000" />
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                  <FormField
                                    control={createConvenioForm.control}
                                    name="valor_auxilio_diurno"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Valor Auxilio Recargo Diurno</FormLabel>
                                        <FormControl>
                                          <MoneyInput field={field} placeholder="40000" />
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
                                          <MoneyInput field={field} placeholder="50000" />
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
                                          <MoneyInput field={field} placeholder="60000" />
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
                                          <MoneyInput field={field} placeholder="70000" />
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
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-white">
                                      <div className="space-y-0.5">
                                        <FormLabel className="text-base">El convenio tiene techo</FormLabel>
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
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">Enviar por correo electrónico</FormLabel>
                                    <FormDescription>
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
                                        placeholder="mariana.restrepo@example.com"
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
                          </div>
                        </div>

                        <Separator />

                        {/* Botones de acción */}
                        <div className="flex justify-end gap-4">
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

            {/* Tab: Estadísticas (Manual) */}
            {can('document_signing.view') && (
              <TabsContent value="statistics" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Estadísticas de Envíos Manuales</CardTitle>
                        <CardDescription>
                          Métricas y estadísticas de los correos de convenio enviados
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          placeholder="Fecha desde"
                          value={statsFilters.fecha_desde || ''}
                          onChange={(e) =>
                            setStatsFilters({ ...statsFilters, fecha_desde: e.target.value || undefined })
                          }
                          className="w-auto"
                        />
                        <Input
                          type="date"
                          placeholder="Fecha hasta"
                          value={statsFilters.fecha_hasta || ''}
                          onChange={(e) =>
                            setStatsFilters({ ...statsFilters, fecha_hasta: e.target.value || undefined })
                          }
                          className="w-auto"
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
                        {/* Métricas principales */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-2xl font-bold">{statsData.data.total}</div>
                              <p className="text-sm text-gray-600">Total de Envíos</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-2xl font-bold text-blue-600">{statsData.data.sent_today}</div>
                              <p className="text-sm text-gray-600">Enviados Hoy</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-2xl font-bold text-yellow-600">{statsData.data.pending}</div>
                              <p className="text-sm text-gray-600">Pendientes</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-2xl font-bold text-red-600">{statsData.data.failed}</div>
                              <p className="text-sm text-gray-600">Fallidos</p>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Gráficas */}
                        {chartData && chartData.statusData.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Gráfica de Pie - Distribución por Estado */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Distribución por Estado</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ChartContainer
                                  config={chartConfig}
                                  className="h-[300px] w-full"
                                >
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={chartData.statusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="cantidad"
                                      >
                                        {chartData.statusData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                      </Pie>
                                      <ChartTooltip content={<ChartTooltipContent />} />
                                      <Legend />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </ChartContainer>
                              </CardContent>
                            </Card>

                            {/* Gráfica de Barras - Comparación por Estado */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Comparación por Estado</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ChartContainer
                                  config={chartConfig}
                                  className="h-[300px] w-full"
                                >
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.statusData}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" />
                                      <YAxis />
                                      <ChartTooltip content={<ChartTooltipContent />} />
                                      <Legend />
                                      <Bar dataKey="cantidad" fill="#8884d8" name="Cantidad de Envíos">
                                        {chartData.statusData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </ChartContainer>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Por estado - Cards */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Distribución por Estado</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-xl font-bold text-yellow-600">{statsData.data.by_status.pendiente || 0}</div>
                                <p className="text-sm text-gray-600">Pendiente</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-xl font-bold text-green-600">{statsData.data.by_status.enviado || 0}</div>
                                <p className="text-sm text-gray-600">Enviado</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-xl font-bold text-red-600">{statsData.data.by_status.fallido || 0}</div>
                                <p className="text-sm text-gray-600">Fallido</p>
                              </CardContent>
                            </Card>
                          </div>
                        </div>

                        {/* Tasa de éxito */}
                        {statsData.data.total > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Tasa de Éxito</h3>
                            <Card>
                              <CardContent className="pt-6">
                                <div className="text-3xl font-bold text-green-600">
                                  {((statsData.data.sent / statsData.data.total) * 100).toFixed(1)}%
                                </div>
                                <p className="text-sm text-gray-600">
                                  {statsData.data.sent} de {statsData.data.total} correos enviados exitosamente
                                </p>
                              </CardContent>
                            </Card>
                          </div>
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
