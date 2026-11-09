// Builds data/game.json from reference/core.ts plus English copy.
// Run: node --experimental-strip-types tools/build_content.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";

const src = readFileSync(new URL("../reference/core.ts", import.meta.url), "utf8");
const modPath = join(tmpdir(), "vaporia-core-export.ts");
const extra = `
export {
  SKILLS, RARITY, RARITY_ORDER, FAMS, GEARS, BAL, ENEMIES, ELITES, MINIBOSS, BOSS,
  TRAIT_TXT, STAT_BUY, STAT_CARDS, BLESS, CURSES, PATRONS, EVENTS, CAMP, CHAPTER_TEMPLATE,
  EV_CAT, STAT_INFO, REWARDS
};
`;
writeFileSync(modPath, src + "\n" + extra);
const C = await import(pathToFileURL(modPath).href);

const FAM_EN = {
  oxido: ["Rust", "Corrosion that stacks, ignores Defense, and eats it away"],
  vapor: ["Steam", "Scalds, geysers, and fog (Evasion)"],
  tesla: ["Tesla", "Chain discharges, stuns, and a shock when you dodge"],
  remache: ["Rivet", "Defense, shields, and damage that scales with Defense"],
  engranaje: ["Gear", "Critical hits, Accuracy, and double strikes"],
  reloj: ["Clockwork", "Tempo: extra actions, and slowing the enemy"],
  alquimia: ["Alchemy", "Vials, flasks, and a bit of healing"],
  iman: ["Magnetism", "Charges that weaken, strip Defense, and collapse"],
  reso: ["Resonance", "Vibration that builds, then detonates"],
  auto: ["Automata", "Wind-up helpers that fight beside you"],
};

const RARITY_EN = {
  comun: ["Common", "The base of any build. 6 levels, with milestones at Lv3 and Lv5."],
  rara: ["Rare", "Stronger, or more specific. 6 levels. Cross-family synergies are rare or epic."],
  epica: ["Epic", "One unique effect per family. 4 levels. At most 2 per offer."],
  legendaria: ["Legendary", "Defines the build, and usually has a condition. 3 levels. Appears only with 3+ skills of its family. At most 1 per offer."],
};

