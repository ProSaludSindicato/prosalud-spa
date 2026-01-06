import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone, 
  ArrowLeft, 
  CheckCircle2, 
  PlayCircle,
  Home,
  Shield,
  Zap,
  Lightbulb,
  Share,
  MoreVertical,
  PlusSquare,
  MonitorDown
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

const AccesoDirectoMovilPage: React.FC = () => {
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [defaultTab, setDefaultTab] = useState<string>('android');
  const [activeTab, setActiveTab] = useState<string>('android');
  const deviceType = useDeviceDetection();

  // IDs de videos de YouTube (reemplazar con los IDs reales)
  const videoIds = {
    android: 'kPEziK-rsII',
    ios: 'uXKHLYVAG4E'
  };

  useEffect(() => {
    // Establecer el tab por defecto basado en la detección del dispositivo
    let detectedTab = 'android';
    if (deviceType === 'ios') {
      detectedTab = 'ios';
    } else if (deviceType === 'android') {
      detectedTab = 'android';
    } else {
      // Si no se puede detectar, intentar detectar por navegador
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent) && !/Chromium/.test(userAgent)) {
        detectedTab = 'ios';
      }
    }
    setDefaultTab(detectedTab);
    setActiveTab(detectedTab);
  }, [deviceType]);

  const benefits = [
    {
      icon: Zap,
      title: 'Acceso Rápido',
      description: 'Accede a ProSalud con un solo toque desde tu pantalla de inicio'
    },
    {
      icon: Shield,
      title: 'Más Seguro',
      description: 'Evita escribir la URL y reduce el riesgo de acceder a sitios falsos'
    },
    {
      icon: Home,
      title: 'Experiencia Tipo App',
      description: 'Disfruta de una experiencia similar a una aplicación nativa'
    }
  ];

  const openVideo = (url: string) => {
    setVideoUrl(url);
    setShowVideoDialog(true);
  };

  // Componente para el logo de Android con soporte para color activo
  const AndroidLogo = ({ isActive = false, className = "" }: { isActive?: boolean; className?: string }) => (
    <svg className={`w-6 h-6 ${className}`} viewBox="0 0 24 24" fill={isActive ? "#ffffff" : "#3DDC84"} xmlns="http://www.w3.org/2000/svg">
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4486.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4486.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5674a.416.416 0 00-.5674.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.5758 12 7.5758s-3.5902.6681-4.8165 1.8042l-2.0223-3.503a.4156.4156 0 00-.5674-.1521a.4157.4157 0 00-.1521.5674l1.9973 3.4592C2.6889 11.1868 1 13.7346 1 16.7654v1.8746c0 .4143.3358.75.75.75h20.5c.4142 0 .75-.3357.75-.75v-1.8746c0-3.0308-1.6889-5.5786-4.2091-6.444z"/>
    </svg>
  );

  // Componente para el logo de Apple con soporte para color activo
  const AppleLogo = ({ isActive = false, className = "" }: { isActive?: boolean; className?: string }) => (
    <svg className={`w-6 h-6 ${className}`} viewBox="0 0 24 24" fill={isActive ? "#ffffff" : "#000000"} xmlns="http://www.w3.org/2000/svg">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );

  return (
    <MainLayout>
      <div className="min-h-screen bg-background-light">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary-prosalud to-primary-prosalud-dark text-white relative overflow-hidden">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 pt-12 md:pt-16 lg:pt-20 pb-0">
            <Link 
              to="/" 
              className="inline-flex items-center text-white/90 hover:text-white mb-4 md:mb-5 transition-colors relative z-10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio
            </Link>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-0 items-end lg:items-center relative z-10 lg:min-h-[400px]">
              <div className="lg:pr-8">
                <div className="flex items-center gap-3 mb-3 md:mb-4">
                  <div className="bg-white/20 p-2 md:p-3 rounded-xl backdrop-blur-sm flex-shrink-0">
                    <Smartphone className="h-6 w-6 md:h-8 md:w-8" />
                  </div>
                  <h1 className="text-2xl md:text-5xl lg:text-5xl xl:text-5xl font-bold leading-tight">
                    Instala ProSalud en tu Móvil
                  </h1>
                </div>
                <p className="text-base md:text-lg lg:text-xl text-white/90 leading-relaxed">
                  Crea un acceso directo en tu dispositivo móvil para acceder a ProSalud de manera más rápida, 
                  ágil y segura. <br></br><br></br> ¡Es como tener nuestra app en tu teléfono!
                </p>
              </div>
              <div className="flex justify-center lg:justify-center items-end lg:relative lg:overflow-visible lg:h-full">
                <div className="relative w-full max-w-[530px] md:max-w-[530px] lg:max-w-[530px] xl:max-w-[530px] lg:absolute lg:right-0 lg:bottom-0 mt-8 lg:mt-0">
                  <img 
                    src="/images/mobile-app-preview.png"
                    alt="Vista previa de ProSalud en móvil" 
                    className="w-full h-auto drop-shadow-2xl"
                    onError={(e) => {
                      // Fallback si la imagen no existe
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="bg-primary-prosalud/10 p-4 rounded-full">
                      <benefit.icon className="h-6 w-6 text-primary-prosalud" />
                    </div>
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Instructions Section with Tabs */}
          <div className="px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Main Instructions - Takes 2 columns on desktop */}
              <div className="lg:col-span-2 flex">
                <Card className="overflow-hidden flex flex-col w-full">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                    <CardTitle className="text-2xl text-center">Instrucciones por Dispositivo</CardTitle>
                    <CardDescription className="text-center">
                      Selecciona tu dispositivo para ver las instrucciones paso a paso
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 flex flex-col flex-grow">
                    <Tabs defaultValue={defaultTab} className="w-full flex flex-col flex-grow" onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-2 mb-6 h-auto">
                        <TabsTrigger 
                          value="android" 
                          className="flex items-center justify-center gap-2 py-3 data-[state=active]:bg-green-600 data-[state=active]:text-white transition-colors"
                          onClick={() => setActiveTab('android')}
                        >
                          <AndroidLogo isActive={activeTab === 'android'} />
                          <span className="font-medium">Android</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="ios" 
                          className="flex items-center justify-center gap-2 py-3 data-[state=active]:bg-gray-900 data-[state=active]:text-white transition-colors"
                          onClick={() => setActiveTab('ios')}
                        >
                          <AppleLogo isActive={activeTab === 'ios'} />
                          <span className="font-medium">iPhone (iOS)</span>
                        </TabsTrigger>
                      </TabsList>

                  {/* Android Tab Content */}
                  <TabsContent value="android" className="space-y-6 flex-grow flex flex-col">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <AndroidLogo />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Instrucciones para Android</h3>
                        <p className="text-gray-600 text-sm">
                          Sigue estos pasos para crear un acceso directo en tu dispositivo Android
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6 flex-grow flex flex-col">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary-prosalud text-white rounded-full flex items-center justify-center font-bold">
                            1
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">Abre el navegador</h3>
                          <p className="text-gray-600">
                            Abre Chrome, Firefox o cualquier navegador en tu dispositivo Android y visita nuestro sitio web.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary-prosalud text-white rounded-full flex items-center justify-center font-bold">
                            2
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">Abre el menú</h3>
                          <p className="text-gray-600 flex items-center gap-1.5 flex-wrap">
                            Toca el ícono de menú 
                            <span className="inline-flex items-center gap-1">
                              (<MoreVertical className="h-4 w-4 inline" />)
                            </span>
                            en la esquina superior derecha del navegador.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary-prosalud text-white rounded-full flex items-center justify-center font-bold">
                            3
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">Selecciona "Agregar a pantalla de inicio"</h3>
                          <p className="text-gray-600 flex items-center gap-1.5 flex-wrap">
                            Busca la opción 
                            <span className="inline-flex items-center gap-1">
                              (<MonitorDown className="h-4 w-4 inline" />)
                            </span>
                            {" "}"Agregar a la pantalla de inicio" o {" "}"Instalar aplicación" en el menú.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4 mt-auto">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary-prosalud text-white rounded-full flex items-center justify-center font-bold">
                            4
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">Confirma la instalación</h3>
                          <p className="text-gray-600 mb-3">
                            Aparecerá un cuadro de diálogo. Toca "Agregar" o "Instalar" para confirmar.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openVideo(`https://www.youtube-nocookie.com/embed/${videoIds.android}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`)}
                            className="w-full sm:w-auto"
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Ver video instructivo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* iOS Tab Content */}
                  <TabsContent value="ios" className="space-y-6 flex-grow flex flex-col">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <AppleLogo />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Instrucciones para iPhone (iOS)</h3>
                        <p className="text-gray-600 text-sm">
                          Sigue estos pasos para crear un acceso directo en tu iPhone o iPad
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6 flex-grow flex flex-col">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary-prosalud text-white rounded-full flex items-center justify-center font-bold">
                            1
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">Abre el navegador</h3>
                          <p className="text-gray-600">
                            Abre la aplicación Safari u otro navegador en tu iPhone o iPad y visita nuestro sitio web.
                          </p>
                        </div>
                      </div>

                      {/* Paso 2a para Safari - Abrir menú */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary-prosalud text-white rounded-full flex items-center justify-center font-bold">
                            2.1
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">Abre el menú (Solo en Safari)</h3>
                          <p className="text-gray-600 flex items-center gap-1.5 flex-wrap">
                            Si estás usando Safari, primero toca el ícono de menú 
                            <span className="inline-flex items-center gap-1">
                              (<MoreVertical className="h-4 w-4 inline" />)
                            </span>
                            en la parte inferior derecha de la pantalla para abrir el menú de opciones.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary-prosalud text-white rounded-full flex items-center justify-center font-bold">
                            2.2
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">Toca el botón de compartir</h3>
                          <p className="text-gray-600 flex items-center gap-1.5 flex-wrap">
                            Toca el botón de compartir 
                            <span className="inline-flex items-center gap-1">
                              (<Share className="h-4 w-4 inline" /> )
                            </span>
                            En Safari, lo encontrarás en el menú que acabas de abrir. En Chrome, está directamente en la parte superior de la pantalla.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary-prosalud text-white rounded-full flex items-center justify-center font-bold">
                            3
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">Selecciona "Agregar a pantalla de inicio"</h3>
                          <p className="text-gray-600 flex items-center gap-1.5 flex-wrap">
                            Desplázate hacia abajo en el menú de compartir y toca 
                            <span className="inline-flex items-center gap-1">
                              (<PlusSquare className="h-4 w-4 inline" />)
                            </span>
                            {" "}"Agregar a pantalla de inicio" o "Agregar a Inicio" según la opción de tu navegador.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4 mt-auto">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary-prosalud text-white rounded-full flex items-center justify-center font-bold">
                            4
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">Personaliza y confirma</h3>
                          <p className="text-gray-600 mb-3">
                            Puedes personalizar el nombre del acceso directo si lo deseas, luego toca "Agregar" en la esquina superior derecha.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openVideo(`https://www.youtube-nocookie.com/embed/${videoIds.ios}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`)}
                            className="w-full sm:w-auto"
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Ver video instructivo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              {/* Tips Section - Sidebar on desktop, below on mobile */}
              <div className="lg:col-span-1 flex">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-md sticky top-24 flex flex-col w-full">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="bg-blue-500 p-2 rounded-lg">
                        <Lightbulb className="h-5 w-5 text-white" />
                      </div>
                      <span>Consejos Útiles</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 flex flex-col flex-grow">
                    <ul className="space-y-3 text-gray-700">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                        <span className="text-sm">El acceso directo aparecerá en tu pantalla de inicio con el logo de ProSalud</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                        <span className="text-sm">Al tocarlo, se abrirá directamente en el navegador sin mostrar la barra de direcciones</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                        <span className="text-sm">Es completamente seguro y no requiere descargar nada desde la tienda de aplicaciones</span>
                      </li>
                    </ul>

                    {/* Video embebido que cambia según el tab activo */}
                    <div className="mt-6 pt-8 border-t border-blue-200">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <PlayCircle className="h-4 w-4 text-blue-600" />
                        Video Instructivo
                      </h4>
                      <div className="aspect-[9/15] w-full max-w-[300px] mx-auto mt-6 rounded-lg overflow-hidden bg-gray-900 shadow-lg">
                        {activeTab === 'android' ? (
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${videoIds.android}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`}
                            title="Video instructivo Android"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                          />
                        ) : (
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${videoIds.ios}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`}
                            title="Video instructivo iOS"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                          />
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-500 text-center">
                          {activeTab === 'android' ? 'Instrucciones para Android' : 'Instrucciones para iPhone (iOS)'}
                        </p>
                        <p className="text-xs text-gray-400 text-center">
                          Si el video no se muestra,{' '}
                          <a 
                            href={activeTab === 'android' ? `https://www.youtube.com/watch?v=${videoIds.android}` : `https://www.youtube.com/watch?v=${videoIds.ios}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 underline"
                          >
                            ábrelo directamente en YouTube
                          </a>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="max-w-md w-[95vw] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Video Instructivo</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <div className="aspect-[9/15] w-full max-w-[320px] mx-auto rounded-lg overflow-hidden bg-black">
              <iframe
                src={videoUrl}
                title="Video instructivo"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default AccesoDirectoMovilPage;
