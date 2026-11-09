# Agent notes

- Godot 4.7, GDScript, Compatibility renderer only. Do not switch to Forward+.
- Player-facing text is English. Everyone in the world is a robot, including Chispa. She starts alone: no companion ships, and there is no pet framework to hang one on. Style B art lives in `assets/art/`; foe `id`s in `data/game.json` match those filenames. The currency on screen is nuts. The sim still reports unspent nuts as `tuercas`, matching the v3 metric. Family display names live in `data/game.json` under `families[].name`.
- Rules live in `scripts/logic/` and must stay free of nodes, scenes, and autoloads so `godot --headless -s res://tools/sim_main.gd` keeps working.
- The seeded RNG still matches the v3 hash and mulberry32. Combat content does not: eight skill families live in `data/game.json`. `tools/build_content.mjs` only rebuilds the v3 reference and must not overwrite that file. Nuts are spent only at the merchant. Scrap is the meta currency, saved in `user://profile.json`. Character XP lives on that same profile (`xp`); level and the per-level stat grants come from `meta.levels`. A skill with `requiredLevel` is offered only once that level is reached and its family tool is open, and it is never sold. Do not retune combat numbers to chase merchant balance.
- `scripts/logic/rng.gd` must stay bit-identical to the v3 hash and mulberry32.
- Camps do not sell stats. Random events must not charge nuts.
- Web export stays single-threaded (`variant/thread_support=false`). Android signing is not set up.
- Do not commit `.godot/`, `build/`, or `node_modules/`.
