import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

interface CertificadoSimpleAlertProps {
  isSimple: boolean;
}

const CertificadoSimpleAlert: React.FC<CertificadoSimpleAlertProps> = ({ isSimple }) => {
  if (!isSimple) return null;

  return (
    <Alert variant="default" className="mb-8 bg-emerald-50 border-emerald-200 text-emerald-800">
      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      <AlertTitle className="font-semibold text-emerald-700">
        Envío Automático - Certificado de Convenio Sindical
      </AlertTitle>
      <AlertDescription className="text-emerald-800">
        <p className="mb-2">
          Su solicitud cumple con las condiciones para ser procesada automáticamente. 
          <strong className="font-semibold"> Recibirá el certificado en su correo electrónico en los próximos minutos</strong> después de enviar la solicitud.
        </p>
        <p className="font-semibold mt-2">
          ⚠️ Importante: Asegúrese de que su correo electrónico esté actualizado en el sistema, 
          ya que el certificado se enviará automáticamente a la dirección registrada.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default CertificadoSimpleAlert;

