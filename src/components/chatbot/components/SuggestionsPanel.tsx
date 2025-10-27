/**
 * Componente para el panel de sugerencias del chatbot
 */

import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface SuggestionsPanelProps {
  suggestions: string[];
  isSuggestionsExpanded: boolean;
  onToggle: () => void;
  onSuggestionClick: (suggestion: string) => void;
}

export const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  suggestions,
  isSuggestionsExpanded,
  onToggle,
  onSuggestionClick,
}) => {
  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer"
        onClick={onToggle}
      >
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Preguntas sugeridas</p>
        <button
          className="text-gray-600 transition-colors duration-300 hover:text-prosalud-salud focus:outline-none dark:text-gray-400 dark:hover:text-prosalud-salud"
          aria-label={isSuggestionsExpanded ? "Contraer sugerencias" : "Expandir sugerencias"}
        >
          {isSuggestionsExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {isSuggestionsExpanded && (
        <div className="px-3 pb-3">
          <div className="grid grid-cols-1 gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick(suggestion)}
                className="text-left rounded-lg bg-white px-3 py-2 text-xs text-gray-700 shadow-sm transition-all duration-300 hover:bg-prosalud-salud/10 hover:text-gray-900 hover:shadow-md dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-prosalud-salud/20 border border-gray-200 dark:border-gray-500"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

