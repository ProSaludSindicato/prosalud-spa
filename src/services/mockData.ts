import { Convenio } from '@/types/admin';
import { User } from '@/types/admin';
import { Product, SupplierDelivery, Return, InventoryRequest, Hospital, SolicitudRequest } from './types/mockTypes';

export const mockConvenios: Convenio[] = [
  {
    id: "1",
    name: "Hospital Marco Fidel Suárez - Bello",
    image: "/images/convenios/hospital-marco-fidel-suarez.webp",
    isVisible: true,
    createdAt: "2024-01-15"
  },
  {
    id: "2", 
    name: "Hospital San Juan de Dios - Rionegro",
    image: "/images/convenios/hospital-san-juan-de-dios-rionegro.webp",
    isVisible: true,
    createdAt: "2024-01-20"
  },
  {
    id: "3",
    name: "Hospital Santa Elena - Fredonia", 
    image: "/images/convenios/hospital-santa-elena-fredonia.webp",
    isVisible: true,
    createdAt: "2024-02-10"
  },
  {
    id: "4",
    name: "Hospital Venancio Díaz Díaz - La Ceja",
    image: "/images/convenios/hospital-venancio-diaz.webp", 
    isVisible: true,
    createdAt: "2024-02-15"
  },
  {
    id: "5",
    name: "Hospital La Merced - Ciudad Bolívar",
    image: "/images/convenios/hospital-la-merced-ciudad-bolivar.webp",
    isVisible: true,
    createdAt: "2024-03-01"
  },
  {
    id: "6",
    name: "Promotora Médica Odontológica",
    image: "/images/convenios/promotora-medica-odontologica.webp",
    isVisible: true,
    createdAt: "2024-03-10"
  },
  {
    id: "7",
    name: "SOMER S.A.",
    image: "/images/convenios/somer-sa.webp",
    isVisible: true,
    createdAt: "2024-03-15"
  },
  {
    id: "8",
    name: "Comfenalco Antioquia",
    image: "/images/logo_comfenalco.webp",
    isVisible: true,
    createdAt: "2024-04-01"
  },
  {
    id: "9",
    name: "Hospital General de Medellín",
    image: "/images/convenios/hospital-marco-fidel-suarez.webp",
    isVisible: true,
    createdAt: "2024-04-05"
  },
  {
    id: "10",
    name: "Clínica Cardiovascular Santa María",
    image: "/images/convenios/hospital-san-juan-de-dios-rionegro.webp",
    isVisible: true,
    createdAt: "2024-04-10"
  },
  {
    id: "11",
    name: "Hospital Pablo Tobón Uribe",
    image: "/images/convenios/hospital-santa-elena-fredonia.webp",
    isVisible: true,
    createdAt: "2024-04-15"
  },
  {
    id: "12",
    name: "Clínica El Rosario",
    image: "/images/convenios/hospital-venancio-diaz.webp",
    isVisible: true,
    createdAt: "2024-04-20"
  },
  {
    id: "13",
    name: "Hospital Universitario San Vicente Fundación",
    image: "/images/convenios/hospital-la-merced-ciudad-bolivar.webp",
    isVisible: true,
    createdAt: "2024-04-25"
  },
  {
    id: "14",
    name: "Clínica León XIII",
    image: "/images/convenios/promotora-medica-odontologica.webp",
    isVisible: true,
    createdAt: "2024-05-01"
  },
  {
    id: "15",
    name: "Hospital Manuel Uribe Ángel",
    image: "/images/convenios/somer-sa.webp",
    isVisible: true,
    createdAt: "2024-05-05"
  }
];

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Uniforme Quirúrgico Premium",
    category: "uniforme",
    description: "Uniforme quirúrgico de alta calidad para personal médico",
    variants: [
      {
        id: "1",
        product_id: "1",
        size: "S",
        color: "Azul",
        stock: 45,
        min_stock: 10,
        max_stock: 100,
        sku: "UQP-S-AZ"
      },
      {
        id: "2",
        product_id: "1",
        size: "M",
        color: "Azul",
        stock: 32,
        min_stock: 10,
        max_stock: 100,
        sku: "UQP-M-AZ"
      }
    ],
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z"
  },
  {
    id: "2",
    name: "Tapabocas N95",
    category: "tapabocas",
    description: "Tapabocas de protección respiratoria N95",
    variants: [
      {
        id: "3",
        product_id: "2",
        stock: 150,
        min_stock: 50,
        max_stock: 300,
        sku: "TN95-001"
      }
    ],
    created_at: "2024-01-20T00:00:00Z",
    updated_at: "2024-01-20T00:00:00Z"
  }
];

