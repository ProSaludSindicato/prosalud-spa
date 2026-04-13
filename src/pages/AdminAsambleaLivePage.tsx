import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useVotingMode } from "@/context/VotingModeContext";
import { assemblyApi } from "@/services/assemblyApi";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import { AssemblyQuestion, QuorumConfig, AttendanceRecord, Assembly } from "@/types/assembly";
import { toast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Clock,
  Download,
  Eye,
  EyeOff,
  Loader2,
  PenTool,
  Play,
  ShieldCheck,
  Square,
  Trash2,
  Users,
  Calendar,
  Plus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const STATUS_STYLES: Record<AssemblyQuestion["status"], { label: string; className: string }> = {
  OPEN: { label: "Abierta", className: "bg-emerald-100 text-emerald-700" },
  CLOSED: { label: "Cerrada", className: "bg-slate-200 text-slate-800" },
  PENDING: { label: "Pendiente", className: "bg-amber-100 text-amber-700" },
};

const FIXED_OPTIONS = [
  { id: "agree", text: "De acuerdo" },
  { id: "disagree", text: "En desacuerdo" },
];

export default function AdminAsambleaLivePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { mode, setMode } = useVotingMode();
  const [questions, setQuestions] = useState<AssemblyQuestion[]>([]);
  const [quorum, setQuorum] = useState<QuorumConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [questionTitle, setQuestionTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState<string>("");
  const [isStartingQuestion, setIsStartingQuestion] = useState(false);
  const [isClosingQuestion, setIsClosingQuestion] = useState(false);
  const [isToggleResults, setIsToggleResults] = useState<string | null>(null);
  const [quorumForm, setQuorumForm] = useState({
    totalDelegates: "",
    presentDelegates: "",
    requiredPercentage: "",
  });
  const [isQuorumDirty, setIsQuorumDirty] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendancePerPage, setAttendancePerPage] = useState(50);
  const [attendanceLastPage, setAttendanceLastPage] = useState(1);
  const [attendanceTotal, setAttendanceTotal] = useState(0);
  const [attendanceFilters, setAttendanceFilters] = useState({
    document: "",
    from: "",
    to: "",
  });
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [currentAssembly, setCurrentAssembly] = useState<Assembly | null>(null);
  const [selectedAssemblyForHistory, setSelectedAssemblyForHistory] = useState<Assembly | null>(null);
  const selectedAssemblyRef = useRef<Assembly | null>(null);
  const [isLoadingAssemblies, setIsLoadingAssemblies] = useState(false);
  const [isCreatingAssembly, setIsCreatingAssembly] = useState(false);
  const [isActivatingAssembly, setIsActivatingAssembly] = useState<string | null>(null);
  const [showCreateAssemblyDialog, setShowCreateAssemblyDialog] = useState(false);
  const [assemblyToDeactivate, setAssemblyToDeactivate] = useState<Assembly | null>(null);
  const [newAssemblyForm, setNewAssemblyForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    activate: true,
  });
  const attendanceRangeStart =
    attendanceTotal === 0 ? 0 : (attendancePage - 1) * attendancePerPage + 1;
  const attendanceRangeEnd =
    attendanceTotal === 0 ? 0 : Math.min(attendancePage * attendancePerPage, attendanceTotal);

  const openQuestion = useMemo(() => questions.find((q) => q.status === "OPEN") ?? null, [questions]);
  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => (b.order ?? 0) - (a.order ?? 0)),
    [questions],
  );
  
  // Determinar si se está viendo histórico (solo lectura)
  const isViewingHistory = Boolean(selectedAssemblyForHistory && !selectedAssemblyForHistory.isActive);
  const viewingAssembly = selectedAssemblyForHistory || currentAssembly;
  
  // Determinar la asamblea más reciente (por fecha de creación)
  const mostRecentAssembly = useMemo(() => {
    if (assemblies.length === 0) return null;
    return [...assemblies].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Más reciente primero
    })[0];
  }, [assemblies]);
  
  // Determinar si se puede gestionar (solo la asamblea activa puede desactivarse)
  const canManageAssembly = useMemo(() => {
    // Solo se puede desactivar la asamblea activa
    return currentAssembly || null;
  }, [currentAssembly]);
  
  // Actualizar ref cuando cambia selectedAssemblyForHistory
  useEffect(() => {
    selectedAssemblyRef.current = selectedAssemblyForHistory;
  }, [selectedAssemblyForHistory]);

  useEffect(() => {
    void loadAssemblies();
    void loadData();

    const interval = setInterval(() => {
      if (!selectedAssemblyRef.current) {
        void loadData();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timerIntervals: NodeJS.Timeout[] = [];
    
    questions.forEach((question) => {
      if (question.status === "OPEN" && question.openedAt) {
        const openTime = new Date(question.openedAt).getTime();
        const endTime = openTime + question.timeLimit * 1000;
        
        const updateTimer = () => {
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
          setTimers((prev) => ({ ...prev, [question.id]: remaining }));
        };
        
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        timerIntervals.push(interval);
      }
    });
    
    return () => timerIntervals.forEach(clearInterval);
  }, [questions]);

  useEffect(() => {
    if (!isQuorumDirty) {
      setQuorumForm({
        totalDelegates: quorum?.totalDelegates?.toString() ?? "",
        presentDelegates: quorum?.presentDelegates?.toString() ?? "",
        requiredPercentage: quorum?.requiredPercentage?.toString() ?? "",
      });
    }
  }, [quorum, isQuorumDirty]);

  const loadAssemblies = async (): Promise<Assembly | null> => {
    setIsLoadingAssemblies(true);
    try {
      const [current, all] = await Promise.all([
        assemblyApi.getCurrentAssembly(),
        assemblyApi.getAssemblies(),
      ]);
      setCurrentAssembly(current);
      setAssemblies(all);
      return current;
    } catch (error) {
      console.error("Error loading assemblies:", error);
      return null;
    } finally {
      setIsLoadingAssemblies(false);
    }
  };

  const loadData = async (assemblyId?: string) => {
    try {
      // Si se proporciona assemblyId, cargar datos de esa asamblea (histórico)
      // Si no, cargar de la asamblea activa
      const [questionsData, quorumData] = await Promise.all([
        assemblyApi.getQuestions(assemblyId ? { assembly_id: assemblyId } : undefined),
        // Quórum solo se puede ver de la asamblea activa según la API
        assemblyId ? Promise.resolve(null as QuorumConfig | null) : assemblyApi.getQuorum(),
      ]);
      setQuestions(questionsData);
      setQuorum(quorumData);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeToggle = (checked: boolean) => {
    setMode({ type: checked ? "ASSEMBLY" : "CANDIDATE" });
    toast({
      title: "Modo actualizado",
      description: `Ahora en modo: ${checked ? "Votación de Asamblea" : "Votación a Candidatos"}`,
      variant: "success",
    });
  };

  const parseNumericInput = (value: string, fallback = 0) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const handleQuorumInputChange =
    (field: keyof typeof quorumForm) => (event: ChangeEvent<HTMLInputElement>) => {
    const numericValue = event.target.value.replace(/[^0-9]/g, "");
      setQuorumForm((prev) => ({ ...prev, [field]: numericValue }));
    setIsQuorumDirty(true);
  };

  const handleResetQuorumForm = () => {
    setIsQuorumDirty(false);
    setQuorumForm({
      totalDelegates: quorum?.totalDelegates?.toString() ?? "",
      presentDelegates: quorum?.presentDelegates?.toString() ?? "",
      requiredPercentage: quorum?.requiredPercentage?.toString() ?? "",
    });
  };

  const handleUpdateQuorum = async () => {
    if (!currentAssembly) {
      toast({
        title: "No hay asamblea activa",
        description: "Debe haber una asamblea activa para actualizar el quórum",
        variant: "destructive",
      });
      return;
    }

    if (!quorum) {
      toast({
        title: "Sin datos de quórum",
        description: "Aún no se ha cargado la configuración actual de quórum",
        variant: "destructive",
      });
      return;
    }

    const totalDelegates = parseNumericInput(quorumForm.totalDelegates, 0);
    const presentDelegates = parseNumericInput(quorumForm.presentDelegates, 0);
    const requiredPercentage = parseNumericInput(quorumForm.requiredPercentage, quorum.requiredPercentage ?? 50);

    try {
      const updated = await assemblyApi.updateQuorum({
      ...quorum,
      totalDelegates,
      presentDelegates,
      requiredPercentage,
      });
      const verified = await assemblyApi.verifyQuorum();
      const nextQuorum = { ...updated, verified };
      setQuorum(nextQuorum);
      setIsQuorumDirty(false);
      setQuorumForm({
        totalDelegates: nextQuorum.totalDelegates?.toString() ?? "",
        presentDelegates: nextQuorum.presentDelegates?.toString() ?? "",
        requiredPercentage: nextQuorum.requiredPercentage?.toString() ?? "",
      });
      toast({
        title: verified ? "Quórum verificado" : "Quórum no alcanzado",
        description: verified ? "Se puede continuar con la asamblea" : "No hay suficientes delegados presentes",
        variant: verified ? "success" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el quórum",
        variant: "destructive",
      });
    }
  };

  const handleStartQuestion = async () => {
    if (!currentAssembly) {
      toast({
        title: "No hay asamblea activa",
        description: "Debe haber una asamblea activa para iniciar una votación",
        variant: "destructive",
      });
      return;
    }

    if (openQuestion) {
      toast({
        title: "Ya hay una pregunta abierta",
        description: "Cierre la votación actual antes de abrir una nueva",
        variant: "destructive",
      });
      return;
    }

    const parsedLimit = timeLimit.trim() === "" ? null : parseInt(timeLimit, 10);
    const hasTimer = parsedLimit !== null && !Number.isNaN(parsedLimit);
    const sanitizedTimeLimit = hasTimer ? Math.max(10, parsedLimit!) : 0;
    const sanitizedTitle = questionTitle.trim();
    setIsStartingQuestion(true);
    try {
      await assemblyApi.startLiveQuestion({
        title: sanitizedTitle || undefined,
        timeLimit: sanitizedTimeLimit,
        majorityType: "SIMPLE",
        quorumRequired: false,
        allowChangeVote: false,
        resultsVisible: true,
      });
    // Ocultar resultados de preguntas previas
    const closedQuestions = questions.filter((question) => question.status === "CLOSED" && question.resultsVisible);
    for (const question of closedQuestions) {
      await assemblyApi.updateQuestion(question.id, { resultsVisible: false });
    }
      setQuestionTitle("");
      toast({
        title: "Votación iniciada",
        description: "Los delegados ya pueden votar",
        variant: "success",
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Error al iniciar votación",
        description: error instanceof Error ? error.message : "No se pudo crear la pregunta",
        variant: "destructive",
      });
    } finally {
      setIsStartingQuestion(false);
    }
  };

  const handleCloseQuestion = async () => {
    if (!currentAssembly) {
      toast({
        title: "No hay asamblea activa",
        description: "Debe haber una asamblea activa para cerrar una votación",
        variant: "destructive",
      });
      return;
    }

    if (!openQuestion) {
      toast({
        title: "No hay votación abierta",
        description: "Inicie una pregunta antes de intentar cerrarla",
        variant: "destructive",
      });
      return;
    }

    setIsClosingQuestion(true);
    try {
      await assemblyApi.closeLiveQuestion();
      toast({
        title: "Votación cerrada",
        description: "No se aceptan más votos para esta pregunta",
        variant: "success",
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Error al cerrar",
        description: error instanceof Error ? error.message : "No se pudo cerrar la pregunta",
        variant: "destructive",
      });
    } finally {
      setIsClosingQuestion(false);
    }
  };

  const handleToggleResults = async (questionId: string, visible: boolean) => {
    if (!currentAssembly) {
      toast({
        title: "No hay asamblea activa",
        description: "Debe haber una asamblea activa para modificar los resultados",
        variant: "destructive",
      });
      return;
    }

    setIsToggleResults(questionId);
    try {
      await assemblyApi.updateQuestion(questionId, { resultsVisible: visible });
      toast({
        title: visible ? "Resultados públicos" : "Resultados ocultos",
        description: visible
          ? "La pantalla pública mostrará esta votación"
          : "Los resultados ya no serán visibles para los asistentes",
        variant: "success",
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Error al actualizar resultados",
        description: error instanceof Error ? error.message : "Intente nuevamente",
        variant: "destructive",
      });
    } finally {
      setIsToggleResults(null);
    }
  };

  const loadAttendance = useCallback(
    async (page = 1, assemblyId?: string) => {
      // Usar la asamblea seleccionada para histórico o la activa por defecto
      const assemblyToUse = assemblyId 
        ? assemblies.find(a => a.id === assemblyId) || currentAssembly
        : (selectedAssemblyForHistory || currentAssembly);

      // Solo cargar asistencia si hay una asamblea
      if (!assemblyToUse) {
        setAttendance([]);
        setAttendancePage(1);
        setAttendanceLastPage(1);
        setAttendanceTotal(0);
        return;
      }

      setIsAttendanceLoading(true);
      try {
        const response = await assemblyApi.getAttendance({
          page,
          perPage: attendancePerPage,
          document: attendanceFilters.document.trim() || undefined,
          from: attendanceFilters.from || undefined,
          to: attendanceFilters.to || undefined,
          assembly_id: assemblyToUse.id, // Filtrar por asamblea seleccionada o activa
        });
        setAttendance(response.data ?? []);
        setAttendancePage(response.current_page ?? page);
        setAttendanceLastPage(response.last_page ?? 1);
        setAttendanceTotal(response.total ?? response.data.length);
      } catch (error) {
        toast({
          title: "No se pudo cargar la asistencia",
          description: error instanceof Error ? error.message : "Intente nuevamente",
          variant: "destructive",
        });
      } finally {
        setIsAttendanceLoading(false);
      }
    },
    [attendanceFilters.document, attendanceFilters.from, attendanceFilters.to, attendancePerPage, currentAssembly, selectedAssemblyForHistory, assemblies],
  );

  const handleAttendancePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > attendanceLastPage || nextPage === attendancePage) return;
    setAttendancePage(nextPage);
    void loadAttendance(nextPage);
  };

  const handleAttendanceFilterChange =
    (field: keyof typeof attendanceFilters) => (event: ChangeEvent<HTMLInputElement>) => {
      setAttendanceFilters((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleAttendancePerPageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setAttendancePerPage(Number(event.target.value));
  };

  const handleAttendanceReset = () => {
    setAttendanceFilters({
      document: "",
      from: "",
      to: "",
    });
  };

  const handleDownloadReport = async () => {
    setIsDownloadingReport(true);
    try {
      // Usar la asamblea seleccionada para histórico o la activa por defecto
      const assemblyToUse = selectedAssemblyForHistory || currentAssembly;
      const assemblyId = assemblyToUse?.id;
      
      await assemblyApi.downloadReport(assemblyId);
      toast({
        title: "Reporte descargado",
        description: assemblyToUse 
          ? `El reporte de "${assemblyToUse.name}" se ha descargado exitosamente`
          : "El archivo Excel se ha descargado exitosamente",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error al descargar reporte",
        description: error instanceof Error ? error.message : "No se pudo descargar el reporte",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingReport(false);
    }
  };

  // Detectar duplicados: documentos que aparecen más de una vez
  const getDuplicateDocumentNumbers = useMemo(() => {
    const documentCounts = new Map<string, number>();
    attendance.forEach((record) => {
      const count = documentCounts.get(record.document_number) || 0;
      documentCounts.set(record.document_number, count + 1);
    });
    const duplicates = new Set<string>();
    documentCounts.forEach((count, doc) => {
      if (count > 1) {
        duplicates.add(doc);
      }
    });
    return duplicates;
  }, [attendance]);

  const filteredAttendance = useMemo(() => {
    if (!showDuplicatesOnly) {
      return attendance;
    }
    return attendance.filter((record) =>
      getDuplicateDocumentNumbers.has(record.document_number)
    );
  }, [attendance, showDuplicatesOnly, getDuplicateDocumentNumbers]);

  const handleDeleteAttendance = async () => {
    if (!recordToDelete) return;

    if (!currentAssembly) {
      toast({
        title: "No hay asamblea activa",
        description: "Debe haber una asamblea activa para eliminar registros de asistencia",
        variant: "destructive",
      });
      setRecordToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      await assemblyApi.deleteAttendance(recordToDelete.id);
      toast({
        title: "Registro eliminado",
        description: `Se eliminó el registro de ${recordToDelete.full_name}`,
        variant: "success",
      });
      setRecordToDelete(null);
      // Recargar la página actual
      await loadAttendance(attendancePage);
    } catch (error) {
      toast({
        title: "Error al eliminar",
        description: error instanceof Error ? error.message : "No se pudo eliminar el registro",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Efecto para recargar datos cuando cambia la asamblea seleccionada o activa
  useEffect(() => {
    const assemblyToUse = selectedAssemblyForHistory || currentAssembly;
    if (assemblyToUse) {
      // Cargar preguntas de la asamblea seleccionada
      void loadData(assemblyToUse.id);
      // Cargar asistencia de la asamblea seleccionada
      setAttendancePage(1);
      void loadAttendance(1, assemblyToUse.id);
    } else {
      // Si no hay asamblea, limpiar datos
      setQuestions([]);
      setQuorum(null);
      setAttendance([]);
      setAttendancePage(1);
      setAttendanceLastPage(1);
      setAttendanceTotal(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssemblyForHistory?.id, currentAssembly?.id]);

  const handleDeactivateAssembly = async () => {
    if (!assemblyToDeactivate) return;
    
    setIsActivatingAssembly(assemblyToDeactivate.id);
    try {
      // Desactivar la asamblea sin activar otra
      await assemblyApi.deactivateAssembly(assemblyToDeactivate.id);
      
      toast({
        title: "Asamblea desactivada",
        description: `La asamblea "${assemblyToDeactivate.name}" ha sido desactivada. Ya no recibirá votos ni datos nuevos.`,
        variant: "success",
      });
      
      // Limpiar selección de histórico
      setSelectedAssemblyForHistory(null);
      setAssemblyToDeactivate(null);
      
      // Cargar asambleas (ahora no habrá asamblea activa)
      await loadAssemblies();
      // Limpiar datos ya que no hay asamblea activa
      setQuestions([]);
      setQuorum(null);
      setAttendance([]);
      setAttendancePage(1);
      setAttendanceLastPage(1);
      setAttendanceTotal(0);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo desactivar la asamblea",
        variant: "destructive",
      });
    } finally {
      setIsActivatingAssembly(null);
    }
  };

  const handleCreateAssembly = async () => {
    if (!newAssemblyForm.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la asamblea es requerido",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingAssembly(true);
    try {
      await assemblyApi.createAssembly({
        name: newAssemblyForm.name.trim(),
        description: newAssemblyForm.description.trim() || undefined,
        startDate: newAssemblyForm.startDate || undefined,
        endDate: newAssemblyForm.endDate || undefined,
        activate: newAssemblyForm.activate,
      });
      toast({
        title: "Asamblea creada",
        description: "La asamblea ha sido creada exitosamente",
        variant: "success",
      });
      setShowCreateAssemblyDialog(false);
      setNewAssemblyForm({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        activate: true,
      });
      await loadAssemblies();
      // Recargar datos después de crear/activar asamblea
      await loadData();
      // Recargar asistencia con la nueva asamblea activa
      await loadAttendance(1);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear la asamblea",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAssembly(false);
    }
  };


  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[50vh] items-center justify-center bg-slate-50">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/logo_prosalud.webp" alt="Prosalud" className="h-12" />
              <div>
              <p className="text-sm uppercase tracking-wide text-primary">Panel de control</p>
              <h1 className="text-2xl font-bold text-slate-900">Votación en Asamblea</h1>
              </div>
            </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2">
              <span className="text-sm font-medium text-slate-600">Modo Asamblea</span>
              <Switch checked={mode.type === "ASSEMBLY"} onCheckedChange={handleModeToggle} />
            </div>
              <Button
              variant="ghost"
              onClick={() => {
                void (async () => {
                  await logout();
                  navigate("/auth/login");
                })();
              }}
            >
                Salir
              </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {/* Selector Global de Asamblea */}
        {assemblies.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                    Consultar Asamblea
                  </Label>
                  <Select
                    value={viewingAssembly?.id || ""}
                    onValueChange={(value) => {
                      if (value === currentAssembly?.id) {
                        setSelectedAssemblyForHistory(null);
                      } else {
                        const assembly = assemblies.find(a => a.id === value);
                        setSelectedAssemblyForHistory(assembly || null);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[300px]">
                      <SelectValue placeholder="Seleccionar asamblea" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentAssembly && (
                        <SelectItem value={currentAssembly.id}>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>{currentAssembly.name} (Activa)</span>
                          </div>
                        </SelectItem>
                      )}
                      {assemblies
                        .filter(a => !a.isActive)
                        .map((assembly) => (
                          <SelectItem key={assembly.id} value={assembly.id}>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-500" />
                              <span>{assembly.name} (Histórico)</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {isViewingHistory && (
                  <div className="flex items-center gap-2 rounded-lg border-2 border-amber-200 bg-amber-50 px-4 py-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Modo Histórico (Solo Lectura)</p>
                      <p className="text-xs text-amber-700">
                        Viendo: {selectedAssemblyForHistory?.name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAssemblyForHistory(null)}
                      className="ml-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                    >
                      Volver a activa
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sección de Gestión de Asambleas */}
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-primary">Gestión de Asambleas</p>
              <h2 className="text-2xl font-semibold text-slate-900">Asambleas</h2>
              <p className="text-sm text-slate-500">
                Gestiona las diferentes versiones de asambleas para mantener historial y auditoría
              </p>
            </div>
            <Dialog open={showCreateAssemblyDialog} onOpenChange={setShowCreateAssemblyDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nueva Asamblea
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle>Crear Nueva Asamblea</DialogTitle>
                  <DialogDescription>
                    Crea una nueva asamblea para separar los datos y mantener el historial.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="assemblyName">Nombre de la Asamblea *</Label>
                    <Input
                      id="assemblyName"
                      value={newAssemblyForm.name}
                      onChange={(e) => setNewAssemblyForm({ ...newAssemblyForm, name: e.target.value })}
                      placeholder="Ej: Asamblea General 2025"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="assemblyDescription">Descripción</Label>
                    <Textarea
                      id="assemblyDescription"
                      value={newAssemblyForm.description}
                      onChange={(e) => setNewAssemblyForm({ ...newAssemblyForm, description: e.target.value })}
                      placeholder="Descripción opcional de la asamblea"
                      className="mt-2"
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="assemblyStartDate">Fecha de Inicio</Label>
                      <Input
                        id="assemblyStartDate"
                        type="date"
                        value={newAssemblyForm.startDate}
                        onChange={(e) => setNewAssemblyForm({ ...newAssemblyForm, startDate: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="assemblyEndDate">Fecha de Fin</Label>
                      <Input
                        id="assemblyEndDate"
                        type="date"
                        value={newAssemblyForm.endDate}
                        onChange={(e) => setNewAssemblyForm({ ...newAssemblyForm, endDate: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="activateAssembly"
                      checked={newAssemblyForm.activate}
                      onCheckedChange={(checked) =>
                        setNewAssemblyForm({ ...newAssemblyForm, activate: checked === true })
                      }
                    />
                    <Label htmlFor="activateAssembly" className="cursor-pointer">
                      Activar esta asamblea automáticamente
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateAssemblyDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateAssembly} disabled={isCreatingAssembly}>
                    {isCreatingAssembly ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      "Crear Asamblea"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Asamblea Activa Actual</CardTitle>
              <CardDescription>
                Esta es la asamblea que está recibiendo votos y datos en este momento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAssemblies ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : currentAssembly ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold text-slate-900">{currentAssembly.name}</h3>
                          <Badge className="bg-primary text-white">Activa</Badge>
                        </div>
                        {currentAssembly.description && (
                          <p className="text-sm text-slate-600 mb-2">{currentAssembly.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                          {currentAssembly.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Inicio: {new Date(currentAssembly.startDate).toLocaleDateString("es-CO")}
                            </span>
                          )}
                          {currentAssembly.endDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Fin: {new Date(currentAssembly.endDate).toLocaleDateString("es-CO")}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                          {currentAssembly.questionsCount !== undefined && (
                            <span>{currentAssembly.questionsCount} preguntas</span>
                          )}
                          {currentAssembly.attendancesCount !== undefined && (
                            <span>{currentAssembly.attendancesCount} asistencias</span>
                          )}
                        </div>
                      </div>
                      {canManageAssembly && canManageAssembly.id === currentAssembly.id && (
                        <div className="ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAssemblyToDeactivate(currentAssembly)}
                            disabled={isActivatingAssembly === currentAssembly.id}
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          >
                            Desactivar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 p-6 text-center">
                  <AlertCircle className="mx-auto h-8 w-8 text-amber-600 mb-2" />
                  <p className="font-semibold text-amber-900 mb-1">No hay asamblea activa</p>
                  <p className="text-sm text-amber-700">
                    Crea una nueva asamblea para comenzar a recibir votos y datos
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

        </section>

        {!isViewingHistory && (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Control de votación
                    </CardTitle>
                  <CardDescription>Solo una pregunta puede estar abierta al tiempo.</CardDescription>
                  </CardHeader>
            <CardContent className="space-y-6">
              {!currentAssembly && !isViewingHistory && (
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  <AlertCircle className="mr-2 inline h-4 w-4" />
                  No hay asamblea activa. Crea y activa una asamblea para poder iniciar votaciones.
                </div>
              )}
              <div>
                <Label htmlFor="questionTitle">Título de la pregunta (opcional)</Label>
                <Input
                  id="questionTitle"
                  value={questionTitle}
                  onChange={(event) => setQuestionTitle(event.target.value)}
                  placeholder="Ej. ¿Aprueba el acta de la sesión anterior?"
                  className="mt-2"
                  maxLength={120}
                  disabled={isViewingHistory || !currentAssembly}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Se mostrará al votante junto con las opciones “De acuerdo / En desacuerdo”.
                </p>
              </div>
              <div>
                <Label htmlFor="timeLimit">Duración de la votación (segundos)</Label>
                <Input
                  id="timeLimit"
                  inputMode="numeric"
                  value={timeLimit}
                  onChange={(event) => {
                    const numericValue = event.target.value.replace(/[^0-9]/g, "");
                    setTimeLimit(numericValue);
                  }}
                  placeholder="Dejar vacío para cerrar manualmente"
                  className="mt-2"
                  disabled={isViewingHistory || !currentAssembly}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Si no define duración, deberá cerrar la votación manualmente.
                </p>
                  </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Button
                  onClick={handleStartQuestion}
                  disabled={isViewingHistory || !currentAssembly || isStartingQuestion || Boolean(openQuestion)}
                  className="gap-2"
                >
                  {isStartingQuestion ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando pregunta...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Iniciar nueva votación
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCloseQuestion}
                  disabled={isViewingHistory || !currentAssembly || !openQuestion || isClosingQuestion}
                  className="gap-2"
                >
                  {isClosingQuestion ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cerrando...
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4" />
                      Cerrar votación
                    </>
                  )}
                </Button>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                {openQuestion ? (
                  <>
                    <p className="font-semibold text-slate-900">Votación en curso</p>
                    {openQuestion.timeLimit > 0 ? (
                      <p>
                        Restan {timers[openQuestion.id] ?? openQuestion.timeLimit}s · {openQuestion.votesCount} votos
                      </p>
                    ) : (
                      <p>Cierre manual · {openQuestion.votesCount} votos registrados</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-slate-900">Sin pregunta abierta</p>
                    <p>Presione “Iniciar nueva votación” cuando el moderador lo indique.</p>
                  </>
                )}
                </div>
              </CardContent>
            </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Quórum de la asamblea</CardTitle>
              <CardDescription>
                {isViewingHistory 
                  ? `Viendo histórico de: ${selectedAssemblyForHistory?.name}. El quórum solo se muestra para la asamblea activa.`
                  : !currentAssembly
                  ? "Debe haber una asamblea activa para configurar el quórum."
                  : "Actualice la asistencia y valide si se puede abrir la votación."}
              </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
              {!currentAssembly && !isViewingHistory && (
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  <AlertCircle className="mr-2 inline h-4 w-4" />
                  No hay asamblea activa. Crea y activa una asamblea para poder configurar el quórum.
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Total delegados</Label>
                  <Input
                        value={quorumForm.totalDelegates}
                        onChange={handleQuorumInputChange("totalDelegates")}
                    inputMode="numeric"
                    disabled={isViewingHistory || !currentAssembly}
                      />
                    </div>
                <div>
                  <Label>Delegados presentes</Label>
                  <Input
                        value={quorumForm.presentDelegates}
                        onChange={handleQuorumInputChange("presentDelegates")}
                    inputMode="numeric"
                    disabled={isViewingHistory || !currentAssembly}
                      />
                    </div>
                <div>
                  <Label>Porcentaje requerido</Label>
                  <Input
                        value={quorumForm.requiredPercentage}
                        onChange={handleQuorumInputChange("requiredPercentage")}
                    inputMode="numeric"
                    disabled={isViewingHistory || !currentAssembly}
                      />
                    </div>
                <div className="flex flex-col justify-center">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Estado</p>
                      {quorum?.verified ? (
                    <Badge className="mt-2 bg-emerald-100 text-emerald-700">Quórum verificado</Badge>
                      ) : (
                    <Badge variant="outline" className="mt-2 text-amber-600">
                      Quórum pendiente
                        </Badge>
                      )}
                    </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleUpdateQuorum} className="gap-2" disabled={isViewingHistory || !currentAssembly}>
                  Actualizar quórum
                </Button>
                <Button variant="ghost" onClick={handleResetQuorumForm}>
                          Restablecer
                      </Button>
                    </div>
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                <AlertCircle className="mr-2 inline h-4 w-4 text-amber-500" />
                Verifique el quórum antes de iniciar la primera votación.
                  </div>
                </CardContent>
              </Card>
            </div>

            <section className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-primary">Preguntas en vivo</p>
                  <h2 className="text-2xl font-semibold text-slate-900">Estado actual de la votación</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => window.open("/assembly/results", "_blank")} className="gap-2">
                    Ver pantalla pública
                  </Button>
                  
                </div>
              </div>

          {openQuestion ? (
            <Card className="border-none shadow-lg">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Pregunta #{openQuestion.order ?? 1}</CardTitle>
                  <Badge className={STATUS_STYLES.OPEN.className}>{STATUS_STYLES.OPEN.label}</Badge>
            </div>
                {openQuestion.title?.trim() && (
                  <p className="text-base font-semibold text-slate-900">{openQuestion.title.trim()}</p>
                )}
                <CardDescription>Los delegados están respondiendo “De acuerdo” o “En desacuerdo”.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {openQuestion.timeLimit > 0 ? (
                  <div className="space-y-2 rounded-2xl bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="h-4 w-4" />
                        Tiempo restante
                      </span>
                      <span>{timers[openQuestion.id] ?? openQuestion.timeLimit}s</span>
        </div>
                    <Progress
                      value={
                        ((timers[openQuestion.id] ?? openQuestion.timeLimit) / openQuestion.timeLimit) * 100
                      }
                      className="h-2 rounded-full bg-slate-200"
              />
            </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-600">
                    <span className="flex items-center gap-2 font-medium text-slate-700">
                      <Clock className="h-4 w-4" />
                      Sin límite de tiempo · cierre manual
                    </span>
            </div>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {openQuestion.votesCount} votos registrados
                  </span>
                  <span>
                    {openQuestion.timeLimit > 0
                      ? `Duración total: ${openQuestion.timeLimit}s`
                      : "Duración indefinida (cerrar manualmente)"}
                  </span>
            </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {FIXED_OPTIONS.map((option) => (
                    <div key={option.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-sm font-medium text-slate-700">{option.text}</p>
                      <p className="text-xs text-slate-500">Resultados detallados en la pantalla pública.</p>
              </div>
                  ))}
              </div>
                <div className="flex flex-wrap gap-3">
                    <Button
                variant="outline"
                    onClick={() => handleToggleResults(openQuestion.id, !openQuestion.resultsVisible)}
                    disabled={isViewingHistory || !currentAssembly || isToggleResults === openQuestion.id}
                    className="gap-2"
                  >
                    {openQuestion.resultsVisible ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Ocultar en pantalla pública
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Mostrar en pantalla pública
                      </>
                    )}
              </Button>
                    <Button
                    variant="destructive"
                    onClick={handleCloseQuestion}
                    disabled={isViewingHistory || !currentAssembly || isClosingQuestion}
                    className="gap-2"
                  >
                    <Square className="h-4 w-4" />
                    Cerrar votación
                    </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-dashed border-slate-200 bg-white/80 text-center shadow-none">
              <CardContent className="space-y-3 p-10">
                <p className="text-sm uppercase tracking-wide text-slate-500">Sin votación abierta</p>
                <p className="text-xl font-semibold text-slate-900">
                  El moderador anunciará cuándo iniciar la siguiente pregunta.
                </p>
              </CardContent>
            </Card>
          )}
            </section>
          </>
        )}

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-primary">Historial</p>
              <h2 className="text-2xl font-semibold text-slate-900">Preguntas anteriores</h2>
            </div>
          </div>
          {sortedQuestions.length === 0 ? (
            <Card className="border-dashed text-center">
              <CardContent className="p-8 text-sm text-slate-500">
                Aún no se han registrado votaciones en esta sesión.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sortedQuestions.map((question) => (
                <Card key={question.id} className="border-none bg-white shadow-sm">
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-semibold text-slate-900">Pregunta #{question.order ?? 1}</p>
                        <Badge className={STATUS_STYLES[question.status].className}>
                          {STATUS_STYLES[question.status].label}
                        </Badge>
                </div>
                      {question.title?.trim() ? (
                        <p className="text-base font-medium text-slate-900">{question.title.trim()}</p>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Los delegados respondieron “De acuerdo / En desacuerdo”.
                        </p>
                      )}
                      <p className="text-sm text-slate-500">
                        {question.timeLimit}s · {question.votesCount} votos · Resultados {" "}
                        {question.resultsVisible ? "visibles" : "ocultos"}
                      </p>
              </div>
                    {question.status === "CLOSED" && (
              <Button
                        variant="outline"
                size="sm"
                        onClick={() => handleToggleResults(question.id, !question.resultsVisible)}
                        disabled={isViewingHistory || !currentAssembly || isToggleResults === question.id}
                        className="gap-2"
              >
                {question.resultsVisible ? (
                  <>
                            <EyeOff className="h-4 w-4" />
                            Ocultar resultados
                  </>
                ) : (
                  <>
                            <Eye className="h-4 w-4" />
                            Mostrar resultados
                  </>
                )}
              </Button>
            )}
      </CardContent>
    </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-primary">Control de asistencia</p>
              <h2 className="text-2xl font-semibold text-slate-900">Delegados autenticados</h2>
              <p className="text-sm text-slate-500">
                Monitorea quién ingresó al sistema y valida el quórum en tiempo real.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-full border border-slate-200 px-3 py-1 text-sm"
                value={attendancePerPage}
                onChange={handleAttendancePerPageChange}
              >
                {[25, 50, 100, 200].map((size) => (
                  <option key={size} value={size}>
                    {size} por página
                  </option>
                ))}
              </select>
              <Button variant="outline" onClick={() => loadAttendance(attendancePage)} className="gap-2">
                Refrescar
              </Button>
              <Button
                variant="default"
                onClick={handleDownloadReport}
                disabled={isDownloadingReport}
                className="gap-2"
              >
                {isDownloadingReport ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Descargando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Descargar reporte Excel
                  </>
                )}
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
              <CardDescription>Busca por documento o acota por fecha de autenticación.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Número de documento</Label>
                <Input
                  placeholder="Ej: 10009"
                  value={attendanceFilters.document}
                  onChange={handleAttendanceFilterChange("document")}
                />
              </div>
              <div>
                <Label>Desde</Label>
                <Input type="date" value={attendanceFilters.from} onChange={handleAttendanceFilterChange("from")} />
              </div>
              <div>
                <Label>Hasta</Label>
                <Input type="date" value={attendanceFilters.to} onChange={handleAttendanceFilterChange("to")} />
              </div>
              <div className="flex items-end gap-2">
                <Button className="flex-1 gap-2" onClick={() => loadAttendance(1)} disabled={isAttendanceLoading}>
                  {isAttendanceLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    "Aplicar filtros"
                  )}
                </Button>
                <Button variant="ghost" onClick={handleAttendanceReset} disabled={isAttendanceLoading}>
                  Limpiar
                </Button>
              </div>
            </CardContent>
            <CardContent className="border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showDuplicates"
                  checked={showDuplicatesOnly}
                  onCheckedChange={(checked) => setShowDuplicatesOnly(checked === true)}
                />
                <Label
                  htmlFor="showDuplicates"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Mostrar solo registros duplicados
                  {getDuplicateDocumentNumbers.size > 0 && (
                    <span className="ml-2 text-xs text-primary">
                      ({getDuplicateDocumentNumbers.size} documento{getDuplicateDocumentNumbers.size === 1 ? "" : "s"} con múltiples autenticaciones)
                    </span>
                  )}
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Listado de asistentes</CardTitle>
                <CardDescription>
                  {showDuplicatesOnly
                    ? `${filteredAttendance.length} registro${filteredAttendance.length === 1 ? "" : "s"} duplicado${filteredAttendance.length === 1 ? "" : "s"}`
                    : `${attendanceTotal} registro${attendanceTotal === 1 ? "" : "s"} · página ${attendancePage} de ${attendanceLastPage}`}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-3">Documento</th>
                      <th className="py-3">Nombre</th>
                      <th className="py-3">Fecha expedición</th>
                      <th className="py-3">IP</th>
                      <th className="py-3">Ingreso</th>
                      <th className="py-3">Firma</th>
                      <th className="py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {isAttendanceLoading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                        </td>
                      </tr>
                    ) : filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500">
                          {showDuplicatesOnly
                            ? "No se encontraron registros duplicados."
                            : "No se encontraron asistentes con los filtros actuales."}
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((record) => {
                        const isDuplicate = getDuplicateDocumentNumbers.has(record.document_number);
                        return (
                          <tr
                            key={record.id}
                            className={`hover:bg-slate-50/80 ${isDuplicate ? "bg-amber-50/50" : ""}`}
                          >
                            <td className="py-3 font-semibold text-slate-800">
                              {record.document_number}
                              {isDuplicate && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Duplicado
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 text-slate-700">{record.full_name}</td>
                            <td className="py-3 text-slate-500">
                              {record.issue_date_normalized
                                ? new Date(record.issue_date_normalized).toLocaleDateString("es-CO", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                  })
                                : "—"}
                            </td>
                            <td className="py-3 text-slate-500">{record.ip_address ?? "—"}</td>
                            <td className="py-3 text-slate-600">
                              {new Date(record.authenticated_at).toLocaleString()}
                            </td>
                            <td className="py-3">
                              {record.signature_url ? (
                                <a
                                  href={record.signature_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                                >
                                  <PenTool className="h-3 w-3" />
                                  Firma
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">Sin firma</span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRecordToDelete(record)}
                                disabled={isViewingHistory || !currentAssembly}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  {showDuplicatesOnly
                    ? `Mostrando ${filteredAttendance.length} registro${filteredAttendance.length === 1 ? "" : "s"} duplicado${filteredAttendance.length === 1 ? "" : "s"}`
                    : `Mostrando ${attendanceRangeStart}–${attendanceRangeEnd} de ${attendanceTotal}`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAttendancePageChange(attendancePage - 1)}
                    disabled={attendancePage <= 1 || isAttendanceLoading}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-slate-600">
                    Página {attendancePage} / {attendanceLastPage}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAttendancePageChange(attendancePage + 1)}
                    disabled={attendancePage >= attendanceLastPage || isAttendanceLoading}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <AlertDialog open={assemblyToDeactivate !== null} onOpenChange={(open) => !open && setAssemblyToDeactivate(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar asamblea?</AlertDialogTitle>
            <AlertDialogDescription>
              {assemblyToDeactivate && (
                <>
                  Esta acción desactivará la asamblea <strong>{assemblyToDeactivate.name}</strong>.
                  <br />
                  <br />
                  <strong>Esta acción es irreversible.</strong> Una vez desactivada:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>La asamblea dejará de recibir votos y datos nuevos</li>
                    <li>No se activará automáticamente otra asamblea</li>
                    <li>Todos los datos históricos se conservarán para consulta</li>
                  </ul>
                  <br />
                  Para continuar recibiendo votos, deberás crear y activar una nueva asamblea.
                  <br />
                  <br />
                  ¿Estás seguro de que deseas desactivar esta asamblea?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActivatingAssembly === assemblyToDeactivate?.id}>
              Cancelar
            </AlertDialogCancel>
            {assemblyToDeactivate && (
              <AlertDialogAction
                onClick={handleDeactivateAssembly}
                disabled={isActivatingAssembly === assemblyToDeactivate.id}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isActivatingAssembly === assemblyToDeactivate.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Desactivando...
                  </>
                ) : (
                  "Desactivar"
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={recordToDelete !== null} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro de asistencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el registro de{" "}
              <strong>{recordToDelete?.full_name}</strong> (Documento: {recordToDelete?.document_number}).
              <br />
              <br />
              También se eliminará el archivo de firma asociado si existe. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAttendance}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </AdminLayout>
  );
}
