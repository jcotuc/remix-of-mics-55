import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, CheckCircle2, AlertTriangle, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Producto {
  codigo: string;
  descripcion: string;
  clave: string;
  familia_padre_id: number | null;
}

interface StockInfo {
  centro_servicio_id: string;
  centro_nombre: string;
  cantidad: number;
}

const FAMILIA_HERRAMIENTA_MANUAL = 130;

export default function CambioGarantia() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [incidente, setIncidente] = useState<any>(null);
  const [productoOriginal, setProductoOriginal] = useState<Producto | null>(null);
  const [stockDisponible, setStockDisponible] = useState<StockInfo[]>([]);
  const [hayStock, setHayStock] = useState(false);
  
  // Para seleccionar producto alternativo
  const [mostrarAlternativos, setMostrarAlternativos] = useState(false);
  const [productosAlternativos, setProductosAlternativos] = useState<(Producto & { esSugerido?: boolean })[]>([]);
  const [searchProducto, setSearchProducto] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  
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
        .select("*, cliente:clientes!incidentes_codigo_cliente_fkey(*)")
        .eq("id", id)
        .single();

      if (incError) throw incError;
      setIncidente(incData);

      // Obtener producto original
      const { data: prodData, error: prodError } = await supabase
        .from("productos")
        .select("codigo, descripcion, clave, familia_padre_id")
        .eq("codigo", incData.codigo_producto)
        .single();

      if (prodError) throw prodError;
      setProductoOriginal(prodData);

      // Verificar stock disponible del producto original
      await verificarStock(prodData.codigo, incData.centro_servicio);

    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar el incidente");
    } finally {
      setLoading(false);
    }
  };

  const verificarStock = async (codigoProducto: string, centroActual: string) => {
    try {
      // Buscar en inventario el código del producto
      const { data: stockData, error } = await supabase
        .from("inventario")
        .select(`
          centro_servicio_id,
          cantidad,
          centro:centros_servicio!inventario_centro_servicio_id_fkey(nombre)
        `)
        .eq("codigo_repuesto", codigoProducto)
        .gt("cantidad", 0);

      if (error) throw error;

      const stockInfo: StockInfo[] = (stockData || []).map((s: any) => ({
        centro_servicio_id: s.centro_servicio_id,
        centro_nombre: s.centro?.nombre || "Desconocido",
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
        .select("codigo, descripcion, clave, familia_padre_id")
        .eq("descontinuado", false)
        .neq("familia_padre_id", FAMILIA_HERRAMIENTA_MANUAL)
        .order("descripcion");

      if (error) throw error;

      const familiaOriginal = incidente?.familia_padre_id || productoOriginal?.familia_padre_id;

      const productosOrdenados = (data || []).map(p => {
        const esSugerido = familiaOriginal && p.familia_padre_id === familiaOriginal;
        return { ...p, esSugerido: esSugerido || false };
      }).sort((a, b) => {
        if (a.esSugerido && !b.esSugerido) return -1;
        if (!a.esSugerido && b.esSugerido) return 1;
        return a.descripcion.localeCompare(b.descripcion);
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
        .select(`
          centro_servicio_id,
          cantidad,
          centro:centros_servicio!inventario_centro_servicio_id_fkey(nombre)
        `)
        .eq("codigo_repuesto", codigoProducto)
        .gt("cantidad", 0);

      if (error) throw error;

      const stockInfo: StockInfo[] = (stockData || []).map((s: any) => ({
        centro_servicio_id: s.centro_servicio_id,
        centro_nombre: s.centro?.nombre || "Desconocido",
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

  const handleSeleccionarProducto = async (producto: Producto) => {
    setProductoSeleccionado(producto);
    await verificarStockAlternativo(producto.codigo);
  };

  const handleConfirmarCambio = async (codigoProducto: string) => {
    setSaving(true);
    try {
      // Actualizar incidente con el producto para cambio
      const { error } = await supabase
        .from("incidentes")
        .update({
          status: "Cambio por garantia",
          producto_sugerido_alternativo: codigoProducto !== productoOriginal?.codigo ? codigoProducto : null,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Cambio por garantía confirmado");
      navigate("/taller/mis-asignaciones");

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar el cambio");
    } finally {
      setSaving(false);
    }
  };

  const productosFiltrados = productosAlternativos.filter(p =>
    p.descripcion.toLowerCase().includes(searchProducto.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchProducto.toLowerCase()) ||
    p.clave.toLowerCase().includes(searchProducto.toLowerCase())
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
        <h1 className="text-2xl font-bold">Cambio por Garantía</h1>
      </div>

      {/* Info del incidente */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Incidente {incidente?.codigo}</CardTitle>
          <CardDescription>
            Cliente: {incidente?.cliente?.nombre} ({incidente?.codigo_cliente})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Package className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">{productoOriginal?.descripcion}</p>
              <p className="text-sm text-muted-foreground">
                Código: {productoOriginal?.codigo} | SKU: {incidente?.sku_maquina || "N/A"}
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
                placeholder="Buscar por código, descripción o clave..."
                value={searchProducto}
                onChange={(e) => setSearchProducto(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
              {productosFiltrados.slice(0, 50).map((producto) => (
                <div
                  key={producto.codigo}
                  onClick={() => handleSeleccionarProducto(producto)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    productoSeleccionado?.codigo === producto.codigo
                      ? "bg-primary text-primary-foreground"
                      : producto.esSugerido
                        ? "bg-green-50 hover:bg-green-100 border border-green-200"
                        : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${productoSeleccionado?.codigo === producto.codigo ? "text-primary-foreground" : ""}`}>
                        {producto.descripcion}
                      </p>
                      <p className={`text-sm ${productoSeleccionado?.codigo === producto.codigo ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {producto.codigo} | {producto.clave}
                      </p>
                    </div>
                    {producto.esSugerido && productoSeleccionado?.codigo !== producto.codigo && (
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
                      <div className="space-y-2">
                        {stockAlternativo.map((stock, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-green-50 rounded-lg border border-green-200">
                            <span className="text-sm">{stock.centro_nombre}</span>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {stock.cantidad} unidad{stock.cantidad !== 1 ? "es" : ""}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : hayStockAlternativo === false ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">Sin stock disponible</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Este producto no tiene unidades disponibles. Selecciona otro producto.
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Botones fijos en la parte inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-between gap-4 z-50">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Regresar
        </Button>
        <Button 
          className="flex-1"
          disabled={!puedeConfirmar || saving}
          onClick={() => productoParaCambio && handleConfirmarCambio(productoParaCambio)}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Continuar
        </Button>
      </div>
    </div>
  );
}
