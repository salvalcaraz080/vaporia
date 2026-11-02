# Vaporia

A fair, fun-first semi-idle roguelite in the vein of Capybara Go and Rogue Legend. Steampunk, English, built for a phone browser first. Godot 4.7, GDScript, Compatibility renderer.

Chispa is the one doing the fighting. Farolillo, a lantern-snail, comes along.

This build plays the v3 fight and event loop, with one change: nuts are spent only at a wandering merchant on steps 10 and 23. Each stall sells up to three stat upgrades and one skill, and the stock can be refreshed. Camps are only a rest or a free skill tune.

## Run

Open the project in Godot 4.7 and press Play. The window is a 720×1280 portrait.

Headless balance sim (random, greedy, and rarity bots):

```bash
godot --headless --path . -s res://tools/sim_main.gd -- --runs 200 --policies random,greedy,rarity
```

Web export uses the **Web** preset: single-threaded, so it does not need `SharedArrayBuffer`. Add `?autoplay=1` to the page URL for a scripted run from the title screen to the summary. The **Android** preset is a skeleton (package `com.vaporia.game`, arm64, portrait). It is not signed.

## Play it on the web

After this lands on `main`, GitHub Actions exports the web build and deploys it:

https://salvalcaraz080.github.io/vaporia/

The repository owner has to turn that on once: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Layout

- `scripts/logic/` — rules only. No scenes, so the sim can run headless.
- `data/game.json` — skills, foes, events, and the balance numbers.
- `scripts/ui/` — the portrait interface.
- `tools/sim_main.gd` — the three bots and the report.
- `reference/` — the v3 TypeScript prototype, kept so the numbers can be checked. It is not the game that ships.

`tools/build_content.mjs` rebuilds `data/game.json` from `reference/core.ts` and the English copy. `tools/parity_node.mjs` prints per-run traces from that prototype.
