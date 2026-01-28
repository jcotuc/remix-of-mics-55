import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Search,
  Package,
  Truck,
  ClipboardList,
  Wrench,
  FileText,
  Users,
  MessageSquare,
  LayoutGrid,
} from "lucide-react";

interface QuickAction {
  icon: React.ElementType;
  label: string;
  path: string;
  description: string;
}

const actionsByRole: Record<string, QuickAction[]> = {
  admin: [
    { icon: Plus, label: "Nuevo Incidente", path: "/mostrador/incidentes/nuevo", description: "Registrar ingreso" },
    { icon: Search, label: "Buscar", path: "/taller/busqueda", description: "Buscar incidentes" },
    { icon: Package, label: "Entregas", path: "/mostrador/entrega-maquinas", description: "Entregas pendientes" },
    { icon: LayoutGrid, label: "Dashboard", path: "/", description: "Vista general" },
  ],
  mostrador: [
    { icon: Plus, label: "Nuevo Incidente", path: "/mostrador/incidentes/nuevo", description: "Registrar ingreso" },
    { icon: Package, label: "Entregas", path: "/mostrador/entrega-maquinas", description: "Entregas pendientes" },
    { icon: Search, label: "Consulta Precios", path: "/mostrador/consulta-precios", description: "Ver precios" },
    { icon: FileText, label: "Incidentes", path: "/mostrador/incidentes", description: "Lista de incidentes" },
  ],
  taller: [
    { icon: ClipboardList, label: "Mis Asignaciones", path: "/taller/mis-asignaciones", description: "Ver asignados" },
    { icon: Wrench, label: "Diagnóstico", path: "/taller/diagnostico", description: "Iniciar diagnóstico" },
    { icon: Search, label: "Buscar", path: "/taller/busqueda", description: "Buscar incidentes" },
    { icon: Package, label: "Repuestos", path: "/taller/pendientes-repuestos", description: "Ver pendientes" },
  ],
  tecnico: [
    { icon: ClipboardList, label: "Mis Asignaciones", path: "/taller/mis-asignaciones", description: "Ver asignados" },
    { icon: Wrench, label: "Diagnóstico", path: "/taller/diagnostico", description: "Iniciar diagnóstico" },
    { icon: Search, label: "Buscar", path: "/taller/busqueda", description: "Buscar incidentes" },
    { icon: Package, label: "Repuestos", path: "/taller/pendientes-repuestos", description: "Ver pendientes" },
  ],
  sac: [
    { icon: MessageSquare, label: "Incidentes SAC", path: "/sac/incidentes", description: "Gestionar casos" },
    { icon: Search, label: "Existencias", path: "/sac/consulta-existencias", description: "Consultar stock" },
    { icon: Users, label: "Clientes", path: "/logistica/clientes", description: "Ver clientes" },
    { icon: FileText, label: "Incidentes", path: "/mostrador/incidentes", description: "Ver estados" },
  ],
  logistica: [
    { icon: Truck, label: "Embarques", path: "/logistica/embarques", description: "Ver embarques" },
    { icon: FileText, label: "Guías", path: "/logistica/guias", description: "Gestionar guías" },
    { icon: Package, label: "Ingreso Máquinas", path: "/logistica/ingreso-maquinas", description: "Registrar ingreso" },
    { icon: Users, label: "Clientes", path: "/logistica/clientes", description: "Ver clientes" },
  ],
  jefe_taller: [
    { icon: Package, label: "Pendientes", path: "/taller/pendientes-repuestos", description: "Espera repuestos" },
    { icon: Users, label: "Asignación", path: "/taller/asignacion-tecnicos", description: "Asignar técnicos" },
    { icon: ClipboardList, label: "Reasignaciones", path: "/taller/reasignaciones", description: "Balancear carga" },
    { icon: Truck, label: "Transferencias", path: "/taller/transferencias", description: "Entre centros" },
  ],
};

export function QuickActions() {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const actions = actionsByRole[userRole || "admin"] || actionsByRole.admin;

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {actions.map((action) => (
            <Button
              key={action.path}
              variant="outline"
              className="h-auto flex-col gap-1.5 py-4 hover:bg-primary/5 hover:border-primary/30"
              onClick={() => navigate(action.path)}
            >
              <action.icon className="h-5 w-5 text-primary" />
              <span className="font-medium text-xs">{action.label}</span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {action.description}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
