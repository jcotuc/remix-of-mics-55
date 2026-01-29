import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiBackendAction } from "@/lib/api-backend";
import {
  ClienteHeroCard,
  ClienteInfoGrid,
  ClienteDirecciones,
  ClienteIncidentesHistorial,
} from "@/components/features/cliente";

type ClienteData = {
  id: number;
  codigo: string;
  nombre: string;
  nit?: string | null;
  telefono_principal?: string | null;
  telefono_secundario?: string | null;
  celular?: string | null;
  correo?: string | null;
  direccion?: string | null;
  direccion_envio?: string | null;
  municipio?: string | null;
  departamento?: string | null;
  pais?: string | null;
  origen?: string | null;
  nombre_facturacion?: string | null;
  codigo_sap?: string | null;
  activo?: boolean | null;
  created_at?: string | null;
};

type IncidenteResumen = {
  id: number;
  codigo: string;
  estado: string;
  tipologia: string | null;
  descripcion_problema: string | null;
  created_at: string | null;
  producto?: { codigo: string; descripcion: string | null } | null;
};

type DireccionData = {
  id: number;
  direccion: string;
  es_principal: boolean | null;
};

const ESTADOS_FINALIZADOS = ["ENTREGADO", "CANCELADO", "CERRADO"];

export default function DetalleCliente() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [incidentes, setIncidentes] = useState<IncidenteResumen[]>([]);
  const [direcciones, setDirecciones] = useState<DireccionData[]>([]);

  useEffect(() => {
    if (codigo) {
      fetchClienteData();
    }
  }, [codigo]);

  const fetchClienteData = async () => {
    try {
      setLoading(true);

      const { results: clientes } = await apiBackendAction("clientes.search", {
        search: codigo,
        limit: 1,
      });

      if (!clientes || clientes.length === 0) {
        setLoading(false);
        return;
      }

      const { result: clienteData } = await apiBackendAction("clientes.get", {
        id: clientes[0].id,
      });

      if (clienteData) {
        setCliente(clienteData);
        setDirecciones((clienteData as any).direcciones || []);
      }

      const { results: allIncidentes } = await apiBackendAction("incidentes.list", {
        limit: 1000,
      });

      const clienteIncidentes = (allIncidentes || [])
        .filter((inc: any) => inc.cliente?.id === clientes[0].id)
        .map((inc: any) => ({
          id: inc.id,
          codigo: inc.codigo,
          estado: inc.estado,
          tipologia: inc.tipologia,
          descripcion_problema: inc.descripcion_problema,
          created_at: inc.created_at,
          producto: inc.producto,
        }));

      setIncidentes(clienteIncidentes);
    } catch (error) {
      console.error("Error fetching cliente data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas
  const stats = {
    total: incidentes.length,
    activos: incidentes.filter((i) => !ESTADOS_FINALIZADOS.includes(i.estado)).length,
    finalizados: incidentes.filter((i) => ESTADOS_FINALIZADOS.includes(i.estado)).length,
  };

  const telefonoPrincipal = [cliente?.telefono_principal, cliente?.celular, cliente?.telefono_secundario]
    .map((v) => (v ?? "").trim())
    .find(Boolean);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-center py-16">
          <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Cliente no encontrado</h2>
          <p className="text-muted-foreground mb-6">
            No se encontró un cliente con el código "{codigo}"
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Botón Volver */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>

      {/* Hero Card */}
      <ClienteHeroCard
        nombre={cliente.nombre}
        codigo={cliente.codigo}
        activo={cliente.activo !== false}
        stats={stats}
        telefono={telefonoPrincipal || null}
        onEdit={() => {/* TODO: Implementar edición */}}
        onNuevoIncidente={() => navigate("/mostrador/nuevo-incidente")}
      />

      {/* Grid de Información */}
      <ClienteInfoGrid cliente={{ ...cliente, telefono_principal: telefonoPrincipal || cliente.telefono_principal }} />

      {/* Direcciones */}
      <ClienteDirecciones
        direccionPrincipal={cliente.direccion}
        ubicacion={{
          municipio: cliente.municipio,
          departamento: cliente.departamento,
          pais: cliente.pais,
        }}
        direcciones={direcciones}
      />

      {/* Historial de Incidentes */}
      <ClienteIncidentesHistorial incidentes={incidentes} />
    </div>
  );
}
