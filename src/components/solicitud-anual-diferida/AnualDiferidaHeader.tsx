
import React from 'react';
import { FileText } from 'lucide-react'; // Using FileText as a generic document icon

const AnualDiferidaHeader: React.FC = () => {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary-prosalud-dark" />
        <h1 className="text-xl md:text-2xl font-bold text-primary-prosalud-dark">
          Solicitud - Compensación Anual Diferida
        </h1>
      </div>
    </div>
  );
};

export default AnualDiferidaHeader;
