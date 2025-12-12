import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ExportRequestsDialog from "@/components/admin/solicitudes/ExportRequestsDialog";
import VerificarCertificadoModal from "@/components/admin/solicitudes/VerificarCertificadoModal";
import {
  FileText,
  Download,
  Filter,
  Search,
  User,
  Eye,
  MoreHorizontal,
  Clock,
  CheckCircle,
  TrendingUp,
  Users,
  Brush,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Send,
  Paperclip,
  X,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorSanitizer";
import DataPagination from "@/components/ui/data-pagination";
import { usePagination } from "@/hooks/usePagination";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { logger } from "@/utils/logger";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { requestsService } from "@/services/requestsServiceApi";
import { Request } from "@/types/requests";
import { ApiRequest } from "@/services/requestsApi";
import { TableLoadingSkeleton } from "@/components/ui/loading-skeleton";
import RequestFilesSection from "@/components/admin/solicitudes/RequestFilesSection";
import { parentescos } from '@/components/actualizar-datos-personales/formOptions';
import { optimizeFileList, isImageFile } from "@/utils/imageOptimizer";
import { usePendingPersonalDataUpdates } from "@/hooks/usePendingPersonalDataUpdates";
import { PendingDataUpdateAlert, PendingDataUpdateBadge } from "@/components/admin/solicitudes/PendingDataUpdateAlert";
import { UpdateAfiliadosReminderDialog } from "@/components/admin/solicitudes/UpdateAfiliadosReminderDialog";
import { useNavigate } from "react-router-dom";

// Helper function to convert ApiRequest to Request
const convertApiRequestToRequest = (apiRequest: ApiRequest): Request => {
  const mapApiStatusToFrontendStatus = (apiStatus: string): Request['status'] => {
    switch (apiStatus) {
      case 'PENDING':
        return 'pending';
      case 'IN_REVIEW':
        return 'in_progress';
      case 'REJECTED':
        return 'rejected';
      case 'COMPLETED':
        return 'resolved';
      default:
        return 'pending';
    }
  };

  return {
    id: apiRequest.id?.toString() || '',
    request_type: apiRequest.request_type as Request['request_type'],
    id_type: apiRequest.document_type as Request['id_type'],
    id_number: apiRequest.document_number || '',
    name: apiRequest.name || '',
    last_name: apiRequest.last_name || '',
    email: apiRequest.email || '',
    phone_number: apiRequest.phone_number || '',
    payload: apiRequest.payload || {},
    status: mapApiStatusToFrontendStatus(apiRequest.status),
    created_at: apiRequest.created_at || '',
    processed_at: apiRequest.processed_at,
    resolved_at: (apiRequest.status === 'COMPLETED' || apiRequest.status === 'REJECTED') 
      ? apiRequest.processed_at 
      : undefined,
    responses: [],
    responses_count: apiRequest.responses_count ?? 0,
    files: undefined,
    files_count: apiRequest.files_count,
  };
};

// Schema para el formulario de respuesta
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB en bytes
const MAX_FILES = 4;

const getParentescoLabel = (parentesco?: string) => {
  if (!parentesco) return '';
  const normalized = parentesco.toUpperCase();
  const found = parentescos.find((item) => item.value === normalized);
  return found?.label ?? parentesco;
};

const responseFormSchema = z.object({
  newStatus: z.enum(["in_progress", "resolved", "rejected"], {
    required_error: "Debe seleccionar un nuevo estado",
  }),
  emailSubject: z.string().min(1, "El asunto es obligatorio").max(100, "El asunto no puede exceder 100 caracteres"),
  emailBody: z.string().min(1, "El cuerpo del correo es obligatorio").max(1500, "El cuerpo no puede exceder 1500 caracteres"),
  afp: z.string().trim().max(100, "El nombre del fondo no puede exceder 100 caracteres").optional(),
  actividades: z.array(z.string().trim().min(1, "La actividad no puede estar vacía").max(500, "La actividad no puede exceder 500 caracteres")).optional(),
  attachments: z.any().optional().refine((files) => {
    if (!files || files.length === 0) return true;
    
    // Validar cantidad de archivos
    if (files.length > MAX_FILES) {
      return false;
    }
    
    // Validar tamaño de cada archivo
    return Array.from(files as FileList).every(file => file.size <= MAX_FILE_SIZE);
  }, {
    message: `Puede adjuntar máximo ${MAX_FILES} archivos de ${MAX_FILE_SIZE / (1024 * 1024)}MB cada uno.`,
  }),
});

type ResponseFormValues = z.infer<typeof responseFormSchema>;

// Schema para el formulario de respuesta con compensaciones manuales
const responseWithCompensacionesFormSchema = z.object({
  newStatus: z.enum(["in_progress", "resolved", "rejected"], {
    required_error: "Debe seleccionar un nuevo estado",
  }),
  emailSubject: z.string().min(1, "El asunto es obligatorio").max(100, "El asunto no puede exceder 100 caracteres"),
  emailBody: z.string().min(1, "El cuerpo del correo es obligatorio").max(1500, "El cuerpo no puede exceder 1500 caracteres"),
  t_basicos: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number({
      required_error: "El valor de Total Basicos es obligatorio",
      invalid_type_error: "El valor de Total Basicos debe ser un número entero",
    }).int("El valor de Total Basicos debe ser un número entero").min(0, "El valor de Total Basicos debe ser mayor o igual a 0")
  ),
  t_auxilios: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number({
      required_error: "El valor de Total Auxilios es obligatorio",
      invalid_type_error: "El valor de Total Auxilios debe ser un número entero",
    }).int("El valor de Total Auxilios debe ser un número entero").min(0, "El valor de Total Auxilios debe ser mayor o igual a 0")
  ),
  attachments: z.any().optional().refine((files) => {
    if (!files || files.length === 0) return true;
    
    // Validar cantidad de archivos
    if (files.length > MAX_FILES) {
      return false;
    }
    
    // Validar tamaño de cada archivo
    return Array.from(files as FileList).every(file => file.size <= MAX_FILE_SIZE);
  }, {
    message: `Puede adjuntar máximo ${MAX_FILES} archivos de ${MAX_FILE_SIZE / (1024 * 1024)}MB cada uno.`,
  }),
});

type ResponseWithCompensacionesFormValues = z.infer<typeof responseWithCompensacionesFormSchema>;

// Helper para parsear infoCertificado en múltiples formatos
const parseInfoCertificado = (solicitud: Request): Record<string, any> => {
  const payload = solicitud.payload || {};
  let infoCertificado = payload.infoCertificado || {};

  if (typeof infoCertificado === 'string') {
    try {
      infoCertificado = JSON.parse(infoCertificado);
    } catch (e) {
      console.warn('Error al parsear infoCertificado:', e);
      infoCertificado = {};
    }
  }

  return infoCertificado;
};

const checkFlag = (value: any): boolean => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value === null || value === undefined) return false;
  const strValue = String(value).toLowerCase().trim();
  return strValue === 'true' || strValue === '1' || strValue === 'yes' || strValue === 'si';
};

const isDirigidoFondoPensiones = (solicitud: Request): boolean => {
  if (solicitud.request_type !== 'certificado-convenio') return false;
  const infoCertificado = parseInfoCertificado(solicitud);
  return checkFlag(infoCertificado.dirigidoFondoPensiones);
};

const requiresAdicionarActividades = (solicitud: Request): boolean => {
  if (solicitud.request_type !== 'certificado-convenio') return false;
  if (solicitud.status !== 'pending' && solicitud.status !== 'in_progress') return false;
  const infoCertificado = parseInfoCertificado(solicitud);
  return checkFlag(infoCertificado.adicionarActividades);
};

// Función helper para determinar si una solicitud de certificado de convenio requiere compensaciones manuales
const requiresManualCompensaciones = (solicitud: Request): boolean => {
  // Solo para certificados de convenio
  if (solicitud.request_type !== 'certificado-convenio') {
    return false;
  }

  // Solo para solicitudes pendientes o en revisión
  if (solicitud.status !== 'pending' && solicitud.status !== 'in_progress') {
    return false;
  }

  const infoCertificado = parseInfoCertificado(solicitud);

  // Caso 1: Certificado simple con valor de compensaciones
  const tieneValorCompensaciones = checkFlag(infoCertificado.valorCompensaciones);
  
  // Caso 2: Certificado para subsidio de vivienda (no se encuentra registro de compensaciones)
  const paraSubsidioVivienda = checkFlag(infoCertificado.paraSubsidioVivienda);
  
  // Caso 3: Certificado para subsidio de desempleo (solo para afiliados retirados)
  const paraSubsidioDesempleo = checkFlag(infoCertificado.paraSubsidioDesempleo);

  // Certificados dirigidos a fondo de pensiones NO deben manejar compensaciones
  const dirigidoFondoPensiones = checkFlag(infoCertificado.dirigidoFondoPensiones);
  if (dirigidoFondoPensiones) return false;

  // Certificados con adicionar actividades NO deben manejar compensaciones
  const adicionarActividades = checkFlag(infoCertificado.adicionarActividades);
  if (adicionarActividades) return false;

  // Si tiene valor de compensaciones, subsidio de vivienda o subsidio de desempleo, requiere compensaciones manuales
  return tieneValorCompensaciones || paraSubsidioVivienda || paraSubsidioDesempleo;
};