export const mockSupplierDeliveries: SupplierDelivery[] = [
  {
    id: "1",
    supplier_name: "Proveedor Médico S.A.",
    delivery_date: "2024-06-15",
    items: [
      {
        id: "1",
        delivery_id: "1",
        product_id: "1",
        variant_id: "1",
        quantity: 50,
        unit_cost: 45000
      }
    ],
    total_items: 50,
    status: "completed",
    notes: "Entrega completa sin novedad",
    created_at: "2024-06-10T00:00:00Z"
  }
];

export const mockReturns: Return[] = [
  {
    id: "1",
    hospital_name: "Hospital Marco Fidel Suárez",
    coordinator_name: "María González",
    return_date: "2024-06-20",
    items: [
      {
        id: "1",
        return_id: "1",
        product_id: "1",
        variant_id: "1",
        quantity: 5,
        condition: "new"
      }
    ],
    reason: "excess",
    status: "pending",
    notes: "Exceso de stock por cambio en cronograma",
    created_at: "2024-06-18T00:00:00Z"
  }
];

export const mockInventoryRequests: InventoryRequest[] = [
  {
    id: "1",
    hospital_name: "Hospital San Juan de Dios",
    coordinator_name: "Carlos Martínez",
    coordinator_email: "carlos.martinez@hospital.com",
    request_date: "2024-06-25",
    items: [
      {
        id: "1",
        request_id: "1",
        product_id: "1",
        variant_id: "1",
        quantity_requested: 20,
        quantity_approved: 18,
        justification: "Reposición de stock mensual"
      }
    ],
    priority: "medium",
    status: "approved",
    notes: "Solicitud aprobada con ajuste en cantidad",
    approved_by: "Admin",
    approved_date: "2024-06-26",
    created_at: "2024-06-25T00:00:00Z"
  }
];

export const mockHospitals: Hospital[] = [
  {
    id: "1",
    name: "Hospital Marco Fidel Suárez",
    location: "Bello, Antioquia",
    coordinator_name: "María González",
    coordinator_email: "maria.gonzalez@hospital.com",
    coordinator_phone: "+57 300 123 4567",
    stock_allocation: [
      {
        id: "1",
        hospital_id: "1",
        product_id: "1",
        variant_id: "1",
        allocated_quantity: 100,
        current_quantity: 75,
        min_threshold: 20
      }
    ]
  },
  {
    id: "2",
    name: "Hospital San Juan de Dios",
    location: "Rionegro, Antioquia",
    coordinator_name: "Carlos Martínez",
    coordinator_email: "carlos.martinez@hospital.com",
    coordinator_phone: "+57 300 765 4321",
    stock_allocation: []
  }
];

export const mockUsers: User[] = [
  {
    id: "1",
    name: "Ana García",
    email: "ana.garcia@prosalud.com",
    isActive: true,
    createdAt: "2024-01-15",
    updatedAt: "2024-01-15"
  },
  {
    id: "2",
    name: "Carlos Rodríguez",
    email: "carlos.rodriguez@prosalud.com",
    isActive: true,
    createdAt: "2024-02-10",
    updatedAt: "2024-02-10"
  },
  {
    id: "3",
    name: "María López",
    email: "maria.lopez@prosalud.com",
    isActive: false,
    createdAt: "2024-03-05",
    updatedAt: "2024-03-05"
  }
];

export const mockSolicitudesRequests: SolicitudRequest[] = [
  {
    id: "1",
    request_type: "certificado-convenio",
    id_type: "CC",
    id_number: "12345678",
    name: "Juan",
    last_name: "Pérez",
    email: "juan.perez@email.com",
    phone_number: "300-123-4567",
    payload: {
      empresa: "Hospital Marco Fidel Suárez",
      cargo: "Enfermero"
    },
    status: "pending",
    created_at: "2024-06-01T00:00:00Z"
  },
  {
    id: "2",
    request_type: "compensacion-anual",
    id_type: "CC",
    id_number: "87654321",
    name: "María",
    last_name: "González",
    email: "maria.gonzalez@email.com",
    phone_number: "300-987-6543",
    payload: {
      año: "2024",
      concepto: "Compensación anual diferida"
    },
    status: "in_progress",
    created_at: "2024-06-05T00:00:00Z",
    processed_at: "2024-06-06T00:00:00Z"
  }
];
