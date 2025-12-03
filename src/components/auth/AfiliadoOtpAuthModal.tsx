import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OTPInput } from '@/components/ui/otp-input';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import { toast } from 'sonner';
import { Loader2, X, IdCard, Hash, Calendar, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { requestOtp, verifyOtp } from '@/services/afiliadosOtpService';

interface AfiliadoOtpAuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'request' | 'verify';

const AfiliadoOtpAuthModal: React.FC<AfiliadoOtpAuthModalProps> = ({ open, onClose, onSuccess }) => {
  const { authenticateWithOtp, afiliado, isAuthenticated } = useAfiliadoAuth();
  const [step, setStep] = useState<Step>('request');
  const [loading, setLoading] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tipoDocumento: 'CC',
    numeroDocumento: '',
    fechaExpedicion: '',
  });
  const [otp, setOtp] = useState('');
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpError, setOtpError] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [emailObfuscated, setEmailObfuscated] = useState<string | null>(null);

  // Si el usuario ya está autenticado, usar sus datos
  React.useEffect(() => {
    if (open) {
      // Resetear al estado inicial cuando se abre el modal
      setStep('request');
      setOtp('');
      setSessionId(null);
      setCanResendOtp(false);
      setResendCooldown(0);
      setOtpError(false);
      setOtpSuccess(false);
      setEmailObfuscated(null);
      
      if (isAuthenticated && afiliado) {
        // Usar los datos del usuario autenticado
        setFormData({
          tipoDocumento: afiliado.tipo_documento || 'CC',
          numeroDocumento: afiliado.documento || '',
          fechaExpedicion: '', // La fecha de expedición aún se necesita
        });
      } else {
        // Resetear formulario si no está autenticado
        setFormData({
          tipoDocumento: 'CC',
          numeroDocumento: '',
          fechaExpedicion: '',
        });
      }
    }
  }, [open, isAuthenticated, afiliado]);

  // Timer para el cooldown de reenvío
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendCooldown === 0 && step === 'verify') {
      setCanResendOtp(true);
    }
  }, [resendCooldown, step]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) {
    e.preventDefault();
    }
    
    // Si el usuario ya está autenticado, solo necesita la fecha de expedición
    if (isAuthenticated && afiliado) {
      if (!formData.fechaExpedicion) {
        toast.error('La fecha de expedición es obligatoria');
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
    } else {
      // Si no está autenticado, necesita todos los campos
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
    }

    setRequestingOtp(true);
    try {
      const response = await requestOtp({
        tipo_documento: formData.tipoDocumento,
        documento: formData.numeroDocumento,
        fecha_expedicion: formData.fechaExpedicion,
      });

      setSessionId(response.session_id);
      setEmailObfuscated(response.email_obfuscated || null);
      setStep('verify');
      setCanResendOtp(false);
      setResendCooldown(60); // 60 segundos de cooldown
      setOtp(''); // Reset OTP
      setOtpError(false);
      setOtpSuccess(false);
      
      toast.success('Código enviado', {
        description: 'Se ha enviado un código de verificación a tu correo electrónico.',
      });
    } catch (error: any) {
      toast.error('Error al solicitar código', {
        description: error.message || 'No se pudo enviar el código de verificación.',
      });
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async (otpValue: string) => {
    if (!otpValue || otpValue.length !== 6 || !/^\d{6}$/.test(otpValue)) {
      setOtpError(true);
      setOtpSuccess(false);
      return;
    }

    if (!sessionId) {
      toast.error('Error de sesión', {
        description: 'No se encontró la sesión. Por favor, solicita un nuevo código.',
      });
      setStep('request');
      return;
    }

    setLoading(true);
    setOtpError(false);
    try {
      await authenticateWithOtp(
        formData.tipoDocumento,
        formData.numeroDocumento,
        formData.fechaExpedicion,
        sessionId,
        otpValue
      );
      
      setOtpSuccess(true);
      toast.success('Autenticación exitosa');
      
      // Small delay to show success state
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (error: any) {
      setOtpError(true);
      setOtpSuccess(false);
      toast.error('Error al verificar código', {
        description: error.message || 'El código ingresado no es válido.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp || requestingOtp) return;

    setRequestingOtp(true);
    try {
      const response = await requestOtp({
        tipo_documento: formData.tipoDocumento,
        documento: formData.numeroDocumento,
        fecha_expedicion: formData.fechaExpedicion,
      });

      setSessionId(response.session_id);
      setEmailObfuscated(response.email_obfuscated || null);
      setCanResendOtp(false);
      setResendCooldown(60);
      setOtp(''); // Limpiar el campo OTP
      setOtpError(false);
      setOtpSuccess(false);
      
      toast.success('Código reenviado', {
        description: 'Se ha enviado un nuevo código de verificación a tu correo electrónico.',
      });
    } catch (error: any) {
      toast.error('Error al reenviar código', {
        description: error.message || 'No se pudo reenviar el código de verificación.',
      });
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleBack = () => {
    setStep('request');
    setOtp('');
    setSessionId(null);
    setCanResendOtp(false);
    setResendCooldown(0);
    setOtpError(false);
    setOtpSuccess(false);
    setEmailObfuscated(null);
  };

  const handleClose = () => {
    setStep('request');
    setOtp('');
    setSessionId(null);
    // Si el usuario está autenticado, mantener sus datos; si no, resetear todo
    if (isAuthenticated && afiliado) {
      setFormData({
        tipoDocumento: afiliado.tipo_documento || 'CC',
        numeroDocumento: afiliado.documento || '',
        fechaExpedicion: '',
      });
    } else {
    setFormData({
      tipoDocumento: 'CC',
      numeroDocumento: '',
      fechaExpedicion: '',
    });
    }
    setCanResendOtp(false);
    setResendCooldown(0);
    setOtpError(false);
    setOtpSuccess(false);
    setEmailObfuscated(null);
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
            {step === 'request' 
              ? (isAuthenticated && afiliado ? 'Verificación adicional requerida' : 'Autenticación requerida')
              : 'Verificación de código'}
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 mt-2 text-base">
            {step === 'request' 
              ? (isAuthenticated && afiliado
                  ? 'Para acceder a este trámite, necesitamos verificar tu identidad con un código de verificación que recibirás por correo electrónico.'
                  : 'Para acceder a este trámite, por favor ingresa tus datos de identificación y recibirás un código de verificación por correo electrónico.')
              : 'Ingresa el código de 6 dígitos que recibiste en tu correo electrónico.'}
          </DialogDescription>
          <div className="h-px bg-gray-200 mt-4"></div>
        </DialogHeader>
        
        {step === 'request' ? (
          <form onSubmit={handleRequestOtp} className="px-6 pb-6 pt-4">
            <div className="space-y-5">
              {isAuthenticated && afiliado ? (
                // Si ya está autenticado, mostrar solo información y fecha de expedición
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      Ya estás autenticado. Solo necesitamos tu fecha de expedición para enviar el código de verificación.
                    </p>
                  </div>
                  
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
                      disabled={requestingOtp}
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
                  disabled={requestingOtp}
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
                  disabled={requestingOtp}
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
                  disabled={requestingOtp}
                  className="w-full bg-indigo-50 border-indigo-200"
                  max={new Date().toISOString().split('T')[0]}
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
                disabled={requestingOtp}
                className="min-w-[100px] bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-800"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={requestingOtp}
                className="min-w-[140px] bg-primary-prosalud-dark hover:bg-primary-prosalud-dark/90 text-white"
              >
                {requestingOtp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Solicitar código
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyOtp(otp);
            }} 
            className="px-6 pb-6 pt-4"
          >
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Se ha enviado un código de verificación de 6 dígitos a tu correo electrónico registrado actualmente en ProSalud.
                  {emailObfuscated && (
                    <span className="block mt-2 font-semibold">
                      Correo: {emailObfuscated}
                    </span>
                  )}
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">Importante:</span> Si el correo electrónico no corresponde o ha cambiado, comunícate a través de los canales de atención de ProSalud para realizar la actualización manual de tu correo electrónico.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col items-center space-y-3">
                  <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      Código de verificación
                    </span>
                  </Label>
                  <OTPInput
                    value={otp}
                    onChange={(value) => {
                      setOtp(value);
                      setOtpError(false);
                      setOtpSuccess(false);
                    }}
                    length={6}
                    disabled={loading}
                    error={otpError}
                    success={otpSuccess}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Ingresa el código de 6 dígitos recibido en tu correo
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResendOtp || requestingOtp}
                  className="text-sm text-primary-prosalud-dark hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline transition-all"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 inline ${requestingOtp ? 'animate-spin' : ''}`} />
                  {requestingOtp 
                    ? 'Enviando...' 
                    : resendCooldown > 0 
                      ? `Reenviar código (${resendCooldown}s)` 
                      : 'Reenviar código'}
                </button>
              </div>
            </div>

            <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-gray-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleBack}
                disabled={loading}
                className="min-w-[100px] bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <Button 
                type="submit" 
                disabled={loading || otp.length !== 6}
                className="min-w-[140px] bg-primary-prosalud-dark hover:bg-primary-prosalud-dark/90 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar código'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AfiliadoOtpAuthModal;

