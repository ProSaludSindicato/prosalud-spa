import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Mail, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiRequest } from "@/services/requestsApi";
import { useNavigate } from "react-router-dom";

interface PendingDataUpdateAlertProps {
  pendingUpdate: ApiRequest;
  documentNumber: string;
  onViewUpdate?: () => void;
  variant?: "default" | "warning" | "destructive";
}

/**
 * Componente de alerta que muestra cuando un afiliado tiene una solicitud pendiente
 * de actualización de datos personales.
 * 
 * Muestra información sobre el nuevo correo y teléfono si están disponibles.
 */
export const PendingDataUpdateAlert: React.FC<PendingDataUpdateAlertProps> = ({
  pendingUpdate,
  documentNumber,
  onViewUpdate,
  variant = "warning",
}) => {
  const navigate = useNavigate();

  const payload = pendingUpdate.payload || {};
  // El correo puede estar en 'correo', 'nuevoEmail' o 'nuevo_email'
  const nuevoEmailRaw = payload.correo || payload.nuevoEmail || payload.nuevo_email;
  // Si no hay correo nuevo, usar el correo actual de la solicitud (no hay cambio)
  const nuevoEmail = nuevoEmailRaw && nuevoEmailRaw.trim() !== '' ? nuevoEmailRaw : pendingUpdate.email;
  const hayCambioCorreo = nuevoEmailRaw && nuevoEmailRaw.trim() !== '' && nuevoEmailRaw !== pendingUpdate.email;
  
  // El teléfono puede estar en 'celular', 'nuevoTelefono' o 'nuevo_telefono'
  const nuevoTelefonoRaw = payload.celular || payload.nuevoTelefono || payload.nuevo_telefono;
  // Si no hay teléfono nuevo, usar el teléfono actual de la solicitud (no hay cambio)
  const nuevoTelefono = nuevoTelefonoRaw && nuevoTelefonoRaw.trim() !== '' ? nuevoTelefonoRaw : pendingUpdate.phone_number;
  const hayCambioTelefono = nuevoTelefonoRaw && nuevoTelefonoRaw.trim() !== '' && nuevoTelefonoRaw !== pendingUpdate.phone_number;

  const handleViewUpdate = () => {
    if (onViewUpdate) {
      onViewUpdate();
    } else {
      // Navegar a la solicitud de actualización
      navigate(`/admin/solicitudes?view=${pendingUpdate.id}`);
    }
  };

  const variantStyles = {
    default: "border-blue-300 bg-blue-50 text-blue-800",
    warning: "border-amber-400 bg-amber-50 text-amber-800",
    destructive: "border-red-400 bg-red-50 text-red-800",
  };

  const iconColors = {
    default: "text-blue-600",
    warning: "text-amber-600",
    destructive: "text-red-600",
  };

  return (
    <Alert className={`${variantStyles[variant]} mb-4`}>
      <AlertTriangle className={`h-5 w-5 ${iconColors[variant]}`} />
      <AlertTitle className="font-semibold text-left">
        ⚠️ Actualización de Datos Personales Pendiente
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2 text-left">
        <p className="font-medium">
          Este afiliado tiene una solicitud pendiente de actualización de datos personales.
          Se recomienda procesarla antes de responder a otras solicitudes para evitar enviar
          respuestas al correo incorrecto.
        </p>

        {(nuevoEmail || nuevoTelefono) && (
          <div className="mt-3 space-y-1.5 text-sm">
            {nuevoEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>
                  <strong>{hayCambioCorreo ? 'Nuevo correo:' : 'Correo actual:'}</strong> {nuevoEmail}
                  {!hayCambioCorreo && <span className="text-xs text-gray-600 ml-1">(sin cambios)</span>}
                </span>
              </div>
            )}
            {nuevoTelefono && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>
                  <strong>{hayCambioTelefono ? 'Nuevo teléfono:' : 'Teléfono actual:'}</strong> {nuevoTelefono}
                  {!hayCambioTelefono && <span className="text-xs text-gray-600 ml-1">(sin cambios)</span>}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewUpdate}
            className="text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Ver solicitud de actualización
          </Button>
        </div>

        <p className="text-xs mt-2 italic">
          Solicitud #{pendingUpdate.id} - Creada el{" "}
          {new Date(pendingUpdate.created_at).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </AlertDescription>
    </Alert>
  );
};

/**
 * Versión compacta del alert para usar en listas o tablas
 */
export const PendingDataUpdateBadge: React.FC<{
  hasPendingUpdate: boolean;
  onClick?: () => void;
}> = ({ hasPendingUpdate, onClick }) => {
  if (!hasPendingUpdate) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors"
      title="Este afiliado tiene una actualización de datos personales pendiente"
    >
      <AlertTriangle className="h-3 w-3" />
      Actualización pendiente
    </button>
  );
};
