extends Control

const ContentDB = preload("res://scripts/logic/content.gd")
const HeroState = preload("res://scripts/logic/hero.gd")
const SeededRng = preload("res://scripts/logic/rng.gd")
const Rules = preload("res://scripts/logic/rules.gd")
const BattleSim = preload("res://scripts/logic/battle.gd")
const JsMath = preload("res://scripts/logic/jsmath.gd")

# Rebels: charcoal, rusted copper, verdigris, furnace orange. Empire gold is the accent.
const COL_BG := Color("1b1814")
const COL_PANEL := Color("2a241c")
const COL_PANEL2 := Color("3a3126")
const COL_LINE := Color("c47a45")
const COL_BRASS := Color("e0b24a")
const COL_TEXT := Color("f6f0e4")
const COL_MUTED := Color("cbbba4")
const COL_HP := Color("7dcea0")
const COL_ENEMY := Color("e07a3d")
const COL_SHIELD := Color("7fb6ff")
const COL_VERDIGRIS := Color("2f8f84")
const RARITY_COLOR := {
	"comun": Color("9aa3b8"),
	"rara": Color("4ea4ff"),
	"epica": Color("c47bff"),
	"legendaria": Color("ffcb5c"),
}

const LOG_COLOR := {
	"hit": "#f6f1e7", "crit": "#ffcb5c", "poison": "#c8743a", "burn": "#d5dee3",
	"bolt": "#4fd1c5", "enemy": "#e8576a", "heal": "#5bd17a", "shield": "#7fb6ff",
	"thorns": "#c5ccd6", "info": "#b7a48e", "reso": "#b48cff", "auto": "#6fa8dc",
	"mag": "#e86a6a", "miss": "#b7a48e",
}

var db
var ui_gear := "lima"
var ui_seed := ""
var hero
var seed := ""
var chapter: Array = []
var step := -1
var rng_offer
var rng_event
var rng_enemy
var used: Array = []
var dmg_all := {}
var turns_sum := 0
var kills := 0
var events_n := 0
var speed := 2
var autoplay := false
var _shot := {}

var _header: VBoxContainer
var _body: VBoxContainer
var _footer: VBoxContainer
var _stage: Control
var _bg: WardBg
var _seed_edit: LineEdit
var _arena: Control
var _player_art: Control
var _enemy_art: Control

var _offer_cards: Array = []
var _offer_mode := ""
var _offer_cb: Callable = Callable()
var _banishing := false

var _combat_log: Array = []
var _combat_i := 0
var _combat_done := false
var _combat_res: Dictionary = {}
var _combat_enemy: Dictionary = {}
var _combat_kind := ""
var _combat_cb: Callable = Callable()
var _combat_after_hp := 0.0
var _hp_bar: ProgressBar
var _ehp_bar: ProgressBar
var _shield_bar: ProgressBar
var _log_box: RichTextLabel
var _status: Label
var _turn_label: Label
var _after: VBoxContainer
var _timer: Timer


func _ready() -> void:
	autoplay = "--autoplay" in OS.get_cmdline_user_args()
	if OS.has_feature("web"):
		var query := str(JavaScriptBridge.eval("window.location.search", true))
		if "autoplay" in query:
			autoplay = true
	var theme := Theme.new()
	theme.set_default_font_size(26)
	theme.set_font_size("font_size", "Label", 26)
	theme.set_font_size("font_size", "Button", 26)
	theme.set_font_size("font_size", "LineEdit", 28)
	theme.set_font_size("normal_font_size", "RichTextLabel", 24)
	set_theme(theme)
	db = ContentDB.load_default()
	ui_seed = _random_seed()
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_build_shell()
	_timer = Timer.new()
	_timer.one_shot = true
	add_child(_timer)
	_timer.timeout.connect(_combat_tick)
	_show_home()


func _build_shell() -> void:
	_bg = WardBg.new()
	_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_bg)
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["margin_left", "margin_right", "margin_top", "margin_bottom"]:
		margin.add_theme_constant_override(side, 16)
	add_child(margin)
	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 10)
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_child(root)
	_header = VBoxContainer.new()
	_header.add_theme_constant_override("separation", 6)
	root.add_child(_header)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	root.add_child(scroll)
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 8)
	scroll.add_child(_body)
	_footer = VBoxContainer.new()
	_footer.add_theme_constant_override("separation", 8)
	root.add_child(_footer)
	_stage = Control.new()
	_stage.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_stage.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_stage)


func _clear(node: Node) -> void:
	while node.get_child_count() > 0:
		var c := node.get_child(0)
		node.remove_child(c)
		c.free()


func _fade() -> void:
	_body.modulate.a = 0.0
	var tw := create_tween()
	tw.tween_property(_body, "modulate:a", 1.0, 0.16)
	_fill_body()


func _fill_body() -> void:
	var scroll := _body.get_parent() as ScrollContainer
	if scroll == null:
		return
	await get_tree().process_frame
	var height := scroll.size.y
	if height > 40.0:
		_body.custom_minimum_size.y = height


func _label(text: String, size := 26, color: Color = COL_TEXT, wrap := true) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if wrap:
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return l


func _panel() -> PanelContainer:
	var p := PanelContainer.new()
	var box := StyleBoxFlat.new()
	box.bg_color = COL_PANEL
	box.border_color = COL_LINE
	box.set_border_width_all(1)
	box.set_corner_radius_all(14)
	box.content_margin_left = 12
	box.content_margin_right = 12
	box.content_margin_top = 10
	box.content_margin_bottom = 10
	p.add_theme_stylebox_override("panel", box)
	return p


func _style_button(b: Button, fill: Color, border: Color, font: Color) -> void:
	for state in ["normal", "hover", "pressed", "disabled"]:
		var box := StyleBoxFlat.new()
		box.bg_color = fill
		box.border_color = border
		box.set_border_width_all(2)
		box.set_corner_radius_all(12)
		box.content_margin_left = 12
		box.content_margin_right = 12
		box.content_margin_top = 10
		box.content_margin_bottom = 10
		if state == "pressed":
			box.bg_color = fill.darkened(0.12)
		elif state == "disabled":
			box.bg_color = fill.darkened(0.25)
		b.add_theme_stylebox_override(state, box)
	b.add_theme_color_override("font_color", font)
	b.add_theme_color_override("font_hover_color", font)
	b.add_theme_color_override("font_pressed_color", font)
	b.add_theme_color_override("font_disabled_color", Color(font, 0.45))
	b.add_theme_font_size_override("font_size", 26)


func _button(text: String, cb: Callable, primary := false) -> Button:
	var b := Button.new()
	b.text = text
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	b.custom_minimum_size = Vector2(0, 72)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if primary:
		_style_button(b, COL_VERDIGRIS, Color("7dcec4"), COL_TEXT)
	else:
		_style_button(b, COL_PANEL2, COL_LINE, COL_TEXT)
	# Rebuild the screen after the click finishes, or the button is freed mid-signal.
	b.pressed.connect(func(): cb.call_deferred())
	return b


func _bar(fill: Color) -> ProgressBar:
	var b := ProgressBar.new()
	b.show_percentage = false
	b.custom_minimum_size = Vector2(0, 26)
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color("0d0b09")
	bg.set_corner_radius_all(6)
	var fg := StyleBoxFlat.new()
	fg.bg_color = fill
	fg.set_corner_radius_all(6)
	b.add_theme_stylebox_override("background", bg)
	b.add_theme_stylebox_override("fill", fg)
	return b


func _random_seed() -> String:
	var words := ["FAROL", "VAPOR", "LATON", "COBRE", "TUERCA", "CALDERA", "REMACHE", "BIELA"]
	return words[randi() % words.size()] + "-" + str(1000 + randi() % 9000)


func _drive(kind: String) -> void:
	if not autoplay:
		return
	_drive_async(kind)


func _drive_async(kind: String) -> void:
	print("SCREEN " + kind)
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	if kind != "end":
		await get_tree().create_timer(0.45).timeout
	if not _shot.has(kind):
		_shot[kind] = true
		var img := get_viewport().get_texture().get_image()
		DirAccess.make_dir_recursive_absolute("/tmp/vaporia-shots")
		img.save_png("/tmp/vaporia-shots/" + kind + ".png")
	match kind:
		"home":
			ui_gear = "lima"
			ui_seed = "FAROL-1234"
			_start_run()
		"offer":
			_take_offer(0)
		"combat":
			_finish_combat()
		"combat_done":
			_press_continue()
		"event":
			_press_first_choice()
		"event_msg":
			_press_continue()
		"merchant":
			_merchant_leave()
		"end":
			print("AUTOPLAY_OK")
			get_tree().quit(0)


# ---------- Home ----------

func _show_home() -> void:
	hero = null
	_clear(_header)
	_clear(_body)
	_clear(_footer)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	var pair := HBoxContainer.new()
	pair.add_theme_constant_override("separation", 4)
	var chispa := ChispaMark.new()
	chispa.custom_minimum_size = Vector2(72, 96)
	var farol := FarolMark.new()
	farol.custom_minimum_size = Vector2(64, 96)
	pair.add_child(chispa)
	pair.add_child(farol)
	row.add_child(pair)
	_sync_zone()
	var title := VBoxContainer.new()
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.add_child(_label("Vaporia", 44, COL_BRASS, false))
	title.add_child(_label("Chapter 1 · The Boiler Ward · 30 steps", 24, COL_TEXT, false))
	row.add_child(title)
	_header.add_child(row)
	var intro := _panel()
	var iv := VBoxContainer.new()
	iv.add_theme_constant_override("separation", 6)
	iv.add_child(_label("Chispa crosses the Boiler Ward with Farolillo, her lantern-snail, bumping along behind. Pick a humble tool. Fights play themselves. Then choose 1 of 3 skills from 7 families, spend nuts on your stats, and make the calls at statues, shrines, merchants, and wagers."))
	iv.add_child(_label("No energy. No ads. No paid wheels.", 22, COL_MUTED))
	intro.add_child(iv)
	_body.add_child(intro)
	_body.add_child(_label("1 · Choose your tool", 22, COL_BRASS))
	for g in db.gears:
		var gid := str(g.id)
		var fam: Dictionary = db.family_by_id[g.fam]
		var b := _button("%s\n%s · %s" % [g.name, fam.name, g.desc], func():
			ui_gear = gid
			if _seed_edit:
				ui_seed = _seed_edit.text
			_show_home()
		)
		var border := COL_BRASS if gid == ui_gear else COL_LINE
		var fill := Color("3a2e18") if gid == ui_gear else COL_PANEL2
		_style_button(b, fill, border, COL_TEXT)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		_body.add_child(b)
	var seed_row := HBoxContainer.new()
	seed_row.add_theme_constant_override("separation", 8)
	_seed_edit = LineEdit.new()
	_seed_edit.text = ui_seed
	_seed_edit.max_length = 24
	_seed_edit.placeholder_text = "Seed"
	_seed_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_seed_edit.custom_minimum_size = Vector2(0, 52)
	_seed_edit.add_theme_color_override("font_color", COL_BRASS)
	_seed_edit.add_theme_font_size_override("font_size", 28)
	seed_row.add_child(_seed_edit)
	var roll := _button("New", func():
		ui_seed = _random_seed()
		ui_gear = ui_gear
		_show_home()
	)
	roll.custom_minimum_size = Vector2(110, 52)
	roll.size_flags_horizontal = Control.SIZE_SHRINK_END
	seed_row.add_child(roll)
	_footer.add_child(seed_row)
	_footer.add_child(_label("Same seed, same choices, same run.", 22, COL_MUTED))
	_footer.add_child(_button("Begin the crossing", func():
		ui_seed = _seed_edit.text if _seed_edit else ui_seed
		_start_run()
	, true))
	_fade()
	_drive("home")


func _start_run() -> void:
	seed = ui_seed.strip_edges().to_upper()
	if seed == "":
		seed = _random_seed()
		ui_seed = seed
	hero = HeroState.create(db, ui_gear)
	chapter = db.chapter
	step = -1
	used = []
	dmg_all = {}
	turns_sum = 0
	kills = 0
	events_n = 0
	rng_offer = SeededRng.new(seed + "|ofertas")
	rng_event = SeededRng.new(seed + "|eventos")
	rng_enemy = SeededRng.new(seed + "|enemigos")
	_offer_chain(["normal"], "Starting skill", _advance)


func _advance() -> void:
	step += 1
	if step >= chapter.size():
		_show_end(true, {})
		return
	var kind := str(chapter[step])
	var fk := Rules.fight_kind(kind)
	if fk != "":
		_start_fight(fk, 0, _advance)
		return
	if kind == "evento":
		var ev: Dictionary = Rules.pick_event(hero, step + 1, used, rng_event)
		used.append(ev.id)
		events_n += 1
		_show_event(ev, 0)
		return
	if kind == "mercader":
		_open_merchant()
		return
	_show_event(db.camp, 0)


# ---------- Header ----------

func _sync_zone() -> void:
	if _bg == null:
		return
	var z := 0
	if step >= 20:
		z = 2
	elif step >= 10:
		z = 1
	if _bg.zone != z:
		_bg.zone = z
		_bg.queue_redraw()


func _rarity_color(id: String) -> Color:
	return RARITY_COLOR.get(id, COL_LINE)


func _zone_name() -> String:
	if step >= 20:
		return "The Citadel"
	if step >= 10:
		return "The Works"
	return "The Streets"


func _paint_header() -> void:
	_sync_zone()
	_clear(_header)
	var gear: Dictionary = db.gear_by_id[hero.gear]
	var fam: Dictionary = db.family_by_id[gear.fam]
	var top := HBoxContainer.new()
	var zone := _label("Boiler Ward · " + _zone_name(), 22, COL_BRASS, false)
	zone.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(zone)
	top.add_child(_label(str(gear.name), 22, Color(str(fam.color)), false))
	_header.add_child(top)
	var shown := maxi(1, step + 1)
	var total := maxi(1, chapter.size())
	var step_l := _label("Step %d / %d" % [shown, total], 40, COL_TEXT, false)
	_header.add_child(step_l)
	var track := StepTrack.new()
	track.chapter = chapter
	track.here = step
	track.custom_minimum_size = Vector2(0, 36)
	_header.add_child(track)
	_header.add_child(_label("Copper merchant · pale camp · gold boss", 18, COL_MUTED, false))
	var hp := _bar(COL_HP)
	hp.max_value = hero.max_hp
	hp.value = max(0.0, hero.hp)
	_header.add_child(hp)
	var flow := HFlowContainer.new()
	flow.add_theme_constant_override("h_separation", 12)
	var st: Dictionary = hero.stats()
	var bits := [
		"HP %d/%d" % [int(round(hero.hp)), int(round(hero.max_hp))],
		"%d nuts" % int(hero.coins),
		"Reroll %d" % hero.rerolls,
		"Banish %d" % hero.banish_n,
		"Atk %s" % JsMath.fmt_n(float(st.atk)),
		"Def %s" % JsMath.fmt_n(float(st.def)),
		"Crit %s" % JsMath.fmt_p(float(st.crit)),
		"Eva %s" % JsMath.fmt_p(float(st.eva)),
		"Acc %s" % JsMath.fmt_p(float(st.acc)),
	]
	for bit in bits:
		var l := _label(bit, 22, COL_MUTED, false)
		l.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		flow.add_child(l)
	_header.add_child(flow)


# ---------- Offers ----------

func _offer_chain(modes: Array, title: String, cb: Callable) -> void:
	if modes.is_empty():
		cb.call()
		return
	var mode := str(modes[0])
	var rest: Array = modes.slice(1)
	var titled := title
	if modes.size() > 1:
		titled = "%s (1 of %d)" % [title, modes.size()]
	_show_offer(mode, titled, func(): _offer_chain(rest, title, cb))


func _show_offer(mode: String, title: String, cb: Callable) -> void:
	_banishing = false
	_offer_mode = mode
	_offer_cb = cb
	_offer_cards = Rules.make_offer(hero, rng_offer, mode)
	_render_offer(title)


func _render_offer(title: String) -> void:
	_paint_header()
	_clear(_body)
	_clear(_footer)
	var sub := ""
	if _offer_mode == "elite":
		sub = "No common skills"
	elif _offer_mode == "epica":
		sub = "Epic or legendary"
	elif db.family_by_id.has(_offer_mode):
		sub = str(db.family_by_id[_offer_mode].name) + " family"
	_body.add_child(_label(title, 24, COL_BRASS))
	if sub != "":
		_body.add_child(_label(sub, 22, COL_MUTED))
	if _banishing:
		_body.add_child(_label("Tap a skill to banish it from this run.", 24, COL_ENEMY))
	for i in _offer_cards.size():
		var card: Dictionary = _offer_cards[i]
		var idx := i
		var rarity := str(card.get("rarity", "comun"))
		var headline := str(card.name)
		if str(card.kind) == "skill":
			var sk: Dictionary = db.skill_by_id[card.id]
			var tag := "new" if int(card.level) == 1 else "Lv %d/%d" % [int(card.level), int(sk.max)]
			var fam_name := str(db.family_by_id[sk.fam].name)
			if sk.has("syn"):
				fam_name = "Synergy"
			headline = "%s · %s · %s" % [db.rarities[rarity].name, fam_name, tag]
			headline = str(card.name) + "\n" + headline
		var b := _button(headline + "\n" + str(card.text), func(): _take_offer(idx))
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.custom_minimum_size = Vector2(0, 156)
		var frame := _rarity_color(rarity) if str(card.kind) == "skill" else COL_LINE
		if _banishing:
			frame = COL_ENEMY
		_style_button(b, COL_PANEL2, frame, COL_TEXT)
		for state in ["normal", "hover", "pressed", "disabled"]:
			var sb: StyleBoxFlat = b.get_theme_stylebox(state)
			if sb:
				sb = sb.duplicate()
				sb.set_border_width_all(4)
				sb.border_color = frame
				b.add_theme_stylebox_override(state, sb)
		var row_card := HBoxContainer.new()
		row_card.add_theme_constant_override("separation", 8)
		row_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		if str(card.kind) == "skill":
			var glyph := FamilyMark.new()
			glyph.fam = str(db.skill_by_id[card.id].fam)
			glyph.tint = Color(str(db.family_by_id[glyph.fam].color))
			glyph.custom_minimum_size = Vector2(44, 44)
			glyph.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			row_card.add_child(glyph)
		b.icon_alignment = HORIZONTAL_ALIGNMENT_LEFT
		row_card.add_child(b)
		_body.add_child(row_card)
		_reveal(row_card, 0.06 * float(i))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	var rr := _button("Reroll (%d)" % hero.rerolls, func():
		if hero.rerolls <= 0:
			return
		hero.rerolls -= 1
		_offer_cards = Rules.make_offer(hero, rng_offer, _offer_mode)
		_render_offer(title)
	)
	rr.disabled = hero.rerolls <= 0
	rr.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var ban := _button("Cancel" if _banishing else "Banish (%d)" % hero.banish_n, func():
		if hero.banish_n <= 0:
			return
		_banishing = not _banishing
		_render_offer(title)
	)
	ban.disabled = hero.banish_n <= 0 and not _banishing
	ban.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(rr)
	row.add_child(ban)
	_footer.add_child(row)
	_footer.add_child(_button("Skip (+10% HP)", func():
		hero.heal_frac(0.1)
		_offer_cb.call()
	))
	_fade()
	_drive("offer")


func _take_offer(i: int) -> void:
	if i < 0 or i >= _offer_cards.size():
		return
	var card: Dictionary = _offer_cards[i]
	if _banishing:
		if str(card.kind) != "skill":
			return
		hero.banished.append(str(card.id))
		hero.banish_n -= 1
		_banishing = false
		_offer_cards = Rules.make_offer(hero, rng_offer, _offer_mode)
		_render_offer("Choose a skill")
		return
	Rules.take_card(hero, card)
	_offer_cb.call()


# ---------- Combat ----------

func _start_fight(kind: String, sub: int, cb: Callable) -> void:
	var enemy: Dictionary = Rules.make_enemy(db, step + 1, kind, rng_enemy)
	var hp0: float = hero.hp
	var res: Dictionary = BattleSim.run(db, hero, enemy, SeededRng.new("%s|combate|%d|%d" % [seed, step + 1, sub]), true)
	for k in res.dmgBy.keys():
		dmg_all[k] = float(dmg_all.get(k, 0.0)) + float(res.dmgBy[k])
	turns_sum += int(res.turns)
	_combat_after_hp = hero.hp
	hero.hp = hp0
	_combat_res = res
	_combat_enemy = enemy
	_combat_kind = kind
	_combat_cb = cb
	_combat_log = res.log
	_combat_i = 0
	_combat_done = false
	_paint_header()
	_clear(_body)
	_clear(_footer)
	var names := {"boss": "BOSS", "mini": "MINIBOSS", "elite": "Elite", "normal": "Fight"}
	var head := HBoxContainer.new()
	head.add_child(_label(names.get(kind, "Fight"), 22, COL_BRASS, false))
	var speeds := HBoxContainer.new()
	speeds.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	speeds.alignment = BoxContainer.ALIGNMENT_END
	for sp in [1, 2, 4, 8]:
		var n := int(sp)
		var b := _button("x%d" % n, func():
			speed = n
		)
		b.custom_minimum_size = Vector2(68, 60)
		b.size_flags_horizontal = Control.SIZE_SHRINK_END
		if n == speed:
			_style_button(b, COL_PANEL2, COL_BRASS, COL_BRASS)
		speeds.add_child(b)
	var skip := _button("Skip", _finish_combat)
	skip.custom_minimum_size = Vector2(110, 60)
	skip.size_flags_horizontal = Control.SIZE_SHRINK_END
	speeds.add_child(skip)
	head.add_child(speeds)
	_body.add_child(head)
	var arena := HBoxContainer.new()
	_arena = arena
	arena.add_theme_constant_override("separation", 8)
	_player_art = _fighter("Chispa", "with Farolillo", COL_BRASS, "chispa")
	arena.add_child(_player_art)
	var vs := _label("VS", 18, COL_MUTED, false)
	vs.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	arena.add_child(vs)
	var trait_txt := ""
	if str(enemy.trait) != "":
		trait_txt = str(db.traits.get(enemy.trait, ""))
	_enemy_art = _fighter(str(enemy.name), trait_txt, _trait_tint(str(enemy.trait)), str(enemy.trait))
	arena.add_child(_enemy_art)
	_body.add_child(arena)
	_hp_bar = _bar(COL_HP)
	_hp_bar.max_value = hero.max_hp
	_hp_bar.value = hp0
	_body.add_child(_hp_bar)
	_shield_bar = _bar(COL_SHIELD)
	_shield_bar.max_value = hero.max_hp
	_shield_bar.value = 0
	_body.add_child(_shield_bar)
	_status = _label("", 22, COL_MUTED)
	_body.add_child(_status)
	_ehp_bar = _bar(COL_ENEMY)
	_ehp_bar.max_value = float(enemy.maxHp)
	_ehp_bar.value = float(enemy.maxHp)
	_body.add_child(_ehp_bar)
	_turn_label = _label("Turn 0", 22, COL_MUTED)
	_turn_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_body.add_child(_turn_label)
	_log_box = RichTextLabel.new()
	_log_box.bbcode_enabled = true
	_log_box.scroll_following = true
	_log_box.custom_minimum_size = Vector2(0, 220)
	_log_box.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_log_box.add_theme_color_override("default_color", COL_TEXT)
	_log_box.add_theme_font_size_override("normal_font_size", 24)
	var log_bg := StyleBoxFlat.new()
	log_bg.bg_color = Color("100e0c")
	log_bg.set_corner_radius_all(10)
	log_bg.content_margin_left = 8
	log_bg.content_margin_right = 8
	log_bg.content_margin_top = 8
	log_bg.content_margin_bottom = 8
	_log_box.add_theme_stylebox_override("normal", log_bg)
	_body.add_child(_log_box)
	_after = VBoxContainer.new()
	_footer.add_child(_after)
	_fade()
	_timer.start(0.2)
	_drive("combat")


func _trait_tint(trait_id: String) -> Color:
	match trait_id:
		"blindado":
			return Color("3f8f86")
		"esquiva":
			return Color("d5e2ea")
		"rapido":
			return Color("e07a3d")
		"regenera":
			return Color("8fbf6a")
		"espinas":
			return Color("c47a45")
		"pesado":
			return Color("5c6a78")
		"certero":
			return Color("e0b24a")
		_:
			return Color("a86848")


func _fighter(name: String, sub: String, col: Color, kind: String) -> VBoxContainer:
	var box := VBoxContainer.new()
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var art: Control
	if kind == "chispa":
		var row := HBoxContainer.new()
		row.alignment = BoxContainer.ALIGNMENT_CENTER
		var c := ChispaMark.new()
		c.custom_minimum_size = Vector2(78, 104)
		var f := FarolMark.new()
		f.custom_minimum_size = Vector2(58, 104)
		row.add_child(c)
		row.add_child(f)
		art = row
	else:
		var e := EnemyMark.new()
		e.kind_id = kind
		e.tint = col
		e.custom_minimum_size = Vector2(96, 104)
		art = e
	box.add_child(art)
	var n := _label(name, 24, COL_TEXT)
	n.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(n)
	if sub != "":
		var s := _label(sub, 22, COL_MUTED)
		s.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		box.add_child(s)
	return box


func _combat_tick() -> void:
	if _combat_done:
		return
	if _combat_i >= _combat_log.size():
		_finish_combat()
		return
	_paint_line(_combat_log[_combat_i], true)
	_combat_i += 1
	_timer.start(0.42 / float(maxi(1, speed)))


