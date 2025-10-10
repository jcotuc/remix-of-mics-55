import { supabase } from "@/integrations/supabase/client";

// Repuestos para producto 15006 (COMP-25LT)
const repuestos15006 = [
  { numero: "1", codigo: "934541", clave: "R1-COMP-25LT", descripcion: "Carter del motor OTRUPER" },
  { numero: "2", codigo: "934542", clave: "R2-COMP-25LT", descripcion: "Cigüeñal" },
  { numero: "3", codigo: "934543", clave: "R3-COMP-25LT", descripcion: "Biela" },
  { numero: "4", codigo: "934544", clave: "R4-COMP-25LT", descripcion: "Tornillo M8x22 cuerda izquierda" },
  { numero: "5", codigo: "934545", clave: "R5-COMP-25LT", descripcion: "Junta" },
  { numero: "6", codigo: "934546", clave: "R6-COMP-25LT", descripcion: "Tapa del carter TRUPER" },
  { numero: "7", codigo: "934547", clave: "R7-COMP-25LT", descripcion: "Sello del tapón Jutricado" },
  { numero: "8", codigo: "934548", clave: "R8-COMP-25LT", descripcion: "Mirilla del nivel de aceite" },
  { numero: "9", codigo: "934549", clave: "R9-COMP-25LT", descripcion: "Tornillo M6x16" },
  { numero: "10", codigo: "934550", clave: "R10-COMP-25LT", descripcion: "Tapón de aceite" },
  { numero: "11", codigo: "934551", clave: "R11-COMP-25LT", descripcion: "Seguro \"C\" Ø" },
  { numero: "12", codigo: "934552", clave: "R12-COMP-25LT", descripcion: "Perno de pistón" },
  { numero: "13", codigo: "934553", clave: "R13-COMP-25LT", descripcion: "Pistón" },
  { numero: "14", codigo: "934554", clave: "R14-COMP-25LT", descripcion: "Set de anillos" },
  { numero: "15", codigo: "934554A", clave: "R15-COMP-25LT", descripcion: "Set de anillos" },
  { numero: "16", codigo: "934555", clave: "R16-COMP-25LT", descripcion: "Junta de cilindro" },
  { numero: "17", codigo: "934556", clave: "R17-COMP-25LT", descripcion: "Cilindro" },
  { numero: "18", codigo: "934557", clave: "R18-COMP-25LT", descripcion: "Soporte de válvula" },
  { numero: "20", codigo: "934558", clave: "R20-COMP-25LT", descripcion: "Junta de válvula" },
  { numero: "21", codigo: "934559", clave: "R21-COMP-25LT", descripcion: "Ensamble de válvula" },
  { numero: "24", codigo: "934560", clave: "R24-COMP-25LT", descripcion: "Arandela de presión M5" },
  { numero: "25", codigo: "934561", clave: "R25-COMP-25LT", descripcion: "Tornillo M4x6" },
  { numero: "26", codigo: "934562", clave: "R26-COMP-25LT", descripcion: "Junta de cilindro superior" },
  { numero: "27", codigo: "934563", clave: "R27-COMP-25LT", descripcion: "Tapa del cilindro" },
  { numero: "28", codigo: "934564", clave: "R28-COMP-25LT", descripcion: "Tornillos M7x105" },
  { numero: "29", codigo: "934565", clave: "R29-COMP-25LT", descripcion: "Conector de descarga" },
  { numero: "30", codigo: "934566", clave: "R30-COMP-25LT", descripcion: "Filtro de aire" },
  { numero: "31", codigo: "934567", clave: "R31-COMP-25LT", descripcion: "Capacitor 125uF 250 VAC" },
  { numero: "32", codigo: "934568", clave: "R32-COMP-25LT", descripcion: "Capuchón enroscable" },
  { numero: "33", codigo: "934569", clave: "R33-COMP-25LT", descripcion: "Arandela ondulada Ø5" },
  { numero: "34", codigo: "934570", clave: "R34-COMP-25LT", descripcion: "Tornillo M5x105" },
  { numero: "35", codigo: "934571", clave: "R35-COMP-25LT", descripcion: "" },
  { numero: "36", codigo: "934572", clave: "R36-COMP-25LT", descripcion: "Tornillo M5x10 OTRUPER" },
  { numero: "37", codigo: "934573", clave: "R37-COMP-25LT", descripcion: "Tornillo St3.5x12" },
  { numero: "38", codigo: "934574", clave: "R38-COMP-25LT", descripcion: "Seguro Ø14" },
  { numero: "39", codigo: "934575", clave: "R39-COMP-25LT", descripcion: "" },
  { numero: "40", codigo: "934576", clave: "R40-COMP-25LT", descripcion: "Tapa del motor" },
  { numero: "41", codigo: "934577", clave: "R41-COMP-25LT", descripcion: "Estator TRUPER" },
  { numero: "42", codigo: "934578", clave: "R42-COMP-25LT", descripcion: "Rodamiento 6202 Jutricado" },
  { numero: "43", codigo: "934579", clave: "R43-COMP-25LT", descripcion: "Rotor" },
  { numero: "44", codigo: "934580", clave: "R44-COMP-25LT", descripcion: "Rodamiento 6204" },
  { numero: "45", codigo: "934581", clave: "R45-COMP-25LT", descripcion: "Sello de aceite 40x20" },
  { numero: "46", codigo: "934582", clave: "R46-COMP-25LT", descripcion: "Tornillo M8x25" },
  { numero: "47", codigo: "934583", clave: "R47-COMP-25LT", descripcion: "Tuerca M17" },
  { numero: "48", codigo: "934584", clave: "R48-COMP-25LT", descripcion: "Válvula de salida" },
  { numero: "50", codigo: "934585", clave: "R50-COMP-25LT", descripcion: "Presostato" },
  { numero: "51", codigo: "934586", clave: "R51-COMP-25LT", descripcion: "Válvula de seguridad" },
  { numero: "52", codigo: "934587", clave: "R52-COMP-25LT", descripcion: "Manómetro" },
  { numero: "53", codigo: "934588", clave: "R53-COMP-25LT", descripcion: "Tapa" },
  { numero: "54", codigo: "934589", clave: "R54-COMP-25LT", descripcion: "Tornillo M5x14" },
  { numero: "55", codigo: "934590", clave: "R55-COMP-25LT", descripcion: "Tubo de descarga" },
  { numero: "57", codigo: "934591", clave: "R57-COMP-25LT", descripcion: "Tubo de alivio" },
  { numero: "58", codigo: "934592", clave: "R58-COMP-25LT", descripcion: "Tanque" },
  { numero: "59", codigo: "934593", clave: "R59-COMP-25LT", descripcion: "Tuerca M17" },
  { numero: "60", codigo: "934594", clave: "R60-COMP-25LT", descripcion: "Rueda" },
  { numero: "61", codigo: "934595", clave: "R61-COMP-25LT", descripcion: "Tornillo M10x50" },
  { numero: "62", codigo: "934596", clave: "R62-COMP-25LT", descripcion: "Válvula de drenado" },
  { numero: "63", codigo: "934597", clave: "R63-COMP-25LT", descripcion: "Pata de goma" },
  { numero: "64", codigo: "934598", clave: "R64-COMP-25LT", descripcion: "Cable y clavija" },
  { numero: "65", codigo: "934599", clave: "R65-COMP-25LT", descripcion: "Mango de hule" },
  { numero: "66", codigo: "934500", clave: "R66-COMP-25LT", descripcion: "Tornillo M5x6" },
  { numero: "67", codigo: "934601", clave: "R67-COMP-25LT", descripcion: "Arandela de presión M5" },
  { numero: "68", codigo: "934602", clave: "R68-COMP-25LT", descripcion: "" },
  { numero: "69", codigo: "934603", clave: "R69-COMP-25LT", descripcion: "Empaque" },
  { numero: "70", codigo: "934604", clave: "R70-COMP-25LT", descripcion: "Arandela" },
  { numero: "71", codigo: "934605", clave: "R71-COMP-25LT", descripcion: "Int.de sobrecarga 15A, 125/250VAC" }
];

// Repuestos para producto 19366 (COMP-240LV)
const repuestos19366 = [
  { numero: "1", codigo: "921864", clave: "R1-COMP-240LV", descripcion: "Tornillo M6x45" },
  { numero: "2", codigo: "921865", clave: "R2-COMP-240LV", descripcion: "Rondana de presión 6" },
  { numero: "3", codigo: "921866", clave: "R3-COMP-240LV", descripcion: "Conector" },
  { numero: "4", codigo: "921867", clave: "R4-COMP-240LV", descripcion: "Tapa de cilindro" },
  { numero: "5", codigo: "921868", clave: "R5-COMP-240LV", descripcion: "Junta de tapa de cilindro" },
  { numero: "6", codigo: "921869", clave: "R6-COMP-240LV", descripcion: "Placa de válvula" },
  { numero: "7", codigo: "921870", clave: "R7-COMP-240LV", descripcion: "Hoja de válvula" },
  { numero: "8", codigo: "921871", clave: "R8-COMP-240LV", descripcion: "Junta" },
  { numero: "9", codigo: "921872", clave: "R9-COMP-240LV", descripcion: "Junta de válvula" },
  { numero: "10", codigo: "921873", clave: "R10-COMP-240LV", descripcion: "Cilindro" },
  { numero: "11", codigo: "921874", clave: "R11-COMP-240LV", descripcion: "Junta de cilindro" },
  { numero: "12", codigo: "921875", clave: "R12-COMP-240LV", descripcion: "Anillo de pistón" },
  { numero: "13", codigo: "921876", clave: "R13-COMP-240LV", descripcion: "Anillo de aceite" },
  { numero: "14", codigo: "921877", clave: "R14-COMP-240LV", descripcion: "Pistón" },
  { numero: "15", codigo: "921878", clave: "R15-COMP-240LV", descripcion: "Perno de pistón" },
  { numero: "16", codigo: "921879", clave: "R16-COMP-240LV", descripcion: "Seguro \"C\"" },
  { numero: "17", codigo: "921880", clave: "R17-COMP-240LV", descripcion: "Biela" },
  { numero: "18", codigo: "921881", clave: "R18-COMP-240LV", descripcion: "Tapón" },
  { numero: "19", codigo: "921882", clave: "R19-COMP-240LV", descripcion: "Carter" },
  { numero: "19.1", codigo: "904933", clave: "R19.1-COMP-240LV", descripcion: "Tapón de llenado de aceite" },
  { numero: "20", codigo: "921883", clave: "R20-COMP-240LV", descripcion: "Conector" },
  { numero: "21", codigo: "921884", clave: "R21-COMP-240LV", descripcion: "Nivel de aceite" },
  { numero: "22", codigo: "921885", clave: "R22-COMP-240LV", descripcion: "Tornillo de drenado de aceite" },
  { numero: "23", codigo: "921886", clave: "R23-COMP-240LV", descripcion: "Tuerca M8" },
  { numero: "24", codigo: "921887", clave: "R24-COMP-240LV", descripcion: "Rondana de presión 8" },
  { numero: "25", codigo: "921888", clave: "R25-COMP-240LV", descripcion: "Perno M8x32" },
  { numero: "26", codigo: "921889", clave: "R26-COMP-240LV", descripcion: "Balero 6204-2RS" },
  { numero: "27", codigo: "921890", clave: "R27-COMP-240LV", descripcion: "Cigüeñal" },
  { numero: "28", codigo: "921891", clave: "R28-COMP-240LV", descripcion: "Balero 6205-2RS" },
  { numero: "29", codigo: "921892", clave: "R29-COMP-240LV", descripcion: "Sello de aceite" },
  { numero: "30", codigo: "921893", clave: "R30-COMP-240LV", descripcion: "Soporte de guarda" },
  { numero: "31", codigo: "921894", clave: "R31-COMP-240LV", descripcion: "Soporte de balero" },
  { numero: "32", codigo: "921895", clave: "R32-COMP-240LV", descripcion: "Tornillo M8x25" },
  { numero: "33", codigo: "921896", clave: "R33-COMP-240LV", descripcion: "Motor" },
  { numero: "34", codigo: "921897", clave: "R34-COMP-240LV", descripcion: "Capacitor de arranque" },
  { numero: "35", codigo: "921898", clave: "R35-COMP-240LV", descripcion: "Capacitor de trabajo" },
  { numero: "36", codigo: "921899", clave: "R36-COMP-240LV", descripcion: "Cubierta de capacitor" },
  { numero: "37", codigo: "921900", clave: "R37-COMP-240LV", descripcion: "Tornillo St 3.9x16" },
  { numero: "38", codigo: "921901", clave: "R38-COMP-240LV", descripcion: "Interruptor de sobrecarga" },
  { numero: "39", codigo: "921902", clave: "R39-COMP-240LV", descripcion: "Tubo de descarga" },
  { numero: "40", codigo: "921903", clave: "R40-COMP-240LV", descripcion: "" },
  { numero: "41", codigo: "921904", clave: "R41-COMP-240LV", descripcion: "Conector" },
  { numero: "42", codigo: "921905", clave: "R42-COMP-240LV", descripcion: "Tubo de alivio" },
  { numero: "43", codigo: "921906", clave: "R43-COMP-240LV", descripcion: "Tanque" },
  { numero: "44", codigo: "921907", clave: "R44-COMP-240LV", descripcion: "Polea de motor" },
  { numero: "45", codigo: "921908", clave: "R45-COMP-240LV", descripcion: "Arandela 8" },
  { numero: "46", codigo: "921909", clave: "R46-COMP-240LV", descripcion: "Tornillo M8x30" },
  { numero: "47", codigo: "921910", clave: "R47-COMP-240LV", descripcion: "Tornillo M5x35" },
  { numero: "47.1", codigo: "921911", clave: "R47.1-COMP-240LV", descripcion: "Tuerca hexagonal 8" },
  { numero: "48", codigo: "921912", clave: "R48-COMP-240LV", descripcion: "Arandela 5" },
  { numero: "49", codigo: "921913", clave: "R49-COMP-240LV", descripcion: "Soporte" },
  { numero: "50", codigo: "921914", clave: "R50-COMP-240LV", descripcion: "Guarda" },
  { numero: "51", codigo: "921915", clave: "R51-COMP-240LV", descripcion: "Banda" },
  { numero: "52", codigo: "921916", clave: "R52-COMP-240LV", descripcion: "Polea de compresor" },
  { numero: "53", codigo: "921917", clave: "R53-COMP-240LV", descripcion: "Tuerca M10" },
  { numero: "54", codigo: "921918", clave: "R54-COMP-240LV", descripcion: "Rondana" },
  { numero: "55", codigo: "921919", clave: "R55-COMP-240LV", descripcion: "Pata" },
  { numero: "55.1", codigo: "921920", clave: "R55.1-COMP-240LV", descripcion: "Tornillo" },
  { numero: "55.2", codigo: "921921", clave: "R55.2-COMP-240LV", descripcion: "Arandela" },
  { numero: "56", codigo: "921922", clave: "R56-COMP-240LV", descripcion: "Drenaje de tanque" },
  { numero: "57", codigo: "921923", clave: "R57-COMP-240LV", descripcion: "Cable" },
  { numero: "58", codigo: "921924", clave: "R58-COMP-240LV", descripcion: "Tuerca" },
  { numero: "59", codigo: "921925", clave: "R59-COMP-240LV", descripcion: "Válvula reguladora" },
  { numero: "60", codigo: "921926", clave: "R60-COMP-240LV", descripcion: "Válvula de salida" },
  { numero: "61", codigo: "921927", clave: "R61-COMP-240LV", descripcion: "Válvula de seguridad" },
  { numero: "62", codigo: "921928", clave: "R62-COMP-240LV", descripcion: "Manómetro" },
  { numero: "63", codigo: "921929", clave: "R63-COMP-240LV", descripcion: "Presostato" },
  { numero: "64", codigo: "921930", clave: "R64-COMP-240V", descripcion: "Filtro de aire" },
  { numero: "65", codigo: "921931", clave: "R65-COMP-240V", descripcion: "Tubo conector" },
  { numero: "66", codigo: "921932", clave: "R66-COMP-240V", descripcion: "Cable" },
  { numero: "67", codigo: "921933", clave: "R67-COMP-240V", descripcion: "Salida 3/4" },
  { numero: "69", codigo: "921934", clave: "R69-COMP-240LV", descripcion: "Tornillo Ø8x35 mm" },
  { numero: "70", codigo: "921935", clave: "R70-COMP-240LV", descripcion: "Arandela plana Ø8 mm" },
  { numero: "71", codigo: "921936", clave: "R71-COMP-240LV", descripcion: "Junta" }
];

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

export async function insertRepuestos15006() {
  console.log('Insertando repuestos para producto 15006...');
  
  const repuestosToInsert = repuestos15006.map(r => ({
    numero: r.numero,
    codigo: r.codigo,
    clave: r.clave,
    descripcion: r.descripcion,
    codigo_producto: '15006'
  }));

  const { data, error } = await supabase
    .from('repuestos')
    .upsert(repuestosToInsert, { 
      onConflict: 'codigo',
      ignoreDuplicates: false 
    })
    .select();

  if (error) {
    console.error('Error insertando repuestos 15006:', error);
    return { success: false, error };
  }

  console.log(`✓ ${repuestosToInsert.length} repuestos insertados para producto 15006`);
  return { success: true, data };
}

export async function insertRepuestos19366() {
  console.log('Insertando repuestos para producto 19366...');
  
  const repuestosToInsert = repuestos19366.map(r => ({
    numero: r.numero,
    codigo: r.codigo,
    clave: r.clave,
    descripcion: r.descripcion,
    codigo_producto: '19366'
  }));

  const { data, error } = await supabase
    .from('repuestos')
    .upsert(repuestosToInsert, { 
      onConflict: 'codigo',
      ignoreDuplicates: false 
    })
    .select();

  if (error) {
    console.error('Error insertando repuestos 19366:', error);
    return { success: false, error };
  }

  console.log(`✓ ${repuestosToInsert.length} repuestos insertados para producto 19366`);
  return { success: true, data };
}

export async function insertAllRepuestos() {
  console.log('Iniciando inserción de todos los repuestos...');
  
  const result13180 = await insertRepuestos13180();
  const result14659 = await insertRepuestos14659();
  const result15006 = await insertRepuestos15006();
  const result19366 = await insertRepuestos19366();

  if (result13180.success && result14659.success && result15006.success && result19366.success) {
    console.log('✓ Todos los repuestos fueron insertados exitosamente');
    return { success: true };
  } else {
    console.error('Hubo errores durante la inserción');
    return { 
      success: false, 
      errors: {
        repuestos13180: result13180.error,
        repuestos14659: result14659.error,
        repuestos15006: result15006.error,
        repuestos19366: result19366.error
      }
    };
  }
}
