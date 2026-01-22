import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

interface GuiaEnvioLabelProps {
  numeroGuia: string;
  codigoDestino: string; // Ej: "SOL", "GUA", "QUE"
  bultoActual?: number;
  bultoTotal?: number;
  fechaHora: string;
  empacador?: string;
  numeroIncidente: string;
  codigoCliente?: string;
  destinatario: string;
  direccion: string;
  telefono?: string;
}

export function GuiaEnvioLabel({
  numeroGuia,
  codigoDestino,
  bultoActual = 1,
  bultoTotal = 1,
  fechaHora,
  empacador = "",
  numeroIncidente,
  codigoCliente = "",
  destinatario,
  direccion,
  telefono,
}: GuiaEnvioLabelProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Guía ${numeroGuia}</title>
          <style>
            @page { 
              size: 4in 6in; 
              margin: 0; 
            }
            body { 
              margin: 0; 
              padding: 0;
              font-family: Arial, sans-serif;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  return (
    <>
      <div ref={printRef}>
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
              {numeroGuia}
            </div>
          </div>

          {/* Segunda fila: Bulto + Código Destino */}
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
              <div style={{ fontSize: "24px", fontWeight: "bold" }}>
                ({bultoActual}/{bultoTotal})
              </div>
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

          {/* Tercera fila: Info incidente + Fecha */}
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
              <div style={{ fontWeight: "bold", fontSize: "13px" }}>{numeroIncidente}</div>
              {codigoCliente && (
                <div style={{ fontSize: "11px", color: "#444" }}>{codigoCliente}</div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "13px", fontWeight: "bold" }}>{fechaHora}</div>
              {empacador && (
                <div style={{ fontSize: "10px", color: "#666" }}>
                  <span>Empacador:</span>
                  <div style={{ fontWeight: "500" }}>{empacador}</div>
                </div>
              )}
            </div>
          </div>

          {/* Destinatario */}
          <div style={{ marginBottom: "6px" }}>
            <div style={{ fontSize: "10px", color: "#666" }}>Destinatario:</div>
            <div style={{ fontSize: "14px", fontWeight: "bold", textTransform: "uppercase" }}>
              {destinatario}
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
              {direccion}
            </div>
            {telefono && (
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                Tel: {telefono}
              </div>
            )}
          </div>

          {/* Código de barras (simulado con QR) */}
          <div
            style={{
              borderTop: "1px solid #ccc",
              paddingTop: "8px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <QRCodeSVG value={numeroGuia} size={80} level="M" />
          </div>
        </div>
      </div>

      <button
        onClick={handlePrint}
        style={{
          marginTop: "12px",
          padding: "8px 16px",
          backgroundColor: "#f97316",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Imprimir Etiqueta
      </button>
    </>
  );
}

export default GuiaEnvioLabel;
