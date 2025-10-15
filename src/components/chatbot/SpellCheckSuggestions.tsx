import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Lightbulb } from 'lucide-react';

interface SpellCheckSuggestionsProps {
  inputText: string;
  onSelectSuggestion: (suggestion: string) => void;
  isVisible: boolean;
}

// Palabras comunes mal escritas y sus correcciones (español)
const commonMisspellings: { [key: string]: string } = {
  // Errores comunes en español
  'aver': 'a ver',
  'haver': 'haber',
  'asia': 'hacia',
  'ase': 'hace',
  'aserca': 'acerca',
  'aveses': 'a veces',
  'ayi': 'ahí',
  'ay': 'ahí',
  'lla': 'ya',
  'inpacidad': 'incapacidad',
  'incapasidad': 'incapacidad',
  'sertificado': 'certificado',
  'serbicio': 'servicio',
  'telefono': 'teléfono',
  'correo': 'correo',
  'enformacion': 'información',
  'tramite': 'trámite',
  'solisitud': 'solicitud',
};

// Sugerencias inteligentes basadas en el contexto de ProSalud
const contextualSuggestions: { [key: string]: string[] } = {
  'incapacidad': [
    '¿Cómo consulto el pago de mi incapacidad?',
    '¿Cuáles son los requisitos para una incapacidad?',
    '¿Dónde presento mi incapacidad?'
  ],
  'certificado': [
    '¿Cómo solicito un certificado de afiliación?',
    '¿Qué tipos de certificados puedo obtener?',
    'Necesito un certificado de convenio'
  ],
  'contacto': [
    '¿Cuál es el número de contacto?',
    '¿Dónde están ubicadas las oficinas?',
    '¿Cuál es el horario de atención?'
  ],
  'servicio': [
    '¿Qué servicios ofrece ProSalud?',
    '¿Cómo accedo a los servicios?',
    'Lista de servicios disponibles'
  ],
  'convenio': [
    '¿Qué convenios tienen disponibles?',
    '¿Cómo puedo usar los convenios?',
    'Farmacias con convenio'
  ],
  'pago': [
    'Estado de mi pago',
    '¿Cuándo recibiré mi pago?',
    'Verificar pagos pendientes'
  ],
  'tramite': [
    '¿Qué trámites puedo realizar?',
    'Requisitos para trámites',
    '¿Cómo inicio un trámite?'
  ]
};

export const SpellCheckSuggestions: React.FC<SpellCheckSuggestionsProps> = ({
  inputText,
  onSelectSuggestion,
  isVisible
}) => {
  const [corrections, setCorrections] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!inputText.trim() || !isVisible) {
      setCorrections([]);
      setSuggestions([]);
      return;
    }

    const words = inputText.toLowerCase().split(/\s+/);
    const lastWord = words[words.length - 1];

    // Verificar correcciones ortográficas
    const foundCorrections: string[] = [];
    words.forEach(word => {
      const cleanWord = word.replace(/[.,!?;:]/g, '');
      if (commonMisspellings[cleanWord]) {
        const correctedText = inputText.replace(
          new RegExp(cleanWord, 'gi'),
          commonMisspellings[cleanWord]
        );
        if (!foundCorrections.includes(correctedText)) {
          foundCorrections.push(correctedText);
        }
      }
    });

    setCorrections(foundCorrections.slice(0, 2));

    // Buscar sugerencias contextuales
    const foundSuggestions: string[] = [];
    Object.entries(contextualSuggestions).forEach(([keyword, suggestionList]) => {
      if (inputText.toLowerCase().includes(keyword) || lastWord.startsWith(keyword.slice(0, 3))) {
        foundSuggestions.push(...suggestionList);
      }
    });

    // Eliminar duplicados y limitar a 3 sugerencias
    const uniqueSuggestions = [...new Set(foundSuggestions)].slice(0, 3);
    setSuggestions(uniqueSuggestions);
  }, [inputText, isVisible]);

  if (!isVisible || (corrections.length === 0 && suggestions.length === 0)) {
    return null;
  }

  return (
    <Card 
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-white border shadow-lg z-50 max-h-64 overflow-y-auto"
    >
      {/* Correcciones ortográficas */}
      {corrections.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-orange-600 mb-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Corrección sugerida:</span>
          </div>
          <div className="space-y-1">
            {corrections.map((correction, index) => (
              <button
                key={index}
                onClick={() => onSelectSuggestion(correction)}
                className="w-full text-left px-3 py-2 text-sm bg-orange-50 hover:bg-orange-100 rounded-md transition-colors text-gray-700 border border-orange-200"
              >
                {correction}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sugerencias predictivas */}
      {suggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary-prosalud mb-2">
            <Lightbulb className="h-4 w-4" />
            <span>Sugerencias relacionadas:</span>
          </div>
          <div className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSelectSuggestion(suggestion)}
                className="w-full text-left px-3 py-2 text-sm bg-secondary-prosaludgreen/10 hover:bg-secondary-prosaludgreen/20 rounded-md transition-colors text-gray-700 border border-secondary-prosaludgreen/30"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
