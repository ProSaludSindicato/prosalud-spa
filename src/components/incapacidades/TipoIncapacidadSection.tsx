import React from 'react';
import { Control, FieldValues } from 'react-hook-form';
import { Hospital, FileText } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface TipoIncapacidadSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
}

const TipoIncapacidadSection = <TFieldValues extends FieldValues>({
  control,
}: TipoIncapacidadSectionProps<TFieldValues>) => {
  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4 text-primary-prosalud-dark flex items-center">
        <Hospital className="mr-2 h-6 w-6" /> Información de la Incapacidad/Licencia
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FormField
          control={control}
          name={"entidadExpedidora" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entidad que expide el documento *</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="Ej: EPS Sura, ARL Positiva, etc."
                />
              </FormControl>
              <FormDescription>
                Nombre de la EPS o ARL que expidió el documento
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={"fechaExpedicion" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de expedición *</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="date"
                />
              </FormControl>
              <FormDescription>
                Fecha en que fue expedido el certificado
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={"numeroDias" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de días</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="number"
                  placeholder="Ej: 3"
                  min="1"
                />
              </FormControl>
              <FormDescription>
                Cantidad de días de incapacidad/licencia (si aplica)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

      <FormField
          control={control}
          name={"tipoDocumento" as any}
          render={({ field }) => (
              <FormItem>
                  <FormLabel>Tipo de documento *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Seleccione el tipo" />
                          </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <SelectItem value="incapacidad-comun">Incapacidad de Origen Común</SelectItem>
                          <SelectItem value="incapacidad-laboral">Incapacidad de Origen Laboral</SelectItem>
                          <SelectItem value="licencia-maternidad">Licencia de Maternidad</SelectItem>
                          <SelectItem value="licencia-paternidad">Licencia de Paternidad</SelectItem>
                          <SelectItem value="licencia-luto">Licencia por Luto</SelectItem>
                          <SelectItem value="licencia-calamidad">Licencia por Calamidad</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                  </Select>
                  <FormMessage />
              </FormItem>
          )}
      />
      </div>

      <div className="mt-6">
        <FormField
          control={control}
          name={"observaciones" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones adicionales</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Información adicional relevante sobre la incapacidad o licencia..."
                  className="min-h-24 resize-vertical"
                  maxLength={500}
                />
              </FormControl>
              <FormDescription>
                Información adicional que considere importante. Máximo 500 caracteres.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
};

export default TipoIncapacidadSection;