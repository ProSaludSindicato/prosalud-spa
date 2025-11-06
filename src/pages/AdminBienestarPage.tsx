import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Eye, Edit, EyeOff, Heart, Pencil, Calendar, Images } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataPagination from '@/components/ui/data-pagination';
import { usePagination } from '@/hooks/usePagination';
import { useToast } from '@/hooks/use-toast';
import { wellnessEventsApi } from '@/services/wellnessEventsApi';
import { BienestarEvent } from '@/types/admin';
import BienestarEventForm from '@/components/admin/bienestar/BienestarEventForm';

const AdminBienestarPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BienestarEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if we should open the create form based on URL params
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowForm(true);
      setSelectedEvent(null);
      // Remove the action param after opening the form
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const { data: events = [], isLoading } = useQuery<BienestarEvent[]>({
    queryKey: ['bienestar-events'],
    queryFn: () => wellnessEventsApi.getEvents()
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async (event: BienestarEvent) => {
      return wellnessEventsApi.toggleVisibility(event.id, !event.isVisible);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bienestar-events'] });
      toast({
        title: "Visibilidad actualizada",
        description: "La visibilidad del evento se ha actualizado correctamente."
      });
    },
    onError: (error: any) => {
      console.error('Error al cambiar visibilidad:', error);
      toast({
        title: "Error al cambiar visibilidad",
        description: error.response?.data?.message || "No se pudo cambiar la visibilidad del evento.",
        variant: "destructive"
      });
    }
  });

  const filteredEvents = events.filter((event: BienestarEvent) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = event.id.toString().includes(searchTerm) ||
                         event.title.toLowerCase().includes(searchLower) ||
                         event.category.toLowerCase().includes(searchLower);
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(events.map((event: BienestarEvent) => event.category))];

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
    initialItemsPerPage: 9
  });

  const handleEdit = (event: BienestarEvent) => {
    setSelectedEvent(event);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedEvent(null);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
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

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-6 space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                      <Images className="h-8 w-8 text-primary-prosalud" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-primary-prosalud">
                        Bienestar
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        Administra los eventos y actividades de bienestar de ProSalud
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setShowForm(true)}
                    className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Evento
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Filtros</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por ID, título o categoría..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[220px]">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category === 'all' ? 'Todas las categorías' : category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Events Grid */}
          <motion.div variants={itemVariants}>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200"></div>
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : totalItems === 0 ? (
              <Card className="border shadow-sm bg-white">
                <CardContent className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg text-gray-600">
                    {searchTerm || categoryFilter !== 'all' 
                      ? 'No se encontraron eventos con los filtros aplicados'
                      : 'No hay eventos creados aún'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="group relative overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 bg-white h-[420px] flex flex-col">
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={event.images.find(img => img.isMain)?.url || event.images[0]?.url || '/placeholder.svg'}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-2 right-2 flex gap-2">
                            <Badge variant={event.isVisible ? "default" : "secondary"}>
                              {event.isVisible ? 'Visible' : 'Oculto'}
                            </Badge>
                            <Badge className="bg-white/90 text-gray-800 border-white/20 backdrop-blur-sm">
                              {event.category}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-4 flex-1 flex flex-col">
                          <h3 className="font-semibold text-lg text-text-dark mb-2 line-clamp-2 min-h-[3.5rem]">
                            {event.title}
                          </h3>
                          <div className="space-y-1 text-sm text-text-gray flex-1">
                            <p className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {new Date(event.date).toLocaleDateString('es-ES')}
                            </p>
                            {event.location && (
                              <p className="truncate">{event.location}</p>
                            )}
                            {event.attendees && (
                              <p>{event.attendees} asistentes</p>
                            )}
                          </div>

                          <div className="space-y-3 mt-4">
                            {/* Visibility Toggle */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                {event.isVisible ? (
                                  <Eye className="h-4 w-4 text-green-600" />
                                ) : (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="text-sm font-medium">
                                  {event.isVisible ? 'Visible en web' : 'Oculto en web'}
                                </span>
                              </div>
                              <Switch
                                checked={event.isVisible}
                                onCheckedChange={() => toggleVisibilityMutation.mutate(event)}
                                disabled={toggleVisibilityMutation.isPending}
                              />
                            </div>

                            {/* Edit Button */}
                            <Button
                              variant="outline"
                              onClick={() => handleEdit(event)}
                              className="w-full"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                <DataPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={goToPage}
                  onItemsPerPageChange={setItemsPerPage}
                  className="mt-8"
                />
              </>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Modal del Formulario */}
      {showForm && (
        <BienestarEventForm
          event={selectedEvent}
          onClose={handleFormClose}
        />
      )}
    </AdminLayout>
  );
};

export default AdminBienestarPage;
