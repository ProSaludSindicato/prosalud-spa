import React from 'react';
import { Hospital } from 'lucide-react';

const IncapacidadesHeader: React.FC = () => {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-2">
        <Hospital className="h-5 w-5 text-primary-prosalud-dark" />
        <h1 className="text-xl md:text-2xl font-bold text-primary-prosalud-dark">
          Solicitud de Incapacidades y Licencias
        </h1>
      </div>
    </header>
  );
};

export default IncapacidadesHeader;