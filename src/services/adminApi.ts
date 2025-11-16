// Re-export services for backward compatibility and centralized access
export { usersApiAdapter as usersApi } from './usersApiAdapter';

export { inventoryService } from './inventoryService';
export { solicitudesService } from './solicitudesService';

// Import real APIs
import { 
  getWellnessEvents, 
  createWellnessEvent, 
  updateWellnessEvent,
  toggleWellnessEventVisibility 
} from './wellnessEventsApi';
import { comfenalcoEventsApi } from './comfenalcoEventsApi';
import type { 
  BienestarEvent, 
  CreateBienestarEventData,
  AboutUs,
  SiteMetrics
} from '@/types/admin';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Create adapter for bienestarApi to match the expected interface
export const bienestarApi = {
  async getEvents(): Promise<BienestarEvent[]> {
    return getWellnessEvents();
  },

  async createEvent(data: CreateBienestarEventData): Promise<BienestarEvent> {
    // Convert CreateBienestarEventData to CreateWellnessEventData format
    const wellnessData = {
      title: data.title,
      date: data.date,
      category: data.category,
      location: data.location || '', // Required in CreateWellnessEventData
      description: data.description,
      attendees: data.attendees,
      gift: data.gift,
      images: data.images,
      is_visible: true, // Default to visible
    };
    
    return createWellnessEvent(wellnessData);
  },

  async updateEvent(id: string, data: Partial<CreateBienestarEventData & { isVisible: boolean }>): Promise<BienestarEvent> {
    // Convert to UpdateWellnessEventData format
    const updateData: any = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.attendees !== undefined) updateData.attendees = data.attendees;
    if (data.gift !== undefined) updateData.gift = data.gift;
    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.images !== undefined) updateData.images = data.images;
    
    // Convert isVisible to is_visible format
    if ('isVisible' in data) {
      updateData.is_visible = data.isVisible;
    }
    
    return updateWellnessEvent(Number(id), updateData);
  },

  async toggleVisibility(id: string, isVisible: boolean): Promise<BienestarEvent> {
    return toggleWellnessEventVisibility(Number(id), isVisible);
  }
};

// Export comfenalco API directly (already has compatible interface)
export { comfenalcoEventsApi as comfenalcoApi };

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
