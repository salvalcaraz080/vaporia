extends RefCounted

const JsMath = preload("res://scripts/logic/jsmath.gd")
const SeededRng = preload("res://scripts/logic/rng.gd")
const ContentDB = preload("res://scripts/logic/content.gd")
const HeroState = preload("res://scripts/logic/hero.gd")

## Direct port of v3 battle(). Skill levels do not change mid-fight, so they are cached.

var db: ContentDB
var h: HeroState
var e: Dictionary
var rng: SeededRng
var with_log: bool
var log: Array = []
var dmg: Dictionary = {}

var gf: String = ""
var ST: Dictionary = {}
var bal: Dictionary = {}
var _levels: Dictionary = {}
var _vals: Dictionary = {}

var shield := 0.0
var turn := 0
var tempo := 0.0
var swing := 0
var cond_stacks := 0
var volante := 0
var minis := 0
var enemy_turns := 0
var heat := 1.0
var heat_logged := false
var revived := false
var stopped := false
var plancha2 := false
var first_miss := false
var flasks := 0
var bolts := 0
var detos := 0
var vib := 0
var def_loss := 0.0
var burn_t := 0
var misses := 0
var dodges := 0
var in_cure := false
var heal_mult := 1.0
var catal := 0.0
var plaga := false
var corazon := false
var bucle := false
var aurea := false
var fortaleza := false
var forja := false
var welded := false


static func run(content: ContentDB, hero: HeroState, enemy: Dictionary, random: SeededRng, want_log: bool) -> Dictionary:
	var b = load("res://scripts/logic/battle.gd").new()
	return b._run(content, hero, enemy, random, want_log)


func _run(content: ContentDB, hero: HeroState, enemy: Dictionary, random: SeededRng, want_log: bool) -> Dictionary:
	db = content
	h = hero
	e = enemy
	rng = random
	with_log = want_log
	bal = db.bal
	var gear: Dictionary = db.gear_by_id[h.gear]
	gf = str(gear.fam)
	ST = h.stats()
	for id in db.skill_by_id.keys():
		var got := h.level(str(id))
		_levels[id] = got
		_vals[id] = h.sval(str(id)) if got > 0 else 0.0
	shield = h.max_hp * (sv("r_plancha") + h.md("startShield"))
	tempo = 30.0 if lv("c_cuerda") >= 3 else 0.0
	plancha2 = lv("r_plancha") >= 5
	first_miss = h.md("firstMiss") > 0.0
	flasks = 2 if lv("a_frasco") >= 3 else (1 if lv("a_frasco") > 0 else 0)
	heal_mult = 1.0 + sv("a_piedra")
	if gf == "salvage":
		heal_mult += float(bal.gearSalvage)
	catal = sv("a_catalizador")
	plaga = lv("o_plaga") > 0 and h.fam_count("rust") >= 4
	forja = lv("sa_forja") > 0 and h.fam_count("salvage") >= 4
	if forja:
		heal_mult += sv("sa_forja")
	corazon = lv("v_corazon") > 0 and h.fam_count("vapor") >= 4
	bucle = lv("e_mecanismo") > 0 and h.fam_count("escapement") >= 4
	aurea = lv("a_aurea") > 0 and h.fam_count("vitriol") >= 4
	fortaleza = lv("r_fortaleza") > 0 and float(ST.def) >= 20.0

	_log("info", "A " + str(e.name) + " shows up. Defense " + str(int(e.def)) + " · Evasion " + JsMath.fmt_p(float(e.eva)) + " · Accuracy +" + JsMath.fmt_p(float(e.acc)) + ((" · " + str(db.traits[e.trait])) if str(e.trait) != "" else ""))
	if lv("sa_aceite") > 0:
		var film := h.max_hp * sv("sa_aceite")
		shield += film
	if lv("sa_junta") > 0:
		var seam := _cure(h.max_hp * sv("sa_junta"))
		if seam >= 1.0:
			_log("heal", "Seam tape: +" + str(JsMath.js_round(seam)))
	if shield > 0.0:
		_log("shield", "Starting shield: +" + str(JsMath.js_round(shield)))
	if h.md("openRust") > 0.0:
		e.poison = float(e.poison) + h.md("openRust")
	if lv("o_gota") >= 5:
		e.poison = float(e.poison) + 4.0
	if lv("o_salpica") > 0:
		e.poison = float(e.poison) + sv("o_salpica")
	if lv("m_brujula") > 0:
		_add_mag(sv("m_brujula"))
	if h.md("openBolt") > 0.0:
		_bolt(h.md("openBolt"), "Opening spark")
	var over_t := int(bal.overheat[e.kind])
	var cap := int(bal.turnCap)
	while h.hp > 0.0 and float(e.hp) > 0.0 and turn < cap:
		turn += 1
		var reg := h.max_hp * (sv("a_tonico") * (2.0 if lv("a_tonico") >= 5 and h.hp < h.max_hp * 0.3 else 1.0) + h.md("regen"))
		if reg > 0.0:
			var restored := _cure(reg)
			if restored >= 1.0:
				_log("heal", "Regeneration: +" + str(JsMath.js_round(restored)))
		if lv("o_costra") > 0:
			e.poison = float(e.poison) + sv("o_costra")
		if lv("sa_placa") > 0:
			shield += h.max_hp * sv("sa_placa")
		if not welded and lv("sa_remiendo") > 0 and h.hp > 0.0 and h.hp < h.max_hp * 0.4:
			welded = true
			var weld := _cure(h.max_hp * sv("sa_remiendo"))
			if weld >= 1.0:
				_log("heal", "Field weld: +" + str(JsMath.js_round(weld)))
		if float(e.poison) > 0.0:
			var pl := plaga and float(e.poison) >= 28.0
			var stacks := 0.0
			if lv("o_sarro") > 0:
				stacks = sv("o_sarro") * floor(float(e.poison) / 10.0)
			var amt := float(e.poison) * float(ST.atk) * float(bal.poisonK) * (1.0 + catal + sv("o_eterna") + stacks + h.md("dotPct") + (sv("o_plaga") if pl else 0.0))
			var pc := false
			if lv("o_brecha") > 0 and rng.nextf() < _crit_now() * sv("o_brecha"):
				pc = true
			if pc:
				amt *= _crit_dmg_now()
			var dmg_n := _deal(amt, "oxido", false, true, false)
			_log("poison", "Rust (" + str(JsMath.js_round(float(e.poison))) + "): " + str(dmg_n) + (" CRITICAL" if pc else "") + (" · plague" if pl else ""))
			if float(e.hp) <= 0.0:
				break
		if int(e.burn) > 0:
			burn_t += 1
			var tox: float = 1.0 + sv("y_corrosivo") * minf(20.0, float(e.poison))
			var cz: float = (1.0 + sv("v_corazon") * float(mini(20, burn_t))) if corazon else 1.0
			var dmg_b := _deal(float(ST.atk) * float(bal.burnK) * (1.0 + sv("v_caldera") + h.md("dotPct")) * tox * cz, "vapor", false, true, false)
			if not corazon:
				e.burn = int(e.burn) - 1
			_log("burn", "Scald: " + str(dmg_b))
			_add_res(sv("y_silbato"))
			if float(e.hp) <= 0.0:
				break
		_automatons(1.0, "Grand Automaton and helpers" if (lv("u_ejercito") > 0 and minis >= 3) else "Automata")
		if lv("y_golem") > 0 and _n_auto() > 0:
			shield += h.max_hp * sv("y_golem")
		if lv("m_campo") > 0 and float(e.mag) >= 5.0 and float(e.hp) > 0.0:
			var dmg_m := _deal(_atk_now() * sv("m_campo") * (float(e.mag) / 5.0), "iman", false, false, false)
			_log("mag", "Magnetic field: " + str(dmg_m))
		if lv("m_singular") > 0 and float(e.mag) >= 20.0 and float(e.hp) > 0.0:
			var dmg_s := _deal(_atk_now() * sv("m_singular") * float(e.mag), "iman", false, false, true)
			e.mag = 10.0
			_log("mag", "Singularity! The charges collapse: " + str(dmg_s))
		if lv("s_coro") > 0:
			_add_res(sv("s_coro"))
		if str(e.trait) == "regenera" and float(e.hp) > 0.0:
			e.hp = min(float(e.maxHp), float(e.hp) + float(e.maxHp) * 0.02)
		if float(e.hp) <= 0.0:
			break
		var swings := 2 if rng.nextf() < sv("e_doble") else 1
		var s_i := 0
		while s_i < swings and float(e.hp) > 0.0:
			var mult := 1.25 if (s_i == 1 and lv("e_doble") >= 5) else 1.0
			_strike("Second hit" if s_i == 1 else "Hit", "ataque", false, mult)
			s_i += 1
		tempo += sv("c_cuerda") + h.md("tempo")
		while tempo >= 100.0 and float(e.hp) > 0.0:
			tempo -= 100.0
			_extra(1.0, "Extra action")
		if float(e.hp) <= 0.0:
			break
		if h.hp <= 0.0 and not _save():
			break
		if lv("o_lluvia") > 0 and turn % (2 if lv("o_lluvia") >= 5 else 3) == 0:
			e.poison = float(e.poison) + sv("o_lluvia")
			_log("poison", "Acid rain: +" + JsMath.fmt_n(sv("o_lluvia")) + " rust")
		if lv("v_valvula") > 0 and turn % (3 if lv("v_valvula") >= 5 else 4) == 0:
			var dmg_v := _deal(_atk_now() * sv("v_valvula"), "vapor", false, false, false)
			e.burn = maxi(int(e.burn), 3)
			_log("burn", "Relief valve: " + str(dmg_v) + ", and a scald")
		if lv("v_geiser") > 0 and turn % 5 == 0 and float(e.hp) > 0.0:
			var dmg_g := _deal(_atk_now() * sv("v_geiser"), "vapor", false, false, true)
			_log("burn", "Geyser: " + str(dmg_g))
		if lv("t_bobina") > 0 and turn % 5 == 0:
			var shots := 4 if lv("t_bobina") >= 5 else 3
			for _i in shots:
				if float(e.hp) <= 0.0:
					break
				_bolt(sv("t_bobina"), "Tesla Coil")
		if lv("r_mamparo") > 0 and turn % 3 == 0:
			var sh := h.max_hp * sv("r_mamparo")
			shield += sh
			_log("shield", "Armored bulkhead: +" + str(JsMath.js_round(sh)) + " shield")
		if lv("r_ariete") > 0 and turn % 4 == 0 and float(e.hp) > 0.0:
			var dmg_a := _deal(float(ST.def) * sv("r_ariete") + _atk_now() * 0.6, "remache", false, false, false)
			_log("thorns", "Battering ram! " + str(dmg_a))
		if lv("a_vial") > 0 and turn % 3 == 0:
			e.poison = float(e.poison) + sv("a_vial")
			_log("poison", "Rust vial: +" + JsMath.fmt_n(sv("a_vial")) + " rust")
		if lv("sa_cascajo") > 0 and turn % 4 == 0:
			var mend := _cure(h.max_hp * sv("sa_cascajo"))
			if mend >= 1.0:
				_log("heal", "Scrap cycle: +" + str(JsMath.js_round(mend)))
		if lv("sa_horno") > 0 and turn % 5 == 0:
			var kiln := _cure(h.max_hp * sv("sa_horno"))
			if kiln >= 1.0:
				_log("heal", "Kiln rest: +" + str(JsMath.js_round(kiln)))
		if lv("t_jaula") > 0 and turn % 4 == 0 and float(e.hp) > 0.0:
			_bolt(sv("t_jaula"), "Arc Cage")
		if lv("t_chisporroteo") > 0 and float(e.hp) > 0.0 and rng.nextf() < sv("t_chisporroteo"):
			_bolt(0.75, "Crackle")
		if lv("o_quema") > 0 and float(e.poison) >= 16.0 and turn % 4 == 0 and float(e.hp) > 0.0:
			var dmg_q := _deal(_atk_now() * float(e.poison) * sv("o_quema"), "oxido", false, false, true)
			_log("poison", "Rust bloom: " + str(dmg_q))
		if lv("m_pulso") > 0 and turn % 4 == 0 and float(e.hp) > 0.0:
			var dmg_p := _deal(_atk_now() * sv("m_pulso") * (1.0 + 0.04 * float(e.mag)), "iman", false, false, false)
			_log("mag", "Magnetic pulse: " + str(dmg_p))
		if lv("s_onda") > 0 and turn % 3 == 0:
			_add_res(sv("s_onda"))
		if lv("u_linea") > 0 and turn % 4 == 0 and minis < 3:
			minis += 1
			if minis == 3 and lv("u_ejercito") > 0:
				_log("auto", "The 3 mini automata assemble into a Grand Automaton!")
			else:
				_log("auto", "You build a mini automaton (" + str(minis) + ")")
		if lv("u_bateria") > 0 and turn % 5 == 0 and float(e.hp) > 0.0 and _n_auto() > 0:
			var dmg_ba := _deal(_atk_now() * sv("u_bateria") * float(_n_auto()), "auto", false, false, false)
			_log("auto", "Shared battery: " + str(dmg_ba))
		if lv("u_coloso") > 0 and turn % 6 == 0 and float(e.hp) > 0.0:
			var dmg_c := _deal(_atk_now() * sv("u_coloso"), "auto", false, false, false)
			e.stun = maxi(int(e.stun), 1)
			_log("auto", "The colossus stomps! " + str(dmg_c) + " · stunned")
		if bucle and turn % 6 == 0:
			for _j in 2:
				if float(e.hp) <= 0.0:
					break
				_extra(1.0, "Time loop")
		if float(e.hp) <= 0.0:
			break
		if int(e.stun) > 0:
			e.stun = int(e.stun) - 1
			_lost_turn()
			_log("info", str(e.name) + " is stunned and loses the turn")
			continue
		if rng.nextf() < sv("c_freno"):
			_lost_turn()
			_log("info", "Escapement brake: " + str(e.name) + " loses the turn")
			continue
		enemy_turns += 1
		if (str(e.kind) == "boss" or str(e.kind) == "mini") and not e.enraged and float(e.hp) < float(e.maxHp) * 0.5:
			e.enraged = true
			_log("info", str(e.name) + " flies into a rage! (+25% attack)")
		if turn > over_t:
			heat *= 1.0 + float(bal.heatRate)
			if not heat_logged:
				heat_logged = true
				_log("info", str(e.name) + " overheats: it hits harder every turn")
		var heavy := int(e.heavy) > 0 and enemy_turns % int(e.heavy) == 0
		var hits: Array = [0.55, 0.55] if str(e.trait) == "rapido" else [float(bal.heavyMult) if heavy else 1.0]
		for hm in hits:
			_enemy_hit(float(hm), heavy)
			if h.hp <= 0.0 and not _save():
				break
			if float(e.hp) <= 0.0:
				break
		if h.hp <= 0.0:
			break
	var win := float(e.hp) <= 0.0 and h.hp > 0.0
	if h.hp < 0.0:
		h.hp = 0.0
	if not win and h.hp > 0.0:
		h.hp = 0.0
		_log("info", "You run out of steam (limit of " + str(cap) + " turns)")
	var coins := 0
	if win and str(e.kind) != "boss":
		var before := h.hp
		h.hp = min(h.max_hp, float(JsMath.js_round(h.hp + h.max_hp * max(0.0, float(bal.postHeal) + sv("a_destilado") + h.md("postHeal")))))
		coins = JsMath.js_round(float(bal.coins[e.kind]) * max(0.0, 1.0 + h.md("coinPct")))
		h.coins += coins
		_log("info", "Victory in " + str(turn) + " turns! +" + str(int(h.hp - before)) + " HP and +" + str(coins) + " nuts.")
	else:
		_log("info", ("Victory in " + str(turn) + " turns!") if win else "You have fallen...")
	return {"win": win, "turns": turn, "log": log, "dmgBy": dmg, "coins": coins, "misses": misses, "dodges": dodges}


