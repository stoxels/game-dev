# Attribute System Design — Precision / Momentum / Fortune

Companion to `docs/passive-tree-travel-node-design.md`. Design only, nothing
implemented. Grounded in the current codebase.

## 0. The key finding that shapes everything

The endgame already ships **str/agi/int** (`EG_PLAYER_BASE_ATTRIBUTES`,
`attrPointsPerLevel: 5`, item requirement checks) — but they are
**inert placeholders** (`endgame-player-stats.js` header literally lists
"strength, dexterity, intelligence" under *Future expansion*). They currently
only gate item requirements. Nothing multiplies, converts, or scales by them.

That is a problem worth solving **with** this design, not around:

- If P/M/F are a *fourth* attribute system, we now have six attributes and two
  dead ones. Bad.
- If P/M/F **replace** str/agi/int as the names of the same three slots, we
  inherit an existing allocation UI, persistence, requirement gating, and the
  `EG_LEVELING_ATTRS` icon rows for free — and the dead placeholders get a
  purpose: attributes become the shared currency that travel nodes accumulate
  and keystones consume.

**Recommendation: rename, don't add.** Precision/absorb-side → Strength-slot,
speed → Agility-slot, luck → Intelligence-slot (exact mapping in §2).
Keep the internal keys `str/agi/int` so no requirement check breaks; only
display names and icons change. PoE precedent: attribute identity is
mostly flavor until keystones reference it — exactly our situation.

If you'd rather keep str/agi/int as the combat-y level-up attributes and have
P/M/F be tree-only, everything below still works — the "sources" section would
just exclude level-up points, and §3's conversions read P/M/F instead. The
rename is the cheaper, cleaner path though.

---

## 1. What each attribute IS

| Attribute | Slot | Identity | Feeds | Fantasy |
|---|---|---|---|---|
| **PRECISION** | `str` | accuracy & durability of answers | question quality, item quality, armour/absorption side of combat | the careful actuary |
| **MOMENTUM** | `agi` | speed & tempo | timers, cooldowns, class acceleration, attack speed | the driven sprinter |
| **FORTUNE** | `int` | probability & luck | drops, procs, crit chance, replay triggers | the gambler-philosopher |

Per-point effects (base rate, before sources). These are deliberately small —
attributes are the *floor* of the power curve, notables the ceiling:

```
PRECISION (per point):
  +0.5% item quality            (cap contribution: +25% at 50)
  +0.25% correct-answer reward  (questions & exercises)
  +2 flat absorption            (combat; uses existing absorption bucket)

MOMENTUM (per point):
  +0.4% class ability speed     (cooldown reduction, cap +20% at 50)
  +1 second start-of-level time (flat, uncapped but linear)
  +0.3% attack speed            (combat)

FORTUNE (per point):
  +0.3% item drop chance
  +0.25% proc chance (Poisson / Binomial Burst / Bayesian Update)
  +0.2% crit chance             (combat)
```

Design rules:
- **Every attribute touches at least two game phases** (one campaign-side, one
  combat-side) so no attribute is dead weight before the endgame exists.
- **Caps on multiplicative lines only** (quality, cooldown) so 100 stacking
  can't break percent-based systems; flat lines (seconds, absorption) stay
  linear and safe.
- Nothing here multiplies another attribute — conversions (§3) are the only
  cross-attribute interaction, keeping the algebra auditable.

## 2. Sources — where attributes come from

Two design constraints from the audit: max points ≈ 84 today, and travel nodes
must be *counted* but cheap. So attribute income should be **broad but shallow**:

| Source | Amount | Notes |
|---|---|---|
| Level-up (endgame, later campaign) | already exists: 5/level → now fills P/M/F | zero new systems; this is the rename payoff |
| Travel nodes | **+1 per node** (not PoE's +5 — our point economy is smaller) | ~40% of new travel nodes carry an attribute |
| `travel_any_attribute` | +1, chosen at allocation | the PoE 2 adoption; a handful per region |
| Class gear nodes | +3 to the class attribute | Statistician→Precision, Mathmagician→Momentum, Probabilist→Fortune (see §3 for the tension this creates) |
| Quest milestones | +1 every 4th milestone | keeps the existing 56-milestone economy relevant |
| Items (late-game) | +1..3, rare affix | endgame itemization hook, no campaign impact |

Projected budget: ~60–90 attribute points at endgame tree completion. At base
rates that's roughly +25% quality / +30s start time / +25% drop chance across a
full build — meaningful, never dominant. Keystones are where attributes become
*exciting* (§3).

Class start mapping (PoE-triangle layout): Stox starts bottom-left near
CLASSES/ITEMS border → Precision-leaning start; Trix north → Momentum; Syla
bottom-right → Fortune. This mirrors how PoE starts set your attribute leaning.

## 3. Keystones that consume attributes

The PoE pattern: keystones don't *grant* attributes, they **convert or invert**
them. Each conversion below is a real design lever on existing keystones —
none are implemented, these are the candidates the tree layout should reserve
border positions for.

**Conversion keystones (change what a stack means):**

- **"Residual Dividend"** *(new, QUESTIONS/ITEMS border)* — All FORTUNE is
  counted as PRECISION for quality effects, and vice versa. Builds that
  over-invest one attribute can pivot; classic PoE stat-swap.
- **"Overclocked Curriculum"** *(new, QUESTIONS/CLASSES border)* — All MOMENTUM
  is counted as PRECISION; you lose the speed identity for accuracy scaling.
  Pairs with slow, careful high-stakes builds.

**Inversion keystones (downside-for-upside, our keystone house style):**

- **"Zero Variance" (existing)** — gains a second line: *"All FORTUNE is
  treated as 0, but its drop/proc contributions are locked at the value you
  had when allocating."* Consumes the attribute by nullifying variance —
  thematically perfect for the existing keystone.
- **"Gambler's Ruin" (existing)** — second line: *"MOMENTUM no longer grants
  start-of-level time; instead each point adds +0.5s to every correct fill."*
  Converts a flat buffer into a tempo engine — exactly the keystone's risk
  identity.

**Threshold keystones (care — most expensive to balance):**

- **"Law of Large Numbers" (existing)** — alternative line: *"With 40+
  combined PRECISION and FORTUNE, the auto-reveal also marks the revealed
  cells."* Big payoff, gated behind real investment. Thresholds should appear
  on **at most 3 keystones** total, at 30/40/50, and always on combined
  (attribute+attribute) sums, never single-attribute — single thresholds
  create one mandatory dump stat.
- **"Tailwind" (existing)** — candidate: *"While above 30 MOMENTUM, the +10s
  per minute becomes +15s."*

**Rule of thumb:** a keystone should either convert ~all of one attribute,
nullify one, or gate on a combined sum. Never "scales per point" — that's a
notable, not a keystone.

## 4. UI surfaces

Four surfaces, in order of visibility:

**1. Tooltip attribute rows (passive tree).** Every node granting attributes
shows a compact colored chip line under its description:
`◆ +1 Momentum` — cyan Precision `#66fcf1`, orange Momentum `#ff9f43`,
violet Fortune `#c080ff` (matching the existing cluster watermark palette:
QUESTIONS cyan, KEYSTONES amber, CLASSES violet — Momentum borrows amber from
KEYSTONES since both live near the timer identity; accept the collision).
Chips make attribute sources scannable while pathing — PoE's smalls read the
same way.

**2. Character sheet attribute block (endgame hub).** The existing
`EG_LEVELING_ATTRS` rows (💪🏃🧠) become ◇◆▲ Precision/Momentum/Fortune with:
current value, sources breakdown on hover (`12 tree · 15 levels · 3 items`),
and the *effective* value after any keystone conversions — converted values
shown struck-through → new color, e.g. `12 Fortune ~~→~~ 12 Precision`.
This hover is the single most important UI piece: conversions are where
players get confused.

**3. Allocation flow.** Level-up points go into the existing +/- rows (no
change needed). Tree attribute chips are display-only in tooltips. The
`travel_any_attribute` node needs a small picker — reuse the keystone-choice
modal pattern (`_dofNudge`-style confirm UI) with three options; allocation
stores the chosen key in the dev-save.

**4. Requirement gating (free).** Item requirements currently print raw
`str/agi/int` checks; they'll now read Precision/Momentum/Fortune for free
via the rename. This quietly makes requirement-check items an attribute sink
— a nice secondary use PoE also has (attribute requirements shape gearing).

## 5. Implementation order (when we do build it)

1. **Rename + display pass** — display names, icons, tooltip chips. Zero
   balance risk; str/agi/int keep working untouched.
2. **Stat wiring** — plug the §1 per-point lines into the existing buckets
   (`quality`, cooldowns, absorption bucket, crit bucket). Each line is a
   one-line multiplier on an existing aggregate.
3. **Travel node attributes** — extend the generator's `TRAVEL_RETIERS` with
   attribute grants on new `travel_` nodes.
4. **Keystone conversions** — one keystone at a time, starting with the
   Zero Variance nullify (simplest read: value → 0).
5. **Thresholds last** — only after point income grows past ~150 total.

Steps 1–2 are campaign-safe (attributes barely exist pre-endgame today);
step 3+ should ride the dev-tree-first workflow we already have.

## 6. Open questions

- Rename vs parallel system (this doc recommends rename; needs your call).
- Should level-up points and tree attribute grants be the *same pool* per
  slot (they'd stack) or tracked separately with different caps? Same pool
  is simpler and is what the doc assumes.
- Do class *items* (gear nodes) granting +3 skew the intended class identity,
  or reinforce it? Needs playtesting once the tree is connected.
- Threshold display: show progress ("28/40") in tooltips, or only after
  allocation? PoE shows only on hover; recommend the same.
