# Tier 7 Endgame Rework — Order & Mechanic Themes

Design document for the full reworks of the six Tier 7 bosses, in the same
march order as the Boss Test screen. Tier 6 (Aegis → Gridlock → Jester →
Shaper → Siren → Swarm) is complete; this is the next production block.

---

## The Tier 6 rework standard (what "full rework" means)

Every rework ships with:

1. **Signature mechanic** — runs all fight, ~19–23s cadence, defines the boss.
2. **Two Act II mechanics** — unlock at 60% HP (`phase2Only`), build on the signature.
3. **One-shot finale at ≤10% HP** — new name, new arena state, charge bar frozen
   (`_egXxxFinalActive` gate in `_egTickPlayer`), boss immune, teardown-safe,
   HP-watcher on phase-enter (dives from 30% → 10% still trigger it).
4. **Support kit** — tier-scaled dodge clocks (`EG_NK_TIER_FACTOR`), pause-safe
   finale scheduler (`_egXxxAfter`), `_EG_XXX_DEBUG` console playtest hook,
   `DEBUG_SLOW = true` for screenshots, EN+DE toasts + atlas cards, teardown in
   boss-framework.js, CSS appended to bosses2.css.
5. **Damage language** — touch hits via shared 700ms-cooldown helper, standing
   hazards via `_egNkDotTick` (percent/s), big punish via single `_egNkHit`.
   Rewards that need engine hooks must be verified (no vulnerability
   multiplier exists; heal is the proven reward — Siren echo zones, Swarm jelly).

---

## Hard constraints discovered in the prefix audit

- `_egInfernoPtSegDist` (boss-inferno.js) is **imported by boss-clock.js and
  boss-guardian.js** → keep that function name or move it to shared with a
  migration; do not rename blindly.
- `_egCol`, `_egEnt`, `_egInf` short prefixes collide with
  `_egCollectClueSpans` / `_egEnterBossArena` / `_egInferno*`.
  **Use 4+ letter unique prefixes**: `_egColo`, `_egNul`, `_egEntr`,
  `_egLap`, `_egBay`, and for Inferno `_egInfV` (volcano) as its unique stem.
- Tier 7 sits at the difficulty ceiling: cadence ~1 step faster than Tier 6,
  one extra hazard instance per phase where the design allows, but every new
  dodge pattern must remain readable (the Tier 6 lesson: telegraph = truth).

---

## Rework order

1. **The Colossus** (t7_0) — 🗿
2. **The Inferno** (t7_1) — 🌋
3. **The Null** (t7_2) — 🧿
4. **Entropy** (t7_3) — ♾️
5. **Laplace's Demon** (t7_4) — 👁️
6. **Bayes** (t7_5) — 🔮

---

## 1) The Colossus — 🗿 "The Mountain That Walks"

Theme: **unstoppable mass + weak-point raiding**. The boss is scenery that
attacks; the fight is about reading huge telegraphs and climbing the titan to
break its joints. Elementless (null element today, keep it): the Colossus
deals **pure physical** — its identity is that resists don't help.

- **SIG · Seismic Stride** (all fight, upgraded from seismic_slam) — the
  Colossus **walks**: two giant footprints slam down sequentially (rounded
  band telegraphs), then a full-screen **shockwave ring** rolls out from each
  print with jump-window gaps. Phase 3 strides cross the arena diagonally.
- **ACT II · Boulder Rain** (60%) — the shoulder quarries hurl 🪨 boulders
  that arc in and **shatter into rolling fragments** that keep travelling.
  Breaking a boulder mid-air (click/interact path or body-check, pick during
  implementation) yields a brief rubble shield.
- **ACT II · Granite Golems** (60%) — two small golem statues climb out of
  cracks and slow-push toward you; each is a moving wall that pins you into
  the stride telegraphs. They crumble after one stride cycle.
- **FINALE · 💀 TITAN'S FALL (≤10%)** — the Colossus kneels and the arena
  becomes a climb: **three glowing joint-seals** (shoulder, knee, chest) light
  up one at a time; reach and body-check the lit seal while falling rock
  chutes (telegraphed lanes) sweep the arena. Break a seal = the titan slumps
  (screen shake). All three → the Colossus collapses for good. Fail timer →
  **CAVE-IN**: dust wipes the arena except one lit seal ring (35% hit).
  Charge bar frozen; prefix `_egColo`; keep `_egMechSeismicSlam` name as the
  reworked signature's handler for save-compat.

## 2) The Inferno — 🌋 "The Living Volcano"

Theme: **escalating heat you must actively cool**. The arena heats up the
longer you stand still — movement is survival. Element: fire (keep).

- **SIG · Magma Tides** (all fight, replaces flame_carousel visuals) — lava
  floods half the arena in slow alternating tides (left/right → quartered).
  Standing in lava is a heavy DoT; the tide edge leaves **cooling obsidian
  tiles** that are safe to stand on and slowly crack (3 states) before
  sinking.
- **ACT II · Pyroclastic Surge** (60%) — a wall of fire sweeps from one edge
  with 2 readable gaps; ash cloud lingers behind it (low visibility, no
  damage — pressure, not punish).
- **ACT II · Eruption Vents** (60%) — three vents telegraph, then jet
  upward; jets leave a **heat haze zone** that raises your heat meter faster
  while inside.
- **FINALE · 💀 SUPERVOLCANIC WINTER (≤10%)** — inversion twist: the Inferno
  detonates and the arena **freezes over** (fire→ice identity break). Ice
  sheet slides your movement (momentum drift), **falling magma bombs** mark
  landing spots, and you must lure the dying core's last three magma surges
  into the **fissure vents** to blow its cap. Charge bar frozen; prefix
  `_egInfV`; migrate `_egInfernoPtSegDist` to shared-abilities as
  `_egPtSegDist` and update boss-clock.js + boss-guardian.js imports.

## 3) The Null — 🧿 "The Null Hypothesis"

Theme: **erasure of certainty**. The Null deletes your information and your
tools, and the fight is a proof: prove you can win with less. Element:
shadow (keep). Keep its clue-sabotage soul but make every sabotage visual
and fair.

- **SIG · Void Lattice** (all fight, upgraded void_surge) — permanent
  shrinking star-lattice of void lines on the floor; standing on a line is a
  shadow DoT; the lattice re-contracts every ~12s to a new random centre.
- **ACT II · Hypothesis Erasure** (60%, replaces clue_blackout) — the Null
  targets **one system** each cast (clue numbers / item hotbar / minimap
  edge) and greys it out for 8s with a clear 🧿 marker over what it took.
  Readable sabotage instead of blackout chaos.
- **ACT II · Null Rays** (60%) — two eye-beams orbit the anchor; crossing a
  ray removes your last-used ability's cooldown refund for 5s (soft punish)
  plus contact damage.
- **FINALE · 💀 PROOF BY CONTRADICTION (≤10%)** — the arena empties to pure
  white; the Null asserts "you cannot hit me" (immune). Three **counter-
  example windows** open in sequence — each shows a phantom of your own
  recent actions replayed; stand in the phantom's path *opposite* to where
  it strikes to expose the contradiction. Each exposure shatters a shell.
  All three → the hypothesis collapses (the Null implodes inward). Fail →
  **NULLIFICATION**: the whole arena returns to darkness except one white
  ring (30% hit). Charge bar frozen; prefix `_egNul`.

## 4) Entropy — ♾️ "The Second Law"

Theme: **everything winds down; order is a resource you spend**. The arena
has a visible **order meter**: staying in lit "ordered zones" keeps your
movement crisp; outside them, your inputs get progressively sluggish
(implementation: input smoothing, cap the decay — must never fully lock).
Element: cold (keep).

- **SIG · Heat Death Drift** (all fight, upgraded heat_bloom) — cold pools
  spread outward from random blooms each cast; order zones shrink as pools
  grow; pools merge into bigger ones (real entropy, not just more circles).
  Standing in a pool restores nothing; standing in an ordered zone slowly
  recharges a personal **order charge** you can spend (implementation note:
  spend = one burst dash that ignores input decay for 2s).
- **ACT II · Recursive Decay** (60%) — cursed cells now **age**: a corrupted
  cell spreads decay to orthogonally adjacent cells every 4s unless you
  stand on it to burn it out (standing costs DoT — triage gameplay).
- **ACT II · Maxwell's Door** (60%) — a hot door and a cold door spawn at
  opposite edges; entering either applies the wrong-temperature element to
  you for 8s (hot: standing in cold pools heals instead of harms; cold:
  fire damage doubled). Voluntary elemental swap with real upside — entropy
  as choice, not sentence.
- **FINALE · 💀 THE LAST DEGREE (≤10%)** — absolute zero approaches: all
  decay pauses, the arena becomes one frozen lattice, and **shattered order
  shards** rain (telegraphed). Collect 5 shards into the central singularity
  to give the universe one last spark (each shard = a staggered damage pop on
  the boss through the canonical damage path — the finale *is* the kill).
  Timer failure = **HEAT DEATH**: full-screen slow wave, only the
  singularity centre safe (35%). Charge bar frozen; prefix `_egEntr`.

## 5) Laplace's Demon — 👁️ "It Has Already Seen This"