func lv(id: String) -> int:
	return int(_levels.get(id, 0))


func sv(id: String) -> float:
	return float(_vals.get(id, 0.0))


func _enemy_def() -> float:
	return max(0.0, float(e.def) - min(30.0, float(e.poison) * sv("o_mordiente")) - float(e.mag) * sv("m_limaduras") - def_loss)


func _log(k: String, text: String) -> void:
	if not with_log:
		return
	log.append({
		"k": k,
		"text": text,
		"hp": max(0, JsMath.js_round(h.hp)),
		"maxHp": h.max_hp,
		"shield": JsMath.js_round(shield),
		"ehp": max(0, JsMath.js_round(float(e.hp))),
		"poison": JsMath.js_round(float(e.poison)),
		"burn": int(e.burn),
		"res": float(JsMath.js_round(float(e.res) * 10.0)) / 10.0,
		"mag": float(e.mag),
		"edef": JsMath.js_round(_enemy_def()),
		"turn": turn,
	})


func _crit_now() -> float:
	var c := float(ST.crit)
	if lv("e_calibre") > 0:
		c += max(0.0, float(ST.acc) - float(e.eva)) * sv("e_calibre")
	return c


func _crit_dmg_now() -> float:
	return float(ST.critDmg)


func _atk_now() -> float:
	return float(ST.atk) * (1.0 + min(turn, 15) * sv("e_marcha") + float(cond_stacks) * sv("t_cond") + float(volante) * sv("c_volante"))


