import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
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
import BulkResponseTemplateDialog from "@/components/admin/solicitudes/BulkResponseTemplateDialog";
import BulkResponseProcessDialog from "@/components/admin/solicitudes/BulkResponseProcessDialog";
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
  Info,
  Upload,
  FileSpreadsheet,
  Clipboard,
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
import { ApiRequest, requestsApiService } from "@/services/requestsApi";
import { TableLoadingSkeleton } from "@/components/ui/loading-skeleton";
import RequestFilesSection from "@/components/admin/solicitudes/RequestFilesSection";
import ResponseAttachmentsSection from "@/components/admin/solicitudes/ResponseAttachmentsSection";
import { parentescos, estadosCiviles, relacionesContactoEmergencia } from '@/components/actualizar-datos-personales/formOptions';
import { optimizeFileList, isImageFile } from "@/utils/imageOptimizer";
import { usePendingPersonalDataUpdates } from "@/hooks/usePendingPersonalDataUpdates";
import { PendingDataUpdateAlert, PendingDataUpdateBadge } from "@/components/admin/solicitudes/PendingDataUpdateAlert";
import { UpdateAfiliadosReminderDialog } from "@/components/admin/solicitudes/UpdateAfiliadosReminderDialog";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, ClipboardPaste } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Subtipos válidos para verificación de pagos
// Estos valores deben coincidir exactamente con los valores del backend (case-sensitive)
const VERIFICACION_PAGOS_SUBTIPOS = [
  { value: 'COMPENSACIÓN. FINAL (LIQUIDACIÓN)', label: 'Compensación Final' },
  { value: 'COMPENSACIÓN ANUAL DIFERIDA Y/O DESCANSO', label: 'Compensación Anual Diferida' },
  { value: 'COMPENSACIÓN POR DESCANSO', label: 'Compensación por Descanso' },
  { value: 'DESCUENTOS SEGURIDAD SOCIAL', label: 'Descuentos Seguridad Social' },
  { value: 'DUPLICADO COLILLAS', label: 'Duplicado Colillas' },
  { value: 'DUPLICADO DE COLILLAS', label: 'Duplicado Colillas' }, // Variante que se agrupa con DUPLICADO COLILLAS
  { value: 'VIATICOS', label: 'Viáticos' },
  { value: 'Ceiisas', label: 'Ceiisas' },
  { value: 'COMPENSACIÓN. MENSUAL', label: 'Compensación Mensual' },
  { value: 'COMPENSACIÓN SEMESTRAL', label: 'Compensación Semestral' },
  { value: 'INCAPACIDADES', label: 'Incapacidades' },
  { value: 'SUBSIDIOS', label: 'Subsidios' },
];

// Helper para normalizar/parsear el subtipo de verificación de pagos
const getVerificacionPagosSubtypeLabel = (subtype?: string | null): string => {
  if (!subtype) return '';

  // Normalizar el subtipo para comparación (remover espacios extra, normalizar "de")
  const normalizedSubtype = subtype.trim().toLowerCase();
  
  // Buscar coincidencia exacta primero
  let found = VERIFICACION_PAGOS_SUBTIPOS.find(
    (item) => item.value.toLowerCase() === normalizedSubtype
  );

  // Si no se encuentra, intentar normalizar variaciones comunes
  if (!found) {
    // Normalizar variaciones de "Duplicado Colillas" / "Duplicado de Colillas"
    const normalizedForMatching = normalizedSubtype
      .replace(/\s+/g, ' ') // Normalizar espacios múltiples
      .replace(/\bde\b/g, '') // Remover "de" para comparación
      .trim();
    
    // Buscar por normalización flexible para casos como "duplicado colillas" vs "duplicado de colillas"
    found = VERIFICACION_PAGOS_SUBTIPOS.find((item) => {
      const itemNormalized = item.value.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\bde\b/g, '')
        .trim();
      return itemNormalized === normalizedForMatching;
    });
  }

  // Si lo encontramos en el catálogo, usamos el label "bonito"; si no, devolvemos el texto original
  return found?.label || subtype;
};

// Opciones predefinidas para razones de rechazo (ordenadas alfabéticamente)
const REJECTION_REASON_OPTIONS = [
  { value: 'compensacion_pignorada_libranza', label: 'Compensación pignorada por libranza' },
  { value: 'anexos_no_validos', label: 'Los anexos adjuntos no son válidos para la solicitud' },
  { value: 'formato_archivos', label: 'Los archivos adjuntos no cumplen con el formato de ProSalud' },
  { value: 'no_aplica_otros_certificado', label: 'No aplica la opción de "Otros" para el certificado de convenio' },
  { value: 'no_cumple_causales_retiro', label: 'No cumple con las causales para el retiro (Vivienda / Educación)' },
  { value: 'no_vb_coordinadora', label: 'No cuenta con el V°B de la coordinadora' },
  { value: 'sin_capacidad_endeudamiento', label: 'No tiene capacidad de endeudamiento' },
  { value: 'sin_evidencias', label: 'No anexa evidencias de la solicitud' },
  { value: 'sin_tiempo_provisionado', label: 'No cuenta con el tiempo provisionado' },
  { value: 'solicitud_repetida', label: 'Solicitud repetida' },
  { value: 'otros', label: 'Otros' },
];

// Helper para transformar el código de razón de rechazo a su etiqueta legible
const getRejectionReasonLabel = (rejectionReason: string | null | undefined): string => {
  if (!rejectionReason) return '';
  
  // Buscar si el valor es uno de los códigos predefinidos
  const option = REJECTION_REASON_OPTIONS.find(opt => opt.value === rejectionReason);
  
  // Si se encuentra, devolver la etiqueta; si no, devolver el valor original (texto libre de "otro")
  return option ? option.label : rejectionReason;
};

// Map backend request type to frontend request type
const mapBackendRequestTypeToFrontend = (backendType: string): Request['request_type'] => {
  const typeMap: Record<string, Request['request_type']> = {
    'solicitud-retiro-sindical': 'retiro-sindical',
    'solicitud-microcredito': 'microcredito',
    'incapacidades-licencias': 'incapacidad-licencia',
    'compensacion-descanso': 'descanso-laboral',
    // Tipos que son iguales en backend y frontend
    'certificado-convenio': 'certificado-convenio',
    'compensacion-anual': 'compensacion-anual',
    'verificacion-pagos': 'verificacion-pagos',
    'actualizar-datos-personales': 'actualizar-datos-personales',
    'permisos-turnos': 'permisos-turnos',
    'solicitud-bienestar': 'solicitud-bienestar',
  };
  
  return typeMap[backendType] || (backendType as Request['request_type']);
};

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
    request_type: mapBackendRequestTypeToFrontend(apiRequest.request_type),
    request_subtype: apiRequest.request_subtype || null,
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
    validated_at: apiRequest.validated_at || undefined,
    validated_by: apiRequest.validated_by || undefined,
    responses: [],
    responses_count: apiRequest.responses_count ?? 0,
    files: undefined,
    files_count: apiRequest.files_count,
  };
};

// Schema para el formulario de respuesta
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB en bytes
const MAX_COMPRESSED_FILE_SIZE = 20 * 1024 * 1024; // 20MB en bytes para archivos comprimidos
const MAX_FILES = 4;

// Tipos MIME de archivos comprimidos
const COMPRESSED_FILE_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-rar',
];

// Tipos de archivo permitidos para respuestas a solicitudes (incluyendo archivos comprimidos)
const ALLOWED_RESPONSE_FILE_TYPES = [
  // PDF
  'application/pdf',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Imágenes
  'image/jpeg',
  'image/jpg',
  'image/png',
  // Archivos comprimidos
  ...COMPRESSED_FILE_TYPES,
];

// Función helper para detectar si un archivo es comprimido
const isCompressedFile = (file: File): boolean => {
  return COMPRESSED_FILE_TYPES.includes(file.type);
};

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
  // Razón opcional para cambios de estado; requerida cuando se marca como "in_progress"
  statusReason: z
    .string()
    .max(200, "La razón no puede exceder 200 caracteres")
    .optional(),
  emailSubject: z.string().max(100, "El asunto no puede exceder 100 caracteres").optional(),
  emailBody: z.string().max(5000, "El cuerpo no puede exceder 5000 caracteres").optional(),
  rejection_reason: z.enum(['anexos_no_validos', 'compensacion_pignorada_libranza', 'formato_archivos', 'no_aplica_otros_certificado', 'no_cumple_causales_retiro', 'no_vb_coordinadora', 'sin_capacidad_endeudamiento', 'sin_evidencias', 'sin_tiempo_provisionado', 'solicitud_repetida', 'otros']).optional(),
  rejection_reason_otros: z.string().max(200, "La razón personalizada no puede exceder 200 caracteres").optional(),
  actividades: z.array(z.string().trim().min(1, "La actividad no puede estar vacía").max(500, "La actividad no puede exceder 500 caracteres")).optional(),
  attachments: z.any().optional().refine((files) => {
    if (!files || files.length === 0) return true;
    
    const fileList = Array.from(files as FileList);
    
    // Validar tipos de archivo permitidos
    const allValidTypes = fileList.every(file => ALLOWED_RESPONSE_FILE_TYPES.includes(file.type));
    if (!allValidTypes) return false;
    
    // Separar archivos comprimidos de no comprimidos
    const compressedFiles = fileList.filter(file => isCompressedFile(file));
    const nonCompressedFiles = fileList.filter(file => !isCompressedFile(file));
    
    // Si hay archivos comprimidos, solo se permite 1 archivo en total
    if (compressedFiles.length > 0) {
      if (fileList.length > 1) return false; // No se puede mezclar comprimidos con otros archivos
      if (compressedFiles.length > 1) return false; // Solo un archivo comprimido
      // Validar tamaño del archivo comprimido (20 MB)
      return compressedFiles[0].size <= MAX_COMPRESSED_FILE_SIZE;
    }
    
    // Si no hay comprimidos, validar archivos normales
    if (nonCompressedFiles.length > MAX_FILES) {
      return false;
    }
    
    // Validar tamaño de archivos normales (4 MB)
    const allValidSize = nonCompressedFiles.every(file => file.size <= MAX_FILE_SIZE);
    return allValidSize;
  }, {
    message: `Archivos comprimidos (ZIP, RAR): máximo 1 archivo de ${MAX_COMPRESSED_FILE_SIZE / (1024 * 1024)}MB (no se pueden mezclar con otros archivos). Otros archivos: máximo ${MAX_FILES} archivos de ${MAX_FILE_SIZE / (1024 * 1024)}MB cada uno.`,
  }),
}).refine((data) => {
  // Si el estado es "rejected", rejection_reason es obligatorio
  if (data.newStatus === "rejected") {
    return data.rejection_reason && data.rejection_reason.trim().length > 0;
  }
  return true;
}, {
  message: "La razón de rechazo es obligatoria cuando se rechaza una solicitud",
  path: ["rejection_reason"],
}).refine((data) => {
  // Si el estado es "rejected" y se selecciona "otros", rejection_reason_otros es obligatorio
  if (data.newStatus === "rejected" && data.rejection_reason === "otros") {
    return data.rejection_reason_otros && data.rejection_reason_otros.trim().length > 0;
  }
  return true;
}, {
  message: "Debe especificar la razón de rechazo cuando selecciona 'Otros'",
  path: ["rejection_reason_otros"],
}).refine((data) => {
  // Si el estado NO es "in_progress", emailSubject y emailBody son obligatorios
  if (data.newStatus !== "in_progress") {
    return data.emailSubject && data.emailSubject.trim().length > 0 && 
           data.emailBody && data.emailBody.trim().length > 0;
  }
  return true;
}, {
  message: "El asunto y el cuerpo del correo son obligatorios cuando el estado no es 'En Revisión'",
  path: ["emailSubject"],
}).refine((data) => {
  // Si el estado ES "in_progress", la razón es obligatoria en el frontend
  if (data.newStatus === "in_progress") {
    return data.statusReason && data.statusReason.trim().length > 0;
  }
  return true;
}, {
  message: "Debe ingresar una razón cuando la solicitud se marca como 'En Revisión'",
  path: ["statusReason"],
});

type ResponseFormValues = z.infer<typeof responseFormSchema>;

