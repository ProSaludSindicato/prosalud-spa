
import React from 'react';
import { Award, Briefcase, Users } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber'; // Importar el nuevo componente

interface StatData {
  icon: React.ElementType;
  prefix?: string;
  targetNumber?: number;
  mainText?: string; // Para casos sin número animado
  suffix?: string;
  subText: string;
  iconColor: string;
  textColor: string;
  duration?: number;
}

const statsData: StatData[] = [
  {
    icon: Award,
    prefix: "+",
    targetNumber: 10,
    suffix: " años",
    subText: "de experiencia",
    iconColor: "text-primary-prosalud",
    textColor: "text-primary-prosalud",
    duration: 1500,
  },
  {
    icon: Briefcase,
    targetNumber: 7,
    suffix: " convenios",
    subText: "en Antioquia",
    iconColor: "text-secondary-prosaludgreen",
    textColor: "text-secondary-prosaludgreen",
    duration: 1200,
  },
  {
    icon: Users,
    prefix: "Aprox ",
    targetNumber: 1500,
    subText: "afiliados",
    iconColor: "text-accent-prosaludteal",
    textColor: "text-accent-prosaludteal",
    duration: 2000,
  },
];

const DescriptionSection: React.FC = () => {
  return (
    <section id="descripcion-prosalud" className="py-12 sm:py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12 md:mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-prosalud mb-3 sm:mb-4 tracking-tight">
            Descubre ProSalud
          </h2>
          <p className="text-lg sm:text-xl text-text-gray max-w-3xl mx-auto font-light px-2">
            Una mirada profunda a nuestra identidad y compromiso.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-10 sm:mb-12 md:mb-16 text-center">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="flex flex-col items-center p-4 sm:p-6 animate-fade-in"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <stat.icon size={48} className={`${stat.iconColor} mb-3 sm:mb-4`} />
              <h3 className={`text-2xl sm:text-3xl font-bold ${stat.textColor} mb-1 sm:mb-2`}>
                {stat.prefix}
                {typeof stat.targetNumber === 'number' ? (
                  <AnimatedNumber targetValue={stat.targetNumber} duration={stat.duration} />
                ) : (
                  stat.mainText
                )}
                {stat.suffix}
              </h3>
              <p className="text-base sm:text-lg text-text-gray">{stat.subText}</p>
            </div>
          ))}
        </div>

        <div className="max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: `${statsData.length * 150}ms` }}>
          <p className="text-base sm:text-lg text-text-gray leading-relaxed px-4 text-justify">
            El Sindicato de Profesionales de la Salud ProSalud, es un Sindicato de gremio que funciona de conformidad con la Constitución Nacional, está orientado al bienestar de los afiliados de manera autogestionaria y autónoma, permitiendo el logro de los objetivos establecidos y la atención de procesos y subprocesos con capital humano capacitado en beneficio de todos los usuarios en las diferentes empresas receptoras del Servicio.
          </p>
        </div>
      </div>
    </section>
  );
};

export default DescriptionSection;
