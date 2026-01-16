import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Search, 
  Plus, 
  X, 
  ChevronRight, 
  Users, 
  Link2, 
  BarChart3, 
  Star,
  FileDown,
  FileUp,
  Loader2,
  UserPlus
} from "lucide-react";

interface RepuestoRelacion {
  id: number;
  Código: string;
  Descripción: string;
  Padre: number | null;
}

interface PadreConHijos {
  id: number;
  codigo: string;
  descripcion: string;
  cantidadHijos: number;
}

interface KPIs {
  totalPadres: number;
  totalHijos: number;
  promedioHijos: number;
  topPadre: { codigo: string; cantidad: number } | null;
}

export default function GestionRelacionesRepuestos() {
  // Estado para KPIs
  const [kpis, setKpis] = useState<KPIs>({
    totalPadres: 0,
    totalHijos: 0,
    promedioHijos: 0,
    topPadre: null
  });

  // Estado para columna izquierda (top padres)
  const [topPadres, setTopPadres] = useState<PadreConHijos[]>([]);
  const [loadingPadres, setLoadingPadres] = useState(true);

  // Estado para búsqueda global
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<RepuestoRelacion[]>([]);
  const [searching, setSearching] = useState(false);

  // Estado para columna central (explorador)
  const [selectedPadre, setSelectedPadre] = useState<RepuestoRelacion | null>(null);
  const [hijosDelPadre, setHijosDelPadre] = useState<RepuestoRelacion[]>([]);
  const [loadingHijos, setLoadingHijos] = useState(false);
  const [filtroHijos, setFiltroHijos] = useState("");
  const [nuevoHijoCodigo, setNuevoHijoCodigo] = useState("");
  const [buscandoHijo, setBuscandoHijo] = useState(false);

  // Estado para columna derecha (crear/editar)
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [tipoNuevo, setTipoNuevo] = useState<"padre" | "hijo">("padre");
  const [padreSeleccionadoParaHijo, setPadreSeleccionadoParaHijo] = useState<RepuestoRelacion | null>(null);
  const [buscandoPadre, setBuscandoPadre] = useState("");
  const [resultadosBusquedaPadre, setResultadosBusquedaPadre] = useState<RepuestoRelacion[]>([]);
  const [creando, setCreando] = useState(false);

  // Cargar KPIs y top padres al montar
  useEffect(() => {
    fetchKPIs();
    fetchTopPadres();
  }, []);

  // Buscar cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.length >= 2) {
      buscarGlobal();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  // Buscar padre para asignar a nuevo hijo
  useEffect(() => {
    if (buscandoPadre.length >= 2 && tipoNuevo === "hijo") {
      buscarPadreParaAsignar();
    } else {
      setResultadosBusquedaPadre([]);
    }
  }, [buscandoPadre]);

  const fetchKPIs = async () => {
    try {
      // Total padres
      const { count: totalPadres } = await supabase
        .from('repuestos_relaciones')
        .select('*', { count: 'exact', head: true })
        .is('Padre', null);

      // Total hijos
      const { count: totalHijos } = await supabase
        .from('repuestos_relaciones')
        .select('*', { count: 'exact', head: true })
        .not('Padre', 'is', null);

      // Top padre (el que más hijos tiene)
      const { data: padres } = await supabase
        .from('repuestos_relaciones')
        .select('*')
        .is('Padre', null);

      let topPadre: { codigo: string; cantidad: number } | null = null;

      if (padres && padres.length > 0) {
        // Contar hijos de cada padre
        const counts = await Promise.all(
          padres.slice(0, 50).map(async (p: RepuestoRelacion) => {
            const { count } = await supabase
              .from('repuestos_relaciones')
              .select('*', { count: 'exact', head: true })
              .eq('Padre', p.id);
            return { codigo: p.Código, cantidad: count || 0 };
          })
        );
        topPadre = counts.reduce((max, curr) => 
          curr.cantidad > (max?.cantidad || 0) ? curr : max
        , null as { codigo: string; cantidad: number } | null);
      }

      const total = totalPadres || 0;
      const hijos = totalHijos || 0;

      setKpis({
        totalPadres: total,
        totalHijos: hijos,
        promedioHijos: total > 0 ? parseFloat((hijos / total).toFixed(1)) : 0,
        topPadre
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  };

  const fetchTopPadres = async () => {
    setLoadingPadres(true);
    try {
      // Obtener todos los padres
      const { data: padres } = await supabase
        .from('repuestos_relaciones')
        .select('*')
        .is('Padre', null)
        .order('Código');

      if (!padres) {
        setTopPadres([]);
        return;
      }

      // Contar hijos de cada padre (limitado a primeros 100 para performance)
      const padresConConteo = await Promise.all(
        (padres as RepuestoRelacion[]).slice(0, 100).map(async (p) => {
          const { count } = await supabase
            .from('repuestos_relaciones')
            .select('*', { count: 'exact', head: true })
            .eq('Padre', p.id);
          return {
            id: p.id,
            codigo: p.Código,
            descripcion: p.Descripción,
            cantidadHijos: count || 0
          };
        })
      );

      // Ordenar por cantidad de hijos descendente y tomar top 30
      padresConConteo.sort((a, b) => b.cantidadHijos - a.cantidadHijos);
      setTopPadres(padresConConteo.slice(0, 30));
    } catch (error) {
      console.error('Error fetching top padres:', error);
    } finally {
      setLoadingPadres(false);
    }
  };

  const buscarGlobal = async () => {
    setSearching(true);
    try {
      const { data } = await supabase
        .from('repuestos_relaciones')
        .select('*')
        .or(`Código.ilike.%${searchTerm}%,Descripción.ilike.%${searchTerm}%`)
        .limit(20);
      
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error buscando:', error);
    } finally {
      setSearching(false);
    }
  };

  const buscarPadreParaAsignar = async () => {
    try {
      const { data } = await supabase
        .from('repuestos_relaciones')
        .select('*')
        .is('Padre', null)
        .or(`Código.ilike.%${buscandoPadre}%,Descripción.ilike.%${buscandoPadre}%`)
        .limit(10);
      
      setResultadosBusquedaPadre(data || []);
    } catch (error) {
      console.error('Error buscando padre:', error);
    }
  };

  const seleccionarPadre = async (padre: RepuestoRelacion | PadreConHijos) => {
    const padreData: RepuestoRelacion = 'Código' in padre 
      ? padre as RepuestoRelacion
      : { id: padre.id, Código: padre.codigo, Descripción: padre.descripcion, Padre: null };
    
    setSelectedPadre(padreData);
    setLoadingHijos(true);
    setFiltroHijos("");

    try {
      const { data } = await supabase
        .from('repuestos_relaciones')
        .select('*')
        .eq('Padre', padreData.id)
        .order('Código');
      
      setHijosDelPadre(data || []);
    } catch (error) {
      console.error('Error cargando hijos:', error);
    } finally {
      setLoadingHijos(false);
    }
  };

  const navegarAPadreDesdeHijo = async (hijo: RepuestoRelacion) => {
    if (!hijo.Padre) {
      // Es un padre, seleccionarlo directamente
      seleccionarPadre(hijo);
      return;
    }

    // Buscar el padre
    const { data } = await supabase
      .from('repuestos_relaciones')
      .select('*')
      .eq('id', hijo.Padre)
      .single();

    if (data) {
      seleccionarPadre(data);
    }
  };

  const quitarHijo = async (hijoId: number) => {
    try {
      const { error } = await supabase
        .from('repuestos_relaciones')
        .update({ Padre: null })
        .eq('id', hijoId);

      if (error) throw error;

      setHijosDelPadre(prev => prev.filter(h => h.id !== hijoId));
      toast.success("Hijo desvinculado correctamente");
      fetchKPIs();
      fetchTopPadres();
    } catch (error) {
      console.error('Error quitando hijo:', error);
      toast.error("Error al desvincular hijo");
    }
  };

  const agregarHijoExistente = async () => {
    if (!selectedPadre || !nuevoHijoCodigo.trim()) return;

    setBuscandoHijo(true);
    try {
      // Buscar el código
      const { data: hijo } = await supabase
        .from('repuestos_relaciones')
        .select('*')
        .eq('Código', nuevoHijoCodigo.trim())
        .single();

      if (!hijo) {
        toast.error("Código no encontrado");
        return;
      }

      if (hijo.id === selectedPadre.id) {
        toast.error("No puedes asignar un código como hijo de sí mismo");
        return;
      }

      if (hijo.Padre === selectedPadre.id) {
        toast.error("Este código ya es hijo de este padre");
        return;
      }

      // Actualizar el padre
      const { error } = await supabase
        .from('repuestos_relaciones')
        .update({ Padre: selectedPadre.id })
        .eq('id', hijo.id);

      if (error) throw error;

      setHijosDelPadre(prev => [...prev, { ...hijo, Padre: selectedPadre.id }]);
      setNuevoHijoCodigo("");
      toast.success("Hijo agregado correctamente");
      fetchKPIs();
      fetchTopPadres();
    } catch (error) {
      console.error('Error agregando hijo:', error);
      toast.error("Error al agregar hijo");
    } finally {
      setBuscandoHijo(false);
    }
  };

  const crearNuevoCodigo = async () => {
    if (!nuevoCodigo.trim() || !nuevaDescripcion.trim()) {
      toast.error("Código y descripción son requeridos");
      return;
    }

    if (tipoNuevo === "hijo" && !padreSeleccionadoParaHijo) {
      toast.error("Debes seleccionar un padre para el nuevo hijo");
      return;
    }

    setCreando(true);
    try {
      // Verificar que el código no exista
      const { data: existe } = await supabase
        .from('repuestos_relaciones')
        .select('id')
        .eq('Código', nuevoCodigo.trim())
        .single();

      if (existe) {
        toast.error("Este código ya existe");
        return;
      }

      // Get max ID for the new record
      const { data: maxIdData } = await supabase
        .from('repuestos_relaciones')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

      const nextId = (maxIdData?.[0]?.id || 0) + 1;

      const { error } = await supabase
        .from('repuestos_relaciones')
        .insert({
          id: nextId,
          Código: nuevoCodigo.trim(),
          Descripción: nuevaDescripcion.trim(),
          Padre: tipoNuevo === "hijo" ? padreSeleccionadoParaHijo?.id : null
        });

      if (error) throw error;

      toast.success(`${tipoNuevo === "padre" ? "Padre" : "Hijo"} creado correctamente`);
      setNuevoCodigo("");
      setNuevaDescripcion("");
      setPadreSeleccionadoParaHijo(null);
      setBuscandoPadre("");
      fetchKPIs();
      fetchTopPadres();

      // Si creamos un hijo y tenemos seleccionado ese padre, refrescar
      if (tipoNuevo === "hijo" && selectedPadre?.id === padreSeleccionadoParaHijo?.id) {
        seleccionarPadre(selectedPadre);
      }
    } catch (error) {
      console.error('Error creando código:', error);
      toast.error("Error al crear código");
    } finally {
      setCreando(false);
    }
  };

  const hijosFiltrados = useMemo(() => {
    if (!filtroHijos) return hijosDelPadre;
    return hijosDelPadre.filter(h => 
      h.Código.toLowerCase().includes(filtroHijos.toLowerCase()) ||
      h.Descripción.toLowerCase().includes(filtroHijos.toLowerCase())
    );
  }, [hijosDelPadre, filtroHijos]);

  return (
    <div className="space-y-6 p-6">
      {/* Header con KPIs */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            Gestión de Equivalencias
          </h1>
          <p className="text-muted-foreground">
            Administración de relaciones padre-hijo de repuestos
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.totalPadres.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Padres</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <Link2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.totalHijos.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Hijos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.promedioHijos}</p>
                <p className="text-xs text-muted-foreground">Promedio hijos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-bold truncate">{kpis.topPadre?.codigo || "-"}</p>
                <p className="text-xs text-muted-foreground">
                  Top: {kpis.topPadre?.cantidad || 0} hijos
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Barra de búsqueda y acciones */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <FileUp className="h-4 w-4 mr-2" />
                Importar Padres
              </Button>
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Resultados de búsqueda */}
          {searchResults.length > 0 && (
            <div className="mt-4 border rounded-lg divide-y max-h-48 overflow-auto">
              {searchResults.map((r) => (
                <div 
                  key={r.id}
                  className="p-2 hover:bg-muted/50 cursor-pointer flex items-center justify-between"
                  onClick={() => navegarAPadreDesdeHijo(r)}
                >
                  <div>
                    <span className="font-mono font-medium">{r.Código}</span>
                    <span className="text-muted-foreground ml-2 text-sm">{r.Descripción}</span>
                  </div>
                  <Badge variant={r.Padre ? "secondary" : "default"}>
                    {r.Padre ? "Hijo" : "Padre"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Layout de 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna 1: Top Padres */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Top Padres
              <Badge variant="secondary" className="ml-auto">
                {topPadres.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {loadingPadres ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="divide-y">
                  {topPadres.map((padre) => (
                    <div
                      key={padre.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedPadre?.id === padre.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                      }`}
                      onClick={() => seleccionarPadre(padre)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono font-bold text-sm">{padre.codigo}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {padre.descripcion}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                      <div className="mt-2 pt-2 border-t flex items-center">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {padre.cantidadHijos} hijos
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Columna 2: Explorador */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-500" />
              Explorador
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {selectedPadre ? (
              <div className="space-y-4">
                {/* Info del padre seleccionado */}
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="font-mono font-bold text-lg">{selectedPadre.Código}</p>
                  <p className="text-sm text-muted-foreground">{selectedPadre.Descripción}</p>
                </div>

                {/* Filtro de hijos */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar hijos..."
                    value={filtroHijos}
                    onChange={(e) => setFiltroHijos(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Lista de hijos */}
                <div>
                  <p className="text-sm font-medium mb-2">
                    Hijos ({hijosFiltrados.length})
                  </p>
                  <ScrollArea className="h-[280px] border rounded-lg">
                    {loadingHijos ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : hijosFiltrados.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <Users className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Sin hijos</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {hijosFiltrados.map((hijo) => (
                          <div 
                            key={hijo.id}
                            className="p-2 flex items-center justify-between hover:bg-muted/50 group"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-mono text-sm">{hijo.Código}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {hijo.Descripción}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={() => quitarHijo(hijo.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Agregar hijo existente */}
                <div className="pt-2 border-t space-y-2">
                  <p className="text-sm font-medium">Agregar hijo existente</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Código del hijo..."
                      value={nuevoHijoCodigo}
                      onChange={(e) => setNuevoHijoCodigo(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      size="sm" 
                      onClick={agregarHijoExistente}
                      disabled={buscandoHijo || !nuevoHijoCodigo.trim()}
                    >
                      {buscandoHijo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <Users className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Selecciona un padre para explorar</p>
                <p className="text-xs mt-1">o usa la búsqueda global</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columna 3: Crear nuevo */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-500" />
              Nuevo Código
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                placeholder="Ej: 95781"
                value={nuevoCodigo}
                onChange={(e) => setNuevoCodigo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                placeholder="Ej: Balero De Bolas 608"
                value={nuevaDescripcion}
                onChange={(e) => setNuevaDescripcion(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Tipo</Label>
              <RadioGroup 
                value={tipoNuevo} 
                onValueChange={(v) => {
                  setTipoNuevo(v as "padre" | "hijo");
                  setPadreSeleccionadoParaHijo(null);
                  setBuscandoPadre("");
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="padre" id="padre" />
                  <Label htmlFor="padre" className="font-normal cursor-pointer">
                    Padre (sin padre asignado)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hijo" id="hijo" />
                  <Label htmlFor="hijo" className="font-normal cursor-pointer">
                    Hijo (con padre asignado)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {tipoNuevo === "hijo" && (
              <div className="space-y-2">
                <Label>Padre</Label>
                {padreSeleccionadoParaHijo ? (
                  <div className="p-2 bg-muted rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm font-medium">
                        {padreSeleccionadoParaHijo.Código}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {padreSeleccionadoParaHijo.Descripción}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setPadreSeleccionadoParaHijo(null);
                        setBuscandoPadre("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Buscar padre..."
                      value={buscandoPadre}
                      onChange={(e) => setBuscandoPadre(e.target.value)}
                    />
                    {resultadosBusquedaPadre.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-32 overflow-auto">
                        {resultadosBusquedaPadre.map((p) => (
                          <div
                            key={p.id}
                            className="p-2 hover:bg-muted/50 cursor-pointer text-sm"
                            onClick={() => {
                              setPadreSeleccionadoParaHijo(p);
                              setBuscandoPadre("");
                              setResultadosBusquedaPadre([]);
                            }}
                          >
                            <span className="font-mono font-medium">{p.Código}</span>
                            <span className="text-muted-foreground ml-2">{p.Descripción}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Vista previa */}
            {(nuevoCodigo || nuevaDescripcion) && (
              <div className="p-3 border rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Vista previa:</p>
                <p className="font-mono font-medium">{nuevoCodigo || "(código)"}</p>
                <p className="text-sm text-muted-foreground">{nuevaDescripcion || "(descripción)"}</p>
                {tipoNuevo === "hijo" && padreSeleccionadoParaHijo && (
                  <p className="text-xs mt-1">
                    → Padre: <span className="font-mono">{padreSeleccionadoParaHijo.Código}</span>
                  </p>
                )}
              </div>
            )}

            <Button 
              className="w-full" 
              onClick={crearNuevoCodigo}
              disabled={creando || !nuevoCodigo.trim() || !nuevaDescripcion.trim() || (tipoNuevo === "hijo" && !padreSeleccionadoParaHijo)}
            >
              {creando ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Crear {tipoNuevo === "padre" ? "Padre" : "Hijo"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
