import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, X, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { wellnessRequestsService, WellnessRequest } from '@/services/wellnessRequestsApi';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { logger } from '@/utils/logger';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';

// Schema de validación (las sedes se validarán dinámicamente en el onSubmit)
const wellnessRequestSchema = z.object({
  nombreActividad: z.string().min(1, 'El nombre de la actividad es obligatorio').max(200, 'El nombre no puede exceder 200 caracteres'),
  descripcionActividad: z.string().max(300, 'La descripción no puede exceder 300 caracteres').optional(),
  centroCostos: z.string().min(1, 'Debe seleccionar un centro de costos'),
  sedes: z.array(z.string()), // Se validará condicionalmente en el onSubmit
  fechaPropuesta: z.string().min(1, 'La fecha propuesta es obligatoria'),
  horaInicio: z.string().optional(),
  horaFin: z.string().optional(),
  numeroParticipantes: z.number().refine((val) => val === undefined || (val > 0 && val <= 10000), {
    message: 'El número de participantes debe ser mayor a 0 y no exceder 10000',
  }).optional(),
  requiereDetalles: z.boolean().default(false),
  detalles: z.array(z.object({
    tipo: z.string().min(1, 'El tipo de detalle es obligatorio').max(100, 'El tipo de detalle no puede exceder 100 caracteres'),
    cantidad: z.number().refine((val) => val > 0 && val <= 10000, {
      message: 'La cantidad debe ser mayor a 0 y no exceder 10000',
    }),
  })).optional(),
}).refine((data) => {
  // Validar que la hora de fin sea posterior a la hora de inicio si ambas están presentes
  if (data.horaInicio && data.horaFin) {
    const inicio = new Date(`2000-01-01T${data.horaInicio}`);
    const fin = new Date(`2000-01-01T${data.horaFin}`);
    return fin > inicio;
  }
  return true;
}, {
  message: 'La hora de fin debe ser posterior a la hora de inicio',
  path: ['horaFin'],
});

type WellnessRequestFormValues = z.infer<typeof wellnessRequestSchema>;

interface DetalleItem {
  id: string;
  tipo: string;
  cantidad: number;
}

interface WellnessRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  solicitud?: WellnessRequest | null;
  canUpdateStatus?: boolean; // Nuevo prop para permiso de actualizar estado
}

// Centros de costos disponibles
const CENTROS_COSTOS = ['Bello', 'Rionegro', 'La Maria asistencial', 'La Maria VIH', 'La Maria Cosalud', 'La Maria Enterritorio', 'Admon'];

// Mapeo de sedes por centro de costos
const SEDES_POR_CENTRO_COSTOS: Record<string, string[]> = {
  'Bello': ['Niquia', 'Autopista'],
  'Rionegro': ['Jorge Humberto', 'Gilberto Mejía'],
  'La Maria asistencial': ['Castilla', 'La 33'],
  'La Maria VIH': ['Castilla', 'La 33'],
  'La Maria Cosalud': ['Castilla', 'La 33'],
  'La Maria Enterritorio': ['Castilla', 'La 33'],
  'Admon': ['Principal'],
};

// Límite máximo de detalles/souvenirs
const MAX_DETALLES = 5;

