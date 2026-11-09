extends RefCounted

const ContentDB = preload("res://scripts/logic/content.gd")

## Persistent workshop profile. Pure data: the UI writes user://profile.json.
## A missing file, a bad file, or a version we do not know falls back to a fresh profile.

var db: ContentDB
var version := 1
var scrap := 0
var scrap_earned := 0
var tools: Dictionary = {}
var skills: Dictionary = {}
var chassis: Dictionary = {"atk": 0, "hp": 0, "def": 0}
var restrict := true
## When set, a family-on sim rebuilds this budget around the equipped family.
var recenter := false


static func fresh(content: ContentDB):
	var p = load("res://scripts/logic/profile.gd").new()
	p.db = content
	p._fill_defaults()
	return p


static func mid(content: ContentDB):
	var p = fresh(content)
	# About ten runs along the design route, without the late start-level weld.
	p.chassis.atk = 2
	p.chassis.hp = 1
	p.scrap_earned = 520
	var meta: Dictionary = content.meta
	var fourth := "bobina"
	if meta.has("mid") and meta.mid.has("fourthTool"):
		fourth = str(meta.mid.fourthTool)
	if p.tools.has(fourth):
		p.tools[fourth].unlocked = true
	var main_tool := "lima"
	if meta.has("mid") and meta.mid.has("mainTool"):
		main_tool = str(meta.mid.mainTool)
	if p.tools.has(main_tool):
		p.tools[main_tool].rank = 1
	var starters: Array = meta.get("starterSkills", [])
	if starters.size() > 0 and p.skills.has(starters[0]):
		p.skills[starters[0]].effectRank = 1
	for sid in meta.get("midUnlocks", []):
		if p.skills.has(sid):
			p.skills[sid].unlocked = true
	return p


## Same chassis and unlock depth as mid(), pointed at one family so own-gear
## rates compare the families instead of a rust-leaning shopping list.
static func mid_for(content: ContentDB, fam_id: String):
	var p = fresh(content)
	p.chassis.atk = 2
	p.chassis.hp = 1
	p.scrap_earned = 520
	var gear_id := ""
	for g in content.gears:
		if str(g.fam) == fam_id:
			gear_id = str(g.id)
			break
	if gear_id != "" and p.tools.has(gear_id):
		p.tools[gear_id].unlocked = true
		p.tools[gear_id].rank = 1
	var rares := 0
	var start_id := ""
	for s in content.skills:
		if str(s.fam) != fam_id:
			continue
		var sid := str(s.id)
		if not p.skills.has(sid):
			continue
		if start_id == "" and str(s.rarity) == "comun":
			start_id = sid
		if str(s.rarity) == "rara" and rares < 3:
			p.skills[sid].unlocked = true
			rares += 1
	if gear_id != "":
		var g: Dictionary = content.gear_by_id[gear_id]
		start_id = str(g.start)
	if start_id != "" and p.skills.has(start_id):
		p.skills[start_id].effectRank = 1
	return p


## Design ceiling: chassis full, every tool unlocked, five tools at rank 3,
## the whole catalog open, effect rank 1. Start-level ranks stay at 0.
static func capped(content: ContentDB):
	var p = fresh(content)
	p.chassis.atk = 5
	p.chassis.hp = 5
	p.chassis.def = 3
	p.scrap_earned = 2000
	var ranked := 0
	for g in content.gears:
		var id := str(g.id)
		p.tools[id].unlocked = true
		if ranked < 5:
			p.tools[id].rank = 3
			ranked += 1
	var ranked_starts := {}
	var seen := 0
	for g in content.gears:
		if seen >= 5:
			break
		ranked_starts[str(g.start)] = true
		seen += 1
	for s in content.skills:
		var sid := str(s.id)
		p.skills[sid].unlocked = true
		if ranked_starts.has(sid):
			p.skills[sid].effectRank = 1
	# Greedy should play the five ranked tools, not a rank-0 spare.
	p.restrict = true
	return p


static func load_or_default(content: ContentDB):
	var p = fresh(content)
	if not FileAccess.file_exists("user://profile.json"):
		return p
	var raw := FileAccess.get_file_as_string("user://profile.json")
	var parsed = JSON.parse_string(raw)
	if typeof(parsed) != TYPE_DICTIONARY:
		return p
	if int(parsed.get("version", 0)) != 1:
		return p
	p.scrap = maxi(0, int(parsed.get("scrap", 0)))
	p.scrap_earned = maxi(0, int(parsed.get("scrapEarned", 0)))
	var saved_ch: Dictionary = parsed.get("chassis", {})
	for k in ["atk", "hp", "def"]:
		p.chassis[k] = maxi(0, int(saved_ch.get(k, 0)))
	var saved_tools: Dictionary = parsed.get("tools", {})
	for id in p.tools.keys():
		if not saved_tools.has(id):
			continue
		var row: Dictionary = saved_tools[id]
		p.tools[id].unlocked = row.get("unlocked", false) == true
		p.tools[id].rank = maxi(0, int(row.get("rank", 0)))
	var saved_skills: Dictionary = parsed.get("skills", {})
	for id in p.skills.keys():
		if not saved_skills.has(id):
			continue
		var row: Dictionary = saved_skills[id]
		p.skills[id].unlocked = row.get("unlocked", false) == true
		p.skills[id].effectRank = maxi(0, int(row.get("effectRank", 0)))
		p.skills[id].startRank = maxi(0, int(row.get("startRank", 0)))
	return p


