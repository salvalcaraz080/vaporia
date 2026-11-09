#!/usr/bin/env python3
"""Split Vitriol into Rust + Salvage, and turn Galvanism into Tesla.

Display names stay in data/game.json families[].name. Safe to run twice.
"""
import json
from collections import Counter
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "data" / "game.json"

DROP = {"m_iman", "m_brujula", "m_atrac", "m_polo", "y_dilatado", "a_mercurio"}
FAM = {"vitriol": "rust", "galvanism": "tesla"}

FAMILIES = [
    {"id": "rust", "name": "Rust", "color": "#c8743a",
     "idea": "A poison that only stacks. It never flakes away."},
    {"id": "tesla", "name": "Tesla", "color": "#4fd1c5",
     "idea": "Electric discharges, arcs, and a shock when you dodge"},
    {"id": "salvage", "name": "Salvage", "color": "#7d9a6a",
     "idea": "A machine patching itself from scrap"},
    {"id": "escapement", "name": "Escapement", "color": "#e0b24a",
     "idea": "Critical hits, accuracy, and tempo for extra actions"},
    {"id": "vapor", "name": "Steam", "color": "#c9d6dc",
     "idea": "Scalds, geysers, and fog (Evasion)"},
    {"id": "remache", "name": "Rivet", "color": "#9aa3b8",
     "idea": "Defense, shields, and damage that scales with Defense"},
    {"id": "reso", "name": "Resonance", "color": "#b48cff",
     "idea": "Vibration that builds, then detonates"},
    {"id": "auto", "name": "Automata", "color": "#6fa8dc",
     "idea": "Wind-up helpers that fight beside you"},
]

PATCH = {
    "o_gota": {"vals": [1.0, 1.25, 1.5, 1.75, 2.0, 2.3]},
    "o_plaga": {
        "name": "Rust Plague",
        "desc": "Condition: 4+ Rust skills. At 40+ rust, rust deals +{p} damage. Stacks never flake away.",
        "vals": [0.2, 0.35, 0.5],
    },
    "o_corr": {
        "desc": "Enemies with 25+ rust take +{p} damage from everything.",
    },
    "o_eterna": {
        "name": "Caked Rust",
        "desc": "Rust deals +{p} damage. The coat never flakes off.",
        "vals": [0.1, 0.22, 0.36, 0.5],
    },
    "a_vial": {
        "name": "Rust Vial",
        "fam": "rust",
        "desc": "Every 3 turns, dump {v} rust on the enemy. It does not flake away.",
        "vals": [2, 3, 4, 5, 6, 7],
    },
    "a_catalizador": {
        "name": "Rust Catalyst",
        "fam": "rust",
        "desc": "Rust deals +{p} damage.",
        "vals": [0.08, 0.12, 0.16, 0.2, 0.24, 0.28],
    },
    "a_tonico": {
        "name": "Patch Plate",
        "fam": "salvage",
        "desc": "You repair {p} of your max HP each turn.",
        "m5": "double that under 30% HP",
        "vals": [0.01, 0.013, 0.016, 0.02, 0.024, 0.028],
    },
    "a_piedra": {
        "name": "Weld Bead",
        "fam": "salvage",
        "desc": "Repairs are +{p} stronger, and any overflow becomes shield.",
    },
    "y_electro": {
        "name": "Live Wire",
        "desc": "Discharges deal +{p} damage.",
        "vals": [0.1, 0.16, 0.22, 0.28, 0.34, 0.4],
    },
    "y_vibra": {
        "name": "Ringing Plate",
        "desc": "Detonations deal +{p} damage.",
        "vals": [0.08, 0.12, 0.16, 0.22, 0.28, 0.34],
    },
    "y_dinamo": {
        "name": "Splice",
        "fam": "salvage",
        "desc": "You repair for {p} of the damage from your hits.",
        "syn": ["escapement", "salvage"],
        "vals": [0.04, 0.06, 0.08, 0.1, 0.12, 0.15],
    },
    "y_alqauto": {
        "name": "Repair Drones",
        "desc": "Your automata repair you for {p} of the damage they deal.",
        "syn": ["salvage", "auto"],
    },
    "y_tierra": {
        "syn": ["tesla", "remache"],
    },
    "t_tormenta": {
        "name": "Living Arc",
        "desc": "Condition: after 8 discharges in a fight, each hit also fires a discharge of {p} attack.",
    },
}

