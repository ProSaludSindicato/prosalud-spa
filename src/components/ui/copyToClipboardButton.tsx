
import React, { useState } from 'react';
import { Check, Clipboard } from 'lucide-react';
import { toast } from "@/components/ui/sonner"; // Importar toast para notificaciones
import { logger } from "@/utils/logger";

interface Props {
    textToCopy: string;
}

const CopyToClipboardButton: React.FC<Props> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!navigator.clipboard) {
            toast.error('Error al copiar', {
                description: 'La función de copiar al portapapeles no está disponible en este navegador o contexto.',
            });
            logger.warn('Intento de copiar sin soporte de clipboard');
            return;
        }
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            toast.success('Texto copiado al portapapeles'); // Opcional: Notificación de éxito
            setTimeout(() => setCopied(false), 2000); // Oculta el tooltip después de 2s
        } catch (err) {
            toast.error('Error al copiar texto', {
                description: 'No se pudo copiar el texto. Inténtalo de nuevo o copia manualmente.',
            });
            logger.error('Error al copiar al portapapeles', err instanceof Error ? err.message : err);
        }
    };

    return (
        <div className="relative inline-block">
            <button
                onClick={handleCopy}
                className="ml-2 p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                aria-label="Copiar al portapapeles"
            >
                {copied ? <Check size={16} /> : <Clipboard size={16} />}
            </button>

            {copied && (
                <div 
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs rounded-md shadow-lg animate-fadeIn z-50 bg-popover text-popover-foreground border border-border"
                    role="status"
                >
                    Copiado!
                    <div 
                        className="absolute top-full left-1/2 transform -translate-x-1/2 w-2.5 h-2.5 bg-popover border-r border-b border-border rotate-45 -mt-[5px]" 
                    />
                </div>
            )}
        </div>
    );
};

export default CopyToClipboardButton;
