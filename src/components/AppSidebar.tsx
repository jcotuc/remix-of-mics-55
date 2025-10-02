import { Users, Package, Wrench, FileText, Truck, LogOut } from "lucide-react";
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
  roles: string[];
};

const allMenuItems: MenuItem[] = [
  { title: "Clientes", url: "/clientes", icon: Users, roles: ["mostrador", "admin"] },
  { title: "Productos", url: "/productos", icon: Package, roles: ["mostrador", "admin"] },
  { title: "Repuestos", url: "/repuestos", icon: Wrench, roles: ["mostrador", "bodega", "admin"] },
  { title: "Incidentes", url: "/incidentes", icon: FileText, roles: ["mostrador", "admin"] },
  { title: "Embarques", url: "/logistica/embarques", icon: Truck, roles: ["logistica", "admin"] },
  { title: "Asignaciones", url: "/taller/asignaciones", icon: Wrench, roles: ["taller", "admin"] },
  { title: "Presupuestos", url: "/taller/presupuestos", icon: FileText, roles: ["taller", "admin"] },
  { title: "Inventario", url: "/bodega/inventario", icon: Package, roles: ["bodega", "admin"] },
  { title: "Solicitudes", url: "/bodega/solicitudes", icon: Wrench, roles: ["bodega", "admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const { userRole, signOut } = useAuth();

  const menuItems = allMenuItems.filter(item => 
    userRole && item.roles.includes(userRole)
  );

  const isActive = (path: string) => currentPath.startsWith(path);
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium" 
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

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
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className={`text-sidebar-foreground font-semibold ${isCollapsed ? "sr-only" : ""}`}>
            {userRole === 'mostrador' && 'Mostrador'}
            {userRole === 'logistica' && 'Logística'}
            {userRole === 'taller' && 'Taller'}
            {userRole === 'bodega' && 'Bodega'}
            {userRole === 'admin' && 'Administración'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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