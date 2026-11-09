extends RefCounted

const JsMath = preload("res://scripts/logic/jsmath.gd")
const SeededRng = preload("res://scripts/logic/rng.gd")
const ContentDB = preload("res://scripts/logic/content.gd")
const HeroState = preload("res://scripts/logic/hero.gd")
const Rules = preload("res://scripts/logic/rules.gd")
const BattleSim = preload("res://scripts/logic/battle.gd")

## Headless balance sim. Bots and metrics match reference/simulador.js.

const POLICIES := {
	"random": "aleatorio",
	"aleatorio": "aleatorio",
	"greedy": "codicioso",
	"codicioso": "codicioso",
	"rarity": "rareza",
	"rareza": "rareza",
}


static func run_all(db: ContentDB, n: int, policies: Array, profile = null) -> Dictionary:
	var results: Array = []
	for pol in policies:
		results.append(simulate(db, n, str(pol), profile))
	return {"runs": n, "results": results}


static func simulate(db: ContentDB, n: int, policy: String, profile = null) -> Dictionary:
	var pol := str(POLICIES.get(policy, policy))
	var agg := {
		"turns": {},
		"dmg": {},
		"events": {},
		"evCat": {},
		"eventDeaths": 0,
		"camp": {},
		"misses": 0,
		"dodges": 0,
	}
	var fin := {"atk": 0.0, "def": 0.0, "crit": 0.0, "critDmg": 0.0, "eva": 0.0, "acc": 0.0, "maxHp": 0.0, "buys": 0.0, "coinsLeft": 0.0, "n": 0}
	var rar_pick := {}
	var wins := 0
	var by_gear := {}
	var deaths := {}
	var seg := {"1-14": 0, "15 minijefe": 0, "16-29": 0, "30 jefe": 0}
	var sk := {}
	var dom := {}
	var fights_tot := 0
	var skills_lv := 0
	for r in n:
		var o: Dictionary = run_one(db, r, pol, agg, profile)
		fights_tot += int(o.fights)
		var S: Dictionary = o.hero.stats()
		for k in ["atk", "def", "crit", "critDmg", "eva", "acc", "maxHp"]:
			fin[k] = float(fin[k]) + float(S[k])
		var buys := 0
		for bk in o.hero.bought.keys():
			buys += int(o.hero.bought[bk])
		fin.buys = float(fin.buys) + float(buys)
		fin.coinsLeft = float(fin.coinsLeft) + float(o.hero.coins)
		fin.n = int(fin.n) + 1
		for id in o.picked.keys():
			var rr := str(db.skill_by_id[id].rarity)
			rar_pick[rr] = int(rar_pick.get(rr, 0)) + int(o.picked[id])
		if o.win:
			wins += 1
		if not by_gear.has(o.gear):
			by_gear[o.gear] = {"n": 0, "w": 0}
		by_gear[o.gear].n += 1
		if o.win:
			by_gear[o.gear].w += 1
		if o.death != null:
			var dstep := int(o.death)
			deaths[dstep] = int(deaths.get(dstep, 0)) + 1
			var key := "1-14" if dstep <= 14 else ("15 minijefe" if dstep == 15 else ("16-29" if dstep < 30 else "30 jefe"))
			seg[key] = int(seg[key]) + 1
		for id in o.offered.keys():
			if not sk.has(id):
				sk[id] = {"offered": 0, "picked": 0, "runs": 0, "wins": 0}
			sk[id].offered += int(o.offered[id])
		for id in o.picked.keys():
			if not sk.has(id):
				sk[id] = {"offered": 0, "picked": 0, "runs": 0, "wins": 0}
			sk[id].picked += int(o.picked[id])
		for id in o.hero.skills.keys():
			if not sk.has(id):
				sk[id] = {"offered": 0, "picked": 0, "runs": 0, "wins": 0}
			sk[id].runs += 1
			if o.win:
				sk[id].wins += 1
			skills_lv += int(o.hero.skills[id])
		var lv_by := {}
		for id in o.hero.skills.keys():
			var f := str(db.skill_by_id[id].fam)
			lv_by[f] = int(lv_by.get(f, 0)) + int(o.hero.skills[id])
		var df := ""
		var dn := -1
		for f in lv_by.keys():
			if int(lv_by[f]) > dn:
				dn = int(lv_by[f])
				df = str(f)
		if not dom.has(df):
			dom[df] = {"n": 0, "w": 0}
		dom[df].n += 1
		if o.win:
			dom[df].w += 1
	var turns := {}
	for k in agg.turns.keys():
		var T: Dictionary = agg.turns[k]
		var list: Array = T.list.duplicate()
		list.sort()
		turns[k] = {
			"combates": int(T.n),
			"media": JsMath.to_fixed(float(T.sum) / float(T.n), 1),
			"mediana": list[int(floor(float(list.size()) / 2.0))],
			"p10": list[int(floor(float(list.size()) * 0.1))],
			"p90": list[int(floor(float(list.size()) * 0.9))],
			"victorias": JsMath.to_fixed(float(T.wins) / float(T.n) * 100.0, 1),
		}
	var skills: Array = []
	for id in sk.keys():
		var s: Dictionary = sk[id]
		var def: Dictionary = db.skill_by_id[id]
		skills.append({
			"id": id,
			"name": def.name,
			"fam": def.fam,
			"syn": def.has("syn"),
			"rarity": def.rarity,
			"offered": int(s.offered),
			"picked": int(s.picked),
			"pickRate": JsMath.to_fixed(float(s.picked) / float(s.offered) * 100.0, 1) if int(s.offered) else 0.0,
			"runsWith": int(s.runs),
			"runsPct": JsMath.to_fixed(float(s.runs) / float(n) * 100.0, 1),
			"winRateWith": JsMath.to_fixed(float(s.wins) / float(s.runs) * 100.0, 1) if int(s.runs) else 0.0,
		})
	var total_dmg := 0.0
	for k in agg.dmg.keys():
		total_dmg += float(agg.dmg[k])
	var dmg_share := {}
	for k in agg.dmg.keys():
		dmg_share[k] = JsMath.to_fixed(float(agg.dmg[k]) / total_dmg * 100.0, 1) if total_dmg else 0.0
	var gear_pct := {}
	for k in by_gear.keys():
		gear_pct[k] = {"n": int(by_gear[k].n), "win": JsMath.to_fixed(float(by_gear[k].w) / float(by_gear[k].n) * 100.0, 1)}
	var dom_pct := {}
	for k in dom.keys():
		dom_pct[k] = {"n": int(dom[k].n), "win": JsMath.to_fixed(float(dom[k].w) / float(dom[k].n) * 100.0, 1)}
	var losses := n - wins
	var seg_pct := {}
	for k in seg.keys():
		seg_pct[k] = JsMath.to_fixed(float(seg[k]) / float(losses) * 100.0, 1) if losses else 0.0
	var final_stats := {}
	for k in fin.keys():
		if k == "n":
			continue
		final_stats[k] = JsMath.to_fixed(float(fin[k]) / float(fin.n), 3)
	return {
		"policy": pol,
		"runs": n,
		"winRate": JsMath.to_fixed(float(wins) / float(n) * 100.0, 1),
		"byGear": gear_pct,
		"byDominantFamily": dom_pct,
		"deathsByStep": deaths,
		"deathSegments": seg_pct,
		"turns": turns,
		"avgFights": JsMath.to_fixed(float(fights_tot) / float(n), 1),
		"avgSkillLevels": JsMath.to_fixed(float(skills_lv) / float(n), 1),
		"dmgShare": dmg_share,
		"events": agg.events,
		"eventDeaths": int(agg.eventDeaths),
		"camp": agg.camp,
		"misses": int(agg.misses),
		"dodges": int(agg.dodges),
		"finalStats": final_stats,
		"rarityPicks": rar_pick,
		"evCat": agg.evCat,
		"skills": skills,
		"tuercas": final_stats.coinsLeft,
	}


