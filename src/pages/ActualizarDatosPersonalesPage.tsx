import React, { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertCircle, Send, Home, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { submitRequest, saveRequestSuccessData } from '@/services/requestsService';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES_ALL } from '@/components/solicitud-certificado/utils';
import RequireAfiliadoDataUpdateAuth from '@/components/auth/RequireAfiliadoDataUpdateAuth';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import InvisibleRecaptcha, { InvisibleRecaptchaRef } from '@/components/shared/InvisibleRecaptcha';
import { RECAPTCHA_CONFIG } from '@/config/api';
import { logger } from '@/utils/logger';
import { municipios, estadosCiviles, nivelesEducativos, tiposCuenta, bancos, epsList, afpList } from '@/components/actualizar-datos-personales/formOptions';
import { isObfuscated } from '@/utils/obfuscate';

import DatosPersonalesReadOnly from '@/components/shared/DatosPersonalesReadOnly';
import ConfirmacionCorreoSection from '@/components/solicitud-certificado/ConfirmacionCorreoSection';
import AutorizacionDatosSection from '@/components/solicitud-certificado/AutorizacionDatosSection';
import ActualizarDatosPersonalesHeader from '@/components/actualizar-datos-personales/ActualizarDatosPersonalesHeader';
import InformacionImportanteDatosAlert from '@/components/actualizar-datos-personales/InformacionImportanteDatosAlert';
import DatosPersonalesSection from '@/components/actualizar-datos-personales/DatosPersonalesSection';
import NivelEducativoSection from '@/components/actualizar-datos-personales/NivelEducativoSection';
import InformacionBancariaSection from '@/components/actualizar-datos-personales/InformacionBancariaSection';
import EpsAfpSection from '@/components/actualizar-datos-personales/EpsAfpSection';
import BeneficiariosSection from '@/components/actualizar-datos-personales/BeneficiariosSection';

// Funciones de normalización para mapear valores del API a valores del formulario
const normalizeEstadoCivil = (value: string | null | undefined): string => {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  // Mapear valores comunes
  const mapping: Record<string, string> = {
    'soltero': 'soltero',
    'soltera': 'soltero',
    'casado': 'casado',
    'casada': 'casado',
    'divorciado': 'divorciado',
    'divorciada': 'divorciado',
    'viudo': 'viudo',
    'viuda': 'viudo',
    'union libre': 'union_libre',
    'unión libre': 'union_libre',
  };
  return mapping[normalized] || normalized.replace(/\s+/g, '_');
};

const normalizeMunicipio = (value: string | null | undefined): string => {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  // Buscar coincidencia exacta o parcial en la lista de municipios
  const found = municipios.find(m => 
    m.value === normalized || 
    m.label.toLowerCase() === normalized ||
    m.label.toLowerCase().includes(normalized) ||
    normalized.includes(m.value)
  );
  return found?.value || normalized.replace(/\s+/g, '_');
};

const normalizeNivelEducacion = (value: string | null | undefined): string => {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  // Mapear valores comunes
  const mapping: Record<string, string> = {
    'bachiller': 'bachiller',
    'bachillerato': 'bachiller',
    'secundaria': 'bachiller', // Secundaria mapea a bachiller
    'primaria': 'primaria',
    'técnico': 'tecnico',
    'tecnico': 'tecnico',
    'tecnólogo': 'tecnologo',
    'tecnologo': 'tecnologo',
    'universitario': 'profesional',
    'pregrado': 'profesional',
    'profesional': 'profesional',
    'especialización': 'especialista',
    'especializacion': 'especialista',
    'especialista': 'especialista',
    'maestría': 'maestria',
    'maestria': 'maestria',
    'doctorado': 'doctorado',
  };
  return mapping[normalized] || normalized.replace(/\s+/g, '_');
};

const normalizeTipoCuenta = (value: string | null | undefined): string => {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  const mapping: Record<string, string> = {
    'ahorros': 'ahorros',
    'ahorro': 'ahorros',
    'corriente': 'corriente',
  };
  return mapping[normalized] || normalized;
};

const normalizeBanco = (value: string | null | undefined): string => {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  // Buscar coincidencia parcial en la lista de bancos
  const found = bancos.find(b => 
    b.value === normalized ||
    b.label.toLowerCase() === normalized ||
    normalized.includes(b.value) ||
    b.label.toLowerCase().includes(normalized)
  );
  return found?.value || normalized.replace(/\s+/g, '_');
};

const normalizeEps = (value: string | null | undefined): string => {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  // Buscar coincidencia parcial en la lista de EPS
  const found = epsList.find(e => {
    const epsLabel = e.label.toLowerCase();
    const epsValue = e.value.toLowerCase();
    return normalized.includes('sura') && epsValue === 'sura' ||
           normalized.includes('nueva eps') && epsValue === 'nueva_eps' ||
           normalized.includes('sanitas') && epsValue === 'sanitas' ||
           normalized.includes('coomeva') && epsValue === 'coomeva' ||
           normalized.includes('compensar') && epsValue === 'compensar' ||
           normalized.includes('famisanar') && epsValue === 'famisanar' ||
           normalized.includes('savia') && epsValue === 'savia' ||
           normalized.includes('aliansalud') && epsValue === 'aliansalud' ||
           epsValue === normalized ||
           epsLabel === normalized;
  });
  return found?.value || 'otros';
};

const normalizeAfp = (value: string | null | undefined): string => {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  // Buscar coincidencia parcial en la lista de AFP
  const found = afpList.find(a => {
    const afpLabel = a.label.toLowerCase();
    const afpValue = a.value.toLowerCase();
    return normalized.includes('proteccion') && afpValue === 'proteccion' ||
           normalized.includes('porvenir') && afpValue === 'porvenir' ||
           normalized.includes('colfondos') && afpValue === 'colfondos' ||
           normalized.includes('colpension') && afpValue === 'colpensiones' ||
           normalized.includes('old mutual') && afpValue === 'old_mutual' ||
           normalized.includes('skandia') && afpValue === 'skandia' ||
           afpValue === normalized ||
           afpLabel === normalized;
  });
  return found?.value || 'otros';
};

