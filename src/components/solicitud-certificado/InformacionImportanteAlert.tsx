
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const InformacionImportanteAlert: React.FC = () => {
  return (
    <Alert variant="default" className="mb-8 bg-blue-50 border-blue-200 text-blue-800">
      <Info className="h-5 w-5 text-blue-600" />
      <AlertTitle className="font-semibold text-blue-700">Información Importante</AlertTitle>
      <AlertDescription>
        El certificado de convenio se enviará al correo electrónico del afiliado. En su mayoría los certificados pueden ser procesados automáticamente y enviados casi de inmediato, mientras que otros que requieren validación adicional por parte de la entidad pueden tardar hasta cinco (5) días hábiles. Estos últimos estarán sujetos a verificación para poder ser emitidos.
        <br />
        <strong className="mt-2 block">Importante:</strong> Si no visualiza el correo, revise su bandeja de SPAM.
      </AlertDescription>
    </Alert>
  );
};

export default InformacionImportanteAlert;