func _mag_cap() -> float:
	return 0.3 + (0.1 if lv("m_iman") >= 5 else 0.0) + (0.1 if lv("m_polo") > 0 else 0.0)


func _atk_down() -> float:
	return min(_mag_cap(), float(e.mag) * sv("m_iman") + sv("m_polo"))


func _hit_chance(acc: float, evasion: float) -> float:
	return max(float(bal.minHit), min(1.0, float(bal.baseHit) + acc - evasion))


func _def_mult(defn: float) -> float:
	return float(bal.defK) / (float(bal.defK) + max(0.0, defn))


func _gear_src(src: String) -> bool:
	if gf == "rust":
		return src == "oxido"
	if gf == "tesla":
		return src == "tesla"
	if gf == "escapement":
		return src == "ataque" or src == "reloj"
	if gf == "salvage":
		return src == "ataque"
	return src == gf


func _deal(amt: float, src: String, attack: bool, dot: bool, pierce: bool) -> int:
	var m := 1.0 + h.md("dmgPct")
	if _gear_src(src):
		if gf == "escapement" and src == "ataque":
			m += float(bal.gearHitBonus)
		elif gf == "vapor":
			m += float(bal.gearVapor)
		elif gf == "rust":
			m += float(bal.gearRust)
		elif gf == "tesla":
			m += float(bal.gearTesla)
		elif gf == "salvage":
			m += float(bal.gearSalvageHit)
		elif gf == "auto":
			m += float(bal.gearAuto)
		elif gf == "remache":
			m += float(bal.gearRemache)
		elif gf == "reso":
			m += float(bal.gearReso)
		else:
			m += float(bal.gearBonus)
		m += float(h.tool_bonus)
	if float(e.poison) >= 16.0:
		m += sv("o_corr")
	if int(e.burn) > 0:
		m += sv("v_presion")
	if float(e.hp) > float(e.maxHp) * 0.7:
		m += sv("a_volatil")
	if attack and float(e.hp) < float(e.maxHp) * 0.3:
		m += sv("e_cizalla")
	if not attack:
		m *= float(bal.skillMult)
	if not dot and not pierce:
		m *= _def_mult(_enemy_def())
	var dealt := maxi(1, JsMath.js_round(amt * m))
	e.hp = float(e.hp) - float(dealt)
	dmg[src] = float(dmg.get(src, 0.0)) + float(dealt)
	return dealt


