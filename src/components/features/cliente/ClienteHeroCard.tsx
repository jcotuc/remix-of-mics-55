import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Plus, Phone, TrendingUp, TrendingDown, Minus } from "lucide-react";

type ClienteHeroCardProps = {
  nombre: string;
  codigo: string;
  activo: boolean;
  stats: {
    total: number;
    activos: number;
    finalizados: number;
  };
  telefono?: string | null;
  onEdit?: () => void;
  onNuevoIncidente?: () => void;
};

function getInitials(nombre: string): string {
  const words = nombre.split(" ").filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return nombre.slice(0, 2).toUpperCase();
}

export function ClienteHeroCard({
  nombre,
  codigo,
  activo,
  stats,
  telefono,
  onEdit,
  onNuevoIncidente,
}: ClienteHeroCardProps) {
  const trend = stats.activos > stats.finalizados ? "up" : stats.activos < stats.finalizados ? "down" : "neutral";

  return (
    <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar y datos principales */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-primary/30">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg sm:text-xl font-bold">
                {getInitials(nombre)}
              </AvatarFallback>
            </Avatar>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {nombre}
                </h1>
                <Badge variant={activo ? "default" : "secondary"} className="shrink-0">
                  {activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <p className="text-muted-foreground font-mono text-sm">{codigo}</p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {telefono && (
              <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
                <a href={`tel:${telefono}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Llamar
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 sm:flex-none">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button size="sm" onClick={onNuevoIncidente} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              Incidente
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
          </div>
          <div className="text-center border-x border-border/50">
            <div className="flex items-center justify-center gap-1">
              <p className="text-2xl sm:text-3xl font-bold text-amber-600">{stats.activos}</p>
              {trend === "up" && <TrendingUp className="h-4 w-4 text-amber-600" />}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Activos</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{stats.finalizados}</p>
              {trend === "down" && <TrendingDown className="h-4 w-4 text-emerald-600" />}
              {trend === "neutral" && <Minus className="h-4 w-4 text-muted-foreground" />}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Finalizados</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