func _paint_line(en: Dictionary, shake: bool) -> void:
	var col := str(LOG_COLOR.get(str(en.k), "#f6f1e7"))
	var prefix := ("T%d · " % int(en.turn)) if int(en.turn) else ""
	_log_box.append_text("[color=%s]%s%s[/color]\n" % [col, prefix, str(en.text)])
	_hp_bar.max_value = float(en.maxHp)
	_hp_bar.value = float(en.hp)
	_shield_bar.max_value = float(en.maxHp)
	_shield_bar.value = min(float(en.maxHp), float(en.shield))
	_ehp_bar.max_value = float(_combat_enemy.maxHp)
	_ehp_bar.value = float(en.ehp)
	_turn_label.text = "Turn %d" % int(en.turn)
	var bits := "%d/%d" % [int(en.ehp), int(_combat_enemy.maxHp)]
	if int(en.poison):
		bits += "  rust %d" % int(en.poison)
	if int(en.burn):
		bits += "  scald %d" % int(en.burn)
	if float(en.res) > 0.0:
		bits += "  resonance %s" % JsMath.fmt_n(float(en.res))
	if float(en.mag) > 0.0:
		bits += "  charge %s" % JsMath.fmt_n(float(en.mag))
	_status.text = "You %d/%d" % [int(en.hp), int(en.maxHp)]
	if int(en.shield):
		_status.text += "  shield %d" % int(en.shield)
	_status.text += "\n" + bits
	var kind := str(en.k)
	if shake and kind in ["hit", "crit", "enemy", "bolt", "thorns", "poison", "burn", "reso", "auto", "mag"]:
		var num := _first_number(str(en.text))
		var on_enemy := kind != "enemy" and kind != "thorns"
		var flash_col := COL_BRASS if kind == "crit" else (COL_ENEMY if kind == "enemy" else COL_TEXT)
		if num != "":
			_float_num(num, flash_col, on_enemy)
		if on_enemy:
			_flash(_enemy_art, flash_col)
		else:
			_flash(_player_art, COL_ENEMY)
		_shake(18.0 if kind == "crit" else 8.0)
		if kind == "crit":
			_crit_burst()


func _first_number(text: String) -> String:
	var rx := RegEx.new()
	rx.compile("\\d+")
	var found := rx.search(text)
	if found == null:
		return ""
	return found.get_string()


func _float_num(text: String, color: Color, on_enemy: bool) -> void:
	var lab := Label.new()
	lab.text = text
	lab.add_theme_font_size_override("font_size", 42)
	lab.add_theme_color_override("font_color", color)
	lab.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_stage.add_child(lab)
	var origin := size * 0.5
	if _arena != null:
		origin = _arena.global_position + Vector2(200 if on_enemy else 36, 16)
	lab.global_position = origin
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(lab, "global_position:y", lab.global_position.y - 52.0, 0.45)
	tw.tween_property(lab, "modulate:a", 0.0, 0.45)
	tw.chain().tween_callback(lab.queue_free)


func _flash(node: Control, color: Color) -> void:
	if node == null:
		return
	var prev := node.modulate
	node.modulate = color
	var tw := create_tween()
	tw.tween_property(node, "modulate", prev, 0.18)


func _crit_burst() -> void:
	var burst := CritBurst.new()
	burst.mouse_filter = Control.MOUSE_FILTER_IGNORE
	burst.custom_minimum_size = Vector2(160, 140)
	burst.size = Vector2(160, 140)
	_stage.add_child(burst)
	if _arena != null:
		burst.global_position = _arena.global_position + Vector2(160, 0)


func _reveal(node: Control, delay: float) -> void:
	node.modulate.a = 0.0
	var tw := create_tween()
	tw.tween_interval(delay)
	tw.tween_property(node, "modulate:a", 1.0, 0.22)


func _shake(amount: float = 8.0) -> void:
	var tw := create_tween()
	tw.tween_property(_stage, "position:x", amount, 0.03)
	tw.tween_property(_stage, "position:x", -amount * 0.7, 0.03)
	tw.tween_property(_stage, "position:x", 0.0, 0.05)


func _finish_combat() -> void:
	if _combat_done:
		return
	_combat_done = true
	_timer.stop()
	while _combat_i < _combat_log.size():
		_paint_line(_combat_log[_combat_i], false)
		_combat_i += 1
	hero.hp = _combat_after_hp
	_clear(_after)
	var res := _combat_res
	if not res.win:
		_after.add_child(_button("See the summary", func(): _show_end(false, _combat_enemy), true))
		_drive("combat_done")
		return
	kills += 1
	if _combat_kind == "boss":
		_after.add_child(_button("Chapter cleared", func(): _show_end(true, _combat_enemy), true))
		_drive("combat_done")
		return
	var note := "Won in %d turns · +%d nuts" % [int(res.turns), int(res.coins)]
	_after.add_child(_label(note, 22, COL_MUTED))
	var label := "Choose a skill"
	if _combat_kind == "elite":
		label = "Elite reward"
	elif _combat_kind == "mini":
		label = "The Foreman's spoils"
	var modes: Array = db.rewards[_combat_kind]
	_after.add_child(_button(label, func(): _offer_chain(modes, label, _combat_cb), true))
	_drive("combat_done")


func _press_continue() -> void:
	if _footer.get_child_count() == 0 and _after:
		pass
	var buttons: Array = []
	_collect_buttons(_footer, buttons)
	for b in buttons:
		if not b.disabled:
			b.pressed.emit()
			return


func _collect_buttons(n: Node, out: Array) -> void:
	for c in n.get_children():
		if c is Button:
			out.append(c)
		else:
			_collect_buttons(c, out)


# ---------- Events ----------

func _show_event(ev: Dictionary, bought: int, last_msg := "") -> void:
	_paint_header()
	_clear(_body)
	_clear(_footer)
	var cat := str(db.categories.get(ev.cat, ""))
	if str(ev.rarity) != "comun":
		cat += " · " + str(db.rarities[ev.rarity].name)
	var cat_l := _label(cat.to_upper(), 22, COL_MUTED)
	cat_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_body.add_child(cat_l)
	var title := _label(str(ev.title), 26, COL_BRASS)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_body.add_child(title)
	var text := _label(str(ev.text), 24, COL_TEXT)
	text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_body.add_child(text)
	if ev.get("shop"):
		_body.add_child(_label("Shop: you can buy up to %d times (%d/%d). Each purchase of a stat costs more." % [int(db.bal.shopMax), bought, int(db.bal.shopMax)], 22, COL_MUTED))
	if last_msg != "":
		_body.add_child(_label(last_msg, 24, COL_HP))
	for i in ev.choices.size():
		var c: Dictionary = ev.choices[i]
		var idx: int = i
		var cost: int = hero.choice_cost(c)
		var shop_full: bool = ev.get("shop") == true and c.fx.get("buy") != null and bought >= int(db.bal.shopMax)
		var ok: bool = hero.can_choose(c) and not shop_full
		var label := str(c.label)
		if bought > 0 and ev.get("shop") and str(c.id) == "nada":
			label = "Finish shopping"
		var detail := str(c.detail)
		if not ok:
			detail += " · not enough nuts" if cost and hero.coins < float(cost) else " · sold out"
		var shown := label
		if cost:
			shown = "%s  ·  %d nuts" % [label, cost]
		var b := _button(shown + "\n" + detail, func(): _pick_event(ev, idx, bought))
		b.disabled = not ok
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.custom_minimum_size = Vector2(0, 116)
		_body.add_child(b)
	_fade()
	_drive("event")


