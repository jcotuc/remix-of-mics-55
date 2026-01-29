/**
 * PreguntaCard - Individual question card with large SI/NO/NO_APLICA buttons
 */

import { cn } from "@/lib/utils";
import { Check, X, Minus } from "lucide-react";
import type { PreguntaAuditoria } from "./types";

interface PreguntaCardProps {
  pregunta: PreguntaAuditoria;
  respuesta: string | null;
  onRespuestaChange: (respuesta: string) => void;
  numero: number;
  total: number;
}

export function PreguntaCard({
  pregunta,
  respuesta,
  onRespuestaChange,
  numero,
  total,
}: PreguntaCardProps) {
  const opciones = pregunta.opciones as string[];

  const getButtonStyles = (opcion: string, isSelected: boolean) => {
    const baseStyles = "flex-1 py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 border-2";
    
    if (isSelected) {
      switch (opcion) {
        case "SI":
          return cn(baseStyles, "bg-green-500 border-green-500 text-white shadow-lg");
        case "NO":
          return cn(baseStyles, "bg-red-500 border-red-500 text-white shadow-lg");
        case "NO_APLICA":
          return cn(baseStyles, "bg-muted border-muted-foreground/50 text-foreground shadow-lg");
        default:
          return cn(baseStyles, "bg-primary border-primary text-primary-foreground shadow-lg");
      }
    }

    return cn(baseStyles, "bg-background border-border hover:border-primary/50 hover:bg-accent text-foreground");
  };

  const getIcon = (opcion: string) => {
    switch (opcion) {
      case "SI":
        return <Check className="h-5 w-5" />;
      case "NO":
        return <X className="h-5 w-5" />;
      case "NO_APLICA":
        return <Minus className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const formatOpcion = (opcion: string) => {
    switch (opcion) {
      case "SI":
        return "SÍ";
      case "NO":
        return "NO";
      case "NO_APLICA":
        return "N/A";
      default:
        return opcion;
    }
  };

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
        <span>Pregunta {numero} de {total}</span>
        <span className="font-mono">{pregunta.codigo}</span>
      </div>

      {/* Question text */}
      <div className="mb-6">
        <h3 className="text-lg font-medium leading-relaxed text-foreground">
          {pregunta.texto}
        </h3>
        {pregunta.descripcion && (
          <p className="mt-2 text-sm text-muted-foreground">
            {pregunta.descripcion}
          </p>
        )}
      </div>

      {/* Answer buttons */}
      <div className="flex gap-3">
        {opciones.map((opcion) => (
          <button
            key={opcion}
            type="button"
            onClick={() => onRespuestaChange(opcion)}
            className={getButtonStyles(opcion, respuesta === opcion)}
          >
            {getIcon(opcion)}
            {formatOpcion(opcion)}
          </button>
        ))}
      </div>
    </div>
  );
}
