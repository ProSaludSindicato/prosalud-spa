
import React, { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';

interface UpdateProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
}

const UpdateProfileDialog: React.FC<UpdateProfileDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const { toast } = useToast();
  // Security: Use centralized sanitization hook
  const { sanitizeText, sanitizeEmail } = useSanitizedInput();

  useEffect(() => {
    if (open) {
      loadUserProfile();
    }
  }, [open]);

  const loadUserProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        logger.debug('Perfil de usuario cargado correctamente');

        setProfile({
          firstName: user.user_metadata?.firstName || user.user_metadata?.first_name || '',
          lastName: user.user_metadata?.lastName || user.user_metadata?.last_name || '',
          email: user.email || ''
        });
      }
    } catch (error) {
      logger.error('Error cargando perfil de usuario', error instanceof Error ? error.message : error);
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil del usuario",
        variant: "destructive"
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      toast({
        title: "Error",
        description: "El nombre y apellido son obligatorios",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      logger.debug('Actualizando perfil de usuario');
      
      const { error } = await supabase.auth.updateUser({
        email: profile.email,
        data: {
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
          first_name: profile.firstName.trim(),
          last_name: profile.lastName.trim()
        }
      });

      if (error) {
        logger.error('Error actualizando perfil', error instanceof Error ? error.message : error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        logger.debug('Perfil actualizado correctamente');
        toast({
          title: "¡Éxito!",
          description: "Perfil actualizado correctamente",
          variant: "default",
          className: "border-green-200 bg-green-50 text-green-800"
        });
        onOpenChange(false);
      }
    } catch (error) {
      logger.error('Error inesperado al actualizar perfil', error instanceof Error ? error.message : error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <UserIcon className="h-5 w-5 text-primary-prosalud" />
            Actualizar Perfil
          </DialogTitle>
        </DialogHeader>
        
        {isLoadingProfile ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-prosalud"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center gap-2 text-gray-700 font-medium">
                <Users className="h-4 w-4" />
                Nombre
              </Label>
              <Input
                id="firstName"
                type="text"
                value={profile.firstName}
                onChange={(e) => {
                  // Security: Sanitize first name input
                  const sanitized = sanitizeText(e.target.value, { maxLength: 50, allowSpaces: true });
                  handleInputChange('firstName', sanitized);
                }}
                required
                placeholder="Ingresa tu nombre"
                className="bg-white border-gray-300 text-gray-900 focus:border-primary-prosalud focus:ring-primary-prosalud"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="flex items-center gap-2 text-gray-700 font-medium">
                <Users className="h-4 w-4" />
                Apellido
              </Label>
              <Input
                id="lastName"
                type="text"
                value={profile.lastName}
                onChange={(e) => {
                  // Security: Sanitize last name input
                  const sanitized = sanitizeText(e.target.value, { maxLength: 50, allowSpaces: true });
                  handleInputChange('lastName', sanitized);
                }}
                required
                placeholder="Ingresa tu apellido"
                className="bg-white border-gray-300 text-gray-900 focus:border-primary-prosalud focus:ring-primary-prosalud"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-gray-700 font-medium">
                <Mail className="h-4 w-4" />
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => {
                  // Security: Sanitize email input
                  const sanitized = sanitizeEmail(e.target.value, { maxLength: 100 });
                  handleInputChange('email', sanitized);
                }}
                required
                placeholder="correo@ejemplo.com"
                className="bg-white border-gray-300 text-gray-900 focus:border-primary-prosalud focus:ring-primary-prosalud"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
              >
                {isLoading ? "Actualizando..." : "Actualizar Perfil"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpdateProfileDialog;
