import { useEffect, useState } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { buildPortalUrl } from '@/config/site';
import {
  ASSEMBLY_DELEGATE_VOTE_PATH,
  ASSEMBLY_DELEGATES_QR_IMAGE_PATH,
} from '@/constants/assemblyDelegateAccess';

async function rasterizeAssemblyQrToPng(): Promise<Blob> {
  const absoluteUrl = `${window.location.origin}${ASSEMBLY_DELEGATES_QR_IMAGE_PATH}`;
  const res = await fetch(absoluteUrl);
  if (!res.ok) {
    throw new Error('No se pudo obtener el código QR.');
  }
  const svgBlob = await res.blob();
  const objectUrl = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo cargar el código QR.'));
      img.src = objectUrl;
    });
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (!w || !h) {
      w = 512;
      h = 512;
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas no disponible.');
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Pantalla para monitor en recepción: sólo mensaje para delegados, QR y enlace.
 * No incluye navegación ni datos administrativos.
 */
export default function AssemblyDelegateAccessKioskPage() {
  const [qrBroken, setQrBroken] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const voteUrl = buildPortalUrl(ASSEMBLY_DELEGATE_VOTE_PATH);

  useEffect(() => {
    document.title = 'Acceso votación Asamblea — ProSalud';
  }, []);

  const handleCopyQrImage = async () => {
    if (!navigator.clipboard || !window.ClipboardItem) {
      toast.error('Su navegador no permite copiar imágenes al portapapeles.', {
        description: 'Copie el enlace de texto más abajo.',
      });
      return;
    }
    setIsCopyingImage(true);
    try {
      const png = await rasterizeAssemblyQrToPng();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      toast.success('Imagen del código QR copiada', {
        description: 'Péguela en WhatsApp, correo u otra aplicación.',
      });
    } catch {
      toast.error('No se pudo copiar la imagen', {
        description: 'Copie el enlace de texto más abajo.',
      });
    } finally {
      setIsCopyingImage(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 px-6 py-10 text-center dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <img
        src="/images/logo_prosalud.webp"
        alt="ProSalud"
        className="mb-8 h-16 w-auto object-contain opacity-90 md:h-20"
      />
      <h1 className="max-w-lg text-2xl font-bold tracking-tight text-slate-800 md:text-3xl dark:text-slate-100">
        Votación Asamblea General
      </h1>
      <p className="mt-4 max-w-md text-base text-slate-600 md:text-lg dark:text-slate-300">
        Escanee el código con su celular para ingresar. También puede abrir el enlace en el navegador de su teléfono.
      </p>

      <div className="mt-10 flex w-full max-w-lg flex-col items-center gap-5">
        {!qrBroken ? (
          <>
            <img
              src={ASSEMBLY_DELEGATES_QR_IMAGE_PATH}
              alt="Código QR para acceder a la votación de la asamblea"
              className="h-auto w-full max-w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg object-contain sm:max-w-[300px] md:max-w-[340px] dark:border-slate-600 dark:bg-white"
              onError={() => setQrBroken(true)}
            />
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="gap-2"
              disabled={isCopyingImage}
              onClick={() => void handleCopyQrImage()}
            >
              {isCopyingImage ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 shrink-0" />
              )}
              Copiar imagen del QR
            </Button>
            <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
              La copia guarda el código como imagen (PNG) para pegarla en WhatsApp u otras apps.
            </p>
          </>
        ) : (
          <div className="flex max-w-sm flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">Código QR no disponible</p>
            <p className="text-sm opacity-90">
              Use el enlace de abajo o pídale al personal el enlace de acceso.
            </p>
          </div>
        )}

        <div className="max-w-xl rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Enlace directo
          </p>
          <p className="mt-1 break-all font-mono text-sm text-slate-800 md:text-base dark:text-slate-200">
            {voteUrl}
          </p>
        </div>
      </div>
    </div>
  );
}
