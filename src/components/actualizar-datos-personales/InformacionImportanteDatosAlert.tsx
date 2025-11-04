
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const InformacionImportanteDatosAlert: React.FC = () => {
  return (
    <Alert variant="destructive" className="my-8 bg-amber-50 border-amber-300">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="font-semibold text-amber-700">IMPORTANTE</AlertTitle>
      <AlertDescription className="text-amber-600 space-y-2">
        <p>
          <strong>Información importante sobre la actualización de datos:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Puede actualizar solo los campos que desee modificar. No es necesario completar todas las secciones.</li>
          <li>Si actualiza información bancaria: la certificación debe llegar <strong>ANTES del día 24 del mes</strong> para procesar los registros bancarios y contables. Solo se permiten pagos a la cuenta del afiliado como titular.</li>
          <li>Si actualiza información bancaria: la certificación bancaria debe ser no superior a 1 mes y la cuenta debe estar a nombre del afiliado.</li>
          <li>Si actualiza EPS/AFP: los certificados deben estar vigentes.</li>
          <li>Si actualiza nivel educativo: debe adjuntar tanto el diploma como el acta de grado.</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
};

export default InformacionImportanteDatosAlert;
