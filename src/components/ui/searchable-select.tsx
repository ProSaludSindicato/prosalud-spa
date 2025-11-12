import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  searchText?: string;
  renderLabel?: React.ReactNode;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onValueChange,
  placeholder = 'Seleccionar...',
  emptyText = 'No se encontraron resultados',
  className,
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options;
    const search = searchTerm.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(search) ||
        opt.searchText?.toLowerCase().includes(search)
    );
  }, [options, searchTerm]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchTerm('');
    } else {
      // Auto-focus el input cuando se abre
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      open={open}
      onOpenChange={handleOpenChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          position="popper"
          sideOffset={5}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (inputRef.current?.contains(target)) {
              e.preventDefault();
            }
          }}
        >
          <div 
            className="w-full p-2 border-b" 
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.preventDefault()}
          >
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // Asegurar que el input mantiene el foco
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  // Prevenir que el Select maneje las teclas
                  if (e.key !== 'Escape' && e.key !== 'Enter') {
                    e.stopPropagation();
                  }
                  // Si es Escape, cerrar el select
                  if (e.key === 'Escape') {
                    setOpen(false);
                  }
                }}
                onFocus={() => {
                  // Mantener el foco en el input
                  inputRef.current?.focus();
                }}
                className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <SelectPrimitive.Viewport className="p-1 max-h-[300px] overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-4 w-4" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>
                  <span className="flex items-center gap-2">
                    {option.renderLabel ?? <span className="truncate">{option.label}</span>}
                  </span>
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))
            )}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
};

