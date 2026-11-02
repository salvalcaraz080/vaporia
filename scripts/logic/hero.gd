extends RefCounted

const JsMath = preload("res://scripts/logic/jsmath.gd")
const SeededRng = preload("res://scripts/logic/rng.gd")
const ContentDB = preload("res://scripts/logic/content.gd")

var db: ContentDB
var max_hp: float
var hp: float
var atk: float
var defense: float
var crit: float
var crit_dmg: float
var eva: float
var acc: float
var skills: Dictionary = {}
var gear: String = ""
var rerolls: int = 0
var banish_n: int = 0
var banished: Array = []
var coins: float = 0.0
var mods: Dictionary = {}
var blessings: Array = []
var curses: Array = []
var bought: Dictionary = {}


static func create(content: ContentDB, gear_id: String):
	var h = load("res://scripts/logic/hero.gd").new()
	h.db = content
	var b: Dictionary = content.bal
	h.max_hp = float(b.heroHp)
	h.hp = h.max_hp
	h.atk = float(b.heroAtk)
	h.defense = float(b.heroDef)
	h.crit = float(b.heroCrit)
	h.crit_dmg = float(b.heroCritDmg)
	h.eva = float(b.heroEva)
	h.acc = float(b.heroAcc)
	h.gear = gear_id
	h.rerolls = int(b.startRerolls)
	h.banish_n = int(b.startBanish)
	var g: Dictionary = content.gear_by_id[gear_id]
	h.gain(str(g.start))
	if str(g.fam) == "engranaje":
		h.crit += float(b.gearCrit)
	if str(g.fam) == "remache":
		h.defense += float(b.gearDef)
	return h


func level(id: String) -> int:
	return int(skills.get(id, 0))


func sval(id: String) -> float:
	var lv := level(id)
	if lv <= 0:
		return 0.0
	return float(db.skill_by_id[id].vals[lv - 1])


func md(k: String) -> float:
	return float(mods.get(k, 0.0))


func fam_count(f: String) -> int:
	var n := 0
	for id in skills.keys():
		var s: Dictionary = db.skill_by_id[id]
		if str(s.fam) == f or (s.has("syn") and _has(s.syn, f)):
			n += 1
	return n


func fam_owned(f: String) -> bool:
	for id in skills.keys():
		var s: Dictionary = db.skill_by_id[id]
		if not s.has("syn") and str(s.fam) == f:
			return true
	return false


func stats() -> Dictionary:
	var atk_v := float(JsMath.js_round(atk * (1.0 + md("atkPct")) * 100.0)) / 100.0
	var def_v := defense + sval("r_coraza") + (3.0 if level("r_blindaje") >= 5 else 0.0) + md("def")
	return {
		"atk": atk_v,
		"def": def_v,
		"maxHp": max_hp,
		"crit": max(0.0, crit + md("crit") + sval("e_monoculo")),
		"critDmg": crit_dmg + sval("e_martillo") + (0.25 if level("e_monoculo") >= 5 else 0.0),
		"eva": max(0.0, eva + sval("v_niebla") + md("eva")),
		"acc": acc + sval("e_puntero"),
	}


func set_level(id: String, lv: int) -> void:
	var before := level(id)
	var sk: Dictionary = db.skill_by_id[id]
	lv = clampi(lv, 0, int(sk.max))
	if id == "r_blindaje":
		var add := _blindaje_hp(lv) - _blindaje_hp(before)
		max_hp += add
		hp = max(1.0, min(max_hp, hp + add))
	if lv > 0:
		skills[id] = lv
	else:
		skills.erase(id)


func gain(id: String) -> void:
	if level(id) < int(db.skill_by_id[id].max):
		set_level(id, level(id) + 1)


func skill_text(id: String, lv: int) -> String:
	var s: Dictionary = db.skill_by_id[id]
	var mx := int(s.max)
	var use := clampi(lv, 1, mx)
	var v := float(s.vals[use - 1])
	var t := str(s.desc).replace("{v}", JsMath.fmt_n(v)).replace("{p}", JsMath.fmt_p(v))
	if s.has("m3") and str(s.m3) != "":
		t += " · Lv3: " + str(s.m3)
		if lv >= 3:
			t += " (active)"
	if s.has("m5") and str(s.m5) != "":
		t += " · Lv5: " + str(s.m5)
		if lv >= 5:
			t += " (active)"
	return t


func stat_price(id: String) -> int:
	var b: Dictionary = db.stat_buy[id]
	return int(b.base) + int(b.step) * int(bought.get(id, 0))


func apply_stat_card(id: String) -> void:
	if id == "galletas":
		max_hp += 10
		hp = min(max_hp, hp + 10)
	elif id == "tuercas":
		atk += 1
	elif id == "bolsa":
		coins += 20


func heal_frac(frac: float) -> int:
	var before := hp
	hp = min(max_hp, float(JsMath.js_round(hp + max_hp * frac)))
	return int(hp - before)


