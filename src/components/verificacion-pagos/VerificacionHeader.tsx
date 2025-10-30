
    import React from 'react';
    import { FileSearch } from 'lucide-react';

    const VerificacionHeader: React.FC = () => {
      return (
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary-prosalud-dark" />
            <h1 className="text-xl md:text-2xl font-bold text-primary-prosalud-dark">
              Verificación de Pagos
            </h1>
          </div>
        </div>
      );
    };

    export default VerificacionHeader;
    