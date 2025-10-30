
import React from 'react';
import { Calendar } from 'lucide-react';

const DescansoHeader: React.FC = () => {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary-prosalud-dark" />
        <h1 className="text-xl md:text-2xl font-bold text-primary-prosalud-dark">
          Solicitud - Compensación Anual por Descanso
        </h1>
      </div>
    </div>
  );
};

export default DescansoHeader;