func owned_upgradable() -> Array:
	var out: Array = []
	for id in skills.keys():
		if level(str(id)) < int(db.skill_by_id[id].max):
			out.append(str(id))
	return out


func add_mods(m: Dictionary, sign: float) -> void:
	for k in m.keys():
		mods[k] = float(mods.get(k, 0.0)) + sign * float(m[k])


func apply_fx(fx: Dictionary, rng: SeededRng) -> Dictionary:
	var out := {"offers": [], "fight": "", "msgs": []}
	_apply_fx(fx, rng, out)
	var msg := " ".join(out.msgs)
	if msg == "":
		msg = "You carry on."
	var offers: Array = []
	var gf := str(db.gear_by_id[gear].fam)
	for o in out.offers:
		offers.append(gf if str(o) == "gear" else str(o))
	return {"offers": offers, "fight": str(out.fight), "msg": msg}


func _apply_fx(fx: Dictionary, rng: SeededRng, out: Dictionary) -> void:
	if fx.get("buy"):
		var id := str(fx.buy)
		var p := stat_price(id)
		coins = max(0.0, coins - float(p))
		bought[id] = int(bought.get(id, 0)) + 1
		out.msgs.append(str(db.stat_buy[id].name) + " for " + str(p) + " nuts.")
		_apply_fx(db.stat_buy[id].fx, rng, out)
	if fx.get("gamble"):
		var g: Dictionary = fx.gamble
		var ok := rng.nextf() < float(g.p)
		out.msgs.append("It pays off!" if ok else "It backfires.")
		_apply_fx(g.win if ok else g.lose, rng, out)
	if fx.get("coins"):
		var n := float(fx.coins)
		coins = max(0.0, coins + n)
		out.msgs.append(("+" if n > 0 else "") + str(int(n)) + " nuts.")
	if fx.get("hurt"):
		var loss: int = maxi(0, mini(int(hp) - 1, JsMath.js_round(hp * float(fx.hurt))))
		hp -= loss
		out.msgs.append("You lose " + str(loss) + " HP.")
	if fx.get("heal"):
		out.msgs.append("You recover " + str(heal_frac(float(fx.heal))) + " HP.")
	if fx.get("maxHp"):
		var d := float(fx.maxHp)
		max_hp = max(30.0, max_hp + d)
		hp = max(1.0, min(max_hp, hp + max(0.0, d)))
		out.msgs.append(("+" if d > 0 else "") + str(int(d)) + " max HP.")
	if fx.get("atk"):
		var d := float(fx.atk)
		atk = max(1.0, atk + d)
		out.msgs.append(("+" if d > 0 else "") + str(int(d)) + " attack.")
	if fx.get("def"):
		var d := float(fx.def)
		defense = max(0.0, defense + d)
		out.msgs.append(("+" if d > 0 else "") + str(int(d)) + " Defense.")
	if fx.get("eva"):
		eva = max(0.0, eva + float(fx.eva))
		out.msgs.append("+" + JsMath.fmt_p(float(fx.eva)) + " Evasion.")
	if fx.get("acc"):
		acc += float(fx.acc)
		out.msgs.append("+" + JsMath.fmt_p(float(fx.acc)) + " Accuracy.")
	if fx.get("critDmg"):
		crit_dmg += float(fx.critDmg)
		out.msgs.append("+" + JsMath.fmt_p(float(fx.critDmg)) + " crit damage.")
	if fx.get("crit"):
		crit = max(0.0, crit + float(fx.crit))
		out.msgs.append("+" + JsMath.fmt_p(float(fx.crit)) + " crit chance.")
	if fx.get("rerolls"):
		rerolls += int(fx.rerolls)
		out.msgs.append("+" + str(int(fx.rerolls)) + " reroll.")
	if fx.get("banish"):
		banish_n += int(fx.banish)
		out.msgs.append("+" + str(int(fx.banish)) + " banish.")
	if fx.get("mods"):
		add_mods(fx.mods, 1.0)
	if fx.get("upgrade"):
		out.msgs.append(" · ".join(_upgrade_random(int(fx.upgrade), rng)))
	if fx.get("downgrade"):
		var dropped := _downgrade_random(int(fx.downgrade), rng)
		if dropped.size():
			out.msgs.append(" · ".join(dropped))
	if fx.get("best"):
		var own := _stable_by_level(owned_upgradable(), false)
		if own.size():
			gain(str(own[0]))
			out.msgs.append(str(db.skill_by_id[own[0]].name) + " → Lv " + str(level(str(own[0]))))
		else:
			atk += 2
			out.msgs.append("+2 attack.")
	if fx.get("upFam"):
		var f := str(db.gear_by_id[gear].fam)
		var ids: Array = []
		for k in owned_upgradable():
			if str(db.skill_by_id[k].fam) == f:
				ids.append(k)
		for k in ids:
			gain(str(k))
		if ids.is_empty():
			atk += 2
		if ids.size():
			var names: PackedStringArray = []
			for k in ids:
				names.append(str(db.skill_by_id[k].name))
			out.msgs.append("Leveling up: " + ", ".join(names))
		else:
			out.msgs.append("Nothing to upgrade: +2 attack.")
	if fx.get("transmute"):
		var own: Array = []
		for k in skills.keys():
			if not db.skill_by_id[k].has("syn"):
				own.append(str(k))
		if own.size():
			var id: String = own[rng.pick_index(own.size())]
			var lv := level(id)
			var opts: Array = []
			for s in db.skills:
				if s.has("syn") or s.has("req"):
					continue
				if str(s.fam) == str(db.skill_by_id[id].fam):
					continue
				if level(str(s.id)) > 0:
					continue
				opts.append(s)
			var to: Dictionary = opts[rng.pick_index(opts.size())]
			set_level(id, 0)
			set_level(str(to.id), mini(lv, int(to.max)))
			out.msgs.append(str(db.skill_by_id[id].name) + " transmutes into " + str(to.name) + " (Lv " + str(level(str(to.id))) + ").")
	if fx.get("refund"):
		var own: Array = []
		for k in skills.keys():
			own.append(str(k))
		if own.size() > 1:
			var id: String = own[rng.pick_index(own.size())]
			var nm := str(db.skill_by_id[id].name)
			set_level(id, 0)
			out.msgs.append("You refund " + nm + ".")
			out.msgs.append(" · ".join(_upgrade_random(2, rng)))
		else:
			atk += 2
			out.msgs.append("+2 attack.")
	if fx.get("fuse"):
		var own: Array = []
		for k in skills.keys():
			own.append(str(k))
		own = _stable_by_level(own, true).slice(0, 2)
		var names: PackedStringArray = []
		for k in own:
			names.append(str(db.skill_by_id[k].name))
			set_level(str(k), 0)
		out.msgs.append("You melt " + " and ".join(names) + ".")
		out.offers.append("epica")
	if fx.get("bless"):
		var id := str(fx.bless)
		var b: Dictionary = db.blessings[id]
		blessings.append(id)
		out.msgs.append("Blessing: " + str(b.name) + " (" + str(b.text) + ").")
		_apply_fx(b.fx, rng, out)
	if fx.get("curse"):
		var id := str(fx.curse)
		var c: Dictionary = db.curses[id]
		curses.append(id)
		if c.has("mods"):
			add_mods(c.mods, 1.0)
		if int(c.get("hp", 0)) != 0:
			max_hp += float(c.hp)
			hp = min(hp, max_hp)
		out.msgs.append("Curse: " + str(c.name) + " (" + str(c.text) + ").")
	if fx.get("uncurse") and curses.size():
		var i := rng.pick_index(curses.size())
		var id := str(curses[i])
		curses.remove_at(i)
		var c: Dictionary = db.curses[id]
		if c.has("mods"):
			add_mods(c.mods, -1.0)
		if int(c.get("hp", 0)) != 0:
			max_hp -= float(c.hp)
		out.msgs.append("You shake off " + str(c.name) + ".")
	if fx.get("offer"):
		out.offers.append(str(fx.offer))
	if fx.get("fight"):
		out.fight = str(fx.fight)


