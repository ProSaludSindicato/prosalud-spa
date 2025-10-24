import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types/admin';
import { usersApi } from '@/services/adminApi';
import { rolesApiAdapter } from '@/services/rolesApiAdapter';
import { nameValidation, emailValidation } from '@/hooks/useFormValidation';
import AdminModal from '@/components/admin/common/AdminModal';

const formSchema = z.object({
  name: nameValidation,
  email: emailValidation,
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional().or(z.literal('')),
  password_confirmation: z.string().optional().or(z.literal('')),
  role: z.string().min(1, 'El rol es requerido'),
  isActive: z.boolean().optional(),
}).refine((data) => {
  if (data.password && data.password.length > 0) {
    return data.password === data.password_confirmation;
  }
  return true;
}, {
  message: 'Las contraseñas no coinciden',
  path: ['password_confirmation'],
});

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  open,
  onOpenChange,
  user
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      role: '',
      isActive: true,
    },
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = form;

  // Fetch available roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApiAdapter.getRoles,
  });

  // Update form values when user prop changes
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        role: user.role || user.roles?.[0] || '',
        isActive: user.isActive,
      });
    } else {
      form.reset({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: '',
        isActive: true,
      });
    }
  }, [user, form]);

  const createMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido actualizado exitosamente.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const userData: any = {
      name: data.name,
      email: data.email,
      role: data.role,
      ...(user && { isActive: data.isActive }),
      ...(data.password && data.password.length > 0 && {
        password: data.password,
        password_confirmation: data.password_confirmation,
      }),
      ...(!user && {
        password: data.password || 'ProSalud2024.*',
        password_confirmation: data.password_confirmation || 'ProSalud2024.*',
      }),
    };

    if (user) {
      updateMutation.mutate({ id: user.id, data: userData });
    } else {
      createMutation.mutate(userData);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
    }
    onOpenChange(newOpen);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminModal
      open={open}
      onOpenChange={handleOpenChange}
      title={user ? "Editar Usuario" : "Crear Usuario"}
      description={user ? "Modifica la información del usuario" : "Completa el formulario para crear un nuevo usuario"}
      actions={
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="user-form"
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? "Procesando..." : user ? "Actualizar Usuario" : "Crear Usuario"}
          </Button>
        </div>
      }
    >
      <motion.form
        id="user-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="grid gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Ingrese el nombre completo"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="ejemplo@prosalud.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={watch('role')} onValueChange={(value) => setValue('role', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role.message}</p>
              )}
            </div>

            {!user && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register('password')}
                    placeholder="Mínimo 8 caracteres"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password_confirmation">Confirmar Contraseña</Label>
                  <Input
                    id="password_confirmation"
                    type="password"
                    {...register('password_confirmation')}
                    placeholder="Repita la contraseña"
                  />
                  {errors.password_confirmation && (
                    <p className="text-sm text-red-500">{errors.password_confirmation.message}</p>
                  )}
                </div>
              </>
            )}

            {user && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva Contraseña (opcional)</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register('password')}
                    placeholder="Dejar en blanco para mantener la actual"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password.message}</p>
                  )}
                </div>

                {watch('password') && watch('password').length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="password_confirmation">Confirmar Nueva Contraseña</Label>
                    <Input
                      id="password_confirmation"
                      type="password"
                      {...register('password_confirmation')}
                      placeholder="Repita la nueva contraseña"
                    />
                    {errors.password_confirmation && (
                      <p className="text-sm text-red-500">{errors.password_confirmation.message}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    {...register('isActive')}
                  />
                  <Label htmlFor="isActive">Usuario activo</Label>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.form>
    </AdminModal>
  );
};

export default UserFormModal;