// Función para parsear el campo de contacto de emergencia
// Formato esperado: "nombre - relacion - telefono" o "nombre - telefono"
const parseContactoEmergencia = (value: string | null | undefined): {
  telefono: string;
  nombre: string;
  relacion: string;
} => {
  if (!value || !value.trim()) {
    return { telefono: '', nombre: '', relacion: '' };
  }

  // Dividir por " - " (espacio, guion, espacio) - manejar espacios múltiples
  const parts = value.split(/\s*-\s*/).map(part => part.trim()).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return { telefono: '', nombre: '', relacion: '' };
  }

  // Si hay 3 partes: nombre, relacion, telefono
  if (parts.length >= 3) {
    // El último es el teléfono (solo números), el primero es el nombre, el segundo es la relación
    const lastIsPhone = /^\d+$/.test(parts[parts.length - 1]);
    if (lastIsPhone) {
      return {
      telefono: parts[parts.length - 1] || '',
      nombre: parts[0] || '',
      relacion: parts[1] || '',
      };
    } else {
      // Si el último no es teléfono, intentar detectar cuál es
      // Asumir formato: nombre - relacion - telefono
      return {
        telefono: parts[2] || '',
        nombre: parts[0] || '',
        relacion: parts[1] || '',
      };
    }
  }

  // Si hay 2 partes: puede ser telefono - nombre (sin relacion)
  if (parts.length === 2) {
    // Intentar determinar cuál es teléfono (solo números) y cuál es nombre
    const firstIsPhone = /^\d+$/.test(parts[0]);
    if (firstIsPhone) {
      return {
        telefono: parts[0] || '',
        nombre: parts[1] || '',
        relacion: '',
      };
    } else {
      // Si el primero no es solo números, asumir que es nombre y el segundo teléfono
      const secondIsPhone = /^\d+$/.test(parts[1]);
      if (secondIsPhone) {
        return {
          telefono: parts[1] || '',
          nombre: parts[0] || '',
          relacion: '',
        };
      }
      // Si ninguno es solo números, asumir formato: telefono - nombre
      return {
        telefono: parts[0] || '',
        nombre: parts[1] || '',
        relacion: '',
      };
    }
  }

  // Si solo hay 1 parte, intentar determinar si es teléfono o nombre
  if (parts.length === 1) {
    const isPhone = /^\d+$/.test(parts[0]);
    if (isPhone) {
      return {
        telefono: parts[0] || '',
        nombre: '',
        relacion: '',
      };
    } else {
      return {
        telefono: '',
        nombre: parts[0] || '',
        relacion: '',
      };
    }
  }

  return { telefono: '', nombre: '', relacion: '' };
};

// Función para normalizar la relación de contacto de emergencia
const normalizeRelacionContactoEmergencia = (value: string | null | undefined): string => {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  
  // Mapear valores comunes a los valores del select
  const mapping: Record<string, string> = {
    'conyuge': 'conyuge',
    'cónyuge': 'conyuge',
    'esposo': 'conyuge',
    'esposa': 'conyuge',
    'padre': 'padre',
    'papá': 'padre',
    'papa': 'padre',
    'madre': 'madre',
    'mamá': 'madre',
    'mama': 'madre',
    'hijo': 'hijo',
    'hija': 'hijo', // Ambos mapean a 'hijo' porque el select usa 'Hijo/a'
    'hermano': 'hermano',
    'hermana': 'hermano', // Ambos mapean a 'hermano' porque el select usa 'Hermano/a'
    'abuelo': 'abuelo',
    'abuela': 'abuelo', // Ambos mapean a 'abuelo' porque el select usa 'Abuelo/a'
    'tio': 'tio',
    'tío': 'tio',
    'tia': 'tio', // Ambos mapean a 'tio' porque el select usa 'Tío/a'
    'tía': 'tio',
    'primo': 'primo',
    'prima': 'primo', // Ambos mapean a 'primo' porque el select usa 'Primo/a'
    'amigo': 'amigo',
    'amiga': 'amigo', // Ambos mapean a 'amigo' porque el select usa 'Amigo/a'
    'otro': 'otro',
  };
  
  return mapping[normalized] || normalized.replace(/\s+/g, '_');
};

const ALLOWED_FILE_TYPES_CERTIFICADO = ALLOWED_FILE_TYPES_ALL;

const beneficiarioSchema = z.object({
  tipo_documento: z.string().min(1, 'El tipo de documento es requerido'),
  documento: z.string().min(1, 'El documento es requerido'),
  nombres: z.string().min(1, 'Los nombres son requeridos'),
  apellidos: z.string().min(1, 'Los apellidos son requeridos'),
  fecha_nacimiento: z.string().min(1, 'La fecha de nacimiento es requerida'),
  parentesco: z.string().min(1, 'El parentesco es requerido'),
  sexo: z.string().min(1, 'El sexo es requerido'),
});

