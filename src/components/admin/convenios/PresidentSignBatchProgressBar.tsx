import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye } from 'lucide-react';
import {
  fetchActivePresidentSignBatch,
  fetchPresidentSignBatch,
  PresidentSignBatchProgress,
} from '@/services/conveniosManualService';

interface PresidentSignBatchProgressBarProps {
  activeBatchId: number | null;
  requireReview: boolean;
  onReview: (batchId: number, readyCount: number) => void;
  onBatchFullyManaged?: () => void;
  onBatchFinished?: () => void;
}

function isBatchFullyManaged(
  batch: PresidentSignBatchProgress,
  requireReview: boolean,
): boolean {
  if (batch.signing > 0) {
    return false;
  }

  if (requireReview && batch.ready_for_review > 0) {
    return false;
  }

  return batch.processed >= batch.total && batch.total > 0;
}

export default function PresidentSignBatchProgressBar({
  activeBatchId,
  requireReview,
  onReview,
  onBatchFullyManaged,
  onBatchFinished,
}: PresidentSignBatchProgressBarProps) {
  const [batch, setBatch] = useState<PresidentSignBatchProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fullyManagedNotifiedRef = useRef(false);

  const loadBatch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (activeBatchId !== null) {
        const result = await fetchPresidentSignBatch(activeBatchId);
        setBatch(result.batch);
        if (result.batch.status === 'finished') {
          onBatchFinished?.();
        }
        return;
      }

      const result = await fetchActivePresidentSignBatch();
      setBatch(result.batch);
      if (result.batch?.status === 'finished') {
        onBatchFinished?.();
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeBatchId, onBatchFinished]);

  useEffect(() => {
    void loadBatch();
    const interval = window.setInterval(() => {
      void loadBatch();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [loadBatch]);

  useEffect(() => {
    if (!batch || fullyManagedNotifiedRef.current) {
      return;
    }

    if (isBatchFullyManaged(batch, requireReview)) {
      fullyManagedNotifiedRef.current = true;
      onBatchFullyManaged?.();
    }
  }, [batch, requireReview, onBatchFullyManaged]);

  if (!batch && !isLoading) {
    return null;
  }

  if (batch && isBatchFullyManaged(batch, requireReview)) {
    return null;
  }

  const processed = batch?.processed ?? 0;
  const total = batch?.total ?? 0;
  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  const isFinished = batch?.status === 'finished';

  return (
    <div className="sticky top-0 z-20 mb-4 rounded-lg border border-sky-200 bg-sky-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm text-sky-950">Firma masiva del presidente</span>
            {batch && (
              <Badge
                variant={isFinished ? 'secondary' : 'default'}
                className={isFinished ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-sky-600'}
              >
                {isFinished ? 'Finalizado' : 'En progreso'}
              </Badge>
            )}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-sky-600" />}
          </div>

          {batch && (
            <>
              <Progress value={percent} className="h-2 bg-sky-100 [&>div]:bg-sky-600" />
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sky-900/80">
                <span>
                  Procesados: {processed}/{total}
                </span>
                <span>Firmando: {batch.signing}</span>
                {requireReview && <span>Listos revisión: {batch.ready_for_review}</span>}
                <span>Errores: {batch.errors}</span>
                <span>Completados: {batch.completed}</span>
              </div>
            </>
          )}
        </div>

        {batch && requireReview && batch.ready_for_review > 0 && (
          <Button
            size="sm"
            className="shrink-0 gap-1.5 bg-sky-700 shadow-sm hover:bg-sky-800"
            onClick={() => onReview(batch.id, batch.ready_for_review)}
          >
            <Eye className="h-3.5 w-3.5" />
            Revisar ({batch.ready_for_review})
          </Button>
        )}
      </div>
    </div>
  );
}
