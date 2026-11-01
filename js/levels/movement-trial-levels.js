//------------------------------------------------------------------------
// Movement trial level assignment: gives two campaign levels per world the
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
const MOVEMENT_PER_WORLD = 2;             // trials in every world (Nexus excepted)
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

// Stamps the trial onto one level: its bonus type, variant and hints.
function _stampTrial(lvl, variant) {
    const maze = variant >= 3;
    lvl.bonusType = 'movement';
    lvl.bonusParam = variant;
    lvl.bonusHint = maze ? MOVEMENT_HINT_MAZE : MOVEMENT_HINT_CIRCLES;
    lvl.bonusHintDE = maze ? MOVEMENT_HINT_MAZE_DE : MOVEMENT_HINT_CIRCLES_DE;
}

// Picks a random entry of a list of level indices.
function _pickFrom(list, rand) {
    return list[Math.floor(rand() * list.length)];
}

// Stamps MOVEMENT_PER_WORLD levels per world (and their trial variants) in
// `worlds`. Run after the gauntlet assignment so gauntlet levels are skipped.
// The first level is picked among the plain-bonus levels (quiz levels only
// when a world has none); the second prefers plain levels too, is not next
// to the first and uses a different variant. A world that already has its
// trials is left alone, so running this twice changes nothing.
export function applyMovementBonuses(worlds) {
    if (!Array.isArray(worlds)) return;
    worlds.forEach((w, wi) => {
        if (!w || !Array.isArray(w.data) || MOVEMENT_SKIP_WORLDS.includes(wi)) return;
        if (w.data.filter(l => l && l.bonusType === 'movement').length >= MOVEMENT_PER_WORLD) return;
        const lastEligible = w.data.length - 2;
        const plain = [];
        const quiz = [];
        for (let i = MOVEMENT_MIN_LEVEL_INDEX; i <= lastEligible; i++) {
            const lvl = w.data[i];
            if (!lvl) continue;
            if (lvl.bonusType === 'movement' || REPLACEABLE_BONUSES.includes(lvl.bonusType)) plain.push(i);
            else if (lvl.bonusType === 'quiz') quiz.push(i);
        }
        const rand = _rng((wi + 1) * 6271 + 38873);
        const first = _pickFrom(plain.length ? plain : quiz, rand);
        const firstVariant = Math.floor(rand() * MOVEMENT_VARIANT_COUNT);
        _stampTrial(w.data[first], firstVariant);

        // Second trial: not beside the first when there is a choice.
        const others = (plain.length >= 2 ? plain : plain.concat(quiz)).filter(i => i !== first);
        const apart = others.filter(i => Math.abs(i - first) > 1);
        const pool = apart.length ? apart : others;
        if (!pool.length) return;
        const second = _pickFrom(pool, rand);
        const secondVariant = (firstVariant + 1 + Math.floor(rand() * (MOVEMENT_VARIANT_COUNT - 1))) % MOVEMENT_VARIANT_COUNT;
        _stampTrial(w.data[second], secondVariant);
    });
}