static func _family_gear(db: ContentDB, fam_id: String, mode: String, r: int) -> String:
	var own := ""
	var others: Array = []
	for g in db.gears:
		if str(g.fam) == fam_id:
			own = str(g.id)
		else:
			others.append(str(g.id))
	if mode == "off":
		return str(others[r % others.size()])
	return own


static func run_one(db: ContentDB, r: int, pol: String, agg: Dictionary, profile = null) -> Dictionary:
	var seed := "SIM-" + str(r)
	var gear := str(db.gears[r % db.gears.size()].id)
	# fam:<id>:on and fam:<id>:off share a bot seed. Off-gear rotates the other tools.
	var focus := ""
	var family_pick := false
	if pol.begins_with("fam:"):
		var bits := pol.split(":")
		var fam_id := str(bits[1])
		var mode := str(bits[2]) if bits.size() > 2 else "on"
		gear = _family_gear(db, fam_id, mode, r)
		focus = fam_id
		family_pick = true
		pol = "fam:" + fam_id
	if profile != null and not family_pick:
		var open_tools: Array = profile.unlocked_tool_ids()
		if open_tools.size() > 0:
			gear = str(open_tools[r % open_tools.size()])
	var h = HeroState.create(db, gear, profile)
	h.focus_fam = focus
	var rng_o := SeededRng.new(seed + "|ofertas")
	var rng_e := SeededRng.new(seed + "|eventos")
	var rng_en := SeededRng.new(seed + "|enemigos")
	var rng_b := SeededRng.new(seed + "|bot|" + pol)
	var offered := {}
	var picked := {}
	var used: Array = []
	var death = null
	var box := {"fights": 0}
	_do_offer(h, "normal", pol, rng_o, rng_b, offered, picked)
	var steps: Array = db.chapter
	for i in steps.size():
		if death != null:
			break
		var k := str(steps[i])
		var step := i + 1
		var fk := Rules.fight_kind(k)
		if fk != "":
			if not _resolve_fight(db, h, seed, step, 0, fk, pol, rng_o, rng_b, rng_en, offered, picked, agg, box):
				death = step
			continue
		if k == "evento":
			var ev: Dictionary = Rules.pick_event(h, step, used, rng_e)
			used.append(ev.id)
			var ch: Dictionary = _choose_event(h, ev, pol, rng_b)
			var b := 1
			while ev.get("shop") and ch.fx.get("buy") and b < int(db.bal.shopMax):
				h.apply_fx(ch.fx, rng_e)
				var ek := str(ev.id) + ":" + str(ch.id)
				agg.events[ek] = int(agg.events.get(ek, 0)) + 1
				ch = _choose_event(h, ev, pol, rng_b)
				b += 1
			var ek2 := str(ev.id) + ":" + str(ch.id)
			agg.events[ek2] = int(agg.events.get(ek2, 0)) + 1
			agg.evCat[str(ev.cat)] = int(agg.evCat.get(ev.cat, 0)) + 1
			var res: Dictionary = h.apply_fx(ch.fx, rng_e)
			if str(res.fight) != "" and not _resolve_fight(db, h, seed, step, 1, str(res.fight), pol, rng_o, rng_b, rng_en, offered, picked, agg, box):
				death = step
				agg.eventDeaths = int(agg.eventDeaths) + 1
				continue
			for m in res.offers:
				_do_offer(h, str(m), pol, rng_o, rng_b, offered, picked)
			if h.hp <= 0.0:
				death = step
			continue
		if k == "mercader":
			var rng_m := SeededRng.new(seed + "|mercader|" + str(step))
			_run_merchant(db, h, step, pol, rng_b, rng_m, offered, picked)
			continue
		if k == "campamento":
			var c := _choose_camp(h, pol, rng_b)
			agg.camp[str(c.id)] = int(agg.camp.get(c.id, 0)) + 1
			h.apply_fx(c.fx, rng_e)
	return {"win": death == null, "death": death, "gear": gear, "hero": h, "offered": offered, "picked": picked, "fights": int(box.fights)}


