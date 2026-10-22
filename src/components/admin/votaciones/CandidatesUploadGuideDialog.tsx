import * as XLSX from "xlsx";
import { AlertTriangle, Download, FileSpreadsheet, FolderArchive, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type CandidatesUploadGuideMode = "candidatos" | "fotos";

interface CandidatesUploadGuideDialogProps {
  mode: CandidatesUploadGuideMode | null;
  onOpenChange: (open: boolean) => void;
  onSelectFile: (mode: CandidatesUploadGuideMode) => void;
  onDownloadCurrent: () => void;
  isDownloadingCurrent: boolean;
}

const TEMPLATE_HEADERS = ["NOMBRE Y APELLIDOS", "CEDULA", "SEDE", "PROCESO"];

const TEMPLATE_EXAMPLE_ROW = ["MARÍA PÉREZ GÓMEZ", 1020304050, "BELLO", "JEFE DE ENFERMERÍA"];

const downloadCandidatesTemplate = () => {
  const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE_ROW]);
  worksheet["!cols"] = [{ wch: 36 }, { wch: 14 }, { wch: 16 }, { wch: 36 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "POSTULADOS");
  XLSX.writeFile(workbook, "PLANTILLA_CANDIDATOS.xlsx");
};

const columns = [
  { name: "NOMBRE Y APELLIDOS", hint: "Nombre completo del candidato." },
  { name: "CEDULA", hint: "Solo números, sin puntos ni espacios." },
  { name: "SEDE", hint: "Sede del candidato (ej. BELLO)." },
  { name: "PROCESO", hint: "Cargo o proceso (ej. JEFE DE ENFERMERÍA)." },
];

function GuideStep({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
        {number}
      </span>
      <div className="space-y-1 text-sm leading-6 text-slate-700">{children}</div>
    </li>
  );
}

function ReplaceWarning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function CandidatesUploadGuideDialog({
  mode,
  onOpenChange,
  onSelectFile,
  onDownloadCurrent,
  isDownloadingCurrent,
}: CandidatesUploadGuideDialogProps) {
  return (
    <Dialog open={mode !== null} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="fixed inset-0 z-50 bg-black/40 supports-[backdrop-filter]:backdrop-blur-sm dark:bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        className="max-h-[90vh] gap-6 overflow-y-auto bg-white sm:max-w-2xl"
      >
        {mode === "candidatos" && (
          <>
            <DialogHeader className="space-y-2">
              <DialogTitle className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                <FileSpreadsheet className="h-6 w-6 text-emerald-600" aria-hidden />
                Actualizar candidatos
              </DialogTitle>
              <DialogDescription>
                Cargue un archivo Excel con la lista completa de candidatos que se mostrará en la votación.
              </DialogDescription>
            </DialogHeader>

            <ReplaceWarning>
              El archivo <strong>reemplaza la lista completa</strong>. Incluya a todos los candidatos, no solo los
              nuevos: quien no esté en el archivo dejará de aparecer.
            </ReplaceWarning>

            <ol className="space-y-4">
              <GuideStep number={1}>
                <p>
                  Parta de la <strong>plantilla</strong> o del <strong>archivo actual</strong> (recomendado para
                  editar la lista existente).
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={downloadCandidatesTemplate}>
                    <Download className="h-4 w-4" aria-hidden />
                    Descargar plantilla
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={onDownloadCurrent}
                    disabled={isDownloadingCurrent}
                  >
                    {isDownloadingCurrent ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Download className="h-4 w-4" aria-hidden />
                    )}
                    Descargar archivo actual
                  </Button>
                </div>
              </GuideStep>
              <GuideStep number={2}>
                <p>
                  En la <strong>primera hoja</strong>, la <strong>fila 1</strong> debe tener estas 4 columnas. Cada
                  fila siguiente es un candidato.
                </p>
                <div className="overflow-hidden rounded-md border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Columna</th>
                        <th className="px-3 py-2 font-semibold">Contenido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {columns.map((column) => (
                        <tr key={column.name}>
                          <td className="px-3 py-2 font-medium text-slate-900">{column.name}</td>
                          <td className="px-3 py-2 text-slate-600">{column.hint}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500">
                  El orden de las columnas y el nombre de la hoja no importan, y no se distinguen tildes ni
                  mayúsculas en los encabezados. Si el archivo tiene otras columnas, el sistema no las tiene en cuenta.
                  Las filas sin nombre o con cédula no numérica se omiten.
                </p>
              </GuideStep>
              <GuideStep number={3}>
                <p>
                  Guarde como <strong>.xlsx</strong> o <strong>.xls</strong> (máximo 5 MB). El nombre del archivo no
                  importa.
                </p>
              </GuideStep>
            </ol>
          </>
        )}

        {mode === "fotos" && (
          <>
            <DialogHeader className="space-y-2">
              <DialogTitle className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                <FolderArchive className="h-6 w-6 text-blue-700" aria-hidden />
                Actualizar fotos de candidatos
              </DialogTitle>
              <DialogDescription>
                Cargue un archivo .zip con las fotos que se mostrarán junto a cada candidato.
              </DialogDescription>
            </DialogHeader>

            <ReplaceWarning>
              Al cargar el ZIP se <strong>eliminan todas las fotos actuales</strong> y se reemplazan por las del
              archivo. Incluya las fotos de <strong>todos</strong> los candidatos, no solo las nuevas o modificadas.
            </ReplaceWarning>

            <ol className="space-y-4">
              <GuideStep number={1}>
                <p>
                  Nombre cada foto <strong>solo con la cédula</strong> del candidato, tal como aparece en el Excel de
                  candidatos, sin puntos, espacios, letras ni guiones.
                </p>
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-900">
                    <p className="font-semibold">Correcto</p>
                    <p className="font-mono">1020304050.jpg</p>
                    <p className="font-mono">52123456.png</p>
                  </div>
                  <div className="rounded-md border border-red-200 bg-red-50 p-2 text-red-900">
                    <p className="font-semibold">Se ignora</p>
                    <p className="font-mono">1.020.304.050.jpg</p>
                    <p className="font-mono">Maria Perez.jpg</p>
                  </div>
                </div>
              </GuideStep>
              <GuideStep number={2}>
                <p>
                  Formatos aceptados: <strong>.jpg, .jpeg o .png</strong>. Se recomienda una foto cuadrada tipo
                  documento. Otros archivos dentro del ZIP se ignoran.
                </p>
              </GuideStep>
              <GuideStep number={3}>
                <p>
                  Seleccione todas las fotos y comprímalas en un único archivo <strong>.zip</strong> (máximo 30 MB). Las
                  fotos pueden estar dentro de carpetas y el nombre del ZIP no importa.
                </p>
              </GuideStep>
            </ol>
          </>
        )}

        {mode && (
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" className="gap-2" onClick={() => onSelectFile(mode)}>
              <Upload className="h-4 w-4" aria-hidden />
              {mode === "candidatos" ? "Seleccionar archivo Excel" : "Seleccionar archivo ZIP"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
