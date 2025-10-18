
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

import SolicitudRetiroHeader from '@/components/solicitud-retiro/SolicitudRetiroHeader';
import InformacionGeneralRetiroSection from '@/components/solicitud-retiro/InformacionGeneralRetiroSection';
import DatosPersonalesRetiroSection from '@/components/solicitud-retiro/DatosPersonalesRetiroSection';
import InformacionProcesoRetiroSection from '@/components/solicitud-retiro/InformacionProcesoRetiroSection';
import DescargarFormatoRetiroSection from '@/components/solicitud-retiro/DescargarFormatoRetiroSection';
import AnexoRetiroSection from '@/components/solicitud-retiro/AnexoRetiroSection';
import ConfirmacionCorreoSection from '@/components/solicitud-certificado/ConfirmacionCorreoSection';
import AutorizacionDatosSection from '@/components/solicitud-certificado/AutorizacionDatosSection';
import MensajeDespedidaRetiroSection from '@/components/solicitud-retiro/MensajeDespedidaRetiroSection';

const formSchema = z.object({
  tipoIdentificacion: z.string().min(1, "Este campo es requerido."),
  numeroIdentificacion: z.string().min(5, "Debe tener al menos 5 dígitos.").regex(/^\d+$/, "Solo se permiten números."),
  nombres: z.string().min(2, "Este campo es requerido."),
  apellidos: z.string().min(2, "Este campo es requerido."),
  correoElectronico: z.string().email("Correo electrónico inválido."),
  numeroCelular: z.string().min(7, "Número de celular inválido.").regex(/^\d+$/, "Solo se permiten números."),
  
  proceso: z.string().min(1, "Este campo es requerido."),
  dondeRealizaProceso: z.string().min(1, "Este campo es requerido."),

  formatoRetiroAnexo: z.any().refine(files => {
    return files && files.length > 0;
  }, "Debe adjuntar el formato de retiro diligenciado.").refine(files => {
    if (!files || files.length === 0) return true;
    const file = files[0];
    return file.size <= MAX_FILE_SIZE;
  }, `El archivo no debe exceder los ${MAX_FILE_SIZE / (1024*1024)}MB.`).refine(files => {
    if (!files || files.length === 0) return true;
    const file = files[0];
    return ALLOWED_FILE_TYPES_ALL.includes(file.type);
  }, 'Se permiten archivos PDF, Word o imágenes (JPG, PNG, GIF, WEBP).'),
  
  confirmacionCorreo: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

const SolicitudRetiroSindicalPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '',
      nombres: '',
      apellidos: '',
      correoElectronico: '',
      numeroCelular: '',
      proceso: '',
      dondeRealizaProceso: '',
      formatoRetiroAnexo: undefined,
      confirmacionCorreo: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const files: Record<string, File> = {};
      if (data.formatoRetiroAnexo) {
        files.formatoRetiroAnexo = data.formatoRetiroAnexo;
      }

      const requestData = {
        request_type: 'retiro-sindical',
        id_type: data.tipoIdentificacion,
        id_number: data.numeroIdentificacion,
        name: data.nombres,
        last_name: data.apellidos,
        email: data.correoElectronico,
        phone_number: data.numeroCelular,
        payload: {
          proceso: data.proceso,
          dondeRealizaProceso: data.dondeRealizaProceso
        },
        files
      };

      await submitRequest(requestData);

      form.reset();
      
      toast.success('Solicitud de retiro enviada con éxito', {
        description: (
          <>
            Su solicitud ha sido recibida y será procesada según los procedimientos establecidos.
            <br />
            <strong className="mt-2 block font-semibold">Importante:</strong> En caso de requerir información adicional nos comunicaremos con usted.
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
  
  const idTypes = [
    { value: "CC", label: "Cédula de Ciudadanía (CC)" },
    { value: "CE", label: "Cédula de Extranjería (CE)" },
    { value: "PP", label: "Pasaporte (PP)" },
    { value: "PT", label: "Permiso por protección temporal (PT)" },
  ];

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
                Solicitud de Retiro Sindical
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <SolicitudRetiroHeader />
        <InformacionGeneralRetiroSection />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, handleError)} className="space-y-8">
            <DescargarFormatoRetiroSection />
            <DatosPersonalesRetiroSection control={form.control} idTypes={idTypes} />
            <InformacionProcesoRetiroSection control={form.control} />
            <AnexoRetiroSection control={form.control} />
            <ConfirmacionCorreoSection />
            <AutorizacionDatosSection />
            <MensajeDespedidaRetiroSection />
            
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

export default SolicitudRetiroSindicalPage;