const SKILL_EN = {
  o_gota: ["Acid Drop", "Each hit applies {v} rust.", "critical hits apply double", "you start each fight with 4 rust on the enemy"],
  o_conc: ["Concentrated Acid", "Rust deals +{p} damage.", "", "rust fades half as fast"],
  o_mordiente: ["Mordant", "Each point of rust removes {v} Defense from the enemy (max 30)."],
  o_salpica: ["Splash", "You start each fight by applying {v} rust."],
  o_lluvia: ["Acid Rain", "Every 3 turns, apply {v} rust.", "", "every 2 turns"],
  o_corr: ["Deep Corrosion", "Enemies with 8+ rust take +{p} damage from everything."],
  o_brecha: ["Chemical Breach", "Rust can crit with {p} of your crit chance (uses your crit damage)."],
  o_eterna: ["Eternal Verdigris", "Rust fades more slowly: Lv1 every 2 turns, Lv2 every 3, Lv3 every 4, Lv4 never."],
  o_plaga: ["Rust Plague", "Condition: 4+ Rust skills. If the enemy has 15+ rust, rust deals +{p} damage and stops fading."],
  v_chorro: ["Steam Jet", "Each hit has a {p} chance to scald (3 turns).", "scald lasts 4 turns", "critical hits always scald"],
  v_valvula: ["Relief Valve", "Every 4 turns, deal {p} of your attack as steam and scald.", "", "every 3 turns"],
  v_niebla: ["Fog Curtain", "+{p} Evasion."],
  v_hervor: ["Boiling Point", "Scalded enemies have -{p} Accuracy."],
  v_presion: ["Overpressure", "Scalded enemies take +{p} damage from everything."],
  v_caldera: ["Red-Hot Boiler", "Scald deals +{p} damage."],
  v_geiser: ["Geyser", "Every 5 turns a geyser deals {p} of your attack and ignores Defense."],
  v_reserva: ["Reserve Boiler", "Once per fight, when you fall you restart with {p} HP."],
  v_corazon: ["Boiler Heart", "Condition: 4+ Steam skills. Scald never goes out, and deals +{p} damage for each turn the enemy has been scalded (max 20)."],
  t_chispazo: ["Spark", "Each hit has a {p} chance to fire a discharge (100% of attack).", "discharges hit at 120%", "your first hit each fight always discharges"],
  t_corto: ["Short Circuit", "Each discharge has a {p} chance to stun for 1 turn."],
  t_estatica: ["Static Charge", "Discharges can crit with a {p} chance (they use your crit damage)."],
  t_pararrayos: ["Lightning Rod", "Whenever you dodge, fire a discharge for {p} of your attack."],
  t_bobina: ["Tesla Coil", "Every 5 turns, fire 3 discharges of {p} attack.", "", "4 discharges"],
  t_cond: ["Capacitor", "Each discharge grants +{p} attack for this fight (max 20 stacks)."],
  t_sobrecarga: ["Overload", "Discharges deal +{p} damage."],
  t_arco: ["Chain Arc", "Each discharge has a {p} chance to repeat."],
  t_tormenta: ["Bottled Storm", "Condition: after 8 discharges in a fight, each hit also fires a discharge of {p} attack."],
  r_blindaje: ["Extra Plating", "+{p} max HP (on top of the base).", "", "+3 Defense"],
  r_plancha: ["Riveted Plate", "You start each fight with a shield equal to {p} of your max HP.", "", "the first time you drop under 50% HP, the shield recharges"],
  r_puntas: ["Spiked Rivets", "You return {p} of the damage you take (before Defense).", "", "the returned damage ignores enemy Defense"],
  r_coraza: ["Brass Cuirass", "+{v} Defense."],
  r_doble: ["Double Riveting", "You take {p} less damage."],
  r_ariete: ["Battering Ram", "Every 4 turns you ram for {v}× your Defense + 60% of attack."],
  r_remachadora: ["Riveter", "Your hits add {v}× your Defense as Rivet damage."],
  r_mamparo: ["Armored Bulkhead", "Every 3 turns you gain a shield of {p} of your max HP, and your hits add 10% of your shield."],
  r_fortaleza: ["Walking Fortress", "Condition: 20+ Defense. You return {p} of the damage stopped by your Defense and your shield."],
  e_monoculo: ["Precision Monocle", "+{p} crit chance.", "", "+25% crit damage"],
  e_martillo: ["Pile Hammer", "+{p} crit damage.", "critical hits ignore enemy Defense"],
  e_puntero: ["Brass Laser Pointer", "+{p} Accuracy."],
  e_afilado: ["Sharpened Teeth", "Your hits deal +{p} damage."],
  e_doble: ["Twin Gear", "{p} chance to hit twice.", "", "the second hit deals +25%"],
  e_marcha: ["High Gear", "+{p} attack per combat turn (max 15 turns)."],
  e_calibre: ["Fine Caliber", "Accuracy above the enemy's Evasion adds {p} of that gap as crit chance."],
  e_cizalla: ["Shears", "Your hits deal +{p} damage to enemies below 30% HP."],
  e_mecanismo: ["Perfect Mechanism", "Condition: 40%+ crit chance. Your crits hit again at 50% and gain +{p} crit damage."],
  c_cuerda: ["Extra Wind", "You gain {v} tempo per turn. At 100, you take an extra action.", "you start each fight with 30 tempo", "extra actions deal +50%"],
  c_freno: ["Escapement Brake", "{p} chance the enemy loses its turn."],
  c_minutero: ["Minute Hand", "Extra actions never miss and deal +{p} damage."],
  c_campanada: ["Chime", "Each extra action rings for {p} of attack, ignoring Defense."],
  c_pendulo: ["Pendulum", "Every third hit deals +{p} damage."],
  c_volante: ["Flywheel", "Each extra action grants +{p} attack for this fight (max 10)."],
  c_retroceso: ["Recoil", "Whenever the enemy loses a turn, you gain {v} tempo."],
  c_parada: ["Stop Time", "Once per fight, when you drop under 30% HP, the enemy loses {v} turn(s)."],
  c_bucle: ["Time Loop", "Condition: 4+ Clockwork skills. Every 6 turns you take 3 extra actions at +{p} damage."],
  a_tonico: ["Brass Tonic", "You regenerate {p} of your max HP each turn.", "", "double that under 30% HP"],
  a_frasco: ["Emergency Flask", "Once per fight, when you drop under 40% HP, heal {p} of your max HP.", "twice per fight"],
  a_destilado: ["Mending Distillate", "After each fight, heal an extra {p} of your max HP."],
  a_vial: ["Corrosive Vial", "Every 3 turns you throw a vial: {p} of attack, ignoring Defense."],
  a_mercurio: ["Mercury Flask", "Every 4 turns you throw a flask for {p} of attack and heal 15% of that damage."],
  a_catalizador: ["Catalyst", "Your vials, flasks, and damage over time (rust, scald) deal +{p}."],
  a_volatil: ["Volatile Mix", "All your damage is +{p} against enemies above 70% HP."],
  a_piedra: ["Philosopher's Stone", "Healing is +{p} stronger, and any overflow becomes shield."],
  a_aurea: ["Golden Transmutation", "Condition: 4+ Alchemy skills. Each heal also deals damage equal to {p} of the HP actually restored."],
  m_iman: ["Horseshoe Magnet", "Each hit adds a magnetic charge (max 20). Each charge removes {p} of the enemy's attack (cap 30%).", "", "the cap rises to 40%"],
  m_polar: ["Reverse Polarity", "{p} chance to deflect the enemy attack (their Accuracy does not matter)."],
  m_limaduras: ["Filings", "Each magnetic charge removes {v} Defense from the enemy."],
  m_brujula: ["Mad Compass", "You start each fight with {v} magnetic charges on the enemy."],
  m_atrac: ["Attraction", "The enemy takes +{p} damage per magnetic charge."],
  m_pulso: ["Magnetic Pulse", "Every 4 turns a pulse deals {p} of attack, plus 4% per magnetic charge."],
  m_campo: ["Magnetic Field", "Each turn the enemy takes {p} of attack for every 5 charges."],
  m_polo: ["North Pole", "Enemies start with -{p} attack, and the magnetic reduction cap rises by 10%."],
  m_singular: ["Singularity", "Condition: at 20 charges they collapse for {p} of attack per charge (ignores Defense), then drop back to 10."],
  s_diapason: ["Tuning Fork", "Each hit adds {v} resonance. At 10 it detonates for 180% of attack (ignores Defense).", "detonations stun for 1 turn", "detonations deal +50% damage"],
  s_onda: ["Shockwave", "Every 3 turns, add {v} resonance (at 10, it detonates)."],
  s_coro: ["Pipe Choir", "Each turn you add {v} resonance."],
  s_vibrato: ["Vibrato", "Each detonation grants +{p} Evasion for this fight (max 5 times)."],
  s_campana: ["Bronze Bell", "Detonations deal +{p} damage."],
  s_eco: ["Echo", "After a detonation you keep {v} resonance."],
  s_grieta: ["Breaking Frequency", "Each detonation removes {v} Defense from the enemy for the rest of the fight."],
  s_armonico: ["Perfect Harmonic", "Detonation needs {v} less resonance."],
  s_nota: ["Impossible Note", "Condition: after 4 detonations in a fight, detonations deal +{p} damage and stun for 1 turn."],
  u_ayudante: ["Clockwork Helper", "An automaton hits each turn for {p} of your attack.", "it can crit with your crit chance", "a second helper joins at half strength"],
  u_escudero: ["Squire Automaton", "A squire automaton takes {p} of the damage dealt to you."],
  u_tornillos: ["Precision Screws", "Your automata have +{p} crit chance (they use your crit damage)."],
  u_resortes: ["Springs", "Whenever you dodge, your automata hit again at {p}."],
  u_linea: ["Assembly Line", "Every 4 turns you build a mini automaton (max 3) that hits each turn for {p} of your attack."],
  u_mant: ["Maintenance", "Your automata deal +{p} damage."],
  u_bateria: ["Shared Battery", "Every 5 turns, each active automaton discharges {p} of attack."],
  u_coloso: ["Steam Colossus", "Every 6 turns a colossus stomps for {p} of attack and stuns for 1 turn."],
  u_ejercito: ["Tin Army", "Condition: with 3 mini automata, they assemble into a Grand Automaton that hits each turn for {p} of attack and ignores Defense."],
  y_lima: ["Rusty File", "Critical hits apply {v} rust."],
  y_corrosivo: ["Corrosive Steam", "Scald deals +{p} per point of rust (max 20)."],
  y_acido: ["Alchemical Acid", "You heal for {p} of rust damage."],
  y_tierra: ["Ground Wire", "When you are hit, {p} chance to answer with a discharge (80% of attack)."],
  y_electro: ["Electromagnet", "Each discharge adds 1 magnetic charge and deals +{p} per charge."],
  y_bobres: ["Resonant Coil", "Each discharge adds {v} resonance."],
  y_silbato: ["Steam Whistle", "Each turn of scald adds {v} resonance."],
  y_dilatado: ["Expanded Metal", "Scalded enemies hit {p} less hard."],
  y_muelle: ["Recoil Spring", "When you are hit, {p} chance to counter with your full attack."],
  y_golem: ["Scrap Golem", "While you have automata, you gain a shield of {p} of your max HP each turn."],
  y_dinamo: ["Recharge Dynamo", "You heal for {p} of the damage from your hits."],
  y_ancora: ["Anchor Escapement", "Extra actions always crit and gain +{p} crit damage."],
  y_sincro: ["Synced Clocks", "On each extra action, your automata strike again at {p}."],
  y_vibra: ["Vibrating Magnet", "Each detonation adds 3 magnetic charges and deals +{p} per charge."],
  y_alqauto: ["Alchemist Automaton", "Your automata heal you for {p} of the damage they deal."],
  y_galvano: ["Galvanized", "Each discharge applies {v} rust."],
  y_turbina: ["Steam Turbine", "Your automata deal +{p} damage to scalded enemies."],
  y_pendmag: ["Magnetic Pendulum", "Each extra action adds 2 magnetic charges and deals +{p} per charge."],
  y_campanario: ["Armored Belfry", "Each detonation grants a shield of {v}× your Defense, plus 3."],
  y_chispaprec: ["Precision Spark", "Your critical hits fire a discharge of {p} attack."],
};

