
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { Home, Phone, Mail, MapPin, Clock, Globe, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ContactoPage: React.FC = () => {
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
                <Phone className="h-4 w-4 mr-1 inline-block" /> Contacto
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contacto</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Estamos aquí para atenderte. Encuentra nuestros canales de comunicación y horarios de atención.
          </p>
        </div>

        {/* Alert sobre chatbot */}
        <Alert className="border-blue-200 bg-blue-50 mb-8">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <strong>¿Necesitas ayuda inmediata?</strong>
                <br />
                Usa nuestro chatbot en la esquina inferior derecha para consultas rápidas sobre servicios e incapacidades.
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Información Principal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary-prosalud" />
                Contacto Principal
              </CardTitle>
              <CardDescription>
                Información principal para comunicarte con ProSalud
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-gray-500 mt-1" />
                <div>
                  <p className="font-semibold">Página Web Oficial</p>
                  <a 
                    href="https://www.sindicatoprosalud.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-prosalud hover:underline"
                  >
                    www.sindicatoprosalud.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-500 mt-1" />
                <div>
                  <p className="font-semibold">Teléfono PBX</p>
                  <p className="text-gray-600">604 448 9232</p>
                  <p className="text-sm text-gray-500">Línea directa de atención</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-gray-500 mt-1" />
                <div>
                  <p className="font-semibold">WhatsApp Talento Humano</p>
                  <p className="text-gray-600">3216529892</p>
                  <p className="text-sm text-gray-500">Consultas sobre talento humano</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-500 mt-1" />
                <div>
                  <p className="font-semibold">Correo Electrónico</p>
                  <p className="text-gray-600">comunicaciones@sindicatoprosalud.com</p>
                  <p className="text-sm text-gray-500">Respuesta en 24-48 horas</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-1" />
                <div>
                  <p className="font-semibold">Dirección</p>
                  <p className="text-gray-600">
                    Carrera 50 N° 127 Sur 61 Int. 802<br />
                    Caldas (Ant.) Colombia
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Horarios de Atención */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary-prosalud" />
                Horarios de Atención
              </CardTitle>
              <CardDescription>
                Nuestros horarios para diferentes servicios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-l-4 border-primary-prosalud pl-4">
                <p className="font-semibold">Atención Presencial</p>
                <p className="text-gray-600">Lunes a Viernes: 8:00 AM - 4:00 PM</p>
                <p className="text-sm text-gray-500">Sede principal - Caldas (Ant.)</p>
              </div>

              <div className="border-l-4 border-secondary-prosaludgreen pl-4">
                <p className="font-semibold">Atención Telefónica</p>
                <p className="text-gray-600">Lunes a Viernes: 7:00 AM - 5:00 PM</p>
                <p className="text-sm text-gray-500">Línea PBX: 604 448 9232</p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-semibold">Servicios Digitales</p>
                <p className="text-gray-600">24/7 disponibles</p>
                <p className="text-sm text-gray-500">Portal web y formularios en línea</p>
                <p className="text-sm text-amber-600 mt-1">⚠️ Solicitudes después de 4:00 PM se cuentan como siguiente día hábil</p>
              </div>

              <div className="border-l-4 border-orange-500 pl-4">
                <p className="font-semibold">Chatbot</p>
                <p className="text-gray-600">24/7 disponible</p>
                <p className="text-sm text-gray-500">Consultas rápidas</p>
              </div>
            </CardContent>
          </Card>

          {/* Servicios Digitales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary-prosalud" />
                Servicios Digitales
              </CardTitle>
              <CardDescription>
                Accede a nuestros servicios en línea
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold">Portal Web de Servicios</p>
                  <p className="text-sm text-gray-600">Acceso a todos los formularios y solicitudes</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold">Certificados en Línea</p>
                  <p className="text-sm text-gray-600">Solicitud y descarga de certificados</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold">Consulta de Pagos</p>
                  <p className="text-sm text-gray-600">Verificación del estado de compensaciones</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold">Chatbot Especializado</p>
                  <p className="text-sm text-gray-600">Consultas sobre incapacidades y servicios</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información Adicional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary-prosalud" />
                Información Importante
              </CardTitle>
              <CardDescription>
                Datos adicionales para tu comunicación con nosotros
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50">
                <Clock className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Tiempos de respuesta:</strong> Las consultas por correo electrónico 
                  pueden tomar hasta 15 días hábiles para revisión completa.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Correos SPAM:</strong> Para evitar que nuestras respuestas lleguen a tu bandeja 
                  de SPAM, agrega nuestro correo institucional a tu lista de contactos.
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Horario de registro:</strong> Cualquier solicitud fuera del horario laboral 
                  se entenderá presentada el día hábil siguiente.
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Orden de atención:</strong> Las solicitudes se registran y asignan por orden de llegada.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ContactoPage;
