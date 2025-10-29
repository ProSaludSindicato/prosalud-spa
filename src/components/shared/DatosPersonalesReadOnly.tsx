import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';

const DatosPersonalesReadOnly: React.FC = () => {
  const { afiliado } = useAfiliadoAuth();

  if (!afiliado) return null;

  const formatDocType = (type: string | null) => {
    if (!type) return '';
    const types: Record<string, string> = {
      'CC': 'Cédula de Ciudadanía',
      'CE': 'Cédula de Extranjería',
      'PT': 'Permiso por Protección Temporal',
    };
    return types[type] || type;
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5" />
          Datos Personales del Solicitante
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Tipo de identificación</label>
            <p className="mt-1 text-foreground font-medium">{formatDocType(afiliado.tipo_documento)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Número de identificación</label>
            <p className="mt-1 text-foreground font-medium">{afiliado.documento}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Nombres</label>
            <p className="mt-1 text-foreground font-medium">{afiliado.nombres}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Apellidos</label>
            <p className="mt-1 text-foreground font-medium">{afiliado.apellidos}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Correo electrónico</label>
            <p className="mt-1 text-foreground font-medium">{afiliado.correo_personal}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Número de celular</label>
            <p className="mt-1 text-foreground font-medium">{afiliado.celular}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DatosPersonalesReadOnly;
