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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

interface Incidente {
  id: string;
  codigo: string;
  codigo_cliente: string;
  codigo_producto: string;
  ingresado_en_mostrador: boolean | null;
  updated_at: string;
  descripcion_problema: string;
  status: string;
}

interface Cliente {
  nombre: string;
  celular: string;
  telefono_principal: string | null;
  direccion: string | null;
}

export default function WaterspiderEntrega() {
  const { incidenteId } = useParams<{ incidenteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [incidente, setIncidente] = useState<Incidente | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!incidenteId) return;

      try {
        // Fetch incident
        const { data: incData, error: incError } = await supabase
          .from("incidentes")
          .select("id, codigo, codigo_cliente, codigo_producto, ingresado_en_mostrador, updated_at, descripcion_problema, status")
          .eq("id", incidenteId)
          .single();

        if (incError) throw incError;
        
        if (!incData) {
          toast.error("Incidente no encontrado");
          navigate("/taller/waterspider");
          return;
        }

        if (incData.status !== "Reparado") {
          toast.error("Este incidente ya no está en estado Reparado");
          navigate("/taller/waterspider");
          return;
        }

        setIncidente(incData);

        // Fetch client
        const { data: clienteData } = await supabase
          .from("clientes")
          .select("nombre, celular, telefono_principal, direccion")
          .eq("codigo", incData.codigo_cliente)
          .single();

        setCliente(clienteData);
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
      // Determine new status based on origin
      const nuevoStatus = incidente.ingresado_en_mostrador === true 
        ? "Pendiente entrega" 
        : "Logistica envio";

      // Update incident status - registrar fecha_reparacion si aún no existe
      const fechaActual = new Date().toISOString();
      const { error } = await supabase
        .from("incidentes")
        .update({ 
          status: nuevoStatus,
          updated_at: fechaActual,
          // Solo establecer fecha_reparacion si no existe (no sobrescribir)
          ...(nuevoStatus === "Pendiente entrega" || nuevoStatus === "Logistica envio" 
            ? {} // No modificar fecha_reparacion aquí, ya se estableció en diagnóstico
            : {})
        })
        .eq("id", incidente.id);

      if (error) throw error;

      // Log the action in observaciones - fetch current log first, then append
      const { data: currentInc } = await supabase
        .from("incidentes")
        .select("log_observaciones")
        .eq("id", incidente.id)
        .single();

      const logEntry = `[${format(new Date(), "dd/MM/yyyy HH:mm")}] Waterspider: Entregado a ${incidente.ingresado_en_mostrador ? 'Mostrador' : 'Logística'}${observaciones ? ` - ${observaciones}` : ''}`;
      const newLog = currentInc?.log_observaciones 
        ? `${currentInc.log_observaciones}\n${logEntry}` 
        : logEntry;
      
      await supabase
        .from("incidentes")
        .update({ log_observaciones: newLog })
        .eq("id", incidente.id);

      toast.success(
        `Incidente ${incidente.codigo} entregado a ${incidente.ingresado_en_mostrador ? 'Mostrador' : 'Logística'}`,
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

  const destino = incidente.ingresado_en_mostrador === true ? "Mostrador" : "Logística";
  const colorDestino = incidente.ingresado_en_mostrador === true ? "blue" : "orange";

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
                <p className="font-medium">{incidente.codigo_producto}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Descripción del Problema</p>
              <p className="text-sm mt-1">{incidente.descripcion_problema}</p>
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Reparado el {format(new Date(incidente.updated_at), "dd 'de' MMMM 'a las' HH:mm", { locale: es })}
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
              <p className="font-medium">{cliente?.nombre || incidente.codigo_cliente}</p>
              <p className="text-xs text-muted-foreground">{incidente.codigo_cliente}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              {cliente?.celular && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{cliente.celular}</span>
                </div>
              )}
              {cliente?.telefono_principal && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{cliente.telefono_principal}</span>
                </div>
              )}
            </div>
            {cliente?.direccion && (
              <>
                <Separator />
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{cliente.direccion}</span>
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
