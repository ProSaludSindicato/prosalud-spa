
import React from 'react';
import { Control, FieldValues } from 'react-hook-form';
import { MessageSquare } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

interface DetalleNovedadSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
}

const DetalleNovedadSection = <TFieldValues extends FieldValues>({
  control,
}: DetalleNovedadSectionProps<TFieldValues>) => {
  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4 text-primary-prosalud-dark flex items-center">
        <MessageSquare className="mr-2 h-6 w-6" /> Detalle de la Novedad
      </h2>
      <FormField
        control={control}
        name={"detalleNovedad" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Detalle de la novedad a reportar *</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder="Agradecemos ser claro y específico con su consulta..."
                className="min-h-32 resize-vertical"
                maxLength={500}
              />
            </FormControl>
            <FormDescription>
              Máximo 500 caracteres. Caracteres restantes: {500 - (field.value?.length || 0)}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </section>
  );
};

export default DetalleNovedadSection;
