
    import React from 'react';
    import { FileText } from 'lucide-react';

    const SolicitudHeader: React.FC = () => {
      return (
        <header className="mb-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-prosalud-dark" />
            <h1 className="text-xl md:text-2xl font-bold text-primary-prosalud-dark tracking-tight">
              Solicitud de Certificado de Convenio Sindical
            </h1>
          </div>
        </header>
      );
    };

    export default SolicitudHeader;
    