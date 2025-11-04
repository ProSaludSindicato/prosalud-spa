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

// Terminología sindical ProSalud (términos correctos del sindicato)
const terminologiaSindical: { [key: string]: string } = {
  // Términos coloquiales -> Términos sindicales correctos
  'certificado de convenio': 'carta laboral',
  'prima': 'compensación semestral',
  'vacaciones': 'compensación anual por descanso',
  'cesantías': 'compensación anual diferida',
  'cesantias': 'compensación anual diferida',
  'intereses': 'rendimientos',
  'intereses a las cesantías': 'rendimientos',
  'salario': 'compensación',
  'liquidación': 'compensación final',
  'liquidacion': 'compensación final',
  'caja de compensación': 'comfenalco',
  'caja de compensacion': 'comfenalco',
  'caja compensación familiar': 'comfenalco',
};

// Sugerencias inteligentes basadas en el contexto de ProSalud (3 sugerencias específicas por tema)
const contextualSuggestions: { [key: string]: string[] } = {
  'incapacidad': [
    '¿Cómo consulto el pago de mi incapacidad?',
    'Requisitos para presentar incapacidad',
    'Estado de radicado de incapacidad'
  ],
  'carta_laboral': [
    '¿Cómo solicito mi carta laboral?',
    'Requisitos para carta laboral',
    'Tiempo de entrega carta laboral'
  ],
  'certificado': [
    'Solicitar certificado de afiliación',
    'Certificado aportes seguridad social',
    'Tipos de certificados disponibles'
  ],
  'contacto': [
    'Número de teléfono de ProSalud',
    'Ubicación oficinas ProSalud',
    'Horarios de atención'
  ],
  'convenio': [
    'Hospitales con convenio ProSalud',
    'Convenio con Comfenalco',
    'Certificado de convenio sindical'
  ],
  'pago': [
    'Verificar estado de mi pago',
    'Actualizar datos bancarios',
    'Fechas de pago de compensaciones'
  ],
  'compensacion_semestral': [
    '¿Cuándo pagan compensación semestral?',
    'Monto compensación semestral',
    'Requisitos para compensación semestral'
  ],
  'compensacion_anual_descanso': [
    'Solicitar compensación anual por descanso',
    '¿Cuántos días de descanso tengo?',
    '¿Cómo se calcula el descanso?'
  ],
  'compensacion_anual_diferida': [
    'Solicitar compensación anual diferida',
    '¿Cuándo se paga la diferida?',
    'Requisitos para diferida'
  ],
  'rendimientos': [
    '¿Qué son los rendimientos?',
    '¿Cómo se calculan los rendimientos?',
    'Fecha de pago de rendimientos'
  ],
  'compensacion_final': [
    'Proceso de compensación final',
    'Documentos para compensación final',
    'Tiempo de pago compensación final'
  ],
  'descanso': [
    'Solicitar compensación por descanso',
    'Requisitos para compensación por descanso',
    'Compensación por descanso de maternidad'
  ],
  'retiro': [
    'Proceso de retiro del sindicato',
    'Documentos necesarios para retiro',
    'Tiempo de procesamiento del retiro'
  ],
  'cuenta': [
    'Actualizar datos personales',
    'Certificación bancaria requisitos',
    'Cambiar datos bancarios'
  ],
  'microcredito': [
    'Requisitos para microcrédito',
    'Monto máximo de microcrédito',
    'Tasas de interés microcrédito'
  ],
  'turno': [
    'Solicitar cambio de turno',
    'Ver cuadro de turnos',
    'Requisitos cambio de turno'
  ],
  'bienestar': [
    'Próximos eventos de bienestar',
    'Galería de fotos eventos',
    'Cómo participar en actividades'
  ],
  'sst': [
    'Protocolos de seguridad laboral',
    'Reportar accidente de trabajo',
    'Elementos de protección personal'
  ],
  'comfenalco': [
    'Afiliación a Comfenalco',
    'Servicios disponibles Comfenalco',
    'Descuentos en Comfenalco'
  ],
  'prosalud': [
    '¿Qué es ProSalud?',
    'Misión y visión de ProSalud',
    'Estructura organizacional'
  ],
  'afiliacion': [
    'Requisitos para afiliarse',
    'Costo de afiliación a ProSalud',
    'Beneficios de ser afiliado'
  ],
  'tramite': [
    'Trámites disponibles en línea',
    'Requisitos para trámites',
    'Cómo iniciar un trámite'
  ],
  'estatuto': [
    'Ver estatutos del sindicato',
    'Derechos y deberes afiliados',
    'Reglamento interno ProSalud'
  ],
  'eps': [
    'Información EPS Sura',
    'Cambiar de EPS',
    'Autorización procedimientos EPS'
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

    // Normalizar términos coloquiales a terminología sindical
    let normalizedText = fullText;
    Object.entries(terminologiaSindical).forEach(([coloquial, sindical]) => {
      const regex = new RegExp(coloquial, 'gi');
      normalizedText = normalizedText.replace(regex, sindical);
    });

    // Buscar por sinónimos o términos relacionados (ampliado con terminología sindical)
    const keywordRelations: { [key: string]: string[] } = {
      'incapacidad': ['incapacidad', 'incapacidades', 'licencia', 'ausencia', 'reposo', 'médico', 'enfermedad', 'salud', 'ausentismo'],
      'carta_laboral': ['carta laboral', 'certificado de convenio', 'certificado convenio', 'constancia laboral', 'carta de trabajo', 'certificación laboral'],
      'certificado': ['certificado', 'constancia', 'documento', 'comprobante', 'acreditación', 'certificación', 'afiliación'],
      'contacto': ['teléfono', 'correo', 'dirección', 'ubicación', 'llamar', 'escribir', 'contactar', 'celular', 'whatsapp', 'email'],
      'pago': ['pago', 'dinero', 'transferencia', 'consignación', 'cuenta', 'bancaria', 'plata', 'saldo', 'consignar', 'girar'],
      'compensacion_semestral': ['prima', 'compensación semestral', 'prima semestral', 'bonificación', 'prima de servicios'],
      'compensacion_anual_descanso': ['vacaciones', 'compensación anual por descanso', 'descanso anual', 'días de descanso', 'periodo vacacional'],
      'compensacion_anual_diferida': ['cesantías', 'cesantias', 'compensación anual diferida', 'compensación diferida', 'ahorro', 'cesantes'],
      'rendimientos': ['intereses', 'intereses a las cesantías', 'rendimientos', 'intereses cesantías', 'rentabilidad'],
      'compensacion_final': ['liquidación', 'liquidacion', 'compensación final', 'finiquito', 'pago final', 'indemnización'],
      'descanso': ['descanso', 'vacaciones', 'permiso', 'ausencia', 'tiempo libre', 'licencia', 'días libres'],
      'retiro': ['retiro', 'retirar', 'desafiliar', 'salir', 'desvincular', 'renuncia', 'desvinculación'],
      'cuenta': ['cuenta', 'banco', 'bancaria', 'actualizar', 'cambiar', 'datos bancarios', 'número de cuenta', 'consignación', 'datos personales', 'actualizar datos'],
      'tramite': ['trámite', 'tramite', 'solicitud', 'proceso', 'gestión', 'procedimiento', 'requisito', 'documentación'],
      'bienestar': ['bienestar', 'evento', 'actividad', 'recreación', 'galería', 'fotos', 'actividades', 'integración'],
      'turno': ['turno', 'cambio', 'horario', 'cuadro', 'cronograma', 'cambio de turno', 'rotación'],
      'microcredito': ['microcrédito', 'microcredito', 'crédito', 'préstamo', 'financiación', 'dinero prestado', 'préstamo', 'financiamiento'],
      'comfenalco': ['comfenalco', 'caja de compensación', 'caja compensación', 'subsidio familiar', 'caja', 'compensación familiar'],
      'sst': ['sst', 'seguridad', 'salud en el trabajo', 'riesgos', 'accidente', 'emergencia', 'protocolos'],
      'prosalud': ['prosalud', 'sindicato', 'organización', 'quienes somos', 'misión', 'visión'],
      'afiliacion': ['afiliación', 'afiliacion', 'afiliar', 'inscribir', 'vinculación', 'registro', 'asociarse'],
      'estatuto': ['estatuto', 'estatutos', 'reglamento', 'normativa', 'normas', 'contrato sindical'],
      'eps': ['eps', 'salud', 'sura', 'medicina', 'médico', 'consulta', 'autorización'],
    };

    // Buscar en texto normalizado también
    Object.entries(keywordRelations).forEach(([mainKeyword, relatedWords]) => {
      if (relatedWords.some(word => fullText.includes(word) || normalizedText.includes(word))) {
        const suggestions = contextualSuggestions[mainKeyword];
        if (suggestions) {
          foundSuggestions.push(...suggestions);
        }
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
