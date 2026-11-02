# Agent notes

- Godot 4.7, GDScript, Compatibility renderer only. Do not switch to Forward+.
- Player-facing text is English. Chispa is the protagonist. Farolillo is the companion. The currency on screen is nuts. The sim still reports unspent nuts as `tuercas`, matching the v3 metric.
- Rules live in `scripts/logic/` and must stay free of nodes, scenes, and autoloads so `godot --headless -s res://tools/sim_main.gd` keeps working.
- Combat and the seeded RNG still match `reference/core.ts`. The merchant does not: nuts are spent only there. Regenerate `data/game.json` with `node --experimental-strip-types tools/build_content.mjs` after editing `tools/build_content.mjs`. Do not retune combat numbers to chase merchant balance.
- `scripts/logic/rng.gd` must stay bit-identical to the v3 hash and mulberry32.
- Camps do not sell stats. Random events must not charge nuts.
- Web export stays single-threaded (`variant/thread_support=false`). Android signing is not set up.
- Do not commit `.godot/`, `build/`, or `node_modules/`.
