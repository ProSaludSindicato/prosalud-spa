// Re-export services for backward compatibility and centralized access
export { usersApiAdapter as usersApi } from './usersApiAdapter';

export { inventoryService } from './inventoryService';
export { solicitudesService } from './solicitudesService';

// Keep existing bienestar and comfenalco APIs as they were
import { 
  BienestarEvent, 
  ComfenalcoEvent, 
  AboutUs, 
  SiteMetrics,
  CreateBienestarEventData,
  CreateComfenalcoEventData
} from '@/types/admin';

// Mock data for events
const mockBienestarEvents: BienestarEvent[] = [
  {
    id: '1',
    title: 'Jornada de Vacunación COVID-19',
    date: '2024-06-15',
    category: 'Salud',
    description: 'Jornada especial de vacunación para todo el personal de salud',
    location: 'Sede Principal ProSalud',
    attendees: 150,
    gift: 'Kit de bioseguridad',
    provider: 'ProSalud',
    images: [
      { url: '/images/galeria_bienestar/evento1_1.webp', alt: 'Vacunación', isMain: true },
      { url: '/images/galeria_bienestar/evento1_2.webp', alt: 'Personal médico', isMain: false }
    ],
    isVisible: true,
    createdAt: '2024-06-01'
  },
  {
    id: '2',
    title: 'Capacitación en Bioseguridad',
    date: '2024-06-20',
    category: 'Capacitación',
    description: 'Capacitación especializada en protocolos de bioseguridad hospitalaria',
    location: 'Hospital Marco Fidel Suárez',
    attendees: 80,
    gift: 'Manual de bioseguridad',
    provider: 'ProSalud',
    images: [
      { url: '/images/galeria_bienestar/evento2_1.webp', alt: 'Capacitación', isMain: true }
    ],
    isVisible: true,
    createdAt: '2024-06-05'
  },
  {
    id: '3',
    title: 'Jornada de Bienestar Familiar',
    date: '2024-06-25',
    category: 'Recreation',
    description: 'Día de integración familiar para los afiliados y sus familias',
    location: 'Parque Recreativo',
    attendees: 200,
    gift: 'Kit familiar recreativo',
    provider: 'ProSalud',
    images: [
      { url: '/images/galeria_bienestar/evento3_1.webp', alt: 'Familia', isMain: true },
      { url: '/images/galeria_bienestar/evento3_2.webp', alt: 'Niños jugando', isMain: false }
    ],
    isVisible: true,
    createdAt: '2024-06-10'
  }
];

