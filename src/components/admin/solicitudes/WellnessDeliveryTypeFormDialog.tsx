import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, FileCheck, Globe, CalendarRange, Infinity, FileSpreadsheet, ListChecks, Download, Upload, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WellnessDeliveryType, wellnessDeliveryService } from '@/services/wellnessDeliveryService';
import { logger } from '@/utils/logger';

function getTodayLocalYYYYMMDD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const schema = z
  .object({
    nombre: z.string().min(1, 'El nombre es obligatorio').max(200, 'Máximo 200 caracteres'),
    modo_acceso: z.enum(['listado', 'abierto', 'entrega_listado'], { required_error: 'El modo de acceso es obligatorio' }),
    siempre_activo: z.boolean(),
    fecha_desde: z.string(),
    fecha_hasta: z.string(),
  })
  .refine(
    (data) => {
      if (data.siempre_activo) return true;
      return !!data.fecha_desde?.trim() && !!data.fecha_hasta?.trim();
    },
    { message: 'Indica un rango de fechas o marca "Siempre activo"', path: ['fecha_desde'] }
  )
  .refine((data) => {
    if (data.siempre_activo || !data.fecha_desde || !data.fecha_hasta) return true;
    return data.fecha_hasta >= data.fecha_desde;
  }, {
    message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
    path: ['fecha_hasta'],
  });

export type WellnessDeliveryTypeFormValues = z.infer<typeof schema>;

interface WellnessDeliveryTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: WellnessDeliveryType | null; // null = crear, no null = editar
  /** listadoFile: Excel del listado propio de la campaña (modos listado y entrega_listado); se carga después de guardar la campaña */
  onSubmit: (data: WellnessDeliveryTypeFormValues, listadoFile: File | null) => Promise<void>;
  isSubmitting?: boolean;
  /** Si se proporciona, se muestra un botón para abrir la gestión del archivo Excel cuando el modo es "Con listado" */
  onOpenFileManager?: () => void;
}

