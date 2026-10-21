// Phase 3 step 7: live globalThis accessors for externally-mutated state.
// (derived from write-site audit by dev/scratch/convert-endgame.mjs)
//------------------------------------------------------------------------


try { Object.defineProperty(globalThis, '_activeClueSwap', { get() { return _activeClueSwap; }, set(v) { _activeClueSwap = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_arcaneSurgeStreak', { get() { return _arcaneSurgeStreak; }, set(v) { _arcaneSurgeStreak = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_blackoutActive', { get() { return _blackoutActive; }, set(v) { _blackoutActive = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_blastSeq', { get() { return _blastSeq; }, set(v) { _blastSeq = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_channelStacks', { get() { return _channelStacks; }, set(v) { _channelStacks = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_clueSwapRestoreTimer', { get() { return _clueSwapRestoreTimer; }, set(v) { _clueSwapRestoreTimer = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_dragChargeCol', { get() { return _dragChargeCol; }, set(v) { _dragChargeCol = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_dragChargeDamage', { get() { return _dragChargeDamage; }, set(v) { _dragChargeDamage = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_dragChargeRow', { get() { return _dragChargeRow; }, set(v) { _dragChargeRow = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_dragChargeStacks', { get() { return _dragChargeStacks; }, set(v) { _dragChargeStacks = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_dragChargeWasCrit', { get() { return _dragChargeWasCrit; }, set(v) { _dragChargeWasCrit = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_dropExpiryEntries', { get() { return _dropExpiryEntries; }, set(v) { _dropExpiryEntries = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_encounterActive', { get() { return _encounterActive; }, set(v) { _encounterActive = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_expireCountdownEntries', { get() { return _expireCountdownEntries; }, set(v) { _expireCountdownEntries = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_firstStepToastShown', { get() { return _firstStepToastShown; }, set(v) { _firstStepToastShown = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_gridInvertTimer', { get() { return _gridInvertTimer; }, set(v) { _gridInvertTimer = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_holdEPauseActive', { get() { return _holdEPauseActive; }, set(v) { _holdEPauseActive = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_mapDef', { get() { return _mapDef; }, set(v) { _mapDef = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_monsters', { get() { return _monsters; }, set(v) { _monsters = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_pendingMeleeChargePct', { get() { return _pendingMeleeChargePct; }, set(v) { _pendingMeleeChargePct = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_pickupSpawnTimer', { get() { return _pickupSpawnTimer; }, set(v) { _pickupSpawnTimer = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_pickupTimers', { get() { return _pickupTimers; }, set(v) { _pickupTimers = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_playerAbsorptionCurrent', { get() { return _playerAbsorptionCurrent; }, set(v) { _playerAbsorptionCurrent = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_playerAbsorptionRegenDelayTimer', { get() { return _playerAbsorptionRegenDelayTimer; }, set(v) { _playerAbsorptionRegenDelayTimer = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_playerAbsorptionRegenInterval', { get() { return _playerAbsorptionRegenInterval; }, set(v) { _playerAbsorptionRegenInterval = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_playerCurrentCharge', { get() { return _playerCurrentCharge; }, set(v) { _playerCurrentCharge = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_runCurrency', { get() { return _runCurrency; }, set(v) { _runCurrency = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_runEssences', { get() { return _runEssences; }, set(v) { _runEssences = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_runItems', { get() { return _runItems; }, set(v) { _runItems = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_runLoot', { get() { return _runLoot; }, set(v) { _runLoot = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_runMaps', { get() { return _runMaps; }, set(v) { _runMaps = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_spawnTimers', { get() { return _spawnTimers; }, set(v) { _spawnTimers = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_targetId', { get() { return _targetId; }, set(v) { _targetId = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_tickInterval', { get() { return _tickInterval; }, set(v) { _tickInterval = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_veilActive', { get() { return _veilActive; }, set(v) { _veilActive = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_voidSurgeActive', { get() { return _voidSurgeActive; }, set(v) { _voidSurgeActive = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_voidSurgePollInterval', { get() { return _voidSurgePollInterval; }, set(v) { _voidSurgePollInterval = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_wardingUsedThisMap', { get() { return _wardingUsedThisMap; }, set(v) { _wardingUsedThisMap = v; }, configurable: true }); } catch (e) {}

//------------------------------------------------------------------------
//-------------------RUNTIME STATE----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// ── Encounter state ──────────────────────────────────────────────────────────
let _monsters = [];    // live monster objects currently in the encounter
let _targetId = null;  // id of the monster the player is currently targeting
let _encounterActive = false; // true while a monster encounter is running
let _tickInterval = null;  // handle for the 10Hz combat loop interval

// ── First step toast flag ──────────────────────────────────────────────────────
let _firstStepToastShown = false;

// ── Spawn timers ─────────────────────────────────────────────────────────────
// Kept so we can cancel staggered spawns if the encounter ends early.
let _spawnTimers = [];

// ── Pickup state ─────────────────────────────────────────────────────────────
export let _pickups = new Map(); // key:"row-col" → pickupDef
let _pickupTimers = [];        // expiry timers, cancelled on encounter stop
let _pickupSpawnTimer = null;      // recurring spawn-attempt timer

// ── Pickup / drop expiry tracking (pause-aware) ───────────────────────────
let _dropExpiryEntries = []; // { map, key, value, lifetimeMs, expiresAt, timer, overlayId, removeOverlayFn, remaining }
export let _pickupSpawnerInfo = { timer: null, expiresAt: 0, remaining: null }; // tracks next pickup spawn timeout for pause
let _expireCountdownEntries = []; // { overlayId, lifetimeMs, startedAt, expiresAt, timeout, interval, remaining, delayRemaining }

// ── Boss state ───────────────────────────────────────────────────────────────
export let _bossTimers = {};      // monsterId → array of mechanic timer handles
export let _bossCorrupted = new Map(); // key:"row-col" → { timer } for Corrupt Cells
export let _bossFrozen = new Map();    // key:"row-col" → { thawTimer, creepTimer, pending, cfg } for Frozen Cells

// ── Loot drop state ──────────────────────────────────────────────────────────
// Active loot drops on the grid: key "row-col" → item object
export let _lootDrops = new Map();

// Per-run temporary loot bag - items the player has claimed this map run.
// Flushed to the stash on successful map completion.
let _runLoot = [];

let _veilActive = false;   // true while the Grid Veil overlay is showing
let _blackoutActive = false;  // true while the Clue Blackout is active

let _clueSwapRestoreTimer = null;  // pending restore for the Clue Swap mechanic
let _activeClueSwap = null;        // { groups:[{rows,spans,orig}] } while a Clue Swap is active
let _gridInvertTimer = null;       // pending removal of the Inversion Field filter

let _voidSurgeActive = false;  // true while a Void Surge safe-zone is on screen
let _voidSurgePollInterval = null; // handle for the HUD-position poll during Void Surge

// ── Generic screen-blast engine state ────────────────────────────────────────
// Shared by all dodge-style boss mechanics (Void Surge, Heat Death Bloom,
// Rewrite Fate, Prior Collapse). Each active blast registers itself in the
// map so boss death / encounter stop can tear every variant down at once.
export let _blastSeq = 0;             // monotonically increasing blast id counter
export const _activeBlasts = new Map(); // blast id → { timers:[], poll:null }

// ── Prior Bomb fill tracker ──────────────────────────────────────────────────
// Circular buffer of [row, col] for recently correctly-filled cells.
export let _recentFills = [];

// True when [r, c] refers to a real cell of the CURRENT puzzle grid.
// Recent-fill coordinates can outlive the grid they were recorded on (the
// buffer is cleared on encounter start, but boss timers/P3 cascades can
// still straddle a teardown), so every pool consumer MUST re-validate
// against the live grids before indexing - otherwise a coordinate from a
// larger previous level indexes userGrid[r] as undefined and throws
// "can't access property ..., globalThis.userGrid[r] is undefined".
// userGrid/revealedGrid/cur.grid are always rebuilt together (start-level.js)
// with identical dimensions, so one row/col check covers all three.
export function _cellInBounds(r, c) {
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
let _dragChargeDamage = 0;   // accumulated damage of the current stroke
export let _dragChargeElements = { fire: 0, cold: 0, lightning: 0, shadow: 0 }; // accumulated per-element share of _dragChargeDamage
let _dragChargeStacks = 0;   // number of painted cells in the current stroke
let _dragChargeRow = -1;     // stroke start cell - launch origin of the shot
let _dragChargeCol = -1;
let _dragChargeWasCrit = false; // true if ANY cell in the current stroke rolled a crit

// Snapshot of the original map-level def, captured at _startEncounter.
// Used to read boss/requiredKills config after cur has been replaced by chained puzzles.
let _mapDef = null;


// --- PLAYER MELEE CONSTANTS (Secret-of-Mana-style manual charge) ---
// The melee bar auto-charges to 100% on its own and is spent by the
// release strike: the hit deals charge% of full damage (100% charge =
// 100% damage, holding past full overcharges through the weapon-art
// tiers up to 500%) and resets the bar to zero. There are no automatic
// melee strikes.
// Base charge time in seconds when no weapon is equipped. The equipped
// weapon's attackIntervalSeconds defines the actual base (see
// _getPlayerAttackInterval in combat-player-stats.js); the weapon's
// attack_speed mods then subtract seconds from it, and
// PLAYER_CHARGE_TIME_MULT shortens the result globally.
export const PLAYER_DEFAULT_ATTACK_INTERVAL = 10;
export const PLAYER_MIN_ATTACK_INTERVAL = 2; // Lower clamp so charges can't be spammed
// Hard floor (seconds) on the FINAL time-to-full-charge after every % bonus.
// Without it, stacked "% increased charge speed" (capped at 100%) reached 0s
// and the charge bar stopped producing attacks altogether.
export const PLAYER_ABS_MIN_CHARGE_TIME = 0.65;
export const PLAYER_MELEE_DAMAGE = 20; // Default flat damage of a fully-charged unarmed strike
export const PLAYER_MELEE_ANIM_DURATION_MS = 500; // Matches monster melee duration
// Global melee balance for the manual system: manual strikes land far less
// often than the old auto-strikes did, so the melee channel hits harder.
export const MELEE_DAMAGE_MULT = 3.0;
// Global charge pacing for the manual system (0.65 = ~35% faster than the
// old auto-strike intervals, which now serve as time-to-full-charge).
export const PLAYER_CHARGE_TIME_MULT = 0.65;


// ── Absorption shield state ───────────────────────────────────────────────
let _playerAbsorptionCurrent = 0;
let _playerAbsorptionRegenDelayTimer = null;
let _playerAbsorptionRegenInterval = null;

// ── Gear proc state ──────────────────────────────────────────────────────
// Warding (talisman): the once-per-map killing-blow save is consumed on use
// and only refreshes when a new map run begins.
let _wardingUsedThisMap = false;
// Channel (offhand): stacks gained per consecutive correct cell, consumed by
// the next player hit or released automatically at the max-stack cap.
let _channelStacks = 0;
// Arcane Surge (arcane sigil): consecutive correct cells without a mistake.
let _arcaneSurgeStreak = 0;

// --- NEW STATE VARIABLE ---
let _playerCurrentCharge = 0;
// Charge % consumed by the in-flight manual melee swing. _doWeaponAttack
// snapshots it at key-press time so the strike damage matches the bar the
// player saw; _applyPlayerMeleeImpact consumes it at impact (null = no
// pending swing - legacy callers deal full damage).
let _pendingMeleeChargePct = null;

// Hold-parry pause - true while the player holds the parry key (R by default) to freeze their own melee charge bar
let _holdEPauseActive = false;

// Active currency drops on the grid: key "row-col" → currency def object
export let _currencyDrops = new Map();

// Active regular-item drops on the grid: key "row-col" → { defId }
// Claimed items go straight into the player's persistent STATE.inventory.
export let _itemDrops = new Map();

// Per-run currency tracker - currency picked up during the current map run,
// aggregated by currency id, shown in the leave-map transition summary.
// Cleared by _chainCleanup() alongside _runLoot.
let _runCurrency = [];

// Per-run regular-item tracker - ITEM_DEFS items claimed during the current
// map run ({ defId, icon, name, rarity }), shown in the leave-map transition
// summary. Cleared by _chainCleanup() alongside _runLoot.
let _runItems = [];
// Per-run map-drop tracker - map items (🗺️) claimed during the current map
// run, shown in the leave-map transition summary. Cleared by
// _chainCleanup() alongside _runLoot.
let _runMaps = [];

// Per-run essence tracker - essences claimed during the current map run,
// aggregated by essence id, shown in the leave-map transition summary.
// Cleared by _chainCleanup() alongside _runLoot.
let _runEssences = [];





//------------------------------------------------------------------------
//-------------------ENCOUNTER GUARD--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Central guard used before every combat operation.
// Returns true only when an endgame encounter is actually running.
export function _isActive() {
    return _encounterActive
        && typeof globalThis.cur !== 'undefined' && globalThis.cur
        && (globalThis.cur.isMonsterLevel === true);  // check if this level is assigned as a level that contains monsters
}

// True while the current level is a CAMPAIGN level running its light monster
// encounter (stamped by _prepareCampaignEncounter in encounter.js).
// Such levels set isMonsterLevel so the shared combat loop runs, but they
// must NOT be treated as endgame map runs: no encounter chain, no map
// objectives, no map-failed flow, no atlas completion.
export function _isCampaignRun() {
    return typeof globalThis.cur !== 'undefined' && !!globalThis.cur
        && globalThis.cur.campaignMonsters === true
        && globalThis.cur.isMapRunSeed !== true
        && !(typeof window !== 'undefined' && window._egIsMapDeviceRun);
}

// True while a real endgame map / encounter-chain run is active.
export function _isMapRun() {
    return typeof _isActive === 'function' && _isActive() && !_isCampaignRun();
}


