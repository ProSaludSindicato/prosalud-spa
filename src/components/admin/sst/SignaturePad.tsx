import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  onChange?: (dataUrl: string | null) => void;
  height?: number;
  initialValue?: string;
}

export interface SignaturePadRef {
  toDataURL: () => string | null;
  fromDataURL: (dataUrl: string) => void;
  clear: () => void;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ onChange, height = 180, initialValue }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
    const savedDataRef = useRef<string | null>(null);

    useImperativeHandle(ref, () => ({
      toDataURL: () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return canvas.toDataURL('image/png');
      },
      fromDataURL: (dataUrl: string) => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;

        const img = new Image();
        img.onload = () => {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
          savedDataRef.current = dataUrl;
        };
        img.src = dataUrl;
      },
      clear: () => {
        clearCanvas();
      },
    }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const ratio = window.devicePixelRatio || 1;
      const width = parent.clientWidth;
        
        // Save current data before resize
        const currentData = savedDataRef.current || canvas.toDataURL('image/png');
        
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext('2d');
      if (context) {
        context.scale(ratio, ratio);
        context.lineWidth = 2;
        context.lineJoin = 'round';
        context.lineCap = 'round';
        context.strokeStyle = '#0f172a';
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
          
          // Restore data if exists
          if (savedDataRef.current) {
            const img = new Image();
            img.onload = () => {
              context.drawImage(img, 0, 0, width, height);
            };
            img.src = savedDataRef.current;
          }
      }
    };

    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [height]);

    useEffect(() => {
      if (initialValue && canvasRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const img = new Image();
        img.onload = () => {
          const width = canvas.width / (window.devicePixelRatio || 1);
          const height = canvas.height / (window.devicePixelRatio || 1);
          context.clearRect(0, 0, width, height);
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, width, height);
          context.drawImage(img, 0, 0, width, height);
          savedDataRef.current = initialValue;
        };
        img.src = initialValue;
      }
    }, [initialValue]);

  const getContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  const getPoint = (event: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const emitChange = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;

    const isBlank = canvas.toDataURL() === blank.toDataURL();
    onChange?.(isBlank ? null : canvas.toDataURL('image/png'));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const context = getContext();
    if (!context) return;

    context.beginPath();
    const { x, y } = getPoint(event.nativeEvent);
    context.moveTo(x, y);

    setIsDrawing(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const context = getContext();
    if (!context) return;

    const { x, y } = getPoint(event.nativeEvent);
    context.lineTo(x, y);
    context.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    const context = getContext();
    if (!context) return;

    context.closePath();
    setIsDrawing(false);
    emitChange();
  };

  const handlePointerLeave = () => {
    if (!isDrawing) return;
    handlePointerUp();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = getContext();
    if (!canvas || !context) return;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    savedDataRef.current = null;
    onChange?.(null);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border-2 border-slate-400 bg-white p-2 shadow-inner overflow-hidden">
        <canvas
          ref={canvasRef}
          className="block w-full cursor-crosshair touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={clearCanvas} className="gap-2">
          <Eraser className="h-4 w-4" />
          Limpiar firma
        </Button>
      </div>
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';


