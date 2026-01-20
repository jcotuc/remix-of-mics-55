import { supabase } from "@/integrations/supabase/client";

async function updateIncidentStatus() {
  const { error } = await supabase
    .from("incidentes")
    .update({ status: "Porcentaje" })
    .eq("codigo", "INC-000008");

  if (error) {
    console.error("Error updating incident:", error);
  } else {
    console.log("Incident INC-000008 updated to Porcentaje status");
  }
}

updateIncidentStatus();