const WellnessRequestForm: React.FC<WellnessRequestFormProps> = ({ open, onClose, onSuccess, solicitud, canUpdateStatus = false }) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detalles, setDetalles] = useState<DetalleItem[]>([]);
  const isEditing = !!solicitud;
  // Security: Use centralized sanitization hook
  const { sanitizeText, sanitizeGeneral, sanitizeNumeric } = useSanitizedInput();

  // Validar que solo se puede editar si el estado es pending o in_progress,
  // o si tiene permiso de actualizar estado (puede editar solicitudes aprobadas)
  const canEdit = !solicitud || 
    solicitud.estado === 'pending' || 
    solicitud.estado === 'in_progress' || 
    (canUpdateStatus && solicitud.estado === 'resolved');

  const form = useForm<WellnessRequestFormValues>({
    resolver: zodResolver(wellnessRequestSchema),
    defaultValues: {
      nombreActividad: '',
      descripcionActividad: '',
      centroCostos: '',
      sedes: [],
      fechaPropuesta: '',
      horaInicio: '',
      horaFin: '',
      numeroParticipantes: undefined,
      requiereDetalles: false,
      detalles: [],
    },
  });

  // Cargar datos de la solicitud cuando se está editando
  useEffect(() => {
    if (solicitud && open && canEdit) {
      const sedesDisponibles = solicitud.centroCostos 
        ? SEDES_POR_CENTRO_COSTOS[solicitud.centroCostos] || []
        : [];
      
      // Si solo hay una sede, asegurar que esté seleccionada
      const sedesIniciales = sedesDisponibles.length === 1 && solicitud.sedes.length === 0
        ? [sedesDisponibles[0]]
        : solicitud.sedes;

      form.reset({
        nombreActividad: solicitud.nombreActividad,
        descripcionActividad: solicitud.descripcionActividad || '',
        centroCostos: solicitud.centroCostos,
        sedes: sedesIniciales,
        fechaPropuesta: solicitud.fechaPropuesta,
        horaInicio: solicitud.horaInicio || '',
        horaFin: solicitud.horaFin || '',
        numeroParticipantes: solicitud.numeroParticipantes,
        requiereDetalles: solicitud.requiereDetalles,
      });

      // Cargar detalles
      if (solicitud.requiereDetalles && solicitud.detalles && solicitud.detalles.length > 0) {
        setDetalles(
          solicitud.detalles.map((detalle, index) => ({
            id: `existing-${index}-${Date.now()}`,
            tipo: detalle.tipo,
            cantidad: detalle.cantidad,
          })),
        );
      } else {
        setDetalles([]);
      }
    } else if (!solicitud && open) {
      // Resetear formulario para creación
      form.reset({
        nombreActividad: '',
        descripcionActividad: '',
        centroCostos: '',
        sedes: [],
        fechaPropuesta: '',
        horaInicio: '',
        horaFin: '',
        numeroParticipantes: undefined,
        requiereDetalles: false,
      });
      setDetalles([]);
    }
  }, [solicitud, open, canEdit, form]);

  const requiereDetalles = form.watch('requiereDetalles');
  const centroCostosSeleccionado = form.watch('centroCostos');
  
  // Obtener las sedes disponibles para el centro de costos seleccionado
  const sedesDisponibles = centroCostosSeleccionado 
    ? SEDES_POR_CENTRO_COSTOS[centroCostosSeleccionado] || []
    : [];

  const addDetalle = () => {
    const newDetalle: DetalleItem = {
      id: Date.now().toString(),
      tipo: '',
      cantidad: 1,
    };
    setDetalles([...detalles, newDetalle]);
  };

  const removeDetalle = (id: string) => {
    setDetalles(detalles.filter(d => d.id !== id));
  };

  const updateDetalle = (id: string, field: 'tipo' | 'cantidad', value: string | number) => {
    setDetalles(detalles.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  // Limpiar sedes cuando cambia el centro de costos y marcar automáticamente si solo hay una
  const handleCentroCostosChange = (value: string) => {
    form.setValue('centroCostos', value);
    const sedesDisponibles = SEDES_POR_CENTRO_COSTOS[value] || [];
    // Si solo hay una sede, marcarla automáticamente
    if (sedesDisponibles.length === 1) {
      form.setValue('sedes', [sedesDisponibles[0]]);
    } else {
      form.setValue('sedes', []); // Limpiar sedes al cambiar centro de costos
    }
  };

  const onSubmit = async (data: WellnessRequestFormValues) => {
    // Validar sedes solo si hay sedes disponibles
    const sedesDisponiblesParaCentro = centroCostosSeleccionado 
      ? SEDES_POR_CENTRO_COSTOS[centroCostosSeleccionado] || []
      : [];
    
    if (sedesDisponiblesParaCentro.length > 0 && (!data.sedes || data.sedes.length === 0)) {
      toast.error('Debe seleccionar al menos una sede');
      return;
    }

    // Validar detalles si requiere
    if (data.requiereDetalles && detalles.length === 0) {
      toast.error('Debe agregar al menos un detalle/souvenir');
      return;
    }

    // Validar que los detalles estén completos
    if (data.requiereDetalles) {
      const detallesIncompletos = detalles.some(d => !d.tipo || !d.cantidad || d.cantidad <= 0);
      if (detallesIncompletos) {
        toast.error('Todos los detalles deben tener tipo y cantidad válida');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Usar el ID del usuario autenticado, o 1 por defecto si no hay usuario
      const userId = user?.id?.toString() || '1';

      // Preparar los detalles para el payload (solo si requiereDetalles es true)
      const detallesPayload = data.requiereDetalles 
        ? detalles.map(d => ({ tipo: d.tipo, cantidad: d.cantidad }))
        : [];

      // Preparar los datos según el formato del API independiente
      const requestData: any = {
        nombreActividad: data.nombreActividad,
        centroCostos: data.centroCostos,
        sedes: data.sedes,
        fechaPropuesta: data.fechaPropuesta,
        requiereDetalles: data.requiereDetalles,
      };

      // Campos opcionales - solo incluir si tienen valor
      if (data.descripcionActividad) {
        requestData.descripcionActividad = data.descripcionActividad;
      }
      if (data.horaInicio) {
        requestData.horaInicio = data.horaInicio;
      }
      if (data.horaFin) {
        requestData.horaFin = data.horaFin;
      }
      if (data.numeroParticipantes) {
        requestData.numeroParticipantes = data.numeroParticipantes;
      }
      if (data.requiereDetalles && detallesPayload.length > 0) {
        requestData.detalles = detallesPayload;
      } else if (!data.requiereDetalles) {
        requestData.detalles = [];
      }

      // Solo incluir solicitanteId al crear, no al editar
      if (!isEditing) {
        requestData.solicitanteId = userId;
      }

      if (isEditing && solicitud) {
        // Actualizar solicitud existente (actualización parcial)
        await wellnessRequestsService.updateWellnessRequest(solicitud.id, requestData);

        toast.success('Solicitud actualizada exitosamente', {
          description: 'La solicitud de bienestar ha sido actualizada correctamente.',
        });
      } else {
        // Crear nueva solicitud
        await wellnessRequestsService.createWellnessRequest(requestData);

        toast.success('Solicitud creada exitosamente', {
          description: 'La solicitud de bienestar ha sido enviada para revisión.',
        });
      }

      form.reset();
      setDetalles([]);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      logger.error(
        `Error al ${isEditing ? 'actualizar' : 'crear'} solicitud de bienestar`,
        error?.message || error,
      );
      toast.error(`Error al ${isEditing ? 'actualizar' : 'crear'} la solicitud`, {
        description: error?.message || 'Por favor, intente nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-sm:inset-x-4 sm:w-full sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {isEditing ? 'Editar Solicitud de Bienestar' : 'Nueva Solicitud de Bienestar'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-2">
            {isEditing
              ? 'Actualice los campos necesarios de la solicitud de bienestar.'
              : 'Complete el formulario para crear una solicitud de actividad de bienestar. Esta solicitud será revisada por el área de Talento Humano.'}
          </DialogDescription>
          {isEditing && solicitud && !canEdit && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">
                No se puede editar esta solicitud porque tiene un estado final ({solicitud.estado === 'resolved' ? 'Aprobada' : 'Rechazada'}).
              </p>
            </div>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {isEditing && solicitud && !canEdit && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Esta solicitud no puede ser editada porque tiene un estado final.
                </p>
              </div>
            )}
            {/* Información Básica */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Información de la Actividad
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <FormField
                  control={form.control}
                  name="nombreActividad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Nombre de la Actividad *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Taller de Mindfulness, Actividad Recreativa..."
                          {...field}
                          onChange={(e) => {
                            // Security: Sanitize activity name input - allow more characters for activity names
                            const sanitized = sanitizeGeneral(e.target.value, { maxLength: 200 });
                            field.onChange(sanitized);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descripcionActividad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Descripción de la Actividad</FormLabel>
                      <FormControl>
                        <div>
                          <Textarea
                            placeholder="Describa el propósito, objetivos de la actividad, participantes esperados... "
                            rows={4}
                            maxLength={300}
                            {...field}
                            onChange={(e) => {
                              // Security: Sanitize description input
                              const sanitized = sanitizeGeneral(e.target.value, { maxLength: 300 });
                              field.onChange(sanitized);
                            }}
                          />
                          <div className="flex justify-end mt-1">
                            <span className={`text-xs ${(field.value?.length || 0) >= 300 ? 'text-red-600' : 'text-gray-500'}`}>
                              {(field.value?.length || 0)} / 300 caracteres
                            </span>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Centro de Costos y Sedes */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Centro de Costos y Sedes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="centroCostos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Centro de Costos *</FormLabel>
                        <Select onValueChange={handleCentroCostosChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un centro de costos" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CENTROS_COSTOS.map((centro) => (
                              <SelectItem key={centro} value={centro}>
                                {centro}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numeroParticipantes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Número Estimado de Participantes</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ej: 50"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                field.onChange(undefined);
                              } else {
                                const numValue = parseInt(value, 10);
                                field.onChange(isNaN(numValue) ? undefined : numValue);
                              }
                            }}
                          />
                        </FormControl>
                        { /* <FormDescription>
                          Ayuda a estimar costos y logística
                        </FormDescription> */ }
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {sedesDisponibles.length > 0 && (
                  <FormField
                    control={form.control}
                    name="sedes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Sede(s) {sedesDisponibles.length > 0 ? '*' : ''}
                        </FormLabel>
                        <FormDescription>
                          Seleccione una o más sedes donde se realizará la actividad
                        </FormDescription>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                          {sedesDisponibles.map((sede) => (
                            <div key={sede} className="flex items-center space-x-2">
                              <Checkbox
                                id={sede}
                                checked={field.value?.includes(sede)}
                                onCheckedChange={(checked) => {
                                  const currentSedes = field.value || [];
                                  if (checked) {
                                    field.onChange([...currentSedes, sede]);
                                  } else {
                                    field.onChange(currentSedes.filter((s) => s !== sede));
                                  }
                                }}
                              />
                              <label
                                htmlFor={sede}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {sede}
                              </label>
                            </div>
                          ))}
                        </div>
                        {field.value && field.value.length > 0 && (
                          <div className="pt-6 flex flex-wrap gap-2">
                            {field.value.map((sede) => (
                              <Badge key={sede} variant="secondary">
                                {sede}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {centroCostosSeleccionado && sedesDisponibles.length === 0 && (
                  <div className="text-sm text-gray-500 italic">
                    Este centro de costos no tiene sedes asociadas
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fecha y Hora */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Fecha y Hora Propuesta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Alert className="mb-4 bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800">
                    Se recuerda que las actividades deben solicitarse con una anticipación de 10 a 15 días hábiles para su adecuada gestión y programación.                  
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="fechaPropuesta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Fecha Propuesta *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="horaInicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Hora de Inicio</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="horaFin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Hora de Fin</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Detalles/Souvenirs */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Detalles / Souvenirs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <FormField
                  control={form.control}
                  name="requiereDetalles"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-gray-700 cursor-pointer">
                          Requiere detalles/souvenirs para la actividad
                        </FormLabel>
                        <FormDescription>
                          Marque si necesita agendas, loncheras, pasabocas, anchetas, refrigerios, etc.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {requiereDetalles && (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Detalles/Souvenirs {detalles.length > 0 && `(${detalles.length}/${MAX_DETALLES})`}
                      </label>
                      <div className="flex flex-col items-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addDetalle}
                          disabled={detalles.length >= MAX_DETALLES}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Agregar Detalle
                        </Button>
                        {detalles.length >= MAX_DETALLES && (
                          <span className="text-xs text-gray-500">
                            Límite alcanzado (máximo {MAX_DETALLES})
                          </span>
                        )}
                      </div>
                    </div>

                    {detalles.map((detalle, index) => (
                      <div
                        key={detalle.id}
                        className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50"
                      >
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Tipo de Detalle *
                            </FormLabel>
                            <Input
                              placeholder="Ej: agendas, loncheras, pasabocas..."
                              value={detalle.tipo}
                              onChange={(e) => {
                                // Security: Sanitize detail type input
                                const sanitized = sanitizeText(e.target.value, { maxLength: 100, allowSpaces: true });
                                updateDetalle(detalle.id, 'tipo', sanitized);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Cantidad Estimada *
                            </FormLabel>
                            <Input
                              type="number"
                              placeholder="Ej: 50"
                              value={detalle.cantidad || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  updateDetalle(detalle.id, 'cantidad', 0);
                                } else {
                                  const numValue = parseInt(value, 10);
                                  updateDetalle(detalle.id, 'cantidad', isNaN(numValue) ? 0 : numValue);
                                }
                              }}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDetalle(detalle.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-6"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {detalles.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Agregue los detalles/souvenirs requeridos para la actividad
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Botones de Acción */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (isEditing && !canEdit)}
                className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : (
                  isEditing ? 'Actualizar Solicitud' : 'Crear Solicitud'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default WellnessRequestForm;

