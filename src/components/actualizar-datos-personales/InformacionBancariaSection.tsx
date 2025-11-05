import React from 'react';
import { Control, FieldValues, useWatch } from 'react-hook-form';
import { Landmark, Paperclip } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FileUploadField from '../solicitud-certificado/FileUploadField';
import { tiposCuenta, bancos } from './formOptions';

interface InformacionBancariaSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  modifiedFields?: Set<string>;
  onFileChange?: (fieldName: string) => void;
}

const InformacionBancariaSection = <TFieldValues extends FieldValues>({
  control,
  modifiedFields,
  onFileChange,
}: InformacionBancariaSectionProps<TFieldValues>) => {
  const numeroCuenta = useWatch({
    control,
    name: 'numeroCuenta' as any,
  });

  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-primary-prosalud-dark flex items-center">
          <Landmark className="mr-2 h-6 w-6" /> Información Bancaria
        </h2>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={control}
              name={"numeroCuenta" as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Cuenta</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: 1234567890"
                      {...field}
                      className={modifiedFields?.has('numeroCuenta') ? 'border-green-500 bg-green-50' : ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={"tipoCuenta" as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Cuenta</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!numeroCuenta}
                  >
                    <FormControl>
                      <SelectTrigger className={modifiedFields?.has('tipoCuenta') ? 'border-green-500 bg-green-50' : ''}>
                        <SelectValue placeholder="Seleccione el tipo de cuenta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tiposCuenta.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
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
              name={"banco" as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!numeroCuenta}
                  >
                    <FormControl>
                      <SelectTrigger className={modifiedFields?.has('banco') ? 'border-green-500 bg-green-50' : ''}>
                        <SelectValue placeholder="Seleccione el banco" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bancos.map((banco) => (
                        <SelectItem key={banco.value} value={banco.value}>
                          {banco.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Paperclip className="h-4 w-4" />
              <span className="font-medium">Documento (si actualiza información bancaria):</span>
            </div>

            <FileUploadField
              control={control}
              name={"certificacionBancaria" as any}
              label="Certificación Bancaria"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              description="Debe adjuntar la certificación bancaria de la cuenta. Esta debe estar a nombre del titular (afiliado), ser legible y no superior a 1 mes de antigüedad. Se permiten archivos PDF, Word o imágenes (JPG, PNG), máx. 4MB."
              isRequired={false}
              onFileChange={onFileChange}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default InformacionBancariaSection;

