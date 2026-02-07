import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Search, CheckCircle, XCircle, AlertCircle, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppStyleMediaCapture } from "@/components/features/media";
import type { IncidenteSchema } from "@/generated/actions.d";
import { mycsapi } from "@/mics-api";

interface Incidente {
  id: number;
  codigo: string;
  producto_id: number | null;
  cliente_id: number;
  sku_maquina?: string;
  estado: string;
  fecha_ingreso: string;
  clientes?: { nombre: string };
  productos?: { descripcion: string };
}

interface Auditoria {
  id: number;
  incidente_id: number;
  fecha_auditoria: string;
  tecnico_responsable: string;
  resultado: string;
  tipo_falla?: string;
  causa_raiz?: string;
  observaciones?: string;
  voltaje_medido?: number;
  presion_medida?: number;
  velocidad_medida?: number;
  temperatura_medida?: number;
  cumple_limpieza: boolean;
  cumple_sellado: boolean;
  cumple_ensamblaje: boolean;
  cumple_presentacion: boolean;
  incidentes?: {
    codigo: string;
    producto_id?: number;
    sku_maquina?: string;
    clientes?: { nombre: string };
    productos?: { descripcion: string };
  };
}

export default function AuditoriasCalidad() {
  const navigate = useNavigate();
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroResultado, setFiltroResultado] = useState<string>("todos");

  // Form state
  const [formData, setFormData] = useState({
    incidente_id: "",
    tecnico_responsable: "",
    resultado: "aprobado",
    tipo_falla: "",
    causa_raiz: "",
    proveedor_involucrado: "",
    observaciones: "",
    voltaje_medido: "",
    presion_medida: "",
    velocidad_medida: "",
    temperatura_medida: "",
    cumple_limpieza: false,
    cumple_sellado: false,
    cumple_ensamblaje: false,
    cumple_presentacion: false,
  });

  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchAuditorias();
    fetchIncidentes();
  }, []);

  const fetchIncidentes = async () => {
    try {
      const { results } = await mycsapi.get("/api/v1/incidentes", { query: { limit: 500 } }) as any;
      const filtered = (results || []).filter((inc: any) =>
        ["REPARADO", "CAMBIO_POR_GARANTIA", "NOTA_DE_CREDITO"].includes(inc.estado)
      );
      setIncidentes(filtered.map((inc: any) => ({
        id: inc.id,
        codigo: inc.codigo,
        producto_id: inc.producto?.id || null,
        cliente_id: inc.cliente?.id || 0,
        estado: inc.estado,
        fecha_ingreso: inc.created_at,
      })) as Incidente[]);
    } catch (error) {
      console.error("Error fetching incidentes:", error);
      toast.error("Error al cargar incidentes");
    }
  };

  const fetchAuditorias = async () => {
    setLoading(true);
    try {
      const { results } = await mycsapi.fetch("/api/v1/auditorias-calidad", { method: "GET" }) as any;
      
      // Fetch incidente details for each auditoria
      const auditoriasConIncidentes = await Promise.all(
        (results || []).map(async (aud: any) => {
          try {
            const incidente = await mycsapi.get("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: aud.incidente_id } }) as any;
            return {
              ...aud,
              incidentes: incidente ? { codigo: incidente.codigo, producto_id: incidente.producto?.id } : null
            };
          } catch {
            return { ...aud, incidentes: null };
          }
        })
      );
      
      setAuditorias(auditoriasConIncidentes as Auditoria[]);
    } catch (error) {
      console.error("Error fetching auditorias:", error);
      toast.error("Error al cargar auditorías");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.incidente_id || !formData.tecnico_responsable) {
      toast.error("Por favor complete los campos requeridos");
      return;
    }

    setLoading(true);
    try {
      const insertData = {
        incidente_id: Number(formData.incidente_id),
        tecnico_responsable: formData.tecnico_responsable,
        resultado: formData.resultado,
        tipo_falla: formData.tipo_falla || null,
        causa_raiz: formData.causa_raiz || null,
        proveedor_involucrado: formData.proveedor_involucrado || null,
        observaciones: formData.observaciones || null,
        voltaje_medido: formData.voltaje_medido ? parseFloat(formData.voltaje_medido) : null,
        presion_medida: formData.presion_medida ? parseFloat(formData.presion_medida) : null,
        velocidad_medida: formData.velocidad_medida ? parseFloat(formData.velocidad_medida) : null,
        temperatura_medida: formData.temperatura_medida ? parseFloat(formData.temperatura_medida) : null,
        cumple_limpieza: formData.cumple_limpieza,
        cumple_sellado: formData.cumple_sellado,
        cumple_ensamblaje: formData.cumple_ensamblaje,
        cumple_presentacion: formData.cumple_presentacion,
        updated_at: new Date().toISOString(),
      };
      
      await mycsapi.fetch("/api/v1/auditorias-calidad", { method: "POST", body: insertData }) as any;

      toast.success("Auditoría registrada exitosamente");
      setIsDialogOpen(false);
      resetForm();
      fetchAuditorias();
    } catch (error) {
      console.error("Error al registrar auditoría:", error);
      toast.error("Error al registrar auditoría");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      incidente_id: "",
      tecnico_responsable: "",
      resultado: "aprobado",
      tipo_falla: "",
      causa_raiz: "",
      proveedor_involucrado: "",
      observaciones: "",
      voltaje_medido: "",
      presion_medida: "",
      velocidad_medida: "",
      temperatura_medida: "",
      cumple_limpieza: false,
      cumple_sellado: false,
      cumple_ensamblaje: false,
      cumple_presentacion: false,
    });
    setMediaFiles([]);
  };

  const getResultadoIcon = (resultado: string) => {
    switch (resultado) {
      case "aprobado":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "rechazado":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "reingreso":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const auditoriasFiltradas = auditorias.filter((aud) => {
    const matchSearch =
      aud.incidentes?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aud.tecnico_responsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aud.incidentes?.sku_maquina?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchResultado = filtroResultado === "todos" || aud.resultado === filtroResultado;

    return matchSearch && matchResultado;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Auditorías de Calidad</h1>
          <p className="text-muted-foreground">Supervisión y control de reparaciones</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Auditoría
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Auditoría de Calidad</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="pruebas">Pruebas Técnicas</TabsTrigger>
                  <TabsTrigger value="verificacion">Verificación</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Incidente *</Label>
                      <Select
                        value={formData.incidente_id}
                        onValueChange={(value) => setFormData({ ...formData, incidente_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione incidente" />
                        </SelectTrigger>
                        <SelectContent>
                          {incidentes.map((inc) => (
                            <SelectItem key={inc.id} value={String(inc.id)}>
                              {inc.codigo} - {inc.producto_id || "Sin producto"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Técnico Responsable *</Label>
                      <Input
                        value={formData.tecnico_responsable}
                        onChange={(e) => setFormData({ ...formData, tecnico_responsable: e.target.value })}
                        placeholder="Código del técnico"
                      />
                    </div>

                    <div>
                      <Label>Resultado *</Label>
                      <Select
                        value={formData.resultado}
                        onValueChange={(value) => setFormData({ ...formData, resultado: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aprobado">Aprobado</SelectItem>
                          <SelectItem value="rechazado">Rechazado</SelectItem>
                          <SelectItem value="reingreso">Reingreso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tipo de Falla</Label>
                      <Input
                        value={formData.tipo_falla}
                        onChange={(e) => setFormData({ ...formData, tipo_falla: e.target.value })}
                        placeholder="Eléctrica, Mecánica, etc."
                      />
                    </div>

                    <div>
                      <Label>Causa Raíz</Label>
                      <Input
                        value={formData.causa_raiz}
                        onChange={(e) => setFormData({ ...formData, causa_raiz: e.target.value })}
                        placeholder="Defecto de repuesto, error técnico, etc."
                      />
                    </div>

                    <div>
                      <Label>Proveedor Involucrado</Label>
                      <Input
                        value={formData.proveedor_involucrado}
                        onChange={(e) => setFormData({ ...formData, proveedor_involucrado: e.target.value })}
                        placeholder="Nombre del proveedor"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Observaciones</Label>
                    <Textarea
                      value={formData.observaciones}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      placeholder="Detalles de la auditoría..."
                      rows={4}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="pruebas" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Voltaje (V)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.voltaje_medido}
                        onChange={(e) => setFormData({ ...formData, voltaje_medido: e.target.value })}
                        placeholder="Voltaje medido"
                      />
                    </div>

                    <div>
                      <Label>Presión (PSI)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.presion_medida}
                        onChange={(e) => setFormData({ ...formData, presion_medida: e.target.value })}
                        placeholder="Presión medida"
                      />
                    </div>

                    <div>
                      <Label>Velocidad (RPM)</Label>
                      <Input
                        type="number"
                        step="1"
                        value={formData.velocidad_medida}
                        onChange={(e) => setFormData({ ...formData, velocidad_medida: e.target.value })}
                        placeholder="Velocidad medida"
                      />
                    </div>

                    <div>
                      <Label>Temperatura (°C)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.temperatura_medida}
                        onChange={(e) => setFormData({ ...formData, temperatura_medida: e.target.value })}
                        placeholder="Temperatura medida"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="verificacion" className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="limpieza"
                        checked={formData.cumple_limpieza}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, cumple_limpieza: checked as boolean })
                        }
                      />
                      <Label htmlFor="limpieza" className="cursor-pointer">
                        Cumple con limpieza
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sellado"
                        checked={formData.cumple_sellado}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, cumple_sellado: checked as boolean })
                        }
                      />
                      <Label htmlFor="sellado" className="cursor-pointer">
                        Cumple con sellado
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ensamblaje"
                        checked={formData.cumple_ensamblaje}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, cumple_ensamblaje: checked as boolean })
                        }
                      />
                      <Label htmlFor="ensamblaje" className="cursor-pointer">
                        Cumple con ensamblaje
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="presentacion"
                        checked={formData.cumple_presentacion}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, cumple_presentacion: checked as boolean })
                        }
                      />
                      <Label htmlFor="presentacion" className="cursor-pointer">
                        Cumple con presentación final
                      </Label>
                    </div>
                  </div>

                  <div>
                    <Label>Evidencias Fotográficas</Label>
                    <WhatsAppStyleMediaCapture media={mediaFiles} onMediaChange={setMediaFiles} maxFiles={10} />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Registrar Auditoría"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Código de incidente, técnico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label>Resultado</Label>
              <Select value={filtroResultado} onValueChange={setFiltroResultado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                  <SelectItem value="reingreso">Reingreso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auditorías ({auditoriasFiltradas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Incidente</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Tipo Falla</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : auditoriasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No se encontraron auditorías
                  </TableCell>
                </TableRow>
              ) : (
                auditoriasFiltradas.map((aud) => (
                  <TableRow key={aud.id}>
                    <TableCell>{new Date(aud.fecha_auditoria).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono">{aud.incidentes?.codigo || "-"}</TableCell>
                    <TableCell>{aud.tecnico_responsable}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getResultadoIcon(aud.resultado)}
                        <span className="capitalize">{aud.resultado}</span>
                      </div>
                    </TableCell>
                    <TableCell>{aud.tipo_falla || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/calidad/auditorias/${aud.id}`)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