const WellnessDeliveryTypeFormDialog: React.FC<WellnessDeliveryTypeFormDialogProps> = ({
  open,
  onOpenChange,
  type,
  onSubmit,
  isSubmitting = false,
  onOpenFileManager,
}) => {
  const isEdit = type !== null;
  const [listadoFile, setListadoFile] = useState<File | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const listadoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<WellnessDeliveryTypeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: '',
      modo_acceso: 'listado',
      siempre_activo: false,
      fecha_desde: '',
      fecha_hasta: '',
    },
  });

  const siempreActivo = useWatch({ control: form.control, name: 'siempre_activo', defaultValue: false });
  const modoAcceso = useWatch({ control: form.control, name: 'modo_acceso', defaultValue: 'listado' });

  useEffect(() => {
    if (open) {
      setListadoFile(null);
      if (type) {
        const isAlwaysActive = type.siempre_activo ?? (type.fecha_desde == null && type.fecha_hasta == null);
        form.reset({
          nombre: type.nombre,
          modo_acceso: type.modo_acceso ?? 'listado',
          siempre_activo: isAlwaysActive,
          fecha_desde: type.fecha_desde ?? '',
          fecha_hasta: type.fecha_hasta ?? '',
        });
      } else {
        form.reset({
          nombre: '',
          modo_acceso: 'listado',
          siempre_activo: false,
          fecha_desde: '',
          fecha_hasta: '',
        });
      }
    }
  }, [open, type, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data, data.modo_acceso === 'entrega_listado' || data.modo_acceso === 'listado' ? listadoFile : null);
    // El padre cierra el diálogo en onSuccess de la mutación
  });

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const esInscripcion = modoAcceso === 'listado';
      const blob = await wellnessDeliveryService.downloadListTemplate(esInscripcion ? 'listado' : 'entrega_listado');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = esInscripcion ? 'Plantilla_Listado_Inscripcion.xlsx' : 'Plantilla_Listado_Entregas_Bienestar.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Error al descargar plantilla de listado', { error });
      toast.error('No se pudo descargar la plantilla');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleListadoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls') {
      toast.error('El listado debe ser un Excel (.xlsx o .xls)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El listado no puede ser mayor a 10MB');
      return;
    }
    setListadoFile(file);
  };

  const listadoActual = type?.listado ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar campaña' : 'Nueva campaña (tipo de entrega)'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica el nombre, modo de acceso o vigencia (siempre activo o rango de fechas) de la campaña.'
              : 'Crea un tipo de entrega. Puede ser siempre activo (sin fechas) o tener un rango de fechas de vigencia. Varias campañas pueden estar activas a la vez.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Sección: Modo de acceso */}
            <Card className="border border-slate-200 bg-slate-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-600" />
                  Modo de acceso
                </CardTitle>
                <CardDescription>
                  Define cómo los afiliados pueden solicitar esta entrega: con validación contra listado o de forma abierta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FormField
                  control={form.control}
                  name="modo_acceso"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col gap-3"
                        >
                          <div className="flex items-start space-x-3 space-y-0 rounded-lg border border-slate-200 bg-white p-4">
                            <RadioGroupItem value="listado" id="modo-listado" />
                            <div className="grid gap-1.5 leading-none">
                              <Label htmlFor="modo-listado" className="flex items-center gap-2 font-medium cursor-pointer">
                                <FileCheck className="h-4 w-4" />
                                Inscripción con listado
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                El afiliado se inscribe en la página pública (autenticándose contra el Excel general de &quot;Gestión de Archivo Excel&quot;) y luego el personal le entrega.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3 space-y-0 rounded-lg border border-slate-200 bg-white p-4">
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
                          <div className="flex items-start space-x-3 space-y-0 rounded-lg border border-slate-200 bg-white p-4">
                            <RadioGroupItem value="entrega_listado" id="modo-entrega-listado" />
                            <div className="grid gap-1.5 leading-none">
                              <Label htmlFor="modo-entrega-listado" className="flex items-center gap-2 font-medium cursor-pointer">
                                <ListChecks className="h-4 w-4" />
                                Entrega directa con listado
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Las coordinadoras registran la entrega en el acto, pero solo a quienes estén en el listado de esta campaña y hasta su número de entregas (ej. 3 hijos = 3 entregas). El sistema bloquea entregas repetidas.
                              </p>
                            </div>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {(modoAcceso === 'entrega_listado' || modoAcceso === 'listado') && (
                  <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                          Listado de la campaña
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {modoAcceso === 'listado'
                            ? 'Personas habilitadas para inscribirse (kits, eventos, fiestas, etc.). Solo DOCUMENTO es obligatorio; opcionales: NOMBRE, HOSPITAL, FECHA EXPEDICION, NOMBRE BENEFICIARIO, PARENTESCO y EDAD. La plantilla incluye un instructivo.'
                            : 'Una fila por beneficiario. Columnas: DOCUMENTO AFILIADO (obligatoria), NOMBRE AFILIADO, HOSPITAL, NOMBRE BENEFICIARIO, PARENTESCO, EDAD y CANTIDAD (vacía = 1).'}
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="shrink-0 bg-white" onClick={handleDownloadTemplate} disabled={isDownloadingTemplate}>
                        {isDownloadingTemplate ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                        Descargar plantilla
                      </Button>
                    </div>

                    {listadoActual && listadoActual.filas > 0 && (
                      <p className="text-xs text-slate-700 rounded-md bg-white border border-slate-200 px-3 py-2 break-words">
                        {modoAcceso === 'listado' ? (
                          <>Listado actual: <strong>{listadoActual.afiliados}</strong> persona(s) en <strong>{listadoActual.filas}</strong> fila(s)</>
                        ) : (
                          <>Listado actual: <strong>{listadoActual.afiliados}</strong> afiliados, <strong>{listadoActual.cupos}</strong> entregas</>
                        )}
                        {listadoActual.archivo ? ` (${listadoActual.archivo})` : ''}. Si cargas uno nuevo, se reemplaza; {modoAcceso === 'listado' ? 'las inscripciones' : 'las entregas'} ya registradas se conservan.
                      </p>
                    )}

                    <input ref={listadoInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleListadoFileChange} />
                    {listadoFile ? (
                      <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                        <span className="text-sm text-slate-800 truncate min-w-0" title={listadoFile.name}>{listadoFile.name}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setListadoFile(null)} aria-label="Quitar archivo">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" size="sm" className="bg-white" onClick={() => listadoInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        {listadoActual && listadoActual.filas > 0 ? 'Reemplazar listado' : 'Seleccionar listado (Excel)'}
                      </Button>
                    )}
                    {!listadoFile && !(listadoActual && listadoActual.filas > 0) && (
                      <p className="text-xs text-amber-700">
                        {modoAcceso === 'listado'
                          ? 'Sin listado propio, la campaña usará el archivo general de Gestión de Archivo Excel (compartido entre campañas).'
                          : 'Sin listado no se podrá entregar a nadie en esta campaña.'}
                        {modoAcceso === 'listado' && onOpenFileManager && (
                          <>
                            {' '}
                            <button type="button" className="underline font-medium hover:text-amber-900" onClick={() => onOpenFileManager()}>
                              Ver archivo general
                            </button>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sección: Vigencia */}
            <Card className="border border-slate-200 bg-slate-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-slate-600" />
                  Vigencia
                </CardTitle>
                <CardDescription>
                  Indica cuándo estará disponible esta campaña: siempre (todo el año) o solo en un rango de fechas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="siempre_activo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-slate-200 bg-white p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-base cursor-pointer flex items-center gap-2">
                          <Infinity className="h-4 w-4 text-slate-500" />
                          Siempre activo (sin rango de fechas)
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          La campaña estará disponible todos los días del año. Por ejemplo: detalles de cumpleaños, beneficios permanentes.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                {!siempreActivo && (
                  <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
                    <p className="text-sm font-medium text-slate-700">Rango de fechas</p>
                    <p className="text-xs text-muted-foreground -mt-2">La campaña solo estará activa entre la fecha de inicio y la fecha de fin.</p>
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
                  </div>
                )}
              </CardContent>
            </Card>

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
