import React from 'react';
import { Control, FieldValues } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';
import { estadosCiviles, municipios, tallasUniforme } from './formOptions';

interface DatosPersonalesSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
}

const DatosPersonalesSection = <TFieldValues extends FieldValues>({
  control,
}: DatosPersonalesSectionProps<TFieldValues>) => {
  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-primary-prosalud-dark flex items-center">
          <User className="mr-2 h-6 w-6" /> Datos Personales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={control}
            name={"estadoCivil" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado Civil</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione su estado civil" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {estadosCiviles.map((estado) => (
                      <SelectItem key={estado.value} value={estado.value}>
                        {estado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={"direccion" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Calle 123 #45-67"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={"municipio" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Municipio</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el municipio" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {municipios.map((municipio) => (
                      <SelectItem key={municipio.value} value={municipio.value}>
                        {municipio.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={"telefonoFijo" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono Fijo</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="Ej: 6041234567"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={"celular" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Celular</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="Ej: 3001234567"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={"correo" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo Electrónico</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Ej: ejemplo@correo.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={"tallaUniforme" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Talla de Uniforme</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione la talla" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tallasUniforme.map((talla) => (
                      <SelectItem key={talla.value} value={talla.value}>
                        {talla.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </section>
  );
};

export default DatosPersonalesSection;

