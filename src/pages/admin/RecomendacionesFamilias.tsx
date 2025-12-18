import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, FolderTree, Loader2, FileText, ChevronRight } from "lucide-react";

interface Familia {
  id: number;
  Categoria: string | null;
  Padre: number | null;
}

interface Recomendacion {
  id: string;
  familia_hija_id: number;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  activo: boolean;
}

interface FamiliaJerarquica extends Familia {
  hijos: FamiliaJerarquica[];
}

export default function RecomendacionesFamilias() {
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFamiliaHija, setSelectedFamiliaHija] = useState<number | null>(null);
  const [showRecomendacionDialog, setShowRecomendacionDialog] = useState(false);
  const [editingRecomendacion, setEditingRecomendacion] = useState<Recomendacion | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    tipo: "general",
    activo: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedFamiliaHija) {
      fetchRecomendaciones();
    }
  }, [selectedFamiliaHija]);

  const fetchData = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("CDS_Familias")
      .select("*")
      .order("Categoria");

    if (!error && data) {
      setFamilias(data);
    }
    
    setLoading(false);
  };

  const fetchRecomendaciones = async () => {
    if (!selectedFamiliaHija) return;

    const { data, error } = await supabase
      .from("recomendaciones")
      .select("*")
      .eq("familia_hija_id", selectedFamiliaHija)
      .order("titulo");

    if (!error && data) {
      setRecomendaciones(data);
    }
  };

  // Construir jerarquía de familias
  const familiaJerarquica = useMemo(() => {
    const buildTree = (padreId: number | null): FamiliaJerarquica[] => {
      return familias
        .filter((f) => f.Padre === padreId)
        .map((f) => ({
          ...f,
          hijos: buildTree(f.id),
        }));
    };

    return buildTree(null);
  }, [familias]);

  // Obtener familias hijas (nivel 3 - tienen padre que también tiene padre)
  const familiasHijas = useMemo(() => {
    const result: { id: number; nombre: string; padreNombre: string; abueloNombre: string }[] = [];
    
    familias.forEach((familia) => {
      if (familia.Padre) {
        const padre = familias.find((f) => f.id === familia.Padre);
        if (padre?.Padre) {
          const abuelo = familias.find((f) => f.id === padre.Padre);
          if (abuelo) {
            result.push({
              id: familia.id,
              nombre: familia.Categoria || "Sin nombre",
              padreNombre: padre.Categoria || "Sin nombre",
              abueloNombre: abuelo.Categoria || "Sin nombre",
            });
          }
        }
      }
    });

    return result.sort((a, b) => a.abueloNombre.localeCompare(b.abueloNombre));
  }, [familias]);

  const handleOpenCreate = () => {
    if (!selectedFamiliaHija) {
      toast.error("Seleccione una familia hija primero");
      return;
    }
    setEditingRecomendacion(null);
    setFormData({
      titulo: "",
      descripcion: "",
      tipo: "general",
      activo: true,
    });
    setShowRecomendacionDialog(true);
  };

  const handleOpenEdit = (rec: Recomendacion) => {
    setEditingRecomendacion(rec);
    setFormData({
      titulo: rec.titulo,
      descripcion: rec.descripcion || "",
      tipo: rec.tipo,
      activo: rec.activo,
    });
    setShowRecomendacionDialog(true);
  };

  const handleSaveRecomendacion = async () => {
    if (!formData.titulo) {
      toast.error("El título es requerido");
      return;
    }

    if (!selectedFamiliaHija) {
      toast.error("Seleccione una familia hija");
      return;
    }

    setSaving(true);

    if (editingRecomendacion) {
      const { error } = await supabase
        .from("recomendaciones")
        .update({
          titulo: formData.titulo,
          descripcion: formData.descripcion || null,
          tipo: formData.tipo,
          activo: formData.activo,
        })
        .eq("id", editingRecomendacion.id);

      if (error) {
        toast.error("Error al actualizar recomendación");
      } else {
        toast.success("Recomendación actualizada");
        setShowRecomendacionDialog(false);
        fetchRecomendaciones();
      }
    } else {
      const { error } = await supabase.from("recomendaciones").insert({
        familia_hija_id: selectedFamiliaHija,
        titulo: formData.titulo,
        descripcion: formData.descripcion || null,
        tipo: formData.tipo,
        activo: formData.activo,
      });

      if (error) {
        toast.error("Error al crear recomendación");
      } else {
        toast.success("Recomendación creada");
        setShowRecomendacionDialog(false);
        fetchRecomendaciones();
      }
    }

    setSaving(false);
  };

  const handleDeleteRecomendacion = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta recomendación?")) return;

    const { error } = await supabase.from("recomendaciones").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar recomendación");
    } else {
      toast.success("Recomendación eliminada");
      fetchRecomendaciones();
    }
  };

  const getFamiliaNombre = (id: number | null) => {
    if (!id) return "";
    const familia = familias.find((f) => f.id === id);
    return familia?.Categoria || "";
  };

  const selectedFamiliaInfo = familiasHijas.find((f) => f.id === selectedFamiliaHija);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recomendaciones por Familia</h1>
          <p className="text-muted-foreground">
            Vincule recomendaciones con las familias hijas de productos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de selección de familia */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Jerarquía de Familias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {familiasHijas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay familias hijas definidas. Las familias hijas son aquellas que tienen
                  padre y abuelo (3 niveles de jerarquía).
                </p>
              ) : (
                <Accordion type="multiple" className="space-y-1">
                  {/* Agrupar por abuelo */}
                  {Array.from(new Set(familiasHijas.map((f) => f.abueloNombre))).map((abuelo) => (
                    <AccordionItem key={abuelo} value={abuelo} className="border rounded-lg">
                      <AccordionTrigger className="px-3 py-2 hover:bg-muted/50">
                        <span className="font-medium">{abuelo}</span>
                      </AccordionTrigger>
                      <AccordionContent className="pt-0 pb-2">
                        {/* Agrupar por padre */}
                        {Array.from(
                          new Set(
                            familiasHijas
                              .filter((f) => f.abueloNombre === abuelo)
                              .map((f) => f.padreNombre)
                          )
                        ).map((padre) => (
                          <div key={padre} className="ml-4 mt-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                              <ChevronRight className="h-3 w-3" />
                              {padre}
                            </p>
                            <div className="ml-4 mt-1 space-y-1">
                              {familiasHijas
                                .filter(
                                  (f) => f.abueloNombre === abuelo && f.padreNombre === padre
                                )
                                .map((familia) => (
                                  <button
                                    key={familia.id}
                                    onClick={() => setSelectedFamiliaHija(familia.id)}
                                    className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                                      selectedFamiliaHija === familia.id
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted"
                                    }`}
                                  >
                                    {familia.nombre}
                                  </button>
                                ))}
                            </div>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Panel de recomendaciones */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recomendaciones
              </CardTitle>
              {selectedFamiliaInfo && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFamiliaInfo.abueloNombre} → {selectedFamiliaInfo.padreNombre} →{" "}
                  <span className="font-medium text-foreground">{selectedFamiliaInfo.nombre}</span>
                </p>
              )}
            </div>
            <Button onClick={handleOpenCreate} disabled={!selectedFamiliaHija}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva
            </Button>
          </CardHeader>
          <CardContent>
            {!selectedFamiliaHija ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Seleccione una familia hija para ver sus recomendaciones</p>
              </div>
            ) : recomendaciones.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay recomendaciones para esta familia</p>
                <Button className="mt-4" onClick={handleOpenCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar primera recomendación
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recomendaciones.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rec.titulo}</p>
                            {rec.descripcion && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {rec.descripcion}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{rec.tipo}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rec.activo ? "default" : "secondary"}>
                            {rec.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(rec)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteRecomendacion(rec.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Recomendación */}
      <Dialog open={showRecomendacionDialog} onOpenChange={setShowRecomendacionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRecomendacion ? "Editar Recomendación" : "Nueva Recomendación"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Título de la recomendación"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción detallada..."
                rows={4}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(val) => setFormData({ ...formData, tipo: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="uso">Uso</SelectItem>
                  <SelectItem value="seguridad">Seguridad</SelectItem>
                  <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.activo}
                onCheckedChange={(val) => setFormData({ ...formData, activo: val })}
              />
              <Label>Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRecomendacionDialog(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveRecomendacion} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingRecomendacion ? "Guardar Cambios" : "Crear Recomendación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
