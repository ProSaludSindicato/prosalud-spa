
import React from 'react';
import CopyToClipboardButton from '@/components/ui/copyToClipboardButton'; // Corrected import
import { Mail, AlertTriangle } from 'lucide-react';

const InstruccionesEnvioRetiroSection: React.FC = () => {
  const email = "talentohumanosindicatoprosalud@gmail.com";

  return (
    <div className="mb-6 p-6 border rounded-lg shadow-sm bg-white">
      <div className="flex items-center text-amber-600 mb-3">
        <AlertTriangle className="h-6 w-6 mr-2 shrink-0" />
        <h2 className="text-lg font-semibold">Proceso Importante</h2>
      </div>
      <p className="text-base text-gray-700 mb-2">
        Diligenciar y enviar el formato debidamente firmado al siguiente correo electrónico:
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <Mail className="h-5 w-5 text-blue-600 shrink-0" />
        <span className="font-mono text-blue-700 break-all">{email}</span>
        <CopyToClipboardButton textToCopy={email} />
      </div>
    </div>
  );
};

export default InstruccionesEnvioRetiroSection;
