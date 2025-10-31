import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import { toast } from 'sonner';
import { Loader2, X, IdCard, Hash, Calendar } from 'lucide-react';

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
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 bg-white [&>button[data-state]]:hidden"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-sm transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none bg-white hover:bg-gray-100 p-1.5 shadow-lg border border-gray-300"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5 text-gray-700" />
        </button>
        
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex flex-col items-center mb-4">
            <img 
              src="/images/logo_prosalud.webp" 
              alt="ProSalud Logo" 
              className="h-16 w-auto mb-4"
            />
          </div>
          <DialogTitle className="text-2xl font-bold text-center text-gray-900">
            Autenticación requerida
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 mt-2 text-base">
            Para acceder a este trámite, por favor ingresa tus datos de identificación.
          </DialogDescription>
          <div className="h-px bg-gray-200 mt-4"></div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tipoDocumento" className="text-sm font-medium text-gray-700">
                <span className="inline-flex items-center gap-2">
                  <IdCard className="h-4 w-4 text-gray-500" />
                  Tipo de documento
                </span>
              </Label>
              <Select
                value={formData.tipoDocumento}
                onValueChange={(value) => setFormData({ ...formData, tipoDocumento: value })}
                disabled={loading}
              >
                <SelectTrigger className="bg-indigo-50 border-indigo-200">
                  <SelectValue placeholder="Seleccione un tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CC">Cédula de Ciudadania (CC)</SelectItem>
                  <SelectItem value="CE">Cédula de Extrangería (CE)</SelectItem>
                  <SelectItem value="PT">Permiso por Protección Temporal (PT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroDocumento" className="text-sm font-medium text-gray-700">
                <span className="inline-flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-500" />
                  Número de documento
                </span>
              </Label>
              <Input
                id="numeroDocumento"
                type="text"
                value={formData.numeroDocumento}
                onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
                placeholder="Ingrese su número de documento"
                disabled={loading}
                className="w-full bg-indigo-50 border-indigo-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaExpedicion" className="text-sm font-medium text-gray-700">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  Fecha de expedición
                </span>
              </Label>
              <Input
                id="fechaExpedicion"
                type="date"
                value={formData.fechaExpedicion}
                onChange={(e) => setFormData({ ...formData, fechaExpedicion: e.target.value })}
                disabled={loading}
                className="w-full bg-indigo-50 border-indigo-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
              className="min-w-[100px] bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-800"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="min-w-[140px] bg-primary-prosalud-dark hover:bg-primary-prosalud-dark/90 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Autenticando...
                </>
              ) : (
                'Autenticar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AfiliadoAuthModal;