// Función para crear el schema dinámico basado en los valores iniciales del afiliado
const createFormSchema = (initialValues: {
  estadoCivil?: string;
  celular?: string;
  tallaUniforme?: string;
  tallaCalzado?: string;
  nombreContactoEmergencia?: string;
  relacionContactoEmergencia?: string;
  telefonoContactoEmergencia?: string;
}) => {
  // Determinar qué campos son requeridos (están vacíos en los datos iniciales)
  const estadoCivilVacio = !initialValues.estadoCivil || initialValues.estadoCivil.trim() === '';
  const celularVacio = !initialValues.celular || initialValues.celular.trim() === '';
  const tallaUniformeVacio = !initialValues.tallaUniforme || initialValues.tallaUniforme.trim() === '';
  const tallaCalzadoVacio = !initialValues.tallaCalzado || initialValues.tallaCalzado.trim() === '';
  const nombreContactoEmergenciaVacio = !initialValues.nombreContactoEmergencia || initialValues.nombreContactoEmergencia.trim() === '';
  const relacionContactoEmergenciaVacio = !initialValues.relacionContactoEmergencia || initialValues.relacionContactoEmergencia.trim() === '';
  const telefonoContactoEmergenciaVacio = !initialValues.telefonoContactoEmergencia || initialValues.telefonoContactoEmergencia.trim() === '';

  return z.object({
    // Datos personales
    // Estado Civil: requerido si está vacío en los datos iniciales
    estadoCivil: estadoCivilVacio 
      ? z.string().min(1, 'El estado civil es requerido')
      : z.string().optional(),
    direccion: z.string().optional(),
    municipio: z.string().optional(),
    telefonoFijo: z.string().optional(),
    // Celular: requerido si está vacío en los datos iniciales
    celular: celularVacio
      ? z.string().min(1, 'El celular es requerido')
      : z.string().optional(),
    correo: z.string()
      .optional()
      .or(z.literal(''))
      .refine(
        (val) => {
          // Si está vacío o undefined, es válido (es opcional)
          if (!val || val.trim() === '') {
            return true;
          }
          // Si el valor está ofuscado (contiene asteriscos), no validar formato de email
          // porque el usuario no lo ha modificado
          if (isObfuscated(val)) {
            return true;
          }
          // Si no está ofuscado, validar que sea un email válido
          return z.string().email().safeParse(val).success;
        },
        {
          message: "El correo electrónico debe ser válido.",
        }
      ),
    // Talla de Uniforme: requerido si está vacío en los datos iniciales
    tallaUniforme: tallaUniformeVacio
      ? z.string().min(1, 'La talla de uniforme es requerida')
      : z.string().optional(),
    // Talla de Calzado: requerido si está vacío en los datos iniciales
    tallaCalzado: tallaCalzadoVacio
      ? z.string().min(1, 'La talla de calzado es requerida')
      : z.string().optional(),
  
    // Contacto de emergencia: requerido si está vacío en los datos iniciales
    nombreContactoEmergencia: nombreContactoEmergenciaVacio
      ? z.string().min(1, 'El nombre del contacto de emergencia es requerido')
      : z.string().optional(),
    relacionContactoEmergencia: relacionContactoEmergenciaVacio
      ? z.string().min(1, 'La relación del contacto de emergencia es requerida')
      : z.string().optional(),
    telefonoContactoEmergencia: telefonoContactoEmergenciaVacio
      ? z.string().min(1, 'El teléfono del contacto de emergencia es requerido')
      : z.string().optional(),
  
  // Nivel educativo (opcional - solo si se quiere actualizar)
  nivelEducativo: z.string().optional(),
  diplomaEducativo: z.any()
    .optional()
    .refine(files => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(files => !files || files.length === 0 || ALLOWED_FILE_TYPES_CERTIFICADO.includes(files?.[0]?.type), 'Se permiten archivos PDF, Word o imágenes (JPG, PNG).'),
  actaGrado: z.any()
    .optional()
    .refine(files => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(files => !files || files.length === 0 || ALLOWED_FILE_TYPES_CERTIFICADO.includes(files?.[0]?.type), 'Se permiten archivos PDF, Word o imágenes (JPG, PNG).'),
  
  // Información bancaria (opcional - solo si se quiere actualizar)
  numeroCuenta: z.string().optional(),
  tipoCuenta: z.string().optional(),
  banco: z.string().optional(),
  certificacionBancaria: z.any()
    .optional()
    .refine(files => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(files => !files || files.length === 0 || ALLOWED_FILE_TYPES_CERTIFICADO.includes(files?.[0]?.type), 'Se permiten archivos PDF, Word o imágenes (JPG, PNG).'),
  
  // EPS y AFP (opcionales - solo si se quiere actualizar)
  eps: z.string().optional(),
  certificadoEps: z.any()
    .optional()
    .refine(files => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(files => !files || files.length === 0 || ALLOWED_FILE_TYPES_CERTIFICADO.includes(files?.[0]?.type), 'Se permiten archivos PDF, Word o imágenes (JPG, PNG).'),
  afp: z.string().optional(),
  certificadoAfp: z.any()
    .optional()
    .refine(files => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(files => !files || files.length === 0 || ALLOWED_FILE_TYPES_CERTIFICADO.includes(files?.[0]?.type), 'Se permiten archivos PDF, Word o imágenes (JPG, PNG).'),
  
    // Beneficiarios nuevos (opcionales)
    beneficiariosNuevos: z.array(beneficiarioSchema).optional().default([]),
    // Beneficiarios actuales editables (opcionales)
    beneficiariosActuales: z.array(beneficiarioSchema).optional().default([]),
  });
};

// Schema por defecto (se actualizará dinámicamente)
const formSchemaActualizarDatosPersonales = createFormSchema({
  estadoCivil: '',
  celular: '',
  tallaUniforme: '',
  tallaCalzado: '',
  nombreContactoEmergencia: '',
  relacionContactoEmergencia: '',
  telefonoContactoEmergencia: '',
});

type FormValuesActualizarDatosPersonales = z.infer<ReturnType<typeof createFormSchema>>;

const ActualizarDatosPersonalesPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { afiliado, getActiveConvenio } = useAfiliadoAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const recaptchaRef = useRef<InvisibleRecaptchaRef>(null);

  const activeConvenio = getActiveConvenio();
  
  // Valores iniciales basados en los datos del afiliado (si están disponibles)
  // Normalizar valores del API para que coincidan con los valores de los selects
  const initialValues = React.useMemo(() => ({
    estadoCivil: normalizeEstadoCivil(afiliado?.estado_civil),
    direccion: afiliado?.direccion || '',
    municipio: normalizeMunicipio(afiliado?.municipio),
    telefonoFijo: afiliado?.telefono || '',
    celular: afiliado?.celular || '',
    correo: afiliado?.correo_personal || '',
    tallaUniforme: afiliado?.talla_uniforme ? afiliado.talla_uniforme.toLowerCase() : '',
    tallaCalzado: afiliado?.talla_calzado || '',
    // Parsear contacto de emergencia: si viene separado, usarlo; si viene combinado, parsearlo
    // Siempre intentar parsear desde contacto_emergencia si existe, ya que el contexto puede no haber parseado
    ...(() => {
      // Si viene combinado, siempre parsearlo (el contexto puede no haber parseado correctamente)
      if (afiliado?.contacto_emergencia) {
        const parsed = parseContactoEmergencia(afiliado.contacto_emergencia);
        const relacionNormalizada = normalizeRelacionContactoEmergencia(parsed.relacion);
        // Usar valores parseados si están disponibles, de lo contrario usar los del contexto
        return {
          nombreContactoEmergencia: parsed.nombre || afiliado?.nombre_contacto_emergencia || '',
          relacionContactoEmergencia: relacionNormalizada || normalizeRelacionContactoEmergencia(afiliado?.relacion_contacto_emergencia),
          telefonoContactoEmergencia: parsed.telefono || afiliado?.telefono_contacto_emergencia || '',
        };
      }
      // Si ya vienen separados del contexto y no hay contacto_emergencia, usarlos
      if (afiliado?.nombre_contacto_emergencia || afiliado?.telefono_contacto_emergencia || afiliado?.relacion_contacto_emergencia) {
        const relacionNormalizada = normalizeRelacionContactoEmergencia(afiliado?.relacion_contacto_emergencia);
        return {
          nombreContactoEmergencia: afiliado?.nombre_contacto_emergencia || '',
          relacionContactoEmergencia: relacionNormalizada,
          telefonoContactoEmergencia: afiliado?.telefono_contacto_emergencia || '',
        };
      }
      // Si no hay nada, valores vacíos
      return {
        nombreContactoEmergencia: '',
        relacionContactoEmergencia: '',
        telefonoContactoEmergencia: '',
      };
    })(),
    nivelEducativo: normalizeNivelEducacion(afiliado?.nivel_educacion),
    diplomaEducativo: undefined,
    actaGrado: undefined,
    numeroCuenta: afiliado?.numero_cuenta || '',
    tipoCuenta: normalizeTipoCuenta(afiliado?.tipo_cuenta),
    banco: normalizeBanco(afiliado?.banco),
    certificacionBancaria: undefined,
    eps: normalizeEps(afiliado?.eps),
    certificadoEps: undefined,
    afp: normalizeAfp(afiliado?.afp),
    certificadoAfp: undefined,
    beneficiariosNuevos: [],
    // Inicializar beneficiarios actuales como editables
    beneficiariosActuales: (afiliado?.beneficiarios || []).map(b => ({
      tipo_documento: b.tipo_documento || '',
      documento: b.documento || '',
      nombres: b.nombres || '',
      apellidos: b.apellidos || '',
      fecha_nacimiento: b.fecha_nacimiento ? (() => {
        // Convertir fecha de formato DD/MM/YYYY o YYYY-MM-DD a YYYY-MM-DD
        const fecha = b.fecha_nacimiento;
        if (fecha.includes('/')) {
          const [day, month, year] = fecha.split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return fecha.split('T')[0]; // Si tiene hora, solo tomar la fecha
      })() : '',
      // Normalizar parentesco a MAYÚSCULA para que coincida con los valores del select
      parentesco: b.parentesco ? (() => {
        const parentescoUpper = b.parentesco.toUpperCase().trim();
        // Mapear valores comunes a los valores del select
        const parentescoMap: Record<string, string> = {
          'MADRE': 'MADRE',
          'PADRE': 'PADRE',
          'HIJA': 'HIJA',
          'HIJO': 'HIJO',
          'CONYUGUE': 'CONYUGUE',
          'CÓNYUGE': 'CONYUGUE',
          'ESPOSO': 'CONYUGUE',
          'ESPOSA': 'CONYUGUE',
          'HIJO_CONYUGUE': 'HIJO_CONYUGUE',
          'HIJA_CONYUGUE': 'HIJA_CONYUGUE',
        };
        return parentescoMap[parentescoUpper] || parentescoUpper;
      })() : '',
      sexo: b.sexo || '',
    })),
  }), [afiliado]);

  // Crear schema dinámico basado en los valores iniciales
  const dynamicSchema = React.useMemo(() => {
    return createFormSchema({
      estadoCivil: initialValues.estadoCivil,
      celular: initialValues.celular,
      tallaUniforme: initialValues.tallaUniforme,
      tallaCalzado: initialValues.tallaCalzado,
      nombreContactoEmergencia: initialValues.nombreContactoEmergencia,
      relacionContactoEmergencia: initialValues.relacionContactoEmergencia,
      telefonoContactoEmergencia: initialValues.telefonoContactoEmergencia,
    });
  }, [initialValues]);

  const form = useForm<FormValuesActualizarDatosPersonales>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: initialValues,
  });

  // Actualizar el resolver cuando cambie el schema dinámico
  React.useEffect(() => {
    form.clearErrors();
    // El resolver se actualiza automáticamente cuando se re-renderiza el componente
    // pero necesitamos asegurarnos de que el form esté sincronizado
  }, [dynamicSchema, form]);

  // Actualizar el formulario cuando cambien los datos del afiliado
  const [isInitializing, setIsInitializing] = React.useState(true);
  React.useEffect(() => {
    if (afiliado) {
      setIsInitializing(true);
      form.reset(initialValues);
      // Pequeño delay para asegurar que el formulario se haya actualizado antes de comparar
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setIsInitializing(true);
    }
  }, [initialValues, form, afiliado]);

  // Determinar qué campos estaban vacíos inicialmente y deben ser diligenciados
  const camposRequeridosPorVacios = React.useMemo(() => {
    const requeridos = new Set<string>();
    if (!initialValues.estadoCivil || initialValues.estadoCivil.trim() === '') {
      requeridos.add('estadoCivil');
    }
    if (!initialValues.celular || initialValues.celular.trim() === '') {
      requeridos.add('celular');
    }
    if (!initialValues.tallaUniforme || initialValues.tallaUniforme.trim() === '') {
      requeridos.add('tallaUniforme');
    }
    if (!initialValues.tallaCalzado || initialValues.tallaCalzado.trim() === '') {
      requeridos.add('tallaCalzado');
    }
    if (!initialValues.nombreContactoEmergencia || initialValues.nombreContactoEmergencia.trim() === '') {
      requeridos.add('nombreContactoEmergencia');
    }
    if (!initialValues.relacionContactoEmergencia || initialValues.relacionContactoEmergencia.trim() === '') {
      requeridos.add('relacionContactoEmergencia');
    }
    if (!initialValues.telefonoContactoEmergencia || initialValues.telefonoContactoEmergencia.trim() === '') {
      requeridos.add('telefonoContactoEmergencia');
    }
    return requeridos;
  }, [initialValues]);

  // Trackear campos modificados comparando valores actuales vs iniciales
  const watchValues = form.watch();
  const modifiedFields = React.useMemo(() => {
    // No comparar mientras se está inicializando para evitar falsos positivos
    if (isInitializing) {
      return new Set<string>();
    }

    const modified: Set<string> = new Set();
    
    Object.keys(initialValues).forEach((key) => {
      const currentValue = watchValues[key as keyof typeof watchValues];
      const initialValue = initialValues[key as keyof typeof initialValues];
      
      // Si el campo estaba vacío inicialmente y ahora tiene valor, considerarlo modificado
      if (camposRequeridosPorVacios.has(key)) {
        const currentStr = String(currentValue || '').trim();
        if (currentStr !== '') {
          modified.add(key);
        }
      }
      
      // Comparar valores (ignorar archivos y valores undefined/empty)
      if (key.includes('Educativo') && !key.includes('diploma') && !key.includes('acta')) {
        // Para nivel educativo, comparar directamente
        const currentStr = String(currentValue || '').trim();
        const initialStr = String(initialValue || '').trim();
        // Solo marcar como modificado si realmente cambió Y ambos tienen valores
        if (currentStr !== initialStr) {
          // Si ambos están vacíos, no es una modificación
          if (currentStr !== '' || initialStr !== '') {
            modified.add(key);
          }
        }
      } else if (key.includes('diploma') || key.includes('acta') || key.includes('certificado') || key.includes('Bancaria')) {
        // Para archivos, considerar modificado si hay un archivo
        if (currentValue && (currentValue as any)?.length > 0) {
          modified.add(key);
        }
      } else {
        // Para campos de texto, comparar strings normalizados
        const currentStr = String(currentValue || '').trim();
        const initialStr = String(initialValue || '').trim();
        // Solo marcar como modificado si el valor actual es diferente al inicial
        // Y no está vacío (a menos que el inicial tuviera un valor)
        if (currentStr !== initialStr) {
          // Si ambos están vacíos, no es una modificación
          if (currentStr !== '' || initialStr !== '') {
            modified.add(key);
          }
        }
      }
    });
    
    return modified;
  }, [watchValues, initialValues, isInitializing, camposRequeridosPorVacios]);

  // Calcular campos modificados sin archivos para deshabilitar el botón
  const camposModificadosSinArchivos = React.useMemo(() => {
    return Array.from(modifiedFields).filter(
      field => !field.includes('diploma') && 
               !field.includes('acta') && 
               !field.includes('certificado') && 
               !field.includes('Bancaria')
    );
  }, [modifiedFields]);

  // Verificar si hay beneficiarios nuevos o actuales editados
  const beneficiariosNuevos = form.watch('beneficiariosNuevos');
  const beneficiariosActuales = form.watch('beneficiariosActuales');
  const tieneBeneficiariosNuevos = beneficiariosNuevos && beneficiariosNuevos.length > 0;
  const tieneBeneficiariosActualesEditados = beneficiariosActuales && beneficiariosActuales.length > 0;

  const onSubmit = async (data: FormValuesActualizarDatosPersonales) => {
    if (!afiliado) return;
    
    // Validar que haya al menos un campo modificado (excluyendo archivos) o beneficiarios nuevos/actuales editados
    // O que se hayan diligenciado los campos requeridos que estaban vacíos
    const tieneBeneficiariosNuevos = data.beneficiariosNuevos && data.beneficiariosNuevos.length > 0;
    const tieneBeneficiariosActualesEditados = data.beneficiariosActuales && data.beneficiariosActuales.length > 0;
    const tieneCamposRequeridosDiligenciados = Array.from(camposRequeridosPorVacios).some(
      campo => {
        const valor = data[campo as keyof typeof data];
        return valor && String(valor).trim() !== '';
      }
    );
    
    if (camposModificadosSinArchivos.length === 0 && !tieneBeneficiariosNuevos && !tieneBeneficiariosActualesEditados && !tieneCamposRequeridosDiligenciados) {
      toast.error('No hay cambios para actualizar', {
        description: 'Debe modificar al menos un campo, agregar o editar miembros al grupo familiar, o completar los campos requeridos (Estado Civil, Celular, Talla de Uniforme, Talla de Calzado, y datos de contacto de emergencia) para enviar la solicitud de actualización.',
        duration: 5000,
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      });
      setIsSubmitting(false);
      return;
    }

    // Validar que si hay archivos adjuntos, sus campos dependientes deben estar modificados
    const hasDiplomaEducativo = data.diplomaEducativo && (data.diplomaEducativo as any)?.length > 0;
    const hasActaGrado = data.actaGrado && (data.actaGrado as any)?.length > 0;
    const hasCertificacionBancaria = data.certificacionBancaria && (data.certificacionBancaria as any)?.length > 0;
    const hasCertificadoEps = data.certificadoEps && (data.certificadoEps as any)?.length > 0;
    const hasCertificadoAfp = data.certificadoAfp && (data.certificadoAfp as any)?.length > 0;

    if (hasDiplomaEducativo && !modifiedFields.has('nivelEducativo')) {
      toast.error('Error de validación', {
        description: 'No puede adjuntar el diploma si no ha modificado el nivel educativo.',
        duration: 5000,
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      });
      setIsSubmitting(false);
      return;
    }

    if (hasActaGrado && !modifiedFields.has('nivelEducativo')) {
      toast.error('Error de validación', {
        description: 'No puede adjuntar el acta de grado si no ha modificado el nivel educativo.',
        duration: 5000,
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      });
      setIsSubmitting(false);
      return;
    }

    if (hasCertificacionBancaria && !modifiedFields.has('numeroCuenta') && !modifiedFields.has('tipoCuenta') && !modifiedFields.has('banco')) {
      toast.error('Error de validación', {
        description: 'No puede adjuntar la certificación bancaria si no ha modificado la información bancaria.',
        duration: 5000,
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      });
      setIsSubmitting(false);
      return;
    }

    if (hasCertificadoEps && !modifiedFields.has('eps')) {
      toast.error('Error de validación', {
        description: 'No puede adjuntar el certificado de EPS si no ha modificado la EPS.',
        duration: 5000,
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      });
      setIsSubmitting(false);
      return;
    }

    if (hasCertificadoAfp && !modifiedFields.has('afp')) {
      toast.error('Error de validación', {
        description: 'No puede adjuntar el certificado de AFP si no ha modificado la AFP.',
        duration: 5000,
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      });
      setIsSubmitting(false);
      return;
    }
    
    // Validar archivos requeridos solo si el campo relacionado fue modificado
    if (modifiedFields.has('nivelEducativo')) {
      if (!data.diplomaEducativo || data.diplomaEducativo.length === 0) {
        form.setError('diplomaEducativo', {
          type: 'manual',
          message: 'Si actualiza el nivel educativo, debe adjuntar el diploma.',
        });
        toast.error('Error de validación', {
          description: 'Si actualiza el nivel educativo, debe adjuntar el diploma.',
        });
        setIsSubmitting(false);
        return;
      }
      if (!data.actaGrado || data.actaGrado.length === 0) {
        form.setError('actaGrado', {
          type: 'manual',
          message: 'Si actualiza el nivel educativo, debe adjuntar el acta de grado.',
        });
        toast.error('Error de validación', {
          description: 'Si actualiza el nivel educativo, debe adjuntar el acta de grado.',
        });
        setIsSubmitting(false);
        return;
      }
    }

    if (modifiedFields.has('numeroCuenta')) {
      if (!data.tipoCuenta || data.tipoCuenta.trim() === '') {
        form.setError('tipoCuenta', {
          type: 'manual',
          message: 'Si actualiza la información bancaria, debe seleccionar el tipo de cuenta.',
        });
        toast.error('Error de validación', {
          description: 'Si actualiza la información bancaria, debe seleccionar el tipo de cuenta.',
        });
        setIsSubmitting(false);
        return;
      }
      if (!data.banco || data.banco.trim() === '') {
        form.setError('banco', {
          type: 'manual',
          message: 'Si actualiza la información bancaria, debe seleccionar el banco.',
        });
        toast.error('Error de validación', {
          description: 'Si actualiza la información bancaria, debe seleccionar el banco.',
        });
        setIsSubmitting(false);
        return;
      }
      if (!data.certificacionBancaria || data.certificacionBancaria.length === 0) {
        form.setError('certificacionBancaria', {
          type: 'manual',
          message: 'Si actualiza la información bancaria, debe adjuntar la certificación bancaria.',
        });
        toast.error('Error de validación', {
          description: 'Si actualiza la información bancaria, debe adjuntar la certificación bancaria.',
        });
        setIsSubmitting(false);
        return;
      }
    }

    if (modifiedFields.has('eps')) {
      if (!data.certificadoEps || data.certificadoEps.length === 0) {
        form.setError('certificadoEps', {
          type: 'manual',
          message: 'Si actualiza la EPS, debe adjuntar el certificado de EPS vigente.',
        });
        toast.error('Error de validación', {
          description: 'Si actualiza la EPS, debe adjuntar el certificado de EPS vigente.',
        });
        setIsSubmitting(false);
        return;
      }
    }

    if (modifiedFields.has('afp')) {
      if (!data.certificadoAfp || data.certificadoAfp.length === 0) {
        form.setError('certificadoAfp', {
          type: 'manual',
          message: 'Si actualiza la AFP, debe adjuntar el certificado de AFP vigente.',
        });
        toast.error('Error de validación', {
          description: 'Si actualiza la AFP, debe adjuntar el certificado de AFP vigente.',
        });
        setIsSubmitting(false);
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      const files: Record<string, File> = {};
      if (data.certificacionBancaria && data.certificacionBancaria.length > 0) {
        files.certificacionBancaria = Array.isArray(data.certificacionBancaria) 
          ? data.certificacionBancaria[0] 
          : (data.certificacionBancaria as FileList)[0];
      }
      if (data.diplomaEducativo && data.diplomaEducativo.length > 0) {
        files.diplomaEducativo = Array.isArray(data.diplomaEducativo) 
          ? data.diplomaEducativo[0] 
          : (data.diplomaEducativo as FileList)[0];
      }
      if (data.actaGrado && data.actaGrado.length > 0) {
        files.actaGrado = Array.isArray(data.actaGrado) 
          ? data.actaGrado[0] 
          : (data.actaGrado as FileList)[0];
      }
      if (data.certificadoEps && data.certificadoEps.length > 0) {
        files.certificadoEps = Array.isArray(data.certificadoEps) 
          ? data.certificadoEps[0] 
          : (data.certificadoEps as FileList)[0];
      }
      if (data.certificadoAfp && data.certificadoAfp.length > 0) {
        files.certificadoAfp = Array.isArray(data.certificadoAfp) 
          ? data.certificadoAfp[0] 
          : (data.certificadoAfp as FileList)[0];
      }

      // Solo incluir campos que fueron modificados por el usuario
      const payload: Record<string, any> = {
        // Campos requeridos del convenio
        proceso: activeConvenio?.proceso || '',
        dondeRealizaProceso: activeConvenio?.cliente || '',
      };

      // Agregar campos que fueron modificados O que estaban vacíos y ahora tienen valor
      if ((modifiedFields.has('estadoCivil') || camposRequeridosPorVacios.has('estadoCivil')) && data.estadoCivil) {
        payload.estadoCivil = data.estadoCivil;
      }
      if (modifiedFields.has('direccion') && data.direccion) {
        payload.direccion = data.direccion;
      }
      if (modifiedFields.has('municipio') && data.municipio) {
        payload.municipio = data.municipio;
      }
      if (modifiedFields.has('telefonoFijo') && data.telefonoFijo) {
        payload.telefonoFijo = data.telefonoFijo;
      }
      if ((modifiedFields.has('celular') || camposRequeridosPorVacios.has('celular')) && data.celular) {
        payload.celular = data.celular;
      }
      if (modifiedFields.has('correo') && data.correo) {
        payload.correo = data.correo;
      }
      if ((modifiedFields.has('tallaUniforme') || camposRequeridosPorVacios.has('tallaUniforme')) && data.tallaUniforme) {
        payload.tallaUniforme = data.tallaUniforme;
      }
      if ((modifiedFields.has('tallaCalzado') || camposRequeridosPorVacios.has('tallaCalzado')) && data.tallaCalzado) {
        payload.tallaCalzado = data.tallaCalzado;
      }
      // Campos de contacto de emergencia: incluir si fueron modificados O si estaban vacíos y ahora tienen valor
      if ((modifiedFields.has('nombreContactoEmergencia') || camposRequeridosPorVacios.has('nombreContactoEmergencia')) && data.nombreContactoEmergencia) {
        payload.nombreContactoEmergencia = data.nombreContactoEmergencia;
      }
      if ((modifiedFields.has('relacionContactoEmergencia') || camposRequeridosPorVacios.has('relacionContactoEmergencia')) && data.relacionContactoEmergencia) {
        payload.relacionContactoEmergencia = data.relacionContactoEmergencia;
      }
      if ((modifiedFields.has('telefonoContactoEmergencia') || camposRequeridosPorVacios.has('telefonoContactoEmergencia')) && data.telefonoContactoEmergencia) {
        payload.telefonoContactoEmergencia = data.telefonoContactoEmergencia;
      }
      if (modifiedFields.has('nivelEducativo') && data.nivelEducativo) {
        payload.nivelEducativo = data.nivelEducativo;
      }
      if (modifiedFields.has('numeroCuenta') && data.numeroCuenta) {
        payload.numeroCuenta = data.numeroCuenta;
      }
      if (modifiedFields.has('tipoCuenta') && data.tipoCuenta) {
        payload.tipoCuenta = data.tipoCuenta;
      }
      if (modifiedFields.has('banco') && data.banco) {
        payload.banco = data.banco;
      }
      if (modifiedFields.has('eps') && data.eps) {
        payload.eps = data.eps;
      }
      if (modifiedFields.has('afp') && data.afp) {
        payload.afp = data.afp;
      }

      // Agregar beneficiarios nuevos si hay alguno
      // Asegurar que las fechas se envíen en formato YYYY-MM-DD sin conversión de timezone
      if (data.beneficiariosNuevos && data.beneficiariosNuevos.length > 0) {
        payload.beneficiariosNuevos = data.beneficiariosNuevos.map(beneficiario => ({
          ...beneficiario,
          // Asegurar que la fecha se mantenga como string YYYY-MM-DD sin conversión
          fecha_nacimiento: beneficiario.fecha_nacimiento ? 
            beneficiario.fecha_nacimiento.split('T')[0] : // Si tiene hora, solo tomar la fecha
            beneficiario.fecha_nacimiento
        }));
      }

      // Agregar beneficiarios actuales editados si hay alguno
      if (data.beneficiariosActuales && data.beneficiariosActuales.length > 0) {
        payload.beneficiariosActuales = data.beneficiariosActuales.map(beneficiario => ({
          ...beneficiario,
          // Asegurar que la fecha se mantenga como string YYYY-MM-DD sin conversión
          fecha_nacimiento: beneficiario.fecha_nacimiento ? 
            beneficiario.fecha_nacimiento.split('T')[0] : // Si tiene hora, solo tomar la fecha
            beneficiario.fecha_nacimiento
        }));
      }

      // Detectar beneficiarios eliminados comparando los originales con los editados
      const beneficiariosOriginales = afiliado?.beneficiarios || [];
      const beneficiariosEditados = data.beneficiariosActuales || [];
      
      // Crear un mapa de beneficiarios editados por documento+tipo_documento para comparación rápida
      const beneficiariosEditadosMap = new Map<string, boolean>();
      beneficiariosEditados.forEach(b => {
        if (b.documento && b.tipo_documento) {
          const key = `${b.tipo_documento}-${b.documento}`;
          beneficiariosEditadosMap.set(key, true);
        }
      });
      
      // Encontrar beneficiarios que estaban en los originales pero no en los editados
      const beneficiariosEliminados = beneficiariosOriginales.filter(b => {
        if (!b.documento || !b.tipo_documento) return false;
        const key = `${b.tipo_documento}-${b.documento}`;
        return !beneficiariosEditadosMap.has(key);
      });
      
      // Agregar beneficiarios eliminados al payload si hay alguno
      if (beneficiariosEliminados.length > 0) {
        payload.beneficiariosEliminados = beneficiariosEliminados.map(b => ({
          tipo_documento: b.tipo_documento || '',
          documento: b.documento || '',
          nombres: b.nombres || '',
          apellidos: b.apellidos || '',
          parentesco: b.parentesco || '',
          sexo: b.sexo || '',
        }));
      }

      // Execute reCAPTCHA - si falla, continuar sin token (fail-open)
      let recaptchaToken: string | null = null;
      try {
        recaptchaToken = await recaptchaRef.current?.execute() ?? null;
      } catch (error) {
        logger.warn('Error al ejecutar reCAPTCHA, continuando sin token:', error);
        // No bloquear al usuario - permitir continuar
      }

      const requestData = {
        request_type: 'actualizar-datos-personales',
        id_type: afiliado.tipo_documento || '',
        id_number: afiliado.documento || '',
        name: afiliado.nombres || '',
        last_name: afiliado.apellidos || '',
        // Usar siempre los valores actuales del afiliado, no los nuevos del formulario
        // Los nuevos valores solo van en el payload
        email: afiliado.correo_personal || '',
        phone_number: afiliado.celular || '',
        payload,
        files,
        ...(recaptchaToken && { recaptcha_token: recaptchaToken })
      };

      const response = await submitRequest(requestData);
      
      // Save success data for the modal
      saveRequestSuccessData(response);
      
      // Reset reCAPTCHA after successful submission
      recaptchaRef.current?.reset();

      form.reset();
      
      toast.success('Solicitud de actualización de datos enviada', {
        description: (
          <>
            {response.message || 'Su solicitud ha sido recibida. Se procesará según los plazos establecidos.'}
            <br />
            <span className="mt-1 block text-sm">Si no visualiza el correo, revise su bandeja de SPAM.</span>
          </>
        ),
        duration: 8000,
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      });
      
      // Redirect immediately but with a small delay to ensure toast is visible
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (error: any) {
      handleError(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleError = (error: any) => {
    // Handle validation errors (422) with specific field messages
    if (error?.isValidationError && error.errors) {
      const errorMessages: string[] = [];
      
      Object.entries(error.errors).forEach(([field, messages]) => {
        const fieldMessages = Array.isArray(messages) ? messages : [messages];
        fieldMessages.forEach((msg: string) => {
          // Map field names to user-friendly labels
          const fieldLabel = getFieldLabel(field);
          errorMessages.push(`${fieldLabel}: ${msg}`);
        });
      });
      
      toast.error('Errores de validación', {
        description: errorMessages.length > 0 
          ? errorMessages.join('\n')
          : error.message || 'Por favor verifique los datos ingresados e intente nuevamente.',
        duration: 8000,
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      });
      
      // Set form errors for react-hook-form
      if (error.errors) {
        Object.entries(error.errors).forEach(([field, messages]) => {
          const fieldMessages = Array.isArray(messages) ? messages : [messages];
          const fieldName = field.replace('payload.', '').replace('files.', '');
          form.setError(fieldName as any, {
            type: 'manual',
            message: fieldMessages[0] as string,
          });
        });
      }
    } else {
      // Handle other errors
      const errorMessage = error?.message || 'Error al enviar el formulario. Por favor verifique los datos ingresados e intente nuevamente.';
      toast.error('Error al enviar el formulario', {
        description: errorMessage,
        duration: 5000,
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      });
    }
  };

  // Helper function to map field names to user-friendly labels
  const getFieldLabel = (field: string): string => {
    const fieldMap: Record<string, string> = {
      'payload.proceso': 'Proceso',
      'payload.dondeRealizaProceso': 'Donde realiza el proceso',
      'payload.estadoCivil': 'Estado civil',
      'payload.direccion': 'Dirección',
      'payload.municipio': 'Municipio',
      'payload.telefonoFijo': 'Teléfono fijo',
      'payload.celular': 'Celular',
      'payload.correo': 'Correo electrónico',
      'payload.tallaUniforme': 'Talla de uniforme',
      'payload.nombreContactoEmergencia': 'Nombre contacto de emergencia',
      'payload.relacionContactoEmergencia': 'Relación contacto de emergencia',
      'payload.telefonoContactoEmergencia': 'Teléfono contacto de emergencia',
      'payload.nivelEducativo': 'Nivel educativo',
      'payload.numeroCuenta': 'Número de cuenta',
      'payload.tipoCuenta': 'Tipo de cuenta',
      'payload.banco': 'Banco',
      'payload.eps': 'EPS',
      'payload.afp': 'AFP',
      'files.certificacionBancaria': 'Certificación bancaria',
      'files.diplomaEducativo': 'Diploma educativo',
      'files.actaGrado': 'Acta de grado',
      'files.certificadoEps': 'Certificado de EPS',
      'files.certificadoAfp': 'Certificado de AFP',
    };

    return fieldMap[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <MainLayout>
      <div className="container mx-auto pt-6 pb-2 px-4 md:px-6 lg:px-8">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/"><Home className="h-4 w-4 mr-1 inline-block" /> Inicio</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                <FileText className="h-4 w-4 mr-1 inline-block" /> Actualizar Datos Personales
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <ActualizarDatosPersonalesHeader />
        <InformacionImportanteDatosAlert />

        <Form {...form} key={`form-${initialValues.estadoCivil}-${initialValues.celular}-${initialValues.tallaUniforme}-${initialValues.tallaCalzado}`}>
          <form onSubmit={form.handleSubmit(onSubmit, handleError)} className="space-y-8">
            <DatosPersonalesReadOnly />
            <DatosPersonalesSection 
              control={form.control} 
              modifiedFields={modifiedFields}
              initialValues={initialValues}
              camposRequeridosPorVacios={camposRequeridosPorVacios}
            />
            <NivelEducativoSection 
              control={form.control} 
              modifiedFields={modifiedFields}
              onFileChange={(fieldName: string) => {
                form.clearErrors(fieldName as any);
                form.trigger(fieldName as any);
              }}
            />
            <InformacionBancariaSection 
              control={form.control} 
              modifiedFields={modifiedFields}
              initialValues={initialValues}
              onFileChange={(fieldName: string) => {
                form.clearErrors(fieldName as any);
                form.trigger(fieldName as any);
              }}
            />
            <EpsAfpSection 
              control={form.control} 
              modifiedFields={modifiedFields}
              onFileChange={(fieldName: string) => {
                form.clearErrors(fieldName as any);
                form.trigger(fieldName as any);
              }}
            />
            <BeneficiariosSection control={form.control} />
            <ConfirmacionCorreoSection />
            <AutorizacionDatosSection />
            
            <InvisibleRecaptcha
              ref={recaptchaRef}
              siteKey={RECAPTCHA_CONFIG.SITE_KEY}
              onVerify={() => {}}
              onError={() => {
                // Solo loguear, no bloquear al usuario
                logger.warn('Error en reCAPTCHA, pero permitiendo continuar');
              }}
            />
                        
            <div className="flex justify-center mt-10">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span 
                      className="inline-block w-full md:w-auto"
                      style={{
                        cursor: (isSubmitting || isInitializing || camposModificadosSinArchivos.length === 0) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Button 
                        type="submit" 
                        size="lg" 
                        disabled={isSubmitting || isInitializing || (camposModificadosSinArchivos.length === 0 && !tieneBeneficiariosNuevos && !tieneBeneficiariosActualesEditados && camposRequeridosPorVacios.size === 0)}
                        className="w-full md:w-auto bg-secondary-prosaludgreen hover:bg-secondary-prosaludgreen/90 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5" />
                            Enviar Solicitud
                          </>
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!isSubmitting && !isInitializing && camposModificadosSinArchivos.length === 0 && !tieneBeneficiariosNuevos && !tieneBeneficiariosActualesEditados && camposRequeridosPorVacios.size === 0 && (
                    <TooltipContent side="top" className="max-w-xs bg-gray-800 text-white border-gray-700">
                      <p className="text-sm text-white">
                        Debe modificar al menos un campo, agregar o editar miembros al grupo familiar, o completar los campos requeridos (Estado Civil, Celular, Talla de Uniforme, Talla de Calzado, y datos de contacto de emergencia) para enviar la solicitud de actualización.
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
};

const ActualizarDatosPersonalesPage: React.FC = () => {
  return (
    <RequireAfiliadoDataUpdateAuth>
      <ActualizarDatosPersonalesPageContent />
    </RequireAfiliadoDataUpdateAuth>
  );
};

export default ActualizarDatosPersonalesPage;
