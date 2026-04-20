import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { DocumentType, ValidationData } from "@/types/assemblyVoting";
import { DOCUMENT_TYPE_LABELS } from "@/types/assemblyVoting";
import { FileText, Hash, Calendar, PenTool, X } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import type { RefObject } from "react";

const fieldShell =
  "min-h-12 rounded-lg border border-input bg-background px-3 text-base shadow-sm transition-[color,box-shadow] focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20";

interface IdentityFieldsetProps {
  formData: ValidationData;
  onChange: (data: ValidationData) => void;
  /** When false, firma no se muestra (p. ej. votación de delegados). Por defecto true (asamblea). */
  showSignature?: boolean;
  signatureRef?: RefObject<SignatureCanvas | null>;
}

export function IdentityFieldset({
  formData,
  signatureRef,
  onChange,
  showSignature = true,
}: IdentityFieldsetProps) {
  const handleClearSignature = () => {
    signatureRef?.current?.clear();
  };

  return (
    <>
      <section
        aria-labelledby="section-datos"
        className="space-y-4 rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-5"
      >
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
            onValueChange={(value: DocumentType) => onChange({ ...formData, documentType: value })}
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
            onChange={(e) => onChange({ ...formData, documentNumber: e.target.value })}
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
            onChange={(e) => onChange({ ...formData, expeditionDate: e.target.value })}
            className={fieldShell}
            required
          />
        </div>
      </section>

      {showSignature ? (
        <section
          aria-labelledby="section-firma"
          className="space-y-3 rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-5"
        >
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
            Use el dedo o el lápiz. La firma se envía al tocar &quot;Ingresar a votación&quot;; no necesita un botón
            aparte para guardarla.
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
      ) : null}
    </>
  );
}
