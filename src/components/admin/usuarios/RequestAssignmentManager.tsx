import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Save, 
  Info,
  Award as Certificate,
  CalendarCheck,
  DollarSign,
  Search as SearchIcon,
  Banknote,
  Hospital,
  CreditCard,
  LogOut,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { usersApi } from '@/services/adminApi';
import { requestAssignmentsService, type RequestAssignmentsResponse } from '@/services/requestAssignmentsApi';
import { User } from '@/types/admin';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import SaveAssignmentsModal from './SaveAssignmentsModal';
import { getErrorMessage } from '@/utils/errorSanitizer';

// Mapeo de iconos para cada tipo de solicitud
const REQUEST_TYPE_ICONS: Record<string, React.ElementType> = {
  'certificado-convenio': Certificate,
  'compensacion-descanso': CalendarCheck,
  'compensacion-anual': DollarSign,
  'verificacion-pagos': SearchIcon,
  'actualizar-datos-personales': Banknote,
  'incapacidades-licencias': Hospital,
  'solicitud-microcredito': CreditCard,
  'solicitud-retiro-sindical': LogOut,
};

// Definición de tipos de solicitudes y sus etiquetas
const REQUEST_TYPES = [
  { value: 'certificado-convenio', label: 'Certificado de Convenio' },
  { value: 'compensacion-descanso', label: 'Compensación por Descanso' },
  { value: 'compensacion-anual', label: 'Compensación Anual Diferida' },
  { value: 'verificacion-pagos', label: 'Verificación de Pagos' },
  { value: 'actualizar-datos-personales', label: 'Actualizar Datos Personales' },
  { value: 'incapacidades-licencias', label: 'Incapacidades y Licencias' },
  { value: 'solicitud-microcredito', label: 'Solicitud de Microcrédito' },
  { value: 'solicitud-retiro-sindical', label: 'Solicitud de Retiro Sindical' },
];

// Subtipos para verificación de pagos (motivos)
// Estos valores deben coincidir con los valores del campo "solicitudRelacionadaCon" en el formulario
const VERIFICACION_PAGOS_SUBTIPOS = [
  { value: 'COMPENSACIÓN. FINAL (LIQUIDACIÓN)', label: 'Compensación Final' },
  { value: 'COMPENSACIÓN ANUAL DIFERIDA Y/O DESCANSO', label: 'Compensación Anual Diferida' },
  { value: 'COMPENSACIÓN POR DESCANSO', label: 'Compensación por Descanso' },
  { value: 'DESCUENTOS SEGURIDAD SOCIAL', label: 'Descuentos Seguridad Social' },
  { value: 'DUPLICADO COLILLAS', label: 'Duplicado Colillas' },
  { value: 'VIATICOS', label: 'Viáticos' },
  { value: 'Ceiisas', label: 'Ceiisas' },
  { value: 'COMPENSACIÓN. MENSUAL', label: 'Compensación Mensual' },
  { value: 'COMPENSACIÓN SEMESTRAL', label: 'Compensación Semestral' },
  { value: 'INCAPACIDADES', label: 'Incapacidades' },
  { value: 'SUBSIDIOS', label: 'Subsidios' },
];

// Tipos que tienen subtipos
const REQUEST_TYPES_WITH_SUBTYPES: Record<string, { value: string; label: string }[]> = {
  'verificacion-pagos': VERIFICACION_PAGOS_SUBTIPOS,
};

interface AssignmentChange {
  type: 'added' | 'removed';
  requestType: string;
  requestTypeLabel: string;
  subtype?: string;
  subtypeLabel?: string;
  userId: string;
  userName: string;
}

const RequestAssignmentManager: React.FC = () => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [subtypeAssignments, setSubtypeAssignments] = useState<Record<string, Record<string, string[]>>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Guardar estado inicial para comparar cambios
  const initialAssignmentsRef = useRef<Record<string, string[]>>({});
  const initialSubtypeAssignmentsRef = useRef<Record<string, Record<string, string[]>>>({});

  // Obtener todos los usuarios (activos e inactivos) para detectar usuarios inactivos asignados
  const { data: usersResponse, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(1, 1000, '', ''),
    staleTime: 5 * 60 * 1000,
  });

  // Obtener asignaciones desde el API
  const { 
    data: assignmentsResponse, 
    isLoading: isLoadingAssignments, 
    error: assignmentsError,
    refetch: refetchAssignments 
  } = useQuery<RequestAssignmentsResponse>({
    queryKey: ['request-assignments'],
    queryFn: () => requestAssignmentsService.getAssignments(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  useEffect(() => {
    if (assignmentsError) {
      const errorMessage = getErrorMessage(assignmentsError);
      toast({
        title: "Error al cargar asignaciones",
        description: errorMessage || "No se pudieron cargar las asignaciones. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  }, [assignmentsError, toast]);

  const allUsers = useMemo(() => {
    return usersResponse?.data || [];
  }, [usersResponse]);

  const activeUsers = useMemo(() => {
    return allUsers.filter((user: User) => user.isActive);
  }, [allUsers]);

  // Crear un mapa de usuarios por ID para búsqueda rápida
  const usersMap = useMemo(() => {
    const map = new Map<string, User>();
    allUsers.forEach((user: User) => {
      map.set(user.id.toString(), user);
    });
    return map;
  }, [allUsers]);

  const userOptions: MultiSelectOption[] = useMemo(() => {
    return activeUsers.map((user: User) => ({
      value: user.id.toString(),
      label: user.name,
      email: user.email,
    }));
  }, [activeUsers]);

  // Inicializar estado cuando se cargan las asignaciones desde el API
  useEffect(() => {
    if (assignmentsResponse) {
      const loadedAssignments = assignmentsResponse.assignments || {};
      const loadedSubtypeAssignments = assignmentsResponse.subtype_assignments || {};
      
      // Cargar asignaciones en el estado
      setAssignments(loadedAssignments);
      setSubtypeAssignments(loadedSubtypeAssignments);
      
      // Guardar como estado inicial para comparar cambios
      initialAssignmentsRef.current = { ...loadedAssignments };
      initialSubtypeAssignmentsRef.current = { ...loadedSubtypeAssignments };
    }
  }, [assignmentsResponse]);

  // Filtrar tipos de solicitudes por búsqueda
  const filteredRequestTypes = useMemo(() => {
    if (!searchTerm) return REQUEST_TYPES;
    const search = searchTerm.toLowerCase();
    return REQUEST_TYPES.filter(
      (type) =>
        type.label.toLowerCase().includes(search) ||
        type.value.toLowerCase().includes(search)
    );
  }, [searchTerm]);

  // Obtener asignaciones específicas de un subtipo (sin fallback a asignación general)
  // Esta función se usa para mostrar en el UI las asignaciones reales de cada subtipo
  const getSpecificSubtypeAssignments = (requestType: string, subtype: string): string[] => {
    return subtypeAssignments[requestType]?.[subtype] || [];
  };

  // Obtener asignaciones efectivas para un tipo/subtipo (con fallback para validación)
  // Esta función se usa para validar si un subtipo tiene asignación (específica o general)
  const getEffectiveAssignments = (requestType: string, subtype?: string): string[] => {
    if (subtype) {
      // Si hay asignación específica para el subtipo, retornarla
      const specificSubtypeAssignment = subtypeAssignments[requestType]?.[subtype];
      if (specificSubtypeAssignment && specificSubtypeAssignment.length > 0) {
        return specificSubtypeAssignment;
      }
      // Si no hay asignación específica, retornar la asignación general como fallback
      return assignments[requestType] || [];
    }
    return assignments[requestType] || [];
  };

  // Alias para compatibilidad con código existente que usa getCurrentAssignments
  const getCurrentAssignments = getEffectiveAssignments;

  // Obtener asignaciones iniciales para un tipo/subtipo
  const getInitialAssignments = (requestType: string, subtype?: string): string[] => {
    if (subtype) {
      return initialSubtypeAssignmentsRef.current[requestType]?.[subtype] || [];
    }
    return initialAssignmentsRef.current[requestType] || [];
  };

  // Calcular cambios realizados
  const changes = useMemo(() => {
    const changesList: AssignmentChange[] = [];

    // Comparar asignaciones generales
    REQUEST_TYPES.forEach((requestType) => {
      const hasSubtypes = REQUEST_TYPES_WITH_SUBTYPES[requestType.value];
      
      // Solo comparar asignación general si no tiene subtipos
      if (!hasSubtypes) {
        const current = assignments[requestType.value] || [];
        const initial = initialAssignmentsRef.current[requestType.value] || [];

        // Usuarios agregados
        current.forEach((userId) => {
          if (!initial.includes(userId)) {
            const user = usersMap.get(userId);
            if (user) {
              changesList.push({
                type: 'added',
                requestType: requestType.value,
                requestTypeLabel: requestType.label,
                userId,
                userName: user.name,
              });
            }
          }
        });

        // Usuarios removidos
        initial.forEach((userId) => {
          if (!current.includes(userId)) {
            const user = usersMap.get(userId);
            if (user) {
              changesList.push({
                type: 'removed',
                requestType: requestType.value,
                requestTypeLabel: requestType.label,
                userId,
                userName: user.name,
              });
            }
          }
        });
      } else {
        // Si tiene subtipos, también comparar asignación general (puede tener ambas)
        const currentGeneral = assignments[requestType.value] || [];
        const initialGeneral = initialAssignmentsRef.current[requestType.value] || [];
        
        // Usuarios agregados en asignación general
        currentGeneral.forEach((userId) => {
          if (!initialGeneral.includes(userId)) {
            const user = usersMap.get(userId);
            if (user) {
              changesList.push({
                type: 'added',
                requestType: requestType.value,
                requestTypeLabel: requestType.label,
                userId,
                userName: user.name,
              });
            }
          }
        });

        // Usuarios removidos de asignación general
        initialGeneral.forEach((userId) => {
          if (!currentGeneral.includes(userId)) {
            const user = usersMap.get(userId);
            if (user) {
              changesList.push({
                type: 'removed',
                requestType: requestType.value,
                requestTypeLabel: requestType.label,
                userId,
                userName: user.name,
              });
            }
          }
        });
        
        hasSubtypes.forEach((subtype) => {
          const currentSubtype = subtypeAssignments[requestType.value]?.[subtype.value] || [];
          const initialSubtype = initialSubtypeAssignmentsRef.current[requestType.value]?.[subtype.value] || [];

          // Usuarios agregados
          currentSubtype.forEach((userId) => {
            if (!initialSubtype.includes(userId)) {
              const user = usersMap.get(userId);
              if (user) {
                changesList.push({
                  type: 'added',
                  requestType: requestType.value,
                  requestTypeLabel: requestType.label,
                  subtype: subtype.value,
                  subtypeLabel: subtype.label,
                  userId,
                  userName: user.name,
                });
              }
            }
          });

          // Usuarios removidos
          initialSubtype.forEach((userId) => {
            if (!currentSubtype.includes(userId)) {
              const user = usersMap.get(userId);
              if (user) {
                changesList.push({
                  type: 'removed',
                  requestType: requestType.value,
                  requestTypeLabel: requestType.label,
                  subtype: subtype.value,
                  subtypeLabel: subtype.label,
                  userId,
                  userName: user.name,
                });
              }
            }
          });
        });
      }
    });

    return changesList;
  }, [assignments, subtypeAssignments, usersMap]);

  // Verificar si hay cambios sin guardar
  const hasUnsavedChanges = changes.length > 0;

  // Validar que todos los tipos/subtipos tengan al menos un usuario asignado
  const validateAssignments = useMemo(() => {
    const unassignedTypes: string[] = [];
    const unassignedSubtypes: { type: string; subtype: string; typeLabel: string; subtypeLabel: string }[] = [];

    REQUEST_TYPES.forEach((requestType) => {
      const hasSubtypes = REQUEST_TYPES_WITH_SUBTYPES[requestType.value];
      const generalAssignments = assignments[requestType.value] || [];
      
      if (hasSubtypes) {
        // Si tiene subtipos, verificar que cada subtipo tenga asignación (específica o general)
        hasSubtypes.forEach((subtype) => {
          const specificSubtypeAssignments = subtypeAssignments[requestType.value]?.[subtype.value] || [];
          // Un subtipo tiene asignación si tiene asignación específica O asignación general
          const hasSubtypeAssignment = specificSubtypeAssignments.length > 0 || generalAssignments.length > 0;
          if (!hasSubtypeAssignment) {
            unassignedSubtypes.push({
              type: requestType.value,
              subtype: subtype.value,
              typeLabel: requestType.label,
              subtypeLabel: subtype.label,
            });
          }
        });
        
        // No es obligatorio tener asignación general si todos los subtipos tienen asignación específica
      } else {
        // Si no tiene subtipos, debe tener asignación general
        if (generalAssignments.length === 0) {
          unassignedTypes.push(requestType.label);
        }
      }
    });

    return {
      isValid: unassignedTypes.length === 0 && unassignedSubtypes.length === 0,
      unassignedTypes,
      unassignedSubtypes,
      totalUnassigned: unassignedTypes.length + unassignedSubtypes.length,
    };
  }, [assignments, subtypeAssignments]);

  // Verificar si hay usuarios inactivos en las asignaciones
  const hasInactiveUsers = (userIds: string[]): boolean => {
    return userIds.some((id) => {
      const user = usersMap.get(id);
      return user && !user.isActive;
    });
  };

  // Obtener usuarios inactivos de las asignaciones
  const getInactiveUserNames = (userIds: string[]): string[] => {
    return userIds
      .map((id) => {
        const user = usersMap.get(id);
        return user && !user.isActive ? user.name : null;
      })
      .filter((name): name is string => !!name);
  };

  // Actualizar asignaciones
  const handleAssignmentChange = (requestType: string, selectedUserIds: string[], subtype?: string) => {
    if (subtype) {
      setSubtypeAssignments((prev) => ({
        ...prev,
        [requestType]: {
          ...(prev[requestType] || {}),
          [subtype]: selectedUserIds,
        },
      }));
    } else {
      setAssignments((prev) => ({
        ...prev,
        [requestType]: selectedUserIds,
      }));
    }
  };

  // Manejar guardar
  const handleSave = () => {
    if (changes.length === 0) {
      toast({
        title: "Sin cambios",
        description: "No hay cambios para guardar.",
      });
      return;
    }

    // Validar que no haya tipos/subtipos sin asignación
    if (!validateAssignments.isValid) {
      toast({
        title: "Asignaciones incompletas",
        description: `No se pueden guardar los cambios. Hay ${validateAssignments.totalUnassigned} ${validateAssignments.totalUnassigned === 1 ? 'tipo o subtipo' : 'tipos o subtipos'} de solicitud sin usuarios asignados. Por favor, asigna al menos un usuario a cada tipo y subtipo antes de guardar.`,
        variant: "destructive",
      });
      return;
    }

    setShowSaveModal(true);
  };

  // Confirmar guardado
  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      const completeSubtypeAssignments: Record<string, Record<string, string[]>> = {};
      
      const allRequestTypesWithSubtypes = new Set([
        ...Object.keys(REQUEST_TYPES_WITH_SUBTYPES),
        ...Object.keys(initialSubtypeAssignmentsRef.current),
        ...Object.keys(subtypeAssignments),
      ]);
      
      allRequestTypesWithSubtypes.forEach((requestType) => {
        completeSubtypeAssignments[requestType] = {};
        
        const allSubtypes = new Set<string>();
        
        const definedSubtypes = REQUEST_TYPES_WITH_SUBTYPES[requestType];
        if (definedSubtypes) {
          definedSubtypes.forEach(subtype => allSubtypes.add(subtype.value));
        }
        
        if (initialSubtypeAssignmentsRef.current[requestType]) {
          Object.keys(initialSubtypeAssignmentsRef.current[requestType]).forEach(subtype => allSubtypes.add(subtype));
        }
        
        if (subtypeAssignments[requestType]) {
          Object.keys(subtypeAssignments[requestType]).forEach(subtype => allSubtypes.add(subtype));
        }
        
        allSubtypes.forEach((subtype) => {
          const currentModifiedValue = subtypeAssignments[requestType]?.[subtype];
          
          let finalValue: string[];
          
          if (currentModifiedValue !== undefined) {
            finalValue = currentModifiedValue;
          } else {
            const initialSubtypeValue = initialSubtypeAssignmentsRef.current[requestType]?.[subtype];

            if (initialSubtypeValue !== undefined && initialSubtypeValue.length > 0) {
              finalValue = initialSubtypeValue;
            } else {
              const currentGeneralValue = assignments[requestType];
              const initialGeneralValue = initialAssignmentsRef.current[requestType];
              
              finalValue = currentGeneralValue || initialGeneralValue || [];
            }
          }
          
          completeSubtypeAssignments[requestType][subtype] = finalValue;
        });
      });
      
      // Preparar payload para el API
      const payload = {
        assignments: { ...assignments },
        subtype_assignments: completeSubtypeAssignments,
      };

      // Guardar en el backend
      const savedData = await requestAssignmentsService.saveAssignments(payload);
      
      // Actualizar estado con la respuesta del servidor
      setAssignments(savedData.assignments || {});
      setSubtypeAssignments(savedData.subtype_assignments || {});
      
      // Actualizar estado inicial para comparar cambios futuros
      initialAssignmentsRef.current = { ...savedData.assignments };
      initialSubtypeAssignmentsRef.current = { ...savedData.subtype_assignments };
      
      // Invalidar y recargar las asignaciones
      await refetchAssignments();
      
      toast({
        title: "Asignaciones guardadas",
        description: "Las asignaciones se han guardado correctamente.",
      });
      setShowSaveModal(false);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast({
        title: "Error al guardar",
        description: errorMessage || "No se pudieron guardar las asignaciones. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Obtener usuarios asignados con información completa
  const getAssignedUsers = (userIds: string[]): User[] => {
    return userIds
      .map((id) => usersMap.get(id))
      .filter((user): user is User => !!user && user.isActive);
  };

  // Verificar si un tipo/subtipo tiene asignación (usa fallback para validación)
  const hasAssignment = (requestType: string, subtype?: string): boolean => {
    const currentAssignments = getEffectiveAssignments(requestType, subtype);
    return currentAssignments.length > 0;
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  if (isLoadingUsers || isLoadingAssignments) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-prosalud"></div>
      </div>
    );
  }

  // Mostrar error si falla la carga de asignaciones
  if (assignmentsError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error al cargar asignaciones</AlertTitle>
          <AlertDescription>
            {getErrorMessage(assignmentsError) || "No se pudieron cargar las asignaciones. Por favor, recarga la página."}
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => refetchAssignments()} 
          className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Título simple para tabs */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Asignación de Solicitudes</h2>
        <p className="text-sm text-gray-600">
          Configura qué usuarios gestionan cada tipo de solicitud
        </p>
      </div>

      {/* Información - Alert azul */}
      <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="font-semibold text-blue-700">Información</AlertTitle>
        <AlertDescription className="text-blue-800">
          Asigna uno o varios usuarios activos para gestionar cada tipo de solicitud. 
          Si un tipo tiene subtipos (como Verificación de Pagos), puedes asignar usuarios específicos a cada subtipo.
        </AlertDescription>
      </Alert>

      {/* Búsqueda y botón guardar */}
      <div className="flex gap-4 items-end">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar tipo de solicitud..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasUnsavedChanges || isSaving || !validateAssignments.isValid}
          className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white disabled:opacity-50"
        >
          <Save className="h-5 w-5 mr-2" />
          {hasUnsavedChanges ? 'Guardar Cambios' : 'Sin cambios'}
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800">
              {changes.length}
            </Badge>
          )}
          {!validateAssignments.isValid && (
            <Badge variant="destructive" className="ml-2">
              {validateAssignments.totalUnassigned} sin asignar
            </Badge>
          )}
        </Button>
      </div>

      {/* Lista de tipos de solicitudes con Accordion */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Accordion type="single" collapsible className="w-full">
            {filteredRequestTypes.map((requestType) => {
              const hasSubtypes = REQUEST_TYPES_WITH_SUBTYPES[requestType.value];
              const currentAssignments = getCurrentAssignments(requestType.value);
              const assignedUsers = getAssignedUsers(currentAssignments);
              const hasGeneralAssignment = hasAssignment(requestType.value);
              const hasInactiveInGeneral = hasInactiveUsers(currentAssignments);
              const IconComponent = REQUEST_TYPE_ICONS[requestType.value] || FileText;

              // Verificar si todos los subtipos tienen asignación
              const allSubtypesAssigned = hasSubtypes
                ? hasSubtypes.every((subtype) => hasAssignment(requestType.value, subtype.value))
                : true;

              // Verificar si algún subtipo tiene usuarios inactivos
              const hasInactiveInSubtypes = hasSubtypes
                ? hasSubtypes.some((subtype) => {
                    const subtypeAssignments = getSpecificSubtypeAssignments(requestType.value, subtype.value);
                    return hasInactiveUsers(subtypeAssignments);
                  })
                  : false;

              const needsAttention = !hasGeneralAssignment && !allSubtypesAssigned || hasInactiveInGeneral || hasInactiveInSubtypes;

              return (
                <AccordionItem 
                  key={requestType.value} 
                  value={requestType.value} 
                  className={cn(
                    "border-b",
                    hasSubtypes && "border-l-4 border-l-primary-prosalud"
                  )}
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={cn(
                          "p-2 rounded-lg relative",
                          needsAttention 
                            ? "bg-amber-100 text-amber-700" 
                            : "bg-primary-prosalud/10 text-primary-prosalud"
                        )}>
                          <IconComponent className="h-5 w-5" />
                          {hasSubtypes && (
                            <div className="absolute -top-1 -right-1 bg-primary-prosalud text-white rounded-full p-0.5">
                              <Layers className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-lg">{requestType.label}</span>
                            {hasSubtypes && (
                              <Badge variant="secondary" className="text-xs bg-primary-prosalud/10 text-primary-prosalud border-primary-prosalud/30">
                                <Layers className="h-3 w-3 mr-1" />
                                {hasSubtypes.length} {hasSubtypes.length === 1 ? 'subtipo' : 'subtipos'}
                              </Badge>
                            )}
                            {needsAttention && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Requiere atención
                              </Badge>
                            )}
                          </div>
                          {assignedUsers.length > 0 && (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-gray-500">Asignados:</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {assignedUsers.slice(0, 3).map((user) => (
                                  <span key={user.id} className="text-xs text-gray-700 font-medium">
                                    {user.name}
                                  </span>
                                ))}
                                {assignedUsers.length > 3 && (
                                  <span className="text-xs text-gray-500">+{assignedUsers.length - 3} más</span>
                                )}
                              </div>
                            </div>
                          )}
                          {!hasGeneralAssignment && !hasSubtypes && (
                            <span className="text-sm text-amber-600 mt-1">Sin asignación</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="space-y-4 pt-2">
                      {hasSubtypes ? (
                        <>
                          {/* Asignación general para el tipo */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">
                                Asignación general (aplica si no hay asignación específica por motivo)
                              </Label>
                              {!hasGeneralAssignment && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  Sin asignación
                                </Badge>
                              )}
                            </div>
                            <MultiSelect
                              options={userOptions}
                              selected={currentAssignments}
                              onSelectionChange={(selected) =>
                                handleAssignmentChange(requestType.value, selected)
                              }
                              placeholder="Seleccionar usuarios..."
                              emptyText="No hay usuarios activos disponibles"
                            />
                            {assignedUsers.length > 0 && (
                              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
                                {assignedUsers.map((user) => (
                                  <div
                                    key={user.id}
                                    className="px-3 py-1.5 bg-white rounded-md border border-gray-200 shadow-sm"
                                  >
                                    <span className="text-sm font-medium text-gray-700">{user.name}</span>
                                    {user.email && (
                                      <span className="text-xs text-gray-500 ml-2">({user.email})</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {hasInactiveInGeneral && (
                              <Alert variant="destructive" className="mt-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Usuarios inactivos detectados</AlertTitle>
                                <AlertDescription>
                                  Los siguientes usuarios están inactivos: {getInactiveUserNames(currentAssignments).join(', ')}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>

                          <Separator />

                          {/* Subtipos */}
                          <div className="space-y-4">
                            <Label className="text-base font-semibold">Asignación por motivo:</Label>
                            {hasSubtypes.map((subtype) => {
                              // Usar getSpecificSubtypeAssignments para mostrar solo las asignaciones específicas del subtipo
                              const subtypeAssignments = getSpecificSubtypeAssignments(
                                requestType.value,
                                subtype.value
                              );
                              const subtypeUsers = getAssignedUsers(subtypeAssignments);
                              // Para validación, usar getEffectiveAssignments que incluye fallback
                              const hasSubtypeAssignment = hasAssignment(requestType.value, subtype.value);
                              const hasInactiveInSubtype = hasInactiveUsers(subtypeAssignments);

                              return (
                                <div 
                                  key={subtype.value} 
                                  className={cn(
                                    "space-y-3 p-4 rounded-lg border-2",
                                    !hasSubtypeAssignment 
                                      ? "border-amber-300 bg-amber-50" 
                                      : "border-primary-prosalud/20 bg-white"
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Label className="text-sm font-medium">{subtype.label}</Label>
                                      {!hasSubtypeAssignment && (
                                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                                          Sin asignación
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <MultiSelect
                                    options={userOptions}
                                    selected={subtypeAssignments}
                                    onSelectionChange={(selected) =>
                                      handleAssignmentChange(
                                        requestType.value,
                                        selected,
                                        subtype.value
                                      )
                                    }
                                    placeholder="Seleccionar usuarios para este motivo..."
                                    emptyText="No hay usuarios activos disponibles"
                                    maxDisplay={1}
                                  />
                                  {subtypeUsers.length > 0 && (
                                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
                                      {subtypeUsers.map((user) => (
                                        <div
                                          key={user.id}
                                          className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md border border-gray-200 shadow-sm"
                                        >
                                          <span className="text-sm font-medium text-gray-700">{user.name}</span>
                                          {user.email && (
                                            <span className="text-xs text-gray-500 ml-2">({user.email})</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {hasInactiveInSubtype && (
                                    <Alert variant="destructive" className="mt-2">
                                      <AlertTriangle className="h-4 w-4" />
                                      <AlertTitle>Usuarios inactivos detectados</AlertTitle>
                                      <AlertDescription>
                                        Los siguientes usuarios están inactivos: {getInactiveUserNames(subtypeAssignments).join(', ')}
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        /* Sin subtipos - asignación directa */
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Usuarios asignados</Label>
                            {!hasGeneralAssignment && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                Sin asignación
                              </Badge>
                            )}
                          </div>
                          <MultiSelect
                            options={userOptions}
                            selected={currentAssignments}
                            onSelectionChange={(selected) =>
                              handleAssignmentChange(requestType.value, selected)
                            }
                            placeholder="Seleccionar usuarios..."
                            emptyText="No hay usuarios activos disponibles"
                          />
                          {assignedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
                              {assignedUsers.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md border border-gray-200 shadow-sm"
                                >
                                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                                  {user.email && (
                                    <span className="text-xs text-gray-500 ml-2">({user.email})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {hasInactiveInGeneral && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>Usuarios inactivos detectados</AlertTitle>
                              <AlertDescription>
                                Los siguientes usuarios están inactivos: {getInactiveUserNames(currentAssignments).join(', ')}
                              </AlertDescription>
                            </Alert>
                          )}
                          {!hasGeneralAssignment && (
                            <p className="text-sm text-amber-600 mt-2">
                              Sin asignación. Selecciona usuarios para gestionar este tipo de solicitud.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
          {filteredRequestTypes.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">
              No se encontraron tipos de solicitudes que coincidan con la búsqueda.
            </div>
          )}
          {filteredRequestTypes.length > 0 && (
            <div className="px-6 pb-4 pt-2 border-t">
              <p className="text-xs text-gray-500 text-center">
                Recuerda guardar los cambios realizados para que estos se apliquen. Adicional, debe de haber por lo menos un usuario asignado en cada tipo/subtipo de solicitud.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmación */}
      <SaveAssignmentsModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        changes={changes}
        onConfirm={handleConfirmSave}
        isLoading={isSaving}
      />
    </div>
  );
};

export default RequestAssignmentManager;
