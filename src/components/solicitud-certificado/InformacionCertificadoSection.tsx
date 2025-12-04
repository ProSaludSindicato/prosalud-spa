import React, { useEffect } from 'react';
import { Control, UseFormWatch, FieldValues, useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';
import FileUploadField from './FileUploadField'; // Assuming FormValues type is defined elsewhere or passed
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';

interface InformacionCertificadoSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  watch: UseFormWatch<TFieldValues>;
}

const InformacionCertificadoSection = <TFieldValues extends FieldValues>({
  control,
  watch,
}: InformacionCertificadoSectionProps<TFieldValues>) => {
  const watchInfoCertificado = watch("infoCertificado" as any); // Use 'as any' if type inference is tricky
  const { setValue } = useFormContext<TFieldValues>();
  const { afiliado } = useAfiliadoAuth();
  
  // Determinar el estado del afiliado (normalizado a minúsculas para comparación)
  const estadoAfiliado = afiliado?.estado?.toLowerCase() || null;
  const isActivo = estadoAfiliado === 'activo';
  const isRetirado = estadoAfiliado === 'retirado';

  // Asegurar que fechaIngresoRetiro siempre sea true
  useEffect(() => {
    // @ts-ignore
      setValue("infoCertificado.fechaIngresoRetiro" as any, true, { shouldValidate: false });
  }, [setValue]);

  // Limpiar campos dependientes cuando se desmarcan los checkboxes
  useEffect(() => {
    if (!watchInfoCertificado?.dirigidoAEntidad) {
      // @ts-ignore
      setValue("dirigidoAQuien" as any, '', { shouldValidate: false });
    }
  }, [watchInfoCertificado?.dirigidoAEntidad, setValue]);

  useEffect(() => {
    if (!watchInfoCertificado?.adicionarActividades) {
      // @ts-ignore
      setValue("actividadesPdf" as any, undefined, { shouldValidate: false });
    }
  }, [watchInfoCertificado?.adicionarActividades, setValue]);

  useEffect(() => {
    if (!watchInfoCertificado?.otros) {
      // @ts-ignore
      setValue("otrosDescripcion" as any, '', { shouldValidate: false });
      // @ts-ignore
      setValue("adjuntarArchivoAdicional" as any, undefined, { shouldValidate: false });
    }
  }, [watchInfoCertificado?.otros, setValue]);

  // Limpiar "Para subsidio de desempleo" si el afiliado está activo
  useEffect(() => {
    if (isActivo && watchInfoCertificado?.paraSubsidioDesempleo) {
      // @ts-ignore
      setValue("infoCertificado.paraSubsidioDesempleo" as any, false, { shouldValidate: false });
    }
  }, [isActivo, watchInfoCertificado?.paraSubsidioDesempleo, setValue]);

  // Limpiar "Para subsidio de vivienda" si el afiliado está retirado
  useEffect(() => {
    if (isRetirado && watchInfoCertificado?.paraSubsidioVivienda) {
      // @ts-ignore
      setValue("infoCertificado.paraSubsidioVivienda" as any, false, { shouldValidate: false });
    }
  }, [isRetirado, watchInfoCertificado?.paraSubsidioVivienda, setValue]);

  // Grupo de opciones mutuamente excluyentes:
  // - valorCompensaciones
  // - paraSubsidioVivienda
  // - paraSubsidioDesempleo
  // - dirigidoFondoPensiones
  // - dirigidoBancolombia
  // - otros
  const opcionesExcluyentes = [
    'valorCompensaciones',
    'paraSubsidioVivienda',
    'paraSubsidioDesempleo',
    'dirigidoFondoPensiones',
    'dirigidoBancolombia',
    'otros'
  ] as const;

  // Manejar exclusión mutua cuando se selecciona una opción del grupo excluyente
  useEffect(() => {
    const infoCert = watchInfoCertificado;
    if (!infoCert) return;

    // Si se selecciona "Para subsidio de vivienda" o "Para subsidio de desempleo"
    // NO deseleccionar "Valor de compensaciones" (es obligatorio)
    if (infoCert.paraSubsidioVivienda || infoCert.paraSubsidioDesempleo) {
      // Deseleccionar otras opciones excluyentes (excepto valorCompensaciones)
      if (infoCert.dirigidoFondoPensiones) {
        // @ts-ignore
        setValue("infoCertificado.dirigidoFondoPensiones" as any, false, { shouldValidate: false });
      }
      if (infoCert.dirigidoBancolombia) {
        // @ts-ignore
        setValue("infoCertificado.dirigidoBancolombia" as any, false, { shouldValidate: false });
      }
      if (infoCert.otros) {
        // @ts-ignore
        setValue("infoCertificado.otros" as any, false, { shouldValidate: false });
      }
      // Deseleccionar "Dirigido a una entidad en particular"
      if (infoCert.dirigidoAEntidad) {
        // @ts-ignore
        setValue("infoCertificado.dirigidoAEntidad" as any, false, { shouldValidate: false });
      }
      // Deseleccionar el otro subsidio si está seleccionado (son mutuamente excluyentes entre sí)
      if (infoCert.paraSubsidioVivienda && infoCert.paraSubsidioDesempleo) {
        // Si ambos están seleccionados, mantener solo el que se acaba de seleccionar
        // Esto se maneja en el useEffect que marca valorCompensaciones
      }
      // Deseleccionar "Adicionar actividades"
      if (infoCert.adicionarActividades) {
        // @ts-ignore
        setValue("infoCertificado.adicionarActividades" as any, false, { shouldValidate: false });
      }
    }
    // Si se selecciona "Otros"
    // NOTA: "Otros" SÍ se puede combinar con "Valor de compensaciones" y "Adicionar actividades"
    else if (infoCert.otros) {
      // Deseleccionar otras opciones excluyentes (excepto valorCompensaciones)
      if (infoCert.paraSubsidioVivienda) {
        // @ts-ignore
        setValue("infoCertificado.paraSubsidioVivienda" as any, false, { shouldValidate: false });
      }
      if (infoCert.paraSubsidioDesempleo) {
        // @ts-ignore
        setValue("infoCertificado.paraSubsidioDesempleo" as any, false, { shouldValidate: false });
      }
      if (infoCert.dirigidoFondoPensiones) {
        // @ts-ignore
        setValue("infoCertificado.dirigidoFondoPensiones" as any, false, { shouldValidate: false });
      }
      if (infoCert.dirigidoBancolombia) {
        // @ts-ignore
        setValue("infoCertificado.dirigidoBancolombia" as any, false, { shouldValidate: false });
      }
      // NO deseleccionar "Valor de compensaciones" ni "Adicionar actividades" (se pueden combinar)
    }
    // Si se selecciona "Valor de compensaciones" solo (sin subsidios ni otros)
    // NOTA: "Valor de compensaciones" SÍ se puede combinar con subsidios y otros, así que NO los deseleccionamos
    else if (infoCert.valorCompensaciones && !infoCert.paraSubsidioVivienda && !infoCert.paraSubsidioDesempleo && !infoCert.otros) {
      // Deseleccionar otras opciones excluyentes (pero NO los subsidios ni otros, ya que se pueden combinar)
      if (infoCert.dirigidoFondoPensiones) {
        // @ts-ignore
        setValue("infoCertificado.dirigidoFondoPensiones" as any, false, { shouldValidate: false });
      }
      if (infoCert.dirigidoBancolombia) {
        // @ts-ignore
        setValue("infoCertificado.dirigidoBancolombia" as any, false, { shouldValidate: false });
      }
    }
    // Si se selecciona otra opción excluyente (dirigidoFondoPensiones, dirigidoBancolombia)
    else {
      const opcionSeleccionada = opcionesExcluyentes.find(opcion => 
        opcion !== 'valorCompensaciones' && 
        opcion !== 'paraSubsidioVivienda' && 
        opcion !== 'paraSubsidioDesempleo' &&
        opcion !== 'otros' &&
        infoCert[opcion]
      );

      if (opcionSeleccionada) {
        // Deseleccionar todas las demás opciones del grupo excluyente
        opcionesExcluyentes.forEach(opcion => {
          if (opcion !== opcionSeleccionada && infoCert[opcion]) {
            // @ts-ignore
            setValue(`infoCertificado.${opcion}` as any, false, { shouldValidate: false });
          }
        });
        
        // Deseleccionar "Adicionar actividades"
        if (infoCert.adicionarActividades) {
          // @ts-ignore
          setValue("infoCertificado.adicionarActividades" as any, false, { shouldValidate: false });
        }
      }
    }
  }, [
    watchInfoCertificado?.valorCompensaciones,
    watchInfoCertificado?.paraSubsidioVivienda,
    watchInfoCertificado?.paraSubsidioDesempleo,
    watchInfoCertificado?.dirigidoFondoPensiones,
    watchInfoCertificado?.dirigidoBancolombia,
    watchInfoCertificado?.otros,
    watchInfoCertificado?.adicionarActividades,
    setValue
  ]);

  // "Dirigido a una entidad en particular" se puede usar con:
  // - Solo con "Fecha de ingreso y retiro" (siempre marcado)
  // - O con: valorCompensaciones, dirigidoFondoPensiones, adicionarActividades, otros
  // "Dirigido a una entidad en particular" siempre está permitido porque "Fecha de ingreso y retiro" siempre está marcado
  const puedeUsarDirigidoAEntidad = true; // Siempre permitido porque fechaIngresoRetiro siempre está marcado

  // Si se selecciona "Dirigido a una entidad en particular", no se pueden marcar:
  // - Para subsidio de vivienda
  // - Para subsidio de desempleo
  // - Dirigido a Bancolombia
  useEffect(() => {
    const infoCert = watchInfoCertificado;
    if (!infoCert) return;

    if (infoCert.dirigidoAEntidad) {
      if (infoCert.paraSubsidioVivienda) {
        // @ts-ignore
        setValue("infoCertificado.paraSubsidioVivienda" as any, false, { shouldValidate: false });
      }
      if (infoCert.paraSubsidioDesempleo) {
        // @ts-ignore
        setValue("infoCertificado.paraSubsidioDesempleo" as any, false, { shouldValidate: false });
      }
      if (infoCert.dirigidoBancolombia) {
        // @ts-ignore
        setValue("infoCertificado.dirigidoBancolombia" as any, false, { shouldValidate: false });
      }
    }
  }, [
    watchInfoCertificado?.dirigidoAEntidad,
    setValue
  ]);

  // Si se selecciona "Dirigido a Bancolombia", no se puede marcar "Dirigido a una entidad en particular"
  useEffect(() => {
    const infoCert = watchInfoCertificado;
    if (!infoCert) return;

    if (infoCert.dirigidoBancolombia && infoCert.dirigidoAEntidad) {
      // @ts-ignore
      setValue("infoCertificado.dirigidoAEntidad" as any, false, { shouldValidate: false });
    }
  }, [
    watchInfoCertificado?.dirigidoBancolombia,
    watchInfoCertificado?.dirigidoAEntidad,
    setValue
  ]);

  // Al marcar "Para subsidio de vivienda" o "Para subsidio de desempleo", se debe marcar obligatoriamente "Valor de compensaciones"
  // Además, "Para subsidio de vivienda" y "Para subsidio de desempleo" son mutuamente excluyentes entre sí
  useEffect(() => {
    const infoCert = watchInfoCertificado;
    if (!infoCert) return;

    // Si se selecciona "Para subsidio de vivienda", deseleccionar "Para subsidio de desempleo"
    if (infoCert.paraSubsidioVivienda && infoCert.paraSubsidioDesempleo) {
      // @ts-ignore
      setValue("infoCertificado.paraSubsidioDesempleo" as any, false, { shouldValidate: false });
    }
    // Si se selecciona "Para subsidio de desempleo", deseleccionar "Para subsidio de vivienda"
    if (infoCert.paraSubsidioDesempleo && infoCert.paraSubsidioVivienda) {
      // @ts-ignore
      setValue("infoCertificado.paraSubsidioVivienda" as any, false, { shouldValidate: false });
    }

    // Marcar "Valor de compensaciones" como obligatorio si se selecciona algún subsidio
    if ((infoCert.paraSubsidioVivienda || infoCert.paraSubsidioDesempleo) && !infoCert.valorCompensaciones) {
      // @ts-ignore
      setValue("infoCertificado.valorCompensaciones" as any, true, { shouldValidate: false });
    }
  }, [
    watchInfoCertificado?.paraSubsidioVivienda,
    watchInfoCertificado?.paraSubsidioDesempleo,
    watchInfoCertificado?.valorCompensaciones,
    setValue
  ]);

  // "Adicionar actividades" es independiente y solo se puede mezclar con:
  // - valorCompensaciones
  // - dirigidoAEntidad
  // - otros
  // Es excluyente con: paraSubsidioVivienda, paraSubsidioDesempleo, dirigidoFondoPensiones, dirigidoBancolombia
  
  // Manejar exclusión de "Adicionar actividades" cuando se selecciona
  useEffect(() => {
    const infoCert = watchInfoCertificado;
    if (!infoCert) return;

    // Si "Adicionar actividades" está seleccionado, deseleccionar opciones excluyentes
    if (infoCert.adicionarActividades) {
      if (infoCert.paraSubsidioVivienda) {
        // @ts-ignore
        setValue("infoCertificado.paraSubsidioVivienda" as any, false, { shouldValidate: false });
      }
      if (infoCert.paraSubsidioDesempleo) {
        // @ts-ignore
        setValue("infoCertificado.paraSubsidioDesempleo" as any, false, { shouldValidate: false });
      }
      if (infoCert.dirigidoFondoPensiones) {
        // @ts-ignore
        setValue("infoCertificado.dirigidoFondoPensiones" as any, false, { shouldValidate: false });
      }
      if (infoCert.dirigidoBancolombia) {
        // @ts-ignore
        setValue("infoCertificado.dirigidoBancolombia" as any, false, { shouldValidate: false });
      }
    }
  }, [
    watchInfoCertificado?.adicionarActividades,
    setValue
  ]);

  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-2 text-primary-prosalud-dark flex items-center">
        <FileText className="mr-2 h-6 w-6" />
        Información Requerida en el Certificado
      </h2>
      <p className="text-sm text-muted-foreground mb-6">Lea cuidadosamente y seleccione únicamente la información que necesita incluir en su certificado.</p>
      
      <div className="space-y-4">
        <FormField control={control} name={"infoCertificado.fechaIngresoRetiro" as any} render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl><Checkbox checked={true} disabled={true} /></FormControl>
                <FormLabel className="font-normal">Fecha de ingreso y retiro</FormLabel>
            </FormItem>
        )}/>
        <FormField control={control} name={"infoCertificado.valorCompensaciones" as any} render={({ field }) => {
          // Si "Para subsidio de vivienda" o "Para subsidio de desempleo" están seleccionados,
          // "Valor de compensaciones" es obligatorio y debe estar deshabilitado
          const esObligatorioPorSubsidio = 
            watchInfoCertificado?.paraSubsidioVivienda ||
            watchInfoCertificado?.paraSubsidioDesempleo;
          
          // Deshabilitar si otra opción del grupo excluyente está seleccionada (excepto subsidios y otros)
          // "Adicionar actividades" y "Otros" NO son excluyentes con "Valor de compensaciones"
          const otraOpcionExcluyenteSeleccionada = 
            watchInfoCertificado?.dirigidoFondoPensiones ||
            watchInfoCertificado?.dirigidoBancolombia;
          
          const isDisabled = esObligatorioPorSubsidio || (!!otraOpcionExcluyenteSeleccionada && !field.value);
          
          return (
            <FormItem className={`flex flex-row items-start space-x-3 space-y-0 ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <FormControl>
                  <Checkbox 
                    checked={field.value} 
                    onCheckedChange={field.onChange}
                    disabled={isDisabled}
                  />
                </FormControl>
                <FormLabel className={`font-normal ${isDisabled ? 'text-gray-500 cursor-not-allowed' : 'cursor-pointer'}`}>
                  Valor de compensaciones
                </FormLabel>
            </FormItem>
          );
        }}/>
        <FormField control={control} name={"infoCertificado.dirigidoAEntidad" as any} render={({ field }) => {
          // Deshabilitar si "Dirigido a Bancolombia" está seleccionado
          // O si "Para subsidio de vivienda" o "Para subsidio de desempleo" están seleccionados
          const debeDeshabilitar = 
            watchInfoCertificado?.dirigidoBancolombia ||
            watchInfoCertificado?.paraSubsidioVivienda ||
            watchInfoCertificado?.paraSubsidioDesempleo;
          
          const isDisabled = !!debeDeshabilitar && !field.value;
          
          return (
            <FormItem className={`flex flex-row items-start space-x-3 space-y-0 ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <FormControl>
                  <Checkbox 
                    checked={field.value} 
                    onCheckedChange={field.onChange}
                    disabled={isDisabled}
                  />
                </FormControl>
                <FormLabel className={`font-normal ${isDisabled ? 'text-gray-500 cursor-not-allowed' : 'cursor-pointer'}`}>
                  Dirigido a una entidad en particular
                </FormLabel>
            </FormItem>
          );
        }}/>
        {watchInfoCertificado?.dirigidoAEntidad && (
            <FormField control={control} name={"dirigidoAQuien" as any} render={({ field }) => (
                <FormItem className="ml-7">
                    <FormLabel>Indique a quién va dirigido *</FormLabel>
                    <FormControl><Input placeholder="Nombre de la entidad" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
        )}
        {/* Ocultar "Para subsidio de desempleo" si el afiliado está activo */}
        {!isActivo && (
          <FormField control={control} name={"infoCertificado.paraSubsidioDesempleo" as any} render={({ field }) => {
            // Deshabilitar si otra opción del grupo excluyente está seleccionada O si "Adicionar actividades" está seleccionado
            // O si "Dirigido a una entidad en particular" está seleccionado
            // NOTA: "Valor de compensaciones" NO es excluyente con los subsidios (es obligatorio cuando se seleccionan)
            const otraOpcionSeleccionada = 
              watchInfoCertificado?.paraSubsidioVivienda ||
              watchInfoCertificado?.dirigidoFondoPensiones ||
              watchInfoCertificado?.dirigidoBancolombia ||
              watchInfoCertificado?.otros ||
              watchInfoCertificado?.adicionarActividades ||
              watchInfoCertificado?.dirigidoAEntidad;
            
            const isDisabled = !!otraOpcionSeleccionada && !field.value;
            
            return (
              <FormItem className={`flex flex-row items-start space-x-3 space-y-0 ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <FormControl>
                    <Checkbox 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                      disabled={isDisabled}
                    />
                  </FormControl>
                  <FormLabel className={`font-normal ${isDisabled ? 'text-gray-500 cursor-not-allowed' : 'cursor-pointer'}`}>
                    Para subsidio de desempleo
                  </FormLabel>
              </FormItem>
            );
          }}/>
        )}
        {/* Ocultar "Para subsidio de vivienda" si el afiliado está retirado */}
        {!isRetirado && (
          <FormField control={control} name={"infoCertificado.paraSubsidioVivienda" as any} render={({ field }) => {
            // Deshabilitar si otra opción del grupo excluyente está seleccionada O si "Adicionar actividades" está seleccionado
            // O si "Dirigido a una entidad en particular" está seleccionado
            // NOTA: "Valor de compensaciones" NO es excluyente con los subsidios (es obligatorio cuando se seleccionan)
            const otraOpcionSeleccionada = 
              watchInfoCertificado?.paraSubsidioDesempleo ||
              watchInfoCertificado?.dirigidoFondoPensiones ||
              watchInfoCertificado?.dirigidoBancolombia ||
              watchInfoCertificado?.otros ||
              watchInfoCertificado?.adicionarActividades ||
              watchInfoCertificado?.dirigidoAEntidad;
            
            const isDisabled = !!otraOpcionSeleccionada && !field.value;
            
            return (
              <FormItem className={`flex flex-row items-start space-x-3 space-y-0 ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <FormControl>
                    <Checkbox 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                      disabled={isDisabled}
                    />
                  </FormControl>
                  <FormLabel className={`font-normal ${isDisabled ? 'text-gray-500 cursor-not-allowed' : 'cursor-pointer'}`}>
                    Para subsidio de vivienda
                  </FormLabel>
              </FormItem>
            );
          }}/>
        )}
        <FormField control={control} name={"infoCertificado.dirigidoFondoPensiones" as any} render={({ field }) => {
          // Deshabilitar si otra opción del grupo excluyente está seleccionada O si "Adicionar actividades" está seleccionado
          const otraOpcionSeleccionada = 
            watchInfoCertificado?.valorCompensaciones ||
            watchInfoCertificado?.paraSubsidioVivienda ||
            watchInfoCertificado?.paraSubsidioDesempleo ||
            watchInfoCertificado?.dirigidoBancolombia ||
            watchInfoCertificado?.otros ||
            watchInfoCertificado?.adicionarActividades;
          
          const isDisabled = !!otraOpcionSeleccionada && !field.value;
          
          return (
            <FormItem className={`flex flex-row items-start space-x-3 space-y-0 ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <FormControl>
                  <Checkbox 
                    checked={field.value} 
                    onCheckedChange={field.onChange}
                    disabled={isDisabled}
                  />
                </FormControl>
                <FormLabel className={`font-normal ${isDisabled ? 'text-gray-500 cursor-not-allowed' : 'cursor-pointer'}`}>
                  Dirigido al Fondo de Pensiones para corrección de historia
                </FormLabel>
            </FormItem>
          );
        }}/>
        <FormField control={control} name={"infoCertificado.dirigidoBancolombia" as any} render={({ field }) => {
          // Deshabilitar si otra opción del grupo excluyente está seleccionada O si "Adicionar actividades" está seleccionado
          // O si "Dirigido a una entidad en particular" está seleccionado
          const otraOpcionSeleccionada = 
            watchInfoCertificado?.valorCompensaciones ||
            watchInfoCertificado?.paraSubsidioVivienda ||
            watchInfoCertificado?.paraSubsidioDesempleo ||
            watchInfoCertificado?.dirigidoFondoPensiones ||
            watchInfoCertificado?.otros ||
            watchInfoCertificado?.adicionarActividades ||
            watchInfoCertificado?.dirigidoAEntidad;
          
          const isDisabled = !!otraOpcionSeleccionada && !field.value;
          
          return (
            <FormItem className={`flex flex-row items-start space-x-3 space-y-0 ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <FormControl>
                  <Checkbox 
                    checked={field.value} 
                    onCheckedChange={field.onChange}
                    disabled={isDisabled}
                  />
                </FormControl>
                <FormLabel className={`font-normal ${isDisabled ? 'text-gray-500 cursor-not-allowed' : 'cursor-pointer'}`}>
                  Dirigido a Bancolombia para apertura de cuenta bajo convenio con ProSalud
                </FormLabel>
            </FormItem>
          );
        }}/>
        <FormField control={control} name={"infoCertificado.adicionarActividades" as any} render={({ field }) => {
          // Deshabilitar si una opción excluyente está seleccionada (excepto valorCompensaciones y otros)
          const opcionExcluyenteSeleccionada = 
            watchInfoCertificado?.paraSubsidioVivienda ||
            watchInfoCertificado?.paraSubsidioDesempleo ||
            watchInfoCertificado?.dirigidoFondoPensiones ||
            watchInfoCertificado?.dirigidoBancolombia;
          
          const isDisabled = !!opcionExcluyenteSeleccionada && !field.value;
          
          return (
            <FormItem className={`flex flex-row items-start space-x-3 space-y-0 ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <FormControl>
                  <Checkbox 
                    checked={field.value} 
                    onCheckedChange={field.onChange}
                    disabled={isDisabled}
                  />
                </FormControl>
                 <div className={`leading-none ${isDisabled ? 'text-gray-500 cursor-not-allowed' : ''}`}>
                    <FormLabel className={`font-normal ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      Adicionar actividades
                    </FormLabel>
                    <FormDescription className={`text-xs ${isDisabled ? 'text-gray-400' : ''}`}>
                        Requiere validación. Adjuntar archivo en formato PDF con las actividades realizadas. Esta solicitud está sujeta a aprobación por parte de la Entidad.
                    </FormDescription>
                </div>
            </FormItem>
          );
        }}/>
        {watchInfoCertificado?.adicionarActividades && (
          <FileUploadField
            control={control}
            name={"actividadesPdf" as any}
            label="Adjuntar PDF con actividades"
            accept=".pdf"
            isRequired={true}
            className="ml-7"
          />
        )}
        <FormField control={control} name={"infoCertificado.otros" as any} render={({ field }) => {
          // Deshabilitar si otra opción del grupo excluyente está seleccionada
          // "Valor de compensaciones" y "Adicionar actividades" NO son excluyentes con "Otros"
          const otraOpcionSeleccionada = 
            watchInfoCertificado?.paraSubsidioVivienda ||
            watchInfoCertificado?.paraSubsidioDesempleo ||
            watchInfoCertificado?.dirigidoFondoPensiones ||
            watchInfoCertificado?.dirigidoBancolombia;
          
          const isDisabled = !!otraOpcionSeleccionada && !field.value;
          
          return (
            <FormItem className={`flex flex-row items-start space-x-3 space-y-0 ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <FormControl>
                  <Checkbox 
                    checked={field.value} 
                    onCheckedChange={field.onChange}
                    disabled={isDisabled}
                  />
                </FormControl>
                <FormLabel className={`font-normal ${isDisabled ? 'text-gray-500 cursor-not-allowed' : 'cursor-pointer'}`}>
                  Otros
                </FormLabel>
            </FormItem>
          );
        }}/>
        {watchInfoCertificado?.otros && (
            <FormField control={control} name={"otrosDescripcion" as any} render={({ field }) => (
                <FormItem className="ml-7">
                    <FormLabel>Describa su necesidad *</FormLabel>
                    <FormControl><Textarea placeholder="Especifique aquí su solicitud..." {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
        )}
      </div>
    </section>
  );
};

export default InformacionCertificadoSection;
