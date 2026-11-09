#!/usr/bin/env python3
"""Fold the v3 10 skill families into the 7 shipping families.

Safe to run twice: a game.json that already has Vitriol is left alone.
`tools/build_content.mjs` writes the v3 families, then calls this.
"""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data" / "game.json"

FAM = {
    "oxido": "vitriol",
    "alquimia": "vitriol",
    "tesla": "galvanism",
    "iman": "galvanism",
    "engranaje": "escapement",
    "reloj": "escapement",
}

# Intra-family bridges become ordinary skills of the merged family.
ABSORB = {
    "y_electro": "galvanism",
    "y_ancora": "escapement",
}

# Primary family for synergies that used to sit on a parent we merged,
# filed onto the unchanged partner so the merged rosters stay at one shape.
REFILE = {
    "y_dilatado": "vapor",
    "y_vibra": "reso",
}

DROP = {
    # Vitriol: redundant rust amp, flask overlap, post-fight heal, generic amp,
    # the second legendary, the intra-family heal, and the crit-on-rust rare
    # (Rusty File keeps the crit bridge).
    "o_conc", "a_frasco", "a_destilado", "a_volatil", "a_aurea", "y_acido", "o_brecha",
    # Galvanism: overlapping commons/rares and the second legendary.
    "t_estatica", "t_cond", "m_limaduras", "m_polar", "m_campo", "m_singular", "m_pulso",
    # Escapement: overlapping hit/tempo pieces and the second legendary.
    "e_martillo", "e_marcha", "c_minutero", "c_campanada", "c_retroceso", "c_bucle", "c_volante",
    # Epic bridges that would give a merged family a third epic.
    "y_galvano", "y_pendmag", "y_chispaprec",
}

# Most of the old wrench hit bonus lives on Sharpened Teeth, so a hit build
# still functions on another tool. The pocket gear keeps a small topping.
VALS = {
    "e_afilado": [0.7, 0.95, 1.3, 1.55, 1.85, 2.05],
    "e_doble": [0.18, 0.23, 0.28, 0.33, 0.38, 0.43],
    "c_cuerda": [22, 26, 30, 34, 38, 42],
    "o_gota": [0.8, 1.0, 1.2, 1.4, 1.6, 1.75],
    "a_vial": [0.7, 0.85, 1.0, 1.15, 1.3, 1.45],
    "a_catalizador": [0.06, 0.1, 0.14, 0.18, 0.22, 0.26],
    "o_plaga": [0.3, 0.5, 0.75],
    "t_chispazo": [0.27, 0.32, 0.37, 0.42, 0.47, 0.52],
    "t_tormenta": [0.5, 0.75, 1.0],
    "t_bobina": [0.38, 0.46, 0.54, 0.62, 0.7, 0.78],
}

FAMILIES = [
    {"id": "vitriol", "name": "Vitriol", "color": "#b5c94e",
     "idea": "Corrosion, poisoned vials, and a little healing"},
    {"id": "vapor", "name": "Steam", "color": "#c9d6dc",
     "idea": "Scalds, geysers, and fog (Evasion)"},
    {"id": "galvanism", "name": "Galvanism", "color": "#4fd1c5",
     "idea": "Discharges and magnetic charges that weaken the enemy"},
    {"id": "remache", "name": "Rivet", "color": "#9aa3b8",
     "idea": "Defense, shields, and damage that scales with Defense"},
    {"id": "escapement", "name": "Escapement", "color": "#e0b24a",
     "idea": "Critical hits, accuracy, and tempo for extra actions"},
    {"id": "reso", "name": "Resonance", "color": "#b48cff",
     "idea": "Vibration that builds, then detonates"},
    {"id": "auto", "name": "Automata", "color": "#6fa8dc",
     "idea": "Wind-up helpers that fight beside you"},
]