func choice_cost(c: Dictionary) -> int:
	var fx: Dictionary = c.get("fx", {})
	if fx.get("buy"):
		return stat_price(str(fx.buy))
	return int(c.get("cost", 0))


func can_choose(c: Dictionary) -> bool:
	var k := choice_cost(c)
	return k == 0 or coins >= float(k)


func _upgrade_random(n: int, rng: SeededRng) -> Array:
	var out: Array = []
	for _i in n:
		var own := owned_upgradable()
		if own.is_empty():
			atk += 1
			out.append("+1 attack (nothing left to upgrade)")
			continue
		var id: String = own[rng.pick_index(own.size())]
		gain(id)
		out.append(str(db.skill_by_id[id].name) + " → Lv " + str(level(id)))
	return out


func _downgrade_random(n: int, rng: SeededRng) -> Array:
	var out: Array = []
	for _i in n:
		var own: Array = []
		for k in skills.keys():
			own.append(str(k))
		if own.is_empty():
			break
		var id: String = own[rng.pick_index(own.size())]
		set_level(id, level(id) - 1)
		out.append(str(db.skill_by_id[id].name) + " drops to Lv " + str(level(id)))
	return out


func _stable_by_level(ids: Array, ascending: bool) -> Array:
	var a := ids.duplicate()
	for i in range(1, a.size()):
		var key = a[i]
		var key_lv := level(str(key))
		var j := i - 1
		while j >= 0:
			var other_lv := level(str(a[j]))
			var out_of_order := key_lv < other_lv if ascending else key_lv > other_lv
			if not out_of_order:
				break
			a[j + 1] = a[j]
			j -= 1
		a[j + 1] = key
	return a


func _blindaje_hp(lv: int) -> float:
	if lv <= 0:
		return 0.0
	return float(JsMath.js_round(float(db.bal.heroHp) * float(db.skill_by_id.r_blindaje.vals[lv - 1])))


func _has(arr: Array, v) -> bool:
	return arr.has(v)
