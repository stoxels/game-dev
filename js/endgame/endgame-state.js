//------------------------------------------------------------------------
//-------------------RUNTIME STATE----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// ── Encounter state ──────────────────────────────────────────────────────────
let _egMonsters = [];    // live monster objects currently in the encounter
let _egTargetId = null;  // id of the monster the player is currently targeting
let _egEncounterActive = false; // true while a monster encounter is running
let _egTickInterval = null;  // handle for the 10Hz combat loop interval

// ── Spawn timers ─────────────────────────────────────────────────────────────
// Kept so we can cancel staggered spawns if the encounter ends early.
let _egSpawnTimers = [];

// ── Pickup state ─────────────────────────────────────────────────────────────
let _egPickups = new Map(); // key:"row-col" → pickupDef
let _egPickupTimers = [];        // expiry timers, cancelled on encounter stop
let _egPickupSpawnTimer = null;      // recurring spawn-attempt timer

// ── Boss state ───────────────────────────────────────────────────────────────
let _egBossTimers = {};      // monsterId → array of mechanic timer handles
let _egBossCorrupted = new Map(); // key:"row-col" → { timer } for Corrupt Cells

// ── Loot drop state ──────────────────────────────────────────────────────────
// Active loot drops on the grid: key "row-col" → item object
let _egLootDrops = new Map();

// Per-run temporary loot bag — items the player has claimed this map run.
// Flushed to the stash on successful map completion.
let _egRunLoot = [];

let _egVeilActive = false;   // true while the Grid Veil overlay is showing
let _egBlackoutActive = false;  // true while the Clue Blackout is active

let _egVoidSurgeActive = false;  // true while a Void Surge safe-zone is on screen
let _egVoidSurgePollInterval = null; // handle for the HUD-position poll during Void Surge

// ── Prior Bomb fill tracker ──────────────────────────────────────────────────
// Circular buffer of [row, col] for recently correctly-filled cells.
let _egRecentFills = [];

// Snapshot of the original map-level def, captured at _egStartEncounter.
// Used to read boss/requiredKills config after cur has been replaced by chained puzzles.
let _egMapDef = null;


// --- PLAYER MELEE CONSTANTS ---
const EG_PLAYER_CHARGE_MAX = 10; // Adjust for how many seconds it takes to charge
const EG_PLAYER_MELEE_DAMAGE = 10; // Default flat damage
const EG_PLAYER_MELEE_ANIM_DURATION_MS = 500; // Matches monster melee duration


// ── Absorption shield state ───────────────────────────────────────────────
let _egPlayerAbsorptionCurrent = 0;
let _egPlayerAbsorptionRegenDelayTimer = null;
let _egPlayerAbsorptionRegenInterval = null;

// --- NEW STATE VARIABLE ---
let _egPlayerCurrentCharge = 0;

// Active currency drops on the grid: key "row-col" → currency def object
let _egCurrencyDrops = new Map();

// Active regular-item drops on the grid: key "row-col" → { defId }
// Claimed items go straight into the player's persistent STATE.inventory.
let _egItemDrops = new Map();

// Per-run currency tracker — currency picked up during the current map run,
// aggregated by currency id, shown in the leave-map transition summary.
// Cleared by _egChainCleanup() alongside _egRunLoot.
let _egRunCurrency = [];




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