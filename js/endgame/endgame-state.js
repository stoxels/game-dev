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
let _egPickups = new Map(); // key:"row-col" → pickupDef
let _egPickupTimers = [];        // expiry timers, cancelled on encounter stop
let _egPickupSpawnTimer = null;      // recurring spawn-attempt timer

// ── Pickup / drop expiry tracking (pause-aware) ───────────────────────────
let _egDropExpiryEntries = []; // { map, key, value, lifetimeMs, expiresAt, timer, overlayId, removeOverlayFn, remaining }
let _egPickupSpawnerInfo = { timer: null, expiresAt: 0, remaining: null }; // tracks next pickup spawn timeout for pause
let _egExpireCountdownEntries = []; // { overlayId, lifetimeMs, startedAt, expiresAt, timeout, interval, remaining, delayRemaining }

// ── Boss state ───────────────────────────────────────────────────────────────
let _egBossTimers = {};      // monsterId → array of mechanic timer handles
let _egBossCorrupted = new Map(); // key:"row-col" → { timer } for Corrupt Cells
let _egBossFrozen = new Map();    // key:"row-col" → { timer } for Frozen Cells

// ── Loot drop state ──────────────────────────────────────────────────────────
// Active loot drops on the grid: key "row-col" → item object
let _egLootDrops = new Map();

// Per-run temporary loot bag — items the player has claimed this map run.
// Flushed to the stash on successful map completion.
let _egRunLoot = [];

let _egVeilActive = false;   // true while the Grid Veil overlay is showing
let _egBlackoutActive = false;  // true while the Clue Blackout is active

let _egClueSwapRestoreTimer = null;  // pending restore for the Clue Swap mechanic
let _egActiveClueSwap = null;        // [rowA, rowB] while a Clue Swap is active
let _egGridInvertTimer = null;       // pending removal of the Inversion Field filter

let _egVoidSurgeActive = false;  // true while a Void Surge safe-zone is on screen
let _egVoidSurgePollInterval = null; // handle for the HUD-position poll during Void Surge

// ── Generic screen-blast engine state ────────────────────────────────────────
// Shared by all dodge-style boss mechanics (Void Surge, Heat Death Bloom,
// Rewrite Fate, Prior Collapse). Each active blast registers itself in the
// map so boss death / encounter stop can tear every variant down at once.
let _egBlastSeq = 0;             // monotonically increasing blast id counter
const _egActiveBlasts = new Map(); // blast id → { timers:[], poll:null }

// ── Prior Bomb fill tracker ──────────────────────────────────────────────────
// Circular buffer of [row, col] for recently correctly-filled cells.
let _egRecentFills = [];

// ── Drag-paint charged shot state ────────────────────────────────────────────
// While the player drag-paints, every correct fill stacks its rolled damage
// into a single charging projectile. It is released as one combined-damage
// shot when the player stops painting (stopPainting).
let _egDragChargeDamage = 0;   // accumulated damage of the current stroke
let _egDragChargeElements = { fire: 0, cold: 0, lightning: 0, shadow: 0 }; // accumulated per-element share of _egDragChargeDamage
let _egDragChargeStacks = 0;   // number of painted cells in the current stroke
let _egDragChargeRow = -1;     // stroke start cell — launch origin of the shot
let _egDragChargeCol = -1;
let _egDragChargeWasCrit = false; // true if ANY cell in the current stroke rolled a crit

// Snapshot of the original map-level def, captured at _egStartEncounter.
// Used to read boss/requiredKills config after cur has been replaced by chained puzzles.
let _egMapDef = null;


// --- PLAYER MELEE CONSTANTS ---
// Base auto-strike charge time in seconds when no weapon is equipped.
// The equipped weapon's attackIntervalSeconds defines the actual base
// (see _egGetPlayerAttackInterval in endgame-player-stats.js); the
// weapon's attack_speed mods then subtract seconds from it.
const EG_PLAYER_DEFAULT_ATTACK_INTERVAL = 10;
const EG_PLAYER_MIN_ATTACK_INTERVAL = 2; // Lower clamp so strikes can't be spammed
const EG_PLAYER_MELEE_DAMAGE = 10; // Default flat damage
const EG_PLAYER_MELEE_ANIM_DURATION_MS = 500; // Matches monster melee duration


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

// Hold-E pause — true while the player holds E to freeze their own auto-attack bar
let _egHoldEPauseActive = false;

// Active currency drops on the grid: key "row-col" → currency def object
let _egCurrencyDrops = new Map();

// Active regular-item drops on the grid: key "row-col" → { defId }
// Claimed items go straight into the player's persistent STATE.inventory.
let _egItemDrops = new Map();

// Per-run currency tracker — currency picked up during the current map run,
// aggregated by currency id, shown in the leave-map transition summary.
// Cleared by _egChainCleanup() alongside _egRunLoot.
let _egRunCurrency = [];

// Per-run regular-item tracker — ITEM_DEFS items claimed during the current
// map run ({ defId, icon, name, rarity }), shown in the leave-map transition
// summary. Cleared by _egChainCleanup() alongside _egRunLoot.
let _egRunItems = [];
// Per-run map-drop tracker — map items (🗺️) claimed during the current map
// run, shown in the leave-map transition summary. Cleared by
// _egChainCleanup() alongside _egRunLoot.
let _egRunMaps = [];

// Per-run essence tracker — essences claimed during the current map run,
// aggregated by essence id, shown in the leave-map transition summary.
// Cleared by _egChainCleanup() alongside _egRunLoot.
let _egRunEssences = [];





//------------------------------------------------------------------------
//-------------------ENCOUNTER GUARD--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Central guard used before every combat operation.
// Returns true only when an endgame encounter is actually running.
function _egIsActive() {
    return _egEncounterActive
        && typeof cur !== 'undefined' && cur
        && (cur.isMonsterLevel === true);  // check if this level is assigned as a level that contains monsters
}