import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brush,
  Sparkles, 
  Plus, 
  Search, 
  Upload,
  X,
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar,
  MoreHorizontal,
  ExternalLink,
  Gift,
  GraduationCap
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import DataPagination from '@/components/ui/data-pagination';
import { usePagination } from '@/hooks/usePagination';
import { ComfenalcoEvent, CreateComfenalcoEventData, UpdateComfenalcoEventData } from '@/types/comfenalco';
import { comfenalcoEventsApi, ComfenalcoEventsApiError } from '@/services/comfenalcoEventsApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useComfenalcoEventValidation, ValidationErrors } from '@/hooks/useComfenalcoEventValidation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { FieldError } from '@/components/ui/field-error';
import DeleteComfenalcoEventDialog from '@/components/admin/comfenalco/DeleteComfenalcoEventDialog';
import { logger } from '@/utils/logger';
import { usePermissions } from '@/hooks/usePermissions';

const AdminComfenalcoPage: React.FC = () => {
  const { can } = usePermissions();
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [viewEventOpen, setViewEventOpen] = useState(false);
  const [deleteEventOpen, setDeleteEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ComfenalcoEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    displaySize: 'all',
  });
  const queryClient = useQueryClient();
  const { errors: validationErrors, validateCreateEvent, validateUpdateEvent, clearErrors, setFieldError, clearFieldError } = useComfenalcoEventValidation();
  const [backendErrors, setBackendErrors] = useState<ValidationErrors>({});

  // Debug logging para entornos de desarrollo
  logger.debug('Errores de validación de Comfenalco', { frontend: validationErrors, backend: backendErrors });

  // Helper function to get field error
  const getFieldError = (field: keyof ValidationErrors): string | undefined => {
    const frontendError = validationErrors[field];
    const backendError = backendErrors[field];
    const error = frontendError || backendError;
    
    // Debug logging
    if (error) {
      logger.debug('Error de campo en formulario Comfenalco', { field, error });
    }
    
    return error;
  };

  // Helper function to check if event date has passed
  const isEventDatePassed = (eventDate: string | undefined): boolean => {
    if (!eventDate) return false;
    
    try {
      const eventDateTime = new Date(eventDate + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDateTime < today;
    } catch {
      return false;
    }
  };

  const [formValues, setFormValues] = useState<Omit<ComfenalcoEvent, 'id' | 'created_at' | 'updated_at'>>({
    title: '',
    banner_image: '',
    description: '',
    registration_deadline: '',
    event_date: '',
    registration_link: '',
    category: 'Deportes',
    display_size: 'carousel',
    is_visible: true,
  });

  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // React Query hooks
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['comfenalco-events'],
    queryFn: comfenalcoEventsApi.getEvents,
  });

  const createEventMutation = useMutation({
    mutationFn: comfenalcoEventsApi.createEvent,
    onSuccess: async (data) => {
      // Close modal and reset form first
      setEventFormOpen(false);
      resetForm();
      clearErrors();
      setBackendErrors({});
      
      // Show success toast
      toast.success("Evento Creado", {
        description: "El evento ha sido creado exitosamente.",
      });
      
      // Reload the page to ensure fresh data
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Small delay to show the toast
    },
    onError: (error: ComfenalcoEventsApiError) => {
      if (error.status === 422 && error.errors) {
        // Handle validation errors from backend
        setBackendErrors(error.errors);
        toast.error("Error de validación", {
          description: "Por favor corrige los errores en el formulario.",
        });
      } else {
        toast.error("Error al crear evento", {
          description: error.message,
        });
      }
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateComfenalcoEventData }) => 
      comfenalcoEventsApi.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comfenalco-events'] });
      toast.success("Evento Actualizado", {
        description: "El evento ha sido actualizado exitosamente.",
      });
      setEventFormOpen(false);
      resetForm();
      clearErrors();
      setBackendErrors({});
    },
    onError: (error: ComfenalcoEventsApiError) => {
      if (error.status === 422 && error.errors) {
        // Handle validation errors from backend
        setBackendErrors(error.errors);
        toast.error("Error de validación", {
          description: "Por favor corrige los errores en el formulario.",
        });
      } else {
        toast.error("Error al actualizar evento", {
          description: error.message,
        });
      }
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: comfenalcoEventsApi.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comfenalco-events'] });
      toast.success("Evento Eliminado", {
        description: "El evento ha sido eliminado exitosamente.",
      });
      setDeleteEventOpen(false);
      setSelectedEvent(null);
    },
    onError: (error: ComfenalcoEventsApiError) => {
      toast.error("Error al eliminar evento", {
        description: error.message,
      });
    },
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: ({ id, isVisible }: { id: number; isVisible: boolean }) =>
      comfenalcoEventsApi.updateEventVisibility(id, isVisible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comfenalco-events'] });
      toast.success("Visibilidad Actualizada", {
        description: "La visibilidad del evento ha sido actualizada.",
      });
    },
    onError: (error: ComfenalcoEventsApiError) => {
      toast.error("Error al actualizar visibilidad", {
        description: error.message,
      });
    },
  });


  const filteredEvents = events.filter(event => {
    const searchTermLower = searchTerm.toLowerCase();
    const titleLower = (event.title ?? '').toLowerCase();
    const idText = String(event.id ?? '');
  
    const matchesSearchTerm = idText.includes(searchTerm) ||
                              titleLower.includes(searchTermLower);
    const matchesCategory = filters.category === 'all' || event.category === filters.category;
    const matchesDisplaySize = filters.displaySize === 'all' || event.display_size === filters.displaySize;
  
    return matchesSearchTerm && matchesCategory && matchesDisplaySize;
  });

  const {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    paginatedData: paginatedEvents,
    goToPage,
    setItemsPerPage
  } = usePagination({
    data: filteredEvents,
    initialItemsPerPage: 12
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues(prevValues => ({
      ...prevValues,
      [name]: value
    }));
    
    // Clear field error when user starts typing
    if (name in validationErrors || name in backendErrors) {
      clearFieldError(name as keyof ValidationErrors);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamaño del archivo
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Archivo muy grande", {
          description: "La imagen debe ser menor a 5MB.",
        });
        return;
      }

      // Validar tipo de archivo
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error("Formato no válido", {
          description: "Solo se permiten archivos JPG, PNG o WebP.",
        });
        return;
      }

      setBannerImageFile(file);
      
      // Crear preview local
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setBannerImageFile(null);
    setImagePreview('');
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormValues(prevValues => ({
      ...prevValues,
      [name]: checked
    }));
  };

  const handleCategoryChange = (value: string) => {
    setFormValues(prevValues => ({
      ...prevValues,
      category: value
    }));
    
    // Clear category error when user selects a category
    if ('category' in validationErrors || 'category' in backendErrors) {
      clearFieldError('category');
    }
  };

  const handleDisplaySizeChange = (value: string) => {
    setFormValues(prevValues => ({
      ...prevValues,
      display_size: value as ComfenalcoEvent['display_size']
    }));
    
    // Clear display_size error when user selects a size
    if ('display_size' in validationErrors || 'display_size' in backendErrors) {
      clearFieldError('display_size');
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Clear field error when user changes the date
    if (name in validationErrors || name in backendErrors) {
      clearFieldError(name as keyof ValidationErrors);
    }
    
    // If registration deadline is set and it's after the event date, clear the event date
    if (name === 'registration_deadline' && value && formValues.event_date) {
      const registrationDate = new Date(value);
      const eventDate = new Date(formValues.event_date);
      
      if (registrationDate > eventDate) {
        setFormValues(prev => ({
          ...prev,
          [name]: value,
          event_date: '',
        }));
        if ('event_date' in validationErrors || 'event_date' in backendErrors) {
          clearFieldError('event_date');
        }
        return; // Exit early to avoid double update
      }
    }
    
    // Update form values
    setFormValues(prevValues => ({
      ...prevValues,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    // Clear previous errors
    clearErrors();
    setBackendErrors({});

    if (isEditing && selectedEvent) {
      // Update existing event
      const updateData: UpdateComfenalcoEventData = {
        title: formValues.title,
        category: formValues.category,
        description: formValues.description,
        display_size: formValues.display_size,
        event_date: formValues.event_date,
        registration_deadline: formValues.registration_deadline,
        registration_link: formValues.registration_link,
        is_visible: formValues.is_visible,
      };

      // Check if only visibility is being changed (for skipping date validation)
      const onlyVisibilityChanged = 
        formValues.title === selectedEvent.title &&
        formValues.category === selectedEvent.category &&
        formValues.description === (selectedEvent.description || '') &&
        formValues.display_size === selectedEvent.display_size &&
        formValues.event_date === (selectedEvent.event_date || '') &&
        formValues.registration_deadline === (selectedEvent.registration_deadline || '') &&
        formValues.registration_link === (selectedEvent.registration_link || '') &&
        formValues.is_visible !== selectedEvent.is_visible &&
        !bannerImageFile; // Also check if no new image is being uploaded

      // Validate update data (skip date validation if only visibility is being changed)
      const validation = validateUpdateEvent(updateData, onlyVisibilityChanged);
      if (!validation.isValid) {
        logger.warn('Errores de validación al actualizar evento Comfenalco', validation.errors);
        toast.error("Error de validación", {
          description: "Por favor corrige los errores en el formulario.",
        });
        return;
      }

      updateEventMutation.mutate({ id: selectedEvent.id, data: updateData });
    } else {
      // Create new event
      if (!bannerImageFile) {
        setFieldError('banner_image', 'La imagen del banner es obligatoria');
        toast.error("Imagen requerida", {
          description: "Debes subir una imagen banner.",
        });
        return;
      }

      const createData: CreateComfenalcoEventData = {
        title: formValues.title,
        banner_image: bannerImageFile,
        category: formValues.category,
        description: formValues.description,
        display_size: formValues.display_size,
        event_date: formValues.event_date,
        registration_deadline: formValues.registration_deadline,
        registration_link: formValues.registration_link,
        is_visible: formValues.is_visible,
      };

      // Validate create data
      const validation = validateCreateEvent(createData);
      logger.debug('Resultado de validación al crear evento Comfenalco', { isValid: validation.isValid });
      if (!validation.isValid) {
        logger.warn('Errores de validación al crear evento Comfenalco', validation.errors);
        toast.error("Error de validación", {
          description: "Por favor corrige los errores en el formulario.",
        });
        return;
      }

      createEventMutation.mutate(createData);
    }
  };

  const handleEdit = (event: ComfenalcoEvent) => {
    setSelectedEvent(event);
    setFormValues({
      title: event.title,
      banner_image: event.banner_image,
      description: event.description || '',
      registration_deadline: event.registration_deadline || '',
      event_date: event.event_date || '',
      registration_link: event.registration_link || '',
      category: event.category,
      display_size: event.display_size,
      is_visible: event.is_visible,
    });
    setImagePreview(event.banner_image);
    setBannerImageFile(null);
    setIsEditing(true);
    setEventFormOpen(true);
  };

  const handleDelete = (event: ComfenalcoEvent) => {
    setSelectedEvent(event);
    setDeleteEventOpen(true);
  };

  const confirmDelete = () => {
    if (selectedEvent) {
      deleteEventMutation.mutate(selectedEvent.id);
    }
  };

  const resetForm = () => {
    setFormValues({
      title: '',
      banner_image: '',
      description: '',
      registration_deadline: '',
      event_date: '',
      registration_link: '',
      category: 'Deportes',
      display_size: 'carousel',
      is_visible: true,
    });
    setBannerImageFile(null);
    setImagePreview('');
    setIsEditing(false);
    setSelectedEvent(null);
    clearErrors();
    setBackendErrors({});
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                      <GraduationCap className="h-8 w-8 text-primary-prosalud" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-primary-prosalud">
                        Experiencias Comfenalco
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        Administra las experiencias y beneficios de Comfenalco para los afiliados
                      </CardDescription>
                    </div>
                    </div>
                    {can('comfenalco_events.create') && (
                      <Button 
                        onClick={() => {
                          resetForm();
                          setEventFormOpen(true);
                        }}
                        className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Experiencia
                      </Button>
                    )}
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por ID o título..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={filters.category} onValueChange={(value) => setFilters({...filters, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      <SelectItem value="Deportes">Deportes</SelectItem>
                      <SelectItem value="Cultura">Cultura</SelectItem>
                      <SelectItem value="Educación">Educación</SelectItem>
                      <SelectItem value="Recreación">Recreación</SelectItem>
                      <SelectItem value="Bienestar">Bienestar</SelectItem>
                      <SelectItem value="Familia">Familia</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.displaySize} onValueChange={(value) => setFilters({...filters, displaySize: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tamaño de Visualización" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tamaños</SelectItem>
                      <SelectItem value="carousel">Carrusel</SelectItem>
                      <SelectItem value="mosaic">Mosaico</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    onClick={() => {setFilters({category: 'all', displaySize: 'all'}); setSearchTerm('');}}
                    className="w-full flex items-center gap-2"
                  >
                    <Brush className="w-4 h-4" />
                    Limpiar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Events Grid */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Eventos Comfenalco ({totalItems})</CardTitle>
                <CardDescription>
                  Lista completa de eventos y beneficios de Comfenalco para los afiliados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-prosalud mx-auto mb-4"></div>
                      <p className="text-gray-600">Cargando eventos...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <p className="text-red-600 mb-4">Error al cargar los eventos</p>
                      <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['comfenalco-events'] })}>
                        Reintentar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedEvents.map((event) => (
                      <Card key={event.id} className="hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
                        <CardHeader className="p-0">
                          <img
                            src={event.banner_image}
                            alt={event.title}
                            className="w-full h-48 object-cover rounded-t-lg"
                          />
                        </CardHeader>
                        <CardContent className="p-4 flex flex-col flex-grow">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              {event.category}
                            </Badge>
                            <div className="flex gap-1">
                              {isEventDatePassed(event.event_date) ? (
                                <Badge variant="destructive" className="text-xs">
                                  Evento Vencido
                                </Badge>
                              ) : (
                                <Badge variant={event.is_visible ? "default" : "secondary"} className="text-xs">
                                  {event.is_visible ? "Visible" : "Oculto"}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex-grow">
                            <CardTitle className="text-lg font-semibold mb-2 line-clamp-2">
                              {event.title}
                            </CardTitle>
                            {event.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1 mb-4">
                            <p className="text-xs text-gray-500">
                              Creado: {new Date(event.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Visualización: {event.display_size === 'carousel' ? 'Carrusel' : 'Mosaico'}
                            </p>
                          </div>
                        </CardContent>
                        <div className="px-4 pb-4">
                          <div className="flex items-center justify-between">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedEvent(event);
                                setViewEventOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          <div className="flex items-center gap-1">
                            {(can('comfenalco_events.edit') || can('comfenalco_events.delete')) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {can('comfenalco_events.edit') && (
                                    <DropdownMenuItem onClick={() => handleEdit(event)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                  )}
                                  {can('comfenalco_events.delete') && (
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(event)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                              {event.registration_link && (
                                <a href={event.registration_link} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="sm">
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                <DataPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={goToPage}
                  onItemsPerPageChange={setItemsPerPage}
                  className="mt-6"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* View Event Dialog */}
          <Dialog open={viewEventOpen} onOpenChange={setViewEventOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-xl font-bold">Detalles del Evento</DialogTitle>
                <Separator />
              </DialogHeader>
          
              {selectedEvent && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                  <Card className="h-full flex flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        Información del Evento
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Título</label>
                          <p className="text-sm">{selectedEvent.title}</p>
                        </div>
                        {selectedEvent.description && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Descripción</label>
                            <p className="text-sm">{selectedEvent.description}</p>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium text-gray-600 block mb-2">Categoría</label>
                          <Badge variant="outline" className="text-xs ml-2">{selectedEvent.category}</Badge>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Tamaño de Visualización</label>
                          <p className="text-sm text-gray-700 mt-1">
                            {selectedEvent.display_size === 'carousel' ? 'Carrusel' : 'Mosaico'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600 block mb-2">Estado</label>
                          {isEventDatePassed(selectedEvent.event_date) ? (
                            <Badge variant="destructive" className="ml-2">
                              Evento Vencido
                            </Badge>
                          ) : (
                            <Badge variant={selectedEvent.is_visible ? "default" : "secondary"} className="ml-2">
                              {selectedEvent.is_visible ? "Visible en web" : "Oculto en web"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
          
                  <Card className="h-full flex flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Fechas y Enlaces
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Fecha de Creación</label>
                          <p className="text-sm">{new Date(selectedEvent.created_at).toLocaleDateString()}</p>
                        </div>
                        {selectedEvent.registration_deadline && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Fecha Límite de Registro</label>
                            <p className="text-sm">{selectedEvent.registration_deadline}</p>
                          </div>
                        )}
                        {selectedEvent.event_date && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Fecha del Evento</label>
                            <p className="text-sm">{selectedEvent.event_date}</p>
                          </div>
                        )}
                        {selectedEvent.registration_link && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Enlace de Registro</label>
                            <a
                              href={selectedEvent.registration_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                            >
                              Ver enlace <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Event Form Dialog */}
          <Dialog open={eventFormOpen} onOpenChange={setEventFormOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Evento' : 'Nuevo Evento'}</DialogTitle>
                <DialogDescription>
                  {isEditing ? 'Edita los detalles del evento.' : 'Crea un nuevo evento para mostrar a los afiliados.'}
                </DialogDescription>
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Nota:</span> Los campos marcados con <span className="text-red-500 font-bold">*</span> son obligatorios.
                  </p>
                </div>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="title">Título <span className="text-red-500">*</span></Label>
                    <Input
                      type="text"
                      id="title"
                      name="title"
                      value={formValues.title}
                      onChange={handleInputChange}
                      className={getFieldError('title') ? 'border-red-500' : ''}
                      placeholder="Ingresa el título del evento"
                    />
                    <FieldError error={getFieldError('title')} />
                  </div>
                  
                  {/* Banner Image Upload */}
                  <div>
                    <Label htmlFor="bannerImage">Imagen del Banner <span className="text-red-500">*</span></Label>
                    <div className="space-y-4">
                      {!imagePreview ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="banner-upload"
                          />
                          <label htmlFor="banner-upload" className="cursor-pointer">
                            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-lg font-medium text-gray-600 mb-2">Seleccionar imagen banner</p>
                            <p className="text-sm text-gray-500">JPG, PNG o WebP hasta 5MB</p>
                          </label>
                        </div>
                      ) : (
                        <div className="relative rounded-lg overflow-hidden">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={removeImage}
                            className="absolute top-2 right-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                            {bannerImageFile ? 'Nueva imagen seleccionada' : 'Imagen actual'}
                          </div>
                        </div>
                      )}
                    </div>
                    <FieldError error={getFieldError('banner_image')} />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Descripción <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Textarea
                      id="description"
                      name="description"
                      value={formValues.description}
                      onChange={handleInputChange}
                      className={`${getFieldError('description') ? 'border-red-500' : ''} pr-16`}
                      placeholder="Describe el evento y sus beneficios"
                      maxLength={200}
                      rows={3}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-1 rounded">
                      {formValues.description.length}/200
                    </div>
                  </div>
                  <FieldError error={getFieldError('description')} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="registrationDeadline">Fecha Límite de Registro</Label>
                    <Input
                      type="date"
                      id="registrationDeadline"
                      name="registration_deadline"
                      value={formValues.registration_deadline}
                      onChange={handleDateChange}
                      min={isEditing ? undefined : new Date().toISOString().split('T')[0]}
                      className={getFieldError('registration_deadline') ? 'border-red-500' : ''}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Última fecha para que los usuarios se registren (opcional)
                    </p>
                    <FieldError error={getFieldError('registration_deadline')} />
                  </div>
                  <div>
                    <Label htmlFor="eventDate">Fecha del Evento</Label>
                    <Input
                      type="date"
                      id="eventDate"
                      name="event_date"
                      value={formValues.event_date}
                      onChange={handleDateChange}
                      min={isEditing ? undefined : (formValues.registration_deadline || new Date().toISOString().split('T')[0])}
                      className={getFieldError('event_date') ? 'border-red-500' : ''}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Fecha en que se realizará el evento (opcional)
                    </p>
                    <FieldError error={getFieldError('event_date')} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="registrationLink">Enlace de Registro</Label>
                    <div className="relative mt-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        type="url"
                        id="registrationLink"
                        name="registration_link"
                        value={formValues.registration_link}
                        onChange={handleInputChange}
                        className={`pl-10 ${getFieldError('registration_link') ? 'border-red-500' : ''}`}
                        placeholder="https://ejemplo.com/registro"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      URL donde los usuarios pueden registrarse al evento
                    </p>
                    <FieldError error={getFieldError('registration_link')} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Categoría <span className="text-red-500">*</span></Label>
                    <Select value={formValues.category} onValueChange={handleCategoryChange}>
                      <SelectTrigger className={getFieldError('category') ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Deportes">Deportes</SelectItem>
                        <SelectItem value="Cultura">Cultura</SelectItem>
                        <SelectItem value="Educación">Educación</SelectItem>
                        <SelectItem value="Recreación">Recreación</SelectItem>
                        <SelectItem value="Bienestar">Bienestar</SelectItem>
                        <SelectItem value="Familia">Familia</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError error={getFieldError('category')} />
                  </div>
                  <div>
                    <Label htmlFor="displaySize">Tamaño de Visualización <span className="text-red-500">*</span></Label>
                    <Select value={formValues.display_size} onValueChange={handleDisplaySizeChange}>
                      <SelectTrigger className={getFieldError('display_size') ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Selecciona un tamaño" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="carousel">Carrusel</SelectItem>
                        <SelectItem value="mosaic">Mosaico</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError error={getFieldError('display_size')} />
                  </div>
                </div>
                
                <Separator className="my-4" />
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isVisible"
                      checked={formValues.is_visible}
                      onCheckedChange={(checked) => handleSwitchChange('is_visible', checked)}
                    />
                    <Label htmlFor="isVisible">Visible en la web</Label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEventFormOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createEventMutation.isPending || updateEventMutation.isPending}
                >
                  {createEventMutation.isPending || updateEventMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isEditing ? 'Actualizando...' : 'Creando...'}
                    </>
                  ) : (
                    isEditing ? 'Actualizar Evento' : 'Crear Evento'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <DeleteComfenalcoEventDialog
            open={deleteEventOpen}
            onOpenChange={setDeleteEventOpen}
            event={selectedEvent}
            onConfirm={confirmDelete}
          />
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminComfenalcoPage;
