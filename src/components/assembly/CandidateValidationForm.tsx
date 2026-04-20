import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ValidationData, UserSession } from "@/types/assemblyVoting";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { checkDelegateVoteStatus, searchCandidateVoting } from "@/services/publicDelegateCandidateVotingApi";
import { IdentityFieldset } from "@/components/assembly/shared/IdentityFieldset";

interface CandidateValidationFormProps {
  onValidation: (session: UserSession) => void;
}

const errorToastStyle = {
  background: "hsl(0 84.2% 60.2%)",
  color: "white",
  border: "none",
};

export function CandidateValidationForm({ onValidation }: CandidateValidationFormProps) {
  const [formData, setFormData] = useState<ValidationData>({
    documentType: "CC",
    documentNumber: "",
    expeditionDate: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.documentNumber || !formData.expeditionDate) {
      toast.error("Por favor complete todos los campos", { style: errorToastStyle });
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
      const searchResult = await searchCandidateVoting({
        tipoDocumento: formData.documentType,
        documento: formData.documentNumber,
        fechaExpedicion: formData.expeditionDate,
      });

      if (!searchResult.success) {
        if (searchResult.errors) {
          const errorMessages = Object.values<string | string[]>(searchResult.errors).flat().join(", ");
          throw new Error(errorMessages || "Error al validar usuario");
        }
        throw new Error(searchResult.message || "Error al validar usuario");
      }

      if (!searchResult.found || !searchResult.data) {
        toast.error("Documento no encontrado o no autorizado para votar", {
          duration: 10000,
          style: { ...errorToastStyle, fontSize: "15px" },
          classNames: { description: "text-white opacity-95 text-[14px]" },
        });
        return;
      }

      const affiliateName = searchResult.data.nombre_apellidos?.trim();
      const hospital = searchResult.data.hospital?.trim();
      if (!affiliateName || !hospital) {
        throw new Error("No se encontró la información del afiliado en la respuesta.");
      }

      const voteStatus = await checkDelegateVoteStatus(formData.documentType, formData.documentNumber);
      const hasVoted = voteStatus.success === true && voteStatus.has_voted === true;

      const session: UserSession = {
        hospital,
        position: affiliateName,
        documentType: formData.documentType,
        documentNumber: formData.documentNumber,
        hasVoted,
      };

      toast.success(`¡Bienvenido, ${affiliateName}!`, {
        style: { background: "hsl(122 39% 49%)", color: "white", border: "none" },
      });

      onValidation(session);
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
            Elección de delegados — ingrese sus datos para continuar
          </p>
        </header>

        <form id="candidate-validation-form" onSubmit={handleSubmit} className="flex flex-col gap-5 sm:gap-6">
          <IdentityFieldset showSignature={false} formData={formData} onChange={setFormData} />
        </form>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200/80 bg-white/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-white/85 sm:static sm:inset-auto sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:pb-8 sm:pt-2 sm:shadow-none sm:backdrop-blur-none">
        <div className="mx-auto w-full max-w-lg sm:px-4">
          <Button
            type="submit"
            form="candidate-validation-form"
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
