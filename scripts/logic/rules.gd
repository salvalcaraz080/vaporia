extends RefCounted

const JsMath = preload("res://scripts/logic/jsmath.gd")
const SeededRng = preload("res://scripts/logic/rng.gd")
const ContentDB = preload("res://scripts/logic/content.gd")
const HeroState = preload("res://scripts/logic/hero.gd")

static func fight_kind(step_kind: String) -> String:
	match step_kind:
		"combate":
			return "normal"
		"elite":
			return "elite"
		"minijefe":
			return "mini"
		"jefe":
			return "boss"
		_:
			return ""


static func make_enemy(db: ContentDB, step: int, kind: String, rng: SeededRng) -> Dictionary:
	var b: Dictionary = db.bal
	var src: Dictionary
	var hp: float
	var atk: float
	var mh := 1.0 + float(b.hpStep) * float(step - 1)
	var ma := 1.0 + float(b.atkStep) * float(step - 1)
	var defv := JsMath.js_round(float(b.enemyDefStep) * float(step - 1))
	var eva := float(b.enemyEva)
	var acc := 0.0
	if kind == "boss":
		src = db.boss
		hp = float(b.bossHp)
		atk = float(b.bossAtk)
		defv = int(b.bossDef)
		acc = float(b.bossAcc)
	elif kind == "mini":
		src = db.mini
		hp = float(b.miniHp)
		atk = float(b.miniAtk)
		defv = int(b.miniDef)
		acc = float(b.bossAcc) / 2.0
	elif kind == "elite":
		src = db.elites[rng.pick_index(db.elites.size())]
		hp = float(b.enemyHp) * mh * float(b.eliteHp)
		atk = float(b.enemyAtk) * ma * float(b.eliteAtk)
	else:
		src = db.enemies[rng.pick_index(db.enemies.size())]
		hp = float(b.enemyHp) * mh
		atk = float(b.enemyAtk) * ma
	var trait_id := str(src.get("trait", ""))
	if trait_id == "blindado":
		defv += int(b.armorDef)
		hp *= 0.85
	if trait_id == "esquiva":
		eva += float(b.evasiveEva)
		hp *= 0.9
	if trait_id == "certero":
		acc += float(b.sureAcc)
	hp = float(JsMath.js_round(hp))
	atk = float(JsMath.js_round(atk * 10.0)) / 10.0
	return {
		"name": str(src.name),
		"kind": kind,
		"trait": trait_id,
		"heavy": int(src.get("heavy", 0)),
		"maxHp": hp,
		"hp": hp,
		"atk": atk,
		"def": defv,
		"eva": eva,
		"acc": acc,
		"poison": 0.0,
		"burn": 0,
		"res": 0.0,
		"mag": 0.0,
		"stun": 0,
		"enraged": false,
	}


static func make_offer(h: HeroState, rng: SeededRng, mode: String) -> Array:
	var db := h.db
	var pool := _candidates(h, mode)
	if pool.size() < 3 and mode == "epica":
		_add_mode(h, pool, "elite")
	if pool.size() < 3 and mode != "normal":
		_add_mode(h, pool, "normal")
	var total := 0.0
	for c in pool:
		total += float(c.w)
	var cards: Array = []
	var count := {}
	var left: Array = pool.duplicate()
	while cards.size() < 3 and left.size() > 0:
		var sumw := 0.0
		for c in left:
			sumw += float(c.w)
		var r := rng.nextf() * sumw
		var i := 0
		while i < left.size() - 1:
			r -= float(left[i].w)
			if r <= 0.0:
				break
			i += 1
		var picked: Dictionary = left[i]
		left.remove_at(i)
		var rarity := str(picked.s.rarity)
		count[rarity] = int(count.get(rarity, 0)) + 1
		if int(count[rarity]) >= int(db.rarities[rarity].perOffer):
			var kept: Array = []
			for x in left:
				if str(x.s.rarity) != rarity:
					kept.append(x)
			left = kept
		var sid := str(picked.s.id)
		var next := h.level(sid) + 1
		cards.append({
			"kind": "skill",
			"id": sid,
			"name": str(picked.s.name),
			"fam": str(picked.s.fam),
			"rarity": rarity,
			"level": next,
			"text": h.skill_text(sid, next),
			"chance": (float(picked.w) / total) if total else 0.0,
		})
	var k := 0
	while cards.size() < 3:
		var st: Dictionary = db.stat_cards[k % db.stat_cards.size()]
		k += 1
		cards.append({
			"kind": "stat",
			"id": str(st.id),
			"name": str(st.name),
			"level": 1,
			"text": str(st.text),
			"chance": 0.0,
		})
	return cards


