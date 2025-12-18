import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UserPlus, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  FileText, 
  Phone, 
  MapPin,
  Clock,
  Users,
  Heart,
  GraduationCap,
  Home
} from 'lucide-react';

const AfiliacionComfenalcoPage: React.FC = () => {
  const beneficios = [
    {
      icon: Heart,
      title: 'Salud y Bienestar',
      description: 'Acceso a programas de promoción y prevención en salud, medicina preventiva y atención odontológica.'
    },
    {
      icon: GraduationCap,
      title: 'Educación',
      description: 'Cursos, capacitaciones, programas técnicos y profesionales con descuentos especiales.'
    },
    {
      icon: Users,
      title: 'Recreación y Cultura',
      description: 'Eventos culturales, deportivos, turismo social y actividades familiares.'
    },
    {
      icon: Home,
      title: 'Vivienda',
      description: 'Programas de ahorro programado, subsidios y asesoría para adquisición de vivienda.'
    }
  ];

  const pasos = [
    {
      numero: '1',
      titulo: 'Verificar Elegibilidad',
      descripcion: 'Confirma que ya estás afiliado al Sindicato ProSalud y que tu vinculación esté activa.'
    },
    {
      numero: '2',
      titulo: 'Recopilar Documentos',
      descripcion: 'Prepara los documentos requeridos: cédula, certificación laboral y comprobante de ingresos.'
    },
    {
      numero: '3',
      titulo: 'Diligenciar Formulario',
      descripcion: 'Completa el formulario de afiliación en las oficinas de Comfenalco o en línea.'
    },
    {
      numero: '4',
      titulo: 'Radicar Solicitud',
      descripcion: 'Presenta los documentos y el formulario en cualquier sede de Comfenalco Antioquia.'
    },
    {
      numero: '5',
      titulo: 'Seguimiento',
      descripcion: 'Realiza seguimiento al proceso y recibe confirmación de tu afiliación.'
    }
  ];

  return (
    <MainLayout>
      <div className="min-h-screen">
        {/* Header */}
        <section className="relative bg-gradient-to-br from-primary-prosalud via-primary-prosalud-dark to-slate-900 text-text-light py-16 sm:py-20 md:py-24 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 opacity-10"></div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="flex justify-center mb-6">
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                <UserPlus className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 animate-fade-in tracking-tight">
              Proceso de afiliación de beneficiarios
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto animate-fade-in animation-delay-200 font-light px-2 mb-4">
              Accede a los beneficios de Comfenalco Antioquia
            </p>
            <p className="text-base sm:text-lg text-text-light/80 max-w-2xl mx-auto animate-fade-in animation-delay-400">
              Como afiliado a ProSalud, tienes derecho a afiliarte a Comfenalco y disfrutar de sus servicios de bienestar social.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Información Importante */}
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Importante:</strong> ProSalud se encarga de realizar el proceso de afiliación a Comfenalco de sus agremiados,
                pero la afiliación del grupo familiar es responsabilidad de cada afiliado y el proceso se hace directamente en las oficinas de comfenalco.
              </AlertDescription>
            </Alert>

            {/* ¿Qué es Comfenalco? */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-primary-prosalud">
                  <img 
                    src="/images/logo_comfenalco.webp" 
                    alt="Comfenalco Antioquia" 
                    className="h-8"
                  />
                  ¿Qué es Comfenalco Antioquia?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Comfenalco Antioquia es una Caja de Compensación Familiar que brinda servicios 
                  de bienestar social a los trabajadores y sus familias. Como afiliado a ProSalud, 
                  tienes derecho a acceder a estos beneficios adicionales.
                </p>
                
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  {beneficios.map((beneficio, index) => (
                    <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <beneficio.icon className="h-8 w-8 text-secondary-prosaludgreen" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-primary-prosalud mb-2">
                          {beneficio.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {beneficio.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Proceso de Afiliación */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-primary-prosalud">
                  <FileText className="h-6 w-6" />
                  Proceso de Afiliación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {pasos.map((paso, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary-prosalud text-white rounded-full flex items-center justify-center font-bold">
                          {paso.numero}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-primary-prosalud mb-2">
                          {paso.titulo}
                        </h4>
                        <p className="text-gray-700">
                          {paso.descripcion}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Documentos Requeridos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-primary-prosalud">
                  <FileText className="h-6 w-6" />
                  Documentos Requeridos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>Cédula de ciudadanía (original y copia)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>Certificación laboral vigente</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>Comprobante de ingresos (colilla de pago)</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>Registro civil de matrimonio (si aplica)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>Registro civil de nacimiento de hijos menores</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>Certificación de afiliación a ProSalud</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información de Contacto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-primary-prosalud">
                  <Phone className="h-6 w-6" />
                  Contacto Comfenalco Antioquia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Phone className="h-8 w-8 text-primary-prosalud mx-auto mb-2" />
                    <h4 className="font-semibold mb-1">Línea de Atención</h4>
                    <p className="text-sm text-gray-600">604 512 5000</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <MapPin className="h-8 w-8 text-primary-prosalud mx-auto mb-2" />
                    <h4 className="font-semibold mb-1">Oficinas</h4>
                    <p className="text-sm text-gray-600">Múltiples sedes en Antioquia</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Clock className="h-8 w-8 text-primary-prosalud mx-auto mb-2" />
                    <h4 className="font-semibold mb-1">Horario</h4>
                    <p className="text-sm text-gray-600">Lun - Vie: 8:00 AM - 5:00 PM</p>
                  </div>
                </div>
                
                <div className="text-center pt-4">
                  <Button 
                    className="bg-primary-prosalud hover:bg-primary-prosalud/90"
                    onClick={() => window.open('https://www.comfenalcoantioquia.com.co/personas', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visitar sitio web de Comfenalco
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recordatorio Final */}
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Recuerda:</strong> Primero debes completar tu afiliación a ProSalud. 
                Una vez seas afiliado activo del sindicato, podrás iniciar el proceso de afiliación a Comfenalco Antioquia 
                para acceder a sus servicios de bienestar social.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AfiliacionComfenalcoPage;
