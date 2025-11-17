import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Send, Home, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { submitRequest } from '@/services/requestsService';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES_ALL } from '@/components/solicitud-certificado/utils';
import RequireAfiliadoAuth from '@/components/auth/RequireAfiliadoAuth';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
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

const ALLOWED_FILE_TYPES_CERTIFICADO = ALLOWED_FILE_TYPES_ALL;

const formSchemaActualizarCuenta = z.object({
  // Datos personales (todos opcionales)
  estadoCivil: z.string().optional(),
  direccion: z.string().optional(),
  municipio: z.string().optional(),
  telefonoFijo: z.string().optional(),
  celular: z.string().optional(),
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
  tallaUniforme: z.string().optional(),
  
  // Nivel educativo (opcional - solo si se quiere actualizar)
  nivelEducativo: z.string().optional(),
  diplomaEducativo: z.any()
    .optional()
    .refine(files => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(files => !files || files.length === 0 || ALLOWED_FILE_TYPES_CERTIFICADO.includes(files?.[0]?.type), 'Se permiten archivos PDF, Word o imágenes (JPG, PNG, GIF, WEBP).'),
  actaGrado: z.any()
    .optional()
    .refine(files => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(files => !files || files.length === 0 || ALLOWED_FILE_TYPES_CERTIFICADO.includes(files?.[0]?.type), 'Se permiten archivos PDF, Word o imágenes (JPG, PNG, GIF, WEBP).'),
  
  // Información bancaria (opcional - solo si se quiere actualizar)
  numeroCuenta: z.string().optional(),
  tipoCuenta: z.string().optional(),
  banco: z.string().optional(),
  certificacionBancaria: z.any()
    .optional()
    .refine(files => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(files => !files || files.length === 0 || ALLOWED_FILE_TYPES_CERTIFICADO.includes(files?.[0]?.type), 'Se permiten archivos PDF, Word o imágenes (JPG, PNG, GIF, WEBP).'),
  
  // EPS y AFP (opcionales - solo si se quiere actualizar)
  eps: z.string().optional(),
  certificadoEps: z.any()
    .optional()
    .refine(files => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(files => !files || files.length === 0 || ALLOWED_FILE_TYPES_CERTIFICADO.includes(files?.[0]?.type), 'Se permiten archivos PDF, Word o imágenes (JPG, PNG, GIF, WEBP).'),
  afp: z.string().optional(),
  certificadoAfp: z.any()
    .optional()
    .refine(files => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(files => !files || files.length === 0 || ALLOWED_FILE_TYPES_CERTIFICADO.includes(files?.[0]?.type), 'Se permiten archivos PDF, Word o imágenes (JPG, PNG, GIF, WEBP).'),
}).refine((data) => {
  // Si se proporciona nivel educativo, los documentos son requeridos
  if (data.nivelEducativo && data.nivelEducativo.trim() !== '') {
    if (!data.diplomaEducativo || data.diplomaEducativo.length === 0) {
      return false;
    }
    if (!data.actaGrado || data.actaGrado.length === 0) {
      return false;
    }
  }
  return true;
}, {
  message: "Si actualiza el nivel educativo, debe adjuntar el diploma y el acta de grado.",
  path: ["diplomaEducativo"],
}).refine((data) => {
  // Si se proporciona número de cuenta, tipo de cuenta, banco y certificación son requeridos
  if (data.numeroCuenta && data.numeroCuenta.trim() !== '') {
    if (!data.tipoCuenta || data.tipoCuenta.trim() === '') {
      return false;
    }
    if (!data.banco || data.banco.trim() === '') {
      return false;
    }
    if (!data.certificacionBancaria || data.certificacionBancaria.length === 0) {
      return false;
    }
  }
  return true;
}, {
  message: "Si actualiza la información bancaria, debe completar todos los campos y adjuntar la certificación bancaria.",
  path: ["tipoCuenta"],
}).refine((data) => {
  // Si se proporciona EPS, el certificado es requerido
  if (data.eps && data.eps.trim() !== '') {
    if (!data.certificadoEps || data.certificadoEps.length === 0) {
      return false;
    }
  }
  return true;
}, {
  message: "Si actualiza la EPS, debe adjuntar el certificado de EPS vigente.",
  path: ["certificadoEps"],
}).refine((data) => {
  // Si se proporciona AFP, el certificado es requerido
  if (data.afp && data.afp.trim() !== '') {
    if (!data.certificadoAfp || data.certificadoAfp.length === 0) {
      return false;
    }
  }
  return true;
}, {
  message: "Si actualiza la AFP, debe adjuntar el certificado de AFP vigente.",
  path: ["certificadoAfp"],
});

type FormValuesActualizarCuenta = z.infer<typeof formSchemaActualizarCuenta>;

const ActualizarCuentaBancariaPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { afiliado, getActiveConvenio } = useAfiliadoAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const activeConvenio = getActiveConvenio();
  
  const form = useForm<FormValuesActualizarCuenta>({
    resolver: zodResolver(formSchemaActualizarCuenta),
    defaultValues: {
      estadoCivil: '',
      direccion: '',
      municipio: '',
      telefonoFijo: '',
      celular: afiliado?.celular || '',
      correo: afiliado?.correo_personal || '',
      tallaUniforme: '',
      nivelEducativo: '',
      diplomaEducativo: undefined,
      actaGrado: undefined,
      numeroCuenta: '',
      tipoCuenta: '',
      banco: '',
      certificacionBancaria: undefined,
      eps: '',
      certificadoEps: undefined,
      afp: '',
      certificadoAfp: undefined,
    },
  });

  const onSubmit = async (data: FormValuesActualizarCuenta) => {
    if (!afiliado) return;
    
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

      const requestData = {
        request_type: 'actualizar-datos-personales',
        id_type: afiliado.tipo_documento || '',
        id_number: afiliado.documento || '',
        name: afiliado.nombres || '',
        last_name: afiliado.apellidos || '',
        email: data.correo || afiliado.correo_personal || '',
        phone_number: data.celular || afiliado.celular || '',
        payload: {
          // Campos requeridos del convenio
          proceso: activeConvenio?.proceso || '',
          dondeRealizaProceso: activeConvenio?.cliente || '',
          // Todos los demás campos son opcionales - solo incluir si tienen valor
          ...(data.estadoCivil && { estadoCivil: data.estadoCivil }),
          ...(data.direccion && { direccion: data.direccion }),
          ...(data.municipio && { municipio: data.municipio }),
          ...(data.telefonoFijo && { telefonoFijo: data.telefonoFijo }),
          ...(data.celular && { celular: data.celular }),
          ...(data.correo && { correo: data.correo }),
          ...(data.tallaUniforme && { tallaUniforme: data.tallaUniforme }),
          ...(data.nivelEducativo && { nivelEducativo: data.nivelEducativo }),
          ...(data.numeroCuenta && { numeroCuenta: data.numeroCuenta }),
          ...(data.tipoCuenta && { tipoCuenta: data.tipoCuenta }),
          ...(data.banco && { banco: data.banco }),
          ...(data.eps && { eps: data.eps }),
          ...(data.afp && { afp: data.afp }),
        },
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
            <DatosPersonalesSection control={form.control} />
            <NivelEducativoSection control={form.control} />
            <InformacionBancariaSection control={form.control} />
            <EpsAfpSection control={form.control} />
            <ConfirmacionCorreoSection />
            <AutorizacionDatosSection />
                        
            <div className="flex justify-center mt-10">
              <Button 
                type="submit" 
                size="lg" 
                disabled={isSubmitting}
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
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
};

const ActualizarCuentaBancariaPage: React.FC = () => {
  return (
    <RequireAfiliadoAuth>
      <ActualizarCuentaBancariaPageContent />
    </RequireAfiliadoAuth>
  );
};

export default ActualizarCuentaBancariaPage;
