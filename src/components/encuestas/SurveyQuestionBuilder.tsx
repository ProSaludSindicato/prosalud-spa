import { Button } from '@/components/ui/button';
import type { SurveyQuestion } from '@/services/surveyAdminApi';
import { Plus } from 'lucide-react';
import { SurveyQuestionCard } from './SurveyQuestionCard';

interface SurveyQuestionBuilderProps {
  questions: SurveyQuestion[];
  onChange: (questions: SurveyQuestion[]) => void;
}

function createDefaultQuestion(): Omit<SurveyQuestion, 'id' | 'survey_id'> & {
  id: number;
  survey_id: string;
} {
  return {
    id: Date.now(),
    survey_id: '',
    type: 'text',
    label: '',
    is_required: false,
    order: 0,
  };
}

export function SurveyQuestionBuilder({
  questions,
  onChange,
}: SurveyQuestionBuilderProps) {
  function handleAddQuestion(): void {
    const newQuestion = createDefaultQuestion();
    onChange([...questions, newQuestion]);
  }

  function handleChangeQuestion(index: number, updated: SurveyQuestion): void {
    const updatedQuestions = questions.map((q, i) => (i === index ? updated : q));
    onChange(updatedQuestions);
  }

  function handleRemoveQuestion(index: number): void {
    onChange(questions.filter((_, i) => i !== index));
  }

  function handleMoveUp(index: number): void {
    if (index === 0) {
      return;
    }
    const updatedQuestions = [...questions];
    [updatedQuestions[index - 1], updatedQuestions[index]] = [
      updatedQuestions[index],
      updatedQuestions[index - 1],
    ];
    onChange(updatedQuestions);
  }

  function handleMoveDown(index: number): void {
    if (index === questions.length - 1) {
      return;
    }
    const updatedQuestions = [...questions];
    [updatedQuestions[index], updatedQuestions[index + 1]] = [
      updatedQuestions[index + 1],
      updatedQuestions[index],
    ];
    onChange(updatedQuestions);
  }

  return (
    <div className="space-y-3">
      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
          Aún no hay preguntas. Haz clic en "Agregar pregunta" para comenzar.
        </p>
      )}

      {questions.map((question, index) => (
        <SurveyQuestionCard
          key={question.id}
          question={question}
          index={index}
          onChange={(updated) => handleChangeQuestion(index, updated)}
          onRemove={() => handleRemoveQuestion(index)}
          onMoveUp={() => handleMoveUp(index)}
          onMoveDown={() => handleMoveDown(index)}
          isFirst={index === 0}
          isLast={index === questions.length - 1}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={handleAddQuestion}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" />
        Agregar pregunta
      </Button>
    </div>
  );
}
