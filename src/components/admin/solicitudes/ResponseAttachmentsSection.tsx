import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponseAttachment } from '@/types/requests';
import { Download, FileText, Image, File, Loader2, ExternalLink, Paperclip } from 'lucide-react';
import { requestsService } from '@/services/requestsServiceApi';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorSanitizer';
import { logger } from '@/utils/logger';

interface ResponseAttachmentsSectionProps {
  responseId: number;
  attachments: ResponseAttachment[];
  attachmentsCount?: number;
}

const ResponseAttachmentsSection: React.FC<ResponseAttachmentsSectionProps> = ({
  responseId,
  attachments,
  attachmentsCount,
}) => {
  const [downloadingAttachments, setDownloadingAttachments] = useState<Set<number>>(new Set());

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return Image;
    }
    if (extension === 'pdf') {
      return FileText;
    }
    return File;
  };

  const getFileTypeColor = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (extension === 'pdf') {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    if (['doc', 'docx'].includes(extension || '')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (['xls', 'xlsx'].includes(extension || '')) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getFileTypeLabel = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      pdf: 'PDF',
      doc: 'Word',
      docx: 'Word',
      xls: 'Excel',
      xlsx: 'Excel',
      jpg: 'JPEG',
      jpeg: 'JPEG',
      png: 'PNG',
      gif: 'GIF',
      webp: 'WebP',
      svg: 'SVG',
    };
    return typeMap[extension || ''] || extension?.toUpperCase() || 'FILE';
  };

  const isUrlExpired = (urlExpiresAt: string | null): boolean => {
    if (!urlExpiresAt) return true;
    return new Date(urlExpiresAt) < new Date();
  };

  const handleDownload = async (attachment: ResponseAttachment) => {
    setDownloadingAttachments(prev => new Set(prev).add(attachment.id));
    
    try {
      const blob = await requestsService.downloadResponseAttachment(responseId, attachment.id);
      
      // Create a download link to force download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.original_name;
      link.setAttribute('download', attachment.original_name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Anexo descargado', {
        description: `El archivo "${attachment.original_name}" se ha descargado correctamente.`,
      });
    } catch (error) {
      logger.error('Error al descargar anexo de respuesta', error instanceof Error ? error.message : error);
      const errorMessage = getErrorMessage(error);
      toast.error('Error al descargar anexo', {
        description: errorMessage,
      });
    } finally {
      setDownloadingAttachments(prev => {
        const newSet = new Set(prev);
        newSet.delete(attachment.id);
        return newSet;
      });
    }
  };

  const handleOpen = (attachment: ResponseAttachment) => {
    // Open in new tab using the temporary URL if available and not expired
    if (attachment.download_url && !isUrlExpired(attachment.url_expires_at)) {
      window.open(attachment.download_url, '_blank');
    } else {
      // If URL expired, try to download instead
      handleDownload(attachment);
    }
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Paperclip className="h-4 w-4" />
        <span>Anexos de la respuesta</span>
        {attachmentsCount !== undefined && attachmentsCount > 0 && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
            {attachmentsCount} {attachmentsCount === 1 ? 'anexo' : 'anexos'}
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        {attachments.map((attachment) => {
          const FileIcon = getFileIcon(attachment.original_name);
          const isDownloading = downloadingAttachments.has(attachment.id);
          const urlExpired = isUrlExpired(attachment.url_expires_at);
          const canUseUrl = attachment.download_url && !urlExpired;

          return (
            <div
              key={attachment.id}
              className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-md ${getFileTypeColor(attachment.original_name)}`}>
                    <FileIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {attachment.original_name}
                      </h4>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 bg-gray-100`}
                      >
                        {getFileTypeLabel(attachment.original_name)}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(attachment.created_at).toLocaleString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {urlExpired && attachment.download_url && (
                        <span className="ml-2 text-orange-600">• URL expirada</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canUseUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpen(attachment)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Abrir
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
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
    </div>
  );
};

export default ResponseAttachmentsSection;

