import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Download, Filter, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  CONVENIO_PERIODO_TODOS,
  EmailHistoryCalificacionFiltro,
  EmailHistoryEstadoFiltro,
  EmailHistoryParams,
  convenioPeriodoLabel,
  exportHistoryExcel,
} from '@/services/conveniosManualService';

interface ExportConvenioHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  digitalSigningEnabled: boolean;
  initialFilters: EmailHistoryParams;
  availablePeriodos: string[];
}

const EXPORTABLE_ESTADO_FILTROS: EmailHistoryEstadoFiltro[] = [
  'todos',
  'pendiente',
  'enviado',
  'fallido',
  'test',
  'firma_pendiente_firma',
  'firma_firmado_afiliado',
  'firma_completado',
];

function normalizeEstadoFiltro(value?: EmailHistoryEstadoFiltro): EmailHistoryEstadoFiltro {
  if (value && EXPORTABLE_ESTADO_FILTROS.includes(value)) {
    return value;
  }

  return 'todos';
}

export default function ExportConvenioHistoryDialog({
  open,
  onOpenChange,
  digitalSigningEnabled,
  initialFilters,
  availablePeriodos,
}: ExportConvenioHistoryDialogProps) {
  const [q, setQ] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EmailHistoryEstadoFiltro>('todos');
  const [calificacion, setCalificacion] = useState<EmailHistoryCalificacionFiltro | 'todas'>('todas');
  const [sede, setSede] = useState('');
  const [periodo, setPeriodo] = useState<string>(CONVENIO_PERIODO_TODOS);
  const [includeAllDates, setIncludeAllDates] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [excludeTest, setExcludeTest] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQ(initialFilters.q ?? '');
    setEstadoFiltro(normalizeEstadoFiltro(initialFilters.estado_filtro));
    setCalificacion(initialFilters.calificacion ?? 'todas');
    setSede(initialFilters.sede ?? '');
    setPeriodo(initialFilters.periodo ?? CONVENIO_PERIODO_TODOS);
    setFechaDesde(initialFilters.fecha_desde ?? '');
    setFechaHasta(initialFilters.fecha_hasta ?? '');
    setIncludeAllDates(!initialFilters.fecha_desde && !initialFilters.fecha_hasta);
    setExcludeTest(initialFilters.estado_filtro !== 'test');
  }, [open, initialFilters]);

  const today = new Date().toISOString().split('T')[0];
  const isTestFilter = estadoFiltro === 'test';
  const canExport = includeAllDates || (Boolean(fechaDesde) && Boolean(fechaHasta));

  const handleExport = async () => {
    setIsGenerating(true);

    try {
      const { blob, filename } = await exportHistoryExcel({
        q: q.trim() || undefined,
        estado_filtro: estadoFiltro === 'todos' ? undefined : estadoFiltro,
        sede: sede.trim() || undefined,
        periodo: periodo === CONVENIO_PERIODO_TODOS ? undefined : periodo,
        fecha_desde: includeAllDates ? undefined : fechaDesde || undefined,
        fecha_hasta: includeAllDates ? undefined : fechaHasta || undefined,
        calificacion: digitalSigningEnabled && calificacion !== 'todas' ? calificacion : undefined,
        is_test: isTestFilter ? true : excludeTest ? false : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Reporte Excel generado', {
        description: 'El reporte de convenios se descargó. Use los filtros de la primera fila para acotar afiliados pendientes de firma.',
      });
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al exportar reporte', {
        description: error instanceof Error ? error.message : (error as { message?: string })?.message || 'No se pudo generar el Excel.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-sm:inset-x-4 sm:w-full sm:max-w-lg bg-white max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Exportar reporte de convenios
          </DialogTitle>
          <DialogDescription>
            Genera un Excel con resumen, detalle y afiliados pendientes de firma. Los encabezados incluyen filtros de Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Filtros del reporte</h4>
                  <p className="text-sm text-gray-600">Se prellenan con los filtros actuales del historial.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Periodo (semestre)</Label>
                <Select value={periodo} onValueChange={setPeriodo}>
                  <SelectTrigger>
                    <SelectValue>{convenioPeriodoLabel(periodo)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availablePeriodos.map((item) => (
                      <SelectItem key={item} value={item}>
                        {convenioPeriodoLabel(item)}
                      </SelectItem>
                    ))}
                    <SelectItem value={CONVENIO_PERIODO_TODOS}>Todos los semestres</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Buscar</Label>
                <Input
                  placeholder="Documento o nombre de convenio"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Estado (correo o firma)</Label>
                <Select
                  value={estadoFiltro}
                  onValueChange={(value) => setEstadoFiltro(value as EmailHistoryEstadoFiltro)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectGroup>
                      <SelectLabel>Envío del correo</SelectLabel>
                      <SelectItem value="pendiente">Pendiente de envío</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="fallido">Fallido</SelectItem>
                      <SelectItem value="test">TEST</SelectItem>
                    </SelectGroup>
                    {digitalSigningEnabled && (
                      <SelectGroup>
                        <SelectLabel>Firma digital</SelectLabel>
                        <SelectItem value="firma_pendiente_firma">Pendiente de firma</SelectItem>
                        <SelectItem value="firma_firmado_afiliado">Firmado por afiliado</SelectItem>
                        <SelectItem value="firma_completado">Completado</SelectItem>
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {digitalSigningEnabled && (
                <div className="space-y-2">
                  <Label>Calificación</Label>
                  <Select
                    value={calificacion}
                    onValueChange={(value) => setCalificacion(value as EmailHistoryCalificacionFiltro | 'todas')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="5">5 · Excelente</SelectItem>
                      <SelectItem value="4">4 · Buena</SelectItem>
                      <SelectItem value="3">3 · Regular</SelectItem>
                      <SelectItem value="2">2 · Mala</SelectItem>
                      <SelectItem value="1">1 · Muy mala</SelectItem>
                      <SelectItem value="sin_calificar">Sin calificar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Hospital / Convenio</Label>
                <Input
                  placeholder="Coincide con sede o nombre de convenio"
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                />
              </div>

              {digitalSigningEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEstadoFiltro('firma_pendiente_firma')}
                  className="w-full"
                >
                  Solo afiliados pendientes de firma
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Rango de fechas</h4>
                  <p className="text-sm text-gray-600">Opcional. Se cruza con el semestre seleccionado.</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="convenio-export-all-dates">Incluir todas las fechas</Label>
                <Switch
                  id="convenio-export-all-dates"
                  checked={includeAllDates}
                  onCheckedChange={setIncludeAllDates}
                />
              </div>

              {!includeAllDates && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fecha desde</Label>
                    <Input
                      type="date"
                      value={fechaDesde}
                      max={fechaHasta || today}
                      onChange={(e) => setFechaDesde(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha hasta</Label>
                    <Input
                      type="date"
                      value={fechaHasta}
                      min={fechaDesde || undefined}
                      max={today}
                      onChange={(e) => setFechaHasta(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Excluir registros TEST</p>
              <p className="text-xs text-muted-foreground">Recomendado para el reporte operativo de firmas.</p>
            </div>
            <Switch
              checked={isTestFilter ? false : excludeTest}
              disabled={isTestFilter}
              onCheckedChange={setExcludeTest}
            />
          </div>

          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h4 className="font-medium text-blue-900 mb-2">El archivo incluye</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Resumen de envíos, firmas y pendientes por sede</li>
                <li>• Detalle de cada convenio con estado de firma</li>
                {digitalSigningEnabled && <li>• Hoja exclusiva de afiliados pendientes de firmar</li>}
                <li>• Filtros automáticos en los encabezados de Excel</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Cancelar
            </Button>
            <Button onClick={() => void handleExport()} disabled={isGenerating || !canExport}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
