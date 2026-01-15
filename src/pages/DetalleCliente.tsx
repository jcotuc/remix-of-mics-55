import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Calendar, AlertCircle, Edit, CheckCircle, FileText, RefreshCw, CreditCard, Repeat, Truck, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { OutlinedInput } from "@/components/ui/outlined-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { GuiaHPCLabel } from "@/components/GuiaHPCLabel";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Cliente = Database['public']['Tables']['clientes']['Row'];
type Incidente = Database['public']['Tables']['incidentes']['Row'];
type GuiaEnvio = Database['public']['Tables']['guias_envio']['Row'];

export default function DetalleCliente() {
  const {
    codigo
  } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [guiasEnvio, setGuiasEnvio] = useState<GuiaEnvio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [guiaSeleccionada, setGuiaSeleccionada] = useState<GuiaEnvio | null>(null);
  useEffect(() => {
    if (codigo) {
      fetchClienteData();
    }
  }, [codigo]);
  const fetchClienteData = async () => {
    try {
      setLoading(true);

      // Fetch cliente
      const {
        data: clienteData,
        error: clienteError
      } = await supabase.from('clientes').select('*').eq('codigo', codigo).single();
      if (clienteError) throw clienteError;
      setCliente(clienteData);

      // Fetch incidentes del cliente
      const {
        data: incidentesData,
        error: incidentesError
      } = await supabase.from('incidentes').select('*').eq('codigo_cliente', codigo).order('fecha_ingreso', {
        ascending: false
      });
      if (incidentesError) throw incidentesError;
      setIncidentes(incidentesData || []);

      // Fetch guías de envío relacionadas a los incidentes del cliente
      if (incidentesData && incidentesData.length > 0) {
        const codigosIncidentes = incidentesData.map(inc => inc.codigo);
        const { data: guiasData } = await supabase
          .from('guias_envio')
          .select('*')
          .overlaps('incidentes_codigos', codigosIncidentes)
          .order('fecha_guia', { ascending: false });
        setGuiasEnvio(guiasData || []);
      }
    } catch (error) {
      console.error('Error al cargar datos del cliente:', error);
      toast.error('Error al cargar los datos del cliente');
    } finally {
      setLoading(false);
    }
  };
  const handleEditCliente = () => {
    setEditingCliente(cliente);
    setIsEditDialogOpen(true);
  };
  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCliente) return;
    const formData = new FormData(e.currentTarget);
    try {
      const {
        error
      } = await supabase.from('clientes').update({
        nombre: formData.get('nombre') as string,
        nit: formData.get('nit') as string,
        celular: formData.get('celular') as string,
        direccion: formData.get('direccion') as string || null,
        correo: formData.get('correo') as string || null,
        telefono_principal: formData.get('telefono_principal') as string || null,
        telefono_secundario: formData.get('telefono_secundario') as string || null,
        nombre_facturacion: formData.get('nombre_facturacion') as string || null,
        pais: formData.get('pais') as string || null,
        departamento: formData.get('departamento') as string || null,
        municipio: formData.get('municipio') as string || null
      }).eq('codigo', editingCliente.codigo);
      if (error) throw error;
      toast.success('Cliente actualizado exitosamente');
      setIsEditDialogOpen(false);
      setEditingCliente(null);
      fetchClienteData();
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      toast.error('Error al actualizar el cliente');
    }
  };

  // Calcular indicadores
  const indicadores = {
    reparadasGarantia: incidentes.filter(i => i.status === 'Reparado' && i.cobertura_garantia).length,
    presupuestos: incidentes.filter(i => i.status === 'Presupuesto').length,
    canjes: incidentes.filter(i => i.status === 'Porcentaje').length,
    cambios: incidentes.filter(i => i.status === 'Cambio por garantia').length,
    notasCredito: incidentes.filter(i => i.status === 'Nota de credito').length
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando...</p>
      </div>;
  }
  if (!cliente) {
    return <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Button onClick={() => navigate('/mostrador/clientes')}>
          Volver a Clientes
        </Button>
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/mostrador/clientes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{cliente.nombre}</h1>
            <p className="text-muted-foreground">Código: {cliente.codigo}</p>
          </div>
        </div>
        <Button onClick={handleEditCliente}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Cliente
        </Button>
      </div>

      {/* Indicadores de Estado */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Incidentes</CardTitle>
          
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {/* Total Incidentes - Destacado */}
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{incidentes.length}</p>
                    <p className="text-xs text-muted-foreground">Total Incidentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-500/20 bg-green-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{indicadores.reparadasGarantia}</p>
                    <p className="text-xs text-muted-foreground">Reparadas en Garantía</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{indicadores.presupuestos}</p>
                    <p className="text-xs text-muted-foreground">Presupuestos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-500/20 bg-orange-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Repeat className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{indicadores.canjes}</p>
                    <p className="text-xs text-muted-foreground">Canjes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-500/20 bg-purple-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <RefreshCw className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{indicadores.cambios}</p>
                    <p className="text-xs text-muted-foreground">Cambios</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-500/20 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <CreditCard className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{indicadores.notasCredito}</p>
                    <p className="text-xs text-muted-foreground">Notas de Crédito</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Datos Personales */}
        <Card>
          <CardHeader>
            <CardTitle>Datos Personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Nombre Completo</p>
              <p className="font-medium">{cliente.nombre}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teléfono Principal</p>
              <p className="font-medium">{cliente.telefono_principal || cliente.celular || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teléfono Secundario</p>
              <p className="font-medium">{cliente.telefono_secundario || '-'}</p>
            </div>
            {cliente.correo && <div>
                <p className="text-sm text-muted-foreground">Correo</p>
                <p className="font-medium">{cliente.correo}</p>
              </div>}
            {cliente.direccion && <div>
                <p className="text-sm text-muted-foreground">Dirección</p>
                <p className="font-medium">{cliente.direccion}</p>
              </div>}
          </CardContent>
        </Card>

        {/* Datos de Facturación */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de Facturación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">NIT</p>
              <p className="font-medium">{cliente.nit}</p>
            </div>
            {cliente.nombre_facturacion && <div>
                <p className="text-sm text-muted-foreground">Nombre Facturación</p>
                <p className="font-medium">{cliente.nombre_facturacion}</p>
              </div>}
            {cliente.pais && <div>
                <p className="text-sm text-muted-foreground">País</p>
                <p className="font-medium">{cliente.pais}</p>
              </div>}
            {cliente.departamento && <div>
                <p className="text-sm text-muted-foreground">Departamento</p>
                <p className="font-medium">{cliente.departamento}</p>
              </div>}
            {cliente.municipio && <div>
                <p className="text-sm text-muted-foreground">Municipio</p>
                <p className="font-medium">{cliente.municipio}</p>
              </div>}
            {cliente.direccion_envio && <div>
                <p className="text-sm text-muted-foreground">Dirección de Envío</p>
                <p className="font-medium">{cliente.direccion_envio}</p>
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* Historial de Incidentes */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Historial de Incidentes
            </CardTitle>
            <div className="w-64">
              <OutlinedInput label="Buscar incidente" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
          const filtered = incidentes.filter(inc => {
            const searchLower = searchTerm.toLowerCase();
            const fechaIngreso = new Date(inc.fecha_ingreso).toLocaleDateString('es-GT');
            return inc.codigo.toLowerCase().includes(searchLower) || inc.codigo_producto?.toLowerCase().includes(searchLower) || inc.status.toLowerCase().includes(searchLower) || inc.centro_servicio?.toLowerCase().includes(searchLower) || fechaIngreso.includes(searchLower);
          });
          return filtered.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{searchTerm ? 'No se encontraron incidentes con ese criterio' : 'No hay incidentes registrados para este cliente'}</p>
              </div> : <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fecha Ingreso</TableHead>
                      <TableHead>Centro Servicio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(incidente => <TableRow key={incidente.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/mostrador/seguimiento/${incidente.id}`)}>
                        <TableCell className="font-medium">{incidente.codigo}</TableCell>
                        <TableCell>{incidente.codigo_producto}</TableCell>
                        <TableCell>
                          <StatusBadge status={incidente.status as any} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(incidente.fecha_ingreso).toLocaleDateString('es-GT')}
                          </div>
                        </TableCell>
                        <TableCell>{incidente.centro_servicio || 'N/A'}</TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </div>;
        })()}
        </CardContent>
      </Card>

      {/* Guías de Envío */}
      {guiasEnvio.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Guías de Envío ({guiasEnvio.length})
            </CardTitle>
            <CardDescription>
              Guías de envío asociadas a los incidentes del cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {guiasEnvio.map((guia) => (
                <div key={guia.id} className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{guia.numero_guia}</span>
                        <Badge variant={guia.estado === "entregado" ? "default" : "secondary"}>
                          {guia.estado}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Destino:</span> {guia.destinatario}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {guia.ciudad_destino} • {new Date(guia.fecha_guia).toLocaleDateString('es-GT')}
                      </p>
                      {guia.referencia_1 && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Ref:</span> {guia.referencia_1}
                        </p>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setGuiaSeleccionada(guia)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Ver Etiqueta
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Actualiza la información del cliente
            </DialogDescription>
          </DialogHeader>
          
          {editingCliente && <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <OutlinedInput 
                  label="Nombre" 
                  name="nombre" 
                  defaultValue={editingCliente.nombre} 
                  required 
                />
                
                <OutlinedInput 
                  label="NIT" 
                  name="nit" 
                  defaultValue={editingCliente.nit} 
                  required 
                />

                <OutlinedInput 
                  label="Celular" 
                  name="celular" 
                  defaultValue={editingCliente.celular} 
                  required 
                />

                <OutlinedInput 
                  label="Correo" 
                  name="correo" 
                  type="email" 
                  defaultValue={editingCliente.correo || ''} 
                />

                <div className="col-span-2">
                  <OutlinedInput 
                    label="Dirección" 
                    name="direccion" 
                    defaultValue={editingCliente.direccion || ''} 
                  />
                </div>

                <OutlinedInput 
                  label="Teléfono Principal" 
                  name="telefono_principal" 
                  defaultValue={editingCliente.telefono_principal || ''} 
                />

                <OutlinedInput 
                  label="Teléfono Secundario" 
                  name="telefono_secundario" 
                  defaultValue={editingCliente.telefono_secundario || ''} 
                />

                <OutlinedInput 
                  label="Nombre Facturación" 
                  name="nombre_facturacion" 
                  defaultValue={editingCliente.nombre_facturacion || ''} 
                />

                <OutlinedInput 
                  label="País" 
                  name="pais" 
                  defaultValue={editingCliente.pais || 'Guatemala'} 
                />

                <OutlinedInput 
                  label="Departamento" 
                  name="departamento" 
                  defaultValue={editingCliente.departamento || ''} 
                />

                <OutlinedInput 
                  label="Municipio" 
                  name="municipio" 
                  defaultValue={editingCliente.municipio || ''} 
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Guardar Cambios
                </Button>
              </div>
            </form>}
        </DialogContent>
      </Dialog>

      {/* Dialog para ver etiqueta de guía */}
      <Dialog open={guiaSeleccionada !== null} onOpenChange={() => setGuiaSeleccionada(null)}>
        <DialogContent className="sm:max-w-md print:max-w-full print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Etiqueta de Guía</DialogTitle>
            <DialogDescription>Vista previa de la etiqueta para impresión</DialogDescription>
          </DialogHeader>

          {guiaSeleccionada && (
            <div className="print-content">
              <GuiaHPCLabel guia={guiaSeleccionada} />
            </div>
          )}

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setGuiaSeleccionada(null)}>
              Cerrar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}