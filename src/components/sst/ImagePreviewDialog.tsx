
import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImagePreviewDialogProps {
  selectedImage: string | null;
  setSelectedImage: (image: string | null) => void;
  imageAlt?: string;
  allImages?: { url: string; alt?: string }[];
  currentImageIndex?: number;
}

const ImagePreviewDialog: React.FC<ImagePreviewDialogProps> = ({ 
  selectedImage, 
  setSelectedImage, 
  imageAlt = "Vista ampliada",
  allImages = [],
  currentImageIndex = 0
}) => {
  const [currentIndex, setCurrentIndex] = useState(currentImageIndex);
  const [imageOpacity, setImageOpacity] = useState(1);
  const hasMultipleImages = allImages.length > 1;
  const currentImage = allImages.length > 0 ? allImages[currentIndex] : null;
  const displayImage = currentImage?.url || selectedImage;
  const displayAlt = currentImage?.alt || imageAlt;

  // Update current index when selectedImage changes
  useEffect(() => {
    if (selectedImage && allImages.length > 0) {
      const index = allImages.findIndex(img => img.url === selectedImage);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [selectedImage, allImages]);

  const handlePrevious = useCallback(() => {
    if (hasMultipleImages) {
      setImageOpacity(0);
      setTimeout(() => {
        setCurrentIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : allImages.length - 1;
          setImageOpacity(1);
          return newIndex;
        });
      }, 150);
    }
  }, [hasMultipleImages, allImages.length]);

  const handleNext = useCallback(() => {
    if (hasMultipleImages) {
      setImageOpacity(0);
      setTimeout(() => {
        setCurrentIndex(prev => {
          const newIndex = prev < allImages.length - 1 ? prev + 1 : 0;
          setImageOpacity(1);
          return newIndex;
        });
      }, 150);
    }
  }, [hasMultipleImages, allImages.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasMultipleImages) {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight' && hasMultipleImages) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        setSelectedImage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, hasMultipleImages, handlePrevious, handleNext, setSelectedImage]);

  const handleClose = () => {
    setSelectedImage(null);
  };

  return (
    <Dialog open={!!selectedImage} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none [&>button]:hidden overflow-hidden"
        overlayClassName="fixed inset-0 z-50 bg-black/90 supports-[backdrop-filter]:backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300"
      >
        <DialogTitle className="sr-only">
          {displayAlt} {hasMultipleImages ? `(${currentIndex + 1} de ${allImages.length})` : ''}
        </DialogTitle>
        {displayImage && (
          <div className="relative w-full h-[95vh] flex items-center justify-center">
            <img 
              src={displayImage} 
              alt={displayAlt} 
              className="max-w-full max-h-[90vh] object-contain transition-opacity duration-300"
              style={{ opacity: imageOpacity }}
            />
            
            {/* Botón cerrar mejorado */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white h-10 w-10 z-50 rounded-full border border-white/20 transition-all duration-200 hover:scale-110"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Botón anterior */}
            {hasMultipleImages && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="fixed left-4 top-1/2 bg-black/60 hover:bg-black/80 text-white h-12 w-12 z-50 rounded-full border border-white/20 transition-all duration-200 hover:scale-110"
                style={{ transform: 'translateY(-50%)' }}
                aria-label="Imagen anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            {/* Botón siguiente */}
            {hasMultipleImages && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="fixed right-4 top-1/2 bg-black/60 hover:bg-black/80 text-white h-12 w-12 z-50 rounded-full border border-white/20 transition-all duration-200 hover:scale-110"
                style={{ transform: 'translateY(-50%)' }}
                aria-label="Imagen siguiente"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}

            {/* Indicador de imagen (si hay múltiples) */}
            {hasMultipleImages && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm z-50 border border-white/20">
                {currentIndex + 1} / {allImages.length}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreviewDialog;
