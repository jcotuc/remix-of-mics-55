import { useActiveIncidents } from "@/contexts/ActiveIncidentsContext";

export function FloatingIncidentsWidget() {
  const { activeIncidents, isLoading } = useActiveIncidents();

  // This widget is disabled because it requires fields that don't exist in the DB:
  // - codigo_producto
  // - tecnico_asignado_id
  // - status
  
  if (isLoading || activeIncidents.length === 0) {
    return null;
  }

  // Disabled - return null
  return null;
}
