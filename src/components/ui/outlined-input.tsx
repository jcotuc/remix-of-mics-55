import * as React from "react";
import { cn } from "@/lib/utils";

export interface OutlinedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

const OutlinedInput = React.forwardRef<HTMLInputElement, OutlinedInputProps>(
  ({ className, label, error, icon, type, id, ...props }, ref) => {
    const inputId = id || `outlined-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const [internalValue, setInternalValue] = React.useState(
      props.defaultValue?.toString() || props.value?.toString() || ''
    );
    
    // Sync with controlled value
    React.useEffect(() => {
      if (props.value !== undefined) {
        setInternalValue(props.value.toString());
      }
    }, [props.value]);

    const hasValue = internalValue !== '';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      props.onChange?.(e);
    };

    return (
      <div className="relative w-full">
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
              {icon}
            </div>
          )}
          <input
            type={type}
            id={inputId}
            className={cn(
              "peer w-full h-14 px-4 pt-5 pb-2 text-sm bg-transparent rounded-lg border-2 outline-none transition-all duration-200",
              "focus:ring-0",
              "placeholder-transparent",
              icon && "pl-10",
              error && "border-destructive focus:border-destructive",
              // Required empty = orange, filled = gray, not required = default
              props.required && !hasValue ? "border-orange-400 focus:border-orange-500" : 
              hasValue ? "border-muted-foreground/40 focus:border-muted-foreground/60" : "border-input focus:border-primary",
              className
            )}
            placeholder=" "
            ref={ref}
            {...props}
            onChange={handleChange}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "absolute bg-background px-1 transition-all duration-200 pointer-events-none",
              hasValue ? "text-xs top-0 -translate-y-1/2 text-muted-foreground" : "text-base top-1/2 -translate-y-1/2",
              !hasValue && props.required ? "text-orange-500" : !hasValue ? "text-muted-foreground" : "",
              hasValue ? "peer-focus:text-muted-foreground" : props.required ? "peer-focus:text-orange-500" : "peer-focus:text-primary",
              "peer-focus:text-xs peer-focus:top-0 peer-focus:-translate-y-1/2",
              icon ? "left-10 peer-focus:left-3" : "left-3",
              error && "peer-focus:text-destructive"
            )}
          >
            {label}
          </label>
        </div>
        {error && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

OutlinedInput.displayName = "OutlinedInput";

export interface OutlinedTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

const OutlinedTextarea = React.forwardRef<HTMLTextAreaElement, OutlinedTextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || `outlined-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const hasValue = props.value !== undefined && props.value !== '';

    return (
      <div className="relative w-full">
        <div className="relative">
          <textarea
            id={textareaId}
            className={cn(
              "peer w-full min-h-[120px] px-4 pt-6 pb-3 text-sm bg-transparent rounded-lg border-2 outline-none transition-all duration-200 resize-none",
              "focus:ring-0",
              "placeholder-transparent",
              error && "border-destructive focus:border-destructive",
              // Required empty = orange, filled = gray, not required = default
              props.required && !hasValue ? "border-orange-400 focus:border-orange-500" : 
              hasValue ? "border-muted-foreground/40 focus:border-muted-foreground/60" : "border-input focus:border-primary",
              className
            )}
            placeholder=" "
            ref={ref}
            {...props}
          />
          <label
            htmlFor={textareaId}
            className={cn(
              "absolute left-3 bg-background px-1 transition-all duration-200 pointer-events-none",
              "peer-placeholder-shown:text-base peer-placeholder-shown:top-4",
              hasValue ? "peer-focus:text-muted-foreground" : props.required ? "peer-focus:text-orange-500" : "peer-focus:text-primary",
              "peer-focus:text-xs peer-focus:top-0 peer-focus:-translate-y-1/2",
              hasValue && "text-xs top-0 -translate-y-1/2 text-muted-foreground",
              !hasValue && "text-base top-4",
              !hasValue && props.required ? "text-orange-500" : !hasValue ? "text-muted-foreground" : "",
              error && "peer-focus:text-destructive"
            )}
          >
            {label}
          </label>
        </div>
        {error && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

OutlinedTextarea.displayName = "OutlinedTextarea";

export interface OutlinedSelectProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

const OutlinedSelect = React.forwardRef<HTMLDivElement, OutlinedSelectProps>(
  ({ label, value, onValueChange, options, placeholder, required, disabled, error, className }, ref) => {
    const hasValue = value !== undefined && value !== '';

    return (
      <div ref={ref} className="relative w-full">
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            disabled={disabled}
            className={cn(
              "peer w-full h-14 px-4 pt-5 pb-2 text-sm bg-transparent rounded-lg border-2 outline-none transition-all duration-200 appearance-none cursor-pointer",
              "focus:ring-0",
              error && "border-destructive focus:border-destructive",
              // Required empty = orange, filled = gray, not required = default
              required && !hasValue ? "border-orange-400 focus:border-orange-500" : 
              hasValue ? "border-muted-foreground/40 focus:border-muted-foreground/60" : "border-input focus:border-primary",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
          >
            <option value="" disabled>{placeholder || `Seleccione ${label.toLowerCase()}`}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label
            className={cn(
              "absolute left-3 bg-background px-1 transition-all duration-200 pointer-events-none",
              "text-xs top-0 -translate-y-1/2",
              hasValue ? "text-muted-foreground" : required ? "text-orange-500" : "text-muted-foreground",
              error && "text-destructive"
            )}
          >
            {label}
          </label>
          {/* Dropdown arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

OutlinedSelect.displayName = "OutlinedSelect";

export { OutlinedInput, OutlinedTextarea, OutlinedSelect };
