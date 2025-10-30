
import React from 'react';
import { Handshake } from 'lucide-react'; // Cambiado de PartyPopper a Handshake

const MensajeDespedidaRetiroSection: React.FC = () => {
  return (
    <div className="mt-8 mb-6 p-6 border rounded-lg shadow-lg bg-blue-50 text-gray-700 animate-fadeIn"> {/* Estilos de fondo y texto actualizados, animación simplificada */}
      <div className="flex flex-col items-center text-center">
        <Handshake className="h-14 w-14 mb-4 text-primary-prosalud" /> {/* Icono y color actualizados, animación de pulso eliminada */}
        <h2 className="text-2xl font-bold mb-3 text-primary-prosalud">¡Gracias por tu tiempo con nosotros!</h2> {/* Color de título actualizado */}
        <p className="text-lg mb-2">
          Agradecemos tu participación y contribución al sindicato ProSalud.
        </p>
        <p className="text-md">
          Te deseamos mucho éxito en tus futuros proyectos y metas. ¡Las puertas siempre estarán abiertas!
        </p>
      </div>
    </div>
  );
};

export default MensajeDespedidaRetiroSection;
