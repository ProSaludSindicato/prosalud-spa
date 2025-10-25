
import { ComfenalcoEvent } from '@/types/comfenalco';

export const comfenalcoEventsMock: ComfenalcoEvent[] = [
  {
    id: 1,
    title: 'Curso de Gastronomía Internacional',
    banner_image: '/images/comfenalco_banners/banner1.webp',
    description: 'Aprende técnicas culinarias de diferentes culturas del mundo',
    registration_deadline: '2024-02-01',
    event_date: '2024-02-15',
    registration_link: 'https://comfenalco.com/registro-gastronomia',
    is_visible: true,
    category: 'curso',
    display_size: 'carousel',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 2,
    title: 'Experiencia de Relajación en Spa',
    banner_image: '/images/comfenalco_banners/banner2.webp',
    description: 'Disfruta de un día completo de relajación y bienestar',
    registration_deadline: '2024-02-05',
    event_date: '2024-02-20',
    registration_link: 'https://comfenalco.com/registro-spa',
    is_visible: true,
    category: 'experiencia',
    display_size: 'mosaic',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z'
  },
  {
    id: 3,
    title: 'Beneficio Descuento en Gimnasios',
    banner_image: '/images/comfenalco_banners/banner3.webp',
    description: 'Obtén descuentos especiales en gimnasios afiliados',
    registration_deadline: '2024-02-10',
    event_date: '2024-03-01',
    registration_link: 'https://comfenalco.com/registro-gimnasio',
    is_visible: false,
    category: 'beneficio',
    display_size: 'carousel',
    created_at: '2024-01-25T00:00:00Z',
    updated_at: '2024-01-25T00:00:00Z'
  },
  {
    id: 4,
    title: 'Regalo Kit de Bienestar',
    banner_image: '/images/comfenalco_banners/banner4.webp',
    description: 'Recibe un kit completo para tu bienestar personal',
    registration_deadline: '2024-02-15',
    event_date: '2024-03-05',
    registration_link: 'https://comfenalco.com/registro-kit',
    is_visible: true,
    category: 'regalo',
    display_size: 'mosaic',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z'
  },
  {
    id: 5,
    title: 'Recreación Familiar en el Parque',
    banner_image: '/images/comfenalco_banners/banner5.webp',
    description: 'Disfruta de actividades recreativas para toda la familia',
    registration_deadline: '2024-02-20',
    event_date: '2024-03-10',
    registration_link: 'https://comfenalco.com/registro-recreacion',
    is_visible: true,
    category: 'recreacion',
    display_size: 'carousel',
    created_at: '2024-02-05T00:00:00Z',
    updated_at: '2024-02-05T00:00:00Z'
  }
];
