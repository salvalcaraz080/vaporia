# Agent notes

- Godot 4.7, GDScript, Compatibility renderer only. Do not switch to Forward+.
- Player-facing text is English. Chispa is the protagonist. Farolillo is the companion. The currency on screen is nuts. The sim still reports unspent nuts as `tuercas`, matching the v3 metric.
- Rules live in `scripts/logic/` and must stay free of nodes, scenes, and autoloads so `godot --headless -s res://tools/sim_main.gd` keeps working.
- Combat, offers, events, and the seeded RNG are a faithful port of `reference/core.ts`. Do not retune numbers while fixing a bug. Change `reference/core.ts` and regenerate `data/game.json` with `node --experimental-strip-types tools/build_content.mjs` if the content itself changes.
- `scripts/logic/rng.gd` must stay bit-identical to the v3 hash and mulberry32. A trace diff against `tools/parity_node.mjs` is the check.
- The camp and the v3 stat shops stay as they are until a follow-up changes the merchant.
- Web export stays single-threaded (`variant/thread_support=false`). Android signing is not set up.
- Do not commit `.godot/`, `build/`, or `node_modules/`.
