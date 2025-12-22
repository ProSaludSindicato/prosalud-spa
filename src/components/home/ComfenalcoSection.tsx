import React, { useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicComfenalcoApi } from '@/services/publicComfenalcoApi';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, Sparkles, Calendar, Clock, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';

// Bandera para activar/desactivar temporalmente la consulta de eventos de Comfenalco
// Cambiar a true cuando se quiera mostrar eventos nuevamente
const ENABLE_COMFENALCO_EVENTS = false;

const ComfenalcoSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const isVisible = useIntersectionObserver(sectionRef, { 
    threshold: 0.1, 
    freezeOnceVisible: true 
  });

  const [currentSlide, setCurrentSlide] = useState(0);
  const [sortOrder, setSortOrder] = useState<'upcoming' | 'recent'>('upcoming');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch real events data
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['public-comfenalco-events'],
    queryFn: publicComfenalcoApi.getPublicEvents,
    enabled: ENABLE_COMFENALCO_EVENTS && isVisible, // Only fetch when enabled and section is visible
  });

  // Helper function to check if event date has passed
  const isEventDatePassed = (eventDate: string) => {
    if (!eventDate) return false;
    
    try {
      // Parse event date in Colombia timezone (UTC-5)
      const eventDateTime = new Date(eventDate + 'T00:00:00-05:00');
      
      // Get current date in Colombia timezone
      const now = new Date();
      const colombiaOffset = -5 * 60; // UTC-5 in minutes
      const colombiaTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (colombiaOffset * 60000));
      
      // Reset to start of day for comparison
      const today = new Date(colombiaTime.getFullYear(), colombiaTime.getMonth(), colombiaTime.getDate());
      const eventDateOnly = new Date(eventDateTime.getFullYear(), eventDateTime.getMonth(), eventDateTime.getDate());
      
      // Only filter out events that are BEFORE today (not including today)
      return eventDateOnly < today;
    } catch (error) {
      return false; // Don't filter out events with invalid dates
    }
  };

  // Helper function to sort events by date
  const sortEventsByDate = (events: any[], order: 'upcoming' | 'recent') => {
    return [...events].sort((a, b) => {
      const dateA = new Date(a.event_date || a.created_at);
      const dateB = new Date(b.event_date || b.created_at);
      
      if (order === 'upcoming') {
        return dateA.getTime() - dateB.getTime(); // Ascending (upcoming first)
      } else {
        return dateB.getTime() - dateA.getTime(); // Descending (recent first)
      }
    });
  };

  // Filter and sort events
  const filteredEvents = events.filter(event => {
    // If no event_date, don't filter out
    if (!event.event_date) {
      return true;
    }
    
    const hasPassed = isEventDatePassed(event.event_date);
    return !hasPassed;
  });
  
  const sortedEvents = sortEventsByDate(filteredEvents, sortOrder);
  
  const featuredEvents = sortedEvents.filter(event => event.display_size === 'carousel');
  const mosaicEvents = sortedEvents.filter(event => event.display_size === 'mosaic');

  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isVisible, featuredEvents.length]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Deportes': 'bg-blue-500',
      'Cultura': 'bg-purple-500',
      'Educación': 'bg-green-500',
      'Recreación': 'bg-orange-500',
      'Bienestar': 'bg-pink-500',
      'Familia': 'bg-indigo-500'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500';
  };

  const getCategoryLabel = (category: string) => {
    return category; // API already returns proper labels
  };

  const handleEventClick = (event: any) => {
    if (event.registration_link) {
      window.open(event.registration_link, '_blank');
    }
  };

  // Early returns for different states
  // Si los eventos están desactivados, no mostrar la sección
  if (!ENABLE_COMFENALCO_EVENTS) {
    return null;
  }

  if (!isVisible || isLoading) {
    return (
      <section ref={sectionRef} className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Skeleton className="h-6 w-32 mx-auto mb-3" />
            <Skeleton className="h-10 w-80 mx-auto mb-3" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <Skeleton className="h-96 w-full rounded-3xl mb-8" />
          <div className="grid grid-cols-12 gap-4 h-80">
            <Skeleton className="col-span-8 h-full rounded-2xl" />
            <Skeleton className="col-span-4 h-full rounded-2xl" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    logger.error('Error al cargar eventos públicos de Comfenalco', error?.message || error);
    return (
      <section ref={sectionRef} className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-prosalud mb-4">
              Experiencias que transforman
            </h2>
            <p className="text-gray-600 mb-4">
              No se pudieron cargar los eventos en este momento. Por favor, intenta más tarde.
            </p>
            <div className="text-left bg-gray-100 p-4 rounded-lg max-w-2xl mx-auto">
              <p className="text-sm text-gray-600">
                Error: {error?.message || 'Error desconocido'}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0 || filteredEvents.length === 0) {
    return null;
  }

  return (
    <section ref={sectionRef} className="py-12 md:py-16 bg-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Compact Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img 
                src="/images/logo_comfenalco.webp" 
                alt="Comfenalco Antioquia"
                className="h-12 md:h-14"
                width={140}
                height={60}
                style={{ 
                  filter: 'drop-shadow(0 0 0 white)',
                  mixBlendMode: 'multiply'
                }}
              />
            </div>
            <div className="text-left flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-primary-prosalud leading-tight">
                Experiencias que transforman
              </h2>
              <p className="text-sm md:text-base text-primary-prosalud-dark mt-1">
                Beneficios exclusivos para ti y tu familia
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {filteredEvents.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(prev => prev === 'upcoming' ? 'recent' : 'upcoming')}
                className="text-primary-prosalud border-primary-prosalud hover:bg-primary-prosalud hover:text-white transition-colors"
                title={sortOrder === 'upcoming' ? 'Cambiar a más recientes' : 'Cambiar a próximos'}
              >
                <Calendar className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{sortOrder === 'upcoming' ? 'Próximos' : 'Recientes'}</span>
                <span className="sm:hidden">{sortOrder === 'upcoming' ? 'Próx.' : 'Recientes'}</span>
              </Button>
            )}
            
            <div className="flex items-center gap-3">
              <Badge className="bg-green-100 text-green-700 font-semibold px-3 py-1.5 pointer-events-none">
                <Gift className="h-4 w-4 mr-2" />
                Beneficios Activos
              </Badge>
              <div className="hidden md:flex items-center text-sm text-primary-prosalud">
                <Sparkles className="h-4 w-4 mr-1 text-yellow-500" />
                ¡No te los pierdas!
              </div>
            </div>
          </div>
        </div>

        {/* Hero Carousel - Solo mostrar si hay eventos de carrusel */}
        {featuredEvents.length > 0 && (
          <div className="relative mb-8">
            <div className="relative h-80 md:h-96 rounded-3xl overflow-hidden shadow-2xl">
              {featuredEvents.map((event, index) => (
                <div
                  key={event.id}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out cursor-pointer ${
                    index === currentSlide 
                      ? 'opacity-100 scale-100' 
                      : 'opacity-0 scale-105'
                  }`}
                  onClick={() => handleEventClick(event)}
                >
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${event.banner_image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                  
                  {/* Content Overlay */}
                  <div className="absolute inset-0 flex items-center">
                    <div className="container mx-auto px-8">
                      <div className="max-w-2xl text-white flex flex-col h-full justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <Badge className={`${getCategoryColor(event.category)} text-white`}>
                              {getCategoryLabel(event.category)}
                            </Badge>
                          </div>
                          
                          <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 line-clamp-2">
                            {event.title}
                          </h3>
                          
                          {event.description && (
                            <p className="text-base md:text-lg lg:text-xl mb-4 text-gray-200 line-clamp-3">
                              {event.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 mb-4">
                            {event.event_date && (
                              <div className="flex items-center text-white/90 text-sm md:text-base">
                                <Calendar className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                                <span>{formatDate(event.event_date)}</span>
                              </div>
                            )}
                            {event.registration_deadline && (
                              <div className="flex items-center text-white/90 text-sm md:text-base">
                                <Clock className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                                <span>Hasta: {formatDate(event.registration_deadline)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          <Button 
                            size="lg"
                            className="bg-white text-black hover:bg-gray-100 font-semibold w-full sm:w-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                          >
                            <ExternalLink className="h-5 w-5 mr-2" />
                            Inscríbete aquí
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Navigation Arrows - Solo mostrar si hay más de un evento */}
              {featuredEvents.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white border-2 border-white p-2 rounded-full hover:bg-white/30 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % featuredEvents.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white border-2 border-white p-2 rounded-full hover:bg-white/30 transition-all cursor-pointer"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>

                  {/* Dots Indicator */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    {featuredEvents.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                          index === currentSlide ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mosaic Grid - Solo mostrar si hay eventos de mosaico */}
        {mosaicEvents.length > 0 && (
          <>
            {/* Layout responsivo mejorado */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Límites responsivos: 4 en móvil/tablet, 6 en desktop */}
              {mosaicEvents.slice(0, showAllEvents ? mosaicEvents.length : isDesktop ? 6 : 4).map((event, index) => (
                <div
                  key={event.id}
                  className="group cursor-pointer h-48 md:h-56"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => handleEventClick(event)}
                >
                  <div className="relative h-full rounded-2xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02]">
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url(${event.banner_image})` }}
                      role="img"
                      aria-label={event.title}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    
                    <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${getCategoryColor(event.category)} text-white text-xs`}>
                          {getCategoryLabel(event.category)}
                        </Badge>
                      </div>
                      
                      <h4 className="font-bold mb-2 text-lg md:text-xl line-clamp-2">
                        {event.title}
                      </h4>
                      
                      {/* Agregar descripción para mejor UX */}
                      {event.description && (
                        <p className="text-sm text-white/90 mb-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        {event.event_date && (
                          <div className="flex items-center text-white/90 text-xs md:text-sm">
                            <Calendar className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            <span>{formatDate(event.event_date)}</span>
                          </div>
                        )}
                        
                        <Button
                          size="sm"
                          className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Ver más
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Mostrar mensaje si hay más eventos */}
            {mosaicEvents.length > (isDesktop ? 6 : 4) && !showAllEvents && (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm mb-3">
                  Y {mosaicEvents.length - (isDesktop ? 6 : 4)} eventos más disponibles
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAllEvents(true)}
                  className="text-primary-prosalud border-primary-prosalud hover:bg-primary-prosalud hover:text-white"
                >
                  Ver todos los eventos
                </Button>
              </div>
            )}
            
            {/* Botón para ocultar eventos adicionales */}
            {showAllEvents && mosaicEvents.length > (isDesktop ? 6 : 4) && (
              <div className="text-center py-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAllEvents(false)}
                  className="text-primary-prosalud border-primary-prosalud hover:bg-primary-prosalud hover:text-white"
                >
                  Mostrar menos eventos
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default ComfenalcoSection;