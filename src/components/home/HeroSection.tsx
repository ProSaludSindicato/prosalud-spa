import React, {useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {ArrowRight, HeartPulse} from 'lucide-react';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import {Skeleton} from '@/components/ui/skeleton';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';

const HeroSection: React.FC = () => {
    const sectionRef = useRef<HTMLDivElement | null>(null);
    const isVisible = useIntersectionObserver(sectionRef, {threshold: 0.1, freezeOnceVisible: true});
    const [imagesLoaded, setImagesLoaded] = useState<{ [key: number]: boolean }>({});

    const handleScrollToServices = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const element = document.getElementById('servicios');
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    };

    const handleImageLoad = (index: number) => {
        setImagesLoaded(prev => ({...prev, [index]: true}));
    };

    // Placeholder avatars - en una aplicación real, estos vendrían de datos dinámicos o imágenes específicas.
    const avatarPlaceholders = [
        {src: "/images/avatar_hero/avatar3.webp", fallback: "P4", alt: "Profesional 4"},
        {src: "/images/avatar_hero/avatar1.webp", fallback: "P3", alt: "Profesional 3"},
        {src: "/images/avatar_hero/avatar4.webp", fallback: "P2", alt: "Profesional 2"},
        {src: "/images/avatar_hero/avatar2.webp", fallback: "P1", alt: "Profesional 1"},
    ];

    const collageImages = [
        "/images/collage/image_collage_1_.webp",
        "/images/collage/image_collage_3_.webp",
        "/images/collage/image_collage_2_.webp",
    ];

    return (
        <section
            ref={sectionRef}
            className="bg-gradient-to-br from-primary-prosalud-dark via-primary-prosalud-dark to-primary-prosalud-light text-text-light py-16 md:py-20 lg:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {isVisible ? (
                    <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* Left Column: Textual Content & Buttons */}
                        <div
                            className="md:text-left text-center transform transition-all duration-4000 opacity-0 translate-y-8 animate-[fadeInUp_0.8s_ease-out_forwards]">
                            <h1 className="font-bold mb-6">
                                <span
                                    className="inline-flex items-center gap-2 bg-secondary-prosaludgreen/20 text-secondary-prosaludgreen px-3 py-1 text-sm font-medium rounded-full mb-4">
                                    <HeartPulse className="h-4 w-4"/>
                                    Tu Bienestar, Nuestra Prioridad
                                </span>
                                <span className="block text-6xl md:text-7xl lg:text-8xl  font-bold">
                                    <span className="text-prosalud-pro ">Pro</span>
                                    <span className="text-prosalud-salud ">Salud</span>
                                </span>
                                <span className="block text-5xl md:text-6xl mt-2 md:mt-3 leading-snug">
                                    Cuidamos de ti, como tú cuidas de los demás
                                </span>
                            </h1>
                            <p className="text-lg md:text-xl text-primary-prosalud-light/90 mb-20 max-w-2xl mx-auto md:mx-0">
                                Tu portal de autogestión para acceder a servicios, trámites y beneficios de manera ágil
                                y segura. Simplificamos tu día a día.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 md:justify-start justify-center mb-10">
                                <Button
                                    size="lg"
                                    className="bg-secondary-prosaludgreen hover:bg-secondary-prosaludgreen/90 text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-8 py-4 rounded-xl"
                                    onClick={handleScrollToServices}
                                >
                                  <span className="flex items-center gap-3">
                                    <span>Trámites Rápidos</span>
                                    <ArrowRight className="h-5 w-5"/>
                                  </span>
                                </Button>
                                <Link to="/nosotros" aria-label="Conocer más sobre ProSalud">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="text-primary-prosalud border-primary-prosalud hover:bg-gray-100 hover:text-primary-prosalud text-lg font-semibold px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
                                    >
                                        Conoce Más
                                    </Button>
                                </Link>
                            </div>

                            {/* Nueva sección de avatares y texto de confianza */}
                            <div className="mt-10 flex items-center justify-center md:justify-start">
                                <div className="flex -space-x-3">
                                    {avatarPlaceholders.map((avatar, index) => (
                                        <Avatar key={index} className="h-12 w-12 border-2 border-white shadow-lg">
                                            <AvatarImage
                                                src={avatar.src}
                                                alt={avatar.alt}
                                                className="object-cover"
                                                width={48}
                                                height={48}
                                            />
                                            <AvatarFallback
                                                className="bg-secondary-prosaludgreen text-white font-semibold">{avatar.fallback}</AvatarFallback>
                                        </Avatar>
                                    ))}
                                </div>
                                <div className="ml-2 text-left">
                                    <p className="text-light font-semibold text-lg">+1.500 profesionales</p>
                                    <p className="text-light text-sm">de la salud confían en nosotros</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Image Collage */}
                        <div className="hidden md:block">
                            <div className="grid grid-cols-2 gap-8 p-4 bg-slate-800/30 rounded-xl shadow-xl">
                                {/* Imagen superior izquierda */}
                                <div className="relative bg-muted rounded-md aspect-square overflow-hidden">
                                    {!imagesLoaded[0] && (
                                        <Skeleton className="absolute inset-0 rounded-md aspect-square"/>
                                    )}
                                    <img
                                        src={collageImages[0]}
                                        alt="Collage ProSalud imagen 1"
                                        loading="lazy"
                                        onLoad={() => handleImageLoad(0)}
                                        className={`w-full h-full object-cover transition-transform duration-500 ${imagesLoaded[0] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                                        } hover:scale-105`}
                                        style={{transitionDelay: '0ms'}}
                                    />
                                </div>

                                {/* Imagen derecha ocupando 2 filas */}
                                <div className="relative bg-muted rounded-md row-span-2 overflow-hidden">
                                    {!imagesLoaded[2] && (
                                        <Skeleton className="absolute inset-0 rounded-md aspect-square"/>
                                    )}
                                    <img
                                        src={collageImages[2]}
                                        alt="Collage ProSalud imagen 3"
                                        fetchPriority="high"
                                        onLoad={() => handleImageLoad(2)}
                                        className={`w-full h-full object-cover transition-transform duration-500 ${imagesLoaded[2] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                                        } hover:scale-105`}
                                        style={{transitionDelay: '200ms'}}
                                    />
                                </div>

                                {/* Imagen inferior izquierda */}
                                <div className="relative bg-muted rounded-md aspect-square overflow-hidden">
                                    {!imagesLoaded[1] && (
                                        <Skeleton className="absolute inset-0 rounded-md aspect-square"/>
                                    )}
                                    <img
                                        src={collageImages[1]}
                                        alt="Collage ProSalud imagen 2"
                                        loading="lazy"
                                        onLoad={() => handleImageLoad(1)}
                                        className={`w-full h-full object-cover transition-transform duration-500 ${imagesLoaded[1] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                                        } hover:scale-105`}
                                        style={{transitionDelay: '100ms'}}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Skeleton Loader for HeroSection
                    <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
                        <div>
                            <Skeleton className="h-16 w-3/4 mb-4"/>
                            <Skeleton className="h-10 w-1/2 mb-8"/>
                            <Skeleton className="h-6 w-full mb-2"/>
                            <Skeleton className="h-6 w-full mb-2"/>
                            <Skeleton className="h-6 w-3/4 mb-12"/>
                            <div className="flex flex-col sm:flex-row gap-4 md:justify-start justify-center">
                                <Skeleton className="h-12 w-48"/>
                                <Skeleton className="h-12 w-40"/>
                            </div>
                            {/* Skeleton para la nueva sección de confianza */}
                            <div className="mt-10 flex items-center justify-center md:justify-start">
                                <div className="flex -space-x-3">
                                    <Skeleton className="h-10 w-10 rounded-full"/>
                                    <Skeleton className="h-10 w-10 rounded-full"/>
                                    <Skeleton className="h-10 w-10 rounded-full"/>
                                    <Skeleton className="h-10 w-10 rounded-full"/>
                                </div>
                                <Skeleton className="ml-4 h-6 w-64"/>
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <div className="grid grid-cols-2 gap-4 p-4">
                                <Skeleton className="rounded-lg aspect-square"/>
                                <Skeleton className="rounded-lg aspect-square"/>
                                <Skeleton className="rounded-lg aspect-square"/>
                                <Skeleton className="rounded-lg aspect-square"/>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default HeroSection;
