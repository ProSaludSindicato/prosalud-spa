import React from 'react';
import { Control, useFieldArray, useWatch, useFormContext } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Users, UserPlus, Trash2, User, UserCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import { parentescos, tiposDocumento, tiposDocumentoCompletos } from './formOptions';
import { toast } from 'sonner';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';

interface BeneficiarioFormData {
  tipo_documento: string;
  documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  parentesco: string;
  sexo: string;
}

interface BeneficiariosSectionProps {
  control: Control<any>;
}

const BeneficiariosSection: React.FC<BeneficiariosSectionProps> = ({ control }) => {
  const { afiliado } = useAfiliadoAuth();
  const beneficiariosActuales = afiliado?.beneficiarios || [];
  const { setValue } = useFormContext();
  // Security: Use centralized sanitization hook
  const { sanitizeText, sanitizeId } = useSanitizedInput();

  const { fields: fieldsNuevos, append, remove: removeNuevo } = useFieldArray({
    control,
    name: 'beneficiariosNuevos',
  });

  const { fields: fieldsActuales, remove: removeActual } = useFieldArray({
    control,
    name: 'beneficiariosActuales',
  });

  // Observar los valores de beneficiarios nuevos y actuales para validación
  const beneficiariosNuevos = useWatch({
    control,
    name: 'beneficiariosNuevos',
    defaultValue: [],
  }) as BeneficiarioFormData[];

  const beneficiariosActualesEditados = useWatch({
    control,
    name: 'beneficiariosActuales',
    defaultValue: [],
  }) as BeneficiarioFormData[];

  // Auto-completar sexo cuando cambia el parentesco
  // Usamos un ref para evitar loops infinitos
  const prevParentescosRef = React.useRef<string[]>([]);
  
  React.useEffect(() => {
    const allBeneficiarios = [...beneficiariosNuevos, ...beneficiariosActualesEditados];
    const currentParentescos = allBeneficiarios.map(b => b?.parentesco || '');
    const prevParentescos = prevParentescosRef.current;
    
    // Solo procesar si hay cambios en los parentescos
    if (JSON.stringify(currentParentescos) !== JSON.stringify(prevParentescos)) {
      beneficiariosNuevos.forEach((beneficiario, index) => {
        const parentesco = beneficiario?.parentesco || '';
        const sexoActual = beneficiario?.sexo || '';
        const prevParentesco = prevParentescos[index] || '';
        
        // Solo procesar si el parentesco cambió y el sexo está vacío
        if (parentesco && parentesco !== prevParentesco && !sexoActual) {
          // Determinar el sexo según parentesco
          const sexoAuto = parentesco === 'HIJA' || parentesco === 'MADRE' ? 'F' : 
                          parentesco === 'HIJO' || parentesco === 'PADRE' ? 'M' : '';
          
          if (sexoAuto) {
            setValue(`beneficiariosNuevos.${index}.sexo`, sexoAuto, {
              shouldValidate: false,
              shouldDirty: false,
            });
          }
        }
      });
      
      prevParentescosRef.current = currentParentescos;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beneficiariosNuevos.map(b => b?.parentesco || '').join(','), beneficiariosActualesEditados.map(b => b?.parentesco || '').join(',')]);

  const getSexoIcon = (sexo: string) => {
    const sexoNormalized = sexo?.toUpperCase() || '';
    if (sexoNormalized === 'M' || sexoNormalized === 'MASCULINO' || sexoNormalized === 'MALE') {
      return <User className="h-4 w-4 text-blue-600" />;
    } else if (sexoNormalized === 'F' || sexoNormalized === 'FEMENINO' || sexoNormalized === 'FEMALE') {
      return <UserCheck className="h-4 w-4 text-pink-600" />;
    }
    return <User className="h-4 w-4 text-gray-500" />;
  };

  const getParentescoLabel = (parentesco: string) => {
    const parentescoNormalized = parentesco?.toUpperCase() || '';
    const found = parentescos.find(p => p.value === parentescoNormalized);
    return found?.label || parentesco;
  };

  const getTipoDocumentoLabel = (tipo: string) => {
    const tipoNormalized = tipo?.toUpperCase() || '';
    const found = tiposDocumento.find(t => t.value === tipoNormalized);
    return found?.label || tipo;
  };

  const handleAddBeneficiario = () => {
    if (fieldsNuevos.length >= 5) {
      toast.error('Límite alcanzado', {
        description: 'Solo se pueden agregar hasta 5 miembros nuevos al grupo familiar.',
      });
      return;
    }
    append({
      tipo_documento: 'CC',
      documento: '',
      nombres: '',
      apellidos: '',
      fecha_nacimiento: '',
      parentesco: '',
      sexo: '',
    });
  };

  const handleRemoveBeneficiario = (index: number, isNuevo: boolean = true) => {
    if (isNuevo) {
      removeNuevo(index);
    } else {
      removeActual(index);
    }
  };

  const isBeneficiarioDuplicado = (documento: string, tipoDocumento: string, currentIndex?: number, isNuevo: boolean = true, currentArrayIndex?: number): boolean => {
    if (!documento || !tipoDocumento) return false;
    
    // Verificar contra beneficiarios actuales editados (excluyendo el actual si es de actuales)
    const existeEnActualesEditados = beneficiariosActualesEditados.some(
      (b: BeneficiarioFormData, index: number) => 
        (!isNuevo && index !== currentArrayIndex) &&
        b.documento === documento && 
        b.tipo_documento === tipoDocumento
    );

    // Verificar contra otros beneficiarios nuevos (excluyendo el actual)
    const existeEnNuevos = beneficiariosNuevos.some(
      (b: BeneficiarioFormData, index: number) => 
        (isNuevo && index !== currentIndex) &&
        b.documento === documento && 
        b.tipo_documento === tipoDocumento
    );

    // Verificar contra beneficiarios actuales originales (solo si es nuevo)
    const existeEnActualesOriginales = isNuevo && beneficiariosActuales.some(
      b => b.documento === documento && b.tipo_documento === tipoDocumento
    );

    return existeEnActualesEditados || existeEnNuevos || existeEnActualesOriginales;
  };

  const getTipoDocumentoCompletoLabel = (tipo: string) => {
    const tipoNormalized = tipo?.toUpperCase() || '';
    const found = tiposDocumentoCompletos.find(t => t.value === tipoNormalized);
    return found?.label || tipo;
  };

  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-primary-prosalud-dark flex items-center">
          <Users className="mr-2 h-6 w-6" /> Grupo Familiar
        </h2>
      </div>

      <div className="space-y-6">
        {/* Grupo Familiar Actual - Editable */}
        {fieldsActuales.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Miembros Actuales del Grupo Familiar</h3>
            <p className="text-xs text-gray-600 mb-3">
              Puede editar los datos de los miembros existentes o eliminarlos si ya no pertenecen a su grupo familiar.
            </p>
            <div className="space-y-4">
              {fieldsActuales.map((field, index) => (
                <Card key={field.id} className="border-2 border-blue-200 bg-blue-50/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-gray-700">
                        Miembro Actual {index + 1}
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBeneficiario(index, false)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Tipo y Número de Documento agrupados */}
                      <div className="grid grid-cols-[80px_1fr] gap-2">
                        <FormField
                          control={control}
                          name={`beneficiariosActuales.${index}.tipo_documento`}
                          rules={{
                            validate: (value) => {
                              const beneficiario = beneficiariosActualesEditados[index];
                              const documento = beneficiario?.documento || '';
                              if (value && documento && isBeneficiarioDuplicado(documento, value, undefined, false, index)) {
                                return 'Este miembro ya está registrado';
                              }
                              return true;
                            },
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Tipo *</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  const beneficiario = beneficiariosActualesEditados[index];
                                  const documento = beneficiario?.documento || '';
                                  if (documento && isBeneficiarioDuplicado(documento, value, undefined, false, index)) {
                                    toast.error('Este miembro ya está registrado');
                                  }
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {tiposDocumento.map((tipo) => (
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
                          name={`beneficiariosActuales.${index}.documento`}
                          rules={{
                            required: 'El documento es requerido',
                            validate: (value) => {
                              const beneficiario = beneficiariosActualesEditados[index];
                              const tipoDoc = beneficiario?.tipo_documento || '';
                              if (value && tipoDoc && isBeneficiarioDuplicado(value, tipoDoc, undefined, false, index)) {
                                return 'Este miembro ya está registrado';
                              }
                              return true;
                            },
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Número de Documento *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Número"
                                  onChange={(e) => {
                                    const sanitized = sanitizeId(e.target.value, { maxLength: 20 });
                                    field.onChange(sanitized);
                                    const beneficiario = beneficiariosActualesEditados[index];
                                    const tipoDoc = beneficiario?.tipo_documento || '';
                                    if (sanitized && tipoDoc && isBeneficiarioDuplicado(sanitized, tipoDoc, undefined, false, index)) {
                                      toast.error('Este miembro ya está registrado');
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={control}
                        name={`beneficiariosActuales.${index}.nombres`}
                        rules={{ required: 'Los nombres son requeridos' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombres *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Nombres"
                                onChange={(e) => {
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
                        name={`beneficiariosActuales.${index}.apellidos`}
                        rules={{ required: 'Los apellidos son requeridos' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apellidos *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Apellidos"
                                onChange={(e) => {
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
                        name={`beneficiariosActuales.${index}.fecha_nacimiento`}
                        rules={{
                          required: 'La fecha de nacimiento es requerida',
                        }}
                        render={({ field }) => {
                          // Convertir fecha de formato DD/MM/YYYY o YYYY-MM-DD a YYYY-MM-DD para el input
                          let dateValue = field.value || '';
                          if (dateValue && dateValue.includes('/')) {
                            const [day, month, year] = dateValue.split('/');
                            dateValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                          }
                          return (
                            <FormItem>
                              <FormLabel>Fecha de Nacimiento *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field}
                                  value={dateValue}
                                  max={new Date().toISOString().split('T')[0]}
                                  onChange={(e) => {
                                    // Asegurar que se guarde solo la fecha sin hora
                                    const dateStr = e.target.value;
                                    field.onChange(dateStr);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <FormField
                        control={control}
                        name={`beneficiariosActuales.${index}.parentesco`}
                        rules={{ required: 'El parentesco es requerido' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parentesco *</FormLabel>
                            <Select 
                              value={field.value} 
                              onValueChange={(value) => {
                                field.onChange(value);
                                const sexoAuto = value === 'HIJA' || value === 'MADRE' ? 'F' : 
                                               value === 'HIJO' || value === 'PADRE' ? 'M' : '';
                                if (sexoAuto) {
                                  const currentSexo = beneficiariosActualesEditados[index]?.sexo || '';
                                  if (!currentSexo) {
                                    setTimeout(() => {
                                      setValue(`beneficiariosActuales.${index}.sexo`, sexoAuto, {
                                        shouldValidate: false,
                                        shouldDirty: false,
                                      });
                                    }, 10);
                                  }
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione parentesco" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {parentescos.map((parentesco) => (
                                  <SelectItem key={parentesco.value} value={parentesco.value}>
                                    {parentesco.label}
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
                        name={`beneficiariosActuales.${index}.sexo`}
                        rules={{ required: 'El sexo es requerido' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sexo *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione sexo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="M">Masculino</SelectItem>
                                <SelectItem value="F">Femenino</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Grupo Familiar Nuevo */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Agregar Nuevos Miembros al Grupo Familiar</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddBeneficiario}
              disabled={fieldsNuevos.length >= 5}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Agregar Miembro {fieldsNuevos.length >= 5 ? '(Límite alcanzado)' : ''}
            </Button>
          </div>

          {fieldsNuevos.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No hay miembros nuevos agregados. Haga clic en "Agregar Miembro" para agregar uno (máximo 5).
            </p>
          )}

          {fieldsNuevos.length >= 5 && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-800">
                Has alcanzado el límite de 5 miembros nuevos. Puede eliminar uno para agregar otro.
              </AlertDescription>
            </Alert>
          )}

          {fieldsNuevos.map((field, index) => (
            <Card key={field.id} className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Miembro {index + 1}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBeneficiario(index, true)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Tipo y Número de Documento agrupados */}
                  <div className="grid grid-cols-[80px_1fr] gap-2">
                    <FormField
                      control={control}
                      name={`beneficiariosNuevos.${index}.tipo_documento`}
                      rules={{
                        validate: (value) => {
                          const beneficiario = beneficiariosNuevos[index];
                          const documento = beneficiario?.documento || '';
                          if (value && documento && isBeneficiarioDuplicado(documento, value, index, true)) {
                            return 'Este miembro ya está registrado';
                          }
                          return true;
                        },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Tipo *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              const beneficiario = beneficiariosNuevos[index];
                              const documento = beneficiario?.documento || '';
                              if (documento && isBeneficiarioDuplicado(documento, value, index, true)) {
                                toast.error('Este miembro ya está registrado');
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="text-xs">
                                <SelectValue placeholder="Tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tiposDocumento.map((tipo) => (
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
                      name={`beneficiariosNuevos.${index}.documento`}
                      rules={{
                        required: 'El documento es requerido',
                        validate: (value) => {
                          const beneficiario = beneficiariosNuevos[index];
                          const tipoDoc = beneficiario?.tipo_documento || '';
                          if (value && tipoDoc && isBeneficiarioDuplicado(value, tipoDoc, index, true)) {
                            return 'Este miembro ya está registrado';
                          }
                          return true;
                        },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Número de Documento *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Número"
                              onChange={(e) => {
                                // Security: Sanitize document number input
                                const sanitized = sanitizeId(e.target.value, { maxLength: 20 });
                                field.onChange(sanitized);
                                const beneficiario = beneficiariosNuevos[index];
                                const tipoDoc = beneficiario?.tipo_documento || '';
                                if (sanitized && tipoDoc && isBeneficiarioDuplicado(sanitized, tipoDoc, index, true)) {
                                  toast.error('Este miembro ya está registrado');
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={control}
                    name={`beneficiariosNuevos.${index}.nombres`}
                    rules={{ required: 'Los nombres son requeridos' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombres *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Nombres"
                            onChange={(e) => {
                              // Security: Sanitize names input
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
                    name={`beneficiariosNuevos.${index}.apellidos`}
                    rules={{ required: 'Los apellidos son requeridos' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellidos *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Apellidos"
                            onChange={(e) => {
                              // Security: Sanitize last names input
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
                    name={`beneficiariosNuevos.${index}.fecha_nacimiento`}
                    rules={{
                      required: 'La fecha de nacimiento es requerida',
                    }}
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de Nacimiento *</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              max={new Date().toISOString().split('T')[0]}
                              onChange={(e) => {
                                // Asegurar que se guarde solo la fecha sin hora
                                const dateStr = e.target.value;
                                field.onChange(dateStr);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`beneficiariosNuevos.${index}.parentesco`}
                    rules={{ required: 'El parentesco es requerido' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parentesco *</FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Auto-completar sexo inmediatamente cuando cambia el parentesco
                            const sexoAuto = value === 'HIJA' || value === 'MADRE' ? 'F' : 
                                           value === 'HIJO' || value === 'PADRE' ? 'M' : '';
                            if (sexoAuto) {
                              const currentSexo = beneficiariosNuevos[index]?.sexo || '';
                              // Solo auto-completar si el campo está vacío
                              if (!currentSexo) {
                                // Usar setTimeout para asegurar que el parentesco se actualice primero
                                setTimeout(() => {
                                  setValue(`beneficiariosNuevos.${index}.sexo`, sexoAuto, {
                                    shouldValidate: false,
                                    shouldDirty: false,
                                  });
                                }, 10);
                              }
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione parentesco" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {parentescos.map((parentesco) => (
                              <SelectItem key={parentesco.value} value={parentesco.value}>
                                {parentesco.label}
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
                    name={`beneficiariosNuevos.${index}.sexo`}
                    rules={{ required: 'El sexo es requerido' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sexo *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione sexo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="M">Masculino</SelectItem>
                            <SelectItem value="F">Femenino</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BeneficiariosSection;

