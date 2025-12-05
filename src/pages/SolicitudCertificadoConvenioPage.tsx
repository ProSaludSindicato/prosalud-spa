import React, { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import MainLayout from '@/components/layout/MainLayout';
import { toast } from 'sonner';
import { Send, CheckCircle2, AlertCircle, Home, FileText } from 'lucide-react';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES_ALL, ALLOWED_FILE_TYPES_PDF } from '@/components/solicitud-certificado/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { submitRequest } from '@/services/requestsService';
import RequireAfiliadoAuth from '@/components/auth/RequireAfiliadoAuth';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import InvisibleRecaptcha, { InvisibleRecaptchaRef } from '@/components/shared/InvisibleRecaptcha';
import { RECAPTCHA_CONFIG } from '@/config/api';

import DatosPersonalesReadOnly from '@/components/shared/DatosPersonalesReadOnly';
import InformacionCertificadoSection from '@/components/solicitud-certificado/InformacionCertificadoSection';
import ArchivoAdicionalSection from '@/components/solicitud-certificado/ArchivoAdicionalSection';
import SolicitudHeader from '@/components/solicitud-certificado/SolicitudHeader';
import InformacionImportanteAlert from '@/components/solicitud-certificado/InformacionImportanteAlert';
import CertificadoSimpleAlert from '@/components/solicitud-certificado/CertificadoSimpleAlert';
import ConfirmacionCorreoSection from '@/components/solicitud-certificado/ConfirmacionCorreoSection';
import AutorizacionDatosSection from '@/components/solicitud-certificado/AutorizacionDatosSection';

const formSchema = z.object({
  infoCertificado: z.object({
    fechaIngresoRetiro: z.boolean().default(true),
    valorCompensaciones: z.boolean().default(false),
    dirigidoAEntidad: z.boolean().default(false),
    paraSubsidioDesempleo: z.boolean().default(false),
    paraSubsidioVivienda: z.boolean().default(false),
    dirigidoFondoPensiones: z.boolean().default(false),
    adicionarActividades: z.boolean().default(false),
    dirigidoBancolombia: z.boolean().default(false),
    otros: z.boolean().default(false),
  }).default({}),

  dirigidoAQuien: z.string().optional(),
  actividadesPdf: z.any().optional().refine(files => {
    if (!files || files.length === 0) return true;
    const file = files[0];
    return file.size <= MAX_FILE_SIZE;
  }, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`).refine(files => {
    if (!files || files.length === 0) return true;
    const file = files[0];
    return ALLOWED_FILE_TYPES_PDF.includes(file.type);
  }, 'Solo se permiten archivos PDF.'),
  
  otrosDescripcion: z.string().optional(),

  adjuntarArchivoAdicional: z.any().optional().refine(files => {
    if (!files || files.length === 0) return true;
    const file = files[0];
    return file.size <= MAX_FILE_SIZE;
  }, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`).refine(files => {
    if (!files || files.length === 0) return true;
    const file = files[0];
    return ALLOWED_FILE_TYPES_ALL.includes(file.type);
  }, 'Se permiten archivos PDF, Word o imágenes (JPG, PNG, WEBP).'),
  
  // confirmacionCorreo: z.boolean().default(false), // Eliminado
  // recaptchaToken: z.string().min(1, "Por favor, completa el reCAPTCHA."),
}).superRefine((data, ctx) => {
  if (data.infoCertificado.dirigidoAEntidad && !data.dirigidoAQuien?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dirigidoAQuien'],
      message: 'Este campo es requerido si selecciona "Dirigido a una entidad en particular".',
    });
  }
  if (data.infoCertificado.adicionarActividades) {
    if (!data.actividadesPdf || data.actividadesPdf.length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['actividadesPdf'],
            message: 'Debe adjuntar un archivo PDF con las actividades si selecciona esta opción.',
        });
    }
  }
  if (data.infoCertificado.otros && !data.otrosDescripcion?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['otrosDescripcion'],
      message: 'Este campo es requerido si selecciona "Otros".',
    });
  }
});

type FormValues = z.infer<typeof formSchema>;

