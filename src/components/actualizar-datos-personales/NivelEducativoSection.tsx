import React from 'react';
import { Control, FieldValues } from 'react-hook-form';
import { GraduationCap, Paperclip } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FileUploadField from '../solicitud-certificado/FileUploadField';
import { nivelesEducativos } from './formOptions';

interface NivelEducativoSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  onFileChange?: (fieldName: string) => void;
}

const NivelEducativoSection = <TFieldValues extends FieldValues>({
  control,
  onFileChange,
}: NivelEducativoSectionProps<TFieldValues>) => {
  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-primary-prosalud-dark flex items-center">
          <GraduationCap className="mr-2 h-6 w-6" /> Nivel Educativo
        </h2>
        <div className="space-y-6">
          <FormField
            control={control}
            name={"nivelEducativo" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel Educativo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione su nivel educativo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {nivelesEducativos.map((nivel) => (
                      <SelectItem key={nivel.value} value={nivel.value}>
                        {nivel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Paperclip className="h-4 w-4" />
              <span className="font-medium">Documentos (si actualiza nivel educativo):</span>
            </div>

            <FileUploadField
              control={control}
              name={"diplomaEducativo" as any}
              label="Diploma"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              description="Adjunte el diploma que acredite su nivel educativo. Se permiten archivos PDF, Word o imágenes (JPG, PNG), máx. 4MB."
              isRequired={false}
              onFileChange={onFileChange}
            />

            <FileUploadField
              control={control}
              name={"actaGrado" as any}
              label="Acta de Grado"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              description="Adjunte el acta de grado que acredite su nivel educativo. Se permiten archivos PDF, Word o imágenes (JPG, PNG), máx. 4MB."
              isRequired={false}
              onFileChange={onFileChange}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default NivelEducativoSection;