const STAT_EN = {
  atk: ["Sharpen", "+1 attack"],
  def: ["Reinforce", "+3 Defense"],
  hp: ["Padded Lining", "+12 max HP"],
  crit: ["Precision Lens", "+4% crit chance"],
  critDmg: ["Heavy Hammer", "+20% crit damage"],
  eva: ["Light Cloak", "+3% Evasion"],
  acc: ["Magnifying Lens", "+5% Accuracy"],
};

const CARD_EN = {
  galletas: ["Biscuit Tin", "+10 max HP, and heal 10."],
  tuercas: ["Tighten the Nuts", "+1 attack."],
  bolsa: ["Bag of Nuts", "+20 nuts."],
};

const BLESS_EN = {
  b_diente: ["Sharp Tooth", "+10% attack"],
  b_fortuna: ["Wheel of Fortune", "+6% crit chance"],
  b_maestro: ["Master Gear", "+1 level to 2 random skills"],
  b_aliento: ["Warm Breath", "Regenerate 1% HP per turn"],
  b_bano: ["Steam Bath", "+8% healing after each fight"],
  b_niebla: ["Protective Fog", "+6% Evasion"],
  b_chispa: ["Opening Spark", "Each fight starts with a discharge at 150% of attack"],
  b_estatica: ["Static Charge", "+8% to all your damage"],
  b_rayo: ["Blessed Bolt", "+1 reroll and +1 banish"],
  b_piel: ["Rusted Hide", "-6% damage taken"],
  b_herencia: ["Corrosive Legacy", "+25% rust and scald damage"],
  b_chatarra: ["Scrap Offering", "+50 nuts"],
  b_gracia: ["Second of Grace", "The first enemy attack of each fight misses"],
  b_prestado: ["Borrowed Time", "+20 max HP"],
  b_cuerda: ["Eternal Wind", "+8 tempo per turn (toward extra actions)"],
};

const CURSE_EN = {
  k_grieta: ["Crack in the Suit", "-15 max HP"],
  k_suelto: ["Loose Cog", "Enemies hit 8% harder"],
  k_hollin: ["Soot in the Eyes", "-4% crit chance"],
  k_valvula: ["Stuck Valve", "-5% healing after fights"],
  k_juntas: ["Rust in the Joints", "+8% damage taken"],
  k_deuda: ["Nut Debt", "You earn half as many nuts"],
};

const PATRON_EN = {
  engranaje: "The Great Gear",
  vapor: "The Steam Lady",
  chispa: "The Eternal Spark",
  herrumbre: "Mother Rust",
  relojero: "The Sleeping Clockmaker",
};

const TRAIT_EN = {
  rapido: "Hits twice, but softer",
  esquiva: "Evasive: +15% Evasion (Accuracy counters it)",
  blindado: "Armored: +25 Defense (rust, scald, and armor-piercing damage get through)",
  regenera: "Regenerates 2% HP per turn",
  espinas: "Returns 8% of your hit damage",
  pesado: "A periodic heavy hit",
  certero: "Sharpshooter: +15% Accuracy (your Evasion does less)",
};

const ENEMY_EN = {
  "Tetera rabiosa": "Raging Kettle",
  "Ratón de cuerda": "Clockwork Mouse",
  "Paraguas murciélago": "Bat Umbrella",
  "Tuerca saltarina": "Hopping Nut",
  "Grillo de latón": "Brass Cricket",
  "Polilla de gas": "Gas Moth",
  "Farola andante": "Walking Lamp",
  "Cangrejo de cobre": "Copper Crab",
  "Gorrión de hojalata": "Tin Sparrow",
  "Autómata camarero": "Waiter Automaton",
  "Cuco con mala uva": "Mean Cuckoo",
  "Pez globo dirigible": "Blimp Puffer",
  "Armadillo de calderería": "Boiler Armadillo",
  "Duelista de latón": "Brass Duelist",
  "El Capataz de Hierro": "The Iron Foreman",
  "Caldera Mayor": "The Great Boiler",
};

