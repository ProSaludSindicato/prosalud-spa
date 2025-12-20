
import React from 'react';
import { BadgeCheck, Handshake } from 'lucide-react';

const valoresData = [
  {
    icon: BadgeCheck,
    title: "Ética",
    description: "Capacitación permanente, principios morales y credibilidad alcanzada por cada afiliado."
  },
  {
    icon: Handshake,
    title: "Fe en Dios, Lealtad y Colaboración",
    description: "Con la comunidad y las entidades donde laboremos, como guía para nuestros objetivos."
  }
];

const ValuesSection: React.FC = () => {
  return (
    <section className="py-12 sm:py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-prosalud mb-3 sm:mb-4 tracking-tight">Nuestros Valores</h2>
          <p className="text-lg sm:text-xl text-text-gray max-w-2xl mx-auto font-light px-2">
            Los pilares que guían cada una de nuestras acciones y decisiones.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {valoresData.map((valor, index) => (
            <div
              key={index}
              className="bg-card p-4 sm:p-6 rounded-xl shadow-lg border border-prosalud-border hover:shadow-2xl transition-all duration-300 flex flex-col items-center text-center animate-scale-in group transform hover:scale-105"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="p-2 sm:p-3 bg-primary-prosalud-light rounded-full mb-3 sm:mb-4 group-hover:bg-primary-prosalud transition-colors duration-300">
                <valor.icon size={32} className="text-primary-prosalud group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-text-dark mb-2 sm:mb-3">{valor.title}</h3>
              <p className="text-sm sm:text-base text-text-gray leading-relaxed">{valor.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValuesSection;
