# STOXELS — Testing Workflow (Preview Tool)

Fast, repeatable testing in the Freebuff preview (or any browser). Every
screen is reachable from a single URL on a **fresh character** — no more
clicking through save slots, intros, tutorials and setup menus.

The harness lives in `js/dev-testing.js`. It is **inert for normal players**:
without a `?devtest` or `&devscale` URL param it does nothing at all.

---

## 1. One-URL boots

Serve the project root (any static server), then boot directly into the
screen you need:

| Goal | URL |
|---|---|
| Fresh character, **inside a puzzle level** | `index.html?devtest=game&w=0&l=0` |
| In-game, math gates bypassed | `index.html?devtest=game&w=0&l=0&force=1` |
| World-detail map (sprite walk test) | `index.html?devtest=world&w=0` |
| Overworld map | `index.html?devtest=mapview` |
| Setup / difficulty screen | `index.html?devtest=setup` |
| Just the title screen | `index.html?devtest=title` |

Extra params:

- `&slot=N` — use a specific save slot (default: first empty slot)
- `&char=stox|trix|syla` — character (default `stox`)
- `&force=1` — bypass math gates when entering a level
- `&devscale=10` — apply the effect time scale at boot (see §3)
- `&keepintro=1` / `&keeptutorial=1` — let the cinematic / tutorial play

**Rule of thumb:** all screens that test level-select behaviour use
`devtest=mapview` / `devtest=world`; all gameplay tests use `devtest=game`.

The boot chain calls the same flow functions the UI buttons call
(`showSaveSlotSelect` → `onSaveSlotChosen` → `showSetup` →
`launchExistingGame` → `showWorldDetail` → `startLevel`), so the state
machine is *traversed properly*, never simulated — STATE, hub latches and
screen history behave exactly like a manual run.

---

## 1b. Preview-tool gotcha: focus (READ THIS for movement / rAF tests)

The Freebuff preview page runs **without OS focus** until you click into
it. An unfocused browser window runs **zero** `requestAnimationFrame`
callbacks — and sprite WASD movement lives in a rAF loop. So:

- Movement "does not work" in scripted/automated checks → **false alarm**.
- `performance.now()` still advances (timers run), but rAF-driven things
  are paused.

Verification (run in the preview console before trusting any
"movement failed" result):

```js
(() => { let f=0; const t0=performance.now(); const tick=()=>{f++;
  if(performance.now()-t0<500) requestAnimationFrame(tick)};
  requestAnimationFrame(tick); setTimeout(()=>console.log(
  'rAF frames in 500ms:', f, 'focus:', document.hasFocus()),600); })()
```

`frames: 0` means the test is invalid — click into the preview once and
re-run. Confirmed real movement (focus established) via the harness:

```js
DevTest.press('d', 600)   // holds the key 600 ms, reports before/after pos
```

Also available: `DevTest.freezeAvatar(true|false)` pins the sprite for
scripted position tests (registering in the game's own flag namespace,
`STOX_FLAGS.devTestFreezeAvatar` — cleared with the flag, never set in
normal play).

---

## 2. Console API (`DevTest.*`)

After any boot, the `DevTest` object is available in the preview console:

```js
DevTest.goto({ screen: 'game', world: 1, level: 3, character: 'trix', slot: 8 })
DevTest.map()                    // overworld map
DevTest.world(1)                 // world-detail map of world 1
DevTest.game(0, 0)               // enter level (respects gates)
DevTest.game(0, 0, true)         // enter level (force, gates bypassed)
DevTest.setup() / DevTest.title()
DevTest.screen('screen-codes')   // any screen by id
DevTest.state()                  // slot / character / progress summary
DevTest.timeScale(10)            // see §3
DevTest.wipeSlots([6, 7, 8])     // clean up test slots (dev only)
```

Tip: use the **preview tool's evaluate** for these — no manual clicking.

---

## 3. Effect time scale (`STOX_EFFECT_TIME_SCALE`)

Effects that last seconds (or minutes) are impossible to observe at real
speed. Every *central* duration site multiplies by
`window.STOX_EFFECT_TIME_SCALE` (default **1 = exact shipped behaviour**):

- `scale > 1` → **longer** effects (default for testing — observe before they expire)
- `scale < 1` → shorter effects (e.g. 0.1 = one tenth)
- Set via `DevTest.timeScale(10)` or `&devscale=10` in the boot URL.

Currently wired (all scale ×1 when the flag is unset/1):

| System | Site | Shipped value |
|---|---|---|
| Endgame ailments (player + monster) | `_egApplyStatusToMap` (`endgame-ailments.js`) | 4–8 s |
| Class ability cooldowns | `startSlotCooldown` (`class-cooldown-state.js`) | per skill |
| Endgame quiz buff stacks | `_egGrantQuizDamageReward` (`endgame-quiz-buffs.js`) | 30 min |
| Shield cursed-ward window | `shield.js` | 5–15 s |
| (add new time-limited effects here) | | |

Deliberately **not** scaled: the puzzle/level timer, boss-phase timers —
those change what is being tested rather than make it observable.

Examples:

```js
DevTest.timeScale(10)                    // ailments last 10×, cooldowns tick 10× slower
index.html?devtest=game&w=0&l=0&devscale=10
```

**When adding a new time-limited effect:** route its duration through the
scale (see the wiring sites above for the pattern) so it stays testable, and
add a row to the table here.

---

## 4. Standard test run

1. Serve the project root (`python -m http.server 8613`) and open the
   preview on `index.html?devtest=...`.
2. The console prints `[devtest] auto-boot: {...}` — one line confirms the
   harness engaged.
3. Test what you need. Reload the same URL to reset to the same state.
4. Before finishing: `DevTest.wipeSlots([...])` any slots the run created
   (or leave them — they are normal save slots and visible on the slot
   screen).

---

## 5. Save-slot safety (the preview shares your real localStorage)

The preview browser profile uses the **same localStorage** as your normal
game browser profile. A test run can therefore see — and overwrite — real
saves. The harness guards this:

- Default test slot is **20** (`&slot=` unset) — the least-used slot.
- If the chosen slot already holds **real progress** (>3 levels), the
  harness warns loudly and `DevTest.wipeSlots` **refuses** to wipe it
  unless you pass `{ force: true }`.
- The rolling save backups (`stoxels_slot_N_backup_1/2`) and the
  degraded-save guard from the 2026-09 stash-wipe incident bound the
  damage of any accidental test overwrite to one session.

**Freebuff preview caveat:** the preview's storage does not survive
Freebuff restarts — keys written by earlier sessions (including real
saves loaded in a preview) can silently disappear. Never treat a slot as
safe *because* it exists in the preview; check `DevTest.state()` first.

Rules:

- Always pass `&slot=` explicitly when you care which slot is used.
- Never boot tests with `&slot=` pointing at a slot holding real progress.
- `DevTest.wipeSlots([n])` for your own test slots only — never
  `force`-wipe anything you did not create.

The harness only activates via URL param; shipping it is safe. The
`DevTest` object itself is harmless without it.


## 6. Testing Endgame bosses
- always activate Godmode for testing endgame bosses
- for testing specific effects and animations, make them last longer during the test, then later define their actual shorter durations for real gameplay
- trigger boss effects that happen on certain health percentages by dealing the appropriate amount of damage through code.
