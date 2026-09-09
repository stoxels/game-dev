//------------------------------------------------------------------------
//-------------------TRANSLATION HELPER----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Used for level content fields that need to be translated but don't have a fixed
// place in the HTML (e.g. hints, which are generated dynamically from level data).
// For static text elements always present in the HTML, use [data-t] attributes and
// the t() function in translations.js instead � more efficient for bulk text replacement.
//
// Looks for the DE variant of the given field (e.g. 'hintDE') when German is active
// and returns it if found; otherwise falls back to the default field (e.g. 'hint').

function lvText(obj, field) {
    if (LANG === 'de') {
        const de = obj[field + 'DE'];
        if (de) return de;
    }
    return obj[field];
}



//------------------------------------------------------------------------
//-------------------LEVEL LIST------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Flat sequential array of every level across all worlds.
// Each entry is the original level data extended with:
//   world  � 1-based world number
//   li     � 1-based index of the level within its world
//   gIdx   � global index (gi): position in this array, used for save progress tracking
//   size   � grid size inherited from the world definition

const ALL = [];

WORLDS.forEach((w, wi) => {
    w.data.forEach((p, li) => {
        const gi = ALL.length;
        ALL.push({ world: wi + 1, li: li + 1, gIdx: gi, size: w.size, ...p });
    });
});



//------------------------------------------------------------------------
//-------------------WORLD START INDICES---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Maps each world index (0-based) to the global index (gi) of its first level in ALL.
// Used to quickly find where a given world begins in the flattened level list.

const WORLD_START_GI = WORLDS.reduce((acc, w, wi) => {
    acc[wi] = wi === 0 ? 0 : acc[wi - 1] + WORLDS[wi - 1].data.length;
    return acc;
}, {});



//------------------------------------------------------------------------
//-------------------NEXUS WORLD / NEXUS POINT HELPERS--------------------
//------------------------------------------------------------------------
// World 14 (0-based index 13) is the Nexus World: the last interlude world
// before the endgame. Its final level is NOT an Ascension level but the
// Nexus Point, which unlocks the Nexus screen (see endgame-nexus.js).

// 0-based index of the Nexus World inside WORLDS.
const NEXUS_WORLD_INDEX = 13;

// Returns true if the given 0-based world index is the Nexus World.
function isNexusWorld(wi) {
    return wi === NEXUS_WORLD_INDEX;
}

// Returns true if the given level is the Nexus Point
// (final level of the Nexus World). Accepts either (wi, li) or a level
// object with .world (1-based) and .li (1-based) fields.
function isNexusPointLevel(wi, li) {
    if (wi !== null && typeof wi === 'object') {
        const lvl = wi;
        if (!lvl || lvl.world == null || lvl.li == null) return false;
        return isNexusPointLevel(lvl.world - 1, lvl.li - 1);
    }
    if (typeof WORLDS === 'undefined' || !WORLDS[NEXUS_WORLD_INDEX]) return false;
    if (wi !== NEXUS_WORLD_INDEX) return false;
    return li === WORLDS[NEXUS_WORLD_INDEX].data.length - 1;
}

// Returns true if the given level is a regular Ascension level
// (final level of any world EXCEPT the Nexus Point).
function isAscensionLevel(wi, li) {
    if (wi !== null && typeof wi === 'object') {
        const lvl = wi;
        if (!lvl || lvl.world == null || lvl.li == null) return false;
        return isAscensionLevel(lvl.world - 1, lvl.li - 1);
    }
    if (typeof WORLDS === 'undefined' || !WORLDS[wi]) return false;
    if (isNexusPointLevel(wi, li)) return false;
    return li === WORLDS[wi].data.length - 1;
}

// Returns the global index (gi) of the Nexus Point level.
function getNexusPointGi() {
    if (typeof WORLDS === 'undefined' || typeof WORLD_START_GI === 'undefined') return -1;
    if (!WORLDS[NEXUS_WORLD_INDEX]) return -1;
    return WORLD_START_GI[NEXUS_WORLD_INDEX] + (WORLDS[NEXUS_WORLD_INDEX].data.length - 1);
}

// Returns true if the player has finished ALL campaign worlds before the
// Nexus World (every level in worlds 1..13). This gates access to World 14.
function isNexusWorldUnlocked() {
    if (typeof STATE === 'undefined' || !STATE || !STATE.done) return false;
    if (typeof WORLDS === 'undefined' || typeof WORLD_START_GI === 'undefined') return false;
    for (let wi = 0; wi < NEXUS_WORLD_INDEX; wi++) {
        const w = WORLDS[wi];
        if (!w) continue;
        const start = WORLD_START_GI[wi];
        for (let li = 0; li < w.data.length; li++) {
            if (!STATE.done.includes(start + li)) return false;
        }
    }
    return true;
}

// Returns true if the player has unlocked the Nexus (completed the Nexus
// Point at least once, or carries the persistent flag).
function isNexusUnlocked() {
    if (typeof STATE !== 'undefined' && STATE && STATE.nexusUnlocked) return true;
    if (typeof STATE === 'undefined' || !STATE || !STATE.done) return false;
    const gi = getNexusPointGi();
    return gi >= 0 && STATE.done.includes(gi);
}

// Persists the Nexus unlock flag. Called on first clear of the Nexus Point.
function setNexusUnlocked() {
    if (typeof STATE === 'undefined' || !STATE) return;
    if (!STATE.nexusUnlocked) {
        STATE.nexusUnlocked = true;
        if (typeof save === 'function') save();
    }
}