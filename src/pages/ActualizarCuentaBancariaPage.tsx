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

import DatosPersonalesReadOnly from '@/components/shared/DatosPersonalesReadOnly';
import InformacionProcesoAuth from '@/components/shared/InformacionProcesoAuth';
import ConfirmacionCorreoSection from '@/components/solicitud-certificado/ConfirmacionCorreoSection';
import AutorizacionDatosSection from '@/components/solicitud-certificado/AutorizacionDatosSection';

import ActualizarCuentaHeader from '@/components/actualizar-cuenta/ActualizarCuentaHeader';
import InformacionImportanteCuentaAlert from '@/components/actualizar-cuenta/InformacionImportanteCuentaAlert';
import AnexoCertificacionBancariaSection from '@/components/actualizar-cuenta/AnexoCertificacionBancariaSection';

const ALLOWED_FILE_TYPES_CERTIFICADO = ALLOWED_FILE_TYPES_ALL;

const formSchemaActualizarCuenta = z.object({
  proceso: z.string().min(1, "Este campo es requerido."),
  dondeRealizaProceso: z.string().min(1, "Este campo es requerido."),
  
  certificacionBancaria: z.any()
    .refine(files => files && files.length > 0, "La certificación bancaria es requerida.")
    .refine(files => files && files?.[0]?.size <= MAX_FILE_SIZE, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(files => files && ALLOWED_FILE_TYPES_CERTIFICADO.includes(files?.[0]?.type), 'Se permiten archivos PDF, Word o imágenes (JPG, PNG, GIF, WEBP).'),
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
      proceso: activeConvenio?.proceso || '',
      dondeRealizaProceso: activeConvenio?.cliente && activeConvenio.cliente !== 'SIN ASIGNAR' ? activeConvenio.cliente : '',
      certificacionBancaria: undefined,
    },
  });

  const onSubmit = async (data: FormValuesActualizarCuenta) => {
    if (!afiliado) return;
    
    setIsSubmitting(true);
    try {
      const files: Record<string, File> = {};
      if (data.certificacionBancaria) {
        files.certificacionBancaria = data.certificacionBancaria;
      }

      const requestData = {
        request_type: 'actualizar-cuenta',
        id_type: afiliado.tipo_documento || '',
        id_number: afiliado.documento || '',
        name: afiliado.nombres || '',
        last_name: afiliado.apellidos || '',
        email: afiliado.correo_personal || '',
        phone_number: afiliado.celular || '',
        payload: {
          proceso: data.proceso,
          dondeRealizaProceso: data.dondeRealizaProceso
        },
        files
      };

      await submitRequest(requestData);

      form.reset();
      
      toast.success('Solicitud de cambio de cuenta enviada', {
        description: 'Su solicitud ha sido recibida. Se procesará según los plazos establecidos.',
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
      description: 'Por favor verifique los datos ingresados e intente nuevamente. Asegúrese de adjuntar la certificación bancaria.',
      duration: 5000,
      icon: <AlertCircle className="h-5 w-5 text-red-600" />,
    });
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
                <FileText className="h-4 w-4 mr-1 inline-block" /> Actualizar Cuenta Bancaria
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <ActualizarCuentaHeader />
        <InformacionImportanteCuentaAlert />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, handleError)} className="space-y-8">
            <DatosPersonalesReadOnly />
            <InformacionProcesoAuth control={form.control} setValue={form.setValue} />
            <AnexoCertificacionBancariaSection control={form.control} />
            <ConfirmacionCorreoSection /> {/* Removido el prop 'control' */}
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