func _pick_event(ev: Dictionary, idx: int, bought: int) -> void:
	var c: Dictionary = ev.choices[idx]
	if not hero.can_choose(c):
		return
	var res: Dictionary = hero.apply_fx(c.fx, rng_event)
	if hero.hp <= 0.0:
		_show_end(false, {})
		return
	if ev.get("shop") and c.fx.get("buy") and bought + 1 < int(db.bal.shopMax):
		_show_event(ev, bought + 1, str(res.msg))
		return
	_show_event_msg(ev, res)


func _show_event_msg(ev: Dictionary, res: Dictionary) -> void:
	_paint_header()
	_clear(_body)
	_clear(_footer)
	var title := _label(str(ev.title), 24, COL_BRASS)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_body.add_child(title)
	var msg := _label(str(res.msg), 18, COL_TEXT)
	msg.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_body.add_child(msg)
	var cont := "Continue"
	if str(res.fight) != "":
		cont = "To the fight"
	elif res.offers.size():
		cont = "Choose a reward"
	_footer.add_child(_button(cont, func():
		var after := func(): _offer_chain(res.offers, "Reward: " + str(ev.title), _advance)
		if str(res.fight) != "":
			_start_fight(str(res.fight), 1, after)
		else:
			after.call()
	, true))
	_fade()
	_drive("event_msg")


func _press_first_choice() -> void:
	var buttons: Array = []
	_collect_buttons(_body, buttons)
	for b in buttons:
		if not b.disabled:
			b.pressed.emit()
			return


# ---------- Merchant ----------

var _visit: Dictionary = {}
var _visit_rng: SeededRng
var _visit_note := ""


func _open_merchant() -> void:
	_visit_rng = SeededRng.new("%s|mercader|%d" % [seed, step + 1])
	_visit = Rules.open_merchant(db, hero, step + 1, _visit_rng)
	_visit_note = ""
	_render_merchant()


func _render_merchant() -> void:
	_paint_header()
	_clear(_body)
	_clear(_footer)
	var tier := Rules.merchant_tier(db, step + 1)
	var title := _label(str(db.merchant.title), 26, COL_BRASS)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_body.add_child(title)
	var intro := _label(str(db.merchant.intro), 22, COL_MUTED)
	intro.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_body.add_child(intro)
	_body.add_child(_label("%s. %s" % [str(tier.name), str(tier.blurb)], 24, COL_TEXT))
	_body.add_child(_label("You have %d nuts. Stats %d/%d.%s" % [int(hero.coins), int(_visit.stat_buys), int(db.merchant.maxStatBuys), " Skill bought." if _visit.skill_bought else ""], 24, COL_BRASS))
	if _visit_note != "":
		_body.add_child(_label(_visit_note, 24, COL_HP))
	_body.add_child(_label("Stat upgrades", 20, COL_BRASS))
	for i in _visit.stats.size():
		var item: Dictionary = _visit.stats[i]
		var idx: int = i
		var price := int(item.price)
		var affordable: bool = hero.coins >= float(price) and int(_visit.stat_buys) < int(db.merchant.maxStatBuys)
		var b := _button("%s\n%s\n%d nuts" % [item.name, item.text, price], func(): _buy_stat(idx))
		b.disabled = not affordable
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.custom_minimum_size = Vector2(0, 124)
		_body.add_child(b)
	_body.add_child(_label("One skill", 20, COL_BRASS))
	if _visit.skills.is_empty():
		_body.add_child(_label("Nothing on the pegs.", 22, COL_MUTED))
	for i in _visit.skills.size():
		var card: Dictionary = _visit.skills[i]
		var idx: int = i
		var price := int(card.price)
		var rarity := str(card.get("rarity", "comun"))
		var col := COL_LINE
		if db.rarities.has(rarity):
			col = Color(str(db.rarities[rarity].color))
		var fam := ""
		if db.skill_by_id.has(card.id):
			fam = str(db.family_by_id[db.skill_by_id[card.id].fam].name)
		var affordable: bool = hero.coins >= float(price) and not _visit.skill_bought
		var b := _button("%s\n%s · %s\n%s\n%d nuts" % [card.name, db.rarities[rarity].name, fam, card.text, price], func(): _buy_skill(idx))
		b.disabled = not affordable
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.custom_minimum_size = Vector2(0, 148)
		_style_button(b, COL_PANEL2, col, COL_TEXT)
		_body.add_child(b)
	var refresh_price := Rules.merchant_refresh_price(db, _visit)
	var refreshes_left: int = int(db.merchant.maxRefreshes) - int(_visit.refreshes)
	var refresh := _button("Refresh stock (%d nuts, %d left)" % [refresh_price, refreshes_left], _refresh_merchant)
	refresh.disabled = refreshes_left <= 0 or hero.coins < float(refresh_price)
	_footer.add_child(refresh)
	_footer.add_child(_button("Leave the stall", _merchant_leave, true))
	_fade()
	_drive("merchant")


func _buy_stat(index: int) -> void:
	var item: Dictionary = _visit.stats[index]
	if Rules.buy_merchant_stat(db, hero, _visit, index, _visit_rng):
		_visit_note = "Bought %s." % str(item.name)
		_float_num("-%d" % int(item.price), COL_BRASS, false)
		_shake(6.0)
	_render_merchant()


func _buy_skill(index: int) -> void:
	var card: Dictionary = _visit.skills[index]
	if Rules.buy_merchant_skill(db, hero, _visit, index):
		_visit_note = "Bought %s." % str(card.name)
		_float_num("-%d" % int(card.price), _rarity_color(str(card.get("rarity", "comun"))), true)
		_shake(8.0)
	_render_merchant()


func _refresh_merchant() -> void:
	if Rules.refresh_merchant(db, hero, _visit, _visit_rng):
		_visit_note = "Fresh stock."
	_render_merchant()


func _merchant_leave() -> void:
	_advance()


# ---------- End ----------