function pct(x, digits = 0) {
  return (x * 100).toFixed(digits).replace(/\.0$/, "") + "%";
}

const GEAR_EN = {
  lima: ["Grimy File", `You start with Acid Drop. +${pct(C.BAL.gearBonus)} rust damage.`],
  tetera: ["Patched Teapot", `You start with Steam Jet. +${pct(C.BAL.gearVapor)} steam damage.`],
  bobina: ["Homemade Coil", `You start with Spark. +${pct(C.BAL.gearBonus)} discharge damage.`],
  tapa: ["Pot Lid", `You start with Brass Cuirass. +${C.BAL.gearDef} Defense and +${pct(C.BAL.gearBonus)} Rivet damage.`],
  llave: ["Old Wrench", `You start with Precision Monocle. +${pct(C.BAL.gearCrit)} crit chance and +${pct(C.BAL.gearHitBonus)} hit damage.`],
  relojp: ["Stopped Pocket Watch", `You start with Extra Wind. +${C.BAL.gearTempo} tempo per turn and +${pct(C.BAL.gearBonus)} extra-action damage.`],
  frasco: ["Cracked Flask", `You start with Corrosive Vial. +${pct(C.BAL.gearBonus)} alchemy damage.`],
  herradura: ["Magnetized Horseshoe", `You start with Horseshoe Magnet. All damage +${pct(C.BAL.gearMag, 1)} per magnetic charge, and +${pct(C.BAL.gearBonus)} magnetic damage.`],
  diapason: ["Dented Tuning Fork", `You start with Tuning Fork. +${pct(C.BAL.gearBonus)} detonation damage.`],
  juguete: ["Clockwork Toy", `You start with Clockwork Helper. +${pct(C.BAL.gearBonus)} automaton damage.`],
};

const CAT_EN = {
  dilema: "Dilemma",
  bendicion: "Blessing",
  maldicion: "Curse with a prize",
  mercader: "Merchant",
  azar: "Chance",
  rescate: "Rescue",
  tesoro: "Treasure",
  taller: "Workshop",
  encuentro: "Encounter",
};