func _cure(amt: float) -> float:
	amt *= heal_mult
	var real: float = maxf(0.0, minf(h.max_hp - h.hp, amt))
	h.hp += real
	if lv("a_piedra") > 0 and amt > real:
		shield += amt - real
	if forja and real >= 1.0:
		shield += real * 0.35
	if aurea and real >= 1.0 and float(e.hp) > 0.0 and not in_cure:
		in_cure = true
		var dealt := _deal(real * sv("a_aurea"), "alquimia", false, false, true)
		in_cure = false
		_log("heal", "Golden Transmutation: " + str(dealt) + " damage")
	return real


func _add_mag(n: float) -> void:
	e.mag = min(20.0, float(e.mag) + n)


func _detonate() -> void:
	var th := float(bal.resTh) - sv("s_armonico")
	while float(e.res) >= th and float(e.hp) > 0.0:
		e.res = float(e.res) - th
		detos += 1
		var nota := lv("s_nota") > 0 and detos > 4
		var pct := float(bal.detonK) * (1.0 + sv("s_campana") + (0.5 if lv("s_diapason") >= 5 else 0.0) + (sv("s_nota") if nota else 0.0)) * (1.0 + sv("y_vibra"))
		var dealt := _deal(_atk_now() * pct, "reso", false, false, true)
		if lv("s_grieta") > 0:
			def_loss += sv("s_grieta")
		if lv("s_vibrato") > 0 and vib < 5:
			vib += 1
		if lv("y_campanario") > 0:
			shield += float(ST.def) * sv("y_campanario") + 3.0
		var stunned := ""
		if lv("s_diapason") >= 3 or nota:
			e.stun = maxi(int(e.stun), 1)
			stunned = " · stunned!"
		e.res = float(e.res) + sv("s_eco")
		_log("reso", ("Impossible Note: " if nota else "Resonance detonation: ") + str(dealt) + stunned)


