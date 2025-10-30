
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Link } from 'react-router-dom';
import { Home, FileText, ExternalLink, ShieldCheck, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from 'lucide-react';

const CertificadoSeguridadSocialPage: React.FC = () => {
  const arusSuaporteLink = "https://www.suaporte.com.co/Web/faces/pages/comprobantes/consultadirecta/consultaDirectaLogin.xhtml?_gl=1*17d7pkb*_gcl_aw*R0NMLjE2NTQ1NDc3NzcuQ2p3S0NBand5X2FVQmhBQ0Vpd0EySUhIUUZoVHN2YWdqZlZXOWxsQkkxX3RzelFac1lTR2RfOTB0Nk4tdURQbVZBcHp6emxvcVZNb2VCb0MzdGNRQXZEX0J3RQ..*_ga*MTU1MDY3NzU5LjE2NTEyNjYzNDM.*_ga_9F469EXLBS*MTY1NTg0Mzk4Ni4xMDQuMC4xNjU1ODQ0MTgxLjA.&_ga=2.99911518.1148086000.1655827255-155067759.1651266343&_gac=1.158993096.1654547787.CjwKCAjwy_aUBhACEiwA2IHHQFhTsvagjfVW9llBI1_tszQZsYSGd_90t6N-uDPmVApzzzloqVMoeBoC3tcQAvD_BwE";
  const aportesEnLineaLink = "https://www.aportesenlinea.com/Autoservicio/CertificadoAportes.aspx";

  return (
    <MainLayout>
      <div className="container mx-auto pt-6 pb-2 px-4 md:px-6 lg:px-8">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/"><Home className="h-4 w-4 mr-1 inline-block" /> Inicio</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                <FileText className="h-4 w-4 mr-1 inline-block" /> Comprobante de Aportes Seguridad Social
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <header className="mb-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary-prosalud-dark" />
              <h1 className="text-xl md:text-2xl font-bold text-primary-prosalud-dark">
                Comprobante de Aportes a la Seguridad Social
              </h1>
            </div>
        </header>
        <div className="bg-card p-6 md:p-8 rounded-lg shadow-lg border border-prosalud-border">
          <section className="mb-8">
            <Alert className="bg-blue-50 border-blue-200 text-blue-700">
              <Info className="h-5 w-5 text-blue-600" />
              <AlertTitle className="font-semibold text-blue-800">Instrucciones Importantes</AlertTitle>
              <AlertDescription className="text-blue-700">
                Obtén tu comprobante de aportes a la seguridad social de forma autónoma a través de los portales externos. Selecciona la opción correspondiente según el período de consulta y completa la información solicitada.
              </AlertDescription>
            </Alert>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Opción para aportes hasta Agosto 2022 */}
            <section className="p-6 border rounded-lg bg-orange-50 border-orange-200">
              <div className="flex justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <h2 className="text-xl font-semibold text-orange-800">Hasta Agosto 2022</h2>
                  </div>
                </div>
                <img 
                  src="/images/logos/logo_aportes_en_linea.webp" 
                  alt="Aportes en Línea" 
                  className="h-8 w-auto"
                />
              </div>
              <p className="text-orange-700 mb-4">
                Para consultar aportes realizados hasta agosto de 2022, utiliza el portal de Aportes en Línea.
              </p>
              <Button 
                asChild 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                size="lg"
              >
                <a href={aportesEnLineaLink} target="_blank" rel="noopener noreferrer">
                  Ir al portal de Aportes en Línea
                  <ExternalLink className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </section>

            {/* Opción para aportes desde Septiembre 2022 */}
            <section className="p-6 border rounded-lg bg-green-50 border-green-200">
              <div className="flex justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <h2 className="text-xl font-semibold text-green-800">Desde Septiembre 2022</h2>
                  </div>
                </div>
                <img 
                  src="/images/logos/logo_arus_suaporte.webp" 
                  alt="ARUS SUAPORTE" 
                  className="h-8 w-auto"
                />
              </div>
              <p className="text-green-700 mb-4">
                Para consultar aportes realizados desde septiembre de 2022 en adelante, utiliza el portal de ARUS SUAPORTE.
              </p>
              <Button 
                asChild 
                className="w-full bg-secondary-prosaludgreen hover:bg-secondary-prosaludgreen/90 text-white"
                size="lg"
              >
                <a href={arusSuaporteLink} target="_blank" rel="noopener noreferrer">
                  Ir al portal de ARUS SUAPORTE
                  <ExternalLink className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </section>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">¿Cómo saber qué opción elegir?</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
                <span><strong>Aportes en Línea:</strong> Si necesitas consultar aportes realizados hasta agosto de 2022.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                <span><strong>ARUS SUAPORTE:</strong> Si necesitas consultar aportes realizados desde septiembre de 2022 hasta la fecha actual.</span>
              </li>
            </ul>
          </div>

          <div className="text-center mt-10">
            <Button variant="outline" asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Volver al Inicio
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CertificadoSeguridadSocialPage;
