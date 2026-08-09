//------------------------------------------------------------------------
//-------------------TRANSLATION HELPER----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Used for level content fields that need to be translated but don't have a fixed
// place in the HTML (e.g. hints, which are generated dynamically from level data).
// For static text elements always present in the HTML, use [data-t] attributes and
// the t() function in translations.js instead — more efficient for bulk text replacement.
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
//   world  — 1-based world number
//   li     — 1-based index of the level within its world
//   gIdx   — global index (gi): position in this array, used for save progress tracking
//   size   — grid size inherited from the world definition

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