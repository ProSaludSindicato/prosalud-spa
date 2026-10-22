import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildPortalUrl } from "@/config/site";
import { logger } from "@/utils/logger";

const PUBLIC_VOTING_PATHS = {
  candidate: "/votacion-delegados",
  assembly: "/asamblea",
} as const;

interface PublicVotingLinkProps {
  mode: keyof typeof PUBLIC_VOTING_PATHS;
  label?: string;
}

export function PublicVotingLink({ mode, label = "Enlace para compartir" }: PublicVotingLinkProps) {
  const [copied, setCopied] = useState(false);
  const url = buildPortalUrl(PUBLIC_VOTING_PATHS[mode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Enlace copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error("Error al copiar enlace de votación", error instanceof Error ? error.message : error);
      toast.error("No se pudo copiar el enlace. Selecciónelo y cópielo manualmente.");
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          aria-label={label}
          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-800"
        />
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="shrink-0" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Abrir enlace en una pestaña nueva">
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </Button>
      </div>
    </div>
  );
}
