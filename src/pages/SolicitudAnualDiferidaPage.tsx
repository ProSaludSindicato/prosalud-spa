import React, { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import MainLayout from '@/components/layout/MainLayout';
import { toast } from 'sonner';
import { Send, CheckCircle2, AlertCircle, Home, FileText as PageIcon } from 'lucide-react';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES_ALL } from '@/components/solicitud-certificado/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { submitRequest } from '@/services/requestsService';
import RequireAfiliadoAuth from '@/components/auth/RequireAfiliadoAuth';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import InvisibleRecaptcha, { InvisibleRecaptchaRef } from '@/components/shared/InvisibleRecaptcha';
import { RECAPTCHA_CONFIG } from '@/config/api';
import { logger } from '@/utils/logger';

import DatosPersonalesReadOnly from '@/components/shared/DatosPersonalesReadOnly';
import ConfirmacionCorreoSection from '@/components/solicitud-certificado/ConfirmacionCorreoSection';
import AutorizacionDatosSection from '@/components/solicitud-certificado/AutorizacionDatosSection';

// New components for this page
import AnualDiferidaHeader from '@/components/solicitud-anual-diferida/AnualDiferidaHeader';
import RequisitosAnualDiferidaSection from '@/components/solicitud-anual-diferida/RequisitosAnualDiferidaSection';
import InformacionAnualDiferidaSection from '@/components/solicitud-anual-diferida/InformacionAnualDiferidaSection';
import AnexosAnualDiferidaSection from '@/components/solicitud-anual-diferida/AnexosAnualDiferidaSection';
import InformacionImportanteAnualDiferidaAlert from '@/components/solicitud-anual-diferida/InformacionImportanteAnualDiferidaAlert';

const fileValidation = z.any().refine(files => {
  return files && files.length > 0;
}, "Este archivo es requerido.").refine(files => {
  if (!files || files.length === 0) return true;
  const file = files[0];
  return file.size <= MAX_FILE_SIZE;
}, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`).refine(files => {
  if (!files || files.length === 0) return true;
  const file = files[0];
  return ALLOWED_FILE_TYPES_ALL.includes(file.type);
}, 'Se permiten archivos PDF, Word o imágenes (JPG, PNG, WEBP).');

const formSchemaAnualDiferida = z.object({
  motivoSolicitud: z.string().min(1, "Este campo es requerido."),

  anexoFormatoDiligenciado: fileValidation,
  anexoEvidenciaSolicitud: fileValidation,
  
  confirmacionCorreo: z.boolean().default(false),
});

type FormValuesAnualDiferida = z.infer<typeof formSchemaAnualDiferida>;

const SolicitudAnualDiferidaPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { afiliado, getActiveConvenio } = useAfiliadoAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const recaptchaRef = useRef<InvisibleRecaptchaRef>(null);

  const activeConvenio = getActiveConvenio();
  
  const form = useForm<FormValuesAnualDiferida>({
    resolver: zodResolver(formSchemaAnualDiferida),
    defaultValues: {
      motivoSolicitud: '',
      anexoFormatoDiligenciado: undefined,
      anexoEvidenciaSolicitud: undefined,
      confirmacionCorreo: false,
    },
  });

  const onSubmit = async (data: FormValuesAnualDiferida) => {
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
      if (data.anexoFormatoDiligenciado) {
        files.anexoFormatoDiligenciado = data.anexoFormatoDiligenciado;
      }
      if (data.anexoEvidenciaSolicitud) {
        files.anexoEvidenciaSolicitud = data.anexoEvidenciaSolicitud;
      }

      const requestData = {
        request_type: 'compensacion-anual',
        id_type: afiliado.tipo_documento || '',
        id_number: afiliado.documento || '',
        name: afiliado.nombres || '',
        last_name: afiliado.apellidos || '',
        email: afiliado.correo_personal || '',
        phone_number: afiliado.celular || '',
        payload: {
          proceso: activeConvenio?.proceso || '',
          dondeRealizaProceso: activeConvenio?.cliente || '',
          motivoSolicitud: data.motivoSolicitud
        },
        files,
        ...(recaptchaToken && { recaptcha_token: recaptchaToken })
      };

      await submitRequest(requestData);
      
      // Reset reCAPTCHA after successful submission
      recaptchaRef.current?.reset();

      form.reset();
      
      toast.success('Solicitud de compensación anual diferida enviada', {
        description: (
          <>
            Su solicitud será revisada y procesada según los plazos establecidos.
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
            {/* Consider adding a middle breadcrumb for "Documentos y Formatos" or "Servicios" if applicable */}
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1 font-medium text-foreground">
                <PageIcon className="h-4 w-4" />
                Solicitud Compensación Anual Diferida
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <AnualDiferidaHeader />
        <RequisitosAnualDiferidaSection />
        <InformacionImportanteAnualDiferidaAlert />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, handleError)} className="space-y-8">
            <DatosPersonalesReadOnly />
            <InformacionAnualDiferidaSection control={form.control} />
            <AnexosAnualDiferidaSection control={form.control} />
            <ConfirmacionCorreoSection /> {/* Removed control prop */}
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

const SolicitudAnualDiferidaPage: React.FC = () => {
  return (
    <RequireAfiliadoAuth>
      <SolicitudAnualDiferidaPageContent />
    </RequireAfiliadoAuth>
  );
};

export default SolicitudAnualDiferidaPage;
