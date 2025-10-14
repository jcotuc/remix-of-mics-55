import { useState, useRef } from "react";
import { Search, PackageCheck, User, Calendar, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SignatureCanvasComponent, SignatureCanvasRef } from "@/components/SignatureCanvas";
import { StatusBadge } from "@/components/StatusBadge";
import type { Database } from "@/integrations/supabase/types";
import type { StatusIncidente } from "@/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];
type ClienteDB = Database['public']['Tables']['clientes']['Row'];

export default function EntregaMaquinas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [incidente, setIncidente] = useState<IncidenteDB | null>(null);
  const [cliente, setCliente] = useState<ClienteDB | null>(null);
  const [nombreRecibe, setNombreRecibe] = useState("");
  const [dpiRecibe, setDpiRecibe] = useState("");
  const signatureRef = useRef<SignatureCanvasRef>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Ingrese un código de incidente para buscar");
      return;
    }

    setSearching(true);
    try {
      // Buscar incidente por código
      const { data: incidenteData, error: incidenteError } = await supabase
        .from('incidentes')
        .select('*')
        .eq('codigo', searchTerm.toUpperCase())
        .single();

      if (incidenteError) throw incidenteError;

      if (!incidenteData) {
        toast.error("Incidente no encontrado");
        return;
      }

      // Verificar que esté en estado "Pendiente de entrega"
      if (incidenteData.status !== 'Reparado') {
        toast.error("Este incidente no está en estado 'Reparado' y listo para entrega");
        setIncidente(null);
        setCliente(null);
        return;
      }

      // Buscar información del cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('codigo', incidenteData.codigo_cliente)
        .single();

      if (clienteError) throw clienteError;

      setIncidente(incidenteData);
      setCliente(clienteData);
      toast.success("Incidente encontrado");
    } catch (error) {
      console.error('Error al buscar incidente:', error);
      toast.error("Error al buscar el incidente");
      setIncidente(null);
      setCliente(null);
    } finally {
      setSearching(false);
    }
  };

  const handleDeliver = async () => {
    if (!incidente) {
      toast.error("No hay incidente seleccionado");
      return;
    }

    if (!nombreRecibe.trim()) {
      toast.error("Ingrese el nombre de quien recibe");
      return;
    }

    if (!dpiRecibe.trim()) {
      toast.error("Ingrese el DPI/Identificación de quien recibe");
      return;
    }

    if (signatureRef.current?.isEmpty()) {
      toast.error("Se requiere la firma del cliente");
      return;
    }

    setDelivering(true);
    try {
      const firmaBase64 = signatureRef.current?.toDataURL();

      // Actualizar el incidente con la información de entrega
      const { error: updateError } = await supabase
        .from('incidentes')
        .update({
          status: 'Entregado' as StatusIncidente,
          confirmacion_cliente: {
            fecha_entrega: new Date().toISOString(),
            nombre_recibe: nombreRecibe,
            dpi_recibe: dpiRecibe,
            firma_base64: firmaBase64,
          }
        })
        .eq('id', incidente.id);

      if (updateError) throw updateError;

      toast.success("Entrega registrada exitosamente");
      
      // Limpiar formulario
      setIncidente(null);
      setCliente(null);
      setSearchTerm("");
      setNombreRecibe("");
      setDpiRecibe("");
      signatureRef.current?.clear();
    } catch (error) {
      console.error('Error al registrar entrega:', error);
      toast.error("Error al registrar la entrega");
    } finally {
      setDelivering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Entrega de Máquinas</h1>
        <p className="text-muted-foreground">
          Registre la entrega de máquinas reparadas con firma digital
        </p>
      </div>

      {/* Búsqueda de Incidente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Incidente
          </CardTitle>
          <CardDescription>
            Ingrese el código del incidente para buscar máquinas listas para entrega
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="INC-000001"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="uppercase"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Información del Incidente y Cliente */}
      {incidente && cliente && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5" />
                Información del Incidente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Código Incidente</Label>
                  <p className="text-lg font-semibold">{incidente.codigo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <div className="mt-1">
                    <StatusBadge status={incidente.status as StatusIncidente} />
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Código Producto</Label>
                  <p className="text-lg font-medium">{incidente.codigo_producto}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha Ingreso</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p>{new Date(incidente.fecha_ingreso).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-muted-foreground">Descripción del Problema</Label>
                <p className="mt-1">{incidente.descripcion_problema}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nombre</Label>
                  <p className="text-lg font-semibold">{cliente.nombre}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">NIT</Label>
                  <p className="text-lg font-medium">{cliente.nit}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Teléfono</Label>
                  <p>{cliente.celular}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Correo</Label>
                  <p>{cliente.correo || "No registrado"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulario de Entrega */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Registro de Entrega
              </CardTitle>
              <CardDescription>
                Complete la información de quien recibe la máquina y su firma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre-recibe">Nombre Completo de Quien Recibe *</Label>
                  <Input
                    id="nombre-recibe"
                    value={nombreRecibe}
                    onChange={(e) => setNombreRecibe(e.target.value)}
                    placeholder="Ej: Juan Pérez García"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dpi-recibe">DPI / Identificación *</Label>
                  <Input
                    id="dpi-recibe"
                    value={dpiRecibe}
                    onChange={(e) => setDpiRecibe(e.target.value)}
                    placeholder="Ej: 1234567890101"
                  />
                </div>
              </div>

              <SignatureCanvasComponent ref={signatureRef} />

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIncidente(null);
                    setCliente(null);
                    setSearchTerm("");
                    setNombreRecibe("");
                    setDpiRecibe("");
                    signatureRef.current?.clear();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDeliver}
                  disabled={delivering}
                  className="min-w-32"
                >
                  {delivering ? "Registrando..." : "Confirmar Entrega"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
