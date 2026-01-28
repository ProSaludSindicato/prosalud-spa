import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Calendar, Home, Loader2, FileCheck, XCircle } from 'lucide-react';
import { SignaturePad, SignaturePadRef } from '@/components/admin/sst/SignaturePad';
import { kitBienestarService, AuthenticateResponseData, SingleBeneficiaryResponse, MultipleBeneficiariesResponse } from '@/services/kitBienestarService';
import { logger } from '@/utils/logger';

// Por ahora el período de inscripción estará siempre activo para permitir inscribirse desde el enlace directo
const isEnrollmentPeriodActive = (): boolean => {
  return true;
};

// Función para convertir fecha de YYYY-MM-DD (formato input date) a dd/mm/aa (formato API)
// Parsear directamente desde el string para evitar problemas de zona horaria
const formatDateForApi = (dateString: string): string => {
  if (!dateString) return '';
  
  // El formato del input date es YYYY-MM-DD, parsearlo directamente
  const parts = dateString.split('-');
  if (parts.length !== 3) return '';
  
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  
  // Validar que sean números válidos
  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);
  
  if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum)) return '';
  
  // Formatear: dd/mm/aa (últimos 2 dígitos del año)
  const yearShort = String(yearNum).slice(-2);
  
  return `${String(dayNum).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/${yearShort}`;
};

// Schema de validación para el formulario de autenticación
const authenticateSchema = z.object({
  tipo_documento: z.string().min(1, 'El tipo de documento es requerido'),
  documento: z.string().min(1, 'El número de documento es requerido'),
  fecha_expedicion: z.string()
    .min(1, 'La fecha de expedición es requerida')
    .refine((date) => {
      // Validar que sea una fecha válida en formato YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) return false;
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime());
    }, 'La fecha de expedición no es válida'),
});

type AuthenticateFormValues = z.infer<typeof authenticateSchema>;

// Función para formatear nombres (primera letra mayúscula, resto minúsculas)
const formatName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Función para determinar género del beneficiario basado en el nombre
const getBeneficiaryGender = (name: string): 'la beneficiaria' | 'el beneficiario' => {
  if (!name) return 'el beneficiario';
  
  const nameLower = name.toLowerCase().trim();
  const firstName = nameLower.split(' ')[0];
  
  // Nombres comunes femeninos
  const femaleNames = ['maria', 'maría', 'ana', 'laura', 'sofia', 'sofía', 'valentina', 'isabella', 'camila', 'emilia', 'lucia', 'lucía', 'elena', 'catalina', 'andrea', 'natalia', 'daniela', 'paula', 'juliana', 'carolina', 'diana', 'fernanda', 'gabriela', 'alejandra', 'monica', 'mónica'];
  
  // Nombres comunes masculinos
  const maleNames = ['juan', 'carlos', 'jose', 'josé', 'luis', 'miguel', 'david', 'daniel', 'alejandro', 'santiago', 'sebastian', 'sebastián', 'nicolas', 'nicolás', 'andres', 'andrés', 'felipe', 'mateo', 'samuel', 'thiago', 'emiliano'];
  
  if (femaleNames.includes(firstName)) {
    return 'la beneficiaria';
  }
  if (maleNames.includes(firstName)) {
    return 'el beneficiario';
  }
  
  // Por defecto, usar genérico
  return 'el beneficiario';
};

// Función para construir lista de beneficiarios
const buildBeneficiariesList = (beneficiaries: Array<{ beneficiario: string }>): string => {
  if (beneficiaries.length === 0) return '';
  if (beneficiaries.length === 1) return formatName(beneficiaries[0].beneficiario);
  if (beneficiaries.length === 2) {
    return `${formatName(beneficiaries[0].beneficiario)} y ${formatName(beneficiaries[1].beneficiario)}`;
  }
  
  // 3 o más beneficiarios
  const formatted = beneficiaries.map(b => formatName(b.beneficiario));
  const last = formatted.pop();
  return `${formatted.join(', ')} y ${last}`;
};

const KitBienestarEscolarPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authResult, setAuthResult] = useState<AuthenticateResponseData | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignatureError, setShowSignatureError] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showVerifyButton, setShowVerifyButton] = useState(true);
  const signaturePadRef = useRef<SignaturePadRef>(null);

  const form = useForm<AuthenticateFormValues>({
    resolver: zodResolver(authenticateSchema),
    defaultValues: {
      tipo_documento: 'CC',
      documento: '',
      fecha_expedicion: '',
    },
  });

  // Verificar si el período de inscripción está activo
  const isActive = isEnrollmentPeriodActive();

  // Observar cambios en el documento y fecha de expedición para mostrar el botón nuevamente
  const documento = form.watch('documento');
  const tipoDocumento = form.watch('tipo_documento');
  const fechaExpedicion = form.watch('fecha_expedicion');

  useEffect(() => {
    // Si el botón está oculto y cambia el documento, tipo de documento o fecha de expedición, mostrarlo nuevamente
    // Esto permite al usuario corregir errores en cualquiera de estos campos
    if (!showVerifyButton && (documento || tipoDocumento || fechaExpedicion)) {
      setShowVerifyButton(true);
      setAuthError(null); // Limpiar el error también
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documento, tipoDocumento, fechaExpedicion]);

  const handleAuthenticate = async (data: AuthenticateFormValues) => {
    setIsAuthenticating(true);
    setAuthError(null);
    setAuthResult(null);
    setSignature(null);

    try {
      // Convertir la fecha de YYYY-MM-DD a dd/mm/aa
      const fechaExpedicionFormatted = formatDateForApi(data.fecha_expedicion);
      
      const response = await kitBienestarService.authenticate({
        tipo_documento: data.tipo_documento,
        documento: data.documento,
        fecha_expedicion: fechaExpedicionFormatted,
      });

      if (response.success && response.data) {
        setAuthResult(response.data);
        setShowVerifyButton(true); // Asegurar que el botón esté visible en caso de éxito
        toast.success('Autenticación exitosa');
      } else {
        // Usar mensaje amigable si es un error 404 (no encontrado)
        const friendlyMessage = response.message?.includes('archivo') || response.message?.includes('No se encontró')
          ? 'Lo sentimos, no cumples con los requisitos para reclamar el beneficio de los kits escolares en este momento.'
          : response.message || 'Error al procesar la solicitud. Por favor, intenta nuevamente.';
        
        setAuthError(friendlyMessage);
        toast.error(friendlyMessage);
        
        // Si es el mensaje de requisitos no cumplidos, ocultar el botón
        if (friendlyMessage.includes('no cumples con los requisitos')) {
          setShowVerifyButton(false);
        }
      }
    } catch (error) {
      logger.error('Error al autenticar', { error });
      setAuthError('Error al procesar la solicitud. Por favor, intenta nuevamente.');
      toast.error('Error al procesar la solicitud');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignatureChange = (dataUrl: string | null) => {
    setSignature(dataUrl);
    if (dataUrl) {
      setShowSignatureError(false);
    }
  };

  const handleSubmitInscription = async () => {
    if (!signature) {
      setShowSignatureError(true);
      toast.error('Debes registrar tu firma para poder finalizar la inscripción');
      return;
    }
    
    setShowSignatureError(false);

    if (!authResult) {
      toast.error('No hay datos de autenticación');
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar beneficiarios según el tipo de respuesta
      let beneficiarios: Array<{ beneficiario: string; parentesco?: string; edad?: string }> = [];
      let nombreAfiliado = '';
      let hospital = '';

      if ('beneficiario' in authResult) {
        // Un solo beneficiario
        const single = authResult as SingleBeneficiaryResponse;
        nombreAfiliado = single.nombre;
        hospital = single.hospital;
        beneficiarios = [{
          beneficiario: single.beneficiario,
          parentesco: single.parentesco,
          edad: single.edad,
        }];
      } else if ('beneficiarios' in authResult) {
        // Múltiples beneficiarios
        const multiple = authResult as MultipleBeneficiariesResponse;
        nombreAfiliado = multiple.afiliado.nombre;
        hospital = multiple.afiliado.hospital;
        beneficiarios = multiple.beneficiarios;
      }

      const formData = form.getValues();
      // Convertir la fecha de YYYY-MM-DD a dd/mm/aa
      const fechaExpedicionFormatted = formatDateForApi(formData.fecha_expedicion);
      
      const response = await kitBienestarService.submitInscription({
        tipo_entrega: 'kit_escolar',
        documento_afiliado: formData.documento,
        nombre_afiliado: nombreAfiliado,
        hospital: hospital,
        fecha_expedicion: fechaExpedicionFormatted,
        beneficiarios: beneficiarios,
        firma: signature,
        tipo_firma: 'digital',
      });

      if (response.success) {
        setSuccessData(response.data);
        setShowSuccessModal(true);
        // Resetear formulario y estado después de cerrar el modal
      } else {
        setErrorMessage(response.message || 'Error al procesar la inscripción');
        setShowErrorModal(true);
      }
    } catch (error) {
      logger.error('Error al enviar inscripción', { error });
      setErrorMessage('Error al procesar la inscripción. Por favor, intenta nuevamente.');
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    // Resetear formulario y estado
    form.reset();
    setAuthResult(null);
    setSignature(null);
    setAuthError(null);
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
    // Redirigir a la página principal
    navigate('/');
  };

  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Renderizar mensaje según el tipo de respuesta
  const renderSuccessMessage = () => {
    if (!authResult) return null;

    if ('beneficiario' in authResult) {
      // Un solo beneficiario
      const single = authResult as SingleBeneficiaryResponse;
      const nombreAfiliado = formatName(single.nombre);
      const genero = getBeneficiaryGender(single.beneficiario);
      const nombreBeneficiario = formatName(single.beneficiario);
      
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-slate-700 text-xl leading-relaxed">
              Hola <span className="font-semibold">{nombreAfiliado}</span>,
            </p>
            <p className="text-slate-700 leading-relaxed">
              Hemos verificado que cumples con los requisitos para acceder al <span className="font-semibold">Kit de Bienestar Escolar</span> para {genero}:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li className="text-slate-700">
                <span className="font-semibold">{nombreBeneficiario}</span>
              </li>
            </ul>
          </div>
          <div className="pt-2 border-t border-slate-200">
            <p className="text-slate-700 leading-relaxed">
              Para finalizar la inscripción, por favor firma en el recuadro de abajo.
            </p>
          </div>
          <div className="pt-2">
            <p className="text-slate-600 text-sm leading-relaxed">
              Una vez completado el proceso, nos comunicaremos contigo para informarte cuándo y dónde podrás reclamar el beneficio en la oficina de <span className="font-semibold">ProSalud</span> del <strong>hospital donde realizas actividades</strong>.
            </p>
          </div>
        </div>
      );
    } else if ('beneficiarios' in authResult) {
      // Múltiples beneficiarios
      const multiple = authResult as MultipleBeneficiariesResponse;
      const nombreAfiliado = formatName(multiple.afiliado.nombre);
      
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-slate-700 text-xl leading-relaxed">
              Hola <span className="font-semibold">{nombreAfiliado}</span>,
            </p>
            <p className="text-slate-700 leading-relaxed">
              Hemos verificado que cumples con los requisitos para acceder al <span className="font-semibold">Kit de Bienestar Escolar</span> para los siguientes beneficiarios:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              {multiple.beneficiarios.map((beneficiario, index) => (
                <li key={index} className="text-slate-700">
                  <span className="font-semibold">{formatName(beneficiario.beneficiario)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-2 border-t border-slate-200">
            <p className="text-slate-700 leading-relaxed">
              Para finalizar la inscripción, por favor firma en el recuadro de abajo.
            </p>
          </div>
          <div className="pt-2">
            <p className="text-slate-600 text-sm leading-relaxed">
              Una vez completado el proceso, nos comunicaremos contigo para informarte cuándo y dónde podrás reclamar el beneficio en la oficina de <span className="font-semibold">ProSalud</span> del <strong>hospital donde realizas actividades</strong>.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <Home className="h-4 w-4 mr-2" />
            Volver al inicio
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Kit de Bienestar Escolar
          </h1>
          {!authResult && (
            <p className="text-slate-600">
              Verifica si cumples con los requisitos para acceder al beneficio de kits escolares
            </p>
          )}
          {authResult && (
            <p className="text-slate-600">
              Verifica tu información y firma para completar la inscripción al beneficio.
            </p>
          )}
        </div>

        {!isActive && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <Calendar className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Período de inscripción no disponible</AlertTitle>
            <AlertDescription className="text-amber-700">
              El proceso de inscripción para el Kit de Bienestar Escolar está disponible únicamente los días 21, 22, 23 y 24 de Enero.
            </AlertDescription>
          </Alert>
        )}

        {isActive && (
          <Card>
            {!authResult && (
              <CardHeader>
                <CardTitle>Autenticación</CardTitle>
                <CardDescription>
                  Ingresa tus datos para verificar si cumples con los requisitos
                </CardDescription>
              </CardHeader>
            )}
            <CardContent className={authResult ? 'pt-6' : ''}>
              {!authResult && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAuthenticate)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="tipo_documento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de documento</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona el tipo de documento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                              <SelectItem value="TI">Tarjeta de Identidad (TI)</SelectItem>
                              <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                              <SelectItem value="PA">Pasaporte (PA)</SelectItem>
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
                          <FormLabel>Número de documento</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ingresa tu número de documento"
                              {...field}
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
                          <FormLabel>Fecha de expedición del documento</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              max={new Date().toISOString().split('T')[0]} // No permitir fechas futuras
                            />
                          </FormControl>
                          <FormDescription>
                            Selecciona la fecha de expedición de tu documento
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {authError && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-amber-800 leading-relaxed">
                              {authError}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {showVerifyButton && (
                      <Button
                        type="submit"
                        disabled={isAuthenticating}
                        className="w-full"
                      >
                        {isAuthenticating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          'Verificar requisitos'
                        )}
                      </Button>
                    )}
                  </form>
                </Form>
              )}

              {authResult && (
                <div className="space-y-6">
                  {renderSuccessMessage()}

                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <div>
                      <Label className="text-base font-semibold text-slate-900">
                        Firma digital
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Dibuja tu firma en el recuadro para autorizar la inscripción
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="relative">
                        <div className="[&>div]:space-y-0 [&>div>div:last-child]:hidden">
                          <SignaturePad
                            ref={signaturePadRef}
                            onChange={handleSignatureChange}
                            height={200}
                          />
                        </div>
                        {!signature && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <p className="text-sm text-slate-400 italic">
                              Firma aquí con el mouse o tu dedo
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (signaturePadRef.current) {
                              signaturePadRef.current.clear();
                            }
                            setSignature(null);
                            setShowSignatureError(false);
                          }}
                          className="text-sm text-slate-600 hover:text-slate-900 underline"
                        >
                          Limpiar firma
                        </button>
                      </div>
                    </div>
                    {showSignatureError && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">Debes registrar tu firma para poder finalizar la inscripción.</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-slate-200">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAuthResult(null);
                        setSignature(null);
                        setAuthError(null);
                        if (signaturePadRef.current) {
                          signaturePadRef.current.clear();
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      Volver
                    </Button>
                    <Button
                      onClick={handleSubmitInscription}
                      disabled={isSubmitting}
                      className="flex-1 bg-primary hover:bg-primary/90"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <FileCheck className="mr-2 h-4 w-4" />
                          Finalizar inscripción
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal de éxito */}
        <Dialog 
          open={showSuccessModal} 
          onOpenChange={(open) => {
            if (!open) {
              handleCloseSuccessModal();
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl font-bold text-slate-900">
                ¡Solicitud Recibida Exitosamente!
              </DialogTitle>
              <DialogDescription className="text-center text-slate-600 mt-2">
                Su solicitud ha sido procesada correctamente
              </DialogDescription>
            </DialogHeader>
            
            {successData && (
              <div className="space-y-4 py-4">
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">Tipo de entrega:</span>
                    <span className="text-sm text-slate-900">Kit Escolar</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">Estado:</span>
                    <span className="text-sm font-semibold text-green-600 capitalize">
                      {successData.estado || 'Pendiente'}
                    </span>
                  </div>
                  {successData.created_at && (
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-slate-600">Fecha de registro:</span>
                      <span className="text-sm text-slate-900 text-right">
                        {formatDate(successData.created_at)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Importante:</strong> Nos estaremos comunicando contigo para informarte cuándo y dónde podrás reclamar el beneficio en la oficina de <strong>ProSalud</strong> del hospital donde realizas actividades.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleCloseSuccessModal} className="w-full">
                Entendido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de error */}
        <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl font-bold text-slate-900">
                Error al Procesar la Solicitud
              </DialogTitle>
              <DialogDescription className="text-center text-slate-600 mt-2">
                No se pudo completar la inscripción
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  {errorMessage || 'Ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente.'}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleCloseErrorModal} variant="outline" className="w-full">
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default KitBienestarEscolarPage;