// Función helper para determinar si un certificado es simple
const isCertificadoSimple = (data: FormValues, estadoAfiliado?: string | null): boolean => {
  const { infoCertificado, dirigidoAQuien, actividadesPdf, adjuntarArchivoAdicional, otrosDescripcion } = data;
  
  // Un certificado es simple cuando:
  // 1. Tiene fecha de ingreso/retiro (siempre true)
  // 2. NO tiene otras opciones que requieran revisión manual
  // 3. Puede tener "Dirigido a una entidad particular" (opcional), pero si lo tiene, debe tener el nombre de la entidad
  // 4. Si solo tiene fecha de ingreso/retiro, ya es simple
  // 5. Si tiene fecha de ingreso/retiro + dirigido a entidad (con nombre), también es simple
  // 6. Si tiene fecha de ingreso/retiro + valor de compensaciones Y el estado del afiliado es "Activo", también es simple (en su mayoría, excepto casos particulares)
  
  // Verificar si el afiliado está activo
  const isActivo = estadoAfiliado?.toLowerCase() === 'activo';
  
  // Verificar que no tenga opciones que requieran revisión manual
  // NOTA: valorCompensaciones puede ser simple si el estado es Activo, así que lo excluimos de hasComplexOptions
  const hasComplexOptions = 
    (!isActivo && infoCertificado.valorCompensaciones) || // Solo es complejo si NO está activo
    infoCertificado.paraSubsidioDesempleo ||
    infoCertificado.paraSubsidioVivienda ||
    infoCertificado.dirigidoFondoPensiones ||
    infoCertificado.adicionarActividades ||
    infoCertificado.dirigidoBancolombia ||
    infoCertificado.otros ||
    actividadesPdf ||
    adjuntarArchivoAdicional ||
    otrosDescripcion?.trim();
  
  // Si tiene opciones complejas, no es simple
  if (hasComplexOptions) return false;
  
  // Si tiene fecha de ingreso/retiro y no tiene opciones complejas, es simple
  // Si además tiene "dirigido a entidad", debe tener el nombre de la entidad
  if (infoCertificado.fechaIngresoRetiro) {
    // Si tiene "dirigido a entidad" marcado, debe tener el nombre
    if (infoCertificado.dirigidoAEntidad) {
      return !!dirigidoAQuien?.trim();
    }
    // Si solo tiene fecha de ingreso/retiro, es simple
    // Si tiene fecha de ingreso/retiro + valor de compensaciones Y está activo, también es simple
    if (infoCertificado.valorCompensaciones && isActivo) {
      return true;
    }
    // Si solo tiene fecha de ingreso/retiro, es simple
    return true;
  }
  
  return false;
};

const SolicitudCertificadoConvenioPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { afiliado, getActiveConvenio } = useAfiliadoAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const recaptchaRef = useRef<InvisibleRecaptchaRef>(null);
  
  const activeConvenio = getActiveConvenio();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      infoCertificado: {
        fechaIngresoRetiro: true,
        valorCompensaciones: false,
        dirigidoAEntidad: false,
        paraSubsidioDesempleo: false,
        paraSubsidioVivienda: false,
        dirigidoFondoPensiones: false,
        adicionarActividades: false,
        dirigidoBancolombia: false,
        otros: false,
      },
      dirigidoAQuien: '',
      actividadesPdf: undefined,
      otrosDescripcion: '',
      adjuntarArchivoAdicional: undefined,
    },
  });

  // Observar los valores del formulario para determinar si es simple
  const watchedValues = form.watch();
  const isSimple = React.useMemo(() => isCertificadoSimple(watchedValues, afiliado?.estado), [watchedValues, afiliado?.estado]);
  
  // Determinar si tiene valor de compensaciones y está activo (para mostrar aclaración)
  const tieneValorCompensacionesYActivo = React.useMemo(() => {
    return watchedValues.infoCertificado?.valorCompensaciones && 
           afiliado?.estado?.toLowerCase() === 'activo' &&
           isSimple;
  }, [watchedValues.infoCertificado?.valorCompensaciones, afiliado?.estado, isSimple]);

  const onSubmit = async (data: FormValues) => {
    if (!afiliado) return;
    
    setIsSubmitting(true);
    try {
      // Execute reCAPTCHA - si falla, continuar sin token (fail-open)
      let recaptchaToken: string | null = null;
      try {
        recaptchaToken = await recaptchaRef.current?.execute() ?? null;
      } catch (error) {
        console.warn('Error al ejecutar reCAPTCHA, continuando sin token:', error);
        // No bloquear al usuario - permitir continuar
      }

      const files: Record<string, File> = {};
      if (data.actividadesPdf) {
        files.actividadesPdf = data.actividadesPdf;
      }
      if (data.adjuntarArchivoAdicional) {
        files.adjuntarArchivoAdicional = data.adjuntarArchivoAdicional;
      }

      const procesoValue = activeConvenio?.proceso ?? '';
      const dondeRealizaProcesoValue = activeConvenio?.cliente ?? '';
      
      const payload: Record<string, any> = {
        // SIEMPRE incluir proceso y dondeRealizaProceso (incluso si están vacíos)
        proceso: procesoValue,
        dondeRealizaProceso: dondeRealizaProcesoValue,
        infoCertificado: data.infoCertificado,
      };

      // Incluir campos opcionales solo si tienen valor
      if (data.dirigidoAQuien && data.dirigidoAQuien.trim() !== '') {
        payload.dirigidoAQuien = data.dirigidoAQuien;
      }
      if (data.otrosDescripcion && data.otrosDescripcion.trim() !== '') {
        payload.otrosDescripcion = data.otrosDescripcion;
      }

      const requestData = {
        request_type: 'certificado-convenio',
        id_type: afiliado.tipo_documento || '',
        id_number: afiliado.documento || '',
        name: afiliado.nombres || '',
        last_name: afiliado.apellidos || '',
        email: afiliado.correo_personal || '',
        phone_number: afiliado.celular || '',
        payload,
        files,
        ...(recaptchaToken && { recaptcha_token: recaptchaToken })
      };

      await submitRequest(requestData);
      
      // Reset reCAPTCHA after successful submission
      recaptchaRef.current?.reset();

      // Determinar si el certificado es simple para mostrar el mensaje correcto
      const certificadoEsSimple = isCertificadoSimple(data, afiliado?.estado);

      form.reset();
      
      toast.success('Solicitud enviada con éxito', {
        description: (
          <>
            {certificadoEsSimple ? (
              <>
                Recibirá el certificado en su correo electrónico en los próximos minutos.
                <br />
                <strong className="mt-2 block font-semibold">Importante:</strong> Asegúrese de que su correo electrónico esté actualizado en el sistema.
              </>
            ) : (
              <>
                Recibirá el certificado en su correo en los próximos días hábiles.
                <br />
                <strong className="mt-2 block font-semibold">Tenga presente:</strong> Solamente en caso de presentarse alguna inconsistencia nos comunicaremos con usted.
              </>
            )}
          </>
        ),
        duration: 8000,
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      });
      
      // Redirect immediately but with a small delay to ensure toast is visible
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (error) {
      handleError();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleError = () => {
    toast.error('Error al enviar el formulario', {
      description: 'Por favor verifique los datos ingresados e intente nuevamente.',
      duration: 5000,
      icon: <AlertCircle className="h-5 w-5 text-red-600" />,
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto pt-6 pb-2 px-4 md:px-6 lg:px-8">
        <Breadcrumb>
          <BreadcrumbList className="flex items-center space-x-2 text-sm">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                  <Home className="h-4 w-4" />
                  Inicio
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1 font-medium text-foreground">
                <FileText className="h-4 w-4" />
                Solicitud Certificado Convenio
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <SolicitudHeader />
        <InformacionImportanteAlert />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, handleError)} className="space-y-8">
            <DatosPersonalesReadOnly />
            <InformacionCertificadoSection control={form.control} watch={form.watch} />
            {watchedValues.infoCertificado?.otros && (
              <ArchivoAdicionalSection control={form.control} />
            )}
            <ConfirmacionCorreoSection /> {/* Removido el prop 'control' */}
            <AutorizacionDatosSection />
            
            <InvisibleRecaptcha
              ref={recaptchaRef}
              siteKey={RECAPTCHA_CONFIG.SITE_KEY}
              onVerify={() => {}}
              onError={() => {
                // Solo loguear, no bloquear al usuario
                console.warn('Error en reCAPTCHA, pero permitiendo continuar');
              }}
            />
            
            <CertificadoSimpleAlert 
              isSimple={isSimple} 
              tieneValorCompensaciones={tieneValorCompensacionesYActivo}
            />
            
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

const SolicitudCertificadoConvenioPage: React.FC = () => {
  return (
    <RequireAfiliadoAuth>
      <SolicitudCertificadoConvenioPageContent />
    </RequireAfiliadoAuth>
  );
};

export default SolicitudCertificadoConvenioPage;
