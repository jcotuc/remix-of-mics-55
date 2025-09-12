import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Stethoscope, Info, User, PackageSearch, Plus, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { incidentes, clientes, productos, tecnicos } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "@/hooks/use-toast";

export default function DiagnosticoIncidente() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const incidente = useMemo(() => incidentes.find(i => i.id === id), [id]);
  const cliente = useMemo(() => clientes.find(c => c.codigo === incidente?.codigoCliente), [incidente]);
  const producto = useMemo(() => productos.find(p => p.codigo === incidente?.codigoProducto), [incidente]);
  const tecnico = useMemo(() => tecnicos.find(t => t.codigo === incidente?.codigoTecnico), [incidente]);

  // Estado del flujo de diagnóstico y campos del formulario
  const [started, setStarted] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [fallaInput, setFallaInput] = useState("");
  const [fallas, setFallas] = useState<string[]>([]);
  const [recomendaciones, setRecomendaciones] = useState("");
  const [requiereRepuestos, setRequiereRepuestos] = useState(false);
  const [tiempoEstimado, setTiempoEstimado] = useState("");
  const [costoEstimado, setCostoEstimado] = useState<string>("");

  type RepuestoItem = { repuestoCodigo: string; cantidad: number };
  const [repCodigo, setRepCodigo] = useState("");
  const [repCantidad, setRepCantidad] = useState<number>(1);
  const [repuestosList, setRepuestosList] = useState<RepuestoItem[]>([]);

  const addFalla = () => {
    const v = fallaInput.trim();
    if (!v) return;
    setFallas(prev => [...prev, v]);
    setFallaInput("");
  };
  const removeFalla = (idx: number) => setFallas(prev => prev.filter((_, i) => i !== idx));

  const addRepuesto = () => {
    const code = repCodigo.trim();
    if (!code || repCantidad <= 0) return;
    setRepuestosList(prev => [...prev, { repuestoCodigo: code, cantidad: repCantidad }]);
    setRepCodigo("");
    setRepCantidad(1);
  };
  const removeRepuesto = (idx: number) => setRepuestosList(prev => prev.filter((_, i) => i !== idx));

  const iniciarDiagnostico = () => {
    setStarted(true);
    toast({
      title: "Diagnóstico iniciado",
      description: `Puedes registrar hallazgos y repuestos para el incidente ${incidente?.id}.`,
    });
  };

  const onGuardar = () => {
    if (!incidente) return;
    if (!descripcion.trim()) {
      toast({ title: "Falta descripción", description: "Escribe la descripción del diagnóstico." });
      return;
    }
    const idx = incidentes.findIndex(i => i.id === incidente.id);
    if (idx === -1) return;

    const today = new Date().toISOString().slice(0, 10);
    const requiere = requiereRepuestos || repuestosList.length > 0;
    const estadoAnterior = incidentes[idx].status;
    const estadoNuevo = requiere ? "Pendiente por repuestos" : "En diagnostico" as const;

    incidentes[idx] = {
      ...incidentes[idx],
      status: estadoNuevo,
      diagnostico: {
        fecha: today,
        tecnicoCodigo: incidentes[idx].codigoTecnico,
        descripcion: descripcion.trim(),
        fallasEncontradas: fallas,
        recomendaciones: recomendaciones.trim(),
        requiereRepuestos: requiere,
        tiempoEstimadoReparacion: tiempoEstimado.trim() || "",
        costoEstimado: costoEstimado ? Number(costoEstimado) : undefined,
      },
      repuestosSolicitados: requiere
        ? repuestosList.map(r => ({
            repuestoCodigo: r.repuestoCodigo,
            cantidad: r.cantidad,
            fechaSolicitud: today,
            estado: 'pendiente' as const,
          }))
        : undefined,
      historialEstados: [
        ...(incidentes[idx].historialEstados ?? []),
        {
          fecha: today,
          estadoAnterior,
          estadoNuevo,
          tecnicoCodigo: incidentes[idx].codigoTecnico,
          observaciones: "Diagnóstico registrado",
        },
      ],
    };

    toast({ title: "Diagnóstico guardado", description: `Incidente ${incidente.id} actualizado.` });
    navigate(`/incidentes/${incidente.id}`);
  };
  if (!incidente) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate("/incidentes")}> 
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Incidentes
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Incidente no encontrado</h2>
            <p className="text-muted-foreground">El incidente con ID "{id}" no existe en el sistema.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendiente = incidente.status === "Pendiente de diagnostico";

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/incidentes/${incidente.id}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Regresar al Detalle
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Diagnóstico del Incidente {incidente.id}</h1>
            <div className="text-muted-foreground flex items-center gap-2">
              <span>Estado actual:</span>
              <StatusBadge status={incidente.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{cliente?.nombre ?? "Cliente no encontrado"}</p>
            <p className="text-sm text-muted-foreground">Código: {incidente.codigoCliente}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PackageSearch className="w-4 h-4" />
              Producto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{producto?.descripcion ?? `Código: ${incidente.codigoProducto}`}</p>
            <p className="text-sm text-muted-foreground">Código: {incidente.codigoProducto}{producto?.clave ? ` | Clave: ${producto.clave}` : ""}</p>
            {producto?.descontinuado && (
              <Badge variant="destructive" className="mt-2">Descontinuado</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Preparación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Verifica síntomas, condiciones de uso, accesorios y antecedentes. Si procede, inicia el diagnóstico.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Iniciar diagnóstico
          </CardTitle>
          <CardDescription>
            {pendiente ? "Este incidente aún no ha sido diagnosticado." : "Este incidente ya fue diagnosticado o está en proceso."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendiente ? (
            started ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descripción del diagnóstico</label>
                  <Textarea
                    placeholder="Escribe el análisis técnico y observaciones..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fallas encontradas</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej. Rodamientos desgastados"
                      value={fallaInput}
                      onChange={(e) => setFallaInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFalla(); } }}
                    />
                    <Button type="button" variant="secondary" onClick={addFalla} aria-label="Agregar falla">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {fallas.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {fallas.map((f, i) => (
                        <Badge key={i} variant="outline" className="flex items-center gap-1">
                          {f}
                          <button type="button" onClick={() => removeFalla(i)} aria-label="Quitar falla">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Recomendaciones</label>
                    <Textarea
                      placeholder="Acciones sugeridas, piezas a revisar/reemplazar..."
                      value={recomendaciones}
                      onChange={(e) => setRecomendaciones(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tiempo estimado de reparación</label>
                    <Input
                      placeholder="Ej. 2-3 días hábiles"
                      value={tiempoEstimado}
                      onChange={(e) => setTiempoEstimado(e.target.value)}
                    />
                    <label className="text-sm font-medium mt-2">Costo estimado (opcional)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ej. 0 (en garantía)"
                      value={costoEstimado}
                      onChange={(e) => setCostoEstimado(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={requiereRepuestos} onCheckedChange={setRequiereRepuestos} id="req-repuestos" />
                    <label htmlFor="req-repuestos" className="text-sm">Requiere repuestos</label>
                  </div>

                  {(requiereRepuestos || repuestosList.length > 0) && (
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Código del repuesto (ej. ESC-ROT-15679)"
                          value={repCodigo}
                          onChange={(e) => setRepCodigo(e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min={1}
                          value={repCantidad}
                          onChange={(e) => setRepCantidad(Number(e.target.value))}
                          className="w-28"
                        />
                        <Button type="button" onClick={addRepuesto} aria-label="Agregar repuesto">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {repuestosList.length > 0 && (
                        <div className="space-y-2">
                          {repuestosList.map((r, i) => (
                            <div key={`${r.repuestoCodigo}-${i}`} className="flex items-center justify-between rounded border p-2">
                              <div className="text-sm">
                                <div className="font-medium">{r.repuestoCodigo}</div>
                                <div className="text-muted-foreground">Cantidad: {r.cantidad}</div>
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeRepuesto(i)} aria-label="Quitar">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStarted(false)}>Cancelar</Button>
                  <Button onClick={onGuardar} className="bg-primary text-primary-foreground hover:bg-primary/90">Guardar diagnóstico</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Info className="w-4 h-4" />
                  Al continuar, podrás registrar hallazgos y repuestos.
                </div>
                <Button onClick={iniciarDiagnostico} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Comenzar
                </Button>
              </div>
            )
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Info className="w-4 h-4" />
                Ya no es necesario iniciar. Revisa el detalle del incidente.
              </div>
              <Button variant="outline" onClick={() => navigate(`/incidentes/${incidente.id}`)}>
                Ver detalle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