NEW = [
    {"id": "o_costra", "name": "Flaking", "fam": "rust", "rarity": "comun", "max": 6,
     "vals": [0.4, 0.6, 0.8, 1.0, 1.2, 1.5],
     "desc": "Each turn, add {v} rust. It never flakes away."},
    {"id": "o_sarro", "name": "Scale", "fam": "rust", "rarity": "rara", "max": 6,
     "vals": [0.04, 0.05, 0.06, 0.08, 0.1, 0.12],
     "desc": "Rust deals +{p} damage for every 10 rust on the enemy."},
    {"id": "o_quema", "name": "Rust Bloom", "fam": "rust", "rarity": "epica", "max": 4,
     "vals": [0.012, 0.018, 0.025, 0.034],
     "desc": "At 25+ rust, every 4 turns a burst deals {p} of attack for each point of rust, ignoring Defense."},
    {"id": "t_chisporroteo", "name": "Crackle", "fam": "tesla", "rarity": "comun", "max": 6,
     "vals": [0.12, 0.16, 0.2, 0.24, 0.28, 0.34],
     "desc": "Each turn, {p} chance to fire a discharge (75% of attack)."},
    {"id": "t_replica", "name": "Aftershock", "fam": "tesla", "rarity": "comun", "max": 6,
     "vals": [0.12, 0.16, 0.2, 0.25, 0.3, 0.36],
     "desc": "After a discharge, fire an extra shock for {p} of attack."},
    {"id": "t_jaula", "name": "Arc Cage", "fam": "tesla", "rarity": "rara", "max": 6,
     "vals": [0.5, 0.65, 0.8, 0.95, 1.1, 1.25],
     "desc": "Every 4 turns, fire a discharge of {p} attack."},
    {"id": "t_corona", "name": "Corona", "fam": "tesla", "rarity": "epica", "max": 4,
     "vals": [0.05, 0.1, 0.16, 0.24],
     "desc": "Discharges ignore Defense and deal +{p} damage."},
    {"id": "sa_remiendo", "name": "Field Weld", "fam": "salvage", "rarity": "comun", "max": 6,
     "vals": [0.12, 0.15, 0.18, 0.21, 0.24, 0.28],
     "desc": "The first time you drop under 40% HP, repair {p} of your max HP."},
    {"id": "sa_aceite", "name": "Oil Film", "fam": "salvage", "rarity": "comun", "max": 6,
     "vals": [0.04, 0.055, 0.07, 0.085, 0.1, 0.12],
     "desc": "You start each fight with a shield of {p} of your max HP."},
    {"id": "sa_junta", "name": "Seam Tape", "fam": "salvage", "rarity": "comun", "max": 6,
     "vals": [0.04, 0.05, 0.06, 0.075, 0.09, 0.11],
     "desc": "At the start of each fight, repair {p} of your max HP."},
    {"id": "sa_rebaba", "name": "Scrap Hammer", "fam": "salvage", "rarity": "comun", "max": 6,
     "vals": [0.1, 0.15, 0.2, 0.26, 0.32, 0.4],
     "desc": "Your hits deal extra damage equal to {p} of your attack plus the same share of your shield."},
    {"id": "sa_cascajo", "name": "Scrap Cycle", "fam": "salvage", "rarity": "rara", "max": 6,
     "vals": [0.03, 0.04, 0.05, 0.06, 0.07, 0.085],
     "desc": "Every 4 turns, repair {p} of your max HP."},
    {"id": "sa_placa", "name": "Scrap Plating", "fam": "salvage", "rarity": "rara", "max": 6,
     "vals": [0.006, 0.008, 0.01, 0.012, 0.015, 0.018],
     "desc": "Each turn, gain a shield of {p} of your max HP."},
    {"id": "sa_horno", "name": "Kiln Rest", "fam": "salvage", "rarity": "rara", "max": 6,
     "vals": [0.05, 0.065, 0.08, 0.095, 0.11, 0.13],
     "desc": "Every 5 turns, repair {p} of your max HP."},
    {"id": "sa_coraza", "name": "Jury Hull", "fam": "salvage", "rarity": "epica", "max": 4,
     "vals": [0.08, 0.12, 0.16, 0.22],
     "desc": "While you are under half HP, you take {p} less damage."},
    {"id": "sa_forja", "name": "Self-Forge", "fam": "salvage", "rarity": "legendaria", "max": 3,
     "vals": [0.15, 0.28, 0.42],
     "desc": "Condition: 4+ Salvage skills. Repairs are +{p} stronger, and 35% of the HP you actually restore also becomes shield."},
]

GEAR_ORDER = ["lima", "bobina", "parche", "llave", "tetera", "tapa", "diapason", "juguete"]