func _show_end(win: bool, enemy: Dictionary) -> void:
	_timer.stop()
	_clear(_header)
	_clear(_body)
	_clear(_footer)
	var pair := HBoxContainer.new()
	pair.alignment = BoxContainer.ALIGNMENT_CENTER
	var chispa := ChispaMark.new()
	chispa.custom_minimum_size = Vector2(84, 110)
	var farol := FarolMark.new()
	farol.custom_minimum_size = Vector2(72, 110)
	pair.add_child(chispa)
	pair.add_child(farol)
	_body.add_child(pair)
	var h := _label("Chapter cleared" if win else "The crossing ends", 30, COL_BRASS)
	h.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_body.add_child(h)
	var blurb := ""
	if win:
		blurb = "Chispa banks the Great Boiler. Farolillo blinks, warm and smug."
	else:
		blurb = "You fell on step %d of %d" % [step + 1, chapter.size()]
		if enemy.size():
			blurb += ", facing %s." % str(enemy.name)
		else:
			blurb += "."
	var b := _label(blurb, 17, COL_MUTED)
	b.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_body.add_child(b)
	var panel := _panel()
	var pv := VBoxContainer.new()
	var gear: Dictionary = db.gear_by_id[hero.gear]
	pv.add_child(_label("Seed %s" % seed, 24, COL_BRASS))
	pv.add_child(_label("%s · enemies %d · turns %d · events %d · %d nuts left" % [gear.name, kills, turns_sum, events_n, int(hero.coins)], 24, COL_TEXT))
	if hero:
		var st: Dictionary = hero.stats()
		pv.add_child(_label("HP %s   Atk %s   Def %s" % [JsMath.fmt_n(float(st.maxHp)), JsMath.fmt_n(float(st.atk)), JsMath.fmt_n(float(st.def))], 16))
		pv.add_child(_label("Crit %s ×%s   Eva %s   Acc %s" % [JsMath.fmt_p(float(st.crit)), JsMath.fmt_n(float(st.critDmg)), JsMath.fmt_p(float(st.eva)), JsMath.fmt_p(float(st.acc))], 16))
	panel.add_child(pv)
	_body.add_child(panel)
	_body.add_child(_label("Your build", 20, COL_BRASS))
	if hero.skills.is_empty():
		_body.add_child(_label("No skills.", 22, COL_MUTED))
	for id in hero.skills.keys():
		var sk: Dictionary = db.skill_by_id[id]
		_body.add_child(_label("%s  %d/%d · %s" % [sk.name, int(hero.skills[id]), int(sk.max), db.family_by_id[sk.fam].name], 16))
	for id in hero.blessings:
		_body.add_child(_label("Blessing · " + str(db.blessings[id].name), 24, COL_BRASS))
	for id in hero.curses:
		_body.add_child(_label("Curse · " + str(db.curses[id].name), 24, COL_ENEMY))
	_body.add_child(_label("Damage by source", 20, COL_BRASS))
	var total := 0.0
	for k in dmg_all.keys():
		total += float(dmg_all[k])
	if total <= 0.0:
		_body.add_child(_label("No damage recorded.", 22, COL_MUTED))
	var keys: Array = dmg_all.keys()
	keys.sort_custom(func(a, b): return float(dmg_all[a]) > float(dmg_all[b]))
	for k in keys:
		var share := int(round(float(dmg_all[k]) / total * 100.0)) if total else 0
		var nm := str(db.sources.get(k, k))
		_body.add_child(_label("%s   %d   %d%%" % [nm, int(dmg_all[k]), share], 16))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	var again := _button("Replay this seed", func():
		_start_run()
	, true)
	var fresh := _button("New run", func():
		ui_seed = _random_seed()
		_show_home()
	)
	row.add_child(again)
	row.add_child(fresh)
	_footer.add_child(row)
	_fade()
	_drive("end")


class StepTrack:
	extends Control
	var chapter: Array = []
	var here := -1

	func _draw() -> void:
		var count := chapter.size()
		if count <= 0:
			return
		var y := size.y * 0.35
		var bar_h := 14.0
		draw_rect(Rect2(0, y, size.x, bar_h), Color("100e0c"))
		var filled := clampf(float(here + 1) / float(count), 0.0, 1.0)
		draw_rect(Rect2(0, y, size.x * filled, bar_h), Color("2f8f84"))
		for i in count:
			var kind := str(chapter[i])
			var mark := Color(0, 0, 0, 0)
			if kind == "mercader":
				mark = Color("c47a45")
			elif kind == "campamento":
				mark = Color("f6f0e4")
			elif kind == "jefe" or kind == "minijefe":
				mark = Color("e0b24a")
			else:
				continue
			var x := size.x * (float(i) + 0.5) / float(count)
			draw_rect(Rect2(x - 4.0, y - 6.0, 8.0, bar_h + 12.0), mark)
		if here >= 0:
			var x := size.x * (float(here) + 0.5) / float(count)
			draw_line(Vector2(x, y - 8.0), Vector2(x, y + bar_h + 8.0), Color("f6f0e4"), 3.0)


class WardBg:
	extends Control
	var zone := 0

	func _draw() -> void:
		var sky := Color("1b1814") if zone == 0 else (Color("241910") if zone == 1 else Color("141820"))
		draw_rect(Rect2(Vector2.ZERO, size), sky)
		# Rebel pipes and roofs along the bottom. The gold tower is the empire, only in the last stretch.
		var ground := Color("2a241c")
		draw_rect(Rect2(0, size.y * 0.72, size.x, size.y), ground)
		for i in 8:
			var x := 30.0 + float(i) * (size.x / 7.0)
			var h := 40.0 + float((i * 37) % 50)
			draw_colored_polygon(PackedVector2Array([
				Vector2(x, size.y * 0.72),
				Vector2(x + 28, size.y * 0.72 - h),
				Vector2(x + 56, size.y * 0.72),
			]), Color("3a3128") if i % 2 == 0 else Color("4a3428"))
			if i % 2 == 0:
				draw_circle(Vector2(x + 28, size.y * 0.72 - h - 8), 5, Color("e07a3d"))
		if zone >= 1:
			draw_rect(Rect2(20, size.y * 0.42, size.x - 40, 14), Color("3f8f86"))
			draw_rect(Rect2(20, size.y * 0.52, size.x * 0.6, 10), Color("c47a45"))
		if zone >= 2:
			var tx := size.x * 0.72
			draw_colored_polygon(PackedVector2Array([
				Vector2(tx, size.y * 0.72),
				Vector2(tx + 36, size.y * 0.18),
				Vector2(tx + 90, size.y * 0.72),
			]), Color("e0b24a"))
			draw_rect(Rect2(tx + 48, size.y * 0.16, 16, 18), Color("f6f0e4"))


class ChispaMark:
	extends Control

	func _draw() -> void:
		var s := size
		var u := min(s.x / 78.0, s.y / 104.0)
		var o := Vector2((s.x - 78.0 * u) * 0.5, s.y - 104.0 * u)
		draw_set_transform(o, 0, Vector2(u, u))
		# Boots and coat, olive with copper patches. Beret and furnace-orange scarf from the approved face.
		draw_rect(Rect2(22, 78, 14, 16), Color("6b4a32"))
		draw_rect(Rect2(42, 78, 14, 16), Color("6b4a32"))
		draw_colored_polygon(PackedVector2Array([Vector2(20, 48), Vector2(58, 48), Vector2(62, 82), Vector2(16, 82)]), Color("5d6b52"))
		draw_rect(Rect2(22, 54, 12, 10), Color("c47a45"))
		draw_rect(Rect2(44, 62, 12, 8), Color("8a5a32"))
		draw_rect(Rect2(30, 58, 18, 4), Color("c4a574"))
		draw_colored_polygon(PackedVector2Array([Vector2(24, 46), Vector2(54, 46), Vector2(48, 58), Vector2(30, 58)]), Color("e07a3d"))
		draw_circle(Vector2(39, 34), 14, Color("e0b48a"))
		draw_colored_polygon(PackedVector2Array([Vector2(22, 36), Vector2(30, 18), Vector2(56, 22), Vector2(52, 40)]), Color("2a241c"))
		draw_colored_polygon(PackedVector2Array([Vector2(20, 28), Vector2(34, 12), Vector2(58, 16), Vector2(52, 30)]), Color("5d6b52"))
		draw_colored_polygon(PackedVector2Array([Vector2(34, 12), Vector2(50, 10), Vector2(56, 18), Vector2(40, 20)]), Color("8a5a32"))
		draw_circle(Vector2(33, 34), 2.2, Color("2a241c"))
		draw_circle(Vector2(45, 34), 2.2, Color("2a241c"))
		draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)


