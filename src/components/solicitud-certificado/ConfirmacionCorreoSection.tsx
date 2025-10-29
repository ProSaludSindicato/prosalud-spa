
import React from 'react';
import { Info } from 'lucide-react';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import { obfuscateEmail, obfuscatePhone } from '@/utils/obfuscate';
import { Link } from 'react-router-dom';

const ConfirmacionCorreoSection = () => {
  const { afiliado } = useAfiliadoAuth();

  const obfuscatedEmail = afiliado?.correo_personal ? obfuscateEmail(afiliado.correo_personal) : '';
  const obfuscatedPhone = afiliado?.celular ? obfuscatePhone(afiliado.celular) : '';

  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white">
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row items-start space-x-3">
          <Info className="h-5 w-5 text-sky-600 flex-shrink-0 mt-0.5" aria-label="Información" />
          <div className="flex-1 space-y-2">
            <p className="font-normal text-sm text-gray-700">
              Recibirá una confirmación automática del envío de esta solicitud al correo electrónico{' '}
              {obfuscatedEmail && <span className="font-semibold">{obfuscatedEmail}</span>}
              {' '}que indicó en sus datos personales.
              {obfuscatedPhone && (
                <> El número de celular <span className="font-semibold">{obfuscatedPhone}</span> solo se utilizará para contactarlo en caso de ser necesario.</>
              )}
            </p>
            <p className="font-normal text-sm text-gray-700">
              La respuesta a su solicitud será enviada al correo registrado. <span className="font-semibold">Si la información de contacto no es correcta,
              se debe actualizar antes de realizar la solicitud</span>. Esto se puede hacer en{' '}
              <Link to="/servicios/actualizar-cuenta" className="text-primary hover:underline font-medium">
                Actualizar cuenta bancaria
              </Link>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConfirmacionCorreoSection;
