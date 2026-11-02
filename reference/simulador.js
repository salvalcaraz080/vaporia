// Simulador v3 de Farolillo: node simulador.js [runs] [salida.json]
const C = require("./core.js");
const N = parseInt(process.argv[2] || "2000", 10);
const OUT = process.argv[3] || "resultados.json";
if (process.env.BALJSON) Object.assign(C.BAL, JSON.parse(process.env.BALJSON));
const POLS = (process.env.POLS || "aleatorio,codicioso,rareza").split(",");

function scoreFx(h, fx) {
  if (!fx) return 0;
  const r = h.hp / h.maxHp; let s = 0;
  if (fx.heal) s += fx.heal * 100 * (r < 0.55 ? 2 : r > 0.9 ? 0.1 : 0.6);
  if (fx.hurt) s -= fx.hurt * 80 * (r < 0.5 ? 2.5 : 1);
  if (fx.maxHp) s += fx.maxHp * 0.8;
  if (fx.atk) s += fx.atk * 8;
  if (fx.crit) s += fx.crit * 150;
  if (fx.def) s += fx.def * 2.6;
  if (fx.eva) s += fx.eva * 170;
  if (fx.acc) s += fx.acc * 70;
  if (fx.critDmg) s += fx.critDmg * 160 * Math.max(0.05, C.stats(h).crit);
  if (fx.buy) s += scoreFx(h, C.STAT_BUY[fx.buy].fx) - C.statPrice(h, fx.buy) * 0.25 * Math.min(1, 80 / Math.max(1, h.coins));
  if (fx.rerolls) s += fx.rerolls * 6;
  if (fx.banish) s += fx.banish * 3;
  if (fx.coins) s += fx.coins * 0.25;
  if (fx.offer) s += { normal: 20, elite: 30, epica: 40 }[fx.offer] || 25;
  if (fx.upgrade) s += fx.upgrade * 18;
  if (fx.best) s += 22;
  if (fx.downgrade) s -= fx.downgrade * 18;
  if (fx.upFam) s += 40;
  if (fx.bless) s += 5 + scoreFx(h, C.BLESS[fx.bless].fx);
  if (fx.curse) s -= 15;
  if (fx.uncurse) s += 20;
  if (fx.fight === "elite") s += r > 0.6 ? 15 : -40;
  if (fx.fight === "normal") s += r > 0.4 ? 8 : -20;
  if (fx.gamble) s += fx.gamble.p * scoreFx(h, fx.gamble.win) + (1 - fx.gamble.p) * scoreFx(h, fx.gamble.lose);
  if (fx.transmute) s += 0;
  if (fx.refund) s += 10;
  if (fx.fuse) s += 25;
  if (fx.mods) { const W = { atkPct: 250, dmgPct: 250, crit: 150, regen: 1500, postHeal: 200, dotPct: 60, firstMiss: 10, tempo: 2, dmgTaken: -300, openBolt: 10, enemyAtk: -150, coinPct: 10 }; for (const k in fx.mods) s += (W[k] || 0) * fx.mods[k]; }
  return s;
}
function chooseEvent(h, ev, pol, rng) {
  const ok = ev.choices.filter((c) => C.canChoose(h, c));
  if (pol === "aleatorio") return ok[Math.floor(rng() * ok.length)];
  let best = ok[0], bs = -1e9;
  for (const c of ok) { const s = scoreFx(h, c.fx); if (s > bs) { bs = s; best = c; } }
  return best;
}
function secondFam(h) {
  const g = C.GEAR_BY_ID[h.gear].fam; const cnt = {};
  for (const k in h.skills) { const s = C.SKILL_BY_ID[k]; if (!s.syn && s.fam !== g) cnt[s.fam] = (cnt[s.fam] || 0) + h.skills[k]; }
  let best = null, n = 0; for (const f in cnt) if (cnt[f] > n) { n = cnt[f]; best = f; }
  return best;
}
function scoreCard(h, c, pol) {
  if (c.kind === "stat") return 5;
  const s = C.SKILL_BY_ID[c.id]; const g = C.GEAR_BY_ID[h.gear].fam; const f2 = secondFam(h);
  const rb = { comun: 0, rara: 10, epica: 25, legendaria: 40 }[s.rarity];
  if (pol === "rareza") return rb * 4 + (C.lv(h, c.id) ? 10 : 0) + (s.syn ? 15 : 0);
  if (s.syn && s.syn.indexOf(g) >= 0) return 110 + rb;
  if (s.fam === g) return 100 + rb;
  if (f2 && (s.fam === f2 || (s.syn && s.syn.indexOf(f2) >= 0))) return 70 + rb;
  if (!f2) return 45 + rb;
  return 30 + rb;
}
function doOffer(h, mode, pol, rngO, rngB, st) {
  let cards = C.makeOffer(h, rngO, mode);
  if (pol === "codicioso") {
    let best = Math.max.apply(null, cards.map((c) => scoreCard(h, c, pol)));
    while (best < 60 && h.rerolls > 0) { h.rerolls--; cards = C.makeOffer(h, rngO, mode); best = Math.max.apply(null, cards.map((c) => scoreCard(h, c, pol))); }
  }
  for (const c of cards) if (c.kind === "skill") { st.offered[c.id] = (st.offered[c.id] || 0) + 1; }
  let pickC;
  if (pol === "aleatorio") pickC = cards[Math.floor(rngB() * cards.length)];
  else { let bs = -1e9; for (const c of cards) { const s = scoreCard(h, c, pol) + rngB() * 0.01; if (s > bs) { bs = s; pickC = c; } } }
  if (pickC.kind === "skill") st.picked[pickC.id] = (st.picked[pickC.id] || 0) + 1;
  C.takeCard(h, pickC);
}
function runOne(r, pol, agg) {
  const seed = "SIM-" + r; const gear = C.GEARS[r % C.GEARS.length].id;
  const h = C.newHero(gear);
  const rngO = C.makeRng(seed + "|ofertas"), rngE = C.makeRng(seed + "|eventos"), rngEn = C.makeRng(seed + "|enemigos"), rngB = C.makeRng(seed + "|bot|" + pol);
  const st = { offered: {}, picked: {} }; const used = [];
  let death = null, fights = 0;
  const fight = (kind, step, sub) => {
    const e = C.makeEnemy(step, kind, rngEn);
    const res = C.battle(h, e, C.makeRng(seed + "|combate|" + step + "|" + sub), false);
    fights++;
    const T = agg.turns[kind] || (agg.turns[kind] = { n: 0, sum: 0, wins: 0, list: [] });
    T.n++; T.sum += res.turns; if (res.win) T.wins++; if (T.list.length < 20000) T.list.push(res.turns);
    for (const k in res.dmgBy) agg.dmg[k] = (agg.dmg[k] || 0) + res.dmgBy[k];
    agg.misses += res.misses; agg.dodges += res.dodges;
    if (res.win) for (const m of C.REWARDS[kind]) doOffer(h, m, pol, rngO, rngB, st);
    return res.win;
  };
  doOffer(h, "normal", pol, rngO, rngB, st);
  const steps = C.CHAPTER_TEMPLATE;
  for (let i = 0; i < steps.length && !death; i++) {
    const k = steps[i], step = i + 1; const fk = C.fightKind(k);
    if (fk) { if (!fight(fk, step, 0)) death = step; continue; }
    if (k === "evento") {
      const ev = C.pickEvent(h, step, used, rngE); used.push(ev.id);
      let ch = chooseEvent(h, ev, pol, rngB);
      // tiendas: se puede comprar varias veces (máx. BAL.shopMax) mientras compense
      for (let b = 1; ev.shop && ch.fx.buy && b < C.BAL.shopMax; b++) {
        C.applyChoice(h, ch, rngE); agg.events[ev.id + ":" + ch.id] = (agg.events[ev.id + ":" + ch.id] || 0) + 1;
        ch = chooseEvent(h, ev, pol, rngB);
      }
      agg.events[ev.id + ":" + ch.id] = (agg.events[ev.id + ":" + ch.id] || 0) + 1;
      agg.evCat[ev.cat] = (agg.evCat[ev.cat] || 0) + 1;
      const res = C.applyChoice(h, ch, rngE);
      if (res.fight && !fight(res.fight, step, 1)) { death = step; agg.eventDeaths++; continue; }
      for (const m of res.offers) doOffer(h, m, pol, rngO, rngB, st);
      if (h.hp <= 0) death = step;
      continue;
    }
    if (k === "campamento") {
      const ok = C.CAMP.choices.filter((c) => C.canChoose(h, c)); let c;
      if (pol === "aleatorio") c = ok[Math.floor(rngB() * ok.length)];
      else if (h.hp / h.maxHp < 0.55) c = C.CAMP.choices[0];
      else { const want = (h.bought.atk || 0) <= (h.bought.def || 0) ? "buy_atk" : "buy_def"; c = ok.filter((x) => x.id === want)[0] || ok.filter((x) => x.id.indexOf("buy_") === 0)[0] || C.CAMP.choices[1]; }
      agg.camp[c.id] = (agg.camp[c.id] || 0) + 1;
      C.applyChoice(h, c, rngE);
    }
  }
  const win = !death;
  return { win, death, gear, h, st, fights };
}
function simulate(pol) {
  const agg = { turns: {}, dmg: {}, events: {}, evCat: {}, eventDeaths: 0, camp: {}, misses: 0, dodges: 0, enemyAtt: 0, heroAtt: 0 };
  const fin = { atk: 0, def: 0, crit: 0, critDmg: 0, eva: 0, acc: 0, maxHp: 0, buys: 0, n: 0 }; const rarPick = {};
  let wins = 0; const byGear = {}, deaths = {}, seg = { "1-14": 0, "15 minijefe": 0, "16-29": 0, "30 jefe": 0 };
  const sk = {}; const syn = {}; const dom = {}; let fightsTot = 0, skillsLv = 0;
  for (let r = 0; r < N; r++) {
    const o = runOne(r, pol, agg); fightsTot += o.fights;
    { const S = C.stats(o.h); for (const k of ["atk", "def", "crit", "critDmg", "eva", "acc", "maxHp"]) fin[k] += S[k]; fin.buys += Object.values(o.h.bought).reduce((a, b) => a + b, 0); fin.coinsLeft = (fin.coinsLeft || 0) + o.h.coins; fin.n++; }
    for (const id in o.st.picked) { const rr = C.SKILL_BY_ID[id].rarity; rarPick[rr] = (rarPick[rr] || 0) + o.st.picked[id]; }
    if (o.win) wins++;
    const g = byGear[o.gear] || (byGear[o.gear] = { n: 0, w: 0 }); g.n++; if (o.win) g.w++;
    if (o.death) { deaths[o.death] = (deaths[o.death] || 0) + 1; seg[o.death <= 14 ? "1-14" : o.death === 15 ? "15 minijefe" : o.death < 30 ? "16-29" : "30 jefe"]++; }
    for (const id in o.st.offered) { const s = sk[id] || (sk[id] = { offered: 0, picked: 0, runs: 0, wins: 0 }); s.offered += o.st.offered[id]; }
    for (const id in o.st.picked) { const s = sk[id] || (sk[id] = { offered: 0, picked: 0, runs: 0, wins: 0 }); s.picked += o.st.picked[id]; }
    for (const id in o.h.skills) { const s = sk[id] || (sk[id] = { offered: 0, picked: 0, runs: 0, wins: 0 }); s.runs++; if (o.win) s.wins++; skillsLv += o.h.skills[id]; }
    // familia dominante (por niveles)
    const lvBy = {}; for (const id in o.h.skills) { const f = C.SKILL_BY_ID[id].fam; lvBy[f] = (lvBy[f] || 0) + o.h.skills[id]; }
    let df = null, dn = -1; for (const f in lvBy) if (lvBy[f] > dn) { dn = lvBy[f]; df = f; }
    const d = dom[df] || (dom[df] = { n: 0, w: 0 }); d.n++; if (o.win) d.w++;
  }
  const turns = {};
  for (const k in agg.turns) { const T = agg.turns[k]; const l = T.list.sort((a, b) => a - b); turns[k] = { combates: T.n, media: +(T.sum / T.n).toFixed(1), mediana: l[Math.floor(l.length / 2)], p10: l[Math.floor(l.length * 0.1)], p90: l[Math.floor(l.length * 0.9)], victorias: +(T.wins / T.n * 100).toFixed(1) }; }
  const skills = Object.keys(sk).map((id) => { const s = sk[id]; return { id, name: C.SKILL_BY_ID[id].name, fam: C.SKILL_BY_ID[id].fam, syn: !!C.SKILL_BY_ID[id].syn, rarity: C.SKILL_BY_ID[id].rarity, offered: s.offered, picked: s.picked, pickRate: s.offered ? +(s.picked / s.offered * 100).toFixed(1) : 0, runsWith: s.runs, runsPct: +(s.runs / N * 100).toFixed(1), winRateWith: s.runs ? +(s.wins / s.runs * 100).toFixed(1) : 0 }; });
  const totalDmg = Object.values(agg.dmg).reduce((a, b) => a + b, 0);
  const dmgShare = {}; for (const k in agg.dmg) dmgShare[k] = +(agg.dmg[k] / totalDmg * 100).toFixed(1);
  const pct = (o) => { const r = {}; for (const k in o) r[k] = { n: o[k].n, win: +(o[k].w / o[k].n * 100).toFixed(1) }; return r; };
  const losses = N - wins; const segPct = {}; for (const k in seg) segPct[k] = losses ? +(seg[k] / losses * 100).toFixed(1) : 0;
  return { policy: pol, runs: N, winRate: +(wins / N * 100).toFixed(1), byGear: pct(byGear), byDominantFamily: pct(dom), deathsByStep: deaths, deathSegments: segPct, turns, avgFights: +(fightsTot / N).toFixed(1), avgSkillLevels: +(skillsLv / N).toFixed(1), dmgShare, events: agg.events, eventDeaths: agg.eventDeaths, camp: agg.camp, misses: agg.misses, dodges: agg.dodges, finalStats: Object.fromEntries(Object.keys(fin).filter((k) => k !== "n").map((k) => [k, +(fin[k] / fin.n).toFixed(3)])), rarityPicks: rarPick, evCat: agg.evCat, skills };
}
const t0 = Date.now();
const out = { runs: N, generated: new Date().toISOString(), bal: C.BAL, results: POLS.map(simulate) };
require("fs").writeFileSync(OUT, JSON.stringify(out, null, 1));
for (const r of out.results) {
  console.log("\n== " + r.policy + ": victoria " + r.winRate + "% | combates/partida " + r.avgFights + " | niveles de habilidad " + r.avgSkillLevels);
  console.log("  turnos:", Object.entries(r.turns).map(([k, v]) => k + " media " + v.media + " (p10 " + v.p10 + ", p90 " + v.p90 + ", gana " + v.victorias + "%)").join(" | "));
  console.log("  derrotas por tramo:", JSON.stringify(r.deathSegments));
  console.log("  por herramienta:", Object.entries(r.byGear).map(([k, v]) => k + " " + v.win).join(", "));
  console.log("  por familia dominante:", Object.entries(r.byDominantFamily).map(([k, v]) => k + " " + v.win + " (" + v.n + ")").join(", "));
  console.log("  daño:", JSON.stringify(r.dmgShare));
  console.log("  stats finales:", JSON.stringify(r.finalStats), "camp", JSON.stringify(r.camp), "picks por rareza", JSON.stringify(r.rarityPicks));
}
console.log("\n" + ((Date.now() - t0) / 1000).toFixed(1) + " s");