func _add_res(v: float) -> void:
	if v > 0.0 and float(e.hp) > 0.0:
		e.res = float(e.res) + v
		_detonate()


func _bolt(pct: float, label: String) -> void:
	var n := 1
	while n < 4 and rng.nextf() < sv("t_arco"):
		n += 1
	for i in n:
		if float(e.hp) <= 0.0:
			break
		var amt := _atk_now() * pct * (1.0 + sv("y_electro")) * (1.0 + sv("t_sobrecarga")) * (1.0 + sv("t_corona"))
		var cr := lv("t_estatica") > 0 and rng.nextf() < sv("t_estatica")
		if cr:
			amt *= _crit_dmg_now()
		var dealt := _deal(amt, "tesla", false, false, lv("t_corona") > 0)
		bolts += 1
		if lv("t_cond") > 0:
			cond_stacks = mini(20, cond_stacks + 1)
		if lv("y_galvano") > 0:
			e.poison = float(e.poison) + sv("y_galvano")
		var stunned := ""
		if rng.nextf() < sv("t_corto"):
			e.stun = maxi(int(e.stun), 1)
			stunned = " · stunned!"
		_log("bolt", label + (" (arc)" if i else "") + ": " + str(dealt) + " discharge" + (" CRITICAL" if cr else "") + stunned)
		_add_res(sv("y_bobres"))
	if lv("t_replica") > 0 and float(e.hp) > 0.0:
		var echo := _deal(_atk_now() * sv("t_replica") * (1.0 + sv("y_electro")) * (1.0 + sv("t_sobrecarga")), "tesla", false, false, lv("t_corona") > 0)
		bolts += 1
		_log("bolt", "Aftershock: " + str(echo))
		_add_res(sv("y_bobres"))


func _n_auto() -> int:
	var helpers := 0
	if lv("u_ayudante") > 0:
		helpers = 2 if lv("u_ayudante") >= 5 else 1
	var extra := 1 if (lv("u_ejercito") > 0 and minis >= 3) else minis
	return helpers + extra


func _automatons(mult: float, label: String) -> void:
	var total := 0
	var am := (1.0 + sv("u_mant") + (sv("y_turbina") if int(e.burn) > 0 else 0.0)) * mult
	var ac := (_crit_now() if lv("u_ayudante") >= 3 else 0.0) + sv("u_tornillos")
	if lv("u_ayudante") > 0 and float(e.hp) > 0.0:
		var base := _atk_now() * sv("u_ayudante") * (1.5 if lv("u_ayudante") >= 5 else 1.0) * am
		if ac > 0.0 and rng.nextf() < ac:
			base *= _crit_dmg_now()
		total += _deal(base, "auto", false, false, false)
	if minis > 0 and float(e.hp) > 0.0:
		var base2: float
		var pierce := false
		if lv("u_ejercito") > 0 and minis >= 3:
			base2 = _atk_now() * sv("u_ejercito") * am
			pierce = true
		else:
			base2 = _atk_now() * sv("u_linea") * float(minis) * am
		if ac > 0.0 and rng.nextf() < ac:
			base2 *= _crit_dmg_now()
		total += _deal(base2, "auto", false, false, pierce)
	if total > 0:
		_log("auto", label + ": " + str(total))
		if lv("y_alqauto") > 0:
			_cure(float(total) * sv("y_alqauto"))