static func _run_merchant(db: ContentDB, h: HeroState, step: int, pol: String, rng_b: SeededRng, rng_m: SeededRng, offered: Dictionary, picked: Dictionary) -> void:
	var visit := Rules.open_merchant(db, h, step, rng_m)
	for _guard in 12:
		var action := _merchant_action(h, visit, pol, rng_b)
		if str(action.get("kind", "leave")) == "leave":
			break
		var ok := false
		if action.kind == "stat":
			ok = Rules.buy_merchant_stat(db, h, visit, int(action.index), rng_m)
		elif action.kind == "skill":
			ok = Rules.buy_merchant_skill(db, h, visit, int(action.index))
		elif action.kind == "refresh":
			ok = Rules.refresh_merchant(db, h, visit, rng_m)
		if not ok:
			break
	for card in visit.skills:
		if str(card.kind) != "skill":
			continue
		offered[card.id] = int(offered.get(card.id, 0)) + 1
		if card.get("taken"):
			picked[card.id] = int(picked.get(card.id, 0)) + 1


static func _resolve_fight(db: ContentDB, h: HeroState, seed: String, step: int, sub: int, kind: String, pol: String, rng_o: SeededRng, rng_b: SeededRng, rng_en: SeededRng, offered: Dictionary, picked: Dictionary, agg: Dictionary, box: Dictionary) -> bool:
	var enemy := Rules.make_enemy(db, step, kind, rng_en)
	var res: Dictionary = BattleSim.run(db, h, enemy, SeededRng.new(seed + "|combate|" + str(step) + "|" + str(sub)), false)
	box.fights = int(box.fights) + 1
	if not agg.turns.has(kind):
		agg.turns[kind] = {"n": 0, "sum": 0, "wins": 0, "list": []}
	var T: Dictionary = agg.turns[kind]
	T.n += 1
	T.sum += int(res.turns)
	if res.win:
		T.wins += 1
	if T.list.size() < 20000:
		T.list.append(int(res.turns))
	for k in res.dmgBy.keys():
		agg.dmg[k] = float(agg.dmg.get(k, 0.0)) + float(res.dmgBy[k])
	agg.misses += int(res.misses)
	agg.dodges += int(res.dodges)
	if res.win:
		for m in db.rewards[kind]:
			_do_offer(h, str(m), pol, rng_o, rng_b, offered, picked)
	return res.win == true