const ch = (label, detail) => ({ label, detail });
const EVENT_EN = {
  estatua: ["Statue of Two Faces", "A brass statue with two faces blocks the path. It only lets through someone who chooses.", {
    leon: ch("Lion's face", "+3 attack. Lose 15% of your current HP."),
    buho: ch("Owl's face", "+1 level to a random skill. -10 max HP."),
  }],
  puertas: ["Two Boiler Doors", "One door burns red-hot. The other drips cool steam.", {
    roja: ch("Red door", "Pick 1 of 3 rare or epic skills. Lose 20% of your current HP."),
    azul: ch("Blue door", "Heal 30% of your max HP."),
  }],
  balanza: ["The Mechanical Judge's Scales", "A tin judge demands you put something on the scale.", {
    fuerza: ch("Put your strength on it", "-2 attack. +25 max HP."),
    vida: ch("Put your life on it", "-20 max HP. +3 attack."),
  }],
  arena: ["Giant Hourglass", "The sand is copper filings. It falls very slowly.", {
    vuelta: ch("Flip it", "+1 reroll and +1 banish."),
    romper: ch("Smash it", "+30 nuts."),
  }],
  espejo: ["Brass Mirror", "Your reflection is wearing much better kit than you are.", {
    mirar: ch("Copy the reflection", "+1 level to your highest-level skill."),
    girar: ch("Turn your back", "Heal 20% of your max HP."),
  }],
  golem: ["Sleeping Golem", "A scrap golem snores on a heap of parts.", {
    despertar: ch("Wake it", "An elite fight, with an elite reward."),
    robar: ch("Steal a part", "70%: +25 nuts. 30%: it wakes up (elite fight)."),
  }],
  vias: ["Track Crossing", "Two tram tracks. One runs to a workshop, the other to the market.", {
    taller: ch("Workshop track", "Pick 1 of 3 skills."),
    mercado: ch("Market track", "+30 nuts."),
  }],
  caldera: ["Unstable Boiler", "The pressure needle is trembling in the red.", {
    apretar: ch("Tighten the valve", "60%: +3 attack. 40%: lose 25% of your current HP."),
  }],
  planos: ["Library of Blueprints", "Shelves of rolled plans, sorted by family.", {
    estudiar: ch("Study your own trade", "Pick 1 of 3 skills from your tool's family."),
    llevar: ch("Grab one at random", "+1 level to a random skill."),
  }],
  farol: ["The Talking Lamp", "A gas lamp offers you its flame, for a price.", {
    llama: ch("Take the flame", "+12% attack. -15 max HP."),
    aceite: ch("Give it oil (20 nuts)", "Heal 40% of your max HP."),
  }],
  s_engranaje: ["Shrine of the Great Gear", "A toothed wheel the size of a house turns without a sound.", {}],
  s_vapor: ["Shrine of the Steam Lady", "A warm figure of steam wraps around you and whispers.", {}],
  s_chispa: ["Shrine of the Eternal Spark", "A blue spark dances between two copper posts.", {}],
  s_herrumbre: ["Shrine of Mother Rust", "A rust-crusted altar smells of rain and iron.", {}],
  s_relojero: ["Shrine of the Sleeping Clockmaker", "A bronze elder sleeps beside a thousand stopped clocks.", {}],
  concilio: ["Council of the Engines", "The five Patron Engines watch you at once. They offer a deal.", {
    trato: ch("Take the deal", "Sharp Tooth (+10% attack) and a ward for -6% damage taken, but the curse Loose Cog."),
    una: ch("Ask for just one", "Wheel of Fortune (+6% crit chance)."),
  }],
  cofre_maldito: ["Cursed Chest", "The padlock is shaped like a gear-skull.", {
    abrir: ch("Open it", "Pick 1 of 3 epics. Curse: Loose Cog (enemies +8% attack)."),
  }],
  contrato: ["Smoke Contract", "A faceless man offers a contract written in soot.", {
    firmar: ch("Sign it", "+60 nuts. Curse: Rust in the Joints (+8% damage taken)."),
    romper: ch("Tear it up", "+1 reroll."),
  }],
  mascara: ["Enchanted Gas Mask", "You see better through it. You breathe worse.", {
    poner: ch("Put it on", "+10% crit chance. Curse: Stuck Valve (-5% healing after fights)."),
    vender: ch("Sell it", "+25 nuts."),
  }],
  motor: ["Forbidden Engine", "A chained, sealed engine hums with force.", {
    conectar: ch("Plug yourself in", "+1 level to 2 skills. Curse: Crack in the Suit (-15 max HP)."),
    desconectar: ch("Unplug it", "+10 max HP."),
  }],
  cuervo: ["Tin Crow", "A mechanical crow offers a pact in a gramophone voice.", {
    pacto: ch("Take the pact", "+10% to all your damage. Curse: Soot in the Eyes (-4% crit chance)."),
    espantar: ch("Shoo it off", "+10 nuts."),
  }],
  aceite: ["Black Oil", "A barrel of thick oil shines with purple highlights.", {
    beber: ch("Drink it", "+4 attack. Curse: Nut Debt (you earn half as many nuts)."),
    combustible: ch("Burn it as fuel", "+1 reroll."),
  }],
  chatarrero: ["Traveling Scrapper", "An old otter with a handcart sells remedies and screws.", {
    tonico: ch("Tonic (30 nuts)", "Heal 40% of your max HP."),
    pinon: ch("Sharp pinion (40 nuts)", "+2 attack."),
  }],
  relojero: ["Traveling Clockmaker", "He opens a case full of tiny springs.", {
    ajuste: ch("Fine adjustment (50 nuts)", "+1 level to 2 random skills."),
    cuerda: ch("Spare wind (25 nuts)", "+1 reroll and +1 banish."),
  }],
  boticaria: ["Canal Apothecary", "Colored flasks clink in her boat.", {
    elixir: ch("Life elixir (35 nuts)", "+20 max HP."),
    pomada: ch("Salve (15 nuts)", "Heal 25% of your max HP."),
  }],
  subasta: ["Blueprint Auction", "An auctioneer with a monocle bangs the gavel.", {
    pujar: ch("Bid (60 nuts)", "Pick 1 of 3 epics."),
    vender: ch("Sell one of your plans", "-1 level to a random skill. +45 nuts."),
  }],
  negro: ["Black Market", "Down among the pipes, someone sells things that should not exist.", {
    limpiar: ch("Remove a curse (40 nuts)", "You shake off a random curse."),
    amuleto: ch("Lucky charm (45 nuts)", "+8% crit chance."),
  }],
  herrero: ["Traveling Smith", "A tortoise in a leather apron stokes a portable forge.", {}],
  sastre: ["Brass Tailor", "A mouse with a tape measure sizes you up without asking.", {}],
  optico: ["Fairground Optician", "Lenses of every size hang from an open umbrella.", {}],
  feria: ["Inventors' Fair", "Stalls of bright scrap, and vendors shouting prices.", {}],
  sparring: ["Training Automaton", "A spring-loaded dummy offers to train with you. It hits for real.", {
    ataque: ch("Train your attack", "+1 attack. Lose 15% of your current HP."),
    guardia: ch("Train your guard", "+3 Defense. Lose 12% of your current HP."),
  }],
  manual: ["Forgotten Manuals", "Two brass-bound manuals stick out of a trash bin.", {
    esgrima: ch("Fencing manual", "+5% Accuracy."),
    baile: ch("Dance manual", "+3% Evasion."),
  }],
  pesas: ["Boiler Weights", "Someone left a set of weights made from old boilers.", {
    levantar: ch("Lift them", "60%: +2 attack. 40%: lose 20% of your current HP."),
  }],
  tragaperras: ["Steam Slot Machine", "Three reels: gears, lamps, and skulls.", {
    jugar: ch("Play (15 nuts)", "40%: +50 nuts. 60%: nothing."),
    patada: ch("Give it a kick", "50%: +15 nuts. 50%: lose 10% of your current HP."),
  }],
  rueda: ["Gear Wheel", "An abandoned fair. The wheel still spins if you push it.", {
    girar: ch("Spin it", "50%: +1 level to 2 skills. 50%: -1 level to one skill."),
  }],
  dados: ["Copper Dice", "A gambler in a top hat challenges you to a throw.", {
    vida: ch("Bet HP", "50%: +25 max HP. 50%: -15 max HP."),
    tuercas: ch("Bet nuts (20)", "50%: +3 attack. 50%: nothing."),
  }],
  manivela: ["Jack-in-the-Box", "A little tune plays. Something is moving inside.", {
    girar: ch("Turn the crank", "70%: pick 1 of 3 skills. 30%: an enemy pops out (a fight)."),
  }],
  carrera: ["Clockwork Mouse Race", "Six clockwork mice wait on the starting line.", {
    apostar: ch("Bet (25 nuts)", "35%: +80 nuts. 65%: nothing."),
    mirar: ch("Just watch", "Heal 10% of your max HP."),
  }],
  maquinista: ["Trapped Machinist", "A beam has fallen across a machinist.", {
    levantar: ch("Lift the beam", "Lose 15% of your current HP. They teach you a trick: +1 level to 2 skills."),
    ayuda: ch("Go get help", "+15 nuts as a reward."),
  }],
  aprendiz: ["Lost Apprentice", "A clockmaker's apprentice cannot find the way home.", {
    acompanar: ch("Walk them home", "Heal 20% and gain +1 reroll."),
    indicar: ch("Point the way", "+10 nuts."),
  }],
  averiado: ["Broken Automaton", "A small automaton keeps trying to stand up.", {
    reparar: ch("Repair it", "Pick 1 of 3 Automata skills."),
    desguazar: ch("Scrap it", "+30 nuts."),
  }],
  gato: ["Cat in the Chimney", "A cat yowls from the top of a chimney.", {
    subir: ch("Climb up for it", "50%: +8% crit chance (the cat brings luck). 50%: lose 10% of your current HP."),
  }],
  dirigible: ["Airship in Trouble", "Raiders are attacking a moored airship.", {
    ayudar: ch("Defend the airship", "An elite fight, an elite reward, and +30 nuts."),
  }],
  herramientas: ["Toolbox", "A forgotten box under a workshop bench.", {
    abrir: ch("Open it", "Pick 1 of 3 skills."),
    candado: ch("Sell the padlock", "+2 attack."),
  }],
  veta: ["Copper Vein", "A broken wall shows pure copper.", {
    picar: ch("Dig", "+40 nuts. Lose 10% of your current HP."),
    recoger: ch("Take the loose bits", "+15 nuts."),
  }],
  capitan: ["Captain's Chest", "An airship captain's chest, still shut.", {
    forzar: ch("Force it", "Pick 1 of 3 rare or epic skills."),
    entero: ch("Sell it whole", "+50 nuts."),
  }],
  plano_oro: ["Golden Blueprint", "A plan signed by the Great Engineer.", {
    estudiar: ch("Study it", "+1 level to every skill you have in your tool's family."),
    vender: ch("Sell it", "+80 nuts."),
  }],
  grifo: ["Lukewarm Tap", "A brass tap drips warm water in an alley.", {
    beber: ch("Drink", "Heal 30% of your max HP."),
    farol: ch("Refill the gas lamp", "+1 reroll."),
  }],
  yunque: ["The Smith's Anvil", "The anvil is still hot. A hammer is waiting.", {
    refundir: ch("Reforge", "Lose a random skill and gain 2 levels split across the others."),
    afilar: ch("Sharpen", "+2 attack."),
  }],
  alambique: ["Transmutation Alembic", "A liquid that keeps changing color is bubbling away.", {
    transmutar: ch("Transmute", "A random skill becomes a skill from another family, at the same level."),
    destilado: ch("Drink the distillate", "Heal 25% of your max HP."),
  }],
  altar: ["Altar of the Great Gear", "A giant toothed wheel asks for an offering.", {
    cuerda: ch("Wind it by hand", "Lose 20% of your current HP. +3 attack."),
    engrasar: ch("Grease it", "+10 max HP."),
  }],
  banco: ["Test Bench", "Clamps, cables, and one enormous red button.", {
    sobrecargar: ch("Overcharge", "+1 level to your best skill and to another at random. -15 max HP."),
    calibrar: ch("Calibrate", "+1 level to a random skill."),
  }],
  crisol: ["Melting Crucible", "Molten metal could join two pieces into a better one.", {
    fundir: ch("Melt two into one", "Lose your 2 lowest-level skills, then pick 1 of 3 epics."),
    calentar: ch("Warm yourself", "Heal 20% of your max HP."),
  }],
  emboscada: ["Alley Ambush", "Eyes gleam between the trash bins.", {
    pelear: ch("Fight", "A normal fight, its reward, and +20 nuts."),
    huir: ch("Run", "Lose 12% of your current HP."),
  }],
  duelo: ["Automaton Duel", "A champion of mechanical duels wants a rival.", {
    aceptar: ch("Accept", "An elite fight, with an elite reward."),
  }],
  eco: ["Echo in the Pipes", "Something repeats your footsteps inside the tubes.", {
    escuchar: ch("Listen", "+1 level to a random skill."),
    seguir: ch("Follow it", "Heal 15% of your max HP."),
  }],
};

