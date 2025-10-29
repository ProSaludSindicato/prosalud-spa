
import React from 'react';
import { Control, FieldValues, FieldPath } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Briefcase } from 'lucide-react';

interface InformacionDescansoSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
}

const InformacionDescansoSection = <TFieldValues extends FieldValues>({
  control,
}: InformacionDescansoSectionProps<TFieldValues>) => {

  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-6 text-primary-prosalud-dark flex items-center">
        <Briefcase className="mr-2 h-6 w-6" /> Información del Descanso
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FormField
          control={control}
          name={"coordinadorVoBo" as FieldPath<TFieldValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Coordinador que da el V°B° *</FormLabel>
              <FormControl>
                <Input placeholder="Nombre del coordinador" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={"fechaInicioDescanso" as FieldPath<TFieldValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de inicio descanso *</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? new Date(field.value) : undefined}
                  onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : '')}
                  placeholder="Seleccionar fecha de inicio"
                  minDate={new Date()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={"fechaFinalizacionDescanso" as FieldPath<TFieldValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de finalización descanso *</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? new Date(field.value) : undefined}
                  onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : '')}
                  placeholder="Seleccionar fecha de finalización"
                  minDate={new Date()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
};

export default InformacionDescansoSection;
