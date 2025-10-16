import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";

const InformacionImportanteAnualDiferidaAlert: React.FC = () => {
  return (
    <div className="space-y-6 my-8">
      <Alert variant="default" className="bg-blue-50 border-blue-200">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertTitle className="font-semibold text-blue-700">Tenga Presente los Requisitos</AlertTitle>
        <AlertDescription className="text-blue-600">
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>La Solicitud de Compensación Anual Diferida debe de contar con al menos 12 meses provisionados.</li>
            <li>
              Enviar la solicitud con una antelación de al menos treinta (30) días, tiempo estimado para el trámite.
            </li>
            <li>Asegúrese de adjuntar todos los documentos de soporte requeridos según el motivo de su solicitud.</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert variant="destructive" className="bg-amber-50 border-amber-300">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <AlertTitle className="font-semibold text-amber-700">Información Sobre Plazos de Revisión</AlertTitle>
        <AlertDescription className="text-amber-600">
          Si la solicitud es enviada <strong>ANTES del día 24 del mes</strong>, será revisada y en caso de ser aprobada
          será incluida junto con la compensación del mes en curso. En caso de recibirse{" "}
          <strong>posterior a esta fecha</strong>, se aplicará para ser revisada y sería incluida junto con la
          compensación del mes siguiente.
          <br />
          <br />
          <strong>Nota Importante:</strong> El horario de revisión de solicitudes es de lunes a viernes de{" "}
          <strong>7:00 a.m.</strong> a <strong>4:00 p.m.</strong> Cualquier registro vencido el citado horario, se
          entenderá presentado el <strong>siguiente día hábil</strong>. Se registran y asigna su revisión por orden de
          registro.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default InformacionImportanteAnualDiferidaAlert;
