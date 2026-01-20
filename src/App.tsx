import { useState, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ActiveIncidentsProvider } from "./contexts/ActiveIncidentsContext";
import { Layout } from "./components/layout";
import { allRoutes, RouteLoadingFallback } from "./routes";

function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ActiveIncidentsProvider>
              <Layout>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Routes>
                    {allRoutes}
                  </Routes>
                </Suspense>
              </Layout>
            </ActiveIncidentsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