func _strike(label: String, src: String, extra: bool, mult: float) -> void:
	swing += 1
	if not (extra and lv("c_minutero") > 0):
		if rng.nextf() >= _hit_chance(float(ST.acc), float(e.eva)):
			misses += 1
			_log("miss", label + ": Miss! (" + str(e.name) + " dodges)")
			return
	var crit := rng.nextf() < _crit_now() or (extra and lv("y_ancora") > 0)
	var meca := crit and lv("e_mecanismo") > 0 and _crit_now() >= 0.4
	# Sharpened Teeth carries most of the old wrench bonus. Other Escapement
	# skills cover the same ground until that skill is raised, so a secondary
	# hit build is not stuck at the 0.6 hit multiplier.
	var teeth := sv("e_afilado")
	var kit := 0.15 * float(mini(h.fam_count("escapement"), 5))
	var amp := teeth if teeth > kit else kit
	var amt := _atk_now() * (0.9 + rng.nextf() * 0.2) * mult * (float(bal.extraMult) if extra else float(bal.hitMult)) * (1.0 + amp)
	if lv("o_capa") > 0 and float(e.poison) > 0.0:
		amt += _atk_now() * float(e.poison) * sv("o_capa")
	if lv("sa_rebaba") > 0:
		amt += (_atk_now() + shield) * sv("sa_rebaba")
	if crit:
		amt *= _crit_dmg_now() + (sv("y_ancora") if extra else 0.0) + (sv("e_mecanismo") if meca else 0.0)
	if swing % 3 == 0:
		amt *= 1.0 + sv("c_pendulo")
	if lv("r_mamparo") > 0:
		amt += shield * 0.1
	var dealt := _deal(amt, src, true, false, crit and lv("e_martillo") >= 3)
	var more := ""
	if meca and float(e.hp) > 0.0:
		more += " + " + str(_deal(amt * 0.5, src, true, false, lv("e_martillo") >= 3)) + " (mechanism)"
	if lv("r_remachadora") > 0 and float(ST.def) > 0.0 and float(e.hp) > 0.0:
		more += " + " + str(_deal(float(ST.def) * sv("r_remachadora"), "remache", false, false, false)) + " (riveter)"
	_log("crit" if crit else "hit", label + (" CRITICAL" if crit else "") + ": " + str(dealt) + more)
	if str(e.trait) == "espinas":
		var back := JsMath.js_round(float(dealt) * 0.08)
		if back > 0:
			h.hp -= back
			_log("enemy", str(e.name) + "'s thorns: " + str(back))
	if lv("y_dinamo") > 0:
		_cure(float(dealt) * sv("y_dinamo"))
	if lv("o_gota") > 0:
		e.poison = float(e.poison) + sv("o_gota") * (2.0 if crit and lv("o_gota") >= 3 else 1.0)
	if crit and lv("y_lima") > 0:
		e.poison = float(e.poison) + sv("y_lima")
	if lv("v_chorro") > 0:
		var rolled := rng.nextf() < sv("v_chorro")
		if rolled or (crit and lv("v_chorro") >= 5):
			e.burn = maxi(int(e.burn), 4 if lv("v_chorro") >= 3 else 3)
			_log("burn", "Scalded!")
	if lv("m_iman") > 0:
		_add_mag(1)
	if float(e.hp) > 0.0 and lv("t_chispazo") > 0:
		var spark := rng.nextf() < sv("t_chispazo")
		if spark or (swing == 1 and lv("t_chispazo") >= 5):
			_bolt(1.2 if lv("t_chispazo") >= 3 else 1.0, "Spark")
	if float(e.hp) > 0.0 and crit and lv("y_chispaprec") > 0:
		_bolt(sv("y_chispaprec"), "Precision Spark")
	if float(e.hp) > 0.0 and lv("t_tormenta") > 0 and bolts >= 8:
		_bolt(sv("t_tormenta"), "Living Arc")
	if lv("s_diapason") > 0:
		_add_res(sv("s_diapason"))


func _extra(mult: float, label: String) -> void:
	if lv("y_pendmag") > 0:
		_add_mag(2)
	var m := mult * (1.5 if lv("c_cuerda") >= 5 else 1.0) * (1.0 + sv("c_minutero")) * (1.0 + sv("y_pendmag") * float(e.mag))
	_strike(label, "reloj", true, m)
	if lv("c_campanada") > 0 and float(e.hp) > 0.0:
		var dealt := _deal(_atk_now() * sv("c_campanada"), "reloj", false, false, true)
		_log("hit", "Chime: " + str(dealt))
	if lv("c_volante") > 0:
		volante = mini(10, volante + 1)
	if lv("y_sincro") > 0:
		_automatons(sv("y_sincro"), "Synced automata")


func _save() -> bool:
	if lv("v_reserva") > 0 and not revived:
		revived = true
		h.hp = float(JsMath.js_round(h.max_hp * sv("v_reserva")))
		_log("heal", "Reserve boiler! You restart with " + str(int(h.hp)) + " HP")
		return true
	return false


