import React, { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import MainLayout from '@/components/layout/MainLayout';
import { toast } from 'sonner';
import { Send, CheckCircle2, AlertCircle, Home, Hospital } from 'lucide-react';
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
import ConfirmacionCorreoSection from '@/components/solicitud-certificado/ConfirmacionCorreoSection';
import AutorizacionDatosSection from '@/components/solicitud-certificado/AutorizacionDatosSection';

import IncapacidadesHeader from '@/components/incapacidades/IncapacidadesHeader';
import InformacionImportanteIncapacidadesAlert from '@/components/incapacidades/InformacionImportanteIncapacidadesAlert';
import TipoIncapacidadSection from '@/components/incapacidades/TipoIncapacidadSection';
import AnexoIncapacidadSection from '@/components/incapacidades/AnexoIncapacidadSection';
import ConsultaPagoIncapacidadCard from '@/components/incapacidades/ConsultaPagoIncapacidadCard';

const formSchemaIncapacidades = z.object({
  tipoDocumento: z.string().min(1, "Este campo es requerido."),
  entidadExpedidora: z.string().min(2, "Este campo es requerido."),
  fechaExpedicion: z.string().min(1, "La fecha de expedición es requerida."),
  numeroDias: z.string().optional(),
  observaciones: z.string().optional(),
  
  certificadoIncapacidad: z.any()
    .refine(files => files && files.length > 0, "El certificado de incapacidad es requerido.")
    .refine(files => files && files?.[0]?.size <= MAX_FILE_SIZE, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(files => files && ALLOWED_FILE_TYPES_ALL.includes(files?.[0]?.type), 'Se permiten archivos PDF, Word o imágenes (JPG, PNG, WEBP).'),
});

type FormValuesIncapacidades = z.infer<typeof formSchemaIncapacidades>;

const IncapacidadesLicenciasPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { afiliado, getActiveConvenio } = useAfiliadoAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const recaptchaRef = useRef<InvisibleRecaptchaRef>(null);
  
  const activeConvenio = getActiveConvenio();
  const form = useForm<FormValuesIncapacidades>({
    resolver: zodResolver(formSchemaIncapacidades),
    defaultValues: {
      tipoDocumento: '',
      entidadExpedidora: '',
      fechaExpedicion: '',
      numeroDias: '',
      observaciones: '',
      certificadoIncapacidad: undefined,
    },
  });

  const onSubmit = async (data: FormValuesIncapacidades) => {
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
      if (data.certificadoIncapacidad) {
        files.certificadoIncapacidad = data.certificadoIncapacidad;
      }

      const procesoValue = activeConvenio?.proceso ?? '';
      const dondeRealizaProcesoValue = activeConvenio?.cliente ?? '';

      const requestData = {
        request_type: 'incapacidad-licencia',
        id_type: afiliado.tipo_documento || '',
        id_number: afiliado.documento || '',
        name: afiliado.nombres || '',
        last_name: afiliado.apellidos || '',
        email: afiliado.correo_personal || '',
        phone_number: afiliado.celular || '',
        payload: {
          // SIEMPRE incluir proceso y dondeRealizaProceso (incluso si están vacíos)
          proceso: procesoValue,
          dondeRealizaProceso: dondeRealizaProcesoValue,
          tipoDocumento: data.tipoDocumento,
          entidadExpedidora: data.entidadExpedidora,
          fechaExpedicion: data.fechaExpedicion,
          numeroDias: data.numeroDias,
          observaciones: data.observaciones
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
      
      toast.success('Solicitud de incapacidad/licencia enviada', {
        description: 'Su solicitud ha sido recibida. Se procesará según los plazos establecidos y recibirá una respuesta en máximo 3 días hábiles.',
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
        description: 'Por favor verifique los datos ingresados e intente nuevamente. Asegúrese de adjuntar el certificado de incapacidad.',
        duration: 5000,
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      });
    }
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
                <Hospital className="h-4 w-4 mr-1 inline-block" /> Incapacidades y Licencias
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <IncapacidadesHeader />
        <ConsultaPagoIncapacidadCard />
        <InformacionImportanteIncapacidadesAlert />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, handleError)} className="space-y-8">
            <DatosPersonalesReadOnly />
            <TipoIncapacidadSection control={form.control} />
            <AnexoIncapacidadSection control={form.control} />
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

const IncapacidadesLicenciasPage: React.FC = () => {
  return (
    <RequireActiveAfiliadoAuth procedureName="Incapacidades y Licencias">
      <IncapacidadesLicenciasPageContent />
    </RequireActiveAfiliadoAuth>
  );
};

export default IncapacidadesLicenciasPage;