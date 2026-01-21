import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  UserPlus,
  ArrowLeftRight,
  Shuffle
} from "lucide-react";

interface RepuestoRelacion {
  id: number;
  codigo: string;
  descripcion: string;
  padre_id: number | null;
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

interface Equivalencia {
  id: number;
  padre_id_1: number;
  padre_id_2: number;
  notas: string | null;
  created_at: string;
  padre1?: RepuestoRelacion;
  padre2?: RepuestoRelacion;
}

interface PadreConEquivalentes {
  id: number;
  codigo: string;
  descripcion: string;
  cantidadEquivalentes: number;
}

export default function GestionRelacionesRepuestos() {
  const [activeTab, setActiveTab] = useState<"padre-hijo" | "equivalentes">("padre-hijo");

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

  // ==================== ESTADOS PARA EQUIVALENTES ====================
  const [equivalentesKPIs, setEquivalentesKPIs] = useState({
    totalEquivalencias: 0,
    padresConEquivalentes: 0,
    promedioEquivalentes: 0
  });
  const [topPadresEquivalentes, setTopPadresEquivalentes] = useState<PadreConEquivalentes[]>([]);
  const [loadingEquivalentes, setLoadingEquivalentes] = useState(true);
  const [selectedPadreEquiv, setSelectedPadreEquiv] = useState<RepuestoRelacion | null>(null);
  const [equivalentesDelPadre, setEquivalentesDelPadre] = useState<RepuestoRelacion[]>([]);
  const [loadingEquivDelPadre, setLoadingEquivDelPadre] = useState(false);
  
  // Para agregar nuevo equivalente
  const [buscandoPadreEquiv1, setBuscandoPadreEquiv1] = useState("");
  const [buscandoPadreEquiv2, setBuscandoPadreEquiv2] = useState("");
  const [resultadosBusquedaEquiv1, setResultadosBusquedaEquiv1] = useState<RepuestoRelacion[]>([]);
  const [resultadosBusquedaEquiv2, setResultadosBusquedaEquiv2] = useState<RepuestoRelacion[]>([]);
  const [padre1Seleccionado, setPadre1Seleccionado] = useState<RepuestoRelacion | null>(null);
  const [padre2Seleccionado, setPadre2Seleccionado] = useState<RepuestoRelacion | null>(null);
  const [notasEquivalencia, setNotasEquivalencia] = useState("");
  const [creandoEquiv, setCreandoEquiv] = useState(false);

  // Cargar KPIs y top padres al montar
  useEffect(() => {
    fetchKPIs();
    fetchTopPadres();
  }, []);

  // Cargar datos de equivalentes cuando se cambia a esa pestaña
  useEffect(() => {
    if (activeTab === "equivalentes") {
      fetchEquivalentesKPIs();
      fetchTopPadresEquivalentes();
    }
  }, [activeTab]);

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

  // Buscar padres para equivalentes
  useEffect(() => {
    if (buscandoPadreEquiv1.length >= 2) {
      buscarPadreParaEquiv(buscandoPadreEquiv1, setResultadosBusquedaEquiv1);
    } else {
      setResultadosBusquedaEquiv1([]);
    }
  }, [buscandoPadreEquiv1]);

  useEffect(() => {
    if (buscandoPadreEquiv2.length >= 2) {
      buscarPadreParaEquiv(buscandoPadreEquiv2, setResultadosBusquedaEquiv2);
    } else {
      setResultadosBusquedaEquiv2([]);
    }
  }, [buscandoPadreEquiv2]);

  const fetchKPIs = async () => {
    try {
      // Usar casting para repuestos_relaciones que puede no estar en types
      const { count: totalPadres } = await (supabase as any)
        .from('repuestos_relaciones')
        .select('*', { count: 'exact', head: true })
        .is('padre_id', null);

      const { count: totalHijos } = await (supabase as any)
        .from('repuestos_relaciones')
        .select('*', { count: 'exact', head: true })
        .not('padre_id', 'is', null);

      const { data: padres } = await (supabase as any)
        .from('repuestos_relaciones')
        .select('*')
        .is('padre_id', null);

      let topPadre: { codigo: string; cantidad: number } | null = null;

      if (padres && padres.length > 0) {
        const counts = await Promise.all(
          (padres as any[]).slice(0, 50).map(async (p: any) => {
            const { count } = await (supabase as any)
              .from('repuestos_relaciones')
              .select('*', { count: 'exact', head: true })
              .eq('padre_id', p.id);
            return { codigo: p.codigo, cantidad: count || 0 };
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
      const { data: padres } = await (supabase as any)
        .from('repuestos_relaciones')
        .select('*')
        .is('padre_id', null)
        .order('codigo');

      if (!padres) {
        setTopPadres([]);
        return;
      }

      const padresConConteo = await Promise.all(
        (padres as any[]).slice(0, 100).map(async (p: any) => {
          const { count } = await (supabase as any)
            .from('repuestos_relaciones')
            .select('*', { count: 'exact', head: true })
            .eq('padre_id', p.id);
          return {
            id: p.id,
            codigo: p.codigo,
            descripcion: p.descripcion,
            cantidadHijos: count || 0
          };
        })
      );

      padresConConteo.sort((a, b) => b.cantidadHijos - a.cantidadHijos);
      setTopPadres(padresConConteo.slice(0, 30));
    } catch (error) {
      console.error('Error fetching top padres:', error);
    } finally {
      setLoadingPadres(false);
    }
  };

  // ==================== FUNCIONES PARA EQUIVALENTES ====================
  const fetchEquivalentesKPIs = async () => {
    try {
      const { count: totalEquivalencias } = await (supabase as any)
        .from('repuestos_equivalentes')
        .select('*', { count: 'exact', head: true });

      // Contar padres únicos que tienen al menos un equivalente
      const { data: equivs } = await (supabase as any)
        .from('repuestos_equivalentes')
        .select('padre_id_1, padre_id_2');

      const padresUnicos = new Set<number>();
      (equivs || []).forEach((e: any) => {
        padresUnicos.add(e.padre_id_1);
        padresUnicos.add(e.padre_id_2);
      });

      const total = totalEquivalencias || 0;
      const padresConEquiv = padresUnicos.size;

      setEquivalentesKPIs({
        totalEquivalencias: total,
        padresConEquivalentes: padresConEquiv,
        promedioEquivalentes: padresConEquiv > 0 ? parseFloat(((total * 2) / padresConEquiv).toFixed(1)) : 0
      });
    } catch (error) {
      console.error('Error fetching equivalentes KPIs:', error);
    }
  };

  const fetchTopPadresEquivalentes = async () => {
    setLoadingEquivalentes(true);
    try {
      const { data: equivs } = await (supabase as any)
        .from('repuestos_equivalentes')
        .select('padre_id_1, padre_id_2');

      if (!equivs || equivs.length === 0) {
        setTopPadresEquivalentes([]);
        setLoadingEquivalentes(false);
        return;
      }

      // Contar equivalentes por padre
      const conteoMap = new Map<number, number>();
      (equivs as any[]).forEach((e: any) => {
        conteoMap.set(e.padre_id_1, (conteoMap.get(e.padre_id_1) || 0) + 1);
        conteoMap.set(e.padre_id_2, (conteoMap.get(e.padre_id_2) || 0) + 1);
      });

      // Ordenar por cantidad
      const topIds = Array.from(conteoMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30);

      // Obtener datos de los padres
      const padreIds = topIds.map(([id]) => id);
      const { data: padres } = await (supabase as any)
        .from('repuestos_relaciones')
        .select('*')
        .in('id', padreIds);

      const result: PadreConEquivalentes[] = topIds.map(([id, cantidad]) => {
        const padre = (padres || []).find((p: any) => p.id === id);
        return {
          id,
          codigo: padre?.codigo || 'N/A',
          descripcion: padre?.descripcion || '',
          cantidadEquivalentes: cantidad
        };
      });

      setTopPadresEquivalentes(result);
    } catch (error) {
      console.error('Error fetching top padres equivalentes:', error);
    } finally {
      setLoadingEquivalentes(false);
    }
  };

  const seleccionarPadreEquiv = async (padre: RepuestoRelacion | PadreConEquivalentes) => {
    const padreData: RepuestoRelacion = 'codigo' in padre && 'padre_id' in padre
      ? padre as RepuestoRelacion
      : { id: padre.id, codigo: padre.codigo, descripcion: padre.descripcion, padre_id: null };
    
    setSelectedPadreEquiv(padreData);
    setLoadingEquivDelPadre(true);

    try {
      // Buscar equivalencias donde este padre participa
      const { data: equivs } = await (supabase as any)
        .from('repuestos_equivalentes')
        .select('*')
        .or(`padre_id_1.eq.${padreData.id},padre_id_2.eq.${padreData.id}`);

      if (!equivs || equivs.length === 0) {
        setEquivalentesDelPadre([]);
        setLoadingEquivDelPadre(false);
        return;
      }

      // Obtener los IDs de los otros padres
      const otrosIds = (equivs as any[]).map((e: any) => 
        e.padre_id_1 === padreData.id ? e.padre_id_2 : e.padre_id_1
      );

      const { data: padres } = await (supabase as any)
        .from('repuestos_relaciones')
        .select('*')
        .in('id', otrosIds);

      setEquivalentesDelPadre((padres || []) as RepuestoRelacion[]);
    } catch (error) {
      console.error('Error cargando equivalentes:', error);
    } finally {
      setLoadingEquivDelPadre(false);
    }
  };

  const buscarPadreParaEquiv = async (term: string, setter: (data: RepuestoRelacion[]) => void) => {
    try {
      const { data } = await (supabase as any)
        .from('repuestos_relaciones')
        .select('*')
        .is('padre_id', null)
        .or(`codigo.ilike.%${term}%,descripcion.ilike.%${term}%`)
        .limit(10);
      
      setter((data || []) as RepuestoRelacion[]);
    } catch (error) {
      console.error('Error buscando padre:', error);
    }
  };

  const crearEquivalencia = async () => {
    if (!padre1Seleccionado || !padre2Seleccionado) {
      toast.error("Debes seleccionar ambos padres");
      return;
    }

    if (padre1Seleccionado.id === padre2Seleccionado.id) {
      toast.error("No puedes crear una equivalencia con el mismo padre");
      return;
    }

    setCreandoEquiv(true);
    try {
      // Asegurar que padre_id_1 < padre_id_2
      const [id1, id2] = padre1Seleccionado.id < padre2Seleccionado.id 
        ? [padre1Seleccionado.id, padre2Seleccionado.id]
        : [padre2Seleccionado.id, padre1Seleccionado.id];

      // Verificar si ya existe
      const { data: existe } = await (supabase as any)
        .from('repuestos_equivalentes')
        .select('id')
        .eq('padre_id_1', id1)
        .eq('padre_id_2', id2)
        .single();

      if (existe) {
        toast.error("Esta equivalencia ya existe");
        return;
      }

      const { error } = await (supabase as any)
        .from('repuestos_equivalentes')
        .insert({
          padre_id_1: id1,
          padre_id_2: id2,
          notas: notasEquivalencia || null
        });

      if (error) throw error;

      toast.success("Equivalencia creada correctamente");
      setPadre1Seleccionado(null);
      setPadre2Seleccionado(null);
      setBuscandoPadreEquiv1("");
      setBuscandoPadreEquiv2("");
      setNotasEquivalencia("");
      fetchEquivalentesKPIs();
      fetchTopPadresEquivalentes();

      // Si tenemos un padre seleccionado, refrescar
      if (selectedPadreEquiv) {
        seleccionarPadreEquiv(selectedPadreEquiv);
      }
    } catch (error) {
      console.error('Error creando equivalencia:', error);
      toast.error("Error al crear equivalencia");
    } finally {
      setCreandoEquiv(false);
    }
  };

  const quitarEquivalencia = async (otroPadreId: number) => {
    if (!selectedPadreEquiv) return;

    try {
      const [id1, id2] = selectedPadreEquiv.id < otroPadreId 
        ? [selectedPadreEquiv.id, otroPadreId]
        : [otroPadreId, selectedPadreEquiv.id];

      const { error } = await (supabase as any)
        .from('repuestos_equivalentes')
        .delete()
        .eq('padre_id_1', id1)
        .eq('padre_id_2', id2);

      if (error) throw error;

      setEquivalentesDelPadre(prev => prev.filter(p => p.id !== otroPadreId));
      toast.success("Equivalencia eliminada");
      fetchEquivalentesKPIs();
      fetchTopPadresEquivalentes();
    } catch (error) {
      console.error('Error quitando equivalencia:', error);
      toast.error("Error al eliminar equivalencia");
    }
  };

  // ==================== FUNCIONES PADRE-HIJO (EXISTENTES) ====================
  const buscarGlobal = async () => {
    setSearching(true);
    try {
      const { data } = await (supabase as any)
        .from('repuestos_relaciones')
        .select('*')
        .or(`codigo.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%`)
        .limit(20);
      
      setSearchResults((data || []) as RepuestoRelacion[]);
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
      seleccionarPadre(hijo);
      return;
    }

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
      const { data: existe } = await supabase
        .from('repuestos_relaciones')
        .select('id')
        .eq('Código', nuevoCodigo.trim())
        .single();

      if (existe) {
        toast.error("Este código ya existe");
        return;
      }

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
      {/* Header con título */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Link2 className="h-6 w-6 text-primary" />
          Gestión de Equivalencias
        </h1>
        <p className="text-muted-foreground">
          Administración de relaciones padre-hijo y equivalentes entre repuestos
        </p>
      </div>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "padre-hijo" | "equivalentes")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="padre-hijo" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Padre-Hijo
          </TabsTrigger>
          <TabsTrigger value="equivalentes" className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Equivalentes
          </TabsTrigger>
        </TabsList>

        {/* ==================== TAB PADRE-HIJO ==================== */}
        <TabsContent value="padre-hijo" className="space-y-6 mt-6">
          {/* KPIs Padre-Hijo */}
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

          {/* Barra de búsqueda */}
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
                    Importar
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>

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

          {/* Layout 3 columnas */}
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
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="font-mono font-bold text-lg">{selectedPadre.Código}</p>
                      <p className="text-sm text-muted-foreground">{selectedPadre.Descripción}</p>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Filtrar hijos..."
                        value={filtroHijos}
                        onChange={(e) => setFiltroHijos(e.target.value)}
                        className="pl-10"
                      />
                    </div>

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
        </TabsContent>

        {/* ==================== TAB EQUIVALENTES ==================== */}
        <TabsContent value="equivalentes" className="space-y-6 mt-6">
          {/* KPIs Equivalentes */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-cyan-100 dark:bg-cyan-900">
                  <ArrowLeftRight className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{equivalentesKPIs.totalEquivalencias.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Equivalencias</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{equivalentesKPIs.padresConEquivalentes.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Padres con equivalentes</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-teal-50 dark:bg-teal-950/20 border-teal-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-teal-100 dark:bg-teal-900">
                  <Shuffle className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{equivalentesKPIs.promedioEquivalentes}</p>
                  <p className="text-xs text-muted-foreground">Promedio equivalentes</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Layout 3 columnas para Equivalentes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna 1: Top Padres con Equivalentes */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-cyan-500" />
                  Padres con Equivalentes
                  <Badge variant="secondary" className="ml-auto">
                    {topPadresEquivalentes.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {loadingEquivalentes ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : topPadresEquivalentes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground p-4">
                      <ArrowLeftRight className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm text-center">No hay equivalencias creadas</p>
                      <p className="text-xs text-center mt-1">Usa el panel derecho para crear una</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {topPadresEquivalentes.map((padre) => (
                        <div
                          key={padre.id}
                          className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                            selectedPadreEquiv?.id === padre.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                          }`}
                          onClick={() => seleccionarPadreEquiv(padre)}
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
                            <Badge variant="secondary" className="text-xs bg-cyan-100 text-cyan-700">
                              <ArrowLeftRight className="h-3 w-3 mr-1" />
                              {padre.cantidadEquivalentes} equivalentes
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Columna 2: Explorador de Equivalentes */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5 text-indigo-500" />
                  Explorador Equivalentes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {selectedPadreEquiv ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg border border-cyan-200">
                      <p className="font-mono font-bold text-lg">{selectedPadreEquiv.Código}</p>
                      <p className="text-sm text-muted-foreground">{selectedPadreEquiv.Descripción}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">
                        Equivalentes ({equivalentesDelPadre.length})
                      </p>
                      <ScrollArea className="h-[350px] border rounded-lg">
                        {loadingEquivDelPadre ? (
                          <div className="flex items-center justify-center h-32">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : equivalentesDelPadre.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                            <ArrowLeftRight className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">Sin equivalentes</p>
                          </div>
                        ) : (
                          <div className="divide-y">
                            {equivalentesDelPadre.map((equiv) => (
                              <div 
                                key={equiv.id}
                                className="p-2 flex items-center justify-between hover:bg-muted/50 group"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-mono text-sm font-medium">{equiv.Código}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {equiv.Descripción}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                  onClick={() => quitarEquivalencia(equiv.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <ArrowLeftRight className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm">Selecciona un padre para ver equivalentes</p>
                    <p className="text-xs mt-1">o crea una nueva equivalencia</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Columna 3: Crear Equivalencia */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5 text-teal-500" />
                  Nueva Equivalencia
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Relaciona dos padres como equivalentes. Cuando uno no esté disponible, se sugerirá el otro.
                </p>

                {/* Padre 1 */}
                <div className="space-y-2">
                  <Label>Padre 1</Label>
                  {padre1Seleccionado ? (
                    <div className="p-2 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg flex items-center justify-between border border-cyan-200">
                      <div>
                        <p className="font-mono text-sm font-medium">
                          {padre1Seleccionado.Código}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {padre1Seleccionado.Descripción}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setPadre1Seleccionado(null);
                          setBuscandoPadreEquiv1("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder="Buscar padre..."
                        value={buscandoPadreEquiv1}
                        onChange={(e) => setBuscandoPadreEquiv1(e.target.value)}
                      />
                      {resultadosBusquedaEquiv1.length > 0 && (
                        <div className="border rounded-lg divide-y max-h-32 overflow-auto">
                          {resultadosBusquedaEquiv1.map((p) => (
                            <div
                              key={p.id}
                              className="p-2 hover:bg-muted/50 cursor-pointer text-sm"
                              onClick={() => {
                                setPadre1Seleccionado(p);
                                setBuscandoPadreEquiv1("");
                                setResultadosBusquedaEquiv1([]);
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

                {/* Icono de equivalencia */}
                <div className="flex justify-center">
                  <div className="p-2 bg-muted rounded-full">
                    <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>

                {/* Padre 2 */}
                <div className="space-y-2">
                  <Label>Padre 2</Label>
                  {padre2Seleccionado ? (
                    <div className="p-2 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg flex items-center justify-between border border-cyan-200">
                      <div>
                        <p className="font-mono text-sm font-medium">
                          {padre2Seleccionado.Código}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {padre2Seleccionado.Descripción}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setPadre2Seleccionado(null);
                          setBuscandoPadreEquiv2("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder="Buscar padre..."
                        value={buscandoPadreEquiv2}
                        onChange={(e) => setBuscandoPadreEquiv2(e.target.value)}
                      />
                      {resultadosBusquedaEquiv2.length > 0 && (
                        <div className="border rounded-lg divide-y max-h-32 overflow-auto">
                          {resultadosBusquedaEquiv2.map((p) => (
                            <div
                              key={p.id}
                              className="p-2 hover:bg-muted/50 cursor-pointer text-sm"
                              onClick={() => {
                                setPadre2Seleccionado(p);
                                setBuscandoPadreEquiv2("");
                                setResultadosBusquedaEquiv2([]);
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

                {/* Notas */}
                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Input
                    placeholder="Ej: Mismo balero, diferente marca"
                    value={notasEquivalencia}
                    onChange={(e) => setNotasEquivalencia(e.target.value)}
                  />
                </div>

                {/* Vista previa */}
                {padre1Seleccionado && padre2Seleccionado && (
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2">Vista previa:</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono font-medium">{padre1Seleccionado.Código}</span>
                      <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono font-medium">{padre2Seleccionado.Código}</span>
                    </div>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  onClick={crearEquivalencia}
                  disabled={creandoEquiv || !padre1Seleccionado || !padre2Seleccionado}
                >
                  {creandoEquiv ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Crear Equivalencia
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
