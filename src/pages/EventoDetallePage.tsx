
import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { publicWellnessEventsApi } from '@/services/publicWellnessEventsApi';
import { CalendarDays, MapPin, Users, Gift, Briefcase, ChevronLeft, Maximize, Home, LayoutGrid, GalleryVertical, ArrowLeft, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from "@/components/ui/carousel";
import ImagePreviewDialog from '@/components/sst/ImagePreviewDialog';
import { Button } from '@/components/ui/button';
import { EventDetailLoadingSkeleton } from '@/components/ui/loading-skeleton';

const EventoDetallePage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  
  // Obtener el evento específico desde el API público
  const { data: event, isLoading, error } = useQuery({
    queryKey: ['wellness-event-public', eventId],
    queryFn: () => publicWellnessEventsApi.getPublicEvent(eventId!),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });

  // Obtener todos los eventos para la navegación desde el API público
  const { data: allEvents = [] } = useQuery({
    queryKey: ['wellness-events-public'],
    queryFn: () => publicWellnessEventsApi.getPublicEvents() as Promise<any[]>,
    staleTime: 5 * 60 * 1000,
  });

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageAlt, setSelectedImageAlt] = useState<string | undefined>(undefined);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)

  useEffect(() => {
    if (!api) {
      return
    }
    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])

  useEffect(() => {
    // Scroll to top when eventId changes
    window.scrollTo(0, 0);
  }, [eventId]);

  // Auto-scroll functionality
  useEffect(() => {
    if (!api) return;

    const autoScroll = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 4000);

    return () => clearInterval(autoScroll);
  }, [api]);

  if (isLoading) {
    return (
      <MainLayout>
        <EventDetailLoadingSkeleton />
      </MainLayout>
    );
  }

  if (error || !event) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          <h1 className="text-3xl font-bold text-destructive">Evento no encontrado</h1>
          <p className="mt-4 text-muted-foreground">El evento que buscas no existe o fue removido.</p>
           <Link to="/servicios/galeria-bienestar" className="mt-6 inline-block text-primary-prosalud hover:underline">
            Volver a la Galería
          </Link>
        </div>
      </MainLayout>
    );
  }

  // Preparar imágenes del evento
  const allImages = event.images || [];
  const hasMultipleImages = allImages.length > 1;

  const handleImageClick = (imageSrc: string, imageAlt?: string) => {
    const imageIndex = allImages.findIndex(img => img.url === imageSrc);
    setSelectedImage(imageSrc);
    setSelectedImageAlt(imageAlt || event.title);
    setSelectedImageIndex(imageIndex >= 0 ? imageIndex : 0);
  };

  const handleThumbnailClick = (index: number) => {
    if (api) {
      api.scrollTo(index);
    }
  };

  // Navigation for previous/next event
  const currentEventIndex = allEvents.findIndex(e => e.id === eventId);
  const previousEvent = currentEventIndex > 0 ? allEvents[currentEventIndex - 1] : null;
  const nextEvent = currentEventIndex < allEvents.length - 1 ? allEvents[currentEventIndex + 1] : null;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumb className="mb-8">
          <BreadcrumbList className="flex items-center space-x-2 text-sm">
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <Link to="/"><Home size={16} className="mr-1" />Inicio</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <Link to="/servicios"><LayoutGrid size={16} className="mr-1" />Servicios</Link> 
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <Link to="/servicios/galeria-bienestar"><GalleryVertical size={16} className="mr-1" />Bienestar</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-foreground truncate max-w-xs">{event.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <article className="bg-card p-6 sm:p-8 rounded-lg shadow-xl animate-fadeIn">
          <div className="mb-6">
            <Link 
              to="/servicios/galeria-bienestar" 
              className="inline-flex items-center text-sm text-primary-prosalud hover:text-secondary-prosaludgreen mb-4"
            >
              <ChevronLeft size={18} className="mr-1" />
              Volver a la Galería
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold text-primary-prosalud mb-3">{event.title}</h1>
            {event.category && <Badge variant="secondary" className="text-sm mb-3">{event.category}</Badge>}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Columna Izquierda: Imágenes */}
            <div className="md:col-span-2">
              {!hasMultipleImages ? (
                <div className="relative group">
                  <img
                    src={allImages[0]?.url || ''}
                    alt={allImages[0]?.alt || event.title}
                    className="w-full h-auto max-h-[500px] object-contain rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleImageClick(allImages[0]?.url || '', allImages[0]?.alt)}
                  />
                  <button
                    onClick={() => handleImageClick(allImages[0]?.url || '', allImages[0]?.alt)}
                    className="absolute bottom-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Ampliar imagen"
                  >
                    <Maximize size={18} />
                  </button>
                </div>
              ) : (
                 <div className="bg-background-light p-0 rounded-lg border-0 mb-6 md:mb-0">
                  <Carousel 
                    setApi={setApi}
                    className="w-full relative" 
                    opts={{ loop: true }}
                  >
                    <CarouselContent className="h-[400px] sm:h-[450px] md:h-[500px]">
                      {allImages.map((image, index) => (
                        <CarouselItem key={index} className="relative group">
                          <div className="p-0 w-full h-full flex items-center justify-center">
                            <img 
                              src={image.url} 
                              alt={image.alt || `${event.title} - Imagen ${index + 1}`} 
                              className="w-auto h-auto max-w-full max-h-full object-contain rounded-md shadow-sm cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation(); 
                                handleImageClick(image.url, image.alt || `${event.title} - Imagen ${index + 1}`);
                              }}
                            />
                             <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImageClick(image.url, image.alt || `${event.title} - Imagen ${index + 1}`);
                                }}
                                className="absolute bottom-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                                aria-label="Ampliar imagen"
                              >
                                <Maximize size={18} />
                              </button>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {hasMultipleImages && (
                      <>
                        <CarouselPrevious className="absolute left-2 sm:left-3 top-1/2 bg-white/80 text-primary-prosalud disabled:opacity-30 z-10" />
                        <CarouselNext className="absolute right-2 sm:right-3 top-1/2 bg-white/80 text-primary-prosalud disabled:opacity-30 z-10" />
                      </>
                    )}
                  </Carousel>
                   {api && count > 1 && (
                    <div className="text-center text-sm text-muted-foreground mt-2">
                      Imagen {current} de {count}
                    </div>
                  )}
                  {hasMultipleImages && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {allImages.map((image, index) => (
                        <button
                          key={`thumb-${index}`}
                          onClick={() => handleThumbnailClick(index)}
                          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden border-2 transition-all duration-200 ease-in-out
                                      ${current === index + 1 ? 'border-primary-prosalud ring-2 ring-primary-prosalud ring-offset-1' : 'border-transparent hover:border-primary-prosalud/50'}`}
                          aria-label={`Ver imagen ${index + 1}`}
                        >
                          <img
                            src={image.url}
                            alt={`Miniatura ${index + 1} de ${event.title}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Columna Derecha: Descripción (movida aquí) y Detalles del Evento */}
            <aside className="md:col-span-1 space-y-6">
              {/* Descripción del Evento (Movida aquí) */}
              <div className="order-first"> {/* Para asegurar que se muestra primero en el flujo normal y en la columna */}
                <h2 className="text-2xl font-semibold text-primary-prosalud-dark mb-3">Descripción del Evento</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{event.description}</p>
              </div>
              
              {/* Detalles del Evento */}
              <div className="bg-background-light p-4 rounded-lg border border-prosalud-border">
                <h3 className="text-lg font-semibold text-primary-prosalud-dark mb-3">Detalles del Evento</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <CalendarDays size={18} className="mr-3 mt-0.5 text-secondary-prosaludgreen flex-shrink-0" />
                    <div>
                      <strong>Fecha:</strong> {new Date(event.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </li>
                  {event.location && (
                    <li className="flex items-start">
                      <MapPin size={18} className="mr-3 mt-0.5 text-secondary-prosaludgreen flex-shrink-0" />
                      <div><strong>Lugar:</strong> {event.location}</div>
                    </li>
                  )}
                  {event.attendees && (
                    <li className="flex items-start">
                      <Users size={18} className="mr-3 mt-0.5 text-secondary-prosaludgreen flex-shrink-0" />
                      <div><strong>Asistentes:</strong> Aprox. {event.attendees}</div>
                    </li>
                  )}
                  {event.gift && (
                    <li className="flex items-start">
                      <Gift size={18} className="mr-3 mt-0.5 text-secondary-prosaludgreen flex-shrink-0" />
                      <div><strong>Obsequio:</strong> {event.gift}</div>
                    </li>
                  )}
                  {event.provider && (
                    <li className="flex items-start">
                      <Briefcase size={18} className="mr-3 mt-0.5 text-secondary-prosaludgreen flex-shrink-0" />
                      <div><strong>Organizador/Proveedor:</strong> {event.provider}</div>
                    </li>
                  )}
                </ul>
              </div>

              {/* Navegación de Eventos */}
              {(previousEvent || nextEvent) && (
                <div className="mt-8 pt-6 border-t border-prosalud-border">
                  <h3 className="text-lg font-semibold text-primary-prosalud-dark mb-4">Navegar Eventos</h3>
                  <div className="flex justify-between items-center gap-4">
                    {previousEvent ? (
                      <Link 
                        to={`/servicios/galeria-bienestar/${previousEvent.id}`} 
                        className="inline-flex items-center gap-2 text-sm text-primary-prosalud hover:text-secondary-prosaludgreen font-medium px-4 py-2 rounded-md border border-primary-prosalud/50 hover:bg-primary-prosalud/5 transition-colors"
                        title={previousEvent.title}
                      >
                        <ArrowLeft size={18} />
                        Anterior
                      </Link>
                    ) : (
                      <Button variant="outline" disabled className="opacity-50 cursor-not-allowed">
                        <ArrowLeft size={18} />
                        Anterior
                      </Button>
                    )}
                    {nextEvent ? (
                      <Link 
                        to={`/servicios/galeria-bienestar/${nextEvent.id}`} 
                        className="inline-flex items-center gap-2 text-sm text-primary-prosalud hover:text-secondary-prosaludgreen font-medium px-4 py-2 rounded-md border border-primary-prosalud/50 hover:bg-primary-prosalud/5 transition-colors"
                        title={nextEvent.title}
                      >
                        Siguiente
                        <ArrowRight size={18} />
                      </Link>
                    ) : (
                       <Button variant="outline" disabled className="opacity-50 cursor-not-allowed">
                        Siguiente
                        <ArrowRight size={18} />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </article>
      </div>
      <ImagePreviewDialog 
        selectedImage={selectedImage} 
        setSelectedImage={setSelectedImage}
        imageAlt={selectedImageAlt}
        allImages={allImages}
        currentImageIndex={selectedImageIndex}
      />
    </MainLayout>
  );
};

export default EventoDetallePage;
