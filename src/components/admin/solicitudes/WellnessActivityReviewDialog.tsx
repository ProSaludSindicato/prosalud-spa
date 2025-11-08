import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Info,
  Star,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { 
  wellnessRequestsService, 
  WellnessRequest, 
  WellnessActivityRealized,
  UpdateWellnessActivityRealizedData,
} from '@/services/wellnessRequestsApi';

const reviewSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio').max(255),
  category: z.string().min(1, 'La categoría es obligatoria'),
  description: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional(),
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
  const [evidencePreviews, setEvidencePreviews] = useState<Array<{id?: number; url: string; isSelected: boolean; order?: number}>>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [mainImageId, setMainImageId] = useState<number | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [listadoAsistenciaUrl, setListadoAsistenciaUrl] = useState<string | undefined>(actividadRealizada.listado_asistencia?.file_url);
  const [listadoAsistenciaExpiresAt, setListadoAsistenciaExpiresAt] = useState<string | null | undefined>(actividadRealizada.listado_asistencia?.url_expires_at);

  // Función para verificar si una URL ha expirado
  const isUrlExpired = (urlExpiresAt: string | null | undefined): boolean => {
    if (!urlExpiresAt) return true;
    return new Date(urlExpiresAt) < new Date();
  };

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      title: solicitud.nombreActividad || '',
      category: '',
      description: actividadRealizada.descripcion_realizada || solicitud.descripcionActividad || '',
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
      });

      // Actualizar URL del listado de asistencia
      setListadoAsistenciaUrl(actividadRealizada.listado_asistencia?.file_url);
      setListadoAsistenciaExpiresAt(actividadRealizada.listado_asistencia?.url_expires_at);

      // Cargar evidencias
      if (actividadRealizada.evidencias && actividadRealizada.evidencias.length > 0) {
        // Ordenar por el campo order si existe, de lo contrario mantener el orden original
        const sortedEvidencias = [...actividadRealizada.evidencias].sort((a, b) => {
          const orderA = a.order ?? 999;
          const orderB = b.order ?? 999;
          return orderA - orderB;
        });

        const previews = sortedEvidencias
          .filter(ev => ev.id && ev.image_url) // Solo incluir evidencias con ID y URL válidas
          .map(ev => ({
            id: ev.id!,
            url: ev.image_url!,
            isSelected: ev.is_selected_for_gallery || false,
            order: ev.order ?? 999,
          }));
        setEvidencePreviews(previews);
        const selectedIds = previews
          .filter(p => p.isSelected)
          .map(p => p.id);
        setSelectedEvidenceIds(selectedIds);
        // Establecer la primera evidencia seleccionada como imagen principal por defecto
        if (selectedIds.length > 0) {
          setMainImageId(selectedIds[0]);
        } else if (previews.length > 0) {
          // Si no hay seleccionadas, usar la primera disponible
          setMainImageId(previews[0].id!);
        }
      } else {
        setEvidencePreviews([]);
        setSelectedEvidenceIds([]);
        setMainImageId(null);
      }
    } else {
      // Reset cuando se cierra
      setEvidencePreviews([]);
      setSelectedEvidenceIds([]);
      setMainImageId(null);
      setIsImageViewerOpen(false);
      setSelectedImageIndex(null);
      setListadoAsistenciaUrl(undefined);
      setListadoAsistenciaExpiresAt(undefined);
    }
  }, [open, actividadRealizada, solicitud, form]);

  const toggleEvidenceSelection = (evidenceId: number) => {
    setSelectedEvidenceIds(prev => {
      if (prev.includes(evidenceId)) {
        const newIds = prev.filter(id => id !== evidenceId);
        // Si se deselecciona la imagen principal, elegir la primera disponible
        if (mainImageId === evidenceId) {
          if (newIds.length > 0) {
            setMainImageId(newIds[0]);
          } else {
            setMainImageId(null);
          }
        }
        return newIds;
      } else {
        const newIds = [...prev, evidenceId];
        // Si no hay imagen principal o esta es la primera seleccionada, establecer esta como principal
        if (!mainImageId || prev.length === 0) {
          setMainImageId(evidenceId);
        }
        return newIds;
      }
    });
  };

  const handleSetMainImage = (e: React.MouseEvent, evidenceId: number) => {
    e.stopPropagation();
    if (selectedEvidenceIds.includes(evidenceId)) {
      setMainImageId(evidenceId);
    }
  };

  const handleViewImage = (index: number) => {
    setSelectedImageIndex(index);
    setIsImageViewerOpen(true);
  };

  const handleCloseImageViewer = () => {
    setIsImageViewerOpen(false);
    setSelectedImageIndex(null);
  };

  const handlePreviousImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const handleNextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < evidencePreviews.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  // Función para obtener ubicaciones como array
  const getUbicacionesArray = (ubicacion: string | undefined): string[] => {
    if (!ubicacion) return [];
    return ubicacion.split(',').map(u => u.trim()).filter(u => u.length > 0);
  };

  // Función para verificar si un archivo puede ser embebido
  const canEmbedFile = (fileName: string | undefined): boolean => {
    if (!fileName) return false;
    const lowerName = fileName.toLowerCase();
    // PDFs y archivos de Office pueden ser embebidos
    return lowerName.endsWith('.pdf') || 
           lowerName.endsWith('.xls') || 
           lowerName.endsWith('.xlsx') ||
           lowerName.endsWith('.doc') ||
           lowerName.endsWith('.docx');
  };

  // Funciones para drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newPreviews = [...evidencePreviews];
    const draggedItem = newPreviews[draggedIndex];
    
    // Remover el elemento arrastrado
    newPreviews.splice(draggedIndex, 1);
    
    // Insertar en la nueva posición
    newPreviews.splice(dropIndex, 0, draggedItem);
    
    // Actualizar el orden
    const updatedPreviews = newPreviews.map((preview, index) => ({
      ...preview,
      order: index,
    }));
    
    setEvidencePreviews(updatedPreviews);
    
    // Actualizar selectedEvidenceIds para mantener el mismo orden
    const updatedSelectedIds = updatedPreviews
      .filter(p => selectedEvidenceIds.includes(p.id!))
      .map(p => p.id!);
    setSelectedEvidenceIds(updatedSelectedIds);
    
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleKeepHidden = async (data: ReviewFormValues) => {
    if (!actividadRealizada) return;

    setIsSubmitting(true);
    try {
      // Actualizar la actividad con las evidencias seleccionadas y su orden
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

      toast.success('Información guardada exitosamente', {
        description: 'La actividad se mantendrá oculta. Los cambios han sido guardados.',
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      logger.error('Error al actualizar actividad de bienestar', error?.message || error);
      toast.error('Error al guardar', {
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
      // Construir el objeto de orden de evidencias basado en el orden actual
      // Solo incluir las evidencias seleccionadas, manteniendo su orden en evidencePreviews
      const evidenciasOrden: Record<string, number> = {};
      let orderIndex = 1;
      
      // Iterar sobre evidencePreviews para mantener el orden establecido por el usuario
      evidencePreviews.forEach((preview) => {
        if (selectedEvidenceIds.includes(preview.id!)) {
          evidenciasOrden[preview.id!.toString()] = orderIndex;
          orderIndex++;
        }
      });

      // Construir el payload para publicar en la galería
      const publishPayload: any = {
        title: data.title,
        category: data.category,
        description: data.description,
        is_visible: true,
        evidencias_orden: evidenciasOrden,
      };
      
      // Agregar imagen principal si está disponible
      if (mainImageId && selectedEvidenceIds.includes(mainImageId)) {
        publishPayload.imagen_principal_id = mainImageId;
      }

      await wellnessRequestsService.publishActivityToGallery(
        solicitud.id,
        selectedEvidenceIds,
        publishPayload,
      );

      toast.success('Publicado en galería exitosamente', {
        description: 'La actividad ha sido publicada en la galería pública.',
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      logger.error('Error al publicar actividad en galería', error?.message || error);
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
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Información de la Actividad
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha Realizada</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {actividadRealizada.fecha_realizada 
                        ? new Date(actividadRealizada.fecha_realizada).toLocaleDateString('es-ES')
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Centro de Costos</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {solicitud.centroCostos || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Ubicación Real</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {getUbicacionesArray(actividadRealizada.ubicacion_real).length > 0 ? (
                        getUbicacionesArray(actividadRealizada.ubicacion_real).map((ubicacion, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {ubicacion}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">N/A</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Número de Asistentes</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {actividadRealizada.numero_asistentes_real || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
                  <div className="space-y-4">
                    {/* Documento embebido cuando sea posible */}
                    {listadoAsistenciaUrl && 
                     !isUrlExpired(listadoAsistenciaExpiresAt) &&
                     canEmbedFile(actividadRealizada.listado_asistencia.original_name) ? (
                      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
                        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-700">
                            {actividadRealizada.listado_asistencia.original_name || 'Listado de asistencia'}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(listadoAsistenciaUrl, '_blank')}
                            className="h-7 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Abrir en nueva pestaña
                          </Button>
                        </div>
                        <div className="w-full" style={{ height: '600px' }}>
                          <iframe
                            src={listadoAsistenciaUrl}
                            className="w-full h-full"
                            title="Vista previa del listado de asistencia"
                          />
                        </div>
                      </div>
                    ) : listadoAsistenciaUrl && 
                        !isUrlExpired(listadoAsistenciaExpiresAt) &&
                        !canEmbedFile(actividadRealizada.listado_asistencia.original_name) ? (
                      // Si la URL está disponible pero no se puede embebido, solo mostrar botón
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Nombre del archivo</p>
                            <p className="text-sm text-gray-900 bg-white border border-gray-200 rounded px-3 py-2 font-medium">
                              {actividadRealizada.listado_asistencia.original_name || 'Listado de asistencia'}
                            </p>
                          </div>
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => window.open(listadoAsistenciaUrl, '_blank')}
                              className="w-full sm:w-auto"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Abrir archivo completo en nueva pestaña
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Si la URL ha expirado o no está disponible
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Nombre del archivo</p>
                            <p className="text-sm text-gray-900 bg-white border border-gray-200 rounded px-3 py-2 font-medium">
                              {actividadRealizada.listado_asistencia.original_name || 'Listado de asistencia'}
                            </p>
                          </div>
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  // Recargar la actividad para obtener nueva URL
                                  const refreshed = await wellnessRequestsService.getWellnessActivityRealized(solicitud.id);
                                  if (refreshed.listado_asistencia?.file_url) {
                                    // Actualizar el estado local con la nueva URL
                                    setListadoAsistenciaUrl(refreshed.listado_asistencia.file_url);
                                    setListadoAsistenciaExpiresAt(refreshed.listado_asistencia.url_expires_at);
                                    
                                    // Si no puede ser embebido, abrir en nueva pestaña
                                    if (!canEmbedFile(refreshed.listado_asistencia.original_name)) {
                                      window.open(refreshed.listado_asistencia.file_url, '_blank');
                                    }
                                  }
                                } catch (error) {
                                  toast.error('Error al cargar archivo', {
                                    description: 'No se pudo obtener el listado de asistencia.',
                                  });
                                }
                              }}
                              className="w-full sm:w-auto"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {listadoAsistenciaExpiresAt ? 'Recargar y abrir archivo' : 'Cargar y abrir archivo'}
                            </Button>
                            {listadoAsistenciaExpiresAt && 
                             isUrlExpired(listadoAsistenciaExpiresAt) && (
                              <p className="text-xs text-amber-600 mt-2">
                                La URL ha expirado. Haga clic en "Recargar" para obtener una nueva.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
                    Seleccione las evidencias que desea incluir en la galería pública. Puede seleccionar o deseleccionar haciendo clic en la imagen. Use la estrella para marcar la imagen principal del evento.
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
                      const isMain = mainImageId === evidenceId && isSelected;
                      const isDragging = draggedIndex === index;

                      return (
                        <div
                          key={evidenceId}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(index)}
                          onDragEnd={handleDragEnd}
                          className={`relative border-2 rounded-lg overflow-hidden cursor-move transition-all group ${
                            isSelected
                              ? 'border-primary-prosalud shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${isDragging ? 'opacity-50' : ''}`}
                          onClick={() => toggleEvidenceSelection(evidenceId)}
                        >
                          {/* Indicador de drag */}
                          <div className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-4 w-4 text-white/80 drop-shadow-lg" />
                          </div>
                          
                          <img
                            src={preview.url}
                            alt={`Evidencia ${index + 1}`}
                            className="w-full h-32 object-cover"
                          />
                          {/* Overlay con acciones al hover */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={isMain ? "default" : "outline"}
                              onClick={(e) => handleSetMainImage(e, evidenceId)}
                              disabled={!isSelected}
                              className={`h-7 w-7 p-0 ${
                                isMain 
                                  ? "bg-yellow-500 hover:bg-yellow-600 text-white" 
                                  : "bg-white/90 hover:bg-white border-gray-300"
                              }`}
                              title={isMain ? "Imagen principal" : "Marcar como imagen principal"}
                            >
                              <Star className={`h-3 w-3 ${
                                isMain 
                                  ? "fill-current text-white" 
                                  : "text-gray-700 fill-gray-700"
                              }`} />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewImage(index);
                              }}
                              className="h-7 w-7 p-0 bg-white/90 hover:bg-white"
                              title="Ver en pantalla completa"
                            >
                              <Maximize2 className="h-3 w-3 text-gray-700" />
                            </Button>
                          </div>
                          {/* Indicador de selección */}
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
                          {/* Badge de imagen principal */}
                          {isMain && (
                            <div className="absolute top-2 left-8 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Star className="h-3 w-3 fill-current" />
                              Principal
                            </div>
                          )}
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
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Información para la Galería Pública
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                onClick={form.handleSubmit(handleKeepHidden)}
                disabled={isSubmitting || isPublishing}
                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Mantener Oculto
                  </>
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

        {/* Diálogo de Visualización de Imágenes en Pantalla Completa */}
        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent className="max-w-7xl max-h-[95vh] p-0 bg-black/95 border-none [&>button]:hidden">
            <DialogTitle className="sr-only">
              Visualización de Evidencia {selectedImageIndex !== null ? selectedImageIndex + 1 : ''}
            </DialogTitle>
            {selectedImageIndex !== null && evidencePreviews[selectedImageIndex] && (
              <div className="relative w-full h-[95vh] flex items-center justify-center">
                <img
                  src={evidencePreviews[selectedImageIndex].url}
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
                {selectedImageIndex < evidencePreviews.length - 1 && (
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

                {/* Información de la imagen */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
                  Imagen {selectedImageIndex + 1} de {evidencePreviews.length}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default WellnessActivityReviewDialog;

