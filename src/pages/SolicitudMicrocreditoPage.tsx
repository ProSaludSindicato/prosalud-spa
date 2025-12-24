import React, { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";

import MainLayout from "@/components/layout/MainLayout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Form } from "@/components/ui/form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Home, CreditCard, Info, Mail, Clock, Send, CheckCircle2, AlertCircle, DollarSign } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { submitRequest } from "@/services/requestsService";
import RequireAfiliadoAuth from "@/components/auth/RequireAfiliadoAuth";
import { useAfiliadoAuth } from "@/context/AfiliadoAuthContext";
import InvisibleRecaptcha, { InvisibleRecaptchaRef } from "@/components/shared/InvisibleRecaptcha";
import { RECAPTCHA_CONFIG } from "@/config/api";
import { logger } from "@/utils/logger";

import DatosPersonalesReadOnly from "@/components/shared/DatosPersonalesReadOnly";
import ConfirmacionCorreoSection from "@/components/solicitud-certificado/ConfirmacionCorreoSection";
import AutorizacionDatosSection from "@/components/solicitud-certificado/AutorizacionDatosSection";

const idTypes = [
  { value: "CC", label: "Cédula de Ciudadanía (CC)" },
  { value: "CE", label: "Cédula de Extranjería (CE)" },
  { value: "PP", label: "Pasaporte (PP)" },
  { value: "PT", label: "Permiso por protección temporal (PT)" },
];
// La sede se obtiene del convenio activo (cliente) y se envía por debajo

const microcreditoFormSchema = z.object({
  montoSolicitado: z.preprocess(
    (val) => (val === "" ? undefined : Number(String(val).replace(/\./g, ""))),
    z
      .number({ required_error: "Monto es requerido.", invalid_type_error: "Monto debe ser un número." })
      .min(1, "Monto debe ser mayor a 0."),
  ),
  numeroCuotas: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z
      .number({
        required_error: "Número de cuotas es requerido.",
        invalid_type_error: "Número de cuotas debe ser un número.",
      })
      .min(1, "Mínimo 1 cuota.")
      .max(12, "Máximo 12 cuotas."),
  ),
  confirmacionCorreo: z.boolean().optional(),
});

type MicrocreditoFormValues = z.infer<typeof microcreditoFormSchema>;

const SolicitudMicrocreditoPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { afiliado } = useAfiliadoAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const recaptchaRef = useRef<InvisibleRecaptchaRef>(null);
  const form = useForm<MicrocreditoFormValues>({
    resolver: zodResolver(microcreditoFormSchema),
    defaultValues: {
      montoSolicitado: undefined,
      numeroCuotas: undefined,
      confirmacionCorreo: false,
    },
  });

  const onSubmit = async (data: MicrocreditoFormValues) => {
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

      const requestData = {
        request_type: "microcredito",
        id_type: afiliado.tipo_documento || '',
        id_number: afiliado.documento || '',
        name: afiliado.nombres || '',
        last_name: afiliado.apellidos || '',
        email: afiliado.correo_personal || '',
        phone_number: afiliado.celular || '',
        payload: {
          sedeProceso: (afiliado as any)?.convenios?.[0]?.cliente || "",
          montoSolicitado: data.montoSolicitado,
          numeroCuotas: data.numeroCuotas,
        },
        ...(recaptchaToken && { recaptcha_token: recaptchaToken })
      };

      await submitRequest(requestData);
      
      // Reset reCAPTCHA after successful submission
      recaptchaRef.current?.reset();

      form.reset();

      toast.success("Solicitud enviada", {
        description: (
          <>
            Su solicitud de microcrédito ha sido enviada para revisión.
            <br />
            <span className="mt-1 block text-sm">Si no visualiza el correo, revise su bandeja de SPAM.</span>
          </>
        ),
      });

      // Redirect with a longer delay to ensure the toast is visible before unmount
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      toast.error("Error", {
        description: "Error al enviar solicitud. Por favor intente nuevamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto pt-6 pb-2 px-4 md:px-6 lg:px-8">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">
                  <Home className="h-4 w-4 mr-1 inline-block" /> Inicio
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                <CreditCard className="h-4 w-4 mr-1 inline-block" /> Solicitud de Microcrédito
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <header className="mb-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary-prosalud-dark" />
              <h1 className="text-xl md:text-2xl font-bold text-primary-prosalud-dark">Solicitud - Microcrédito CEII</h1>
            </div>
          </header>

          <div className="space-y-4 mb-8">
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Por favor diligencie los datos solicitados. Los datos enviados son solo de manera informativa. No
                garantiza o autoriza ningún proceso. Si la solicitud es aprobada recibirá un correo de continuidad del proceso por parte de Capital & Ideas
                S.A.S. desde el correo <strong className="font-mono bg-blue-200 px-1 rounded">ceiisas@hotmail.com</strong>.
              </AlertDescription>
            </Alert>

            <Alert className="border-blue-200 bg-blue-50">
              <Mail className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Para evitar que los correos que se le envíen lleguen a SPAM sugerimos agregar la cuenta de correo{" "}
                <strong className="font-mono bg-blue-200 px-1 rounded">ceiisas@hotmail.com</strong> al correo deseado
                y a la lista de contactos.
              </AlertDescription>
            </Alert>

            <Alert className="border-amber-200 bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Horario de revisión:</strong> Lunes a viernes de 8:00 a.m. a 4:00 p.m. Cualquier
                registro vencido el citado horario, se entenderá presentado el siguiente día hábil. Se registran y
                asigna su revisión por orden de registro.
              </AlertDescription>
            </Alert>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <DatosPersonalesReadOnly />

              <section className="p-6 border rounded-lg shadow-sm bg-white">
                <h2 className="text-xl font-semibold mb-6 text-primary-prosalud-dark flex items-center">
                  <DollarSign className="mr-2 h-6 w-6" />
                  Información del Microcrédito
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="montoSolicitado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Monto en COP a solicitar *{" "}
                          <span className="text-xs text-muted-foreground">(Sin puntos ni comas)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ej: 500000"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value === "" ? undefined : e.target.value.replace(/\D/g, ""))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numeroCuotas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Número de cuotas * <span className="text-xs text-muted-foreground">(Min 1 y Max 12)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            max="12"
                            placeholder="Ej: 6"
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                field.onChange(undefined);
                              } else {
                                const numValue = parseInt(value, 10);
                                field.onChange(isNaN(numValue) ? undefined : numValue);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

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

              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-10">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-secondary-prosaludgreen hover:bg-secondary-prosaludgreen/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
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

const SolicitudMicrocreditoPage: React.FC = () => {
  return (
    <RequireAfiliadoAuth>
      <SolicitudMicrocreditoPageContent />
    </RequireAfiliadoAuth>
  );
};

export default SolicitudMicrocreditoPage;
