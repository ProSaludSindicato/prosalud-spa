import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { ValidationData, UserSession } from "@/types/assemblyVoting";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { buildPublicApiUrl } from "@/config/api";
import { IdentityFieldset } from "@/components/assembly/shared/IdentityFieldset";

interface AssemblyValidationFormProps {
  onValidation: (session: UserSession) => void;
}

const errorToastStyle = {
  background: "hsl(0 84.2% 60.2%)",
  color: "white",
  border: "none",
};

export function AssemblyValidationForm({ onValidation }: AssemblyValidationFormProps) {
  const [formData, setFormData] = useState<ValidationData>({
    documentType: "CC",
    documentNumber: "",
    expeditionDate: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.documentNumber || !formData.expeditionDate) {
      toast.error("Por favor complete todos los campos", { style: errorToastStyle });
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast.error("Dibuje su firma en el recuadro", { style: errorToastStyle });
      return;
    }

    if (formData.documentNumber.length < 6) {
      toast.error("El número de documento debe tener al menos 6 dígitos", { style: errorToastStyle });
      return;
    }

    if (!/^\d+$/.test(formData.documentNumber)) {
      toast.error("El número de documento solo debe contener números", { style: errorToastStyle });
      return;
    }

    const expeditionDate = new Date(formData.expeditionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expeditionDate > today) {
      toast.error("La fecha de expedición no puede ser futura", { style: errorToastStyle });
      return;
    }

    setIsLoading(true);

    try {
      const signaturePayload = signatureRef.current.toDataURL("image/png");

      const response = await fetch(buildPublicApiUrl("/api/activos/search-hospital"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documento: formData.documentNumber,
          fecha_expedicion: formData.expeditionDate,
          signature: signaturePayload,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        if (data?.errors) {
          const errorMessages = Object.values<string | string[]>(data.errors).flat().join(", ");
          throw new Error(errorMessages || "Error al validar usuario");
        }
        throw new Error(data?.message || `Error al validar usuario (${response.status})`);
      }

      if (data.found && data.data) {
        const delegateName = data.data.nombre_apellidos?.trim();
        if (!delegateName) {
          throw new Error("No se encontró el nombre del delegado en la respuesta.");
        }

        const session: UserSession = {
          hospital: "ASAMBLEA GENERAL",
          position: delegateName,
          documentType: formData.documentType,
          documentNumber: formData.documentNumber,
          hasVoted: false,
        };

        toast.success(`¡Bienvenido, ${delegateName}!`, {
          style: { background: "hsl(122 39% 49%)", color: "white", border: "none" },
        });

        onValidation(session);
      } else {
        toast.error("Documento no encontrado o no autorizado para votar", {
          duration: 10000,
          style: { ...errorToastStyle, fontSize: "15px" },
          classNames: {
            description: "text-white opacity-95 text-[14px]",
            actionButton: "bg-white text-red-600 hover:bg-white/90 font-medium text-[14px] px-4",
          },
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado al validar", { style: errorToastStyle });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-white via-slate-50 to-slate-100/90">
      <div className="mx-auto w-full max-w-lg flex-1 px-3 pb-28 pt-4 sm:px-4 sm:pb-10 sm:pt-6">
        <header className="pb-4 text-center sm:pb-6">
          <div className="mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center sm:h-28 sm:w-28">
            <img src="/images/logo_prosalud.webp" alt="ProSalud" className="h-full w-full object-contain" />
          </div>
          <h1 className="mt-2 text-balance text-xl font-bold tracking-tight text-primary sm:text-2xl">
            Votación ProSalud
          </h1>
          <p className="mt-1 text-pretty text-sm text-muted-foreground sm:text-base">
            Asamblea General — ingrese sus datos y firme para continuar
          </p>
        </header>

        <form id="assembly-validation-form" onSubmit={handleSubmit} className="flex flex-col gap-5 sm:gap-6">
          <IdentityFieldset formData={formData} signatureRef={signatureRef} onChange={setFormData} />
        </form>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200/80 bg-white/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-white/85 sm:static sm:inset-auto sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:pb-8 sm:pt-2 sm:shadow-none sm:backdrop-blur-none">
        <div className="mx-auto w-full max-w-lg sm:px-4">
          <Button
            type="submit"
            form="assembly-validation-form"
            size="lg"
            className="h-12 w-full touch-manipulation text-base font-semibold shadow-md sm:h-11"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Validando…
              </>
            ) : (
              "Ingresar a votación"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
