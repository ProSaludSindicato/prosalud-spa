import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, X, Plus, Star, Image as ImageIcon, MapPin, Loader2, FileText, Download, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { wellnessEventsApi, CreateWellnessEventData, UpdateWellnessEventData } from "@/services/wellnessEventsApi";
import { BienestarEvent, CreateBienestarEventData } from "@/types/admin";
import { logger } from "@/utils/logger";
import { optimizeImages, isImageFile } from "@/utils/imageOptimizer";
import { useSanitizedInput } from "@/hooks/useSanitizedInput";

const formSchema = z.object({
  title: z.string().min(1, "El título es obligatorio").max(255, "El título no puede exceder 255 caracteres").trim(),
  date: z
    .string()
    .min(1, "La fecha es obligatoria")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no tiene un formato válido"),
  category: z
    .string()
    .min(1, "La categoría es obligatoria")
    .max(255, "La categoría no puede exceder 255 caracteres")
    .trim(),
  description: z.string().optional(),
  location: z
    .string()
    .min(1, "La ubicación es obligatoria")
    .max(255, "La ubicación no puede exceder 255 caracteres")
    .trim(),
  attendees: z
    .number()
    .int("El número de asistentes debe ser un número entero")
    .refine((val) => val === undefined || val >= 0, {
      message: "El número de asistentes no puede ser negativo",
    })
    .optional(),
  gift: z.string().max(255, "El obsequio no puede exceder 255 caracteres").optional(),
  provider: z
    .string()
    .max(255, "El proveedor no puede exceder 255 caracteres")
    .optional(),
});

type FormData = z.infer<typeof formSchema>;

interface BienestarEventFormProps {
  event?: BienestarEvent | null;
  onClose: () => void;
}

