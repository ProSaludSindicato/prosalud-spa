import React from 'react';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { buildCampaignEnrollmentUrl } from '@/config/site';

interface CampaignEnrollmentLinkButtonProps {
  slug: string;
  className?: string;
}

/**
 * Botón que copia al portapapeles el enlace de inscripción de la campaña para compartirlo con los afiliados.
 */
const CampaignEnrollmentLinkButton: React.FC<CampaignEnrollmentLinkButtonProps> = ({ slug, className }) => {
  const url = buildCampaignEnrollmentUrl(slug);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado', { description: url });
    } catch {
      toast.error('No se pudo copiar el enlace', { description: `Cópialo manualmente: ${url}` });
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={handleCopy} title={url}>
      <Link2 className="h-4 w-4 mr-1" />
      Copiar enlace
    </Button>
  );
};

export default CampaignEnrollmentLinkButton;
