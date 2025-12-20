
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface EmergencyType {
  id: string;
  title: string;
  icon: JSX.Element; // Assuming icon is a JSX element
  points: string[];
}

interface TiposEmergenciasSectionProps {
  emergencyTypes: EmergencyType[];
  openEmergencyDetails: Record<string, boolean>;
  toggleEmergencyDetail: (id: string) => void;
}

const TiposEmergenciasSection: React.FC<TiposEmergenciasSectionProps> = ({ 
  emergencyTypes, 
  openEmergencyDetails, 
  toggleEmergencyDetail 
}) => {
  return (
    <section className="mb-12 animate-[fadeInUp_0.5s_ease-out_1.6s_forwards] opacity-0">
      <h2 className="text-3xl font-bold text-primary mb-8 text-center">
        Tipos de Emergencias y Cómo Actuar
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
        {emergencyTypes.map((emergency) => (
          <Card key={emergency.id} className="shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <CardHeader className="text-center">
              {emergency.icon}
              <CardTitle className="text-xl font-semibold text-primary-prosalud">{emergency.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
              <div className="text-muted-foreground text-sm space-y-2 flex-grow flex flex-col">
                {emergency.points.length > 0 && (
                  <p className="leading-relaxed min-h-[4.5rem] flex items-start">
                    {emergency.points[0]}
                  </p>
                )}
                {emergency.points.length > 1 && (
                  <div className="mt-auto pt-2">
                    <Collapsible
                      open={openEmergencyDetails[emergency.id]}
                      onOpenChange={() => toggleEmergencyDetail(emergency.id)}
                    >
                      <CollapsibleTrigger className="text-primary-prosalud hover:underline flex items-center text-xs sm:text-sm font-medium py-1">
                        {openEmergencyDetails[emergency.id] ? "Leer menos" : "Leer más"}
                        {openEmergencyDetails[emergency.id] ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                          {emergency.points.slice(1).map((point, i) => (
                            <li key={`detail-${emergency.id}-${i}`}>{point}</li>
                          ))}
                        </ol>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default TiposEmergenciasSection;