static func take_card(h: HeroState, card: Dictionary) -> void:
	if str(card.kind) == "skill":
		h.gain(str(card.id))
	else:
		h.apply_stat_card(str(card.id))


static func event_ok(h: HeroState, ev: Dictionary) -> bool:
	var cond := str(ev.get("cond", ""))
	if cond == "":
		return true
	if cond == "curses":
		return h.curses.size() > 0
	if cond.begins_with("skills>="):
		return h.skills.size() >= int(cond.substr(8))
	return true


static func pick_event(h: HeroState, _step: int, used: Array, rng: SeededRng) -> Dictionary:
	var pool: Array = []
	for ev in h.db.events:
		if used.has(ev.id):
			continue
		if event_ok(h, ev):
			pool.append(ev)
	var total := 0.0
	for ev in pool:
		total += _ev_w(h.db, ev)
	var r := rng.nextf() * total
	for ev in pool:
		r -= _ev_w(h.db, ev)
		if r <= 0.0:
			return ev
	return pool[pool.size() - 1]


static func _ev_w(db: ContentDB, ev: Dictionary) -> float:
	var w := float(db.rarities[ev.rarity].weight)
	if ev.get("stat"):
		w *= float(db.bal.statEventW)
	return w


static func _add_mode(h: HeroState, pool: Array, mode: String) -> void:
	for c in _candidates(h, mode):
		var seen := false
		for p in pool:
			if str(p.s.id) == str(c.s.id):
				seen = true
				break
		if not seen:
			pool.append(c)


static func _candidates(h: HeroState, mode: String) -> Array:
	var db := h.db
	var out: Array = []
	var gfam := str(db.gear_by_id[h.gear].fam)
	var fam_mode := db.family_by_id.has(mode)
	for s in db.skills:
		var rarity: Dictionary = db.rarities[s.rarity]
		var sid := str(s.id)
		if h.level(sid) >= int(s.max):
			continue
		if h.banished.has(sid):
			continue
		if s.has("req") and not _any_level(h, s.req):
			continue
		if s.has("syn") and not _all_owned(h, s.syn):
			continue
		if h.level(sid) == 0 and int(rarity.minFam) > 0 and h.fam_count(str(s.fam)) < int(rarity.minFam):
			continue
		if mode == "elite" and str(s.rarity) == "comun":
			continue
		if mode == "epica" and str(s.rarity) != "epica" and str(s.rarity) != "legendaria":
			continue
		if fam_mode and str(s.fam) != mode and not (s.has("syn") and s.syn.has(mode)):
			continue
		var w := float(rarity.weight)
		if str(s.fam) == gfam or (s.has("syn") and s.syn.has(gfam)):
			w *= float(db.bal.gearOfferMult)
		w *= 1.0 + 0.2 * float(mini(h.fam_count(str(s.fam)), 5))
		if h.level(sid) > 0:
			w *= 1.3
		out.append({"s": s, "w": w})
	return out


static func _any_level(h: HeroState, ids: Array) -> bool:
	for id in ids:
		if h.level(str(id)) > 0:
			return true
	return false


static func _all_owned(h: HeroState, fams: Array) -> bool:
	for f in fams:
		if not h.fam_owned(str(f)):
			return false
	return true
