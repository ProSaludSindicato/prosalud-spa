import React from 'react';
import { Control, FieldValues, useWatch } from 'react-hook-form';
import { Landmark, Paperclip } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FileUploadField from '../solicitud-certificado/FileUploadField';
import { tiposCuenta, bancos } from './formOptions';
import { obfuscateValue, isObfuscated as isObfuscatedValue } from '@/utils/obfuscate';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';

interface InformacionBancariaSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  modifiedFields?: Set<string>;
  onFileChange?: (fieldName: string) => void;
  initialValues?: Partial<TFieldValues>;
}

const InformacionBancariaSection = <TFieldValues extends FieldValues>({
  control,
  modifiedFields,
  onFileChange,
  initialValues,
}: InformacionBancariaSectionProps<TFieldValues>) => {
  const watchValues = useWatch({ control });
  const numeroCuenta = watchValues?.numeroCuenta || '';
  // Security: Use centralized sanitization hook
  const { sanitizeNumeric } = useSanitizedInput();

  const shouldObfuscate = (fieldName: string): boolean => {
    if (modifiedFields?.has(fieldName)) {
      return false;
    }
    const initialValue = initialValues?.[fieldName as keyof typeof initialValues];
    return !!initialValue && String(initialValue).trim() !== '';
  };

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
              render={({ field }) => {
                const currentValue = watchValues?.numeroCuenta || '';
                const initialValue = initialValues?.numeroCuenta || '';
                const isObfuscated = shouldObfuscate('numeroCuenta');
                
                // Verificar si el valor inicial ya viene ofuscado del backend
                const initialIsObfuscated = initialValue ? isObfuscatedValue(String(initialValue)) : false;
                
                const displayValue = isObfuscated && currentValue === initialValue
                  ? (initialIsObfuscated ? initialValue : obfuscateValue(String(initialValue), 'account'))
                  : currentValue;

                return (
                  <FormItem>
                    <FormLabel>Número de Cuenta</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: 1234567890"
                        {...field}
                        value={displayValue}
                        onChange={(e) => {
                          // Security: Sanitize account number input (numeric only)
                          const sanitized = sanitizeNumeric(e.target.value, { maxLength: 20 });
                          field.onChange(sanitized);
                        }}
                        onFocus={() => {
                          // Si está ofuscado y el usuario hace focus, limpiar o restaurar según corresponda
                          if (isObfuscated && currentValue === displayValue) {
                            if (initialIsObfuscated) {
                              // Si viene ofuscado del backend, limpiar para que escriba el valor real
                              field.onChange('');
                            } else {
                              // Si no viene ofuscado, restaurar el valor real para edición
                              field.onChange(initialValue);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          // Si el campo quedó vacío y debería estar ofuscado, restaurar el valor inicial
                          const currentVal = e.target.value || '';
                          if (isObfuscated && !currentVal.trim() && initialValue) {
                            // Restaurar el valor inicial (se mostrará ofuscado automáticamente)
                            field.onChange(initialValue);
                          }
                        }}
                        className={modifiedFields?.has('numeroCuenta') ? 'border-green-500 bg-green-50' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
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

