import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col w-full min-w-0">
          {/* Header responsive */}
          <header className="h-14 sm:h-16 border-b border-border bg-secondary flex items-center px-3 sm:px-6 shadow-md sticky top-0 z-10">
            <SidebarTrigger className="mr-2 sm:mr-4 text-secondary-foreground hover:bg-secondary-foreground/10" />
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs sm:text-sm">CS</span>
              </div>
              <div>
                <h1 className="text-sm sm:text-lg font-bold text-secondary-foreground">
                  Sistema de Gestión
                </h1>
                <p className="text-[10px] sm:text-xs text-secondary-foreground/70 hidden xs:block">Centro de Servicio</p>
              </div>
            </div>
          </header>
          
          <main className="flex-1 p-3 sm:p-4 md:p-6 bg-muted/30 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}