Theme: **the boss predicts; you falsify**. Every telegraph is correct — but
shown twice: once as a **ghost pre-run** 3s early (the Demon's prediction,
harmless), then the real one. The skill is reading ghosts fast and using the
pre-knowledge to greed DPS windows. Element: fire (keep).

- **SIG · Demonstrated Fate** (all fight, upgraded fate_rewrite) — every
  cast plays the ghost-run then the real-run of a chase-lance that pins you
  to where the ghost *ended* (so standing where the ghost ended is exactly
  the trap; move *after* the ghost dissolves).
- **ACT II · Conditional Branches** (60%) — three phantom Laplaces walk
  predictable paths; at the end of each walk they each place a "future cell"
  — one of the three futures is marked ✅ and detonates softly (small hit) —
  the other two are fakes. Correctly standing on a fake when it resolves
  grants a 2s ghost-form (invulnerable to the next signature).
- **ACT II · Timeline Fray** (60%) — clone of your own avatar walks a
  recording of your last 6 seconds of movement; touching it swaps your
  position with where the clone was 2s ago (position, no damage — dizzying
  but fair, and it's telegraphed by the clone's path line).
- **FINALE · 💀 THE CLOSED TIMELINE (≤10%)** — the arena loops: the same
  three-mechanic gauntlet repeats on a strict 20s loop, each loop's telegraphs
  identical to the last (learnable!). Break a **timeline node** that appears
  each loop at a different spot; three breaks (three loops) closes the loop
  and kills the Demon. Dying to a loop failure isn't possible — instead each
  failed dodge extends the loop by 5s and spawns an extra phantom. Charge bar
  frozen; prefix `_egLap`.

## 6) Bayes — 🔮 "The Grand Prior"

Theme: **evidence updates beliefs — the fight literally re-weights**. Bayes
holds a visible **belief meter** between two hypotheses (SAFE LEFT / SAFE
RIGHT style). Its casts hit the side the meter currently favours; your job
is feeding evidence to flip the meter before each big cast. Element:
lightning (keep).

- **SIG · Posterior Bolts** (all fight, upgraded prior_collapse) — every
  cast, lightning lands on the currently-believed-safe side in a wide
  pattern; the meter then shifts 20% toward the *other* side (getting hit
  by your own belief's evidence). Standing in the small "evidence ring"
  when a bolt lands shifts the meter strongly your way (risk = reward).
- **ACT II · Prior Summons, Revisited** (60%) — summoned adds each carry a
  belief tag matching the meter's majority; killing tagged adds flips meter
  chunks. Adds spawn on the side the meter *opposes* — killing them is how
  you pull the next cast away from yourself.
- **ACT II · Likelihood Veil** (60%, upgrade of grid_veil) — the veil no
  longer just hides the grid: it shows the grid **as Bayes believes it** —
  wrong cells are subtly tinted; the tint error shrinks as the meter
  approaches 50/50 (a balanced belief sees clearly — the hidden design
  lesson of the boss).
- **FINALE · 💀 THEOMERE'S GAMBIT (≤10%)** — Bayes bets everything on one
  final hypothesis: the arena splits into a 3×3 of districts, each
  district's danger shown as a **probability chip** (e.g. "72%") that is
  truthful until you interact; standing on a chip flips it to its
  complement once per district. Survive three cast waves (each wave hits
  the then-most-probable-safe districts), with the meter flipping between
  waves. Survive all three → Bayes updates its prior to "the player wins"
  and concedes (implodes with a full-board reveal of every probability).
  Charge bar frozen; prefix `_egBay`.

---

## Implementation notes for the whole tier

- **Shared first**: before Colossus, move `_egInfernoPtSegDist` → shared as
  `_egPtSegDist` (update boss-clock.js, boss-guardian.js). Before Null,
  extract the clue-sabotage "target one system" helper so Null/Laplace/Bayes
  share one readable-sabotage routine.
- **New framework helper this tier**: a generic **finale gauntlet runner**
  (`_egFinaleSteps(g, steps[], onStepDone, onFail)`) — Colossus seals, Null
  shells, Entropy shards, Laplace loops and Bayes waves are all "do N things
  under pressure or eat the fail punish". One tested runner beats five
  hand-rolled timelines and eliminates the Tier 6 class of bugs (nested
  loops, pause-unsafe timeouts).
- **Damage budget**: touch 13–19%, standing DoT 3.5–14%/s, finale punish
  30–35%, finale fail wave 35% — Tier 7 sits at the top of each band.
- **Balance flags to flip at ship**: every boss's `DEBUG_SLOW → false`.
- **Atlas + i18n**: 4 tooltip cards + ~9 toasts per boss, EN+DE, using the
  established `_egbtTr` / `_egNkToast` patterns.
