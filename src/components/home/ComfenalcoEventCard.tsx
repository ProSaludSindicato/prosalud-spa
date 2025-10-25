
import React from 'react';
import { ComfenalcoEvent } from '@/types/comfenalco';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ExternalLink } from 'lucide-react';

interface ComfenalcoEventCardProps {
  event: ComfenalcoEvent;
}

const ComfenalcoEventCard: React.FC<ComfenalcoEventCardProps> = ({ event }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      curso: 'bg-blue-100 text-blue-800',
      experiencia: 'bg-purple-100 text-purple-800',
      beneficio: 'bg-green-100 text-green-800',
      regalo: 'bg-pink-100 text-pink-800',
      recreacion: 'bg-orange-100 text-orange-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Banner Image */}
      <div className="relative">
        <img 
          src={event.banner_image} 
          alt={event.title}
          className="w-full h-48 object-cover"
          loading="lazy"
          width={400}
          height={192}
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className={getCategoryColor(event.category)}>
            {getCategoryLabel(event.category)}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {event.title}
        </h3>
        
        {event.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Dates */}
        <div className="space-y-2 mb-4">
          {event.event_date && (
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2 text-green-600" />
              <span>Evento: {formatDate(event.event_date)}</span>
            </div>
          )}
          {event.registration_deadline && (
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-2 text-orange-600" />
              <span>Inscripción hasta: {formatDate(event.registration_deadline)}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {event.registration_link && (
          <Button 
            className="w-full bg-[#00529B] hover:bg-[#003A70] text-white"
            onClick={() => window.open(event.registration_link, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver más información
          </Button>
        )}
      </div>
    </div>
  );
};

export default ComfenalcoEventCard;
