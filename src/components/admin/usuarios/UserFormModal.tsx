import React, { useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
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
import { logger } from '@/utils/logger';

const formSchema = z.object({
  name: nameValidation,
  email: emailValidation,
  role: z.string().min(1, 'El rol es requerido'),
  isActive: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return true;
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val !== 0;
      return Boolean(val);
    },
    z.boolean().optional()
  ),
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

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch, control } = form;

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
        role: user.role || '', // Priorizar role (el backend ahora siempre envía role)
        isActive: Boolean(user.isActive), // Asegurar que sea booleano
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
    logger.debug('onSubmit called with data:', data);
    if (user) {
      // En edición, solo actualizar nombre, email, rol y estado activo
      const userData = {
        name: data.name,
        email: data.email,
        role: data.role,
        isActive: Boolean(data.isActive), // Asegurar que sea booleano
      };
      logger.debug('Updating user with data:', userData);
      updateMutation.mutate({ id: user.id, data: userData });
    } else {
      // En creación, el backend crea el usuario inactivo sin contraseña
      const userData = {
        name: data.name,
        email: data.email,
        role: data.role,
      };
      logger.debug('Creating user with data:', userData);
      createMutation.mutate(userData);
    }
  };

  const handleFormSubmit = handleSubmit(
    onSubmit,
    (errors) => {
      logger.debug('Validation errors:', errors);
      // Mostrar errores de validación
      const firstError = Object.values(errors)[0];
      if (firstError) {
        const errorMessage = firstError?.message || "Por favor completa todos los campos requeridos.";
        toast({
          title: "Error de validación",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  );

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
    >
      <form
        id="user-form"
        onSubmit={handleFormSubmit}
        className="space-y-6"
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
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
                )}
              />
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
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="isActive"
                      checked={Boolean(field.value)}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                  )}
                />
                <Label htmlFor="isActive">Usuario activo</Label>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4 border-t">
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
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? "Procesando..." : user ? "Actualizar Usuario" : "Crear Usuario"}
          </Button>
        </div>
      </form>
    </AdminModal>
  );
};

export default UserFormModal;