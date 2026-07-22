//------------------------------------------------------------------------
//------------------------LEVEL RUNTIME STATE-----------------------------
//------------------------------------------------------------------------
// Variables that describe what is happening in the current level.
// These are reset at the start of each level (see startLevel() in screens.js).
//------------------------------------------------------------------------


// --- Grid state ---

// The current level's puzzle object; set when a level starts.
let cur = null;

// Tracks the player's fills and marks per cell.
// e.g. userGrid[3][5] === 2 means row 3 col 5 is marked with ✕.
let userGrid = [];

// Tracks incorrectly filled cells (true = wrong fill).
// Used to show red ✕ marks and apply time penalties.
let wrongGrid = [];

// Tracks cells that were revealed by items or class abilities (true = revealed).
// Shown in green, counts as correct, and cannot be un-filled.
let revealedGrid = [];


// --- Level tracking ---

// Date.now() timestamp recorded when the level begins.
// Used for accurate elapsed-time display on the win overlay,
// independent of any item-based time changes during the level.
let levelStartTime = 0;

// How many wrong fills the player has made this level.
// Used for score penalties and Hardcore mode failure tracking.
let mistakeCount = 0;

// Wrong fills that were absorbed by the Shield item or a class passive.
// Do not count toward mistakeCount or trigger penalties,
// but are tracked separately for achievements.
let absorbedMistakes = 0;

// How many items the player has used this level; used for achievements.
let itemsUsedThisLevel = 0;

// Set to true when the timer hits 0 or a Hardcore mistake occurs.
// Prevents further input and stops the timer.
let dead = false;

// Set to true when the player answers the bonus quiz correctly.
// Read by scoring.js to determine whether to award the bonus reward.
let quizAnsweredCorrectly = false;


// --- Lucky tiles ---

// Stores keys for tiles that have a lucky reward this level.
// e.g. if row 3 col 5 is lucky, luckyTiles contains "3-5".
let luckyTiles = new Set();

// Ensures the lucky item reward can only be claimed once per level,
// even if the player fills multiple lucky tiles.
let luckyRewardClaimed = 0;


// --- Status flags ---

// When true, the next mistake is absorbed by the Shield instead of
// counting toward mistakeCount. Resets to false after absorbing one mistake.
let shieldActive = false;

// When true, the timer is paused. Set by the Freeze item or Absolute Zero
// class skill; cleared when the freeze duration expires.
let timerFrozen = false;

// When true, drag strokes are locked to the row or column of the starting cell.
let axisLockEnabled = false;


// --- Passive tree skill trackers ---
// These variables track runtime state for specific passive-tree skills.

// [sample_efficiency] Increments on each correct fill; resets on a time-costing mistake.
let consecutiveCorrectFills = 0;

// [law_of_large_numbers] Timestamp of the next auto-reveal tick; null when inactive.
let _lawOfLargeNumbersNext = null;

// [confidence_interval] True during the grace window that opens after a mistake.
let _confidenceIntervalActive = false;

// [confidence_interval] True if the grace window was just consumed,
// preventing back-to-back activations.
let _confidenceIntervalUsed = false;

// [streak_bonus] Consecutive correct fills since the last mistake.
let _streakBonusFills = 0;


// --- Player HP ---
// Base values are overwritten at level start using EG_PLAYER_STATS.baseHP.
// Kept at 100 here as a safe fallback before any level loads.
let playerMaxHP = 100;
let playerCurrentHP = 100;


// --- Navigation history ---

// A stack of screen IDs representing the player's navigation path.
// Push when navigating forward; pop when going back (Escape key or Back button).
let screenHistory = [];


//------------------------------------------------------------------------
//------------------------GAME PERSISTENCE--------------------------------
//------------------------------------------------------------------------
// Handles saving and loading STATE to/from localStorage.
// STATE is the single source of truth for all persistent progress.
// Every screen that reads scores, inventory, or completion status reads from here.
//------------------------------------------------------------------------


