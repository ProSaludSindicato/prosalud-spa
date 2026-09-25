import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  XCircle,
  Eye,
  Search,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import {
  completeConvenio,
  completeConvenioBulk,
  ConvenioReviewTrackingItem,
  ConvenioReviewTrackingsPage,
  fetchConvenioPreviewPdfBlob,
  fetchPresidentSignBatchTrackingIds,
  fetchPresidentSignBatchTrackings,
  markConvenioReviewError,
  markConvenioReviewErrorBulk,
} from '@/services/conveniosManualService';
import { buildConvenioPdfEmbedSrc, getPdfPageCount } from '@/lib/convenioPdfPreview';
import { getErrorToastContent } from '@/utils/errorSanitizer';

interface ConvenioReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId?: number | null;
  initialTrackings?: ConvenioReviewTrackingItem[];
  onUpdated: () => void;
}

const CONVENIO_CONFIRM_OVERLAY_CLASS =
  'fixed inset-0 z-[60] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0';

const CONVENIO_CONFIRM_CONTENT_CLASS =
  'fixed z-[60] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%]';

const SIDEBAR_PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 350;
const REVIEW_ACTION_TOAST_OPTIONS = {
  position: 'bottom-left' as const,
  duration: 2500,
};

function reviewActionToastSuccess(message: string, description?: string): void {
  toast.success(message, {
    ...REVIEW_ACTION_TOAST_OPTIONS,
    description,
  });
}

function reviewActionToastError(message: string): void {
  toast.error(message, REVIEW_ACTION_TOAST_OPTIONS);
}

async function loadConvenioPreviewEmbedSrc(trackingId: number): Promise<string> {
  const blob = await fetchConvenioPreviewPdfBlob(trackingId);
  const pageCount = await getPdfPageCount(blob);
  const objectUrl = URL.createObjectURL(blob);

  return buildConvenioPdfEmbedSrc(objectUrl, pageCount);
}

function trackingMatchesSearch(tracking: ConvenioReviewTrackingItem, query: string): boolean {
  if (query === '') {
    return true;
  }

  return (
    tracking.nombre_afiliado.toLowerCase().includes(query) ||
    tracking.documento.includes(query) ||
    tracking.nombre_convenio.toLowerCase().includes(query)
  );
}

function ConvenioPdfEmbed({ trackingId }: { trackingId: number }) {
  const [embedSrc, setEmbedSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const loadPdf = async (): Promise<void> => {
      try {
        const src = await loadConvenioPreviewEmbedSrc(trackingId);
        if (cancelled) {
          if (src.startsWith('blob:')) {
            URL.revokeObjectURL(src.split('#')[0] ?? src);
          }
          return;
        }

        objectUrl = src.split('#')[0] ?? src;
        setEmbedSrc(src);
        setHasError(false);
      } catch {
        if (!cancelled) {
          setHasError(true);
        }
      }
    };

    setEmbedSrc(null);
    setHasError(false);
    void loadPdf();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [trackingId]);

  if (hasError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
        No se pudo cargar la vista previa del PDF.
      </div>
    );
  }

  if (!embedSrc) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-md border bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <iframe
      title="Vista previa del convenio"
      src={embedSrc}
      className="h-[min(78vh,900px)] w-full min-w-0 rounded-md border bg-white"
    />
  );
}

interface ConvenioReviewSidebarProps {
  totalCount: number;
  selectedTrackingId: number | null;
  listSearch: string;
  sidebarItems: ConvenioReviewTrackingItem[];
  pagination: Pick<ConvenioReviewTrackingsPage, 'current_page' | 'last_page' | 'from' | 'to' | 'total'>;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onSelect: (tracking: ConvenioReviewTrackingItem) => void;
  onPageChange: (page: number) => void;
}

