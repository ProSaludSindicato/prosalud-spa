import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { QuestionOption, QuestionType, SurveyQuestion } from '@/services/surveyAdminApi';
import { ChevronDown, ChevronUp, Plus, Trash2, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  yes_no: 'Sí / No',
  single_choice: 'Selección única',
  multiple_choice: 'Selección múltiple',
  date: 'Fecha',
  number: 'Número',
  scale: 'Escala (1–10)',
  ranking: 'Clasificación por prioridad',
};

const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  text: 'Campo de una sola línea para respuestas cortas (ej. nombre, ciudad).',
  textarea: 'Campo de varias líneas para respuestas largas o comentarios.',
  yes_no: 'El respondiente elige entre "Sí" o "No".',
  single_choice: 'El respondiente selecciona una opción de una lista (radio).',
  multiple_choice: 'El respondiente puede marcar varias opciones (casillas).',
  date: 'El respondiente ingresa una fecha con selector de calendario.',
  number: 'Campo numérico; solo acepta dígitos.',
  scale: 'Calificación del 1 al 10 (ej. nivel de satisfacción).',
  ranking: 'El respondiente ordena los ítems asignándoles una prioridad numérica.',
};

interface SurveyQuestionCardProps {
  question: SurveyQuestion;
  index: number;
  onChange: (question: SurveyQuestion) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function SurveyQuestionCard({
  question,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: SurveyQuestionCardProps) {
  const hasOptions =
    question.type === 'single_choice' ||
    question.type === 'multiple_choice' ||
    question.type === 'ranking';

  function handleFieldChange<K extends keyof SurveyQuestion>(
    field: K,
    value: SurveyQuestion[K],
  ): void {
    onChange({ ...question, [field]: value });
  }

  function handleTypeChange(type: QuestionType): void {
    const updatedQuestion: SurveyQuestion = { ...question, type };
    if (type === 'yes_no') {
      delete updatedQuestion.options;
      delete updatedQuestion.ranking_unique_priority;
    } else {
      const typeHasOptions = type === 'single_choice' || type === 'multiple_choice' || type === 'ranking';
      if (!typeHasOptions) {
        delete updatedQuestion.options;
        delete updatedQuestion.ranking_unique_priority;
      } else if (!updatedQuestion.options || updatedQuestion.options.length === 0) {
        updatedQuestion.options = [{ value: '', label: '' }];
      }
      if (type === 'ranking' && updatedQuestion.ranking_unique_priority === undefined) {
        updatedQuestion.ranking_unique_priority = true;
      }
      if (type !== 'ranking') {
        delete updatedQuestion.ranking_unique_priority;
      }
    }
    onChange(updatedQuestion);
  }

  function handleOptionChange(
    optionIndex: number,
    field: keyof QuestionOption,
    value: string,
  ): void {
    const updatedOptions = (question.options ?? []).map((option, i) =>
      i === optionIndex ? { ...option, [field]: value } : option,
    );
    onChange({ ...question, options: updatedOptions });
  }

  function handleAddOption(): void {
    const updatedOptions = [...(question.options ?? []), { value: '', label: '' }];
    onChange({ ...question, options: updatedOptions });
  }

  function handleRemoveOption(optionIndex: number): void {
    const updatedOptions = (question.options ?? []).filter((_, i) => i !== optionIndex);
    onChange({ ...question, options: updatedOptions });
  }

  return (
    <TooltipProvider>
    <Card className="border border-border">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Pregunta {index + 1} · {QUESTION_TYPE_LABELS[question.type]}
          </span>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onMoveUp}
                  disabled={isFirst}
                  aria-label="Subir pregunta"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Subir pregunta</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onMoveDown}
                  disabled={isLast}
                  aria-label="Bajar pregunta"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bajar pregunta</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  aria-label="Eliminar pregunta"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar pregunta</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={`question-type-${index}`}>Tipo de pregunta</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px]">
                  <p className="text-xs">{QUESTION_TYPE_DESCRIPTIONS[question.type]}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={question.type}
              onValueChange={(value) => handleTypeChange(value as QuestionType)}
            >
              <SelectTrigger id={`question-type-${index}`}>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <Switch
              id={`question-required-${index}`}
              checked={question.is_required}
              onCheckedChange={(checked) => handleFieldChange('is_required', checked)}
            />
            <Label htmlFor={`question-required-${index}`} className="cursor-pointer">
              Respuesta obligatoria
            </Label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`question-label-${index}`}>Enunciado de la pregunta</Label>
          <Input
            id={`question-label-${index}`}
            value={question.label}
            onChange={(e) => handleFieldChange('label', e.target.value)}
            placeholder="Ej: ¿Cuál es su nombre completo?"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`question-help-${index}`}>
            Texto de ayuda{' '}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id={`question-help-${index}`}
            value={question.help_text ?? ''}
            onChange={(e) =>
              handleFieldChange('help_text', e.target.value || undefined)
            }
            placeholder="Instrucción adicional para el respondiente"
          />
        </div>

        {hasOptions && (
          <div className="space-y-2">
            <Label>{question.type === 'ranking' ? 'Ítems a clasificar' : 'Opciones de respuesta'}</Label>
            {question.type === 'ranking' && (
              <p className="text-xs text-muted-foreground">
                Use claves cortas (A, B, C…) como valor; el texto visible como etiqueta.
              </p>
            )}
            <div className="space-y-2">
              {(question.options ?? []).map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <Input
                    value={option.value}
                    onChange={(e) =>
                      handleOptionChange(optionIndex, 'value', e.target.value)
                    }
                    placeholder="Valor (clave)"
                    className="w-28 shrink-0"
                  />
                  <Input
                    value={option.label}
                    onChange={(e) =>
                      handleOptionChange(optionIndex, 'label', e.target.value)
                    }
                    placeholder="Etiqueta visible"
                    className="grow"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOption(optionIndex)}
                    disabled={(question.options ?? []).length <= 1}
                    aria-label="Eliminar opción"
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Agregar opción
            </Button>
          </div>
        )}

        {question.type === 'ranking' && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <Switch
              id={`question-rank-unique-${index}`}
              checked={question.ranking_unique_priority !== false}
              onCheckedChange={(checked) => handleFieldChange('ranking_unique_priority', checked)}
            />
            <div className="space-y-0.5">
              <Label htmlFor={`question-rank-unique-${index}`} className="text-sm font-medium cursor-pointer">
                Prioridades distintas (sin repetir)
              </Label>
              <p className="text-xs text-muted-foreground">
                Activado: si un ítem tiene prioridad 1, ningún otro podrá ser 1. Desactivado: el mismo
                número puede asignarse a varios ítems (empates en prioridad).
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
