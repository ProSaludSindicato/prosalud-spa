
import React from 'react';
import { Control, FieldValues } from 'react-hook-form';
import { UploadCloud } from 'lucide-react';
import FileUploadField from './FileUploadField'; // Assuming FormValues type is defined elsewhere

interface ArchivoAdicionalSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
}

const ArchivoAdicionalSection = <TFieldValues extends FieldValues>({
  control,
}: ArchivoAdicionalSectionProps<TFieldValues>) => {
  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4 text-primary-prosalud-dark flex items-center">
        <UploadCloud className="mr-2 h-6 w-6" /> Adjuntar Archivo Adicional (Opcional)
      </h2>
      <FileUploadField
        control={control}
        name={"adjuntarArchivoAdicional" as any}
        label="Seleccione archivos (PDF, Word o imagen, máx. 4MB c/u)"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
        description="Si necesita adjuntar documentos adicionales, puede hacerlo aquí. Se permiten archivos PDF, Word o imágenes (JPG, PNG, WEBP)."
        multiple={true}
        maxFiles={4}
      />
    </section>
  );
};

export default ArchivoAdicionalSection;
