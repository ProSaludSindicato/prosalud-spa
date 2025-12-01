
import React from 'react';
import { Button } from '@/components/ui/button';
import { DownloadCloud } from 'lucide-react';

const RequisitosDescansoSection: React.FC = () => {
  // Archivos almacenados localmente en public/files/
  const formatoRequisitoUrl = '/files/Procedimiento_Compensación_Anual_de_descanso_P-A-01.pdf';
  const formatoSolicitudUrl = '/files/Solicitud_compensacion_de_Descanso.pdf';

  const handleDownload = (url: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevenir el envío del formulario
    // Codificar la URL para manejar espacios y caracteres especiales correctamente
    const encodedUrl = encodeURI(url);
    window.open(encodedUrl, '_blank');
  };

  return (
    <div className="mb-6 p-6 border-2 border-primary-prosalud rounded-lg shadow-lg bg-primary-prosalud/5 text-center">
      <h2 className="text-xl font-semibold text-primary-prosalud mb-4">Descargar Formatos de Solicitud</h2>
      <p className="text-gray-700 mb-4">
        Descargue los formatos oficiales necesarios para su solicitud de compensación anual por descanso.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          type="button"
          onClick={handleDownload(formatoSolicitudUrl)}
          size="lg"
          className="bg-primary-prosalud hover:bg-primary-prosalud/90 text-white"
        >
          <DownloadCloud className="mr-2 h-5 w-5" />
          Formato Solicitud - PDF
        </Button>
        <Button
          type="button"
          onClick={handleDownload(formatoRequisitoUrl)}
          size="lg"
          variant="outline"
          className="border-primary-prosalud text-primary-prosalud hover:bg-primary-prosalud/10"
        >
          <DownloadCloud className="mr-2 h-5 w-5" />
          Requisitos - PDF
        </Button>
      </div>
    </div>
  );
};

export default RequisitosDescansoSection;
