import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Key, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Componente para mostrar la información de permisos del usuario actual
 * Útil para debugging y para que el usuario vea sus permisos
 */
const UserPermissionsInfo: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary-prosalud" />
            <CardTitle className="text-lg">Información de Permisos</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>
          Usuario: <span className="font-medium text-primary-prosalud">{user.name}</span> ({user.email})
        </CardDescription>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="space-y-4">
              {/* Roles */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="h-4 w-4 text-secondary-prosaludgreen" />
                  <h4 className="font-semibold text-sm">Roles ({user.roles?.length || 0})</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map((role) => (
                      <Badge
                        key={role}
                        variant="secondary"
                        className="bg-secondary-prosaludgreen/10 text-secondary-prosaludgreen border-secondary-prosaludgreen/20"
                      >
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin roles asignados</span>
                  )}
                </div>
              </div>

              {/* Permisos */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Key className="h-4 w-4 text-primary-prosalud" />
                  <h4 className="font-semibold text-sm">Permisos ({user.permissions?.length || 0})</h4>
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {user.permissions && user.permissions.length > 0 ? (
                    user.permissions.map((permission) => (
                      <Badge
                        key={permission}
                        variant="outline"
                        className="bg-primary-prosalud/5 text-primary-prosalud border-primary-prosalud/20 text-xs"
                      >
                        {permission}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin permisos asignados</span>
                  )}
                </div>
              </div>

              {/* Estado */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Estado de cuenta:</span>
                  <Badge
                    variant={user.is_active ? 'default' : 'destructive'}
                    className={user.is_active ? 'bg-green-500' : ''}
                  >
                    {user.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default UserPermissionsInfo;


