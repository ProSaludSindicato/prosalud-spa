import React, { useEffect } from 'react';
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
import InformacionProcesoSectionAuth from '@/components/verificacion-pagos/InformacionProcesoSectionAuth';
import DetalleNovedadSection from '@/components/verificacion-pagos/DetalleNovedadSection';
import ArchivoAnexoSection from '@/components/verificacion-pagos/ArchivoAnexoSection';
import VerificacionHeader from '@/components/verificacion-pagos/VerificacionHeader';
import InformacionImportanteConsolidada from '@/components/verificacion-pagos/InformacionImportanteConsolidada';
import ConfirmacionCorreoSection from '@/components/solicitud-certificado/ConfirmacionCorreoSection';
import AutorizacionDatosSection from '@/components/solicitud-certificado/AutorizacionDatosSection';

const formSchema = z.object({
  proceso: z.string().min(1, "Este campo es requerido."),
  dondeRealizaProceso: z.string().min(1, "Este campo es requerido."),
  mesAnoNovedad: z.string().min(1, "Este campo es requerido."),
  solicitudRelacionadaCon: z.string().min(1, "Este campo es requerido."),
  detalleNovedad: z.string().min(10, "Debe proporcionar al menos 10 caracteres.").max(800, "Máximo 800 caracteres."),

  archivoAnexo: z.any().optional().refine(files => {
    if (!files || files.length === 0) return true;
    const file = files[0];
    return file.size <= MAX_FILE_SIZE;
  }, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`).refine(files => {
    if (!files || files.length === 0) return true;
    const file = files[0];
    return ALLOWED_FILE_TYPES_ALL.includes(file.type);
  }, 'Se permiten archivos PDF, Word o imágenes (JPG, PNG, GIF, WEBP).'),
  
  confirmacionEnvio: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

const VerificacionPagosPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { afiliado, getActiveConvenio } = useAfiliadoAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const activeConvenio = getActiveConvenio();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      proceso: activeConvenio?.proceso || '',
      dondeRealizaProceso: activeConvenio?.cliente && activeConvenio.cliente !== 'SIN ASIGNAR' ? activeConvenio.cliente : '',
      mesAnoNovedad: '',
      solicitudRelacionadaCon: '',
      detalleNovedad: '',
      archivoAnexo: undefined,
      confirmacionEnvio: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!afiliado) return;
    
    setIsSubmitting(true);
    try {
      const files: Record<string, File> = {};
      if (data.archivoAnexo) {
        files.archivoAnexo = data.archivoAnexo;
      }

      const requestData = {
        request_type: 'verificacion-pagos',
        id_type: afiliado.tipo_documento || '',
        id_number: afiliado.documento || '',
        name: afiliado.nombres || '',
        last_name: afiliado.apellidos || '',
        email: afiliado.correo_personal || '',
        phone_number: afiliado.celular || '',
        payload: {
          proceso: data.proceso,
          dondeRealizaProceso: data.dondeRealizaProceso,
          mesAnoNovedad: data.mesAnoNovedad,
          solicitudRelacionadaCon: data.solicitudRelacionadaCon,
          detalleNovedad: data.detalleNovedad
        },
        files
      };

      await submitRequest(requestData);

      form.reset();
      
      toast.success('Solicitud de verificación enviada con éxito', {
        description: (
          <>
            Su consulta será remitida al área encargada y estaremos dando respuesta a la mayor brevedad.
            <br />
            <strong className="mt-2 block font-semibold">Tiempo estimado:</strong> Hasta 15 días hábiles para revisión de su caso.
          </>
        ),
        duration: 8000,
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      });
      
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
                <FileText className="h-4 w-4 mr-1 inline-block" /> Verificación de Pagos
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <VerificacionHeader />
        <InformacionImportanteConsolidada />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, handleError)} className="space-y-8">
            <DatosPersonalesReadOnly />
            <InformacionProcesoSectionAuth control={form.control} setValue={form.setValue} />
            <DetalleNovedadSection control={form.control} />
            <ArchivoAnexoSection control={form.control} />
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

const VerificacionPagosPage: React.FC = () => {
  return (
    <RequireAfiliadoAuth>
      <VerificacionPagosPageContent />
    </RequireAfiliadoAuth>
  );
};

export default VerificacionPagosPage;