const AdminSolicitudesPage: React.FC = () => {
  const { can } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSolicitud, setSelectedSolicitud] = useState<Request | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [solicitudToRespond, setSolicitudToRespond] = useState<Request | null>(null);
  const [verificarCertificadoOpen, setVerificarCertificadoOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [useCompensacionesForm, setUseCompensacionesForm] = useState(false);
  const [requiresFondoPensionesAnnex, setRequiresFondoPensionesAnnex] = useState(false);
  const [requiresActividadesForm, setRequiresActividadesForm] = useState(false);
  const [isTransitioningRequest, setIsTransitioningRequest] = useState(false);
  const [showUpdateAfiliadosReminder, setShowUpdateAfiliadosReminder] = useState(false);

  // Hook para gestionar actualizaciones pendientes de datos personales
  const {
    pendingUpdates,
    hasPendingUpdate,
    getPendingUpdate,
    refetch: refetchPendingUpdates,
  } = usePendingPersonalDataUpdates({
    enabled: true,
    refetchInterval: 120000, // Refrescar cada 2 minutos
  });

  // Form para la respuesta normal
  const responseForm = useForm<ResponseFormValues>({
    resolver: zodResolver(responseFormSchema),
    defaultValues: {
      newStatus: "in_progress",
      emailSubject: "",
      emailBody: "",
      afp: "",
      actividades: [],
      attachments: undefined,
    },
  });

  // Form para la respuesta con compensaciones manuales
  const responseWithCompensacionesForm = useForm<ResponseWithCompensacionesFormValues>({
    resolver: zodResolver(responseWithCompensacionesFormSchema),
    defaultValues: {
      newStatus: "in_progress",
      emailSubject: "",
      emailBody: "",
      t_basicos: undefined,
      t_auxilios: undefined,
      attachments: undefined,
    },
  });

  const {
    data: allSolicitudes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-solicitudes"],
    queryFn: requestsService.getRequests,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Open modal from URL parameter
  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId && allSolicitudes.length > 0) {
      const solicitud = allSolicitudes.find(s => s.id === viewId);
      if (solicitud) {
        setSelectedSolicitud(solicitud);
        // Scroll al inicio para asegurar que el modal sea visible
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Remove the view parameter from URL
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('view');
        setSearchParams(newSearchParams, { replace: true });
      }
    }
  }, [searchParams, allSolicitudes, setSearchParams]);

  // Efecto para asegurar que el modal esté visible cuando se selecciona una solicitud
  useEffect(() => {
    if (selectedSolicitud) {
      // Pequeño delay para asegurar que el modal se haya renderizado
      const timer = setTimeout(() => {
        // Scroll de la página al inicio si es necesario
        if (window.scrollY > 100) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        // Asegurar que el diálogo esté visible
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
          dialog.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedSolicitud]);

  // El backend ya filtra las solicitudes según las asignaciones del usuario
  // No es necesario filtrar en el frontend

  // Función para obtener la etiqueta del tipo de solicitud
  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "certificado-convenio": "Certificado de Convenio",
      "compensacion-anual": "Compensación Anual Diferida",
      "verificacion-pagos": "Verificación de Pagos",
      "compensacion-descanso": "Compensación por Descanso",
      "actualizar-datos-personales": "Actualizar Datos Personales",
      "solicitud-microcredito": "Solicitud de Microcrédito",
      "solicitud-retiro-sindical": "Solicitud de Retiro Sindical",
      "retiro-sindical": "Retiro Sindical",
      "permisos-cambio-turnos": "Permisos y Cambio de Turnos",
      "incapacidades-licencias": "Incapacidades y Licencias",
    };
    return labels[type] || type;
  };

  // Obtener tipos únicos que existen en los registros (para el filtro)
  // El backend ya filtra las solicitudes según las asignaciones, así que usamos todas las que vienen
  const existingRequestTypes = useMemo(() => {
    const types = new Set<string>();
    allSolicitudes.forEach((request) => {
      types.add(request.request_type);
    });
    return Array.from(types).sort(); // Convertir a array ordenado para el select
  }, [allSolicitudes]);

  const filteredSolicitudes = useMemo(() => {
    // El backend ya filtra las solicitudes según las asignaciones del usuario
    // Solo aplicamos filtros de búsqueda, estado y tipo
    let filtered = [...allSolicitudes];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (request) =>
          request.id.toString().includes(searchTerm) ||
          request.name.toLowerCase().includes(searchLower) ||
          request.last_name.toLowerCase().includes(searchLower) ||
          request.email.toLowerCase().includes(searchLower) ||
          request.id_number.toLowerCase().includes(searchLower) ||
          getRequestTypeLabel(request.request_type).toLowerCase().includes(searchLower),
      );
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((request) => request.status === selectedStatus);
    }

    if (selectedType !== "all") {
      filtered = filtered.filter((request) => request.request_type === selectedType);
    }

    filtered.sort((a, b) => {
      if (sortBy === "name") {
        const nameA = `${a.name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.name} ${b.last_name}`.toLowerCase();
        return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      } else {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
    });

    return filtered;
  }, [allSolicitudes, searchTerm, selectedStatus, selectedType, sortBy, sortOrder]);

  const stats = useMemo(() => {
    if (!allSolicitudes || allSolicitudes.length === 0) {
      return {
        total: 0,
        pending: 0,
        in_progress: 0,
        resolved: 0,
        rejected: 0,
        this_month: 0,
        avg_resolution_time: 0
      };
    }

    const total = allSolicitudes.length;
    const pending = allSolicitudes.filter(r => r.status === 'pending').length;
    const in_progress = allSolicitudes.filter(r => r.status === 'in_progress').length;
    const resolved = allSolicitudes.filter(r => r.status === 'resolved').length;
    const rejected = allSolicitudes.filter(r => r.status === 'rejected').length;
    
    const currentMonth = new Date().getMonth();
    const this_month = allSolicitudes.filter(r => 
      new Date(r.created_at).getMonth() === currentMonth
    ).length;
    
    // Calculate average resolution time
    const resolvedRequests = allSolicitudes.filter(r => r.status === 'resolved' && r.resolved_at);
    let avg_resolution_time = 0;
    
    if (resolvedRequests.length > 0) {
      const totalTime = resolvedRequests.reduce((acc, request) => {
        const created = new Date(request.created_at).getTime();
        const resolved = new Date(request.resolved_at!).getTime();
        return acc + (resolved - created);
      }, 0);
      
      // Convert to hours
      avg_resolution_time = Math.round(totalTime / (resolvedRequests.length * 1000 * 60 * 60));
    }
    
    return {
      total,
      pending,
      in_progress,
      resolved,
      rejected,
      this_month,
      avg_resolution_time
    };
  }, [allSolicitudes]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  const handleViewDetails = (solicitud: Request) => {
    logger.debug("Visualizando detalles de solicitud", {
      id: solicitud.id,
      estado: solicitud.status,
    });
    
    // Si ya hay una solicitud seleccionada y es diferente, mostrar transición
    if (selectedSolicitud && selectedSolicitud.id !== solicitud.id) {
      setIsTransitioningRequest(true);
      // Cerrar el diálogo actual primero
      setSelectedSolicitud(null);
      setExpandedFields({});
      
      // Después de un breve delay, abrir la nueva solicitud con animación
      setTimeout(() => {
        setSelectedSolicitud(solicitud);
        // Scroll de la página al inicio para asegurar que el modal sea visible
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Resetear transición después de que el modal se haya renderizado
        setTimeout(() => {
          setIsTransitioningRequest(false);
          // Scroll suave al inicio del contenido del diálogo
          setTimeout(() => {
            const dialogContent = document.querySelector('[role="dialog"] [class*="overflow-y-auto"]');
            if (dialogContent) {
              dialogContent.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }, 50);
        }, 200);
      }, 300);
    } else {
      // Si no hay solicitud seleccionada o es la misma, abrir directamente
      setSelectedSolicitud(solicitud);
      setExpandedFields({});
      // Scroll de la página al inicio para asegurar que el modal sea visible
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Scroll al inicio del contenido del diálogo después de que se renderice
      setTimeout(() => {
        const dialogContent = document.querySelector('[role="dialog"] [class*="overflow-y-auto"]');
        if (dialogContent) {
          dialogContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const handleOpenResponseDialog = (solicitud: Request) => {
    setIsSubmittingResponse(false); // Asegurar que el estado esté reseteado al abrir
    setSolicitudToRespond(solicitud);
    
    // Determinar si necesita formulario de compensaciones manuales
    const needsCompensaciones = requiresManualCompensaciones(solicitud);
    const isFondoPensiones = isDirigidoFondoPensiones(solicitud);
    const needsActividades = requiresAdicionarActividades(solicitud);
    setRequiresFondoPensionesAnnex(isFondoPensiones);
    setRequiresActividadesForm(needsActividades);
    setUseCompensacionesForm(isFondoPensiones || needsActividades ? false : needsCompensaciones);
    
    // Pre-llenar el formulario con valores por defecto basados en el estado actual
    // Para certificados de convenio, solo permitir "resolved" o "rejected"
    const isCertificadoConvenio = solicitud.request_type === 'certificado-convenio';
    let defaultStatus: "in_progress" | "resolved" | "rejected" = "in_progress";
    
    if (isCertificadoConvenio) {
      // Para certificados de convenio, solo permitir "resolved" o "rejected"
      // Si ya está resuelto o rechazado, mantener ese estado, sino usar "resolved" por defecto
      if (solicitud.status === "resolved") {
        defaultStatus = "resolved";
      } else if (solicitud.status === "rejected") {
        defaultStatus = "rejected";
      } else {
        // Para "pending" o "in_progress", usar "resolved" por defecto
        defaultStatus = "resolved";
      }
    } else {
      // Para otros tipos de solicitud, permitir "in_progress"
      if (solicitud.status === "resolved") {
        defaultStatus = "resolved";
      } else if (solicitud.status === "rejected") {
        defaultStatus = "rejected";
      } else {
        // Para "pending" o "in_progress", usar "in_progress"
        defaultStatus = "in_progress";
      }
    }
    const requestTypeLabel = getRequestTypeLabel(solicitud.request_type);
    
    // Mensaje predefinido para solicitudes de actualización de datos personales
    if (solicitud.request_type === 'actualizar-datos-personales') {
      const emailSubject = `Actualización de Datos Personales - Solicitud #${solicitud.id}`;
      const emailBody = `Su solicitud ha sido procesada y los datos han sido actualizados en nuestro sistema.\n`
      
      responseForm.reset({
        newStatus: defaultStatus,
        emailSubject,
        emailBody,
        afp: "",
        actividades: undefined,
        attachments: undefined,
      });
      responseForm.setValue('newStatus', defaultStatus, { shouldValidate: false });
    } else if (needsCompensaciones) {
      // Generar sugerencias de texto según el tipo de certificado
      const payload = solicitud.payload || {};
      let infoCertificado = payload.infoCertificado || {};
      if (typeof infoCertificado === 'string') {
        try {
          infoCertificado = JSON.parse(infoCertificado);
        } catch (e) {
          infoCertificado = {};
        }
      }

      const paraSubsidioDesempleo = infoCertificado.paraSubsidioDesempleo === true || 
        infoCertificado.paraSubsidioDesempleo === 'true' ||
        String(infoCertificado.paraSubsidioDesempleo).toLowerCase() === 'true';
      
      const paraSubsidioVivienda = infoCertificado.paraSubsidioVivienda === true || 
        infoCertificado.paraSubsidioVivienda === 'true' ||
        String(infoCertificado.paraSubsidioVivienda).toLowerCase() === 'true';

      // Generar asunto y cuerpo según el tipo
      let emailSubject = `Certificado de Convenio - Solicitud #${solicitud.id}`;
      let emailBody = "Adjunto encontrará su certificado de convenio en formato PDF.\n\nEste certificado ha sido generado automáticamente y contiene la información solicitada sobre su convenio.";

      if (paraSubsidioDesempleo) {
        emailSubject = `Certificado de Convenio - Subsidio de Desempleo - Solicitud #${solicitud.id}`;
        emailBody = "Adjunto encontrará su certificado de convenio para subsidio de desempleo.\n\nEste certificado ha sido generado automáticamente y contiene la información solicitada sobre su convenio.";
      } else if (paraSubsidioVivienda) {
        emailSubject = `Certificado de Convenio - Subsidio de Vivienda - Solicitud #${solicitud.id}`;
        emailBody = "Adjunto encontrará su certificado de convenio para subsidio de vivienda con los valores de compensación.\n\nEste certificado ha sido generado automáticamente y contiene la información solicitada sobre su convenio.";
      }

      // Agregar fecha de generación
      const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      emailBody += `\n\nFecha de generación: ${fechaGeneracion}`;

      // Usar formulario de compensaciones
      responseWithCompensacionesForm.reset({
        newStatus: defaultStatus,
        emailSubject,
        emailBody,
        t_basicos: undefined,
        t_auxilios: undefined,
        attachments: undefined,
      });
      // Asegurar que el valor del estado se establezca correctamente después del reset
      responseWithCompensacionesForm.setValue('newStatus', defaultStatus, { shouldValidate: false });
    } else {
      // Usar formulario normal
      let emailSubject = `Respuesta a su solicitud #${solicitud.id} de ${requestTypeLabel}`;
      let emailBody = "";
      
      // Si es dirigido a fondo de pensiones, prediligenciar mensaje
      if (isFondoPensiones) {
        emailSubject = `Certificado de Convenio - Fondo de Pensiones - Solicitud #${solicitud.id}`;
        
        // Obtener AFP si está disponible en el payload
        const payload = solicitud.payload || {};
        const afpValue = payload.afp || "";
        
        emailBody = "Adjunto encontrará su certificado de convenio dirigido al fondo de pensiones en formato PDF.\n\n";
        emailBody += "Este certificado ha sido generado automáticamente y contiene la información solicitada sobre su convenio para corrección de historia.";
        
        if (afpValue && afpValue.trim() !== "") {
          emailBody += `\n\nFondo de Pensiones: ${afpValue}`;
        }
        
        // Agregar fecha de generación
        const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        emailBody += `\n\nFecha de generación: ${fechaGeneracion}`;
      } else if (needsActividades) {
        // Si requiere adicionar actividades, prediligenciar mensaje
        emailSubject = `Certificado de Convenio - Con Actividades - Solicitud #${solicitud.id}`;
        
        emailBody = "Adjunto encontrará su certificado de convenio en formato PDF con las actividades realizadas.\n\n";
        emailBody += "Este certificado ha sido generado automáticamente y contiene la información solicitada sobre su convenio, incluyendo las actividades que ha realizado.";
        
        // Agregar fecha de generación
        const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        emailBody += `\n\nFecha de generación: ${fechaGeneracion}`;
      }
      
      responseForm.reset({
        newStatus: defaultStatus,
        emailSubject,
        emailBody,
        afp: "",
        actividades: needsActividades ? [] : undefined,
        attachments: undefined,
      });
      // Asegurar que el valor del estado se establezca correctamente después del reset
      responseForm.setValue('newStatus', defaultStatus, { shouldValidate: false });
    }
    setResponseDialogOpen(true);
  };

  const handleCloseResponseDialog = () => {
    setIsSubmittingResponse(false); // Resetear estado de envío al cerrar
    setResponseDialogOpen(false);
    setSolicitudToRespond(null);
    setUseCompensacionesForm(false);
    setRequiresFondoPensionesAnnex(false);
    setRequiresActividadesForm(false);
    responseForm.reset();
    responseWithCompensacionesForm.reset();
  };

  const handleSubmitResponse = async (data: ResponseFormValues) => {
    if (!solicitudToRespond) return;

    // Verificar si hay actualización pendiente antes de responder
    const pendingUpdate = getPendingUpdate(solicitudToRespond.id_number);
    if (pendingUpdate) {
      // El correo actual es el correo de la solicitud que se está respondiendo (el que está en el sistema actualmente)
      const correoActual = solicitudToRespond.email;
      // El correo solicitado es el que está en el payload de la solicitud de actualización
      const correoSolicitadoRaw = pendingUpdate.payload?.correo || pendingUpdate.payload?.nuevoEmail || pendingUpdate.payload?.nuevo_email;
      // Si no hay correo solicitado, usar el correo actual (no hay cambio)
      const correoSolicitado = correoSolicitadoRaw && correoSolicitadoRaw.trim() !== '' ? correoSolicitadoRaw : correoActual;
      const hayCambioCorreo = correoSolicitadoRaw && correoSolicitadoRaw.trim() !== '' && correoSolicitadoRaw !== correoActual;
      
      // Si se va a aprobar (resolved) una solicitud de actualización de datos personales,
      // el correo de envío será el nuevo correo (o el actual si no hay cambio)
      const isAprobandoActualizacion = solicitudToRespond.request_type === 'actualizar-datos-personales' && data.newStatus === 'resolved';
      const correoEnvio = isAprobandoActualizacion ? correoSolicitado : correoActual;
      
      const mensaje = isAprobandoActualizacion
        ? `⚠️ ADVERTENCIA: Este afiliado tiene una solicitud pendiente de actualización de datos personales.\n\n` +
          (hayCambioCorreo
            ? `Al aprobar esta solicitud de actualización, el correo se enviará al nuevo correo (${correoSolicitado}), ` +
              `ya que los datos serán actualizados en el sistema.\n\n` +
              `Correo actual en sistema: ${correoActual}\n` +
              `Nuevo correo solicitado: ${correoSolicitado}\n\n`
            : `Al aprobar esta solicitud de actualización, el correo se enviará al correo actual (${correoActual}), ` +
              `ya que no hay cambios en el correo electrónico.\n\n` +
              `Correo actual en sistema: ${correoActual}\n\n`) +
          `¿Desea continuar con la aprobación?`
        : `⚠️ ADVERTENCIA: Este afiliado tiene una solicitud pendiente de actualización de datos personales.\n\n` +
          (hayCambioCorreo
            ? `Si responde ahora, el correo se enviará al correo actual (${correoActual}), ` +
              `pero el afiliado ha solicitado cambiarlo a: ${correoSolicitado}\n\n`
            : `Si responde ahora, el correo se enviará al correo actual (${correoActual}). ` +
              `No hay cambios en el correo electrónico en la solicitud de actualización pendiente.\n\n`) +
          `¿Desea continuar con la respuesta o prefiere procesar primero la actualización de datos?`;
      
      const confirmed = window.confirm(mensaje);
      
      if (!confirmed) {
        return; // El usuario canceló, no enviar la respuesta
      }
    }

    if (requiresFondoPensionesAnnex) {
      const hasFiles = data.attachments && (data.attachments as FileList).length > 0;
      if (!hasFiles) {
        responseForm.setError('attachments', { type: 'custom', message: 'Debe adjuntar al menos un documento (planillas de pagos de seguridad social).' });
        toast.error("Adjunto requerido", {
          description: "Debe adjuntar al menos un documento. (Planillas de pagos de seguridad social)",
          duration: 5000,
        });
        return;
      }
    }

    if (requiresActividadesForm) {
      const actividadesValidas = data.actividades?.filter(a => a.trim() !== '') || [];
      if (actividadesValidas.length === 0) {
        responseForm.setError('actividades', { type: 'custom', message: 'Debe agregar al menos una actividad.' });
        toast.error("Actividades requeridas", {
          description: "Debe agregar al menos una actividad para incluir en el certificado.",
          duration: 5000,
        });
        return;
      }
    }

    setIsSubmittingResponse(true);
    const solicitudId = solicitudToRespond.id; // Guardar ID antes de que pueda cambiar
    
    // Para certificados de convenio, asegurar que el estado sea "resolved" o "rejected", nunca "in_progress"
    const isCertificadoConvenio = solicitudToRespond.request_type === 'certificado-convenio';
    let finalStatus = data.newStatus;
    if (isCertificadoConvenio && finalStatus === 'in_progress') {
      // Si por alguna razón el estado es "in_progress" para un certificado de convenio, cambiarlo a "resolved"
      finalStatus = 'resolved';
    }
    
    try {
      // Incluir AFP en el cuerpo si se proporcionó
      const trimmedAfp = data.afp?.trim();
      let finalEmailBody = data.emailBody;
      
      if (trimmedAfp) {
        finalEmailBody = `${finalEmailBody}\n\nAFP: ${trimmedAfp}`;
      }

      // Enviar respuesta usando la API del backend
      // Las actividades se envían en FormData como actividades[0], actividades[1], etc., NO en el email_body
      // El AFP también se envía en FormData si está presente
      const updatedRequest = await requestsService.sendResponse(solicitudId, {
        newStatus: finalStatus,
        emailSubject: data.emailSubject,
        emailBody: finalEmailBody,
        attachments: data.attachments,
        actividades: requiresActividadesForm ? (data.actividades || []) : undefined,
        afp: data.afp && data.afp.trim() !== '' ? data.afp.trim() : undefined,
      });

      // Resetear estado
      setIsSubmittingResponse(false);

      // Verificar si se completó una solicitud de actualización de datos personales
      const isActualizacionCompletada = solicitudToRespond?.request_type === 'actualizar-datos-personales' && finalStatus === 'resolved';

      // Mostrar toast de éxito ANTES de cerrar el modal para que sea visible
      toast.success("Respuesta enviada exitosamente", {
        description: `La respuesta a la solicitud #${solicitudId} ha sido enviada exitosamente al afiliado.`,
        duration: 4000,
      });

      // Cerrar el modal después de un pequeño delay para que el usuario vea el toast
      setTimeout(() => {
        handleCloseResponseDialog();
      }, 500);
      
      // Refetch para actualizar la lista primero
      const refetchResult = await refetch();
      
      // Refrescar actualizaciones pendientes si se procesó una actualización de datos
      if (solicitudToRespond?.request_type === 'actualizar-datos-personales') {
        refetchPendingUpdates();
      }

      // Mostrar recordatorio para actualizar afiliados si se completó una actualización de datos
      if (isActualizacionCompletada) {
        // Mostrar el diálogo de recordatorio después de un pequeño delay
        setTimeout(() => {
          setShowUpdateAfiliadosReminder(true);
        }, 1000);
      }
      
      // Actualizar la solicitud seleccionada con los datos más recientes del servidor
      // Esto asegura que tenemos la información completa incluyendo archivos y respuestas actualizadas
      if (selectedSolicitud?.id === solicitudId) {
        // Usar los datos del refetch primero (más rápido)
        const refetchedData = refetchResult.data || [];
        const updatedFromList = refetchedData.find(req => req.id === solicitudId);
        
        if (updatedFromList) {
          // Si encontramos en la lista refetch, usar esos datos
          setSelectedSolicitud(updatedFromList);
          setExpandedFields({});
        } else {
          // Si no está en la lista, obtener directamente del servidor
          try {
            const refreshedRequest = await requestsService.getRequestById(solicitudId);
            if (refreshedRequest) {
              setSelectedSolicitud(refreshedRequest);
              setExpandedFields({});
            } else {
              // Fallback final: usar updatedRequest
              setSelectedSolicitud(updatedRequest);
              setExpandedFields({});
            }
          } catch (error) {
            logger.error("Error al actualizar la solicitud seleccionada", error instanceof Error ? error.message : error);
            // Fallback: usar updatedRequest
            setSelectedSolicitud(updatedRequest);
            setExpandedFields({});
          }
        }
      }
    } catch (error) {
      logger.error("Error al enviar respuesta de solicitud", error instanceof Error ? error.message : error);
      
      // Siempre resetear el estado primero
      setIsSubmittingResponse(false);
      
      // Extraer errores específicos de campos del error original
      let errorMessage = getErrorMessage(error);
      let hasFieldErrors = false;
      
      // Intentar extraer errores de validación del error original
      if (error && typeof error === 'object' && 'originalData' in error) {
        const originalData = (error as any).originalData;
        if (originalData?.errors) {
          const fieldErrors = originalData.errors;
          
          // Establecer errores en los campos del formulario
          Object.entries(fieldErrors).forEach(([field, messages]) => {
            const messageArray = Array.isArray(messages) ? messages : [messages];
            const firstMessage = messageArray[0] || '';
            
            // Mapear campos del backend a campos del formulario
            if (field === 'afp') {
              responseForm.setError('afp', { 
                type: 'server', 
                message: firstMessage 
              });
              hasFieldErrors = true;
            } else if (field === 'attachments' || field === 'files') {
              responseForm.setError('attachments', { 
                type: 'server', 
                message: firstMessage 
              });
              hasFieldErrors = true;
            } else if (field === 'actividades') {
              responseForm.setError('actividades', { 
                type: 'server', 
                message: firstMessage 
              });
              hasFieldErrors = true;
            }
          });
          
          // Construir mensaje de error más detallado
          const errorMessages = Object.entries(fieldErrors)
            .flatMap(([field, messages]) => 
              Array.isArray(messages) 
                ? messages.map(msg => `${field}: ${msg}`)
                : [`${field}: ${messages}`]
            )
            .join('\n');
          
          if (errorMessages) {
            errorMessage = `Errores de validación:\n${errorMessages}`;
          }
        } else if (originalData?.message) {
          errorMessage = originalData.message;
        }
      }
      
      // Mostrar toast de error SIN cerrar el modal para que el usuario pueda ver el error
      toast.error("Error al enviar respuesta", {
        description: errorMessage,
        duration: 8000,
      });
      
      // Si hay errores de campo específicos, hacer scroll al primer campo con error
      if (hasFieldErrors) {
        setTimeout(() => {
          const firstErrorField = document.querySelector('[data-field-error="true"]') || 
                                  document.querySelector('.text-destructive');
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  };

  const handleSubmitResponseWithCompensaciones = async (data: ResponseWithCompensacionesFormValues) => {
    if (!solicitudToRespond) return;

    // Verificar si hay actualización pendiente antes de responder
    const pendingUpdate = getPendingUpdate(solicitudToRespond.id_number);
    if (pendingUpdate) {
      // El correo actual es el correo de la solicitud que se está respondiendo (el que está en el sistema actualmente)
      const correoActual = solicitudToRespond.email;
      // El correo solicitado es el que está en el payload de la solicitud de actualización
      const correoSolicitadoRaw = pendingUpdate.payload?.correo || pendingUpdate.payload?.nuevoEmail || pendingUpdate.payload?.nuevo_email;
      // Si no hay correo solicitado, usar el correo actual (no hay cambio)
      const correoSolicitado = correoSolicitadoRaw && correoSolicitadoRaw.trim() !== '' ? correoSolicitadoRaw : correoActual;
      const hayCambioCorreo = correoSolicitadoRaw && correoSolicitadoRaw.trim() !== '' && correoSolicitadoRaw !== correoActual;
      
      // Si se va a aprobar (resolved) una solicitud de actualización de datos personales,
      // el correo de envío será el nuevo correo (o el actual si no hay cambio)
      const isAprobandoActualizacion = solicitudToRespond.request_type === 'actualizar-datos-personales' && data.newStatus === 'resolved';
      const correoEnvio = isAprobandoActualizacion ? correoSolicitado : correoActual;
      
      const mensaje = isAprobandoActualizacion
        ? `⚠️ ADVERTENCIA: Este afiliado tiene una solicitud pendiente de actualización de datos personales.\n\n` +
          (hayCambioCorreo
            ? `Al aprobar esta solicitud de actualización, el correo se enviará al nuevo correo (${correoSolicitado}), ` +
              `ya que los datos serán actualizados en el sistema.\n\n` +
              `Correo actual en sistema: ${correoActual}\n` +
              `Nuevo correo solicitado: ${correoSolicitado}\n\n`
            : `Al aprobar esta solicitud de actualización, el correo se enviará al correo actual (${correoActual}), ` +
              `ya que no hay cambios en el correo electrónico.\n\n` +
              `Correo actual en sistema: ${correoActual}\n\n`) +
          `¿Desea continuar con la aprobación?`
        : `⚠️ ADVERTENCIA: Este afiliado tiene una solicitud pendiente de actualización de datos personales.\n\n` +
          (hayCambioCorreo
            ? `Si responde ahora, el correo se enviará al correo actual (${correoActual}), ` +
              `pero el afiliado ha solicitado cambiarlo a: ${correoSolicitado}\n\n`
            : `Si responde ahora, el correo se enviará al correo actual (${correoActual}). ` +
              `No hay cambios en el correo electrónico en la solicitud de actualización pendiente.\n\n`) +
          `¿Desea continuar con la respuesta o prefiere procesar primero la actualización de datos?`;
      
      const confirmed = window.confirm(mensaje);
      
      if (!confirmed) {
        return; // El usuario canceló, no enviar la respuesta
      }
    }

    setIsSubmittingResponse(true);
    const solicitudId = solicitudToRespond.id; // Guardar ID antes de que pueda cambiar
    try {
      // Enviar respuesta con compensaciones usando la API del backend
      const updatedRequest = await requestsService.sendResponseWithCompensaciones(solicitudId, {
        newStatus: data.newStatus,
        emailSubject: data.emailSubject,
        emailBody: data.emailBody,
        t_basicos: data.t_basicos,
        t_auxilios: data.t_auxilios,
        attachments: data.attachments,
      });

      // Resetear estado
      setIsSubmittingResponse(false);

      // Verificar si se completó una solicitud de actualización de datos personales
      const isActualizacionCompletada = solicitudToRespond?.request_type === 'actualizar-datos-personales' && data.newStatus === 'resolved';

      // Calcular Total Ingresos para el mensaje
      const t_ingresos = data.t_basicos + data.t_auxilios;

      // Mostrar toast de éxito ANTES de cerrar el modal para que sea visible
      toast.success("Certificado generado y respuesta enviada exitosamente", {
        description: `El certificado con compensaciones (Total Ingresos: $${t_ingresos.toLocaleString('es-CO')}) ha sido generado y enviado al afiliado.`,
        duration: 5000,
      });

      // Cerrar el modal después de un pequeño delay para que el usuario vea el toast
      setTimeout(() => {
        handleCloseResponseDialog();
      }, 500);
      
      // Refetch para actualizar la lista primero
      const refetchResult = await refetch();
      
      // Refrescar actualizaciones pendientes si se procesó una actualización de datos
      if (solicitudToRespond?.request_type === 'actualizar-datos-personales') {
        refetchPendingUpdates();
      }

      // Mostrar recordatorio para actualizar afiliados si se completó una actualización de datos
      if (isActualizacionCompletada) {
        // Mostrar el diálogo de recordatorio después de un pequeño delay
        setTimeout(() => {
          setShowUpdateAfiliadosReminder(true);
        }, 1000);
      }
      
      // Actualizar la solicitud seleccionada con los datos más recientes del servidor
      if (selectedSolicitud?.id === solicitudId) {
        const refetchedData = refetchResult.data || [];
        const updatedFromList = refetchedData.find(req => req.id === solicitudId);
        
        if (updatedFromList) {
          setSelectedSolicitud(updatedFromList);
          setExpandedFields({});
        } else {
          try {
            const refreshedRequest = await requestsService.getRequestById(solicitudId);
            if (refreshedRequest) {
              setSelectedSolicitud(refreshedRequest);
              setExpandedFields({});
            } else {
              setSelectedSolicitud(updatedRequest);
              setExpandedFields({});
            }
          } catch (error) {
            logger.error("Error al actualizar la solicitud seleccionada", error instanceof Error ? error.message : error);
            setSelectedSolicitud(updatedRequest);
            setExpandedFields({});
          }
        }
      }
    } catch (error) {
      logger.error("Error al enviar respuesta con compensaciones", error instanceof Error ? error.message : error);
      
      // Siempre resetear el estado primero
      setIsSubmittingResponse(false);
      
      // Obtener mensaje sanitizado y amigable para el usuario
      const errorMessage = getErrorMessage(error);
      
      // Mostrar toast de error SIN cerrar el modal para que el usuario pueda ver el error
      toast.error("Error al generar certificado con compensaciones", {
        description: errorMessage,
        duration: 6000,
      });
    }
  };

  const handleChangeStatus = async (id: string, newStatus: Request["status"]) => {
    try {
      await requestsService.updateRequestStatus(id, newStatus);

      const statusLabels = {
        in_progress: "Marcada en Revisión",
        resolved: "Marcada como Completada",
        rejected: "Rechazada",
      };

      toast.success(`Solicitud ${statusLabels[newStatus]}`, {
        description: `La solicitud #${id} ha sido ${statusLabels[newStatus].toLowerCase()} exitosamente.`,
      });

      if (selectedSolicitud?.id === id) {
        setSelectedSolicitud((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                processed_at: new Date().toISOString(),
                resolved_at: newStatus === "resolved" ? new Date().toISOString() : prev.resolved_at,
              }
            : null
        );
      }

      refetch();
    } catch (error) {
      logger.error("Error al actualizar estado de solicitud", error instanceof Error ? error.message : error);
      const errorMessage = getErrorMessage(error);
      toast.error("Error al actualizar estado", {
        description: errorMessage,
      });
    }
  };

  const { currentPage, itemsPerPage, totalPages, totalItems, paginatedData, goToPage, setItemsPerPage } = usePagination(
    {
      data: filteredSolicitudes,
      initialItemsPerPage: 10,
    },
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "in_progress":
        return "bg-blue-100 text-blue-700";
      case "resolved":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "in_progress":
        return "En Revisión";
      case "resolved":
        return "Completado";
      case "rejected":
        return "Rechazado";
      default:
        return status;
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
    setSelectedType("all");
  };

  const toggleSort = (column: "name" | "date") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                      <FileText className="h-8 w-8 text-primary-prosalud" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-3xl font-bold text-primary-prosalud">Gestión de Solicitudes</CardTitle>
                        <Badge variant="secondary" className="text-base px-3 py-1">
                          Total: {stats?.total || 0}
                        </Badge>
                      </div>
                      <CardDescription className="text-base mt-2">
                        Administra y procesa las solicitudes de los usuarios de ProSalud
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Button
                      variant="outline"
                      onClick={() => setExportDialogOpen(true)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Exportar Reporte
                    </Button>
                    {can('requests.view') && (
                      <button
                        type="button"
                        onClick={() => setVerificarCertificadoOpen(true)}
                        className="text-sm text-primary-prosalud hover:text-primary-prosalud-dark underline underline-offset-2 font-medium cursor-pointer"
                      >
                        Verificar certificado de convenio
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Card className="border-l-4 border-l-yellow-500 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Pendientes</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</p>
                    </div>
                    <div className="p-2 rounded-full">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">En Revisión</p>
                      <p className="text-2xl font-bold text-blue-600">{stats?.in_progress || 0}</p>
                    </div>
                    <div className="p-2 rounded-full">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Resueltas</p>
                      <p className="text-2xl font-bold text-green-600">{stats?.resolved || 0}</p>
                    </div>
                    <div className="p-2 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Rechazadas</p>
                      <p className="text-2xl font-bold text-red-600">{stats?.rejected || 0}</p>
                    </div>
                    <div className="p-2 rounded-full">
                      <X className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Este Mes</p>
                      <p className="text-2xl font-bold text-purple-600">{stats?.this_month || 0}</p>
                    </div>
                    <div className="p-2 rounded-full">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Filter className="h-5 w-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="md:col-span-2">
                    <div className="space-y-2">
                      <Label htmlFor="search-input">Buscar</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="search-input"
                          type="text"
                          placeholder="Buscar por ID, nombre, email o tipo de solicitud..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 h-10"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="space-y-2">
                      <Label htmlFor="status-filter">Estado</Label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger id="status-filter" className="h-10">
                          <SelectValue placeholder="Todos los estados" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="in_progress">En Revisión</SelectItem>
                          <SelectItem value="resolved">Completado</SelectItem>
                          <SelectItem value="rejected">Rechazado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <div className="space-y-2">
                      <Label htmlFor="type-filter">Tipo de Solicitud</Label>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger id="type-filter" className="h-10">
                          <SelectValue placeholder="Todos los tipos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los tipos</SelectItem>
                          {existingRequestTypes.map((requestType) => (
                            <SelectItem key={requestType} value={requestType}>
                              {getRequestTypeLabel(requestType)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Button variant="outline" onClick={clearFilters} className="h-10 w-full flex items-center gap-2">
                      <Brush className="w-4 h-4" />
                      Limpiar Filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Requests Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">Solicitudes ({totalItems})</CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  Lista completa de solicitudes realizadas por los afiliados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <TableLoadingSkeleton />
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error de conexión</AlertTitle>
                    <AlertDescription>
                      No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.
                      {error instanceof Error && <div className="mt-2 text-sm">Detalles: {error.message}</div>}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="w-[18%]">
                              <Button
                                variant="ghost"
                                onClick={() => toggleSort("name")}
                                className="flex items-center gap-2"
                              >
                                Solicitante
                                {sortBy === "name" ? (
                                  sortOrder === "asc" ? (
                                    <ArrowUp className="h-4 w-4" />
                                  ) : (
                                    <ArrowDown className="h-4 w-4" />
                                  )
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 opacity-50" />
                                )}
                              </Button>
                            </TableHead>
                            <TableHead className="w-[15%]">Tipo</TableHead>
                            <TableHead className="w-[20%]">Proceso y Hospital</TableHead>
                            <TableHead className="w-[12%]">Estado</TableHead>
                            <TableHead className="w-[15%]">
                              <Button
                                variant="ghost"
                                onClick={() => toggleSort("date")}
                                className="flex items-center gap-2"
                              >
                                Fecha
                                {sortBy === "date" ? (
                                  sortOrder === "asc" ? (
                                    <ArrowUp className="h-4 w-4" />
                                  ) : (
                                    <ArrowDown className="h-4 w-4" />
                                  )
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 opacity-50" />
                                )}
                              </Button>
                            </TableHead>
                            <TableHead className="w-[10%]">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedData.map((solicitud) => (
                            <TableRow key={solicitud.id} className="hover:bg-gray-50 transition-colors">
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <div className="bg-gray-100 p-2 rounded-full">
                                    <User className="h-4 w-4 text-gray-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-medium text-gray-900">
                                        {solicitud.name} {solicitud.last_name}
                                      </p>
                                      {hasPendingUpdate(solicitud.id_number) &&
                                       solicitud.status !== 'resolved' &&
                                       solicitud.status !== 'rejected' &&
                                       solicitud.request_type !== 'actualizar-datos-personales' && (
                                        <PendingDataUpdateBadge
                                          hasPendingUpdate={true}
                                          onClick={() => {
                                            const pendingUpdate = getPendingUpdate(solicitud.id_number);
                                            if (pendingUpdate) {
                                              const convertedRequest = convertApiRequestToRequest(pendingUpdate);
                                              handleViewDetails(convertedRequest);
                                            }
                                          }}
                                        />
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600">{solicitud.email}</p>
                                    <p className="text-xs text-gray-500">
                                      {solicitud.id_type}: {solicitud.id_number}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {getRequestTypeLabel(solicitud.request_type)}
                                  </p>
                                  <p className="text-sm text-gray-500">ID: {solicitud.id}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  {(() => {
                                    const hasProceso = solicitud.payload?.proceso && String(solicitud.payload.proceso).trim() !== '';
                                    const hasDondeRealiza = solicitud.payload?.dondeRealizaProceso && String(solicitud.payload.dondeRealizaProceso).trim() !== '';
                                    const hasSedeProceso = solicitud.payload?.sedeProceso && String(solicitud.payload.sedeProceso).trim() !== '';
                                    const hasHospital = hasDondeRealiza || hasSedeProceso;
                                    
                                    if (!hasProceso && !hasHospital) {
                                      return <p className="text-sm text-gray-400 italic">No disponible</p>;
                                    }
                                    
                                    return (
                                      <>
                                        {hasProceso && (
                                          <p className="text-sm font-medium text-gray-900">
                                            {solicitud.payload.proceso}
                                          </p>
                                        )}
                                        {hasDondeRealiza && (
                                          <p className={`text-xs text-gray-600 ${hasProceso ? 'mt-1' : ''}`}>
                                            {solicitud.payload.dondeRealizaProceso}
                                          </p>
                                        )}
                                        {!hasDondeRealiza && hasSedeProceso && (
                                          <p className={`text-xs text-gray-600 ${hasProceso ? 'mt-1' : ''}`}>
                                            {solicitud.payload.sedeProceso}
                                          </p>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(solicitud.status)}>
                                  {getStatusLabel(solicitud.status)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm text-gray-900">
                                    {new Date(solicitud.created_at).toLocaleDateString("es-ES", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(solicitud.created_at).toLocaleTimeString("es-ES", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  {solicitud.status === "resolved" && solicitud.resolved_at && (
                                    <p className="text-xs text-green-600 font-medium mt-1">
                                      ✓ Resuelto:{" "}
                                      {new Date(solicitud.resolved_at).toLocaleDateString("es-ES", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                      ,{" "}
                                      {new Date(solicitud.resolved_at).toLocaleTimeString("es-ES", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  )}
                                  {solicitud.status === "rejected" && solicitud.resolved_at && (
                                    <p className="text-xs text-red-600 font-medium mt-1">
                                      ✗ Rechazado:{" "}
                                      {new Date(solicitud.resolved_at).toLocaleDateString("es-ES", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                      ,{" "}
                                      {new Date(solicitud.resolved_at).toLocaleTimeString("es-ES", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => handleViewDetails(solicitud)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver Detalles
                                    </DropdownMenuItem>
                                    {can('requests.respond') && (solicitud.status === "pending" || solicitud.status === "in_progress") && (
                                      <DropdownMenuItem onClick={() => handleOpenResponseDialog(solicitud)}>
                                        <Send className="h-4 w-4 mr-2" />
                                        Dar Respuesta
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

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

          {/* Export Dialog */}
          <ExportRequestsDialog 
            open={exportDialogOpen} 
            onOpenChange={setExportDialogOpen}
            existingRequestTypes={existingRequestTypes}
            getRequestTypeLabel={getRequestTypeLabel}
          />

          {/* Request Details Dialog */}
          {selectedSolicitud && (
            <Dialog open={!!selectedSolicitud} onOpenChange={() => {
              if (!isTransitioningRequest) {
                setSelectedSolicitud(null);
                setIsTransitioningRequest(false);
                // Resetear campos expandidos al cerrar el diálogo
                setExpandedFields({});
              }
            }}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white relative">
                {isTransitioningRequest && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 text-primary-prosalud animate-spin" />
                      <p className="text-sm text-gray-700 font-medium">
                        Cargando solicitud de actualización...
                      </p>
                    </div>
                  </div>
                )}
                <DialogTitle className="sr-only">
                  Detalles de Solicitud #{selectedSolicitud.id}
                </DialogTitle>
                <div className="bg-white min-h-full">
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary-prosalud/10 p-2 rounded-lg">
                        <FileText className="h-6 w-6 text-primary-prosalud" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Detalles de Solicitud #{selectedSolicitud.id}
                        </h2>
                        <p className="text-sm text-gray-600">Información completa de la solicitud</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Alerta de actualización pendiente */}
                    {selectedSolicitud && 
                     hasPendingUpdate(selectedSolicitud.id_number) &&
                     selectedSolicitud.status !== 'resolved' &&
                     selectedSolicitud.status !== 'rejected' &&
                     selectedSolicitud.request_type !== 'actualizar-datos-personales' && (
                      <PendingDataUpdateAlert
                        pendingUpdate={getPendingUpdate(selectedSolicitud.id_number)!}
                        documentNumber={selectedSolicitud.id_number}
                        onViewUpdate={() => {
                          const pendingUpdate = getPendingUpdate(selectedSolicitud.id_number);
                          if (pendingUpdate) {
                            const convertedRequest = convertApiRequestToRequest(pendingUpdate);
                            handleViewDetails(convertedRequest);
                          }
                        }}
                        variant="warning"
                      />
                    )}
                    

                    {/* Información del Solicitante */}
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="bg-gray-50 border-b border-gray-200">
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          Información del Solicitante
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Documento</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <p className="text-gray-900">
                                {selectedSolicitud.id_type} {selectedSolicitud.id_number}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Nombre completo</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <p className="text-gray-900">
                                {selectedSolicitud.name && selectedSolicitud.last_name
                                  ? `${selectedSolicitud.name} ${selectedSolicitud.last_name}`.trim()
                                  : selectedSolicitud.name || selectedSolicitud.last_name || "No especificado"}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Correo Electrónico</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <p className="text-gray-900">{selectedSolicitud.email || "No especificado"}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Teléfono</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              {/* NOTA: En el panel admin NO se debe ofuscar ningún dato.
                                  Los datos se muestran tal cual vienen del backend.
                                  Si los datos vienen ofuscados del backend, eso es un problema del backend que debe resolverse allí. */}
                              <p className="text-gray-900">{selectedSolicitud.phone_number || "No especificado"}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Información de la Solicitud */}
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="bg-gray-50 border-b border-gray-200">
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          Información de la Solicitud
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Tipo de Solicitud</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <p className="text-gray-900">{getRequestTypeLabel(selectedSolicitud.request_type)}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Estado Actual</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <Badge className={getStatusColor(selectedSolicitud.status)}>
                                {getStatusLabel(selectedSolicitud.status)}
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Fecha de Creación</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <p className="text-gray-900">
                                {new Date(selectedSolicitud.created_at).toLocaleDateString("es-ES", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                })}{" "}
                                a las{" "}
                                {new Date(selectedSolicitud.created_at).toLocaleTimeString("es-ES", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">ID de Solicitud</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                              <p className="text-gray-900">#{selectedSolicitud.id}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Detalles Específicos */}
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="bg-gray-50 border-b border-gray-200">
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          Detalles Específicos de la Solicitud
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          {selectedSolicitud.payload &&
                          typeof selectedSolicitud.payload === "object" &&
                          Object.keys(selectedSolicitud.payload).length > 0 ? (
                            (() => {
                              // Format field name: remove underscores/hyphens and capitalize each word
                              const formatFieldName = (str: string) => {
                                // Mapeo especial para nombres de campos comunes
                                const fieldNameMap: Record<string, string> = {
                                  'proceso': 'Proceso',
                                  'dondeRealizaProceso': 'Hospital / Cliente',
                                  'sedeProceso': 'Sede del Proceso',
                                  'infoCertificado': 'Información del Certificado',
                                  'dirigidoAQuien': 'Dirigido A Quien',
                                  'otrosDescripcion': 'Descripción de Otros',
                                  'fechaIngresoRetiro': 'Fecha Ingreso Retiro',
                                  'valorCompensaciones': 'Valor Compensaciones',
                                  'dirigidoAEntidad': 'Dirigido A Entidad',
                                  'paraSubsidioDesempleo': 'Para Subsidio Desempleo',
                                  'paraSubsidioVivienda': 'Para Subsidio Vivienda',
                                  'dirigidoFondoPensiones': 'Dirigido Fondo Pensiones',
                                  'adicionarActividades': 'Adicionar Actividades',
                                  'dirigidoBancolombia': 'Dirigido Bancolombia',
                                  'otros': 'Otros',
                                };
                                
                                if (fieldNameMap[str]) {
                                  return fieldNameMap[str];
                                }
                                
                                return str
                                  .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                                  .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
                                  .trim()
                                  .split(' ')
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                  .join(' ');
                              };

                              // Format value for display
                              // NOTA: En el panel admin NO se debe ofuscar ningún dato.
                              // Los datos se muestran tal cual vienen del backend sin aplicar ofuscación.
                              // Si los datos vienen ofuscados del backend, eso es un problema del backend que debe resolverse allí.
                              const formatValue = (val: any): React.ReactNode => {
                                // Handle empty strings - mostrar como "No especificado" pero permitir strings vacíos para campos de proceso
                                if (val === null || val === undefined) {
                                  return "No especificado";
                                }
                                
                                // Handle empty strings - para campos de proceso, mostrar "No especificado" si está vacío
                                if (typeof val === 'string' && val.trim() === '') {
                                  return <span className="text-gray-400 italic">No especificado</span>;
                                }
                                
                                // Handle boolean values and numeric booleans (1/0)
                                if (val === true || val === 1 || val === '1' || val === 'true') {
                                  return <span className="text-green-600 font-medium">✓ Sí</span>;
                                }
                                if (val === false || val === 0 || val === '0' || val === 'false') {
                                  return <span className="text-red-600 font-medium">✗ No</span>;
                                }
                                
                                // Handle string that might be JSON (from FormData serialization)
                                let parsedVal = val;
                                if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
                                  try {
                                    parsedVal = JSON.parse(val);
                                  } catch (e) {
                                    // Not JSON, use original value
                                  }
                                }
                                
                                // Handle arrays (like beneficiariosNuevos)
                                if (Array.isArray(parsedVal)) {
                                  if (parsedVal.length === 0) {
                                    return <span className="text-gray-500 italic">No hay elementos</span>;
                                  }
                                  
                                  // Special handling for beneficiariosNuevos array
                                  if (selectedSolicitud.request_type === 'actualizar-datos-personales' && 
                                      parsedVal.length > 0 && 
                                      parsedVal[0] && 
                                      typeof parsedVal[0] === 'object' &&
                                      ('tipo_documento' in parsedVal[0] || 'documento' in parsedVal[0])) {
                                    return (
                                      <div className="space-y-3">
                                        <p className="text-xs font-semibold text-gray-700 mb-2">
                                          Nuevos Miembros del Grupo Familiar ({parsedVal.length})
                                        </p>
                                        {parsedVal.map((beneficiario: any, idx: number) => (
                                          <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                              <div>
                                                <span className="font-medium text-gray-600">Tipo Doc:</span>{' '}
                                                <span className="text-gray-900">{beneficiario.tipo_documento || 'N/A'}</span>
                                              </div>
                                              <div>
                                                <span className="font-medium text-gray-600">Documento:</span>{' '}
                                                <span className="text-gray-900">{beneficiario.documento || 'N/A'}</span>
                                              </div>
                                              <div>
                                                <span className="font-medium text-gray-600">Nombres:</span>{' '}
                                                <span className="text-gray-900">{beneficiario.nombres || 'N/A'}</span>
                                              </div>
                                              <div>
                                                <span className="font-medium text-gray-600">Apellidos:</span>{' '}
                                                <span className="text-gray-900">{beneficiario.apellidos || 'N/A'}</span>
                                              </div>
                                              <div>
                                                <span className="font-medium text-gray-600">Fecha Nacimiento:</span>{' '}
                                                <span className="text-gray-900">
                                                  {beneficiario.fecha_nacimiento 
                                                    ? new Date(beneficiario.fecha_nacimiento).toLocaleDateString('es-CO')
                                                    : 'N/A'}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="font-medium text-gray-600">Parentesco:</span>{' '}
                                                <span className="text-gray-900">
                                                  {getParentescoLabel(beneficiario.parentesco || '') || 'N/A'}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="font-medium text-gray-600">Sexo:</span>{' '}
                                                <span className="text-gray-900">
                                                  {beneficiario.sexo === 'M' ? 'Masculino' : 
                                                   beneficiario.sexo === 'F' ? 'Femenino' : 
                                                   beneficiario.sexo || 'N/A'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  }
                                  
                                  // Generic array display
                                  return (
                                    <div className="space-y-1">
                                      {parsedVal.map((item: any, idx: number) => (
                                        <div key={idx} className="text-sm text-gray-700">
                                          {idx + 1}. {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                
                                if (typeof parsedVal === "object") {
                                  // Special handling for nested objects like infoCertificado
                                  if (typeof parsedVal === "object" && !Array.isArray(parsedVal)) {
                                    return (
                                      <div className="space-y-2">
                                        {Object.entries(parsedVal).map(([nestedKey, nestedValue]) => {
                                          // Format nested value (handle booleans and numeric booleans)
                                          let displayValue: React.ReactNode;
                                          if (nestedValue === true || nestedValue === 1 || nestedValue === '1' || nestedValue === 'true') {
                                            displayValue = <span className="text-green-600 font-medium">✓ Sí</span>;
                                          } else if (nestedValue === false || nestedValue === 0 || nestedValue === '0' || nestedValue === 'false') {
                                            displayValue = <span className="text-red-600 font-medium">✗ No</span>;
                                          } else {
                                            displayValue = String(nestedValue);
                                          }
                                          
                                          return (
                                            <div key={nestedKey} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-b-0">
                                              <span className="text-xs font-medium text-gray-600">
                                                {formatFieldName(nestedKey)}:
                                              </span>
                                              <span className="text-xs ml-2 font-medium text-gray-900">
                                                {displayValue}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  }
                                  return JSON.stringify(parsedVal, null, 2);
                                }
                                
                                return String(parsedVal);
                              };

                              // Separar campos del proceso de los datos específicos de la solicitud para TODOS los tipos
                              const procesoFields = ['proceso', 'dondeRealizaProceso', 'sedeProceso'];
                              const isActualizarDatosPersonales = selectedSolicitud.request_type === 'actualizar-datos-personales';
                              
                              const payloadEntries = Object.entries(selectedSolicitud.payload || {});
                              // Filtrar campos de proceso - mostrar incluso si están vacíos (para que se vea que existen)
                              const procesoEntries = payloadEntries.filter(([key]) => procesoFields.includes(key));
                              // Filtrar datos específicos excluyendo campos de proceso
                              const datosEspecificosEntries = payloadEntries.filter(([key]) => !procesoFields.includes(key));

                              const renderField = (key: string, value: any) => (
                                <div
                                  key={key}
                                  className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start py-2 border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="md:col-span-1">
                                    <label className="text-sm font-medium text-gray-700">
                                      {formatFieldName(key)}
                                    </label>
                                  </div>
                                  <div className="md:col-span-2">
                                    <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200 max-w-full overflow-auto">
                                      <div className="text-gray-900 text-sm break-words">
                                        {formatValue(value)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );

                              return (
                                <div className="space-y-6">
                                  {/* Información del Proceso (para todos los tipos si existe) */}
                                  {procesoEntries.length > 0 && (
                                    <div>
                                      <div className="mb-3 flex items-center gap-2">
                                        <h4 className="text-sm font-semibold text-gray-700 underline">Información del Proceso</h4>
                                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                          Informativo
                                        </Badge>
                                      </div>
                                      <div className="space-y-4">
                                        {procesoEntries.map(([key, value]) => renderField(key, value))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Datos Específicos de la Solicitud */}
                                  {datosEspecificosEntries.length > 0 && (
                                    <div>
                                      <div className="mb-3">
                                        <h4 className="text-sm font-semibold text-gray-700 underline">
                                          {isActualizarDatosPersonales ? 'Datos a Actualizar' : 'Detalles de la Solicitud'}
                                        </h4>
                                      </div>
                                      <div className="space-y-4">
                                        {datosEspecificosEntries.map(([key, value]) => renderField(key, value))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-gray-500 text-sm text-center py-8">
                              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                              <p>No hay detalles adicionales disponibles</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Archivos Adjuntos */}
                    {selectedSolicitud.files && Object.keys(selectedSolicitud.files).length > 0 && (
                      <RequestFilesSection
                        requestId={selectedSolicitud.id}
                        files={selectedSolicitud.files}
                        filesCount={selectedSolicitud.files_count}
                      />
                    )}

                    {/* Historial de Respuestas */}
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="bg-gray-50 border-b border-gray-200">
                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                          <span>Historial de Respuestas</span>
                          {selectedSolicitud.responses_count !== undefined && selectedSolicitud.responses_count > 0 && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {selectedSolicitud.responses_count} {selectedSolicitud.responses_count === 1 ? 'respuesta' : 'respuestas'}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        {selectedSolicitud.responses && selectedSolicitud.responses.length > 0 ? (
                          <div className="space-y-4">
                            {selectedSolicitud.responses.map((response, index) => {
                              const subjectKey = `response-${response.id}-subject`;
                              const bodyKey = `response-${response.id}-body`;
                              const isSubjectExpanded = expandedFields[subjectKey] || false;
                              const isBodyExpanded = expandedFields[bodyKey] || false;
                              
                              const MAX_SUBJECT_LENGTH = 80;
                              const MAX_BODY_LENGTH = 300;
                              
                              const shouldTruncateSubject = response.email_subject.length > MAX_SUBJECT_LENGTH;
                              const shouldTruncateBody = response.email_body.length > MAX_BODY_LENGTH;
                              
                              const truncatedSubject = shouldTruncateSubject && !isSubjectExpanded
                                ? response.email_subject.substring(0, MAX_SUBJECT_LENGTH) + '...'
                                : response.email_subject;
                              
                              const truncatedBody = shouldTruncateBody && !isBodyExpanded
                                ? response.email_body.substring(0, MAX_BODY_LENGTH) + '...'
                                : response.email_body;
                              
                              // Format date
                              const formattedDate = new Date(response.created_at).toLocaleString("es-ES", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                              
                              return (
                                <div
                                  key={response.id}
                                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <Badge className={getStatusColor(response.status)}>
                                        {getStatusLabel(response.status)}
                                      </Badge>
                                      <span className="text-xs text-gray-500">
                                        #{response.id} • {formattedDate}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Email Subject */}
                                  <div className="mb-3">
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                      Asunto del Correo
                                    </label>
                                    <div className="bg-white p-3 rounded-md border border-gray-200">
                                      <p className="text-gray-900 text-sm whitespace-pre-wrap break-words">
                                        {truncatedSubject}
                                      </p>
                                      {shouldTruncateSubject && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setExpandedFields(prev => ({
                                              ...prev,
                                              [subjectKey]: !isSubjectExpanded,
                                            }));
                                          }}
                                          className="text-primary-prosalud hover:text-primary-prosalud-dark text-xs font-medium mt-2"
                                        >
                                          {isSubjectExpanded ? 'Ver menos' : 'Ver más'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Email Body */}
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                      Cuerpo del Correo
                                    </label>
                                    <div className="bg-white p-3 rounded-md border border-gray-200">
                                      <p className="text-gray-900 text-sm whitespace-pre-wrap break-words">
                                        {truncatedBody.split('\n').map((line, i) => (
                                          <React.Fragment key={i}>
                                            {line}
                                            {i < truncatedBody.split('\n').length - 1 && <br />}
                                          </React.Fragment>
                                        ))}
                                      </p>
                                      {shouldTruncateBody && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setExpandedFields(prev => ({
                                              ...prev,
                                              [bodyKey]: !isBodyExpanded,
                                            }));
                                          }}
                                          className="text-primary-prosalud hover:text-primary-prosalud-dark text-xs font-medium mt-2"
                                        >
                                          {isBodyExpanded ? 'Ver menos' : 'Ver más'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Send className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">No hay respuestas registradas para esta solicitud</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Acciones */}
                    {can('requests.respond') && selectedSolicitud.status !== "resolved" && selectedSolicitud.status !== "rejected" && (
                      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        {requiresManualCompensaciones(selectedSolicitud) ? (
                          <div className="flex flex-col items-end gap-2">
                            <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle className="text-sm font-semibold">Requiere Compensaciones Manuales</AlertTitle>
                              <AlertDescription className="text-xs">
                                Esta solicitud requiere ingresar valores de compensaciones manualmente.
                              </AlertDescription>
                            </Alert>
                            <Button
                              onClick={() => handleOpenResponseDialog(selectedSolicitud)}
                              className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Responder con Compensaciones
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleOpenResponseDialog(selectedSolicitud)}
                            className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Dar Respuesta
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Response Dialog */}
          <Dialog 
            open={responseDialogOpen} 
            onOpenChange={(open) => {
              if (!open && !isSubmittingResponse) {
                handleCloseResponseDialog();
              }
            }}
          >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  {useCompensacionesForm 
                    ? `Responder con Compensaciones Manuales - Solicitud #${solicitudToRespond?.id}`
                    : `Dar Respuesta a Solicitud #${solicitudToRespond?.id}`
                  }
                </DialogTitle>
                <DialogDescription>
                  {useCompensacionesForm 
                    ? "Complete el formulario con los valores de compensaciones. El certificado se generará automáticamente y se enviará por correo al afiliado."
                    : "Complete el formulario para responder a la solicitud. El correo se enviará automáticamente al afiliado."
                  }
                </DialogDescription>
              </DialogHeader>

              {/* Alerta de actualización pendiente */}
              {solicitudToRespond && 
               hasPendingUpdate(solicitudToRespond.id_number) &&
               solicitudToRespond.status !== 'resolved' &&
               solicitudToRespond.status !== 'rejected' &&
               solicitudToRespond.request_type !== 'actualizar-datos-personales' && (
                <PendingDataUpdateAlert
                  pendingUpdate={getPendingUpdate(solicitudToRespond.id_number)!}
                  documentNumber={solicitudToRespond.id_number}
                  onViewUpdate={() => {
                    const pendingUpdate = getPendingUpdate(solicitudToRespond.id_number);
                    if (pendingUpdate) {
                      const convertedRequest = convertApiRequestToRequest(pendingUpdate);
                      handleCloseResponseDialog();
                      handleViewDetails(convertedRequest);
                    }
                  }}
                  variant="warning"
                />
              )}

              {useCompensacionesForm ? (
                <Form {...responseWithCompensacionesForm}>
                  <form onSubmit={responseWithCompensacionesForm.handleSubmit(handleSubmitResponseWithCompensaciones)} className="space-y-6">
                    {/* Información de la solicitud */}
                    {solicitudToRespond && (
                      <Card className="border border-gray-200 bg-gray-50">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600 font-medium">Solicitante:</p>
                              <p className="text-gray-900">
                                {solicitudToRespond.name} {solicitudToRespond.last_name}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium">Correo:</p>
                              <p className="text-gray-900">{solicitudToRespond.email}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium">Tipo de Solicitud:</p>
                              <p className="text-gray-900">{getRequestTypeLabel(solicitudToRespond.request_type)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium">Estado Actual:</p>
                              <Badge className={getStatusColor(solicitudToRespond.status)}>
                                {getStatusLabel(solicitudToRespond.status)}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Campos de compensaciones */}
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Valores de Compensaciones</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Total Basicos */}
                        <FormField
                          control={responseWithCompensacionesForm.control}
                          name="t_basicos"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Basicos *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Ingrese el valor"
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? undefined : (e.target.value === '-' ? undefined : parseInt(e.target.value, 10));
                                    field.onChange(value === undefined || isNaN(value) ? undefined : value);
                                  }}
                                  value={field.value === undefined || field.value === null ? '' : field.value}
                                  min={0}
                                  step={1}
                                />
                              </FormControl>
                              <FormDescription>
                                Valor de compensación básica (número entero).
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Total Auxilios */}
                        <FormField
                          control={responseWithCompensacionesForm.control}
                          name="t_auxilios"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Auxilios *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Ingrese el valor"
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? undefined : (e.target.value === '-' ? undefined : parseInt(e.target.value, 10));
                                    field.onChange(value === undefined || isNaN(value) ? undefined : value);
                                  }}
                                  value={field.value === undefined || field.value === null ? '' : field.value}
                                  min={0}
                                  step={1}
                                />
                              </FormControl>
                              <FormDescription>
                                Valor de auxilios (número entero).
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Mostrar Total Ingresos calculado */}
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Total Ingresos (calculado automáticamente):</span>
                          <span className="text-lg font-bold text-primary-prosalud">
                            ${((responseWithCompensacionesForm.watch('t_basicos') ?? 0) + (responseWithCompensacionesForm.watch('t_auxilios') ?? 0)).toLocaleString('es-CO')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Total Ingresos = Total Basicos + Total Auxilios
                        </p>
                      </div>
                    </div>

                    {/* Nuevo Estado */}
                    <FormField
                      control={responseWithCompensacionesForm.control}
                    name="newStatus"
                    render={({ field }) => {
                      const isCertificadoConvenio = solicitudToRespond?.request_type === 'certificado-convenio';
                      
                      return (
                        <FormItem>
                          <FormLabel>Nuevo Estado *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                {field.value ? (
                                  <div className="flex items-center gap-2">
                                    <div className={`h-3 w-3 rounded-full ${
                                      field.value === "in_progress" ? "bg-blue-500" :
                                      field.value === "resolved" ? "bg-green-500" :
                                      "bg-red-500"
                                    }`}></div>
                                    <span>{
                                      field.value === "in_progress" ? "En Revisión" :
                                      field.value === "resolved" ? "Completado" :
                                      "Rechazado"
                                    }</span>
                                  </div>
                                ) : (
                                  <SelectValue placeholder="Seleccione el nuevo estado" />
                                )}
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {!isCertificadoConvenio && (
                                <SelectItem value="in_progress">
                                  <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                                    <span>En Revisión</span>
                                  </div>
                                </SelectItem>
                              )}
                              <SelectItem value="resolved">
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                  <span>Completado</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="rejected">
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                  <span>Rechazado</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Seleccione el estado que tendrá la solicitud después de enviar la respuesta.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                    {/* Asunto del correo */}
                    <FormField
                      control={responseWithCompensacionesForm.control}
                    name="emailSubject"
                    render={({ field }) => {
                      const currentLength = field.value?.length || 0;
                      const maxLength = 100;
                      const isNearLimit = currentLength > maxLength * 0.8;
                      const isOverLimit = currentLength > maxLength;
                      
                      return (
                        <FormItem>
                          <FormLabel>Asunto del Correo *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={useCompensacionesForm ? "Ej: Certificado de Convenio - Consecutivo 202412150001" : "Ej: Respuesta a su solicitud #123"} 
                              {...field}
                              maxLength={maxLength}
                            />
                          </FormControl>
                          <div className="flex items-center justify-between">
                            <FormDescription>
                              El asunto del correo que se enviará al afiliado.
                            </FormDescription>
                            <span className={`text-xs ${isOverLimit ? 'text-red-600 font-semibold' : isNearLimit ? 'text-orange-600' : 'text-gray-500'}`}>
                              {currentLength}/{maxLength}
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                    {/* Cuerpo del correo */}
                    <FormField
                      control={responseWithCompensacionesForm.control}
                    name="emailBody"
                    render={({ field }) => {
                      const currentLength = field.value?.length || 0;
                      const maxLength = 1500;
                      const isNearLimit = currentLength > maxLength * 0.8;
                      const isOverLimit = currentLength > maxLength;
                      
                      return (
                        <FormItem>
                          <FormLabel>Cuerpo del Correo *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={useCompensacionesForm ? "Ej: Adjunto encontrará su certificado de convenio con los valores de compensación solicitados..." : "Escriba aquí el contenido de la respuesta al afiliado..."}
                              className="min-h-[200px]"
                              {...field}
                              maxLength={maxLength}
                            />
                          </FormControl>
                          <div className="flex items-center justify-between">
                            <FormDescription>
                              El contenido del correo que se enviará al afiliado.
                            </FormDescription>
                            <span className={`text-xs ${isOverLimit ? 'text-red-600 font-semibold' : isNearLimit ? 'text-orange-600' : 'text-gray-500'}`}>
                              {currentLength}/{maxLength}
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                    {/* Adjuntar archivos */}
                    <FormField
                      control={responseWithCompensacionesForm.control}
                    name="attachments"
                    render={({ field }) => {
                      const files = field.value ? Array.from(field.value as FileList) : [];
                      const hasFiles = files.length > 0;
                      
                      const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
                        if (!e.target.files || e.target.files.length === 0) {
                          e.target.value = ''; // Limpiar el input
                          return;
                        }

                        const selectedFiles = Array.from(e.target.files);
                        const currentFiles = files; // Archivos ya existentes
                        const totalFilesCount = currentFiles.length + selectedFiles.length;
                        
                        // Validar que no exceda el máximo total de archivos
                        if (totalFilesCount > MAX_FILES) {
                          const availableSlots = MAX_FILES - currentFiles.length;
                          toast.error("Error al seleccionar archivos", {
                            description: `Solo puede adjuntar ${availableSlots} archivo(s) más. Máximo ${MAX_FILES} archivos permitidos.`,
                            duration: 4000,
                          });
                          e.target.value = '';
                          return;
                        }

                        // Validar tamaño de cada archivo nuevo (antes de optimizar)
                        const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
                        if (oversizedFiles.length > 0) {
                          toast.error("Error al seleccionar archivos", {
                            description: `Los siguientes archivos exceden el tamaño máximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB: ${oversizedFiles.map(f => f.name).join(', ')}`,
                            duration: 5000,
                          });
                          e.target.value = '';
                          return;
                        }

                        // Verificar si hay imágenes para optimizar
                        const hasImages = selectedFiles.some(file => isImageFile(file));

                        if (hasImages) {
                          setIsOptimizing(true);
                          try {
                            // Optimizar solo las imágenes de los archivos seleccionados
                            const optimizedFiles = await optimizeFileList(e.target.files);

                            // Combinar archivos existentes con los nuevos (optimizados)
                            const dataTransfer = new DataTransfer();
                            
                            // Agregar primero los archivos existentes
                            currentFiles.forEach(file => dataTransfer.items.add(file));
                            
                            // Agregar luego los archivos nuevos (optimizados)
                            optimizedFiles.forEach(file => dataTransfer.items.add(file));

                            field.onChange(dataTransfer.files);

                            // Notificar optimización
                            const imageCount = selectedFiles.filter(f => isImageFile(f)).length;
                            if (imageCount > 0) {
                              toast.success("Imágenes optimizadas", {
                                description: `${imageCount} imagen(es) optimizada(s) y agregada(s) exitosamente.`,
                                duration: 2000,
                              });
                            }
                          } catch (error) {
                            console.error("Error al optimizar imágenes:", error);
                            toast.error("Error al optimizar imágenes", {
                              description: "Se subirán las imágenes sin optimizar.",
                              duration: 3000,
                            });
                            // Si falla la optimización, combinar archivos originales con existentes
                            const dataTransfer = new DataTransfer();
                            currentFiles.forEach(file => dataTransfer.items.add(file));
                            selectedFiles.forEach(file => dataTransfer.items.add(file));
                            field.onChange(dataTransfer.files);
                          } finally {
                            setIsOptimizing(false);
                          }
                        } else {
                          // Si no hay imágenes, combinar archivos existentes con los nuevos
                          const dataTransfer = new DataTransfer();
                          currentFiles.forEach(file => dataTransfer.items.add(file));
                          selectedFiles.forEach(file => dataTransfer.items.add(file));
                          field.onChange(dataTransfer.files);
                        }

                        // Limpiar el input para permitir seleccionar el mismo archivo nuevamente si es necesario
                        e.target.value = '';
                      };

                      return (
                        <FormItem>
                          <FormLabel>
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4" />
                              Adjuntar Archivos (Opcional)
                            </div>
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <div className="relative">
                                {isOptimizing && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-md z-10">
                                    <div className="flex items-center gap-2 text-sm text-primary-prosalud">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span>Optimizando imágenes...</span>
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    disabled={isOptimizing || files.length >= MAX_FILES}
                                    className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-prosalud file:text-white hover:file:bg-primary-prosalud-dark disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                  {hasFiles && (
                                    <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
                                      {files.length} archivo{files.length !== 1 ? 's' : ''} seleccionado{files.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Puede adjuntar máximo {MAX_FILES} archivos {files.length > 0 && `(${files.length}/${MAX_FILES} adjuntados)`}. Cada archivo no debe exceder {MAX_FILE_SIZE / (1024 * 1024)}MB.
                            Tipos permitidos: PDF, Word, Excel, imágenes (JPG, PNG).
                            {files.length >= MAX_FILES && (
                              <span className="block mt-1 text-amber-600 font-medium">
                                Límite alcanzado. Elimine archivos para agregar más.
                              </span>
                            )}
                          </FormDescription>
                          {hasFiles && (
                            <div className="mt-2 space-y-2">
                              {files.map((file, index) => {
                                const fileSizeMB = file.size / (1024 * 1024);
                                const isOversized = file.size > MAX_FILE_SIZE;
                                
                                return (
                                  <div
                                    key={index}
                                    className={`p-2 border rounded-md flex items-center justify-between text-sm ${
                                      isOversized ? 'bg-red-50 border-red-200' : 'bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <FileText className={`h-4 w-4 shrink-0 ${isOversized ? 'text-red-600' : 'text-gray-600'}`} />
                                      <span className={`truncate ${isOversized ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
                                        {file.name}
                                      </span>
                                      <span className={`text-xs shrink-0 ${isOversized ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                        ({fileSizeMB.toFixed(2)} MB)
                                        {isOversized && ' - EXCEDE LÍMITE'}
                                      </span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                                      onClick={() => {
                                        const dataTransfer = new DataTransfer();
                                        files.forEach((f, i) => {
                                          if (i !== index) {
                                            dataTransfer.items.add(f);
                                          }
                                        });
                                        field.onChange(dataTransfer.files.length > 0 ? dataTransfer.files : undefined);
                                        if (dataTransfer.files.length === 0) {
                                          const input = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
                                          if (input) input.value = '';
                                        }
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                );
                              })}
                              {files.length >= MAX_FILES && (
                                <p className="text-xs text-orange-600 font-medium">
                                  Ha alcanzado el límite de {MAX_FILES} archivos.
                                </p>
                              )}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                    {/* Botones de acción */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseResponseDialog}
                        disabled={isSubmittingResponse}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmittingResponse}
                        className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                      >
                        {isSubmittingResponse ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generando certificado...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Generar Certificado y Enviar
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <Form {...responseForm}>
                  <form onSubmit={responseForm.handleSubmit(handleSubmitResponse)} className="space-y-6">
                    {/* Información de la solicitud */}
                    {solicitudToRespond && (
                      <Card className="border border-gray-200 bg-gray-50">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 font-medium">Solicitante:</p>
                            <p className="text-gray-900">
                              {solicitudToRespond.name} {solicitudToRespond.last_name}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium">Correo:</p>
                            <p className="text-gray-900">{solicitudToRespond.email}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium">Tipo de Solicitud:</p>
                            <p className="text-gray-900">{getRequestTypeLabel(solicitudToRespond.request_type)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium">Estado Actual:</p>
                            <Badge className={getStatusColor(solicitudToRespond.status)}>
                              {getStatusLabel(solicitudToRespond.status)}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                    {/* Nuevo Estado */}
                    <FormField
                      control={responseForm.control}
                    name="newStatus"
                    render={({ field }) => {
                      const isCertificadoConvenio = solicitudToRespond?.request_type === 'certificado-convenio';
                      
                      return (
                      <FormItem>
                        <FormLabel>Nuevo Estado *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              {field.value ? (
                                <div className="flex items-center gap-2">
                                  <div className={`h-3 w-3 rounded-full ${
                                    field.value === "in_progress" ? "bg-blue-500" :
                                    field.value === "resolved" ? "bg-green-500" :
                                    "bg-red-500"
                                  }`}></div>
                                  <span>{
                                    field.value === "in_progress" ? "En Revisión" :
                                    field.value === "resolved" ? "Completado" :
                                    "Rechazado"
                                  }</span>
                                </div>
                              ) : (
                                <SelectValue placeholder="Seleccione el nuevo estado" />
                              )}
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {!isCertificadoConvenio && (
                              <SelectItem value="in_progress">
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                                  <span>En Revisión</span>
                                </div>
                              </SelectItem>
                            )}
                            <SelectItem value="resolved">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                <span>Completado</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="rejected">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                <span>Rechazado</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Seleccione el estado que tendrá la solicitud después de enviar la respuesta.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                      );
                    }}
                  />

                    {/* Asunto del correo */}
                    <FormField
                      control={responseForm.control}
                      name="emailSubject"
                    render={({ field }) => {
                      const currentLength = field.value?.length || 0;
                      const maxLength = 100;
                      const isNearLimit = currentLength > maxLength * 0.8;
                      const isOverLimit = currentLength > maxLength;
                      
                      return (
                        <FormItem>
                          <FormLabel>Asunto del Correo *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ej: Respuesta a su solicitud #123" 
                              {...field}
                              maxLength={maxLength}
                            />
                          </FormControl>
                          <div className="flex items-center justify-between">
                            <FormDescription>
                              El asunto del correo que se enviará al afiliado.
                            </FormDescription>
                            <span className={`text-xs ${isOverLimit ? 'text-red-600 font-semibold' : isNearLimit ? 'text-orange-600' : 'text-gray-500'}`}>
                              {currentLength}/{maxLength}
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                    {/* Cuerpo del correo */}
                    <FormField
                      control={responseForm.control}
                      name="emailBody"
                    render={({ field }) => {
                      const currentLength = field.value?.length || 0;
                      const maxLength = 1500;
                      const isNearLimit = currentLength > maxLength * 0.8;
                      const isOverLimit = currentLength > maxLength;
                      
                      return (
                        <FormItem>
                          <FormLabel>Cuerpo del Correo *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Escriba aquí el contenido de la respuesta al afiliado..."
                              className="min-h-[200px]"
                              {...field}
                              maxLength={maxLength}
                            />
                          </FormControl>
                          <div className="flex items-center justify-between">
                            <FormDescription>
                              El contenido del correo que se enviará al afiliado.
                            </FormDescription>
                            <span className={`text-xs ${isOverLimit ? 'text-red-600 font-semibold' : isNearLimit ? 'text-orange-600' : 'text-gray-500'}`}>
                              {currentLength}/{maxLength}
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                    {requiresFondoPensionesAnnex && (
                      <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="text-sm font-semibold">Anexo requerido</AlertTitle>
                        <AlertDescription className="text-xs">
                          Es requerido adjuntar las planillas de pagos de seguridad social para certificados dirigidos a fondo de pensiones.
                        </AlertDescription>
                      </Alert>
                    )}

                    {requiresFondoPensionesAnnex && (
                      <FormField
                        control={responseForm.control}
                        name="afp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              AFP {requiresFondoPensionesAnnex ? '(requerido si no está en el sistema)' : '(opcional)'}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ej: Porvenir, Colfondos, Protección..."
                                {...field}
                                className={responseForm.formState.errors.afp ? 'border-red-500' : ''}
                              />
                            </FormControl>
                            <FormDescription>
                              {requiresFondoPensionesAnnex 
                                ? 'El campo AFP es requerido. No se encontró en el Excel del afiliado y debe ser proporcionado en la solicitud.'
                                : 'Indique el fondo de pensiones si aplica o es NINGUNO en ProSanet'
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {requiresActividadesForm && (
                      <FormField
                        control={responseForm.control}
                        name="actividades"
                        render={({ field }) => {
                          const actividades = field.value || [];
                          
                          const agregarActividad = () => {
                            field.onChange([...actividades, ""]);
                          };
                          
                          const eliminarActividad = (index: number) => {
                            const nuevasActividades = actividades.filter((_: string, i: number) => i !== index);
                            field.onChange(nuevasActividades);
                          };
                          
                          const actualizarActividad = (index: number, valor: string) => {
                            const nuevasActividades = [...actividades];
                            nuevasActividades[index] = valor;
                            field.onChange(nuevasActividades);
                          };
                          
                          const moverArriba = (index: number) => {
                            if (index === 0) return;
                            const nuevasActividades = [...actividades];
                            [nuevasActividades[index - 1], nuevasActividades[index]] = [nuevasActividades[index], nuevasActividades[index - 1]];
                            field.onChange(nuevasActividades);
                          };
                          
                          const moverAbajo = (index: number) => {
                            if (index === actividades.length - 1) return;
                            const nuevasActividades = [...actividades];
                            [nuevasActividades[index], nuevasActividades[index + 1]] = [nuevasActividades[index + 1], nuevasActividades[index]];
                            field.onChange(nuevasActividades);
                          };
                          
                          return (
                            <FormItem>
                              <FormLabel>Actividades a incluir en el certificado *</FormLabel>
                              <FormDescription className="mb-3">
                                Agregue las actividades realizadas que se incluirán en el certificado. Puede agregar tantas actividades como necesite y reordenarlas según sea necesario.
                              </FormDescription>
                              <div className="space-y-2 max-h-[400px] overflow-y-auto border border-gray-200 rounded-md p-4 bg-gray-50">
                                {actividades.length === 0 ? (
                                  <p className="text-sm text-gray-500 text-center py-4">
                                    No hay actividades agregadas. Haga clic en "Agregar Actividad" para comenzar.
                                  </p>
                                ) : (
                                  actividades.map((actividad: string, index: number) => (
                                    <div key={index} className="flex items-start gap-2 bg-white p-3 rounded-md border border-gray-200">
                                      <div className="flex-shrink-0 pt-2">
                                        <span className="text-sm font-medium text-gray-600">{index + 1}.</span>
                                      </div>
                                      <div className="flex-1">
                                        <Textarea
                                          value={actividad}
                                          onChange={(e) => actualizarActividad(index, e.target.value)}
                                          placeholder={`Actividad ${index + 1}`}
                                          maxLength={500}
                                          className="w-full min-h-[60px] resize-y"
                                          rows={2}
                                        />
                                      </div>
                                      <div className="flex-shrink-0 flex items-center gap-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => moverArriba(index)}
                                          disabled={index === 0}
                                          className="h-8 w-8"
                                          title="Mover arriba"
                                        >
                                          <ArrowUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => moverAbajo(index)}
                                          disabled={index === actividades.length - 1}
                                          className="h-8 w-8"
                                          title="Mover abajo"
                                        >
                                          <ArrowDown className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => eliminarActividad(index)}
                                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          title="Eliminar actividad"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={agregarActividad}
                                  className="w-full mt-2"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Agregar Actividad {actividades.length > 0 && `(${actividades.length})`}
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    )}

                    {/* Adjuntar archivos */}
                    <FormField
                      control={responseForm.control}
                      name="attachments"
                      render={({ field }) => {
                      const files = field.value ? Array.from(field.value as FileList) : [];
                      const hasFiles = files.length > 0;
                      
                      const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
                        if (!e.target.files || e.target.files.length === 0) {
                          e.target.value = '';
                          return;
                        }

                        const selectedFiles = Array.from(e.target.files);
                        const currentFiles = files;
                        const totalFilesCount = currentFiles.length + selectedFiles.length;
                        
                        if (totalFilesCount > MAX_FILES) {
                          const availableSlots = MAX_FILES - currentFiles.length;
                          toast.error("Error al seleccionar archivos", {
                            description: `Solo puede adjuntar ${availableSlots} archivo(s) más. Máximo ${MAX_FILES} archivos permitidos.`,
                            duration: 4000,
                          });
                          e.target.value = '';
                          return;
                        }

                        const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
                        if (oversizedFiles.length > 0) {
                          toast.error("Error al seleccionar archivos", {
                            description: `Los siguientes archivos exceden el tamaño máximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB: ${oversizedFiles.map(f => f.name).join(', ')}`,
                            duration: 5000,
                          });
                          e.target.value = '';
                          return;
                        }

                        const hasImages = selectedFiles.some(file => isImageFile(file));

                        if (hasImages) {
                          setIsOptimizing(true);
                          try {
                            const optimizedFiles = await optimizeFileList(e.target.files);
                            const dataTransfer = new DataTransfer();
                            currentFiles.forEach(file => dataTransfer.items.add(file));
                            optimizedFiles.forEach(file => dataTransfer.items.add(file));
                            field.onChange(dataTransfer.files);
                            const imageCount = selectedFiles.filter(f => isImageFile(f)).length;
                            if (imageCount > 0) {
                              toast.success("Imágenes optimizadas", {
                                description: `${imageCount} imagen(es) optimizada(s) y agregada(s) exitosamente.`,
                                duration: 2000,
                              });
                            }
                          } catch (error) {
                            console.error("Error al optimizar imágenes:", error);
                            toast.error("Error al optimizar imágenes", {
                              description: "Se subirán las imágenes sin optimizar.",
                              duration: 3000,
                            });
                            const dataTransfer = new DataTransfer();
                            currentFiles.forEach(file => dataTransfer.items.add(file));
                            selectedFiles.forEach(file => dataTransfer.items.add(file));
                            field.onChange(dataTransfer.files);
                          } finally {
                            setIsOptimizing(false);
                          }
                        } else {
                          const dataTransfer = new DataTransfer();
                          currentFiles.forEach(file => dataTransfer.items.add(file));
                          selectedFiles.forEach(file => dataTransfer.items.add(file));
                          field.onChange(dataTransfer.files);
                        }

                        e.target.value = '';
                      };

                      return (
                        <FormItem>
                          <FormLabel>
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4" />
                              {requiresFondoPensionesAnnex ? 'Adjuntar Archivos *' : 'Adjuntar Archivos (Opcional)'}
                            </div>
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <div className="relative">
                                {isOptimizing && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-md z-10">
                                    <div className="flex items-center gap-2 text-sm text-primary-prosalud">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span>Optimizando imágenes...</span>
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    disabled={isOptimizing || files.length >= MAX_FILES}
                                    className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-prosalud file:text-white hover:file:bg-primary-prosalud-dark disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                  {hasFiles && (
                                    <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
                                      {files.length} archivo{files.length !== 1 ? 's' : ''} seleccionado{files.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Puede adjuntar máximo {MAX_FILES} archivos {files.length > 0 && `(${files.length}/${MAX_FILES} adjuntados)`}. Cada archivo no debe exceder {MAX_FILE_SIZE / (1024 * 1024)}MB.
                            Tipos permitidos: PDF, Word, Excel, imágenes (JPG, PNG).
                            {files.length >= MAX_FILES && (
                              <span className="block mt-1 text-amber-600 font-medium">
                                Límite alcanzado. Elimine archivos para agregar más.
                              </span>
                            )}
                          </FormDescription>
                          {hasFiles && (
                            <div className="mt-2 space-y-2">
                              {files.map((file, index) => {
                                const fileSizeMB = file.size / (1024 * 1024);
                                const isOversized = file.size > MAX_FILE_SIZE;
                                
                                return (
                                  <div
                                    key={index}
                                    className={`p-2 border rounded-md flex items-center justify-between text-sm ${
                                      isOversized ? 'bg-red-50 border-red-200' : 'bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <FileText className={`h-4 w-4 shrink-0 ${isOversized ? 'text-red-600' : 'text-gray-600'}`} />
                                      <span className={`truncate ${isOversized ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
                                        {file.name}
                                      </span>
                                      <span className={`text-xs shrink-0 ${isOversized ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                        ({fileSizeMB.toFixed(2)} MB)
                                        {isOversized && ' - EXCEDE LÍMITE'}
                                      </span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                                      onClick={() => {
                                        const dataTransfer = new DataTransfer();
                                        files.forEach((f, i) => {
                                          if (i !== index) {
                                            dataTransfer.items.add(f);
                                          }
                                        });
                                        field.onChange(dataTransfer.files.length > 0 ? dataTransfer.files : undefined);
                                        if (dataTransfer.files.length === 0) {
                                          const input = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
                                          if (input) input.value = '';
                                        }
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                );
                              })}
                              {files.length >= MAX_FILES && (
                                <p className="text-xs text-orange-600 font-medium">
                                  Ha alcanzado el límite de {MAX_FILES} archivos.
                                </p>
                              )}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                    {/* Botones de acción */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseResponseDialog}
                        disabled={isSubmittingResponse}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmittingResponse}
                        className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                      >
                        {isSubmittingResponse ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar Respuesta
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>

          {/* Modal de Verificación de Certificado */}
          {can('requests.view') && (
            <VerificarCertificadoModal
              open={verificarCertificadoOpen}
              onOpenChange={setVerificarCertificadoOpen}
            />
          )}

          {/* Diálogo de recordatorio para actualizar afiliados */}
          <UpdateAfiliadosReminderDialog
            open={showUpdateAfiliadosReminder}
            onOpenChange={setShowUpdateAfiliadosReminder}
            onUploadClick={() => {
              // Navegar al dashboard con parámetro para abrir el diálogo de carga automáticamente
              navigate('/admin?upload=afiliados');
            }}
          />
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminSolicitudesPage;
