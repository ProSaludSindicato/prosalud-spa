
import React from 'react';
import { Control, FieldValues, FieldPath } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';

interface IdType {
  value: string;
  label: string;
}

interface DatosPersonalesSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  idTypes: IdType[];
}

const DatosPersonalesSection = <TFieldValues extends FieldValues>({
  control,
  idTypes,
}: DatosPersonalesSectionProps<TFieldValues>) => {
  // Security: Use centralized sanitization hook
  const { sanitizeId, sanitizeText, sanitizeEmail, sanitizePhone, validateId, validateEmail, validatePhone } = useSanitizedInput();
  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-6 text-primary-prosalud-dark">Datos Personales del Solicitante</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FormField
          control={control}
          name={"tipoIdentificacion" as FieldPath<TFieldValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de identificación *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {idTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={"numeroIdentificacion" as FieldPath<TFieldValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de identificación *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ej: 1234567890" 
                  {...field}
                  maxLength={15}
                  onChange={(e) => {
                    // Security: Sanitize ID input using centralized hook
                    const sanitized = sanitizeId(e.target.value, { maxLength: 15 });
                    field.onChange(sanitized);
                  }}
                  onBlur={(e) => {
                    // Security: Validate ID number format
                    const value = e.target.value;
                    if (value && !validateId(value)) {
                      // You could set a custom error here if using react-hook-form validation
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={"nombres" as FieldPath<TFieldValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombres *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Sus nombres completos" 
                  {...field}
                  maxLength={50}
                  onChange={(e) => {
                    // Security: Sanitize text input using centralized hook
                    const sanitized = sanitizeText(e.target.value, { maxLength: 50, allowSpaces: true });
                    field.onChange(sanitized);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={"apellidos" as FieldPath<TFieldValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Apellidos *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Sus apellidos completos" 
                  {...field}
                  maxLength={50}
                  onChange={(e) => {
                    // Security: Sanitize text input using centralized hook
                    const sanitized = sanitizeText(e.target.value, { maxLength: 50, allowSpaces: true });
                    field.onChange(sanitized);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={"correoElectronico" as FieldPath<TFieldValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico *</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="ejemplo@correo.com" 
                  {...field}
                  maxLength={100}
                  autoComplete="email"
                  onChange={(e) => {
                    // Security: Sanitize email input using centralized hook
                    const sanitized = sanitizeEmail(e.target.value, { maxLength: 100 });
                    field.onChange(sanitized);
                  }}
                  onBlur={(e) => {
                    // Security: Validate email format
                    const value = e.target.value;
                    if (value && !validateEmail(value)) {
                      // You could set a custom error here if using react-hook-form validation
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={"numeroCelular" as FieldPath<TFieldValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de celular *</FormLabel>
              <FormControl>
                <Input 
                  type="tel" 
                  placeholder="Ej: 3001234567" 
                  {...field}
                  maxLength={10}
                  autoComplete="tel"
                  onChange={(e) => {
                    // Security: Sanitize phone input using centralized hook
                    const sanitized = sanitizePhone(e.target.value, { maxLength: 10 });
                    field.onChange(sanitized);
                  }}
                  onBlur={(e) => {
                    // Security: Validate phone number format
                    const value = e.target.value;
                    if (value && !validatePhone(value)) {
                      // You could set a custom error here if using react-hook-form validation
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
};

export default DatosPersonalesSection;
