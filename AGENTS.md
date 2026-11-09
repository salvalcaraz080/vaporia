# Agent notes

- Godot 4.7, GDScript, Compatibility renderer only. Do not switch to Forward+.
- Player-facing text is English. Everyone in the world is a robot, including Chispa. Farolillo is the lantern-bot companion. The currency on screen is nuts. The sim still reports unspent nuts as `tuercas`, matching the v3 metric. Family display names live in `data/game.json` under `families[].name`.
- Rules live in `scripts/logic/` and must stay free of nodes, scenes, and autoloads so `godot --headless -s res://tools/sim_main.gd` keeps working.
- The seeded RNG still matches the v3 hash and mulberry32. Combat content does not: eight skill families live in `data/game.json`. `tools/build_content.mjs` only rebuilds the v3 reference and must not overwrite that file. Nuts are spent only at the merchant. Scrap is the meta currency, saved in `user://profile.json`. Do not retune combat numbers to chase merchant balance.
- `scripts/logic/rng.gd` must stay bit-identical to the v3 hash and mulberry32.
- Camps do not sell stats. Random events must not charge nuts.
- Web export stays single-threaded (`variant/thread_support=false`). Android signing is not set up.
- Do not commit `.godot/`, `build/`, or `node_modules/`.
