
import React from 'react';
import { Button } from '@/components/ui/button';
import { DownloadCloud } from 'lucide-react';

const DescargarFormatoRetiroSection: React.FC = () => {
  const formatoUrl = "http://orgs.ddns.net:8091/DocPublicos/Modelo%20de%20Plantillas/Solicitud%20de%20Retiro/Formato%20Retiro%20y%20liquidacion.pdf";

  const handleDownload = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevenir el envío del formulario
    window.open(formatoUrl, '_blank');
  };

  return (
    <div className="mb-6 p-6 border-2 border-primary-prosalud rounded-lg shadow-lg bg-primary-prosalud/5 text-center">
      <h2 className="text-xl font-semibold text-primary-prosalud mb-4">Descargar Formato de Retiro</h2>
      <p className="text-gray-700 mb-4">
        Haga clic en el botón de abajo para descargar el formato oficial de solicitud de retiro y compensación final.
      </p>
      <Button
        type="button"
        onClick={handleDownload}
        size="lg"
        className="bg-primary-prosalud hover:bg-primary-prosalud/90 text-white"
      >
        <DownloadCloud className="mr-2 h-5 w-5" />
        Descargar Formato PDF
      </Button>
    </div>
  );
};

export default DescargarFormatoRetiroSection;
