
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, Gavel, Briefcase, Info, AlertTriangle, Home, CheckCircle, Scale, HandHeart, BookOpen, ExternalLink } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface ContentSectionProps {
  icon: React.ElementType;
  title: string;
  description: string;
  details: string | React.ReactNode;
  iconColor?: string;
  bgColor?: string;
  imageUrl?: string;
}

const ContentSection: React.FC<ContentSectionProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  details, 
  iconColor = "text-primary-prosalud", 
  bgColor = "bg-white",
  imageUrl 
}) => (
  <Card className={`shadow-lg hover:shadow-xl transition-all duration-300 ${bgColor} animate-fade-in overflow-hidden group h-full flex flex-col`}>
    {imageUrl && (
      <div className="h-48 overflow-hidden flex-shrink-0">
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
    )}
    <CardHeader className="flex-shrink-0">
      <div className="flex items-center mb-3">
        <div className={`p-3 rounded-xl mr-4 ${iconColor === 'text-secondary-prosaludgreen' ? 'bg-green-100' : iconColor === 'text-accent-prosaludteal' ? 'bg-teal-100' : iconColor === 'text-blue-600' ? 'bg-blue-100' : 'bg-blue-50'}`}>
          <Icon className={`h-8 w-8 ${iconColor}`} />
        </div>
        <div>
          <CardTitle className={`text-xl font-semibold ${iconColor}`}>{title}</CardTitle>
          <CardDescription className="text-sm text-gray-500 mt-1">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="flex-grow flex flex-col">
      {typeof details === 'string' ? (
        <p className="text-gray-700 leading-relaxed">{details}</p>
      ) : (
        details
      )}
    </CardContent>
  </Card>
);