function ConvenioReviewSidebar({
  totalCount,
  selectedTrackingId,
  listSearch,
  sidebarItems,
  pagination,
  isLoading,
  onSearchChange,
  onSelect,
  onPageChange,
}: ConvenioReviewSidebarProps) {
  const pageStart = pagination.from ?? 0;
  const pageEnd = pagination.to ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col border-r">
      <div className="space-y-2 border-b bg-background p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={listSearch}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar nombre, documento o convenio..."
            className="pl-8"
            aria-label="Buscar convenios pendientes de revisión"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {pagination.total === totalCount
            ? `${totalCount} convenio(s) pendientes`
            : `${pagination.total} de ${totalCount} convenio(s)`}
        </p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && sidebarItems.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay convenios que coincidan con la búsqueda.
          </p>
        ) : (
          <div className="space-y-1.5">
            {sidebarItems.map((item, index) => {
              const globalIndex = pageStart > 0 ? pageStart + index - 1 : index;
              const isSelected = item.id === selectedTrackingId;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`group w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-[13px] font-medium leading-snug text-foreground">
                        {item.nombre_afiliado}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground group-hover:text-sky-950/75">
                        <span className="break-all">{item.documento}</span>
                        <Badge
                          variant="outline"
                          className="max-w-full whitespace-normal border-border bg-background px-1.5 py-0 text-[10px] leading-4 group-hover:border-sky-200 group-hover:bg-white group-hover:text-sky-950"
                        >
                          {item.nombre_convenio}
                        </Badge>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                        isSelected
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-sky-200 bg-sky-100 text-sky-800 group-hover:border-sky-300 group-hover:bg-white group-hover:text-sky-900'
                      }`}
                    >
                      #{globalIndex + 1}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {pagination.last_page > 1 && (
        <div className="mt-auto shrink-0 space-y-2 border-t bg-background p-3">
          <p className="text-center text-xs text-muted-foreground">
            Mostrando {pageStart}–{pageEnd} de {pagination.total}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 px-2.5 text-xs"
              disabled={pagination.current_page <= 1}
              onClick={() => onPageChange(pagination.current_page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="min-w-[5.5rem] text-center text-xs font-medium tabular-nums text-foreground">
              {pagination.current_page} / {pagination.last_page}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 px-2.5 text-xs"
              disabled={pagination.current_page >= pagination.last_page}
              onClick={() => onPageChange(pagination.current_page + 1)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_PAGINATION: ConvenioReviewTrackingsPage = {
  current_page: 1,
  data: [],
  from: null,
  last_page: 1,
  per_page: SIDEBAR_PAGE_SIZE,
  to: null,
  total: 0,
};

export default function ConvenioReviewDialog({
  open,
  onOpenChange,
  batchId = null,
  initialTrackings = [],
  onUpdated,
}: ConvenioReviewDialogProps) {
  const isBatchMode = batchId !== null;

  const [localTrackings, setLocalTrackings] = useState<ConvenioReviewTrackingItem[]>(initialTrackings);
  const [sidebarItems, setSidebarItems] = useState<ConvenioReviewTrackingItem[]>([]);
  const [pagination, setPagination] = useState<ConvenioReviewTrackingsPage>(EMPTY_PAGINATION);
  const [orderedIds, setOrderedIds] = useState<number[]>([]);
  const [selectedTracking, setSelectedTracking] = useState<ConvenioReviewTrackingItem | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [localSidebarPage, setLocalSidebarPage] = useState(0);
  const [jumpToValue, setJumpToValue] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isSidebarLoading, setIsSidebarLoading] = useState(false);
  const [loadError, setLoadError] = useState<{ title: string; description?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmAllCompleteOpen, setConfirmAllCompleteOpen] = useState(false);
  const [confirmAllErrorOpen, setConfirmAllErrorOpen] = useState(false);
  const loadRequestRef = useRef(0);
  const previousSearchRef = useRef<string | null>(null);

  const loadBatchPage = useCallback(
    async (
      page: number,
      search: string,
      options?: { initial?: boolean; selectId?: number | null; refreshIds?: boolean },
    ): Promise<void> => {
      if (batchId === null) {
        return;
      }

      const requestId = ++loadRequestRef.current;
      const shouldRefreshIds = options?.refreshIds ?? options?.initial ?? false;

      if (options?.initial) {
        setIsInitialLoading(true);
      } else {
        setIsSidebarLoading(true);
      }

      setLoadError(null);

      try {
        const listPromise = fetchPresidentSignBatchTrackings(batchId, {
          page,
          per_page: SIDEBAR_PAGE_SIZE,
          q: search,
        });
        const idsPromise = shouldRefreshIds
          ? fetchPresidentSignBatchTrackingIds(batchId, { q: search })
          : Promise.resolve(null);

        const [listResult, idsResult] = await Promise.all([listPromise, idsPromise]);

        if (requestId !== loadRequestRef.current) {
          return;
        }

        setSidebarItems(listResult.data.data);
        setPagination(listResult.data);

        if (idsResult !== null) {
          setOrderedIds(idsResult.data);
        }

        const preferredId = options?.selectId ?? null;
        const selectedItem =
          (preferredId !== null
            ? listResult.data.data.find((item) => item.id === preferredId)
            : null) ??
          listResult.data.data[0] ??
          null;

        setSelectedTracking(selectedItem);
      } catch (err: unknown) {
        if (requestId !== loadRequestRef.current) {
          return;
        }

        const { title, description } = getErrorToastContent(err);
        setLoadError({ title, description });
        setSidebarItems([]);
        setPagination(EMPTY_PAGINATION);
        setOrderedIds([]);
        setSelectedTracking(null);
        toast.error(title, { description });
      } finally {
        if (requestId === loadRequestRef.current) {
          setIsInitialLoading(false);
          setIsSidebarLoading(false);
        }
      }
    },
    [batchId],
  );

  useEffect(() => {
    if (!open) {
      previousSearchRef.current = null;
      setListSearch('');
      setDebouncedSearch('');
      setLocalSidebarPage(0);
      setJumpToValue('');
      setSelectedTracking(null);
      setSidebarItems([]);
      setPagination(EMPTY_PAGINATION);
      setOrderedIds([]);
      setLoadError(null);
      return;
    }

    if (isBatchMode) {
      return;
    }

    setLoadError(null);
    setLocalTrackings(initialTrackings);
    setSelectedTracking(initialTrackings[0] ?? null);
  }, [open, isBatchMode, initialTrackings]);

  useEffect(() => {
    if (!open || !isBatchMode) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(listSearch.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [listSearch, open, isBatchMode]);

  useEffect(() => {
    if (!open || !isBatchMode) {
      return;
    }

    const isFirstLoad = previousSearchRef.current === null;
    const searchChanged = previousSearchRef.current !== debouncedSearch;

    if (!isFirstLoad && !searchChanged) {
      return;
    }

    previousSearchRef.current = debouncedSearch;
    void loadBatchPage(1, debouncedSearch, { initial: isFirstLoad, refreshIds: true });
  }, [debouncedSearch, isBatchMode, loadBatchPage, open]);

  const filteredLocalTrackings = useMemo(() => {
    const query = listSearch.trim().toLowerCase();

    return localTrackings.filter((tracking) => trackingMatchesSearch(tracking, query));
  }, [localTrackings, listSearch]);

  const localSidebarPageCount = Math.max(1, Math.ceil(filteredLocalTrackings.length / SIDEBAR_PAGE_SIZE));

  const localSidebarItems = useMemo(() => {
    const start = localSidebarPage * SIDEBAR_PAGE_SIZE;

    return filteredLocalTrackings.slice(start, start + SIDEBAR_PAGE_SIZE);
  }, [filteredLocalTrackings, localSidebarPage]);

  const localPagination = useMemo(
    (): ConvenioReviewTrackingsPage => ({
      current_page: localSidebarPage + 1,
      data: localSidebarItems,
      from: filteredLocalTrackings.length === 0 ? null : localSidebarPage * SIDEBAR_PAGE_SIZE + 1,
      last_page: localSidebarPageCount,
      per_page: SIDEBAR_PAGE_SIZE,
      to:
        filteredLocalTrackings.length === 0
          ? null
          : Math.min((localSidebarPage + 1) * SIDEBAR_PAGE_SIZE, filteredLocalTrackings.length),
      total: filteredLocalTrackings.length,
    }),
    [filteredLocalTrackings.length, localSidebarItems, localSidebarPage, localSidebarPageCount],
  );

  const currentIndex = useMemo(() => {
    if (!selectedTracking) {
      return -1;
    }

    const ids = isBatchMode ? orderedIds : localTrackings.map((item) => item.id);

    return ids.indexOf(selectedTracking.id);
  }, [isBatchMode, localTrackings, orderedIds, selectedTracking]);

  const remainingIds = isBatchMode ? orderedIds : localTrackings.map((item) => item.id);

  const selectTrackingByGlobalIndex = useCallback(
    async (index: number): Promise<void> => {
      const ids = isBatchMode ? orderedIds : localTrackings.map((item) => item.id);
      const id = ids[index];

      if (!id) {
        return;
      }

      if (!isBatchMode) {
        const tracking = localTrackings[index];

        if (tracking) {
          setSelectedTracking(tracking);
          setLocalSidebarPage(Math.floor(index / SIDEBAR_PAGE_SIZE));
        }

        return;
      }

      const targetPage = Math.floor(index / SIDEBAR_PAGE_SIZE) + 1;
      await loadBatchPage(targetPage, debouncedSearch, { selectId: id });
    },
    [debouncedSearch, isBatchMode, loadBatchPage, localTrackings, orderedIds],
  );

  const handleSearchChange = useCallback(
    (value: string): void => {
      setListSearch(value);

      if (!isBatchMode) {
        setLocalSidebarPage(0);
      }
    },
    [isBatchMode],
  );

  const handleSidebarPageChange = useCallback(
    (page: number): void => {
      if (isBatchMode) {
        void loadBatchPage(page, debouncedSearch);
        return;
      }

      setLocalSidebarPage(page - 1);
    },
    [debouncedSearch, isBatchMode, loadBatchPage],
  );

  const handleSelectTracking = useCallback((tracking: ConvenioReviewTrackingItem): void => {
    setSelectedTracking(tracking);
  }, []);

  const handleJumpTo = useCallback((): void => {
    const parsed = Number.parseInt(jumpToValue, 10);
    const max = isBatchMode ? orderedIds.length : localTrackings.length;

    if (Number.isNaN(parsed) || parsed < 1 || parsed > max) {
      toast.error(`Ingrese un número entre 1 y ${max}.`);
      return;
    }

    void selectTrackingByGlobalIndex(parsed - 1);
    setJumpToValue('');
  }, [isBatchMode, jumpToValue, localTrackings.length, orderedIds.length, selectTrackingByGlobalIndex]);

  useEffect(() => {
    if (!open || confirmAllCompleteOpen || confirmAllErrorOpen || isSubmitting) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === 'ArrowLeft' && currentIndex > 0) {
        event.preventDefault();
        void selectTrackingByGlobalIndex(currentIndex - 1);
      }

      if (event.key === 'ArrowRight' && currentIndex >= 0 && currentIndex < remainingIds.length - 1) {
        event.preventDefault();
        void selectTrackingByGlobalIndex(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    open,
    confirmAllCompleteOpen,
    confirmAllErrorOpen,
    isSubmitting,
    currentIndex,
    remainingIds.length,
    selectTrackingByGlobalIndex,
  ]);

  const removeCurrentAndAdvance = (): void => {
    if (!selectedTracking) {
      return;
    }

    setLocalTrackings((previous) => {
      const currentIdx = previous.findIndex((item) => item.id === selectedTracking.id);
      const next = previous.filter((item) => item.id !== selectedTracking.id);

      if (next.length === 0) {
        setSelectedTracking(null);
        onOpenChange(false);
      } else {
        const nextIdx = Math.min(currentIdx, next.length - 1);
        setSelectedTracking(next[nextIdx] ?? null);
      }

      return next;
    });
    onUpdated();
  };

  const handleCompleteCurrent = async (): Promise<void> => {
    if (!selectedTracking) {
      return;
    }

    setIsSubmitting(true);
    try {
      await completeConvenio(selectedTracking.id);
      reviewActionToastSuccess(
        'Convenio completado',
        `${selectedTracking.nombre_afiliado} — correo enviado al afiliado.`,
      );

      if (isBatchMode) {
        const nextIds = orderedIds.filter((id) => id !== selectedTracking.id);

        if (nextIds.length === 0) {
          onOpenChange(false);
        } else {
          const nextIndex = Math.min(currentIndex, nextIds.length - 1);
          const nextId = nextIds[nextIndex] ?? nextIds[nextIds.length - 1];
          const nextPage = Math.floor(nextIndex / SIDEBAR_PAGE_SIZE) + 1;
          await loadBatchPage(nextPage, debouncedSearch, { selectId: nextId, refreshIds: true });
        }
      } else {
        removeCurrentAndAdvance();
      }

      onUpdated();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'No se pudo completar el convenio.';
      reviewActionToastError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkErrorCurrent = async (): Promise<void> => {
    if (!selectedTracking) {
      return;
    }

    setIsSubmitting(true);
    try {
      await markConvenioReviewError(selectedTracking.id);
      reviewActionToastSuccess(
        'Rechazado en revisión',
        'Use «Solicitar nueva firma del afiliado» en el historial si debe firmar de nuevo el documento original.',
      );

      if (isBatchMode) {
        const nextIds = orderedIds.filter((id) => id !== selectedTracking.id);

        if (nextIds.length === 0) {
          onOpenChange(false);
        } else {
          const nextIndex = Math.min(currentIndex, nextIds.length - 1);
          const nextId = nextIds[nextIndex] ?? nextIds[nextIds.length - 1];
          const nextPage = Math.floor(nextIndex / SIDEBAR_PAGE_SIZE) + 1;
          await loadBatchPage(nextPage, debouncedSearch, { selectId: nextId, refreshIds: true });
        }
      } else {
        removeCurrentAndAdvance();
      }

      onUpdated();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'No se pudo marcar el error.';
      reviewActionToastError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteAll = async (): Promise<void> => {
    if (remainingIds.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await completeConvenioBulk(remainingIds);
      toast.success(`${result.accepted} convenio(s) completados`, {
        description:
          result.rejected.length > 0
            ? `${result.rejected.length} no pudieron completarse.`
            : 'Se enviaron los correos correspondientes.',
      });
      onOpenChange(false);
      onUpdated();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'No se pudo completar el lote.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      setConfirmAllCompleteOpen(false);
    }
  };

  const handleMarkErrorAll = async (): Promise<void> => {
    if (remainingIds.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await markConvenioReviewErrorBulk(remainingIds);
      toast.success(`${result.accepted} convenio(s) rechazados en revisión`);
      onOpenChange(false);
      onUpdated();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'No se pudo marcar el lote con error.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      setConfirmAllErrorOpen(false);
    }
  };

  const activeSidebarItems = isBatchMode ? sidebarItems : localSidebarItems;
  const activePagination = isBatchMode ? pagination : localPagination;
  const hasTrackings = isBatchMode ? orderedIds.length > 0 : localTrackings.length > 0;
  const displayTotal = isBatchMode ? orderedIds.length : localTrackings.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[95vh] w-[min(96vw,1440px)] max-w-[min(96vw,1440px)] flex-col overflow-hidden p-0 sm:max-w-[min(96vw,1440px)]">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Revisión de convenios firmados
            </DialogTitle>
            <DialogDescription>
              Revise el convenio completo: contenido, firma del afiliado y ubicación de las firmas. Si
              todo está correcto, complételo; si detecta un problema, rechácelo para gestionarlo desde
              el historial.
              {displayTotal > 1 && (
                <span className="mt-1 block">
                  Use la búsqueda, «Ir a» o las flechas del teclado (← →) para moverse entre convenios.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {isInitialLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 pb-6 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{loadError.title}</p>
                {loadError.description && (
                  <p className="max-w-lg text-sm text-muted-foreground">{loadError.description}</p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadBatchPage(1, debouncedSearch, { initial: true })}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar carga
              </Button>
            </div>
          ) : !hasTrackings ? (
            <div className="px-6 pb-6 text-sm text-muted-foreground">
              No hay convenios pendientes de revisión.
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 items-stretch gap-0 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
              <ConvenioReviewSidebar
                totalCount={displayTotal}
                selectedTrackingId={selectedTracking?.id ?? null}
                listSearch={listSearch}
                sidebarItems={activeSidebarItems}
                pagination={activePagination}
                isLoading={isBatchMode && isSidebarLoading}
                onSearchChange={handleSearchChange}
                onSelect={handleSelectTracking}
                onPageChange={handleSidebarPageChange}
              />

              <div className="flex min-h-0 min-w-0 flex-col px-4 pb-4">
                {selectedTracking && (
                  <>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium">{selectedTracking.nombre_afiliado}</div>
                        <div className="text-xs text-muted-foreground">
                          {selectedTracking.documento} · {selectedTracking.nombre_convenio}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={currentIndex <= 0}
                          onClick={() => void selectTrackingByGlobalIndex(currentIndex - 1)}
                          aria-label="Convenio anterior"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={1}
                            max={displayTotal}
                            value={jumpToValue}
                            onChange={(event) => setJumpToValue(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                handleJumpTo();
                              }
                            }}
                            placeholder={String(currentIndex + 1)}
                            className="h-8 w-16 px-1 text-center text-xs"
                            aria-label="Ir al convenio número"
                          />
                          <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
                            / {displayTotal}
                          </span>
                        </div>

                        <Button
                          size="icon"
                          variant="outline"
                          disabled={currentIndex >= displayTotal - 1}
                          onClick={() => void selectTrackingByGlobalIndex(currentIndex + 1)}
                          aria-label="Convenio siguiente"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <ConvenioPdfEmbed trackingId={selectedTracking.id} />

                    <DialogFooter className="mt-4 flex-wrap gap-2 sm:justify-between">
                      <div className="flex flex-wrap gap-2">
                        {displayTotal > 1 && (
                          <>
                            <Button
                              variant="secondary"
                              disabled={isSubmitting}
                              onClick={() => setConfirmAllCompleteOpen(true)}
                            >
                              Completar todos ({displayTotal})
                            </Button>
                            <Button
                              variant="outline"
                              disabled={isSubmitting}
                              onClick={() => setConfirmAllErrorOpen(true)}
                            >
                              Rechazar todos
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          disabled={isSubmitting}
                          onClick={() => void handleMarkErrorCurrent()}
                          className="gap-1.5"
                        >
                          <XCircle className="h-4 w-4" />
                          Rechazar
                        </Button>
                        <Button
                          disabled={isSubmitting}
                          onClick={() => void handleCompleteCurrent()}
                          className="gap-1.5"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Completar
                        </Button>
                      </div>
                    </DialogFooter>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmAllCompleteOpen} onOpenChange={setConfirmAllCompleteOpen}>
        <AlertDialogContent className={CONVENIO_CONFIRM_CONTENT_CLASS} overlayClassName={CONVENIO_CONFIRM_OVERLAY_CLASS}>
          <AlertDialogHeader>
            <AlertDialogTitle>Completar todos los convenios</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcarán {displayTotal} convenio(s) como completados y se enviarán los correos
              correspondientes sin revisar uno a uno. Esta acción no se puede deshacer. ¿Desea continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <Button disabled={isSubmitting} onClick={() => void handleCompleteAll()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Completar todos'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAllErrorOpen} onOpenChange={setConfirmAllErrorOpen}>
        <AlertDialogContent className={CONVENIO_CONFIRM_CONTENT_CLASS} overlayClassName={CONVENIO_CONFIRM_OVERLAY_CLASS}>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar todos los convenios</AlertDialogTitle>
            <AlertDialogDescription>
              Los {displayTotal} convenio(s) se marcarán como rechazados en revisión y volverán al
              historial para corrección. Esta acción no se puede deshacer. ¿Desea continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={isSubmitting} onClick={() => void handleMarkErrorAll()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rechazar todos'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
