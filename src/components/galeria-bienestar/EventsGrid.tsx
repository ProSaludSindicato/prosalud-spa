
import React from 'react';
import EventCard from '@/components/galeria-bienestar/EventCard';
import { BienestarEvent } from '@/types/admin';

interface EventsGridProps {
  events: BienestarEvent[];
}

const EventsGrid: React.FC<EventsGridProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">No hay eventos para mostrar con los filtros seleccionados.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
};

export default EventsGrid;
