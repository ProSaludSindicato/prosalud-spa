import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import { toast } from 'sonner';
import { Loader2, X, IdCard, Hash, Calendar } from 'lucide-react';
import { logger } from '@/utils/logger';

interface AfiliadoDataUpdateAuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AfiliadoDataUpdateAuthModal: React.FC<AfiliadoDataUpdateAuthModalProps> = ({ open, onClose, onSuccess }) => {
  const { authenticateForDataUpdate, afiliado, isAuthenticated, fechaExpedicion } = useAfiliadoAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipoDocumento: 'CC',
    numeroDocumento: '',
    fechaExpedicion: '',
  });

  // Si el usuario ya está autenticado con el otro API, prediligenciar tipo y número de documento
  // Si también tiene fecha de expedición guardada, usarla y autenticar automáticamente
  React.useEffect(() => {
    if (open) {
      if (isAuthenticated && afiliado) {
        // Si tiene fecha de expedición guardada, autenticar automáticamente
        if (fechaExpedicion) {
          setLoading(true);
          let cancelled = false;
          
          authenticateForDataUpdate(
            afiliado.tipo_documento || '',
            afiliado.documento || '',
            fechaExpedicion
          )
            .then(() => {
              if (!cancelled) {
                setLoading(false);
                onSuccess();
              }
            })
            .catch((error) => {
              if (!cancelled) {
                logger.warn('Autenticación automática falló, mostrando formulario:', error);
                setLoading(false);
                // Si falla, mostrar formulario con fecha prellenada
                setFormData({
                  tipoDocumento: afiliado.tipo_documento || 'CC',
                  numeroDocumento: afiliado.documento || '',
                  fechaExpedicion: fechaExpedicion, // Usar la fecha guardada
                });
              }
            });
          
          // Cleanup: cancelar autenticación si el modal se cierra
          return () => {
            cancelled = true;
          };
        } else {
          // Prediligenciar tipo y número de documento si ya está autenticado pero no tiene fecha
          setFormData({
            tipoDocumento: afiliado.tipo_documento || 'CC',
            numeroDocumento: afiliado.documento || '',
            fechaExpedicion: '', // La fecha de expedición se necesita
          });
        }
      } else {
        // Resetear formulario si no está autenticado
        setFormData({
          tipoDocumento: 'CC',
          numeroDocumento: '',
          fechaExpedicion: '',
        });
      }
    }
  }, [open, isAuthenticated, afiliado, fechaExpedicion, authenticateForDataUpdate, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipoDocumento || !formData.numeroDocumento || !formData.fechaExpedicion) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    // Validar que la fecha de expedición no sea futura
    const fechaSeleccionada = new Date(formData.fechaExpedicion);
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999); // Establecer al final del día para comparar correctamente
    
    if (fechaSeleccionada > hoy) {
      toast.error('Fecha inválida', {
        description: 'La fecha de expedición no puede ser futura.',
      });
      return;
    }

    setLoading(true);
    try {
      await authenticateForDataUpdate(
        formData.tipoDocumento,
        formData.numeroDocumento,
        formData.fechaExpedicion
      );
      
      toast.success('Autenticación exitosa');
      
      // Small delay to show success state
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (error: any) {
      toast.error('Error al autenticar', {
        description: error.message || 'No se pudo autenticar. Verifica tus datos e intenta nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Si el usuario está autenticado, mantener sus datos; si no, resetear todo
    if (isAuthenticated && afiliado) {
      setFormData({
        tipoDocumento: afiliado.tipo_documento || 'CC',
        numeroDocumento: afiliado.documento || '',
        fechaExpedicion: fechaExpedicion || '', // Preservar fecha de expedición si existe
      });
    } else {
      setFormData({
        tipoDocumento: 'CC',
        numeroDocumento: '',
        fechaExpedicion: '',
      });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 bg-white [&>button[data-state]]:hidden"
      >
        <button
          onClick={handleClose}
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
            {isAuthenticated && afiliado
              ? 'Para acceder a este servicio de actualización de datos personales, necesitamos verificar tu identidad nuevamente. Por favor, ingresa tu fecha de expedición.'
              : 'Para acceder a este servicio de actualización de datos personales, por favor ingresa tus datos de identificación.'}
          </DialogDescription>
          <div className="h-px bg-gray-200 mt-4"></div>
        </DialogHeader>
        
        {loading && isAuthenticated && afiliado && fechaExpedicion ? (
          <div className="px-6 pb-6 pt-4 flex flex-col items-center justify-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-prosalud-dark border-r-transparent mb-4"></div>
            <p className="text-gray-600 text-base">Autenticando automáticamente...</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4">
          <div className="space-y-5">
            {isAuthenticated && afiliado ? (
              // Si ya está autenticado, mostrar información y solo pedir fecha de expedición
              <>
                {!fechaExpedicion && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      Ya estás autenticado. Solo necesitamos tu fecha de expedición para continuar.
                    </p>
                  </div>
                )}
                
                <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Tipo de documento:</span>
                    <span className="text-sm text-gray-900">{formData.tipoDocumento}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Número de documento:</span>
                    <span className="text-sm text-gray-900">{formData.numeroDocumento}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaExpedicion" className="text-sm font-medium text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      Fecha de expedición *
                    </span>
                  </Label>
                  <Input
                    id="fechaExpedicion"
                    type="date"
                    value={formData.fechaExpedicion}
                    onChange={(e) => setFormData({ ...formData, fechaExpedicion: e.target.value })}
                    disabled={loading}
                    className="w-full bg-indigo-50 border-indigo-200"
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </>
            ) : (
              // Si no está autenticado, mostrar todos los campos
              <>
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
                      <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                      <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                      <SelectItem value="TI">Tarjeta de Identidad (TI)</SelectItem>
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
                    required
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
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
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
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AfiliadoDataUpdateAuthModal;

