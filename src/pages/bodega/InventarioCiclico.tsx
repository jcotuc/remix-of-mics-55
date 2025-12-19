import { useState, useEffect } from "react";
import { Calendar, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function InventarioCiclico() {
  const [centroSeleccionado, setCentroSeleccionado] = useState("");
  const [centrosServicio, setCentrosServicio] = useState<any[]>([]);
  const [conteos, setConteos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCentrosServicio();
    fetchConteos();
  }, []);

  const fetchCentrosServicio = async () => {
    const { data, error } = await supabase
      .from("centros_servicio")
      .select("*")
      .eq("activo", true);
    if (!error) setCentrosServicio(data || []);
  };

  const fetchConteos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventario_ciclico")
        .select("*")
        .order("fecha_inicio", { ascending: false })
        .limit(20);

      if (error) throw error;
      setConteos(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const iniciarConteo = async (ubicacion: string) => {
    if (!centroSeleccionado || !ubicacion) {
      toast.error("Seleccione centro y ubicación");
      return;
    }

    try {
      // Obtener items del inventario en esa ubicación
      const { data: items, error: itemsError } = await supabase
        .from("inventario")
        .select("*")
        .eq("centro_servicio_id", centroSeleccionado)
        .ilike("ubicacion", `%${ubicacion}%`);

      if (itemsError) throw itemsError;

      if (!items || items.length === 0) {
        toast.error("No hay items en esa ubicación");
        return;
      }

      // Crear conteo
      const { data: conteo, error: conteoError } = await supabase
        .from("inventario_ciclico")
        .insert({
          centro_servicio_id: centroSeleccionado,
          ubicacion: ubicacion,
          numero_conteo: `IC-${Date.now()}`,
          estado: "en_proceso"
        })
        .select()
        .single();

      if (conteoError) throw conteoError;

      // Crear detalles
      const detalles = items.map(item => ({
        inventario_id: conteo.id,
        codigo_repuesto: item.codigo_repuesto,
        descripcion: item.descripcion,
        cantidad_sistema: item.cantidad
      }));

      const { error: detallesError } = await supabase
        .from("inventario_ciclico_detalle")
        .insert(detalles);

      if (detallesError) throw detallesError;

      toast.success("Conteo iniciado");
      fetchConteos();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al iniciar conteo");
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          Inventario Cíclico
        </h1>
        <p className="text-muted-foreground mt-2">
          Conteos periódicos de inventario por ubicación
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo Conteo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Centro de Servicio</Label>
              <Select value={centroSeleccionado} onValueChange={setCentroSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {centrosServicio.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ubicación</Label>
              <div className="flex gap-2">
                <Input id="ubicacion" placeholder="Ej: A1, B2..." />
                <Button onClick={() => {
                  const ubicacion = (document.getElementById("ubicacion") as HTMLInputElement)?.value;
                  iniciarConteo(ubicacion);
                }}>
                  Iniciar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Conteos</CardTitle>
          <CardDescription>{conteos.length} conteos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {conteos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay conteos registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conteos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">{c.numero_conteo}</TableCell>
                    <TableCell>{c.ubicacion}</TableCell>
                    <TableCell>
                      <Badge variant={c.estado === "completado" ? "default" : "secondary"}>
                        {c.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(c.fecha_inicio).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
