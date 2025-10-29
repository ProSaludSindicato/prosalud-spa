import React, { useEffect } from 'react';
import { Control, FieldValues, UseFormSetValue } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase } from 'lucide-react';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';

interface InformacionProcesoSectionAuthProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
}

const VALID_CLIENTES = ['Bello', 'La Maria', 'Rionegro', 'ADMON', 'SIN ASIGNAR'];

const InformacionProcesoSectionAuth = <TFieldValues extends FieldValues>({
  control,
  setValue,
}: InformacionProcesoSectionAuthProps<TFieldValues>) => {
  const { getActiveConvenio } = useAfiliadoAuth();
  const activeConvenio = getActiveConvenio();

  useEffect(() => {
    if (activeConvenio) {
      // Establecer proceso automáticamente
      if (activeConvenio.proceso) {
        setValue('proceso' as any, activeConvenio.proceso as any);
      }

      // Establecer cliente solo si no es "SIN ASIGNAR"
      if (activeConvenio.cliente && activeConvenio.cliente !== 'SIN ASIGNAR') {
        setValue('dondeRealizaProceso' as any, activeConvenio.cliente as any);
      }
    }
  }, [activeConvenio, setValue]);

  const shouldDisableCliente = activeConvenio?.cliente && activeConvenio.cliente !== 'SIN ASIGNAR';

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
            name={"proceso" as any}
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
            name={"dondeRealizaProceso" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿Dónde realiza el proceso? *</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={shouldDisableCliente}
                  >
                    <SelectTrigger className={shouldDisableCliente ? 'bg-gray-50/80 text-foreground' : ''}>
                      <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      {VALID_CLIENTES.map((cliente) => (
                        <SelectItem key={cliente} value={cliente}>
                          {cliente}
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
                    type="month"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
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
                <FormLabel>Su solicitud está relacionada con *</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auxilio de Escolaridad">Auxilio de Escolaridad</SelectItem>
                      <SelectItem value="Auxilio de Salud">Auxilio de Salud</SelectItem>
                      <SelectItem value="Auxilio de Solidaridad">Auxilio de Solidaridad</SelectItem>
                      <SelectItem value="Compensación Anual Diferida">Compensación Anual Diferida</SelectItem>
                      <SelectItem value="Compensación por Descanso">Compensación por Descanso</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default InformacionProcesoSectionAuth;
