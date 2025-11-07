import { useEffect, useRef, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { SignaturePad, SignaturePadRef } from '@/components/admin/sst/SignaturePad';
import { Save } from 'lucide-react';

interface SignatureCaptureDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dataUrl: string) => void;
  onCancel?: () => void;
  initialSignature?: string | null;
}

export function SignatureCaptureDrawer({
  open,
  onOpenChange,
  onSubmit,
  onCancel,
  initialSignature,
}: SignatureCaptureDrawerProps) {
  const signaturePadRef = useRef<SignaturePadRef | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!open) {
      setHasSignature(false);
      return;
    }

    if (initialSignature && signaturePadRef.current) {
      setTimeout(() => {
        signaturePadRef.current?.fromDataURL(initialSignature);
        setHasSignature(true);
      }, 100);
    }
  }, [open, initialSignature]);

  const handleSignatureChange = (dataUrl: string | null) => {
    setHasSignature(Boolean(dataUrl));
  };

  const handleSaveSignature = () => {
    const dataUrl = signaturePadRef.current?.toDataURL();
    if (!dataUrl) return;
    onSubmit(dataUrl);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (initialSignature && signaturePadRef.current) {
      signaturePadRef.current.fromDataURL(initialSignature);
      setHasSignature(true);
    } else {
      signaturePadRef.current?.clear();
      setHasSignature(false);
    }
    onCancel?.();
    onOpenChange(false);
  };

  const handleDrawerOpenChange = (newOpen: boolean) => {
    // Only allow closing via buttons, not by dragging down
    if (!newOpen) {
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleDrawerOpenChange} dismissible={false}>
      <DrawerContent className="max-h-[90vh] border-t border-slate-200 bg-white px-4 sm:px-6">
        <DrawerHeader>
          <DrawerTitle className="text-2xl font-semibold text-slate-800">Firma de constancia</DrawerTitle>
          <DrawerDescription className="text-sm text-slate-500">
            Por favor, firme dentro del recuadro con letra legible para confirmar la recepción de los elementos entregados. Si necesitas corregir algo, puedes limpiar la firma y volver a intentarlo antes de guardar.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-6 pb-4">
          {/*<div className="rounded-lg border border-primary-prosalud/40 bg-primary-prosalud/5 p-4 text-sm text-slate-600">
            <p className="font-semibold text-primary-prosalud-dark">Instrucciones para firmar</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
              <li>Verifica que tus datos sean correctos antes de firmar.</li>
              <li>Firma dentro del recuadro gris sin salirte del borde.</li>
              <li>Si necesitas repetir la firma, selecciona “Limpiar firma” y vuelve a intentarlo.</li>
            </ul>
          </div> */}

          <SignaturePad
            ref={signaturePadRef}
            onChange={handleSignatureChange}
            height={260}
            initialValue={initialSignature ?? undefined}
          />
        </div>

        <DrawerFooter className="flex flex-col-reverse gap-2 pb-6 sm:flex-row sm:justify-between sm:gap-3">
          <Button onClick={handleCancel} variant="outline" className="sm:w-40">
            Cancelar
          </Button>
          <Button
            onClick={handleSaveSignature}
            className="flex items-center justify-center gap-2 bg-primary-prosalud text-white hover:bg-primary-prosalud-dark sm:w-48"
            disabled={!hasSignature}
          >
            <Save className="h-4 w-4" />
            Guardar firma
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}


