// CORE-START
// ===== Núcleo v3 (compartido por prototipo, simulador y Page) =====
type Fam = "oxido" | "vapor" | "tesla" | "remache" | "engranaje" | "reloj" | "alquimia" | "iman" | "reso" | "auto";
type Rarity = "comun" | "rara" | "epica" | "legendaria";
interface SkillDef { id: string; name: string; fam: Fam; rarity: Rarity; max: number; icon: string; vals: number[]; desc: string; m3?: string; m5?: string; req?: string[]; syn?: Fam[]; cond?: string }

// ---------- Rarezas: un único sistema para habilidades y (más adelante) equipo ----------
interface RarityDef { id: Rarity; name: string; color: string; weight: number; maxLv: number; minFam: number; perOffer: number; rule: string }
const RARITY: Record<Rarity, RarityDef> = {
  comun: { id: "comun", name: "Común", color: "#9aa3ad", weight: 60, maxLv: 6, minFam: 0, perOffer: 3, rule: "Base de cualquier build. 6 niveles, hitos en Nv3 y Nv5." },
  rara: { id: "rara", name: "Rara", color: "#3b82f6", weight: 30, maxLv: 6, minFam: 0, perOffer: 3, rule: "Más fuerte o más específica. 6 niveles. Las sinergias entre familias son raras o épicas." },
  epica: { id: "epica", name: "Épica", color: "#a855f7", weight: 9, maxLv: 4, minFam: 0, perOffer: 2, rule: "Efecto único por familia. 4 niveles. Máx. 2 por oferta." },
  legendaria: { id: "legendaria", name: "Legendaria", color: "#f59e0b", weight: 4, maxLv: 3, minFam: 3, perOffer: 1, rule: "Define la build y suele tener condición. 3 niveles. Solo aparece con 3+ habilidades de su familia; máx. 1 por oferta." },
};
const RARITY_ORDER: Rarity[] = ["comun", "rara", "epica", "legendaria"];

const FAMS: { id: Fam; name: string; icon: string; color: string; idea: string }[] = [
  { id: "oxido", name: "Óxido", icon: "🧪", color: "#c8743a", idea: "Corrosión que se acumula, ignora la Defensa y la rebaja" },
  { id: "vapor", name: "Vapor", icon: "♨️", color: "#c9d6dc", idea: "Escaldaduras, géiseres y niebla (Evasión)" },
  { id: "tesla", name: "Tesla", icon: "⚡", color: "#4fd1c5", idea: "Descargas en cadena, aturdimientos y contraataques al esquivar" },
  { id: "remache", name: "Remache", icon: "🔩", color: "#9aa3b8", idea: "Defensa, escudo y daño que escala con tu Defensa" },
  { id: "engranaje", name: "Engranaje", icon: "⚙️", color: "#e0b24a", idea: "Críticos, Acierto y golpes dobles" },
  { id: "reloj", name: "Relojería", icon: "⏱️", color: "#e6d3a3", idea: "Ritmo: acciones extra y frenar al enemigo" },
  { id: "alquimia", name: "Alquimia", icon: "⚗️", color: "#7ddc8a", idea: "Viales, frascos y algo de curación" },
  { id: "iman", name: "Magnetismo", icon: "🧲", color: "#e86a6a", idea: "Cargas que debilitan, quitan Defensa y colapsan" },
  { id: "reso", name: "Resonancia", icon: "🔔", color: "#b48cff", idea: "Vibración que se acumula y detona" },
  { id: "auto", name: "Autómatas", icon: "🤖", color: "#6fa8dc", idea: "Ayudantes de cuerda que pelean a tu lado" },
];
const FAM_BY_ID: Record<string, { id: Fam; name: string; icon: string; color: string; idea: string }> = {};
for (const f of FAMS) FAM_BY_ID[f.id] = f;

const OX = ["o_gota", "o_lluvia", "o_salpica", "y_lima", "y_galvano"], VP = ["v_chorro", "v_valvula"], TS = ["t_chispazo", "t_bobina", "y_tierra", "t_pararrayos", "y_chispaprec"];
const RS = ["s_diapason", "s_onda", "s_coro", "y_silbato", "y_bobres"], MG = ["m_iman", "m_brujula", "y_electro", "y_vibra", "y_pendmag"], AU = ["u_ayudante", "u_linea"];

// BALANCE: valores por nivel (índice 0 = nivel 1). Común/Rara 6 niveles, Épica 4, Legendaria 3. Hitos en Nv3 y Nv5.
const SKILLS: SkillDef[] = [
  // Óxido
  { id: "o_gota", name: "Gota de ácido", fam: "oxido", rarity: "comun", max: 6, icon: "💧", vals: [1, 1.2, 1.4, 1.6, 1.8, 2], desc: "Cada golpe aplica {v} de óxido.", m3: "los críticos aplican el doble", m5: "empiezas cada combate con 4 de óxido en el enemigo" },
  { id: "o_conc", name: "Ácido concentrado", fam: "oxido", rarity: "comun", max: 6, icon: "⚗️", vals: [0.12, 0.22, 0.32, 0.42, 0.52, 0.62], desc: "El óxido hace +{p} de daño.", m5: "el óxido se disipa la mitad de rápido", req: OX },
  { id: "o_mordiente", name: "Mordiente", fam: "oxido", rarity: "comun", max: 6, icon: "🦷", vals: [0.4, 0.5, 0.6, 0.7, 0.8, 0.9], desc: "Cada punto de óxido quita {v} de Defensa al enemigo (máx. 30).", req: OX },
  { id: "o_salpica", name: "Salpicadura", fam: "oxido", rarity: "comun", max: 6, icon: "🫧", vals: [3, 4, 5, 6, 7, 8], desc: "Empiezas cada combate aplicando {v} de óxido." },
  { id: "o_lluvia", name: "Lluvia ácida", fam: "oxido", rarity: "rara", max: 6, icon: "🌧️", vals: [2, 2.5, 3, 3.5, 4, 4.5], desc: "Cada 3 turnos aplica {v} de óxido.", m5: "cada 2 turnos" },
  { id: "o_corr", name: "Corrosión profunda", fam: "oxido", rarity: "rara", max: 6, icon: "🕳️", vals: [0.06, 0.09, 0.12, 0.15, 0.18, 0.21], desc: "Enemigos con 8+ de óxido reciben +{p} de todo el daño.", req: OX },
  { id: "o_brecha", name: "Brecha química", fam: "oxido", rarity: "rara", max: 6, icon: "🧬", vals: [0.4, 0.52, 0.64, 0.76, 0.88, 1], desc: "El óxido puede hacer crítico con {p} de tu prob. de crítico (usa tu Daño crítico).", req: OX },
  { id: "o_eterna", name: "Herrumbre eterna", fam: "oxido", rarity: "epica", max: 4, icon: "♾️", vals: [2, 3, 4, 999], desc: "El óxido se disipa más despacio: Nv1 cada 2 turnos, Nv2 cada 3, Nv3 cada 4, Nv4 nunca.", req: OX },
  { id: "o_plaga", name: "Plaga de herrumbre", fam: "oxido", rarity: "legendaria", max: 3, icon: "☣️", vals: [0.5, 0.8, 1.1], cond: "4+ habilidades de Óxido y 15+ de óxido en el enemigo", desc: "Condición: 4+ habilidades de Óxido. Si el enemigo tiene 15+ de óxido, el óxido hace +{p} de daño y deja de disiparse." },
  // Vapor
  { id: "v_chorro", name: "Chorro de vapor", fam: "vapor", rarity: "comun", max: 6, icon: "💨", vals: [0.3, 0.34, 0.38, 0.42, 0.46, 0.5], desc: "Cada golpe tiene {p} de prob. de escaldar (3 turnos).", m3: "escalda 4 turnos", m5: "los críticos siempre escaldan" },
  { id: "v_valvula", name: "Válvula de escape", fam: "vapor", rarity: "comun", max: 6, icon: "♨️", vals: [0.8, 0.9, 1.0, 1.1, 1.2, 1.3], desc: "Cada 4 turnos inflige {p} del ataque como vapor y escalda.", m5: "cada 3 turnos" },
  { id: "v_niebla", name: "Cortina de niebla", fam: "vapor", rarity: "comun", max: 6, icon: "🌫️", vals: [0.03, 0.04, 0.05, 0.06, 0.07, 0.08], desc: "+{p} de Evasión." },
  { id: "v_hervor", name: "Hervor", fam: "vapor", rarity: "comun", max: 6, icon: "🫕", vals: [0.04, 0.06, 0.08, 0.1, 0.12, 0.14], desc: "Los enemigos escaldados tienen -{p} de Acierto.", req: VP },
  { id: "v_presion", name: "Sobrepresión", fam: "vapor", rarity: "rara", max: 6, icon: "💥", vals: [0.06, 0.1, 0.14, 0.18, 0.22, 0.26], desc: "Los enemigos escaldados reciben +{p} de todo el daño.", req: VP },
  { id: "v_caldera", name: "Caldera al rojo", fam: "vapor", rarity: "rara", max: 6, icon: "🔥", vals: [0.25, 0.45, 0.65, 0.85, 1.05, 1.25], desc: "La escaldadura hace +{p} de daño.", req: VP },
  { id: "v_geiser", name: "Géiser", fam: "vapor", rarity: "rara", max: 6, icon: "⛲", vals: [1.2, 1.4, 1.6, 1.8, 2, 2.2], desc: "Cada 5 turnos un géiser hace {p} del ataque e ignora la Defensa." },
  { id: "v_reserva", name: "Caldera de reserva", fam: "vapor", rarity: "epica", max: 4, icon: "🔄", vals: [0.15, 0.25, 0.35, 0.45], desc: "Una vez por combate, al caer vuelves a arrancar con {p} de vida." },
  { id: "v_corazon", name: "Corazón de caldera", fam: "vapor", rarity: "legendaria", max: 3, icon: "❤️‍🔥", vals: [0.04, 0.06, 0.08], cond: "4+ habilidades de Vapor", desc: "Condición: 4+ habilidades de Vapor. La escaldadura no se apaga y hace +{p} de daño por cada turno que lleva el enemigo escaldado (máx. 20)." },
  // Tesla
  { id: "t_chispazo", name: "Chispazo", fam: "tesla", rarity: "comun", max: 6, icon: "⚡", vals: [0.27, 0.32, 0.37, 0.42, 0.47, 0.52], desc: "Cada golpe tiene {p} de prob. de lanzar una descarga (100% del ataque).", m3: "descargas al 120%", m5: "tu primer golpe de cada combate siempre lanza una descarga" },
  { id: "t_corto", name: "Cortocircuito", fam: "tesla", rarity: "comun", max: 6, icon: "💫", vals: [0.06, 0.08, 0.1, 0.12, 0.14, 0.16], desc: "Cada descarga tiene {p} de prob. de aturdir 1 turno.", req: TS },
  { id: "t_estatica", name: "Electricidad estática", fam: "tesla", rarity: "comun", max: 6, icon: "🌩️", vals: [0.08, 0.11, 0.14, 0.17, 0.2, 0.23], desc: "Las descargas pueden hacer crítico con {p} de prob. (usan tu Daño crítico).", req: TS },
  { id: "t_pararrayos", name: "Pararrayos", fam: "tesla", rarity: "comun", max: 6, icon: "🗲", vals: [0.5, 0.6, 0.7, 0.8, 0.9, 1], desc: "Cada vez que esquivas un ataque, lanzas una descarga de {p} del ataque." },
  { id: "t_bobina", name: "Bobina Tesla", fam: "tesla", rarity: "rara", max: 6, icon: "🗼", vals: [0.45, 0.55, 0.65, 0.75, 0.85, 0.95], desc: "Cada 5 turnos lanza 3 descargas de {p} del ataque.", m5: "4 descargas" },
  { id: "t_cond", name: "Condensador", fam: "tesla", rarity: "rara", max: 6, icon: "🔋", vals: [0.02, 0.025, 0.03, 0.035, 0.04, 0.045], desc: "Cada descarga da +{p} de ataque en este combate (máx. 20).", req: TS },
  { id: "t_sobrecarga", name: "Sobrecarga", fam: "tesla", rarity: "rara", max: 6, icon: "🔆", vals: [0.15, 0.22, 0.29, 0.36, 0.43, 0.5], desc: "Las descargas hacen +{p} de daño.", req: TS },
  { id: "t_arco", name: "Arco en cadena", fam: "tesla", rarity: "epica", max: 4, icon: "🔗", vals: [0.2, 0.3, 0.4, 0.5], desc: "Cada descarga tiene {p} de prob. de repetirse.", req: TS },
  { id: "t_tormenta", name: "Tormenta embotellada", fam: "tesla", rarity: "legendaria", max: 3, icon: "⛈️", vals: [0.5, 0.75, 1], cond: "8 descargas en el combate", desc: "Condición: tras 8 descargas en un combate, cada golpe lanza además una descarga de {p} del ataque." },
  // Remache
  { id: "r_blindaje", name: "Blindaje extra", fam: "remache", rarity: "comun", max: 6, icon: "🧱", vals: [0.05, 0.08, 0.11, 0.14, 0.17, 0.2], desc: "+{p} de vida máxima (sobre la base).", m5: "+3 de Defensa" },
  { id: "r_plancha", name: "Plancha remachada", fam: "remache", rarity: "comun", max: 6, icon: "🛡️", vals: [0.06, 0.08, 0.1, 0.12, 0.14, 0.16], desc: "Empiezas cada combate con un escudo de {p} de tu vida máx.", m5: "la primera vez que bajas del 50% de vida, el escudo se recarga" },
  { id: "r_puntas", name: "Remaches puntiagudos", fam: "remache", rarity: "comun", max: 6, icon: "📍", vals: [0.15, 0.22, 0.29, 0.36, 0.43, 0.5], desc: "Devuelves {p} del daño recibido (antes de Defensa).", m5: "lo devuelto ignora la Defensa enemiga" },
  { id: "r_coraza", name: "Coraza de latón", fam: "remache", rarity: "comun", max: 6, icon: "🥼", vals: [3, 5, 7, 9, 11, 13], desc: "+{v} de Defensa." },
  { id: "r_doble", name: "Doble remachado", fam: "remache", rarity: "rara", max: 6, icon: "🔩", vals: [0.02, 0.035, 0.05, 0.065, 0.08, 0.095], desc: "Reduces el daño recibido un {p}." },
  { id: "r_ariete", name: "Ariete", fam: "remache", rarity: "rara", max: 6, icon: "🐏", vals: [1.5, 1.85, 2.2, 2.55, 2.9, 3.25], desc: "Cada 4 turnos embistes: daño igual a {v}× tu Defensa + 60% del ataque." },
  { id: "r_remachadora", name: "Remachadora", fam: "remache", rarity: "rara", max: 6, icon: "🔨", vals: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8], desc: "Tus golpes suman {v}× tu Defensa como daño de Remache." },
  { id: "r_mamparo", name: "Mamparo blindado", fam: "remache", rarity: "epica", max: 4, icon: "🚪", vals: [0.025, 0.035, 0.045, 0.055], desc: "Cada 3 turnos ganas un escudo de {p} de tu vida máx. y tus golpes suman 10% de tu escudo." },
  { id: "r_fortaleza", name: "Fortaleza andante", fam: "remache", rarity: "legendaria", max: 3, icon: "🏰", vals: [0.6, 0.9, 1.2], cond: "20+ de Defensa", desc: "Condición: 20+ de Defensa. Devuelves {p} del daño que paran tu Defensa y tu escudo." },
  // Engranaje
  { id: "e_monoculo", name: "Monóculo de precisión", fam: "engranaje", rarity: "comun", max: 6, icon: "🧐", vals: [0.1, 0.14, 0.18, 0.22, 0.26, 0.3], desc: "+{p} de prob. de crítico.", m5: "+25% de Daño crítico" },
  { id: "e_martillo", name: "Martillo pilón", fam: "engranaje", rarity: "comun", max: 6, icon: "🔨", vals: [0.3, 0.5, 0.7, 0.9, 1.1, 1.3], desc: "+{p} de Daño crítico.", m3: "los críticos ignoran la Defensa enemiga" },
  { id: "e_puntero", name: "Puntero láser de latón", fam: "engranaje", rarity: "comun", max: 6, icon: "🔭", vals: [0.04, 0.06, 0.08, 0.1, 0.12, 0.14], desc: "+{p} de Acierto." },
  { id: "e_afilado", name: "Dientes afilados", fam: "engranaje", rarity: "comun", max: 6, icon: "🪚", vals: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7], desc: "Tus golpes hacen +{p} de daño." },
  { id: "e_doble", name: "Doble engranaje", fam: "engranaje", rarity: "rara", max: 6, icon: "⚙️", vals: [0.2, 0.25, 0.3, 0.35, 0.4, 0.45], desc: "{p} de prob. de golpear dos veces.", m5: "el segundo golpe hace +25%" },
  { id: "e_marcha", name: "Marcha acelerada", fam: "engranaje", rarity: "rara", max: 6, icon: "⏩", vals: [0.03, 0.038, 0.046, 0.054, 0.062, 0.07], desc: "+{p} de ataque por turno de combate (máx. 15 turnos)." },
  { id: "e_calibre", name: "Calibre fino", fam: "engranaje", rarity: "rara", max: 6, icon: "📏", vals: [0.5, 0.6, 0.7, 0.8, 0.9, 1], desc: "Tu Acierto por encima de la Evasión enemiga suma {p} como prob. de crítico." },
  { id: "e_cizalla", name: "Cizalla", fam: "engranaje", rarity: "epica", max: 4, icon: "✂️", vals: [0.5, 0.7, 0.9, 1.1], desc: "Tus golpes hacen +{p} a enemigos por debajo del 30% de vida." },
  { id: "e_mecanismo", name: "Mecanismo perfecto", fam: "engranaje", rarity: "legendaria", max: 3, icon: "🕹️", vals: [0.25, 0.5, 0.75], cond: "40%+ de prob. de crítico", desc: "Condición: 40%+ de prob. de crítico. Tus críticos golpean otra vez al 50% y tienen +{p} de Daño crítico." },
  // Relojería
  { id: "c_cuerda", name: "Cuerda extra", fam: "reloj", rarity: "comun", max: 6, icon: "🗝️", vals: [22, 26, 30, 34, 38, 42], desc: "Ganas {v} de ritmo por turno; con 100 haces una acción extra.", m3: "empiezas cada combate con 30 de ritmo", m5: "las acciones extra hacen +50%" },
  { id: "c_freno", name: "Freno de escape", fam: "reloj", rarity: "comun", max: 6, icon: "⏸️", vals: [0.05, 0.07, 0.09, 0.11, 0.13, 0.15], desc: "{p} de prob. de que el enemigo pierda su turno." },
  { id: "c_minutero", name: "Minutero", fam: "reloj", rarity: "comun", max: 6, icon: "🕛", vals: [0.1, 0.16, 0.22, 0.28, 0.34, 0.4], desc: "Las acciones extra no fallan nunca y hacen +{p} de daño." },
  { id: "c_campanada", name: "Campanada", fam: "reloj", rarity: "comun", max: 6, icon: "🕭", vals: [0.35, 0.45, 0.55, 0.65, 0.75, 0.85], desc: "Cada acción extra suena: {p} del ataque que ignora la Defensa." },
  { id: "c_pendulo", name: "Péndulo", fam: "reloj", rarity: "rara", max: 6, icon: "🕰️", vals: [0.45, 0.6, 0.75, 0.9, 1.05, 1.2], desc: "Cada tercer golpe hace +{p} de daño." },
  { id: "c_volante", name: "Volante de inercia", fam: "reloj", rarity: "rara", max: 6, icon: "🎡", vals: [0.06, 0.08, 0.1, 0.12, 0.14, 0.16], desc: "Cada acción extra te da +{p} de ataque en este combate (máx. 10).", req: ["c_cuerda"] },
  { id: "c_retroceso", name: "Retroceso", fam: "reloj", rarity: "rara", max: 6, icon: "↩️", vals: [20, 26, 32, 38, 44, 50], desc: "Cada vez que el enemigo pierde un turno, ganas {v} de ritmo." },
  { id: "c_parada", name: "Parar el tiempo", fam: "reloj", rarity: "epica", max: 4, icon: "⌛", vals: [1, 2, 3, 4], desc: "Una vez por combate, al bajar del 30% de vida, el enemigo pierde {v} turno(s)." },
  { id: "c_bucle", name: "Bucle temporal", fam: "reloj", rarity: "legendaria", max: 3, icon: "🌀", vals: [0.2, 0.35, 0.5], cond: "4+ habilidades de Relojería", desc: "Condición: 4+ habilidades de Relojería. Cada 6 turnos haces 3 acciones extra con +{p} de daño." },
  // Alquimia
  { id: "a_tonico", name: "Tónico de latón", fam: "alquimia", rarity: "comun", max: 6, icon: "🧴", vals: [0.002, 0.0027, 0.0034, 0.0041, 0.0048, 0.0055], desc: "Regeneras {p} de tu vida máx. cada turno.", m5: "el doble por debajo del 30% de vida" },
  { id: "a_frasco", name: "Frasco de emergencia", fam: "alquimia", rarity: "comun", max: 6, icon: "🧪", vals: [0.08, 0.1, 0.12, 0.14, 0.16, 0.18], desc: "Una vez por combate, al bajar del 40% de vida, te curas {p} de tu vida máx.", m3: "dos veces por combate" },
  { id: "a_destilado", name: "Destilado reparador", fam: "alquimia", rarity: "comun", max: 6, icon: "🍶", vals: [0.015, 0.025, 0.035, 0.045, 0.055, 0.065], desc: "Tras cada combate te curas {p} extra de tu vida máx." },
  { id: "a_vial", name: "Vial corrosivo", fam: "alquimia", rarity: "comun", max: 6, icon: "🧫", vals: [0.9, 1.05, 1.2, 1.35, 1.5, 1.65], desc: "Cada 3 turnos lanzas un vial: {p} del ataque que ignora la Defensa." },
  { id: "a_mercurio", name: "Frasco de mercurio", fam: "alquimia", rarity: "rara", max: 6, icon: "🌡", vals: [0.6, 0.75, 0.9, 1.05, 1.2, 1.35], desc: "Cada 4 turnos lanzas un frasco que hace {p} del ataque y te cura el 15% de ese daño." },
  { id: "a_catalizador", name: "Catalizador", fam: "alquimia", rarity: "rara", max: 6, icon: "🧯", vals: [0.1, 0.15, 0.2, 0.25, 0.3, 0.35], desc: "Tus viales, frascos y daños por turno (óxido, escaldadura) hacen +{p}." },
  { id: "a_volatil", name: "Mezcla volátil", fam: "alquimia", rarity: "rara", max: 6, icon: "💣", vals: [0.1, 0.14, 0.18, 0.22, 0.26, 0.3], desc: "Todo tu daño +{p} contra enemigos por encima del 70% de vida." },
  { id: "a_piedra", name: "Piedra filosofal", fam: "alquimia", rarity: "epica", max: 4, icon: "💎", vals: [0.15, 0.25, 0.35, 0.45], desc: "Las curas son +{p} más fuertes y lo que sobra se convierte en escudo." },
  { id: "a_aurea", name: "Transmutación áurea", fam: "alquimia", rarity: "legendaria", max: 3, icon: "🏺", vals: [0.8, 1.2, 1.6], cond: "4+ habilidades de Alquimia", desc: "Condición: 4+ habilidades de Alquimia. Cada curación hace además daño igual a {p} de lo curado." },
  // Magnetismo
  { id: "m_iman", name: "Imán de herradura", fam: "iman", rarity: "comun", max: 6, icon: "🧲", vals: [0.015, 0.0175, 0.02, 0.0225, 0.025, 0.0275], desc: "Cada golpe añade una carga magnética (máx. 20); cada carga quita {p} de ataque al enemigo (tope 30%).", m5: "el tope sube a 40%" },
  { id: "m_polar", name: "Polaridad inversa", fam: "iman", rarity: "comun", max: 6, icon: "🧭", vals: [0.06, 0.08, 0.1, 0.12, 0.14, 0.16], desc: "{p} de prob. de desviar el ataque enemigo (no depende de su Acierto)." },
  { id: "m_limaduras", name: "Limaduras", fam: "iman", rarity: "comun", max: 6, icon: "🪨", vals: [0.5, 0.65, 0.8, 0.95, 1.1, 1.25], desc: "Cada carga magnética quita {v} de Defensa al enemigo.", req: MG },
  { id: "m_brujula", name: "Brújula loca", fam: "iman", rarity: "comun", max: 6, icon: "🧿", vals: [3, 4, 5, 6, 7, 8], desc: "Empiezas cada combate con {v} cargas magnéticas en el enemigo." },
  { id: "m_atrac", name: "Atracción", fam: "iman", rarity: "rara", max: 6, icon: "🪐", vals: [0.012, 0.016, 0.02, 0.024, 0.028, 0.032], desc: "El enemigo recibe +{p} de daño por cada carga magnética.", req: MG },
  { id: "m_pulso", name: "Pulso magnético", fam: "iman", rarity: "rara", max: 6, icon: "📡", vals: [1.0, 1.15, 1.3, 1.45, 1.6, 1.75], desc: "Cada 4 turnos, un pulso hace {p} del ataque, +4% por carga magnética." },
  { id: "m_campo", name: "Campo magnético", fam: "iman", rarity: "rara", max: 6, icon: "🌐", vals: [0.14, 0.18, 0.22, 0.26, 0.3, 0.34], desc: "Cada turno el enemigo recibe {p} del ataque por cada 5 cargas.", req: MG },
  { id: "m_polo", name: "Polo norte", fam: "iman", rarity: "epica", max: 4, icon: "🧊", vals: [0.08, 0.11, 0.14, 0.17], desc: "Los enemigos empiezan con -{p} de ataque y el tope de reducción magnética sube 10%." },
  { id: "m_singular", name: "Singularidad", fam: "iman", rarity: "legendaria", max: 3, icon: "🕳", vals: [0.12, 0.18, 0.24], cond: "20 cargas magnéticas", desc: "Condición: al llegar a 20 cargas, colapsan: {p} del ataque por carga (ignora Defensa) y vuelven a 10." },
  // Resonancia
  { id: "s_diapason", name: "Diapasón", fam: "reso", rarity: "comun", max: 6, icon: "🔔", vals: [1, 1.25, 1.5, 1.75, 2, 2.25], desc: "Cada golpe añade {v} de resonancia; con 10, detona por 180% del ataque (ignora Defensa).", m3: "las detonaciones aturden 1 turno", m5: "detonaciones +50% de daño" },
  { id: "s_onda", name: "Onda expansiva", fam: "reso", rarity: "comun", max: 6, icon: "〰️", vals: [2, 2.5, 3, 3.5, 4, 4.5], desc: "Cada 3 turnos añade {v} de resonancia (con 10, detona)." },
  { id: "s_coro", name: "Coro de tuberías", fam: "reso", rarity: "comun", max: 6, icon: "🎶", vals: [0.6, 0.8, 1, 1.2, 1.4, 1.6], desc: "Cada turno añades {v} de resonancia." },
  { id: "s_vibrato", name: "Vibrato", fam: "reso", rarity: "comun", max: 6, icon: "🎻", vals: [0.02, 0.025, 0.03, 0.035, 0.04, 0.045], desc: "Cada detonación te da +{p} de Evasión en este combate (máx. 5 veces).", req: RS },
  { id: "s_campana", name: "Campana de bronce", fam: "reso", rarity: "rara", max: 6, icon: "🛎️", vals: [0.2, 0.32, 0.44, 0.56, 0.68, 0.8], desc: "Las detonaciones hacen +{p} de daño.", req: RS },
  { id: "s_eco", name: "Eco", fam: "reso", rarity: "rara", max: 6, icon: "🔊", vals: [2, 2.5, 3, 3.5, 4, 4.5], desc: "Tras detonar conservas {v} de resonancia.", req: RS },
  { id: "s_grieta", name: "Frecuencia de rotura", fam: "reso", rarity: "rara", max: 6, icon: "💢", vals: [1, 1.5, 2, 2.5, 3, 3.5], desc: "Cada detonación quita {v} de Defensa al enemigo durante el combate.", req: RS },
  { id: "s_armonico", name: "Armónico perfecto", fam: "reso", rarity: "epica", max: 4, icon: "🎼", vals: [1, 2, 3, 4], desc: "La detonación necesita {v} de resonancia menos.", req: RS },
  { id: "s_nota", name: "Nota imposible", fam: "reso", rarity: "legendaria", max: 3, icon: "🎵", vals: [0.6, 0.9, 1.2], cond: "4 detonaciones en el combate", desc: "Condición: tras 4 detonaciones en un combate, las detonaciones hacen +{p} de daño y aturden 1 turno." },
  // Autómatas
  { id: "u_ayudante", name: "Ayudante de cuerda", fam: "auto", rarity: "comun", max: 6, icon: "🧸", vals: [0.25, 0.3, 0.35, 0.4, 0.45, 0.5], desc: "Un autómata golpea cada turno por {p} de tu ataque.", m3: "puede hacer crítico con tu probabilidad", m5: "se le une un segundo ayudante al 50%" },
  { id: "u_escudero", name: "Autómata escudero", fam: "auto", rarity: "comun", max: 6, icon: "🛡", vals: [0.04, 0.06, 0.08, 0.1, 0.12, 0.14], desc: "Un autómata escudero recibe {p} del daño que te hacen." },
  { id: "u_tornillos", name: "Tornillos de precisión", fam: "auto", rarity: "comun", max: 6, icon: "🪛", vals: [0.06, 0.09, 0.12, 0.15, 0.18, 0.21], desc: "Tus autómatas tienen +{p} de prob. de crítico (usan tu Daño crítico).", req: AU },
  { id: "u_resortes", name: "Resortes", fam: "auto", rarity: "comun", max: 6, icon: "🪀", vals: [0.6, 0.75, 0.9, 1.05, 1.2, 1.35], desc: "Cada vez que esquivas, tus autómatas golpean otra vez al {p}.", req: AU },
  { id: "u_linea", name: "Línea de montaje", fam: "auto", rarity: "rara", max: 6, icon: "🏭", vals: [0.12, 0.15, 0.18, 0.21, 0.24, 0.27], desc: "Cada 4 turnos montas un mini autómata (máx. 3) que golpea cada turno por {p} de tu ataque." },
  { id: "u_mant", name: "Mantenimiento", fam: "auto", rarity: "rara", max: 6, icon: "🔧", vals: [0.15, 0.25, 0.35, 0.45, 0.55, 0.65], desc: "Tus autómatas hacen +{p} de daño.", req: AU },
  { id: "u_bateria", name: "Batería compartida", fam: "auto", rarity: "rara", max: 6, icon: "🔌", vals: [0.35, 0.45, 0.55, 0.65, 0.75, 0.85], desc: "Cada 5 turnos, cada autómata activo descarga {p} del ataque.", req: AU },
  { id: "u_coloso", name: "Coloso de vapor", fam: "auto", rarity: "epica", max: 4, icon: "🗿", vals: [1.4, 1.9, 2.4, 2.9], desc: "Cada 6 turnos, un coloso pisa por {p} del ataque y aturde 1 turno." },
  { id: "u_ejercito", name: "Ejército de hojalata", fam: "auto", rarity: "legendaria", max: 3, icon: "🦿", vals: [0.8, 1.15, 1.5], cond: "3 mini autómatas", desc: "Condición: con 3 mini autómatas, se ensamblan en un Gran Autómata que golpea cada turno por {p} del ataque e ignora la Defensa." },
  // Sinergias entre árboles (solo aparecen si tienes las dos familias)
  { id: "y_lima", name: "Lima oxidada", fam: "oxido", syn: ["oxido", "engranaje"], rarity: "rara", max: 6, icon: "🪓", vals: [1.5, 2, 2.5, 3, 3.5, 4], desc: "Los críticos aplican {v} de óxido." },
  { id: "y_corrosivo", name: "Vapor corrosivo", fam: "vapor", syn: ["oxido", "vapor"], rarity: "rara", max: 6, icon: "☁️", vals: [0.03, 0.04, 0.05, 0.06, 0.07, 0.08], desc: "La escaldadura hace +{p} por cada óxido (máx. 20)." },
  { id: "y_acido", name: "Ácido alquímico", fam: "alquimia", syn: ["oxido", "alquimia"], rarity: "rara", max: 6, icon: "🧉", vals: [0.04, 0.06, 0.08, 0.1, 0.12, 0.14], desc: "Te curas un {p} del daño de óxido." },
  { id: "y_tierra", name: "Toma de tierra", fam: "tesla", syn: ["tesla", "remache"], rarity: "rara", max: 6, icon: "🔌", vals: [0.12, 0.16, 0.2, 0.24, 0.28, 0.32], desc: "Al recibir un golpe, {p} de prob. de devolver una descarga (80%)." },
  { id: "y_electro", name: "Electroimán", fam: "iman", syn: ["tesla", "iman"], rarity: "rara", max: 6, icon: "🧷", vals: [0.015, 0.02, 0.025, 0.03, 0.035, 0.04], desc: "Cada descarga añade 1 carga magnética y hace +{p} por carga." },
  { id: "y_bobres", name: "Bobina resonante", fam: "reso", syn: ["tesla", "reso"], rarity: "rara", max: 6, icon: "🎐", vals: [1, 1.25, 1.5, 1.75, 2, 2.25], desc: "Cada descarga añade {v} de resonancia." },
  { id: "y_silbato", name: "Silbato de vapor", fam: "reso", syn: ["vapor", "reso"], rarity: "rara", max: 6, icon: "📯", vals: [0.75, 1, 1.25, 1.5, 1.75, 2], desc: "Cada turno de escaldadura añade {v} de resonancia." },
  { id: "y_dilatado", name: "Metal dilatado", fam: "iman", syn: ["vapor", "iman"], rarity: "rara", max: 6, icon: "🌡️", vals: [0.08, 0.11, 0.14, 0.17, 0.2, 0.23], desc: "Los enemigos escaldados pegan {p} menos." },
  { id: "y_muelle", name: "Muelle de retroceso", fam: "remache", syn: ["remache", "reloj"], rarity: "rara", max: 6, icon: "🪃", vals: [0.08, 0.12, 0.16, 0.2, 0.24, 0.28], desc: "Al recibir un golpe, {p} de prob. de contraatacar con todo tu ataque." },
  { id: "y_golem", name: "Gólem de chatarra", fam: "remache", syn: ["remache", "auto"], rarity: "rara", max: 6, icon: "🦾", vals: [0.004, 0.006, 0.008, 0.01, 0.012, 0.014], desc: "Mientras tengas autómatas, ganas un escudo de {p} de tu vida máx. cada turno." },
  { id: "y_dinamo", name: "Dinamo de recarga", fam: "engranaje", syn: ["engranaje", "alquimia"], rarity: "rara", max: 6, icon: "🩹", vals: [0.015, 0.02, 0.025, 0.03, 0.035, 0.04], desc: "Te curas un {p} del daño de tus golpes." },
  { id: "y_ancora", name: "Escape de áncora", fam: "reloj", syn: ["engranaje", "reloj"], rarity: "rara", max: 6, icon: "⚓", vals: [0.15, 0.25, 0.35, 0.45, 0.55, 0.65], desc: "Las acciones extra son siempre crítico y con +{p} de Daño crítico." },
  { id: "y_sincro", name: "Relojes sincronizados", fam: "auto", syn: ["reloj", "auto"], rarity: "rara", max: 6, icon: "🔁", vals: [0.5, 0.65, 0.8, 0.95, 1.1, 1.25], desc: "En cada acción extra, tus autómatas vuelven a golpear al {p}." },
  { id: "y_vibra", name: "Imán vibrante", fam: "iman", syn: ["iman", "reso"], rarity: "rara", max: 6, icon: "📳", vals: [0.012, 0.018, 0.024, 0.03, 0.036, 0.042], desc: "Cada detonación añade 3 cargas magnéticas y hace +{p} por carga." },
  { id: "y_alqauto", name: "Autómata alquimista", fam: "auto", syn: ["alquimia", "auto"], rarity: "rara", max: 6, icon: "🧑‍🔬", vals: [0.04, 0.06, 0.08, 0.1, 0.12, 0.14], desc: "Tus autómatas te curan un {p} del daño que hacen." },
  { id: "y_galvano", name: "Galvanizado", fam: "tesla", syn: ["oxido", "tesla"], rarity: "epica", max: 4, icon: "🧲", vals: [1, 1.4, 1.8, 2.2], desc: "Cada descarga aplica {v} de óxido." },
  { id: "y_turbina", name: "Turbina de vapor", fam: "auto", syn: ["vapor", "auto"], rarity: "epica", max: 4, icon: "🌀", vals: [0.3, 0.45, 0.6, 0.75], desc: "Tus autómatas hacen +{p} de daño a enemigos escaldados." },
  { id: "y_pendmag", name: "Péndulo magnético", fam: "iman", syn: ["iman", "reloj"], rarity: "epica", max: 4, icon: "🧭", vals: [0.015, 0.022, 0.029, 0.036], desc: "Cada acción extra añade 2 cargas magnéticas y hace +{p} por carga." },
  { id: "y_campanario", name: "Campanario blindado", fam: "reso", syn: ["reso", "remache"], rarity: "epica", max: 4, icon: "⛪", vals: [0.5, 0.7, 0.9, 1.1], desc: "Cada detonación te da un escudo de {v}× tu Defensa (+3)." },
  { id: "y_chispaprec", name: "Chispa de precisión", fam: "engranaje", syn: ["engranaje", "tesla"], rarity: "epica", max: 4, icon: "✴️", vals: [0.4, 0.55, 0.7, 0.85], desc: "Tus críticos lanzan una descarga de {p} del ataque." },
];
const SKILL_BY_ID: Record<string, SkillDef> = {};
for (const s of SKILLS) SKILL_BY_ID[s.id] = s;

interface GearDef { id: string; name: string; icon: string; fam: Fam; start: string; desc: string }
const gpc = (x: number, d = 0): string => (x * 100).toFixed(d).replace(".", ",") + "%";
const GEARS: GearDef[] = [
  { id: "lima", name: "Lima herrumbrosa", icon: "🪛", fam: "oxido", start: "o_gota", get desc() { return `Empiezas con Gota de ácido. +${gpc(BAL.gearBonus)} de daño de óxido.`; } },
  { id: "tetera", name: "Tetera remendada", icon: "🫖", fam: "vapor", start: "v_chorro", get desc() { return `Empiezas con Chorro de vapor. +${gpc(BAL.gearVapor)} de daño de vapor.`; } },
  { id: "bobina", name: "Bobina casera", icon: "🔋", fam: "tesla", start: "t_chispazo", get desc() { return `Empiezas con Chispazo. +${gpc(BAL.gearBonus)} de daño de descarga.`; } },
  { id: "tapa", name: "Tapa de olla", icon: "🛡️", fam: "remache", start: "r_coraza", get desc() { return `Empiezas con Coraza de latón. +${BAL.gearDef} de Defensa y +${gpc(BAL.gearBonus)} de daño de Remache.`; } },
  { id: "llave", name: "Llave inglesa vieja", icon: "🔧", fam: "engranaje", start: "e_monoculo", get desc() { return `Empiezas con Monóculo de precisión. +${gpc(BAL.gearCrit)} de crítico y +${gpc(BAL.gearHitBonus)} de daño de tus golpes.`; } },
  { id: "relojp", name: "Reloj de bolsillo parado", icon: "⏱️", fam: "reloj", start: "c_cuerda", get desc() { return `Empiezas con Cuerda extra. +${BAL.gearTempo} de ritmo por turno y +${gpc(BAL.gearBonus)} de daño de las acciones extra.`; } },
  { id: "frasco", name: "Frasco agrietado", icon: "⚗️", fam: "alquimia", start: "a_vial", get desc() { return `Empiezas con Vial corrosivo. +${gpc(BAL.gearBonus)} de daño alquímico.`; } },
  { id: "herradura", name: "Herradura imantada", icon: "🧲", fam: "iman", start: "m_iman", get desc() { return `Empiezas con Imán de herradura. Todo tu daño +${gpc(BAL.gearMag,1)} por carga magnética y +${gpc(BAL.gearBonus)} de daño magnético.`; } },
  { id: "diapason", name: "Diapasón abollado", icon: "🔔", fam: "reso", start: "s_diapason", get desc() { return `Empiezas con Diapasón. +${gpc(BAL.gearBonus)} de daño de detonación.`; } },
  { id: "juguete", name: "Juguete de cuerda", icon: "🧸", fam: "auto", start: "u_ayudante", get desc() { return `Empiezas con Ayudante de cuerda. +${gpc(BAL.gearBonus)} de daño de autómatas.`; } },
];
const GEAR_BY_ID: Record<string, GearDef> = {};
for (const g of GEARS) GEAR_BY_ID[g.id] = g;

type EnemyKind = "normal" | "elite" | "mini" | "boss";
const BAL = {
  heroHp: 100, heroAtk: 10, heroDef: 0, heroCrit: 0.05, heroCritDmg: 1.5, heroEva: 0.03, heroAcc: 0,
  baseHit: 0.95, minHit: 0.45, defK: 60, hitMult: 0.6, extraMult: 1.2, skillMult: 1.8, statEventW: 3, shopMax: 3,
  gearBonus: 0.25, gearHitBonus: 1.3, gearDef: 2, gearTempo: 5, gearMag: 0.018, gearCrit: 0.08, gearVapor: 0.15, gearOfferMult: 1.6,
  poisonK: 0.09, poisonDecay: 0.15, burnK: 0.45, detonK: 1.8, resTh: 10, heavyMult: 2,
  enemyHp: 60, hpStep: 0.06, enemyAtk: 2.8, atkStep: 0.025, enemyDefStep: 0.3, enemyEva: 0.03,
  eliteHp: 2.2, eliteAtk: 1.35, miniHp: 340, miniAtk: 4.7, bossHp: 1500, bossAtk: 4.3,
  miniDef: 8, bossDef: 12, bossAcc: 0.08, armorDef: 25, evasiveEva: 0.15, sureAcc: 0.15,
  overheat: { normal: 18, elite: 22, mini: 30, boss: 45 } as Record<EnemyKind, number>, heatRate: 0.06,
  turnCap: 150, postHeal: 0.18, coins: { normal: 14, elite: 32, mini: 55, boss: 0 } as Record<EnemyKind, number>,
  startRerolls: 2, startBanish: 1,
};

// ---------- RNG con semilla (reproducible) ----------
function hashStr(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}
type Rng = () => number;
function makeRng(seed: string): Rng {
  let a = hashStr(seed);
  return function (): number {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randomSeed(): string {
  const w = ["FAROL", "VAPOR", "LATON", "COBRE", "TUERCA", "CALDERA", "REMACHE", "BIELA"];
  return w[Math.floor(Math.random() * w.length)] + "-" + (1000 + Math.floor(Math.random() * 9000));
}
function pick<T>(arr: T[], rng: Rng): T { return arr[Math.floor(rng() * arr.length)]; }

// ---------- Héroe ----------
// Estadísticas base: ataque, defensa, vida, prob. de crítico, daño crítico, evasión y acierto.
interface Hero {
  maxHp: number; hp: number; atk: number; def: number; crit: number; critDmg: number; eva: number; acc: number;
  skills: Record<string, number>; gear: string; rerolls: number; banish: number; banished: string[];
  coins: number; mods: Record<string, number>; blessings: string[]; curses: string[]; bought: Record<string, number>;
}
function newHero(gear: string): Hero {
  const g = GEAR_BY_ID[gear];
  const h: Hero = { maxHp: BAL.heroHp, hp: BAL.heroHp, atk: BAL.heroAtk, def: BAL.heroDef, crit: BAL.heroCrit, critDmg: BAL.heroCritDmg, eva: BAL.heroEva, acc: BAL.heroAcc, skills: {}, gear: gear, rerolls: BAL.startRerolls, banish: BAL.startBanish, banished: [], coins: 0, mods: {}, blessings: [], curses: [], bought: {} };
  if (g) gainSkill(h, g.start);
  if (g && g.fam === "engranaje") h.crit += BAL.gearCrit;
  if (g && g.fam === "remache") h.def += BAL.gearDef;
  return h;
}
function lv(h: Hero, id: string): number { return h.skills[id] || 0; }
function sv(h: Hero, id: string): number { const l = lv(h, id); return l ? SKILL_BY_ID[id].vals[l - 1] : 0; }
function md(h: Hero, k: string): number { return h.mods[k] || 0; }
function famCount(h: Hero, f: Fam): number { let n = 0; for (const k in h.skills) { const s = SKILL_BY_ID[k]; if (s && (s.fam === f || (s.syn && s.syn.indexOf(f) >= 0))) n++; } return n; }
function famOwned(h: Hero, f: Fam): boolean { for (const k in h.skills) { const s = SKILL_BY_ID[k]; if (s && !s.syn && s.fam === f) return true; } return false; }
interface Stats { atk: number; def: number; maxHp: number; crit: number; critDmg: number; eva: number; acc: number }
// Estadísticas efectivas (base + habilidades pasivas + bendiciones/maldiciones). Es lo que muestra la interfaz.
function stats(h: Hero): Stats {
  return {
    atk: Math.round(h.atk * (1 + md(h, "atkPct")) * 100) / 100,
    def: h.def + sv(h, "r_coraza") + (lv(h, "r_blindaje") >= 5 ? 3 : 0) + md(h, "def"),
    maxHp: h.maxHp,
    crit: Math.max(0, h.crit + md(h, "crit") + sv(h, "e_monoculo")),
    critDmg: h.critDmg + sv(h, "e_martillo") + (lv(h, "e_monoculo") >= 5 ? 0.25 : 0),
    eva: Math.max(0, h.eva + sv(h, "v_niebla") + md(h, "eva")),
    acc: h.acc + sv(h, "e_puntero"),
  };
}
const STAT_INFO: { id: keyof Stats; icon: string; name: string; tip: string }[] = [
  { id: "maxHp", icon: "❤️", name: "Vida", tip: "Vida máxima." },
  { id: "atk", icon: "🗡️", name: "Ataque", tip: "Base de casi todo tu daño." },
  { id: "def", icon: "🛡️", name: "Defensa", tip: "Reduce el daño directo recibido: daño × 60/(60+Defensa)." },
  { id: "crit", icon: "🎯", name: "Crítico", tip: "Probabilidad de golpe crítico." },
  { id: "critDmg", icon: "💥", name: "Daño crítico", tip: "Multiplicador de los críticos." },
  { id: "eva", icon: "💨", name: "Evasión", tip: "Resta a la prob. de acierto del enemigo (base 95%)." },
  { id: "acc", icon: "👁️", name: "Acierto", tip: "Suma a tu prob. de acierto (base 95%) y contrarresta la Evasión enemiga." },
];
function fmtN(v: number): string { return String(Math.round(v * 100) / 100).replace(".", ","); }
function fmtP(v: number): string { return String(Math.round(v * 1000) / 10).replace(".", ",") + "%"; }
function fmtStat(id: string, v: number): string { return id === "crit" || id === "eva" || id === "acc" ? fmtP(v) : id === "critDmg" ? "×" + fmtN(v) : fmtN(Math.round(v * 10) / 10); }
function skillText(s: SkillDef, level: number): string {
  const v = s.vals[Math.min(Math.max(level, 1), s.max) - 1];
  let t = s.desc.replace("{v}", fmtN(v)).replace("{p}", fmtP(v));
  if (s.m3) t += " · Nv3: " + s.m3 + (level >= 3 ? " ✓" : "");
  if (s.m5) t += " · Nv5: " + s.m5 + (level >= 5 ? " ✓" : "");
  return t;
}
function blindajeHp(level: number): number { return level ? Math.round(BAL.heroHp * SKILL_BY_ID.r_blindaje.vals[level - 1]) : 0; }
function setLevel(h: Hero, id: string, level: number): void {
  const before = lv(h, id);
  level = Math.max(0, Math.min(SKILL_BY_ID[id].max, level));
  if (id === "r_blindaje") { const add = blindajeHp(level) - blindajeHp(before); h.maxHp += add; h.hp = Math.max(1, Math.min(h.maxHp, h.hp + add)); }
  if (level) h.skills[id] = level; else delete h.skills[id];
}
function gainSkill(h: Hero, id: string): void { if (lv(h, id) < SKILL_BY_ID[id].max) setLevel(h, id, lv(h, id) + 1); }

// ---------- Mejoras de estadísticas (mercaderes, eventos, campamento) ----------
// Precio base y subida por compra repetida de la misma estadística (como en Capybara Go, cada compra encarece la siguiente).
const STAT_BUY: Record<string, { name: string; icon: string; fx: Fx; base: number; step: number; text: string }> = {
  atk: { name: "Afilar", icon: "🗡️", fx: { atk: 1 }, base: 20, step: 4, text: "+1 de ataque" },
  def: { name: "Reforzar", icon: "🛡️", fx: { def: 3 }, base: 18, step: 3, text: "+3 de Defensa" },
  hp: { name: "Forro acolchado", icon: "❤️", fx: { maxHp: 12, heal: 0.05 }, base: 18, step: 4, text: "+12 de vida máx." },
  crit: { name: "Lente de precisión", icon: "🎯", fx: { crit: 0.04 }, base: 25, step: 5, text: "+4% de crítico" },
  critDmg: { name: "Martillete", icon: "💥", fx: { critDmg: 0.2 }, base: 25, step: 5, text: "+20% de Daño crítico" },
  eva: { name: "Capa ligera", icon: "💨", fx: { eva: 0.03 }, base: 25, step: 6, text: "+3% de Evasión" },
  acc: { name: "Lente de aumento", icon: "👁️", fx: { acc: 0.05 }, base: 20, step: 4, text: "+5% de Acierto" },
};
function statPrice(h: Hero, id: string): number { const b = STAT_BUY[id]; return b.base + b.step * (h.bought[id] || 0); }

// ---------- Ofertas de habilidades ----------
// modo: "normal" | "elite" (sin comunes) | "epica" (épicas y legendarias) | id de familia
interface Card { kind: "skill" | "stat"; id: string; name: string; icon: string; fam?: Fam; rarity?: Rarity; level: number; text: string; chance: number }
const STAT_CARDS = [
  { id: "galletas", name: "Lata de galletas", icon: "🍪", text: "+10 de vida máx. y cura 10." },
  { id: "tuercas", name: "Apretar tuercas", icon: "🔧", text: "+1 de ataque." },
  { id: "bolsa", name: "Bolsa de tuercas", icon: "💰", text: "+20 tuercas." },
];
function applyStat(h: Hero, id: string): void {
  if (id === "galletas") { h.maxHp += 10; h.hp = Math.min(h.maxHp, h.hp + 10); }
  if (id === "tuercas") h.atk += 1;
  if (id === "bolsa") h.coins += 20;
}
function candidates(h: Hero, mode: string): { s: SkillDef; w: number }[] {
  const out: { s: SkillDef; w: number }[] = [];
  const gfam = GEAR_BY_ID[h.gear] ? GEAR_BY_ID[h.gear].fam : null;
  for (const s of SKILLS) {
    const R = RARITY[s.rarity];
    if (lv(h, s.id) >= s.max) continue;
    if (h.banished.indexOf(s.id) >= 0) continue;
    if (s.req && !s.req.some((r: string) => lv(h, r) > 0)) continue;
    if (s.syn && !s.syn.every((f: Fam) => famOwned(h, f))) continue;
    if (!lv(h, s.id) && R.minFam && famCount(h, s.fam) < R.minFam) continue;
    if (mode === "elite" && s.rarity === "comun") continue;
    if (mode === "epica" && s.rarity !== "epica" && s.rarity !== "legendaria") continue;
    if (FAM_BY_ID[mode] && s.fam !== mode && !(s.syn && s.syn.indexOf(mode as Fam) >= 0)) continue;
    let w = R.weight;
    if (s.fam === gfam || (s.syn && gfam && s.syn.indexOf(gfam) >= 0)) w *= BAL.gearOfferMult;
    w *= 1 + 0.2 * Math.min(famCount(h, s.fam), 5);
    if (lv(h, s.id) > 0) w *= 1.3;
    out.push({ s: s, w: w });
  }
  return out;
}
function makeOffer(h: Hero, rng: Rng, mode: string): Card[] {
  let pool = candidates(h, mode);
  const add = (m: string): void => { pool = pool.concat(candidates(h, m).filter((c) => pool.every((p) => p.s.id !== c.s.id))); };
  if (pool.length < 3 && mode === "epica") add("elite");
  if (pool.length < 3 && mode !== "normal") add("normal");
  const total = pool.reduce((a: number, c: { s: SkillDef; w: number }) => a + c.w, 0);
  const cards: Card[] = [];
  const count: Record<string, number> = {};
  let left = pool.slice();
  while (cards.length < 3 && left.length) {
    const sum = left.reduce((a: number, c: { s: SkillDef; w: number }) => a + c.w, 0);
    let r = rng() * sum; let i = 0;
    for (; i < left.length - 1; i++) { r -= left[i].w; if (r <= 0) break; }
    const c = left.splice(i, 1)[0];
    count[c.s.rarity] = (count[c.s.rarity] || 0) + 1;
    if (count[c.s.rarity] >= RARITY[c.s.rarity].perOffer) left = left.filter((x) => x.s.rarity !== c.s.rarity);
    const next = lv(h, c.s.id) + 1;
    cards.push({ kind: "skill", id: c.s.id, name: c.s.name, icon: c.s.icon, fam: c.s.fam, rarity: c.s.rarity, level: next, text: skillText(c.s, next), chance: total ? c.w / total : 0 });
  }
  let k = 0;
  while (cards.length < 3) { const st = STAT_CARDS[k++ % STAT_CARDS.length]; cards.push({ kind: "stat", id: st.id, name: st.name, icon: st.icon, level: 1, text: st.text, chance: 0 }); }
  return cards;
}
function takeCard(h: Hero, c: Card): void { if (c.kind === "skill") gainSkill(h, c.id); else applyStat(h, c.id); }

// ---------- Enemigos ----------
type Trait = "" | "rapido" | "esquiva" | "blindado" | "regenera" | "espinas" | "pesado" | "certero";
const TRAIT_TXT: Record<string, string> = {
  rapido: "golpea dos veces, más flojo", esquiva: "evasivo: +15% de Evasión (el Acierto lo contrarresta)", blindado: "blindado: +25 de Defensa (óxido, escaldadura y daño que ignora Defensa lo atraviesan)",
  regenera: "regenera 2% de vida por turno", espinas: "te devuelve el 8% del daño de tus golpes", pesado: "golpe pesado periódico", certero: "certero: +15% de Acierto (tu Evasión rinde menos)",
};
interface Enemy { name: string; icon: string; kind: EnemyKind; trait: Trait; heavy: number; maxHp: number; hp: number; atk: number; def: number; eva: number; acc: number; poison: number; burn: number; res: number; mag: number; stun: number; enraged: boolean }
const ENEMIES: { name: string; icon: string; trait: Trait }[] = [
  { name: "Tetera rabiosa", icon: "🫖", trait: "" }, { name: "Ratón de cuerda", icon: "🐭", trait: "rapido" }, { name: "Paraguas murciélago", icon: "☂️", trait: "esquiva" },
  { name: "Tuerca saltarina", icon: "🔩", trait: "blindado" }, { name: "Grillo de latón", icon: "🦗", trait: "regenera" }, { name: "Polilla de gas", icon: "🦋", trait: "espinas" },
  { name: "Farola andante", icon: "🏮", trait: "certero" }, { name: "Cangrejo de cobre", icon: "🦀", trait: "blindado" }, { name: "Gorrión de hojalata", icon: "🐦", trait: "esquiva" },
];
const ELITES: { name: string; icon: string; trait: Trait; heavy: number }[] = [
  { name: "Autómata camarero", icon: "🤖", trait: "rapido", heavy: 0 }, { name: "Cuco con mala uva", icon: "🐦", trait: "pesado", heavy: 3 }, { name: "Pez globo dirigible", icon: "🐡", trait: "espinas", heavy: 0 },
  { name: "Armadillo de calderería", icon: "🦔", trait: "blindado", heavy: 0 }, { name: "Duelista de latón", icon: "🤺", trait: "esquiva", heavy: 0 },
];
const MINIBOSS = { name: "El Capataz de Hierro", icon: "🦾", trait: "pesado" as Trait, heavy: 4 };
const BOSS = { name: "Caldera Mayor", icon: "🏭", trait: "pesado" as Trait, heavy: 4 };
function makeEnemy(step: number, kind: EnemyKind, rng: Rng): Enemy {
  let d: { name: string; icon: string; trait: Trait; heavy?: number }; let hp: number; let atk: number;
  const mh = 1 + BAL.hpStep * (step - 1), ma = 1 + BAL.atkStep * (step - 1);
  let def = Math.round(BAL.enemyDefStep * (step - 1)), eva = BAL.enemyEva, acc = 0;
  if (kind === "boss") { d = BOSS; hp = BAL.bossHp; atk = BAL.bossAtk; def = BAL.bossDef; acc = BAL.bossAcc; }
  else if (kind === "mini") { d = MINIBOSS; hp = BAL.miniHp; atk = BAL.miniAtk; def = BAL.miniDef; acc = BAL.bossAcc / 2; }
  else if (kind === "elite") { d = pick(ELITES, rng); hp = BAL.enemyHp * mh * BAL.eliteHp; atk = BAL.enemyAtk * ma * BAL.eliteAtk; }
  else { d = pick(ENEMIES, rng); hp = BAL.enemyHp * mh; atk = BAL.enemyAtk * ma; }
  if (d.trait === "blindado") { def += BAL.armorDef; hp *= 0.85; }
  if (d.trait === "esquiva") { eva += BAL.evasiveEva; hp *= 0.9; }
  if (d.trait === "certero") acc += BAL.sureAcc;
  hp = Math.round(hp); atk = Math.round(atk * 10) / 10;
  return { name: d.name, icon: d.icon, kind: kind, trait: d.trait, heavy: d.heavy || 0, maxHp: hp, hp: hp, atk: atk, def: def, eva: eva, acc: acc, poison: 0, burn: 0, res: 0, mag: 0, stun: 0, enraged: false };
}
function hitChance(acc: number, eva: number): number { return Math.max(BAL.minHit, Math.min(1, BAL.baseHit + acc - eva)); }
function defMult(def: number): number { return BAL.defK / (BAL.defK + Math.max(0, def)); }

// ---------- Combate automático ----------
type LogKind = "hit" | "crit" | "poison" | "burn" | "bolt" | "enemy" | "heal" | "shield" | "info" | "thorns" | "reso" | "auto" | "mag" | "miss";
interface LogEntry { k: LogKind; text: string; hp: number; maxHp: number; shield: number; ehp: number; poison: number; burn: number; res: number; mag: number; edef: number; turn: number }
interface BattleResult { win: boolean; turns: number; log: LogEntry[]; dmgBy: Record<string, number>; coins: number; misses: number; dodges: number }

function battle(h: Hero, e: Enemy, rng: Rng, withLog: boolean): BattleResult {
  const log: LogEntry[] = []; const dmgBy: Record<string, number> = {};
  const G = GEAR_BY_ID[h.gear]; const gf = G ? G.fam : null;
  const gsrc = gf === "engranaje" ? "ataque" : gf;
  const ST = stats(h);
  let shield = h.maxHp * (sv(h, "r_plancha") + md(h, "startShield"));
  let t = 0, tempo = lv(h, "c_cuerda") >= 3 ? 30 : 0, swing = 0, cond = 0, volante = 0, minis = 0, enemyTurns = 0, heat = 1, heatLogged = false;
  let revived = false, stopped = false, plancha2 = lv(h, "r_plancha") >= 5, firstMiss = md(h, "firstMiss") > 0;
  let flasks = lv(h, "a_frasco") >= 3 ? 2 : lv(h, "a_frasco") ? 1 : 0;
  let bolts = 0, detos = 0, vib = 0, defLoss = 0, burnT = 0, misses = 0, dodges = 0, inCure = false;
  const healMult = 1 + sv(h, "a_piedra");
  const catal = sv(h, "a_catalizador");
  const plaga = lv(h, "o_plaga") > 0 && famCount(h, "oxido") >= 4;
  const corazon = lv(h, "v_corazon") > 0 && famCount(h, "vapor") >= 4;
  const bucle = lv(h, "c_bucle") > 0 && famCount(h, "reloj") >= 4;
  const aurea = lv(h, "a_aurea") > 0 && famCount(h, "alquimia") >= 4;
  const fortaleza = lv(h, "r_fortaleza") > 0 && ST.def >= 20;
  const enemyDef = (): number => Math.max(0, e.def - Math.min(30, e.poison * sv(h, "o_mordiente")) - e.mag * sv(h, "m_limaduras") - defLoss);
  const L = (k: LogKind, text: string): void => {
    if (withLog) log.push({ k: k, text: text, hp: Math.max(0, Math.round(h.hp)), maxHp: h.maxHp, shield: Math.round(shield), ehp: Math.max(0, Math.round(e.hp)), poison: Math.round(e.poison), burn: e.burn, res: Math.round(e.res * 10) / 10, mag: e.mag, edef: Math.round(enemyDef()), turn: t });
  };
  const critNow = (): number => ST.crit + (lv(h, "e_calibre") ? Math.max(0, ST.acc - e.eva) * sv(h, "e_calibre") : 0);
  const critDmgNow = (): number => ST.critDmg;
  const atkNow = (): number => ST.atk * (1 + Math.min(t, 15) * sv(h, "e_marcha") + cond * sv(h, "t_cond") + volante * sv(h, "c_volante"));
  const magCap = (): number => 0.3 + (lv(h, "m_iman") >= 5 ? 0.1 : 0) + (lv(h, "m_polo") ? 0.1 : 0);
  const atkDown = (): number => Math.min(magCap(), e.mag * sv(h, "m_iman") + sv(h, "m_polo"));
  const deal = (amt: number, src: string, o: { attack?: boolean; dot?: boolean; pierce?: boolean }): number => {
    let m = 1 + md(h, "dmgPct");
    if (src === gsrc) m += gf === "engranaje" ? BAL.gearHitBonus : gf === "vapor" ? BAL.gearVapor : BAL.gearBonus;
    if (e.poison >= 8) m += sv(h, "o_corr");
    if (e.burn > 0) m += sv(h, "v_presion");
    m += e.mag * (sv(h, "m_atrac") + (gf === "iman" ? BAL.gearMag : 0));
    if (e.hp > e.maxHp * 0.7) m += sv(h, "a_volatil");
    if (o.attack && e.hp < e.maxHp * 0.3) m += sv(h, "e_cizalla");
    if (!o.attack) m *= BAL.skillMult;
    if (!o.dot && !o.pierce) m *= defMult(enemyDef());
    const d = Math.max(1, Math.round(amt * m));
    e.hp -= d; dmgBy[src] = (dmgBy[src] || 0) + d;
    return d;
  };
  const cure = (amt: number): number => {
    amt *= healMult; const real = Math.max(0, Math.min(h.maxHp - h.hp, amt)); h.hp += real;
    if (lv(h, "a_piedra") && amt > real) shield += amt - real;
    if (aurea && real >= 1 && e.hp > 0 && !inCure) { inCure = true; const d = deal(real * sv(h, "a_aurea"), "alquimia", { pierce: true }); inCure = false; L("heal", "Transmutación áurea: " + d + " de daño"); }
    return real;
  };
  const addMag = (n: number): void => { e.mag = Math.min(20, e.mag + n); };
  const detonate = (): void => {
    const th = BAL.resTh - sv(h, "s_armonico");
    while (e.res >= th && e.hp > 0) {
      e.res -= th; detos++;
      const nota = lv(h, "s_nota") > 0 && detos > 4;
      const pct = BAL.detonK * (1 + sv(h, "s_campana") + (lv(h, "s_diapason") >= 5 ? 0.5 : 0) + (nota ? sv(h, "s_nota") : 0)) * (1 + sv(h, "y_vibra") * e.mag);
      const d = deal(atkNow() * pct, "reso", { pierce: true });
      if (lv(h, "y_vibra")) addMag(3);
      if (lv(h, "s_grieta")) defLoss += sv(h, "s_grieta");
      if (lv(h, "s_vibrato") && vib < 5) vib++;
      if (lv(h, "y_campanario")) shield += ST.def * sv(h, "y_campanario") + 3;
      let st = ""; if (lv(h, "s_diapason") >= 3 || nota) { e.stun = Math.max(e.stun, 1); st = " · ¡aturdido!"; }
      e.res += sv(h, "s_eco");
      L("reso", (nota ? "Nota imposible: " : "Detonación de resonancia: ") + d + st);
    }
  };
  const addRes = (v: number): void => { if (v > 0 && e.hp > 0) { e.res += v; detonate(); } };
  const bolt = (pct: number, label: string): void => {
    let n = 1; while (n < 4 && rng() < sv(h, "t_arco")) n++;
    for (let i = 0; i < n && e.hp > 0; i++) {
      if (lv(h, "y_electro")) addMag(1);
      let amt = atkNow() * pct * (1 + sv(h, "y_electro") * e.mag) * (1 + sv(h, "t_sobrecarga"));
      const cr = lv(h, "t_estatica") > 0 && rng() < sv(h, "t_estatica");
      if (cr) amt *= critDmgNow();
      const d = deal(amt, "tesla", {});
      bolts++;
      if (lv(h, "t_cond")) cond = Math.min(20, cond + 1);
      if (lv(h, "y_galvano")) e.poison += sv(h, "y_galvano");
      let st = ""; if (rng() < sv(h, "t_corto")) { e.stun = Math.max(e.stun, 1); st = " · ¡aturdido!"; }
      L("bolt", label + (i ? " (arco)" : "") + ": " + d + " de descarga" + (cr ? " CRÍTICA" : "") + st);
      addRes(sv(h, "y_bobres"));
    }
  };
  const nAuto = (): number => (lv(h, "u_ayudante") ? (lv(h, "u_ayudante") >= 5 ? 2 : 1) : 0) + (lv(h, "u_ejercito") && minis >= 3 ? 1 : minis);
  const automatons = (mult: number, label: string): void => {
    let total = 0;
    const am = (1 + sv(h, "u_mant") + (e.burn > 0 ? sv(h, "y_turbina") : 0)) * mult;
    const ac = (lv(h, "u_ayudante") >= 3 ? critNow() : 0) + sv(h, "u_tornillos");
    const cr = (x: number): number => (ac > 0 && rng() < ac ? x * critDmgNow() : x);
    if (lv(h, "u_ayudante") && e.hp > 0) total += deal(cr(atkNow() * sv(h, "u_ayudante") * (lv(h, "u_ayudante") >= 5 ? 1.5 : 1) * am), "auto", {});
    if (minis > 0 && e.hp > 0) {
      if (lv(h, "u_ejercito") && minis >= 3) total += deal(cr(atkNow() * sv(h, "u_ejercito") * am), "auto", { pierce: true });
      else total += deal(cr(atkNow() * sv(h, "u_linea") * minis * am), "auto", {});
    }
    if (total > 0) { L("auto", label + ": " + total); if (lv(h, "y_alqauto")) cure(total * sv(h, "y_alqauto")); }
  };
  const strike = (label: string, src: string, extra: boolean, mult: number): void => {
    swing++;
    if (!(extra && lv(h, "c_minutero")) && rng() >= hitChance(ST.acc, e.eva)) { misses++; L("miss", label + ": ¡falla! (" + e.name + " lo esquiva)"); return; }
    const crit = rng() < critNow() || (extra && lv(h, "y_ancora") > 0);
    const meca = crit && lv(h, "e_mecanismo") > 0 && critNow() >= 0.4;
    let amt = atkNow() * (0.9 + rng() * 0.2) * mult * (extra ? BAL.extraMult : BAL.hitMult) * (1 + sv(h, "e_afilado"));
    if (crit) amt *= critDmgNow() + (extra ? sv(h, "y_ancora") : 0) + (meca ? sv(h, "e_mecanismo") : 0);
    if (swing % 3 === 0) amt *= 1 + sv(h, "c_pendulo");
    if (lv(h, "r_mamparo")) amt += shield * 0.1;
    const d = deal(amt, src, { attack: true, pierce: crit && lv(h, "e_martillo") >= 3 });
    let more = "";
    if (meca && e.hp > 0) more += " + " + deal(amt * 0.5, src, { attack: true, pierce: lv(h, "e_martillo") >= 3 }) + " (mecanismo)";
    if (lv(h, "r_remachadora") && ST.def > 0 && e.hp > 0) more += " + " + deal(ST.def * sv(h, "r_remachadora"), "remache", {}) + " (remachadora)";
    L(crit ? "crit" : "hit", label + (crit ? " CRÍTICO" : "") + ": " + d + more);
    if (e.trait === "espinas") { const r = Math.round(d * 0.08); if (r > 0) { h.hp -= r; L("enemy", "Espinas de " + e.name + ": " + r); } }
    if (lv(h, "y_dinamo")) cure(d * sv(h, "y_dinamo"));
    if (lv(h, "o_gota")) e.poison += sv(h, "o_gota") * (crit && lv(h, "o_gota") >= 3 ? 2 : 1);
    if (crit && lv(h, "y_lima")) e.poison += sv(h, "y_lima");
    if (lv(h, "v_chorro") && (rng() < sv(h, "v_chorro") || (crit && lv(h, "v_chorro") >= 5))) { e.burn = Math.max(e.burn, lv(h, "v_chorro") >= 3 ? 4 : 3); L("burn", "¡Escaldado!"); }
    if (lv(h, "m_iman")) addMag(1);
    if (e.hp > 0 && lv(h, "t_chispazo") && (rng() < sv(h, "t_chispazo") || (swing === 1 && lv(h, "t_chispazo") >= 5))) bolt(lv(h, "t_chispazo") >= 3 ? 1.2 : 1, "Chispazo");
    if (e.hp > 0 && crit && lv(h, "y_chispaprec")) bolt(sv(h, "y_chispaprec"), "Chispa de precisión");
    if (e.hp > 0 && lv(h, "t_tormenta") && bolts >= 8) bolt(sv(h, "t_tormenta"), "Tormenta embotellada");
    if (lv(h, "s_diapason")) addRes(sv(h, "s_diapason"));
  };
  const extraAction = (mult: number, label: string): void => {
    if (lv(h, "y_pendmag")) addMag(2);
    strike(label, "reloj", true, mult * (lv(h, "c_cuerda") >= 5 ? 1.5 : 1) * (1 + sv(h, "c_minutero")) * (1 + sv(h, "y_pendmag") * e.mag));
    if (lv(h, "c_campanada") && e.hp > 0) { const d = deal(atkNow() * sv(h, "c_campanada"), "reloj", { pierce: true }); L("hit", "Campanada: " + d); }
    if (lv(h, "c_volante")) volante = Math.min(10, volante + 1);
    if (lv(h, "y_sincro")) automatons(sv(h, "y_sincro"), "Autómatas sincronizados");
  };
  const save = (): boolean => {
    if (lv(h, "v_reserva") && !revived) { revived = true; h.hp = Math.round(h.maxHp * sv(h, "v_reserva")); L("heal", "¡Caldera de reserva! Vuelves a arrancar con " + h.hp + " de vida"); return true; }
    return false;
  };
  const lostTurn = (): void => { if (lv(h, "c_retroceso")) tempo += sv(h, "c_retroceso"); };
  const enemyHit = (hm: number, heavy: boolean): void => {
    if (firstMiss) { firstMiss = false; L("info", "Segundo de gracia: el primer ataque falla"); return; }
    if (rng() < sv(h, "m_polar")) { L("info", "Desvías el ataque de " + e.name); return; }
    const eva = ST.eva + vib * sv(h, "s_vibrato");
    const acc = e.acc - (e.burn > 0 ? sv(h, "v_hervor") : 0);
    if (rng() >= hitChance(acc, eva)) {
      dodges++; L("miss", "Esquivas el ataque de " + e.name);
      if (lv(h, "t_pararrayos") && e.hp > 0) bolt(sv(h, "t_pararrayos"), "Pararrayos");
      if (lv(h, "u_resortes") && e.hp > 0) automatons(sv(h, "u_resortes"), "Resortes");
      return;
    }
    let raw = e.atk * (e.enraged ? 1.25 : 1) * heat * hm * (0.9 + rng() * 0.2) * (1 + md(h, "enemyAtk")) * (1 - atkDown());
    if (e.burn > 0) raw *= 1 - sv(h, "y_dilatado");
    raw *= Math.max(0.3, 1 - sv(h, "r_doble") + md(h, "dmgTaken"));
    const dm = defMult(ST.def);
    let dmg = raw * dm; const blocked = raw - dmg;
    const esc = dmg * sv(h, "u_escudero"); dmg -= esc;
    let abs = 0; if (shield > 0) { abs = Math.min(shield, dmg); shield -= abs; dmg -= abs; }
    dmg = Math.round(dmg); h.hp -= dmg;
    L("enemy", e.icon + (heavy ? " GOLPE PESADO" : " ataca") + ": " + dmg + (blocked >= 1 ? " (" + Math.round(blocked) + " parado por Defensa)" : "") + (abs >= 1 ? " (" + Math.round(abs) + " al escudo)" : "") + (esc >= 1 ? " (" + Math.round(esc) + " al escudero)" : ""));
    if (fortaleza && e.hp > 0 && blocked + abs >= 1) { const d = deal((blocked + abs) * sv(h, "r_fortaleza"), "remache", { pierce: true }); L("thorns", "Fortaleza andante: " + d); }
    if (lv(h, "r_puntas") && e.hp > 0) { const d = deal(raw * sv(h, "r_puntas"), "remache", { pierce: lv(h, "r_puntas") >= 5 }); L("thorns", "Remaches: " + d); }
    if (e.hp > 0 && rng() < sv(h, "y_muelle")) { const d = deal(atkNow(), "remache", {}); L("thorns", "Muelle de retroceso: " + d); }
    if (e.hp > 0 && rng() < sv(h, "y_tierra")) bolt(0.8, "Toma de tierra");
    if (h.hp > 0 && plancha2 && h.hp < h.maxHp * 0.5) { plancha2 = false; const sh = h.maxHp * sv(h, "r_plancha"); shield += sh; L("shield", "La plancha se recarga: +" + Math.round(sh)); }
    if (h.hp > 0 && flasks > 0 && h.hp < h.maxHp * 0.4) { flasks--; const r = cure(h.maxHp * sv(h, "a_frasco")); L("heal", "Frasco de emergencia: +" + Math.round(r)); }
    if (h.hp > 0 && !stopped && lv(h, "c_parada") && h.hp < h.maxHp * 0.3) { stopped = true; e.stun += sv(h, "c_parada"); L("info", "¡Parar el tiempo! " + e.name + " pierde " + sv(h, "c_parada") + " turno(s)"); }
  };

  L("info", "¡" + e.icon + " " + e.name + " aparece! (🛡️ " + e.def + " · 💨 " + fmtP(e.eva) + " · 👁️ +" + fmtP(e.acc) + ")" + (e.trait ? " · " + TRAIT_TXT[e.trait] : ""));
  if (shield > 0) L("shield", "Escudo inicial: +" + Math.round(shield));
  if (lv(h, "o_gota") >= 5) e.poison += 4;
  if (lv(h, "o_salpica")) e.poison += sv(h, "o_salpica");
  if (lv(h, "m_brujula")) addMag(sv(h, "m_brujula"));
  if (md(h, "openBolt")) bolt(md(h, "openBolt"), "Chispa inicial");
  const overT = BAL.overheat[e.kind];
  while (h.hp > 0 && e.hp > 0 && t < BAL.turnCap) {
    t++;
    // 1) inicio del turno: regeneración, estados y autómatas
    const reg = h.maxHp * (sv(h, "a_tonico") * (lv(h, "a_tonico") >= 5 && h.hp < h.maxHp * 0.3 ? 2 : 1) + md(h, "regen"));
    if (reg > 0) { const r = cure(reg); if (r >= 1) L("heal", "Regeneración: +" + Math.round(r)); }
    if (e.poison > 0) {
      const pl = plaga && e.poison >= 15;
      let amt = e.poison * ST.atk * BAL.poisonK * (1 + sv(h, "o_conc") + md(h, "dotPct") + catal + (pl ? sv(h, "o_plaga") : 0));
      const pc = lv(h, "o_brecha") > 0 && rng() < critNow() * sv(h, "o_brecha");
      if (pc) amt *= critDmgNow();
      const d = deal(amt, "oxido", { dot: true });
      L("poison", "Óxido (" + Math.round(e.poison) + "): " + d + (pc ? " CRÍTICO" : "") + (pl ? " · plaga" : ""));
      if (lv(h, "y_acido")) cure(d * sv(h, "y_acido"));
      const every = Math.max(lv(h, "o_eterna") ? SKILL_BY_ID.o_eterna.vals[lv(h, "o_eterna") - 1] : 1, lv(h, "o_conc") >= 5 ? 2 : 1);
      if (!pl && t % every === 0) { e.poison = e.poison * (1 - BAL.poisonDecay) - 0.5; if (e.poison < 0.5) e.poison = 0; }
      if (e.hp <= 0) break;
    }
    if (e.burn > 0) {
      burnT++;
      const tox = 1 + sv(h, "y_corrosivo") * Math.min(20, e.poison);
      const cz = corazon ? 1 + sv(h, "v_corazon") * Math.min(20, burnT) : 1;
      const d = deal(ST.atk * BAL.burnK * (1 + sv(h, "v_caldera") + md(h, "dotPct") + catal) * tox * cz, "vapor", { dot: true });
      if (!corazon) e.burn--;
      L("burn", "Escaldadura: " + d);
      addRes(sv(h, "y_silbato"));
      if (e.hp <= 0) break;
    }
    automatons(1, lv(h, "u_ejercito") && minis >= 3 ? "Gran Autómata y ayudantes" : "Autómatas");
    if (lv(h, "y_golem") && nAuto() > 0) shield += h.maxHp * sv(h, "y_golem");
    if (lv(h, "m_campo") && e.mag >= 5 && e.hp > 0) { const d = deal(atkNow() * sv(h, "m_campo") * (e.mag / 5), "iman", {}); L("mag", "Campo magnético: " + d); }
    if (lv(h, "m_singular") && e.mag >= 20 && e.hp > 0) { const d = deal(atkNow() * sv(h, "m_singular") * e.mag, "iman", { pierce: true }); e.mag = 10; L("mag", "¡Singularidad! Las cargas colapsan: " + d); }
    if (lv(h, "s_coro")) addRes(sv(h, "s_coro"));
    if (e.trait === "regenera" && e.hp > 0) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02);
    if (e.hp <= 0) break;
    // 2) acciones del héroe
    const swings = rng() < sv(h, "e_doble") ? 2 : 1;
    for (let s = 0; s < swings && e.hp > 0; s++) strike(s ? "Segundo golpe" : "Golpe", "ataque", false, s && lv(h, "e_doble") >= 5 ? 1.25 : 1);
    tempo += sv(h, "c_cuerda") + md(h, "tempo") + (gf === "reloj" ? BAL.gearTempo : 0);
    while (tempo >= 100 && e.hp > 0) { tempo -= 100; extraAction(1, "Acción extra"); }
    if (e.hp <= 0) break;
    if (h.hp <= 0 && !save()) break;
    // 3) habilidades periódicas
    if (lv(h, "o_lluvia") && t % (lv(h, "o_lluvia") >= 5 ? 2 : 3) === 0) { e.poison += sv(h, "o_lluvia"); L("poison", "Lluvia ácida: +" + fmtN(sv(h, "o_lluvia")) + " de óxido"); }
    if (lv(h, "v_valvula") && t % (lv(h, "v_valvula") >= 5 ? 3 : 4) === 0) { const d = deal(atkNow() * sv(h, "v_valvula"), "vapor", {}); e.burn = Math.max(e.burn, 3); L("burn", "Válvula de escape: " + d + " y escalda"); }
    if (lv(h, "v_geiser") && t % 5 === 0 && e.hp > 0) { const d = deal(atkNow() * sv(h, "v_geiser"), "vapor", { pierce: true }); L("burn", "Géiser: " + d); }
    if (lv(h, "t_bobina") && t % 5 === 0) { for (let i = 0; i < (lv(h, "t_bobina") >= 5 ? 4 : 3) && e.hp > 0; i++) bolt(sv(h, "t_bobina"), "Bobina Tesla"); }
    if (lv(h, "r_mamparo") && t % 3 === 0) { const sh = h.maxHp * sv(h, "r_mamparo"); shield += sh; L("shield", "Mamparo blindado: +" + Math.round(sh) + " de escudo"); }
    if (lv(h, "r_ariete") && t % 4 === 0 && e.hp > 0) { const d = deal(ST.def * sv(h, "r_ariete") + atkNow() * 0.6, "remache", {}); L("thorns", "¡Ariete! " + d); }
    if (lv(h, "a_vial") && t % 3 === 0 && e.hp > 0) { const d = deal(atkNow() * sv(h, "a_vial") * (1 + catal), "alquimia", { pierce: true }); L("hit", "Vial corrosivo: " + d); }
    if (lv(h, "a_mercurio") && t % 4 === 0 && e.hp > 0) { const d = deal(atkNow() * sv(h, "a_mercurio") * (1 + catal), "alquimia", {}); const r = cure(d * 0.15); L("heal", "Frasco de mercurio: " + d + " de daño, +" + Math.round(r) + " de vida"); }
    if (lv(h, "m_pulso") && t % 4 === 0 && e.hp > 0) { const d = deal(atkNow() * sv(h, "m_pulso") * (1 + 0.04 * e.mag), "iman", {}); L("mag", "Pulso magnético: " + d); }
    if (lv(h, "s_onda") && t % 3 === 0) addRes(sv(h, "s_onda"));
    if (lv(h, "u_linea") && t % 4 === 0 && minis < 3) { minis++; L("auto", minis === 3 && lv(h, "u_ejercito") ? "¡Los 3 mini autómatas se ensamblan en un Gran Autómata!" : "Montas un mini autómata (" + minis + ")"); }
    if (lv(h, "u_bateria") && t % 5 === 0 && e.hp > 0 && nAuto() > 0) { const d = deal(atkNow() * sv(h, "u_bateria") * nAuto(), "auto", {}); L("auto", "Batería compartida: " + d); }
    if (lv(h, "u_coloso") && t % 6 === 0 && e.hp > 0) { const d = deal(atkNow() * sv(h, "u_coloso"), "auto", {}); e.stun = Math.max(e.stun, 1); L("auto", "¡El coloso pisa! " + d + " · aturdido"); }
    if (bucle && t % 6 === 0) { for (let i = 0; i < 3 && e.hp > 0; i++) extraAction(1 + sv(h, "c_bucle"), "Bucle temporal"); }
    if (e.hp <= 0) break;
    // 4) turno enemigo
    if (e.stun > 0) { e.stun--; lostTurn(); L("info", e.name + " está aturdido y pierde el turno"); continue; }
    if (rng() < sv(h, "c_freno")) { lostTurn(); L("info", "Freno de escape: " + e.name + " pierde el turno"); continue; }
    enemyTurns++;
    if ((e.kind === "boss" || e.kind === "mini") && !e.enraged && e.hp < e.maxHp * 0.5) { e.enraged = true; L("info", "¡" + e.name + " se enfurece! (+25% de ataque)"); }
    if (t > overT) { heat *= 1 + BAL.heatRate; if (!heatLogged) { heatLogged = true; L("info", e.name + " se recalienta: pega más fuerte cada turno"); } }
    const heavy = e.heavy > 0 && enemyTurns % e.heavy === 0;
    const hits = e.trait === "rapido" ? [0.55, 0.55] : [heavy ? BAL.heavyMult : 1];
    for (const hm of hits) { enemyHit(hm, heavy); if (h.hp <= 0 && !save()) break; if (e.hp <= 0) break; }
    if (h.hp <= 0) break;
  }
  const win = e.hp <= 0 && h.hp > 0;
  if (h.hp < 0) h.hp = 0;
  if (!win && h.hp > 0) { h.hp = 0; L("info", "Te quedas sin vapor (límite de " + BAL.turnCap + " turnos)"); }
  let coins = 0;
  if (win && e.kind !== "boss") {
    const before = h.hp;
    h.hp = Math.min(h.maxHp, Math.round(h.hp + h.maxHp * Math.max(0, BAL.postHeal + sv(h, "a_destilado") + md(h, "postHeal"))));
    coins = Math.round(BAL.coins[e.kind] * Math.max(0, 1 + md(h, "coinPct"))); h.coins += coins;
    L("info", "¡Victoria en " + t + " turnos! +" + (h.hp - before) + " de vida y +" + coins + " tuercas.");
  } else L("info", win ? "¡Victoria en " + t + " turnos!" : "Has caído...");
  return { win: win, turns: t, log: log, dmgBy: dmgBy, coins: coins, misses: misses, dodges: dodges };
}

// ---------- Capítulo ----------
type StepKind = "combate" | "elite" | "minijefe" | "evento" | "campamento" | "jefe";
interface Step { kind: StepKind }
const CHAPTER_TEMPLATE: StepKind[] = [
  "combate", "evento", "combate", "combate", "evento", "combate", "elite", "evento", "combate", "evento",
  "combate", "combate", "evento", "campamento", "minijefe", "evento", "combate", "combate", "evento", "elite",
  "evento", "combate", "evento", "combate", "combate", "evento", "elite", "evento", "campamento", "jefe",
];
function makeChapter(seed: string): Step[] { return CHAPTER_TEMPLATE.map((k: StepKind) => ({ kind: k })); }
function fightKind(k: StepKind): EnemyKind | null { return k === "combate" ? "normal" : k === "elite" ? "elite" : k === "minijefe" ? "mini" : k === "jefe" ? "boss" : null; }
const REWARDS: Record<EnemyKind, string[]> = { normal: ["normal"], elite: ["elite"], mini: ["epica", "elite"], boss: [] };
function heal(h: Hero, frac: number): number { const before = h.hp; h.hp = Math.min(h.maxHp, Math.round(h.hp + h.maxHp * frac)); return h.hp - before; }

// ---------- Bendiciones y maldiciones ----------
interface Fx {
  heal?: number; hurt?: number; maxHp?: number; atk?: number; crit?: number; def?: number; eva?: number; acc?: number; critDmg?: number; buy?: string; rerolls?: number; banish?: number; coins?: number;
  offer?: string; upgrade?: number; downgrade?: number; upFam?: boolean; best?: boolean; bless?: string; curse?: string; uncurse?: boolean;
  fight?: EnemyKind; gamble?: { p: number; win: Fx; lose: Fx }; transmute?: boolean; refund?: boolean; fuse?: boolean; mods?: Record<string, number>;
}
const PATRONS = [
  { id: "engranaje", name: "El Gran Engranaje", icon: "⚙️" }, { id: "vapor", name: "La Dama del Vapor", icon: "♨️" },
  { id: "chispa", name: "La Chispa Eterna", icon: "⚡" }, { id: "herrumbre", name: "La Madre Herrumbre", icon: "🧪" }, { id: "relojero", name: "El Relojero Dormido", icon: "⏱️" },
];
const BLESS: Record<string, { name: string; patron: string; text: string; fx: Fx }> = {
  b_diente: { name: "Diente afilado", patron: "engranaje", text: "+10% de ataque", fx: { mods: { atkPct: 0.1 } } },
  b_fortuna: { name: "Rueda de la fortuna", patron: "engranaje", text: "+6% de crítico", fx: { mods: { crit: 0.06 } } },
  b_maestro: { name: "Engranaje maestro", patron: "engranaje", text: "+1 nivel a 2 habilidades al azar", fx: { upgrade: 2 } },
  b_aliento: { name: "Aliento cálido", patron: "vapor", text: "Regeneras 1% de vida por turno", fx: { mods: { regen: 0.01 } } },
  b_bano: { name: "Baño de vapor", patron: "vapor", text: "+8% de curación tras cada combate", fx: { mods: { postHeal: 0.08 } } },
  b_niebla: { name: "Niebla protectora", patron: "vapor", text: "+6% de Evasión", fx: { eva: 0.06 } },
  b_chispa: { name: "Chispa inicial", patron: "chispa", text: "Cada combate empieza con una descarga del 150%", fx: { mods: { openBolt: 1.5 } } },
  b_estatica: { name: "Carga estática", patron: "chispa", text: "+8% de todo tu daño", fx: { mods: { dmgPct: 0.08 } } },
  b_rayo: { name: "Rayo bendito", patron: "chispa", text: "+1 tirada y +1 destierro", fx: { rerolls: 1, banish: 1 } },
  b_piel: { name: "Piel oxidada", patron: "herrumbre", text: "-6% de daño recibido", fx: { mods: { dmgTaken: -0.06 } } },
  b_herencia: { name: "Herencia corrosiva", patron: "herrumbre", text: "+25% de daño de óxido y escaldadura", fx: { mods: { dotPct: 0.25 } } },
  b_chatarra: { name: "Ofrenda de chatarra", patron: "herrumbre", text: "+50 tuercas", fx: { coins: 50 } },
  b_gracia: { name: "Segundo de gracia", patron: "relojero", text: "El primer ataque enemigo de cada combate falla", fx: { mods: { firstMiss: 1 } } },
  b_prestado: { name: "Tiempo prestado", patron: "relojero", text: "+20 de vida máx.", fx: { maxHp: 20 } },
  b_cuerda: { name: "Cuerda eterna", patron: "relojero", text: "+8 de ritmo por turno (acciones extra)", fx: { mods: { tempo: 8 } } },
};
const CURSES: Record<string, { name: string; text: string; mods: Record<string, number>; hp?: number }> = {
  k_grieta: { name: "Grieta en la escafandra", text: "-15 de vida máx.", mods: {}, hp: -15 },
  k_suelto: { name: "Engranaje suelto", text: "Los enemigos pegan un 8% más", mods: { enemyAtk: 0.08 } },
  k_hollin: { name: "Hollín en los ojos", text: "-4% de crítico", mods: { crit: -0.04 } },
  k_valvula: { name: "Válvula atascada", text: "-5% de curación tras los combates", mods: { postHeal: -0.05 } },
  k_juntas: { name: "Óxido en las juntas", text: "+8% de daño recibido", mods: { dmgTaken: 0.08 } },
  k_deuda: { name: "Deuda de tuercas", text: "Ganas la mitad de tuercas", mods: { coinPct: -0.5 } },
};
function addMods(h: Hero, m: Record<string, number>, sign: number): void { for (const k in m) h.mods[k] = (h.mods[k] || 0) + sign * m[k]; }
function ownedUpgradable(h: Hero): string[] { return Object.keys(h.skills).filter((k: string) => lv(h, k) < SKILL_BY_ID[k].max); }
function upgradeRandom(h: Hero, n: number, rng: Rng): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) { const own = ownedUpgradable(h); if (!own.length) { h.atk += 1; out.push("+1 de ataque (nada que mejorar)"); continue; } const id = pick(own, rng); gainSkill(h, id); out.push(SKILL_BY_ID[id].name + " → Nv " + lv(h, id)); }
  return out;
}
function downgradeRandom(h: Hero, n: number, rng: Rng): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) { const own = Object.keys(h.skills); if (!own.length) break; const id = pick(own, rng); setLevel(h, id, lv(h, id) - 1); out.push(SKILL_BY_ID[id].name + " baja a Nv " + lv(h, id)); }
  return out;
}
interface FxOut { offers: string[]; fight: EnemyKind | null; msgs: string[] }
function applyFx(h: Hero, fx: Fx, rng: Rng, out: FxOut): void {
  if (fx.buy) { const id = fx.buy; const p = statPrice(h, id); h.coins = Math.max(0, h.coins - p); h.bought[id] = (h.bought[id] || 0) + 1; out.msgs.push(STAT_BUY[id].name + " por " + p + " tuercas."); applyFx(h, STAT_BUY[id].fx, rng, out); }
  if (fx.gamble) { const ok = rng() < fx.gamble.p; out.msgs.push(ok ? "¡Sale bien!" : "Sale mal..."); applyFx(h, ok ? fx.gamble.win : fx.gamble.lose, rng, out); }
  if (fx.coins) { h.coins = Math.max(0, h.coins + fx.coins); out.msgs.push((fx.coins > 0 ? "+" : "") + fx.coins + " tuercas."); }
  if (fx.hurt) { const l = Math.max(0, Math.min(h.hp - 1, Math.round(h.hp * fx.hurt))); h.hp -= l; out.msgs.push("Pierdes " + l + " de vida."); }
  if (fx.heal) out.msgs.push("Recuperas " + heal(h, fx.heal) + " de vida.");
  if (fx.maxHp) { h.maxHp = Math.max(30, h.maxHp + fx.maxHp); h.hp = Math.max(1, Math.min(h.maxHp, h.hp + Math.max(0, fx.maxHp))); out.msgs.push((fx.maxHp > 0 ? "+" : "") + fx.maxHp + " de vida máx."); }
  if (fx.atk) { h.atk = Math.max(1, h.atk + fx.atk); out.msgs.push((fx.atk > 0 ? "+" : "") + fx.atk + " de ataque."); }
  if (fx.def) { h.def = Math.max(0, h.def + fx.def); out.msgs.push((fx.def > 0 ? "+" : "") + fx.def + " de Defensa."); }
  if (fx.eva) { h.eva = Math.max(0, h.eva + fx.eva); out.msgs.push("+" + fmtP(fx.eva) + " de Evasión."); }
  if (fx.acc) { h.acc = h.acc + fx.acc; out.msgs.push("+" + fmtP(fx.acc) + " de Acierto."); }
  if (fx.critDmg) { h.critDmg = h.critDmg + fx.critDmg; out.msgs.push("+" + fmtP(fx.critDmg) + " de Daño crítico."); }
  if (fx.crit) { h.crit = Math.max(0, h.crit + fx.crit); out.msgs.push("+" + fmtP(fx.crit) + " de crítico."); }
  if (fx.rerolls) { h.rerolls += fx.rerolls; out.msgs.push("+" + fx.rerolls + " tirada."); }
  if (fx.banish) { h.banish += fx.banish; out.msgs.push("+" + fx.banish + " destierro."); }
  if (fx.mods) addMods(h, fx.mods, 1);
  if (fx.upgrade) out.msgs.push(upgradeRandom(h, fx.upgrade, rng).join(" · "));
  if (fx.downgrade) { const r = downgradeRandom(h, fx.downgrade, rng); if (r.length) out.msgs.push(r.join(" · ")); }
  if (fx.best) {
    const own = ownedUpgradable(h).sort((a: string, b: string) => lv(h, b) - lv(h, a));
    if (own.length) { gainSkill(h, own[0]); out.msgs.push(SKILL_BY_ID[own[0]].name + " → Nv " + lv(h, own[0])); } else { h.atk += 2; out.msgs.push("+2 de ataque."); }
  }
  if (fx.upFam) {
    const f = GEAR_BY_ID[h.gear].fam; const ids = ownedUpgradable(h).filter((k: string) => SKILL_BY_ID[k].fam === f);
    ids.forEach((k: string) => gainSkill(h, k));
    if (!ids.length) h.atk += 2;
    out.msgs.push(ids.length ? "Suben de nivel: " + ids.map((k: string) => SKILL_BY_ID[k].name).join(", ") : "Nada que mejorar: +2 de ataque.");
  }
  if (fx.transmute) {
    const own = Object.keys(h.skills).filter((k: string) => !SKILL_BY_ID[k].syn);
    if (own.length) {
      const id = pick(own, rng); const l = lv(h, id);
      const opts = SKILLS.filter((s: SkillDef) => !s.syn && !s.req && s.fam !== SKILL_BY_ID[id].fam && !lv(h, s.id));
      const to = pick(opts, rng); setLevel(h, id, 0); setLevel(h, to.id, Math.min(l, to.max));
      out.msgs.push(SKILL_BY_ID[id].name + " se transmuta en " + to.name + " (Nv " + lv(h, to.id) + ").");
    }
  }
  if (fx.refund) {
    const own = Object.keys(h.skills);
    if (own.length > 1) { const id = pick(own, rng); setLevel(h, id, 0); out.msgs.push("Refundes " + SKILL_BY_ID[id].name + "."); out.msgs.push(upgradeRandom(h, 2, rng).join(" · ")); }
    else { h.atk += 2; out.msgs.push("+2 de ataque."); }
  }
  if (fx.fuse) {
    const own = Object.keys(h.skills).sort((a: string, b: string) => lv(h, a) - lv(h, b)).slice(0, 2);
    own.forEach((k: string) => setLevel(h, k, 0)); out.msgs.push("Fundes " + own.map((k: string) => SKILL_BY_ID[k].name).join(" y ") + "."); out.offers.push("epica");
  }
  if (fx.bless) { const b = BLESS[fx.bless]; h.blessings.push(fx.bless); out.msgs.push("Bendición: " + b.name + " (" + b.text + ")."); applyFx(h, b.fx, rng, out); }
  if (fx.curse) { const c = CURSES[fx.curse]; h.curses.push(fx.curse); addMods(h, c.mods, 1); if (c.hp) { h.maxHp += c.hp; h.hp = Math.min(h.hp, h.maxHp); } out.msgs.push("Maldición: " + c.name + " (" + c.text + ")."); }
  if (fx.uncurse && h.curses.length) { const id = h.curses.splice(Math.floor(rng() * h.curses.length), 1)[0]; const c = CURSES[id]; addMods(h, c.mods, -1); if (c.hp) h.maxHp -= c.hp; out.msgs.push("Te libras de " + c.name + "."); }
  if (fx.offer) out.offers.push(fx.offer);
  if (fx.fight) out.fight = fx.fight;
}

// ---------- Eventos ----------
type EvCat = "dilema" | "bendicion" | "maldicion" | "mercader" | "azar" | "rescate" | "tesoro" | "taller" | "encuentro";
interface EventChoice { id: string; label: string; detail: string; fx: Fx; cost?: number }
interface EventDef { id: string; cat: EvCat; rarity: Rarity; icon: string; title: string; text: string; choices: EventChoice[]; cond?: (h: Hero, step: number) => boolean; stat?: boolean; shop?: boolean }
const EV_CAT: Record<EvCat, string> = { dilema: "Dilema", bendicion: "Bendición", maldicion: "Maldición con premio", mercader: "Mercader", azar: "Azar", rescate: "Rescate", tesoro: "Tesoro", taller: "Taller", encuentro: "Encuentro" };
function C(id: string, label: string, detail: string, fx: Fx, cost?: number): EventChoice { return { id: id, label: label, detail: detail, fx: fx, cost: cost }; }
// Compra de estadística con precio creciente (ver STAT_BUY)
function BUY(id: string): EventChoice { const b = STAT_BUY[id]; return C("buy_" + id, b.icon + " " + b.name, b.text + " · cada compra encarece la siguiente +" + b.step, { buy: id }); }
const NADA = C("nada", "Seguir tu camino", "No pasa nada.", {});
function shrine(id: string, patron: string, text: string, b: string[]): EventDef {
  const p = PATRONS.filter((x) => x.id === patron)[0];
  return { id: id, cat: "bendicion", rarity: "rara", icon: p.icon, title: "Santuario de " + p.name, text: text, choices: b.map((k: string) => C(k, BLESS[k].name, BLESS[k].text, { bless: k })) };
}
const EVENTS: EventDef[] = [
  // Dilemas
  { id: "estatua", cat: "dilema", rarity: "comun", icon: "🗿", title: "Estatua de las dos caras", text: "Una estatua de latón con dos caras te bloquea el paso: solo deja pasar a quien elige.", choices: [C("leon", "Cara del león", "+3 de ataque, pierdes 15% de tu vida actual", { atk: 3, hurt: 0.15 }), C("buho", "Cara del búho", "+1 nivel a una habilidad al azar, -10 de vida máx.", { upgrade: 1, maxHp: -10 })] },
  { id: "puertas", cat: "dilema", rarity: "comun", icon: "🚪", title: "Dos puertas de caldera", text: "Una puerta arde al rojo; la otra rezuma vapor fresco.", choices: [C("roja", "Puerta roja", "Elige 1 de 3 habilidades raras o épicas, pierdes 20% de tu vida actual", { hurt: 0.2, offer: "elite" }), C("azul", "Puerta azul", "Cura 30% de tu vida máx.", { heal: 0.3 })] },
  { id: "balanza", cat: "dilema", rarity: "comun", icon: "⚖️", title: "Balanza del juez mecánico", text: "Un juez de hojalata exige que pongas algo en su balanza.", choices: [C("fuerza", "Poner tu fuerza", "-2 de ataque, +25 de vida máx.", { atk: -2, maxHp: 25 }), C("vida", "Poner tu vida", "-20 de vida máx., +3 de ataque", { maxHp: -20, atk: 3 })] },
  { id: "arena", cat: "dilema", rarity: "comun", icon: "⏳", title: "Reloj de arena gigante", text: "La arena es limadura de cobre. Cae muy despacio.", choices: [C("vuelta", "Darle la vuelta", "+1 tirada y +1 destierro", { rerolls: 1, banish: 1 }), C("romper", "Romperlo", "+30 tuercas", { coins: 30 })] },
  { id: "espejo", cat: "dilema", rarity: "rara", icon: "🪞", title: "Espejo de latón", text: "Tu reflejo lleva un equipo mucho mejor que el tuyo.", choices: [C("mirar", "Imitar al reflejo", "+1 nivel a tu habilidad de mayor nivel", { best: true }), C("girar", "Darle la espalda", "Cura 20% de tu vida máx.", { heal: 0.2 })] },
  { id: "golem", cat: "dilema", rarity: "comun", icon: "🛌", title: "Gólem dormido", text: "Un gólem de chatarra ronca sobre un montón de piezas.", choices: [C("despertar", "Despertarlo", "Combate de élite; recompensa de élite", { fight: "elite" }), C("robar", "Robarle una pieza", "70%: +25 tuercas · 30%: se despierta (combate de élite)", { gamble: { p: 0.7, win: { coins: 25 }, lose: { fight: "elite" } } })] },
  { id: "vias", cat: "dilema", rarity: "comun", icon: "🛤️", title: "Cruce de vías", text: "Dos vías de tranvía: una hacia un taller, otra hacia el mercado.", choices: [C("taller", "Vía del taller", "Elige 1 de 3 habilidades", { offer: "normal" }), C("mercado", "Vía del mercado", "+30 tuercas", { coins: 30 })] },
  { id: "caldera", cat: "dilema", rarity: "comun", icon: "💥", title: "Caldera inestable", text: "La aguja del manómetro tiembla en rojo.", choices: [C("apretar", "Apretar la válvula", "60%: +3 de ataque · 40%: pierdes 25% de tu vida actual", { gamble: { p: 0.6, win: { atk: 3 }, lose: { hurt: 0.25 } } }), NADA] },
  { id: "planos", cat: "dilema", rarity: "comun", icon: "📜", title: "Biblioteca de planos", text: "Estantes de planos enrollados, ordenados por familia.", choices: [C("estudiar", "Estudiar los de tu oficio", "Elige 1 de 3 habilidades de la familia de tu herramienta", { offer: "gear" }), C("llevar", "Llevarte uno al azar", "+1 nivel a una habilidad al azar", { upgrade: 1 })] },
  { id: "farol", cat: "dilema", rarity: "rara", icon: "🏮", title: "El farol que habla", text: "Un farol de gas te ofrece su llama a cambio de algo.", choices: [C("llama", "Aceptar la llama", "+12% de ataque, -15 de vida máx.", { mods: { atkPct: 0.12 }, maxHp: -15 }), C("aceite", "Darle aceite (20 tuercas)", "Cura 40% de tu vida máx.", { coins: -20, heal: 0.4 }, 20)] },
  // Bendiciones de los Motores Patronos
  shrine("s_engranaje", "engranaje", "Una rueda dentada del tamaño de una casa gira sin hacer ruido.", ["b_diente", "b_fortuna", "b_maestro"]),
  shrine("s_vapor", "vapor", "Una figura de vapor tibio te envuelve y susurra.", ["b_aliento", "b_bano", "b_niebla"]),
  shrine("s_chispa", "chispa", "Una chispa azul baila entre dos postes de cobre.", ["b_chispa", "b_estatica", "b_rayo"]),
  shrine("s_herrumbre", "herrumbre", "Un altar cubierto de óxido huele a lluvia y hierro.", ["b_piel", "b_herencia", "b_chatarra"]),
  shrine("s_relojero", "relojero", "Un anciano de bronce duerme junto a mil relojes parados.", ["b_gracia", "b_prestado", "b_cuerda"]),
  { id: "concilio", cat: "bendicion", rarity: "epica", icon: "🌟", title: "Concilio de los Motores", text: "Los cinco Motores Patronos te observan a la vez. Ofrecen un trato.", choices: [C("trato", "Aceptar el trato", "Diente afilado (+10% de ataque) y Piel oxidada (-6% de daño recibido), pero maldición: Engranaje suelto", { bless: "b_diente", curse: "k_suelto", mods: { dmgTaken: -0.06 } }), C("una", "Pedir solo una", "Rueda de la fortuna (+6% de crítico)", { bless: "b_fortuna" })] },
  // Maldiciones con premio
  { id: "cofre_maldito", cat: "maldicion", rarity: "comun", icon: "🎁", title: "Cofre maldito", text: "Un cofre con un candado en forma de calavera de engranajes.", choices: [C("abrir", "Abrirlo", "Elige 1 de 3 épicas; maldición: Engranaje suelto (enemigos +8% de ataque)", { offer: "epica", curse: "k_suelto" }), NADA] },
  { id: "contrato", cat: "maldicion", rarity: "comun", icon: "📃", title: "Contrato de humo", text: "Un hombre sin cara te ofrece un contrato escrito con hollín.", choices: [C("firmar", "Firmar", "+60 tuercas; maldición: Óxido en las juntas (+8% de daño recibido)", { coins: 60, curse: "k_juntas" }), C("romper", "Romperlo", "+1 tirada", { rerolls: 1 })] },
  { id: "mascara", cat: "maldicion", rarity: "comun", icon: "🎭", title: "Máscara de gas encantada", text: "Ves mejor a través de ella, pero respiras peor.", choices: [C("poner", "Ponértela", "+10% de crítico; maldición: Válvula atascada (-5% de curación tras combate)", { crit: 0.1, curse: "k_valvula" }), C("vender", "Venderla", "+25 tuercas", { coins: 25 })] },
  { id: "motor", cat: "maldicion", rarity: "rara", icon: "⚠️", title: "Motor prohibido", text: "Un motor sellado con cadenas zumba con fuerza.", choices: [C("conectar", "Conectarte", "+1 nivel a 2 habilidades; maldición: Grieta en la escafandra (-15 de vida máx.)", { upgrade: 2, curse: "k_grieta" }), C("desconectar", "Desconectarlo", "+10 de vida máx.", { maxHp: 10 })] },
  { id: "cuervo", cat: "maldicion", rarity: "comun", icon: "🐦‍⬛", title: "Cuervo de hojalata", text: "Un cuervo mecánico ofrece un pacto con voz de gramófono.", choices: [C("pacto", "Aceptar su pacto", "+10% de todo tu daño; maldición: Hollín en los ojos (-4% de crítico)", { mods: { dmgPct: 0.1 }, curse: "k_hollin" }), C("espantar", "Espantarlo", "+10 tuercas", { coins: 10 })] },
  { id: "aceite", cat: "maldicion", rarity: "comun", icon: "🛢️", title: "Aceite negro", text: "Un barril de aceite espeso que brilla con reflejos morados.", choices: [C("beber", "Bebértelo", "+4 de ataque; maldición: Deuda de tuercas (ganas la mitad)", { atk: 4, curse: "k_deuda" }), C("combustible", "Usarlo de combustible", "+1 tirada", { rerolls: 1 })] },
  // Mercaderes
  { id: "chatarrero", cat: "mercader", rarity: "comun", icon: "🛒", title: "Chatarrero ambulante", text: "Una vieja nutria con carretilla vende remedios y tornillos.", choices: [C("tonico", "Tónico (30 tuercas)", "Cura 40% de tu vida máx.", { coins: -30, heal: 0.4 }, 30), C("pinon", "Piñón afilado (40 tuercas)", "+2 de ataque", { coins: -40, atk: 2 }, 40), NADA] },
  { id: "relojero", cat: "mercader", rarity: "comun", icon: "⌚", title: "Relojero viajero", text: "Abre un maletín lleno de muelles diminutos.", choices: [C("ajuste", "Ajuste fino (50 tuercas)", "+1 nivel a 2 habilidades al azar", { coins: -50, upgrade: 2 }, 50), C("cuerda", "Cuerda de repuesto (25 tuercas)", "+1 tirada y +1 destierro", { coins: -25, rerolls: 1, banish: 1 }, 25), NADA] },
  { id: "boticaria", cat: "mercader", rarity: "comun", icon: "🦦", title: "Boticaria del canal", text: "Frascos de colores tintinean en su barca.", choices: [C("elixir", "Elixir de vida (35 tuercas)", "+20 de vida máx.", { coins: -35, maxHp: 20 }, 35), C("pomada", "Pomada (15 tuercas)", "Cura 25% de tu vida máx.", { coins: -15, heal: 0.25 }, 15), NADA] },
  { id: "subasta", cat: "mercader", rarity: "rara", icon: "🔨", title: "Subasta de planos", text: "Un subastador con monóculo golpea el mazo.", choices: [C("pujar", "Pujar (60 tuercas)", "Elige 1 de 3 épicas", { coins: -60, offer: "epica" }, 60), C("vender", "Vender un plano tuyo", "-1 nivel a una habilidad al azar, +45 tuercas", { downgrade: 1, coins: 45 }), NADA] },
  { id: "negro", cat: "mercader", rarity: "rara", icon: "🕶️", title: "Mercado negro", text: "Entre tuberías, alguien vende cosas que no deberían existir.", cond: (h: Hero) => h.curses.length > 0, choices: [C("limpiar", "Quitar una maldición (40 tuercas)", "Te libras de una maldición al azar", { coins: -40, uncurse: true }, 40), C("amuleto", "Amuleto de la suerte (45 tuercas)", "+8% de crítico", { coins: -45, crit: 0.08 }, 45), NADA] },
  // Mercaderes de estadísticas (v3: sustituyen al ataque/vida por victoria)
  { id: "herrero", stat: true, shop: true, cat: "mercader", rarity: "comun", icon: "⚒️", title: "Herrera ambulante", text: "Una tortuga con delantal de cuero aviva una fragua portátil.", choices: [BUY("atk"), BUY("def"), NADA] },
  { id: "sastre", stat: true, shop: true, cat: "mercader", rarity: "comun", icon: "🧵", title: "Sastre de latón", text: "Un ratón con cinta métrica te toma medidas sin preguntar.", choices: [BUY("eva"), BUY("hp"), BUY("def"), NADA] },
  { id: "optico", stat: true, shop: true, cat: "mercader", rarity: "comun", icon: "🔍", title: "Óptico de feria", text: "Lentes de todos los tamaños cuelgan de un paraguas abierto.", choices: [BUY("acc"), BUY("crit"), BUY("critDmg"), NADA] },
  { id: "feria", stat: true, shop: true, cat: "mercader", rarity: "rara", icon: "🎪", title: "Feria de inventores", text: "Puestos de chatarra brillante y vendedores que gritan precios.", choices: [BUY("atk"), BUY("crit"), BUY("eva"), NADA] },
  { id: "sparring", stat: true, cat: "dilema", rarity: "comun", icon: "🥊", title: "Autómata de entrenamiento", text: "Un muñeco de muelles se ofrece a entrenar contigo. Pega de verdad.", choices: [C("ataque", "Entrenar el ataque", "+1 de ataque, pierdes 15% de tu vida actual", { atk: 1, hurt: 0.15 }), C("guardia", "Entrenar la guardia", "+3 de Defensa, pierdes 12% de tu vida actual", { def: 3, hurt: 0.12 })] },
  { id: "manual", stat: true, cat: "tesoro", rarity: "comun", icon: "📘", title: "Manuales olvidados", text: "Dos manuales encuadernados en latón asoman de un cubo de basura.", choices: [C("esgrima", "Manual de esgrima", "+5% de Acierto", { acc: 0.05 }), C("baile", "Manual de baile", "+3% de Evasión", { eva: 0.03 })] },
  { id: "pesas", cat: "azar", rarity: "comun", icon: "🏋️", title: "Pesas de caldera", text: "Alguien ha dejado unas pesas hechas con calderas viejas.", choices: [C("levantar", "Levantarlas", "60%: +2 de ataque · 40%: pierdes 20% de tu vida actual", { gamble: { p: 0.6, win: { atk: 2 }, lose: { hurt: 0.2 } } }), NADA] },
  // Azar
  { id: "tragaperras", cat: "azar", rarity: "comun", icon: "🎰", title: "Tragaperras de vapor", text: "Tres rodillos con engranajes, farolas y calaveras.", choices: [C("jugar", "Jugar (15 tuercas)", "40%: +50 tuercas · 60%: nada", { coins: -15, gamble: { p: 0.4, win: { coins: 50 }, lose: {} } }, 15), C("patada", "Darle una patada", "50%: +15 tuercas · 50%: pierdes 10% de tu vida actual", { gamble: { p: 0.5, win: { coins: 15 }, lose: { hurt: 0.1 } } })] },
  { id: "rueda", cat: "azar", rarity: "comun", icon: "🎡", title: "Rueda de engranajes", text: "Una feria abandonada. La rueda aún gira si la empujas.", choices: [C("girar", "Girar", "50%: +1 nivel a 2 habilidades · 50%: -1 nivel a una habilidad", { gamble: { p: 0.5, win: { upgrade: 2 }, lose: { downgrade: 1 } } }), NADA] },
  { id: "dados", cat: "azar", rarity: "comun", icon: "🎲", title: "Dados de cobre", text: "Un jugador con chistera te reta a una tirada.", choices: [C("vida", "Apostar vida", "50%: +25 de vida máx. · 50%: -15 de vida máx.", { gamble: { p: 0.5, win: { maxHp: 25 }, lose: { maxHp: -15 } } }), C("tuercas", "Apostar tuercas (20)", "50%: +3 de ataque · 50%: nada", { coins: -20, gamble: { p: 0.5, win: { atk: 3 }, lose: {} } }, 20)] },
  { id: "manivela", cat: "azar", rarity: "comun", icon: "📦", title: "Caja sorpresa con manivela", text: "Suena una musiquilla. Algo se mueve dentro.", choices: [C("girar", "Girar la manivela", "70%: elige 1 de 3 habilidades · 30%: salta un enemigo (combate)", { gamble: { p: 0.7, win: { offer: "normal" }, lose: { fight: "normal" } } }), NADA] },
  { id: "carrera", cat: "azar", rarity: "rara", icon: "🐭", title: "Carrera de ratones de cuerda", text: "Seis ratones de cuerda esperan en la línea de salida.", choices: [C("apostar", "Apostar (25 tuercas)", "35%: +80 tuercas · 65%: nada", { coins: -25, gamble: { p: 0.35, win: { coins: 80 }, lose: {} } }, 25), C("mirar", "Solo mirar", "Cura 10% de tu vida máx.", { heal: 0.1 })] },
  // Rescates
  { id: "maquinista", cat: "rescate", rarity: "comun", icon: "👷", title: "Maquinista atrapado", text: "Una viga ha caído sobre un maquinista.", choices: [C("levantar", "Levantar la viga", "Pierdes 15% de tu vida actual; te enseña un truco: +1 nivel a 2 habilidades", { hurt: 0.15, upgrade: 2 }), C("ayuda", "Ir a buscar ayuda", "+15 tuercas de recompensa", { coins: 15 })] },
  { id: "aprendiz", cat: "rescate", rarity: "comun", icon: "🧒", title: "Aprendiz perdido", text: "Un aprendiz de relojero no encuentra el camino a casa.", choices: [C("acompanar", "Acompañarle", "Cura 20% y +1 tirada", { heal: 0.2, rerolls: 1 }), C("indicar", "Indicarle el camino", "+10 tuercas", { coins: 10 })] },
  { id: "averiado", cat: "rescate", rarity: "comun", icon: "🔧", title: "Autómata averiado", text: "Un autómata pequeño intenta levantarse una y otra vez.", choices: [C("reparar", "Repararlo", "Elige 1 de 3 habilidades de Autómatas", { offer: "auto" }), C("desguazar", "Desguazarlo", "+30 tuercas", { coins: 30 })] },
  { id: "gato", cat: "rescate", rarity: "comun", icon: "🐈", title: "Gato en la chimenea", text: "Un gato maúlla desde lo alto de una chimenea.", choices: [C("subir", "Subir a por él", "50%: +8% de crítico (el gato da suerte) · 50%: pierdes 10% de tu vida actual", { gamble: { p: 0.5, win: { crit: 0.08 }, lose: { hurt: 0.1 } } }), NADA] },
  { id: "dirigible", cat: "rescate", rarity: "rara", icon: "🎈", title: "Dirigible en apuros", text: "Unos saqueadores atacan un dirigible amarrado.", choices: [C("ayudar", "Defender el dirigible", "Combate de élite; recompensa de élite y +30 tuercas", { fight: "elite", coins: 30 }), NADA] },
  // Tesoros
  { id: "herramientas", cat: "tesoro", rarity: "comun", icon: "🧰", title: "Caja de herramientas", text: "Una caja olvidada bajo un banco de taller.", choices: [C("abrir", "Abrir", "Elige 1 de 3 habilidades", { offer: "normal" }), C("candado", "Vender el candado", "+2 de ataque", { atk: 2 })] },
  { id: "veta", cat: "tesoro", rarity: "comun", icon: "🪙", title: "Veta de cobre", text: "Una pared rota deja ver cobre puro.", choices: [C("picar", "Picar", "+40 tuercas, pierdes 10% de tu vida actual", { coins: 40, hurt: 0.1 }), C("recoger", "Recoger lo suelto", "+15 tuercas", { coins: 15 })] },
  { id: "capitan", cat: "tesoro", rarity: "rara", icon: "🏴", title: "Cofre del capitán", text: "El cofre de un capitán de dirigible, aún cerrado.", choices: [C("forzar", "Forzarlo", "Elige 1 de 3 habilidades raras o épicas", { offer: "elite" }), C("entero", "Venderlo entero", "+50 tuercas", { coins: 50 })] },
  { id: "plano_oro", cat: "tesoro", rarity: "epica", icon: "📐", title: "Plano dorado", text: "Un plano firmado por el mismísimo Gran Ingeniero.", choices: [C("estudiar", "Estudiarlo", "+1 nivel a todas tus habilidades de la familia de tu herramienta", { upFam: true }), C("vender", "Venderlo", "+80 tuercas", { coins: 80 })] },
  { id: "grifo", cat: "tesoro", rarity: "comun", icon: "🚰", title: "Grifo de agua templada", text: "Un grifo de latón gotea agua tibia en un callejón.", choices: [C("beber", "Beber", "Cura 30% de tu vida máx.", { heal: 0.3 }), C("farol", "Rellenar el farol de gas", "+1 tirada", { rerolls: 1 })] },
  // Talleres que transforman habilidades
  { id: "yunque", cat: "taller", rarity: "comun", icon: "⚒️", title: "Yunque del herrero", text: "Un yunque aún caliente y un martillo esperando.", cond: (h: Hero) => Object.keys(h.skills).length >= 3, choices: [C("refundir", "Refundir", "Pierdes una habilidad al azar y ganas 2 niveles repartidos en otras", { refund: true }), C("afilar", "Afilar", "+2 de ataque", { atk: 2 })] },
  { id: "alambique", cat: "taller", rarity: "comun", icon: "⚗️", title: "Alambique de transmutación", text: "Burbujea un líquido que cambia de color.", cond: (h: Hero) => Object.keys(h.skills).length >= 2, choices: [C("transmutar", "Transmutar", "Una habilidad al azar se convierte en otra de otra familia, mismo nivel", { transmute: true }), C("destilado", "Beber el destilado", "Cura 25% de tu vida máx.", { heal: 0.25 })] },
  { id: "altar", cat: "taller", rarity: "comun", icon: "🛞", title: "Altar del Gran Engranaje", text: "Una rueda dentada gigante pide una ofrenda.", choices: [C("cuerda", "Darle cuerda a mano", "Pierdes 20% de tu vida actual, +3 de ataque", { hurt: 0.2, atk: 3 }), C("engrasar", "Engrasarla", "+10 de vida máx.", { maxHp: 10 })] },
  { id: "banco", cat: "taller", rarity: "comun", icon: "🔬", title: "Banco de pruebas", text: "Un banco con pinzas, cables y un botón rojo enorme.", choices: [C("sobrecargar", "Sobrecargar", "+1 nivel a tu mejor habilidad y a otra al azar, -15 de vida máx.", { best: true, upgrade: 1, maxHp: -15 }), C("calibrar", "Calibrar", "+1 nivel a una habilidad al azar", { upgrade: 1 })] },
  { id: "crisol", cat: "taller", rarity: "rara", icon: "🫕", title: "Crisol de fundición", text: "El metal fundido podría unir dos piezas en una mejor.", cond: (h: Hero) => Object.keys(h.skills).length >= 4, choices: [C("fundir", "Fundir dos en una", "Pierdes tus 2 habilidades de menor nivel; eliges 1 de 3 épicas", { fuse: true }), C("calentar", "Calentarte", "Cura 20% de tu vida máx.", { heal: 0.2 })] },
  // Encuentros
  { id: "emboscada", cat: "encuentro", rarity: "comun", icon: "🗡️", title: "Emboscada en el callejón", text: "Unos ojos brillan entre los cubos de basura.", choices: [C("pelear", "Pelear", "Combate normal con recompensa y +20 tuercas", { fight: "normal", coins: 20 }), C("huir", "Huir", "Pierdes 12% de tu vida actual", { hurt: 0.12 })] },
  { id: "duelo", cat: "encuentro", rarity: "rara", icon: "🤺", title: "Duelo de autómatas", text: "Un campeón de duelos mecánicos busca rival.", choices: [C("aceptar", "Aceptar", "Combate de élite; recompensa de élite", { fight: "elite" }), NADA] },
  { id: "eco", cat: "encuentro", rarity: "comun", icon: "🔊", title: "Eco en las tuberías", text: "Algo repite tus pasos dentro de los tubos.", choices: [C("escuchar", "Escuchar", "+1 nivel a una habilidad al azar", { upgrade: 1 }), C("seguir", "Seguir", "Cura 15% de tu vida máx.", { heal: 0.15 })] },
];
const EVENT_BY_ID: Record<string, EventDef> = {};
for (const ev of EVENTS) EVENT_BY_ID[ev.id] = ev;
function choiceCost(h: Hero, c: EventChoice): number { return c.fx.buy ? statPrice(h, c.fx.buy) : c.cost || 0; }
function canChoose(h: Hero, c: EventChoice): boolean { const k = choiceCost(h, c); return !k || h.coins >= k; }
function evW(ev: EventDef): number { return RARITY[ev.rarity].weight * (ev.stat ? BAL.statEventW : 1); }
function pickEvent(h: Hero, step: number, used: string[], rng: Rng): EventDef {
  const pool = EVENTS.filter((ev: EventDef) => used.indexOf(ev.id) < 0 && (!ev.cond || ev.cond(h, step)));
  const total = pool.reduce((a: number, ev: EventDef) => a + evW(ev), 0);
  let r = rng() * total;
  for (const ev of pool) { r -= evW(ev); if (r <= 0) return ev; }
  return pool[pool.length - 1];
}
// Devuelve ofertas pendientes ("normal", "elite", "epica" o una familia) y un posible combate
function applyChoice(h: Hero, c: EventChoice, rng: Rng): { offers: string[]; fight: EnemyKind | null; msg: string } {
  const out: FxOut = { offers: [], fight: null, msgs: [] };
  applyFx(h, c.fx, rng, out);
  const gf = GEAR_BY_ID[h.gear].fam;
  return { offers: out.offers.map((o: string) => (o === "gear" ? gf : o)), fight: out.fight, msg: out.msgs.join(" ") || "Sigues adelante." };
}
const CAMP: EventDef = { id: "campamento", cat: "dilema", rarity: "comun", icon: "🛠️", title: "Campamento", text: "Una estufa de carbón tranquila y un banco de trabajo. Puedes elegir una cosa.", choices: [C("descansar", "Descansar", "Cura 40% de tu vida máx.", { heal: 0.4 }), C("ajustar", "Ajustar el equipo", "+1 nivel a una habilidad al azar", { upgrade: 1 }), BUY("atk"), BUY("def")] };
// CORE-END
