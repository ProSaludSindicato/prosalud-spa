import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export interface MultiSelectOption {
  value: string;
  label: string;
  email?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  maxDisplay?: number;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onSelectionChange,
  placeholder = "Seleccionar...",
  emptyText = "No hay opciones disponibles",
  className,
  disabled = false,
  maxDisplay = 2,
}) => {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onSelectionChange(newSelected);
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selected.filter((item) => item !== value));
  };

  const selectedOptions = options.filter((opt) => selected.includes(opt.value));
  const displayOptions = selectedOptions.slice(0, maxDisplay);
  const remainingCount = selectedOptions.length - maxDisplay;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-10 h-auto",
            !selected.length && "text-muted-foreground hover:text-foreground [&_span]:hover:text-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {displayOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="mr-1 mb-1"
                    onClick={(e) => handleRemove(option.value, e)}
                  >
                    {option.label}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRemove(option.value, e as any);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => handleRemove(option.value, e)}
                    >
                      <X className="h-3 w-3 text-red-500 hover:text-red-700 transition-colors" />
                    </button>
                  </Badge>
                ))}
                {remainingCount > 0 && (
                  <Badge variant="secondary" className="mr-1 mb-1">
                    +{remainingCount} más
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto">
          <div className="p-2">
            {options.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              <div className="space-y-2">
                {options.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors group/item"
                      onClick={() => handleToggle(option.value)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggle(option.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label
                        className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {option.label}
                        {option.email && (
                          <span className="text-xs text-muted-foreground ml-1 group-hover/item:text-accent-foreground">
                            ({option.email})
                          </span>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

