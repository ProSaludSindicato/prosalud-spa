import React from "react";
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
import { Home, CreditCard, Info, Mail, Clock, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { submitRequest } from "@/services/requestsService";

import DatosPersonalesSection from "@/components/solicitud-certificado/DatosPersonalesSection";
import ConfirmacionCorreoSection from "@/components/solicitud-certificado/ConfirmacionCorreoSection";
import AutorizacionDatosSection from "@/components/solicitud-certificado/AutorizacionDatosSection";

const idTypes = [
  { value: "CC", label: "Cédula de Ciudadanía (CC)" },
  { value: "CE", label: "Cédula de Extranjería (CE)" },
  { value: "PP", label: "Pasaporte (PP)" },
  { value: "PT", label: "Permiso por protección temporal (PT)" },
];
const sedesOptions = [
  { value: "BELLO", label: "Bello" },
  { value: "CALDAS", label: "Caldas" },
  { value: "LA_MARIA", label: "La Maria" },
  { value: "RIONEGRO", label: "Rionegro" },
  { value: "GENERAL", label: "General" },
];

const microcreditoFormSchema = z.object({
  tipoIdentificacion: z
    .string({ required_error: "Tipo de identificación es requerido." })
    .min(1, "Tipo de identificación es requerido."),
  numeroIdentificacion: z
    .string({ required_error: "Número de identificación es requerido." })
    .min(5, "Número de identificación inválido."),
  nombres: z.string({ required_error: "Nombres son requeridos." }).min(2, "Nombres deben tener al menos 2 caracteres."),
  apellidos: z
    .string({ required_error: "Apellidos son requeridos." })
    .min(2, "Apellidos deben tener al menos 2 caracteres."),
  correoElectronico: z
    .string({ required_error: "Correo electrónico es requerido." })
    .email("Correo electrónico inválido."),
  numeroCelular: z
    .string({ required_error: "Número de celular es requerido." })
    .regex(/^\d{10}$/, "Número de celular debe tener 10 dígitos."),
  sedeProceso: z.string({ required_error: "Sede es requerida." }).min(1, "Sede es requerida."),
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

const SolicitudMicrocreditoPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const form = useForm<MicrocreditoFormValues>({
    resolver: zodResolver(microcreditoFormSchema),
    defaultValues: {
      tipoIdentificacion: "",
      numeroIdentificacion: "",
      nombres: "",
      apellidos: "",
      correoElectronico: "",
      numeroCelular: "",
      sedeProceso: "",
      montoSolicitado: undefined,
      numeroCuotas: undefined,
      confirmacionCorreo: false,
    },
  });

  const onSubmit = async (data: MicrocreditoFormValues) => {
    setIsSubmitting(true);
    try {
      const requestData = {
        request_type: "microcredito",
        id_type: data.tipoIdentificacion,
        id_number: data.numeroIdentificacion,
        name: data.nombres,
        last_name: data.apellidos,
        email: data.correoElectronico,
        phone_number: data.numeroCelular,
        payload: {
          sedeProceso: data.sedeProceso,
          montoSolicitado: data.montoSolicitado,
          numeroCuotas: data.numeroCuotas,
        },
      };

      await submitRequest(requestData);

      form.reset();

      toast.success("Solicitud enviada", {
        description: "Su solicitud de microcrédito ha sido enviada para revisión.",
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
        <div className="max-w-5xl mx-auto">
          <header className="mb-8 text-center">
            <div className="flex justify-center items-center gap-3 mb-4">
              <CreditCard className="h-8 w-8 text-primary-prosalud-dark" />
              <h1 className="text-3xl font-bold text-primary-prosalud-dark">Solicitud - Microcrédito CEII</h1>
            </div>
            <p className="mt-2 text-base text-muted-foreground max-w-3xl mx-auto">
              Por favor, complete todos los campos del siguiente formulario para tramitar su solicitud de microcrédito.
              Verifique que la información ingresada sea correcta.
            </p>
          </header>

          <section className="mt-10 mb-8 p-6 border rounded-lg shadow-sm bg-blue-50 border-blue-200">
            <h2 className="text-xl font-semibold mb-4 text-blue-800 flex items-center">
              <Info className="mr-3 h-6 w-6 text-blue-700" /> Información importante
            </h2>
            <div className="space-y-3 text-blue-700">
              <p>
                Por favor diligencie los datos solicitados. Los datos enviados son solo de manera informativa. No
                garantiza o autoriza ningún proceso.
              </p>

              <Alert className="border-blue-300 bg-blue-100">
                <Mail className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Para evitar que los correos que se le envíen lleguen a SPAM sugerimos agregar la cuenta de correo{" "}
                  <strong className="font-mono bg-blue-200 px-1 rounded">ceiisas@hotmail.com</strong> al correo deseado
                  y a la lista de contactos.
                </AlertDescription>
              </Alert>

              <p>
                Si la solicitud es aprobada recibirá un correo de continuidad del proceso por parte de Capital & Ideas
                S.A.S. desde el correo{" "}
                <strong className="font-mono bg-blue-200 px-1 rounded">ceiisas@hotmail.com</strong>.
              </p>

              <Alert className="border-amber-300 bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  El horario de revisión de solicitudes es de lunes a viernes de 8:00 a.m. a 4:00 p.m., cualquier
                  registro vencido el citado horario, se entenderá presentado el siguiente día hábil. Se registran y
                  asigna su revisión por orden de registro.
                </AlertDescription>
              </Alert>
            </div>
          </section>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <DatosPersonalesSection control={form.control} idTypes={idTypes} />

              <section className="p-6 border rounded-lg shadow-sm bg-white">
                <h2 className="text-xl font-semibold mb-6 text-primary-prosalud-dark">Información del Microcrédito</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="sedeProceso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sede donde realiza el proceso *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione una sede..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sedesOptions.map((sede) => (
                              <SelectItem key={sede.value} value={sede.value}>
                                {sede.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                            min="1"
                            max="12"
                            placeholder="Ej: 6"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value, 10))
                            }
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
      </div>
    </MainLayout>
  );
};

export default SolicitudMicrocreditoPage;