function detectCond(ev) {
  if (!ev.cond) return "";
  const mk = (nSkills, curses) => {
    const skills = {};
    for (let i = 0; i < nSkills; i++) skills["s" + i] = 1;
    return { skills, curses };
  };
  const pattern = [0, 1, 2, 3, 4].map((n) => ev.cond(mk(n, []), 1));
  const withCurse = ev.cond(mk(0, ["x"]), 1);
  if (withCurse && pattern.every((x) => !x)) return "curses";
  if (!pattern[0] && !pattern[1] && pattern[2] && pattern[3] && pattern[4]) return "skills>=2";
  if (!pattern[0] && !pattern[1] && !pattern[2] && pattern[3] && pattern[4]) return "skills>=3";
  if (!pattern[0] && !pattern[1] && !pattern[2] && !pattern[3] && pattern[4]) return "skills>=4";
  throw new Error("unknown cond on " + ev.id + " " + JSON.stringify(pattern) + " curse=" + withCurse);
}

function cloneFx(fx) {
  return JSON.parse(JSON.stringify(fx));
}

function nadaChoice() {
  return { id: "nada", label: "Walk on", detail: "Nothing happens.", fx: {} };
}

function buyChoice(id) {
  const b = C.STAT_BUY[id];
  const en = STAT_EN[id];
  return {
    id: "buy_" + id,
    label: en[0],
    detail: en[1] + ". Each purchase of this stat costs +" + b.step + " more.",
    fx: { buy: id },
  };
}

const missing = [];
for (const s of C.SKILLS) if (!SKILL_EN[s.id]) missing.push("skill " + s.id);
for (const ev of C.EVENTS) if (!EVENT_EN[ev.id]) missing.push("event " + ev.id);
if (missing.length) {
  console.error(missing.join("\n"));
  process.exit(1);
}

const skills = C.SKILLS.map((s) => {
  const en = SKILL_EN[s.id];
  const o = {
    id: s.id,
    name: en[0],
    fam: s.fam,
    rarity: s.rarity,
    max: s.max,
    vals: s.vals,
    desc: en[1],
  };
  if (en[2]) o.m3 = en[2];
  if (en[3]) o.m5 = en[3];
  if (s.req) o.req = s.req;
  if (s.syn) o.syn = s.syn;
  return o;
});

const events = C.EVENTS.map((ev) => {
  const en = EVENT_EN[ev.id];
  const choices = ev.choices.map((c) => {
    if (c.fx && c.fx.buy) return buyChoice(c.fx.buy);
    if (c.id === "nada") return nadaChoice();
    let label = en[2][c.id];
    if (!label && C.BLESS[c.id]) {
      const b = BLESS_EN[c.id];
      label = ch(b[0], b[1] + ".");
    }
    if (!label) throw new Error("missing choice " + ev.id + ":" + c.id);
    const out = { id: c.id, label: label.label, detail: label.detail, fx: cloneFx(c.fx) };
    if (c.cost) out.cost = c.cost;
    return out;
  });
  const o = {
    id: ev.id,
    cat: ev.cat,
    rarity: ev.rarity,
    title: en[0],
    text: en[1],
    choices,
  };
  if (ev.shop) o.shop = true;
  if (ev.stat) o.stat = true;
  const cond = detectCond(ev);
  if (cond) o.cond = cond;
  return o;
});

