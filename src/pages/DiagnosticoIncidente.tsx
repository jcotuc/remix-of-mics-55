import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Stethoscope, Info, User, PackageSearch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { incidentes, clientes, productos, tecnicos } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "@/components/ui/use-toast";

export default function DiagnosticoIncidente() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const incidente = useMemo(() => incidentes.find(i => i.id === id), [id]);
  const cliente = useMemo(() => clientes.find(c => c.codigo === incidente?.codigoCliente), [incidente]);
  const producto = useMemo(() => productos.find(p => p.codigo === incidente?.codigoProducto), [incidente]);
  const tecnico = useMemo(() => tecnicos.find(t => t.codigo === incidente?.codigoTecnico), [incidente]);

  const iniciarDiagnostico = () => {
    toast({
      title: "Diagnóstico iniciado",
      description: `Se inició el diagnóstico del incidente ${incidente?.id}.`,
    });
    navigate(`/incidentes/${incidente?.id}`);
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
            <p className="text-muted-foreground">Estado actual: <StatusBadge status={incidente.status} /></p>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Info className="w-4 h-4" />
                Al continuar, podrás registrar hallazgos y repuestos.
              </div>
              <Button onClick={iniciarDiagnostico} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Comenzar
              </Button>
            </div>
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
