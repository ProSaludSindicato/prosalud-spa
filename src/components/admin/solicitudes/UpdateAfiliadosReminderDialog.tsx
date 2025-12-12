import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, ExternalLink, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { FILE_PERMISSIONS } from "@/config/permissions";

interface UpdateAfiliadosReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadClick?: () => void;
}

/**
 * Diálogo de recordatorio para actualizar información de afiliados
 * después de completar una solicitud de actualización de datos personales.
 * 
 * Recuerda al usuario interno que debe actualizar la información de afiliados
 * usando el reporte Excel generado desde ProSanet para que los cambios se reflejen
 * en el sistema y las futuras respuestas se envíen al correo correcto.
 */
export const UpdateAfiliadosReminderDialog: React.FC<UpdateAfiliadosReminderDialogProps> = ({
  open,
  onOpenChange,
  onUploadClick,
}) => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canUpdateAfiliados = can(FILE_PERMISSIONS.afiliados);

  const handleGoToDashboard = () => {
    onOpenChange(false);
    navigate("/admin");
  };

  const handleUploadClick = () => {
    if (onUploadClick) {
      onUploadClick();
    } else {
      // Si no hay callback, navegar al dashboard
      handleGoToDashboard();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Info className="h-5 w-5 text-blue-600" />
            Recordatorio: Actualizar Información de Afiliados
          </DialogTitle>
          <DialogDescription className="text-base">
            Importante: Para que los cambios se reflejen correctamente en el sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900 font-semibold">
              Actualización de datos completada
            </AlertTitle>
            <AlertDescription className="text-blue-800 mt-2">
              <p className="mb-3">
                La solicitud de actualización de datos personales ha sido procesada exitosamente.
                Sin embargo, para que los cambios se reflejen en el sistema y las futuras respuestas
                se envíen al correo correcto, es necesario actualizar la información de afiliados.
              </p>
              <p className="font-medium">
                Por favor, actualiza la información de afiliados usando el reporte Excel generado
                desde ProSanet en la opción "Actualizar afiliados" del módulo Dashboard.
              </p>
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">Pasos a seguir:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Genera el reporte Excel desde ProSanet con la información actualizada de afiliados</li>
              <li>Accede al módulo Dashboard en ProSalud</li>
              <li>Haz clic en "Actualizar afiliados"</li>
              <li>Sube el archivo Excel generado desde ProSanet</li>
              <li>Confirma la actualización</li>
            </ol>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Recordar más tarde
          </Button>
          {canUpdateAfiliados ? (
            <>
              <Button
                variant="default"
                onClick={handleGoToDashboard}
                className="w-full sm:w-auto bg-primary-prosalud hover:bg-primary-prosalud-dark"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ir al Dashboard
              </Button>
            </>
          ) : (
            <Button
                variant="default"
              onClick={handleGoToDashboard}
                className="w-full sm:w-auto bg-primary-prosalud hover:bg-primary-prosalud-dark"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ir al Dashboard
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