const camp = {
  id: "campamento",
  cat: "dilema",
  rarity: "comun",
  title: "Camp",
  text: "A quiet coal stove. Rest, or tune a skill. Nuts are only spent at the merchant.",
  choices: [
    { id: "descansar", label: "Rest", detail: "Heal 40% of your max HP.", fx: { heal: 0.4 } },
    { id: "ajustar", label: "Tune the kit", detail: "+1 level to a random skill.", fx: { upgrade: 1 } },
  ],
};

// Nuts leave the purse only at the fixed merchant. Rewrite every other sink.
function replaceEvent(id, text, choices) {
  const ev = events.find((e) => e.id === id);
  if (!ev) throw new Error("missing event " + id);
  if (text) ev.text = text;
  ev.choices = choices;
  delete ev.shop;
  delete ev.stat;
}
replaceEvent("herrero", "The forge is banked. She lets you warm your hands. Nothing is for sale.", [
  { id: "mirar", label: "Warm your hands", detail: "Heal 15% of your max HP.", fx: { heal: 0.15 } },
  nadaChoice(),
]);
replaceEvent("sastre", "He has no cloth for sale. He does pin a spare ribbon on your coat.", [
  { id: "cinta", label: "Take the ribbon", detail: "+1 reroll.", fx: { rerolls: 1 } },
  nadaChoice(),
]);
replaceEvent("optico", "The lenses are only for show today. You may still borrow a look.", [
  { id: "mirar", label: "Borrow a look", detail: "Heal 10% of your max HP.", fx: { heal: 0.1 } },
  nadaChoice(),
]);
replaceEvent("feria", "The stalls are shouting, but nobody is selling to you. A vendor presses a few nuts into your hand to move you along.", [
  { id: "propina", label: "Take the tip", detail: "+15 nuts.", fx: { coins: 15 } },
  nadaChoice(),
]);
replaceEvent("chatarrero", "The otter's cart is shut. She points you toward the merchant and shares a sip of tonic.", [
  { id: "sorbo", label: "Take a sip", detail: "Heal 20% of your max HP.", fx: { heal: 0.2 } },
  nadaChoice(),
]);
replaceEvent("relojero", "His case stays closed. He still lets you sit a minute.", [
  { id: "escuchar", label: "Sit a minute", detail: "Heal 15% of your max HP.", fx: { heal: 0.15 } },
  nadaChoice(),
]);
replaceEvent("boticaria", "The flasks stay in the boat. The smell alone is a little soothing.", [
  { id: "oler", label: "Breathe it in", detail: "Heal 20% of your max HP.", fx: { heal: 0.2 } },
  nadaChoice(),
]);
replaceEvent("subasta", "The gavel is for other buyers. You can still sell one of your own plans.", [
  { id: "vender", label: "Sell one of your plans", detail: "-1 level to a random skill. +45 nuts.", fx: { downgrade: 1, coins: 45 } },
  nadaChoice(),
]);
replaceEvent("negro", "He will not take nuts. A favor, or nothing.", [
  { id: "favor", label: "Call in a favor", detail: "Lose 12% of your current HP. Lose a random curse, if you have one.", fx: { hurt: 0.12, uncurse: true } },
  nadaChoice(),
]);
replaceEvent("farol", "The lamp will trade words, not nuts.", [
  { id: "llama", label: "Take the flame", detail: "+12% attack. -15 max HP.", fx: { mods: { atkPct: 0.12 }, maxHp: -15 } },
  { id: "charla", label: "Just talk", detail: "Heal 15% of your max HP.", fx: { heal: 0.15 } },
]);
replaceEvent("tragaperras", "The slot takes no nuts from you. Kick it, or give the crank one free pull.", [
  { id: "jugar", label: "One free pull", detail: "40%: +25 nuts. 60%: nothing.", fx: { gamble: { p: 0.4, win: { coins: 25 }, lose: {} } } },
  { id: "patada", label: "Give it a kick", detail: "50%: +15 nuts. 50%: lose 10% of your current HP.", fx: { gamble: { p: 0.5, win: { coins: 15 }, lose: { hurt: 0.1 } } } },
]);
replaceEvent("dados", "The gambler will not take nuts. He will still throw for pride.", [
  { id: "vida", label: "Bet HP", detail: "50%: +25 max HP. 50%: -15 max HP.", fx: { gamble: { p: 0.5, win: { maxHp: 25 }, lose: { maxHp: -15 } } } },
  { id: "orgullo", label: "Bet pride", detail: "50%: +1 reroll. 50%: nothing.", fx: { gamble: { p: 0.5, win: { rerolls: 1 }, lose: {} } } },
]);
replaceEvent("carrera", "No bookie. Cheer a mouse, or just watch.", [
  { id: "animar", label: "Cheer a mouse", detail: "35%: +30 nuts. 65%: nothing.", fx: { gamble: { p: 0.35, win: { coins: 30 }, lose: {} } } },
  { id: "mirar", label: "Just watch", detail: "Heal 10% of your max HP.", fx: { heal: 0.1 } },
]);

function assertNoSpend(fx, path) {
  if (!fx) return;
  if (fx.buy) throw new Error("stat purchase left at " + path);
  if (typeof fx.coins === "number" && fx.coins < 0) throw new Error("nut spend left at " + path);
  if (fx.gamble) {
    assertNoSpend(fx.gamble.win, path + ".win");
    assertNoSpend(fx.gamble.lose, path + ".lose");
  }
  if (fx.bless) {
    /* blessing fx is stored separately and has no spends */
  }
}
for (const ev of events) {
  for (const c of ev.choices) {
    if (c.cost) throw new Error("cost left on " + ev.id + ":" + c.id);
    assertNoSpend(c.fx, ev.id + ":" + c.id);
  }
}
for (const c of camp.choices) assertNoSpend(c.fx, "camp:" + c.id);

