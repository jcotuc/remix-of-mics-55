import { supabase } from "@/integrations/supabase/client";

// Repuestos para la máquina 13180 (CLNE-18)
const repuestos13180 = [
  { numero: "1", codigo: "931363", clave: "R1-CLNE-18", descripcion: "Tornillo M4x14" },
  { numero: "2", codigo: "931364", clave: "R2-CLNE-18", descripcion: "Buje de escape" },
  { numero: "3", codigo: "931365", clave: "R3-CLNE-18", descripcion: "Escape de aire" },
  { numero: "4", codigo: "931366", clave: "R4-CLNE-18", descripcion: "Tornillo M5x22" },
  { numero: "5", codigo: "931367", clave: "R5-CLNE-18", descripcion: "Sello 7.8x1.9" },
  { numero: "6", codigo: "931368", clave: "R6-CLNE-18", descripcion: "Tapa cilindrica" },
  { numero: "7", codigo: "931369", clave: "R7-CLNE-18", descripcion: "Calza" },
  { numero: "8", codigo: "931370", clave: "R7-CLNE-18", descripcion: "Sello 13.6x2x4" },
  { numero: "9", codigo: "931371", clave: "R8-CLNE-18", descripcion: "Junta de cilindro" },
  { numero: "10", codigo: "931372", clave: "R10-CLNE-18", descripcion: "Resorte" },
  { numero: "11", codigo: "931373", clave: "R11-CLNE-18", descripcion: "Pistón" },
  { numero: "12", codigo: "931374", clave: "R12-CLNE-18", descripcion: "Sello 32.99x2.6" },
  { numero: "13", codigo: "931375", clave: "R13-CLNE-18", descripcion: "Sello 27.3x3.55" },
  { numero: "14", codigo: "931376", clave: "R14-CLNE-18", descripcion: "Sello 13.87x3.5" },
  { numero: "15", codigo: "931377", clave: "R15-CLNE-18", descripcion: "Sello 40.3x2x5" },
  { numero: "16", codigo: "931378", clave: "R16-CLNE-18", descripcion: "Collarín de soporte" },
  { numero: "17", codigo: "931379", clave: "R17-CLNE-18", descripcion: "Sello 32.7x2.5" },
  { numero: "18", codigo: "931380", clave: "R18-CLNE-18", descripcion: "Cilindro" },
  { numero: "19", codigo: "931381", clave: "R19-CLNE-18", descripcion: "Sello 22x3" },
  { numero: "20", codigo: "931382", clave: "R20-CLNE-18", descripcion: "Pistón guía" },
  { numero: "21", codigo: "931383", clave: "R21-CLNE-18", descripcion: "Tope" },
  { numero: "22", codigo: "931384", clave: "R22-CLNE-18", descripcion: "Mango" },
  { numero: "23", codigo: "931385", clave: "R23-CLNE-18", descripcion: "Cuerpo" },
  { numero: "24", codigo: "931386", clave: "R24-CLNE-18", descripcion: "Sello 35x3.9" },
  { numero: "25", codigo: "931387", clave: "R25-CLNE-18", descripcion: "" },
  { numero: "26", codigo: "931388", clave: "R26-CLNE-18", descripcion: "Conector de entrada de aire" },
  { numero: "27", codigo: "931389", clave: "R27-CLNE-18", descripcion: "Boquilla" },
  { numero: "28", codigo: "931390", clave: "R28-CLNE-18", descripcion: "Guía de seguridad" },
  { numero: "29", codigo: "931391", clave: "R29-CLNE-18", descripcion: "Resorte" },
  { numero: "30", codigo: "931392", clave: "R30-CLNE-18", descripcion: "Soporte de seguridad" },
  { numero: "31", codigo: "931393", clave: "R31-CLNE-18", descripcion: "Biela de seguridad" },
  { numero: "32", codigo: "931394", clave: "R32-CLNE-18", descripcion: "Seguro 2.5" },
  { numero: "33", codigo: "931395", clave: "R33-CLNE-18", descripcion: "Impulsor" },
  { numero: "34", codigo: "931396", clave: "R34-CLNE-18", descripcion: "Sello 1.2x1.9" },
  { numero: "35", codigo: "931397", clave: "R35-CLNE-18", descripcion: "Perno 3x26" },
  { numero: "36", codigo: "931398", clave: "R36-CLNE-18", descripcion: "" },
  { numero: "37", codigo: "931399", clave: "R37-CLNE-18", descripcion: "" },
  { numero: "38", codigo: "931400", clave: "R38-CLNE-18", descripcion: "Perno 2x17" },
  { numero: "39", codigo: "931401", clave: "R39-CLNE-18", descripcion: "Sello 12.5x8x1.5" },
  { numero: "40", codigo: "931402", clave: "R40-CLNE-18", descripcion: "" },
  { numero: "41", codigo: "931403", clave: "R41-CLNE-18", descripcion: "Resorte" },
  { numero: "42", codigo: "931404", clave: "R42-CLNE-18", descripcion: "Sello 2.2x1.5" },
  { numero: "43", codigo: "931405", clave: "R43-CLNE-18", descripcion: "Vástago de válvula" },
  { numero: "44", codigo: "931406", clave: "R44-CLNE-18", descripcion: "Guía de válvula" },
  { numero: "45", codigo: "931407", clave: "R45-CLNE-18", descripcion: "Sello 11.2x1.9" },
  { numero: "46", codigo: "931408", clave: "R46-CLNE-18", descripcion: "Tornillo M5x20" },
  { numero: "47", codigo: "931409", clave: "R47-CLNE-18", descripcion: "Tuerca 5" },
  { numero: "48", codigo: "931410", clave: "R48-CLNE-18", descripcion: "Tornillo M4x6" },
  { numero: "49", codigo: "931411", clave: "R49-CLNE-18", descripcion: "Fijador" },
  { numero: "50", codigo: "931412", clave: "R50-CLNE-18", descripcion: "Resorte" },
  { numero: "51", codigo: "931413", clave: "R51-CLNE-18", descripcion: "Soporte de cargador" },
  { numero: "52", codigo: "931414", clave: "R52-CLNE-18", descripcion: "Perno 3x3.5" },
  { numero: "53", codigo: "931415", clave: "R53-CLNE-18", descripcion: "" },
  { numero: "54", codigo: "931416", clave: "R54-CLNE-18", descripcion: "Tira" },
  { numero: "55", codigo: "931417", clave: "R55-CLNE-18", descripcion: "Soporte trasero" },
  { numero: "56", codigo: "931418", clave: "R56-CLNE-18", descripcion: "Cargador móvil" },
  { numero: "57", codigo: "931419", clave: "R57-CLNE-18", descripcion: "Resorte" },
  { numero: "58", codigo: "931420", clave: "R58-CLNE-18", descripcion: "Perno 2.5x12" },
  { numero: "59", codigo: "931421", clave: "R59-CLNE-18", descripcion: "Unidad de empuje" },
  { numero: "60", codigo: "931422", clave: "R60-CLNE-18", descripcion: "Perno 1.5x15" },
  { numero: "61", codigo: "931423", clave: "R61-CLNE-18", descripcion: "Guía de controlador" },
  { numero: "62", codigo: "931424", clave: "R62-CLNE-18", descripcion: "Espaciador" },
  { numero: "63", codigo: "931425", clave: "R63-CLNE-18", descripcion: "Perno 3x18" },
  { numero: "64", codigo: "931426", clave: "R64-CLNE-18", descripcion: "Perno 3x14.8" },
  { numero: "65", codigo: "931427", clave: "R65-CLNE-18", descripcion: "Tapa guía" },
  { numero: "66", codigo: "931428", clave: "R66-CLNE-18", descripcion: "Arandela de presión" },
  { numero: "67", codigo: "931429", clave: "R67-CLNE-18", descripcion: "Pasador de liberación" },
  { numero: "68", codigo: "931430", clave: "R68-CLNE-18", descripcion: "Arandela" },
  { numero: "69", codigo: "931431", clave: "R69-CLNE-18", descripcion: "Muelle de torsión" }
];

// Repuestos para la máquina 14659 (ROTO-1/2A9)
const repuestos14659 = [
  { numero: "1", codigo: "929966", clave: "R1-ROTO-1/2A9", descripcion: "Cable de alimentación" },
  { numero: "2", codigo: "929967", clave: "R2-ROTO-1/2A9", descripcion: "Protector de cable" },
  { numero: "4", codigo: "929968", clave: "R4-ROTO-1/2A9", descripcion: "Interruptor" },
  { numero: "5", codigo: "929969", clave: "R5-ROTO-1/2A9", descripcion: "" },
  { numero: "6", codigo: "929970", clave: "R6-ROTO-1/2A9", descripcion: "Opresor de cable" },
  { numero: "7", codigo: "929971", clave: "R7-ROTO-1/2A9", descripcion: "Tornillos St 4x16" },
  { numero: "8", codigo: "929972", clave: "R8-ROTO-1/2A9", descripcion: "Carbones" },
  { numero: "9", codigo: "929973", clave: "R9-ROTO-1/2A9", descripcion: "Resorte" },
  { numero: "10", codigo: "929974", clave: "R10-ROTO-1/2A9", descripcion: "Porta carbón" },
  { numero: "13", codigo: "929975", clave: "R13-ROTO-1/2A9", descripcion: "Tornillos St 3x8" },
  { numero: "14", codigo: "929976", clave: "R14-ROTO-1/2A9", descripcion: "Mango derecho" },
  { numero: "16", codigo: "929977", clave: "R16-ROTO-1/2A9", descripcion: "Carcasa" },
  { numero: "18", codigo: "929978", clave: "R18-ROTO-1/2A9", descripcion: "Campo" },
  { numero: "20", codigo: "929979", clave: "R20-ROTO-1/2A9", descripcion: "Arandela plana Ø4" },
  { numero: "21", codigo: "929980", clave: "R21-ROTO-1/2A9", descripcion: "Tornillo St 4x50" },
  { numero: "22", codigo: "929981", clave: "R22-ROTO-1/2A9", descripcion: "" },
  { numero: "23", codigo: "929982", clave: "R23-ROTO-1/2A9", descripcion: "Balero de bolas 627" },
  { numero: "24", codigo: "929983", clave: "R24-ROTO-1/2A9", descripcion: "Armadura" },
  { numero: "25", codigo: "929984", clave: "R25-ROTO-1/2A9", descripcion: "Balero de bolas 609" },
  { numero: "26", codigo: "929985", clave: "R26-ROTO-1/2A9", descripcion: "Soporte con engrane" },
  { numero: "28", codigo: "929987", clave: "R28-ROTO-1/2A9", descripcion: "Balero de agujas HK0810" },
  { numero: "29", codigo: "929988", clave: "R29-ROTO-1/2A9", descripcion: "Engrane grande" },
  { numero: "30", codigo: "929989", clave: "R30-ROTO-1/2A9", descripcion: "Caja de engranes" },
  { numero: "31", codigo: "929990", clave: "R31-ROTO-1/2A9", descripcion: "Tornillo St 5x40" },
  { numero: "32", codigo: "929991", clave: "R32-ROTO-1/2A9", descripcion: "Soporte de bloqueo" },
  { numero: "33", codigo: "929992", clave: "R33-ROTO-1/2A9", descripcion: "Botón de velocidad" },
  { numero: "34", codigo: "929993", clave: "R34-ROTO-1/2A9", descripcion: "Base de botón" },
  { numero: "35", codigo: "929994", clave: "R35-ROTO-1/2A9", descripcion: "Seguro" },
  { numero: "36", codigo: "929995", clave: "R36-ROTO-1/2A9", descripcion: "Balero de bolas 6201" },
  { numero: "37", codigo: "929996", clave: "R37-ROTO-1/2A9", descripcion: "Resorte" },
  { numero: "38", codigo: "929997", clave: "R38-ROTO-1/2A9", descripcion: "Balín Ø5" },
  { numero: "39", codigo: "929998", clave: "R39-ROTO-1/2A9", descripcion: "Eje" },
  { numero: "40", codigo: "929999", clave: "R40-ROTO-1/2A9", descripcion: "Seguro Ø32" },
  { numero: "41", codigo: "930001", clave: "R41-ROTO-1/2A9", descripcion: "Arandela plana" },
  { numero: "41.1", codigo: "930002", clave: "R41.1-ROTO-1/2A9", descripcion: "Arandela de filtro" },
  { numero: "42", codigo: "930003", clave: "R42-ROTO-1/2A9", descripcion: "Seguro Ø34" },
  { numero: "43", codigo: "930004", clave: "R43-ROTO-1/2A9", descripcion: "Broquero Ø13" },
  { numero: "44", codigo: "930005", clave: "R44-ROTO-1/2A9", descripcion: "Llave Ø13" },
  { numero: "45", codigo: "930006", clave: "R45-ROTO-1/2A9", descripcion: "Tornillo M5x25" },
  { numero: "46", codigo: "930007", clave: "R46-ROTO-1/2A9", descripcion: "Mango auxiliar" },
  { numero: "47", codigo: "930008", clave: "R47-ROTO-1/2A9", descripcion: "Escala" }
];

