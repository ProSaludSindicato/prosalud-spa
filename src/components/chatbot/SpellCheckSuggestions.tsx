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
    '¿Dónde presento mi incapacidad?',
    'Estado de mi incapacidad',
    '¿Cuánto me pagan por incapacidad?',
    'Documentos para incapacidades'
  ],
  'certificado': [
    '¿Cómo solicito un certificado de afiliación?',
    '¿Qué tipos de certificados puedo obtener?',
    'Necesito un certificado de convenio',
    'Certificado de seguridad social',
    '¿Cuánto demora un certificado?',
    'Renovar mi certificado'
  ],
  'contacto': [
    '¿Cuál es el número de contacto?',
    '¿Dónde están ubicadas las oficinas?',
    '¿Cuál es el horario de atención?',
    'Correo electrónico de ProSalud',
    '¿Tienen WhatsApp?',
    'Teléfonos de contacto'
  ],
  'servicio': [
    '¿Qué servicios ofrece ProSalud?',
    '¿Cómo accedo a los servicios?',
    'Lista de servicios disponibles',
    'Beneficios para afiliados',
    'Servicios de bienestar',
    'Cómo afiliarse'
  ],
  'convenio': [
    '¿Qué convenios tienen disponibles?',
    '¿Cómo puedo usar los convenios?',
    'Farmacias con convenio',
    'Descuentos en salud',
    'Alianzas comerciales',
    'Convenios con hospitales'
  ],
  'pago': [
    'Estado de mi pago',
    '¿Cuándo recibiré mi pago?',
    'Verificar pagos pendientes',
    'Actualizar cuenta bancaria',
    'Formas de pago',
    'Consultar pago de incapacidad'
  ],
  'tramite': [
    '¿Qué trámites puedo realizar?',
    'Requisitos para trámites',
    '¿Cómo inicio un trámite?',
    'Solicitud de descanso',
    'Cambio de turno',
    'Permisos laborales'
  ],
  'descanso': [
    '¿Cómo solicito un descanso laboral?',
    'Requisitos para descanso',
    'Formato de solicitud de descanso',
    '¿Cuántos días de descanso tengo?',
    'Descanso por maternidad',
    'Descanso por paternidad'
  ],
  'retiro': [
    '¿Cómo me retiro del sindicato?',
    'Proceso de retiro sindical',
    'Documentos para retiro',
    'Formato de retiro',
    'Tiempo de procesamiento del retiro',
    '¿Puedo retirarme sin causales?'
  ],
  'compensacion': [
    '¿Qué es la compensación anual diferida?',
    '¿Cómo solicito la compensación?',
    'Requisitos compensación anual',
    'Formato de compensación',
    '¿Cuándo se paga la compensación?',
    'Monto de compensación'
  ],
  'cuenta': [
    '¿Cómo actualizo mi cuenta bancaria?',
    'Cambiar datos bancarios',
    'Certificación bancaria',
    'Requisitos actualizar cuenta',
    'Formato actualización bancaria',
    'Tiempo de actualización de cuenta'
  ],
  'microcredito': [
    '¿Cómo solicito un microcrédito?',
    'Requisitos para microcrédito',
    'Monto máximo de microcrédito',
    'Tasa de interés microcrédito',
    'Plazo para pagar microcrédito',
    'Documentos para microcrédito'
  ],
  'turno': [
    '¿Cómo solicito cambio de turno?',
    'Permisos de cambio de turno',
    'Cuadro de turnos',
    'Formato cambio de turno',
    '¿Cuántos cambios puedo solicitar?',
    'Requisitos cambio de turno'
  ],
  'bienestar': [
    '¿Qué eventos de bienestar hay?',
    'Galería de eventos',
    'Próximas actividades de bienestar',
    'Cómo participar en eventos',
    'Encuesta de bienestar',
    'Programas de recreación'
  ],
  'sst': [
    '¿Qué es SST?',
    'Seguridad y salud en el trabajo',
    'Protocolos de emergencia',
    'Elementos de protección',
    'Prevención de riesgos',
    'Reportar accidente de trabajo'
  ],
  'comfenalco': [
    '¿Qué es Comfenalco?',
    'Afiliación a Comfenalco',
    'Servicios de Comfenalco',
    'Eventos Comfenalco',
    'Descuentos Comfenalco',
    'Cómo usar servicios Comfenalco'
  ],
  'prosalud': [
    '¿Qué es ProSalud?',
    'Historia de ProSalud',
    'Misión y visión',
    'Quiénes somos',
    'Estructura organizacional',
    'Valores de ProSalud'
  ],
  'afiliacion': [
    '¿Cómo me afilio a ProSalud?',
    'Requisitos para afiliación',
    'Costo de afiliación',
    'Beneficios de ser afiliado',
    'Proceso de afiliación',
    'Documentos para afiliarme'
  ],
  'estatuto': [
    'Estatutos del sindicato',
    'Reglamento interno',
    'Derechos y deberes',
    'Normatividad sindical',
    'Contrato sindical',
    'Beneficios estatutarios'
  ],
  'eps': [
    'Información sobre EPS',
    'EPS Sura',
    'Cambio de EPS',
    'Cobertura de salud',
    'Consultas médicas',
    'Autorizaciones EPS'
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
    const fullText = inputText.toLowerCase();

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

    // Buscar sugerencias contextuales de forma más amplia
    const foundSuggestions: string[] = [];
    
    // Buscar por palabra clave exacta o inicio de palabra
    Object.entries(contextualSuggestions).forEach(([keyword, suggestionList]) => {
      // Coincidencia exacta de palabra clave en el texto completo
      const keywordLower = keyword.toLowerCase();
      
      if (fullText.includes(keywordLower) || 
          words.some(word => word.startsWith(keywordLower.slice(0, Math.max(3, keywordLower.length - 2)))) ||
          keywordLower.startsWith(lastWord.slice(0, Math.max(3, lastWord.length)))) {
        foundSuggestions.push(...suggestionList);
      }
    });

    // Buscar por sinónimos o términos relacionados
    const keywordRelations: { [key: string]: string[] } = {
      'incapacidad': ['incapacidad', 'licencia', 'ausencia', 'reposo', 'médico', 'enfermedad'],
      'certificado': ['certificado', 'constancia', 'documento', 'comprobante', 'acreditación'],
      'contacto': ['teléfono', 'correo', 'dirección', 'ubicación', 'llamar', 'escribir', 'contactar'],
      'pago': ['pago', 'dinero', 'transferencia', 'consignación', 'cuenta', 'bancaria', 'plata'],
      'descanso': ['descanso', 'vacaciones', 'permiso', 'ausencia', 'tiempo libre'],
      'retiro': ['retiro', 'retirar', 'desafiliar', 'salir', 'desvincular'],
      'cuenta': ['cuenta', 'banco', 'bancaria', 'actualizar', 'cambiar', 'datos bancarios'],
      'tramite': ['trámite', 'solicitud', 'proceso', 'gestión', 'procedimiento'],
      'bienestar': ['bienestar', 'evento', 'actividad', 'recreación', 'galería', 'fotos'],
      'turno': ['turno', 'cambio', 'horario', 'cuadro', 'cronograma'],
      'microcredito': ['microcrédito', 'crédito', 'préstamo', 'financiación', 'dinero prestado'],
    };

    Object.entries(keywordRelations).forEach(([mainKeyword, relatedWords]) => {
      if (relatedWords.some(word => fullText.includes(word))) {
        const suggestions = contextualSuggestions[mainKeyword];
        if (suggestions) {
          foundSuggestions.push(...suggestions);
        }
      }
    });

    // Eliminar duplicados y limitar a 5 sugerencias
    const uniqueSuggestions = [...new Set(foundSuggestions)].slice(0, 5);
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
