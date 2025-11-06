import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Image as ImageIcon, 
  FileText, 
  Loader2, 
  X, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Globe,
  Upload,
  Info,
  Calendar,
  MapPin,
  Users,
  Gift,
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  wellnessRequestsService, 
  WellnessRequest, 
  WellnessActivityRealized,
  UpdateWellnessActivityRealizedData,
} from '@/services/wellnessRequestsApi';
import { wellnessEventsApi } from '@/services/wellnessEventsApi';

const reviewSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio').max(255),
  category: z.string().min(1, 'La categoría es obligatoria'),
  description: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional(),
  is_visible: z.boolean().default(true),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface WellnessActivityReviewDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  solicitud: WellnessRequest;
  actividadRealizada: WellnessActivityRealized;
}

const WellnessActivityReviewDialog: React.FC<WellnessActivityReviewDialogProps> = ({
  open,
  onClose,
  onSuccess,
  solicitud,
  actividadRealizada,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<number[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<Array<{id?: number; url: string; isSelected: boolean}>>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      title: solicitud.nombreActividad || '',
      category: '',
      description: actividadRealizada.descripcion_realizada || solicitud.descripcionActividad || '',
      is_visible: true,
    },
  });

  // Cargar evidencias y prellenar formulario
  useEffect(() => {
    if (open && actividadRealizada) {
      // Prellenar formulario
      form.reset({
        title: solicitud.nombreActividad || '',
        category: '',
        description: actividadRealizada.descripcion_realizada || solicitud.descripcionActividad || '',
        is_visible: true,
      });

      // Cargar evidencias
      if (actividadRealizada.evidencias && actividadRealizada.evidencias.length > 0) {
        const previews = actividadRealizada.evidencias
          .filter(ev => ev.id && ev.image_url) // Solo incluir evidencias con ID y URL válidas
          .map(ev => ({
            id: ev.id!,
            url: ev.image_url!,
            isSelected: ev.is_selected_for_gallery || false,
          }));
        setEvidencePreviews(previews);
        setSelectedEvidenceIds(
          previews
            .filter(p => p.isSelected)
            .map(p => p.id)
        );
      } else {
        setEvidencePreviews([]);
        setSelectedEvidenceIds([]);
      }
    } else {
      // Reset cuando se cierra
      setEvidencePreviews([]);
      setSelectedEvidenceIds([]);
    }
  }, [open, actividadRealizada, solicitud, form]);

  const toggleEvidenceSelection = (evidenceId: number) => {
    setSelectedEvidenceIds(prev => {
      if (prev.includes(evidenceId)) {
        return prev.filter(id => id !== evidenceId);
      } else {
        return [...prev, evidenceId];
      }
    });
  };

  const handleUpdateActivity = async (data: ReviewFormValues) => {
    if (!actividadRealizada) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateWellnessActivityRealizedData = {
        fecha_realizada: actividadRealizada.fecha_realizada,
        ubicacion_real: actividadRealizada.ubicacion_real,
        numero_asistentes_real: actividadRealizada.numero_asistentes_real,
        descripcion_realizada: data.description,
        obsequio_entregado: actividadRealizada.obsequio_entregado,
        evidencias_seleccionadas: selectedEvidenceIds,
      };

      await wellnessRequestsService.updateWellnessActivityRealized(
        solicitud.id,
        updateData,
      );

      toast.success('Información actualizada exitosamente', {
        description: 'Los cambios han sido guardados.',
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error updating activity:', error);
      toast.error('Error al actualizar', {
        description: error?.message || 'Por favor, intente nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishToGallery = async (data: ReviewFormValues) => {
    if (selectedEvidenceIds.length === 0) {
      toast.error('Seleccione evidencias', {
        description: 'Debe seleccionar al menos una evidencia para publicar en la galería.',
      });
      return;
    }

    setIsPublishing(true);
    try {
      // Primero actualizar la actividad con las evidencias seleccionadas
      const updateData: UpdateWellnessActivityRealizedData = {
        evidencias_seleccionadas: selectedEvidenceIds,
      };

      await wellnessRequestsService.updateWellnessActivityRealized(
        solicitud.id,
        updateData,
      );

      // Luego publicar en la galería
      await wellnessRequestsService.publishActivityToGallery(
        solicitud.id,
        selectedEvidenceIds,
        {
          title: data.title,
          category: data.category,
          description: data.description,
          is_visible: data.is_visible,
        },
      );

      toast.success('Publicado en galería exitosamente', {
        description: 'La actividad ha sido publicada en la galería pública.',
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error publishing to gallery:', error);
      toast.error('Error al publicar', {
        description: error?.message || 'Por favor, intente nuevamente.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const categories = ['Salud', 'Bienestar', 'Capacitación', 'Recreación', 'Cultura', 'Deporte'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Revisar y Publicar Actividad Realizada
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-2">
            Revise la información de la actividad realizada, seleccione las evidencias y publique en la galería pública si lo desea.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6">
            {/* Información de la Actividad */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Información de la Actividad
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha Realizada</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {actividadRealizada.fecha_realizada 
                        ? new Date(actividadRealizada.fecha_realizada).toLocaleDateString('es-ES')
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Ubicación Real</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {actividadRealizada.ubicacion_real || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Número de Asistentes</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {actividadRealizada.numero_asistentes_real || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Obsequio Entregado</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {actividadRealizada.obsequio_entregado || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Listado de Asistencia */}
            {actividadRealizada.listado_asistencia && (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="bg-gray-50 border-b border-gray-200">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Listado de Asistencia
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {actividadRealizada.listado_asistencia.original_name || 'Listado de asistencia'}
                      </p>
                      {actividadRealizada.listado_asistencia.file_url && (
                        <a
                          href={actividadRealizada.listado_asistencia.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Ver archivo
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selección de Evidencias */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Evidencias ({selectedEvidenceIds.length} seleccionadas)
                  </span>
                  <Badge variant="secondary">
                    {evidencePreviews.length} {evidencePreviews.length === 1 ? 'evidencia' : 'evidencias'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Alert className="mb-4 bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800">
                    Seleccione las evidencias que desea incluir en la galería pública. Puede seleccionar o deseleccionar haciendo clic en la casilla de verificación.
                  </AlertDescription>
                </Alert>

                {evidencePreviews.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay evidencias disponibles
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {evidencePreviews.map((preview, index) => {
                      const evidenceId = preview.id;
                      const isSelected = selectedEvidenceIds.includes(evidenceId);

                      return (
                        <div
                          key={evidenceId}
                          className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary-prosalud shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => toggleEvidenceSelection(evidenceId)}
                        >
                          <img
                            src={preview.url}
                            alt={`Evidencia ${index + 1}`}
                            className="w-full h-32 object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isSelected
                                  ? 'bg-primary-prosalud'
                                  : 'bg-white/80'
                              }`}
                            >
                              {isSelected && (
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              )}
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white">
                                Evidencia #{evidenceId}
                              </span>
                              {isSelected && (
                                <Badge variant="secondary" className="text-xs">
                                  Seleccionada
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Información para Publicación */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Información para la Galería Pública
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Título del Evento *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Jornada de Vacunación 2024"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Categoría *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione una categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
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
                    name="is_visible"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-gray-700 cursor-pointer">
                            Visible en galería pública
                          </FormLabel>
                          <p className="text-xs text-gray-500">
                            Si está marcado, el evento será visible en el sitio web público
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción del evento para la galería..."
                          rows={4}
                          maxLength={500}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Botones de Acción */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || isPublishing}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={form.handleSubmit(handleUpdateActivity)}
                disabled={isSubmitting || isPublishing}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(handlePublishToGallery)}
                disabled={isSubmitting || isPublishing || selectedEvidenceIds.length === 0}
                className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Publicar en Galería
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default WellnessActivityReviewDialog;

