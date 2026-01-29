import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Copy } from "lucide-react";
import { toast } from "sonner";

type DireccionData = {
  id: number;
  direccion: string;
  es_principal: boolean | null;
};

type ClienteDireccionesProps = {
  direccionPrincipal?: string | null;
  ubicacion?: {
    municipio?: string | null;
    departamento?: string | null;
    pais?: string | null;
  };
  direcciones: DireccionData[];
};

function DireccionCard({ 
  direccion, 
  esPrincipal,
  ubicacion 
}: { 
  direccion: string; 
  esPrincipal?: boolean;
  ubicacion?: string;
}) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(direccion);
    toast.success("Dirección copiada");
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors group">
      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
        <MapPin className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {esPrincipal && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0">
              Principal
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium">{direccion}</p>
        {ubicacion && (
          <p className="text-xs text-muted-foreground mt-0.5">{ubicacion}</p>
        )}
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={copyToClipboard}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ClienteDirecciones({ direccionPrincipal, ubicacion, direcciones }: ClienteDireccionesProps) {
  const ubicacionStr = [ubicacion?.municipio, ubicacion?.departamento, ubicacion?.pais]
    .filter(Boolean)
    .join(", ");

  const hasDirecciones = direccionPrincipal || direcciones.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Direcciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasDirecciones ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Sin direcciones registradas
          </p>
        ) : (
          <div className="space-y-2">
            {direccionPrincipal && (
              <DireccionCard 
                direccion={direccionPrincipal} 
                esPrincipal 
                ubicacion={ubicacionStr || undefined}
              />
            )}
            {direcciones.map((dir) => (
              <DireccionCard 
                key={dir.id} 
                direccion={dir.direccion} 
                esPrincipal={dir.es_principal ?? false}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
