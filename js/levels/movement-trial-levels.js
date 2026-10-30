//------------------------------------------------------------------------
// Movement trial level assignment: gives one campaign level per world the
// 'movement' bonus type (a timed walking challenge that opens after the
// puzzle is solved - see js/combat/movement-trial.js).
//
// The pick is DETERMINISTIC (seeded from the world index) so a level's
// bonus never changes between sessions. Only levels that currently have a
// plain bonus (fast / no mistakes / no items / few mistakes) are replaced;
// gauntlets, quizzes, the opening levels, the final (ascension) level and
// the Nexus world are never touched. bonusParam holds the trial variant
// (see MOVEMENT_VARIANTS in movement-trial.js).
//------------------------------------------------------------------------

const MOVEMENT_MIN_LEVEL_INDEX = 3;       // first three levels of a world are never trials
const MOVEMENT_SKIP_WORLDS = [13];        // Nexus world
const MOVEMENT_VARIANT_COUNT = 5;         // 3 circle arenas + 2 mazes

const REPLACEABLE_BONUSES = ['fast', 'nomiss', 'lowmiss', 'noitem'];

const MOVEMENT_HINT_CIRCLES = 'Clear the movement trial: reach every green circle before time runs out';
const MOVEMENT_HINT_CIRCLES_DE = 'Meistere die Bewegungsprüfung: erreiche jeden grünen Kreis, bevor die Zeit abläuft';
const MOVEMENT_HINT_MAZE = 'Clear the movement trial: reach the treasure chest at the end of the maze in time';
const MOVEMENT_HINT_MAZE_DE = 'Meistere die Bewegungsprüfung: erreiche die Schatztruhe am Ende des Labyrinths rechtzeitig';

// Small seeded PRNG (mulberry32) - stable across runs and platforms.
function _rng(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Stamps one level per world (and its trial variant) in `worlds`. Run after
// the gauntlet assignment so gauntlet levels are skipped. Idempotent.
export function applyMovementBonuses(worlds) {
    if (!Array.isArray(worlds)) return;
    worlds.forEach((w, wi) => {
        if (!w || !Array.isArray(w.data) || MOVEMENT_SKIP_WORLDS.includes(wi)) return;
        const lastEligible = w.data.length - 2;
        const pool = [];
        for (let i = MOVEMENT_MIN_LEVEL_INDEX; i <= lastEligible; i++) {
            const lvl = w.data[i];
            if (lvl && (lvl.bonusType === 'movement' || REPLACEABLE_BONUSES.includes(lvl.bonusType))) pool.push(i);
        }
        if (!pool.length) return;
        const rand = _rng((wi + 1) * 6271 + 38873);
        const lvl = w.data[pool[Math.floor(rand() * pool.length)]];
        const variant = Math.floor(rand() * MOVEMENT_VARIANT_COUNT);
        const maze = variant >= 3;
        lvl.bonusType = 'movement';
        lvl.bonusParam = variant;
        lvl.bonusHint = maze ? MOVEMENT_HINT_MAZE : MOVEMENT_HINT_CIRCLES;
        lvl.bonusHintDE = maze ? MOVEMENT_HINT_MAZE_DE : MOVEMENT_HINT_CIRCLES_DE;
    });
}
