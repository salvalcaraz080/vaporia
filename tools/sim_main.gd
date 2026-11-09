extends SceneTree

const ContentDB = preload("res://scripts/logic/content.gd")
const SimCore = preload("res://scripts/logic/sim_core.gd")
const Profile = preload("res://scripts/logic/profile.gd")

## godot --headless --path . -s res://tools/sim_main.gd -- --runs 25 --policies random,greedy,rarity

func _init() -> void:
	var args := OS.get_cmdline_user_args()
	var runs := 25
	var policies := ["random", "greedy", "rarity"]
	var smoke := false
	var trace := false
	var matrix := false
	var profile_name := ""
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
		if a == "--matrix":
			matrix = true
		if a == "--profile" and i + 1 < args.size():
			profile_name = str(args[i + 1])
			i += 2
			continue
		i += 1
	var db = ContentDB.load_default()
	if db.skills.is_empty():
		push_error("content failed to load")
		quit(1)
		return
	var profile = null
	if profile_name == "fresh":
		profile = Profile.fresh(db)
	elif profile_name == "mid":
		profile = Profile.mid(db)
		profile.recenter = true
	elif profile_name == "capped":
		profile = Profile.capped(db)
	elif profile_name != "":
		push_error("unknown profile " + profile_name)
		quit(1)
		return
	if profile != null:
		var open_n := 0
		for s in db.skills:
			if profile.skill_unlocked(str(s.id)):
				open_n += 1
		var grown: Dictionary = profile.level_bonus()
		print("profile %s level %d (+%d HP +%d atk +%d def) tools %d skills %d" % [profile_name, profile.character_level(), int(grown.hp), int(grown.atk), int(grown.def), profile.unlocked_tool_ids().size(), open_n])
	if matrix:
		policies = ["greedy"]
		for fam in db.families:
			policies.append("fam:%s:on" % str(fam.id))
			policies.append("fam:%s:off" % str(fam.id))
	if trace:
		for pol in policies:
			var canon := str(SimCore.POLICIES.get(str(pol), pol))
			for r in runs:
				var agg := {"turns": {}, "dmg": {}, "events": {}, "evCat": {}, "eventDeaths": 0, "camp": {}, "misses": 0, "dodges": 0}
				var o: Dictionary = SimCore.run_one(db, r, canon, agg, profile)
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
	var out: Dictionary = SimCore.run_all(db, runs, policies, profile)
	var dt := (Time.get_ticks_msec() - t0) / 1000.0
	for res in out.results:
		var tag: String = str(res.policy) if profile_name == "" else "%s/%s" % [profile_name, res.policy]
		print("TABLE %s %s" % [tag, res.winRate])
		if str(res.policy).begins_with("fam:"):
			var fam_id := str(res.policy).split(":")[1]
			var drafted := 0
			var seen := 0
			for key in res.byDominantFamily.keys():
				seen += int(res.byDominantFamily[key].n)
				if str(key) == fam_id:
					drafted = int(res.byDominantFamily[key].n)
			print("  drafted %s on %d/%d" % [fam_id, drafted, seen])
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
