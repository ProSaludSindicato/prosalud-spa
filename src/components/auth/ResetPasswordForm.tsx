
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Key, CheckCircle, X, Check, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import { getRecaptchaToken } from '@/utils/recaptcha';
import { handleRecaptchaError, isRecaptchaError } from '@/utils/recaptchaErrorHandler';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';

// Validador de contraseñas seguras (mismo que DefinePasswordForm)
const passwordSchema = z
  .string()
  .min(12, { message: "La contraseña debe tener al menos 12 caracteres." })
  .max(128, { message: "La contraseña es demasiado larga." })
  .refine((password) => /[A-Z]/.test(password), {
    message: "Debe incluir al menos una letra mayúscula.",
  })
  .refine((password) => /[a-z]/.test(password), {
    message: "Debe incluir al menos una letra minúscula.",
  })
  .refine((password) => /\d/.test(password), {
    message: "Debe incluir al menos un número.",
  })
  .refine((password) => /[!@#$%^&*()\-_=+[\]{};:,.<>/?]/.test(password), {
    message: "Debe incluir al menos un símbolo especial (!@#$%^&*()-_=+[]{};:,.<>/?).",
  });

const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, { message: "Confirma tu contraseña." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

// Componente para mostrar los requisitos de contraseña
const PasswordRequirements: React.FC<{ password: string }> = ({ password }) => {
  const requirements = [
    { test: (p: string) => p.length >= 12, text: "Al menos 12 caracteres" },
    { test: (p: string) => /[A-Z]/.test(p), text: "Una letra mayúscula" },
    { test: (p: string) => /[a-z]/.test(p), text: "Una letra minúscula" },
    { test: (p: string) => /\d/.test(p), text: "Un número" },
    {
      test: (p: string) => /[!@#$%^&*()\-_=+[\]{};:,.<>/?]/.test(p),
      text: "Un símbolo especial",
    },
  ];

  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs text-gray-600 font-medium">Requisitos de contraseña:</p>
      {requirements.map((req, index) => {
        const isValid = req.test(password);
        return (
          <div key={index} className="flex items-center gap-2 text-xs">
            {isValid ? (
              <CheckCircle className="w-3 h-3 text-green-500" />
            ) : (
              <X className="w-3 h-3 text-gray-400" />
            )}
            <span className={isValid ? "text-green-600" : "text-gray-500"}>
              {req.text}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const ResetPasswordForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [linkError, setLinkError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // Security: Use centralized sanitization hook
  const { sanitizeGeneral } = useSanitizedInput();

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const watchedPassword = form.watch("password");

  useEffect(() => {
    // Obtener token de los query params
    const urlToken = searchParams.get('token');
    if (!urlToken) {
      setLinkError(
        'El enlace de recuperación no es válido o ha expirado. Por favor, solicita un nuevo enlace.'
      );
    } else {
      setToken(urlToken);
    }
  }, [searchParams]);

  const onSubmit = async (values: ResetPasswordValues) => {
    if (!token) {
      setLinkError(
        'El enlace de recuperación no es válido o ha expirado. Por favor, solicita un nuevo enlace.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Obtener token de reCAPTCHA antes de la petición
      const recaptchaToken = await getRecaptchaToken('reset_password');

      const payload: any = {
        token: token,
        password: values.password,
        password_confirmation: values.confirmPassword,
      };

      // Agregar token de reCAPTCHA si está disponible
      if (recaptchaToken) {
        payload.recaptcha_token = recaptchaToken;
        payload.recaptcha_action = 'reset_password';
      }

      await api.post('/api/auth/reset-password', payload);

      setIsSuccess(true);
      toast({
        title: "¡Contraseña actualizada!",
        description: "Tu contraseña ha sido restablecida exitosamente.",
        className: "border-green-200 bg-green-50 text-green-800"
      });
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate('/auth/login');
      }, 3000);
    } catch (error: any) {
      // Manejar errores de reCAPTCHA específicamente
      if (isRecaptchaError(error)) {
        toast({
          title: "Error de verificación",
          description: handleRecaptchaError(error),
          variant: "destructive"
        });
        return;
      }

      // Manejar errores de validación (422)
      if (error.response?.status === 422) {
        const errors = error.response.data?.errors;
        let errorMessage = error.response.data?.message || 
          "Los datos proporcionados no son válidos.";

        // Si hay errores específicos de campos, mostrarlos
        if (errors) {
          const errorFields = Object.keys(errors);
          if (errorFields.length > 0) {
            const firstError = errors[errorFields[0]];
            errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
          }
        }

        toast({
          title: "Error de validación",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        // Otros errores (token inválido, expirado, etc.)
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error ||
                            "Ocurrió un error al restablecer la contraseña. Verifica que el enlace no haya expirado.";
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 12 },
    },
  };

  if (linkError) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="w-full bg-white text-center space-y-6"
      >
        <div className="flex justify-center">
          <AlertTriangle className="h-16 w-16 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-primary-prosalud">Enlace inválido</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {linkError}
          </p>
        </div>
        <div className="space-y-2">
          <Link to="/auth/forgot-password">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Solicitar nuevo enlace
            </Button>
          </Link>
          <Link to="/auth/login">
            <Button variant="ghost" className="w-full">
              Volver al inicio de sesión
            </Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  if (isSuccess) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="w-full bg-white text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          className="flex justify-center"
        >
          <CheckCircle className="h-16 w-16 text-green-500" />
        </motion.div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-primary-prosalud">¡Contraseña restablecida!</h1>
          <p className="text-muted-foreground">
            Tu contraseña ha sido actualizada exitosamente.
          </p>
          <p className="text-sm text-slate-500">
            Serás redirigido al inicio de sesión en unos segundos...
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={itemVariants}
      className="w-full bg-white"
    >
      <motion.div variants={itemVariants} className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-prosalud">Restablecer contraseña</h1>
        <p className="text-muted-foreground mt-2">
          Crea una contraseña segura para restablecer el acceso a tu cuenta.
        </p>
      </motion.div>

      <Form {...form}>
        <motion.form
          variants={itemVariants}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Nueva contraseña
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        {...field}
                        autoComplete="new-password"
                        disabled={isSubmitting}
                        maxLength={128}
                        onChange={(e) => {
                          // Security: Sanitize password input (preserve special chars for passwords)
                          const sanitized = sanitizeGeneral(e.target.value, { maxLength: 128 });
                          field.onChange(sanitized);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                        disabled={isSubmitting}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </FormControl>
                  <PasswordRequirements password={watchedPassword || ""} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar nueva contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        {...field}
                        autoComplete="new-password"
                        disabled={isSubmitting}
                        maxLength={128}
                        onChange={(e) => {
                          // Security: Sanitize password input (preserve special chars for passwords)
                          const sanitized = sanitizeGeneral(e.target.value, { maxLength: 128 });
                          field.onChange(sanitized);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                        disabled={isSubmitting}
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <Button
              type="submit"
              className="w-full bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Actualizando..." : "Restablecer contraseña"}
            </Button>
          </motion.div>
        </motion.form>
      </Form>
    </motion.div>
  );
};

export default ResetPasswordForm;
