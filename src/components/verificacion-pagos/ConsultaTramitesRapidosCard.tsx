import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, CreditCard, FileText, ArrowRight, Sparkles } from 'lucide-react';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';

const ConsultaTramitesRapidosCard: React.FC = () => {
  const { afiliado } = useAfiliadoAuth();

  const validDocumentTypes = ['CC', 'CE', 'PP', 'PT'];
  const getInitialData = () => {
    if (!afiliado) return null;
    return {
      tipoDocumento: (afiliado.tipo_documento && validDocumentTypes.includes(afiliado.tipo_documento)) 
        ? afiliado.tipo_documento 
        : 'CC',
      numeroDocumento: afiliado.documento || '',
    };
  };

  const handleOpenIncapacidad = () => {
    const eventData = getInitialData();
    window.dispatchEvent(new CustomEvent('openChatbotWithIncapacidad', {
      detail: eventData
    }));
  };

  const handleOpenLiquidacion = () => {
    const eventData = getInitialData();
    window.dispatchEvent(new CustomEvent('openChatbotWithLiquidacion', {
      detail: eventData
    }));
  };

  return (
    <Card className="border-2 border-prosalud-salud/20 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 shadow-lg hover:shadow-xl transition-all duration-300 mb-8 overflow-hidden relative">
      {/* Efecto de brillo animado */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-prosalud-salud rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>
      
      <CardContent className="p-6 pt-6 relative z-10">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-prosalud-salud/20 rounded-full blur-lg animate-pulse"></div>
              <div className="relative bg-prosalud-salud p-4 rounded-full shadow-lg">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-primary-prosalud-dark mb-2 flex items-center gap-2">
                Consulta rápida desde nuestro asistente virtual
                <Sparkles className="h-5 w-5 text-prosalud-salud animate-pulse" />
              </h3>
              <p className="text-gray-700 mb-3 leading-relaxed">
                Si necesitas consultar el estado de pago de una incapacidad o verificar el estado de tu compensación final, 
                puedes hacerlo de forma rápida y sencilla desde nuestro asistente virtual especializado.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/60 rounded-lg px-3 py-2 border border-prosalud-salud/20">
                <MessageSquare className="h-4 w-4 text-prosalud-salud flex-shrink-0" />
                <span>
                  <strong>Ubicación:</strong> Esquina inferior derecha de la pantalla
                </span>
              </div>
            </div>
          </div>

          {/* Opciones de trámites */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Consulta de Incapacidad */}
            <div className="bg-white/80 rounded-lg p-5 border border-prosalud-salud/20 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-prosalud-salud/10 p-3 rounded-lg">
                  <CreditCard className="h-5 w-5 text-prosalud-salud" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Consultar pago de incapacidad</h4>
                  <p className="text-sm text-gray-600">
                    Verifica el estado del pago por incapacidad médica
                  </p>
                </div>
              </div>
              <Button
                onClick={handleOpenIncapacidad}
                size="sm"
                className="w-full bg-prosalud-salud hover:bg-prosalud-salud/90 text-white flex items-center justify-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Consultar Ahora
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Consulta de Compensación Final */}
            <div className="bg-white/80 rounded-lg p-5 border border-prosalud-salud/20 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-prosalud-salud/10 p-3 rounded-lg">
                  <FileText className="h-5 w-5 text-prosalud-salud" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Consultar compensación final</h4>
                  <p className="text-sm text-gray-600">
                    Revisa el progreso y verifica si tienes documentos pendientes
                  </p>
                </div>
              </div>
              <Button
                onClick={handleOpenLiquidacion}
                size="sm"
                className="w-full bg-prosalud-salud hover:bg-prosalud-salud/90 text-white flex items-center justify-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Consultar Ahora
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Información adicional */}
          <div className="flex items-center justify-center mt-6 pt-6 border-t border-prosalud-salud/20">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-prosalud-salud rounded-full"></div>
                <span>Consulta automática e inmediata</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-prosalud-salud rounded-full"></div>
                <span>Respuesta segura y personalizada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-prosalud-salud rounded-full"></div>
                <span>Respuesta instantánea si la información está disponible</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsultaTramitesRapidosCard;

