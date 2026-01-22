import { useState, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Printer, 
  Package, 
  User, 
  MapPin, 
  Phone, 
  Calendar,
  Truck,
  FileText,
  X
} from "lucide-react";
import type { IncidenteSchema, GuiaInDBSchema } from "@/generated/entities";

interface IncidenteEnriquecido extends IncidenteSchema {
  clienteNombre: string;
  clienteCelular: string;
  clienteDireccion: string;
  guiaInfo?: GuiaInDBSchema | null;
  diasEspera: number;
}

interface DetalleDespachoSheetProps {
  incidente: IncidenteEnriquecido | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetalleDespachoSheet({ incidente, open, onOpenChange }: DetalleDespachoSheetProps) {
  const guiaPrintRef = useRef<HTMLDivElement>(null);
  const incidentePrintRef = useRef<HTMLDivElement>(null);

  if (!incidente) return null;

  const guia = incidente.guiaInfo;
  const codigoDestino = incidente.cliente?.departamento?.substring(0, 3).toUpperCase() || "GUA";
  const fechaHora = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });

  const handlePrintGuia = () => {
    const printContent = guiaPrintRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Guía ${guia?.tracking_number || incidente.codigo}</title>
          <style>
            @page { size: 4in 6in; margin: 0; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const handlePrintIncidente = () => {
    const printContent = incidentePrintRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Incidente ${incidente.codigo}</title>
          <style>
            @page { size: letter; margin: 0.5in; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 12px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const getBadgeEstado = (estado: string) => {
    switch (estado) {
      case "REPARADO": return <Badge className="bg-emerald-100 text-emerald-800">Reparada</Badge>;
      case "RECHAZADO": return <Badge variant="destructive">Rechazada</Badge>;
      case "CAMBIO_POR_GARANTIA": return <Badge className="bg-blue-100 text-blue-800">Cambio Garantía</Badge>;
      case "EN_ENTREGA": return <Badge className="bg-purple-100 text-purple-800">En Entrega</Badge>;
      default: return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {incidente.codigo}
            </SheetTitle>
            {getBadgeEstado(incidente.estado)}
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Información de Guía */}
          {guia && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="h-4 w-4 text-primary" />
                <span className="font-semibold">Información de Guía</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Número:</span>
                  <p className="font-mono font-bold text-lg">{guia.tracking_number || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Estado:</span>
                  <p className="font-medium capitalize">{guia.estado?.toLowerCase() || "-"}</p>
                </div>
              <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <p className="font-medium">{guia.tipo || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha:</span>
                  <p className="font-medium">
                    {guia.created_at ? format(new Date(guia.created_at), "dd/MM/yyyy") : "-"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Información del Cliente */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Cliente</span>
            </div>
            <div className="pl-6 space-y-2 text-sm">
              <p className="font-medium">{incidente.clienteNombre}</p>
              {incidente.clienteCelular && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {incidente.clienteCelular}
                </div>
              )}
              {incidente.clienteDireccion && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-3 w-3 mt-0.5" />
                  <span>{incidente.clienteDireccion}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Información del Producto */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Producto</span>
            </div>
            <div className="pl-6 space-y-1 text-sm">
              <p className="font-mono font-medium">{incidente.producto?.codigo || "-"}</p>
              <p className="text-muted-foreground">{incidente.producto?.descripcion || "-"}</p>
            </div>
          </div>

          <Separator />

          {/* Fechas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Fechas</span>
            </div>
            <div className="pl-6 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Ingreso:</span>
                <p className="font-medium">
                  {incidente.created_at 
                    ? format(new Date(incidente.created_at), "dd/MM/yyyy")
                    : "-"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Días en espera:</span>
                <p className={`font-bold ${incidente.diasEspera > 7 ? "text-destructive" : ""}`}>
                  {incidente.diasEspera} días
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Botones de Impresión */}
          <div className="space-y-3 pt-2">
            <Button 
              onClick={handlePrintGuia} 
              className="w-full gap-2"
              size="lg"
            >
              <Printer className="h-4 w-4" />
              Imprimir Guía de Envío
            </Button>
            <Button 
              onClick={handlePrintIncidente} 
              variant="outline"
              className="w-full gap-2"
              size="lg"
            >
              <FileText className="h-4 w-4" />
              Imprimir Hoja de Incidente
            </Button>
          </div>
        </div>

        {/* Hidden print content - Guía de Envío */}
        <div className="hidden">
          <div ref={guiaPrintRef}>
            <div
              style={{
                width: "4in",
                height: "6in",
                padding: "12px",
                backgroundColor: "#fff",
                border: "2px solid #000",
                boxSizing: "border-box",
                fontFamily: "Arial, sans-serif",
                fontSize: "12px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header: Logo + Número de Guía */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "2px solid #000",
                  paddingBottom: "8px",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      backgroundColor: "#f97316",
                      borderRadius: "4px",
                    }}
                  />
                  <span style={{ fontWeight: "bold", fontSize: "18px" }}>HPC</span>
                </div>
                <div style={{ fontWeight: "bold", fontSize: "16px", fontFamily: "monospace" }}>
                  {guia?.tracking_number || incidente.codigo}
                </div>
              </div>

              {/* Bulto + Código Destino */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <div style={{ fontSize: "10px", color: "#666" }}>Bulto</div>
                  <div style={{ fontSize: "24px", fontWeight: "bold" }}>(1/1)</div>
                </div>
                <div
                  style={{
                    fontSize: "48px",
                    fontWeight: "bold",
                    letterSpacing: "2px",
                    textAlign: "right",
                  }}
                >
                  {codigoDestino}
                </div>
              </div>

              {/* Info incidente + Fecha */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid #ccc",
                  borderBottom: "1px solid #ccc",
                  padding: "6px 0",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <div style={{ fontSize: "10px", color: "#666" }}># Llamada:</div>
                  <div style={{ fontWeight: "bold", fontSize: "13px" }}>{incidente.codigo}</div>
                  <div style={{ fontSize: "11px", color: "#444" }}>{incidente.cliente?.codigo || ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", fontWeight: "bold" }}>{fechaHora}</div>
                </div>
              </div>

              {/* Destinatario */}
              <div style={{ marginBottom: "6px" }}>
                <div style={{ fontSize: "10px", color: "#666" }}>Destinatario:</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", textTransform: "uppercase" }}>
                  {incidente.clienteNombre}
                </div>
              </div>

              {/* Dirección */}
              <div style={{ marginBottom: "6px", flex: 1 }}>
                <div
                  style={{
                    fontSize: "12px",
                    lineHeight: "1.3",
                    textTransform: "uppercase",
                  }}
                >
                  {incidente.clienteDireccion || "Sin dirección"}
                </div>
                {incidente.clienteCelular && (
                  <div style={{ fontSize: "12px", marginTop: "4px" }}>
                    Tel: {incidente.clienteCelular}
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div
                style={{
                  borderTop: "1px solid #ccc",
                  paddingTop: "8px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <QRCodeSVG value={guia?.tracking_number || incidente.codigo} size={80} level="M" />
              </div>
            </div>
          </div>
        </div>

        {/* Hidden print content - Hoja de Incidente */}
        <div className="hidden">
          <div ref={incidentePrintRef}>
            <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "40px", height: "40px", backgroundColor: "#f97316", borderRadius: "8px" }} />
                  <span style={{ fontWeight: "bold", fontSize: "24px" }}>HPC</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "20px", fontWeight: "bold" }}>{incidente.codigo}</div>
                  <div style={{ fontSize: "12px", color: "#666" }}>Hoja de Despacho</div>
                </div>
              </div>

              {/* Información del Cliente */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", borderBottom: "1px solid #ccc", paddingBottom: "4px" }}>
                  INFORMACIÓN DEL CLIENTE
                </div>
                <table style={{ width: "100%", fontSize: "12px" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "4px 0", width: "30%" }}><strong>Nombre:</strong></td>
                      <td>{incidente.clienteNombre}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 0" }}><strong>Código:</strong></td>
                      <td>{incidente.cliente?.codigo || "-"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 0" }}><strong>Teléfono:</strong></td>
                      <td>{incidente.clienteCelular || "-"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 0" }}><strong>Dirección:</strong></td>
                      <td>{incidente.clienteDireccion || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Información del Producto */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", borderBottom: "1px solid #ccc", paddingBottom: "4px" }}>
                  INFORMACIÓN DEL PRODUCTO
                </div>
                <table style={{ width: "100%", fontSize: "12px" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "4px 0", width: "30%" }}><strong>SKU:</strong></td>
                      <td style={{ fontFamily: "monospace" }}>{incidente.producto?.codigo || "-"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 0" }}><strong>Descripción:</strong></td>
                      <td>{incidente.producto?.descripcion || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Información de la Guía */}
              {guia && (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", borderBottom: "1px solid #ccc", paddingBottom: "4px" }}>
                    INFORMACIÓN DE GUÍA
                  </div>
                  <table style={{ width: "100%", fontSize: "12px" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "4px 0", width: "30%" }}><strong>Número de Guía:</strong></td>
                        <td style={{ fontFamily: "monospace", fontWeight: "bold" }}>{guia.tracking_number || "-"}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 0" }}><strong>Estado:</strong></td>
                        <td>{guia.estado || "-"}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 0" }}><strong>Fecha:</strong></td>
                        <td>{guia.created_at ? format(new Date(guia.created_at), "dd/MM/yyyy HH:mm") : "-"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Fechas */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", borderBottom: "1px solid #ccc", paddingBottom: "4px" }}>
                  FECHAS
                </div>
                <table style={{ width: "100%", fontSize: "12px" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "4px 0", width: "30%" }}><strong>Fecha Ingreso:</strong></td>
                      <td>{incidente.created_at ? format(new Date(incidente.created_at), "dd/MM/yyyy HH:mm") : "-"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 0" }}><strong>Días en Espera:</strong></td>
                      <td>{incidente.diasEspera} días</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 0" }}><strong>Fecha Impresión:</strong></td>
                      <td>{format(new Date(), "dd/MM/yyyy HH:mm")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Firma */}
              <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between" }}>
                <div style={{ width: "45%", borderTop: "1px solid #000", paddingTop: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "12px" }}>Entregado por</div>
                </div>
                <div style={{ width: "45%", borderTop: "1px solid #000", paddingTop: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "12px" }}>Recibido por</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default DetalleDespachoSheet;
