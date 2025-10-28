import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, X, Plus, Star, Image as ImageIcon, MapPin, Users, Gift } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { wellnessEventsApi, CreateWellnessEventData, UpdateWellnessEventData } from "@/services/wellnessEventsApi";
import { BienestarEvent, CreateBienestarEventData } from "@/types/admin";
import {
  baseNameValidation,
  baseTextValidation,
  baseCategoryValidation,
  numberValidation,
} from "@/hooks/useFormValidation";

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
    .min(0, "El número de asistentes no puede ser negativo")
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
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: event?.title || "",
      date: event?.date || "",
      category: event?.category || "",
      description: event?.description || "",
      location: event?.location || "",
      attendees: event?.attendees || undefined,
      gift: event?.gift || "",
      provider: event?.provider || "ProSalud",
    },
  });

  useEffect(() => {
    if (event && event.images.length > 0) {
      const previews = event.images.map((img) => img.url);
      setImagePreviews(previews);
      setMainImageIndex(event.images.findIndex((img) => img.isMain));
    }
  }, [event]);

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
      console.error("Error al crear evento:", error);

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
      // Esto se ejecuta siempre, independientemente de si fue exitoso o error
      console.log("Mutation settled");
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
      console.error("Error al actualizar evento:", error);

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
      console.log("Update mutation settled");
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setImages((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
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

  const onSubmit = (data: FormData) => {
    if (!event && images.length === 0) {
      toast.error("Imágenes requeridas", {
        description: "Debes subir al menos una imagen.",
      });
      return;
    }

    if (event) {
      // Actualización de evento existente
      const updateData: UpdateWellnessEventData = {
        title: data.title,
        date: data.date,
        category: data.category,
        location: data.location || "",
        description: data.description,
        attendees: data.attendees,
        gift: data.gift,
        provider: data.provider,
        images: images.length > 0 ? images : undefined,
      };
      
      console.log('🔄 Enviando datos de actualización:', {
        eventId: event.id,
        updateData,
        formData: data,
        hasNewImages: images.length > 0
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
              {event ? "Modifica los detalles del evento" : "Crea un nuevo evento para la galería de bienestar"}
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
                      {...form.register("title")}
                      className="h-10"
                      placeholder="Ej: Jornada de Vacunación 2024"
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
                      {...form.register("description")}
                      rows={3}
                      className="resize-none text-sm"
                      placeholder="Describe los detalles del evento..."
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
                      {...form.register("location")}
                      className="h-10"
                      placeholder="Ej: Sede Principal"
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
                        min="1"
                        max="10000"
                        {...form.register("attendees", { valueAsNumber: true })}
                        className="h-10"
                        placeholder="150"
                      />
                      {form.formState.errors.attendees && (
                        <p className="text-destructive text-sm">{form.formState.errors.attendees.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="provider" className="text-sm font-medium">
                        Organizador
                      </Label>
                      <Input id="provider" {...form.register("provider")} placeholder="ProSalud" className="h-10" />
                      {form.formState.errors.provider && (
                        <p className="text-destructive text-sm">{form.formState.errors.provider.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gift" className="text-sm font-medium">
                      Obsequio
                    </Label>
                    <Input id="gift" {...form.register("gift")} className="h-10" placeholder="Ej: Kit de bienestar" />
                    {form.formState.errors.gift && (
                      <p className="text-destructive text-sm">{form.formState.errors.gift.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Columna derecha */}
            <div className="space-y-6">
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
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
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
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload-more"
                          />
                          <label htmlFor="image-upload-more" className="cursor-pointer">
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