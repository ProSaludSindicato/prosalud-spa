import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import SstBreadcrumb from '@/components/sst/SstBreadcrumb';
import SstPageHeader from '@/components/sst/SstPageHeader';
import ProtocoloIncapacidadesCard from '@/components/sst/ProtocoloIncapacidadesCard';
import DefinicionesClaveSection from '@/components/sst/DefinicionesClaveSection';
import IdentificandoRiesgosSection from '@/components/sst/IdentificandoRiesgosSection';
import ProtocoloAccidenteTrabajoCard from '@/components/sst/ProtocoloAccidenteTrabajoCard';
import PreparacionEmergenciaCard from '@/components/sst/PreparacionEmergenciaCard';
import HigieneManosCard from '@/components/sst/HigieneManosCard';
import TiposEmergenciasSection, { EmergencyType } from '@/components/sst/TiposEmergenciasSection';
import ArticulosSstSection from '@/components/sst/ArticulosSstSection';
import ImagePreviewDialog from '@/components/sst/ImagePreviewDialog';
import { Link } from 'react-router-dom';

import {
  ShieldAlert,
  Bomb,
  Activity,
  Flame,
  DoorOpen,
  Settings2,
} from 'lucide-react';

const SstPage: React.FC = () => {
  const emergencyTypes: EmergencyType[] = [
    {
      id: "atraco",
      title: "Atraco",
      icon: <ShieldAlert size={48} className="text-red-500 mb-4" />,
      points: [
        "Conserve la calma, no grite.",
        "Observe los rasgos más destacados del asaltante como altura, edad, peso aproximado, color del cabello, ojos, cicatrices y tipos de armas, con el fin de informar a las autoridades.",
        "Obedezca las indicaciones del asaltante, de manera lenta y calmada.",
        "No se enfrente al asaltante, especialmente, cuando éste se encuentre armado.",
        "No toque nada en el área del atraco para no entorpecer la obtención de huellas."
      ],
    },
    {
      id: "bomba",
      title: "Bomba",
      icon: <Bomb size={48} className="text-gray-700 mb-4" />,
      points: [
        "No toque ni mueva ningún objeto.",
        "Observe la presencia de objetos desconocidos e inusuales y repórtelos."
      ],
    },
    {
      id: "evacuacion",
      title: "Evacuación",
      icon: <DoorOpen size={48} className="text-blue-500 mb-4" />,
      points: [
        "Al escuchar la señal de alarma desconecte todos los aparatos eléctricos.",
        "Suspenda toda actividad.",
        "Salga inmediatamente, no se devuelva por ningún motivo, evite congestiones.",
        "Salga despacio y sin correr por las rutas de evacuación establecidas.",
        "Utilice siempre las escaleras.",
        "Atienda y cumpla estrictamente las órdenes de los coordinadores de evacuación.",
        "Si cae un compañero retírelo de la ruta de evacuación para que no obstruya la vía.",
        "Si nota que falta algún compañero avise al coordinador.",
        "Apréndase los teléfonos de emergencia: Cruz Roja, Bomberos, Policía, Control de Tránsito."
      ],
    },
    {
      id: "incendio",
      title: "Incendio",
      icon: <Flame size={48} className="text-orange-500 mb-4" />,
      points: [
        "Si conoce el manejo de los extintores o de los hidrantes utilícelos, de lo contrario evacue la zona.",
        "Procure retirar los objetos que sirvan de combustible al fuego.",
        "Evite el pánico, no corra ni cause confusión. Utilice las escaleras nunca el ascensor.",
        "No se quede en los baños, vestieres o zonas de descanso.",
        "Si el lugar está lleno de humo, salga agachado, gateando, cubriéndose la nariz y la boca con un pañuelo húmedo.",
        "Si su ropa se incendia no corra; arrójese al suelo y dé vuelta sobre su cuerpo; si ve a alguien con su ropa encendida arrójele una cobija, manta o tela gruesa sobre el cuerpo."
      ],
    },
    {
      id: "sismos",
      title: "Sismos",
      icon: <Activity size={48} className="text-yellow-500 mb-4" />,
      points: [
        "En caso de encontrarse en la vía pública, diríjase a zonas verdes o parques donde no existan peligros con los cables eléctricos o estructuras que se derrumben.",
        "Si va en carro deténgalo inmediatamente, permaneciendo en el interior, o debajo de él si hay otros carros en movimiento.",
        "Si está en un bus permanezca adentro hasta que el sismo haya terminado.",
        "Si se encuentra cerca de un río o quebrada debe alejarse de la orilla y buscar refugio en un sitio alto y de poca pendiente, porque puede haber deslizamiento de tierra, represamientos y avalanchas.",
        "Apague equipos, maquinaria y sistema antes de salir.",
        "Mantenga la calma y evite correr. El pánico es tan peligroso como el terremoto."
      ],
    }
  ];
  
  const handWashingSteps = [
    { number: 1, text: "Mójese las manos con agua corriente limpia (tibia o fría), cierre el grifo y enjabónese las manos." },
    { number: 2, text: "Frótese las manos con el jabón hasta que haga espuma. Frótese la espuma por el dorso de las manos, entre los dedos y debajo de las uñas." },
    { number: 3, text: "Restriéguese las manos durante al menos 20 segundos." },
    { number: 4, text: "Enjuáguese bien las manos con agua corriente limpia." },
    { number: 5, text: "Séquese las manos con una toalla limpia o al aire." },
  ];

  const articles = [
    { title: "Sus 5 momentos para la Higiene de las Manos", url: "https://www.sindicatoprosalud.com/portal/images/PROSALUD/Coronavirus/5%20Momentos%20para%20la%20Higiene%20de%20Manos.pdf" },
    { title: "¿Cómo desinfectarse las manos?", url: "https://www.sindicatoprosalud.com/portal/images/PROSALUD/Coronavirus/Como%20desinfectarse%20las%20manos.pdf" },
    { title: "Medidas básicas para el Control de Infecciones en IPS", url: "https://www.sindicatoprosalud.com/portal/images/PROSALUD/Coronavirus/Cartilla%20Coronavirus.pdf" },
    { title: "Coronavirus: Higiene de las manos - por qué, cómo, cuándo", url: "https://www.sindicatoprosalud.com/portal/images/PROSALUD/Coronavirus/Higiene%20de%20las%20manos%20-%20por%20qu%C3%A9,%20c%C3%B3mo,%20cu%C3%A1ndo.pdf" },
  ];

  // State management remains here
  const [openCollapsible, setOpenCollapsible] = React.useState<Record<string, boolean>>({});
  const [openEmergencyDetails, setOpenEmergencyDetails] = React.useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  const toggleCollapsible = (id: string) => {
    setOpenCollapsible(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleEmergencyDetail = (id: string) => {
    setOpenEmergencyDetails(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  return (
    <MainLayout>
      <SstBreadcrumb />

      <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <SstPageHeader />
          <Link
            to="/admin/dotacion-epp"
            className="absolute top-0 right-0 text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 opacity-60 hover:opacity-100"
            title="Acceso administrativo"
          >
            <Settings2 className="h-3 w-3" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </div>
        { /* <ProtocoloIncapacidadesCard /> */ }
        <DefinicionesClaveSection />
        <IdentificandoRiesgosSection />
        <ProtocoloAccidenteTrabajoCard setSelectedImage={setSelectedImage} />
        <PreparacionEmergenciaCard 
          openCollapsible={openCollapsible}
          toggleCollapsible={toggleCollapsible}
          setSelectedImage={setSelectedImage}
        />
        <HigieneManosCard
          handWashingSteps={handWashingSteps}
        />
        <TiposEmergenciasSection 
          emergencyTypes={emergencyTypes}
          openEmergencyDetails={openEmergencyDetails}
          toggleEmergencyDetail={toggleEmergencyDetail}
        />
        <ArticulosSstSection articles={articles} />
      </div>

      <ImagePreviewDialog 
        selectedImage={selectedImage}
        setSelectedImage={setSelectedImage}
      />
    </MainLayout>
  );
};

export default SstPage;
