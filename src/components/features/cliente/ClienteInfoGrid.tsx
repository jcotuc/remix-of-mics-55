import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Phone, Mail, Calendar, Building, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatFechaCorta } from "@/utils/dateFormatters";

type ClienteInfoGridProps = {
  cliente: {
    codigo: string;
    codigo_sap?: string | null;
    nit?: string | null;
    origen?: string | null;
    created_at?: string | null;
    nombre_facturacion?: string | null;
    telefono_principal?: string | null;
    telefono_secundario?: string | null;
    celular?: string | null;
    correo?: string | null;
  };
};

function InfoRow({ label, value, icon: Icon, action }: { 
  label: string; 
  value: string | null | undefined; 
  icon?: React.ElementType;
  action?: React.ReactNode;
}) {
  if (!value) return null;
  
  return (
    <div className="flex items-start justify-between gap-2 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium truncate">{value}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function ContactLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
      <a href={href} target={href.startsWith("mailto:") ? "_blank" : undefined}>
        <ExternalLink className="h-3 w-3" />
      </a>
    </Button>
  );
}

export function ClienteInfoGrid({ cliente }: ClienteInfoGridProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Datos Generales */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Datos Generales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow label="Código" value={cliente.codigo} />
          {cliente.codigo_sap && (
            <InfoRow label="Código SAP" value={cliente.codigo_sap} />
          )}
          {cliente.nit && (
            <InfoRow 
              label="NIT" 
              value={cliente.nit}
              action={
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(cliente.nit!, "NIT")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              }
            />
          )}
          {cliente.origen && (
            <div className="flex items-center gap-2 py-1.5">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Origen</p>
                <Badge variant="outline" className="text-xs">{cliente.origen}</Badge>
              </div>
            </div>
          )}
          {cliente.created_at && (
            <InfoRow 
              label="Cliente desde" 
              value={formatFechaCorta(cliente.created_at)} 
              icon={Calendar}
            />
          )}
        </CardContent>
      </Card>

      {/* Contacto */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Contacto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {cliente.telefono_principal && (
            <InfoRow 
              label="Teléfono Principal" 
              value={cliente.telefono_principal}
              icon={Phone}
              action={<ContactLink href={`tel:${cliente.telefono_principal}`}>Llamar</ContactLink>}
            />
          )}
          {cliente.telefono_secundario && (
            <InfoRow 
              label="Tel. Secundario" 
              value={cliente.telefono_secundario}
              icon={Phone}
              action={<ContactLink href={`tel:${cliente.telefono_secundario}`}>Llamar</ContactLink>}
            />
          )}
          {cliente.correo && (
            <InfoRow 
              label="Correo" 
              value={cliente.correo}
              icon={Mail}
              action={<ContactLink href={`mailto:${cliente.correo}`}>Enviar</ContactLink>}
            />
          )}
          {!cliente.telefono_principal && !cliente.celular && !cliente.correo && (
            <p className="text-sm text-muted-foreground py-2">Sin información de contacto</p>
          )}
        </CardContent>
      </Card>

      {/* Facturación */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Facturación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {cliente.nombre_facturacion ? (
            <InfoRow 
              label="Nombre Facturación" 
              value={cliente.nombre_facturacion}
              action={
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(cliente.nombre_facturacion!, "Nombre")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground py-2">Sin datos de facturación</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
