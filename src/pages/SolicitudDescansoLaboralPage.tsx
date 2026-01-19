import React, { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import MainLayout from '@/components/layout/MainLayout';
import { toast } from 'sonner';
import { Send, CheckCircle2, AlertCircle, Home, FileText } from 'lucide-react';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES_ALL } from '@/components/solicitud-certificado/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { submitRequest, saveRequestSuccessData } from '@/services/requestsService';
import RequireActiveAfiliadoAuth from '@/components/auth/RequireActiveAfiliadoAuth';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import InvisibleRecaptcha, { InvisibleRecaptchaRef } from '@/components/shared/InvisibleRecaptcha';
import { RECAPTCHA_CONFIG } from '@/config/api';
import { logger } from '@/utils/logger';

import DatosPersonalesReadOnly from '@/components/shared/DatosPersonalesReadOnly';
import InformacionDescansoSection from '@/components/solicitud-descanso/InformacionDescansoSection';
import AnexoDescansoSection from '@/components/solicitud-descanso/AnexoDescansoSection';
import DescansoHeader from '@/components/solicitud-descanso/DescansoHeader';
import InformacionImportanteDescansoAlert from '@/components/solicitud-descanso/InformacionImportanteDescansoAlert';
import RequisitosDescansoSection from '@/components/solicitud-descanso/RequisitosDescansoSection';
import ConfirmacionCorreoSection from '@/components/solicitud-certificado/ConfirmacionCorreoSection';
import AutorizacionDatosSection from '@/components/solicitud-certificado/AutorizacionDatosSection';

const coordinadorasPermitidas = [
  'Catalina Hoyos Martinez',
  'Diana Zulay Figueroa Londoño',
  'Beatriz Veronica Bernal Velez',
  'Luz Maria Garcia Rincon',
  'Maria Alejandra Garcia Mesa',
] as const;

const formSchema = z.object({
  coordinadorVoBo: z.string()
    .min(1, "Este campo es requerido.")
    .refine(
      (val) => coordinadorasPermitidas.includes(val as any),
      "Debe seleccionar un coordinador de la lista."
    ),
  fechaInicioDescanso: z.string().min(1, "Este campo es requerido.").refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "La fecha de inicio no es válida."),
  fechaFinalizacionDescanso: z.string().min(1, "Este campo es requerido.").refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "La fecha de finalización no es válida."),

  anexoDescanso: z.any().refine(files => {
    return files && files.length > 0;
  }, "Debe adjuntar el archivo con el V°B°.").refine(files => {
    if (!files || files.length === 0) return true;
    const file = files[0];
    return file.size <= MAX_FILE_SIZE;
  }, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`).refine(files => {
    if (!files || files.length === 0) return true;
    const file = files[0];
    return ALLOWED_FILE_TYPES_ALL.includes(file.type);
  }, 'Se permiten archivos PDF, Word o imágenes (JPG, PNG, WEBP).'),
  
  confirmacionCorreo: z.boolean().default(false),
}).refine((data) => {
  const fechaInicio = new Date(data.fechaInicioDescanso);
  const fechaFin = new Date(data.fechaFinalizacionDescanso);
  return fechaFin >= fechaInicio;
}, {
  message: "La fecha de finalización debe ser posterior o igual a la fecha de inicio.",
  path: ["fechaFinalizacionDescanso"],
});

type FormValues = z.infer<typeof formSchema>;

const SolicitudDescansoLaboralPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { afiliado, getActiveConvenio } = useAfiliadoAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const recaptchaRef = useRef<InvisibleRecaptchaRef>(null);

  const activeConvenio = getActiveConvenio();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      coordinadorVoBo: '',
      fechaInicioDescanso: '',
      fechaFinalizacionDescanso: '',
      anexoDescanso: undefined,
      confirmacionCorreo: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!afiliado) return;
    
    setIsSubmitting(true);
    try {
      // Execute reCAPTCHA - si falla, continuar sin token (fail-open)
      let recaptchaToken: string | null = null;
      try {
        recaptchaToken = await recaptchaRef.current?.execute() ?? null;
      } catch (error) {
        logger.warn('Error al ejecutar reCAPTCHA, continuando sin token:', error);
        // No bloquear al usuario - permitir continuar
      }

      const files: Record<string, File> = {};
      if (data.anexoDescanso) {
        files.anexoDescanso = data.anexoDescanso;
      }

      const requestData = {
        request_type: 'compensacion-descanso',
        id_type: afiliado.tipo_documento || '',
        id_number: afiliado.documento || '',
        name: afiliado.nombres || '',
        last_name: afiliado.apellidos || '',
        email: afiliado.correo_personal || '',
        phone_number: afiliado.celular || '',
        payload: {
          proceso: activeConvenio?.proceso || '',
          dondeRealizaProceso: activeConvenio?.cliente || '',
          coordinadorVoBo: data.coordinadorVoBo,
          fechaInicioDescanso: data.fechaInicioDescanso,
          fechaFinalizacionDescanso: data.fechaFinalizacionDescanso
        },
        files,
        ...(recaptchaToken && { recaptcha_token: recaptchaToken })
      };

      const response = await submitRequest(requestData);
      
      // Save success data for the modal
      saveRequestSuccessData(response);
      
      // Reset reCAPTCHA after successful submission
      recaptchaRef.current?.reset();

      form.reset();
      
      toast.success('Solicitud de compensación por descanso enviada con éxito', {
        description: (
          <>
            Su solicitud será revisada y en caso de ser aprobada será incluida junto con la compensación correspondiente.
            <br />
            <strong className="mt-2 block font-semibold">Tenga presente:</strong> Solamente en caso de presentarse alguna inconsistencia nos comunicaremos con usted.
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
    } catch (error) {
      handleError(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleError = (error: any) => {
    // Verificar si el error es sobre un afiliado retirado
    const isRetiradoError = error?.isValidationError && 
      error?.errors?.request_type?.some((msg: string) => 
        msg.toLowerCase().includes('retirado')
      );
    
    if (isRetiradoError) {
      const retiradoMessage = error.errors.request_type.find((msg: string) => 
        msg.toLowerCase().includes('retirado')
      );
      toast.error('Acceso restringido', {
        description: retiradoMessage || 'No puede realizar esta solicitud porque se encuentra retirado del sindicato.',
        duration: 5000,
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      });
    } else {
      toast.error('Error al enviar el formulario', {
        description: 'Por favor verifique los datos ingresados e intente nuevamente.',
        duration: 5000,
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      });
    }
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
                Compensación por Descanso
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <DescansoHeader />
        <RequisitosDescansoSection />
        <InformacionImportanteDescansoAlert />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, handleError)} className="space-y-8">
            <DatosPersonalesReadOnly />
            <InformacionDescansoSection control={form.control} />
            <AnexoDescansoSection control={form.control} />
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

const SolicitudDescansoSindicalPage: React.FC = () => {
  return (
    <RequireActiveAfiliadoAuth procedureName="Compensación por Descanso">
      <SolicitudDescansoLaboralPageContent />
    </RequireActiveAfiliadoAuth>
  );
};

export default SolicitudDescansoSindicalPage;