PHRASES = {
    "Lion's face": "Lion plate",
    "Owl's face": "Owl plate",
    "Shrine of the Steam Lady": "Shrine of the Steam Engine",
    "A warm figure of steam wraps around you and whispers.": "A boiler-shaped engine wraps you in warm vapor and ticks a greeting.",
    "Shrine of Mother Rust": "Shrine of the Rust Well",
    "A rust-crusted altar smells of rain and iron.": "A rust-crusted chassis altar smells of rain and iron.",
    "Shrine of the Sleeping Clockmaker": "Shrine of the Stopped Clock",
    "A bronze elder sleeps beside a thousand stopped clocks.": "A bronze chassis sleeps beside a thousand stopped clocks.",
    "A faceless man offers a contract written in soot.": "A faceless chassis offers a contract written in soot.",
    "The otter's cart is shut. She points you toward the merchant and shares a sip of tonic.": "The scrap-frame's cart is shut. It points you toward the merchant and shares a sip of oil.",
    "Traveling Clockmaker": "Traveling Clockwork",
    "His case stays closed. He still lets you sit a minute.": "Its case stays closed. It still lets you sit a minute.",
    "He will not take nuts. A favor, or nothing.": "It will not take nuts. A favor, or nothing.",
    "The forge is banked. She lets you warm your hands. Nothing is for sale.": "The forge is banked. It lets you warm your joints. Nothing is for sale.",
    "He has no cloth for sale. He does pin a spare ribbon on your coat.": "It has no cloth for sale. It does pin a spare ribbon on your coat.",
    "A vendor presses a few nuts into your hand to move you along.": "A vendor-frame presses a few nuts into your gripper to move you along.",
    "Train your guard": "Brace your guard",
    "The gambler will not take nuts. He will still throw for pride.": "The dice-frame will not take nuts. It will still throw for pride.",
    "A clockmaker's apprentice cannot find the way home.": "A small clockwork cannot find its berth.",
    "Lost Apprentice": "Lost Clockwork",
    "A beam has fallen across a machinist.": "A beam has fallen across a machinist unit.",
    "Cat in the Chimney": "Chimney Drone",
    "A cat yowls from the top of a chimney.": "A small flier ticks and sparks at the top of a chimney.",
    "An airship captain's chest, still shut.": "An airship chassis chest, still shut.",
    "Captain's Chest": "Chassis Chest",
    "Wind it by hand": "Wind the key",
    "You see better through it. You breathe worse.": "You see better through it. Your vents clog.",
    "The Steam Lady": "The Steam Engine",
    "The Sleeping Clockmaker": "The Stopped Clock",
    "Mother Rust": "The Rust Well",
    "A plan signed by the Great Engineer.": "A plan stamped by the Great Engine.",
    "The Iron Foreman": "The Iron Press",
    "A brass statue with two faces blocks the path. It only lets through someone who chooses.": "A brass statue with two faceplates blocks the path. It only lets through a chassis that chooses.",
}


def walk(o):
    if isinstance(o, dict):
        for k, v in o.items():
            o[k] = walk(v)
        return o
    if isinstance(o, list):
        return [walk(v) for v in o]
    if isinstance(o, str):
        return PHRASES.get(o, o)
    return o


def skill(base, **over):
    out = dict(base)
    out.update(over)
    return out


def main() -> None:
    data = json.loads(PATH.read_text())
    if any(f["id"] == "rust" for f in data["families"]):
        print("already split; leaving game.json alone")
        return
    skills = []
    for s in data["skills"]:
        if s["id"] in DROP:
            continue
        s["fam"] = FAM.get(s["fam"], s["fam"])
        if s.get("syn"):
            s["syn"] = [FAM.get(x, x) for x in s["syn"]]
        if s["id"] == "y_vibra":
            s.pop("syn", None)
        if s["id"] in PATCH:
            s.update(PATCH[s["id"]])
        if s.get("req"):
            req = [x for x in s["req"] if x not in DROP]
            if req:
                s["req"] = req
            else:
                s.pop("req", None)
        skills.append(s)
    skills.extend(NEW)
    data["skills"] = skills
    data["families"] = FAMILIES
    data["balance"]["poisonK"] = 0.05
    data["balance"]["gearRust"] = 0.18
    data["balance"]["gearTesla"] = 0.16
    data["balance"]["gearSalvage"] = 0.15
    by_id = {g["id"]: g for g in data["gears"]}
    by_id["lima"]["fam"] = "rust"
    by_id["lima"]["desc"] = "You start with Acid Drop. +18% rust damage."
    by_id["bobina"]["fam"] = "tesla"
    by_id["bobina"]["desc"] = "You start with Spark. +16% discharge damage."
    by_id["parche"] = {
        "id": "parche",
        "name": "Patch Kit",
        "fam": "salvage",
        "start": "a_tonico",
        "desc": "You start with Patch Plate. Repairs are +15% stronger.",
    }
    data["gears"] = [by_id[i] for i in GEAR_ORDER]
    data["sources"]["oxido"] = "Rust"
    data["sources"]["tesla"] = "Discharges"
    data["sources"].pop("iman", None)
    data["sources"].pop("alquimia", None)
    data = walk(data)
    ids = {s["id"] for s in data["skills"]}
    fams = {f["id"] for f in FAMILIES}
    for s in data["skills"]:
        if s["fam"] not in fams:
            raise SystemExit(f"bad fam {s['id']} {s['fam']}")
        for syn in s.get("syn", []):
            if syn not in fams:
                raise SystemExit(f"bad syn {s['id']} {syn}")
        for req in s.get("req", []):
            if req not in ids:
                raise SystemExit(f"missing req {s['id']} {req}")
        if len(s["vals"]) != int(s["max"]):
            raise SystemExit(f"vals {s['id']}")
    PATH.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print("skills", len(data["skills"]), "gears", len(data["gears"]))
    for fam in FAMILIES:
        owned = [s for s in data["skills"] if s["fam"] == fam["id"]]
        c = Counter(s["rarity"] for s in owned)
        names = ", ".join(s["name"] for s in owned)
        print(f"{fam['name']:12} {len(owned):2} {dict(c)}")
        print(f"    {names}")


if __name__ == "__main__":
    main()
