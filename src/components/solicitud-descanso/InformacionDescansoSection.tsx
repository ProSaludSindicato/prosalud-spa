
import React from 'react';
import { Control, FieldValues, FieldPath } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase } from 'lucide-react';

interface InformacionDescansoSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
}

const InformacionDescansoSection = <TFieldValues extends FieldValues>({
  control,
}: InformacionDescansoSectionProps<TFieldValues>) => {
  const coordinadoras = [
    'Catalina Hoyos Martinez',
    'Diana Zulay Figueroa Londoño',
    'Beatriz Veronica Bernal Velez',
    'Luz Maria Garcia Rincon',
    'Maria Alejandra Garcia Mesa',
  ];

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
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un coordinador" />
                  </SelectTrigger>
                  <SelectContent>
                    {coordinadoras.map((coordinadora) => (
                      <SelectItem key={coordinadora} value={coordinadora}>
                        {coordinadora}
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
          name={"fechaInicioDescanso" as FieldPath<TFieldValues>}
          render={({ field }) => {
            const today = new Date().toISOString().split('T')[0];
            return (
              <FormItem>
                <FormLabel>Fecha de inicio descanso *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    min={today}
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={control}
          name={"fechaFinalizacionDescanso" as FieldPath<TFieldValues>}
          render={({ field }) => {
            const today = new Date().toISOString().split('T')[0];
            return (
              <FormItem>
                <FormLabel>Fecha de finalización descanso *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    min={today}
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </div>
    </section>
  );
};

export default InformacionDescansoSection;
