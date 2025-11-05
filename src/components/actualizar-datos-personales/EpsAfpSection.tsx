import React from 'react';
import { Control, FieldValues } from 'react-hook-form';
import { Heart, FileText, Paperclip } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FileUploadField from '../solicitud-certificado/FileUploadField';
import { epsList, afpList } from './formOptions';

interface EpsAfpSectionProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  modifiedFields?: Set<string>;
  onFileChange?: (fieldName: string) => void;
}

const EpsAfpSection = <TFieldValues extends FieldValues>({
  control,
  modifiedFields,
  onFileChange,
}: EpsAfpSectionProps<TFieldValues>) => {
  return (
    <section className="p-6 border rounded-lg shadow-sm bg-white space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-primary-prosalud-dark flex items-center">
          <Heart className="mr-2 h-6 w-6" /> EPS y AFP
        </h2>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={control}
              name={"eps" as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EPS</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={modifiedFields?.has('eps') ? 'border-green-500 bg-green-50' : ''}>
                        <SelectValue placeholder="Seleccione su EPS" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {epsList.map((eps) => (
                        <SelectItem key={eps.value} value={eps.value}>
                          {eps.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={"afp" as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AFP</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={modifiedFields?.has('afp') ? 'border-green-500 bg-green-50' : ''}>
                        <SelectValue placeholder="Seleccione su AFP" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {afpList.map((afp) => (
                        <SelectItem key={afp.value} value={afp.value}>
                          {afp.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Paperclip className="h-4 w-4" />
              <span className="font-medium">Documentos (si actualiza EPS/AFP):</span>
            </div>

            <FileUploadField
              control={control}
              name={"certificadoEps" as any}
              label="Certificado de EPS Vigente"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              description="Adjunte el certificado de EPS vigente. Se permiten archivos PDF, Word o imágenes (JPG, PNG), máx. 4MB."
              isRequired={false}
              onFileChange={onFileChange}
            />

            <FileUploadField
              control={control}
              name={"certificadoAfp" as any}
              label="Certificado de AFP Vigente"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              description="Adjunte el certificado de AFP vigente. Se permiten archivos PDF, Word o imágenes (JPG, PNG), máx. 4MB."
              isRequired={false}
              onFileChange={onFileChange}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default EpsAfpSection;

