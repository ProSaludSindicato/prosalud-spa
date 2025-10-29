
import React from 'react';
import { Control, FieldValues } from 'react-hook-form';
import { Briefcase } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InformacionProcesoSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
}

const InformacionProcesoSection = <TFieldValues extends FieldValues>({
  control,
}: InformacionProcesoSectionProps<TFieldValues>) => {
  const procesos = [
    "Auditor",
    "Auxiliar de enfermeria",
    "Auxiliar de farmacia",
    "Bacteriologo",
    "Conductor",
    "Instrumentador",
    "Jefe de Enfermería",
    "Médico y/o Especialista",
    "Odontologo",
    "Regente",
    "Secretario",
    "Técnico RX",
    "Terapeuta",
    "Otro administrativo",
    "Otro asistencial"
  ];

  const ubicaciones = [
    "Bello",
    "Caldas",
    "La Maria",
    "Rionegro"
  ];

  const tiposSolicitud = [
    "COMPENSACIÓN. MENSUAL",
    "COMPENSACIÓN SEMESTRAL",
    "COMPENSACIÓN ANUAL DIFERIDA Y/O DESCANSO",
    "INCAPACIDADES",
    "SUBSIDIOS",
    "VIATICOS",
    "DUPLICADO COLILLAS",
    "COMPENSACIÓN. FINAL (LIQUIDACIÓN)",
  ];

  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4 text-primary-prosalud-dark flex items-center">
        <Briefcase className="mr-2 h-6 w-6" /> Información del Proceso
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FormField
          control={control}
          name={"proceso" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proceso *</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione su proceso" />
                  </SelectTrigger>
                  <SelectContent>
                    {procesos.map((proceso) => (
                      <SelectItem key={proceso} value={proceso}>
                        {proceso}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={"dondeRealizaProceso" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Donde realiza el proceso *</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione la ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    {ubicaciones.map((ubicacion) => (
                      <SelectItem key={ubicacion} value={ubicacion}>
                        {ubicacion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={"mesAnoNovedad" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mes y año de la novedad *</FormLabel>
              <FormControl>
                <input
                  {...field}
                  type="month"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={"solicitudRelacionadaCon" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Relación de su solicitud *</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el tipo de solicitud" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposSolicitud.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
};

export default InformacionProcesoSection;
