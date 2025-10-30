
import React from 'react';
import { Landmark } from 'lucide-react';

const ActualizarCuentaHeader: React.FC = () => {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <Landmark className="h-5 w-5 text-primary-prosalud-dark" />
        <h1 className="text-xl md:text-2xl font-bold text-primary-prosalud-dark">
          Solicitud - Cambio de Cuenta Bancaria
        </h1>
      </div>
    </div>
  );
};

export default ActualizarCuentaHeader;
