import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VotingConnectionErrorProps {
  onRetry: () => void;
  isRetrying: boolean;
}

export function VotingConnectionError({ onRetry, isRetrying }: VotingConnectionErrorProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gradient-to-b from-white to-slate-100 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200">
        <WifiOff className="h-10 w-10 text-slate-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800">No pudimos conectarnos</h1>
      <p className="max-w-sm text-slate-600">
        Revise su conexión a internet e intente de nuevo. Si el problema continúa, espere unos minutos.
      </p>
      <Button type="button" size="lg" className="gap-2" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
        {isRetrying ? "Conectando…" : "Reintentar"}
      </Button>
      <img src="/images/logo_prosalud.webp" alt="ProSalud" className="mt-4 h-16 w-16 object-contain opacity-60" />
    </div>
  );
}
