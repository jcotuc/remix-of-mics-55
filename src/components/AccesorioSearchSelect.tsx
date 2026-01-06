import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Plus, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Accesorio {
  id: number;
  nombre: string;
}

interface AccesorioSearchSelectProps {
  label: string;
  accesorios: Accesorio[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  onAddNew: (nombre: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const AccesorioSearchSelect: React.FC<AccesorioSearchSelectProps> = ({
  label,
  accesorios,
  selected,
  onSelectionChange,
  onAddNew,
  disabled = false,
  className,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [animatingOut, setAnimatingOut] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter by search and exclude already selected items
  const filteredAccesorios = (searchTerm.trim()
    ? accesorios.filter((acc) =>
        acc.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : accesorios
  ).filter((acc) => !selected.includes(acc.nombre));

  const exactMatch = accesorios.some(
    (acc) => acc.nombre.toLowerCase() === searchTerm.toLowerCase()
  );

  const showAddOption = searchTerm.trim() && !exactMatch;

  const handleToggle = (nombre: string) => {
    if (selected.includes(nombre)) {
      onSelectionChange(selected.filter((s) => s !== nombre));
    } else {
      // Animate out before selecting
      setAnimatingOut((prev) => [...prev, nombre]);
      setTimeout(() => {
        onSelectionChange([...selected, nombre]);
        setAnimatingOut((prev) => prev.filter((n) => n !== nombre));
      }, 200);
    }
  };

  const handleRemove = (nombre: string) => {
    onSelectionChange(selected.filter((s) => s !== nombre));
  };

  const handleAddNew = async () => {
    if (!searchTerm.trim() || isAdding) return;
    setIsAdding(true);
    try {
      await onAddNew(searchTerm.trim());
      setSearchTerm('');
    } finally {
      setIsAdding(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn('space-y-2', className)}>
      {/* Header with label and buttons */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <div className="flex items-center gap-1">
          {showAddOption && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddNew}
              disabled={disabled || isAdding}
              className="h-7 px-2 text-primary hover:text-primary"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className="h-7 px-2"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
          </Button>
        </div>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar accesorio..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (e.target.value) setIsOpen(true);
          }}
          disabled={disabled}
          className="pl-9"
        />
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <div className="border rounded-md bg-popover shadow-md max-h-48 overflow-y-auto">
          {filteredAccesorios.length > 0 ? (
            filteredAccesorios.map((acc) => (
              <div
                key={acc.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer transition-all duration-200",
                  animatingOut.includes(acc.nombre) && "opacity-0 -translate-x-2 scale-95"
                )}
                onClick={() => handleToggle(acc.nombre)}
              >
                <Checkbox checked={false} onCheckedChange={() => handleToggle(acc.nombre)} />
                <span className="text-sm">{acc.nombre}</span>
              </div>
            ))
          ) : (
            !showAddOption && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No hay accesorios disponibles
              </div>
            )
          )}

          {/* Add new option */}
          {showAddOption && (
            <>
              {filteredAccesorios.length > 0 && <div className="border-t" />}
              <div
                className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer text-primary"
                onClick={handleAddNew}
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">
                  Agregar "{searchTerm}" como accesorio
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {selected.map((nombre) => (
            <Badge key={nombre} variant="secondary" className="gap-1 pr-1">
              {nombre}
              <button
                type="button"
                onClick={() => handleRemove(nombre)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
