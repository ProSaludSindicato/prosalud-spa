
import React from 'react';
import { Control, FieldValues } from 'react-hook-form';
import { User } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DatosPersonalesVerificacionSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  idTypes: { value: string; label: string }[];
}

const DatosPersonalesVerificacionSection = <TFieldValues extends FieldValues>({
  control,
  idTypes,
}: DatosPersonalesVerificacionSectionProps<TFieldValues>) => {
  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4 text-primary-prosalud-dark flex items-center">
        <User className="mr-2 h-6 w-6" /> Datos Personales
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FormField
          control={control}
          name={"tipoIdentificacion" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Identificación *</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione tipo de identificación" />
                  </SelectTrigger>
                  <SelectContent>
                    {idTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
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
          name={"numeroIdentificacion" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Identificación *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ingrese su número de identificación" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={"nombres" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombres *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ingrese sus nombres" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={"apellidos" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Apellidos *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ingrese sus apellidos" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={"correoElectronico" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico *</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="correo@ejemplo.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={"numeroCelular" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Celular *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ingrese su número de celular" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
};

export default DatosPersonalesVerificacionSection;
