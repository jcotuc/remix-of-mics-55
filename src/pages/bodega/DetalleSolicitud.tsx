import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Package, ArrowLeft, Check, AlertTriangle, Send, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type RepuestoSolicitado = {
  codigo: string;
  descripcion: string;
  cantidad: number;
  ubicacion?: string;
};

type RepuestoDespacho = RepuestoSolicitado & {
  checked: boolean;
  cantidadDespachar: number;
  tieneDescuadre: boolean;
  notaDescuadre: string;
};

export default function DetalleSolicitud() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [solicitud, setSolicitud] = useState<any>(null);
  const [repuestos, setRepuestos] = useState<RepuestoDespacho[]>([]);
  const [loading, setLoading] = useState(true);
  const [despachando, setDespachando] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDescuadreDialog, setShowDescuadreDialog] = useState(false);
  const [selectedRepuestoIndex, setSelectedRepuestoIndex] = useState<number | null>(null);
  const [tempNotaDescuadre, setTempNotaDescuadre] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");

  useEffect(() => {
    fetchCurrentUser();
    if (id) fetchSolicitud();
  }, [id]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("nombre, apellido")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        setCurrentUserName(`${profile.nombre} ${profile.apellido}`);
      }
    }
  };

  const fetchSolicitud = async () => {
    try {
      setLoading(true);
      
      const { data: sol, error: solError } = await supabase
        .from("solicitudes_repuestos")
        .select("*")
        .eq("id", id)
        .single();

      if (solError) throw solError;
      setSolicitud(sol);

      // Parse repuestos from JSON field and add despacho fields
      if (sol?.repuestos && Array.isArray(sol.repuestos)) {
        const repuestosConDespacho: RepuestoDespacho[] = (sol.repuestos as RepuestoSolicitado[]).map(rep => ({
          ...rep,
          checked: false,
          cantidadDespachar: rep.cantidad,
          tieneDescuadre: false,
          notaDescuadre: ""
        }));
        setRepuestos(repuestosConDespacho);
      }

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar solicitud");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckRepuesto = (index: number, checked: boolean) => {
    setRepuestos(prev => prev.map((rep, i) => 
      i === index ? { ...rep, checked } : rep
    ));
  };

  const handleCantidadChange = (index: number, cantidad: number) => {
    setRepuestos(prev => prev.map((rep, i) => {
      if (i === index) {
        const nuevaCantidad = Math.max(0, Math.min(cantidad, rep.cantidad));
        const tieneDescuadre = nuevaCantidad !== rep.cantidad;
        return { 
          ...rep, 
          cantidadDespachar: nuevaCantidad,
          tieneDescuadre
        };
      }
      return rep;
    }));
  };

  const handleOpenDescuadreDialog = (index: number) => {
    setSelectedRepuestoIndex(index);
    setTempNotaDescuadre(repuestos[index].notaDescuadre);
    setShowDescuadreDialog(true);
  };

  const handleSaveDescuadre = () => {
    if (selectedRepuestoIndex !== null) {
      setRepuestos(prev => prev.map((rep, i) => 
        i === selectedRepuestoIndex 
          ? { ...rep, notaDescuadre: tempNotaDescuadre }
          : rep
      ));
    }
    setShowDescuadreDialog(false);
    setTempNotaDescuadre("");
    setSelectedRepuestoIndex(null);
  };

  const todosCheckeados = repuestos.length > 0 && repuestos.every(r => r.checked);
  const hayDescuadres = repuestos.some(r => r.tieneDescuadre);
  const descuadresSinNota = repuestos.filter(r => r.tieneDescuadre && !r.notaDescuadre.trim());

  const handleDespachar = async () => {
    if (descuadresSinNota.length > 0) {
      toast.error("Debe agregar una nota para todos los repuestos con descuadre");
      return;
    }

    setDespachando(true);
    try {
      // Build despacho info
      const despachoInfo = repuestos.map(rep => ({
        codigo: rep.codigo,
        descripcion: rep.descripcion,
        cantidad_solicitada: rep.cantidad,
        cantidad_despachada: rep.cantidadDespachar,
        descuadre: rep.tieneDescuadre,
        nota_descuadre: rep.notaDescuadre || null
      }));

      // Update solicitud
      const { error: updateError } = await supabase
        .from("solicitudes_repuestos")
        .update({
          estado: "entregado",
          fecha_entrega: new Date().toISOString(),
          entregado_por: currentUserId,
          notas: hayDescuadres 
            ? `Despachado con descuadres por ${currentUserName}: ${JSON.stringify(despachoInfo.filter(d => d.descuadre))}`
            : `Despachado completo por ${currentUserName}`
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Register audit log
      await supabase.from("audit_logs").insert({
        tabla_afectada: "solicitudes_repuestos",
        registro_id: id,
        accion: "UPDATE",
        usuario_id: currentUserId,
        valores_nuevos: { estado: "entregado", despacho: despachoInfo },
        motivo: `Solicitud despachada por ${currentUserName}${hayDescuadres ? " con descuadres" : ""}`
      });

      toast.success("Solicitud despachada exitosamente");
      navigate("/bodega/solicitudes");

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al despachar solicitud");
    } finally {
      setDespachando(false);
      setShowConfirmDialog(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "entregado":
        return <Badge className="bg-green-500">Despachado</Badge>;
      case "en_proceso":
        return <Badge className="bg-blue-500">En Proceso</Badge>;
      case "pendiente":
        return <Badge variant="outline">Pendiente</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Package className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  const esEditable = solicitud?.estado === "en_proceso";

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Detalle de Solicitud</h1>
          <p className="text-muted-foreground">
            {solicitud?.incidente_id?.slice(0, 8)}
          </p>
        </div>
      </div>

      {/* Información de la solicitud */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Información General</CardTitle>
              <CardDescription>
                Solicitado por: {solicitud?.tecnico_solicitante || "N/A"}
              </CardDescription>
            </div>
            {getEstadoBadge(solicitud?.estado || "pendiente")}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Tipo despacho</p>
            <p className="font-medium capitalize">{solicitud?.tipo_despacho || "N/A"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Fecha solicitud</p>
            <p className="font-medium">
              {solicitud?.created_at 
                ? new Date(solicitud.created_at).toLocaleDateString("es-GT")
                : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Fecha asignación</p>
            <p className="font-medium">
              {solicitud?.fecha_asignacion 
                ? new Date(solicitud.fecha_asignacion).toLocaleDateString("es-GT")
                : "Pendiente"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Fecha entrega</p>
            <p className="font-medium">
              {solicitud?.fecha_entrega 
                ? new Date(solicitud.fecha_entrega).toLocaleDateString("es-GT")
                : "Pendiente"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Checklist de Repuestos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Repuestos a Despachar
          </CardTitle>
          <CardDescription>
            {repuestos.filter(r => r.checked).length} de {repuestos.length} verificados
            {hayDescuadres && (
              <span className="text-amber-600 ml-2">
                • {repuestos.filter(r => r.tieneDescuadre).length} con descuadre
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {repuestos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay repuestos en esta solicitud
            </div>
          ) : (
            <div className="space-y-3">
              {repuestos.map((rep, index) => (
                <div 
                  key={`${rep.codigo}-${index}`}
                  className={`border rounded-lg p-4 transition-colors ${
                    rep.checked ? "bg-green-50 border-green-200" : "bg-background"
                  } ${rep.tieneDescuadre ? "border-amber-300 bg-amber-50" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    {esEditable && (
                      <Checkbox
                        checked={rep.checked}
                        onCheckedChange={(checked) => handleCheckRepuesto(index, checked as boolean)}
                        className="mt-1"
                      />
                    )}

                    {/* Info del repuesto */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-medium">{rep.codigo}</span>
                        {rep.tieneDescuadre && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Descuadre
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{rep.descripcion}</p>
                      {rep.ubicacion && (
                        <p className="text-xs font-mono text-muted-foreground mt-1">
                          📍 {rep.ubicacion}
                        </p>
                      )}
                      {rep.notaDescuadre && (
                        <p className="text-xs text-amber-700 mt-2 italic">
                          Nota: {rep.notaDescuadre}
                        </p>
                      )}
                    </div>

                    {/* Cantidad */}
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">
                        Solicitado: {rep.cantidad}
                      </p>
                      {esEditable ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCantidadChange(index, rep.cantidadDespachar - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={rep.cantidadDespachar}
                            onChange={(e) => handleCantidadChange(index, parseInt(e.target.value) || 0)}
                            className="w-16 text-center h-8"
                            min={0}
                            max={rep.cantidad}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCantidadChange(index, rep.cantidadDespachar + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className="font-medium">{rep.cantidadDespachar}</p>
                      )}
                    </div>

                    {/* Botón descuadre */}
                    {esEditable && rep.tieneDescuadre && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-amber-600 hover:text-amber-700"
                        onClick={() => handleOpenDescuadreDialog(index)}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {rep.notaDescuadre ? "Editar nota" : "Agregar nota"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botón de despachar */}
      {esEditable && (
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={!todosCheckeados || despachando}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Despachar Solicitud
          </Button>
        </div>
      )}

      {/* Dialog de confirmación */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Despacho</AlertDialogTitle>
            <AlertDialogDescription>
              {hayDescuadres ? (
                <div className="space-y-2">
                  <p>Esta solicitud tiene <strong>{repuestos.filter(r => r.tieneDescuadre).length}</strong> repuesto(s) con descuadre.</p>
                  <p className="text-amber-600">
                    Asegúrese de haber documentado el motivo de cada descuadre.
                  </p>
                </div>
              ) : (
                <p>¿Está seguro de que desea marcar esta solicitud como despachada?</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDespachar} disabled={despachando}>
              {despachando ? "Despachando..." : "Confirmar Despacho"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para nota de descuadre */}
      <Dialog open={showDescuadreDialog} onOpenChange={setShowDescuadreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Reportar Descuadre
            </DialogTitle>
            <DialogDescription>
              {selectedRepuestoIndex !== null && (
                <>
                  Código: <strong>{repuestos[selectedRepuestoIndex]?.codigo}</strong>
                  <br />
                  Solicitado: {repuestos[selectedRepuestoIndex]?.cantidad} | 
                  Despachando: {repuestos[selectedRepuestoIndex]?.cantidadDespachar}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="nota-descuadre">Motivo del descuadre</Label>
            <Textarea
              id="nota-descuadre"
              placeholder="Ej: No hay stock suficiente, producto dañado, etc."
              value={tempNotaDescuadre}
              onChange={(e) => setTempNotaDescuadre(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDescuadreDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDescuadre}>
              Guardar Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notas existentes */}
      {solicitud?.notas && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{solicitud.notas}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
