import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Clock, Calendar, CheckCircle } from "lucide-react";

const InformacionImportanteDescansoAlert: React.FC = () => {
  return (
    <div className="space-y-4 mb-8">
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Tenga presente los requisitos para solicitar Compensación Anual por Descanso:</strong>
          <ul className="mt-2 space-y-2 list-disc list-inside">
            <li>
              Enviar la solicitud con una antelación de al menos treinta (30) días a la fecha de salida, no mayor a 60
              días
            </li>
            <li>
              Es muy importante que la solicitud cuente con el V°B° del Coordinador de ProSalud en su sede. Toda
              solicitud debe de contar con este requisito.
            </li>
            <li>
              Para la Compensación Anual por Descanso debe de contar con al menos 12 meses provisionados (6 meses para
              Tec de RX).
            </li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert className="border-amber-200 bg-amber-50">
        <Calendar className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Fechas de procesamiento:</strong> Si la solicitud es enviada ANTES del día 24 del mes, será revisada y
          en caso de ser aprobada será incluida junto con la compensación del mes en curso; en caso de recibirse
          posterior a esta fecha, se aplicará para ser revisada y sería incluida junto con la compensación del mes
          siguiente.
        </AlertDescription>
      </Alert>

      <Alert className="border-gray-200 bg-gray-50">
        <Clock className="h-4 w-4 text-gray-600" />
        <AlertDescription className="text-gray-800">
          <strong>Nota Importante:</strong> El horario de revisión de solicitudes es de lunes a viernes de 7:00 a.m. a
          4:00 p.m., cualquier registro vencido el citado horario, se entenderá presentado el siguiente día hábil. Se
          registran y asigna su revisión por orden de registro.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default InformacionImportanteDescansoAlert;