// Schema para el formulario de respuesta con compensaciones manuales
const responseWithCompensacionesFormSchema = z.object({
  newStatus: z.enum(["in_progress", "resolved", "rejected"], {
    required_error: "Debe seleccionar un nuevo estado",
  }),
  // Razón opcional para cambios de estado; requerida cuando se marca como "in_progress"
  statusReason: z
    .string()
    .max(200, "La razón no puede exceder 200 caracteres")
    .optional(),
  emailSubject: z.string().max(100, "El asunto no puede exceder 100 caracteres").optional(),
  emailBody: z.string().max(5000, "El cuerpo no puede exceder 5000 caracteres").optional(),
  rejection_reason: z.enum(['anexos_no_validos', 'compensacion_pignorada_libranza', 'formato_archivos', 'no_aplica_otros_certificado', 'no_cumple_causales_retiro', 'no_vb_coordinadora', 'sin_capacidad_endeudamiento', 'sin_evidencias', 'sin_tiempo_provisionado', 'solicitud_repetida', 'otros']).optional(),
  rejection_reason_otros: z.string().max(200, "La razón personalizada no puede exceder 200 caracteres").optional(),
  t_basicos: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.union([
      z.number({
        invalid_type_error: "El valor de Total Basicos debe ser un número entero",
      }).int("El valor de Total Basicos debe ser un número entero").min(0, "El valor de Total Basicos debe ser mayor o igual a 0"),
      z.undefined()
    ])
  ),
  t_auxilios: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.union([
      z.number({
        invalid_type_error: "El valor de Total Auxilios debe ser un número entero",
      }).int("El valor de Total Auxilios debe ser un número entero").min(0, "El valor de Total Auxilios debe ser mayor o igual a 0"),
      z.undefined()
    ])
  ),
  attachments: z.any().optional().refine((files) => {
    if (!files || files.length === 0) return true;
    
    const fileList = Array.from(files as FileList);
    
    // Validar tipos de archivo permitidos
    const allValidTypes = fileList.every(file => ALLOWED_RESPONSE_FILE_TYPES.includes(file.type));
    if (!allValidTypes) return false;
    
    // Separar archivos comprimidos de no comprimidos
    const compressedFiles = fileList.filter(file => isCompressedFile(file));
    const nonCompressedFiles = fileList.filter(file => !isCompressedFile(file));
    
    // Si hay archivos comprimidos, solo se permite 1 archivo en total
    if (compressedFiles.length > 0) {
      if (fileList.length > 1) return false; // No se puede mezclar comprimidos con otros archivos
      if (compressedFiles.length > 1) return false; // Solo un archivo comprimido
      // Validar tamaño del archivo comprimido (20 MB)
      return compressedFiles[0].size <= MAX_COMPRESSED_FILE_SIZE;
    }
    
    // Si no hay comprimidos, validar archivos normales
    if (nonCompressedFiles.length > MAX_FILES) {
      return false;
    }
    
    // Validar tamaño de archivos normales (4 MB)
    const allValidSize = nonCompressedFiles.every(file => file.size <= MAX_FILE_SIZE);
    return allValidSize;
  }, {
    message: `Archivos comprimidos (ZIP, RAR): máximo 1 archivo de ${MAX_COMPRESSED_FILE_SIZE / (1024 * 1024)}MB (no se pueden mezclar con otros archivos). Otros archivos: máximo ${MAX_FILES} archivos de ${MAX_FILE_SIZE / (1024 * 1024)}MB cada uno.`,
  }),
}).refine((data) => {
  // Si el estado es "rejected", rejection_reason es obligatorio
  if (data.newStatus === "rejected") {
    return data.rejection_reason && data.rejection_reason.trim().length > 0;
  }
  return true;
}, {
  message: "La razón de rechazo es obligatoria cuando se rechaza una solicitud",
  path: ["rejection_reason"],
}).refine((data) => {
  // Si el estado es "rejected" y se selecciona "otros", rejection_reason_otros es obligatorio
  if (data.newStatus === "rejected" && data.rejection_reason === "otros") {
    return data.rejection_reason_otros && data.rejection_reason_otros.trim().length > 0;
  }
  return true;
}, {
  message: "Debe especificar la razón de rechazo cuando selecciona 'Otros'",
  path: ["rejection_reason_otros"],
}).refine((data) => {
  // Si el estado NO es "in_progress", emailSubject y emailBody son obligatorios
  if (data.newStatus !== "in_progress") {
    return data.emailSubject && data.emailSubject.trim().length > 0 && 
           data.emailBody && data.emailBody.trim().length > 0;
  }
  return true;
}, {
  message: "El asunto y el cuerpo del correo son obligatorios cuando el estado no es 'En Revisión'",
  path: ["emailSubject"],
}).refine((data) => {
  // Si el estado ES "in_progress", la razón es obligatoria en el frontend
  if (data.newStatus === "in_progress") {
    return data.statusReason && data.statusReason.trim().length > 0;
  }
  return true;
}, {
  message: "Debe ingresar una razón cuando la solicitud se marca como 'En Revisión'",
  path: ["statusReason"],
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
      logger.warn('Error al parsear infoCertificado:', e);
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

// Función helper escalable para determinar qué tipos de solicitudes requieren validación manual
// Fácil de extender agregando nuevos tipos al array
const REQUEST_TYPES_REQUIRING_VALIDATION: Request['request_type'][] = [
  'descanso-laboral', // Compensación por Descanso
  'compensacion-anual', // Compensación Anual Diferida
  'verificacion-pagos', // Verificación de Pagos
];

const requiresManualValidation = (solicitud: Request): boolean => {
  // Solo para solicitudes pendientes o en revisión
  if (solicitud.status !== 'pending' && solicitud.status !== 'in_progress') {
    return false;
  }

  // Verificar si el tipo de solicitud requiere validación
  return REQUEST_TYPES_REQUIRING_VALIDATION.includes(solicitud.request_type);
};

const isRequestValidated = (solicitud: Request): boolean => {
  return !!solicitud.validated_at && !!solicitud.validated_by;
};

// Mensaje prediligenciado para solicitudes de microcrédito
const MICROCREDITO_EMAIL_BODY = "Hemos revisado su solicitud de libranza y esta sería la propuesta. Por favor, indíquenos si está de acuerdo para continuar con el proceso:\n\n1. En caso de aceptar y hacer efectiva la libranza, es importante tener en cuenta que la Compensación Anual Diferida y la Compensación de Descanso quedarán pignoradas. Estas serán liberadas de manera proporcional a medida que se realice el pago de las cuotas de la libranza.\n\n2. En caso de retiro de PROSALUD o cancelación de la libranza, las cuotas pendientes a la fecha del retiro serán descontadas en su totalidad, conforme a las condiciones acordadas al inicio de la solicitud del crédito.\n\nQuedamos atentos a su confirmación para continuar.";

// Mensaje prediligenciado para solicitudes de microcrédito rechazadas
const MICROCREDITO_REJECTED_EMAIL_BODY = "NO TIENE CAPACIDAD DE ENDEUDAMIENTO";

// Mensaje prediligenciado para solicitudes de retiro-sindical completadas
const RETIRO_SINDICAL_COMPLETADO_EMAIL_BODY = "Se recibe notificación de retiro libre y voluntario como afiliado(a) del sindicato PROSALUD, a continuación, compartimos información de su interés y solicitamos amablemente diligenciar la siguiente encuesta de retiro, con esto usted nos ayuda a identificar que procesos y factores influyen en la deserción de PROSALUD y los hospitales, y así podremos evaluar e implementar procesos de mejora.\n\nhttps://docs.google.com/forms/d/e/1FAIpQLScibi8bSKhMs1ByN9ySNgQUu9Wqqlbvg4yrIjAs6Je7o1XO_g/formResponse?pli=1";

// Función para convertir texto pegado de Excel a HTML de tabla
const convertExcelPasteToHtmlTable = (text: string): string => {
  // Dividir el texto en líneas
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  if (lines.length === 0) return text;
  
  // Detectar si el contenido parece ser tabular (contiene tabs o múltiples espacios consecutivos)
  const hasTabularStructure = lines.some(line => line.includes('\t') || /\s{2,}/.test(line));
  
  if (!hasTabularStructure) return text;
  
  // Procesar cada línea para extraer celdas
  const rows: string[][] = [];
  
  lines.forEach(line => {
    // Dividir por tabs primero, si no hay tabs, dividir por múltiples espacios
    let cells: string[];
    if (line.includes('\t')) {
      cells = line.split('\t');
    } else {
      // Dividir por múltiples espacios (2 o más)
      cells = line.split(/\s{2,}/);
    }
    
    // Limpiar espacios al inicio y final de cada celda
    cells = cells.map(cell => cell.trim());
    
    // Solo agregar filas que tengan al menos 2 celdas (para que sea una tabla)
    if (cells.length >= 2) {
      rows.push(cells);
    }
  });
  
  // Si no tenemos suficientes filas, retornar el texto original
  if (rows.length < 1) return text;
  
  // Encontrar el número máximo de columnas para asegurar consistencia
  const maxCols = Math.max(...rows.map(row => row.length));
  
  // Encontrar el índice de la fila "Plazo" (si existe)
  const plazoRowIndex = rows.findIndex(row => row[0]?.toLowerCase().trim() === 'plazo');
  
  // Crear la tabla HTML con estilo compacto similar a Excel
  // table-layout: auto permite que las columnas se ajusten automáticamente al contenido
  let htmlTable = '<table style="border-collapse: collapse; border: 1px solid #000; width: auto; font-family: Arial, sans-serif; font-size: 14px; table-layout: auto;">\n';
  
  rows.forEach((row, index) => {
    htmlTable += '  <tr>\n';
    
    // Detectar si esta es la fila de "Plazo"
    const isPlazoRow = index === plazoRowIndex && plazoRowIndex !== -1;
    
    // Asegurar que todas las filas tengan el mismo número de columnas
    for (let i = 0; i < maxCols; i++) {
      let cellValue = row[i] || '';
      
      // Limpiar valores monetarios: eliminar espacios múltiples entre $ y el número
      // Ejemplo: "$       500,000" -> "$500,000"
      if (cellValue.includes('$')) {
        cellValue = cellValue.replace(/\$\s+/g, '$').trim();
      }
      
      // Usar <td> para todas las celdas
      const tag = 'td';
      
      // Estilos base para todas las celdas - padding ajustado y sin espacio extra
      const baseStyle = 'padding: 5px 10px; border: 1px solid #000; white-space: nowrap;';
      
      // La primera columna siempre tiene negrilla (es la columna de títulos)
      const firstColumnStyle = i === 0 ? 'font-weight: bold;' : '';
      
      // Si es la fila de "Plazo", agregar fondo amarillo y negrilla
      const plazoRowStyle = isPlazoRow ? 'background-color: #FFE699; font-weight: bold;' : '';
      
      // Detectar si el contenido es numérico o monetario para alinearlo a la derecha
      const isNumeric = /^[\$]?\s*[\d,]+\.?\d*$/.test(cellValue.trim());
      const alignment = isNumeric ? 'text-align: right;' : 'text-align: left;';
      
      // Combinar todos los estilos
      const finalStyle = `${baseStyle} ${firstColumnStyle} ${plazoRowStyle} ${alignment}`.trim();
      
      htmlTable += `    <${tag} style="${finalStyle}">${cellValue}</${tag}>\n`;
    }
    
    htmlTable += '  </tr>\n';
  });
  
  htmlTable += '</table>';
  
  return htmlTable;
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

  // Certificados con "Otros" NO deben manejar compensaciones manuales
  // porque en la mayoría de los casos se genera el archivo manualmente por el usuario
  const otros = checkFlag(infoCertificado.otros);
  if (otros) return false;

  // Si tiene valor de compensaciones, subsidio de vivienda o subsidio de desempleo, requiere compensaciones manuales
  return tieneValorCompensaciones || paraSubsidioVivienda || paraSubsidioDesempleo;
};

// Función helper para formatear fechas en formato YYYY-MM-DD sin problemas de timezone
const formatDateOnly = (dateString: string): string => {
  if (!dateString) return 'N/A';
  
  // Si ya está en formato DD/MM/YYYY, retornarlo tal cual
  if (dateString.includes('/')) {
    return dateString;
  }
  
  // Si está en formato YYYY-MM-DD, convertir a DD/MM/YYYY
  // Parsear manualmente para evitar problemas de timezone
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    // Remover ceros a la izquierda del día y mes para formato colombiano
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    return `${dayNum}/${monthNum}/${year}`;
  }
  
  // Si no es un formato reconocido, intentar con Date pero con cuidado
  try {
    // Crear fecha en UTC para evitar problemas de timezone
    const date = new Date(dateString + 'T00:00:00Z');
    if (!isNaN(date.getTime())) {
      const day = date.getUTCDate();
      const month = date.getUTCMonth() + 1;
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    // Si falla, retornar el string original
  }
  
  return dateString;
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
  const [bulkTemplateDialogOpen, setBulkTemplateDialogOpen] = useState(false);
  const [bulkProcessDialogOpen, setBulkProcessDialogOpen] = useState(false);
  // Inicializar filtros desde search params
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || "");
  const [selectedStatus, setSelectedStatus] = useState<string>(() => searchParams.get('status') || "all");
  const [selectedType, setSelectedType] = useState<string>(() => searchParams.get('type') || "all");
  const [selectedSubtypeFilter, setSelectedSubtypeFilter] = useState<string>(() => searchParams.get('subtype') || "all");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "date">(() => (searchParams.get('sortBy') as "name" | "date") || "date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => (searchParams.get('sortOrder') as "asc" | "desc") || "desc");
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [useCompensacionesForm, setUseCompensacionesForm] = useState(false);
  const [requiresFondoPensionesAnnex, setRequiresFondoPensionesAnnex] = useState(false);
  const [requiresActividadesForm, setRequiresActividadesForm] = useState(false);
  const [isTransitioningRequest, setIsTransitioningRequest] = useState(false);
  const [showUpdateAfiliadosReminder, setShowUpdateAfiliadosReminder] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [microcreditoConfirmDialogOpen, setMicrocreditoConfirmDialogOpen] = useState(false);
  const [pendingResponseData, setPendingResponseData] = useState<ResponseFormValues | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<string>("");
  const [isRedirectingSubtype, setIsRedirectingSubtype] = useState(false);
  const [isSubtypeRedirectOpen, setIsSubtypeRedirectOpen] = useState(false);
  const [showPasteActividadesModal, setShowPasteActividadesModal] = useState(false);
  const [pasteActividadesText, setPasteActividadesText] = useState("");
  
  // Estados para controlar los menús desplegables en las tablas
  const [openRequestMenuId, setOpenRequestMenuId] = useState<number | string | null>(null);

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

  // Helper para verificar si una actualización pendiente requiere cambio de correo
  const pendingUpdateRequiresEmailChange = (pendingUpdate: ApiRequest): boolean => {
    const payload = pendingUpdate.payload || {};
    // El correo nuevo puede estar en 'correo', 'nuevoEmail' o 'nuevo_email'
    const nuevoEmailRaw = payload.correo || payload.nuevoEmail || payload.nuevo_email;
    // Si hay correo nuevo y es diferente del actual, hay cambio
    return nuevoEmailRaw && nuevoEmailRaw.trim() !== '' && nuevoEmailRaw !== pendingUpdate.email;
  };

  // Mostrar toast de éxito después de recargar la página (si existe en sessionStorage)
  useEffect(() => {
    const savedToast = sessionStorage.getItem('subtypeRedirectSuccess');
    if (savedToast) {
      try {
        const { message, description } = JSON.parse(savedToast);
        toast.success(message, {
          description,
          duration: 8000, // 8 segundos para que el usuario pueda leer el mensaje
        });
        // Limpiar el mensaje guardado después de mostrarlo
        sessionStorage.removeItem('subtypeRedirectSuccess');
      } catch (error) {
        // Si hay error al parsear, simplemente limpiar
        sessionStorage.removeItem('subtypeRedirectSuccess');
      }
    }
  }, []); // Solo se ejecuta una vez al montar el componente

  // Form para la respuesta normal
  const responseForm = useForm<ResponseFormValues>({
    resolver: zodResolver(responseFormSchema),
    defaultValues: {
      newStatus: "in_progress",
      statusReason: "",
      emailSubject: "",
      emailBody: "",
      rejection_reason: undefined,
      actividades: [],
      attachments: undefined,
    },
  });

  // Form para la respuesta con compensaciones manuales
  const responseWithCompensacionesForm = useForm<ResponseWithCompensacionesFormValues>({
    resolver: zodResolver(responseWithCompensacionesFormSchema),
    defaultValues: {
      newStatus: "in_progress",
      statusReason: "",
      emailSubject: "",
      emailBody: "",
      rejection_reason: undefined,
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

  // Sincronizar filtros con search params (solo cuando cambian los filtros, no cuando cambian los search params)
  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    
    // Preservar el parámetro 'view' si existe
    const viewParam = searchParams.get('view');
    if (viewParam) {
      newSearchParams.set('view', viewParam);
    }
    
    // Actualizar search params con los valores actuales de los filtros
    if (searchTerm) {
      newSearchParams.set('search', searchTerm);
    }
    
    if (selectedStatus !== "all") {
      newSearchParams.set('status', selectedStatus);
    }
    
    if (selectedType !== "all") {
      newSearchParams.set('type', selectedType);
    }
    
    if (selectedSubtypeFilter !== "all") {
      newSearchParams.set('subtype', selectedSubtypeFilter);
    }
    
    if (sortBy !== "date") {
      newSearchParams.set('sortBy', sortBy);
    }
    
    if (sortOrder !== "desc") {
      newSearchParams.set('sortOrder', sortOrder);
    }
    
    // Solo actualizar si hay cambios para evitar loops infinitos
    const currentParams = searchParams.toString();
    const newParams = newSearchParams.toString();
    if (currentParams !== newParams) {
      setSearchParams(newSearchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedStatus, selectedType, selectedSubtypeFilter, sortBy, sortOrder]);

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

  // Observar el campo newStatus del formulario de respuesta
  const watchedNewStatus = useWatch({
    control: responseForm.control,
    name: 'newStatus',
  });

  // Observar el campo newStatus del formulario de compensaciones
  const watchedNewStatusCompensaciones = useWatch({
    control: responseWithCompensacionesForm.control,
    name: 'newStatus',
  });

  // Efecto para actualizar el emailBody cuando cambia el estado en solicitudes de microcrédito
  // DESHABILITADO: No se quiere auto-completar el email para microcrédito, prefieren ingresarlo manualmente
  // useEffect(() => {
  //   // Solo aplicar si es el formulario normal (no compensaciones) y el diálogo está abierto
  //   if (!responseDialogOpen || !solicitudToRespond || useCompensacionesForm) return;
  //   
  //   const isMicrocredito = solicitudToRespond.request_type === 'microcredito' || solicitudToRespond.request_type === 'solicitud-microcredito';
  //   if (!isMicrocredito) return;
  //   
  //   // Si el estado es "in_progress" o "resolved", prediligenciar el mensaje
  //   if (watchedNewStatus === 'in_progress' || watchedNewStatus === 'resolved') {
  //     responseForm.setValue('emailBody', MICROCREDITO_EMAIL_BODY, { shouldValidate: false });
  //   } 
  //   // Si el estado es "rejected", prediligenciar el mensaje de rechazo
  //   else if (watchedNewStatus === 'rejected') {
  //     responseForm.setValue('emailBody', MICROCREDITO_REJECTED_EMAIL_BODY, { shouldValidate: false });
  //   }
  // }, [watchedNewStatus, responseDialogOpen, solicitudToRespond, useCompensacionesForm, responseForm]);

  // Efecto para prediligenciar mensaje y archivo adjunto cuando el estado es "resolved" en solicitudes de retiro-sindical
  useEffect(() => {
    // Solo aplicar si es el formulario normal (no compensaciones) y el diálogo está abierto
    if (!responseDialogOpen || !solicitudToRespond || useCompensacionesForm) return;
    
    const isRetiroSindical = solicitudToRespond.request_type === 'retiro-sindical' || solicitudToRespond.request_type === 'solicitud-retiro-sindical';
    if (!isRetiroSindical) return;
    
    // Obtener el estado actual del formulario (puede ser el observado o el valor actual)
    const currentStatus = watchedNewStatus || responseForm.getValues('newStatus');
    
    // Si el estado es "resolved" (Completado), prediligenciar el mensaje y adjuntar el PDF
    if (currentStatus === 'resolved') {
      // Prediligenciar el mensaje si no está ya establecido
      const currentEmailBody = responseForm.getValues('emailBody');
      if (currentEmailBody !== RETIRO_SINDICAL_COMPLETADO_EMAIL_BODY) {
        responseForm.setValue('emailBody', RETIRO_SINDICAL_COMPLETADO_EMAIL_BODY, { shouldValidate: false });
      }
      
      // Cargar y adjuntar el PDF
      const loadPdfAttachment = async () => {
        try {
          const response = await fetch('/files/RECORDATORIO_PARA_AFILIADOS_QUE_SE_RETIRAN.pdf');
          if (!response.ok) {
            logger.warn('No se pudo cargar el archivo PDF de recordatorio');
            return;
          }
          
          const blob = await response.blob();
          const file = new File([blob], 'RECORDATORIO_PARA_AFILIADOS_QUE_SE_RETIRAN.pdf', { type: 'application/pdf' });
          
          // Obtener archivos actuales
          const currentAttachments = responseForm.getValues('attachments');
          const currentFiles = currentAttachments ? Array.from(currentAttachments as FileList) : [];
          
          // Verificar si el archivo ya está adjunto
          const alreadyAttached = currentFiles.some(f => f.name === file.name);
          if (alreadyAttached) {
            return; // Ya está adjunto, no hacer nada
          }
          
          // Agregar el nuevo archivo usando DataTransfer
          const dataTransfer = new DataTransfer();
          currentFiles.forEach(f => dataTransfer.items.add(f));
          dataTransfer.items.add(file);
          
          responseForm.setValue('attachments', dataTransfer.files, { shouldValidate: false });
        } catch (error) {
          logger.error('Error al cargar el archivo PDF de recordatorio:', error);
        }
      };
      
      // Usar un pequeño delay para asegurar que el formulario esté completamente inicializado
      const timeoutId = setTimeout(() => {
        loadPdfAttachment();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [watchedNewStatus, responseDialogOpen, solicitudToRespond, useCompensacionesForm, responseForm]);

  // Efecto para limpiar emailBody cuando el estado cambia a "rejected" en certificados de convenio con compensaciones
  useEffect(() => {
    // Solo aplicar si es el formulario de compensaciones y el diálogo está abierto
    if (!responseDialogOpen || !solicitudToRespond || !useCompensacionesForm) return;
    
    const isCertificadoConvenio = solicitudToRespond.request_type === 'certificado-convenio';
    if (!isCertificadoConvenio) return;
    
    // Si el estado cambia a "rejected", limpiar el emailBody
    if (watchedNewStatusCompensaciones === 'rejected') {
      const currentEmailBody = responseWithCompensacionesForm.getValues('emailBody');
      // Solo limpiar si tiene contenido prediligenciado (no si el usuario ya escribió algo)
      if (currentEmailBody && (
        currentEmailBody.includes('Adjunto encontrará su certificado') ||
        currentEmailBody.includes('certificado de convenio') ||
        currentEmailBody.includes('Fecha de generación')
      )) {
        responseWithCompensacionesForm.setValue('emailBody', '', { shouldValidate: false });
      }
    }
  }, [watchedNewStatusCompensaciones, responseDialogOpen, solicitudToRespond, useCompensacionesForm, responseWithCompensacionesForm]);

  // Función para redirigir el subtipo de una solicitud
  const handleRedirectSubtype = async () => {
    if (!selectedSolicitud || !selectedSubtype) {
      toast.error("Por favor seleccione un subtipo");
      return;
    }

    // Validar que el tipo de solicitud es verificacion-pagos
    if (selectedSolicitud.request_type !== 'verificacion-pagos') {
      toast.error("La redirección de subtipos solo está disponible para solicitudes de verificación de pagos");
      return;
    }

    // Validar que el subtipo seleccionado es diferente al actual
    const currentSubtype = selectedSolicitud.payload?.solicitudRelacionadaCon;
    if (currentSubtype === selectedSubtype) {
      toast.error("El subtipo seleccionado es el mismo que el actual");
      return;
    }

    setIsRedirectingSubtype(true);
    try {
      const result = await requestsApiService.redirectSubtype(selectedSolicitud.id, selectedSubtype);

      // Construir nombres de usuarios asignados para el toast
      const assignedNames = Array.isArray(result.data?.assigned_users)
        ? result.data.assigned_users
            .map((u: any) => u?.name)
            .filter((n: any) => typeof n === 'string' && n.trim() !== '')
            .join(', ')
        : '';

      const toastMessage = result.message || "Solicitud redirigida exitosamente";
      const toastDescription = result.data.assigned_users.length > 0
        ? `Usuarios asignados: ${assignedNames}`
        : 'No hay usuarios asignados al nuevo subtipo.';

      // Guardar el mensaje del toast en sessionStorage para mostrarlo después de recargar
      sessionStorage.setItem('subtypeRedirectSuccess', JSON.stringify({
        message: toastMessage,
        description: toastDescription,
      }));

      // Recargar la página inmediatamente
      window.location.reload();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error("Error al redirigir el subtipo", {
        description: errorMessage,
      });
    } finally {
      setIsRedirectingSubtype(false);
    }
  };

  // El backend ya filtra las solicitudes según las asignaciones del usuario
  // No es necesario filtrar en el frontend

  // Función para obtener la etiqueta del tipo de solicitud
  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "certificado-convenio": "Certificado de Convenio",
      "compensacion-anual": "Compensación Anual Diferida",
      "verificacion-pagos": "Verificación de Pagos",
      "compensacion-descanso": "Compensación por Descanso",
      "descanso-laboral": "Compensación por Descanso", // Tipo del frontend mapeado desde backend
      "actualizar-datos-personales": "Actualizar Datos Personales",
      "solicitud-microcredito": "Solicitud de Microcrédito",
      "solicitud-retiro-sindical": "Solicitud de Retiro Sindical",
      "retiro-sindical": "Retiro Sindical",
      "microcredito": "Solicitud de Microcrédito",
      "incapacidad-licencia": "Incapacidades y Licencias",
      "permisos-cambio-turnos": "Permisos y Cambio de Turnos",
      "incapacidades-licencias": "Incapacidades y Licencias",
      "permisos-turnos": "Permisos y Cambio de Turnos",
      "solicitud-bienestar": "Solicitud de Bienestar",
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

  // Obtener subtipos únicos de verificacion-pagos (para el filtro)
  // Agrupa por label normalizado para evitar duplicados visuales
  const existingSubtypes = useMemo(() => {
    // Mapa: label normalizado -> array de valores del backend que se mapean a ese label
    const labelToBackendValues = new Map<string, string[]>();
    
    allSolicitudes
      .filter((request) => request.request_type === 'verificacion-pagos' && request.request_subtype)
      .forEach((request) => {
        if (request.request_subtype) {
          const normalizedLabel = getVerificacionPagosSubtypeLabel(request.request_subtype);
          if (!labelToBackendValues.has(normalizedLabel)) {
            labelToBackendValues.set(normalizedLabel, []);
          }
          const backendValues = labelToBackendValues.get(normalizedLabel)!;
          // Agregar el valor del backend solo si no está ya en el array
          if (!backendValues.includes(request.request_subtype)) {
            backendValues.push(request.request_subtype);
          }
        }
      });
    
    // Convertir a array de objetos con label y el primer valor del backend
    // Ordenar por label normalizado
    return Array.from(labelToBackendValues.entries())
      .map(([label, backendValues]) => ({
        label,
        backendValue: backendValues[0], // Usar el primer valor del backend como representante
        allBackendValues: backendValues, // Guardar todos los valores para el filtrado
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allSolicitudes]);

  // Mapa auxiliar para buscar todos los valores del backend que corresponden a un label
  const subtypeLabelToBackendValues = useMemo(() => {
    const map = new Map<string, string[]>();
    existingSubtypes.forEach(({ label, allBackendValues }) => {
      map.set(label, allBackendValues);
    });
    return map;
  }, [existingSubtypes]);

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
      filtered = filtered.filter((request) => request.request_type === selectedType as Request['request_type']);
    }

    // Filtrar por subtipo si el tipo es verificacion-pagos y hay un subtipo seleccionado
    if (selectedType === 'verificacion-pagos' && selectedSubtypeFilter !== "all") {
      filtered = filtered.filter((request) => {
        if (!request.request_subtype) return false;
        
        // Buscar el label normalizado del valor seleccionado
        const selectedLabel = getVerificacionPagosSubtypeLabel(selectedSubtypeFilter);
        // Obtener todos los valores del backend que corresponden a ese label
        const backendValuesForLabel = subtypeLabelToBackendValues.get(selectedLabel) || [selectedSubtypeFilter];
        
        // Comparar con cualquiera de los valores del backend que corresponden a ese label
        return backendValuesForLabel.includes(request.request_subtype);
      });
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
  }, [allSolicitudes, searchTerm, selectedStatus, selectedType, selectedSubtypeFilter, sortBy, sortOrder, subtypeLabelToBackendValues]);

  const stats = useMemo(() => {
    if (!allSolicitudes || allSolicitudes.length === 0) {
      return {
        total: 0,
        pending: 0,
        in_progress: 0,
        resolved: 0,
        rejected: 0,
        this_month: 0,
        avg_resolution_time: 0,
        unvalidated: 0
      };
    }

    const total = allSolicitudes.length;
    const pending = allSolicitudes.filter(r => r.status === 'pending').length;
    const in_progress = allSolicitudes.filter(r => r.status === 'in_progress').length;
    const resolved = allSolicitudes.filter(r => r.status === 'resolved').length;
    const rejected = allSolicitudes.filter(r => r.status === 'rejected').length;
    
    // Calculate unvalidated requests (require validation but haven't been validated yet)
    const unvalidated = allSolicitudes.filter(r => 
      requiresManualValidation(r) && !isRequestValidated(r)
    ).length;
    
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
      avg_resolution_time,
      unvalidated
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
    
    // Resetear subtipo seleccionado y colapsar sección al cambiar de solicitud
    setSelectedSubtype("");
    setIsSubtypeRedirectOpen(false);
    
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
      let emailBody = "";

      // Solo prediligenciar el mensaje si el estado es "resolved" (completado)
      if (defaultStatus === 'resolved') {
        emailBody = "Adjunto encontrará su certificado de convenio en formato PDF.\n\nEste certificado ha sido generado automáticamente y contiene la información solicitada sobre su convenio.";

        if (paraSubsidioDesempleo) {
          emailSubject = `Certificado de Convenio - Subsidio de Desempleo - Solicitud #${solicitud.id}`;
          emailBody = "Adjunto encontrará su certificado de convenio para subsidio de desempleo.\n\nEste certificado ha sido generado automáticamente y contiene la información solicitada sobre su convenio.";
        } else if (paraSubsidioVivienda) {
          emailSubject = `Certificado de Convenio - Subsidio de Vivienda - Solicitud #${solicitud.id}`;
          emailBody = "Adjunto encontrará su certificado de convenio para subsidio de vivienda con los valores de compensación.\n\nEste certificado ha sido generado automáticamente y contiene la información solicitada sobre su convenio.";
        }

        // Agregar fecha de generación solo si se completó
        const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        emailBody += `\n\nFecha de generación: ${fechaGeneracion}`;
      } else if (defaultStatus === 'rejected') {
        // Si es rechazado, usar un asunto genérico y dejar el cuerpo vacío
        emailSubject = `Certificado de Convenio - Solicitud #${solicitud.id}`;
        emailBody = "";
      }

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
      const documentInfo =
        solicitud.id_type && solicitud.id_number
          ? ` - ${solicitud.id_type} ${solicitud.id_number}`
          : "";
      let emailSubject = `Respuesta a su solicitud #${solicitud.id} de ${requestTypeLabel}${documentInfo}`;
      let emailBody = "";
      
      // Si es microcrédito, NO prediligenciar mensaje - prefieren ingresarlo manualmente
      // const isMicrocredito = solicitud.request_type === 'microcredito' || solicitud.request_type === 'solicitud-microcredito';
      // if (isMicrocredito) {
      //   if (defaultStatus === 'in_progress' || defaultStatus === 'resolved') {
      //     emailBody = MICROCREDITO_EMAIL_BODY;
      //   } else if (defaultStatus === 'rejected') {
      //     emailBody = MICROCREDITO_REJECTED_EMAIL_BODY;
      //   }
      // }
      
      // Si es retiro-sindical y el estado es "resolved", prediligenciar mensaje
      // El efecto se encargará de cargar el PDF automáticamente
      const isRetiroSindical = solicitud.request_type === 'retiro-sindical' || solicitud.request_type === 'solicitud-retiro-sindical';
      if (isRetiroSindical && defaultStatus === 'resolved') {
        emailBody = RETIRO_SINDICAL_COMPLETADO_EMAIL_BODY;
      }
      
      // Si es dirigido a fondo de pensiones, prediligenciar mensaje solo si es "resolved"
      if (isFondoPensiones && defaultStatus === 'resolved') {
        emailSubject = `Certificado de Convenio - Fondo de Pensiones - Solicitud #${solicitud.id}`;
        
        emailBody = "Adjunto encontrará su certificado de convenio dirigido al fondo de pensiones en formato PDF.\n\n";
        emailBody += "Este certificado ha sido generado automáticamente y contiene la información solicitada sobre su convenio para corrección de historia.";
        
        // Agregar fecha de generación
        const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        emailBody += `\n\nFecha de generación: ${fechaGeneracion}`;
      } else if (needsActividades && defaultStatus === 'resolved') {
        // Si requiere adicionar actividades, prediligenciar mensaje solo si es "resolved"
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

  const handleValidateRequest = async (solicitud: Request) => {
    if (!solicitud) return;

    setIsValidating(true);
    try {
      const updatedRequest = await requestsService.validateRequest(solicitud.id);
      
      // Actualizar la solicitud seleccionada si es la misma
      if (selectedSolicitud?.id === solicitud.id) {
        setSelectedSolicitud(updatedRequest);
      }

      // Refetch para actualizar la lista
      await refetch();

      toast.success("Solicitud validada exitosamente", {
        description: `La solicitud #${solicitud.id} ha sido validada y está lista para ser gestionada.`,
        duration: 4000,
      });
    } catch (error) {
      logger.error("Error al validar solicitud", error instanceof Error ? error.message : error);
      toast.error("Error al validar solicitud", {
        description: getErrorMessage(error),
        duration: 6000,
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Función auxiliar que realmente envía la respuesta (después de confirmación)
  const doSubmitResponse = async (data: ResponseFormValues) => {
    if (!solicitudToRespond) return;

    // Verificar si hay actualización pendiente que requiera cambio de correo antes de responder
    const pendingUpdate = getPendingUpdate(solicitudToRespond.id_number);
    if (pendingUpdate && pendingUpdateRequiresEmailChange(pendingUpdate)) {
      // El correo actual es el correo de la solicitud que se está respondiendo (el que está en el sistema actualmente)
      const correoActual = solicitudToRespond.email;
      // El correo solicitado es el que está en el payload de la solicitud de actualización
      const correoSolicitadoRaw = pendingUpdate.payload?.correo || pendingUpdate.payload?.nuevoEmail || pendingUpdate.payload?.nuevo_email;
      const correoSolicitado = correoSolicitadoRaw && correoSolicitadoRaw.trim() !== '' ? correoSolicitadoRaw : correoActual;
      
      // Si se va a aprobar (resolved) una solicitud de actualización de datos personales,
      // el correo de envío será el nuevo correo
      const isAprobandoActualizacion = solicitudToRespond.request_type === 'actualizar-datos-personales' && data.newStatus === 'resolved';
      const correoEnvio = isAprobandoActualizacion ? correoSolicitado : correoActual;
      
      const mensaje = isAprobandoActualizacion
        ? `⚠️ ADVERTENCIA: Este afiliado tiene una solicitud pendiente de actualización de datos personales que requiere cambio de correo.\n\n` +
          `Al aprobar esta solicitud de actualización, el correo se enviará al nuevo correo (${correoSolicitado}), ` +
          `ya que los datos serán actualizados en el sistema.\n\n` +
          `Correo actual en sistema: ${correoActual}\n` +
          `Nuevo correo solicitado: ${correoSolicitado}\n\n` +
          `¿Desea continuar con la aprobación?`
        : `⚠️ ADVERTENCIA: Este afiliado tiene una solicitud pendiente de actualización de datos personales que requiere cambio de correo.\n\n` +
          `Si responde ahora, el correo se enviará al correo actual (${correoActual}), ` +
          `pero el afiliado ha solicitado cambiarlo a: ${correoSolicitado}\n\n` +
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

    // Solo validar actividades si el estado NO es "rejected" (no se genera certificado si se rechaza)
    if (requiresActividadesForm && data.newStatus !== 'rejected') {
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
      // Si el estado es "in_progress", solo actualizar el estado sin enviar email
      if (finalStatus === 'in_progress') {
        // Convertir ID a string de 10 dígitos (con ceros a la izquierda si es necesario)
        const solicitudIdString = String(solicitudId).padStart(10, '0');
        const updatedRequest = await requestsService.updateRequestStatus(
          solicitudIdString,
          'in_progress',
          undefined,
          data.statusReason,
        );
        
        // Resetear estado
        setIsSubmittingResponse(false);
        
        // Mostrar toast de éxito
        toast.success("Estado actualizado exitosamente", {
          description: `La solicitud #${solicitudId} ha sido marcada como "En Revisión".`,
          duration: 4000,
        });
        
        // Cerrar el modal después de un pequeño delay
        setTimeout(() => {
          handleCloseResponseDialog();
        }, 500);
        
        // Refetch para actualizar la lista
        await refetch();
        
        // Actualizar la solicitud seleccionada si es la misma
        if (selectedSolicitud?.id === solicitudId) {
          const refetchedData = (await refetch()).data || [];
          const updatedFromList = refetchedData.find(req => req.id === solicitudId);
          
          if (updatedFromList) {
            setSelectedSolicitud(updatedFromList);
            setExpandedFields({});
          } else {
            setSelectedSolicitud(updatedRequest);
            setExpandedFields({});
          }
        }
        
        return; // Salir temprano, no enviar email
      }
      
      // Si el estado NO es "in_progress", enviar respuesta con email
      // Enviar respuesta usando la API del backend
      // Las actividades se envían en FormData como actividades[0], actividades[1], etc., NO en el email_body
      // Si se selecciona "otros", enviar el texto personalizado; de lo contrario, enviar el valor del select
      const rejectionReasonToSend = finalStatus === 'rejected' 
        ? (data.rejection_reason === 'otros' && data.rejection_reason_otros 
            ? data.rejection_reason_otros.trim() 
            : data.rejection_reason)
        : undefined;
      
      // Convertir ID a string de 10 dígitos (con ceros a la izquierda si es necesario)
      const solicitudIdString = String(solicitudId).padStart(10, '0');
      const updatedRequest = await requestsService.sendResponse(solicitudIdString, {
        newStatus: finalStatus,
        emailSubject: data.emailSubject!,
        emailBody: data.emailBody!,
        rejection_reason: rejectionReasonToSend,
        status_reason: data.statusReason,
        attachments: data.attachments,
        // No enviar actividades si el estado es "rejected" (no se genera certificado)
        actividades: (requiresActividadesForm && finalStatus !== 'rejected') ? (data.actividades || []) : undefined,
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
            if (field === 'attachments' || field === 'files') {
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

  // Función principal que se llama al enviar el formulario - verifica si es microcrédito y muestra confirmación
  const handleSubmitResponse = async (data: ResponseFormValues) => {
    if (!solicitudToRespond) return;

    // Si es una solicitud de microcrédito, mostrar modal de confirmación
    const isMicrocredito = solicitudToRespond.request_type === 'microcredito' || solicitudToRespond.request_type === 'solicitud-microcredito';
    
    if (isMicrocredito) {
      // Guardar los datos pendientes y mostrar el modal de confirmación
      setPendingResponseData(data);
      setMicrocreditoConfirmDialogOpen(true);
      return;
    }

    // Para otros tipos de solicitudes, proceder directamente
    await doSubmitResponse(data);
  };

  // Función para confirmar y enviar la respuesta de microcrédito
  const handleConfirmMicrocreditoResponse = async () => {
    if (!pendingResponseData) return;
    
    setMicrocreditoConfirmDialogOpen(false);
    await doSubmitResponse(pendingResponseData);
    setPendingResponseData(null);
  };

  const handleSubmitResponseWithCompensaciones = async (data: ResponseWithCompensacionesFormValues) => {
    if (!solicitudToRespond) return;

    // Verificar si hay actualización pendiente que requiera cambio de correo antes de responder
    const pendingUpdate = getPendingUpdate(solicitudToRespond.id_number);
    if (pendingUpdate && pendingUpdateRequiresEmailChange(pendingUpdate)) {
      // El correo actual es el correo de la solicitud que se está respondiendo (el que está en el sistema actualmente)
      const correoActual = solicitudToRespond.email;
      // El correo solicitado es el que está en el payload de la solicitud de actualización
      const correoSolicitadoRaw = pendingUpdate.payload?.correo || pendingUpdate.payload?.nuevoEmail || pendingUpdate.payload?.nuevo_email;
      const correoSolicitado = correoSolicitadoRaw && correoSolicitadoRaw.trim() !== '' ? correoSolicitadoRaw : correoActual;
      
      // Si se va a aprobar (resolved) una solicitud de actualización de datos personales,
      // el correo de envío será el nuevo correo
      const isAprobandoActualizacion = solicitudToRespond.request_type === 'actualizar-datos-personales' && data.newStatus === 'resolved';
      const correoEnvio = isAprobandoActualizacion ? correoSolicitado : correoActual;
      
      const mensaje = isAprobandoActualizacion
        ? `⚠️ ADVERTENCIA: Este afiliado tiene una solicitud pendiente de actualización de datos personales que requiere cambio de correo.\n\n` +
          `Al aprobar esta solicitud de actualización, el correo se enviará al nuevo correo (${correoSolicitado}), ` +
          `ya que los datos serán actualizados en el sistema.\n\n` +
          `Correo actual en sistema: ${correoActual}\n` +
          `Nuevo correo solicitado: ${correoSolicitado}\n\n` +
          `¿Desea continuar con la aprobación?`
        : `⚠️ ADVERTENCIA: Este afiliado tiene una solicitud pendiente de actualización de datos personales que requiere cambio de correo.\n\n` +
          `Si responde ahora, el correo se enviará al correo actual (${correoActual}), ` +
          `pero el afiliado ha solicitado cambiarlo a: ${correoSolicitado}\n\n` +
          `¿Desea continuar con la respuesta o prefiere procesar primero la actualización de datos?`;
      
      const confirmed = window.confirm(mensaje);
      
      if (!confirmed) {
        return; // El usuario canceló, no enviar la respuesta
      }
    }

    setIsSubmittingResponse(true);
    const solicitudId = solicitudToRespond.id; // Guardar ID antes de que pueda cambiar
    try {
      // Si el estado es "in_progress", solo actualizar el estado sin enviar email
      if (data.newStatus === 'in_progress') {
        // Convertir ID a string de 10 dígitos (con ceros a la izquierda si es necesario)
        const solicitudIdString = String(solicitudId).padStart(10, '0');
        const updatedRequest = await requestsService.updateRequestStatus(
          solicitudIdString,
          'in_progress',
          undefined,
          data.statusReason,
        );
        
        // Resetear estado
        setIsSubmittingResponse(false);
        
        // Mostrar toast de éxito
        toast.success("Estado actualizado exitosamente", {
          description: `La solicitud #${solicitudId} ha sido marcada como "En Revisión".`,
          duration: 4000,
        });
        
        // Cerrar el modal después de un pequeño delay
        setTimeout(() => {
          handleCloseResponseDialog();
        }, 500);
        
        // Refetch para actualizar la lista
        await refetch();
        
        // Actualizar la solicitud seleccionada si es la misma
        if (selectedSolicitud?.id === solicitudId) {
          const refetchedData = (await refetch()).data || [];
          const updatedFromList = refetchedData.find(req => req.id === solicitudId);
          
          if (updatedFromList) {
            setSelectedSolicitud(updatedFromList);
            setExpandedFields({});
          } else {
            setSelectedSolicitud(updatedRequest);
            setExpandedFields({});
          }
        }
        
        return; // Salir temprano, no enviar email
      }
      
      // Si el estado NO es "in_progress", enviar respuesta con compensaciones usando la API del backend
      // Si se selecciona "otros", enviar el texto personalizado; de lo contrario, enviar el valor del select
      const rejectionReasonToSend = data.newStatus === 'rejected'
        ? (data.rejection_reason === 'otros' && data.rejection_reason_otros 
            ? data.rejection_reason_otros.trim() 
            : data.rejection_reason)
        : undefined;
      
      // Convertir ID a string de 10 dígitos (con ceros a la izquierda si es necesario)
      const solicitudIdString = String(solicitudId).padStart(10, '0');
      const updatedRequest = await requestsService.sendResponseWithCompensaciones(solicitudIdString, {
        newStatus: data.newStatus,
        emailSubject: data.emailSubject!,
        emailBody: data.emailBody!,
        rejection_reason: rejectionReasonToSend,
        status_reason: data.statusReason,
        // No enviar compensaciones si el estado es "rejected" (no se genera certificado)
        t_basicos: data.newStatus !== 'rejected' ? data.t_basicos : undefined,
        t_auxilios: data.newStatus !== 'rejected' ? data.t_auxilios : undefined,
        attachments: data.attachments,
      });

      // Resetear estado
      setIsSubmittingResponse(false);

      // Verificar si se completó una solicitud de actualización de datos personales
      const isActualizacionCompletada = solicitudToRespond?.request_type === 'actualizar-datos-personales' && data.newStatus === 'resolved';

      // Mostrar toast de éxito ANTES de cerrar el modal para que sea visible
      if (data.newStatus === 'rejected') {
        toast.success("Respuesta enviada exitosamente", {
          description: `La respuesta a la solicitud #${solicitudId} ha sido enviada exitosamente al afiliado.`,
          duration: 5000,
        });
      } else {
      // Calcular Total Ingresos para el mensaje (usar 0 si son undefined)
      const t_ingresos = (data.t_basicos ?? 0) + (data.t_auxilios ?? 0);
      toast.success("Certificado generado y respuesta enviada exitosamente", {
        description: `El certificado con compensaciones (Total Ingresos: $${t_ingresos.toLocaleString('es-CO')}) ha sido generado y enviado al afiliado.`,
        duration: 5000,
      });
      }

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
      
      // Detectar error específico de compensaciones
      let errorMessage = getErrorMessage(error);
      let errorTitle = "Error al generar certificado con compensaciones";
      
      // Verificar si es el error específico de compensaciones
      if (error && typeof error === 'object' && 'originalData' in error) {
        const originalData = (error as any).originalData;
        
        // Verificar si hay errores de compensaciones
        if (originalData?.errors?.compensaciones && Array.isArray(originalData.errors.compensaciones)) {
          // Usar el mensaje principal del error si está disponible
          errorTitle = originalData.message || "Este certificado requiere valores de compensaciones";
          
          // Construir descripción con los mensajes de error de compensaciones
          const compensacionesMessages = originalData.errors.compensaciones;
          const description = compensacionesMessages.length > 0 
            ? compensacionesMessages.join('\n\n')
            : originalData.sugerencia || errorMessage;
          
          // Mostrar toast de error con mensaje detallado
          toast.error(errorTitle, {
            description: description,
            duration: 8000, // Más tiempo para leer el mensaje detallado
          });
          return; // Salir temprano para no mostrar el toast genérico
        }
      }
      
      // Mostrar toast de error genérico si no es el error específico de compensaciones
      toast.error(errorTitle, {
        description: errorMessage,
        duration: 6000,
      });
    }
  };

  const handleChangeStatus = async (id: string, newStatus: Request["status"]) => {
    try {
      let statusReason: string | undefined;

      // Cuando se marca "En Revisión" desde acciones rápidas, pedir siempre la razón
      if (newStatus === "in_progress") {
        const input = window.prompt(
          "Ingrese la razón por la que la solicitud pasa a 'En Revisión' (máx. 200 caracteres):",
        );

        if (input === null) {
          // Usuario canceló
          return;
        }

        const trimmed = input.trim();
        if (!trimmed) {
          toast.error("Razón requerida", {
            description: "Debe ingresar una razón para marcar la solicitud como 'En Revisión'.",
          });
          return;
        }

        statusReason = trimmed.length > 200 ? trimmed.slice(0, 200) : trimmed;
      }

      await requestsService.updateRequestStatus(id, newStatus, undefined, statusReason);

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

  // Helper para mapear estados del backend (PENDING, IN_REVIEW, etc.) a etiquetas legibles
  const getBackendStatusLabel = (status?: string | null) => {
    if (!status) return "Desconocido";
    const normalized = status.toUpperCase();
    switch (normalized) {
      case "PENDING":
        return "Pendiente";
      case "IN_REVIEW":
        return "En Revisión";
      case "COMPLETED":
        return "Completado";
      case "REJECTED":
        return "Rechazado";
      default:
        // También soportar los valores normalizados del frontend por si llegan así
        if (status === "pending" || status === "in_progress" || status === "resolved" || status === "rejected") {
          return getStatusLabel(status);
        }
        return status;
    }
  };

  // Formatea la fecha del último cambio de estado en un formato amigable, sin segundos
  const formatLastStatusChangeDate = (change?: Request["last_status_change"]) => {
    if (!change) return "Fecha no disponible";

    if (change.changed_at_human && change.changed_at_human.trim() !== "") {
      return change.changed_at_human;
    }

    if (!change.changed_at) {
      return "Fecha no disponible";
    }

    try {
      const date = new Date(change.changed_at);
      const datePart = date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const timePart = date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${datePart} a las ${timePart}`;
    } catch {
      // Si por alguna razón falla el parseo, devolver el valor bruto
      return change.changed_at;
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
    setSelectedType("all");
    setSelectedSubtypeFilter("all");
  };

  // Detectar si hay filtros activos
  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm.trim() !== "" ||
      selectedStatus !== "all" ||
      selectedType !== "all" ||
      selectedSubtypeFilter !== "all" ||
      sortBy !== "date" ||
      sortOrder !== "desc"
    );
  }, [searchTerm, selectedStatus, selectedType, selectedSubtypeFilter, sortBy, sortOrder]);

  // Limpiar el filtro de subtipo cuando se cambie el tipo de solicitud
  useEffect(() => {
    if (selectedType !== 'verificacion-pagos') {
      setSelectedSubtypeFilter("all");
    }
  }, [selectedType]);

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
              <CardHeader className="pb-4 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-primary-prosalud/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                      <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary-prosalud" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-prosalud">Gestión de Solicitudes</CardTitle>
                        <Badge variant="secondary" className="text-sm sm:text-base px-2 sm:px-3 py-1 w-fit">
                          Total: {stats?.total || 0}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm sm:text-base mt-1 sm:mt-2">
                        Administra y procesa las solicitudes de los usuarios de ProSalud
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    {/* Botón principal: Exportar Reporte */}
                    <Button
                      variant="outline"
                      onClick={() => setExportDialogOpen(true)}
                      className="w-full sm:w-auto"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Exportar Reporte</span>
                      <span className="sm:hidden">Exportar</span>
                    </Button>
                    
                    {/* Menú desplegable para Respuestas Masivas */}
                    {can('requests.respond') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full sm:w-auto">
                            <Send className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Respuestas Masivas</span>
                            <span className="sm:hidden">Masivas</span>
                            <ArrowDown className="h-3 w-3 ml-2 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem
                            onClick={() => setBulkTemplateDialogOpen(true)}
                            className="cursor-pointer"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            <span>Descargar Plantilla</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setBulkProcessDialogOpen(true)}
                            className="cursor-pointer"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            <span>Procesar Respuestas</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    
                    {/* Menú desplegable para Acciones Adicionales */}
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-full sm:w-auto">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Más acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {can('requests.view') && (
                          <DropdownMenuItem
                            onClick={() => setVerificarCertificadoOpen(true)}
                            className="cursor-pointer"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            <span>Verificar Certificado</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
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

              <Card className="border-l-4 border-l-orange-500 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Sin Validar</p>
                      <p className="text-2xl font-bold text-orange-600">{stats?.unvalidated || 0}</p>
                    </div>
                    <div className="p-2 rounded-full">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
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
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${selectedType === 'verificacion-pagos' && existingSubtypes.length > 0 ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4 items-end`}>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <div className="space-y-2">
                      <Label htmlFor="search-input">Buscar</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="search-input"
                          type="text"
                          placeholder="Buscar por ID, nombre, email..."
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
                  {selectedType === 'verificacion-pagos' && existingSubtypes.length > 0 && (
                    <div>
                      <div className="space-y-2">
                        <Label htmlFor="subtype-filter">Subtipo de Solicitud</Label>
                        <Select value={selectedSubtypeFilter} onValueChange={setSelectedSubtypeFilter}>
                          <SelectTrigger id="subtype-filter" className="h-10">
                            <SelectValue placeholder="Todos los subtipos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los subtipos</SelectItem>
                            {existingSubtypes.map((subtype) => (
                              <SelectItem key={subtype.label} value={subtype.backendValue}>
                                {subtype.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <div className={`sm:col-span-2 ${selectedType === 'verificacion-pagos' && existingSubtypes.length > 0 ? 'lg:col-span-1' : 'lg:col-span-1'}`}>
                    <Button 
                      variant={hasActiveFilters ? "default" : "outline"} 
                      onClick={clearFilters} 
                      className={`h-10 w-full flex items-center justify-center gap-2 ${
                        hasActiveFilters 
                          ? "bg-accent text-white hover:bg-accent/90" 
                          : ""
                      }`}
                    >
                      <Brush className="w-4 h-4" />
                      <span className="sm:hidden">Limpiar</span>
                      <span className="hidden sm:inline">Limpiar Filtros</span>
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
                    {/* Desktop Table View - Hidden on mobile */}
                    <div className="hidden lg:block rounded-md border overflow-x-auto">
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
                                    {solicitud.request_type === 'verificacion-pagos' && solicitud.request_subtype ? (
                                      <>
                                        <span>{getRequestTypeLabel(solicitud.request_type)} – </span>
                                        <span className="font-semibold">
                                          {getVerificacionPagosSubtypeLabel(solicitud.request_subtype)}
                                        </span>
                                      </>
                                    ) : (
                                      getRequestTypeLabel(solicitud.request_type)
                                    )}
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
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={getStatusColor(solicitud.status)}>
                                    {getStatusLabel(solicitud.status)}
                                  </Badge>
                                  {requiresManualValidation(solicitud) && (
                                    <span 
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                                        isRequestValidated(solicitud) 
                                          ? "bg-green-50 text-green-700 border border-green-200" 
                                          : "bg-orange-50 text-orange-700 border border-orange-200"
                                      }`}
                                    >
                                      {isRequestValidated(solicitud) ? (
                                        <>
                                          <CheckCircle className="h-3 w-3" />
                                          Validada
                                        </>
                                      ) : (
                                        <>
                                          <Clock className="h-3 w-3" />
                                          Sin Validar
                                        </>
                                      )}
                                    </span>
                                  )}
                                </div>
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
                                    <DropdownMenuItem onSelect={() => handleViewDetails(solicitud)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver Detalles
                                    </DropdownMenuItem>
                                    {can('requests.respond') && (solicitud.status === "pending" || solicitud.status === "in_progress") && (
                                      <DropdownMenuItem onSelect={() => handleOpenResponseDialog(solicitud)}>
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

                    {/* Mobile Card View - Visible on mobile and tablet */}
                    <div className="lg:hidden space-y-3">
                      {paginatedData.map((solicitud) => (
                        <Card key={solicitud.id} className="border shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Header with user info and actions */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className="bg-gray-100 p-2 rounded-full flex-shrink-0">
                                    <User className="h-4 w-4 text-gray-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <p className="font-medium text-gray-900 text-sm">
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
                                    <p className="text-xs text-gray-600 truncate">{solicitud.email}</p>
                                    <p className="text-xs text-gray-500">
                                      {solicitud.id_type}: {solicitud.id_number}
                                    </p>
                                  </div>
                                </div>
                                {/* Botones de acción en móvil - En lugar del menú flotante */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    onClick={() => handleViewDetails(solicitud)}
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                    Ver
                                  </Button>
                                  {can('requests.respond') && (solicitud.status === "pending" || solicitud.status === "in_progress") && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 text-xs"
                                      onClick={() => handleOpenResponseDialog(solicitud)}
                                    >
                                      <Send className="h-3.5 w-3.5 mr-1" />
                                      Responder
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Type and ID */}
                              <div className="border-t pt-2">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-medium text-gray-500">Tipo de Solicitud</p>
                                  <p className="text-xs text-gray-500">ID: {solicitud.id}</p>
                                </div>
                                <p className="font-medium text-gray-900 text-sm">
                                  {solicitud.request_type === 'verificacion-pagos' && solicitud.request_subtype ? (
                                    <>
                                      <span>{getRequestTypeLabel(solicitud.request_type)} – </span>
                                      <span className="font-semibold">
                                        {getVerificacionPagosSubtypeLabel(solicitud.request_subtype)}
                                      </span>
                                    </>
                                  ) : (
                                    getRequestTypeLabel(solicitud.request_type)
                                  )}
                                </p>
                              </div>

                              {/* Process and Hospital */}
                              <div className="border-t pt-2">
                                <p className="text-xs font-medium text-gray-500 mb-1">Proceso y Hospital</p>
                                {(() => {
                                  const hasProceso = solicitud.payload?.proceso && String(solicitud.payload.proceso).trim() !== '';
                                  const hasDondeRealiza = solicitud.payload?.dondeRealizaProceso && String(solicitud.payload.dondeRealizaProceso).trim() !== '';
                                  const hasSedeProceso = solicitud.payload?.sedeProceso && String(solicitud.payload.sedeProceso).trim() !== '';
                                  const hasHospital = hasDondeRealiza || hasSedeProceso;
                                  
                                  if (!hasProceso && !hasHospital) {
                                    return <p className="text-xs text-gray-400 italic">No disponible</p>;
                                  }
                                  
                                  return (
                                    <div className="space-y-1">
                                      {hasProceso && (
                                        <p className="text-sm font-medium text-gray-900">
                                          {solicitud.payload.proceso}
                                        </p>
                                      )}
                                      {hasDondeRealiza && (
                                        <p className="text-xs text-gray-600">
                                          {solicitud.payload.dondeRealizaProceso}
                                        </p>
                                      )}
                                      {!hasDondeRealiza && hasSedeProceso && (
                                        <p className="text-xs text-gray-600">
                                          {solicitud.payload.sedeProceso}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Status and Date */}
                              <div className="border-t pt-2">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className={getStatusColor(solicitud.status)}>
                                      {getStatusLabel(solicitud.status)}
                                    </Badge>
                                    {requiresManualValidation(solicitud) && (
                                      <span 
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                                          isRequestValidated(solicitud) 
                                            ? "bg-green-50 text-green-700 border border-green-200" 
                                            : "bg-orange-50 text-orange-700 border border-orange-200"
                                        }`}
                                      >
                                        {isRequestValidated(solicitud) ? (
                                          <>
                                            <CheckCircle className="h-3 w-3" />
                                            Validada
                                          </>
                                        ) : (
                                          <>
                                            <Clock className="h-3 w-3" />
                                            Sin Validar
                                          </>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-900 font-medium">
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
                                  </div>
                                </div>
                                {solicitud.status === "resolved" && solicitud.resolved_at && (
                                  <p className="text-xs text-green-600 font-medium mt-2">
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
                                  <div className="mt-2 space-y-1">
                                    <p className="text-xs text-red-600 font-medium">
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
                                    {solicitud.rejection_reason && (
                                      <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2 mt-1">
                                        <p className="font-medium mb-1">Razón de rechazo:</p>
                                        <p className="text-gray-700 whitespace-pre-wrap break-words">{getRejectionReasonLabel(solicitud.rejection_reason)}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
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

          {/* Bulk Response Template Dialog */}
          {can('requests.respond') && (
            <BulkResponseTemplateDialog
              open={bulkTemplateDialogOpen}
              onOpenChange={setBulkTemplateDialogOpen}
              existingRequestTypes={existingRequestTypes}
              getRequestTypeLabel={getRequestTypeLabel}
            />
          )}

          {/* Bulk Response Process Dialog */}
          {can('requests.respond') && (
            <BulkResponseProcessDialog
              open={bulkProcessDialogOpen}
              onOpenChange={setBulkProcessDialogOpen}
              onSuccess={() => {
                // Refrescar los datos después de procesar respuestas masivas
                refetch();
                refetchPendingUpdates();
              }}
            />
          )}

          {/* Request Details Dialog */}
          {selectedSolicitud && (
            <Dialog open={!!selectedSolicitud} onOpenChange={() => {
              if (!isTransitioningRequest) {
                setSelectedSolicitud(null);
                setIsTransitioningRequest(false);
                // Resetear campos expandidos al cerrar el diálogo
                setExpandedFields({});
                // Resetear subtipo seleccionado y colapsar sección
                setSelectedSubtype("");
                setIsSubtypeRedirectOpen(false);
              }
            }}>
              <DialogContent className="max-sm:inset-x-4 sm:w-full sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
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
                <div className="bg-white min-h-full w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-b border-gray-200 w-full">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary-prosalud/10 p-2 rounded-lg flex-shrink-0">
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary-prosalud" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                          Detalles de Solicitud #{selectedSolicitud.id}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600">Información completa de la solicitud</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 w-full overflow-x-hidden">
                    {/* Redirección de Subtipo (compacta) - Visible al inicio para fácil acceso */}
                    {selectedSolicitud.request_type === 'verificacion-pagos' && 
                     (selectedSolicitud.status === 'pending' || selectedSolicitud.status === 'in_progress') && (
                      <Collapsible 
                        open={isSubtypeRedirectOpen} 
                        onOpenChange={setIsSubtypeRedirectOpen}
                        className="border border-blue-200 rounded-lg bg-blue-50"
                      >
                        <CollapsibleTrigger className="flex w-full items-center justify-between p-3 hover:bg-blue-100 transition-colors rounded-lg">
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">
                              Redirección de Subtipo
                            </span>
                            <span className="text-xs text-blue-700/80">(Corrección)</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-blue-600 transition-transform duration-200 ${isSubtypeRedirectOpen ? 'rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-3 pb-3 space-y-3">
                          <p className="mt-2 text-xs text-blue-800/90">
                            Use esta opción cuando el afiliado eligió un subtipo incorrecto.
                          </p>
                          
                          {/* Subtipo Actual */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-blue-900">Subtipo Actual</label>
                            <div className="bg-white p-2 rounded-md border border-blue-200">
                              {selectedSolicitud.payload?.solicitudRelacionadaCon ? (
                                <p className="text-sm text-gray-900 break-words">
                                  {(() => {
                                    const currentSubtype = selectedSolicitud.payload.solicitudRelacionadaCon;
                                    const subtypeOption = VERIFICACION_PAGOS_SUBTIPOS.find(
                                      (st) => st.value === currentSubtype
                                    );
                                    return subtypeOption ? subtypeOption.label : currentSubtype;
                                  })()}
                                </p>
                              ) : (
                                <p className="text-xs text-blue-800/80 italic">No especificado</p>
                              )}
                            </div>
                          </div>

                          {/* Selector de Nuevo Subtipo */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-blue-900">
                              Nuevo Subtipo <span className="text-red-500">*</span>
                            </label>
                            <Select
                              value={selectedSubtype}
                              onValueChange={setSelectedSubtype}
                              disabled={isRedirectingSubtype}
                            >
                              <SelectTrigger className="w-full h-9 text-sm bg-white border-blue-200">
                                <SelectValue placeholder="Seleccione el subtipo correcto" />
                              </SelectTrigger>
                              <SelectContent>
                                {VERIFICACION_PAGOS_SUBTIPOS.map((subtype) => {
                                  const isCurrentSubtype = 
                                    selectedSolicitud.payload?.solicitudRelacionadaCon === subtype.value;
                                  return (
                                    <SelectItem
                                      key={subtype.value}
                                      value={subtype.value}
                                      disabled={isCurrentSubtype}
                                    >
                                      {subtype.label}
                                      {isCurrentSubtype && (
                                        <span className="ml-2 text-xs text-gray-500">(Actual)</span>
                                      )}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Botón de Redirección */}
                          <div className="flex justify-end pt-1">
                            <Button
                              onClick={handleRedirectSubtype}
                              disabled={!selectedSubtype || isRedirectingSubtype || selectedSubtype === selectedSolicitud.payload?.solicitudRelacionadaCon}
                              size="sm"
                              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {isRedirectingSubtype ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                  Redirigiendo...
                                </>
                              ) : (
                                <>
                                  <ArrowRight className="h-3 w-3 mr-1.5" />
                                  Redirigir
                                </>
                              )}
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                    {/* Alerta de actualización pendiente */}
                    {selectedSolicitud && 
                     hasPendingUpdate(selectedSolicitud.id_number) &&
                     selectedSolicitud.status !== 'resolved' &&
                     selectedSolicitud.status !== 'rejected' &&
                     selectedSolicitud.request_type !== 'actualizar-datos-personales' && (() => {
                       const pendingUpdate = getPendingUpdate(selectedSolicitud.id_number);
                       // Solo mostrar alerta si la actualización requiere cambio de correo
                       return pendingUpdate && pendingUpdateRequiresEmailChange(pendingUpdate) ? (
                         <PendingDataUpdateAlert
                           pendingUpdate={pendingUpdate}
                           documentNumber={selectedSolicitud.id_number}
                           onViewUpdate={() => {
                             if (pendingUpdate) {
                               const convertedRequest = convertApiRequestToRequest(pendingUpdate);
                               handleViewDetails(convertedRequest);
                             }
                           }}
                           variant="warning"
                         />
                       ) : null;
                     })()}
                    

                    {/* Información del Solicitante */}
                    <Card className="border border-gray-200 shadow-sm w-full overflow-x-hidden">
                      <CardHeader className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                          Información del Solicitante
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 space-y-4 w-full overflow-x-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                          <div className="space-y-2 min-w-0">
                            <label className="text-sm font-medium text-gray-700">Documento</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200 overflow-x-hidden">
                              <p className="text-gray-900 break-words overflow-wrap-anywhere">
                                {selectedSolicitud.id_type} {selectedSolicitud.id_number}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Nombre completo</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200 overflow-x-hidden">
                              <p className="text-gray-900 break-words overflow-wrap-anywhere">
                                {selectedSolicitud.name && selectedSolicitud.last_name
                                  ? `${selectedSolicitud.name} ${selectedSolicitud.last_name}`.trim()
                                  : selectedSolicitud.name || selectedSolicitud.last_name || "No especificado"}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Correo Electrónico</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200 overflow-x-hidden">
                              <p className="text-gray-900 break-words overflow-wrap-anywhere">{selectedSolicitud.email || "No especificado"}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Teléfono</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200 overflow-x-hidden">
                              {/* NOTA: En el panel admin NO se debe ofuscar ningún dato.
                                  Los datos se muestran tal cual vienen del backend.
                                  Si los datos vienen ofuscados del backend, eso es un problema del backend que debe resolverse allí. */}
                              <p className="text-gray-900 break-words overflow-wrap-anywhere">{selectedSolicitud.phone_number || "No especificado"}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Información de la Solicitud */}
                    <Card className="border border-gray-200 shadow-sm w-full overflow-x-hidden">
                      <CardHeader className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                          Información de la Solicitud
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 space-y-4 w-full overflow-x-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                          <div className="space-y-2 min-w-0">
                            <label className="text-sm font-medium text-gray-700">Tipo de Solicitud</label>
                            <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200 overflow-x-hidden">
                              <p className="text-gray-900 break-words overflow-wrap-anywhere">
                                {selectedSolicitud.request_type === 'verificacion-pagos' && selectedSolicitud.request_subtype ? (
                                  <>
                                    <span>{getRequestTypeLabel(selectedSolicitud.request_type)} – </span>
                                    <span className="font-semibold">
                                      {getVerificacionPagosSubtypeLabel(selectedSolicitud.request_subtype)}
                                    </span>
                                  </>
                                ) : (
                                  getRequestTypeLabel(selectedSolicitud.request_type)
                                )}
                              </p>
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
                          {selectedSolicitud.last_status_change && (
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-sm font-medium text-gray-700">
                                Detalle de la última revisión
                              </label>
                              <div className="bg-slate-50 border border-slate-200 rounded-md p-3 md:p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                  <div className="space-y-1">
                                    <p className="text-sm text-gray-900">
                                      De{" "}
                                      <span className="font-semibold">
                                        {getBackendStatusLabel(selectedSolicitud.last_status_change.old_status)}
                                      </span>{" "}
                                      a{" "}
                                      <span className="font-semibold">
                                        {getBackendStatusLabel(selectedSolicitud.last_status_change.new_status)}
                                      </span>
                                    </p>
                                    {selectedSolicitud.last_status_change.reason && (
                                      <p className="text-sm text-gray-800">
                                        Motivo:{" "}
                                        <span className="font-medium">
                                          {selectedSolicitud.last_status_change.reason}
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-1 text-xs md:text-sm text-gray-600">
                                    {(selectedSolicitud.last_status_change.changed_by_name ||
                                      selectedSolicitud.last_status_change.changed_by_email) && (
                                      <p>
                                        Por{" "}
                                        <span className="font-medium">
                                          {selectedSolicitud.last_status_change.changed_by_name ||
                                            "Usuario no disponible"}
                                        </span>
                                        {selectedSolicitud.last_status_change.changed_by_email && (
                                          <>
                                            {" "}
                                            ({selectedSolicitud.last_status_change.changed_by_email})
                                          </>
                                        )}
                                      </p>
                                    )}
                                    <p className="text-xs md:text-sm text-gray-500">
                                      {formatLastStatusChangeDate(selectedSolicitud.last_status_change)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {selectedSolicitud.status === "rejected" && selectedSolicitud.rejection_reason && (
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-sm font-medium text-gray-700">Razón de Rechazo</label>
                              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                <p className="text-gray-900 text-sm whitespace-pre-wrap break-words">
                                  {getRejectionReasonLabel(selectedSolicitud.rejection_reason)}
                                </p>
                              </div>
                            </div>
                          )}
                          {requiresManualValidation(selectedSolicitud) && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Estado de Validación</label>
                              <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span 
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                                      isRequestValidated(selectedSolicitud) 
                                        ? "bg-green-50 text-green-700 border border-green-200" 
                                        : "bg-orange-50 text-orange-700 border border-orange-200"
                                    }`}
                                  >
                                    {isRequestValidated(selectedSolicitud) ? (
                                      <>
                                        <CheckCircle className="h-3 w-3" />
                                        Validada
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="h-3 w-3" />
                                        Sin Validar
                                      </>
                                    )}
                                  </span>
                                  {isRequestValidated(selectedSolicitud) && selectedSolicitud.validated_at && (
                                    <span className="text-xs text-gray-600">
                                      {new Date(selectedSolicitud.validated_at).toLocaleDateString("es-ES", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
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

                    {/* Sección de redirección de subtipo duplicada fue movida al inicio del contenido */}

                    {/* Detalles Específicos */}
                    <Card className="border border-gray-200 shadow-sm w-full overflow-x-hidden">
                      <CardHeader className="bg-gray-50 border-b border-gray-200">
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          Detalles Específicos de la Solicitud
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 w-full overflow-x-hidden">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 w-full overflow-x-hidden">
                          {selectedSolicitud.payload &&
                          typeof selectedSolicitud.payload === "object" &&
                          Object.keys(selectedSolicitud.payload).length > 0 ? (
                            (() => {
                              // Format field name: remove underscores/hyphens and capitalize each word
                              const formatFieldName = (str: string) => {
                                // Mapeo especial para nombres de campos comunes
                                const fieldNameMap: Record<string, string> = {
                                  'proceso': 'Proceso',
                                  'dondeRealizaProceso': 'Hospital',
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
                                  'montoSolicitado': 'Monto Solicitado',
                                  'monto_solicitado': 'Monto Solicitado',
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
                              const formatValue = (val: any, fieldKey?: string): React.ReactNode => {
                                // Handle empty strings - mostrar como "No especificado" pero permitir strings vacíos para campos de proceso
                                if (val === null || val === undefined) {
                                  return "No especificado";
                                }
                                
                                // Handle empty strings - para campos de proceso, mostrar "No especificado" si está vacío
                                if (typeof val === 'string' && val.trim() === '') {
                                  return <span className="text-gray-400 italic">No especificado</span>;
                                }
                                
                                // Formatear Monto Solicitado como dinero COP para solicitudes de microcrédito
                                const isMicrocredito = selectedSolicitud.request_type === 'microcredito' || selectedSolicitud.request_type === 'solicitud-microcredito';
                                const isMontoSolicitado = fieldKey === 'montoSolicitado' || fieldKey === 'monto_solicitado';
                                
                                if (isMicrocredito && isMontoSolicitado) {
                                  // Convertir el valor a número si es string
                                  const numericValue = typeof val === 'string' ? parseFloat(val.replace(/\./g, '')) : Number(val);
                                  
                                  if (!isNaN(numericValue)) {
                                    // Formatear como dinero COP con separadores de miles
                                    const formatted = new Intl.NumberFormat('es-CO', {
                                      style: 'currency',
                                      currency: 'COP',
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0,
                                    }).format(numericValue);
                                    
                                    return <span className="font-semibold text-primary-prosalud">{formatted}</span>;
                                  }
                                }
                                
                                // Transformar tipoDocumento para solicitudes de incapacidades y licencias
                                if (selectedSolicitud.request_type === 'incapacidad-licencia' && 
                                    fieldKey === 'tipoDocumento' && 
                                    typeof val === 'string') {
                                  const tipoDocumentoLabels: Record<string, string> = {
                                    'incapacidad-comun': 'Incapacidad de Origen Común',
                                    'incapacidad-laboral': 'Incapacidad de Origen Laboral',
                                    'licencia-maternidad': 'Licencia de Maternidad',
                                    'licencia-paternidad': 'Licencia de Paternidad',
                                    'licencia-luto': 'Licencia por Luto',
                                    'licencia-calamidad': 'Licencia por Calamidad',
                                    'otro': 'Otro'
                                  };
                                  return tipoDocumentoLabels[val] || val;
                                }

                                // Transformar estadoCivil para solicitudes de actualizar-datos-personales
                                if (selectedSolicitud.request_type === 'actualizar-datos-personales' && 
                                    fieldKey === 'estadoCivil' && 
                                    typeof val === 'string') {
                                  const estadoCivilOption = estadosCiviles.find(ec => ec.value === val);
                                  return estadoCivilOption ? estadoCivilOption.label : val;
                                }

                                // Transformar relacionContactoEmergencia para solicitudes de actualizar-datos-personales
                                if (selectedSolicitud.request_type === 'actualizar-datos-personales' && 
                                    fieldKey === 'relacionContactoEmergencia' && 
                                    typeof val === 'string') {
                                  const relacionOption = relacionesContactoEmergencia.find(rel => rel.value === val);
                                  return relacionOption ? relacionOption.label : val;
                                }

                                // Para solicitudes de incapacidades y licencias, el campo numeroDias siempre debe tratarse como número,
                                // incluso cuando su valor sea 1, para evitar que se muestre como un booleano ("✓ Sí").
                                if (
                                  (selectedSolicitud.request_type === 'incapacidad-licencia') && fieldKey === 'numeroDias'
                                ) {
                                  return String(val);
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
                                  
                                  // Special handling for beneficiarios arrays (nuevos, actuales, eliminados)
                                  if (selectedSolicitud.request_type === 'actualizar-datos-personales' && 
                                      parsedVal.length > 0 && 
                                      parsedVal[0] && 
                                      typeof parsedVal[0] === 'object' &&
                                      ('tipo_documento' in parsedVal[0] || 'documento' in parsedVal[0])) {
                                    // Determinar el tipo de array según el fieldKey
                                    const isEliminados = fieldKey === 'beneficiariosEliminados';
                                    const isActuales = fieldKey === 'beneficiariosActuales';
                                    const isNuevos = fieldKey === 'beneficiariosNuevos';
                                    
                                    const title = isEliminados 
                                      ? `Miembros Eliminados del Grupo Familiar (${parsedVal.length})`
                                      : isActuales
                                      ? `Miembros Actuales Editados del Grupo Familiar (${parsedVal.length})`
                                      : `Nuevos Miembros del Grupo Familiar (${parsedVal.length})`;
                                    
                                    const borderColor = isEliminados 
                                      ? 'border-red-300 bg-red-50'
                                      : isActuales
                                      ? 'border-blue-300 bg-blue-50'
                                      : 'border-gray-200 bg-gray-50';
                                    
                                    return (
                                      <div className="space-y-3">
                                        <p className={`text-xs font-semibold mb-2 ${isEliminados ? 'text-red-700' : isActuales ? 'text-blue-700' : 'text-gray-700'}`}>
                                          {title}
                                          {isEliminados && (
                                            <span className="ml-2 text-red-600 font-bold">⚠️ ELIMINAR</span>
                                          )}
                                        </p>
                                        {parsedVal.map((beneficiario: any, idx: number) => (
                                          <div key={idx} className={`border rounded-lg p-3 ${borderColor}`}>
                                            <div className="grid grid-cols-2 gap-2 text-xs w-full overflow-x-hidden">
                                              <div className="min-w-0 break-words">
                                                <span className="font-medium text-gray-600">Tipo Doc:</span>{' '}
                                                <span className="text-gray-900 break-words">{beneficiario.tipo_documento || 'N/A'}</span>
                                              </div>
                                              <div className="min-w-0 break-words">
                                                <span className="font-medium text-gray-600">Documento:</span>{' '}
                                                <span className="text-gray-900 break-words">{beneficiario.documento || 'N/A'}</span>
                                              </div>
                                              <div className="min-w-0 break-words">
                                                <span className="font-medium text-gray-600">Nombres:</span>{' '}
                                                <span className="text-gray-900 break-words">{beneficiario.nombres || 'N/A'}</span>
                                              </div>
                                              <div className="min-w-0 break-words">
                                                <span className="font-medium text-gray-600">Apellidos:</span>{' '}
                                                <span className="text-gray-900 break-words">{beneficiario.apellidos || 'N/A'}</span>
                                              </div>
                                              {beneficiario.fecha_nacimiento && (
                                                <div className="min-w-0 break-words">
                                                  <span className="font-medium text-gray-600">Fecha Nacimiento:</span>{' '}
                                                  <span className="text-gray-900 break-words">
                                                    {formatDateOnly(beneficiario.fecha_nacimiento || '')}
                                                  </span>
                                                </div>
                                              )}
                                              {beneficiario.parentesco && (
                                                <div className="min-w-0 break-words">
                                                  <span className="font-medium text-gray-600">Parentesco:</span>{' '}
                                                  <span className="text-gray-900 break-words">
                                                    {getParentescoLabel(beneficiario.parentesco || '') || 'N/A'}
                                                  </span>
                                                </div>
                                              )}
                                              {beneficiario.sexo && (
                                                <div className="min-w-0 break-words">
                                                  <span className="font-medium text-gray-600">Sexo:</span>{' '}
                                                  <span className="text-gray-900 break-words">
                                                    {beneficiario.sexo === 'M' ? 'Masculino' : 
                                                     beneficiario.sexo === 'F' ? 'Femenino' : 
                                                     beneficiario.sexo || 'N/A'}
                                                  </span>
                                                </div>
                                              )}
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
                                  className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start py-2 border-b border-gray-100 last:border-b-0 w-full"
                                >
                                  <div className="md:col-span-1 min-w-0">
                                    <label className="text-sm font-medium text-gray-700 break-words">
                                      {formatFieldName(key)}
                                    </label>
                                  </div>
                                  <div className="md:col-span-2 min-w-0">
                                    <div className="bg-[#EFF0FF] p-3 rounded-md border border-gray-200 w-full overflow-x-hidden">
                                      <div className="text-gray-900 text-sm break-words overflow-wrap-anywhere">
                                        {formatValue(value, key)}
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

                                  {/* Responded By */}
                                  {response.responded_by && (
                                    <div className="text-xs text-gray-600 mb-3">
                                      Respondido por: <strong>{response.responded_by.name}</strong>
                                      <span className="text-gray-500"> ({response.responded_by.email})</span>
                                    </div>
                                  )}
                                  
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
                                  <div className="mb-3">
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

                                  {/* Response Attachments */}
                                  {response.attachments && response.attachments.length > 0 && (
                                    <ResponseAttachmentsSection
                                      responseId={response.id}
                                      attachments={response.attachments}
                                      attachmentsCount={response.attachments_count}
                                    />
                                  )}
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
                      <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
                        {/* Botón de validar si requiere validación y no está validada */}
                        {requiresManualValidation(selectedSolicitud) && !isRequestValidated(selectedSolicitud) && (
                          <div>
                            <Alert className="bg-blue-50 border-blue-200 text-blue-800 mb-3">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle className="text-sm font-semibold">Validación Recomendada</AlertTitle>
                              <AlertDescription className="text-xs">
                                Se recomienda validar esta solicitud antes de dar respuesta para verificar que la información y anexos sean correctos.
                              </AlertDescription>
                            </Alert>
                            <Button
                              onClick={() => handleValidateRequest(selectedSolicitud)}
                              disabled={isValidating}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white"
                            >
                              {isValidating ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Validando...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Validar Solicitud
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                        
                        {/* Botón de responder */}
                        {requiresManualCompensaciones(selectedSolicitud) ? (
                          <div className="flex flex-col gap-2">
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
            <DialogContent className="max-sm:inset-x-4 sm:w-full sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 break-words">
                  <div className="inline-flex flex-col items-start gap-2">
                    <span>
                      {useCompensacionesForm
                        ? `Responder con Compensaciones Manuales - Solicitud #${solicitudToRespond?.id}`
                        : `Dar Respuesta a Solicitud #${solicitudToRespond?.id}`
                      }
                    </span>
                    {solicitudToRespond && (
                      <Badge className={getStatusColor(solicitudToRespond.status)}>
                        {getStatusLabel(solicitudToRespond.status)}
                      </Badge>
                    )}
                  </div>
                </DialogTitle>
                <DialogDescription className="text-sm">
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
               solicitudToRespond.request_type !== 'actualizar-datos-personales' && (() => {
                 const pendingUpdate = getPendingUpdate(solicitudToRespond.id_number);
                 // Solo mostrar alerta si la actualización requiere cambio de correo
                 return pendingUpdate && pendingUpdateRequiresEmailChange(pendingUpdate) ? (
                   <PendingDataUpdateAlert
                     pendingUpdate={pendingUpdate}
                     documentNumber={solicitudToRespond.id_number}
                     onViewUpdate={() => {
                       if (pendingUpdate) {
                         const convertedRequest = convertApiRequestToRequest(pendingUpdate);
                         handleCloseResponseDialog();
                         handleViewDetails(convertedRequest);
                       }
                     }}
                     variant="warning"
                   />
                 ) : null;
               })()}

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
                            <p className="text-gray-600 font-medium">Documento:</p>
                            <p className="text-gray-900">
                              {solicitudToRespond.id_type} {solicitudToRespond.id_number}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium">Correo:</p>
                            <p className="text-gray-900">{solicitudToRespond.email}</p>
                          </div>
                            <div>
                              <p className="text-gray-600 font-medium">Tipo de Solicitud:</p>
                              <p className="text-gray-900">
                                {solicitudToRespond.request_type === 'verificacion-pagos' && solicitudToRespond.request_subtype ? (
                                  <>
                                    <span>{getRequestTypeLabel(solicitudToRespond.request_type)} – </span>
                                    <span className="font-semibold">
                                      {getVerificacionPagosSubtypeLabel(solicitudToRespond.request_subtype)}
                                    </span>
                                  </>
                                ) : (
                                  getRequestTypeLabel(solicitudToRespond.request_type)
                                )}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Campos de compensaciones - Solo visible cuando el estado NO es "rejected" */}
                    {responseWithCompensacionesForm.watch('newStatus') !== 'rejected' && (
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Valores de Compensaciones</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Total Basicos */}
                        <FormField
                          control={responseWithCompensacionesForm.control}
                          name="t_basicos"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Basicos</FormLabel>
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
                                Valor de compensación básica (número entero). Si no se ingresa, el sistema consultará si tiene el dato disponible.
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
                              <FormLabel>Total Auxilios</FormLabel>
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
                                Valor de auxilios (número entero). Si no se ingresa, el sistema consultará si tiene el dato disponible.
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
                            {(() => {
                              const t_basicos = responseWithCompensacionesForm.watch('t_basicos');
                              const t_auxilios = responseWithCompensacionesForm.watch('t_auxilios');
                              // Si ambos están vacíos, no mostrar $0
                              if ((t_basicos === undefined || t_basicos === null) && (t_auxilios === undefined || t_auxilios === null)) {
                                return <span className="text-gray-500">—</span>;
                              }
                              const total = (t_basicos ?? 0) + (t_auxilios ?? 0);
                              return `$${total.toLocaleString('es-CO')}`;
                            })()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Total Ingresos = Total Basicos + Total Auxilios
                        </p>
                      </div>
                    </div>
                    )}

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

                    {/* Razón de Rechazo - Solo visible cuando el estado es "rejected" */}
                    {responseWithCompensacionesForm.watch('newStatus') === 'rejected' && (
                      <div className="space-y-4">
                        <FormField
                          control={responseWithCompensacionesForm.control}
                          name="rejection_reason"
                          render={({ field }) => {
                            // Determinar si es microcrédito para mostrar opción "otros"
                            const isMicrocredito = solicitudToRespond?.request_type === 'microcredito' || solicitudToRespond?.request_type === 'solicitud-microcredito';
                            
                            // Filtrar opciones: mostrar "otros" solo para microcrédito
                            const availableOptions = isMicrocredito 
                              ? REJECTION_REASON_OPTIONS 
                              : REJECTION_REASON_OPTIONS.filter(opt => opt.value !== 'otros');
                            
                            return (
                              <FormItem>
                                <FormLabel>Razón de Rechazo *</FormLabel>
                                <Select onValueChange={(value) => {
                                  field.onChange(value);
                                  // Limpiar el campo de texto cuando se cambia la razón
                                  if (value !== 'otros') {
                                    responseWithCompensacionesForm.setValue('rejection_reason_otros', '');
                                  }
                                }} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccione la razón de rechazo" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {availableOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  La razón de rechazo es obligatoria cuando se rechaza una solicitud.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                        {/* Campo de texto para "otros" - Solo visible cuando se selecciona "otros" y es microcrédito */}
                        {responseWithCompensacionesForm.watch('rejection_reason') === 'otros' && (
                          <FormField
                            control={responseWithCompensacionesForm.control}
                            name="rejection_reason_otros"
                            render={({ field }) => {
                              const currentLength = field.value?.length || 0;
                              const maxLength = 200;
                              const isNearLimit = currentLength > maxLength * 0.8;
                              const isOverLimit = currentLength > maxLength;
                              
                              return (
                                <FormItem>
                                  <FormLabel>Especifique la razón de rechazo *</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Indique cuál es la razón de rechazo..."
                                      className="min-h-[80px]"
                                      {...field}
                                      maxLength={maxLength}
                                    />
                                  </FormControl>
                                  <div className="flex items-center justify-between">
                                    <FormDescription>
                                      Por favor, especifique la razón de rechazo.
                                    </FormDescription>
                                    <span
                                      className={`text-xs ${
                                        isOverLimit
                                          ? 'text-red-600 font-semibold'
                                          : isNearLimit
                                          ? 'text-orange-600'
                                          : 'text-gray-500'
                                      }`}
                                    >
                                      {currentLength}/{maxLength}
                                    </span>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                        )}
                      </div>
                    )}

                    {/* Razón de cambio de estado - requerida cuando el estado es "in_progress" */}
                    {responseWithCompensacionesForm.watch('newStatus') === 'in_progress' && (
                      <FormField
                        control={responseWithCompensacionesForm.control}
                        name="statusReason"
                        render={({ field }) => {
                          const currentLength = field.value?.length || 0;
                          const maxLength = 200;
                          const isNearLimit = currentLength > maxLength * 0.8;
                          const isOverLimit = currentLength > maxLength;

                          return (
                            <FormItem>
                              <FormLabel>
                                Razón de cambio de estado a &quot;En Revisión&quot; *
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Explique brevemente por qué la solicitud pasa a En Revisión..."
                                  className="min-h-[80px]"
                                  {...field}
                                  maxLength={maxLength}
                                />
                              </FormControl>
                              <div className="flex items-center justify-between">
                                <FormDescription>
                                  Esta razón se registrará en el historial de la solicitud.
                                </FormDescription>
                                <span
                                  className={`text-xs ${
                                    isOverLimit
                                      ? 'text-red-600 font-semibold'
                                      : isNearLimit
                                      ? 'text-orange-600'
                                      : 'text-gray-500'
                                  }`}
                                >
                                  {currentLength}/{maxLength}
                                </span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    )}

                    {/* Asunto del correo - Solo visible cuando el estado NO es "in_progress" */}
                    {responseWithCompensacionesForm.watch('newStatus') !== 'in_progress' && (
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
                    )}

                    {/* Cuerpo del correo - Texto del mensaje - Solo visible cuando el estado NO es "in_progress" */}
                    {responseWithCompensacionesForm.watch('newStatus') !== 'in_progress' && (
                      <FormField
                        control={responseWithCompensacionesForm.control}
                        name="emailBody"
                        render={({ field }) => {
                      const [pasteError, setPasteError] = useState<string | null>(null);
                      
                      const maxLength = 5000;
                      
                      // Separar el texto normal del HTML de tablas
                      const emailBodyValue = field.value || '';
                      const hasTableHtml = emailBodyValue.includes('<table');
                      let textOnly = '';
                      let tableHtml = '';
                      
                      if (hasTableHtml) {
                        // Encontrar donde empieza la tabla HTML
                        const tableIndex = emailBodyValue.indexOf('<table');
                        // No usar trim() para preservar espacios al final que el usuario pueda estar escribiendo
                        textOnly = emailBodyValue.substring(0, tableIndex);
                        tableHtml = emailBodyValue.substring(tableIndex);
                      } else {
                        textOnly = emailBodyValue;
                      }
                      
                      // Calcular límites basándose solo en el texto (sin la tabla HTML)
                      const textOnlyLength = textOnly.length;
                      const isNearLimit = textOnlyLength > maxLength * 0.8;
                      const isOverLimit = textOnlyLength > maxLength;
                      
                      const handleTextChange = (newText: string) => {
                        // Si hay tabla HTML, mantenerla al final del nuevo texto
                        if (tableHtml) {
                          // Agregar la tabla al final con salto de línea previo
                          // No usar trim() para permitir que el usuario escriba espacios al final
                          const textBeforeTable = newText;
                          // Solo agregar salto de línea si hay texto antes de la tabla
                          field.onChange(textBeforeTable ? textBeforeTable + '\n\n' + tableHtml : tableHtml);
                        } else {
                          field.onChange(newText);
                        }
                      };
                      
                      return (
                        <FormItem>
                          <FormLabel>Cuerpo del Correo *</FormLabel>
                          <div className="space-y-4">
                            {/* Área para escribir el mensaje de texto */}
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Mensaje de texto
                              </Label>
                              {hasTableHtml && (
                                <Alert className="mb-3 bg-amber-50 border-amber-200">
                                  <AlertCircle className="h-4 w-4 text-amber-600" />
                                  <AlertTitle className="text-sm font-semibold text-amber-800">Mensaje bloqueado</AlertTitle>
                                  <AlertDescription className="text-sm text-amber-700">
                                    No puede modificar el mensaje después de agregar la tabla de Excel. Debe terminar el mensaje de texto antes de añadir la tabla. Si necesita modificar el mensaje, elimine la tabla primero.
                                  </AlertDescription>
                                </Alert>
                              )}
                              <FormControl>
                                <Textarea
                                  placeholder={useCompensacionesForm ? "Ej: Adjunto encontrará su certificado de convenio con los valores de compensación solicitados..." : "Escriba aquí el contenido de la respuesta al afiliado..."}
                                  className="min-h-[150px]"
                                  value={textOnly}
                                  onChange={(e) => handleTextChange(e.target.value)}
                                  maxLength={maxLength}
                                  disabled={hasTableHtml}
                                />
                              </FormControl>
                              <div className="flex items-center justify-between mt-2">
                                <FormDescription className="text-xs text-gray-500">
                                  {hasTableHtml ? "Complete el mensaje antes de agregar la tabla" : "Escriba el mensaje de texto antes de agregar la tabla"}
                                </FormDescription>
                                <span className={`text-xs ${isOverLimit ? 'text-red-600 font-semibold' : isNearLimit ? 'text-orange-600' : 'text-gray-500'}`}>
                                  {textOnly.length}/{maxLength}
                                </span>
                              </div>
                            </div>
                            
                            {/* Área separada para pegar contenido de Excel - Solo para microcrédito */}
                            {(solicitudToRespond?.request_type === 'microcredito' || solicitudToRespond?.request_type === 'solicitud-microcredito') && (
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  Tabla de Excel (opcional)
                                </Label>
                                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 bg-gray-50">
                                {tableHtml ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2 text-sm text-green-700">
                                        <Info className="h-4 w-4" />
                                        <span>Vista previa de la tabla (se agregará al final del mensaje)</span>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          // Eliminar la tabla HTML del emailBody
                                          field.onChange(textOnly.trim());
                                        }}
                                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        Eliminar tabla
                                      </Button>
                                    </div>
                                    <div 
                                      className="bg-white p-3 rounded border border-gray-200 overflow-x-auto"
                                      dangerouslySetInnerHTML={{ __html: tableHtml }}
                                    />
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {pasteError && (
                                      <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle className="text-sm font-semibold">Error al procesar tabla</AlertTitle>
                                        <AlertDescription className="text-sm">
                                          {pasteError}
                                        </AlertDescription>
                                      </Alert>
                                    )}
                                    <div
                                      className="min-h-[100px] p-3 bg-white rounded border border-gray-200 cursor-text focus:outline-none focus:ring-2 focus:ring-primary-prosalud focus:border-transparent relative"
                                      tabIndex={0}
                                      onPaste={(e) => {
                                        e.preventDefault();
                                        
                                        // Limpiar error previo
                                        setPasteError(null);
                                        
                                        // Obtener el texto pegado
                                        const pastedText = e.clipboardData.getData('text/plain');
                                        
                                        if (!pastedText.trim()) {
                                          setPasteError('El contenido pegado está vacío. Por favor, copie una tabla de Excel antes de pegar.');
                                          return;
                                        }
                                        
                                        // Convertir el texto pegado a HTML de tabla si es tabular
                                        const convertedTable = convertExcelPasteToHtmlTable(pastedText);
                                        
                                        // Si se convirtió a tabla, agregarla al final del emailBody con salto de línea previo
                                        if (convertedTable.includes('<table')) {
                                          // Preservar el texto actual, solo usar trim() para verificar si hay contenido
                                          const currentText = textOnly;
                                          const newValue = currentText.trim()
                                            ? currentText.trim() + '\n\n\n' + convertedTable
                                            : convertedTable;
                                          field.onChange(newValue);
                                          setPasteError(null);
                                        } else {
                                          // Si no se pudo convertir a tabla, mostrar error y NO agregar al mensaje
                                          setPasteError('El contenido pegado no se pudo convertir a una tabla. Por favor, asegúrese de copiar una tabla completa desde Excel (con múltiples columnas separadas por tabulaciones).');
                                          
                                          // Limpiar el error después de 5 segundos
                                          setTimeout(() => {
                                            setPasteError(null);
                                          }, 5000);
                                        }
                                      }}
                                    >
                                      <div className="text-gray-400 italic pointer-events-none">
                                        Haga clic aquí y pegue el contenido copiado de Excel. La tabla aparecerá automáticamente al final de su mensaje.
                                      </div>
                                    </div>
                                  </div>
                                )}
                                </div>
                              </div>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                      />
                    )}

                    {/* Adjuntar archivos - Solo visible cuando el estado NO es "in_progress" */}
                    {responseWithCompensacionesForm.watch('newStatus') !== 'in_progress' && (
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
                        
                        // Validar tipos de archivo permitidos
                        const invalidTypeFiles = selectedFiles.filter(file => !ALLOWED_RESPONSE_FILE_TYPES.includes(file.type));
                        if (invalidTypeFiles.length > 0) {
                          toast.error("Error al seleccionar archivos", {
                            description: `Los siguientes archivos no son de un tipo permitido (PDF, Word, Excel, imágenes JPG/PNG, ZIP, RAR): ${invalidTypeFiles.map(f => f.name).join(', ')}`,
                            duration: 5000,
                          });
                          e.target.value = '';
                          return;
                        }
                        
                        // Separar archivos comprimidos de no comprimidos
                        const selectedCompressed = selectedFiles.filter(file => isCompressedFile(file));
                        const selectedNonCompressed = selectedFiles.filter(file => !isCompressedFile(file));
                        const currentCompressed = currentFiles.filter(file => isCompressedFile(file));
                        const currentNonCompressed = currentFiles.filter(file => !isCompressedFile(file));
                        
                        // Si hay archivos comprimidos seleccionados o actuales
                        if (selectedCompressed.length > 0 || currentCompressed.length > 0) {
                          // No se puede mezclar comprimidos con otros archivos
                          if (selectedNonCompressed.length > 0 || currentNonCompressed.length > 0) {
                            toast.error("Error al seleccionar archivos", {
                              description: "No se pueden mezclar archivos comprimidos con otros tipos de archivos. Si adjunta un archivo comprimido, debe ser el único archivo.",
                              duration: 5000,
                            });
                            e.target.value = '';
                            return;
                          }
                          
                          // Solo se permite 1 archivo comprimido en total
                          const totalCompressedCount = selectedCompressed.length + currentCompressed.length;
                          if (totalCompressedCount > 1) {
                            toast.error("Error al seleccionar archivos", {
                              description: "Solo se permite adjuntar un archivo comprimido (ZIP o RAR).",
                              duration: 4000,
                            });
                            e.target.value = '';
                            return;
                          }
                          
                          // Validar tamaño del archivo comprimido (20 MB)
                          const compressedFileToCheck = selectedCompressed.length > 0 ? selectedCompressed[0] : currentCompressed[0];
                          if (compressedFileToCheck && compressedFileToCheck.size > MAX_COMPRESSED_FILE_SIZE) {
                            toast.error("Error al seleccionar archivos", {
                              description: `El archivo comprimido "${compressedFileToCheck.name}" excede el tamaño máximo de ${MAX_COMPRESSED_FILE_SIZE / (1024 * 1024)}MB.`,
                              duration: 5000,
                            });
                            e.target.value = '';
                            return;
                          }
                        } else {
                          // Si no hay comprimidos, validar archivos normales
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
                          
                          // Validar tamaño de archivos normales (4 MB)
                          const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
                          if (oversizedFiles.length > 0) {
                            toast.error("Error al seleccionar archivos", {
                              description: `Los siguientes archivos exceden el tamaño máximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB: ${oversizedFiles.map(f => f.name).join(', ')}`,
                              duration: 5000,
                            });
                            e.target.value = '';
                            return;
                          }
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
                            logger.error("Error al optimizar imágenes:", error);
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
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar"
                                    onChange={handleFileChange}
                                    disabled={isOptimizing || files.length >= MAX_FILES || files.some(file => isCompressedFile(file))}
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
                            {(() => {
                              const hasCompressed = files.some(file => isCompressedFile(file));
                              if (hasCompressed) {
                                return (
                                  <>
                                    Archivos comprimidos (ZIP, RAR): máximo 1 archivo de {MAX_COMPRESSED_FILE_SIZE / (1024 * 1024)}MB. No se pueden mezclar con otros tipos de archivos.
                                  </>
                                );
                              }
                              return (
                                <>
                                  Puede adjuntar máximo {MAX_FILES} archivos {files.length > 0 && `(${files.length}/${MAX_FILES} adjuntados)`}. Cada archivo no debe exceder {MAX_FILE_SIZE / (1024 * 1024)}MB.
                                  Tipos permitidos: PDF, Word, Excel, imágenes (JPG, PNG), archivos comprimidos (ZIP, RAR).
                                  {files.length >= MAX_FILES && (
                                    <span className="block mt-1 text-amber-600 font-medium">
                                      Límite alcanzado. Elimine archivos para agregar más.
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </FormDescription>
                          {hasFiles && (
                            <div className="mt-2 space-y-2">
                              {files.map((file, index) => {
                                const fileSizeMB = file.size / (1024 * 1024);
                                const isCompressed = isCompressedFile(file);
                                const maxSizeForFile = isCompressed ? MAX_COMPRESSED_FILE_SIZE : MAX_FILE_SIZE;
                                const isOversized = file.size > maxSizeForFile;
                                
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
                    )}

                    {/* Botones de acción */}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseResponseDialog}
                        disabled={isSubmittingResponse}
                        className="w-full sm:w-auto"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmittingResponse}
                        className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white w-full sm:w-auto"
                      >
                        {(() => {
                          const currentStatus = responseWithCompensacionesForm.watch('newStatus');
                          const isRejected = currentStatus === 'rejected';
                          const isInProgress = currentStatus === 'in_progress';
                          
                          return isSubmittingResponse ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              {isInProgress ? 'Actualizando estado...' : isRejected ? 'Enviando...' : 'Generando certificado...'}
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              {isInProgress ? 'Actualizar Estado' : isRejected ? 'Enviar Respuesta' : 'Generar Certificado y Enviar'}
                            </>
                          );
                        })()}
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
                            <p className="text-gray-600 font-medium">Documento:</p>
                            <p className="text-gray-900">
                              {solicitudToRespond.id_type} {solicitudToRespond.id_number}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium">Correo:</p>
                            <p className="text-gray-900">{solicitudToRespond.email}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium">Tipo de Solicitud:</p>
                            <p className="text-gray-900">
                              {solicitudToRespond.request_type === 'verificacion-pagos' && solicitudToRespond.request_subtype ? (
                                <>
                                  <span>{getRequestTypeLabel(solicitudToRespond.request_type)} – </span>
                                  <span className="font-semibold">
                                    {getVerificacionPagosSubtypeLabel(solicitudToRespond.request_subtype)}
                                  </span>
                                </>
                              ) : (
                                getRequestTypeLabel(solicitudToRespond.request_type)
                              )}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                    {/* Información específica para solicitudes de microcrédito */}
                    {solicitudToRespond && (solicitudToRespond.request_type === 'microcredito' || solicitudToRespond.request_type === 'solicitud-microcredito') && (
                      <Card className="border border-blue-200 bg-blue-50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-2 mb-3">
                            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-blue-900 mb-3">
                                Información del Microcrédito
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-blue-700 font-medium mb-1">Monto Solicitado:</p>
                                  <p className="text-blue-900 font-bold text-lg">
                                    {(() => {
                                      const payload = solicitudToRespond.payload || {};
                                      const monto = payload.montoSolicitado || payload.monto_solicitado;
                                      if (monto !== null && monto !== undefined) {
                                        const numericValue = typeof monto === 'string' ? parseFloat(monto.replace(/\./g, '')) : Number(monto);
                                        if (!isNaN(numericValue)) {
                                          return new Intl.NumberFormat('es-CO', {
                                            style: 'currency',
                                            currency: 'COP',
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                          }).format(numericValue);
                                        }
                                      }
                                      return 'No especificado';
                                    })()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-blue-700 font-medium mb-1">Número de Cuotas:</p>
                                  <p className="text-blue-900 font-bold text-lg">
                                    {(() => {
                                      const payload = solicitudToRespond.payload || {};
                                      const cuotas = payload.numeroCuotas || payload.numero_cuotas;
                                      if (cuotas !== null && cuotas !== undefined) {
                                        return `${cuotas} ${cuotas === 1 ? 'cuota' : 'cuotas'}`;
                                      }
                                      return 'No especificado';
                                    })()}
                                  </p>
                                </div>
                              </div>
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

                    {/* Razón de Rechazo - Solo visible cuando el estado es "rejected" */}
                    {responseForm.watch('newStatus') === 'rejected' && (
                      <div className="space-y-4">
                        <FormField
                          control={responseForm.control}
                          name="rejection_reason"
                          render={({ field }) => {
                            // Determinar si es microcrédito para mostrar opción "otros"
                            const isMicrocredito = solicitudToRespond?.request_type === 'microcredito' || solicitudToRespond?.request_type === 'solicitud-microcredito';
                            
                            // Filtrar opciones: mostrar "otros" solo para microcrédito
                            const availableOptions = isMicrocredito 
                              ? REJECTION_REASON_OPTIONS 
                              : REJECTION_REASON_OPTIONS.filter(opt => opt.value !== 'otros');
                            
                            return (
                              <FormItem>
                                <FormLabel>Razón de Rechazo *</FormLabel>
                                <Select onValueChange={(value) => {
                                  field.onChange(value);
                                  // Limpiar el campo de texto cuando se cambia la razón
                                  if (value !== 'otros') {
                                    responseForm.setValue('rejection_reason_otros', '');
                                  }
                                }} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccione la razón de rechazo" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {availableOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  La razón de rechazo es obligatoria cuando se rechaza una solicitud.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                        {/* Campo de texto para "otros" - Solo visible cuando se selecciona "otros" y es microcrédito */}
                        {responseForm.watch('rejection_reason') === 'otros' && (
                          <FormField
                            control={responseForm.control}
                            name="rejection_reason_otros"
                            render={({ field }) => {
                              const currentLength = field.value?.length || 0;
                              const maxLength = 200;
                              const isNearLimit = currentLength > maxLength * 0.8;
                              const isOverLimit = currentLength > maxLength;
                              
                              return (
                                <FormItem>
                                  <FormLabel>Especifique la razón de rechazo *</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Indique cuál es la razón de rechazo..."
                                      className="min-h-[80px]"
                                      {...field}
                                      maxLength={maxLength}
                                    />
                                  </FormControl>
                                  <div className="flex items-center justify-between">
                                    <FormDescription>
                                      Por favor, especifique la razón de rechazo.
                                    </FormDescription>
                                    <span
                                      className={`text-xs ${
                                        isOverLimit
                                          ? 'text-red-600 font-semibold'
                                          : isNearLimit
                                          ? 'text-orange-600'
                                          : 'text-gray-500'
                                      }`}
                                    >
                                      {currentLength}/{maxLength}
                                    </span>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                        )}
                      </div>
                    )}

                    {/* Razón de cambio de estado - requerida cuando el estado es "in_progress" */}
                    {responseForm.watch('newStatus') === 'in_progress' && (
                      <FormField
                        control={responseForm.control}
                        name="statusReason"
                        render={({ field }) => {
                          const currentLength = field.value?.length || 0;
                          const maxLength = 200;
                          const isNearLimit = currentLength > maxLength * 0.8;
                          const isOverLimit = currentLength > maxLength;

                          return (
                            <FormItem>
                              <FormLabel>
                                Razón de cambio de estado a &quot;En Revisión&quot; *
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Explique brevemente por qué la solicitud pasa a En Revisión..."
                                  className="min-h-[80px]"
                                  {...field}
                                  maxLength={maxLength}
                                />
                              </FormControl>
                              <div className="flex items-center justify-between">
                                <FormDescription>
                                  Esta razón se registrará en el historial de la solicitud.
                                </FormDescription>
                                <span
                                  className={`text-xs ${
                                    isOverLimit
                                      ? 'text-red-600 font-semibold'
                                      : isNearLimit
                                      ? 'text-orange-600'
                                      : 'text-gray-500'
                                  }`}
                                >
                                  {currentLength}/{maxLength}
                                </span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    )}

                    {/* Asunto del correo - Solo visible cuando el estado NO es "in_progress" */}
                    {responseForm.watch('newStatus') !== 'in_progress' && (
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
                    )}

                    {/* Cuerpo del correo - Texto del mensaje - Solo visible cuando el estado NO es "in_progress" */}
                    {responseForm.watch('newStatus') !== 'in_progress' && (
                      <FormField
                        control={responseForm.control}
                        name="emailBody"
                        render={({ field }) => {
                      const [pasteError, setPasteError] = useState<string | null>(null);
                      
                      const maxLength = 5000;
                      
                      // Separar el texto normal del HTML de tablas
                      const emailBodyValue = field.value || '';
                      const hasTableHtml = emailBodyValue.includes('<table');
                      let textOnly = '';
                      let tableHtml = '';
                      
                      if (hasTableHtml) {
                        // Encontrar donde empieza la tabla HTML
                        const tableIndex = emailBodyValue.indexOf('<table');
                        // No usar trim() para preservar espacios al final que el usuario pueda estar escribiendo
                        textOnly = emailBodyValue.substring(0, tableIndex);
                        tableHtml = emailBodyValue.substring(tableIndex);
                      } else {
                        textOnly = emailBodyValue;
                      }
                      
                      // Calcular límites basándose solo en el texto (sin la tabla HTML)
                      const textOnlyLength = textOnly.length;
                      const isNearLimit = textOnlyLength > maxLength * 0.8;
                      const isOverLimit = textOnlyLength > maxLength;
                      
                      const handleTextChange = (newText: string) => {
                        // Si hay tabla HTML, mantenerla al final del nuevo texto
                        if (tableHtml) {
                          // Agregar la tabla al final con salto de línea previo
                          // No usar trim() para permitir que el usuario escriba espacios al final
                          const textBeforeTable = newText;
                          // Solo agregar salto de línea si hay texto antes de la tabla
                          field.onChange(textBeforeTable ? textBeforeTable + '\n\n' + tableHtml : tableHtml);
                        } else {
                          field.onChange(newText);
                        }
                      };
                      
                      return (
                        <FormItem>
                          <FormLabel>Cuerpo del Correo *</FormLabel>
                          <div className="space-y-4">
                            {/* Área para escribir el mensaje de texto */}
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Mensaje de texto
                              </Label>
                              {hasTableHtml && (
                                <Alert className="mb-3 bg-amber-50 border-amber-200">
                                  <AlertCircle className="h-4 w-4 text-amber-600" />
                                  <AlertTitle className="text-sm font-semibold text-amber-800">Mensaje bloqueado</AlertTitle>
                                  <AlertDescription className="text-sm text-amber-700">
                                    No puede modificar el mensaje después de agregar la tabla de Excel. Debe terminar el mensaje de texto antes de añadir la tabla. Si necesita modificar el mensaje, elimine la tabla primero.
                                  </AlertDescription>
                                </Alert>
                              )}
                              <FormControl>
                                <Textarea
                                  placeholder="Escriba aquí el contenido de la respuesta al afiliado..."
                                  className="min-h-[150px]"
                                  value={textOnly}
                                  onChange={(e) => handleTextChange(e.target.value)}
                                  maxLength={maxLength}
                                  disabled={hasTableHtml}
                                />
                              </FormControl>
                              <div className="flex items-center justify-between mt-2">
                                <FormDescription className="text-xs text-gray-500">
                                  {hasTableHtml ? "Complete el mensaje antes de agregar la tabla" : "Escriba el mensaje de texto antes de agregar la tabla"}
                                </FormDescription>
                                <span className={`text-xs ${isOverLimit ? 'text-red-600 font-semibold' : isNearLimit ? 'text-orange-600' : 'text-gray-500'}`}>
                                  {textOnly.length}/{maxLength}
                                </span>
                              </div>
                            </div>
                            
                            {/* Área separada para pegar contenido de Excel - Solo para microcrédito */}
                            {(solicitudToRespond?.request_type === 'microcredito' || solicitudToRespond?.request_type === 'solicitud-microcredito') && (
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  Tabla de Excel (opcional)
                                </Label>
                                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 bg-gray-50">
                                {tableHtml ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2 text-sm text-green-700">
                                        <Info className="h-4 w-4" />
                                        <span>Vista previa de la tabla (se agregará al final del mensaje)</span>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          // Eliminar la tabla HTML del emailBody
                                          field.onChange(textOnly.trim());
                                        }}
                                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        Eliminar tabla
                                      </Button>
                                    </div>
                                    <div 
                                      className="bg-white p-3 rounded border border-gray-200 overflow-x-auto"
                                      dangerouslySetInnerHTML={{ __html: tableHtml }}
                                    />
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {pasteError && (
                                      <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle className="text-sm font-semibold">Error al procesar tabla</AlertTitle>
                                        <AlertDescription className="text-sm">
                                          {pasteError}
                                        </AlertDescription>
                                      </Alert>
                                    )}
                                    <div
                                      className="min-h-[100px] p-3 bg-white rounded border border-gray-200 cursor-text focus:outline-none focus:ring-2 focus:ring-primary-prosalud focus:border-transparent relative"
                                      tabIndex={0}
                                      onPaste={(e) => {
                                        e.preventDefault();
                                        
                                        // Limpiar error previo
                                        setPasteError(null);
                                        
                                        // Obtener el texto pegado
                                        const pastedText = e.clipboardData.getData('text/plain');
                                        
                                        if (!pastedText.trim()) {
                                          setPasteError('El contenido pegado está vacío. Por favor, copie una tabla de Excel antes de pegar.');
                                          return;
                                        }
                                        
                                        // Convertir el texto pegado a HTML de tabla si es tabular
                                        const convertedTable = convertExcelPasteToHtmlTable(pastedText);
                                        
                                        // Si se convirtió a tabla, agregarla al final del emailBody con salto de línea previo
                                        if (convertedTable.includes('<table')) {
                                          // Preservar el texto actual, solo usar trim() para verificar si hay contenido
                                          const currentText = textOnly;
                                          const newValue = currentText.trim()
                                            ? currentText.trim() + '\n\n\n' + convertedTable
                                            : convertedTable;
                                          field.onChange(newValue);
                                          setPasteError(null);
                                        } else {
                                          // Si no se pudo convertir a tabla, mostrar error y NO agregar al mensaje
                                          setPasteError('El contenido pegado no se pudo convertir a una tabla. Por favor, asegúrese de copiar una tabla completa desde Excel (con múltiples columnas separadas por tabulaciones).');
                                          
                                          // Limpiar el error después de 5 segundos
                                          setTimeout(() => {
                                            setPasteError(null);
                                          }, 5000);
                                        }
                                      }}
                                    >
                                      <div className="text-gray-400 italic pointer-events-none">
                                        Haga clic aquí y pegue el contenido copiado de Excel. La tabla aparecerá automáticamente al final de su mensaje.
                                      </div>
                                    </div>
                                  </div>
                                )}
                                </div>
                              </div>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                      />
                    )}

                    {requiresFondoPensionesAnnex && responseForm.watch('newStatus') !== 'in_progress' && (
                      <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="text-sm font-semibold">Anexo requerido</AlertTitle>
                        <AlertDescription className="text-xs">
                          Es requerido adjuntar las planillas de pagos de seguridad social para certificados dirigidos a fondo de pensiones.
                        </AlertDescription>
                      </Alert>
                    )}

                    {requiresActividadesForm && responseForm.watch('newStatus') !== 'rejected' && responseForm.watch('newStatus') !== 'in_progress' && (
                      <FormField
                        control={responseForm.control}
                        name="actividades"
                        render={({ field }) => {
                          const actividades = field.value || [];
                          
                          // Función para parsear texto pegado en actividades
                          const parsearActividadesDesdeTexto = (texto: string): string[] => {
                            if (!texto || texto.trim() === "") return [];
                            
                            // Normalizar el texto: dividir en líneas pero mantener el contenido
                            const lineas = texto.split(/\r?\n/).map(linea => linea.trim()).filter(linea => linea.length > 0);
                            
                            if (lineas.length === 0) return [];
                            
                            // Función para detectar si una línea tiene un prefijo de lista
                            const tienePrefijoLista = (linea: string): boolean => {
                              // Verificar si empieza con número seguido de punto o paréntesis (1., 2), etc.)
                              if (/^[\d]+[.)]\s/.test(linea)) return true;
                              // Verificar si empieza con letra seguida de punto o paréntesis (a., b), etc.)
                              if (/^[a-zA-Z][.)]\s/.test(linea)) return true;
                              // Verificar si empieza con viñetas comunes
                              if (/^[-•*▪▫○●]\s/.test(linea)) return true;
                              // Verificar otros caracteres de viñeta Unicode
                              if (/^[\u2022\u2023\u25E6\u2043]\s/.test(linea)) return true;
                              return false;
                            };
                            
                            // Función para remover el prefijo de lista de una línea
                            const removerPrefijo = (linea: string): string => {
                              return linea
                                .replace(/^[\d]+[.)]\s*/, '') // Remover "1.", "2)", etc.
                                .replace(/^[a-zA-Z][.)]\s*/, '') // Remover "a.", "b)", etc.
                                .replace(/^[-•*▪▫○●]\s*/, '') // Remover viñetas comunes
                                .replace(/^[\u2022\u2023\u25E6\u2043]\s*/, '') // Remover otros caracteres de viñeta Unicode
                                .trim();
                            };
                            
                            const actividadesParseadas: string[] = [];
                            let actividadActual: string | null = null;
                            
                            for (const linea of lineas) {
                              if (tienePrefijoLista(linea)) {
                                // Si hay una actividad en construcción, guardarla con un salto de línea adicional al final para separación visual
                                if (actividadActual !== null && actividadActual.trim().length > 0) {
                                  actividadesParseadas.push(actividadActual.trim() + "\n");
                                }
                                // Iniciar una nueva actividad
                                actividadActual = removerPrefijo(linea);
                              } else {
                                // Esta línea no tiene prefijo, es continuación de la actividad anterior
                                if (actividadActual !== null) {
                                  // Agregar esta línea a la actividad actual (con un espacio para unir las líneas)
                                  // Esto elimina los saltos de línea del PDF que ocurren por el ancho de página
                                  actividadActual += " " + linea;
                                } else {
                                  // Si no hay actividad en construcción, esta línea sin prefijo se ignora
                                  // (no consideramos saltos de línea simples como separadores)
                                }
                              }
                            }
                            
                            // Agregar la última actividad si existe, con salto de línea adicional al final
                            if (actividadActual !== null && actividadActual.trim().length > 0) {
                              actividadesParseadas.push(actividadActual.trim() + "\n");
                            }
                            
                            return actividadesParseadas;
                          };
                          
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
                          
                          const limpiarTodasActividades = () => {
                            field.onChange([]);
                            toast.success("Actividades eliminadas", {
                              description: "Todas las actividades han sido eliminadas.",
                              duration: 2000,
                            });
                          };
                          
                          // Función para formatear el texto pegado agregando líneas en blanco entre actividades
                          const formatearTextoConSeparacion = (texto: string): string => {
                            if (!texto || texto.trim() === "") return texto;
                            
                            // Dividir en líneas
                            const lineas = texto.split(/\r?\n/);
                            const lineasFormateadas: string[] = [];
                            
                            // Función para detectar si una línea tiene un prefijo de lista
                            const tienePrefijoLista = (linea: string): boolean => {
                              const lineaTrim = linea.trim();
                              if (!lineaTrim) return false;
                              // Verificar si empieza con número seguido de punto o paréntesis (1., 2), etc.)
                              if (/^[\d]+[.)]\s/.test(lineaTrim)) return true;
                              // Verificar si empieza con letra seguida de punto o paréntesis (a., b), etc.)
                              if (/^[a-zA-Z][.)]\s/.test(lineaTrim)) return true;
                              // Verificar si empieza con viñetas comunes
                              if (/^[-•*▪▫○●]\s/.test(lineaTrim)) return true;
                              // Verificar otros caracteres de viñeta Unicode
                              if (/^[\u2022\u2023\u25E6\u2043]\s/.test(lineaTrim)) return true;
                              return false;
                            };
                            
                            let encontroPrimeraActividad = false;
                            
                            for (let i = 0; i < lineas.length; i++) {
                              const linea = lineas[i];
                              const lineaTrim = linea.trim();
                              
                              // Si la línea tiene prefijo de lista (es una nueva actividad)
                              if (lineaTrim && tienePrefijoLista(linea)) {
                                // Si ya encontramos al menos una actividad antes, agregar línea en blanco
                                if (encontroPrimeraActividad) {
                                  // Verificar que la última línea agregada no sea ya una línea en blanco
                                  const ultimaLinea = lineasFormateadas[lineasFormateadas.length - 1];
                                  if (ultimaLinea && ultimaLinea.trim() !== "") {
                                    lineasFormateadas.push("");
                                  }
                                }
                                encontroPrimeraActividad = true;
                              }
                              
                              lineasFormateadas.push(linea);
                            }
                            
                            return lineasFormateadas.join("\n");
                          };
                          
                          const handlePegarActividades = () => {
                            if (!pasteActividadesText || pasteActividadesText.trim() === "") {
                              toast.error("Texto vacío", {
                                description: "Por favor, pegue el texto con las actividades antes de continuar.",
                                duration: 3000,
                              });
                              return;
                            }
                            
                            const actividadesParseadas = parsearActividadesDesdeTexto(pasteActividadesText);
                            
                            if (actividadesParseadas.length === 0) {
                              toast.error("No se encontraron actividades", {
                                description: "No se pudieron identificar actividades en el texto pegado. Asegúrese de que el texto tenga formato de lista (números, viñetas o saltos de línea).",
                                duration: 4000,
                              });
                              return;
                            }
                            
                            // Agregar las actividades parseadas a las existentes
                            const nuevasActividades = [...actividades, ...actividadesParseadas];
                            field.onChange(nuevasActividades);
                            
                            toast.success("Actividades agregadas", {
                              description: `Se agregaron ${actividadesParseadas.length} actividad(es) exitosamente.`,
                              duration: 3000,
                            });
                            
                            // Limpiar y cerrar el modal
                            setPasteActividadesText("");
                            setShowPasteActividadesModal(false);
                          };
                          
                          const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
                            e.preventDefault();
                            const pastedText = e.clipboardData.getData('text');
                            const textoFormateado = formatearTextoConSeparacion(pastedText);
                            
                            // Agregar al texto existente en lugar de reemplazarlo
                            const textoActual = pasteActividadesText || "";
                            if (textoActual.trim() === "") {
                              // Si no hay texto, simplemente usar el nuevo
                              setPasteActividadesText(textoFormateado);
                            } else {
                              // Si hay texto existente, agregar el nuevo con una separación
                              setPasteActividadesText(textoActual + "\n\n" + textoFormateado);
                            }
                          };
                          
                          return (
                            <FormItem>
                              <FormLabel>Actividades a incluir en el certificado *</FormLabel>
                              <FormDescription className="mb-3">
                                Agregue las actividades realizadas que se incluirán en el certificado. Puede agregar tantas actividades como necesite. También puede pegar una lista completa de actividades desde un documento (PDF, Word, etc.).
                              </FormDescription>
                              <div className="space-y-2 max-h-[400px] overflow-y-auto border border-gray-200 rounded-md p-4 bg-gray-50">
                                {actividades.length === 0 ? (
                                  <p className="text-sm text-gray-500 text-center py-4">
                                    No hay actividades agregadas. Haga clic en "Agregar Actividad" o "Pegar Actividades" para comenzar.
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
                                          className="w-full min-h-[90px] resize-y"
                                          rows={3}
                                        />
                                      </div>
                                      <div className="flex-shrink-0 flex items-center gap-1">
                                        {/* Botones de ordenamiento comentados - pueden ser necesarios en el futuro */}
                                        {/* <Button
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
                                        </Button> */}
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
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={agregarActividad}
                                    className="flex-1"
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Agregar Actividad {actividades.length > 0 && `(${actividades.length})`}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowPasteActividadesModal(true)}
                                    className="flex-1"
                                  >
                                    <ClipboardPaste className="h-4 w-4 mr-2" />
                                    Pegar Actividades
                                  </Button>
                                  {actividades.length > 0 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={limpiarTodasActividades}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Limpiar Todas
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <FormMessage />
                              
                              {/* Modal para pegar actividades */}
                              <Dialog open={showPasteActividadesModal} onOpenChange={setShowPasteActividadesModal}>
                                <DialogContent className="max-w-4xl lg:max-w-5xl max-h-[85vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Pegar Actividades desde Texto</DialogTitle>
                                    <DialogDescription>
                                      Pegue aquí el texto con las actividades copiadas desde un PDF, Word u otro documento. El sistema identificará automáticamente cada actividad en la lista.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="paste-textarea">Texto con actividades:</Label>
                                      <Textarea
                                        id="paste-textarea"
                                        value={pasteActividadesText}
                                        onChange={(e) => setPasteActividadesText(e.target.value)}
                                        onPaste={handlePaste}
                                        placeholder="Pegue aquí el texto con las actividades. Puede ser una lista numerada, con viñetas, o simplemente separada por saltos de línea. Ejemplo:&#10;&#10;1. Primera actividad&#10;2. Segunda actividad&#10;3. Tercera actividad"
                                        className="min-h-[300px] mt-2 font-mono text-sm"
                                      />
                                      <p className="text-xs text-gray-500 mt-2">
                                        El sistema detectará automáticamente actividades en listas numeradas (1., 2., 3.) o con viñetas (-, •, *).
                                      </p>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          setPasteActividadesText("");
                                          setShowPasteActividadesModal(false);
                                        }}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        type="button"
                                        onClick={handlePegarActividades}
                                      >
                                        <ClipboardPaste className="h-4 w-4 mr-2" />
                                        Agregar Actividades
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </FormItem>
                          );
                        }}
                      />
                    )}

                    {/* Adjuntar archivos - Solo visible cuando el estado NO es "in_progress" */}
                    {responseForm.watch('newStatus') !== 'in_progress' && (
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
                        
                        // Validar tipos de archivo permitidos
                        const invalidTypeFiles = selectedFiles.filter(file => !ALLOWED_RESPONSE_FILE_TYPES.includes(file.type));
                        if (invalidTypeFiles.length > 0) {
                          toast.error("Error al seleccionar archivos", {
                            description: `Los siguientes archivos no son de un tipo permitido (PDF, Word, Excel, imágenes JPG/PNG, ZIP, RAR): ${invalidTypeFiles.map(f => f.name).join(', ')}`,
                            duration: 5000,
                          });
                          e.target.value = '';
                          return;
                        }
                        
                        // Separar archivos comprimidos de no comprimidos
                        const selectedCompressed = selectedFiles.filter(file => isCompressedFile(file));
                        const selectedNonCompressed = selectedFiles.filter(file => !isCompressedFile(file));
                        const currentCompressed = currentFiles.filter(file => isCompressedFile(file));
                        const currentNonCompressed = currentFiles.filter(file => !isCompressedFile(file));
                        
                        // Si hay archivos comprimidos seleccionados o actuales
                        if (selectedCompressed.length > 0 || currentCompressed.length > 0) {
                          // No se puede mezclar comprimidos con otros archivos
                          if (selectedNonCompressed.length > 0 || currentNonCompressed.length > 0) {
                            toast.error("Error al seleccionar archivos", {
                              description: "No se pueden mezclar archivos comprimidos con otros tipos de archivos. Si adjunta un archivo comprimido, debe ser el único archivo.",
                              duration: 5000,
                            });
                            e.target.value = '';
                            return;
                          }
                          
                          // Solo se permite 1 archivo comprimido en total
                          const totalCompressedCount = selectedCompressed.length + currentCompressed.length;
                          if (totalCompressedCount > 1) {
                            toast.error("Error al seleccionar archivos", {
                              description: "Solo se permite adjuntar un archivo comprimido (ZIP o RAR).",
                              duration: 4000,
                            });
                            e.target.value = '';
                            return;
                          }
                          
                          // Validar tamaño del archivo comprimido (20 MB)
                          const compressedFileToCheck = selectedCompressed.length > 0 ? selectedCompressed[0] : currentCompressed[0];
                          if (compressedFileToCheck && compressedFileToCheck.size > MAX_COMPRESSED_FILE_SIZE) {
                            toast.error("Error al seleccionar archivos", {
                              description: `El archivo comprimido "${compressedFileToCheck.name}" excede el tamaño máximo de ${MAX_COMPRESSED_FILE_SIZE / (1024 * 1024)}MB.`,
                              duration: 5000,
                            });
                            e.target.value = '';
                            return;
                          }
                        } else {
                          // Si no hay comprimidos, validar archivos normales
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
                          
                          // Validar tamaño de archivos normales (4 MB)
                          const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
                          if (oversizedFiles.length > 0) {
                            toast.error("Error al seleccionar archivos", {
                              description: `Los siguientes archivos exceden el tamaño máximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB: ${oversizedFiles.map(f => f.name).join(', ')}`,
                              duration: 5000,
                            });
                            e.target.value = '';
                            return;
                          }
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
                            logger.error("Error al optimizar imágenes:", error);
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
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar"
                                    onChange={handleFileChange}
                                    disabled={isOptimizing || files.length >= MAX_FILES || files.some(file => isCompressedFile(file))}
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
                            {(() => {
                              const hasCompressed = files.some(file => isCompressedFile(file));
                              if (hasCompressed) {
                                return (
                                  <>
                                    Archivos comprimidos (ZIP, RAR): máximo 1 archivo de {MAX_COMPRESSED_FILE_SIZE / (1024 * 1024)}MB. No se pueden mezclar con otros tipos de archivos.
                                  </>
                                );
                              }
                              return (
                                <>
                                  Puede adjuntar máximo {MAX_FILES} archivos {files.length > 0 && `(${files.length}/${MAX_FILES} adjuntados)`}. Cada archivo no debe exceder {MAX_FILE_SIZE / (1024 * 1024)}MB.
                                  Tipos permitidos: PDF, Word, Excel, imágenes (JPG, PNG), archivos comprimidos (ZIP, RAR).
                                  {files.length >= MAX_FILES && (
                                    <span className="block mt-1 text-amber-600 font-medium">
                                      Límite alcanzado. Elimine archivos para agregar más.
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </FormDescription>
                          {hasFiles && (
                            <div className="mt-2 space-y-2">
                              {files.map((file, index) => {
                                const fileSizeMB = file.size / (1024 * 1024);
                                const isCompressed = isCompressedFile(file);
                                const maxSizeForFile = isCompressed ? MAX_COMPRESSED_FILE_SIZE : MAX_FILE_SIZE;
                                const isOversized = file.size > maxSizeForFile;
                                
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
                    )}

                    {/* Botones de acción */}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseResponseDialog}
                        disabled={isSubmittingResponse}
                        className="w-full sm:w-auto"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmittingResponse}
                        className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white w-full sm:w-auto"
                      >
                        {(() => {
                          const currentStatus = responseForm.watch('newStatus');
                          const isInProgress = currentStatus === 'in_progress';
                          
                          return isSubmittingResponse ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              {isInProgress ? 'Actualizando estado...' : 'Enviando...'}
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              {isInProgress ? 'Actualizar Estado' : 'Enviar Respuesta'}
                            </>
                          );
                        })()}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>

          {/* Modal de Confirmación para Microcrédito */}
          <Dialog 
            open={microcreditoConfirmDialogOpen} 
            onOpenChange={(open) => {
              if (!open && !isSubmittingResponse) {
                setMicrocreditoConfirmDialogOpen(false);
                setPendingResponseData(null);
              }
            }}
          >
            <DialogContent className="max-sm:inset-x-4 sm:w-full sm:max-w-lg bg-white p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">
                  Confirmar Respuesta - Microcrédito
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Por favor, verifique la información del microcrédito antes de enviar la respuesta.
                </DialogDescription>
              </DialogHeader>

              {solicitudToRespond && (
                <div className="space-y-4">
                  <Card className="border border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-blue-900 mb-3">
                            Resumen del Microcrédito
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <p className="text-blue-700 font-medium text-sm mb-1">Monto Solicitado:</p>
                              <p className="text-blue-900 font-bold text-xl">
                                {(() => {
                                  const payload = solicitudToRespond.payload || {};
                                  const monto = payload.montoSolicitado || payload.monto_solicitado;
                                  if (monto !== null && monto !== undefined) {
                                    const numericValue = typeof monto === 'string' ? parseFloat(monto.replace(/\./g, '')) : Number(monto);
                                    if (!isNaN(numericValue)) {
                                      return new Intl.NumberFormat('es-CO', {
                                        style: 'currency',
                                        currency: 'COP',
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                      }).format(numericValue);
                                    }
                                  }
                                  return 'No especificado';
                                })()}
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-700 font-medium text-sm mb-1">Número de Cuotas:</p>
                              <p className="text-blue-900 font-bold text-xl">
                                {(() => {
                                  const payload = solicitudToRespond.payload || {};
                                  const cuotas = payload.numeroCuotas || payload.numero_cuotas;
                                  if (cuotas !== null && cuotas !== undefined) {
                                    return `${cuotas} ${cuotas === 1 ? 'cuota' : 'cuotas'}`;
                                  }
                                  return 'No especificado';
                                })()}
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-700 font-medium text-sm mb-1">Nuevo Estado:</p>
                              {pendingResponseData?.newStatus && (
                                <Badge className={getStatusColor(pendingResponseData.newStatus)}>
                                  {getStatusLabel(pendingResponseData.newStatus)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-sm font-semibold text-amber-900">Verificación importante</AlertTitle>
                    <AlertDescription className="text-xs text-amber-800 mt-1">
                      Por favor, confirme que la información mostrada es correcta antes de enviar la respuesta. Esta acción enviará la respuesta al afiliado por correo electrónico.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMicrocreditoConfirmDialogOpen(false);
                    setPendingResponseData(null);
                  }}
                  disabled={isSubmittingResponse}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmMicrocreditoResponse}
                  disabled={isSubmittingResponse}
                  className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white w-full sm:w-auto"
                >
                  {isSubmittingResponse ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Confirmar y Enviar
                    </>
                  )}
                </Button>
              </div>
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
