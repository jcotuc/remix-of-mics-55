import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Truck, FileSpreadsheet } from "lucide-react";
import AnalisisABCXYZ from "@/components/bodega/AnalisisABCXYZ";
import AbastecimientoCentrosTab from "@/components/bodega/AbastecimientoCentrosTab";
import SugeridoMexico from "@/components/bodega/SugeridoMexico";

const AnalisisYAbastecimiento = () => {
  const [activeTab, setActiveTab] = useState("analisis");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Centro de Análisis y Abastecimiento
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Análisis ABC-XYZ, gestión de abastecimiento a centros y sugeridos de importación
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="analisis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Análisis ABC-XYZ</span>
            <span className="sm:hidden">ABC-XYZ</span>
          </TabsTrigger>
          <TabsTrigger value="abastecimiento" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Abastecimiento</span>
            <span className="sm:hidden">Abast.</span>
          </TabsTrigger>
          <TabsTrigger value="sugerido" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Sugerido México</span>
            <span className="sm:hidden">México</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analisis" className="mt-4">
          <AnalisisABCXYZ />
        </TabsContent>

        <TabsContent value="abastecimiento" className="mt-4">
          <AbastecimientoCentrosTab />
        </TabsContent>

        <TabsContent value="sugerido" className="mt-4">
          <SugeridoMexico />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalisisYAbastecimiento;
