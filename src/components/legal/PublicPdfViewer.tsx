import React, { useEffect, useState } from 'react';
import { FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PublicPdfViewerProps {
  src: string;
  title: string;
}

const PublicPdfViewer: React.FC<PublicPdfViewerProps> = ({ src, title }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let revokedUrl: string | null = null;
    let cancelled = false;

    const loadPdf = async (): Promise<void> => {
      try {
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(`No se pudo cargar el PDF (${response.status})`);
        }

        const buffer = await response.arrayBuffer();
        const blob = new Blob([buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        revokedUrl = url;
        setObjectUrl(url);
        setHasError(false);
      } catch {
        if (!cancelled) {
          setHasError(true);
        }
      }
    };

    void loadPdf();

    return () => {
      cancelled = true;
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [src]);

  if (hasError) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center">
        <FileWarning className="h-10 w-10 text-muted-foreground" />
        <p className="max-w-md text-sm text-muted-foreground">
          No se pudo mostrar el documento en esta página. Ábralo o descárguelo con los botones de arriba.
        </p>
        <Button asChild variant="outline">
          <a href={src} target="_blank" rel="noopener noreferrer">
            Abrir PDF
          </a>
        </Button>
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 text-sm text-muted-foreground">
        Cargando documento…
      </div>
    );
  }

  return (
    <iframe
      title={title}
      src={objectUrl}
      className="w-full min-h-[80vh] border-0"
    />
  );
};

export default PublicPdfViewer;
