import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface LiquidacionFormProps {
  onSubmit: (data: { tipoDocumento: string; numeroDocumento: string; fechaExpedicion: string }) => void;
  onCancel: () => void;
}

const LiquidacionForm: React.FC<LiquidacionFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    tipoDocumento: '',
    numeroDocumento: '',
    fechaExpedicion: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.tipoDocumento) {
      newErrors.tipoDocumento = 'Selecciona un tipo de documento';
    }

    if (!formData.numeroDocumento) {
      newErrors.numeroDocumento = 'Ingresa tu número de documento';
    } else if (!/^\d+$/.test(formData.numeroDocumento)) {
      newErrors.numeroDocumento = 'Solo se permiten números';
    }

    if (!formData.fechaExpedicion) {
      newErrors.fechaExpedicion = 'Selecciona la fecha de expedición';
    } else {
      const selectedDate = new Date(formData.fechaExpedicion);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        newErrors.fechaExpedicion = 'La fecha no puede ser futura';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl">Consultar Liquidación Pendiente</CardTitle>
        <CardDescription>
          Ingresa tus datos para consultar el estado de tu proceso de liquidación
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipoDocumento">Tipo de documento *</Label>
            <Select
              value={formData.tipoDocumento}
              onValueChange={(value) => setFormData({ ...formData, tipoDocumento: value })}
            >
              <SelectTrigger className={errors.tipoDocumento ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                <SelectItem value="TI">Tarjeta de Identidad (TI)</SelectItem>
                <SelectItem value="PP">Pasaporte (PP)</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipoDocumento && (
              <p className="text-sm text-destructive">{errors.tipoDocumento}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="numeroDocumento">Número de documento *</Label>
            <Input
              id="numeroDocumento"
              type="text"
              placeholder="Ej: 1234567890"
              value={formData.numeroDocumento}
              onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
              className={errors.numeroDocumento ? 'border-destructive' : ''}
            />
            {errors.numeroDocumento && (
              <p className="text-sm text-destructive">{errors.numeroDocumento}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaExpedicion">Fecha de expedición del documento *</Label>
            <Input
              id="fechaExpedicion"
              type="date"
              value={formData.fechaExpedicion}
              onChange={(e) => setFormData({ ...formData, fechaExpedicion: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              className={errors.fechaExpedicion ? 'border-destructive' : ''}
            />
            {errors.fechaExpedicion && (
              <p className="text-sm text-destructive">{errors.fechaExpedicion}</p>
            )}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta información es confidencial y solo será visible para ti.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">
              Consultar
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LiquidacionForm;