const chapter = C.CHAPTER_TEMPLATE.slice();
if (chapter[9] !== "evento" || chapter[22] !== "evento") {
  throw new Error("merchant slots moved: " + chapter[9] + " " + chapter[22]);
}
chapter[9] = "mercader";
chapter[22] = "mercader";

const merchant = {
  title: "Wandering merchant",
  intro: "Nuts are spent only here. Buy up to 3 stat upgrades, and one skill. Pay to refresh the stock, or leave the nuts for the next stall.",
  maxStatBuys: 3,
  maxRefreshes: 2,
  statSlots: 3,
  skillSlots: 3,
  repeatStep: 8,
  tiers: [
    {
      id: "early",
      name: "Early stock",
      untilStep: 16,
      blurb: "Small upgrades. Common and rare skills.",
      refresh: 16,
      skillMode: "normal",
      skillPrice: { comun: 28, rara: 46, epica: 78, legendaria: 120 },
      stats: {
        atk: { price: 26, text: "+1 attack", fx: { atk: 1 } },
        def: { price: 24, text: "+3 Defense", fx: { def: 3 } },
        hp: { price: 24, text: "+12 max HP", fx: { maxHp: 12, heal: 0.05 } },
        crit: { price: 34, text: "+4% crit chance", fx: { crit: 0.04 } },
        critDmg: { price: 34, text: "+15% crit damage", fx: { critDmg: 0.15 } },
        eva: { price: 32, text: "+3% Evasion", fx: { eva: 0.03 } },
        acc: { price: 28, text: "+5% Accuracy", fx: { acc: 0.05 } },
      },
    },
    {
      id: "late",
      name: "Late stock",
      untilStep: 99,
      blurb: "Larger upgrades. Rare, epic, and legendary skills.",
      refresh: 30,
      skillMode: "rising",
      skillPrice: { comun: 40, rara: 62, epica: 98, legendaria: 150 },
      stats: {
        atk: { price: 54, text: "+2 attack", fx: { atk: 2 } },
        def: { price: 50, text: "+4 Defense", fx: { def: 4 } },
        hp: { price: 48, text: "+18 max HP", fx: { maxHp: 18, heal: 0.06 } },
        crit: { price: 62, text: "+6% crit chance", fx: { crit: 0.06 } },
        critDmg: { price: 62, text: "+25% crit damage", fx: { critDmg: 0.25 } },
        eva: { price: 58, text: "+4% Evasion", fx: { eva: 0.04 } },
        acc: { price: 52, text: "+6% Accuracy", fx: { acc: 0.06 } },
      },
    },
  ],
};

function enemy(e) {
  const name = ENEMY_EN[e.name];
  if (!name) throw new Error("enemy " + e.name);
  const o = { name, trait: e.trait || "" };
  if (e.heavy) o.heavy = e.heavy;
  return o;
}

const bal = JSON.parse(JSON.stringify(C.BAL));

const game = {
  balance: bal,
  rarities: C.RARITY_ORDER.map((id) => {
    const r = C.RARITY[id];
    return { id, name: RARITY_EN[id][0], color: r.color, weight: r.weight, maxLv: r.maxLv, minFam: r.minFam, perOffer: r.perOffer, rule: RARITY_EN[id][1] };
  }),
  families: C.FAMS.map((f) => ({ id: f.id, name: FAM_EN[f.id][0], color: f.color, idea: FAM_EN[f.id][1] })),
  skills,
  gears: C.GEARS.map((g) => ({ id: g.id, name: GEAR_EN[g.id][0], fam: g.fam, start: g.start, desc: GEAR_EN[g.id][1] })),
  enemies: C.ENEMIES.map(enemy),
  elites: C.ELITES.map(enemy),
  mini: enemy(C.MINIBOSS),
  boss: enemy(C.BOSS),
  traits: TRAIT_EN,
  statBuy: Object.fromEntries(Object.entries(C.STAT_BUY).map(([id, b]) => [id, {
    name: STAT_EN[id][0], text: STAT_EN[id][1], fx: cloneFx(b.fx), base: b.base, step: b.step,
  }])),
  statCards: C.STAT_CARDS.map((c) => ({ id: c.id, name: CARD_EN[c.id][0], text: CARD_EN[c.id][1] })),
  patrons: C.PATRONS.map((p) => ({ id: p.id, name: PATRON_EN[p.id] })),
  blessings: Object.fromEntries(Object.entries(C.BLESS).map(([id, b]) => [id, {
    name: BLESS_EN[id][0], text: BLESS_EN[id][1], patron: b.patron, fx: cloneFx(b.fx),
  }])),
  curses: Object.fromEntries(Object.entries(C.CURSES).map(([id, c]) => [id, {
    name: CURSE_EN[id][0], text: CURSE_EN[id][1], mods: cloneFx(c.mods), hp: c.hp || 0,
  }])),
  categories: CAT_EN,
  events,
  camp,
  chapter,
  merchant,
  rewards: { normal: ["normal"], elite: ["elite"], mini: ["epica", "elite"], boss: [] },
  sources: {
    ataque: "Hits", reloj: "Extra actions", oxido: "Rust", vapor: "Steam", tesla: "Tesla",
    remache: "Rivet", alquimia: "Alchemy", iman: "Magnetism", reso: "Resonance", auto: "Automata",
  },
  statInfo: [
    { id: "maxHp", name: "HP", tip: "Maximum HP." },
    { id: "atk", name: "Attack", tip: "The base of almost all your damage." },
    { id: "def", name: "Defense", tip: "Cuts direct damage: damage × 60 / (60 + Defense)." },
    { id: "crit", name: "Crit chance", tip: "Chance of a critical hit." },
    { id: "critDmg", name: "Crit damage", tip: "Multiplier on critical hits." },
    { id: "eva", name: "Evasion", tip: "Subtracts from the enemy's hit chance (base 95%)." },
    { id: "acc", name: "Accuracy", tip: "Adds to your hit chance (base 95%) and counters enemy Evasion." },
  ],
};

const out = new URL("../data/game.json", import.meta.url);
writeFileSync(out, JSON.stringify(game));
console.log("wrote", out.pathname, "skills", skills.length, "events", events.length, "bytes", JSON.stringify(game).length);
console.log("this rebuilds the v3 reference. Shipping families live in data/game.json; do not overwrite them with this output.");
