import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, IdCard } from 'lucide-react';

export interface VaccinationSurveySuccessData {
  message?: string;
  id?: number;
  created_at?: string;
  tipo_documento: string;
  numero_documento: string;
}

interface VaccinationSurveySuccessModalProps {
  open: boolean;
  onClose: () => void;
  data: VaccinationSurveySuccessData | null;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
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
    hours = hours || 12;
    const minutesStr = minutes.toString().padStart(2, '0');
    return `${day} de ${month} de ${year}, ${hours}:${minutesStr} ${ampm}`;
  } catch {
    return dateString;
  }
}

const VaccinationSurveySuccessModal: React.FC<VaccinationSurveySuccessModalProps> = ({
  open,
  onClose,
  data,
}) => {
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
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
              {data.message ?? 'Su encuesta de verificación de vacunación ha sido registrada correctamente.'}
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
                  Encuesta de verificación de vacunación
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 flex gap-3">
              <IdCard className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-emerald-900">Datos del afiliado</p>
                <p className="text-xs text-emerald-800">
                  <span className="font-medium">Documento:</span>{' '}
                  {data.tipo_documento} <span className="font-mono">{data.numero_documento}</span>
                </p>
                {data.created_at && (
                    <p className="text-xs text-gray-500">
                      Fecha y hora: {formatDate(data.created_at)}
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
                    El registro de vacunación es de carácter obligatorio según normativa vigente.
                  </li>
                  <li>
                    Si necesitas actualizar las fechas de aplicación, podrás hacerlo a través de los
                    canales oficiales del sindicato.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-center pt-1">
              <Button
                onClick={onClose}
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

export default VaccinationSurveySuccessModal;
