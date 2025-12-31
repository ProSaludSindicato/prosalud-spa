import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { requestsApiService } from '@/services/requestsApi';
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/errorSanitizer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface BulkResponseProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ProcessResult {
  total: number;
  successful: number;
  failed: number;
  successful_requests?: Array<{
    row: number;
    request_id: string;
    document_type?: string;
    document_number?: string;
    full_name?: string;
    request_type?: string;
    new_status?: string;
  }>;
  errors?: Array<{
    row: number;
    request_id: string;
    error: string;
    document_type?: string;
    document_number?: string;
    full_name?: string;
    request_type?: string;
  }>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const BulkResponseProcessDialog: React.FC<BulkResponseProcessDialogProps> = ({ 
  open, 
  onOpenChange,
  onSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isErrorsOpen, setIsErrorsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError(null);
    setProcessResult(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file extension
    const fileName = file.name.toLowerCase();
    const isValidExtension = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    if (!isValidExtension) {
      setFileError('El archivo debe ser un Excel (.xlsx o .xls)');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`El archivo no debe ser mayor a ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError(null);
    setProcessResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setFileError(null);
    setProcessResult(null);

    try {
      logger.debug('Iniciando procesamiento de respuestas masivas', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      });

      const result = await requestsApiService.processBulkResponse(selectedFile);

      logger.debug('Procesamiento de respuestas masivas completado', result);

      setProcessResult(result.data);
      
      // Establecer estado inicial de los collapsibles
      setIsSuccessOpen(result.data.failed === 0);
      setIsErrorsOpen(result.data.failed > 0);

      if (result.data.failed === 0) {
        toast.success('Procesamiento completado', {
          description: `Se procesaron exitosamente ${result.data.successful} de ${result.data.total} respuestas.`,
          duration: 5000,
        });
        if (onSuccess) {
          onSuccess();
        }
        // No cerrar automáticamente - el usuario puede confirmar y cerrar manualmente
      } else {
        toast.warning('Procesamiento completado con errores', {
          description: `${result.data.successful} exitosas, ${result.data.failed} fallidas de ${result.data.total} totales.`,
          duration: 5000,
        });
      }
    } catch (error) {
      logger.error('Error al procesar respuestas masivas', error instanceof Error ? error.message : error);
      const errorMessage = getErrorMessage(error);
      setFileError(errorMessage);
      toast.error('Error al procesar archivo', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getStatusBadgeClasses = (status: string | undefined): string => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('completada') || statusLower.includes('completed')) {
      return 'bg-green-100 text-green-800';
    }
    if (statusLower.includes('rechazada') || statusLower.includes('rejected')) {
      return 'bg-red-100 text-red-800';
    }
    if (statusLower.includes('revisión') || statusLower.includes('review')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (statusLower.includes('pendiente') || statusLower.includes('pending')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    
    // Default
    return 'bg-gray-100 text-gray-800';
  };

  const handleClose = () => {
    if (!isProcessing) {
      // Si hay resultados de procesamiento, recargar la página para reflejar los cambios
      if (processResult) {
        handleRemoveFile();
        onOpenChange(false);
        // Recargar la página después de un pequeño delay para que el modal se cierre primero
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        handleRemoveFile();
        onOpenChange(false);
      }
    }
  };

  // Determinar el ancho del modal basado en si hay resultados
  const modalWidth = processResult 
    ? "max-sm:inset-x-4 sm:w-full sm:max-w-5xl lg:max-w-6xl" 
    : "max-sm:inset-x-4 sm:w-full sm:max-w-2xl";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${modalWidth} bg-white max-h-[90vh] overflow-y-auto p-4 sm:p-6`}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Procesar Respuestas Masivas
          </DialogTitle>
          <DialogDescription>
            Seleccione el archivo Excel completado con las respuestas para procesar masivamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          <Card className="border border-gray-200">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Archivo Excel</label>
                {!selectedFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-prosalud transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="bulk-response-file-input"
                    />
                    <label
                      htmlFor="bulk-response-file-input"
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Haga clic para seleccionar un archivo Excel
                      </span>
                      <span className="text-xs text-gray-500">
                        Máximo {MAX_FILE_SIZE / (1024 * 1024)}MB
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileSpreadsheet className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        disabled={isProcessing}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {fileError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-sm font-semibold">Error</AlertTitle>
                  <AlertDescription className="text-sm">{fileError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-2">Instrucciones</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• El archivo debe ser la plantilla descargada previamente</li>
                    <li>• Complete las columnas: Nuevo Estado, Asunto Correo, Cuerpo Correo</li>
                    <li>• No modifique las columnas de identificación</li>
                    <li>• Los estados válidos son: Pendiente, En Revisión, Completada, Rechazada</li>
                    <li>• Puede dejar filas vacías si no desea procesarlas</li>
                    <li>• <strong>No se pueden agregar archivos como anexos</strong> en respuestas masivas. Si requiere anexos, debe responder manualmente desde el panel</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process Results */}
          {processResult && (
            <Card className="border border-gray-200">
              <CardContent className="p-4 space-y-4">
                <h4 className="font-medium text-gray-900">Resultados del Procesamiento</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{processResult.total}</p>
                    <p className="text-xs text-gray-600">Total procesado</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{processResult.successful}</p>
                    <p className="text-xs text-green-700">Exitosas</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{processResult.failed}</p>
                    <p className="text-xs text-red-700">Fallidas</p>
                  </div>
                </div>

                {/* Successful Requests */}
                {processResult.successful_requests && processResult.successful_requests.length > 0 && (
                  <Collapsible 
                    open={isSuccessOpen} 
                    onOpenChange={setIsSuccessOpen}
                    defaultOpen={processResult.failed === 0}
                  >
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-900 hover:underline"
                      >
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        <span className="flex-1 text-left">Ver registros exitosos ({processResult.successful_requests.length})</span>
                        {isSuccessOpen ? (
                          <ChevronUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      <div className="border border-green-200 rounded-lg overflow-hidden bg-green-50/50">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-green-100/50">
                                <TableHead className="w-16">Fila</TableHead>
                                <TableHead className="w-32">ID Solicitud</TableHead>
                                <TableHead className="w-40">Documento</TableHead>
                                <TableHead>Afiliado</TableHead>
                                <TableHead className="w-48">Tipo Solicitud</TableHead>
                                <TableHead className="w-32">Nuevo Estado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {processResult.successful_requests.map((request, index) => (
                                <TableRow key={index} className="hover:bg-green-50/50">
                                  <TableCell className="font-medium">{request.row}</TableCell>
                                  <TableCell className="font-mono text-xs">{request.request_id}</TableCell>
                                  <TableCell className="text-xs">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{request.document_type || '-'}</span>
                                      <span className="font-mono text-xs text-gray-600">{request.document_number || '-'}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">{request.full_name || '-'}</TableCell>
                                  <TableCell className="text-xs">{request.request_type || '-'}</TableCell>
                                  <TableCell>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClasses(request.new_status)}`}>
                                      {request.new_status || '-'}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Errors */}
                {processResult.errors && processResult.errors.length > 0 && (
                  <Collapsible 
                    open={isErrorsOpen} 
                    onOpenChange={setIsErrorsOpen}
                    defaultOpen={processResult.failed > 0}
                  >
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-900 hover:underline"
                      >
                        <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
                        <span className="flex-1 text-left">Ver detalles de errores ({processResult.errors.length})</span>
                        {isErrorsOpen ? (
                          <ChevronUp className="h-4 w-4 text-red-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-red-600" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      <div className="border border-red-200 rounded-lg overflow-hidden bg-red-50/50">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-red-100/50">
                                <TableHead className="w-16">Fila</TableHead>
                                <TableHead className="w-32">ID Solicitud</TableHead>
                                <TableHead className="w-40">Documento</TableHead>
                                <TableHead>Afiliado</TableHead>
                                <TableHead className="w-48">Tipo Solicitud</TableHead>
                                <TableHead>Error</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {processResult.errors.map((error, index) => (
                                <TableRow key={index} className="hover:bg-red-50/50">
                                  <TableCell className="font-medium">{error.row}</TableCell>
                                  <TableCell className="font-mono text-xs">{error.request_id}</TableCell>
                                  <TableCell className="text-xs">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{error.document_type || '-'}</span>
                                      <span className="font-mono text-xs text-gray-600">{error.document_number || '-'}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">{error.full_name || '-'}</TableCell>
                                  <TableCell className="text-xs">{error.request_type || '-'}</TableCell>
                                  <TableCell className="text-sm text-red-600">{error.error}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isProcessing}
            >
              {processResult ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!processResult && (
              <Button 
                onClick={handleProcess}
                disabled={!selectedFile || isProcessing || !!fileError}
                className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Procesar Respuestas
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkResponseProcessDialog;