const mockComfenalcoEvents: ComfenalcoEvent[] = [
  {
    id: '1',
    title: 'Curso de Primeros Auxilios',
    bannerImage: '/images/comfenalco_banners/banner1.webp',
    description: 'Aprende técnicas básicas de primeros auxilios',
    publishDate: '2024-06-01',
    registrationDeadline: '2024-06-20',
    eventDate: '2024-06-25',
    registrationLink: 'https://comfenalco.com/registro1',
    formLink: 'https://forms.comfenalco.com/primeros-auxilios',
    isNew: true,
    category: 'curso',
    displaySize: 'carousel',
    isVisible: true
  },
  {
    id: '2',
    title: 'Taller de Liderazgo en Salud',
    bannerImage: '/images/comfenalco_banners/banner2.webp',
    description: 'Desarrolla habilidades de liderazgo en el sector salud',
    publishDate: '2024-06-05',
    registrationDeadline: '2024-06-25',
    eventDate: '2024-06-30',
    registrationLink: 'https://comfenalco.com/registro2',
    formLink: 'https://forms.comfenalco.com/liderazgo-salud',
    isNew: true,
    category: 'taller',
    displaySize: 'mosaic',
    isVisible: true
  },
  {
    id: '3',
    title: 'Diplomado en Gestión Hospitalaria',
    bannerImage: '/images/comfenalco_banners/banner3.webp',
    description: 'Especialízate en gestión y administración hospitalaria',
    publishDate: '2024-06-10',
    registrationDeadline: '2024-07-01',
    eventDate: '2024-07-15',
    registrationLink: 'https://comfenalco.com/registro3',
    formLink: 'https://forms.comfenalco.com/gestion-hospitalaria',
    isNew: false,
    category: 'diplomado',
    displaySize: 'carousel',
    isVisible: true
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Bienestar Events API
export const bienestarApi = {
  async getEvents(): Promise<BienestarEvent[]> {
    await delay(400);
    return [...mockBienestarEvents];
  },

  async createEvent(data: CreateBienestarEventData): Promise<BienestarEvent> {
    await delay(1000);
    const images = data.images.map((file, index) => ({
      url: URL.createObjectURL(file),
      alt: `Imagen ${index + 1}`,
      isMain: index === data.mainImageIndex
    }));

    const newEvent: BienestarEvent = {
      id: String(mockBienestarEvents.length + 1),
      title: data.title,
      date: data.date,
      category: data.category,
      description: data.description,
      location: data.location,
      attendees: data.attendees,
      gift: data.gift,
      provider: data.provider || 'ProSalud',
      images,
      isVisible: true,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    mockBienestarEvents.push(newEvent);
    return newEvent;
  },

  async updateEvent(id: string, data: Partial<CreateBienestarEventData & { isVisible: boolean }>): Promise<BienestarEvent> {
    await delay(800);
    const eventIndex = mockBienestarEvents.findIndex(event => event.id === id);
    if (eventIndex === -1) throw new Error('Evento no encontrado');
    
    const updatedData: any = { ...data };
    if (data.images) {
      updatedData.images = data.images.map((file, index) => ({
        url: URL.createObjectURL(file),
        alt: `Imagen ${index + 1}`,
        isMain: index === data.mainImageIndex
      }));
    }
    
    mockBienestarEvents[eventIndex] = { ...mockBienestarEvents[eventIndex], ...updatedData };
    return mockBienestarEvents[eventIndex];
  }
};

// Comfenalco Events API
export const comfenalcoApi = {
  async getEvents(): Promise<ComfenalcoEvent[]> {
    await delay(400);
    return [...mockComfenalcoEvents];
  },

  async createEvent(data: CreateComfenalcoEventData): Promise<ComfenalcoEvent> {
    await delay(1000);
    
    let bannerImageUrl = '';
    if (data.bannerImage) {
      bannerImageUrl = URL.createObjectURL(data.bannerImage);
    }
    
    const newEvent: ComfenalcoEvent = {
      id: String(mockComfenalcoEvents.length + 1),
      title: data.title,
      bannerImage: bannerImageUrl,
      description: data.description,
      publishDate: new Date().toISOString().split('T')[0],
      registrationDeadline: data.registrationDeadline,
      eventDate: data.eventDate,
      registrationLink: data.registrationLink,
      formLink: data.formLink,
      isNew: true,
      category: data.category,
      displaySize: data.displaySize,
      isVisible: true
    };
    
    mockComfenalcoEvents.push(newEvent);
    return newEvent;
  },

  async updateEvent(id: string, data: Partial<CreateComfenalcoEventData & { isVisible: boolean }>): Promise<ComfenalcoEvent> {
    await delay(800);
    const eventIndex = mockComfenalcoEvents.findIndex(event => event.id === id);
    if (eventIndex === -1) throw new Error('Evento no encontrado');
    
    const updatedData: any = { ...data };
    
    if (data.bannerImage && data.bannerImage instanceof File) {
      updatedData.bannerImage = URL.createObjectURL(data.bannerImage);
    }
    
    mockComfenalcoEvents[eventIndex] = { ...mockComfenalcoEvents[eventIndex], ...updatedData };
    return mockComfenalcoEvents[eventIndex];
  }
};

// Site Configuration API
export const configApi = {
  async getAboutUs(): Promise<AboutUs> {
    await delay(300);
    return {
      mission: 'Representar y fortalecer el oficio de los Profesionales de la Salud generando bienestar laboral y económico a todos sus afiliados partícipes, buscando así el mejoramiento en los estándares de calidad en la prestación de los servicios de las Instituciones contractuales.',
      vision: 'En el 2030 nuestro Sindicato de Oficio será líder en el departamento de Antioquia, reconocida por el fortalecimiento en la modalidad de contrato colectivo laboral en beneficio de los afiliados y las empresas contractuales.'
    };
  },

  async updateAboutUs(data: AboutUs): Promise<AboutUs> {
    await delay(600);
    return data;
  },

  async getMetrics(): Promise<SiteMetrics> {
    await delay(300);
    return {
      yearsExperience: 10,
      conventionsCount: 10, // Updated to match actual convenios count
      affiliatesCount: 1500
    };
  },

  async updateMetrics(data: SiteMetrics): Promise<SiteMetrics> {
    await delay(600);
    return data;
  }
};
