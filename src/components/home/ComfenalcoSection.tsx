
import React, { useRef, useState, useEffect } from 'react';
import { comfenalcoEventsMock } from '@/data/comfenalcoEventsMock';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, Sparkles, Calendar, Clock, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const ComfenalcoSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const isVisible = useIntersectionObserver(sectionRef, { 
    threshold: 0.1, 
    freezeOnceVisible: true 
  });

  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredEvents] = useState(comfenalcoEventsMock.filter(event => event.displaySize === 'carousel'));
  const [mosaicEvents] = useState(comfenalcoEventsMock.filter(event => event.displaySize === 'mosaic'));

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
      curso: 'bg-blue-500',
      experiencia: 'bg-purple-500',
      beneficio: 'bg-green-500',
      regalo: 'bg-pink-500',
      recreacion: 'bg-orange-500'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500';
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      curso: 'Curso',
      experiencia: 'Experiencia',
      beneficio: 'Beneficio',
      regalo: 'Regalo',
      recreacion: 'Recreación'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const handleEventClick = (event: any) => {
    window.open(event.formLink, '_blank');
  };

  if (!isVisible) {
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
            <div className="text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-primary-prosalud leading-tight">
                Experiencias que transforman
              </h2>
              <p className="text-sm md:text-base text-primary-prosalud-dark mt-1">
                Beneficios exclusivos para ti y tu familia
              </p>
            </div>
          </div>
          
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
                    style={{ backgroundImage: `url(${event.bannerImage})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                  
                  {/* Content Overlay */}
                  <div className="absolute inset-0 flex items-center">
                    <div className="container mx-auto px-8">
                      <div className="max-w-2xl text-white">
                        <div className="flex items-center gap-3 mb-4">
                          {event.isNew && (
                            <Badge className="bg-red-500 text-white font-semibold animate-pulse">
                              ¡NUEVO!
                            </Badge>
                          )}
                          <Badge className={`${getCategoryColor(event.category)} text-white`}>
                            {getCategoryLabel(event.category)}
                          </Badge>
                        </div>
                        
                        <h3 className="text-3xl md:text-5xl font-bold mb-4">
                          {event.title}
                        </h3>
                        
                        {event.description && (
                          <p className="text-lg md:text-xl mb-6 text-gray-200">
                            {event.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 mb-6">
                          {event.eventDate && (
                            <div className="flex items-center text-white/90">
                              <Calendar className="h-5 w-5 mr-2" />
                              <span>{formatDate(event.eventDate)}</span>
                            </div>
                          )}
                          {event.registrationDeadline && (
                            <div className="flex items-center text-white/90">
                              <Clock className="h-5 w-5 mr-2" />
                              <span>Hasta: {formatDate(event.registrationDeadline)}</span>
                            </div>
                          )}
                        </div>

                        <Button 
                          size="lg"
                          className="bg-white text-black hover:bg-gray-100 font-semibold"
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
              ))}

              {/* Navigation Arrows - Solo mostrar si hay más de un evento */}
              {featuredEvents.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white border-2 border-white p-2 rounded-full hover:bg-white/30 transition-all"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % featuredEvents.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white border-2 border-white p-2 rounded-full hover:bg-white/30 transition-all"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>

                  {/* Dots Indicator */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    {featuredEvents.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-3 h-3 rounded-full transition-all ${
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
          <div className="grid grid-cols-12 gap-4 h-72 md:h-80">
            {mosaicEvents.map((event, index) => {
              const isLarge = index === 0;
              const colSpan = isLarge ? 'col-span-12 md:col-span-8' : 'col-span-12 md:col-span-4';
              const height = isLarge ? 'h-full' : index === 1 ? 'h-3/4' : 'h-3/4 md:mt-2';
              
              // Dimensiones para las imágenes de fondo
              const imgWidth = isLarge ? 800 : 400;
              const imgHeight = isLarge ? 600 : 300;
              
              return (
                <div
                  key={event.id}
                  className={`${colSpan} ${height} group cursor-pointer`}
                  style={{ animationDelay: `${index * 0.2}s` }}
                  onClick={() => handleEventClick(event)}
                >
                  <div className="relative h-full rounded-2xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02]">
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url(${event.bannerImage})` }}
                      role="img"
                      aria-label={event.title}
                      data-width={imgWidth}
                      data-height={imgHeight}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
                      <div className="flex items-center gap-2 mb-2">
                        {event.isNew && (
                          <Badge className="bg-red-500 text-white text-xs">
                            ¡NUEVO!
                          </Badge>
                        )}
                        <Badge className={`${getCategoryColor(event.category)} text-white text-xs`}>
                          {getCategoryLabel(event.category)}
                        </Badge>
                      </div>
                      
                      <h4 className={`font-bold mb-2 ${isLarge ? 'text-xl md:text-2xl' : 'text-sm md:text-lg'}`}>
                        {event.title}
                      </h4>
                      
                      {event.eventDate && (
                        <div className="flex items-center text-white/90 text-xs md:text-sm">
                          <Calendar className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                          <span>{formatDate(event.eventDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ComfenalcoSection;
