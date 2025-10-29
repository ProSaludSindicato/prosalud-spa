import React, { useEffect } from 'react';
import { Control, FieldValues, Path } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase } from 'lucide-react';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';

interface InformacionProcesoAuthProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  setValue: (name: Path<TFieldValues>, value: any) => void;
}

const InformacionProcesoAuth = <TFieldValues extends FieldValues>({
  control,
  setValue,
}: InformacionProcesoAuthProps<TFieldValues>) => {
  const { getActiveConvenio } = useAfiliadoAuth();
  const activeConvenio = getActiveConvenio();

  useEffect(() => {
    if (activeConvenio) {
      if (activeConvenio.proceso) {
        setValue('proceso' as Path<TFieldValues>, activeConvenio.proceso as any);
      }
      if (activeConvenio.cliente && activeConvenio.cliente !== 'SIN ASIGNAR') {
        setValue('dondeRealizaProceso' as Path<TFieldValues>, activeConvenio.cliente as any);
      }
    }
  }, [activeConvenio, setValue]);

  const clienteOptions = ['Bello', 'La Maria', 'Rionegro', 'ADMON', 'SIN ASIGNAR'];
  const isClienteDisabled = activeConvenio?.cliente && activeConvenio.cliente !== 'SIN ASIGNAR';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-primary-prosalud-dark">
          <Briefcase className="h-6 w-6" />
          Información del Proceso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={control}
            name={'proceso' as Path<TFieldValues>}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proceso *</FormLabel>
                <FormControl>
                  <Input {...field} disabled className="bg-gray-50/80 text-foreground" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={'dondeRealizaProceso' as Path<TFieldValues>}
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿Dónde realiza el proceso? *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isClienteDisabled}
                >
                  <FormControl>
                    <SelectTrigger className={isClienteDisabled ? 'bg-gray-50/80 text-foreground' : ''}>
                      <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clienteOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default InformacionProcesoAuth;
