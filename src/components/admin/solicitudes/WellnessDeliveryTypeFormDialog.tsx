import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, FileCheck, Globe } from 'lucide-react';
import { WellnessDeliveryType } from '@/services/wellnessDeliveryService';

function getTodayLocalYYYYMMDD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const schema = z
  .object({
    nombre: z.string().min(1, 'El nombre es obligatorio').max(200, 'Máximo 200 caracteres'),
    modo_acceso: z.enum(['listado', 'abierto'], { required_error: 'El modo de acceso es obligatorio' }),
    activo: z.boolean(),
    fecha_desde: z.string().min(1, 'La fecha de inicio es obligatoria'),
    fecha_hasta: z.string().min(1, 'La fecha de fin es obligatoria'),
  })
  .refine((data) => !data.fecha_desde || !data.fecha_hasta || data.fecha_hasta >= data.fecha_desde, {
    message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
    path: ['fecha_hasta'],
  })
  .refine(
    (data) => {
      if (!data.activo) return true;
      const today = getTodayLocalYYYYMMDD();
      return data.fecha_hasta >= today;
    },
    { message: 'No se puede marcar como activo si la fecha de fin ya pasó.', path: ['activo'] }
  );

export type WellnessDeliveryTypeFormValues = z.infer<typeof schema>;

interface WellnessDeliveryTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: WellnessDeliveryType | null; // null = crear, no null = editar
  onSubmit: (data: WellnessDeliveryTypeFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

const WellnessDeliveryTypeFormDialog: React.FC<WellnessDeliveryTypeFormDialogProps> = ({
  open,
  onOpenChange,
  type,
  onSubmit,
  isSubmitting = false,
}) => {
  const isEdit = type !== null;

  const form = useForm<WellnessDeliveryTypeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: '',
      modo_acceso: 'listado',
      activo: true,
      fecha_desde: '',
      fecha_hasta: '',
    },
  });

  const fechaHasta = useWatch({ control: form.control, name: 'fecha_hasta', defaultValue: '' });
  const todayStr = getTodayLocalYYYYMMDD();
  const isDateRangeInPast = !!fechaHasta && fechaHasta < todayStr;

  useEffect(() => {
    if (open) {
      if (type) {
        form.reset({
          nombre: type.nombre,
          modo_acceso: type.modo_acceso ?? 'listado',
          activo: type.activo,
          fecha_desde: type.fecha_desde,
          fecha_hasta: type.fecha_hasta,
        });
      } else {
        form.reset({
          nombre: '',
          modo_acceso: 'listado',
          activo: true,
          fecha_desde: '',
          fecha_hasta: '',
        });
      }
    }
  }, [open, type, form]);

  // Si el rango de fechas ya pasó, no permitir activo
  useEffect(() => {
    if (isDateRangeInPast && form.getValues('activo')) {
      form.setValue('activo', false);
    }
  }, [isDateRangeInPast, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
    // El padre cierra el diálogo en onSuccess de la mutación
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar campaña' : 'Nueva campaña (tipo de entrega)'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica el nombre, fechas o estado activo de la campaña.'
              : 'Crea un tipo de entrega para que los afiliados puedan solicitar este beneficio en el rango de fechas indicado. Solo una campaña activa aplica por fecha.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre (visible para el afiliado)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Detalle día de la mujer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="modo_acceso"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Modo de acceso</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4">
                        <RadioGroupItem value="listado" id="modo-listado" />
                        <div className="grid gap-1.5 leading-none">
                          <Label htmlFor="modo-listado" className="flex items-center gap-2 font-medium cursor-pointer">
                            <FileCheck className="h-4 w-4" />
                            Con listado
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Requiere autenticación del afiliado y validación contra el archivo Excel de afiliados permitidos. Debes subir el listado en la sección &quot;Gestión de Archivo Excel&quot;.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4">
                        <RadioGroupItem value="abierto" id="modo-abierto" />
                        <div className="grid gap-1.5 leading-none">
                          <Label htmlFor="modo-abierto" className="flex items-center gap-2 font-medium cursor-pointer">
                            <Globe className="h-4 w-4" />
                            Abierto
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Cualquier afiliado puede solicitar; se puede buscar por documento sin validar contra listado. Útil para entregas en punto o registro por personal interno.
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fecha_desde"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de inicio</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fecha_hasta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de fin</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="activo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Activo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {isDateRangeInPast
                        ? 'La fecha de fin ya pasó; no se puede marcar como activo.'
                        : 'Si está activo, las solicitudes creadas en este rango de fechas usarán esta campaña.'}
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isDateRangeInPast}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Guardar cambios' : 'Crear campaña'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default WellnessDeliveryTypeFormDialog;
