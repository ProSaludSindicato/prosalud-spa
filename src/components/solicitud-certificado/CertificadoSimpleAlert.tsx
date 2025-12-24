import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

interface CertificadoSimpleAlertProps {
  isSimple: boolean;
  tieneValorCompensaciones?: boolean;
}

const CertificadoSimpleAlert: React.FC<CertificadoSimpleAlertProps> = ({ isSimple, tieneValorCompensaciones }) => {
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
          <strong className="font-semibold"> Recibirá el certificado en su correo electrónico casi de inmediato</strong> después de enviar la solicitud.
        </p>
        {tieneValorCompensaciones && (
          <p className="mb-2 mt-2 text-sm italic">
            Los certificados de convenio con valor de compensaciones para afiliados activos, en su mayoría (si no son casos particulares) también podrán ser enviados de manera automática.
          </p>
        )}
        <p className="font-semibold mt-2">
          ⚠️ Importante: Asegúrese de que su <u>correo electrónico</u> esté actualizado en el sistema, 
          ya que el certificado se enviará automáticamente a la dirección registrada.
        </p>
        <p className="mt-2 text-sm">
          <strong>Nota:</strong> Si no visualiza el correo, revise su bandeja de SPAM.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default CertificadoSimpleAlert;

