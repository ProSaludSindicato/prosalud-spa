
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Link } from 'react-router-dom';
import { Home, DownloadCloud, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SolicitudPermisosCambioTurnosPage: React.FC = () => {
  const formatoPermisosUrl = "http://orgs.ddns.net:8091/DocPublicos/Modelo%20de%20Plantillas/Formato%20Solicitud%20Permisos/Formato%20Solicitud%20Permisos.pdf";
  const formatoCambioTurnosUrl = "http://orgs.ddns.net:8091/DocPublicos/Modelo%20de%20Plantillas/Formato%20cambio%20de%20turnos/Formato%20cambio%20de%20turnos%20ProSalud.pdf";

  const handleDownload = (url: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.open(url, '_blank');
  };

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
                <FileText className="h-4 w-4 mr-1 inline-block" /> Solicitud de Permisos y Cambio de Turnos
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <header className="mb-6">
            <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-prosalud-dark" />
                <h1 className="text-xl md:text-2xl font-bold text-primary-prosalud-dark">
                Solicitud de Permisos y Cambio de Turnos
                </h1>
            </div>
          </header>
        <div className="bg-card p-6 md:p-8 rounded-lg shadow-lg border border-prosalud-border">
          
          <div className="mb-6 p-6 border-2 border-primary-prosalud rounded-lg shadow-lg bg-primary-prosalud/5 text-center">
            <h2 className="text-xl font-semibold text-primary-prosalud mb-4">Descargar Formatos de Solicitud</h2>
            <p className="text-gray-700 mb-4">
              Descargue los formatos oficiales para su solicitud. Asegúrese de diligenciarlos completamente y obtener las firmas requeridas.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                type="button"
                onClick={handleDownload(formatoPermisosUrl)}
                size="lg"
                className="bg-primary-prosalud hover:bg-primary-prosalud/90 text-white"
              >
                <DownloadCloud className="mr-2 h-5 w-5" />
                Formato de Permisos
              </Button>
              <Button
                type="button"
                onClick={handleDownload(formatoCambioTurnosUrl)}
                size="lg"
                className="bg-primary-prosalud hover:bg-primary-prosalud/90 text-white"
              >
                <DownloadCloud className="mr-2 h-5 w-5" />
                Formato de Cambio de Turnos
              </Button>
            </div>
          </div>

          <section className="mb-8">
            <Alert className="border-amber-400 bg-amber-50 text-amber-700">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <AlertTitle className="font-semibold text-amber-800">Notas Importantes</AlertTitle>
              <AlertDescription className="text-amber-700">
                <ul className="list-disc list-inside space-y-1.5 mt-2 pl-2">
                  <li>Tener presente los requisitos de su solicitud.</li>
                  <li>Es muy importante que la solicitud cuente con el V°B° del Coordinador o la persona encargada en la Sede de la programación de turnos. <strong>Requerido.</strong></li>
                  <li>El envío del documento debidamente firmado es de carácter <strong>obligatorio</strong>.</li>
                </ul>
              </AlertDescription>
            </Alert>
          </section>
          
          <div className="text-center mt-12">
            <Button variant="outline" asChild size="lg">
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

export default SolicitudPermisosCambioTurnosPage;