export async function insertRepuestos13180() {
  console.log('Insertando repuestos para producto 13180...');
  
  const repuestosToInsert = repuestos13180.map(r => ({
    numero: r.numero,
    codigo: r.codigo,
    clave: r.clave,
    descripcion: r.descripcion,
    codigo_producto: '13180'
  }));

  const { data, error } = await supabase
    .from('repuestos')
    .upsert(repuestosToInsert, { 
      onConflict: 'codigo',
      ignoreDuplicates: false 
    })
    .select();

  if (error) {
    console.error('Error insertando repuestos 13180:', error);
    return { success: false, error };
  }

  console.log(`✓ ${repuestosToInsert.length} repuestos insertados para producto 13180`);
  return { success: true, data };
}

export async function insertRepuestos14659() {
  console.log('Insertando repuestos para producto 14659...');
  
  const repuestosToInsert = repuestos14659.map(r => ({
    numero: r.numero,
    codigo: r.codigo,
    clave: r.clave,
    descripcion: r.descripcion,
    codigo_producto: '14659'
  }));

  const { data, error } = await supabase
    .from('repuestos')
    .upsert(repuestosToInsert, { 
      onConflict: 'codigo',
      ignoreDuplicates: false 
    })
    .select();

  if (error) {
    console.error('Error insertando repuestos 14659:', error);
    return { success: false, error };
  }

  console.log(`✓ ${repuestosToInsert.length} repuestos insertados para producto 14659`);
  return { success: true, data };
}

export async function insertAllRepuestos() {
  console.log('Iniciando inserción de todos los repuestos...');
  
  const result13180 = await insertRepuestos13180();
  const result14659 = await insertRepuestos14659();

  if (result13180.success && result14659.success) {
    console.log('✓ Todos los repuestos fueron insertados exitosamente');
    return { success: true };
  } else {
    console.error('Hubo errores durante la inserción');
    return { 
      success: false, 
      errors: {
        repuestos13180: result13180.error,
        repuestos14659: result14659.error
      }
    };
  }
}