// buildFreshState — returns a default STATE object for a brand-new save.
//                  Defines every field and its starting value in one place.
function buildFreshState() {
    return {
        totalScore: 0,
        levelHS: {},
        levelMistakes: {},
        inventory: [],
        unlockedCodes: [],
        done: [],
        bonusDone: [],
        tutorialDone: false,
        mathGatePassed: [],
        primerPending: false,
        playerCharacter: null,

        // Class progression
        playerClass: null,
        classPassiveLevel: 1,
        classActiveLevel: 1,
        classActive1Level: 1,
        classActive2Level: 1,
        classUpgradesAvailable: 0,
        classWorldsCompleted: [],
        classActiveChoice: 'active1',

        // Ascendency progression
        playerAscendency: null,
        ascendencySkill1Level: 1,
        ascendencySkill2Level: 1,
        ascendencyWorldsCompleted: [],

        // Passive tree
        passiveTreePoints: 0,
        passiveTreeAllocated: new Set(),

        // Convergence levels
        convergenceDone: [],

        // Quests
        questStats: {},
        questsClaimed: [],
        questsNotified: [],

        // Achievement stats
        achStats: {},

        // endgame hub
        egEquipped: {},
        egInventory: Array.from({ length: typeof EG_INV_ROWS !== 'undefined' ? EG_INV_ROWS : 5 }, () => Array(typeof EG_INV_COLS !== 'undefined' ? EG_INV_COLS : 10).fill(null)),
        egMapStash: Array.from({ length: typeof EG_MAP_STASH_ROWS !== 'undefined' ? EG_MAP_STASH_ROWS : 2 }, () => Array(typeof EG_MAP_STASH_COLS !== 'undefined' ? EG_MAP_STASH_COLS : 10).fill(null)),
        egCurrencyStash: Array.from({ length: typeof EG_CURRENCY_ROWS !== 'undefined' ? EG_CURRENCY_ROWS : 2 }, () => Array(typeof EG_CURRENCY_COLS !== 'undefined' ? EG_CURRENCY_COLS : 10).fill(null)),
        egMapSlotItem: null,
    };
}


// migrateOldSave — fills in any fields that are missing from an older save.
//                  Called before returning a loaded save so legacy data
//                  never causes undefined-access errors elsewhere.
function migrateOldSave(s) {

    // Core fields
    if (!s.bonusDone) s.bonusDone = [];
    if (s.tutorialDone === undefined) s.tutorialDone = false;
    if (!s.mathGatePassed) s.mathGatePassed = [];
    if (s.primerPending === undefined) s.primerPending = false;
    if (s.playerCharacter === undefined) s.playerCharacter = null;
    if (!s.levelMistakes) s.levelMistakes = {};
    if (!s.achStats) s.achStats = {};
    if (!s.convergenceDone) s.convergenceDone = [];

    // Class fields
    if (s.playerClass === undefined) s.playerClass = null;
    if (!s.classPassiveLevel) s.classPassiveLevel = 1;
    if (!s.classActiveLevel) s.classActiveLevel = 1;
    if (!s.classActive1Level) s.classActive1Level = s.classActiveLevel || 1;
    if (!s.classActive2Level) s.classActive2Level = s.classActiveLevel || 1;
    if (s.classUpgradesAvailable === undefined) s.classUpgradesAvailable = 0;
    if (!s.classWorldsCompleted) s.classWorldsCompleted = [];
    // Older saves stored classActiveChoice as a number; replace with the string default.
    if (!s.classActiveChoice || typeof s.classActiveChoice === 'number') s.classActiveChoice = 'active1';

    // Ascendency fields
    if (s.playerAscendency === undefined) s.playerAscendency = null;
    if (!s.ascendencySkill1Level) s.ascendencySkill1Level = 1;
    if (!s.ascendencySkill2Level) s.ascendencySkill2Level = 1;
    if (!s.ascendencyWorldsCompleted) s.ascendencyWorldsCompleted = [];

    // Passive tree — stored as a plain array in JSON, needs to become a Set at runtime.
    if (!s.passiveTreePoints) s.passiveTreePoints = 0;
    if (!s.passiveTreeAllocated || !Array.isArray(s.passiveTreeAllocated)) {
        s.passiveTreeAllocated = new Set();
    } else {
        s.passiveTreeAllocated = new Set(s.passiveTreeAllocated);
    }

    //endgame 
    if (!s.egEquipped) s.egEquipped = {};
    if (!s.egInventory) s.egInventory = Array.from({ length: typeof EG_INV_ROWS !== 'undefined' ? EG_INV_ROWS : 5 }, () => Array(typeof EG_INV_COLS !== 'undefined' ? EG_INV_COLS : 10).fill(null));
    if (!s.egMapStash) s.egMapStash = Array.from({ length: typeof EG_MAP_STASH_ROWS !== 'undefined' ? EG_MAP_STASH_ROWS : 2 }, () => Array(typeof EG_MAP_STASH_COLS !== 'undefined' ? EG_MAP_STASH_COLS : 10).fill(null));
    if (!s.egCurrencyStash) s.egCurrencyStash = Array.from({ length: typeof EG_CURRENCY_ROWS !== 'undefined' ? EG_CURRENCY_ROWS : 2 }, () => Array(typeof EG_CURRENCY_COLS !== 'undefined' ? EG_CURRENCY_COLS : 10).fill(null));
    if (s.egMapSlotItem === undefined) s.egMapSlotItem = null;




    // Quest fields
    migrateQuestState(s);
}


