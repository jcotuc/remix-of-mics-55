import { Users, Package, Wrench, FileText, Truck, LogOut, Home, ShoppingCart, DollarSign, ClipboardList } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type MenuItem = {
  title: string;
  url: string;
  icon: any;
};

// Menús organizados por área
const menuAreas = {
  home: [
    { title: "Dashboard", url: "/", icon: Home }
  ],
  mostrador: [
    { title: "Clientes", url: "/mostrador/clientes", icon: Users },
    { title: "Repuestos", url: "/mostrador/repuestos", icon: Wrench },
    { title: "Consulta Precios", url: "/mostrador/consulta-precios", icon: DollarSign },
    { title: "Incidentes", url: "/mostrador/incidentes", icon: FileText },
  ],
  logistica: [
    { title: "Embarques", url: "/logistica/embarques", icon: Truck },
  ],
  taller: [
    { title: "Asignaciones", url: "/taller/asignaciones", icon: Wrench },
    { title: "Mis Asignaciones", url: "/taller/mis-asignaciones", icon: ClipboardList },
    { title: "Presupuestos", url: "/taller/presupuestos", icon: DollarSign },
  ],
  bodega: [
    { title: "Inventario", url: "/bodega/inventario", icon: Package },
    { title: "Solicitudes", url: "/bodega/solicitudes", icon: ShoppingCart },
  ],
  digitador: [
    { title: "Pendientes", url: "/digitador/pendientes", icon: FileText },
  ]
};

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const { userRole, signOut } = useAuth();

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium" 
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

  const renderMenuSection = (title: string, items: MenuItem[]) => (
    <SidebarGroup key={title}>
      <SidebarGroupLabel className={`text-sidebar-foreground font-semibold ${isCollapsed ? "sr-only" : ""}`}>
        {title}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink to={item.url} className={getNavCls} end={item.url === "/"}>
                  <item.icon className="h-4 w-4" />
                  {!isCollapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          <h2 className={`font-bold text-lg text-sidebar-foreground ${isCollapsed ? "hidden" : "block"}`}>
            Centro de Servicio
          </h2>
          {isCollapsed && (
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <Wrench className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          {!isCollapsed && userRole && (
            <div className="mt-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {userRole === 'mostrador' && 'Mostrador'}
                {userRole === 'logistica' && 'Logística'}
                {userRole === 'taller' && 'Taller'}
                {userRole === 'bodega' && 'Bodega'}
                {userRole === 'admin' && 'Administrador'}
              </span>
            </div>
          )}
        </div>
        
        {/* Mostrar todas las secciones para desarrollo */}
        {renderMenuSection("Home", menuAreas.home)}
        {renderMenuSection("Mostrador", menuAreas.mostrador)}
        {renderMenuSection("Logística", menuAreas.logistica)}
        {renderMenuSection("Taller", menuAreas.taller)}
        {renderMenuSection("Digitador", menuAreas.digitador)}
        {renderMenuSection("Bodega", menuAreas.bodega)}

        <div className="mt-auto p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}