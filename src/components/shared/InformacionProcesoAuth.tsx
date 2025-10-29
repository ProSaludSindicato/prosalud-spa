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
    <Card className="border-l-4 border-l-secondary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Briefcase className="h-5 w-5" />
          Información del Proceso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name={'proceso' as Path<TFieldValues>}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proceso *</FormLabel>
                <FormControl>
                  <Input {...field} disabled className="bg-muted" />
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
                    <SelectTrigger className={isClienteDisabled ? 'bg-muted' : ''}>
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
