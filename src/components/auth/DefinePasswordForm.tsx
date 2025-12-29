import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Key, CheckCircle, X, AlertTriangle, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';

// Reutilizamos un esquema de contraseña robusto similar al de ResetPasswordForm
const passwordSchema = z
  .string()
  .min(12, { message: 'La contraseña debe tener al menos 12 caracteres.' })
  .max(128, { message: 'La contraseña es demasiado larga.' })
  .refine((password) => /[A-Z]/.test(password), {
    message: 'Debe incluir al menos una letra mayúscula.',
  })
  .refine((password) => /[a-z]/.test(password), {
    message: 'Debe incluir al menos una letra minúscula.',
  })
  .refine((password) => /\d/.test(password), {
    message: 'Debe incluir al menos un número.',
  })
  .refine((password) => /[!@#$%^&*()\-_=+[\]{};:,.<>/?]/.test(password), {
    message: 'Debe incluir al menos un símbolo especial (!@#$%^&*()-_=+[]{};:,.<>/?).',
  });

const definePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, { message: 'Confirma tu contraseña.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

type DefinePasswordValues = z.infer<typeof definePasswordSchema>;

const PasswordRequirements: React.FC<{ password: string }> = ({ password }) => {
  const requirements = [
    { test: (p: string) => p.length >= 12, text: 'Al menos 12 caracteres' },
    { test: (p: string) => /[A-Z]/.test(p), text: 'Una letra mayúscula' },
    { test: (p: string) => /[a-z]/.test(p), text: 'Una letra minúscula' },
    { test: (p: string) => /\d/.test(p), text: 'Un número' },
    {
      test: (p: string) => /[!@#$%^&*()\-_=+[\]{};:,.<>/?]/.test(p),
      text: 'Un símbolo especial',
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
            <span className={isValid ? 'text-green-600' : 'text-gray-500'}>{req.text}</span>
          </div>
        );
      })}
    </div>
  );
};

const DefinePasswordForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  // Security: Use centralized sanitization hook
  const { sanitizeGeneral } = useSanitizedInput();

  const [token, setToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const form = useForm<DefinePasswordValues>({
    resolver: zodResolver(definePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const watchedPassword = form.watch('password');

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (!urlToken) {
      setLinkError(
        'El enlace para definir tu contraseña no es válido. Por favor, contacta al administrador para solicitar una nueva invitación.'
      );
    } else {
      setToken(urlToken);
    }
  }, [searchParams]);

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 12 },
    },
  };

  const handleSubmit = async (values: DefinePasswordValues) => {
    if (!token) {
      setLinkError(
        'El enlace para definir tu contraseña no es válido. Por favor, contacta al administrador para solicitar una nueva invitación.'
      );
      return;
    }

    setIsSubmitting(true);
    setServerMessage(null);

    try {
      const response = await api.post('/api/auth/set-password', {
        token,
        password: values.password,
        password_confirmation: values.confirmPassword,
      });

      if (response?.data?.message) {
        toast({
          title: 'Contraseña definida correctamente',
          description: 'Ya puedes iniciar sesión con tus nuevas credenciales.',
        });
      }

      setIsSuccess(true);

      // Redirigir al login después de unos segundos
      setTimeout(() => {
        navigate('/auth/login');
      }, 3000);
    } catch (error: any) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 422) {
        // Errores por token inválido o expirado
        if (data?.message) {
          setServerMessage(data.message);
          toast({
            title: 'No pudimos definir tu contraseña',
            description: data.message,
            variant: 'destructive',
          });
        }

        // Errores de validación de contraseña
        if (data?.errors?.password && Array.isArray(data.errors.password)) {
          const passwordError = data.errors.password[0];
          form.setError('password', { type: 'server', message: passwordError });
        }
      } else {
        const genericMessage = 'Ocurrió un error al definir tu contraseña. Intenta de nuevo más tarde.';
        setServerMessage(genericMessage);
        toast({
          title: 'Error',
          description: genericMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
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
          <Link to="/auth/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
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
          transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
          className="flex justify-center"
        >
          <CheckCircle className="h-16 w-16 text-green-500" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-primary-prosalud">Contraseña definida</h1>
          <p className="text-muted-foreground">
            Tu contraseña ha sido definida correctamente. Ya puedes iniciar sesión.
          </p>
          <p className="text-sm text-slate-500">
            Serás redirigido al inicio de sesión en unos segundos...
          </p>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/auth/login')}
          >
            Ir al inicio de sesión
          </Button>
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
        <h1 className="text-3xl font-bold text-primary-prosalud">Define tu contraseña</h1>
        <p className="text-muted-foreground mt-2">
          Crea una contraseña segura para activar tu cuenta y poder iniciar sesión.
        </p>
      </motion.div>

      {serverMessage && (
        <motion.div
          variants={itemVariants}
          className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <div>
            <p>{serverMessage}</p>
            {serverMessage.includes('ha expirado') && (
              <p className="mt-1 text-xs">
                Pide al administrador que reenvíe la invitación para continuar con el proceso.
              </p>
            )}
          </div>
        </motion.div>
      )}

      <Form {...form}>
        <motion.form
          variants={itemVariants}
          onSubmit={form.handleSubmit(handleSubmit)}
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
                        type={showPassword ? 'text' : 'password'}
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
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                        disabled={isSubmitting}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </FormControl>
                  <PasswordRequirements password={watchedPassword || ''} />
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
                        type={showConfirmPassword ? 'text' : 'password'}
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
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
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
              {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
            </Button>
          </motion.div>
        </motion.form>
      </Form>
    </motion.div>
  );
};

export default DefinePasswordForm;