GEAR_KEEP = {"lima", "tetera", "bobina", "tapa", "llave", "diapason", "juguete"}
GEAR_ORDER = ["lima", "tetera", "bobina", "tapa", "llave", "diapason", "juguete"]
GEAR_PATCH = {
    "lima": {
        "fam": "vitriol",
        "desc": "You start with Acid Drop. +10% rust and vial damage.",
    },
    "bobina": {
        "fam": "galvanism",
        "desc": "You start with Spark. +6% discharge and charge damage, and all damage +0.4% per magnetic charge.",
    },
    "llave": {
        "name": "Pocket Escapement",
        "fam": "escapement",
        "start": "e_afilado",
        "desc": "You start with Sharpened Teeth. +4% crit chance and +5% hit damage.",
    },
    "tetera": {
        "desc": "You start with Steam Jet. +15% steam damage.",
    },
    "juguete": {
        "desc": "You start with Clockwork Helper. +32% automaton damage.",
    },
    "tapa": {
        "desc": "You start with Brass Cuirass. +2 Defense and +18% Rivet damage.",
    },
}


def map_fam(fid: str) -> str:
    return FAM.get(fid, fid)


def main() -> None:
    data = json.loads(PATH.read_text())
    have = {f["id"] for f in data["families"]}
    if "vitriol" in have:
        print("already merged; leaving game.json alone")
        return

    skills = []
    for s in data["skills"]:
        if s["id"] in DROP:
            continue
        if s["id"] in ABSORB:
            s["fam"] = ABSORB[s["id"]]
            s.pop("syn", None)
        else:
            if s["id"] in REFILE:
                s["fam"] = REFILE[s["id"]]
            else:
                s["fam"] = map_fam(s["fam"])
            if s.get("syn"):
                s["syn"] = [map_fam(x) for x in s["syn"]]
        if s.get("req"):
            req = [x for x in s["req"] if x not in DROP]
            if req:
                s["req"] = req
            else:
                s.pop("req", None)
        if s["id"] == "o_plaga":
            s["name"] = "Vitriol Plague"
            s["desc"] = "Condition: 4+ Vitriol skills. If the enemy has 15+ rust, rust deals +{p} damage and stops fading."
        if s["id"] == "e_mecanismo":
            s["name"] = "Perfect Escapement"
            s["desc"] = (
                "Condition: 40%+ crit chance. Your crits hit again at 50% and gain +{p} crit damage. "
                "With 4+ Escapement skills, every 6 turns you take 2 extra actions."
            )
        if s["id"] in VALS:
            s["vals"] = VALS[s["id"]]
        skills.append(s)
    data["skills"] = skills
    data["families"] = FAMILIES
    data["balance"]["gearHitBonus"] = 0.05
    data["balance"]["gearCrit"] = 0.04
    data["balance"]["gearMag"] = 0.004
    data["balance"]["gearVapor"] = 0.15
    data["balance"]["gearVitriol"] = 0.1
    data["balance"]["gearGalvanism"] = 0.06
    data["balance"]["gearAuto"] = 0.32
    data["balance"]["gearRemache"] = 0.18

    by_id = {g["id"]: g for g in data["gears"]}
    gears = []
    for gid in GEAR_ORDER:
        g = by_id[gid]
        g.update(GEAR_PATCH.get(gid, {}))
        if gid not in GEAR_PATCH:
            g["fam"] = map_fam(g["fam"])
        gears.append(g)
    data["gears"] = gears

    data["sources"]["oxido"] = "Vitriol"
    data["sources"]["alquimia"] = "Vials"
    data["sources"]["tesla"] = "Discharges"
    data["sources"]["iman"] = "Charges"

    ids = {s["id"] for s in skills}
    for s in skills:
        for req in s.get("req", []):
            if req not in ids:
                raise SystemExit(f"{s['id']} requires missing {req}")
        for fam in s.get("syn", []):
            if fam not in {f["id"] for f in FAMILIES}:
                raise SystemExit(f"{s['id']} syn {fam}")
        if s["fam"] not in {f["id"] for f in FAMILIES}:
            raise SystemExit(f"{s['id']} fam {s['fam']}")

    PATH.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"skills {len(skills)} gears {len(gears)}")
    for fam in FAMILIES:
        c = Counter()
        owned = []
        for s in skills:
            if s["fam"] == fam["id"]:
                c[s["rarity"]] += 1
                owned.append(s["id"])
        print(f"  {fam['name']:12} {sum(c.values()):2}  {dict(c)}  {' '.join(owned)}")


if __name__ == "__main__":
    main()
