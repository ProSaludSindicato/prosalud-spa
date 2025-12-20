
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import CopyToClipboardButton from '@/components/ui/copyToClipboardButton';
import { FileText, Mail, ArrowRightCircle } from 'lucide-react';

const ProtocoloIncapacidadesCard: React.FC = () => {
  return (
    <Card className="mb-8 shadow-lg animate-[fadeInUp_0.5s_ease-out_0.2s_forwards] opacity-0">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl text-primary">
          <FileText size={28} className="mr-3 text-secondary-prosaludgreen" />
          Protocolo Incapacidades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Las incapacidades son un aspecto crucial de la SST. Aquí encontrarás un resumen y cómo proceder:
        </p>
        <Alert variant="default" className="bg-primary-prosalud/5 border-primary-prosalud">
          <Mail className="h-5 w-5 text-primary-prosalud" />
          <AlertTitle className="font-semibold text-primary-prosalud">Envío de Incapacidades</AlertTitle>
          <AlertDescription>
            Los formatos por incapacidad solo se reciben en el correo:
            <div className="flex flex-col sm:flex-row sm:items-center my-2">
              <strong className="text-secondary-prosaludgreen mb-1 sm:mb-0 sm:mr-2 break-all">incapacidades@sindicatoprosalud.com</strong>
              <CopyToClipboardButton textToCopy="incapacidades@sindicatoprosalud.com" />
            </div>
          </AlertDescription>
        </Alert>
        <p>
          Para una guía detallada sobre el trámite de incapacidades y licencias, incluyendo requisitos y recomendaciones, visita nuestra página dedicada.
        </p>
        <Link to="/servicios/incapacidades-licencias" className="block">
          <Button className="my-5 w-full sm:w-auto bg-secondary-prosaludgreen hover:bg-secondary-prosaludgreen/90 text-white">
            Ver Guía Completa de Incapacidades y Licencias
            <ArrowRightCircle size={20} className="ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default ProtocoloIncapacidadesCard;

