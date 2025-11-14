
import React from 'react';
import { Control, FieldValues, FieldPath } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase } from 'lucide-react';

interface InformacionAnualDiferidaSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
}

const InformacionAnualDiferidaSection = <TFieldValues extends FieldValues>({
  control,
}: InformacionAnualDiferidaSectionProps<TFieldValues>) => {
  // Proceso y ubicación se obtienen del convenio activo y se envían por debajo

  const motivosSolicitud = [
    "Vivienda", "Estudio"
  ];

  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-6 text-primary-prosalud-dark flex items-center">
        <Briefcase className="mr-2 h-6 w-6" /> Información de la Solicitud
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FormField
          control={control}
          name={"motivoSolicitud" as FieldPath<TFieldValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo de la solicitud *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el motivo..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {motivosSolicitud.map(motivo => (
                    <SelectItem key={motivo} value={motivo}>{motivo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
};

export default InformacionAnualDiferidaSection;
