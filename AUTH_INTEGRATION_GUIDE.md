# Guía de Integración de Autenticación - ProSalud SPA

Esta guía explica cómo funciona el sistema de autenticación integrado con Bearer tokens, roles y permisos.

## 📋 Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Configuración](#configuración)
- [Uso del Sistema](#uso-del-sistema)
- [Protección de Rutas](#protección-de-rutas)
- [Helpers de Permisos](#helpers-de-permisos)
- [Servicios Disponibles](#servicios-disponibles)
- [Ejemplos de Uso](#ejemplos-de-uso)

## 🏗️ Arquitectura

El sistema de autenticación está compuesto por:

1. **AuthService** (`src/services/authService.ts`): Maneja las peticiones HTTP de autenticación
2. **AuthContext** (`src/context/AuthContext.tsx`): Provee el estado global de autenticación
3. **ProtectedRoute** (`src/components/admin/ProtectedRoute.tsx`): Componente para proteger rutas
4. **API Interceptors** (`src/services/api.ts`): Agregan el token Bearer automáticamente

## ⚙️ Configuración

### Variables de Entorno

Asegúrate de tener configurada la URL del API en tu archivo `.env`:

```env
VITE_API_BASE_URL=https://prosalud.test
```

### Storage

El sistema almacena en `localStorage`:
- `prosalud_auth_token`: Token de autenticación Bearer
- `prosalud_auth_user`: Información del usuario (JSON)

## 🚀 Uso del Sistema

### Login

```tsx
import { useAuth } from '@/context/AuthContext';

function LoginComponent() {
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      await login('usuario@prosalud.com', 'password', 'Panel Admin');
      // Login exitoso, redirigir al dashboard
    } catch (error) {
      // Manejar error
    }
  };
}
```

### Logout

```tsx
import { useAuth } from '@/context/AuthContext';

function LogoutButton() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // Usuario deslogueado, redirigir al login
  };
}
```

### Obtener Usuario Actual

```tsx
import { useAuth } from '@/context/AuthContext';

function UserProfile() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!isAuthenticated) return <div>No autenticado</div>;

  return (
    <div>
      <h1>{user?.name}</h1>
      <p>{user?.email}</p>
      <p>Roles: {user?.roles.join(', ')}</p>
    </div>
  );
}
```

## 🔒 Protección de Rutas

### Protección Básica (Solo Autenticación)

```tsx
import ProtectedRoute from '@/components/admin/ProtectedRoute';

<Route 
  path="/admin" 
  element={
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  } 
/>
```

### Protección con Permisos Específicos

```tsx
// Requiere AL MENOS UNO de los permisos
<Route 
  path="/admin/usuarios" 
  element={
    <ProtectedRoute requiredPermissions={['users.manage']}>
      <AdminUsuariosPage />
    </ProtectedRoute>
  } 
/>

// Requiere TODOS los permisos
<Route 
  path="/admin/config" 
  element={
    <ProtectedRoute 
      requiredPermissions={['config.read', 'config.write']}
      requireAll={true}
    >
      <ConfigPage />
    </ProtectedRoute>
  } 
/>
```

### Protección con Roles

```tsx
<Route 
  path="/admin/super" 
  element={
    <ProtectedRoute requiredRoles={['Administrador', 'SuperAdmin']}>
      <SuperAdminPage />
    </ProtectedRoute>
  } 
/>
```

### Mensaje Personalizado de Acceso Denegado

```tsx
<Route 
  path="/admin/inventario" 
  element={
    <ProtectedRoute 
      requiredPermissions={['inventory.manage']}
      forbiddenMessage="Necesitas permisos de gestión de inventario para acceder aquí."
    >
      <InventarioPage />
    </ProtectedRoute>
  } 
/>
```

## 🛡️ Helpers de Permisos

El hook `useAuth()` provee varios helpers para verificar permisos en tiempo de ejecución:

### Verificar un Permiso

```tsx
const { can } = useAuth();

if (can('users.manage')) {
  // Usuario tiene permiso para gestionar usuarios
}
```

### Verificar Múltiples Permisos (OR)

```tsx
const { canAny } = useAuth();

if (canAny(['users.view', 'users.manage'])) {
  // Usuario tiene al menos uno de los permisos
}
```

### Verificar Múltiples Permisos (AND)

```tsx
const { canAll } = useAuth();

if (canAll(['users.view', 'users.manage'])) {
  // Usuario tiene TODOS los permisos
}
```

### Verificar Roles

```tsx
const { hasRole, hasAnyRole, hasAllRoles } = useAuth();

// Un rol específico
if (hasRole('Administrador')) {
  // Usuario es administrador
}

// Alguno de los roles
if (hasAnyRole(['Administrador', 'Moderador'])) {
  // Usuario es administrador O moderador
}

// Todos los roles
if (hasAllRoles(['Administrador', 'Auditor'])) {
  // Usuario tiene AMBOS roles
}
```

### Renderizado Condicional en Componentes

```tsx
import { useAuth } from '@/context/AuthContext';

function AdminPanel() {
  const { can } = useAuth();

  return (
    <div>
      {can('users.manage') && (
        <Button>Gestionar Usuarios</Button>
      )}
      
      {can('inventory.manage') && (
        <Button>Gestionar Inventario</Button>
      )}
      
      {can('roles.manage') && (
        <Button>Gestionar Roles</Button>
      )}
    </div>
  );
}
```

## 📦 Servicios Disponibles

### AuthService

```tsx
import { authService } from '@/services/authService';

// Login
const response = await authService.login({
  email: 'usuario@prosalud.com',
  password: 'password',
  device_name: 'Panel Admin'
});

// Obtener usuario actual
const user = await authService.me();

// Logout
await authService.logout();

// Verificar sesión activa
const hasSession = authService.hasActiveSession();

// Obtener token
const token = authService.getToken();
```

### RolesPermissionsService

```tsx
import { rolesPermissionsService } from '@/services/rolesPermissionsService';

// Obtener roles
const roles = await rolesPermissionsService.getRoles();

// Crear rol
const newRole = await rolesPermissionsService.createRole({
  name: 'Coordinador',
  description: 'Coordinador de inventario',
  permissions: [1, 2, 3] // IDs de permisos
});

// Actualizar rol
await rolesPermissionsService.updateRole(roleId, {
  name: 'Coordinador Senior',
  permissions: [1, 2, 3, 4]
});

// Obtener permisos
const permissions = await rolesPermissionsService.getPermissions();

// Actualizar permiso
await rolesPermissionsService.updatePermission(permissionId, {
  name: 'inventory.products.manage'
});
```

### API Autenticada

Para hacer peticiones autenticadas a otros endpoints:

```tsx
import { authenticatedApi } from '@/services/api';

// GET con token automático
const { data } = await authenticatedApi.get('/api/requests');

// POST con token automático
await authenticatedApi.post('/api/inventory/products', {
  name: 'Producto',
  quantity: 10
});

// PUT con token automático
await authenticatedApi.put('/api/users/1', {
  name: 'Nombre Actualizado'
});

// DELETE con token automático
await authenticatedApi.delete('/api/users/1');
```

## 💡 Ejemplos de Uso

### Ejemplo 1: Botón con Permiso

```tsx
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

function CreateUserButton() {
  const { can } = useAuth();

  if (!can('users.manage')) {
    return null; // No mostrar el botón
  }

  return (
    <Button onClick={handleCreate}>
      Crear Usuario
    </Button>
  );
}
```

### Ejemplo 2: Tabs con Permisos

```tsx
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

function AdminTabs() {
  const { can } = useAuth();

  return (
    <Tabs>
      <TabsList>
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        
        {can('users.view') && (
          <TabsTrigger value="users">Usuarios</TabsTrigger>
        )}
        
        {can('inventory.view') && (
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
        )}
        
        {can('roles.manage') && (
          <TabsTrigger value="roles">Roles</TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
}
```

### Ejemplo 3: Componente de Información del Usuario

```tsx
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function UserInfo() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <div>No autenticado</div>;
  }

  return (
    <Card className="p-4">
      <h3 className="font-bold">{user.name}</h3>
      <p className="text-sm text-muted-foreground">{user.email}</p>
      
      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-2">Roles:</h4>
        <div className="flex gap-2 flex-wrap">
          {user.roles.map(role => (
            <Badge key={role} variant="secondary">{role}</Badge>
          ))}
        </div>
      </div>
      
      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-2">Permisos:</h4>
        <div className="flex gap-2 flex-wrap">
          {user.permissions.map(permission => (
            <Badge key={permission} variant="outline">{permission}</Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
```

## 🔧 Permisos Disponibles (Backend)

Según la documentación del backend, estos son algunos de los permisos disponibles:

- `requests.view` - Ver solicitudes
- `requests.respond` - Responder solicitudes
- `users.manage` - Gestionar usuarios
- `roles.manage` - Gestionar roles
- `permissions.view` - Ver permisos
- `inventory.products.manage` - Gestionar productos de inventario
- `inventory.hospitals.manage` - Gestionar hospitales
- `wellness.events.manage` - Gestionar eventos de bienestar
- `wellness.requests.view` - Ver solicitudes de bienestar
- `comfenalco.events.manage` - Gestionar eventos de Comfenalco
- `votes.statistics.view` - Ver estadísticas de votaciones
- `votes.manage` - Gestionar votaciones
- `chatbot.manage` - Gestionar chatbot
- `sst.manage` - Gestionar SST/dotación

## 🐛 Debugging

Para ver información de permisos en tiempo real, puedes usar el componente `UserPermissionsInfo`:

```tsx
import UserPermissionsInfo from '@/components/admin/UserPermissionsInfo';

function AdminPage() {
  return (
    <div>
      <UserPermissionsInfo />
      {/* Resto del contenido */}
    </div>
  );
}
```

## ⚠️ Manejo de Errores

### Error 401 (No Autorizado)

El sistema automáticamente:
1. Limpia la sesión local
2. Redirige al login
3. Muestra un mensaje apropiado

### Error 403 (Cuenta Desactivada)

El backend responde con 403 cuando la cuenta está desactivada. El sistema lo maneja mostrando un mensaje apropiado.

### Sesión Expirada

Si el token expira, la próxima petición recibirá un 401 y el sistema redirigirá automáticamente al login.

## 📝 Notas Importantes

1. **Token Storage**: Los tokens se guardan en `localStorage`. Para mayor seguridad en producción, considera usar cookies HTTP-only.

2. **Token Refresh**: El backend actual no tiene endpoint de refresh. Si se implementa en el futuro, agregar la lógica en `authService.ts`.

3. **Permisos vs Roles**: 
   - Los **roles** agrupan permisos (ej: "Administrador")
   - Los **permisos** son acciones específicas (ej: "users.manage")
   - Un usuario puede tener múltiples roles y múltiples permisos

4. **Cache de Permisos**: Los permisos se cargan una vez al login. Si cambias los permisos de un usuario, debe volver a iniciar sesión o llamar a `refreshUser()`:

```tsx
const { refreshUser } = useAuth();
await refreshUser(); // Recargar permisos del usuario
```

## 🔄 Próximos Pasos

Para ambiente de producción con dominios diferentes:
1. Implementar Sanctum con cookies SameSite
2. Configurar CORS adecuadamente
3. Considerar implementar token refresh
4. Agregar 2FA si es necesario

---

**Versión**: 1.0.0  
**Última actualización**: Noviembre 2024


