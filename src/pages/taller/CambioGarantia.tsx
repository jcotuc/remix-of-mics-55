import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, CheckCircle2, AlertTriangle, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database["public"]["Tables"]["incidentes"]["Row"];
type ProductoDB = Database["public"]["Tables"]["productos"]["Row"];
type ClienteDB = Database["public"]["Tables"]["clientes"]["Row"];

interface StockInfo {
  centro_servicio_id: number;
  centro_nombre: string;
  cantidad: number;
}

const FAMILIA_HERRAMIENTA_MANUAL = 130;

export default function CambioGarantia() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [incidente, setIncidente] = useState<IncidenteDB | null>(null);
  const [cliente, setCliente] = useState<ClienteDB | null>(null);
  const [productoOriginal, setProductoOriginal] = useState<ProductoDB | null>(null);
  const [stockDisponible, setStockDisponible] = useState<StockInfo[]>([]);
  const [hayStock, setHayStock] = useState(false);
  
  // Para seleccionar producto alternativo
  const [mostrarAlternativos, setMostrarAlternativos] = useState(false);
  const [productosAlternativos, setProductosAlternativos] = useState<(ProductoDB & { esSugerido?: boolean })[]>([]);
  const [searchProducto, setSearchProducto] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoDB | null>(null);
  
  // Stock del producto alternativo seleccionado
  const [verificandoStockAlternativo, setVerificandoStockAlternativo] = useState(false);
  const [stockAlternativo, setStockAlternativo] = useState<StockInfo[]>([]);
  const [hayStockAlternativo, setHayStockAlternativo] = useState<boolean | null>(null);

  useEffect(() => {
    if (id) {
      fetchIncidenteData();
    }
  }, [id]);

  const fetchIncidenteData = async () => {
    setLoading(true);
    try {
      // Obtener incidente
      const { data: incData, error: incError } = await supabase
        .from("incidentes")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (incError) throw incError;
      setIncidente(incData);

      // Obtener cliente
      const { data: clienteData } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", incData.cliente_id)
        .maybeSingle();
      
      setCliente(clienteData);

      // Obtener producto original
      if (incData.producto_id) {
        const { data: prodData, error: prodError } = await supabase
          .from("productos")
          .select("*")
          .eq("id", incData.producto_id)
          .single();

        if (!prodError && prodData) {
          setProductoOriginal(prodData);
          // Verificar stock disponible del producto original
          await verificarStock(prodData.codigo, incData.centro_de_servicio_id);
        }
      }

    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar el incidente");
    } finally {
      setLoading(false);
    }
  };

  const verificarStock = async (codigoProducto: string, centroActual: number) => {
    try {
      // Buscar en inventario el código del producto
      const { data: stockData, error } = await supabase
        .from("inventario")
        .select(`
          centro_servicio_id,
          cantidad
        `)
        .eq("codigo_repuesto", codigoProducto)
        .gt("cantidad", 0);

      if (error) throw error;

      // Get centro names
      const centroIds = (stockData || []).map(s => s.centro_servicio_id);
      const { data: centrosData } = await supabase
        .from("centros_de_servicio")
        .select("id, nombre")
        .in("id", centroIds);

      const centrosMap = new Map((centrosData || []).map(c => [c.id, c.nombre]));

      const stockInfo: StockInfo[] = (stockData || []).map((s) => ({
        centro_servicio_id: s.centro_servicio_id,
        centro_nombre: centrosMap.get(s.centro_servicio_id) || "Desconocido",
        cantidad: s.cantidad
      }));

      setStockDisponible(stockInfo);
      setHayStock(stockInfo.length > 0);

      // Si no hay stock, cargar productos alternativos automáticamente
      if (stockInfo.length === 0) {
        setMostrarAlternativos(true);
        await fetchProductosAlternativos();
      }

    } catch (error) {
      console.error("Error verificando stock:", error);
    }
  };

  const fetchProductosAlternativos = async () => {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("activo", true)
        .neq("familia_padre_id", FAMILIA_HERRAMIENTA_MANUAL)
        .order("descripcion");

      if (error) throw error;

      const familiaOriginal = productoOriginal?.familia_padre_id;

      const productosOrdenados = (data || []).map(p => {
        const esSugerido = familiaOriginal && p.familia_padre_id === familiaOriginal;
        return { ...p, esSugerido: esSugerido || false };
      }).sort((a, b) => {
        if (a.esSugerido && !b.esSugerido) return -1;
        if (!a.esSugerido && b.esSugerido) return 1;
        return (a.descripcion || "").localeCompare(b.descripcion || "");
      });

      setProductosAlternativos(productosOrdenados);
    } catch (error) {
      console.error("Error cargando productos alternativos:", error);
    }
  };

  const verificarStockAlternativo = async (codigoProducto: string) => {
    setVerificandoStockAlternativo(true);
    setHayStockAlternativo(null);
    setStockAlternativo([]);
    
    try {
      const { data: stockData, error } = await supabase
        .from("inventario")
        .select("centro_servicio_id, cantidad")
        .eq("codigo_repuesto", codigoProducto)
        .gt("cantidad", 0);

      if (error) throw error;

      const centroIds = (stockData || []).map(s => s.centro_servicio_id);
      const { data: centrosData } = await supabase
        .from("centros_de_servicio")
        .select("id, nombre")
        .in("id", centroIds);

      const centrosMap = new Map((centrosData || []).map(c => [c.id, c.nombre]));

      const stockInfo: StockInfo[] = (stockData || []).map((s) => ({
        centro_servicio_id: s.centro_servicio_id,
        centro_nombre: centrosMap.get(s.centro_servicio_id) || "Desconocido",
        cantidad: s.cantidad
      }));

      setStockAlternativo(stockInfo);
      setHayStockAlternativo(stockInfo.length > 0);

    } catch (error) {
      console.error("Error verificando stock alternativo:", error);
      setHayStockAlternativo(false);
    } finally {
      setVerificandoStockAlternativo(false);
    }
  };

  const handleSeleccionarProducto = async (producto: ProductoDB) => {
    setProductoSeleccionado(producto);
    await verificarStockAlternativo(producto.codigo);
  };

  const handleConfirmarCambio = async (codigoProducto: string) => {
    setSaving(true);
    try {
      // Obtener usuario y perfil
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: profile } = await (supabase as any)
        .from("usuarios")
        .select("id, nombre, apellido, centro_de_servicio_id")
        .eq("auth_uid", user.id)
        .maybeSingle();

      const tecnicoNombre = profile ? `${profile.nombre} ${profile.apellido}` : user.email || "Técnico";

      // Crear solicitud de cambio para aprobación usando la tabla correcta
      const { error: solicitudError } = await (supabase as any)
        .from("pedidos_bodega_central")
        .insert({
          incidente_id: Number(id),
          solicitado_por_id: profile?.id || 0,
          centro_servicio_id: incidente?.centro_de_servicio_id || profile?.centro_de_servicio_id || 0,
          estado: "pendiente_jt"
        });

      if (solicitudError) throw solicitudError;

      // Actualizar incidente a estado pendiente de aprobación
      const { error } = await supabase
        .from("incidentes")
        .update({
          estado: "CAMBIO_POR_GARANTIA" as const,
          updated_at: new Date().toISOString()
        })
        .eq("id", Number(id));

      if (error) throw error;

      toast.success("Solicitud de cambio por garantía enviada para aprobación");
      navigate("/taller/mis-asignaciones");

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar el cambio");
    } finally {
      setSaving(false);
    }
  };

  const productosFiltrados = productosAlternativos.filter(p =>
    (p.descripcion || "").toLowerCase().includes(searchProducto.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchProducto.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Determinar si se puede continuar (hay stock del producto original O del alternativo seleccionado)
  const puedeConfirmar = hayStock || (productoSeleccionado && hayStockAlternativo === true);
  const productoParaCambio = productoSeleccionado && hayStockAlternativo === true 
    ? productoSeleccionado.codigo 
    : hayStock 
      ? productoOriginal?.codigo 
      : null;

  return (
    <div className="container mx-auto p-6 max-w-4xl pb-24">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Cambio por Garantía</h1>
      </div>

      {/* Info del incidente */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Incidente {incidente?.codigo}</CardTitle>
          <CardDescription>
            Cliente: {cliente?.nombre} ({cliente?.codigo})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Package className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">{productoOriginal?.descripcion}</p>
              <p className="text-sm text-muted-foreground">
                Código: {productoOriginal?.codigo}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verificación de stock */}
      <Card className={`mb-6 ${hayStock ? "border-green-500" : "border-amber-500"}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hayStock ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-green-600">Producto Disponible</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="text-amber-600">Sin Stock del Producto Original</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hayStock ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Hay unidades disponibles del producto original para realizar el cambio:
              </p>
              <div className="space-y-2">
                {stockDisponible.map((stock, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="font-medium">{stock.centro_nombre}</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {stock.cantidad} unidad{stock.cantidad !== 1 ? "es" : ""}
                    </Badge>
                  </div>
                ))}
              </div>
              
              <Button 
                variant="outline"
                onClick={() => {
                  setMostrarAlternativos(true);
                  fetchProductosAlternativos();
                }}
                className="w-full"
              >
                Seleccionar Otro Producto
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No hay unidades disponibles del producto <strong>{productoOriginal?.descripcion}</strong>. 
                Selecciona un producto alternativo para el cambio:
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selección de producto alternativo */}
      {mostrarAlternativos && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seleccionar Producto Alternativo</CardTitle>
            <CardDescription>
              {productoSeleccionado 
                ? `Seleccionado: ${productoSeleccionado.descripcion}`
                : "Busca y selecciona el producto para el cambio"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o descripción..."
                value={searchProducto}
                onChange={(e) => setSearchProducto(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
              {productosFiltrados.slice(0, 50).map((producto) => (
                <div
                  key={producto.id}
                  onClick={() => handleSeleccionarProducto(producto)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    productoSeleccionado?.id === producto.id
                      ? "bg-primary text-primary-foreground"
                      : producto.esSugerido
                        ? "bg-green-50 hover:bg-green-100 border border-green-200"
                        : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${productoSeleccionado?.id === producto.id ? "text-primary-foreground" : ""}`}>
                        {producto.descripcion}
                      </p>
                      <p className={`text-sm ${productoSeleccionado?.id === producto.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {producto.codigo}
                      </p>
                    </div>
                    {producto.esSugerido && productoSeleccionado?.id !== producto.id && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Misma familia
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {productosFiltrados.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No se encontraron productos
                </p>
              )}
              {productosFiltrados.length > 50 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  Mostrando 50 de {productosFiltrados.length} resultados. Refina tu búsqueda.
                </p>
              )}
            </div>

            {/* Stock del producto alternativo seleccionado */}
            {productoSeleccionado && (
              <Card className={`mt-4 ${hayStockAlternativo === true ? "border-green-500" : hayStockAlternativo === false ? "border-amber-500" : ""}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    Disponibilidad: {productoSeleccionado.descripcion}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {verificandoStockAlternativo ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verificando disponibilidad...</span>
                    </div>
                  ) : hayStockAlternativo === true ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">¡Hay stock disponible!</span>
                      </div>
                      {stockAlternativo.map((stock, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                          <span className="font-medium">{stock.centro_nombre}</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {stock.cantidad} unidad{stock.cantidad !== 1 ? "es" : ""}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : hayStockAlternativo === false ? (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Sin stock disponible de este producto</span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Botón de confirmación */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="container mx-auto max-w-4xl">
          <Button
            className="w-full"
            size="lg"
            disabled={!puedeConfirmar || saving}
            onClick={() => productoParaCambio && handleConfirmarCambio(productoParaCambio)}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Cambio por Garantía
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
