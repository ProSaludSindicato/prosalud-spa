
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Clock, Mail, MessageCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const InformacionImportanteConsolidada: React.FC = () => {
  const handleChatbotClick = () => {
    const chatbotButton = document.querySelector('[data-chatbot-trigger]') as HTMLElement;
    if (chatbotButton) {
      chatbotButton.click();
    }
  };

  return (
    <div className="mb-8">
      <Tabs defaultValue="incapacidad" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/30">
          <TabsTrigger value="tiempos">Tiempos</TabsTrigger>
          <TabsTrigger value="incapacidad">Incapacidades</TabsTrigger>
          <TabsTrigger value="importante">Información</TabsTrigger>
        </TabsList>

        <TabsContent value="tiempos">
          <Alert className="border-amber-200 bg-amber-50">
            <Clock className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="space-y-2">
                <div>
                  <strong>Tiempos de respuesta:</strong> Su consulta será remitida al área encargada. 
                  Los tiempos estimados pueden ser de <strong>hasta 15 días hábiles</strong> para revisar su caso.
                </div>
                <div>
                  <strong>Horario de revisión:</strong> Lunes a viernes de 7:00 a.m. a 5:00 p.m. 
                  Cualquier registro fuera de este horario se entenderá presentado el día hábil siguiente. 
                  Se registran y asignan por orden de llegada.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </TabsContent>
        
        <TabsContent value="incapacidad">
          <Alert className="border-green-200 bg-green-50">
            <MessageCircle className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <strong>¿Consultas sobre el pago de una incapacidad?</strong>
                  <br />
                  Usa nuestro chatbot especializado en la esquina inferior derecha. 
                  Selecciona la opción habilitada y sigue el paso a paso.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </TabsContent>
        
        <TabsContent value="importante">
          <Alert className="border-blue-200 bg-blue-50">
            <Mail className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Evite que nuestros correos lleguen a SPAM:</strong> Agregue la cuenta 
              <span className="font-mono bg-blue-100 px-1 rounded mx-1">comunicaciones@sindicatoprosalud.com</span>
              a su lista de contactos y correos deseados.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InformacionImportanteConsolidada;
