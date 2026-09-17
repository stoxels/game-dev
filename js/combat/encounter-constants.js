//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Encounter constants & configuration: zone ids, monster caps, timing
// tunables, damage-number durations, block-lockout state. Pure data -
// every combat submodule imports from here.

// Phase 4 split: write-through globalThis accessors. The facade and sibling
// split modules rebind these through globalThis.<name> assignment
// (imported module bindings are read-only views) - the established
// step-9/step-10 pattern.
try { Object.defineProperty(globalThis, '_egPlayerBlockLockoutUntil', { get() { return _egPlayerBlockLockoutUntil; }, set(v) { _egPlayerBlockLockoutUntil = v; }, configurable: true }); } catch (e) {}


//------------------------------------------------------------------------
//-------------------CONSTANTS & CONFIGURATION----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// All zone IDs where monster cards can be rendered.
export const EG_MONSTER_ZONES = [
    'eg-monster-panel',
    'eg-panel-left',
    'eg-panel-right',
    'eg-panel-bottom',
    'eg-panel-top-corner'
];

// Default monster count per wave if cur.maxMonsters is not set.
// Scales with monster level so T16 feels dense: 3 at low tiers, 4 at mid, 5 at high.
// T1 stays breezy, T3-7 ramp, T8+ feels crowded (PoE density).
export function _egGetDefaultMonsterCap(baseLevel) {
    const lvl = Number(baseLevel) || 1;
    if (lvl >= 60) return 5;
    if (lvl >= 30) return 4;
    if (lvl >= 14) return 3;
    return 2; // T1-T2 very light
}
export const EG_DEFAULT_MONSTER_CAP = 3;


// Delay before a boss materialises after entering an arena / after the
// previous arena boss died (ms).
export const EG_BOSS_SPAWN_DELAY_MS = 1500;

// Delay range for respawn timer (ms). A random value in [min, min+variance] is used.
// Shorter at high tiers so the screen never stays at 1 monster for long.
export function _egGetRespawnDelayMs(baseLevel) {
    const lvl = Number(baseLevel) || 1;
    if (lvl >= 60) return { min: 2200, range: 2800 }; // 2.2-5.0s at T13+
    if (lvl >= 30) return { min: 2800, range: 3500 }; // 2.8-6.3s at T8+
    return { min: 4000, range: 6000 }; // 4-10s at low tiers
}
export const EG_RESPAWN_DELAY_MIN_MS = 4000;
export const EG_RESPAWN_DELAY_RANGE_MS = 6000;

// Delay before re-rendering the panel after a monster death (ms).
export const EG_PANEL_RERENDER_DELAY_MS = 350;

// How long the player HUD hit flash lasts (ms).
export const EG_PLAYER_HIT_FLASH_MS = 150;

// How long a floating damage number stays on screen (ms).
export const EG_DAMAGE_NUMBER_DURATION_MS = 1050;

// How long a floating player damage number stays on screen (ms).
export const EG_PLAYER_DAMAGE_NUMBER_DURATION_MS = 1050;

// How long the immune flash and label last on the card (ms).
export const EG_IMMUNE_FLASH_DURATION_MS = 400;
export const EG_IMMUNE_LABEL_DURATION_MS = 700;

// Melee animation roundtrip duration (ms). Impact fires at the midpoint.
export const EG_MELEE_ANIM_DURATION_MS = 500;

// Ranged monster projectile travel duration (ms).
export const EG_MONSTER_PROJ_DURATION_MS = 400;

// Base window after a successful block during which the player cannot
// block again (ms). Player remains free to attack - recovery only disables
// blocking. Reduced by the blockRecoveryPct stat.
export const EG_BLOCK_LOCKOUT_BASE_MS = 8000;

// Hold-parry baseline values (gear adds on top via parry/deflect mods)
export const EG_PARRY_BASE_PCT = 50;

export const EG_DEFLECT_BASE_PCT = 5;

export const EG_DEFLECT_BASE_DMG_PCT = 30;


// Timestamp (Date.now()) until which the player cannot block again due to
// a recent block. 0 when not locked out.
let _egPlayerBlockLockoutUntil = 0;

// Tuning constants for the initial monster spawn stagger (also used by
// endgame-encounter-tick.js). Declared with `let` so the rebalance pass
// can overwrite them at load time.
export let EG_INITIAL_SPAWN_STAGGER_BASE_MS = 500;
