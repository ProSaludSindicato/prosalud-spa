import React from 'react';
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
import { submitRequest } from '@/services/requestsService';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES_ALL } from '@/components/solicitud-certificado/utils';
import RequireAfiliadoOtpAuth from '@/components/auth/RequireAfiliadoOtpAuth';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import { municipios, estadosCiviles, nivelesEducativos, tiposCuenta, bancos, epsList, afpList } from '@/components/actualizar-datos-personales/formOptions';

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

const formSchemaActualizarDatosPersonales = z.object({
  // Datos personales (todos opcionales)
  estadoCivil: z.string().optional(),
  direccion: z.string().optional(),
  municipio: z.string().optional(),
  telefonoFijo: z.string().optional(),
  celular: z.string().optional(),
  correo: z.string().email("El correo electrónico debe ser válido.").optional().or(z.literal('')),
  tallaUniforme: z.string().optional(),
  tallaCalzado: z.string().optional(),
  
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
});

type FormValuesActualizarDatosPersonales = z.infer<typeof formSchemaActualizarDatosPersonales>;

const ActualizarDatosPersonalesPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { afiliado, getActiveConvenio } = useAfiliadoAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
  }), [afiliado]);

  const form = useForm<FormValuesActualizarDatosPersonales>({
    resolver: zodResolver(formSchemaActualizarDatosPersonales),
    defaultValues: initialValues,
  });

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
  }, [watchValues, initialValues, isInitializing]);

  // Calcular campos modificados sin archivos para deshabilitar el botón
  const camposModificadosSinArchivos = React.useMemo(() => {
    return Array.from(modifiedFields).filter(
      field => !field.includes('diploma') && 
               !field.includes('acta') && 
               !field.includes('certificado') && 
               !field.includes('Bancaria')
    );
  }, [modifiedFields]);

  // Verificar si hay beneficiarios nuevos
  const beneficiariosNuevos = form.watch('beneficiariosNuevos');
  const tieneBeneficiariosNuevos = beneficiariosNuevos && beneficiariosNuevos.length > 0;

  const onSubmit = async (data: FormValuesActualizarDatosPersonales) => {
    if (!afiliado) return;
    
    // Validar que haya al menos un campo modificado (excluyendo archivos) o beneficiarios nuevos
    const tieneBeneficiariosNuevos = data.beneficiariosNuevos && data.beneficiariosNuevos.length > 0;
    
    if (camposModificadosSinArchivos.length === 0 && !tieneBeneficiariosNuevos) {
      toast.error('No hay cambios para actualizar', {
        description: 'Debe modificar al menos un campo o agregar miembros al grupo familiar para enviar la solicitud de actualización.',
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

      // Solo agregar campos que fueron modificados
      if (modifiedFields.has('estadoCivil') && data.estadoCivil) {
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
      if (modifiedFields.has('celular') && data.celular) {
        payload.celular = data.celular;
      }
      if (modifiedFields.has('correo') && data.correo) {
        payload.correo = data.correo;
      }
      if (modifiedFields.has('tallaUniforme') && data.tallaUniforme) {
        payload.tallaUniforme = data.tallaUniforme;
      }
      if (modifiedFields.has('tallaCalzado') && data.tallaCalzado) {
        payload.tallaCalzado = data.tallaCalzado;
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
      if (data.beneficiariosNuevos && data.beneficiariosNuevos.length > 0) {
        payload.beneficiariosNuevos = data.beneficiariosNuevos;
      }

      const requestData = {
        request_type: 'actualizar-datos-personales',
        id_type: afiliado.tipo_documento || '',
        id_number: afiliado.documento || '',
        name: afiliado.nombres || '',
        last_name: afiliado.apellidos || '',
        email: data.correo || afiliado.correo_personal || '',
        phone_number: data.celular || afiliado.celular || '',
        payload,
        files
      };

      const response = await submitRequest(requestData);

      form.reset();
      
      toast.success('Solicitud de actualización de datos enviada', {
        description: response.message || 'Su solicitud ha sido recibida. Se procesará según los plazos establecidos.',
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, handleError)} className="space-y-8">
            <DatosPersonalesReadOnly />
            <DatosPersonalesSection 
              control={form.control} 
              modifiedFields={modifiedFields}
              initialValues={initialValues}
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
                        disabled={isSubmitting || isInitializing || (camposModificadosSinArchivos.length === 0 && !tieneBeneficiariosNuevos)}
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
                  {!isSubmitting && !isInitializing && camposModificadosSinArchivos.length === 0 && !tieneBeneficiariosNuevos && (
                    <TooltipContent side="top" className="max-w-xs bg-gray-800 text-white border-gray-700">
                      <p className="text-sm text-white">
                        Debe modificar al menos un campo o agregar miembros al grupo familiar para enviar la solicitud de actualización.
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
    <RequireAfiliadoOtpAuth>
      <ActualizarDatosPersonalesPageContent />
    </RequireAfiliadoOtpAuth>
  );
};

export default ActualizarDatosPersonalesPage;
