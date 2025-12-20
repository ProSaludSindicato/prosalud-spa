import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RequestFile } from '@/types/requests';
import { Download, FileText, Image, File, Loader2, ExternalLink } from 'lucide-react';
import { requestsService } from '@/services/requestsServiceApi';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorSanitizer';
import { logger } from '@/utils/logger';

interface RequestFilesSectionProps {
  requestId: string;
  files: Record<string, RequestFile>;
  filesCount?: number;
}

const RequestFilesSection: React.FC<RequestFilesSectionProps> = ({
  requestId,
  files,
  filesCount,
}) => {
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return Image;
    }
    if (mimeType === 'application/pdf') {
      return FileText;
    }
    return File;
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (mimeType === 'application/pdf') {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatMimeType = (mimeType: string): string => {
    // Mapeo de tipos MIME comunes a nombres más amigables
    const mimeTypeMap: Record<string, string> = {
      // Documentos de Word
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
      'application/msword': 'Word',
      'application/vnd.ms-word': 'Word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.template': 'Word Template',
      
      // Documentos de Excel
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
      'application/vnd.ms-excel': 'Excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.template': 'Excel Template',
      
      // Documentos de PowerPoint
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
      'application/vnd.ms-powerpoint': 'PowerPoint',
      'application/vnd.openxmlformats-officedocument.presentationml.template': 'PowerPoint Template',
      
      // PDF
      'application/pdf': 'PDF',
      
      // Imágenes
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/webp': 'WebP',
      'image/svg+xml': 'SVG',
      
      // Texto
      'text/plain': 'Texto',
      'text/csv': 'CSV',
      'text/html': 'HTML',
      
      // Otros
      'application/zip': 'ZIP',
      'application/x-zip-compressed': 'ZIP',
      'application/json': 'JSON',
      'application/xml': 'XML',
    };

    // Si tenemos un mapeo directo, usarlo
    if (mimeTypeMap[mimeType.toLowerCase()]) {
      return mimeTypeMap[mimeType.toLowerCase()];
    }

    // Para tipos MIME de Office con formato vnd.openxmlformats
    if (mimeType.includes('wordprocessingml')) {
      return 'Word';
    }
    if (mimeType.includes('spreadsheetml')) {
      return 'Excel';
    }
    if (mimeType.includes('presentationml')) {
      return 'PowerPoint';
    }

    // Para tipos genéricos, extraer la parte después de la barra y formatear
    const parts = mimeType.split('/');
    if (parts.length === 2) {
      const subtype = parts[1];
      
      // Si contiene "word" o "document", es Word
      if (subtype.includes('word') || subtype.includes('document')) {
        return 'Word';
      }
      
      // Si contiene "excel" o "spreadsheet", es Excel
      if (subtype.includes('excel') || subtype.includes('spreadsheet')) {
        return 'Excel';
      }
      
      // Si contiene "powerpoint" o "presentation", es PowerPoint
      if (subtype.includes('powerpoint') || subtype.includes('presentation')) {
        return 'PowerPoint';
      }
      
      // Para otros tipos, tomar solo la primera parte antes del punto o guión
      const firstPart = subtype.split('.')[0].split('-')[0];
      return firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase();
    }

    // Fallback: retornar el tipo original formateado
    return mimeType.split('/')[1]?.split('.')[0]?.toUpperCase() || 'FILE';
  };

  const isUrlExpired = (urlExpiresAt: string | null): boolean => {
    if (!urlExpiresAt) return true;
    return new Date(urlExpiresAt) < new Date();
  };

  const handleDownload = async (fileKey: string, file: RequestFile) => {
    // Always use the download endpoint to force download (not open in new tab)
    setDownloadingFiles(prev => new Set(prev).add(fileKey));
    
    try {
      const blob = await requestsService.downloadFile(requestId, fileKey);
      
      // Create a download link to force download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_name;
      // Force download attribute
      link.setAttribute('download', file.original_name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Archivo descargado', {
        description: `El archivo "${file.original_name}" se ha descargado correctamente.`,
      });
    } catch (error) {
      logger.error('Error al descargar archivo de solicitud', error instanceof Error ? error.message : error);
      const errorMessage = getErrorMessage(error);
      toast.error('Error al descargar archivo', {
        description: errorMessage,
      });
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileKey);
        return newSet;
      });
    }
  };

  const handleOpen = (file: RequestFile) => {
    // Open in new tab using the temporary URL
    if (file.download_url && !isUrlExpired(file.url_expires_at)) {
      window.open(file.download_url, '_blank');
    }
  };

  const fileEntries = Object.entries(files || {});

  if (fileEntries.length === 0) {
    return null;
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="bg-gray-50 border-b border-gray-200">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
          <span>Archivos Adjuntos</span>
          {filesCount !== undefined && filesCount > 0 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {filesCount} {filesCount === 1 ? 'archivo' : 'archivos'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {fileEntries.map(([fileKey, file]) => {
            const FileIcon = getFileIcon(file.mime_type);
            const isDownloading = downloadingFiles.has(fileKey);
            const urlExpired = isUrlExpired(file.url_expires_at);
            const canUseUrl = file.download_url && !urlExpired;

            return (
              <div
                key={fileKey}
                className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-md ${getFileTypeColor(file.mime_type)}`}>
                      <FileIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate capitalize">
                          {file.original_key.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 bg-gray-100`}
                        >
                          {formatMimeType(file.mime_type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{file.original_name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canUseUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpen(file)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Abrir
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(fileKey, file)}
                      disabled={isDownloading}
                      className="text-gray-500 bg-gray-100 hover:text-gray-700 hover:bg-gray-200"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Descargando...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-1" />
                          Descargar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestFilesSection;

