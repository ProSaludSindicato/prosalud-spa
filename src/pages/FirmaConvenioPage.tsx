import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MainLayout from '@/components/layout/MainLayout';
import { toast } from 'sonner';
import { FileSignature, Home, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import RequireAfiliadoAuth from '@/components/auth/RequireAfiliadoAuth';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import { crearFirmaConvenio } from '@/services/firmaConvenioService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Mapeo entre códigos de documento y nombres completos
const tipoDocumentoMap: Record<string, string> = {
  'CC': 'Cédula de Ciudadanía',
  'CE': 'Cédula de Extranjería',
  'TI': 'Tarjeta de Identidad',
  'PT': 'Permiso por Protección Temporal',
  'PA': 'Pasaporte',
  'RC': 'Registro Civil',
  // También soportar nombres completos directamente
  'Cédula de Ciudadanía': 'Cédula de Ciudadanía',
  'Cédula de Extranjería': 'Cédula de Extranjería',
  'Pasaporte': 'Pasaporte',
};

const tipoDocumentoReverseMap: Record<string, string> = {
  'Cédula de Ciudadanía': 'CC',
  'Cédula de Extranjería': 'CE',
  'Tarjeta de Identidad': 'TI',
  'Permiso por Protección Temporal': 'PT',
  'Pasaporte': 'PA',
  'Registro Civil': 'RC',
};

// Convertir código a nombre completo
const codigoToNombre = (codigo: string | null | undefined): string => {
  if (!codigo) return '';
  return tipoDocumentoMap[codigo] || codigo;
};

// Convertir nombre completo a código (si es necesario para el backend)
const nombreToCodigo = (nombre: string | null | undefined): string => {
  if (!nombre) return '';
  return tipoDocumentoReverseMap[nombre] || nombre;
};

const formSchema = z.object({
  tipo_documento: z.string().min(1, 'El tipo de documento es requerido'),
  documento: z.string().min(1, 'El número de documento es requerido'),
  fecha_expedicion: z.string().min(1, 'La fecha de expedición es requerida'),
});

type FormValues = z.infer<typeof formSchema>;

const FirmaConvenioPageContent: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { afiliado, fechaExpedicion } = useAfiliadoAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSigned, setIsSigned] = useState(false);

  // Verificar si viene de retorno de DocuSign
  useEffect(() => {
    const envelopeIdParam = searchParams.get('envelope_id');
    const documentoParam = searchParams.get('documento');
    
    // Obtener todos los valores de 'event' (puede haber múltiples)
    const allEvents = searchParams.getAll('event');
    const event = allEvents.find(e => e !== '{event}') || searchParams.get('event');

    // Verificar si hay parámetros de retorno de DocuSign
    const hasReturnParams = envelopeIdParam || documentoParam || event;
    
    if (hasReturnParams) {
      // Verificar si el evento indica que se completó la firma
      const isSigningComplete = event === 'signing_complete' || event === 'viewing_complete';
      
      // Verificar si hay un envelope_id real (no placeholder)
      const hasRealEnvelopeId = envelopeIdParam && 
                                 envelopeIdParam !== '{envelope_id}' && 
                                 envelopeIdParam.length > 0 &&
                                 !envelopeIdParam.startsWith('{');
      
      // Si hay evento de completado O si hay envelope_id real, mostrar éxito
      if (isSigningComplete || hasRealEnvelopeId) {
        setIsSigned(true);
        toast.success('Documento firmado exitosamente', {
          description: 'Tu convenio ha sido firmado correctamente. Recibirás una copia por correo electrónico.',
          duration: 8000,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
        });
      }
    }
  }, [searchParams]);

  // Convertir fecha de formato DD/MM/YYYY a YYYY-MM-DD para el input date
  const convertDateToInputFormat = (dateStr: string): string => {
    if (!dateStr) return '';
    // Si ya está en formato YYYY-MM-DD, retornar tal cual
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Si está en formato DD/MM/YYYY, convertir
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // Prellenar formulario con datos del afiliado autenticado
  // Convertir código de documento a nombre completo para el select
  const tipoDocumentoInicial = afiliado?.tipo_documento 
    ? codigoToNombre(afiliado.tipo_documento) 
    : '';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo_documento: tipoDocumentoInicial,
      documento: afiliado?.documento || '',
      fecha_expedicion: fechaExpedicion ? convertDateToInputFormat(fechaExpedicion) : '',
    },
  });

  // Actualizar fecha si viene del contexto después de la inicialización
  useEffect(() => {
    if (fechaExpedicion && !form.getValues('fecha_expedicion')) {
      const formattedDate = convertDateToInputFormat(fechaExpedicion);
      form.setValue('fecha_expedicion', formattedDate);
    }
  }, [fechaExpedicion, form]);

  // Actualizar tipo de documento cuando el afiliado esté disponible
  useEffect(() => {
    if (afiliado?.tipo_documento && !form.getValues('tipo_documento')) {
      const tipoDocNombre = codigoToNombre(afiliado.tipo_documento);
      if (tipoDocNombre) {
        form.setValue('tipo_documento', tipoDocNombre);
      }
    }
  }, [afiliado?.tipo_documento, form]);


  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      // Construir return_url con parámetros para identificar el documento
      const returnUrl = `${window.location.origin}/servicios/firma-convenio?envelope_id={envelope_id}&documento=${data.documento}&event={event}`;

      // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY para el API
      const fechaParts = data.fecha_expedicion.split('-');
      const fechaFormatted = fechaParts.length === 3 
        ? `${fechaParts[2]}/${fechaParts[1]}/${fechaParts[0]}`
        : data.fecha_expedicion;

      // Convertir nombre completo de vuelta al código original para el API
      // El backend espera códigos (CC, CE, etc.), no nombres completos
      const tipoDocumentoParaAPI = nombreToCodigo(data.tipo_documento) || data.tipo_documento;

      const response = await crearFirmaConvenio({
        tipo_documento: tipoDocumentoParaAPI,
        documento: data.documento,
        fecha_expedicion: fechaFormatted,
        return_url: returnUrl,
        email_subject: 'Firma de Convenio de Afiliación',
        document_name: 'Convenio de Afiliación',
      });

      if (response.success && response.data.signing_url) {
        // Mostrar mensaje informativo antes de redirigir
        toast.success('Redirigiendo a DocuSign...', {
          description: 'Serás redirigido a la página de firma de DocuSign. Completa el proceso y serás redirigido automáticamente de vuelta.',
          duration: 3000,
        });
        
        // Redirigir después de un breve delay para que el usuario vea el mensaje
        setTimeout(() => {
          window.location.href = response.data.signing_url;
        }, 500);
      }
    } catch (error: any) {
      console.error('Error al crear firma:', error);
      
      if (error.isValidationError) {
        // Mostrar errores de validación
        const errorMessages = Object.values(error.errors || {}).flat();
        toast.error('Error de validación', {
          description: errorMessages.join(', ') || error.message,
          duration: 6000,
          icon: <AlertCircle className="h-5 w-5 text-red-600" />,
        });
      } else if (error.isRateLimitError) {
        toast.error('Límite de solicitudes excedido', {
          description: error.message,
          duration: 6000,
          icon: <AlertCircle className="h-5 w-5 text-red-600" />,
        });
      } else {
        toast.error('Error al crear la solicitud de firma', {
          description: error.message || 'Por favor, verifica los datos e intenta nuevamente.',
          duration: 6000,
          icon: <AlertCircle className="h-5 w-5 text-red-600" />,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };


  // Si el documento ya fue firmado, mostrar mensaje de éxito
  if (isSigned) {
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
                  <FileSignature className="h-4 w-4" />
                  Firma de Convenios
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 rounded-full">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Firma completada exitosamente</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Tu convenio ha sido firmado correctamente
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  Has firmado tu convenio de afiliación de forma digital. Recibirás una copia del documento firmado en tu correo electrónico.
                </AlertDescription>
              </Alert>
              <div className="flex gap-3 pt-4">
                <Button onClick={() => navigate('/')} className="flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  Volver al inicio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

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
                <FileSignature className="h-4 w-4" />
                Firma de Convenios
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-4 bg-primary-prosalud/10 rounded-full">
                <FileSignature className="h-12 w-12 text-primary-prosalud" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Firma de Convenios
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Firma tu convenio de afiliación de forma digital y segura usando DocuSign
            </p>
          </div>

          {/* Información del proceso */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FileSignature className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-gray-900">Proceso de firma digital</h3>
                  <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                    <li>Confirma tus datos de identificación a continuación</li>
                    <li>Serás redirigido a DocuSign para completar la firma</li>
                    <li>Una vez firmado, serás redirigido automáticamente de vuelta</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulario de datos */}
          <Card>
            <CardHeader>
              <CardTitle>Datos de identificación</CardTitle>
              <CardDescription>
                Confirma tus datos para iniciar el proceso de firma. Serás redirigido a DocuSign para completar la firma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="tipo_documento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de documento *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!afiliado?.tipo_documento}>
                          <FormControl>
                            <SelectTrigger className={afiliado?.tipo_documento ? 'bg-slate-100' : ''}>
                              <SelectValue placeholder="Selecciona el tipo de documento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cédula de Ciudadanía">Cédula de Ciudadanía</SelectItem>
                            <SelectItem value="Cédula de Extranjería">Cédula de Extranjería</SelectItem>
                            <SelectItem value="Tarjeta de Identidad">Tarjeta de Identidad</SelectItem>
                            <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                            <SelectItem value="Permiso por Protección Temporal">Permiso por Protección Temporal</SelectItem>
                            <SelectItem value="Registro Civil">Registro Civil</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="documento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de documento *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ingresa tu número de documento"
                            disabled={!!afiliado?.documento}
                            className={afiliado?.documento ? 'bg-slate-100' : ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fecha_expedicion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de expedición del documento *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value || ''}
                            max={new Date().toISOString().split('T')[0]}
                            disabled={!!fechaExpedicion}
                            className={fechaExpedicion ? 'bg-slate-100' : ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/')}
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-secondary-prosaludgreen hover:bg-secondary-prosaludgreen/90"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creando solicitud...
                        </>
                      ) : (
                        <>
                          <FileSignature className="mr-2 h-4 w-4" />
                          Iniciar firma
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

const FirmaConvenioPage: React.FC = () => {
  return (
    <RequireAfiliadoAuth>
      <FirmaConvenioPageContent />
    </RequireAfiliadoAuth>
  );
};

export default FirmaConvenioPage;

