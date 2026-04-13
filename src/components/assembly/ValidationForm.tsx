import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentType, ValidationData, UserSession } from "@/types/assemblyVoting";
import { DOCUMENT_TYPE_LABELS } from "@/types/assemblyVoting";
import { toast } from "sonner";
import { FileText, Hash, Calendar, Loader2, PenTool, X } from "lucide-react";
import { useVotingMode } from "@/context/VotingModeContext";
import SignatureCanvas from "react-signature-canvas";
import { buildPublicApiUrl } from "@/config/api";

interface ValidationFormProps {
  onValidation: (session: UserSession) => void;
}

const fieldShell =
  "min-h-12 rounded-lg border border-input bg-background px-3 text-base shadow-sm transition-[color,box-shadow] focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20";

export const ValidationForm = ({ onValidation }: ValidationFormProps) => {
  const { mode } = useVotingMode();
  const [formData, setFormData] = useState<ValidationData>({
    documentType: "CC",
    documentNumber: "",
    expeditionDate: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);

  const handleClearSignature = () => {
    signatureRef.current?.clear();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.documentNumber || !formData.expeditionDate) {
      toast.error("Por favor complete todos los campos", {
        style: {
          background: "hsl(0 84.2% 60.2%)",
          color: "white",
          border: "none",
        },
      });
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast.error("Dibuje su firma en el recuadro", {
        style: {
          background: "hsl(0 84.2% 60.2%)",
          color: "white",
          border: "none",
        },
      });
      return;
    }

    const signaturePayload = signatureRef.current.toDataURL("image/png");

    if (formData.documentNumber.length < 6) {
      toast.error("El número de documento debe tener al menos 6 dígitos", {
        style: {
          background: "hsl(0 84.2% 60.2%)",
          color: "white",
          border: "none",
        },
      });
      return;
    }

    if (!/^\d+$/.test(formData.documentNumber)) {
      toast.error("El número de documento solo debe contener números", {
        style: {
          background: "hsl(0 84.2% 60.2%)",
          color: "white",
          border: "none",
        },
      });
      return;
    }

    const expeditionDate = new Date(formData.expeditionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expeditionDate > today) {
      toast.error("La fecha de expedición no puede ser futura", {
        style: {
          background: "hsl(0 84.2% 60.2%)",
          color: "white",
          border: "none",
        },
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(buildPublicApiUrl("/api/activos/search-hospital"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documento: formData.documentNumber,
          fecha_expedicion: formData.expeditionDate,
          signature: signaturePayload,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        if (data?.errors) {
          const errorMessages = Object.values<string | string[]>(data.errors)
            .flat()
            .join(", ");
          throw new Error(errorMessages || "Error al validar usuario");
        }
        throw new Error(data?.message || `Error al validar usuario (${response.status})`);
      }

      if (import.meta.env.DEV) {
        console.log("Validation response:", data);
      }

      if (data.found && data.data) {
        const delegateName = data.data.nombre_apellidos?.trim();
        if (!delegateName) {
          throw new Error("No se encontró el nombre del delegado en la respuesta.");
        }
        let hasVoted = false;

        if (mode.type === "CANDIDATE") {
          hasVoted = false;
        }

        const session: UserSession = {
          hospital: "ASAMBLEA GENERAL",
          position: delegateName,
          documentType: formData.documentType,
          documentNumber: formData.documentNumber,
          hasVoted,
        };

        toast.success(`¡Bienvenido, ${delegateName}!`, {
          description: "",
          style: {
            background: "hsl(122 39% 49%)",
            color: "white",
            border: "none",
          },
        });

        onValidation(session);
      } else {
        console.warn("Usuario no válido:", data);

        toast.error("Documento no encontrado o no autorizado para votar", {
          description: "",
          duration: 10000,
          style: {
            background: "hsl(0 84.2% 60.2%)",
            color: "white",
            border: "none",
            fontSize: "15px",
          },
          classNames: {
            description: "text-white opacity-95 text-[14px]",
            actionButton: "bg-white text-red-600 hover:bg-white/90 font-medium text-[14px] px-4",
          },
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado al validar", {
        style: {
          background: "hsl(0 84.2% 60.2%)",
          color: "white",
          border: "none",
        },
      });
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
          <section aria-labelledby="section-datos" className="space-y-4 rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-5">
            <h2 id="section-datos" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Identificación
            </h2>

            <div className="space-y-2">
              <Label htmlFor="documentType" className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                Tipo de documento
              </Label>
              <Select
                value={formData.documentType}
                onValueChange={(value: DocumentType) => setFormData({ ...formData, documentType: value })}
              >
                <SelectTrigger id="documentType" className={fieldShell}>
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[min(70vh,320px)]">
                  <SelectItem value="CC">CC — {DOCUMENT_TYPE_LABELS.CC}</SelectItem>
                  <SelectItem value="CE">CE — {DOCUMENT_TYPE_LABELS.CE}</SelectItem>
                  <SelectItem value="PT">PT — {DOCUMENT_TYPE_LABELS.PT}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentNumber" className="flex items-center gap-2 text-sm font-medium">
                <Hash className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                Número de documento
              </Label>
              <Input
                id="documentNumber"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Solo números, sin puntos"
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                className={fieldShell}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expeditionDate" className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                Fecha de expedición
              </Label>
              <Input
                id="expeditionDate"
                type="date"
                value={formData.expeditionDate}
                onChange={(e) => setFormData({ ...formData, expeditionDate: e.target.value })}
                className={fieldShell}
                required
              />
            </div>
          </section>

          <section aria-labelledby="section-firma" className="space-y-3 rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 id="section-firma" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <PenTool className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                Firma en pantalla
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearSignature}
                className="h-10 min-h-10 shrink-0 touch-manipulation px-3 sm:h-9"
              >
                <X className="h-4 w-4" aria-hidden />
                Borrar firma
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Use el dedo o el lápiz. La firma se envía al tocar &quot;Ingresar a votación&quot;; no necesita un botón aparte para guardarla.
            </p>
            <div
              className="relative overflow-hidden rounded-xl border-2 border-dashed border-primary/35 bg-white shadow-inner ring-1 ring-primary/10"
              style={{ touchAction: "none" }}
            >
              <SignatureCanvas
                ref={signatureRef}
                penColor="#003A70"
                minWidth={0.8}
                maxWidth={2.4}
                canvasProps={{
                  className: "block h-[min(42vh,14rem)] w-full cursor-crosshair touch-none sm:h-52",
                }}
                backgroundColor="rgb(255 255 255)"
              />
            </div>
          </section>
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
};
