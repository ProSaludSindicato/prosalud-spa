import React, { useEffect } from 'react';
import { Control, FieldValues, UseFormSetValue } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    <section className="bg-white p-6 rounded-lg border shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Información del Proceso</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={control}
          name={"proceso" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proceso</FormLabel>
              <FormControl>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                  {field.value || 'No disponible'}
                </div>
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
              <FormLabel>¿Dónde realiza el proceso?</FormLabel>
              <FormControl>
                {shouldDisableCliente ? (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                    {field.value}
                  </div>
                ) : (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {VALID_CLIENTES.map((cliente) => (
                        <SelectItem key={cliente} value={cliente}>
                          {cliente}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
              <FormLabel>Mes y año de la novedad</FormLabel>
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
              <FormLabel>Relación de su solicitud</FormLabel>
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
    </section>
  );
};

export default InformacionProcesoSectionAuth;
