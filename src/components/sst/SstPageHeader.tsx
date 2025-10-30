
    import React from 'react';
    import { ShieldCheck } from 'lucide-react';

    const SstPageHeader: React.FC = () => {
      return (
        <header className="mb-6 animate-fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary-prosalud-dark" />
            <h1 className="text-xl md:text-2xl font-bold text-primary-prosalud-dark tracking-tight">
              Seguridad y Salud en el Trabajo (SST)
            </h1>
          </div>
        </header>
      );
    };

    export default SstPageHeader;
    