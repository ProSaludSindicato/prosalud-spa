import React from 'react';
import { Control, FieldValues, useWatch } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';
import { estadosCiviles, municipios, tallasUniforme } from './formOptions';
import { obfuscateValue, isObfuscated as isObfuscatedValue } from '@/utils/obfuscate';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';

interface DatosPersonalesSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  modifiedFields?: Set<string>;
  initialValues?: Partial<TFieldValues>;
}

const DatosPersonalesSection = <TFieldValues extends FieldValues>({
  control,
  modifiedFields,
  initialValues,
}: DatosPersonalesSectionProps<TFieldValues>) => {
  const watchValues = useWatch({ control });
  // Security: Use centralized sanitization hook
  const { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeGeneral, sanitizeNumeric } = useSanitizedInput();

  const shouldObfuscate = (fieldName: string): boolean => {
    // Si el campo fue modificado, no ofuscar
    if (modifiedFields?.has(fieldName)) {
      return false;
    }
    // Si hay un valor inicial, ofuscar
    const initialValue = initialValues?.[fieldName as keyof typeof initialValues];
    return !!initialValue && String(initialValue).trim() !== '';
  };

  // Helper para crear campos con ofuscación
  const createObfuscatedField = (
    fieldName: string,
    field: any,
    initialValue: string | undefined,
    obfuscateType: 'address' | 'phone' | 'email' | 'account',
    placeholder: string
  ) => {
    const currentValue = watchValues?.[fieldName as keyof typeof watchValues] || '';
    const initValue = initialValue || '';
    const isObfuscated = shouldObfuscate(fieldName);
    
    // Si el valor inicial ya está ofuscado (viene del backend), no ofuscar de nuevo
    const initialIsObfuscated = initValue ? isObfuscatedValue(String(initValue)) : false;
    
    // Si el valor inicial ya está ofuscado, mostrarlo tal cual
    // Si no está ofuscado y debe ofuscarse, aplicar ofuscación
    // Si el usuario está escribiendo (valor diferente al inicial), mostrar el valor actual
    const displayValue = isObfuscated && currentValue === initValue
      ? (initialIsObfuscated ? initValue : obfuscateValue(String(initValue), obfuscateType))
      : currentValue;

    return {
      displayValue,
      isObfuscated,
      initialValue: initValue,
      currentValue,
      initialIsObfuscated,
      handleChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        // Security: Sanitize input based on obfuscate type
        let sanitized: string;
        switch (obfuscateType) {
          case 'email':
            sanitized = sanitizeEmail(e.target.value, { maxLength: 100 });
            break;
          case 'phone':
            sanitized = sanitizePhone(e.target.value, { maxLength: 15 });
            break;
          case 'address':
            sanitized = sanitizeGeneral(e.target.value, { maxLength: 200 });
            break;
          case 'account':
            sanitized = sanitizeNumeric(e.target.value, { maxLength: 20 });
            break;
          default:
            sanitized = sanitizeGeneral(e.target.value, { maxLength: 200 });
        }
        field.onChange(sanitized);
      },
      handleFocus: () => {
        // Si está ofuscado y el usuario hace focus, preparar para edición
        if (isObfuscated && currentValue === displayValue) {
          if (initialIsObfuscated) {
            // Si viene ofuscado del backend, limpiar para que escriba el valor real
            field.onChange('');
          } else {
            // Si no viene ofuscado, restaurar el valor real para edición
            field.onChange(initValue);
          }
        }
      },
      handleBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        // Si el campo quedó vacío y debería estar ofuscado, restaurar el valor inicial
        const currentVal = e.target.value || '';
        if (isObfuscated && !currentVal.trim() && initValue) {
          // Restaurar el valor inicial (se mostrará ofuscado automáticamente)
          field.onChange(initValue);
        }
      },
    };
  };

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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={modifiedFields?.has('estadoCivil') ? 'border-green-500 bg-green-50' : ''}>
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
            render={({ field }) => {
              const currentValue = watchValues?.direccion || '';
              const initialValue = initialValues?.direccion || '';
              const isObfuscated = shouldObfuscate('direccion');
              
              // Verificar si el valor inicial ya viene ofuscado del backend
              const initialIsObfuscated = initialValue ? isObfuscatedValue(String(initialValue)) : false;
              
              // Si el valor actual es igual al inicial y está ofuscado, mostrar ofuscado
              // Si el valor inicial ya viene ofuscado, mostrarlo tal cual
              const displayValue = isObfuscated && currentValue === initialValue
                ? (initialIsObfuscated ? initialValue : obfuscateValue(String(initialValue), 'address'))
                : currentValue;

              return (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Calle 123 #45-67"
                    {...field}
                      value={displayValue}
                      onChange={(e) => {
                        // Security: Sanitize address input
                        const sanitized = sanitizeGeneral(e.target.value, { maxLength: 200 });
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
                    className={modifiedFields?.has('direccion') ? 'border-green-500 bg-green-50' : ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
              );
            }}
          />

          <FormField
            control={control}
            name={"municipio" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Municipio</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={modifiedFields?.has('municipio') ? 'border-green-500 bg-green-50' : ''}>
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
            render={({ field }) => {
              const fieldProps = createObfuscatedField(
                'telefonoFijo',
                field,
                initialValues?.telefonoFijo,
                'phone',
                'Ej: 6041234567'
              );

              return (
              <FormItem>
                <FormLabel>Teléfono Fijo</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="Ej: 6041234567"
                    {...field}
                      value={fieldProps.displayValue}
                      onChange={fieldProps.handleChange}
                      onFocus={fieldProps.handleFocus}
                      onBlur={fieldProps.handleBlur}
                    className={modifiedFields?.has('telefonoFijo') ? 'border-green-500 bg-green-50' : ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
              );
            }}
          />

          <FormField
            control={control}
            name={"celular" as any}
            render={({ field }) => {
              const fieldProps = createObfuscatedField(
                'celular',
                field,
                initialValues?.celular,
                'phone',
                'Ej: 3001234567'
              );

              return (
              <FormItem>
                <FormLabel>Celular</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="Ej: 3001234567"
                    {...field}
                      value={fieldProps.displayValue}
                      onChange={fieldProps.handleChange}
                      onFocus={fieldProps.handleFocus}
                      onBlur={fieldProps.handleBlur}
                    className={modifiedFields?.has('celular') ? 'border-green-500 bg-green-50' : ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
              );
            }}
          />

          <FormField
            control={control}
            name={"correo" as any}
            render={({ field }) => {
              const fieldProps = createObfuscatedField(
                'correo',
                field,
                initialValues?.correo,
                'email',
                'Ej: ejemplo@correo.com'
              );

              return (
              <FormItem>
                <FormLabel>Correo Electrónico</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Ej: ejemplo@correo.com"
                    {...field}
                      value={fieldProps.displayValue}
                      onChange={fieldProps.handleChange}
                      onFocus={fieldProps.handleFocus}
                      onBlur={fieldProps.handleBlur}
                    className={modifiedFields?.has('correo') ? 'border-green-500 bg-green-50' : ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
              );
            }}
          />

          <FormField
            control={control}
            name={"tallaUniforme" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Talla de Uniforme</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={modifiedFields?.has('tallaUniforme') ? 'border-green-500 bg-green-50' : ''}>
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

          <FormField
            control={control}
            name={"tallaCalzado" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Talla de Calzado</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Ej: 42"
                    {...field}
                    onChange={(e) => {
                      // Security: Sanitize shoe size input (alphanumeric)
                      const sanitized = sanitizeNumeric(e.target.value, { maxLength: 10 });
                      field.onChange(sanitized);
                    }}
                    className={modifiedFields?.has('tallaCalzado') ? 'border-green-500 bg-green-50' : ''}
                  />
                </FormControl>
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