const BienestarEventForm: React.FC<BienestarEventFormProps> = ({ event, onClose }) => {
  const [images, setImages] = useState<File[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [listadoAsistencia, setListadoAsistencia] = useState<File | null>(null);
  const [listadoAsistenciaError, setListadoAsistenciaError] = useState<string>('');
  const [eliminarListadoAsistencia, setEliminarListadoAsistencia] = useState(false);
  const queryClient = useQueryClient();
  // Security: Use centralized sanitization hook
  const { sanitizeText, sanitizeGeneral } = useSanitizedInput();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      date: "",
      category: "",
      description: "",
      location: "",
      attendees: undefined,
      gift: "",
      provider: "ProSalud",
    },
  });

  useEffect(() => {
    if (event) {
      // Convertir la fecha al formato YYYY-MM-DD para el input type="date"
      let formattedDate = "";
      if (event.date) {
        try {
          const dateObj = new Date(event.date);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toISOString().split('T')[0];
          }
        } catch (e) {
          // Si falla la conversión, intentar usar la fecha directamente si ya está en formato YYYY-MM-DD
          formattedDate = event.date;
        }
      }
      
      // Actualizar los valores del formulario cuando cambia el evento
      form.reset({
        title: event.title || "",
        date: formattedDate,
        category: event.category || "",
        description: event.description || "",
        location: event.location || "",
        attendees: event.attendees || undefined,
        gift: event.gift || "",
        provider: event.provider || "ProSalud",
      });

      // Cargar las imágenes existentes
      if (event.images && event.images.length > 0) {
        const previews = event.images.map((img) => img.url);
        setImagePreviews(previews);
        const mainIndex = event.images.findIndex((img) => img.isMain);
        setMainImageIndex(mainIndex >= 0 ? mainIndex : 0);
      }
      
      // Resetear el listado de asistencia al editar
      setListadoAsistencia(null);
      setListadoAsistenciaError('');
      setEliminarListadoAsistencia(false);
    } else {
      // Resetear al crear nuevo evento
      setListadoAsistencia(null);
      setListadoAsistenciaError('');
      setEliminarListadoAsistencia(false);
    }
  }, [event, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateWellnessEventData) => wellnessEventsApi.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bienestar-events"] });
      toast.success("Evento creado", {
        description: "El evento de bienestar ha sido creado exitosamente.",
      });
      onClose();
    },
    onError: (error: any) => {
      logger.error("Error al crear evento de bienestar", error?.message || error);

      // Manejar errores de validación (422)
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = Object.entries(errors)
          .map(([field, messages]: [string, any]) => `${field}: ${messages.join(", ")}`)
          .join("\n");

        toast.error("Error de validación", {
          description: errorMessages || error.response?.data?.message,
        });
      } else if (error.response?.status === 404) {
        toast.error("Endpoint no encontrado", {
          description: "La ruta del API no existe. Verifica la configuración del backend.",
        });
      } else if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        toast.error("Error de conexión", {
          description: "No se pudo conectar con el servidor. Verifica tu conexión o la configuración del backend.",
        });
      } else {
        toast.error("Error al crear evento", {
          description:
            error.response?.data?.message ||
            error.message ||
            "No se pudo crear el evento. Verifica los datos e inténtalo de nuevo.",
        });
      }
    },
    onSettled: () => {
      logger.debug("Mutación de creación de evento finalizada");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateWellnessEventData) => wellnessEventsApi.updateEvent(event!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bienestar-events"] });
      toast.success("Evento actualizado", {
        description: "El evento de bienestar ha sido actualizado exitosamente.",
      });
      onClose();
    },
    onError: (error: any) => {
      logger.error("Error al actualizar evento de bienestar", error?.message || error);

      // Manejar errores de validación (422)
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = Object.entries(errors)
          .map(([field, messages]: [string, any]) => `${field}: ${messages.join(", ")}`)
          .join("\n");

        toast.error("Error de validación", {
          description: errorMessages || error.response?.data?.message,
        });
      } else if (error.response?.status === 404) {
        toast.error("Evento no encontrado", {
          description: "El evento que intentas actualizar no existe.",
        });
      } else if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        toast.error("Error de conexión", {
          description: "No se pudo conectar con el servidor. Verifica tu conexión o la configuración del backend.",
        });
      } else {
        toast.error("Error al actualizar evento", {
          description:
            error.response?.data?.message ||
            error.message ||
            "No se pudo actualizar el evento. Verifica los datos e inténtalo de nuevo.",
        });
      }
    },
    onSettled: () => {
      logger.debug("Mutación de actualización de evento finalizada");
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (images.length + files.length > 20) {
      toast.error("Límite excedido", {
        description: "Máximo 20 imágenes permitidas.",
      });
      return;
    }

    // Validar cada archivo según las reglas del backend
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp"];
    for (const file of files) {
      if (!file || !(file instanceof File)) {
        toast.error("Archivo inválido", {
          description: "Cada elemento debe ser un archivo válido.",
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Archivo inválido", {
          description: "Cada archivo debe ser una imagen válida.",
        });
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error("Formato no válido", {
          description: "Las imágenes deben ser de tipo: jpeg, png, jpg, gif, webp.",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Archivo muy grande", {
          description: `Cada imagen no puede exceder 5MB. ${file.name} es muy grande.`,
        });
        return;
      }
    }

    // Optimizar imágenes antes de agregarlas
    setIsOptimizing(true);
    try {
      const optimizedFiles = await optimizeImages(files);

      setImages((prev) => [...prev, ...optimizedFiles]);

      // Crear previews de las imágenes optimizadas
      optimizedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviews((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });

      // Notificar optimización
      const imageCount = files.filter(f => isImageFile(f)).length;
      if (imageCount > 0) {
        toast.success("Imágenes optimizadas", {
          description: `${imageCount} imagen(es) optimizada(s) exitosamente.`,
          duration: 2000,
        });
      }
    } catch (error) {
      logger.error("Error al optimizar imágenes:", error);
      toast.error("Error al optimizar imágenes", {
        description: "Se usarán las imágenes sin optimizar.",
        duration: 3000,
      });
      // Si falla la optimización, usar las imágenes originales
      setImages((prev) => [...prev, ...files]);
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviews((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    if (mainImageIndex === index) {
      setMainImageIndex(0);
    } else if (mainImageIndex > index) {
      setMainImageIndex((prev) => prev - 1);
    }
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

    if (file.size > 4 * 1024 * 1024) {
      const errorMsg = 'El archivo no puede exceder 4MB.';
      setListadoAsistenciaError(errorMsg);
      toast.error('Archivo muy grande', {
        description: errorMsg,
      });
      return;
    }

    setListadoAsistencia(file);
    setListadoAsistenciaError('');
    // Si se sube un nuevo archivo, cancelar la eliminación del existente
    setEliminarListadoAsistencia(false);
  };

  const removeListadoAsistencia = () => {
    setListadoAsistencia(null);
    setListadoAsistenciaError('');
    // Si hay un listado existente en el evento, marcar para eliminarlo
    if (event?.attendanceListPath || event?.attendanceList) {
      setEliminarListadoAsistencia(true);
    }
  };

  const onSubmit = (data: FormData) => {
    if (!event && images.length === 0) {
      toast.error("Imágenes requeridas", {
        description: "Debes subir al menos una imagen.",
      });
      return;
    }

    if (event) {
      // Actualización de evento existente
      // Asegurarse de que todos los campos requeridos se envíen siempre
      // Usar los valores del formulario (que siempre tienen valores por defecto del evento)
      const updateData: UpdateWellnessEventData = {
        // Campos requeridos - SIEMPRE enviar (el formulario siempre tiene estos valores)
        title: data.title,
        date: data.date,
        category: data.category,
        location: data.location,
        // Campos opcionales - enviar si están definidos
        description: data.description !== undefined ? data.description : (event.description !== undefined ? event.description : undefined),
        attendees: data.attendees !== undefined ? data.attendees : (event.attendees !== undefined ? event.attendees : undefined),
        gift: data.gift !== undefined ? data.gift : (event.gift !== undefined ? event.gift : undefined),
        provider: data.provider || event.provider || "ProSalud",
        is_visible: event.isVisible !== undefined ? event.isVisible : true,
        // Archivos - solo enviar si hay nuevos
        images: images.length > 0 ? images : undefined,
        attendance_list: listadoAsistencia || undefined,
        eliminar_attendance_list: eliminarListadoAsistencia && !listadoAsistencia ? true : undefined,
      };
      
      logger.debug("Enviando datos para actualizar evento", {
        eventId: event.id,
        formData: data,
        updateData: {
          title: updateData.title,
          date: updateData.date,
          category: updateData.category,
          location: updateData.location,
          description: updateData.description,
          attendees: updateData.attendees,
          gift: updateData.gift,
          provider: updateData.provider,
          is_visible: updateData.is_visible,
          tieneNuevasImagenes: images.length > 0,
          tieneListadoAsistencia: !!listadoAsistencia,
          eliminarListadoAsistencia: updateData.eliminar_attendance_list,
        },
        allKeys: Object.keys(updateData),
      });
      
      updateMutation.mutate(updateData);
    } else {
      // Creación de nuevo evento
      const createData: CreateWellnessEventData = {
        title: data.title,
        date: data.date,
        category: data.category,
        location: data.location || "",
        description: data.description,
        attendees: data.attendees,
        gift: data.gift,
        is_visible: true, // Boolean, not string
        images,
        attendance_list: listadoAsistencia || undefined,
      };
      createMutation.mutate(createData);
    }
  };

  const categories = ["Salud", "Bienestar", "Capacitación", "Recreación", "Cultura", "Deporte"];

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-0 bg-white">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-slate-800">
              {event ? "Editar Evento" : "Nuevo Evento"} de Bienestar
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {event ? "Modifica los detalles del evento" : "Crea un nuevo evento para bienestar"}
            </DialogDescription>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna izquierda */}
            <div className="space-y-6">
              {/* Información Básica */}
              <Card className="border shadow-sm bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Star className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Información Básica</CardTitle>
                      <CardDescription>Datos principales del evento</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Título del Evento *
                    </Label>
                    <Input
                      id="title"
                      value={form.watch('title') || ''}
                      className="h-10"
                      placeholder="Ej: Jornada de Vacunación 2024"
                      onChange={(e) => {
                        // Security: Sanitize title input (allows spaces)
                        const sanitized = sanitizeText(e.target.value, { maxLength: 255, allowSpaces: true });
                        form.setValue('title', sanitized, { shouldValidate: true });
                      }}
                    />
                    {form.formState.errors.title && (
                      <p className="text-destructive text-sm">{form.formState.errors.title.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-sm font-medium">
                        Fecha *
                      </Label>
                      <Input id="date" type="date" {...form.register("date")} className="h-10" />
                      {form.formState.errors.date && (
                        <p className="text-destructive text-sm">{form.formState.errors.date.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-sm font-medium">
                        Categoría *
                      </Label>
                      <select
                        id="category"
                        {...form.register("category")}
                        className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Seleccionar</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      {form.formState.errors.category && (
                        <p className="text-destructive text-sm">{form.formState.errors.category.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Descripción
                    </Label>
                    <Textarea
                      id="description"
                      value={form.watch('description') || ''}
                      rows={3}
                      className="resize-none text-sm"
                      placeholder="Describe los detalles del evento..."
                      onChange={(e) => {
                        // Security: Sanitize description input (allows spaces)
                        const sanitized = sanitizeGeneral(e.target.value, { maxLength: 1000 });
                        form.setValue('description', sanitized, { shouldValidate: true });
                      }}
                    />
                    {form.formState.errors.description && (
                      <p className="text-destructive text-sm">{form.formState.errors.description.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Detalles Adicionales */}
              <Card className="border shadow-sm bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Detalles Adicionales</CardTitle>
                      <CardDescription>Información complementaria</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium">
                      Ubicación *
                    </Label>
                    <Input
                      id="location"
                      value={form.watch('location') || ''}
                      className="h-10"
                      placeholder="Ej: Sede Principal"
                      onChange={(e) => {
                        // Security: Sanitize location input (allows spaces)
                        const sanitized = sanitizeText(e.target.value, { maxLength: 255, allowSpaces: true });
                        form.setValue('location', sanitized, { shouldValidate: true });
                      }}
                    />
                    {form.formState.errors.location && (
                      <p className="text-destructive text-sm">{form.formState.errors.location.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="attendees" className="text-sm font-medium">
                        Asistentes
                      </Label>
                      <Input
                        id="attendees"
                        type="number"
                        max="10000"
                        {...form.register("attendees", { 
                          valueAsNumber: true,
                          setValueAs: (value: string) => {
                            if (value === '') return undefined;
                            const num = parseInt(value, 10);
                            return isNaN(num) ? undefined : num;
                          }
                        })}
                        className="h-10"
                        placeholder="150"
                        value={form.watch("attendees") ?? ''}
                      />
                      {form.formState.errors.attendees && (
                        <p className="text-destructive text-sm">{form.formState.errors.attendees.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="provider" className="text-sm font-medium">
                        Organizador
                      </Label>
                      <Input 
                        id="provider" 
                        value={form.watch('provider') || ''}
                        placeholder="ProSalud" 
                        className="h-10"
                        onChange={(e) => {
                          // Security: Sanitize provider input (allows spaces)
                          const sanitized = sanitizeText(e.target.value, { maxLength: 255, allowSpaces: true });
                          form.setValue('provider', sanitized, { shouldValidate: true });
                        }}
                      />
                      {form.formState.errors.provider && (
                        <p className="text-destructive text-sm">{form.formState.errors.provider.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gift" className="text-sm font-medium">
                      Obsequio
                    </Label>
                    <Input 
                      id="gift" 
                      value={form.watch('gift') || ''}
                      className="h-10" 
                      placeholder="Ej: Kit de bienestar"
                      onChange={(e) => {
                        // Security: Sanitize gift input (allows spaces)
                        const sanitized = sanitizeText(e.target.value, { maxLength: 255, allowSpaces: true });
                        form.setValue('gift', sanitized, { shouldValidate: true });
                      }}
                    />
                    {form.formState.errors.gift && (
                      <p className="text-destructive text-sm">{form.formState.errors.gift.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Columna derecha */}
            <div className="space-y-6">
              {/* Listado de Asistencia */}
              <Card className="border shadow-sm bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Listado de Asistencia</CardTitle>
                      <CardDescription>Archivo opcional con el listado de asistencia</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {listadoAsistenciaError && (
                      <Alert className="bg-red-50 border-red-200">
                        <AlertDescription className="text-sm text-red-800">
                          {listadoAsistenciaError}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Mostrar listado existente si hay uno y no se ha subido uno nuevo */}
                    {event && (event.attendanceListPath || event.attendanceList) && !listadoAsistencia && !eliminarListadoAsistencia && (
                      <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="h-8 w-8 text-green-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">Listado de asistencia existente</p>
                              <p className="text-xs text-gray-500">
                                {event.attendanceListPath ? 'Archivo guardado' : 'URL disponible'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {event.attendanceList?.fileUrl && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  window.open(event.attendanceList?.fileUrl, '_blank');
                                }}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Ver/Descargar listado de asistencia"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeListadoAsistencia}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar listado de asistencia"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {listadoAsistencia ? (
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
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
                            onClick={() => {
                              setListadoAsistencia(null);
                              setListadoAsistenciaError('');
                              // Si había uno existente, restaurar el estado
                              if (event?.attendanceListPath || event?.attendanceList) {
                                setEliminarListadoAsistencia(false);
                              }
                            }}
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
                          accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                          onChange={handleListadoAsistenciaUpload}
                          className="hidden"
                          id="listado-asistencia-upload"
                        />
                        <label htmlFor="listado-asistencia-upload" className="cursor-pointer">
                          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm font-medium text-gray-600 mb-1">Seleccionar listado de asistencia</p>
                          <p className="text-xs text-gray-500">PDF o Excel (.pdf, .xls, .xlsx) - máx. 4MB</p>
                        </label>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Imágenes */}
              <Card className="border shadow-sm bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Imágenes del Evento</CardTitle>
                      <CardDescription>Sube hasta 20 imágenes (máx. 5MB cada una)</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {!imagePreviews.length ? (
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
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                          disabled={isOptimizing}
                        />
                        <label htmlFor="image-upload" className={`cursor-pointer ${isOptimizing ? 'pointer-events-none opacity-50' : ''}`}>
                          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-lg font-medium text-gray-600 mb-1">Seleccionar imágenes</p>
                          <p className="text-sm text-gray-500">JPG, PNG o WebP</p>
                        </label>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={mainImageIndex === index ? "default" : "outline"}
                                  onClick={() => setMainImageIndex(index)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Star className={`h-3 w-3 ${mainImageIndex === index ? "fill-current" : ""}`} />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeImage(index)}
                                  className="h-7 w-7 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              {mainImageIndex === index && (
                                <div className="absolute top-1 left-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded">
                                  Principal
                                </div>
                              )}
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
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload-more"
                            disabled={isOptimizing}
                          />
                          <label htmlFor="image-upload-more" className={`cursor-pointer ${isOptimizing ? 'pointer-events-none opacity-50' : ''}`}>
                            <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Agregar más imágenes</p>
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Botones de acción */}
              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="h-12 bg-primary-prosalud hover:bg-primary-prosalud-dark"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Guardando..."
                    : event
                      ? "Actualizar Evento"
                      : "Crear Evento"}
                </Button>
                <Button type="button" variant="outline" onClick={onClose} className="h-12">
                  Cancelar
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BienestarEventForm;