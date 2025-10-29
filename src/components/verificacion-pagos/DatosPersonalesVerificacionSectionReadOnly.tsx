import React from 'react';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';

const ID_TYPES_MAP: Record<string, string> = {
  'CC': 'Cédula de Ciudadanía',
  'CE': 'Cédula de Extranjería',
  'TI': 'Tarjeta de Identidad',
  'PA': 'Pasaporte',
};

const DatosPersonalesVerificacionSectionReadOnly: React.FC = () => {
  const { afiliado } = useAfiliadoAuth();

  if (!afiliado) return null;

  return (
    <section className="bg-white p-6 rounded-lg border shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Datos Personales</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Tipo de Identificación
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
            {ID_TYPES_MAP[afiliado.tipo_documento || ''] || afiliado.tipo_documento}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Número de Identificación
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
            {afiliado.documento}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Nombres
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
            {afiliado.nombres}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Apellidos
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
            {afiliado.apellidos}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Correo Electrónico
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
            {afiliado.correo_personal}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Número de Celular
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
            {afiliado.celular}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DatosPersonalesVerificacionSectionReadOnly;
