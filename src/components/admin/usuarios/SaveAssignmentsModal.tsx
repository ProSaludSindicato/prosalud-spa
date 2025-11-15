import React from 'react';
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
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, X } from 'lucide-react';
import { User } from '@/types/admin';

interface AssignmentChange {
  type: 'added' | 'removed';
  requestType: string;
  requestTypeLabel: string;
  subtype?: string;
  subtypeLabel?: string;
  userId: string;
  userName: string;
}

interface SaveAssignmentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: AssignmentChange[];
  onConfirm: () => void;
  isLoading?: boolean;
}

const SaveAssignmentsModal: React.FC<SaveAssignmentsModalProps> = ({
  open,
  onOpenChange,
  changes,
  onConfirm,
  isLoading = false,
}) => {
  if (changes.length === 0) {
    return null;
  }

  // Agrupar cambios por tipo de solicitud y subtipo
  const groupedChanges = changes.reduce((acc, change) => {
    const key = change.subtype
      ? `${change.requestType}::${change.subtype}`
      : change.requestType;
    
    if (!acc[key]) {
      acc[key] = {
        requestType: change.requestType,
        requestTypeLabel: change.requestTypeLabel,
        subtype: change.subtype,
        subtypeLabel: change.subtypeLabel,
        added: [],
        removed: [],
      };
    }
    
    if (change.type === 'added') {
      acc[key].added.push({ userId: change.userId, userName: change.userName });
    } else {
      acc[key].removed.push({ userId: change.userId, userName: change.userName });
    }
    
    return acc;
  }, {} as Record<string, {
    requestType: string;
    requestTypeLabel: string;
    subtype?: string;
    subtypeLabel?: string;
    added: { userId: string; userName: string }[];
    removed: { userId: string; userName: string }[];
  }>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold leading-none tracking-tight">
            Confirmar Cambios en Asignaciones
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Se realizarán los siguientes cambios en las asignaciones de solicitudes:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {Object.values(groupedChanges).map((group, index) => (
            <div key={index} className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-semibold text-md text-gray-900">
                  {group.requestTypeLabel}
                  {group.subtypeLabel && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      - {group.subtypeLabel}
                    </span>
                  )}
                </h4>
                
                {group.added.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        Usuarios agregados ({group.added.length}):
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-6">
                      {group.added.map((user) => (
                        <Badge key={user.userId} variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                          {user.userName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {group.removed.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-700">
                        Usuarios removidos ({group.removed.length}):
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-6">
                      {group.removed.map((user) => (
                        <Badge key={user.userId} variant="secondary" className="bg-red-100 text-red-800 border-red-300">
                          {user.userName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {index < Object.values(groupedChanges).length - 1 && <Separator />}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar y Guardar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveAssignmentsModal;

