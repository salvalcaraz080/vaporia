extends SceneTree

const ContentDB = preload("res://scripts/logic/content.gd")
const HeroState = preload("res://scripts/logic/hero.gd")
const Profile = preload("res://scripts/logic/profile.gd")
const Rules = preload("res://scripts/logic/rules.gd")
const SeededRng = preload("res://scripts/logic/rng.gd")

## Fails if a fresh profile can be offered a skill from a family whose tool is locked.


func _init() -> void:
	var db = ContentDB.load_default()
	var profile = Profile.fresh(db)
	var open_fams := {}
	var locked_gear := ""
	for g in db.gears:
		if profile.tool_unlocked(str(g.id)):
			open_fams[str(g.fam)] = true
		elif locked_gear == "":
			locked_gear = str(g.id)
	var bad := 0
	for gid in profile.unlocked_tool_ids():
		var hero = HeroState.create(db, str(gid), profile)
		var rng := SeededRng.new("LOCK|" + str(gid))
		for mode in ["normal", "elite", "rising", "epica"]:
			for _n in 30:
				for card in Rules.make_offer(hero, rng, mode):
					bad += _bad_card(db, card, open_fams)
		var visit: Dictionary = Rules.open_merchant(db, hero, 23, rng)
		for card in visit.skills:
			bad += _bad_card(db, card, open_fams)
	var locked: Dictionary = db.gear_by_id[locked_gear]
	var start_id := str(locked.start)
	var before = HeroState.create(db, str(profile.unlocked_tool_ids()[0]), profile)
	if before.skill_allowed(start_id):
		push_error("starter %s was offered while %s is locked" % [start_id, locked_gear])
		bad += 1
	profile.tools[locked_gear].unlocked = true
	var after = HeroState.create(db, locked_gear, profile)
	if not after.skill_allowed(start_id):
		push_error("starter %s stayed locked after unlocking %s" % [start_id, locked_gear])
		bad += 1
	if bad > 0:
		push_error("locked-family offer check failed (%d)" % bad)
		quit(1)
		return
	print("locked-offer check ok")
	quit(0)


func _bad_card(db, card: Dictionary, open_fams: Dictionary) -> int:
	if str(card.get("kind", "")) != "skill":
		return 0
	var sk: Dictionary = db.skill_by_id[str(card.id)]
	var n := 0
	if not open_fams.has(str(sk.fam)):
		push_error("offered %s from locked family %s" % [sk.id, sk.fam])
		n += 1
	if sk.has("syn"):
		for fam in sk.syn:
			if not open_fams.has(str(fam)):
				push_error("offered %s linked to locked family %s" % [sk.id, fam])
				n += 1
	return n
