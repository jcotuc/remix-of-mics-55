import { cn } from "@/lib/utils";
import type { TipoTareaWS } from "@/types/waterspider";

interface ZoneCounterProps {
  tipo: TipoTareaWS;
  count: number;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const ZONE_CONFIG: Record<TipoTareaWS, { bg: string; border: string; text: string; activeBg: string }> = {
  mostrador: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    activeBg: "bg-blue-100 ring-2 ring-blue-500",
  },
  logistica: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    activeBg: "bg-orange-100 ring-2 ring-orange-500",
  },
  repuesto: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    activeBg: "bg-green-100 ring-2 ring-green-500",
  },
  depuracion: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    activeBg: "bg-red-100 ring-2 ring-red-500",
  },
};

export function ZoneCounter({ tipo, count, label, isActive, onClick }: ZoneCounterProps) {
  const config = ZONE_CONFIG[tipo];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer min-w-[120px]",
        config.border,
        isActive ? config.activeBg : config.bg,
        "hover:shadow-md"
      )}
    >
      <span className={cn("text-3xl font-bold", config.text)}>{count}</span>
      <span className={cn("text-sm font-medium mt-1", config.text)}>{label}</span>
    </button>
  );
}
