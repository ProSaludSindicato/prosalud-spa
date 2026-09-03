import React from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Home, ShieldCheck } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import PublicPdfViewer from '@/components/legal/PublicPdfViewer';
import {
  DATA_TREATMENT_POLICY_PDF_URL,
} from '@/config/legalDocuments';

const PoliticaTratamientoDatosPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  to="/"
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Inicio
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1 font-medium text-foreground">
                <ShieldCheck className="h-4 w-4" />
                Política de Tratamiento de Datos
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <header className="mb-8 text-center animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-prosalud mb-3">
            Política de Tratamiento y Protección de Datos Personales
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
            Documento público del Sindicato de Profesionales de la Salud ProSalud sobre el
            tratamiento, protección y finalidades de los datos personales.
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <Button asChild variant="outline" className="gap-2">
            <a href={DATA_TREATMENT_POLICY_PDF_URL} download>
              <Download className="h-4 w-4" />
              Descargar PDF
            </a>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <a href={DATA_TREATMENT_POLICY_PDF_URL} target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4" />
              Abrir en nueva pestaña
            </a>
          </Button>
        </div>

        <div className="rounded-xl border bg-white shadow-lg overflow-hidden">
          <PublicPdfViewer
            src={DATA_TREATMENT_POLICY_PDF_URL}
            title="Política de Tratamiento y Protección de Datos Personales ProSalud"
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default PoliticaTratamientoDatosPage;
