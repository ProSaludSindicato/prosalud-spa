import { useEffect, useState } from "react";
import type { Candidate } from "@/types/assemblyVoting";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, User } from "lucide-react";
import { getInitialsFromName } from "@/utils/avatarUtils";

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onSelect: (candidateId: string) => void;
  disabled?: boolean;
}

function getTwoInitialsForCandidate(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  const fromWords = getInitialsFromName(trimmed);
  if (fromWords.length >= 2) {
    return fromWords.slice(0, 2);
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return fromWords || "?";
}

export function CandidateCard({ candidate, isSelected, onSelect, disabled = false }: CandidateCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const photoUrl = candidate.photo?.trim() ?? "";
  const showInitials = !photoUrl || imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl, candidate.id]);

  return (
    <Card
      className={`relative flex h-full flex-col transition-all duration-300 ${
        isSelected
          ? "scale-[1.02] border-secondary bg-gradient-to-br from-secondary via-secondary/90 to-secondary/80 shadow-2xl ring-4 ring-secondary"
          : "bg-card hover:scale-[1.01] hover:shadow-lg"
      } ${disabled ? "opacity-60" : ""}`}
    >
      {isSelected && (
        <div className="absolute -right-3 -top-3 z-10 rounded-full bg-white p-2.5 text-secondary shadow-xl ring-4 ring-secondary/30">
          <CheckCircle2 className="h-7 w-7" />
        </div>
      )}

      <CardHeader className="flex-shrink-0 pb-4 text-center">
        <div className="relative mx-auto mb-4">
          <div
            className={`mx-auto h-32 w-32 overflow-hidden rounded-full shadow-md ${
              isSelected ? "border-4 border-white ring-4 ring-white/30" : "border-4 border-primary/10"
            }`}
          >
            {showInitials ? (
              <div
                className={`flex h-full w-full items-center justify-center text-2xl font-semibold tracking-tight ${
                  isSelected ? "bg-white text-secondary" : "bg-accent text-accent-foreground"
                }`}
                role="img"
                aria-label={candidate.name}
              >
                {getTwoInitialsForCandidate(candidate.name)}
              </div>
            ) : (
              <img
                src={photoUrl}
                alt={candidate.name}
                className="h-full w-full object-cover"
                onError={() => setImageFailed(true)}
              />
            )}
          </div>
          <div
            className={`absolute bottom-0 right-0 rounded-full p-2 ${
              isSelected ? "bg-white text-secondary" : "bg-primary text-primary-foreground"
            }`}
          >
            <User className="h-4 w-4" />
          </div>
        </div>

        <CardTitle className={`text-xl leading-tight ${isSelected ? "text-white" : ""}`}>
          <span className="line-clamp-2">{candidate.name}</span>
        </CardTitle>
        <CardDescription className={`font-medium ${isSelected ? "text-white/90" : "text-primary"}`}>
          {candidate.position}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-end">
        <Button
          variant={isSelected ? "default" : "outline"}
          className={`w-full ${isSelected ? "bg-white font-semibold text-secondary shadow-lg hover:bg-white/90" : ""}`}
          onClick={() => onSelect(candidate.id)}
          disabled={disabled}
        >
          {isSelected ? "✓ Seleccionado" : "Seleccionar"}
        </Button>
      </CardContent>
    </Card>
  );
}
