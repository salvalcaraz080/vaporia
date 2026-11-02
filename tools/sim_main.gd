extends SceneTree

const ContentDB = preload("res://scripts/logic/content.gd")
const SimCore = preload("res://scripts/logic/sim_core.gd")

## godot --headless --path . -s res://tools/sim_main.gd -- --runs 25 --policies random,greedy,rarity

func _init() -> void:
	var args := OS.get_cmdline_user_args()
	var runs := 25
	var policies := ["random", "greedy", "rarity"]
	var smoke := false
	var trace := false
	var i := 0
	while i < args.size():
		var a := str(args[i])
		if a == "--runs" and i + 1 < args.size():
			runs = int(args[i + 1])
			i += 2
			continue
		if a == "--policies" and i + 1 < args.size():
			policies = str(args[i + 1]).split(",", false)
			i += 2
			continue
		if a == "--smoke":
			smoke = true
		if a == "--trace":
			trace = true
		i += 1
	var db = ContentDB.load_default()
	if db.skills.is_empty():
		push_error("content failed to load")
		quit(1)
		return
	if trace:
		for pol in policies:
			var canon := str(SimCore.POLICIES.get(str(pol), pol))
			for r in runs:
				var agg := {"turns": {}, "dmg": {}, "events": {}, "evCat": {}, "eventDeaths": 0, "camp": {}, "misses": 0, "dodges": 0}
				var o: Dictionary = SimCore.run_one(db, r, canon, agg)
				var parts: PackedStringArray = []
				var ids: Array = o.hero.skills.keys()
				ids.sort()
				for id in ids:
					parts.append(str(id) + ":" + str(int(o.hero.skills[id])))
				var death_s := "null" if o.death == null else str(o.death)
				print("%s %d %d %s %.4f %.4f %.4f %s" % [canon, r, 1 if o.win else 0, death_s, o.hero.coins, o.hero.hp, o.hero.atk, "|".join(parts)])
		quit(0)
		return
	var t0 := Time.get_ticks_msec()
	var out: Dictionary = SimCore.run_all(db, runs, policies)
	var dt := (Time.get_ticks_msec() - t0) / 1000.0
	for res in out.results:
		print("== %s win %s%% | fights %s | skill levels %s | unspent tuercas %s" % [res.policy, res.winRate, res.avgFights, res.avgSkillLevels, res.tuercas])
		print("  deaths: %s" % JSON.stringify(res.deathSegments))
		var death_n := 0
		var worst_pct := 0.0
		var worst_step := 0
		for step_key in res.deathsByStep.keys():
			death_n += int(res.deathsByStep[step_key])
		if death_n > 0:
			for step_key in res.deathsByStep.keys():
				var pct := 100.0 * float(res.deathsByStep[step_key]) / float(death_n)
				if pct > worst_pct:
					worst_pct = pct
					worst_step = int(step_key)
		print("  worst death step %d at %.1f%% of deaths" % [worst_step, worst_pct])
		print("  final: %s" % JSON.stringify(res.finalStats))
		var worst := ""
		if smoke and float(res.winRate) < 0.0:
			worst = "bad"
		if worst != "":
			push_error(worst)
			quit(1)
			return
	print("sim ok in %.1fs (%d runs x %d policies)" % [dt, runs, policies.size()])
	quit(0)
