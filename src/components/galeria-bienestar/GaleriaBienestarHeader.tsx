
import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home, GalleryVertical, Image } from "lucide-react";

const GaleriaBienestarHeader: React.FC = () => {
  return (
    <>
      <div className="container mx-auto pt-6 pb-2 px-4 md:px-6 lg:px-8 py-10">
        <Breadcrumb>
          <BreadcrumbList className="flex items-center space-x-2 text-sm">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                  <Home className="h-4 w-4" />
                  Inicio
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1 font-medium text-foreground">
                <GalleryVertical className="h-4 w-4" />
                Galería de Bienestar
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="container mx-auto pt-6 pb-2 px-4 md:px-6 lg:px-8 py-10">  
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary-prosalud-dark" />
            <h1 className="text-xl md:text-2xl font-bold text-primary-prosalud-dark tracking-tight">
              Galería de Bienestar
            </h1>
          </div>
        </div>
      </div>
    </>
  );
};

export default GaleriaBienestarHeader;