class FarolMark:
	extends Control

	func _draw() -> void:
		var s := size
		var u := min(s.x / 64.0, s.y / 104.0)
		var o := Vector2((s.x - 64.0 * u) * 0.5, s.y - 104.0 * u)
		draw_set_transform(o, 0, Vector2(u, u))
		# Hooded cloak, copper lantern frame (not the green concept frame).
		draw_colored_polygon(PackedVector2Array([
			Vector2(14, 36), Vector2(32, 18), Vector2(50, 36), Vector2(54, 88), Vector2(10, 88),
		]), Color("8a8680"))
		draw_colored_polygon(PackedVector2Array([
			Vector2(18, 28), Vector2(32, 14), Vector2(46, 28), Vector2(42, 40), Vector2(22, 40),
		]), Color("6e6a66"))
		draw_rect(Rect2(18, 40, 28, 32), Color("c47a45"))
		draw_rect(Rect2(22, 44, 20, 24), Color("2a241c"))
		draw_colored_polygon(PackedVector2Array([Vector2(32, 46), Vector2(38, 56), Vector2(32, 66), Vector2(26, 56)]), Color("e07a3d"))
		draw_circle(Vector2(29, 54), 1.4, Color("2a241c"))
		draw_circle(Vector2(35, 54), 1.4, Color("2a241c"))
		draw_rect(Rect2(28, 22, 8, 10), Color("3a3128"))
		draw_circle(Vector2(30, 16), 4, Color("f6f0e4"))
		draw_rect(Rect2(18, 88, 8, 8), Color("6b4a32"))
		draw_rect(Rect2(38, 88, 8, 8), Color("6b4a32"))
		draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)


class EnemyMark:
	extends Control
	var kind_id := ""
	var tint := Color("a86848")

	func _draw() -> void:
		var s := size
		var u := min(s.x / 96.0, s.y / 104.0)
		var o := Vector2((s.x - 96.0 * u) * 0.5, s.y - 104.0 * u)
		draw_set_transform(o, 0, Vector2(u, u))
		var body := PackedVector2Array([Vector2(28, 40), Vector2(68, 40), Vector2(76, 86), Vector2(20, 86)])
		match kind_id:
			"blindado":
				body = PackedVector2Array([Vector2(18, 36), Vector2(78, 36), Vector2(84, 90), Vector2(12, 90)])
			"esquiva":
				body = PackedVector2Array([Vector2(40, 24), Vector2(62, 36), Vector2(58, 90), Vector2(30, 84)])
			"rapido":
				body = PackedVector2Array([Vector2(34, 48), Vector2(62, 44), Vector2(66, 86), Vector2(30, 90)])
			"regenera":
				body = PackedVector2Array([Vector2(28, 48), Vector2(48, 28), Vector2(68, 48), Vector2(64, 88), Vector2(32, 88)])
			"espinas":
				body = PackedVector2Array([Vector2(48, 22), Vector2(70, 48), Vector2(62, 88), Vector2(34, 88), Vector2(26, 48)])
			"pesado":
				body = PackedVector2Array([Vector2(16, 50), Vector2(80, 46), Vector2(88, 92), Vector2(8, 92)])
			"certero":
				body = PackedVector2Array([Vector2(36, 30), Vector2(70, 36), Vector2(64, 88), Vector2(28, 88)])
		draw_colored_polygon(body, tint)
		draw_circle(Vector2(40, 52), 3, Color("1b1814"))
		draw_circle(Vector2(54, 52), 3, Color("1b1814"))
		if kind_id == "espinas":
			draw_line(Vector2(48, 22), Vector2(48, 8), Color("e0b24a"), 3)
		if kind_id == "certero":
			draw_line(Vector2(70, 36), Vector2(90, 32), Color("f6f0e4"), 2)
		draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)


class FamilyMark:
	extends Control
	var fam := "vitriol"
	var tint := Color("b5c94e")

	func _draw() -> void:
		var c := size * 0.5
		draw_circle(c, min(size.x, size.y) * 0.46, tint)
		var ink := Color("1b1814")
		match fam:
			"vitriol":
				draw_circle(c + Vector2(0, 3), 5, ink)
				draw_line(c + Vector2(0, -7), c + Vector2(0, 0), ink, 2)
			"vapor":
				draw_circle(c + Vector2(-4, 2), 4, ink)
				draw_circle(c + Vector2(4, 0), 5, ink)
			"galvanism":
				draw_colored_polygon(PackedVector2Array([c + Vector2(-2, -8), c + Vector2(4, -1), c + Vector2(0, -1), c + Vector2(3, 8), c + Vector2(-4, 1), c + Vector2(0, 1)]), ink)
			"remache":
				draw_circle(c + Vector2(-5, 0), 3, ink)
				draw_circle(c + Vector2(5, 0), 3, ink)
			"escapement":
				draw_arc(c, 6, 0, TAU, 8, ink, 2.0, true)
				draw_line(c, c + Vector2(0, -5), ink, 1.5)
			"reso":
				draw_arc(c + Vector2(0, 2), 5, PI * 1.1, TAU * 0.95, 8, ink, 2.0, true)
			"auto":
				draw_rect(Rect2(c + Vector2(-5, -5), Vector2(10, 10)), ink)
			_:
				draw_circle(c, 3, ink)


class CritBurst:
	extends Control
	var life := 0.32

	func _process(delta: float) -> void:
		life -= delta
		queue_redraw()
		if life <= 0.0:
			queue_free()

	func _draw() -> void:
		var t := 1.0 - clampf(life / 0.32, 0.0, 1.0)
		var center := size * 0.62
		for i in 8:
			var ang := float(i) * TAU / 8.0
			var p := center + Vector2(cos(ang), sin(ang)) * (18.0 + 46.0 * t)
			draw_circle(p, 7.0 * (1.0 - t), Color("ffcb5c"))
