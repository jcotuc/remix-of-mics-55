import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, AlertTriangle, Wrench, Package } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Defecto {
  id: number;
  auditoria_id: number;
  tipo_elemento: string;
  codigo_elemento: string;
  descripcion_elemento?: string;
  tipo_defecto: string;
  descripcion_defecto: string;
  frecuencia: number;
  proveedor?: string;
  gravedad?: string;
  comentarios_tecnicos?: string;
  sugerencias_mejora?: string;
  created_at: string;
}

interface Auditoria {
  id: number;
  incidente_id: number;
  fecha_auditoria: string;
  resultado: string;
  incidentes?: {
    codigo: string;
  };
}

export default function AnalisisDefectos() {
  const [defectos, setDefectos] = useState<Defecto[]>([]);
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroGravedad, setFiltroGravedad] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    auditoria_id: "",
    tipo_elemento: "repuesto",
    codigo_elemento: "",
    descripcion_elemento: "",
    tipo_defecto: "",
    descripcion_defecto: "",
    frecuencia: "1",
    proveedor: "",
    gravedad: "media",
    comentarios_tecnicos: "",
    sugerencias_mejora: "",
  });

  useEffect(() => {
    fetchDefectos();
    fetchAuditorias();
  }, []);

  const fetchAuditorias = async () => {
    try {
      const { data, error } = await supabase
        .from("auditorias_calidad")
        .select("id, incidente_id, fecha_auditoria, resultado")
        .order("fecha_auditoria", { ascending: false });

      if (error) throw error;
      
      // Fetch incidente codes separately
      const auditoriasConIncidentes = await Promise.all(
        (data || []).map(async (aud) => {
          const { data: incidente } = await supabase
            .from("incidentes")
            .select("codigo")
            .eq("id", aud.incidente_id)
            .single();
          
          return {
            ...aud,
            incidentes: incidente
          };
        })
      );
      
      setAuditorias(auditoriasConIncidentes as Auditoria[]);
    } catch (error) {
      console.error("Error fetching auditorias:", error);
    }
  };

  const fetchDefectos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("defectos_calidad")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDefectos((data || []) as Defecto[]);
    } catch (error) {
      console.error("Error fetching defectos:", error);
      toast.error("Error al cargar defectos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.auditoria_id || !formData.codigo_elemento || !formData.tipo_defecto || !formData.descripcion_defecto) {
      toast.error("Por favor complete los campos requeridos");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("defectos_calidad").insert({
        auditoria_id: Number(formData.auditoria_id),
        tipo_elemento: formData.tipo_elemento,
        codigo_elemento: formData.codigo_elemento,
        descripcion_elemento: formData.descripcion_elemento || null,
        tipo_defecto: formData.tipo_defecto,
        descripcion_defecto: formData.descripcion_defecto,
        frecuencia: parseInt(formData.frecuencia),
        proveedor: formData.proveedor || null,
        gravedad: formData.gravedad,
        comentarios_tecnicos: formData.comentarios_tecnicos || null,
        sugerencias_mejora: formData.sugerencias_mejora || null,
      });

      if (error) throw error;

      toast.success("Defecto registrado exitosamente");
      setIsDialogOpen(false);
      resetForm();
      fetchDefectos();
    } catch (error) {
      console.error("Error al registrar defecto:", error);
      toast.error("Error al registrar defecto");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      auditoria_id: "",
      tipo_elemento: "repuesto",
      codigo_elemento: "",
      descripcion_elemento: "",
      tipo_defecto: "",
      descripcion_defecto: "",
      frecuencia: "1",
      proveedor: "",
      gravedad: "media",
      comentarios_tecnicos: "",
      sugerencias_mejora: "",
    });
  };

  const getGravedadColor = (gravedad?: string) => {
    switch (gravedad) {
      case "critica":
        return "destructive";
      case "alta":
        return "default";
      case "media":
        return "secondary";
      case "baja":
        return "outline";
      default:
        return "outline";
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "repuesto":
        return <Wrench className="h-4 w-4" />;
      case "maquina":
        return <Package className="h-4 w-4" />;
      case "herramienta":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const defectosFiltrados = defectos.filter((def) => {
    const matchSearch =
      def.codigo_elemento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      def.descripcion_defecto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      def.proveedor?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchTipo = filtroTipo === "todos" || def.tipo_elemento === filtroTipo;
    const matchGravedad = filtroGravedad === "todos" || def.gravedad === filtroGravedad;

    return matchSearch && matchTipo && matchGravedad;
  });

  // Agrupar por proveedor
  const defectosPorProveedor = defectos.reduce((acc, def) => {
    const prov = def.proveedor || "Sin proveedor";
    if (!acc[prov]) acc[prov] = [];
    acc[prov].push(def);
    return acc;
  }, {} as Record<string, Defecto[]>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Análisis de Defectos</h1>
          <p className="text-muted-foreground">Identificación y seguimiento de defectos en repuestos, máquinas y herramientas</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Defecto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Defecto de Calidad</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Auditoría Asociada *</Label>
                  <Select
                    value={formData.auditoria_id}
                    onValueChange={(value) => setFormData({ ...formData, auditoria_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione auditoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {auditorias.map((aud) => (
                        <SelectItem key={aud.id} value={String(aud.id)}>
                          {aud.incidentes?.codigo} - {new Date(aud.fecha_auditoria).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo de Elemento *</Label>
                  <Select
                    value={formData.tipo_elemento}
                    onValueChange={(value) => setFormData({ ...formData, tipo_elemento: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="repuesto">🧰 Repuesto</SelectItem>
                      <SelectItem value="maquina">⚙️ Máquina</SelectItem>
                      <SelectItem value="herramienta">🔧 Herramienta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Código del Elemento *</Label>
                  <Input
                    value={formData.codigo_elemento}
                    onChange={(e) => setFormData({ ...formData, codigo_elemento: e.target.value })}
                    placeholder="Código o SKU"
                  />
                </div>

                <div className="col-span-2">
                  <Label>Descripción del Elemento</Label>
                  <Input
                    value={formData.descripcion_elemento}
                    onChange={(e) => setFormData({ ...formData, descripcion_elemento: e.target.value })}
                    placeholder="Descripción breve"
                  />
                </div>

                <div>
                  <Label>Tipo de Defecto *</Label>
                  <Input
                    value={formData.tipo_defecto}
                    onChange={(e) => setFormData({ ...formData, tipo_defecto: e.target.value })}
                    placeholder="Ej: Desgaste prematuro, fractura, etc."
                  />
                </div>

                <div>
                  <Label>Frecuencia</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.frecuencia}
                    onChange={(e) => setFormData({ ...formData, frecuencia: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Proveedor</Label>
                  <Input
                    value={formData.proveedor}
                    onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                    placeholder="Nombre del proveedor"
                  />
                </div>

                <div>
                  <Label>Gravedad *</Label>
                  <Select
                    value={formData.gravedad}
                    onValueChange={(value) => setFormData({ ...formData, gravedad: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label>Descripción del Defecto *</Label>
                  <Textarea
                    value={formData.descripcion_defecto}
                    onChange={(e) => setFormData({ ...formData, descripcion_defecto: e.target.value })}
                    placeholder="Describa el defecto encontrado..."
                    rows={3}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Comentarios Técnicos</Label>
                  <Textarea
                    value={formData.comentarios_tecnicos}
                    onChange={(e) => setFormData({ ...formData, comentarios_tecnicos: e.target.value })}
                    placeholder="Observaciones técnicas adicionales..."
                    rows={3}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Sugerencias de Mejora</Label>
                  <Textarea
                    value={formData.sugerencias_mejora}
                    onChange={(e) => setFormData({ ...formData, sugerencias_mejora: e.target.value })}
                    placeholder="Recomendaciones para prevenir el defecto..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Registrar Defecto"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="lista" className="w-full">
        <TabsList>
          <TabsTrigger value="lista">Lista de Defectos</TabsTrigger>
          <TabsTrigger value="proveedor">Por Proveedor</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Código, defecto, proveedor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label>Tipo de Elemento</Label>
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="repuesto">Repuesto</SelectItem>
                      <SelectItem value="maquina">Máquina</SelectItem>
                      <SelectItem value="herramienta">Herramienta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Gravedad</Label>
                  <Select value={filtroGravedad} onValueChange={setFiltroGravedad}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Defectos Registrados ({defectosFiltrados.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Defecto</TableHead>
                    <TableHead>Gravedad</TableHead>
                    <TableHead>Frecuencia</TableHead>
                    <TableHead>Proveedor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defectosFiltrados.map((def) => (
                    <TableRow key={def.id}>
                      <TableCell>{new Date(def.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTipoIcon(def.tipo_elemento)}
                          <span className="capitalize">{def.tipo_elemento}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{def.codigo_elemento}</TableCell>
                      <TableCell className="max-w-xs truncate">{def.descripcion_defecto}</TableCell>
                      <TableCell>
                        <Badge variant={getGravedadColor(def.gravedad)} className="capitalize">
                          {def.gravedad}
                        </Badge>
                      </TableCell>
                      <TableCell>{def.frecuencia}</TableCell>
                      <TableCell>{def.proveedor || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proveedor" className="space-y-4">
          {Object.entries(defectosPorProveedor).map(([proveedor, defs]) => (
            <Card key={proveedor}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{proveedor}</span>
                  <Badge>{defs.length} defecto(s)</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Defecto</TableHead>
                      <TableHead>Gravedad</TableHead>
                      <TableHead>Frecuencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {defs.map((def) => (
                      <TableRow key={def.id}>
                        <TableCell className="font-mono">{def.codigo_elemento}</TableCell>
                        <TableCell className="capitalize">{def.tipo_elemento}</TableCell>
                        <TableCell className="max-w-md truncate">{def.descripcion_defecto}</TableCell>
                        <TableCell>
                          <Badge variant={getGravedadColor(def.gravedad)} className="capitalize">
                            {def.gravedad}
                          </Badge>
                        </TableCell>
                        <TableCell>{def.frecuencia}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
