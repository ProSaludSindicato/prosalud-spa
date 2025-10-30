
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Mail } from 'lucide-react';

const InformacionImportanteConsolidada: React.FC = () => {
  return (
    <div className="mb-8 space-y-4">
      <Alert className="border-amber-200 bg-amber-50">
        <Clock className="h-5 w-5 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <div className="space-y-2">
            <div>
              <strong>Tiempos de respuesta:</strong> Su consulta será remitida al área encargada. 
              Los tiempos estimados pueden ser de <strong>hasta 15 días hábiles</strong> para revisar su caso.
            </div>
            <div>
              <strong>Horario de revisión:</strong> Lunes a viernes de 7:00 a.m. a 5:00 p.m. 
              Cualquier registro fuera de este horario se entenderá presentado el día hábil siguiente. 
              Se registran y asignan por orden de llegada.
            </div>
          </div>
        </AlertDescription>
      </Alert>
      
      <Alert className="border-blue-200 bg-blue-50">
        <Mail className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Evite que nuestros correos lleguen a SPAM:</strong> Agregue la cuenta 
          <span className="font-mono bg-blue-100 px-1 rounded mx-1">comunicaciones@sindicatoprosalud.com</span>
          a su lista de contactos y correos deseados.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default InformacionImportanteConsolidada;
