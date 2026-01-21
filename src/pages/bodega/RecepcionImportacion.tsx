import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Package, ArrowLeft, Search, Check, AlertTriangle, MapPin, 
  History, Clock, Loader2, X, ChevronDown, ChevronUp, Scan
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatFechaLarga } from "@/utils/dateFormatters";
import { BarcodeScanner } from "@/components/bodega/BarcodeScanner";

type Importacion = {
  id: number;
  numero_embarque: string;
  origen: string;
  fecha_llegada: string;
  estado: string;
  notas: string | null;
};

type DetalleItem = {
  id: number;
  sku: string;
  descripcion: string;
  cantidad: number;
  cantidad_esperada: number;
  cantidad_recibida: number;
  estado: string;
  ubicacion_asignada: string | null;
};

type UbicacionHistorial = {
  ubicacion: string;
  fecha: string;
  stock: number;
  bodega: string | null;
};

type CodigoInfo = {
  detalle: DetalleItem | null;
  ubicacionActual: { ubicacion: string; stock: number; bodega: string | null } | null;
  historialUbicaciones: UbicacionHistorial[];
  ubicacionesDisponibles: string[];
};

export default function RecepcionImportacion() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [importacion, setImportacion] = useState<Importacion | null>(null);
  const [detalles, setDetalles] = useState<DetalleItem[]>([]);
  const [searchCode, setSearchCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [codigoInfo, setCodigoInfo] = useState<CodigoInfo | null>(null);
  const [cantidadRecibida, setCantidadRecibida] = useState("");
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState("");
  const [nuevaUbicacion, setNuevaUbicacion] = useState("");
  
  const [showPendientes, setShowPendientes] = useState(true);
  const [showRecibidos, setShowRecibidos] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (id) {
      fetchImportacion();
    }
  }, [id]);

  const fetchImportacion = async () => {
    try {
      setLoading(true);
      
      const { data: impData, error: impError } = await supabase
        .from("importaciones")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (impError) throw impError;
      setImportacion(impData as unknown as Importacion);

      const { data: detData, error: detError } = await supabase
        .from("importaciones_detalle")
        .select("*")
        .eq("importacion_id", Number(id))
        .order("estado", { ascending: true })
        .order("sku", { ascending: true });

      if (detError) throw detError;
      setDetalles((detData || []) as unknown as DetalleItem[]);

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar importación");
      navigate("/bodega/importacion");
    } finally {
      setLoading(false);
    }
  };

  const buscarCodigo = useCallback(async (codigo: string) => {
    if (!codigo.trim()) {
      setCodigoInfo(null);
      return;
    }

    setSearching(true);
    const codigoNormalizado = codigo.trim().toUpperCase();

    try {
      // 1. Find in detalles
      const detalle = detalles.find(d => 
        d.sku.toUpperCase() === codigoNormalizado || 
        d.sku.toUpperCase().includes(codigoNormalizado)
      );

      // 2. Get current location from inventario (only Zona 5)
      const { data: inventarioData } = await supabase
        .from("inventario")
        .select("ubicacion_legacy, cantidad, bodega, centros_servicio!inner(nombre)")
        .eq("codigo_repuesto", codigoNormalizado)
        .ilike("centros_servicio.nombre", "%zona 5%")
        .limit(1)
        .maybeSingle();

      const ubicacionActual = inventarioData ? {
        ubicacion: inventarioData.ubicacion_legacy || "",
        stock: inventarioData.cantidad || 0,
        bodega: inventarioData.bodega
      } : null;

      // 3. Get location history from movimientos
      const { data: movimientosData } = await (supabase as any)
        .from("movimientos_inventario")
        .select("ubicacion, created_at, stock_nuevo")
        .eq("repuesto_id", 0) // This needs proper lookup
        .not("ubicacion", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);

      const historialUbicaciones: UbicacionHistorial[] = (movimientosData || [])
        .filter(m => m.ubicacion)
        .map(m => ({
          ubicacion: m.ubicacion!,
          fecha: m.created_at,
          stock: m.stock_nuevo || 0,
          bodega: null
        }));

      // 4. Get available locations from Zona 5 centro
      const { data: ubicacionesData } = await supabase
        .from("inventario")
        .select("ubicacion_legacy, centro_servicio_id, centros_servicio!inner(nombre)")
        .ilike("centros_servicio.nombre", "%zona 5%")
        .not("ubicacion_legacy", "is", null)
        .order("ubicacion_legacy")
        .limit(50);

      // Get unique locations
      const ubicacionesSet = new Set<string>();
      (ubicacionesData || []).forEach(u => {
        if (u.ubicacion_legacy) ubicacionesSet.add(u.ubicacion_legacy);
      });

      setCodigoInfo({
        detalle: detalle || null,
        ubicacionActual,
        historialUbicaciones,
        ubicacionesDisponibles: Array.from(ubicacionesSet)
      });

      // Auto-fill quantity and location
      if (detalle) {
        setCantidadRecibida(detalle.cantidad_esperada.toString());
      } else {
        setCantidadRecibida("1"); // Default for new codes
      }
      if (ubicacionActual?.ubicacion) {
        setUbicacionSeleccionada(ubicacionActual.ubicacion);
      } else if (historialUbicaciones.length > 0) {
        setUbicacionSeleccionada(historialUbicaciones[0].ubicacion);
      } else {
        setUbicacionSeleccionada("");
      }

    } catch (error) {
      console.error("Error buscando código:", error);
      toast.error("Error al buscar código");
    } finally {
      setSearching(false);
    }
  }, [detalles]);

  const handleSearch = () => {
    buscarCodigo(searchCode);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleConfirmarRecepcion = async () => {
    const codigoSku = codigoInfo?.detalle?.sku || searchCode.trim().toUpperCase();
    
    if (!codigoSku) {
      toast.error("No hay código seleccionado");
      return;
    }

    const cantidad = parseInt(cantidadRecibida);
    if (isNaN(cantidad) || cantidad <= 0) {
      toast.error("Ingrese una cantidad válida mayor a 0");
      return;
    }

    const ubicacion = ubicacionSeleccionada || nuevaUbicacion;
    if (!ubicacion.trim()) {
      toast.error("Seleccione o ingrese una ubicación");
      return;
    }

    setSaving(true);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // If this is an existing detalle, update it
      if (codigoInfo?.detalle) {
        const cantidadEsperada = codigoInfo.detalle.cantidad_esperada;
        let estado = "recibido";
        if (cantidad === 0) estado = "faltante";
        else if (cantidad < cantidadEsperada) estado = "parcial";
        else if (cantidad > cantidadEsperada) estado = "excedente";

        await supabase
          .from("importaciones_detalle")
          .update({
            cantidad_recibida: cantidad,
            estado: estado,
            ubicacion_asignada: ubicacion.trim(),
            recibido_at: new Date().toISOString(),
            recibido_por: 1 // Default user
          })
          .eq("id", codigoInfo.detalle.id);
      } else {
        // Create a new detalle for this code
        await (supabase as any).from("importaciones_detalle").insert({
          importacion_id: Number(id),
          sku: codigoSku,
          descripcion: "",
          cantidad: cantidad,
          cantidad_esperada: cantidad,
          cantidad_recibida: cantidad,
          estado: "recibido",
          ubicacion_asignada: ubicacion.trim(),
          recibido_at: new Date().toISOString(),
          recibido_por: 1
        });
      }

      // Update inventory (add to existing or create)
      const { data: existingInv } = await supabase
        .from("inventario")
        .select("id, cantidad, centro_servicio_id, descripcion")
        .eq("codigo_repuesto", codigoSku)
        .limit(1)
        .maybeSingle();

      if (existingInv) {
        await supabase
          .from("inventario")
          .update({
            cantidad: existingInv.cantidad + cantidad,
            ubicacion_legacy: ubicacion.trim(),
            updated_at: new Date().toISOString()
          })
          .eq("id", existingInv.id);

        // Register movement
        await (supabase as any).from("movimientos_inventario").insert({
          repuesto_id: existingInv.id,
          tipo_movimiento: "ENTRADA",
          cantidad: cantidad,
          ubicacion: ubicacion.trim(),
          motivo: `Recepción importación ${importacion?.numero_embarque}`,
          referencia: String(importacion?.id),
          centro_servicio_id: existingInv.centro_servicio_id,
          stock_anterior: existingInv.cantidad,
          stock_nuevo: existingInv.cantidad + cantidad,
          created_by_id: 1
        });
      } else {
        // Get central centro
        const { data: centroCentral } = await (supabase as any)
          .from("centros_de_servicio")
          .select("id")
          .eq("es_central", true)
          .single();

        if (centroCentral) {
          await supabase.from("inventario").insert({
            codigo_repuesto: codigoSku,
            descripcion: codigoInfo?.detalle?.descripcion || "",
            cantidad: cantidad,
            ubicacion_legacy: ubicacion.trim(),
            centro_servicio_id: centroCentral.id,
            bodega: "Central"
          });

          // Register movement
          await (supabase as any).from("movimientos_inventario").insert({
            repuesto_id: 0, // New item
            tipo_movimiento: "ENTRADA",
            cantidad: cantidad,
            ubicacion: ubicacion.trim(),
            motivo: `Recepción importación ${importacion?.numero_embarque}`,
            referencia: String(importacion?.id),
            centro_servicio_id: centroCentral.id,
            stock_anterior: 0,
            stock_nuevo: cantidad,
            created_by_id: 1
          });
        }
      }

      toast.success(`${codigoSku} recibido correctamente`);

      // Clear form and refresh
      setSearchCode("");
      setCodigoInfo(null);
      setCantidadRecibida("");
      setUbicacionSeleccionada("");
      setNuevaUbicacion("");
      
      fetchImportacion();
      inputRef.current?.focus();

      // Update import status
      if (importacion?.estado === "pendiente") {
        await supabase
          .from("importaciones")
          .update({ estado: "en_recepcion" })
          .eq("id", Number(id));
      }

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al confirmar recepción");
    } finally {
      setSaving(false);
    }
  };

  const handleMarcarFaltante = async () => {
    if (!codigoInfo?.detalle) return;

    setSaving(true);
    try {
      await supabase
        .from("importaciones_detalle")
        .update({
          cantidad_recibida: 0,
          estado: "faltante",
          recibido_at: new Date().toISOString(),
          recibido_por: 1 // Default user
        })
        .eq("id", codigoInfo.detalle.id);

      toast.success(`${codigoInfo.detalle.sku} marcado como faltante`);
      
      setSearchCode("");
      setCodigoInfo(null);
      fetchImportacion();
      inputRef.current?.focus();

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al marcar faltante");
    } finally {
      setSaving(false);
    }
  };

  const handleScanResult = (code: string) => {
    setSearchCode(code);
    buscarCodigo(code);
  };

  const handleFinalizarImportacion = async () => {
    setSaving(true);
    try {
      await supabase
        .from("importaciones")
        .update({ 
          estado: "completado",
          updated_at: new Date().toISOString()
        })
        .eq("id", Number(id));

      toast.success("Importación finalizada correctamente");
      navigate("/bodega/importacion");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al finalizar importación");
    } finally {
      setSaving(false);
    }
  };

  const pendientes = detalles.filter(d => d.estado === "pendiente");
  const recibidos = detalles.filter(d => d.estado !== "pendiente");
  const progreso = detalles.length > 0 ? Math.round((recibidos.length / detalles.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/bodega/importacion")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Recibiendo: {importacion?.numero_embarque}
            </h1>
            <p className="text-muted-foreground">
              {importacion?.origen} • {detalles.length > 0 
                ? `${recibidos.length}/${detalles.length} códigos (${progreso}%)`
                : `${recibidos.length} códigos recibidos`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {detalles.length > 0 && (
            <div className="w-[200px]">
              <Progress value={progreso} className="h-3" />
            </div>
          )}
          <Button 
            onClick={handleFinalizarImportacion}
            disabled={recibidos.length === 0 || saving}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-2" />
            Finalizar Importación
          </Button>
        </div>
      </div>

      {/* Search Section */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Escanear o digitar código..."
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 text-lg h-12"
                autoFocus
              />
            </div>
            <Button onClick={() => setShowScanner(true)} variant="outline" size="icon" className="h-12 w-12">
              <Scan className="h-5 w-5" />
            </Button>
            <Button onClick={handleSearch} disabled={searching} className="h-12 px-6">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Codigo Info Panel */}
      {codigoInfo && (
        <Card className="border-2 border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl font-mono">
                  {codigoInfo.detalle?.sku || searchCode}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  {codigoInfo.detalle?.descripcion || "Código no encontrado en esta importación"}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setCodigoInfo(null); setSearchCode(""); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!codigoInfo.detalle && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <Package className="h-5 w-5" />
                  <span className="font-medium">Código nuevo - Se agregará a esta importación</span>
                </div>
              </div>
            )}

            {/* Cantidad - Show for both existing and new codes */}
            <div className="grid grid-cols-2 gap-4">
              {codigoInfo.detalle ? (
                <div className="space-y-2">
                  <Label>Cantidad Esperada</Label>
                  <div className="p-3 bg-muted rounded-lg font-bold text-xl text-center">
                    {codigoInfo.detalle.cantidad_esperada}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Código</Label>
                  <div className="p-3 bg-muted rounded-lg font-bold text-lg text-center font-mono">
                    {searchCode.toUpperCase()}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad Recibida</Label>
                <Input
                  id="cantidad"
                  type="number"
                  min="1"
                  value={cantidadRecibida}
                  onChange={(e) => setCantidadRecibida(e.target.value)}
                  className="text-xl font-bold text-center h-[52px]"
                />
              </div>
            </div>

            {/* Ubicación Actual */}
            {codigoInfo.ubicacionActual && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">Ubicación Actual</p>
                      <p className="text-lg font-mono font-bold text-green-900 dark:text-green-100">
                        {codigoInfo.ubicacionActual.ubicacion}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Stock actual: {codigoInfo.ubicacionActual.stock} unidades
                        {codigoInfo.ubicacionActual.bodega && ` • ${codigoInfo.ubicacionActual.bodega}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={ubicacionSeleccionada === codigoInfo.ubicacionActual.ubicacion ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUbicacionSeleccionada(codigoInfo.ubicacionActual!.ubicacion)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Usar esta
                  </Button>
                </div>
              </div>
            )}

            {/* Historial de Ubicaciones */}
            {codigoInfo.historialUbicaciones.length > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <History className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">Historial de Ubicaciones</span>
                </div>
                <div className="space-y-2">
                  {codigoInfo.historialUbicaciones.map((hist, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                      <div>
                        <span className="font-mono font-medium">{hist.ubicacion}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {formatFechaLarga(hist.fecha).slice(0, 12)}
                        </span>
                      </div>
                      <Button
                        variant={ubicacionSeleccionada === hist.ubicacion ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setUbicacionSeleccionada(hist.ubicacion)}
                      >
                        Usar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nueva Ubicación - Always show input option */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">
                  {!codigoInfo.ubicacionActual && codigoInfo.historialUbicaciones.length === 0 
                    ? "Ingresar ubicación" 
                    : "O ingresar otra ubicación"}
                </span>
              </div>
              <Input
                placeholder="T06.001.01"
                value={nuevaUbicacion}
                onChange={(e) => {
                  setNuevaUbicacion(e.target.value);
                  setUbicacionSeleccionada("");
                }}
              />
            </div>

            {/* Selected location display */}
            {(ubicacionSeleccionada || nuevaUbicacion) && (
              <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">Se guardará en:</span>
                <span className="font-mono font-bold">{ubicacionSeleccionada || nuevaUbicacion}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {codigoInfo.detalle && (
                <Button 
                  variant="destructive" 
                  onClick={handleMarcarFaltante}
                  disabled={saving}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Marcar Faltante
                </Button>
              )}
              <Button 
                onClick={handleConfirmarRecepcion}
                disabled={saving || (!ubicacionSeleccionada && !nuevaUbicacion)}
                className={codigoInfo.detalle ? "flex-[2]" : "flex-1"}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Confirmar Recepción
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lists */}
      <div className="grid gap-4">
        {/* Pendientes */}
        <Collapsible open={showPendientes} onOpenChange={setShowPendientes}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Códigos Pendientes ({pendientes.length})
                  </CardTitle>
                  {showPendientes ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendientes.map((item) => (
                        <TableRow 
                          key={item.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSearchCode(item.sku);
                            buscarCodigo(item.sku);
                          }}
                        >
                          <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{item.descripcion}</TableCell>
                          <TableCell className="text-right font-medium">{item.cantidad_esperada}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">Pendiente</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Recibidos */}
        <Collapsible open={showRecibidos} onOpenChange={setShowRecibidos}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    Códigos Recibidos ({recibidos.length})
                  </CardTitle>
                  {showRecibidos ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Esperado</TableHead>
                        <TableHead className="text-right">Recibido</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead className="text-right">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recibidos.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{item.descripcion}</TableCell>
                          <TableCell className="text-right">{item.cantidad_esperada}</TableCell>
                          <TableCell className="text-right font-medium">{item.cantidad_recibida}</TableCell>
                          <TableCell className="font-mono">{item.ubicacion_asignada}</TableCell>
                          <TableCell className="text-right">
                            {item.estado === "recibido" && <Badge className="bg-green-100 text-green-800">Recibido</Badge>}
                            {item.estado === "faltante" && <Badge variant="destructive">Faltante</Badge>}
                            {item.estado === "parcial" && <Badge className="bg-yellow-100 text-yellow-800">Parcial</Badge>}
                            {item.estado === "excedente" && <Badge className="bg-blue-100 text-blue-800">Excedente</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onScan={handleScanResult}
        title="Escanear Código"
        description="Escanee el código de barras del producto"
      />
    </div>
  );
}
