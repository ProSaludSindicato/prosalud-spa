import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, X, Loader2, Image as ImageIcon, FileText, Info, AlertTriangle, Maximize2, ChevronLeft, ChevronRight, Trash2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { 
  wellnessRequestsService, 
  WellnessRequest, 
  WellnessActivityRealized,
  CreateWellnessActivityRealizedData,
  UpdateWellnessActivityRealizedData,
} from '@/services/wellnessRequestsApi';
import { optimizeImages, isImageFile } from '@/utils/imageOptimizer';

const activityRealizedSchema = z.object({
  fecha_realizada: z.string().min(1, 'La fecha realizada es obligatoria'),
  ubicacion_real: z.array(z.string()).min(1, 'Debe seleccionar al menos una ubicación').refine(
    (arr) => {
      // Validar que el string unido no exceda 500 caracteres
      const joined = arr.join(', ');
      return joined.length <= 500;
    },
    { message: 'La ubicación total no puede exceder 500 caracteres' }
  ),
  numero_asistentes_real: z.number().refine((val) => val > 0, {
    message: 'El número de asistentes debe ser mayor a 0',
  }),
  descripcion_realizada: z.string().min(1, 'La descripción es obligatoria').max(500, 'La descripción no puede exceder 500 caracteres'),
  obsequio_entregado: z.string().max(255, 'El obsequio no puede exceder 255 caracteres').optional(),
});

type ActivityRealizedFormValues = z.infer<typeof activityRealizedSchema>;

interface WellnessActivityRealizedFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  solicitud: WellnessRequest;
  actividadRealizada?: WellnessActivityRealized | null;
}

