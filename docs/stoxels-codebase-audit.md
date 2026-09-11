# STOXELS Codebase Audit — Full Report

**Date:** September 10, 2026
**Scope:** 258 JS files (~180k lines), 51 stylesheets, `index.html` load order (255 script tags).
**Method:** Read-only audit (no files modified) using line-level grep/cross-reference analysis.
**Convention:** Items where intent was unclear are flagged as such, not as bugs. Balance-affecting items are "flag only."

> **Follow-up (2026-09-10):** Script load order adjusted — the `quests-*` block now
> loads after `state.js`, `item-definitions.js`, `achievements.js` and the passive-tree
> family (its last remaining forward references). The empty `random-walker.css` link was
> removed, and the load-order invariants (override pairs, cyclic clusters, boot sequence)
> are now documented in a comment block at the top of the SCRIPTS section in `index.html`.

---

## PASS 1 — Structural Map

**Summary**
- The global-script architecture is real but far more disciplined than feared: consistent per-area prefixes (`_eg*`, `_mv*`, `_bay*`, `_nul*`), section headers, and deferred calls mean the 1,096 cross-file forward references almost never execute at load time. Only 14 usages look top-level, and on inspection all are inside functions or string literals — nothing crashes today.
- The dominant hazard is **"override by load order"**: several functions are deliberately declared twice or three times, and the last-loaded copy silently wins. This works, but any script reorder or "cleanup" of a duplicate changes behavior with no error. (2026-09-10: a full dependency-sort experiment confirmed **353 cyclic couplings** exist in the graph — a "pure" dependency order is impossible and would crash the game, e.g. bosses before `boss-framework.js`. The invariants are now documented in `index.html`.)
- One genuine **silent divergence**: `_egRemoveVeil` has two different implementations (boss-bayes.js:353 vs boss-bloom.js:478); Bloom's loads last, so Bayes's cleanup runs Bloom's code.
- One **dead duplicate that changes loot if touched**: `_egGenerateEquipmentDrop` exists in base-items.js:3970 (common-only) and generator.js:575 (rarity+mods). The generator version wins; the base-items copy is dead, but deleting "the wrong one" or reordering scripts changes all drop behavior.
- There is a genuine **circular coupling** between the endgame core and the bosses: `endgame-encounter.js` calls per-boss teardowns, bosses call `_egSpawnMonster`/`_egRenderPanel` back. It works only because every call is deferred; same for `class-abilities.js` ↔ the 9 per-class files.
- 4 files on disk are never loaded by `index.html` (details in Pass 6).

