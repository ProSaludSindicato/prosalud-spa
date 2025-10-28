
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BienestarEvent } from '@/types/admin';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EventCardProps {
  event: BienestarEvent;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  // Encontrar la imagen principal o usar la primera imagen disponible
  const mainImage = event.images?.find(img => img.isMain) || event.images?.[0];
  
  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out animate-fadeIn">
      <CardHeader className="p-0">
        {mainImage ? (
          <img 
            src={mainImage.url} 
            alt={mainImage.alt || event.title} 
            className="w-full h-48 object-cover" 
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">Sin imagen</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <CardTitle className="text-lg font-semibold mb-2 text-primary-prosalud line-clamp-2">{event.title}</CardTitle>
        <div className="flex items-center text-sm text-muted-foreground mb-1">
          <CalendarDays size={16} className="mr-2" />
          <span>{new Date(event.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        {event.category && (
          <Badge variant="outline" className="text-xs mb-2">{event.category}</Badge>
        )}
        {event.description && (
          <p className="text-sm text-gray-700 line-clamp-3">{event.description}</p>
        )}
      </CardContent>
      <CardFooter className="p-4 border-t">
        <Link 
          to={`/servicios/galeria-bienestar/${event.id}`}
          className="text-sm font-medium text-primary-prosalud hover:text-secondary-prosaludgreen flex items-center"
        >
          Ver Detalles
          <ChevronRight size={18} className="ml-1" />
        </Link>
      </CardFooter>
    </Card>
  );
};

export default EventCard;
