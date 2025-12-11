import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, User, Calendar, MapPin, FileText, DollarSign, CheckCircle2, Printer, AlertTriangle, Wrench, TrendingUp, Phone, Mail, Home, Truck, FileCheck, Edit, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { IncidentPhotoGallery } from "@/components/IncidentPhotoGallery";
import type { Database } from "@/integrations/supabase/types";
type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];
type ClienteDB = Database['public']['Tables']['clientes']['Row'];
type ProductoDB = Database['public']['Tables']['productos']['Row'];
type TecnicoDB = Database['public']['Tables']['tecnicos']['Row'];
type DiagnosticoDB = Database['public']['Tables']['diagnosticos']['Row'];
type DireccionEnvio = Database['public']['Tables']['direcciones_envio']['Row'];
export default function SeguimientoIncidente() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [incidente, setIncidente] = useState<IncidenteDB | null>(null);
  const [cliente, setCliente] = useState<ClienteDB | null>(null);
  const [producto, setProducto] = useState<ProductoDB | null>(null);
  const [tecnico, setTecnico] = useState<TecnicoDB | null>(null);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoDB | null>(null);
  const [direccionEnvio, setDireccionEnvio] = useState<DireccionEnvio | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingProductCode, setIsEditingProductCode] = useState(false);
  const [editedProductCode, setEditedProductCode] = useState("");
  useEffect(() => {
    fetchData();
  }, [id]);
  const fetchData = async () => {
    try {
      // Fetch incident
      const {
        data: incData,
        error: incError
      } = await supabase.from('incidentes').select('*').eq('id', id).single();
      if (incError) throw incError;
      setIncidente(incData);

      // Fetch client
      if (incData.codigo_cliente) {
        const {
          data: clienteData
        } = await supabase.from('clientes').select('*').eq('codigo', incData.codigo_cliente).maybeSingle();
        setCliente(clienteData);
      }

      // Fetch product
      if (incData.codigo_producto) {
        const {
          data: prodData
        } = await supabase.from('productos').select('*').eq('codigo', incData.codigo_producto).maybeSingle();
        setProducto(prodData);
      }

      // Fetch technician
      if (incData.codigo_tecnico) {
        const {
          data: tecData
        } = await supabase.from('tecnicos').select('*').eq('codigo', incData.codigo_tecnico).maybeSingle();
        setTecnico(tecData);
      }

      // Fetch diagnostico
      const {
        data: diagData
      } = await supabase.from('diagnosticos').select('*').eq('incidente_id', id).maybeSingle();
      setDiagnostico(diagData);

      // Fetch direccion de envio si existe
      if (incData.direccion_envio_id) {
        const {
          data: dirData
        } = await supabase.from('direcciones_envio').select('*').eq('id', incData.direccion_envio_id).maybeSingle();
        setDireccionEnvio(dirData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <div className="container mx-auto p-6">
        <p>Cargando información del incidente...</p>
      </div>;
  }
  if (!incidente) {
    return <div className="container mx-auto p-6">
        <p>Incidente no encontrado</p>
        <Button onClick={() => navigate(-1)}>Volver</Button>
      </div>;
  }
  const getStatusProgress = (status: string) => {
    const statuses = ["Ingresado", "En ruta", "Pendiente de diagnostico", "En diagnostico", "Pendiente por repuestos", "Presupuesto", "Porcentaje", "Reparado"];
    const index = statuses.indexOf(status);
    return index >= 0 ? (index + 1) / statuses.length * 100 : 0;
  };
  const progress = getStatusProgress(incidente.status);
  const getOpcionEnvioLabel = () => {
    if (!incidente.quiere_envio) return "Recoger en mostrador";
    const confirmacion = incidente.confirmacion_cliente as any;
    if (confirmacion?.opcion_envio === 'directo') return "Envío directo";
    if (confirmacion?.opcion_envio === 'llamar') return "Llamar antes de enviar";
    return "Envío a domicilio";
  };
  const getOpcionEnvioIcon = () => {
    if (!incidente.quiere_envio) return Home;
    return Truck;
  };
  const OpcionEnvioIcon = getOpcionEnvioIcon();
  const handlePrint = () => {
    window.print();
  };
  const handleEditProductCode = () => {
    setEditedProductCode(incidente?.codigo_producto || "");
    setIsEditingProductCode(true);
  };
  const handleSaveProductCode = async () => {
    const codePattern = /^[a-zA-Z0-9-_]+$/;
    if (!editedProductCode.trim()) {
      toast({
        title: "Error de validación",
        description: "El código de producto no puede estar vacío",
        variant: "destructive"
      });
      return;
    }
    if (!codePattern.test(editedProductCode)) {
      toast({
        title: "Error de validación",
        description: "El código de producto solo puede contener letras, números, guiones y guiones bajos (sin espacios)",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('incidentes').update({
        codigo_producto: editedProductCode
      }).eq('id', id);
      if (error) throw error;
      setIsEditingProductCode(false);
      toast({
        title: "Código de producto actualizado correctamente",
        description: `El código se ha actualizado a: ${editedProductCode}`
      });

      // Recargar los datos
      fetchData();
    } catch (error) {
      console.error('Error updating product code:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el código de producto. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };
  return <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalle del Incidente</h1>
            <p className="text-muted-foreground text-lg">{incidente.codigo}</p>
          </div>
        </div>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Estado y Progreso */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Estado Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={incidente.status} />
            <span className="text-sm text-muted-foreground font-medium">
              {Math.round(progress)}% completado
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-4">
            <div className="bg-primary h-4 rounded-full transition-all" style={{
            width: `${progress}%`
          }} />
          </div>
        </CardContent>
      </Card>

      {/* Grid de información */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Información del Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cliente ? <>
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="text-lg font-semibold">{cliente.nombre}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Código</p>
                    <p className="font-medium">{cliente.codigo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">NIT</p>
                    <p className="font-medium">{cliente.nit}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{cliente.celular}</p>
                  </div>
                  {cliente.correo && <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">{cliente.correo}</p>
                    </div>}
                  {cliente.direccion && <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                      <p className="text-sm">{cliente.direccion}</p>
                    </div>}
                </div>
              </> : <p className="text-muted-foreground">No se encontró información del cliente</p>}
          </CardContent>
        </Card>

        {/* Información de la Máquina */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Información de la Máquina
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground font-medium">Código de Producto (SKU)</p>
                <Button variant="ghost" size="sm" onClick={handleEditProductCode} className="h-7 text-xs">
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
                </Button>
              </div>
              <div className="bg-muted/50 px-3 py-2 rounded-md">
                <p className="text-lg font-mono font-semibold">{incidente.codigo_producto}</p>
              </div>
            </div>
            
            {producto && <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="font-medium">{producto.descripcion}</p>
                </div>
                {producto.familia_padre_id && <div>
                    <p className="text-sm text-muted-foreground">Familia</p>
                    <Badge variant="outline">ID: {producto.familia_padre_id}</Badge>
                  </div>}
                {producto.descontinuado && <Badge variant="destructive">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Producto Descontinuado
                  </Badge>}
              </>}

            {incidente.sku_maquina && <>
                <Separator />
                <div>
                  
                  
                </div>
              </>}

            {incidente.accesorios && <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Accesorios</p>
                  <p className="text-sm">{incidente.accesorios}</p>
                </div>
              </>}
          </CardContent>
        </Card>

        {/* Detalles del Incidente */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalles del Incidente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Ingreso</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium">
                    {new Date(incidente.fecha_ingreso).toLocaleDateString('es-GT', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Centro de Servicio</p>
                <p className="font-medium">{incidente.centro_servicio || 'No especificado'}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Ingresado en</p>
                <Badge variant={incidente.ingresado_en_mostrador ? "default" : "secondary"}>
                  {incidente.ingresado_en_mostrador ? "Mostrador" : "Otro"}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Reingreso
                </p>
                <Badge variant={incidente.es_reingreso ? "destructive" : "outline"}>
                  {incidente.es_reingreso ? 'Sí, es Reingreso' : 'No, Primera Vez'}
                </Badge>
              </div>

              {incidente.tipologia && <div>
                  <p className="text-sm text-muted-foreground">Tipología</p>
                  <p className="font-medium">{incidente.tipologia}</p>
                </div>}

              {incidente.persona_deja_maquina && <div>
                  
                  
                </div>}
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-2">Descripción del Problema</p>
              <p className="text-base bg-muted p-4 rounded-md">{incidente.descripcion_problema}</p>
            </div>

            {incidente.persona_deja_maquina && <div>
                <p className="text-sm text-muted-foreground">Persona que dejó la máquina</p>
                <p className="font-medium">{incidente.persona_deja_maquina}</p>
              </div>}
          </CardContent>
        </Card>

        {/* Opción de Entrega */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <OpcionEnvioIcon className="w-5 h-5" />
              Opción de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Badge variant="outline" className="text-base py-2 px-4">
                {getOpcionEnvioLabel()}
              </Badge>
            </div>

            {incidente.quiere_envio && direccionEnvio && <div>
                <p className="text-sm text-muted-foreground mb-2">Dirección de Envío</p>
                <div className="flex items-start gap-2 bg-muted p-3 rounded-md">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    {direccionEnvio.nombre_referencia && <p className="font-medium">{direccionEnvio.nombre_referencia}</p>}
                    <p className="text-sm">{direccionEnvio.direccion}</p>
                  </div>
                </div>
              </div>}
          </CardContent>
        </Card>

        {/* Técnico Asignado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Técnico Asignado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tecnico ? <div className="space-y-2">
                <p className="text-lg font-semibold">
                  {tecnico.nombre} {tecnico.apellido}
                </p>
                <p className="text-sm text-muted-foreground">Código: {tecnico.codigo}</p>
                {tecnico.email && <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm">{tecnico.email}</p>
                  </div>}
              </div> : <p className="text-muted-foreground">No asignado</p>}
          </CardContent>
        </Card>

        {/* Diagnóstico */}
        {diagnostico && <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Diagnóstico Técnico
              </CardTitle>
              <CardDescription>
                Estado: {diagnostico.estado}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diagnostico.fallas && diagnostico.fallas.length > 0 && <div>
                    <p className="text-sm text-muted-foreground mb-2">Fallas Detectadas</p>
                    <ul className="list-disc list-inside space-y-1">
                      {diagnostico.fallas.map((falla, idx) => <li key={idx} className="text-sm">{falla}</li>)}
                    </ul>
                  </div>}

                {diagnostico.causas && diagnostico.causas.length > 0 && <div>
                    <p className="text-sm text-muted-foreground mb-2">Causas Identificadas</p>
                    <ul className="list-disc list-inside space-y-1">
                      {diagnostico.causas.map((causa, idx) => <li key={idx} className="text-sm">{causa}</li>)}
                    </ul>
                  </div>}
              </div>

              {diagnostico.resolucion && <div>
                  <p className="text-sm text-muted-foreground mb-2">Resolución</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{diagnostico.resolucion}</p>
                </div>}

              {diagnostico.recomendaciones && <div>
                  <p className="text-sm text-muted-foreground mb-2">Recomendaciones</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{diagnostico.recomendaciones}</p>
                </div>}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                {diagnostico.costo_estimado && <div>
                    <p className="text-sm text-muted-foreground">Costo Estimado</p>
                    <p className="text-lg font-semibold text-primary">
                      Q {Number(diagnostico.costo_estimado).toFixed(2)}
                    </p>
                  </div>}

                {diagnostico.tiempo_estimado && <div>
                    <p className="text-sm text-muted-foreground">Tiempo Estimado</p>
                    <p className="font-medium">{diagnostico.tiempo_estimado}</p>
                  </div>}

                <div>
                  <p className="text-sm text-muted-foreground">Técnico</p>
                  <p className="font-medium">{diagnostico.tecnico_codigo}</p>
                </div>
              </div>
            </CardContent>
          </Card>}

        {/* Observaciones */}
        {incidente.log_observaciones && <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Observaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm bg-muted p-4 rounded-md whitespace-pre-wrap">
                {incidente.log_observaciones}
              </p>
          </CardContent>
        </Card>}
      </div>

      {/* Dialog para editar código de producto */}
      <Dialog open={isEditingProductCode} onOpenChange={setIsEditingProductCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Código de Producto (SKU)</DialogTitle>
            <DialogDescription>
              Modifica el código del producto. Solo se permiten letras, números, guiones y guiones bajos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="product-code-input" className="text-sm font-medium">
                Código de Producto
              </label>
              <Input id="product-code-input" type="text" value={editedProductCode} onChange={e => setEditedProductCode(e.target.value.replace(/\s/g, ''))} placeholder="Ej: PROD-12345" className="font-mono" autoFocus />
              <p className="text-xs text-muted-foreground">
                Formato: Solo alfanuméricos, guiones y guiones bajos (sin espacios)
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditingProductCode(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProductCode} className="bg-success hover:bg-success/90 text-success-foreground">
              <Save className="w-4 h-4 mr-2" />
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Galería de Fotos del Incidente */}
      <IncidentPhotoGallery incidenteId={id!} />
    </div>;
}