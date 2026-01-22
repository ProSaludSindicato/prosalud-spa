import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  History,
  User,
  Calendar,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { wellnessDeliveryService, KitBienestarFileVersion } from '@/services/wellnessDeliveryService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/context/AuthContext';

const KitBienestarFileManager: React.FC = () => {
  const { can } = usePermissions();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Query para obtener versiones del archivo
  const {
    data: versionsResponse,
    isLoading: isLoadingVersions,
    error: versionsError,
    refetch: refetchVersions,
  } = useQuery({
    queryKey: ['kit-bienestar-file-versions'],
    queryFn: () => wellnessDeliveryService.getFileVersions(),
    enabled: can('wellness_delivery.view'),
  });

  const versions = versionsResponse?.data || [];
  const activeVersion = versions.find((v) => v.is_active);

  // Mutation para subir archivo
  const uploadMutation = useMutation({
    mutationFn: (file: File) => wellnessDeliveryService.uploadFile(file),
    onSuccess: (data) => {
      toast.success('Archivo actualizado exitosamente', {
        description: data.message || 'El archivo se ha subido correctamente.',
      });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Refrescar la lista de versiones
      queryClient.invalidateQueries({ queryKey: ['kit-bienestar-file-versions'] });
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Error al subir el archivo. Por favor, intente nuevamente.';
      setUploadError(errorMessage);
      toast.error('Error al subir archivo', {
        description: errorMessage,
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar extensión
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('Formato no válido', {
        description: 'Por favor selecciona un archivo Excel (.xlsx o .xls).',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validar tamaño (10MB)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error('Archivo muy grande', {
        description: 'El archivo no puede ser mayor a 10MB.',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setShowUploadDialog(true);
  };

  const handleUploadConfirm = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const handleUploadCancel = () => {
    setShowUploadDialog(false);
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  };

  if (!can('wellness_delivery.view')) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No tienes permisos para acceder a esta sección.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de subir */}
      <div className="flex items-center justify-end">
        {/* TODO: Validación temporal - solo admin puede subir archivos. Reemplazar con permiso adecuado cuando esté disponible */}
        {can('wellness_delivery.manage') && hasRole('admin') && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir Archivo
            </Button>
          </div>
        )}
      </div>

      {/* Información de versión activa */}
      {activeVersion && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Versión Activa</CardTitle>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                Activa
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600">Nombre del archivo</p>
                <p className="text-sm text-slate-900 font-semibold">{activeVersion.file_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Ruta en S3</p>
                <p className="text-sm text-slate-700 font-mono text-xs break-all">{activeVersion.s3_path}</p>
              </div>
              {activeVersion.uploaded_by && (
                <div>
                  <p className="text-sm font-medium text-slate-600">Subido por</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <p className="text-sm text-slate-900">
                      {activeVersion.uploaded_by.name} ({activeVersion.uploaded_by.email})
                    </p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-slate-600">Fecha de subida</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <p className="text-sm text-slate-900">{formatDate(activeVersion.created_at)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de versiones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-slate-600" />
              <CardTitle>Historial de Versiones</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchVersions()}
              disabled={isLoadingVersions}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingVersions ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
          <CardDescription>
            Lista completa de todas las versiones del archivo Excel, ordenadas por fecha (más reciente primero)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingVersions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-600">Cargando versiones...</span>
            </div>
          ) : versionsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Error al cargar las versiones del archivo. Por favor, intente nuevamente.
              </AlertDescription>
            </Alert>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <FileSpreadsheet className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No hay versiones del archivo registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Nombre del Archivo</TableHead>
                    <TableHead>Subido por</TableHead>
                    <TableHead>Fecha de Subida</TableHead>
                    <TableHead>Ruta S3</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((version) => (
                    <TableRow key={version.id}>
                      <TableCell>
                        {version.is_active ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Activa
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactiva
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">{version.file_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {version.uploaded_by ? (
                          <div>
                            <p className="text-sm font-medium">{version.uploaded_by.name}</p>
                            <p className="text-xs text-slate-500">{version.uploaded_by.email}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">Usuario eliminado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="text-sm">{formatDate(version.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded break-all">
                          {version.s3_path}
                        </code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmación de subida */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar Subida de Archivo</DialogTitle>
            <DialogDescription>
              Se reemplazará la versión activa actual con el nuevo archivo. Todas las versiones anteriores se desactivarán automáticamente.
            </DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-slate-600" />
                  <p className="font-medium text-slate-900">{selectedFile.name}</p>
                </div>
                <div className="text-sm text-slate-600">
                  <p>Tamaño: {formatFileSize(selectedFile.size)}</p>
                  <p>Tipo: {selectedFile.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}</p>
                </div>
              </div>
              {uploadError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleUploadCancel} disabled={uploadMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleUploadConfirm} disabled={uploadMutation.isPending || !selectedFile}>
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Archivo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KitBienestarFileManager;

