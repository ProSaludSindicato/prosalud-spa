import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, UserX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { assemblyApi } from "@/services/assemblyApi";
import type { AssemblyProxyRecord } from "@/types/assembly";

interface AssemblyProxiesCardProps {
  assemblyId: string | undefined;
  canRevoke: boolean;
}

const formatDateTime = (value: string | null): string =>
  value ? new Date(value).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "—";

/**
 * Poderes declarados por los delegados al registrar asistencia: quién representa a quién y cuántos votos emitió.
 */
export function AssemblyProxiesCard({ assemblyId, canRevoke }: AssemblyProxiesCardProps) {
  const [proxies, setProxies] = useState<AssemblyProxyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [proxyToRevoke, setProxyToRevoke] = useState<AssemblyProxyRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [isRevoking, setIsRevoking] = useState(false);

  const loadProxies = useCallback(async () => {
    if (!assemblyId) {
      setProxies([]);
      return;
    }
    setIsLoading(true);
    try {
      setProxies(await assemblyApi.getProxies(assemblyId));
    } catch (error) {
      toast({
        title: "No se pudieron cargar los poderes",
        description: error instanceof Error ? error.message : "Intente nuevamente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [assemblyId]);

  useEffect(() => {
    void loadProxies();
  }, [loadProxies]);

  const handleRevoke = async () => {
    if (!proxyToRevoke) return;
    setIsRevoking(true);
    try {
      await assemblyApi.revokeProxy(proxyToRevoke.id, revokeReason.trim() || undefined);
      toast({
        title: "Poder revocado",
        description: `${proxyToRevoke.proxyName ?? proxyToRevoke.proxyDocument} ya no vota por ${
          proxyToRevoke.representedName ?? proxyToRevoke.representedDocument
        }`,
        variant: "success",
      });
      setProxyToRevoke(null);
      setRevokeReason("");
      await loadProxies();
    } catch (error) {
      toast({
        title: "No se pudo revocar el poder",
        description: error instanceof Error ? error.message : "Intente nuevamente",
        variant: "destructive",
      });
    } finally {
      setIsRevoking(false);
    }
  };

  const activeCount = proxies.filter((proxy) => proxy.status === "active").length;

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" aria-hidden />
            Poderes (apoderados)
          </CardTitle>
          <CardDescription>
            Delegados que asisten en representación de otros según la columna APODERADO DE del listado.{" "}
            {activeCount} poder{activeCount === 1 ? "" : "es"} activo{activeCount === 1 ? "" : "s"}.
          </CardDescription>
        </div>
        <Button variant="outline" onClick={() => void loadProxies()} disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refrescar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-3">Apoderado</th>
                <th className="py-2 pr-3">Representado</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2 pr-3">Declarado</th>
                <th className="py-2 pr-3 text-right">Votos por poder</th>
                <th className="py-2 text-right" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {proxies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    {isLoading ? "Cargando poderes…" : "Ningún delegado ha declarado poderes en esta asamblea."}
                  </td>
                </tr>
              ) : (
                proxies.map((proxy) => (
                  <tr key={proxy.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 pr-3">
                      <p className="font-medium text-slate-900">{proxy.proxyName ?? "—"}</p>
                      <p className="text-xs tabular-nums text-slate-500">{proxy.proxyDocument}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-slate-900">{proxy.representedName ?? "—"}</p>
                      <p className="text-xs tabular-nums text-slate-500">{proxy.representedDocument}</p>
                    </td>
                    <td className="py-3 pr-3">
                      {proxy.status === "active" ? (
                        <Badge className="bg-emerald-100 text-emerald-700">Activo</Badge>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-slate-600">
                            Revocado
                          </Badge>
                          {proxy.revokedReason && <p className="text-xs text-slate-500">{proxy.revokedReason}</p>}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-slate-600">{formatDateTime(proxy.declaredAt)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-slate-700">{proxy.votesCount}</td>
                    <td className="py-3 text-right">
                      {proxy.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProxyToRevoke(proxy)}
                          disabled={!canRevoke}
                          className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <UserX className="h-4 w-4" />
                          Revocar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <AlertDialog
        open={proxyToRevoke !== null}
        onOpenChange={(open) => {
          if (!open) {
            setProxyToRevoke(null);
            setRevokeReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar este poder?</AlertDialogTitle>
            <AlertDialogDescription>
              {proxyToRevoke?.proxyName ?? proxyToRevoke?.proxyDocument} dejará de votar por{" "}
              {proxyToRevoke?.representedName ?? proxyToRevoke?.representedDocument} en las próximas preguntas. Los
              votos ya emitidos se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="proxy-revoke-reason">Motivo (opcional)</Label>
            <Input
              id="proxy-revoke-reason"
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              maxLength={255}
              placeholder="Ej. No presentó el poder"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleRevoke();
              }}
              disabled={isRevoking}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRevoking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revocar poder"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
