import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

interface GuiaRecolectaLabelProps {
  numeroGuia: string;
  codigoOrigen: string; // Ej: "GUA", "SOL"
  bultoActual?: number;
  bultoTotal?: number;
  fechaHora: string;
  // Remitente (quien envía - el cliente)
  remitente: string;
  direccionRemitente: string;
  telefonoRemitente?: string;
  // Destinatario (a dónde va - el centro de servicio)
  destinatario: string;
  direccionDestinatario: string;
  telefonoDestinatario?: string;
  // Referencia
  numeroIncidente?: string;
}

export function GuiaRecolectaLabel({
  numeroGuia,
  codigoOrigen,
  bultoActual = 1,
  bultoTotal = 1,
  fechaHora,
  remitente,
  direccionRemitente,
  telefonoRemitente,
  destinatario,
  direccionDestinatario,
  telefonoDestinatario,
  numeroIncidente,
}: GuiaRecolectaLabelProps) {
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
          <title>Guía Recolecta ${numeroGuia}</title>
          <style>
            @page { 
              size: 4in 4in; 
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
            height: "4in",
            padding: "10px",
            backgroundColor: "#fff",
            border: "2px solid #000",
            boxSizing: "border-box",
            fontFamily: "Arial, sans-serif",
            fontSize: "10px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Layout de 2 columnas */}
          <div
            style={{
              display: "flex",
              flex: 1,
              gap: "8px",
            }}
          >
            {/* Columna Izquierda - Remitente */}
            <div
              style={{
                flex: 1,
                borderRight: "1px dashed #999",
                paddingRight: "8px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: "8px",
                  color: "#666",
                  marginBottom: "2px",
                  textTransform: "uppercase",
                }}
              >
                Remitente:
              </div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                  lineHeight: "1.2",
                }}
              >
                {remitente}
              </div>
              <div
                style={{
                  fontSize: "8px",
                  color: "#666",
                  marginBottom: "2px",
                }}
              >
                Dirección:
              </div>
              <div
                style={{
                  fontSize: "9px",
                  lineHeight: "1.2",
                  marginBottom: "4px",
                }}
              >
                {direccionRemitente}
              </div>
              {telefonoRemitente && (
                <div style={{ fontSize: "9px" }}>Tel: {telefonoRemitente}</div>
              )}

              {/* Código de origen grande */}
              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #000",
                  padding: "4px 8px",
                  fontWeight: "bold",
                  fontSize: "20px",
                }}
              >
                {codigoOrigen}
              </div>
            </div>

            {/* Columna Derecha - Destinatario + Info */}
            <div
              style={{
                flex: 1,
                paddingLeft: "8px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: "8px",
                  color: "#666",
                  marginBottom: "2px",
                  textTransform: "uppercase",
                }}
              >
                Destinatario:
              </div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                  lineHeight: "1.2",
                }}
              >
                {destinatario}
              </div>
              <div
                style={{
                  fontSize: "8px",
                  color: "#666",
                  marginBottom: "2px",
                }}
              >
                Dirección:
              </div>
              <div
                style={{
                  fontSize: "9px",
                  lineHeight: "1.2",
                  marginBottom: "4px",
                }}
              >
                {direccionDestinatario}
              </div>
              {telefonoDestinatario && (
                <div style={{ fontSize: "9px" }}>Tel: {telefonoDestinatario}</div>
              )}

              {/* Número de guía y referencia */}
              <div style={{ marginTop: "auto" }}>
                <div style={{ fontSize: "8px", color: "#666" }}>No:</div>
                <div style={{ fontSize: "12px", fontWeight: "bold", fontFamily: "monospace" }}>
                  {numeroGuia}
                </div>
                
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "4px",
                    borderTop: "1px solid #ccc",
                    paddingTop: "4px",
                  }}
                >
                  <div style={{ fontSize: "10px" }}>
                    {bultoActual}/{bultoTotal}
                  </div>
                  {numeroIncidente && (
                    <div style={{ fontSize: "9px", fontFamily: "monospace" }}>
                      {numeroIncidente}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer con fecha y código de barras */}
          <div
            style={{
              borderTop: "1px solid #000",
              marginTop: "8px",
              paddingTop: "6px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "9px" }}>{fechaHora}</div>
            <QRCodeSVG value={numeroGuia} size={50} level="M" />
          </div>
        </div>
      </div>

      <button
        onClick={handlePrint}
        style={{
          marginTop: "12px",
          padding: "8px 16px",
          backgroundColor: "#3b82f6",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Imprimir Etiqueta Recolecta
      </button>
    </>
  );
}

export default GuiaRecolectaLabel;
