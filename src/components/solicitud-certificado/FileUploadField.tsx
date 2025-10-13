
import React from 'react';
import { Control, ControllerRenderProps, FieldValues } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { FileCheck, FileX } from 'lucide-react';
import { formatFileSize } from './utils';

interface FileUploadFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: any; // keyof TFieldValues not working well with nested file paths
  label: string;
  accept: string;
  description?: string;
  isRequired?: boolean;
  className?: string;
  inputClassName?: string;
  multiple?: boolean;
  maxFiles?: number;
}

const FileUploadField = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  accept,
  description,
  isRequired = false,
  className,
  inputClassName,
  multiple = false,
  maxFiles = 1,
}: FileUploadFieldProps<TFieldValues>) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleRemoveFile = (field: ControllerRenderProps<TFieldValues, any>, indexToRemove: number) => {
    if (!multiple) {
      field.onChange(undefined);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      return;
    }

    const currentFiles = field.value ? Array.from(field.value as FileList) : [];
    const newFiles = currentFiles.filter((_, index) => index !== indexToRemove);
    
    if (newFiles.length === 0) {
      field.onChange(undefined);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } else {
      const dataTransfer = new DataTransfer();
      newFiles.forEach(file => dataTransfer.items.add(file));
      field.onChange(dataTransfer.files);
    }
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }: { field: ControllerRenderProps<TFieldValues, any> }) => {
        const files = field.value ? Array.from(field.value as FileList) : [];
        const hasFiles = files.length > 0;

        return (
          <FormItem className={className}>
            <FormLabel>{label}{isRequired && " *"}</FormLabel>
            <FormControl>
              <div>
                <Input
                  type="file"
                  accept={accept}
                  multiple={multiple}
                  ref={inputRef}
                  onChange={(e) => {
                    if (!e.target.files || e.target.files.length === 0) {
                      field.onChange(undefined);
                      return;
                    }

                    if (multiple && e.target.files.length > maxFiles) {
                      alert(`Solo puedes seleccionar hasta ${maxFiles} archivos`);
                      e.target.value = '';
                      return;
                    }

                    field.onChange(e.target.files);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  className={`cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-prosalud file:text-white hover:file:bg-primary-prosalud-dark ${inputClassName || ''}`}
                />
              </div>
            </FormControl>
            {hasFiles && (
              <div className="mt-2 space-y-2">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="p-3 border rounded-md bg-slate-50 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileCheck className="h-5 w-5 text-green-600 shrink-0" />
                      <div className="truncate">
                        <p className="font-medium text-slate-700 truncate" title={file.name}>{file.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 shrink-0"
                      onClick={() => handleRemoveFile(field, index)}
                    >
                      <FileX className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {description && <FormDescription>{description}</FormDescription>}
            {multiple && <FormDescription className="text-xs text-muted-foreground">Puedes seleccionar hasta {maxFiles} archivos</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export default FileUploadField;
