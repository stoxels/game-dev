//------------------------------------------------------------------------
// PHASE 3 (endgame step): converted to a real ES module. Do not add new
// bare cross-file references - import explicitly or use globalThis.X for
// names still living in the concatenated body. See MIGRATION.md.
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Phase 3 step 7: live globalThis accessors for externally-mutated state.
// (derived from write-site audit by dev/scratch/convert-endgame.mjs)
//------------------------------------------------------------------------
try { Object.defineProperty(globalThis, '_egActiveClueSwap', { get() { return _egActiveClueSwap; }, set(v) { _egActiveClueSwap = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egArcaneSurgeStreak', { get() { return _egArcaneSurgeStreak; }, set(v) { _egArcaneSurgeStreak = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egBlackoutActive', { get() { return _egBlackoutActive; }, set(v) { _egBlackoutActive = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egBlastSeq', { get() { return _egBlastSeq; }, set(v) { _egBlastSeq = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egChannelStacks', { get() { return _egChannelStacks; }, set(v) { _egChannelStacks = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egClueSwapRestoreTimer', { get() { return _egClueSwapRestoreTimer; }, set(v) { _egClueSwapRestoreTimer = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egDragChargeCol', { get() { return _egDragChargeCol; }, set(v) { _egDragChargeCol = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egDragChargeDamage', { get() { return _egDragChargeDamage; }, set(v) { _egDragChargeDamage = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egDragChargeRow', { get() { return _egDragChargeRow; }, set(v) { _egDragChargeRow = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egDragChargeStacks', { get() { return _egDragChargeStacks; }, set(v) { _egDragChargeStacks = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egDragChargeWasCrit', { get() { return _egDragChargeWasCrit; }, set(v) { _egDragChargeWasCrit = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egDropExpiryEntries', { get() { return _egDropExpiryEntries; }, set(v) { _egDropExpiryEntries = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egEncounterActive', { get() { return _egEncounterActive; }, set(v) { _egEncounterActive = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egExpireCountdownEntries', { get() { return _egExpireCountdownEntries; }, set(v) { _egExpireCountdownEntries = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egFirstStepToastShown', { get() { return _egFirstStepToastShown; }, set(v) { _egFirstStepToastShown = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egGridInvertTimer', { get() { return _egGridInvertTimer; }, set(v) { _egGridInvertTimer = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egHoldEPauseActive', { get() { return _egHoldEPauseActive; }, set(v) { _egHoldEPauseActive = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egMapDef', { get() { return _egMapDef; }, set(v) { _egMapDef = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egMonsters', { get() { return _egMonsters; }, set(v) { _egMonsters = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egPendingMeleeChargePct', { get() { return _egPendingMeleeChargePct; }, set(v) { _egPendingMeleeChargePct = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egPickupSpawnTimer', { get() { return _egPickupSpawnTimer; }, set(v) { _egPickupSpawnTimer = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egPickupTimers', { get() { return _egPickupTimers; }, set(v) { _egPickupTimers = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egPlayerAbsorptionCurrent', { get() { return _egPlayerAbsorptionCurrent; }, set(v) { _egPlayerAbsorptionCurrent = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egPlayerAbsorptionRegenDelayTimer', { get() { return _egPlayerAbsorptionRegenDelayTimer; }, set(v) { _egPlayerAbsorptionRegenDelayTimer = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egPlayerAbsorptionRegenInterval', { get() { return _egPlayerAbsorptionRegenInterval; }, set(v) { _egPlayerAbsorptionRegenInterval = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egPlayerCurrentCharge', { get() { return _egPlayerCurrentCharge; }, set(v) { _egPlayerCurrentCharge = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egRunCurrency', { get() { return _egRunCurrency; }, set(v) { _egRunCurrency = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egRunEssences', { get() { return _egRunEssences; }, set(v) { _egRunEssences = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egRunItems', { get() { return _egRunItems; }, set(v) { _egRunItems = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egRunLoot', { get() { return _egRunLoot; }, set(v) { _egRunLoot = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egRunMaps', { get() { return _egRunMaps; }, set(v) { _egRunMaps = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egSpawnTimers', { get() { return _egSpawnTimers; }, set(v) { _egSpawnTimers = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egTargetId', { get() { return _egTargetId; }, set(v) { _egTargetId = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egTickInterval', { get() { return _egTickInterval; }, set(v) { _egTickInterval = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egVeilActive', { get() { return _egVeilActive; }, set(v) { _egVeilActive = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egVoidSurgeActive', { get() { return _egVoidSurgeActive; }, set(v) { _egVoidSurgeActive = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egVoidSurgePollInterval', { get() { return _egVoidSurgePollInterval; }, set(v) { _egVoidSurgePollInterval = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egWardingUsedThisMap', { get() { return _egWardingUsedThisMap; }, set(v) { _egWardingUsedThisMap = v; }, configurable: true }); } catch (e) {}

//------------------------------------------------------------------------
//-------------------RUNTIME STATE----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// ── Encounter state ──────────────────────────────────────────────────────────
let _egMonsters = [];    // live monster objects currently in the encounter
let _egTargetId = null;  // id of the monster the player is currently targeting
let _egEncounterActive = false; // true while a monster encounter is running
let _egTickInterval = null;  // handle for the 10Hz combat loop interval

// ── First step toast flag ──────────────────────────────────────────────────────
let _egFirstStepToastShown = false;

// ── Spawn timers ─────────────────────────────────────────────────────────────
// Kept so we can cancel staggered spawns if the encounter ends early.
let _egSpawnTimers = [];

// ── Pickup state ─────────────────────────────────────────────────────────────
export let _egPickups = new Map(); // key:"row-col" → pickupDef
let _egPickupTimers = [];        // expiry timers, cancelled on encounter stop
let _egPickupSpawnTimer = null;      // recurring spawn-attempt timer

// ── Pickup / drop expiry tracking (pause-aware) ───────────────────────────
let _egDropExpiryEntries = []; // { map, key, value, lifetimeMs, expiresAt, timer, overlayId, removeOverlayFn, remaining }
export let _egPickupSpawnerInfo = { timer: null, expiresAt: 0, remaining: null }; // tracks next pickup spawn timeout for pause
let _egExpireCountdownEntries = []; // { overlayId, lifetimeMs, startedAt, expiresAt, timeout, interval, remaining, delayRemaining }

// ── Boss state ───────────────────────────────────────────────────────────────
export let _egBossTimers = {};      // monsterId → array of mechanic timer handles
export let _egBossCorrupted = new Map(); // key:"row-col" → { timer } for Corrupt Cells
export let _egBossFrozen = new Map();    // key:"row-col" → { thawTimer, creepTimer, pending, cfg } for Frozen Cells

// ── Loot drop state ──────────────────────────────────────────────────────────
// Active loot drops on the grid: key "row-col" → item object
export let _egLootDrops = new Map();

// Per-run temporary loot bag - items the player has claimed this map run.
// Flushed to the stash on successful map completion.
let _egRunLoot = [];

let _egVeilActive = false;   // true while the Grid Veil overlay is showing
let _egBlackoutActive = false;  // true while the Clue Blackout is active

let _egClueSwapRestoreTimer = null;  // pending restore for the Clue Swap mechanic
let _egActiveClueSwap = null;        // { groups:[{rows,spans,orig}] } while a Clue Swap is active
let _egGridInvertTimer = null;       // pending removal of the Inversion Field filter

let _egVoidSurgeActive = false;  // true while a Void Surge safe-zone is on screen
let _egVoidSurgePollInterval = null; // handle for the HUD-position poll during Void Surge

// ── Generic screen-blast engine state ────────────────────────────────────────
// Shared by all dodge-style boss mechanics (Void Surge, Heat Death Bloom,
// Rewrite Fate, Prior Collapse). Each active blast registers itself in the
// map so boss death / encounter stop can tear every variant down at once.
export let _egBlastSeq = 0;             // monotonically increasing blast id counter
export const _egActiveBlasts = new Map(); // blast id → { timers:[], poll:null }

// ── Prior Bomb fill tracker ──────────────────────────────────────────────────
// Circular buffer of [row, col] for recently correctly-filled cells.
export let _egRecentFills = [];

// True when [r, c] refers to a real cell of the CURRENT puzzle grid.
// Recent-fill coordinates can outlive the grid they were recorded on (the
// buffer is cleared on encounter start, but boss timers/P3 cascades can
// still straddle a teardown), so every pool consumer MUST re-validate
// against the live grids before indexing - otherwise a coordinate from a
// larger previous level indexes userGrid[r] as undefined and throws
// "can't access property ..., globalThis.userGrid[r] is undefined".
// userGrid/revealedGrid/cur.grid are always rebuilt together (start-level.js)
// with identical dimensions, so one row/col check covers all three.
export function _egCellInBounds(r, c) {
    const ug = globalThis.userGrid;
    if (!Array.isArray(ug) || !Array.isArray(ug[r])) return false;
    const rg = globalThis.revealedGrid;
    if (!Array.isArray(rg) || !Array.isArray(rg[r])) return false;
    const sol = globalThis.cur && globalThis.cur.grid;
    if (!Array.isArray(sol) || !Array.isArray(sol[r])) return false;
    return c >= 0 && c < ug[r].length;
}

// ── Drag-paint charged shot state ────────────────────────────────────────────
// While the player drag-paints, every correct fill stacks its rolled damage
// into a single charging projectile. It is released as one combined-damage
// shot when the player stops painting (stopPainting).
let _egDragChargeDamage = 0;   // accumulated damage of the current stroke
export let _egDragChargeElements = { fire: 0, cold: 0, lightning: 0, shadow: 0 }; // accumulated per-element share of _egDragChargeDamage
let _egDragChargeStacks = 0;   // number of painted cells in the current stroke
let _egDragChargeRow = -1;     // stroke start cell - launch origin of the shot
let _egDragChargeCol = -1;
let _egDragChargeWasCrit = false; // true if ANY cell in the current stroke rolled a crit

// Snapshot of the original map-level def, captured at _egStartEncounter.
// Used to read boss/requiredKills config after cur has been replaced by chained puzzles.
let _egMapDef = null;


// --- PLAYER MELEE CONSTANTS (Secret-of-Mana-style manual charge) ---
// The melee bar charges over time and is spent by MANUAL attacks (E key):
// the strike deals charge% of full damage (100% charge = 100% damage) and
// resets the bar to zero. There are no automatic melee strikes.
// Base charge time in seconds when no weapon is equipped. The equipped
// weapon's attackIntervalSeconds defines the actual base (see
// _egGetPlayerAttackInterval in endgame-player-stats.js); the weapon's
// attack_speed mods then subtract seconds from it, and
// EG_PLAYER_CHARGE_TIME_MULT shortens the result globally.
export const EG_PLAYER_DEFAULT_ATTACK_INTERVAL = 10;
export const EG_PLAYER_MIN_ATTACK_INTERVAL = 2; // Lower clamp so charges can't be spammed
export const EG_PLAYER_MELEE_DAMAGE = 20; // Default flat damage of a fully-charged unarmed strike
export const EG_PLAYER_MELEE_ANIM_DURATION_MS = 500; // Matches monster melee duration
// Global melee balance for the manual system: manual strikes land far less
// often than the old auto-strikes did, so the melee channel hits harder.
export const EG_MELEE_DAMAGE_MULT = 2.0;
// Global charge pacing for the manual system (0.65 = ~35% faster than the
// old auto-strike intervals, which now serve as time-to-full-charge).
export const EG_PLAYER_CHARGE_TIME_MULT = 0.65;


// ── Absorption shield state ───────────────────────────────────────────────
let _egPlayerAbsorptionCurrent = 0;
let _egPlayerAbsorptionRegenDelayTimer = null;
let _egPlayerAbsorptionRegenInterval = null;

// ── Gear proc state ──────────────────────────────────────────────────────
// Warding (talisman): the once-per-map killing-blow save is consumed on use
// and only refreshes when a new map run begins.
let _egWardingUsedThisMap = false;
// Channel (offhand): stacks gained per consecutive correct cell, consumed by
// the next player hit or released automatically at the max-stack cap.
let _egChannelStacks = 0;
// Arcane Surge (arcane sigil): consecutive correct cells without a mistake.
let _egArcaneSurgeStreak = 0;

// --- NEW STATE VARIABLE ---
let _egPlayerCurrentCharge = 0;
// Charge % consumed by the in-flight manual melee swing. _egDoWeaponAttack
// snapshots it at key-press time so the strike damage matches the bar the
// player saw; _egApplyPlayerMeleeImpact consumes it at impact (null = no
// pending swing - legacy callers deal full damage).
let _egPendingMeleeChargePct = null;

// Hold-parry pause - true while the player holds the parry key (R by default) to freeze their own melee charge bar
let _egHoldEPauseActive = false;

// Active currency drops on the grid: key "row-col" → currency def object
export let _egCurrencyDrops = new Map();

// Active regular-item drops on the grid: key "row-col" → { defId }
// Claimed items go straight into the player's persistent STATE.inventory.
export let _egItemDrops = new Map();

// Per-run currency tracker - currency picked up during the current map run,
// aggregated by currency id, shown in the leave-map transition summary.
// Cleared by _egChainCleanup() alongside _egRunLoot.
let _egRunCurrency = [];

// Per-run regular-item tracker - ITEM_DEFS items claimed during the current
// map run ({ defId, icon, name, rarity }), shown in the leave-map transition
// summary. Cleared by _egChainCleanup() alongside _egRunLoot.
let _egRunItems = [];
// Per-run map-drop tracker - map items (🗺️) claimed during the current map
// run, shown in the leave-map transition summary. Cleared by
// _egChainCleanup() alongside _egRunLoot.
let _egRunMaps = [];

// Per-run essence tracker - essences claimed during the current map run,
// aggregated by essence id, shown in the leave-map transition summary.
// Cleared by _egChainCleanup() alongside _egRunLoot.
let _egRunEssences = [];





//------------------------------------------------------------------------
//-------------------ENCOUNTER GUARD--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Central guard used before every combat operation.
// Returns true only when an endgame encounter is actually running.
export function _egIsActive() {
    return _egEncounterActive
        && typeof cur !== 'undefined' && globalThis.cur
        && (globalThis.cur.isMonsterLevel === true);  // check if this level is assigned as a level that contains monsters
}

// True while the current level is a CAMPAIGN level running its light monster
// encounter (stamped by _egPrepareCampaignEncounter in endgame-encounter.js).
// Such levels set isMonsterLevel so the shared combat loop runs, but they
// must NOT be treated as endgame map runs: no encounter chain, no map
// objectives, no map-failed flow, no atlas completion.
export function _egIsCampaignRun() {
    return typeof cur !== 'undefined' && !!globalThis.cur
        && globalThis.cur.campaignMonsters === true
        && globalThis.cur.isMapRunSeed !== true
        && !(typeof window !== 'undefined' && window._egIsMapDeviceRun);
}

// True while a real endgame map / encounter-chain run is active.
export function _egIsMapRun() {
    return typeof _egIsActive === 'function' && _egIsActive() && !_egIsCampaignRun();
}


//------------------------------------------------------------------------
//-------------------SCREEN NAVIGATION REGISTRY---------------------------
//------------------------------------------------------------------------
// Central registry for the endgame screen names used by back-navigation
// (atlas-ui ↔ gate ↔ nexus form a load-order cycle that only works
// because dispatch is deferred through inline onclick strings). Screens
// store a backFn NAME; the resolver validates that the name really is a
// global function so a typo can never silently produce a dead back button.
export const EG_SCREEN_NAV = {
    hub: 'showEndgameHub',
    gate: 'showEndgameGate',
    atlas: 'showEndgameAtlas',
    nexus: 'showEndgameNexus',
    vendor: 'showEndgameVendor',
    bossTest: 'showEndgameBossTest',
};

// Returns `name` if it names a callable global (function declaration),
// otherwise warns and returns the fallback.
export function _egResolveBackFn(name, fallback) {
    if (typeof name === 'string' && typeof window[name] === 'function') return name;
    if (name && name !== fallback) {
        console.warn('[load-order] unknown endgame back-nav function:', name, '- falling back to', fallback);
    }
    return fallback || EG_SCREEN_NAV.nexus;
}