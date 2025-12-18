import React, { useRef } from 'react';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import { Skeleton } from '@/components/ui/skeleton';

const ConveniosSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const isVisible = useIntersectionObserver(sectionRef, { threshold: 0.1, freezeOnceVisible: true });


  const visibleConvenios = [
    {
      name: "E.S.E. HOSPITAL MARCO FIDEL SUÁREZ - BELLO",
      imageUrl: "/images/convenios/hospital-marco-fidel-suarez.webp",
      description: "Hospital público de mediana y alta complejidad ubicado en el Norte del Valle de Aburrá (Bello), que ofrece atención integral con servicios de internación, cirugía, urgencias y tecnología hospitalaria avanzada."
    },
    {
      name: "E.S.E. HOSPITAL SAN JUAN DE DIOS - RIONEGRO",
      imageUrl: "/images/convenios/hospital-san-juan-de-dios-rionegro.webp",
      description: "Institución pública de salud de primero, segundo y algunos servicios de tercer nivel en el Oriente Antioqueño, comprometida con la atención integral del usuario y su familia, con servicios de urgencias, hospitalización, consulta externa y especialidades médicas."
    },
    {
      name: "E.S.E. LA MARIA",
      imageUrl: "/images/convenios/hospital-la-maria.webp",
      description: "Hospital público general de alta complejidad en Antioquia, que presta servicios integrales de consulta externa, urgencias, internación, cirugía, diálisis y apoyo diagnóstico, con cobertura para múltiples municipios de la región."
    },
    {
      name: "PROMOTORA MÉDICA Y ODONTOLÓGICA S.A.",
      imageUrl: "/images/convenios/promotora-medica-odontologica.webp",
      description: "Empresa prestadora de servicios de salud especializada en atención médica y odontológica integral, con amplia experiencia en programas de salud ocupacional y medicina preventiva."
    },
    {
      name: "SOCIEDAD MÉDICA RIONEGRO SOMER S.A.",
      imageUrl: "/images/convenios/somer-sa.webp",
      description: "Clínica privada ubicada en Rionegro que ofrece servicios médicos especializados, cirugía ambulatoria y hospitalización, con un enfoque en atención personalizada y calidad asistencial."
    },
    {
      name: "E.S.E. HOSPITAL VENANCIO DÍAZ DÍAZ",
      imageUrl: "/images/convenios/hospital-venancio-diaz.webp",
      description: "Hospital público del municipio de Sabaneta (Antioquia) que presta servicios de primer nivel con urgencias, medicina general y atención materno-infantil, orientado a la población urbana del municipio."
    },
    {
      name: "E.S.E. HOSPITAL LA MERCED - CIUDAD BOLÍVAR",
      imageUrl: "/images/convenios/hospital-la-merced-ciudad-bolivar.webp",
      description: "Hospital público de mediana complejidad en el Suroeste de Antioquia que ofrece servicios de urgencias 24 horas, hospitalización, consulta externa y cirugía, atendiendo a la población municipal y regional."
    },
    {
      name: "E.S.E. HOSPITAL SANTA ELENA - FREDONIA",
      imageUrl: "/images/convenios/hospital-santa-elena-fredonia.webp",
      description: "Hospital comunitario que atiende a la población del Suroeste de Antioquia, ofreciendo servicios de medicina general, materno infantil y programas de salud rural."
    },
    {
      name: "SAN JUAN DE DIOS DE ABEJORRAL",
      imageUrl: "/images/convenios/hospital-san-juan-Abejorral.webp",
      description: "Hospital público que brinda servicios de salud a la población del Oriente Antioqueño, especializado en atención primaria, medicina general y programas de salud preventiva para comunidades rurales."
    },
    {
      name: "SAN ANTONIO DE CISNEROS",
      imageUrl: "/images/convenios/hospital-san-antonio-cisneros.webp",
      description: "Hospital público de atención general en el municipio de Cisneros (Nordeste de Antioquia), que ofrece servicios de urgencias, consulta externa y hospitalización, orientado a la promoción y prevención de la salud para la comunidad local."
    }
  ];

  return (
    <section ref={sectionRef} id="convenios" className="py-16 md:py-20 bg-background-light">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {isVisible ? (
          <>
            <div className="bg-primary-prosalud text-text-light p-8 rounded-lg shadow-lg mb-12 md:mb-16 text-center">
              <h2 className="text-2xl md:text-4xl font-semibold leading-tight max-w-4xl mx-auto">
                A lo largo de nuestra trayectoria hemos tenido convenios con diferentes entidades en Antioquia
              </h2>
            </div>

            {(
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {visibleConvenios.map((convenio, index) => (
                      <li
                          key={convenio.name}
                          className="group perspective-1000 animate-fade-in h-48 cursor-pointer clickable"
                          style={{animationDelay: `${index * 100}ms`}}
                      >
                        <div
                            className="relative preserve-3d group-hover:rotate-y-180 transition-transform duration-1000 ease-in-out h-full w-full">
                          {/* Cara frontal */}
                          <div
                              className="absolute inset-0 backface-hidden bg-card p-6 rounded-lg shadow-md border border-prosalud-border flex items-center">
                            <div className="h-14 w-14 rounded-full overflow-hidden mr-4 shrink-0">
                              <img
                                  src={convenio.imageUrl}
                                  alt={convenio.name}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                  width={56}
                                  height={56}
                              />
                            </div>
                            <p className="text-base font-medium text-text-dark">{convenio.name}</p>
                          </div>

                          {/* Cara trasera */}
                          <div
                              className="absolute inset-0 backface-hidden rotate-y-180 bg-primary-prosalud text-white p-6 rounded-lg shadow-md border border-prosalud-border flex flex-col justify-center">
                            <h3 className="text-sm font-semibold mb-2 line-clamp-2">{convenio.name}</h3>
                            <p className="text-sm leading-relaxed line-clamp-5">{convenio.description}</p>
                          </div>
                        </div>
                      </li>
                  ))}
                </ul>
            )}
          </>
        ) : (
          <>
            <div className="p-8 rounded-lg shadow-lg mb-12 md:mb-16 text-center bg-muted">
              <Skeleton className="h-10 w-3/4 mx-auto mb-2" />
              <Skeleton className="h-8 w-1/2 mx-auto" />
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {[...Array(3)].map((_, index) => (
                <li key={index} className="bg-card p-6 rounded-lg shadow-md border border-prosalud-border flex items-center">
                  <Skeleton className="h-12 w-12 rounded-full mr-4 shrink-0" />
                  <Skeleton className="h-6 w-3/4" />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .group:hover .group-hover\\:rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </section>
  );
};

export default ConveniosSection;
