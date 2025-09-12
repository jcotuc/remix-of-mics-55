import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Wrench, FileText, TrendingUp, AlertTriangle } from "lucide-react";
import { clientes, productos, incidentes } from "@/data/mockData";

const Index = () => {
  const totalClientes = clientes.length;
  const totalProductos = productos.length;
  const productosActivos = productos.filter(p => !p.descontinuado).length;
  const incidentesPendientes = incidentes.filter(i => i.status === "Pendiente de diagnostico").length;
  const incidentesEnProceso = incidentes.filter(i => ["En diagnostico", "Pendiente por repuestos", "Presupuesto"].includes(i.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard - Centro de Servicio</h1>
        <p className="text-muted-foreground">
          Resumen general del sistema de gestión
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClientes}</div>
            <p className="text-xs text-muted-foreground">
              Clientes registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Activos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productosActivos}</div>
            <p className="text-xs text-muted-foreground">
              de {totalProductos} productos totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidentes Pendientes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{incidentesPendientes}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <TrendingUp className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{incidentesEnProceso}</div>
            <p className="text-xs text-muted-foreground">
              Reparaciones activas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Accesos Rápidos</CardTitle>
            <CardDescription>
              Navegación directa a las secciones principales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <a href="/clientes" className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">Clientes</span>
              </a>
              <a href="/productos" className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Package className="h-5 w-5 text-primary" />
                <span className="font-medium">Productos</span>
              </a>
              <a href="/repuestos" className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Wrench className="h-5 w-5 text-primary" />
                <span className="font-medium">Repuestos</span>
              </a>
              <a href="/incidentes" className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">Incidentes</span>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimos incidentes registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incidentes.slice(0, 5).map((incidente) => (
                <div key={incidente.id} className="flex items-center justify-between p-2 border-l-2 border-primary/20 pl-4">
                  <div>
                    <p className="font-medium text-sm">{incidente.id}</p>
                    <p className="text-xs text-muted-foreground">{incidente.descripcionProblema.substring(0, 50)}...</p>
                  </div>
                  <span className="text-xs bg-muted px-2 py-1 rounded">{incidente.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
