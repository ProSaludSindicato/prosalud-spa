
import { Request, RequestStats } from '@/types/requests';

export const mockRequests: Request[] = [
  {
    id: 'req-001',
    request_type: 'certificado-convenio',
    id_type: 'CC',
    id_number: '1234567890',
    name: 'María',
    last_name: 'González Rodríguez',
    email: 'maria.gonzalez@hospital.com',
    phone_number: '+57 300 123 4567',
    payload: {
      motivo_solicitud: 'Trámites bancarios',
      entidad_destino: 'Banco de Bogotá',
      archivo_adicional: 'cedula_copia.pdf'
    },
    status: 'resolved',
    created_at: '2024-12-10T08:30:00Z',
    processed_at: '2024-12-10T10:15:00Z',
    resolved_at: '2024-12-10T14:20:00Z'
  },
  {
    id: 'req-002',
    request_type: 'compensacion-anual',
    id_type: 'CC',
    id_number: '9876543210',
    name: 'Carlos',
    last_name: 'Martínez Silva',
    email: 'carlos.martinez@clinica.com',
    phone_number: '+57 315 987 6543',
    payload: {
      periodo_solicitud: '2024',
      valor_aproximado: 2500000,
      documentos_adjuntos: ['certificado_laboral.pdf', 'liquidacion_nomina.pdf']
    },
    status: 'in_progress',
    created_at: '2024-12-15T09:45:00Z',
    processed_at: '2024-12-15T11:30:00Z'
  },
  {
    id: 'req-003',
    request_type: 'verificacion-pagos',
    id_type: 'CE',
    id_number: '1122334455',
    name: 'Ana',
    last_name: 'López Herrera',
    email: 'ana.lopez@enfermeria.com',
    phone_number: '+57 320 555 7890',
    payload: {
      tipo_consulta: 'Diferencia en pago de nómina',
      periodo_consulta: 'Noviembre 2024',
      descripcion: 'No se reflejó el pago de horas extras trabajadas',
      archivos_soporte: ['comprobante_horas.pdf']
    },
    status: 'pending',
    created_at: '2024-12-16T16:20:00Z'
  },
  {
    id: 'req-004',
    request_type: 'descanso-laboral',
    id_type: 'CC',
    id_number: '5566778899',
    name: 'Roberto',
    last_name: 'Jiménez Castro',
    email: 'roberto.jimenez@urgencias.com',
    phone_number: '+57 310 444 5566',
    payload: {
      fecha_inicio: '2024-12-20',
      fecha_fin: '2024-12-27',
      motivo: 'Descanso compensatorio',
      supervisor_aprobacion: 'Dr. Sandra Pérez'
    },
    status: 'pending',
    created_at: '2024-12-17T11:15:00Z'
  },
  {
    id: 'req-005',
    request_type: 'actualizar-datos-personales',
    id_type: 'CC',
    id_number: '7788990011',
    name: 'Elena',
    last_name: 'Ramírez Vega',
    email: 'elena.ramirez@laboratorio.com',
    phone_number: '+57 301 222 3344',
    payload: {
      banco_anterior: 'Bancolombia',
      banco_nuevo: 'Banco Popular',
      numero_cuenta_nueva: '220-345678-91',
      tipo_cuenta: 'Ahorros',
      certificacion_bancaria: 'cert_bancaria_nueva.pdf'
    },
    status: 'resolved',
    created_at: '2024-12-12T14:30:00Z',
    processed_at: '2024-12-13T09:00:00Z',
    resolved_at: '2024-12-13T16:45:00Z'
  },
  {
    id: 'req-006',
    request_type: 'retiro-sindical',
    id_type: 'TI',
    id_number: '1023456789',
    name: 'Alejandro',
    last_name: 'Torres Mendoza',
    email: 'alejandro.torres@radiologia.com',
    phone_number: '+57 318 777 8899',
    payload: {
      motivo_retiro: 'Cambio de trabajo',
      fecha_ultimo_dia: '2024-12-31',
      entrega_elementos: true,
      formato_diligenciado: 'formato_retiro_2024.pdf'
    },
    status: 'in_progress',
    created_at: '2024-12-14T13:45:00Z',
    processed_at: '2024-12-15T08:30:00Z'
  },
  {
    id: 'req-007',
    request_type: 'microcredito',
    id_type: 'CC',
    id_number: '3344556677',
    name: 'Patricia',
    last_name: 'Sánchez Morales',
    email: 'patricia.sanchez@farmacia.com',
    phone_number: '+57 317 333 4455',
    payload: {
      monto_solicitado: 5000000,
      plazo_meses: 24,
      destino_credito: 'Mejoras locativas vivienda',
      ingresos_mensuales: 2800000,
      documentos_financieros: ['certificado_ingresos.pdf', 'extractos_bancarios.pdf']
    },
    status: 'pending',
    created_at: '2024-12-16T10:00:00Z'
  },
  {
    id: 'req-008',
    request_type: 'incapacidad-licencia',
    id_type: 'CC',
    id_number: '8899001122',
    name: 'Juliana',
    last_name: 'Vargas Ruiz',
    email: 'juliana.vargas@ginecologia.com',
    phone_number: '+57 314 666 7788',
    payload: {
      tipo_licencia: 'Maternidad',
      fecha_inicio: '2024-12-01',
      semanas_licencia: 18,
      eps: 'Compensar',
      incapacidad_medica: 'incapacidad_maternidad.pdf',
      registro_nacimiento: 'registro_civil.pdf'
    },
    status: 'resolved',
    created_at: '2024-11-25T09:20:00Z',
    processed_at: '2024-11-26T14:10:00Z',
    resolved_at: '2024-11-28T11:30:00Z'
  }
];

export const mockRequestStats: RequestStats = {
  total: 156,
  pending: 23,
  in_progress: 18,
  resolved: 108,
  rejected: 7,
  this_month: 42,
  avg_resolution_time: 2.8
};

export const requestTypeLabels: Record<string, string> = {
  'certificado-convenio': 'Certificado de Convenio',
  'compensacion-anual': 'Compensación Anual Diferida',
  'compensacion-descanso': 'Compensación por Descanso',
  'verificacion-pagos': 'Verificación de Pagos',
  'retiro-sindical': 'Retiro Sindical',
  'actualizar-datos-personales': 'Actualizar Datos Personales',
  'microcredito': 'Microcrédito CEII',
  'incapacidad-licencia': 'Incapacidades y Licencias',
  'permisos-turnos': 'Permisos y Cambio de Turnos',
  'solicitud-bienestar': 'Solicitud de Bienestar'
};

export const statusLabels: Record<string, string> = {
  'pending': 'Pendiente',
  'in_progress': 'En Proceso',
  'resolved': 'Resuelto',
  'rejected': 'Rechazado'
};

export const statusColors: Record<string, string> = {
  'pending': 'bg-yellow-100 text-yellow-800',
  'in_progress': 'bg-blue-100 text-blue-800',
  'resolved': 'bg-green-100 text-green-800',
  'rejected': 'bg-red-100 text-red-800'
};