func _lost_turn() -> void:
	if lv("c_retroceso") > 0:
		tempo += sv("c_retroceso")


func _enemy_hit(hm: float, heavy: bool) -> void:
	if first_miss:
		first_miss = false
		_log("info", "Second of grace: the first attack misses")
		return
	if rng.nextf() < sv("m_polar"):
		_log("info", "You deflect " + str(e.name) + "'s attack")
		return
	var evasion := float(ST.eva) + float(vib) * sv("s_vibrato")
	var acc := float(e.acc) - (sv("v_hervor") if int(e.burn) > 0 else 0.0)
	if rng.nextf() >= _hit_chance(acc, evasion):
		dodges += 1
		_log("miss", "You dodge " + str(e.name) + "'s attack")
		if lv("t_pararrayos") > 0 and float(e.hp) > 0.0:
			_bolt(sv("t_pararrayos"), "Lightning Rod")
		if lv("u_resortes") > 0 and float(e.hp) > 0.0:
			_automatons(sv("u_resortes"), "Springs")
		return
	var raw := float(e.atk) * (1.25 if e.enraged else 1.0) * heat * hm * (0.9 + rng.nextf() * 0.2) * (1.0 + h.md("enemyAtk")) * (1.0 - _atk_down())
	if h.hp < h.max_hp * 0.5:
		raw *= 1.0 - sv("sa_coraza")
	if int(e.burn) > 0:
		raw *= 1.0 - sv("y_dilatado")
	raw *= max(0.3, 1.0 - sv("r_doble") + h.md("dmgTaken"))
	var dm := _def_mult(float(ST.def))
	var dmg_n := raw * dm
	var blocked := raw - dmg_n
	var esc := dmg_n * sv("u_escudero")
	dmg_n -= esc
	var absorbed := 0.0
	if shield > 0.0:
		absorbed = min(shield, dmg_n)
		shield -= absorbed
		dmg_n -= absorbed
	var dealt := JsMath.js_round(dmg_n)
	h.hp -= dealt
	var bits := str(e.name) + (" HEAVY HIT" if heavy else " attacks") + ": " + str(dealt)
	if blocked >= 1.0:
		bits += " (" + str(JsMath.js_round(blocked)) + " stopped by Defense)"
	if absorbed >= 1.0:
		bits += " (" + str(JsMath.js_round(absorbed)) + " to the shield)"
	if esc >= 1.0:
		bits += " (" + str(JsMath.js_round(esc)) + " to the squire)"
	_log("enemy", bits)
	if fortaleza and float(e.hp) > 0.0 and blocked + absorbed >= 1.0:
		var back := _deal((blocked + absorbed) * sv("r_fortaleza"), "remache", false, false, true)
		_log("thorns", "Walking Fortress: " + str(back))
	if lv("r_puntas") > 0 and float(e.hp) > 0.0:
		var riv := _deal(raw * sv("r_puntas"), "remache", false, false, lv("r_puntas") >= 5)
		_log("thorns", "Rivets: " + str(riv))
	if float(e.hp) > 0.0 and rng.nextf() < sv("y_muelle"):
		var spring := _deal(_atk_now(), "remache", false, false, false)
		_log("thorns", "Recoil spring: " + str(spring))
	if float(e.hp) > 0.0 and rng.nextf() < sv("y_tierra"):
		_bolt(0.8, "Ground Wire")
	if h.hp > 0.0 and plancha2 and h.hp < h.max_hp * 0.5:
		plancha2 = false
		var sh := h.max_hp * sv("r_plancha")
		shield += sh
		_log("shield", "The plate recharges: +" + str(JsMath.js_round(sh)))
	if h.hp > 0.0 and flasks > 0 and h.hp < h.max_hp * 0.4:
		flasks -= 1
		var got := _cure(h.max_hp * sv("a_frasco"))
		_log("heal", "Emergency flask: +" + str(JsMath.js_round(got)))
	if h.hp > 0.0 and not stopped and lv("c_parada") > 0 and h.hp < h.max_hp * 0.3:
		stopped = true
		e.stun = float(e.stun) + sv("c_parada")
		_log("info", "Stop time! " + str(e.name) + " loses " + JsMath.fmt_n(sv("c_parada")) + " turn(s)")
