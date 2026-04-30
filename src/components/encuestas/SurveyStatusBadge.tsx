import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SurveyStatus } from '@/services/surveyAdminApi';

interface SurveyStatusBadgeProps {
  status: SurveyStatus;
  className?: string;
}

const statusConfig: Record<SurveyStatus, { label: string; className: string; variant: 'secondary' | 'default' }> = {
  draft: {
    label: 'Borrador',
    className: '',
    variant: 'secondary',
  },
  active: {
    label: 'Activa',
    className: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    variant: 'default',
  },
  closed: {
    label: 'Cerrada',
    className: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    variant: 'default',
  },
};

export function SurveyStatusBadge({ status, className }: SurveyStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
