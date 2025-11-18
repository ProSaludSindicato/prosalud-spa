import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, CreditCard, ArrowRight, Sparkles } from 'lucide-react';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';

const ConsultaPagoIncapacidadCard: React.FC = () => {
  const { afiliado } = useAfiliadoAuth();

  const handleOpenChatbot = () => {
    const validDocumentTypes = ['CC', 'CE', 'PP', 'PT'];
    const eventData = afiliado ? {
      tipoDocumento: (afiliado.tipo_documento && validDocumentTypes.includes(afiliado.tipo_documento)) 
        ? afiliado.tipo_documento 
        : 'CC',
      numeroDocumento: afiliado.documento || '',
    } : null;
    
    window.dispatchEvent(new CustomEvent('openChatbotWithIncapacidad', {
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
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Icono y contenido principal */}
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-prosalud-salud/20 rounded-full blur-lg animate-pulse"></div>
                <div className="relative bg-prosalud-salud p-4 rounded-full shadow-lg">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-primary-prosalud-dark mb-2 flex items-center gap-2">
                  ¿Necesitas consultar el estado de pago de tu incapacidad?
                  <Sparkles className="h-5 w-5 text-prosalud-salud animate-pulse" />
                </h3>
                <p className="text-gray-700 mb-3 leading-relaxed">
                  Si ya enviaste tu incapacidad y quieres verificar el estado del pago y trámite, 
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
          </div>

          {/* Botón de acción */}
          <div className="flex-shrink-0">
            <Button
              onClick={handleOpenChatbot}
              size="lg"
              className="bg-prosalud-salud hover:bg-prosalud-salud/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2 px-6 py-6 text-base font-semibold"
            >
              <MessageSquare className="h-5 w-5" />
              Consultar Pago Ahora
              <ArrowRight className="h-5 w-5" />
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
      </CardContent>
    </Card>
  );
};

export default ConsultaPagoIncapacidadCard;

