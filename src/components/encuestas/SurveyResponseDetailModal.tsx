import { useQuery } from '@tanstack/react-query';
import { Loader2, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getResponse, type SurveyResponseAnswer } from '@/services/surveyAdminApi';
import { formatDateReadable } from '@/utils/dateFormatter';

interface SurveyResponseDetailModalProps {
  surveyId: string;
  responseId: string | null;
  onClose: () => void;
}

function formatAnswerValue(answer: SurveyResponseAnswer): string {
  const raw = answer.value !== undefined && answer.value !== null ? answer.value : answer.decoded_value;
  if (raw === undefined || raw === null) {
    return '—';
  }
  const t = answer.question_type;
  if (t === 'yes_no') {
    if (raw === 'yes' || raw === true) {
      return 'Sí';
    }
    if (raw === 'no' || raw === false) {
      return 'No';
    }
    return String(raw);
  }
  if (t === 'ranking' && typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return Object.entries(raw as Record<string, string | number>)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
  }
  if (Array.isArray(raw)) {
    return raw.join(', ');
  }
  if (typeof raw === 'object') {
    return JSON.stringify(raw);
  }
  return String(raw);
}

export default function SurveyResponseDetailModal({
  surveyId,
  responseId,
  onClose,
}: SurveyResponseDetailModalProps) {
  const isOpen = responseId !== null;

  const { data: response, isLoading } = useQuery({
    queryKey: ['survey-response', surveyId, responseId],
    queryFn: () => getResponse(surveyId, responseId!),
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de respuesta</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : response ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm border rounded-lg p-4 bg-slate-50">
              <div>
                <p className="text-muted-foreground">Nombre</p>
                <p className="font-medium">{response.respondent_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Documento</p>
                <p className="font-medium">
                  {response.respondent_document_type && response.respondent_document_number
                    ? `${response.respondent_document_type} ${response.respondent_document_number}`
                    : response.respondent_document_number ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Hospital</p>
                <p className="font-medium">{response.hospital ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fecha de envío</p>
                <p className="font-medium">{formatDateReadable(response.submitted_at)}</p>
              </div>
            </div>

            {response.answers && response.answers.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Respuestas
                </h3>
                {response.answers.map((answer) => (
                  <div key={answer.id} className="border rounded-lg p-3 space-y-1">
                    <p className="font-semibold text-sm">{answer.question_label ?? `Pregunta ${answer.question_id}`}</p>
                    <p className="text-sm text-muted-foreground">{formatAnswerValue(answer)}</p>
                  </div>
                ))}
              </div>
            )}

            {(response as any).signature_path && (
              <Button
                variant="outline"
                asChild
                className="w-full"
              >
                <a href={(response as any).signature_path} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar firma
                </a>
              </Button>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