const WellnessActivityRealizedForm: React.FC<WellnessActivityRealizedFormProps> = ({ 
  open, 
  onClose, 
  onSuccess, 
  solicitud,
  actividadRealizada 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evidencias, setEvidencias] = useState<File[]>([]);
  const [evidenciaPreviews, setEvidenciaPreviews] = useState<string[]>([]);
  const [listadoAsistencia, setListadoAsistencia] = useState<File | null>(null);
  const [listadoAsistenciaError, setListadoAsistenciaError] = useState<string>('');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const isEditing = !!actividadRealizada;
  
  // Obtener sedes disponibles de la solicitud
  const sedesDisponibles = solicitud.sedes || [];

  const form = useForm<ActivityRealizedFormValues>({
    resolver: zodResolver(activityRealizedSchema),
    defaultValues: {
      fecha_realizada: '',
      ubicacion_real: [],
      numero_asistentes_real: undefined,
      descripcion_realizada: '',
      obsequio_entregado: '',
    },
  });

  // Función para obtener obsequios de los detalles de la solicitud (solo tipos, sin cantidades)
  const getObsequiosFromDetalles = (): string => {
    if (solicitud.detalles && solicitud.detalles.length > 0) {
      return solicitud.detalles.map(d => d.tipo).join(', ');
    }
    return '';
  };

  const handleViewImage = (index: number) => {
    setSelectedImageIndex(index);
    setIsImageViewerOpen(true);
  };

  const handleCloseImageViewer = () => {
    setIsImageViewerOpen(false);
    setSelectedImageIndex(null);
  };

  const handleNextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < evidenciaPreviews.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const handlePreviousImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  // Cargar datos existentes cuando se está editando
  useEffect(() => {
    if (actividadRealizada && open) {
      // Si hay ubicación_real guardada, intentar parsearla a array
      let ubicaciones: string[] = [];
      if (actividadRealizada.ubicacion_real) {
        // Si es un string, dividirlo por comas
        if (typeof actividadRealizada.ubicacion_real === 'string') {
          ubicaciones = actividadRealizada.ubicacion_real.split(',').map(s => s.trim()).filter(Boolean);
        } else if (Array.isArray(actividadRealizada.ubicacion_real)) {
          ubicaciones = actividadRealizada.ubicacion_real;
        }
      }
      
      form.reset({
        fecha_realizada: actividadRealizada.fecha_realizada || '',
        ubicacion_real: ubicaciones,
        numero_asistentes_real: actividadRealizada.numero_asistentes_real,
        descripcion_realizada: actividadRealizada.descripcion_realizada || '',
        obsequio_entregado: actividadRealizada.obsequio_entregado || '',
      });
      
      // Cargar previews de evidencias existentes
      if (actividadRealizada.evidencias && actividadRealizada.evidencias.length > 0) {
        const previews = actividadRealizada.evidencias
          .map(ev => ev.image_url)
          .filter((url): url is string => !!url);
        setEvidenciaPreviews(previews);
      }
      
      // Si hay listado de asistencia existente, no necesitamos cargar el archivo
      // pero debemos indicar que existe
      if (actividadRealizada.listado_asistencia) {
        setListadoAsistenciaError('');
      }
    } else if (!actividadRealizada && open) {
      // Prellenar con datos de la solicitud
      const obsequiosIniciales = getObsequiosFromDetalles();
      
      form.reset({
        fecha_realizada: solicitud.fechaPropuesta || '',
        ubicacion_real: solicitud.sedes || [],
        numero_asistentes_real: solicitud.numeroParticipantes,
        descripcion_realizada: solicitud.descripcionActividad || '',
        obsequio_entregado: obsequiosIniciales,
      });
      setEvidencias([]);
      setEvidenciaPreviews([]);
      setListadoAsistencia(null);
      setListadoAsistenciaError('');
    }
  }, [actividadRealizada, open, solicitud, form]);

  const handleEvidenciasUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (evidencias.length + files.length > 20) {
      toast.error('Límite excedido', {
        description: 'Máximo 20 imágenes permitidas.',
      });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error('Formato no válido', {
          description: 'Las imágenes deben ser de tipo: jpeg, png, jpg, gif, webp.',
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Archivo muy grande', {
          description: `Cada imagen no puede exceder 5MB. ${file.name} es muy grande.`,
        });
        return;
      }
    }

    // Optimizar imágenes antes de agregarlas
    setIsOptimizing(true);
    try {
      const optimizedFiles = await optimizeImages(files);

      setEvidencias(prev => [...prev, ...optimizedFiles]);

      // Crear previews de las imágenes optimizadas
      optimizedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setEvidenciaPreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });

      // Notificar optimización
      const imageCount = files.filter(f => isImageFile(f)).length;
      if (imageCount > 0) {
        toast.success('Imágenes optimizadas', {
          description: `${imageCount} imagen(es) optimizada(s) exitosamente.`,
          duration: 2000,
        });
      }
    } catch (error) {
      logger.error('Error al optimizar imágenes:', error);
      toast.error('Error al optimizar imágenes', {
        description: 'Se usarán las imágenes sin optimizar.',
        duration: 3000,
      });
      // Si falla la optimización, usar las imágenes originales
      setEvidencias(prev => [...prev, ...files]);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setEvidenciaPreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const removeEvidencia = (index: number) => {
    setEvidencias(prev => prev.filter((_, i) => i !== index));
    setEvidenciaPreviews(prev => prev.filter((_, i) => {
      // Si es una URL existente (no un preview nuevo), mantenerla
      // Si es un preview nuevo, eliminarlo
      const isExistingUrl = prev[i]?.startsWith('http');
      return isExistingUrl || i !== index;
    }));
  };

  const handleListadoAsistenciaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      const errorMsg = 'El listado debe ser PDF o Excel (.pdf, .xls, .xlsx).';
      setListadoAsistenciaError(errorMsg);
      toast.error('Formato no válido', {
        description: errorMsg,
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      const errorMsg = 'El archivo no puede exceder 10MB.';
      setListadoAsistenciaError(errorMsg);
      toast.error('Archivo muy grande', {
        description: errorMsg,
      });
      return;
    }

    setListadoAsistencia(file);
    setListadoAsistenciaError('');
  };

  const removeListadoAsistencia = () => {
    setListadoAsistencia(null);
  };

  const onSubmit = async (data: ActivityRealizedFormValues) => {
    // Validar evidencias
    if (!isEditing && evidencias.length === 0) {
      toast.error('Evidencias requeridas', {
        description: 'Debes subir al menos una imagen de evidencia.',
      });
      return;
    }

    // Validar listado de asistencia
    if (!listadoAsistencia && !actividadRealizada?.listado_asistencia) {
      setListadoAsistenciaError('El listado de asistencia es obligatorio');
      toast.error('Listado de asistencia requerido', {
        description: 'Debe subir el archivo con el listado de asistencia.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Convertir array de ubicaciones a string
      const ubicacionRealString = Array.isArray(data.ubicacion_real) 
        ? data.ubicacion_real.join(', ')
        : data.ubicacion_real;

      if (isEditing && actividadRealizada) {
        // Actualizar actividad realizada existente
        const updateData: UpdateWellnessActivityRealizedData = {
          fecha_realizada: data.fecha_realizada,
          ubicacion_real: ubicacionRealString,
          numero_asistentes_real: data.numero_asistentes_real,
          descripcion_realizada: data.descripcion_realizada,
          obsequio_entregado: data.obsequio_entregado,
          evidencias: evidencias.length > 0 ? evidencias : undefined,
          listado_asistencia: listadoAsistencia || undefined,
        };

        await wellnessRequestsService.updateWellnessActivityRealized(
          solicitud.id,
          updateData,
        );

        toast.success('Información actualizada exitosamente', {
          description: 'La información de la actividad realizada ha sido actualizada.',
        });
      } else {
        // Crear nueva actividad realizada
        const createData: CreateWellnessActivityRealizedData = {
          wellness_request_id: solicitud.id,
          fecha_realizada: data.fecha_realizada,
          ubicacion_real: ubicacionRealString,
          numero_asistentes_real: data.numero_asistentes_real,
          descripcion_realizada: data.descripcion_realizada,
          obsequio_entregado: data.obsequio_entregado,
          evidencias: evidencias,
          listado_asistencia: listadoAsistencia || undefined,
        };

        await wellnessRequestsService.createWellnessActivityRealized(createData);

        toast.success('Información guardada exitosamente', {
          description: 'La información de la actividad realizada ha sido guardada.',
        });
      }

      form.reset();
      setEvidencias([]);
      setEvidenciaPreviews([]);
      setListadoAsistencia(null);
      setListadoAsistenciaError('');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      logger.error(
        `Error al ${isEditing ? 'actualizar' : 'crear'} actividad realizada`,
        error?.message || error,
      );
      toast.error(`Error al ${isEditing ? 'actualizar' : 'guardar'} la información`, {
        description: error?.message || 'Por favor, intente nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-sm:inset-x-4 max-sm:max-w-[calc(100vw-2rem)] sm:w-full sm:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {isEditing ? 'Editar Información de Actividad Realizada' : 'Registrar Actividad Realizada'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-2">
            {isEditing
              ? 'Actualice la información de la actividad realizada.'
              : (
                <>
                  Complete la información de la actividad de bienestar una vez realizada.
                  <br />
                  Esta información puede ser utilizada para publicar un nuevo evento en la galería de eventos de bienestar del sitio web.
                </>
              )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información de la Actividad Realizada */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Información de la Actividad Realizada
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fecha_realizada"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Fecha Realizada *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem>
                    <FormLabel className="text-gray-700">Centro de Costos</FormLabel>
                    <FormControl>
                      <div className="flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm text-gray-900">
                        {solicitud.centroCostos || 'N/A'}
                      </div>
                    </FormControl>
                  </FormItem>
                </div>

                <FormField
                  control={form.control}
                  name="ubicacion_real"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Ubicación Real *</FormLabel>
                      <FormDescription className="text-xs text-gray-500 mb-2">
                        Seleccione una o más ubicaciones donde se realizó la actividad
                      </FormDescription>
                      <FormControl>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                          {sedesDisponibles.map((sede) => (
                            <div key={sede} className="flex items-center space-x-2">
                              <Checkbox
                                id={`ubicacion-${sede}`}
                                checked={field.value?.includes(sede)}
                                onCheckedChange={(checked) => {
                                  const currentUbicaciones = field.value || [];
                                  if (checked) {
                                    field.onChange([...currentUbicaciones, sede]);
                                  } else {
                                    field.onChange(currentUbicaciones.filter((s) => s !== sede));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`ubicacion-${sede}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {sede}
                              </label>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero_asistentes_real"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Número de Asistentes Real *</FormLabel>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descripcion_realizada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Descripción de la Actividad Realizada *</FormLabel>
                      <FormControl>
                        <div>
                          <Textarea
                            placeholder="Describa cómo se realizó la actividad, resultados, participación..."
                            rows={4}
                            maxLength={500}
                            {...field}
                          />
                          <div className="flex justify-end mt-1">
                            <span className={`text-xs ${(field.value?.length || 0) >= 500 ? 'text-red-600' : 'text-gray-500'}`}>
                              {(field.value?.length || 0)} / 500 caracteres
                            </span>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="obsequio_entregado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Obsequio Entregado</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Kit de bienestar, Lonchera..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Si son varios obsequios, sepárelos con comas (Ej: Kit de bienestar, Lonchera, Agenda)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Evidencias (Imágenes) */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Evidencias de la Actividad {!isEditing && '*'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Alert className="mb-4 bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800">
                    Suba imágenes que evidencien la realización de la actividad. Estas pueden ser utilizadas para la galería pública.
                  </AlertDescription>
                </Alert>
                <Alert className="mb-4 bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-800">
                    Por favor, absténgase de subir imágenes borrosas o que no cumplan los requisitos de calidad de la organización.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  {evidenciaPreviews.length === 0 && evidencias.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors relative">
                      {isOptimizing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg z-10">
                          <div className="flex items-center gap-2 text-sm text-primary-prosalud">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Optimizando imágenes...</span>
                          </div>
                        </div>
                      )}
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                        onChange={handleEvidenciasUpload}
                        className="hidden"
                        id="evidencias-upload"
                        disabled={isOptimizing}
                      />
                      <label htmlFor="evidencias-upload" className={`cursor-pointer ${isOptimizing ? 'pointer-events-none opacity-50' : ''}`}>
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-lg font-medium text-gray-600 mb-1">Seleccionar evidencias</p>
                        <p className="text-sm text-gray-500">JPG, PNG o WebP (máx. 5MB cada una, hasta 20 imágenes)</p>
                      </label>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {evidenciaPreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Evidencia ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg cursor-pointer"
                              onClick={() => handleViewImage(index)}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewImage(index);
                                }}
                                className="h-7 w-7 p-0 bg-white/90 hover:bg-white"
                              >
                                <Maximize2 className="h-3 w-3 text-gray-700" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeEvidencia(index);
                                }}
                                className="h-7 w-7 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center relative">
                        {isOptimizing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg z-10">
                            <div className="flex items-center gap-2 text-sm text-primary-prosalud">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Optimizando imágenes...</span>
                            </div>
                          </div>
                        )}
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                          onChange={handleEvidenciasUpload}
                          className="hidden"
                          id="evidencias-upload-more"
                          disabled={isOptimizing}
                        />
                        <label htmlFor="evidencias-upload-more" className={`cursor-pointer ${isOptimizing ? 'pointer-events-none opacity-50' : ''}`}>
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Agregar más evidencias</p>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Listado de Asistencia */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Listado de Asistencia *
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Alert className="mb-4 bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800">
                    Suba el archivo con el listado de asistencia de la actividad en formato PDF y{' '}
                    <span className="font-semibold text-primary-prosalud">
                      utilizando exclusivamente la planilla oficial de ProSalud. Otros formatos no son válidos y no
                      podrán ser utilizados por la organización.
                    </span>
                  </AlertDescription>
                </Alert>
                {listadoAsistenciaError && (
                  <Alert className="mb-4 bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-sm text-red-800">
                      {listadoAsistenciaError}
                    </AlertDescription>
                  </Alert>
                )}
                
                {listadoAsistencia ? (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{listadoAsistencia.name}</p>
                          <p className="text-xs text-gray-500">
                            {(listadoAsistencia.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeListadoAsistencia}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handleListadoAsistenciaUpload}
                      className="hidden"
                      id="listado-asistencia-upload"
                    />
                    <label htmlFor="listado-asistencia-upload" className="cursor-pointer">
                      <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-600 mb-1">Seleccionar listado de asistencia</p>
                      <p className="text-xs text-gray-500">
                        Sólo se admite PDF en el formato de planilla oficial de ProSalud (.pdf) - máx. 10MB
                      </p>
                    </label>
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
                disabled={isSubmitting}
                className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Actualizando...' : 'Guardando...'}
                  </>
                ) : (
                  isEditing ? 'Actualizar Información' : 'Guardar Información'
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Diálogo de Visualización de Imágenes */}
        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent className="max-sm:inset-x-4 sm:w-full sm:max-w-4xl lg:max-w-6xl max-h-[95vh] p-0 bg-black/95 border-none [&>button]:hidden">
            <DialogTitle className="sr-only">
              Visualización de Evidencia {selectedImageIndex !== null ? selectedImageIndex + 1 : ''}
            </DialogTitle>
            {selectedImageIndex !== null && evidenciaPreviews[selectedImageIndex] && (
              <div className="relative w-full h-[95vh] flex items-center justify-center">
                <img
                  src={evidenciaPreviews[selectedImageIndex]}
                  alt={`Evidencia ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-[90vh] object-contain"
                />
                
                {/* Botón cerrar */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseImageViewer}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white h-10 w-10 z-50"
                >
                  <X className="h-6 w-6" />
                </Button>

                {/* Botón anterior */}
                {selectedImageIndex > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handlePreviousImage}
                    className="fixed left-4 top-1/2 bg-black/50 hover:bg-black/70 text-white h-12 w-12 z-50 transition-colors"
                    style={{ transform: 'translateY(-50%)' }}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}

                {/* Botón siguiente */}
                {selectedImageIndex < evidenciaPreviews.length - 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleNextImage}
                    className="fixed right-4 top-1/2 bg-black/50 hover:bg-black/70 text-white h-12 w-12 z-50 transition-colors"
                    style={{ transform: 'translateY(-50%)' }}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                )}

                {/* Contador de imágenes */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm z-50">
                  {selectedImageIndex + 1} / {evidenciaPreviews.length}
                </div>

                {/* Botón eliminar */}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (selectedImageIndex !== null) {
                      removeEvidencia(selectedImageIndex);
                      // Cerrar el visor después de eliminar
                      handleCloseImageViewer();
                    }
                  }}
                  className="absolute top-4 left-4 z-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default WellnessActivityRealizedForm;