static func _do_offer(h: HeroState, mode: String, pol: String, rng_o: SeededRng, rng_b: SeededRng, offered: Dictionary, picked: Dictionary) -> void:
	var cards := Rules.make_offer(h, rng_o, mode)
	if pol == "codicioso" or pol.begins_with("fam:"):
		var hunt := 120.0 if pol.begins_with("fam:") else 60.0
		var best := _best_score(h, cards, pol)
		while best < hunt and h.rerolls > 0:
			h.rerolls -= 1
			cards = Rules.make_offer(h, rng_o, mode)
			best = _best_score(h, cards, pol)
	for c in cards:
		if str(c.kind) == "skill":
			offered[c.id] = int(offered.get(c.id, 0)) + 1
	var pick_c: Dictionary
	if pol == "aleatorio":
		pick_c = cards[rng_b.pick_index(cards.size())]
	else:
		var bs := -1e9
		for c in cards:
			var s := _score_card(h, c, pol) + rng_b.nextf() * 0.01
			if s > bs:
				bs = s
				pick_c = c
	if str(pick_c.kind) == "skill":
		picked[pick_c.id] = int(picked.get(pick_c.id, 0)) + 1
	Rules.take_card(h, pick_c)


static func _best_score(h: HeroState, cards: Array, pol: String) -> float:
	var best := -1e9
	for c in cards:
		best = max(best, _score_card(h, c, pol))
	return best


static func _choose_event(h: HeroState, ev: Dictionary, pol: String, rng: SeededRng) -> Dictionary:
	var ok: Array = []
	for c in ev.choices:
		if h.can_choose(c):
			ok.append(c)
	if pol == "aleatorio":
		return ok[rng.pick_index(ok.size())]
	var best: Dictionary = ok[0]
	var bs := -1e9
	for c in ok:
		var s := _score_fx(h, c.fx)
		if s > bs:
			bs = s
			best = c
	return best


static func _choose_camp(h: HeroState, pol: String, rng: SeededRng) -> Dictionary:
	var camp: Dictionary = h.db.camp
	var ok: Array = []
	for c in camp.choices:
		if h.can_choose(c):
			ok.append(c)
	if pol == "aleatorio":
		return ok[rng.pick_index(ok.size())]
	if h.hp / h.max_hp < 0.55:
		return camp.choices[0]
	return camp.choices[1]


static func _merchant_action(h: HeroState, visit: Dictionary, pol: String, rng: SeededRng) -> Dictionary:
	if pol == "aleatorio":
		var bag: Array = [{"kind": "leave"}]
		if int(visit.stat_buys) < int(h.db.merchant.maxStatBuys):
			for i in visit.stats.size():
				if h.coins >= float(visit.stats[i].price):
					bag.append({"kind": "stat", "index": i})
		if not visit.skill_bought:
			for i in visit.skills.size():
				if h.coins >= float(visit.skills[i].price):
					bag.append({"kind": "skill", "index": i})
		if int(visit.refreshes) < int(h.db.merchant.maxRefreshes) and h.coins >= float(Rules.merchant_refresh_price(h.db, visit)):
			bag.append({"kind": "refresh"})
		return bag[rng.pick_index(bag.size())]
	if pol == "rareza":
		return _merchant_rarity(h, visit)
	return _merchant_greedy(h, visit, pol)


