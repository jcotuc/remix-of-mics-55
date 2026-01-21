import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Truck, User, Package, MapPin, CheckCircle2, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatFechaLarga } from "@/utils/dateFormatters";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

interface Incidente extends IncidenteDB {
  cliente?: {
    nombre: string;
    celular: string | null;
    telefono_principal: string | null;
    direccion: string | null;
  } | null;
}

export default function WaterspiderEntrega() {
  const { incidenteId } = useParams<{ incidenteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [incidente, setIncidente] = useState<Incidente | null>(null);
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!incidenteId) return;

      try {
        // Fetch incident
        const { data: incData, error: incError } = await supabase
          .from("incidentes")
          .select(`
            *,
            clientes:cliente_id(nombre, celular, telefono_principal, direccion)
          `)
          .eq("id", parseInt(incidenteId))
          .single();

        if (incError) throw incError;
        
        if (!incData) {
          toast.error("Incidente no encontrado");
          navigate("/taller/waterspider");
          return;
        }

        if (incData.estado !== "EN_REPARACION" && incData.estado !== "REPARADO") {
          toast.error("Este incidente no está en estado válido para entrega");
          navigate("/taller/waterspider");
          return;
        }

        const formattedIncidente: Incidente = {
          ...incData,
          cliente: (incData as any).clientes as Incidente['cliente'],
        };

        setIncidente(formattedIncidente);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Error al cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [incidenteId, navigate]);

  const handleConfirmarEntrega = async () => {
    if (!incidente) return;

    setSubmitting(true);
    try {
      // Determine new status based on quiere_envio
      const nuevoEstado = incidente.quiere_envio 
        ? "EN_ENTREGA" 
        : "LISTO_PARA_ENTREGA";

      // Update incident estado
      const fechaActual = new Date().toISOString();
      const logEntry = `[${format(new Date(), "dd/MM/yyyy HH:mm")}] Waterspider: Entregado a ${incidente.quiere_envio ? 'Logística' : 'Mostrador'}${observaciones ? ` - ${observaciones}` : ''}`;
      
      const currentObs = incidente.observaciones || "";
      const newObs = currentObs ? `${currentObs}\n${logEntry}` : logEntry;

      const { error } = await supabase
        .from("incidentes")
        .update({ 
          estado: nuevoEstado,
          observaciones: newObs,
          updated_at: fechaActual,
        })
        .eq("id", incidente.id);

      if (error) throw error;

      toast.success(
        `Incidente ${incidente.codigo} entregado a ${incidente.quiere_envio ? 'Logística' : 'Mostrador'}`,
        { duration: 4000 }
      );
      
      navigate("/taller/waterspider");
    } catch (error) {
      console.error("Error updating incident:", error);
      toast.error("Error al confirmar la entrega");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!incidente) return null;

  const destino = incidente.quiere_envio ? "Logística" : "Mostrador";
  const colorDestino = incidente.quiere_envio ? "orange" : "blue";

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/taller/waterspider")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Confirmar Entrega - {incidente.codigo}
          </h1>
          <p className="text-muted-foreground">
            Confirma la entrega de la máquina al área correspondiente
          </p>
        </div>
      </div>

      {/* Destination Banner */}
      <Card className={`border-2 ${colorDestino === 'blue' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'}`}>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-4">
            {colorDestino === 'blue' ? (
              <User className="h-12 w-12 text-blue-500" />
            ) : (
              <Truck className="h-12 w-12 text-orange-500" />
            )}
            <div className="text-center">
              <p className={`text-sm font-medium ${colorDestino === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                Destino de Entrega
              </p>
              <p className={`text-3xl font-bold ${colorDestino === 'blue' ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                {destino}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Incident Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Información del Incidente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Código</p>
                <p className="font-medium">{incidente.codigo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Producto</p>
                <p className="font-medium">#{incidente.producto_id}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Descripción del Problema</p>
              <p className="text-sm mt-1">{incidente.descripcion_problema || "Sin descripción"}</p>
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Actualizado el {incidente.updated_at ? formatFechaLarga(incidente.updated_at) : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium">{incidente.cliente?.nombre || `Cliente #${incidente.cliente_id}`}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              {incidente.cliente?.celular && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{incidente.cliente.celular}</span>
                </div>
              )}
              {incidente.cliente?.telefono_principal && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{incidente.cliente.telefono_principal}</span>
                </div>
              )}
            </div>
            {incidente.cliente?.direccion && (
              <>
                <Separator />
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{incidente.cliente.direccion}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Observations */}
      <Card>
        <CardHeader>
          <CardTitle>Observaciones (Opcional)</CardTitle>
          <CardDescription>
            Agrega cualquier observación relevante sobre la entrega
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ej: Máquina en buenas condiciones, entregada en área de recepción..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-end">
        <Button
          variant="outline"
          onClick={() => navigate("/taller/waterspider")}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirmarEntrega}
          disabled={submitting}
          className={`gap-2 ${colorDestino === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}
        >
          {submitting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Procesando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Confirmar Entrega a {destino}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
