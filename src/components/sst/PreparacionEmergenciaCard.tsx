
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ClipboardCheck, ChevronDown, ChevronUp, ZoomIn } from 'lucide-react';

interface PreparacionEmergenciaCardProps {
  openCollapsible: Record<string, boolean>;
  toggleCollapsible: (id: string) => void;
  setSelectedImage: (image: string | null) => void;
}

const PreparacionEmergenciaCard: React.FC<PreparacionEmergenciaCardProps> = ({ 
  openCollapsible, 
  toggleCollapsible, 
  setSelectedImage 
}) => {
  return (
    <Card className="mb-12 shadow-lg animate-[fadeInUp_0.5s_ease-out_1.0s_forwards] opacity-0">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl text-primary">
          <ClipboardCheck size={28} className="mr-3 text-secondary-prosaludgreen" />
          Cómo estar preparados para una emergencia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
          <div className="md:flex md:items-start md:gap-6">
            <div className="md:w-1/3 mb-6 md:mb-0">
              <div 
                className="relative group cursor-pointer"
                onClick={() => setSelectedImage("/images/sst/infografia_de_preparacion.png")}
              >
                <img 
                  src="/images/sst/infografia_de_preparacion.webp" 
                  alt="Preparación para emergencias" 
                  className="rounded-lg shadow-md bg-gray-200 aspect-[3/4] object-contain w-full h-auto" 
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-opacity duration-300 rounded-lg">
                  <ZoomIn size={48} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">Infografía de preparación (clic para ampliar)</p>
            </div>
            <div className="md:w-2/3 space-y-4">
              <Collapsible open={openCollapsible['q1']} onOpenChange={() => toggleCollapsible('q1')} className="border rounded-md p-4 shadow-sm">
                <CollapsibleTrigger className="flex justify-between items-center w-full font-semibold text-lg text-primary-prosalud hover:underline">
                ¿Qué hacer en casos de emergencias?
                {openCollapsible['q1'] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-muted-foreground">
                Sismos, terremotos, inundaciones, aludes, tormentas... hay una enorme cantidad de emergencias posibles, y para todos debemos estar bien preparados. En esta nota haremos un repaso de lo que debemos hacer y de cómo prepararnos para evitar el apuro en estos momentos indeseables.
                </CollapsibleContent>
              </Collapsible>

              <Collapsible open={openCollapsible['q2']} onOpenChange={() => toggleCollapsible('q2')} className="border rounded-md p-4 shadow-sm">
                <CollapsibleTrigger className="flex justify-between items-center w-full font-semibold text-lg text-primary-prosalud hover:underline">
                ¿Cómo estar preparados para una emergencia?
                {openCollapsible['q2'] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-muted-foreground space-y-2">
                <p>Es fundamental estar preparados y educados, pues esta es la manera de no caer presa del pánico en casos de emergencia. Cerca de la puerta de entrada ten preparado tu bolso con todos los elementos que pudieran servirte: linternas a baterías, radio, botiquín de primeros auxilios, comida y agua, mantas, prendas de abrigo y todo lo que ya hemos aprendido que debe tener un kit de emergencias.</p>
                <p>En casa, en un sitio al alcance de todos, ten siempre completo tu botiquín de primeros auxilios, pues los accidentes y las emergencias llegan sin previo aviso. Ubícalo en un lugar seguro, lejos del alcance de mascotas y niños pequeños, pero sí al alcance de hijos menores y de invitados frecuentes.</p>
                <p>Los matafuegos o extintores nunca deben faltar en el hogar, y no te olvides de conocer y explicarle a tu familia con precisión la ubicación de las cajas y las llaves de cierre de los ductos de electricidad, agua y gas.</p>
                </CollapsibleContent>
              </Collapsible>
              
              <Collapsible open={openCollapsible['q3']} onOpenChange={() => toggleCollapsible('q3')} className="border rounded-md p-4 shadow-sm">
                <CollapsibleTrigger className="flex justify-between items-center w-full font-semibold text-lg text-primary-prosalud hover:underline">
                ¿Simulacros para saber cómo actuar en emergencias?
                {openCollapsible['q3'] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-muted-foreground space-y-2">
                <p>Es buena idea tomar clases y leer información sobre cómo se debe actuar en casos de emergencia. Tal y como los niños suelen hacer simulacros de sismos y de incendios en las escuelas, en casa podemos practicar lo mismo para acostumbrarnos a actuar apresuradamente y a conciencia en casos de emergencia. Debes conocer los puntos seguros del hogar, y prepararse para cada uno: que una sepa dónde colocarse en casos de sismos, cómo salir de casa ante incendios, etc.</p>
                <p>Los simulacros son una actividad que puede ser entretenida para los niños, pero que ciertamente puede salvar su vida algún día. En especial si vives en zonas de riesgos de desastres climáticos, la preparación será tu principal arma de defensa contra estas agresiones inesperadas.</p>
                <p>Saber qué debemos hacer, cómo hacerlo y hacia dónde ir nos ayudará a mantener la calma. Tener a mano los elementos de seguridad y primeros auxilios nos permitirá actuar a tiempo, para no lamentar situaciones de ningún tipo. Y la preparación en simulacros o revisiones periódicas del hogar puede ser lo que salve tu vida y la de tu familia. Puede ser fatalista o pesimista para algunos, pero quienes han atravesado estas desagradables situaciones saben decirte que el saber actuar a tiempo y con calma lo que les permitió salir vivos y contar la historia.</p>
                </CollapsibleContent>
              </Collapsible>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PreparacionEmergenciaCard;