static func _merchant_greedy(h: HeroState, visit: Dictionary, pol: String = "codicioso") -> Dictionary:
	if not visit.skill_bought:
		var best_i := -1
		var best_s := -1.0
		for i in visit.skills.size():
			if h.coins < float(visit.skills[i].price):
				continue
			var s := _score_card(h, visit.skills[i], pol)
			if s > best_s:
				best_s = s
				best_i = i
		var can_refresh := int(visit.refreshes) < int(h.db.merchant.maxRefreshes) and h.coins >= float(Rules.merchant_refresh_price(h.db, visit))
		if best_i >= 0 and best_s >= 115.0:
			return {"kind": "skill", "index": best_i}
		if can_refresh and int(visit.refreshes) < 1 and (best_i < 0 or best_s < 115.0):
			return {"kind": "refresh"}
		if best_i >= 0 and best_s >= 110.0:
			return {"kind": "skill", "index": best_i}
	if int(visit.stat_buys) < int(h.db.merchant.maxStatBuys):
		var best_i := -1
		# Spend a fat purse even on a less efficient upgrade.
		var best_ratio := 0.3 if h.coins < 70.0 else 0.14
		for i in visit.stats.size():
			var item: Dictionary = visit.stats[i]
			if h.coins < float(item.price):
				continue
			var fx: Dictionary = item.fx
			var ratio: float = _score_fx(h, fx) / max(1.0, float(item.price))
			if ratio > best_ratio:
				best_ratio = ratio
				best_i = i
		if best_i >= 0:
			return {"kind": "stat", "index": best_i}
	return {"kind": "leave"}


static func _merchant_rarity(h: HeroState, visit: Dictionary) -> Dictionary:
	if not visit.skill_bought:
		var best_i := -1
		var best_rank := -1
		var best_s := -1.0
		var purse := max(1.0, h.coins)
		for i in visit.skills.size():
			var card: Dictionary = visit.skills[i]
			var price := float(card.price)
			if h.coins < price:
				continue
			# Keep enough nuts for a stat unless the skill is most of a small purse.
			if price > purse * 0.55 and purse > 80.0:
				continue
			var rank := int({"comun": 0, "rara": 1, "epica": 2, "legendaria": 3}.get(str(card.rarity), 0))
			var s := _score_card(h, card, "rareza")
			if rank > best_rank or (rank == best_rank and s > best_s):
				best_rank = rank
				best_s = s
				best_i = i
		var refresh_price := float(Rules.merchant_refresh_price(h.db, visit))
		var can_refresh: bool = int(visit.refreshes) < 1 and h.coins - refresh_price >= 36.0
		if best_rank <= 0 and can_refresh:
			return {"kind": "refresh"}
		if best_i >= 0:
			return {"kind": "skill", "index": best_i}
	if int(visit.stat_buys) < int(h.db.merchant.maxStatBuys):
		var best_i := -1
		var best_ratio := 0.2
		for i in visit.stats.size():
			var item: Dictionary = visit.stats[i]
			if h.coins < float(item.price):
				continue
			var fx: Dictionary = item.fx
			var ratio: float = _score_fx(h, fx) / max(1.0, float(item.price))
			if ratio > best_ratio:
				best_ratio = ratio
				best_i = i
		if best_i >= 0:
			return {"kind": "stat", "index": best_i}
	return {"kind": "leave"}


static func _second_fam(h: HeroState) -> String:
	var g := str(h.db.gear_by_id[h.gear].fam)
	var cnt := {}
	for k in h.skills.keys():
		var s: Dictionary = h.db.skill_by_id[k]
		if not s.has("syn") and str(s.fam) != g:
			cnt[s.fam] = int(cnt.get(s.fam, 0)) + int(h.skills[k])
	var best := ""
	var n := 0
	for f in cnt.keys():
		if int(cnt[f]) > n:
			n = int(cnt[f])
			best = str(f)
	return best


