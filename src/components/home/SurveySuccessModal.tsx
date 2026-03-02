import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, FileText, IdCard } from 'lucide-react';

interface SurveySuccessData {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  created_at?: string;
  message?: string;
}

const SurveySuccessModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [surveyData, setSurveyData] = useState<SurveySuccessData | null>(null);

  useEffect(() => {
    const successData = localStorage.getItem('prosalud-survey-success');
    if (successData) {
      try {
        const parsed = JSON.parse(successData) as SurveySuccessData;
        setSurveyData(parsed);
        setIsOpen(true);
        localStorage.removeItem('prosalud-survey-success');
      } catch (error) {
        console.error('Error parsing survey success data:', error);
      }
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!surveyData) return null;

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      let date: Date;

      if (dateString.includes('/') && dateString.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const [datePart, timePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('/');
        const time = timePart || '00:00:00';
        date = new Date(`${year}-${month}-${day}T${time}`);
      } else if (dateString.includes(' ') && !dateString.includes('T')) {
        date = new Date(dateString.replace(' ', 'T'));
      } else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
        return dateString;
      }

      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
      ];

      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();

      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutesStr = minutes.toString().padStart(2, '0');

      return `${day} de ${month} de ${year}, ${hours}:${minutesStr} ${ampm}`;
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-2xl w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-full p-0 overflow-hidden border-0 shadow-2xl bg-white mx-auto max-h-[95vh] overflow-y-auto [&>button]:bg-white [&>button]:hover:bg-gray-100 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:shadow-md [&>button]:ring-1 [&>button]:ring-gray-300 [&>button]:hover:ring-primary-prosalud [&>button]:opacity-100 [&>button]:z-50 [&>button]:transition-all [&>button]:duration-200 [&>button>svg]:h-4 [&>button>svg]:w-4 [&>button>svg]:text-gray-700 [&>button:hover>svg]:text-primary-prosalud"
        overlayClassName="fixed inset-0 z-50 bg-black/60 supports-[backdrop-filter]:backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      >
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white px-4 sm:px-6 py-3 sm:py-4">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
            </div>
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-xl sm:text-2xl font-bold justify-center text-center text-white mb-1 leading-tight">
                ¡Encuesta enviada exitosamente!
              </DialogTitle>
            </DialogHeader>
            <p className="text-white/90 text-xs sm:text-sm leading-relaxed px-2 mt-1">
              Tu encuesta sociodemográfica ha sido registrada correctamente.
            </p>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
              <img
                src="/images/logo_prosalud_fondo.png"
                alt="ProSalud Logo"
                className="h-8 sm:h-10 w-auto flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-600 font-medium">Tipo de trámite</p>
                <p className="text-xs sm:text-sm font-semibold text-blue-900">
                Encuesta Sociodemográfica y Diagnóstico de Condiciones de Salud
                </p>
              </div>
            </div>

            {/*<div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="h-4 w-4 text-gray-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 font-medium mb-0.5">Número de registro</p>
                  <p className="text-sm sm:text-base font-mono font-bold text-gray-900 break-all">
                    {surveyData.id}
                  </p>
                </div>
              </div>
              {surveyData.created_at && (
                <p className="text-xs text-gray-500">
                  Fecha y hora: {formatDate(surveyData.created_at)}
                </p>
              )}
            </div> */}

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex gap-3">
              <IdCard className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-emerald-900">Datos del afiliado</p>
                <p className="text-xs text-emerald-800">
                  <span className="font-medium">Documento:</span>{' '}
                  {surveyData.tipo_documento}{' '}
                  <span className="font-mono">{surveyData.numero_documento}</span>
                </p>
                {surveyData.message && (
                  <p className="text-xs text-emerald-800">
                    <span className="font-medium">Detalle:</span> {surveyData.message}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg p-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-900 underline">
                  Información importante
                </p>
                <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside leading-relaxed">
                  <li>
                    <strong>Solo debes diligenciar esta encuesta una vez</strong> por afiliado.
                  </li>
                  <li>
                    Si necesitas actualizar tu información más adelante, podrás hacerlo a través de los
                    canales oficiales del sindicato.
                  </li>
                  <li>
                    El suministro de esta información es única y exclusivamente para fines de actividades de seguridad y salud en el trabajo.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-center pt-1">
              <Button
                onClick={handleClose}
                className="bg-primary-prosalud hover:bg-primary-prosalud-dark px-6 py-2 text-xs sm:text-sm font-medium w-full sm:w-auto"
              >
                Entendido
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SurveySuccessModal;

