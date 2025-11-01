/**
 * Modal de cierre de sesión del chatbot por inactividad
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";

interface SessionTimeoutDialogProps {
  open: boolean;
  conversationId: string;
  onClose: () => void;
  onSaveFeedback?: (feedback: "like" | "dislike") => Promise<void>;
}

export const SessionTimeoutDialog: React.FC<SessionTimeoutDialogProps> = ({
  open,
  conversationId,
  onClose,
  onSaveFeedback,
}) => {
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (feedback: "like" | "dislike") => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (onSaveFeedback) {
        await onSaveFeedback(feedback);
      }
      setFeedbackGiven(true);
      
      toast.success(
        feedback === "like" 
          ? "¡Gracias por tu feedback positivo!" 
          : "Gracias por tu feedback. Trabajaremos en mejorar."
      );

      // Cerrar después de 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error guardando feedback:", error);
      toast.error("No se pudo guardar el feedback, pero gracias de todas formas.");
      setTimeout(() => {
        onClose();
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipFeedback = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {feedbackGiven ? "¡Gracias!" : "Sesión finalizada"}
          </DialogTitle>
          <DialogDescription className="text-center space-y-4 pt-4">
            {!feedbackGiven ? (
              <>
                <p className="text-base">
                  Tu sesión de chat ha finalizado por inactividad.
                </p>
                <p className="text-base font-medium">
                  ¿Te fue útil nuestra conversación?
                </p>
                <div className="flex gap-3 justify-center pt-2">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleFeedback("like")}
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <ThumbsUp className="h-5 w-5" />
                    Sí, fue útil
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleFeedback("dislike")}
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <ThumbsDown className="h-5 w-5" />
                    No mucho
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipFeedback}
                  disabled={isSubmitting}
                  className="mt-2"
                >
                  Omitir
                </Button>
              </>
            ) : (
              <div className="py-4">
                <p className="text-lg font-medium text-primary">
                  ¡Hasta pronto! 👋
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Estamos aquí cuando nos necesites.
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