//------------------------------------------------------------------------
//------------------------SAVE SLOT SYSTEM---------------------------------
//------------------------------------------------------------------------

const SAVE_SLOT_COUNT = 20;
const ACTIVE_SLOT_KEY = 'stoxels_active_slot';

// Slot 1 reuses the ORIGINAL 'stoxels' key on purpose — this is what makes
// existing players' progress show up automatically as "Slot 1" with no
// migration step required. Slots 2-20 get their own dedicated keys.
function _slotKey(slotNum) {
    return slotNum === 1 ? 'stoxels' : `stoxels_slot_${slotNum}`;
}

// Returns the currently active slot number (1-20), or null if none chosen yet
// in this browser (e.g. very first load, before the save-select screen ran).
function getActiveSlot() {
    const s = parseInt(localStorage.getItem(ACTIVE_SLOT_KEY), 10);
    return (s >= 1 && s <= SAVE_SLOT_COUNT) ? s : null;
}

function setActiveSlot(slotNum) {
    localStorage.setItem(ACTIVE_SLOT_KEY, String(slotNum));
}

// Reads the raw JSON for a specific slot without making it active.
function loadRawSaveFromSlot(slotNum) {
    try {
        return JSON.parse(localStorage.getItem(_slotKey(slotNum)) || 'null');
    } catch {
        return null;
    }
}

// Lightweight summary used to render the save-slot select screen.
function getSlotSummary(slotNum) {
    const raw = loadRawSaveFromSlot(slotNum);
    if (!raw) return { slot: slotNum, empty: true };
    return {
        slot: slotNum,
        empty: false,
        totalScore: raw.totalScore || 0,
        levelsDone: (raw.done || []).length,
        playerCharacter: raw.playerCharacter || null,
        playerClass: raw.playerClass || null,
        tutorialDone: !!raw.tutorialDone,
    };
}

// Loads (or freshly creates) the STATE for a given slot, marks it active,
// and persists immediately. Call this when the player picks a slot on the
// save-select screen.
function loadStateFromSlot(slotNum) {
    let raw = loadRawSaveFromSlot(slotNum);
    if (raw) {
        migrateOldSave(raw);
    } else {
        raw = buildFreshState();
    }
    setActiveSlot(slotNum);
    STATE = raw;
    save();
    return STATE;
}

// Wipes ONLY the given slot's save data. Used by the "Reset Progress" flow
// on the title screen — achievements live in their own global key
// (ACH_SAVE_KEY, achievements.js) and are never touched by this.
function wipeSlot(slotNum) {
    localStorage.removeItem(_slotKey(slotNum));
}

// initState — called once at script load, before the player has necessarily
// picked a slot on the new save-select screen. Falls back to the last
// active slot (persisted across reloads), then to legacy Slot 1 data if
// present, then to a blank state. The save-select screen overwrites STATE
// properly as soon as Play is clicked.
function initState() {
    const activeSlot = getActiveSlot();
    if (activeSlot) {
        const saved = loadRawSaveFromSlot(activeSlot);
        if (saved) {
            migrateOldSave(saved);
            return saved;
        }
    }
    const legacy = loadRawSaveFromSlot(1);
    if (legacy) {
        migrateOldSave(legacy);
        return legacy;
    }
    return buildFreshState();
}

// STATE — the single source of truth for all persistent progress.
let STATE = initState();

// save — serialises STATE into the currently active slot (defaults to
// Slot 1 if nothing has been explicitly chosen yet, matching old behaviour).
function save() {
    const slot = getActiveSlot() || 1;
    const toSave = { ...STATE };
    if (STATE.passiveTreeAllocated instanceof Set) {
        toSave.passiveTreeAllocated = [...STATE.passiveTreeAllocated];
    }
    localStorage.setItem(_slotKey(slot), JSON.stringify(toSave));
}


//------------------------------------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------