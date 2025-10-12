import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, User, Calendar, MapPin, FileText, DollarSign, CheckCircle2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { DiagnosticoTecnico } from "@/components/DiagnosticoTecnico";

export default function SeguimientoIncidente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incidente, setIncidente] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [producto, setProducto] = useState<any>(null);
  const [tecnico, setTecnico] = useState<any>(null);
  const [repuestos, setRepuestos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch incident
      const { data: incData, error: incError } = await supabase
        .from('incidentes')
        .select('*')
        .eq('id', id)
        .single();

      if (incError) throw incError;
      setIncidente(incData);

      // Fetch client
      if (incData.codigo_cliente) {
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('*')
          .eq('codigo', incData.codigo_cliente)
          .single();
        setCliente(clienteData);
      }

      // Fetch product
      if (incData.codigo_producto) {
        const { data: prodData } = await supabase
          .from('productos')
          .select('*')
          .eq('codigo', incData.codigo_producto)
          .single();
        setProducto(prodData);
      }

      // Fetch technician
      if (incData.codigo_tecnico) {
        const { data: tecData } = await supabase
          .from('tecnicos')
          .select('*')
          .eq('codigo', incData.codigo_tecnico)
          .single();
        setTecnico(tecData);
      }

      // Fetch spare parts (if any are referenced in the incident)
      // This would depend on your data structure
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!incidente) {
    return (
      <div className="container mx-auto p-6">
        <p>Incidente no encontrado</p>
        <Button onClick={() => navigate(-1)}>Volver</Button>
      </div>
    );
  }

  const getStatusProgress = (status: string) => {
    const statuses = [
      "Ingresado",
      "En ruta",
      "Pendiente de diagnostico",
      "En diagnostico",
      "Pendiente por repuestos",
      "Presupuesto",
      "Porcentaje",
      "Reparado"
    ];
    const index = statuses.indexOf(status);
    return index >= 0 ? ((index + 1) / statuses.length) * 100 : 0;
  };

  const progress = getStatusProgress(incidente.status);

  const esPresupuestoOCanje = ["Presupuesto", "Porcentaje", "Cambio por garantia"].includes(incidente.status);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Seguimiento de Incidente</h1>
            <p className="text-muted-foreground">Código: {incidente.codigo}</p>
          </div>
        </div>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Mostrar componente de diagnóstico si está en estado "En diagnostico" */}
      {incidente.status === 'En diagnostico' && (
        <DiagnosticoTecnico 
          incidente={incidente} 
          onDiagnosticoCompleto={fetchData}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Estado Actual */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Estado Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={incidente.status} />
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% completado
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-3">
              <div 
                className="bg-primary h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Ingreso</p>
                <p className="font-medium">
                  {new Date(incidente.fecha_ingreso).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Centro de Servicio</p>
                <p className="font-medium">{incidente.centro_servicio || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipología</p>
                <p className="font-medium">{incidente.tipologia || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Garantía</p>
                <p className="font-medium">
                  {incidente.cobertura_garantia ? 'Sí' : 'No'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información del Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cliente ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{cliente.nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Código</p>
                  <p className="font-medium">{cliente.codigo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{cliente.telefono_principal || cliente.celular}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No hay información del cliente</p>
            )}
          </CardContent>
        </Card>

        {/* Información del Producto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Producto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {producto ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="font-medium">{producto.descripcion}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Código</p>
                  <p className="font-medium">{producto.codigo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="font-medium">{incidente.sku_maquina || producto.clave}</p>
                </div>
                {incidente.producto_descontinuado && (
                  <Badge variant="destructive">Descontinuado</Badge>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No hay información del producto</p>
            )}
          </CardContent>
        </Card>

        {/* Diagnóstico */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Diagnóstico y Problema Reportado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Problema Reportado</p>
              <p className="text-sm bg-muted/30 p-3 rounded-lg">
                {incidente.descripcion_problema}
              </p>
            </div>
            
            {incidente.persona_deja_maquina && (
              <div>
                <p className="text-sm text-muted-foreground">Persona que dejó la máquina</p>
                <p className="font-medium">{incidente.persona_deja_maquina}</p>
              </div>
            )}

            {tecnico && (
              <div>
                <p className="text-sm text-muted-foreground">Técnico Asignado</p>
                <p className="font-medium">{tecnico.nombre} {tecnico.apellido}</p>
              </div>
            )}

            {incidente.log_observaciones && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Observaciones</p>
                <p className="text-sm bg-muted/30 p-3 rounded-lg">
                  {incidente.log_observaciones}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Presupuesto o Canje */}
        {esPresupuestoOCanje && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                {incidente.status === "Cambio por garantia" ? "Información de Canje" : "Información de Presupuesto"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {incidente.status === "Porcentaje" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Descuento Aplicado</p>
                    <p className="text-2xl font-bold text-primary">
                      {incidente.porcentaje_descuento}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Máquina Nueva</p>
                    <p className="font-medium">{incidente.codigo_reemplazo || 'Por definir'}</p>
                  </div>
                </div>
              )}

              {incidente.status === "Cambio por garantia" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="font-medium">Cambio por garantía aprobado</p>
                  </div>
                  {incidente.codigo_reemplazo && (
                    <div>
                      <p className="text-sm text-muted-foreground">Código de Máquina Nueva</p>
                      <p className="font-medium">{incidente.codigo_reemplazo}</p>
                    </div>
                  )}
                </div>
              )}

              {incidente.status === "Presupuesto" && (
                <div>
                  <p className="text-sm text-muted-foreground">Estado del Presupuesto</p>
                  <p className="font-medium">En espera de aprobación del cliente</p>
                </div>
              )}

              {repuestos.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Repuestos a Cambiar</p>
                  <div className="space-y-2">
                    {repuestos.map((rep, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                        <span className="text-sm">{rep.descripcion}</span>
                        <span className="text-sm font-medium">Q {rep.precio}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tracking del Proceso */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Historial del Proceso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <div className="w-0.5 h-full bg-primary/30 mt-2" />
                </div>
                <div className="pb-8">
                  <p className="font-medium">Ingresado</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(incidente.fecha_ingreso).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    En {incidente.centro_servicio}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${
                    progress >= 25 ? 'bg-primary' : 'bg-muted'
                  }`} />
                  {progress < 100 && (
                    <div className={`w-0.5 h-full mt-2 ${
                      progress >= 25 ? 'bg-primary/30' : 'bg-muted'
                    }`} />
                  )}
                </div>
                <div className="pb-8">
                  <p className="font-medium">Estado Actual</p>
                  <StatusBadge status={incidente.status} />
                  <p className="text-sm text-muted-foreground mt-1">
                    {tecnico ? `Atendido por: ${tecnico.nombre} ${tecnico.apellido}` : 'En proceso'}
                  </p>
                </div>
              </div>

              {incidente.quiere_envio && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      incidente.status === 'Reparado' ? 'bg-primary' : 'bg-muted'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">Entrega</p>
                    <p className="text-sm text-muted-foreground">
                      {incidente.status === 'Reparado' 
                        ? 'Listo para envío'
                        : 'Pendiente de finalización'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