> **✅ Resolved 2026-09-10** — every row in the table below has been fixed in the working tree (behaviour-identical):
> - `_egShowTooltip` → **single implementation in endgame-currency.js** (the dnd copy was already a commented-out dead block; the hub base copy and dnd legacy block were removed).
> - `_egGenerateEquipmentDrop` → dead common-only copy deleted from equipment-base-items.js; generator.js is the one source.
> - `_egGetElementalDamageBonus` → duplicate removed from player-stats.js; combat-calculations.js is the one source (identical math).
> - `_egRemoveVeil` → merged into shared-boss-abilities.js (Bloom's superset behaviour); both boss copies removed.
> - `_egPtSegDist`, `_shuffleArray`, `_egRenderCurrencyCell` → per-file copies deleted; single sources in shared-boss-abilities.js / class-probabilist.js / endgame-hub-drag-and-drop.js.
> - Back-navigation → new `EG_SCREEN_NAV` registry + `_egResolveBackFn` validator in endgame-state.js; atlas-ui/gate now route through it (typos warn instead of silently breaking).
> - Boss mechanic dispatch → `_egValidateAllBossHandlers()` in boss-framework.js, invoked once at the end of boss-rosters.js; a typo'd `handler` name now `console.warn`s at boot.
> - Load-order regressions → `boot-loader.js` now runs a boot-time sanity check over the load-bearing globals (indirect-eval `typeof` in a try/catch — a plain `typeof` throws for TDZ-bound lexicals, which is exactly what happens when a load-time init crashes).
> - Re-verified after the fixes: **0 live duplicate declarations across files** (4 remaining in-file duplicates are pre-existing in HEAD and identical), and the only cross-file forward references left are the documented by-design cases (cyclic screen cluster, `typeof`-guarded calls, beats-loads-last).

**Findings table**

| File(s) | Issue | Why it matters | Suggested fix | Risk |
|---|---|---|---|---|
| endgame-hub.js:1865, hub-drag-and-drop.js:1070, currency.js:899 | `_egShowTooltip` declared 3×; currency.js (loads last) silently wins for **all** callers | Tooltip behavior changes with script reorder or "dedupe"; override comments in dnd/currency are a landmine | ✅ Rename to `_egShowCurrencyTooltip` / `_egShowDndTooltip` or dispatch via one function with a mode flag | Low (pure rename) — **done**: single source in currency.js |
| equipment-base-items.js:3970 + generator.js:575 | `_egGenerateEquipmentDrop` declared 2×, different behavior; generator's wins | 36 lines of dead code that *would* change loot if load order changed | ✅ Delete the base-items copy; move comment to generator.js | Low–Med — **done** (all 3 callers resolve to generator's version) |
| player-stats.js:941 + combat-calculations.js:151 | `_egGetElementalDamageBonus` 2× (functionally identical) | Same silent-shadow hazard | ✅ Delete player-stats copy | Low — **done** |
| boss-bayes.js:353 vs boss-bloom.js:478 | `_egRemoveVeil` 2×, **different code**; bloom's wins for both bosses | Bayes cleanup silently runs Bloom's superset; if bloom's copy is removed/renamed, Bayes breaks with no warning | ✅ Merge into shared-boss-abilities.js (one `_egRemoveVeil` handling both tint classes) | Low (behavior-identical) — **done** |
| dynamo.js:857 + shared-boss-abilities.js:2191; mathmagician.js:53 + probabilist.js:58; hub.js:1298 + hub-dnd.js:1037 | Identical duplicate helpers (`_egPtSegDist`, `_shuffleArray`, `_egRenderCurrencyCell`) | Redundant surface area; same shadow hazard | ✅ Delete the per-file copies | Low — **done** (note: dnd's `_egRenderCurrencyCell` was NOT identical — it renders into both hub and gate grids; it is the kept single source) |
| atlas-ui ↔ gate ↔ nexus (index.html:1632/1642/1643) | Back-navigation via **string names** (`'showEndgameGate'`), forming a load-order cycle | Works only because dispatch is deferred; a top-level call would crash; typos in the string silently fall through | ✅ Centralize in a tiny `EG_SCREEN_NAV` registry object | Low — **done** (registry + `_egResolveBackFn` validator in endgame-state.js) |
| screens-map-view.js / screens-world-levels.js → screens-level-select.js (loaded later) | `renderLevelSelect`, `getStars`, `isMaxCleared` used cross-file with no guard | Any refactor of level-select breaks the map silently | Add `typeof` guards at call sites or reorder scripts | Low — map-view already carries `typeof` guards; remaining uses are deferred runtime calls |
| quests-logic.js / quests-ui.js / storyline-engine.js | Use STATE, ITEM_DEFS, PT, STORY_BEATS from files loaded **later** in index.html | Load order is load-bearing; top-level access would crash the whole page | Keep all access deferred (it is); add a one-time `typeof` assert in dev builds | Low — **done**: boot-loader.js sanity check. ⚠️ **lesson learned 2026-09-10**: quests were briefly moved after state.js, which broke `state.js → migrateQuestState()` at load time (state.js's `let STATE = initState()` runs `migrateOldSave` → `migrateQuestState`, defined in quests-stats.js). The block is back in its original position (before state.js), where it provably works. |
| boss-framework.js:645 | `window[mech.handler]` string dispatch | A typo'd handler name silently disables that mechanic (no error) | ✅ Validate all handler names exist at registration (`Object.assign` time), `console.warn` on miss | Low — **done**: `_egValidateAllBossHandlers()` runs at end of boss-rosters.js |

**Top 5 refactors (impact × ease)**
1. Delete the dead `_egGenerateEquipmentDrop` in base-items.js — removes a behavior bomb. (High impact, trivial ease)
2. Merge `_egRemoveVeil` into shared-boss-abilities.js — kills a silent divergence. (Med, trivial)
3. Rename the 3 `_egShowTooltip` copies — kills the worst override landmine. (Med, trivial)
4. Add a registration-time handler-name validator in boss-framework.js. (Low–Med, trivial)
5. Introduce a screen-navigation registry (atlas/gate/nexus back-refs) — removes the only real cycle. (Med, small)

---

## PASS 2 — Duplication & Repeated Patterns

**Summary**
- **Bosses (87 files, ~42k lines + 3.3k shared engine):** two distinct tiers. ~37 "reworked" bosses (500–1,300 lines) are genuinely unique fights; ~50 legacy bosses (80–200 lines) are thin defs + shared-mechanic references and are *not* bloated. The shared framework (registries, phases, scheduling, dodge-run engine) is well designed — the duplication is not inside the boss files but in the **hooks the framework forces every boss to touch**.
- Every reworked boss adds 3–4 edit points to shared files: a `typeof`-guarded teardown call in `_egBossCleanup` (**54 guards** in boss-framework.js), a charge-freeze "finale" gate in `_egTickPlayer` (**28 blocks** in endgame-encounter.js, 222 `typeof _` guards total), plus a debug-flag block and a `window._EG_XXX_DEBUG` hook. That's ~35–45 lines of cross-file boilerplate per boss → ~1,500 lines of sprawl that a registration API would remove.
- **Puzzle items:** the cursed family is already well-factored — `shared/cursed-downside.js` and `shared/effect-modifiers.js` centralize immunity/ward/modifier logic, and the 6 cursed files are thin 27–81-line wrappers. Minor duplication: each cursed FX file hand-rolls its own DOM helper (`_fxMakeCursedTint`, `_fxMakeFogTendrils`, `_fxMakeEyeScanLines`, `_fxDetonateBlast`…) — ~15 lines × 5 files that one parameterized helper could replace.
- **Classes:** clean. Shared plumbing already exists (class-defs, class-abilities, class-mana, class-cooldown-state, class-hud). Only `_shuffleArray`/`_randomFrom`-style micro-dupes.
- **CSS:** class CSS is cleanly prefixed (`.diag-`, `.bayes-`, `.arcane-`…) — no copy-paste blocks to consolidate. **`css/classes/random-walker.css` is 0 bytes** while the JS spawns a `.random-walker-agent` element that **no stylesheet styles** (only 3 className/classList uses in 1,064 lines of JS) — the in-game agent element is likely unstyled/invisible. `markovian.css` is 42 lines for a 1,237-line class.
- **Dev passive tree:** `passive-tree-dev-data.js` is **39,415 lines / 951 KB** — a parallel sandbox tree (real tree: 6,693 lines / 253 KB) shipped in the main bundle on every page load.

> **✅ Resolved 2026-09-10** — see the table rows for per-item status:
> - **Boss hook registry**: `EG_BOSS_TEARDOWN_HOOKS` (46 entries, in boss-framework.js) replaced the 46 typeof-guarded per-boss if-blocks in `_egBossCleanup` (~230 lines → ~10 lines + data table); `EG_PLAYER_CHARGE_PAUSE_GATES` (35 entries, in endgame-encounter.js) replaced the 35 freeze-gate if-blocks in `_egTickPlayer`. Both keep their typeof guards (boss files load later), so behavior is identical. The Clock time-freeze (window flag) and Firefly trial (window fn) stay as explicit blocks. `_egValidateAllBossHandlers()` now also validates teardown names, and gate names are validated at endgame-encounter.js load. New bosses add one data entry instead of editing shared files.
> - **`_DEBUG_SLOW`**: NOT consolidated — 28 per-boss `_EG_XXX_DEBUG_SLOW` consts feed ~150 distinct per-call timing ternaries; renaming every usage is a high-risk mechanical churn for zero behavior change. The real issue (shipped `true` = slowed boss set-pieces in production) is a **balance decision, flag only** — flip `true → false` per boss to ship normal timing.
> - **Cursed FX**: the 6 cursed builders (`_fxMakeCursedTint`, `_fxMakeFogTendrils`, `_fxMakeEyeScanLines`, `_fxDetonateBlast`, `_fxMakeVortexStrips`, `_fxMakeWave`) now use the shared `_fxMakeElement()` helper instead of hand-rolling createElement/className/cssText/appendChild. Geometry stays per-item (it is inherently per-item); ~24 duplicated lines removed, identical output.
> - **random-walker.css**: empty file deleted (link was already removed). `.random-walker-agent` is **not** a styling bug — the agents are fully styled inline (emoji, position/transition/z-index); the class is only a JS cleanup hook (`querySelectorAll`).
> - **Dev passive tree**: `passive-tree-dev-data.js` (~41k lines / 951 KB) + `passive-tree-dev.js` removed from index.html; `_loadDevPassiveTreeAndOpen()` in ui-events.js injects them on demand the first time the sandbox button is clicked (sequential load — data first). ~1 MB parse cost moves from every page load to the first sandbox open.

**Findings table**

| File(s) | Issue | Why it matters | Suggested fix | Risk |
|---|---|---|---|---|
| boss-framework.js `_egBossCleanup` (54 guards) + endgame-encounter.js `_egTickPlayer` (28 finale gates) | Per-boss hooks hardcoded in shared files | Every new boss requires editing framework/encounter files; a missed edit = missing cleanup or a charge bar that doesn't freeze | ✅ Registry: `EG_BOSS_HOOKS[id] = { teardown, finaleActive }`; loop over it | Low (pure restructure, identical behavior) — **done** (`EG_BOSS_TEARDOWN_HOOKS` + `EG_PLAYER_CHARGE_PAUSE_GATES`) |
| 28 boss files | `_DEBUG_SLOW = true` shipped (see Pass 6) | Timing duplication across every boss | Centralize in one debug module | See Pass 6 — **flag only** (balance decision; structural rename not worth the churn) |
| cursed-*.js FX helpers | 5 hand-rolled DOM builders | ~75 duplicated lines | One `_fxMakeStaggeredLayer(container, rect, count, cssClass, anim)` | Low — **done** (6 builders now use shared `_fxMakeElement`; a single staggered-layer helper would be contrived given per-item geometry) |
| css/classes/random-walker.css | Empty file; `.random-walker-agent` unstyled anywhere | Likely invisible in-game element (visual bug, flag only) | Verify in-game; add styles or delete file | Med (visual) — **resolved as non-issue**: agents are fully inline-styled; empty file deleted |
| passive-tree-dev-data.js + dev.js | 41k lines parallel tree always loaded | ~1 MB parsed on every load; duplicate maintenance of tree logic | Gate behind a dev flag / separate HTML | Low–Med — **done** (lazy-injected on first sandbox open) |

**Top 5 refactors**
1. Boss hook registry (teardown + finale gates) — the single biggest line win (~1,500 lines of sprawl) with zero behavior change.
2. Delete/replace empty random-walker.css + verify `.random-walker-agent` styling.
3. Unify the 5 cursed-FX DOM helpers.
4. Dev-passive-tree behind a flag.
5. Consolidate the ~28 `_DEBUG_SLOW` blocks into one shared `EG_DEBUG_TIMING` object.

---

## PASS 3 — God Files / Oversized Modules

**Summary**
- Better than expected: most large files are **data** (mod-tables 7,683; unique-items 6,787; translations 5,952; base-items 4,006 — all table-dominant), and the big logic files are consistently sectioned with headers and prefixes.
- The two genuine multi-responsibility giants are **endgame-encounter.js (3,530 lines; ~12 sections: spawn builders, respawn/stagger schedulers, lifecycle, tick loop, warnings, map-fail overlay, monster attacks, damage, game-over)** and **endgame-hub.js (3,417; constants+state+5 HTML-builder sections+render+tooltips+back-nav)**.
- **screens-map-view.js (1,916) is *not* a god file** — it is one coherent module (world-map sprite walking) with a clean `_mv*` prefix. Same for encounter-chain.js (2,079; chain lifecycle) and maps.js (2,173; config + mod tables + map defs).
- mod-tables.js is data-dominant (21 top-level decls, ~14 of them slot tables), so generation logic vs tables are **not** tangled — but 7,683 lines in one file is unwieldy; a mechanical per-slot split is cheap.
- equipment-generator.js: generator logic is separate from base-items data and mod tables — this one is **healthy**. hub.js is the exception: inventory grid, stash, currency, uniques, tooltips, and drag-drop coordination all in one file (drag-drop partially extracted to endgame-hub-drag-and-drop.js already).

> **✅ Resolved 2026-09-10** — see the table rows for per-item status:
> - **endgame-encounter.js (3,530 → 2,718)**: the whole COMBAT TICK LOOP section moved out — `endgame-encounter-tick.js` (526 lines: `_egTickMonster`, charge-pause gates, `_egTickPlayer`, hold-E parry, charge bar, mistakes-limit logic, life regen, `_egTickLoop`, pause/resume) and `endgame-encounter-overlays.js` (248 lines: mistakes/low-health/absorption-broken banners + the map-fail overlay interceptor). Both load right after encounter.js; their load-time code (gate validation, hotkey init, listeners, fallback guard) is self-contained and was verified. New script tags carry comments explaining the constraint.
> - **endgame-hub.js (3,417 → 2,825)**: `endgame-hub-uniques.js` (74 lines: `_egEnsureUniqueStash` + unique collection helpers) MUST load **before** hub.js — hub.js's load-time `_egLoadHubState()` calls `_egEnsureUniqueStash()` unguarded (this is why a naive after-hub placement would crash; the tag order handles it). `endgame-hub-tooltips.js` (483 lines: `_egBuildTooltipBodyHTML`, mouse tracking, Alt-compare tooltip + their listeners) loads **after** hub.js.
> - **endgame-mod-tables.js (7,683)**: split into 20 files — `endgame-mod-name-words.js`, 18 per-slot table files (head/earring/amulet/shoulders/cloak/chest/bracers/gloves/belt/pants/boots/ring/arcane/talisman/weapon1/weapon-2h/weapon2/shield) and `endgame-mod-tables-rebalance.js` (the post-load attribute rebalance IIFE that evals every table — it MUST load last, and does). Note: the file also held weapon/shield/ranged tables, and `EG_MOD_TABLE_WEAPON_2H` is a load-time clone of `WEAPON1` (tag order keeps weapon1 before weapon-2h).
> - **class-probabilist / class-statistician**: NOT extracted — each file interleaves LOGIC/VFX sections per ability (PRECISION MARK — LOGIC followed by PRECISION MARK — VFX, etc.); extracting "FX" would split every ability across two files and break the per-class cohesion the audit itself calls the convention. Flagged as intentionally skipped.

**Findings table**

| File(s) | Issue | Why it matters | Suggested fix | Risk |
|---|---|---|---|---|
| endgame-encounter.js (3,530) | 12+ responsibilities incl. overlays and warnings | Hard to reason about; the 28 finale gates make it the per-boss edit point | ✅ Extract `endgame-encounter-tick.js` (tick loop + player tick) and `endgame-encounter-overlays.js` (warnings/fail overlay) | Low–Med (mechanical, watch the many cross-refs) — **done**; all 24 moved functions verified present once, load-time code checked |
| endgame-hub.js (3,417) | Inventory+stash+currency+uniques+tooltip+back-nav | New-item work touches one giant file | ✅ Extract `endgame-hub-uniques.js` (lines 55–180, 103–180 already self-contained) and tooltip section | Low — **done** (uniques must load BEFORE hub.js — see resolved block) |
| endgame-mod-tables.js (7,683) | 14 slot tables in one file | Fine as data, painful to edit/diff | ✅ Split per-slot (`mod-tables-head.js`, …) or JSON | Low — **done** (20 files; rebalance file last) |
| passive-tree-dev-data.js (39,415) | Dev sandbox data in prod bundle | Load/parse cost + maintenance | Dev-only gating (Pass 2) | Med — **done in Pass 2** (lazy-injected) |
| class-probabilist.js (1,616) / class-statistician.js (1,507) | Ability logic + FX builders in one class file | Borderline; consistent with per-class convention | Optionally extract FX helpers | Low — **intentionally skipped**: per-ability LOGIC/VFX interleaving is the file's convention; extraction would split abilities |

**Top 5 refactors**
1. Boss-hook registry (again — it's the highest-leverage single change in the codebase).
2. Split encounter.js tick + overlays out.
3. Extract hub.js uniques/tooltip sections.
4. Split mod-tables per slot.
5. Move dev tree behind a flag.

---

## PASS 4 — State Management

**Summary**
- `js/state.js` holds ~100+ top-level mutable `let` globals (`cur`, `userGrid`, `wrongGrid`, `timerSecs`, `playerCurrentHP`, `playerMaxMana`, `shieldActive`, …) plus a persisted `STATE` object with real migration functions (`_migrateCoreFields`, `_migrateClassFields`, `_migrateAscendencyFields`) — the persistence half is solid.
- Direct mutation is the norm: `userGrid` is written in **34 files**, `timerSecs` in **27**, `playerCurrentHP` in **26**, `mistakeCount` in **19**. There are no setters; cross-file invariants (e.g., `shieldActive`, `_goldenClockActive`, `_cursedImmune` as a `window` flag) are each maintained by several files independently.
- Duplicated state lives mainly in **DOM ↔ variable pairs**: `timerSecs` ↔ `updTimer()` text, score/points in scoring.js ↔ highscore DOM, HP ↔ `_renderPlayerHealth`. Standard vanilla pattern, but each is a divergence point (the timer line `timerSecs += …; updTimer();` appears in many files).
- The `window._cursedImmune`, `window._veiled_cursedUsed`, `window._goldenClockActive` flags are ad-hoc global protocol — readable from anywhere, set from 1–3 places each, never namespaced.

**Findings table**

| File(s) | Issue | Why it matters | Suggested fix | Risk |
|---|---|---|---|---|
| 34 files mutating `userGrid`, 27 `timerSecs`, 26 `playerCurrentHP` | No setters; every file reaches into core state | Invariant bugs (e.g., HP clamping, timer freezing) are duplicated at every call site | Add `setUserCell(r,c,v)`, `addTimer(secs)`, `damagePlayer(n)`; convert call sites mechanically | Med (touches gameplay paths — do one function at a time) |
| multiple | `timerSecs` + DOM text updated in ~27 places | Missed `updTimer()` = display drift | Single `_addTimer(secs)` that mutates + renders | Low |
| state.js / endgame files | HP/MP represented as loose globals AND mirrored in UI + gear calculations | Duplicated authority across player-stats.js, encounter.js, hub.js | Converge on one `_egPlayerHP()` accessor | Med |
| window flags (`_cursedImmune`, `_goldenClockActive`, `_veiled_cursedUsed`) | Ad-hoc global protocol | No single owner; easy to forget reset on new level | Namespace under `window.STOX_FLAGS` with reset helper | Low |
| quests-logic.js / quests-stats.js | Writes `STATE.questStats` directly from outside state.js | Bypasses migrations/validation | Route through `state.js` accessors | Low–Med |

**Resolved 2026-09-10** ✅
- **Window flags row — done.** All 13 writes + 12 reads across 12 files (`class-abilities`, `mouse-button-handlers`, `penalty`, `add-time`, `golden-clock`, `cursed-downside`, `effect-modifiers`, `quest-tracking`, `shield`, `the-witch`, `start-level`, `timer`) converted from bare `_cursedImmune` / `_goldenClockActive` / `_veiled_cursedUsed` to `window.STOX_FLAGS.*`, with a reset helper in state.js (per-level resets already existed in `_resetClassLevelState` — now centralized). Zero old references remain; verified byte-level rename deltas per file.
- **quest-stats row — done.** Writes from `mouse-button-handlers.js` and `scoring.js` now route through quests-stats.js accessors (`_incDirect`-style) instead of touching `STATE.questStats` directly. Note: `luckyDropsClaimed` may be double-incremented (scoring.js and quests-stats.js both bump it) — flagged, not changed (behavior-preserving).
- **Setters rows (userGrid / timerSecs / HP) — deliberately NOT converted, with evidence.** Measured the full breadth (100+ write sites) and tested the audit's premise: the "display drift" concern is largely **disproven** — timer.js re-renders `#timer` every second (setInterval at timer.js:676), so missed `updTimer()` calls self-heal within 1s. userGrid/HP writes have no shared clamping invariant to enforce (HP clamping is already local to its writers). Full conversion would be churn without payoff; left as-is and documented. (HP/MP accessor convergence row likewise skipped — same rationale.)

**Top 5 refactors**
1. Introduce the 3 core setters (`setUserCell`, `addTimer`, `damagePlayer`) and mechanically convert call sites — biggest correctness win.
2. Namespace the ad-hoc window flags.
3. Centralize quest/achievement stat writes through one module (quests-stats.js partially does this already).
4. One `_renderPlayerHealth`-style render-owner per displayed stat (already partially true — finish it for timer/score).
5. Add a dev-only invariant assert (e.g., HP never exceeds max after any mutation) — cheap safety net while refactoring.

---

## PASS 5 — Performance

**Summary**
- **No serious algorithmic hot spots.** Grid clue computation is O(rows×cols) (`_computeRowClues`, grid.js:62–72); drag-fill dedupes with a `Set` (`dragCountedCells`, mouse-button-handlers.js:24); loot-filter matching is per-item over a small rule list; `_egMonsters.find` calls are O(n) with small n.
- Tick loops are sane: `_egTickLoop` at **10 Hz** (encounter.js:470), ailments/hazards tick in place with accumulators — no DOM rebuilds per tick; `_egNkLoop` (shared-boss-abilities.js:2067) is a tidy rAF engine with pause/tier-clock handling and error isolation.
- Minor findings only: 62 `getBoundingClientRect` uses across boss files (16 in the shared engine) — mostly event/accumulator-time, a few per-frame; `_egTickPlayer` runs ~28 `typeof`-guarded predicate calls per tick (cheap but shows why the registry matters); grid clue highlighting does `querySelectorAll` per fill (grid.js:765–795) — fine at ≤25×25.
- The real "performance" issue is **load-time**: 255 scripts + a 951 KB dev-tree data file + 11,290-line bosses2.css on every page load. That's the only user-visible perf lever worth pulling.

**Findings table**

| File(s) | Issue | Why it matters | Suggested fix | Risk |
|---|---|---|---|---|
| passive-tree-dev-data.js (951 KB) | Dev sandbox data parsed on every load | Perceptible parse cost on slow devices | Load only under dev flag / separate page | Med |
| bosses2.css (11,290 lines) | All boss FX in one stylesheet | Parsing cost; cascade conflicts between boss prefixes | Split per boss or per tier | Low |
| 62 getBoundingClientRect (16 shared engine) | Some per-frame reads (e.g., boss-null ring segments) | Layout reads inside rAF loops on low-end machines | Cache rects on resize for the per-frame cases | Low |
| endgame-encounter.js `_egTickPlayer` | 28 per-boss predicate calls every 100 ms | Negligible today; grows per boss | Comes free with the hook registry | Low |

**Top 5 refactors**
1. Dev-tree gating (load-time win, also Pass 2/3).
2. Split or trim bosses2.css.
3. Rect caching in the few per-frame read loops.
4. Hook registry (again — reduces per-tick predicate sprawl).
5. (Optional) `defer`/`async` audit of script tags — all are render-blocking today, though order matters.

**✅ Resolved 2026-09-11 (Pass 5 execution)**

| Finding | Outcome |
|---|---|
| passive-tree-dev-data.js (951 KB) | Done in Pass 2 (verified intact: no tag, injected on first sandbox click by `_loadDevPassiveTreeAndOpen` in ui-events.js). |
| `_egTickPlayer` predicate sprawl | Done in Pass 2 (verified intact: `EG_PLAYER_CHARGE_PAUSE_GATES` in endgame-encounter-tick.js). |
| bosses2.css (11,290 lines) | **Resolved without splitting — taken off the render-blocking path.** The `<link>` is gone from `<head>`; endgame-encounter.js warms it up once at idle after boot (`requestIdleCallback`, 8s timeout) and `_egStartEncounter()` force-loads it synchronously as a fallback, so no boss fight can ever start unstyled. Safety was re-verified on the current tree: all ~1160 classes are boss/engine-prefixed or boss-scoped compounds (incl. `.eg-clock-call-banner`, which is only ever *created* by boss-clock — timer.js merely cleans it up), and the base monster-card styles live in the eager monsters.css. Rationale: a per-boss split would trade one parse for 20+ extra tags and fragmentation; gating captures the whole win. |
| 62 `getBoundingClientRect` uses | **Measured, not blanket-cached.** `_egNkDotHit`'s painted-box reads are deliberate (defeat CSS-animation hitbox skew) — left. Dynamo (1 read/tick, documented), buzz closing walls (reads *animated* heights — caching would break the check; short-circuited to 1–2 reads/200ms), gust windbreak (phase-only, correctness-critical player clamp) — left with rationale. **Fixed:** boss-null's ring — 6 static body-absolute segments were re-read 10×/s by the damage accumulator; the rect is now captured once at draw time (exact, since body-absolute px geometry never repaints/moves). |
| (new) Load-order regressions | **tools/check-load-order.py** — dev-time checker: every tag resolves, no duplicates, main.js last, 10 hardcoded transitive invariants (quests→state, mod-application→generator, tables→rebalance, weapon1→weapon-2h, hub-uniques→hub, encounter→tick/overlays, framework→bosses, rosters→encounter, boot chain) plus an advisory scan for *direct* load-time forward references. Run `python tools/check-load-order.py` after any index.html edit; exit 1 on regression. Self-tested with negative cases. |
| (new) Screen sanity | Static proxy check: every `getElementById` literal in title / level-select / map-view / world-levels / hub / atlas / gate / boot files resolves to static markup or a guarded runtime-built element (primer-overlay, mv-canvas etc. are created by JS with guarded reads). This sandbox can't boot the game — do one hard-refresh boot and watch the console. |

---

## PASS 6 — Naming, Consistency, Dead Code

**Summary**
- Naming is *more* consistent than expected: per-boss prefixes (`_egNul*`, `_egBay*`, `_egNk*` shared engine), per-class prefixes (`_bayesTrap*`, `_blackSwan*`, `_execute*`), per-module prefixes (`_mv*`, `_eglf*`) are disciplined. Only ~4 TODOs in the whole codebase and console usage is clean (3 log / 2 error / 32 warn).
- **Biggest single flag: `_DEBUG_SLOW = true` is shipped in 28 boss files.** Each slows that boss's mechanics 2.5× ("Flip to false for ship" comments). 28/37 reworked bosses ship in slow-motion — either deliberate beta tuning or forgotten flags; balance-affecting either way. *Flag only, verify intent.* (E.g., boss-null.js:31–32, boss-aegis.js:54–55.)
- **Dead files:** `js/endgame/endgame-testing-screen.js` (**0 bytes**), `js/levels/level-world-non-math.js` (its `other_nonograms` is referenced nowhere), `js/preview-highscore-seed.js` (header says it exists for `preview_highscore.html`, which is **not in the repo**). `boss-template.js` is intentionally unloaded (referenced by framework docs).
- `index.html`: commented-out RESET button at lines 168–173 (while `js/ui-reset.js` is still loaded and functional — reset may be reachable elsewhere, verify); cache-busting is inconsistent — 33 `?v=` params (ranging v2–v5) on ~21 JS + 12 CSS files, nothing on the other ~234 scripts.
- The only real naming inconsistency: the legacy `_egMech*` shared handlers vs reworked per-boss `_egMechXxx*` handlers share the same `_egMech` prefix in different files — harmless but can confuse grep results; and `_egNk` ("Nk") is an unexplained prefix on the shared dodge engine.

**Findings table**

| File(s) | Issue | Why it matters | Suggested fix | Risk |
|---|---|---|---|---|
| 28 boss files (`_DEBUG_SLOW = true`) | 2.5× slow-motion mechanics shipped | Those fights are dramatically easier/slower than tuned — balance-affecting | Decide intent; flip to false or centralize as a global debug toggle | **Flag only** (balance) |
| js/endgame/endgame-testing-screen.js | 0-byte file | Dead weight / confusion vs the loaded `js/endgame-testing-screen.js` | Delete | None |
| js/levels/level-world-non-math.js | `other_nonograms` unreferenced | Dead data (~3.5 KB) | Delete or wire up | Low |
| js/preview-highscore-seed.js | For a preview HTML that doesn't exist | Dead file; also fakes globals (t, STATE, switchScreen) | Delete or restore preview page | Low |
| index.html:168–173 | Commented-out RESET button + ui-reset.js still loaded | Dead markup; check reset is still reachable | Remove comment block; keep ui-reset.js only if used | Low |
| index.html (255 tags) | `?v=` on 33 files only, inconsistent values | Cache-busting is unreliable — users can be stuck on stale files | One consistent `?v=` on everything or nothing | Low |
| window._EG_XXX_DEBUG hooks (28 files) | Dev test API shipped | Global surface pollution | Gate behind dev flag | Low |

**✅ Resolved 2026-09-11 (Pass 6 execution)**

| Finding | Outcome |
|---|---|
| `_DEBUG_SLOW` (28 files) | **Left as-is (balance decision, yours to make)** — 2.5× slow-mo ships in every reworked boss fight until you decide intent. |
| Duplicate naming code in generator.js | **Fixed + extracted.** `_egBuildItemName`/`_egModNameEntry` were declared twice; the second (hoisting-winning) copy read the `[enAdjective, enOfPhrase, deGenitive]` dictionary in the wrong slot order — EN uncommon names rendered like "Sturdy Leather Cap **of Sturdy**" and DE prefixes got the EN "of Stone" phrase. The wrong copy is deleted; the documented-correct one now lives in **`endgame-mod-application.js`** (new file, 394 lines) together with the whole mod-application half: `_egRollInt`, `_egIsHybrid`, `_egFamilyAllowedOnBase`, `_egEligibleTiers`, `_egPickTier`, `_egBuildRolledStats`, `_egBuildModPool`, `_egPickModFromPool`, `_egRollMods`, `_egBuildItemName`, rare-name dicts + `_egPickRareItemName`. `endgame-equipment-generator.js` (632 → 227 lines) keeps only the roll pipeline: rarity config, `_egGetModTable`/`_egCurrentWeaponBase`, `_egRollRarity`, `_egRollModCounts`, `_egGenerateEquipmentDrop`. Tag order: …mod-tables-shield → **mod-tables-rebalance → mod-application → equipment-generator** → maps (application needs the name-words dictionary; generator's load-time override calls into application). |
| 0-byte `endgame/endgame-testing-screen.js` | **Deleted** (the loaded file is the root-level `js/endgame-testing-screen.js`, 26 KB — untouched; grep hits for that name are all to the live file). |
| `js/levels/level-world-non-math.js` | **Deleted** (unreferenced, unloaded). |
| `js/preview-highscore-seed.js` | **Deleted** (unreferenced; the preview page doesn't exist in the repo). |
| Commented-out RESET button | **Removed**, replaced with a comment explaining `ui-reset.js` stays loaded for the save-slot delete flow (`confirmSlotDelete` via `_pendingResetSlot` — reachable, not dead). |
| `?v=` cache-busting inconsistency | **Open** (mechanical, touches ~250 tags — needs a deliberate pass). |
| `_EG_XXX_DEBUG` window hooks | **Open** (low priority; harmless). |

Post-split verification: zero cross-file duplicate function declarations project-wide (the only remaining pairs are the two known in-file ones); all 276 script tags resolve to existing files; both new/edited files bracket-balanced; both contain no load-time executable statements (pure declarations, so tag order is the only constraint and it is satisfied).

**Top 5 refactors**
1. Resolve the 28 debug-slow flags (one central `EG_DEBUG_TIMING` switch).
2. Delete the 3 dead files.
3. Remove the commented RESET block + decide ui-reset.js's fate.
4. Standardize cache-busting.
5. Document `_egNk` prefix (or rename to `_egDodge`).

---

## Consolidated Prioritized Backlog

1. **Boss hook registry** (teardown + finale gates) — kills the largest recurring edit-point in the codebase. *Rationale:* every new boss touches shared files; registry restores open/closed. **L**
2. **Resolve the 28 shipped `_DEBUG_SLOW = true` flags** — decide intent; if accidental, fights are 2.5× easier than tuned. **S**
3. **Delete dead `_egGenerateEquipmentDrop` in base-items.js** — removes a behavior bomb that only load order defuses. **S**
4. **Merge divergent `_egRemoveVeil` copies** into shared-boss-abilities.js. **S**
5. **Rename the 3 `_egShowTooltip` overrides** so last-wins can't silently change behavior. **S**
6. **Delete the 3 dead files** (0-byte testing screen, level-world-non-math, preview-highscore-seed). **S**
7. **Remove commented-out RESET button** + verify ui-reset.js reachability. **S**
8. **Central debug-timing module** replacing 28 per-boss flag blocks. **S**
9. **Handler-name validation in boss-framework.js** at registration time — typos currently disable mechanics silently. **S**
10. **Core state setters** (`setUserCell` / `addTimer` / `damagePlayer`) + mechanical call-site conversion. **L**
11. **Namespace ad-hoc window flags** (`_cursedImmune`, `_goldenClockActive`, `_veiled_cursedUsed`). **S**
12. **Split endgame-encounter.js** into tick + overlays + lifecycle. **M**
13. **Extract hub.js uniques/tooltip sections.** **M**
14. **Gate dev passive tree behind a flag** (951 KB load). **S–M**
15. **Split mod-tables.js per slot.** **M**
16. **Fix/verify `.random-walker-agent` styling** (empty CSS file, likely invisible element). **S**
17. **Screen-nav registry** for atlas/gate/nexus string back-refs. **M**
18. **Unify the 5 cursed-FX DOM helpers.** **S**
19. **Standardize `?v=` cache-busting** across all 255 tags. **S**
20. **~~Rect caching in per-frame boss loops~~** — RESOLVED 2026-09-11 (measured per-site; boss-null ring cached, the rest documented as deliberate). **S**
21. **Delete the 5 duplicate helper copies** (`_egPtSegDist`, `_shuffleArray`, `_egRenderCurrencyCell`, `_egGetElementalDamageBonus`). **S**
22. **~~Split/trim bosses2.css (11,290 lines)~~** — RESOLVED 2026-09-11 (no split; removed from render-blocking path with idle warm-up + encounter-start fallback — see Pass 5 resolved block). **M**
23. **Run `python tools/check-load-order.py` after every index.html edit** — catches missing/duplicate tags, main.js placement, the 10 known transitive order invariants, and direct load-time forward refs. **S**

**Effort key:** S = hours, M = days, L = a week or more. Items 1–2 are the highest-leverage; items 1, 3–5, 9, 21 are all behavior-neutral and safe to hand to a developer immediately.

---

## INCIDENT 2026-09-11 — endgame stash wiped on a level-97 character

**Symptom:** endgame inventory empty, no equipped gear, after playing during the refactor sessions.

**Root cause (two independent weaknesses, both now closed):**
1. The hub keeps module-level mirrors (`_egInventory`, `_egEquipped`, …) that default to **empty at
   script load**. `egSaveHubState()` (called from 16+ files after any hub interaction) copies the
   mirrors over `STATE` and saves — with no check that the mirrors were ever actually loaded.
   During the broken-refactor windows a script error / stale cache left the mirrors empty, and the
   next hub action wrote that emptiness over the real save.
2. `save()` had **no backups and no sanity check**: any write, however degenerate, replaced the
   previous save in place.

**Fixes (all in place, verified balanced + load-order clean):**
- `endgame-hub.js`: `_egLoadHubState` runs once per session; a failure marks the session degraded
  (`_stoxHubLoadFailed`) and **all 45+ `egSaveHubState` call sites are interlocked** (the guard
  lives inside the function itself) until a successful load; re-loads after slot switches are
  re-enabled by clearing the latches in `loadStateFromSlot`.
- `state.js save()`: (a) **rolling backups** — the first write of each browser session snapshots
  the previous save into `<key>_backup_1` (older → `_backup_2`), so the last two pre-session states
  are always recoverable; (b) **degraded-write guard** — refuses to overwrite a leveled character
  (`playerLevel > 1`) whose new save has *no endgame items at all* (the empty-mirror signature),
  logging once with a documented console override (`window._stoxAllowDegradedSave = true`);
  intentional resets are unaffected because `wipeSlot` removes the key first.
- `tools/save-doctor.html`: open in the same browser to inspect live saves + backups with item
  counts, flagged "leveled-but-empty" states, quarantined restore of `_backup_1`/`_backup_2`, and
  export/import. Every mutating action quarantines the data it replaces.

**Recovery for the level-97 character:** the wipe itself predates the backup system (nothing could
have snapshotted it then), so check `stoxels_backup_1` / `stoxels_backup_2` in the Save Doctor —
if the session that wiped it was the *first* write after one of the broken sessions, the pre-wipe
save may be in a backup; otherwise the gear is gone from this browser's storage and only an older
browser profile / machine copy could help. **From now on, any repeat of this failure class is
bounded to one session and one click of rollback.**

---

---

## Dev Testing Harness (added 2026-09-11)

Fast, repeatable preview-tool testing without clicking through boot screens:

- `js/dev-testing.js` — inert without `?devtest`/`&devscale` URL params.
  One-URL boots on a fresh character: `index.html?devtest=game&w=0&l=0`
  (straight into a level), `devtest=world` / `mapview` / `setup` / `title`.
  Traverses the real flow functions (`showSaveSlotSelect` → `onSaveSlotChosen`
  → `showSetup` → `launchExistingGame` → `showWorldDetail` → `startLevel`),
  so state machinery behaves exactly like a manual run. Console API:
  `DevTest.goto/map/world/game/setup/title/screen/state/timeScale/
  freezeAvatar/press/wipeSlots` (see docs/testing-workflow.md).
- `window.STOX_EFFECT_TIME_SCALE` (default 1 = shipped behaviour) — wired
  into `_egApplyStatusToMap` (all endgame ailments), `startSlotCooldown`
  (class ability cooldowns), `_egGrantQuizDamageReward` (quiz buff stacks),
  and shield.js's cursed-ward window, so short effects can be stretched
  (or compressed) during tests via `DevTest.timeScale(10)` / `&devscale=10`.
- Save-slot safety: default dev slot is 20; a slot holding real progress
  (>3 levels) triggers a loud warning on boot and `wipeSlots` refuses to
  wipe it without `{ force: true }` — the preview profile shares the
  player's real localStorage.
- Preview gotcha documented: an unfocused preview window runs **zero**
  rAF callbacks (sprite WASD lives in rAF) — movement tests are invalid
  until the page has focus; verify with the snippet in the doc.

## Notable Non-Issues (checked, found healthy)

- Cursed-item family (well-factored through shared helpers)
- Class files (shared plumbing exists; per-class prefixes consistent)
- Mod-table vs equipment-generator separation (not tangled)
- screens-map-view.js cohesion (coherent module, not a god file)
- Grid/clue algorithmic complexity (O(rows×cols), no hotspots)
- Tick-loop frequency (10 Hz, in-place mutation, no DOM rebuilds)
- Achievements/quests modularity
- Per-area naming discipline
- Only ~4 TODO/FIXME markers; console usage clean (3 log / 2 error / 32 warn)