const ContratoSindicalPage: React.FC = () => {
  const heroStats = [
    { number: "482", label: "Artículo C.S.T.", icon: Scale },
    { number: "1429", label: "Decreto 2010", icon: Gavel },
    { number: "100%", label: "Legal", icon: CheckCircle }
  ];

  const keyPoints = [
    "Naturaleza jurídica de estirpe laboral colectiva",
    "Afiliado partícipe con derecho a compensación",
    "Sin relación de subordinación tradicional",
    "Regido por principios democráticos"
  ];

  const sections = [
    {
      icon: Users,
      title: "Calidad del Afiliado Partícipe",
      description: "Derechos y beneficios económicos",
      details: (
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            El afiliado que participa en el desarrollo de un Contrato Sindical tendrá la calidad de <strong>afiliado partícipe</strong> y por esa condición tendrá derecho a un reconocimiento económico denominado <strong>compensación</strong>.
          </p>
          <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
            <div className="flex items-center">
              <HandHeart className="h-5 w-5 text-green-600 mr-2" />
              <span className="font-medium text-green-800">Beneficio Principal</span>
            </div>
            <p className="text-green-700 mt-2">Compensación económica por participación activa en el contrato sindical</p>
          </div>
        </div>
      ),
      iconColor: "text-secondary-prosaludgreen",
      imageUrl: "/images/contrato_sindical/calidad_afiliado.jpeg"
    },
    {
      icon: FileText,
      title: "Definición de Contrato Sindical",
      description: "Marco legal y conceptual",
      details: (
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            Se entiende por contrato sindical el que celebren uno o varios <strong>Sindicatos de trabajadores</strong> con uno o varios empleadores para la prestación de servicios o la ejecución de una obra por medio de sus afiliados.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center mb-2">
                <Users className="h-4 w-4 text-blue-600 mr-2" />
                <span className="font-medium text-blue-800">Sindicatos</span>
              </div>
              <p className="text-blue-700 text-sm">Organizaciones de trabajadores</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center mb-2">
                <Briefcase className="h-4 w-4 text-blue-600 mr-2" />
                <span className="font-medium text-blue-800">Empleadores</span>
              </div>
              <p className="text-blue-700 text-sm">Empresas contratantes</p>
            </div>
          </div>
        </div>
      ),
      iconColor: "text-accent-prosaludteal",
      imageUrl: "/images/contrato_sindical/contrato.avif"
    },
    {
      icon: Gavel,
      title: "Naturaleza Jurídica",
      description: "Fundamento legal del contrato sindical",
      details: (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Decreto Reglamentario 1429 de 2010</h4>
            <blockquote className="italic text-gray-600 border-l-4 border-primary-prosalud pl-4">
              "El contrato sindical como un acuerdo de voluntades, es de naturaleza colectivo [...]"
            </blockquote>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Artículo 482 del C.S.T.</h4>
            <blockquote className="italic text-gray-600 border-l-4 border-primary-prosalud pl-4">
              "La duración, la revisión y la extinción del contrato sindical se rige por las normas del contrato individual de trabajo."
            </blockquote>
          </div>
          <div className="bg-primary-prosalud/10 p-4 rounded-lg">
            <p className="font-medium text-primary-prosalud">
              <strong>Conclusión:</strong> La naturaleza jurídica del contrato sindical es de estirpe laboral en la modalidad colectiva.
            </p>
          </div>
        </div>
      ),
      iconColor: "text-primary-prosalud",
      imageUrl: "/images/contrato_sindical/naturaleza_juridica.avif"
    },
    {
      icon: AlertTriangle,
      title: "Diferencias Clave vs. Contrato Laboral",
      description: "Distinciones fundamentales en la relación",
      details: (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-3 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              El afiliado partícipe NO es trabajador del sindicato
            </h4>
            <div className="space-y-2">
              {[
                "El sindicato lo componen los mismos afiliados",
                "Los afiliados ejecutan el contrato sindical en desarrollo del contrato colectivo",
                "No se encuentra el elemento esencial de la subordinación"
              ].map((point, index) => (
                <div key={index} className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{point}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <h4 className="font-semibold text-amber-800 mb-2">Principios que rigen la relación:</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {["Democráticos", "Autogestión", "Colaboración", "Autorregulación"].map((principle, index) => (
                <Badge key={index} className="bg-amber-100 text-amber-800">
                  {principle}
                </Badge>
              ))}
            </div>
          </div>

          <div className="bg-blue-600 text-white p-4 rounded-lg">
            <p className="font-semibold text-center">
              <strong>PUNTO CLAVE:</strong> Entre el afiliado partícipe y la organización sindical NO existe una relación laboral y en consecuencia NO HAY CONTRATO DE TRABAJO.
            </p>
          </div>
        </div>
      ),
      iconColor: "text-blue-600",
      imageUrl: "/images/contrato_sindical/diferencias_contratos.jpeg"
    }
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-background-light">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-primary-prosalud via-primary-prosalud-dark to-slate-900 text-text-light overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            {/* Background texture */}
          </div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 md:pt-12 pb-16 sm:pb-20 md:pb-24 lg:pb-32 relative z-10">
            <Breadcrumb className="mb-8">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/" className="flex items-center gap-1 text-text-light/80 hover:text-text-light transition-colors">
                      <Home className="h-4 w-4" />
                      Inicio
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-text-light/60" />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/nosotros" className="flex items-center gap-1 text-text-light/80 hover:text-text-light transition-colors">
                      <Users className="h-4 w-4" /> 
                      Nosotros
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-text-light/60" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex items-center gap-1 font-medium text-text-light">
                    <FileText className="h-4 w-4" />
                    Contrato Sindical
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm text-secondary-prosaludgreen p-4 rounded-full mb-6 shadow-lg">
                <Briefcase size={48} />
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 animate-fade-in tracking-tight">
                Contrato Sindical
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto animate-fade-in animation-delay-200 font-light px-2 mb-8">
                Información esencial sobre la naturaleza, implicaciones y marco legal del contrato sindical en ProSalud
              </p>

              {/* Stats Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 animate-fade-in animation-delay-400">
                {heroStats.map((stat, index) => (
                  <div key={index} className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 hover:bg-white/15 transition-colors">
                    <stat.icon className="h-8 w-8 text-secondary-prosaludgreen mx-auto mb-3" />
                    <div className="text-3xl font-bold text-text-light mb-2">{stat.number}</div>
                    <div className="text-text-light/80 text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-16">
          {/* Key Points Alert */}
          <div className="mb-12 p-8 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl shadow-lg animate-fade-in">
            <div className="flex items-start">
              <div className="bg-yellow-500 p-3 rounded-xl mr-6">
                <Info className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-yellow-800 mb-4">Puntos Clave del Contrato Sindical</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {keyPoints.map((point, index) => (
                    <div key={index} className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 font-medium">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16 items-stretch">
            {sections.map((section, index) => (
              <div key={index} className="animate-fade-in flex" style={{ animationDelay: `${index * 100}ms` }}>
                <ContentSection
                  icon={section.icon}
                  title={section.title}
                  description={section.description}
                  details={section.details}
                  iconColor={section.iconColor}
                  imageUrl={section.imageUrl}
                />
              </div>
            ))}
          </div>

          {/* Documents Section */}
          { /* <Card className="bg-gradient-to-r from-primary-prosalud to-blue-700 text-white shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
            <CardHeader className="relative">
              <div className="flex items-center mb-4">
                <div className="bg-white/20 p-4 rounded-xl mr-6 backdrop-blur-sm">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white text-3xl font-bold">Documentos Legales</CardTitle>
                  <CardDescription className="text-blue-100 text-lg">
                    Accede a la documentación oficial del sindicato
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-6">
                <p className="text-blue-100 text-lg leading-relaxed">
                  Los estatutos sindicales y el reglamento del contrato sindical están debidamente depositados en el Ministerio de Protección Social y se encuentran disponibles para consulta.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button 
                    variant="secondary" 
                    size="lg"
                    className="bg-white text-primary-prosalud hover:bg-gray-100 font-semibold rounded-xl transition-all hover:scale-105"
                    asChild
                  >
                    <a href="http://www.sindicatoprosalud.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-5 w-5 mr-2" />
                      Visitar Sitio Oficial
                    </a>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="text-white border-white/50 hover:bg-white/10 font-semibold rounded-xl transition-all"
                    asChild
                  >
                    <Link to="/nosotros/estatutos">
                      <FileText className="h-5 w-5 mr-2" />
                      Ver Estatutos
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>*/ }
        </div>
      </div>
    </MainLayout>
  );
};

export default ContratoSindicalPage;
