
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, X, Calendar, Link as LinkIcon, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { comfenalcoApi } from '@/services/adminApi';
import type { ComfenalcoEvent as AdminComfenalcoEvent } from '@/types/admin';
import { CreateComfenalcoEventData, UpdateComfenalcoEventData } from '@/types/comfenalco';
import { baseNameValidation, baseTextValidation, baseUrlValidation, baseCategoryValidation } from '@/hooks/useFormValidation';
import { optimizeImage, isImageFile } from '@/utils/imageOptimizer';

const formSchema = z.object({
  title: baseNameValidation.min(5, 'El título debe tener al menos 5 caracteres'),
  registrationLink: baseUrlValidation,
  category: baseCategoryValidation,
  displaySize: z.enum(['carousel', 'mosaic']),
  description: baseTextValidation.optional(),
  registrationDeadline: z.string().optional(),
  eventDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ComfenalcoEventFormProps {
  event?: AdminComfenalcoEvent | null;
  onClose: () => void;
}

const ComfenalcoEventForm: React.FC<ComfenalcoEventFormProps> = ({ event, onClose }) => {
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: event?.title || '',
      registrationLink: event?.registrationLink || '',
      category: event?.category || '',
      displaySize: event?.displaySize || 'carousel',
      description: event?.description || '',
      registrationDeadline: event?.registrationDeadline || '',
      eventDate: event?.eventDate || '',
    }
  });

  useEffect(() => {
    if (event && event.bannerImage) {
      setImagePreview(event.bannerImage);
    }
  }, [event]);

  const createMutation = useMutation({
    mutationFn: comfenalcoApi.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comfenalco-events'] });
      toast({
        title: "Experiencia creada",
        description: "La experiencia de Comfenalco ha sido creada exitosamente."
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la experiencia. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateComfenalcoEventData) => 
      comfenalcoApi.updateEvent(typeof event!.id === 'string' ? Number(event!.id) : event!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comfenalco-events'] });
      toast({
        title: "Experiencia actualizada",
        description: "La experiencia de Comfenalco ha sido actualizada exitosamente."
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la experiencia. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamaño del archivo
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Archivo muy grande",
          description: "La imagen debe ser menor a 5MB.",
          variant: "destructive"
        });
        return;
      }

      // Validar tipo de archivo
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({
          title: "Formato no válido",
          description: "Solo se permiten archivos JPG, PNG o WebP.",
          variant: "destructive"
        });
        return;
      }

      // Optimizar imagen si es una imagen válida
      if (isImageFile(file)) {
        setIsOptimizing(true);
        try {
          const optimizedFile = await optimizeImage(file);
          setBannerImage(optimizedFile);
          
          // Crear preview local con la imagen optimizada
          const reader = new FileReader();
          reader.onload = (e) => {
            setImagePreview(e.target?.result as string);
          };
          reader.readAsDataURL(optimizedFile);

          toast({
            title: "Imagen optimizada",
            description: "La imagen ha sido optimizada exitosamente.",
            duration: 2000,
          });
        } catch (error) {
          console.error('Error al optimizar imagen:', error);
          toast({
            title: "Error al optimizar imagen",
            description: "Se usará la imagen sin optimizar.",
            variant: "destructive",
            duration: 3000,
          });
          // Si falla la optimización, usar la imagen original
          setBannerImage(file);
          const reader = new FileReader();
          reader.onload = (e) => {
            setImagePreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        } finally {
          setIsOptimizing(false);
        }
      } else {
        // Si no es imagen, usar directamente
        setBannerImage(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeImage = () => {
    setBannerImage(null);
    setImagePreview('');
  };

  const onSubmit = async (data: FormData) => {
    if (!event && !bannerImage && !imagePreview) {
      toast({
        title: "Imagen requerida",
        description: "Debes subir una imagen banner.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (event) {
        // Para actualización, usar UpdateComfenalcoEventData (snake_case)
        const updateData: UpdateComfenalcoEventData & { banner_image?: File } = {
          title: data.title.trim(),
          category: data.category.trim(),
          description: data.description?.trim() || undefined,
          display_size: data.displaySize,
          event_date: data.eventDate || undefined,
          registration_deadline: data.registrationDeadline || undefined,
          registration_link: data.registrationLink.trim(),
        };
        
        // Si hay una nueva imagen, incluirla
        if (bannerImage) {
          updateData.banner_image = bannerImage;
        }
        
        updateMutation.mutate(updateData);
      } else {
        // Para creación, usar CreateComfenalcoEventData (snake_case, banner_image requerido)
        if (!bannerImage) {
          toast({
            title: "Imagen requerida",
            description: "Debes subir una imagen banner para crear el evento.",
            variant: "destructive"
          });
          return;
        }
        
        const createData: CreateComfenalcoEventData = {
          title: data.title.trim(),
          banner_image: bannerImage,
          category: data.category.trim(),
          description: data.description?.trim() || undefined,
          display_size: data.displaySize,
          event_date: data.eventDate || undefined,
          registration_deadline: data.registrationDeadline || undefined,
          registration_link: data.registrationLink.trim(),
        };
        
        createMutation.mutate(createData);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar la solicitud. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  const categories = ['curso', 'experiencia', 'beneficio', 'regalo', 'recreacion'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header mejorado */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                variant="ghost"
                onClick={onClose}
                className="rounded-full h-12 w-12"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-orange-600">
                  {event ? 'Editar Experiencia' : 'Nueva Experiencia'} Comfenalco
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  {event ? 'Modifica los detalles de la experiencia' : 'Crea una nueva experiencia para Comfenalco'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información Básica */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-orange-600" />
                </div>
                <CardTitle className="text-2xl">Información Básica</CardTitle>
                <CardDescription>Datos principales de la experiencia Comfenalco</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold">
                    Título de la Experiencia *
                  </Label>
                  <Input
                    id="title"
                    {...form.register('title')}
                    className="h-12"
                    placeholder="Ej: Curso de Cocina Internacional"
                  />
                  {form.formState.errors.title && (
                    <p className="text-destructive text-sm">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">
                    Descripción
                  </Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    rows={4}
                    className="resize-none"
                    placeholder="Describe la experiencia que ofrece Comfenalco..."
                  />
                  {form.formState.errors.description && (
                    <p className="text-destructive text-sm">{form.formState.errors.description.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-semibold">
                      Categoría *
                    </Label>
                    <select
                      id="category"
                      {...form.register('category')}
                      className="w-full h-12 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Seleccionar categoría</option>
                      {categories.map(category => (
                        <option key={category} value={category} className="capitalize">
                          {category}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.category && (
                      <p className="text-destructive text-sm">{form.formState.errors.category.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displaySize" className="text-sm font-semibold">
                      Tamaño de Visualización *
                    </Label>
                    <select
                      id="displaySize"
                      {...form.register('displaySize')}
                      className="w-full h-12 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="carousel">Carrusel</option>
                      <option value="mosaic">Mosaico</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fechas y Enlaces */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <LinkIcon className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Fechas y Enlaces</CardTitle>
                <CardDescription>Información de fechas y enlaces relacionados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="registrationDeadline" className="text-sm font-semibold">
                      Fecha Límite de Registro
                    </Label>
                    <Input
                      id="registrationDeadline"
                      type="date"
                      {...form.register('registrationDeadline')}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eventDate" className="text-sm font-semibold">
                      Fecha del Evento
                    </Label>
                    <Input
                      id="eventDate"
                      type="date"
                      {...form.register('eventDate')}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrationLink" className="text-sm font-semibold">
                    Enlace de Registro *
                  </Label>
                  <Input
                    id="registrationLink"
                    type="url"
                    {...form.register('registrationLink')}
                    placeholder="https://comfenalco.com/registro"
                    className="h-12"
                  />
                  {form.formState.errors.registrationLink && (
                    <p className="text-destructive text-sm">{form.formState.errors.registrationLink.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Banner Image */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="h-8 w-8 text-teal-600" />
                </div>
                <CardTitle className="text-2xl">Imagen Banner</CardTitle>
                <CardDescription>Sube la imagen principal de la experiencia (máximo 5MB)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!imagePreview ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-gray-400 transition-colors relative">
                      {isOptimizing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl z-10">
                          <div className="flex items-center gap-2 text-sm text-orange-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Optimizando imagen...</span>
                          </div>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="banner-upload"
                        disabled={isOptimizing}
                      />
                      <label htmlFor="banner-upload" className={`cursor-pointer ${isOptimizing ? 'pointer-events-none opacity-50' : ''}`}>
                        <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-xl font-medium text-gray-600 mb-2">Seleccionar imagen banner</p>
                        <p className="text-sm text-gray-500">JPG, PNG o WebP hasta 5MB</p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-64 object-cover rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={removeImage}
                        className="absolute top-4 right-4"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
                        {bannerImage ? 'Nueva imagen seleccionada' : 'Imagen actual'}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="h-12 px-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="h-12 px-8 bg-orange-500 hover:bg-orange-600"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Guardando...'
                  : event ? 'Actualizar Experiencia' : 'Crear Experiencia'
                }
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default ComfenalcoEventForm;
