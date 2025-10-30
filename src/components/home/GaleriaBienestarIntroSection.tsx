'use client'
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';

const GaleriaBienestarIntroSection: React.FC = () => {
  const sectionRef = React.useRef<HTMLDivElement | null>(null);
  const isVisible = useIntersectionObserver(sectionRef, {
    threshold: 0.1,
    freezeOnceVisible: true
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <section
        ref={sectionRef}
        id="galeria-bienestar-intro"
        className="py-20 lg:pb-10 bg-white w-full text-center"
      >
        <div className="relative mx-auto max-w-7xl px-6 lg:pb-28 lg:py-20">
          <div className="lg:flex lg:items-center lg:gap-12 lg:mb-32">
            <div className="relative z-10 mx-auto max-w-2xl text-center lg:ml-0 lg:w-2/3 lg:text-left">
              <div
                className="bg-yellow-50 rounded-lg border border-yellow-200 mx-auto flex w-fit items-center gap-2 border p-1 pr-3 lg:ml-0">
                <Sparkles className="h-5 w-5 mr-1 text-yellow-500" />
                <span className="text-sm mr-1 text-yellow-500">Instantes que inspiran</span>
              </div>

              <h2 className="mt-10 text-balance text-4xl font-bold md:text-5xl xl:text-5xl">Momentos que nos unen</h2>
              <p className="mt-8">Cada encuentro deja una historia, una risa, un recuerdo. <br></br> Explora nuestra galería y revive los momentos que nos unen. <br /> Porque en ProSalud, cuidarte también es celebrar contigo.</p>

              <div className="md:pr-1.5 lg:pr-0 my-10">
                <div className={`transition-all duration-500 ease-out delay-400 ${mounted && isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <Link to="/servicios/galeria-bienestar" aria-label="Explorar Bienestar ProSalud">
                    <Button size="lg" className="rounded-full group bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 shadow-md hover:shadow-lg transform transition-transform hover:-translate-y-0.5">
                      Explorar Bienestar
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </div>
              <ul className="list-inside list-disc space-y-2">
                <li>Celebramos en equipo</li>
                <li>Recuerdos que inspiran</li>
                <li>Historias que nos unen</li>
              </ul>
            </div>
          </div>
          <div className="absolute inset-0 mx-0 lg:-mx-4 rounded-3xl lg:col-span-3 overflow-hidden">
            <div aria-hidden className="absolute z-[1] inset-0 bg-gradient-to-r from-white from-35%" />
            <div className="relative">
              <img
                src="/images/galeria_bienestar/fondo_galeria_bienestar.webp"
                alt="Imagen de fondo galeria de fotos"
                width={1586}
                height={908}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default GaleriaBienestarIntroSection;