static func _score_card(h: HeroState, c: Dictionary, pol: String) -> float:
	if str(c.kind) == "stat":
		return 5.0
	var s: Dictionary = h.db.skill_by_id[c.id]
	var g := str(h.db.gear_by_id[h.gear].fam)
	var f2 := _second_fam(h)
	var rb := float({"comun": 0, "rara": 10, "epica": 25, "legendaria": 40}[str(s.rarity)])
	if pol.begins_with("fam:"):
		var target := pol.substr(4)
		var on_target: bool = str(s.fam) == target or (s.has("syn") and s.syn.has(target))
		var on_gear: bool = str(s.fam) == g or (s.has("syn") and s.syn.has(g))
		if on_target:
			return 130.0 + rb
		if on_gear:
			return 55.0 + rb
		if f2 != "" and (str(s.fam) == f2 or (s.has("syn") and s.syn.has(f2))):
			return 40.0 + rb
		return 22.0 + rb
	if pol == "rareza":
		return rb * 4.0 + (10.0 if h.level(str(c.id)) else 0.0) + (15.0 if s.has("syn") else 0.0)
	if s.has("syn") and s.syn.has(g):
		return 110.0 + rb
	if str(s.fam) == g:
		return 100.0 + rb
	if f2 != "" and (str(s.fam) == f2 or (s.has("syn") and s.syn.has(f2))):
		return 70.0 + rb
	if f2 == "":
		return 45.0 + rb
	return 30.0 + rb


static func _score_fx(h: HeroState, fx: Dictionary) -> float:
	if fx.is_empty():
		return 0.0
	var ratio := h.hp / h.max_hp
	var s := 0.0
	if fx.get("heal"):
		s += float(fx.heal) * 100.0 * (2.0 if ratio < 0.55 else (0.1 if ratio > 0.9 else 0.6))
	if fx.get("hurt"):
		s -= float(fx.hurt) * 80.0 * (2.5 if ratio < 0.5 else 1.0)
	if fx.get("maxHp"):
		s += float(fx.maxHp) * 0.8
	if fx.get("atk"):
		s += float(fx.atk) * 8.0
	if fx.get("crit"):
		s += float(fx.crit) * 150.0
	if fx.get("def"):
		s += float(fx.def) * 2.6
	if fx.get("eva"):
		s += float(fx.eva) * 170.0
	if fx.get("acc"):
		s += float(fx.acc) * 70.0
	if fx.get("critDmg"):
		s += float(fx.critDmg) * 160.0 * max(0.05, float(h.stats().crit))
	if fx.get("buy"):
		s += _score_fx(h, h.db.stat_buy[str(fx.buy)].fx) - float(h.stat_price(str(fx.buy))) * 0.25 * min(1.0, 80.0 / max(1.0, h.coins))
	if fx.get("rerolls"):
		s += float(fx.rerolls) * 6.0
	if fx.get("banish"):
		s += float(fx.banish) * 3.0
	if fx.get("coins"):
		s += float(fx.coins) * 0.25
	if fx.get("offer"):
		var offer_s := {"normal": 20.0, "elite": 30.0, "epica": 40.0}
		s += float(offer_s[str(fx.offer)]) if offer_s.has(str(fx.offer)) else 25.0
	if fx.get("upgrade"):
		s += float(fx.upgrade) * 18.0
	if fx.get("best"):
		s += 22.0
	if fx.get("downgrade"):
		s -= float(fx.downgrade) * 18.0
	if fx.get("upFam"):
		s += 40.0
	if fx.get("bless"):
		s += 5.0 + _score_fx(h, h.db.blessings[str(fx.bless)].fx)
	if fx.get("curse"):
		s -= 15.0
	if fx.get("uncurse"):
		s += 20.0
	if str(fx.get("fight", "")) == "elite":
		s += 15.0 if ratio > 0.6 else -40.0
	if str(fx.get("fight", "")) == "normal":
		s += 8.0 if ratio > 0.4 else -20.0
	if fx.get("gamble"):
		var g: Dictionary = fx.gamble
		s += float(g.p) * _score_fx(h, g.win) + (1.0 - float(g.p)) * _score_fx(h, g.lose)
	if fx.get("refund"):
		s += 10.0
	if fx.get("fuse"):
		s += 25.0
	if fx.get("mods"):
		var W := {
			"atkPct": 250.0, "dmgPct": 250.0, "crit": 150.0, "regen": 1500.0, "postHeal": 200.0,
			"dotPct": 60.0, "firstMiss": 10.0, "tempo": 2.0, "dmgTaken": -300.0, "openBolt": 10.0,
			"enemyAtk": -150.0, "coinPct": 10.0,
		}
		for k in fx.mods.keys():
			s += float(W.get(k, 0.0)) * float(fx.mods[k])
	return s
