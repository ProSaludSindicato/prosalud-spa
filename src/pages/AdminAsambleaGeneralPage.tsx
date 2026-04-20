import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { ArrowRight, BarChart3, Radio } from "lucide-react";
import { VotingModeToggle } from "@/components/admin/voting/VotingModeToggle";

export default function AdminAsambleaGeneralPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();

  const canDelegatesVoting = useMemo(
    () => can("votes.statistics.view") || can("votes.audit.view"),
    [can]
  );

  const canLiveAssembly = useMemo(
    () => can("assembly.questions.manage") || can("assembly.quorum.manage"),
    [can]
  );
  const canManageVotingMode = useMemo(() => can("voting.mode.manage"), [can]);

  useEffect(() => {
    if (canDelegatesVoting && !canLiveAssembly) {
      navigate("/admin/votaciones", { replace: true });
      return;
    }
    if (!canDelegatesVoting && canLiveAssembly) {
      navigate("/admin/asamblea-en-vivo", { replace: true });
    }
  }, [canDelegatesVoting, canLiveAssembly, navigate]);

  const showHub = canDelegatesVoting && canLiveAssembly;

  if (!showHub) {
    if (!canDelegatesVoting && !canLiveAssembly) {
      return (
        <AdminLayout>
          <div className="flex min-h-[40vh] items-center justify-center p-6">
            <p className="text-sm text-slate-600">No tienes permisos para acceder a las herramientas de asamblea.</p>
          </div>
        </AdminLayout>
      );
    }
    return (
      <AdminLayout>
        <div className="flex min-h-[40vh] items-center justify-center p-6">
          <p className="text-sm text-slate-500">Cargando…</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Asamblea General ProSalud</h1>
          <p className="max-w-2xl text-slate-600">
            Herramientas administrativas para la asamblea general: elige el área según lo que necesites gestionar.
          </p>
        </div>

        {canManageVotingMode && (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Habilitar votaciones públicas</CardTitle>
              <CardDescription>
                Controla desde aquí qué flujo público está habilitado. Solo un modo puede estar activo al mismo tiempo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <VotingModeToggle mode="candidate" />
                <VotingModeToggle mode="assembly" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-none shadow-lg transition-shadow hover:shadow-xl">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-prosalud/10 text-primary-prosalud">
                <BarChart3 className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Votación de delegados</CardTitle>
              <CardDescription>Elección de representantes de afiliados por hospital</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Estadísticas, auditoría de votos, cargas de afiliados activos y candidatos delegados para la
                asamblea.
              </p>
              <Button className="w-full gap-2" asChild>
                <Link to="/admin/votaciones">
                  Ir a votación de delegados
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg transition-shadow hover:shadow-xl">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
                <Radio className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Sesión de asamblea</CardTitle>
              <CardDescription>Votaciones en vivo, asistencia y quórum</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Gestión de la sesión el día de la asamblea: preguntas en vivo, resultados proyectados, registro de
                asistencia y firma de delegados.
              </p>
              <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" asChild>
                <Link to="/admin/asamblea-en-vivo">
                  Ir a sesión en vivo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
