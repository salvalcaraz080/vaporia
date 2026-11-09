extends RefCounted

var bal: Dictionary
var skills: Array = []
var skill_by_id: Dictionary = {}
var gears: Array = []
var gear_by_id: Dictionary = {}
var families: Array = []
var family_by_id: Dictionary = {}
var rarities: Dictionary = {}
var rarity_order: Array = []
var enemies: Array = []
var elites: Array = []
var mini: Dictionary = {}
var boss: Dictionary = {}
var traits: Dictionary = {}
var stat_buy: Dictionary = {}
var stat_cards: Array = []
var blessings: Dictionary = {}
var curses: Dictionary = {}
var categories: Dictionary = {}
var events: Array = []
var event_by_id: Dictionary = {}
var camp: Dictionary = {}
var chapter: Array = []
var merchant: Dictionary = {}
var rewards: Dictionary = {}
var sources: Dictionary = {}
var stat_info: Array = []
var meta: Dictionary = {}

static var _cache


static func load_default():
	if _cache != null:
		return _cache
	var db = load("res://scripts/logic/content.gd").new()
	db._load()
	_cache = db
	return db


func _load() -> void:
	var res = load("res://data/game.json")
	var data = null
	if res is JSON:
		data = (res as JSON).data
	elif res is Dictionary:
		data = res
	if data == null:
		var raw := FileAccess.get_file_as_string("res://data/game.json")
		data = JSON.parse_string(raw)
	if typeof(data) != TYPE_DICTIONARY:
		push_error("Could not load res://data/game.json")
		return
	bal = data.balance
	skills = data.skills
	for s in skills:
		skill_by_id[s.id] = s
	gears = data.gears
	for g in gears:
		gear_by_id[g.id] = g
	families = data.families
	for f in families:
		family_by_id[f.id] = f
	for r in data.rarities:
		rarities[r.id] = r
		rarity_order.append(r.id)
	enemies = data.enemies
	elites = data.elites
	mini = data.mini
	boss = data.boss
	traits = data.traits
	stat_buy = data.statBuy
	stat_cards = data.statCards
	blessings = data.blessings
	curses = data.curses
	categories = data.categories
	events = data.events
	for ev in events:
		event_by_id[ev.id] = ev
	camp = data.camp
	chapter = data.chapter
	merchant = data.merchant
	rewards = data.rewards
	sources = data.sources
	stat_info = data.statInfo
	meta = data.get("meta", {})


func rarity_of(id: String) -> Dictionary:
	return rarities[id]


func skill(id: String) -> Dictionary:
	return skill_by_id[id]
