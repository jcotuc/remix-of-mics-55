import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectDropdownProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

const MultiSelectDropdown = React.forwardRef<HTMLDivElement, MultiSelectDropdownProps>(
  ({ label, options, selected, onSelectionChange, placeholder = "Seleccionar...", className }, ref) => {
    const [open, setOpen] = React.useState(false);

    const handleToggle = (value: string) => {
      if (selected.includes(value)) {
        onSelectionChange(selected.filter(s => s !== value));
      } else {
        onSelectionChange([...selected, value]);
      }
    };

    const handleRemove = (value: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectionChange(selected.filter(s => s !== value));
    };

    const hasValue = selected.length > 0;

    return (
      <div ref={ref} className={cn("relative w-full", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full min-h-[56px] px-4 pt-5 pb-2 text-left bg-transparent rounded-lg border-2 border-input outline-none transition-all duration-200 flex items-center gap-2 flex-wrap",
                "hover:border-muted-foreground/50 focus:border-primary",
                hasValue && "border-muted-foreground/40"
              )}
            >
              {hasValue ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selected.map(value => {
                    const option = options.find(o => o.value === value);
                    return (
                      <Badge
                        key={value}
                        variant="secondary"
                        className="text-xs font-normal gap-1 pr-1"
                      >
                        {option?.label || value}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
                          onClick={(e) => handleRemove(value, e)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">{placeholder}</span>
              )}
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground ml-auto shrink-0 transition-transform duration-200",
                open && "rotate-180"
              )} />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[var(--radix-popover-trigger-width)] p-0 bg-background border shadow-lg z-50" 
            align="start"
            sideOffset={4}
          >
            <div className="max-h-60 overflow-y-auto">
              {options.length > 0 ? (
                options.map(option => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleToggle(option.value)}
                      className={cn(
                        "w-full px-3 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-muted/50 transition-colors",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "bg-primary border-primary" : "border-input"
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <span className={cn(isSelected && "font-medium")}>{option.label}</span>
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                  No hay opciones disponibles
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Floating label */}
        <label
          className={cn(
            "absolute left-3 bg-background px-1 transition-all duration-200 pointer-events-none text-muted-foreground",
            "text-xs top-0 -translate-y-1/2"
          )}
        >
          {label}
        </label>
      </div>
    );
  }
);

MultiSelectDropdown.displayName = "MultiSelectDropdown";

export { MultiSelectDropdown };