func save() -> void:
	var f := FileAccess.open("user://profile.json", FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify(to_dict()))


func to_dict() -> Dictionary:
	return {
		"version": version,
		"scrap": scrap,
		"scrapEarned": scrap_earned,
		"chassis": chassis.duplicate(),
		"tools": tools.duplicate(true),
		"skills": skills.duplicate(true),
	}


func _fill_defaults() -> void:
	var meta: Dictionary = db.meta
	var open_tools := {}
	for id in meta.get("starterTools", []):
		open_tools[str(id)] = true
	if open_tools.is_empty():
		for g in db.gears:
			open_tools[str(g.id)] = true
	for g in db.gears:
		var id := str(g.id)
		tools[id] = {"unlocked": open_tools.has(id), "rank": 0}
	var open_skills := {}
	for id in meta.get("starterSkills", []):
		open_skills[str(id)] = true
	if open_skills.is_empty():
		for s in db.skills:
			open_skills[str(s.id)] = true
	for s in db.skills:
		var id := str(s.id)
		skills[id] = {"unlocked": open_skills.has(id), "effectRank": 0, "startRank": 0}


func skill_unlocked(id: String) -> bool:
	if not restrict:
		return true
	if not skills.has(id):
		return false
	return bool(skills[id].unlocked)


func family_open(fam_id: String) -> bool:
	if not restrict:
		return true
	for g in db.gears:
		if str(g.fam) == fam_id and tool_unlocked(str(g.id)):
			return true
	return false


func tool_unlocked(id: String) -> bool:
	if not restrict:
		return true
	if not tools.has(id):
		return false
	return bool(tools[id].unlocked)


func unlocked_tool_ids() -> Array:
	var out: Array = []
	var ranked_only := false
	for id in tools.keys():
		if int(tools[id].rank) >= 3:
			ranked_only = true
			break
	for g in db.gears:
		var id := str(g.id)
		if not tool_unlocked(id):
			continue
		if ranked_only and int(tools[id].rank) < 3:
			continue
		out.append(id)
	return out


func tool_rank(id: String) -> int:
	if not tools.has(id):
		return 0
	return int(tools[id].rank)


func start_rank(id: String) -> int:
	if not skills.has(id):
		return 0
	return int(skills[id].startRank)


func effect_rank(id: String) -> int:
	if not skills.has(id):
		return 0
	return int(skills[id].effectRank)


func effect_mods(id: String) -> Dictionary:
	var rank := effect_rank(id)
	if rank <= 0 or not db.skill_by_id.has(id):
		return {}
	var sk: Dictionary = db.skill_by_id[id]
	if not sk.has("upgradeEffects"):
		return {}
	var merged := {}
	var effects: Array = sk.upgradeEffects
	for i in mini(rank, effects.size()):
		var row: Dictionary = effects[i]
		var mods: Dictionary = row.get("mods", {})
		for k in mods.keys():
			merged[k] = float(merged.get(k, 0.0)) + float(mods[k])
	return merged


func chassis_atk() -> int:
	return int(chassis.atk) * int(_track("chassis", "atk").get("perRank", 1))


func chassis_hp() -> int:
	return int(chassis.hp) * int(_track("chassis", "hp").get("perRank", 8))


func chassis_def() -> int:
	return int(chassis.def) * int(_track("chassis", "def").get("perRank", 2))


func tool_bonus(gear_id: String) -> float:
	var per := float(db.meta.get("toolRanks", {}).get("bonusPerRank", 0.04))
	return per * float(tool_rank(gear_id))


func start_level_floor(gear_id: String) -> int:
	var at_rank := int(db.meta.get("toolRanks", {}).get("startLevelAtRank", 3))
	if tool_rank(gear_id) >= at_rank:
		return 2
	return 1


func scrap_reward(steps_reached: int, won: bool, nuts: float) -> Dictionary:
	var rules: Dictionary = db.meta.get("scrap", {})
	var per := int(rules.get("perStep", 2))
	var mini_bonus := int(rules.get("miniboss", 15))
	var mini_step := int(rules.get("minibossStep", 15))
	var victory := int(rules.get("victory", 60)) if won else 0
	var progress := maxi(0, steps_reached) * per
	var boss_bit := mini_bonus if steps_reached >= mini_step else 0
	var from_nuts := int(floor(maxf(0.0, nuts) * float(rules.get("nutRate", 0.25))))
	var total := progress + boss_bit + victory + from_nuts
	return {
		"steps": progress,
		"miniboss": boss_bit,
		"victory": victory,
		"nuts": from_nuts,
		"total": total,
	}


func grant(reward: Dictionary) -> void:
	var n := int(reward.get("total", 0))
	scrap += n
	scrap_earned += n


func attack_cost() -> int:
	return _next_cost("chassis", "atk")


func can_buy_attack() -> bool:
	var track := _track("chassis", "atk")
	var have := int(chassis.atk)
	var v1 := int(track.get("v1MaxRank", track.get("maxRank", 1)))
	if have >= v1:
		return false
	var costs: Array = track.get("costs", [])
	if have >= costs.size():
		return false
	return scrap >= int(costs[have])


func buy_attack() -> bool:
	if not can_buy_attack():
		return false
	scrap -= attack_cost()
	chassis.atk = int(chassis.atk) + 1
	return true


func tool_cost() -> int:
	return int(db.meta.get("toolUnlock", {}).get("cost", 40))


func can_buy_tool(id: String) -> bool:
	if not tools.has(id) or tool_unlocked(id):
		return false
	return scrap >= tool_cost()


func buy_tool(id: String) -> bool:
	if not can_buy_tool(id):
		return false
	scrap -= tool_cost()
	tools[id].unlocked = true
	return true


func rank_cost(id: String) -> int:
	var have := tool_rank(id)
	var costs: Array = db.meta.get("toolRanks", {}).get("costs", [])
	if have >= costs.size():
		return 0
	return int(costs[have])


func can_buy_tool_rank(id: String) -> bool:
	if not tool_unlocked(id):
		return false
	var rules: Dictionary = db.meta.get("toolRanks", {})
	var v1_max := int(rules.get("v1MaxRank", 1))
	if tool_rank(id) >= v1_max:
		return false
	var buys := 0
	for tid in tools.keys():
		if int(tools[tid].rank) > 0:
			buys += 1
	if buys >= int(rules.get("v1Buys", 1)) and tool_rank(id) == 0:
		return false
	var costs: Array = rules.get("costs", [])
	if tool_rank(id) >= costs.size():
		return false
	return scrap >= rank_cost(id)


func buy_tool_rank(id: String) -> bool:
	if not can_buy_tool_rank(id):
		return false
	scrap -= rank_cost(id)
	tools[id].rank = int(tools[id].rank) + 1
	return true


func rare_cost() -> int:
	return int(db.meta.get("unlock", {}).get("rara", 25))


func rare_buys() -> int:
	var n := 0
	for s in db.skills:
		if str(s.rarity) != "rara":
			continue
		var id := str(s.id)
		if skills.has(id) and skills[id].unlocked == true:
			var starters: Array = db.meta.get("starterSkills", [])
			if not starters.has(id):
				n += 1
	return n


func can_buy_rare(id: String) -> bool:
	if not skills.has(id) or skill_unlocked(id):
		return false
	var sk: Dictionary = db.skill_by_id[id]
	if str(sk.rarity) != "rara":
		return false
	if not family_open(str(sk.fam)):
		return false
	var cap := int(db.meta.get("unlock", {}).get("v1RareCap", 3))
	if rare_buys() >= cap:
		return false
	return scrap >= rare_cost()


func buy_rare(id: String) -> bool:
	if not can_buy_rare(id):
		return false
	scrap -= rare_cost()
	skills[id].unlocked = true
	return true


func _gate_ok(gate: Dictionary) -> bool:
	if scrap_earned < int(gate.get("minScrapEarned", 0)):
		return false
	var chassis_sum := int(chassis.atk) + int(chassis.hp) + int(chassis.def)
	if chassis_sum < int(gate.get("minChassisRanks", 0)):
		return false
	if unlocked_tool_ids().size() < int(gate.get("minToolsUnlocked", 0)):
		return false
	return true


func can_buy_effect_rank(id: String) -> bool:
	return _can_buy_skill_rank(id, "effects", "effectRank")


func can_buy_start_rank(id: String) -> bool:
	return _can_buy_skill_rank(id, "startLevel", "startRank")


func _can_buy_skill_rank(id: String, block: String, field: String) -> bool:
	if not skill_unlocked(id):
		return false
	var spec: Dictionary = db.meta.get("skillUpgrades", {}).get(block, {})
	if not _gate_ok(spec.get("gate", {})):
		return false
	var have := int(skills[id][field])
	if have >= int(spec.get("maxRank", 0)):
		return false
	var costs: Array = spec.get("costs", [])
	if have >= costs.size():
		return false
	return scrap >= int(costs[have])


func _track(group: String, id: String) -> Dictionary:
	var blob: Dictionary = db.meta.get(group, {})
	var row = blob.get(id, {})
	if typeof(row) != TYPE_DICTIONARY:
		return {}
	return row


func _next_cost(group: String, id: String) -> int:
	var track := _track(group, id)
	var have := int(chassis.get(id, 0))
	var costs: Array = track.get("costs", [])
	if have >= costs.size():
		return 0
	return int(costs[have])
