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
  role: z.string().min(1, 'El rol es requerido'),
  isActive: z.boolean().optional(),
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
        role: user.role || user.roles?.[0] || '',
        isActive: user.isActive,
      });
    } else {
      form.reset({
        name: '',
        email: '',
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
    if (user) {
      // En edición, solo actualizar nombre, email, rol y estado activo
      const userData = {
        name: data.name,
        email: data.email,
        role: data.role,
        isActive: data.isActive,
      };
      updateMutation.mutate({ id: user.id, data: userData });
    } else {
      // En creación, el backend crea el usuario inactivo sin contraseña
      const userData = {
        name: data.name,
        email: data.email,
        role: data.role,
      };
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
      description={
        user
          ? "Modifica la información del usuario."
          : "Completa el formulario para crear un nuevo usuario. Al guardar, se enviará un correo al usuario para que configure su contraseña."
      }
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
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-3">
                Al crear el usuario, este quedará inactivo y se enviará automáticamente un correo de invitación
                para que la persona defina su contraseña y active su cuenta. <br></br> (El administrador no define ni conoce
                la contraseña del usuario).
              </p>
            )}

            {user && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={watch('isActive')}
                  onCheckedChange={(checked) => setValue('isActive', checked)}
                />
                <Label htmlFor="isActive">Usuario activo</Label>
              </div>
            )}
          </div>
        </div>
      </motion.form>
    </AdminModal>
  );
};

export default UserFormModal;