import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, FileText, Mail, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface RequestSuccessData {
  id: string;
  request_type: string;
  message?: string;
  created_at?: string;
}

const RequestSuccessModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [requestData, setRequestData] = useState<RequestSuccessData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check for success data in localStorage on mount
    const successData = localStorage.getItem('prosalud-request-success');
    if (successData) {
      try {
        const parsed = JSON.parse(successData) as RequestSuccessData;
        setRequestData(parsed);
        setIsOpen(true);
        // Remove from localStorage after reading
        localStorage.removeItem('prosalud-request-success');
      } catch (error) {
        console.error('Error parsing request success data:', error);
      }
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleCopyRadicado = () => {
    if (requestData?.id) {
      navigator.clipboard.writeText(requestData.id);
      setCopied(true);
      toast.success('Número de radicado copiado', {
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!requestData) return null;

  // Format request type for display
  const getRequestTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'certificado-convenio': 'Certificado de Convenio',
      'compensacion-descanso': 'Compensación por Descanso',
      'compensacion-anual': 'Compensación Anual Diferida',
      'incapacidad-licencia': 'Incapacidad/Licencia',
      'actualizar-datos-personales': 'Actualización de Datos Personales',
      'solicitud-microcredito': 'Solicitud de Microcrédito',
      'verificacion-pagos': 'Verificación de Pagos',
      'actualizar-cuenta-bancaria': 'Actualización de Cuenta Bancaria',
      'solicitud-retiro-sindical': 'Retiro Sindical',
    };
    return labels[type] || type;
  };

  // Format date if available
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      // Handle different date formats from the API
      // Format 1: "2024-01-15 10:30:45" (SQL datetime)
      // Format 2: "2024-01-15T10:30:45.000000Z" (ISO 8601)
      // Format 3: "07/01/2026 09:06:50" (DD/MM/YYYY)
      let date: Date;
      
      // Handle DD/MM/YYYY format
      if (dateString.includes('/') && dateString.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const [datePart, timePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('/');
        const time = timePart || '00:00:00';
        date = new Date(`${year}-${month}-${day}T${time}`);
      }
      // If it's in format "YYYY-MM-DD HH:mm:ss", replace space with T for ISO parsing
      else if (dateString.includes(' ') && !dateString.includes('T')) {
        date = new Date(dateString.replace(' ', 'T'));
      } else {
        date = new Date(dateString);
      }
      
      // Validate date
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      // Format date and time manually for better control
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
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
        {/* Header with success styling */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white px-4 sm:px-6 py-3 sm:py-4">
          <div className="text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-3">
              <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
            </div>
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-xl sm:text-2xl font-bold justify-center text-center text-white mb-1 leading-tight">
                ¡Solicitud Recibida Exitosamente!
              </DialogTitle>
            </DialogHeader>
            <p className="text-white/90 text-xs sm:text-sm leading-relaxed px-2 mt-1">
              Su solicitud ha sido procesada correctamente
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="space-y-3">
            {/* Request Type with Logo */}
            <div className="flex items-center gap-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
              <img 
                src="/images/logo_prosalud_fondo.png" 
                alt="ProSalud Logo" 
                className="h-8 sm:h-10 w-auto flex-shrink-0" 
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-600 font-medium">Tipo de Solicitud</p>
                <p className="text-xs sm:text-sm font-semibold text-blue-900">
                  {getRequestTypeLabel(requestData.request_type)}
                </p>
              </div>
            </div>

            {/* Número de Radicado */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="h-4 w-4 text-gray-600 flex-shrink-0" />
                <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 font-medium mb-0.5">Número de Radicado</p>
                    <p className="text-sm sm:text-base font-mono font-bold text-gray-900 break-all">
                      {requestData.id}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyRadicado}
                    className="flex-shrink-0 h-8 text-xs px-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Copiar</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {requestData.created_at && (
                <p className="text-xs text-gray-500">
                  Fecha y hora: {formatDate(requestData.created_at)}
                </p>
              )}
            </div>

            {/* Important Information */}
            <div className="rounded-lg p-3">
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-semibold text-gray-900 underline">
                    Información Importante
                  </p>
                  <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside leading-relaxed">
                    <li>
                      <strong>Guarde este número de radicado</strong> para futuras consultas sobre su solicitud.
                    </li>
                    <li>
                      Recibirá un correo electrónico de confirmación en los próximos minutos. 
                      Si no lo visualiza, <strong>revise su bandeja de SPAM o correo no deseado</strong>.
                    </li>
                    <li>
                      El procesamiento de su solicitud se realizará según los plazos establecidos para cada tipo de trámite.
                    </li>
                    <li>
                      Solo nos comunicaremos con usted si se presenta alguna inconsistencia o se requiere información adicional.
                    </li>
                    <li>
                      <strong>Recordatorio:</strong> Asegúrese de que su correo electrónico esté actualizado en el sistema. El correo de confirmación será enviado a la dirección registrada en su perfil.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Button */}
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

export default RequestSuccessModal;

