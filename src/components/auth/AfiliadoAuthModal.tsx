import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

interface AfiliadoAuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AfiliadoAuthModal: React.FC<AfiliadoAuthModalProps> = ({ open, onClose, onSuccess }) => {
  const { authenticate } = useAfiliadoAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipoDocumento: '',
    numeroDocumento: '',
    fechaExpedicion: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipoDocumento || !formData.numeroDocumento || !formData.fechaExpedicion) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    setLoading(true);
    try {
      await authenticate(formData.tipoDocumento, formData.numeroDocumento, formData.fechaExpedicion);
      toast.success('Autenticación exitosa');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">Autenticación requerida</DialogTitle>
          <DialogDescription className="text-center text-base">
            Para acceder a este trámite, por favor ingresa tus datos de identificación.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="tipoDocumento">Tipo de documento</Label>
            <Select
              value={formData.tipoDocumento}
              onValueChange={(value) => setFormData({ ...formData, tipoDocumento: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CC">Cédula de Ciudadania (CC)</SelectItem>
                <SelectItem value="CE">Cédula de Extrangería (CE)</SelectItem>
                <SelectItem value="PT">Permiso por Protección Temporal (PT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numeroDocumento">Número de documento</Label>
            <Input
              id="numeroDocumento"
              type="text"
              value={formData.numeroDocumento}
              onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
              placeholder="Ingresa tu número de documento"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaExpedicion">Fecha de expedición</Label>
            <Input
              id="fechaExpedicion"
              type="date"
              value={formData.fechaExpedicion}
              onChange={(e) => setFormData({ ...formData, fechaExpedicion: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Autenticar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AfiliadoAuthModal;
