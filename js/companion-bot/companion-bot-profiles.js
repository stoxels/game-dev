//------------------------------------------------------------------------
//-------------------COMPANION BOT PROFILES--------------------------------
//------------------------------------------------------------------------
// How the summoned friend behaves: how fast and how often it helps at each
// trust level, what each hero is like, and which cell it picks. Everything
// here is plain data and pure functions (no game state, no DOM) so the rules
// can be tested alone. The bot never makes a mistake that hurts the player:
// it only places correct fills and correct wrong-marks. Numbers are untuned.

//------------------------------------------------------------------------
// CONSTANTS
//------------------------------------------------------------------------

// Colour each friend's marks wear on the grid (kept apart from the player's
// cyan fill and from the teal of ordinary reveals so they stay recognisable).
export const BOT_TINTS = { stox: '#6c7bff', trix: '#e056c8', syla: '#ffd93d' };

// Seconds between two puzzle actions at trust level 1..5 (index 0 = level 1).
const ACTION_SECONDS = [20, 17, 14, 12, 10];
// Chance weights of hint / fill / mark per trust level.
const ACTION_WEIGHTS = [
    { hint: 1, fill: 0, mark: 0 },
    { hint: 0.7, fill: 0.3, mark: 0 },
    { hint: 0.4, fill: 0.4, mark: 0.2 },
    { hint: 0.3, fill: 0.45, mark: 0.25 },
    { hint: 0.2, fill: 0.5, mark: 0.3 },
];
// Share of the solution cells the bot may fill / mark in one level at most.
const FILL_CAP_SHARE = [0.06, 0.1, 0.14, 0.18, 0.22];
// Strength of the reveal projectile each bot fill shoots (1 = a normal reveal).
const REVEAL_STRENGTH = [0.3, 0.4, 0.5, 0.6, 0.7];
// Monster damage per hit as a share of the target's max life, per level.
const MONSTER_HIT_SHARE = [0.015, 0.02, 0.028, 0.036, 0.045];

// What each hero is like. `speed` scales the wait between actions (below 1 =
// faster), `bias` scales the action weights, `monster` is how the hero fights
// ('melee' | 'spell' | null: Syla's damage comes from her reveal shots).
export const BOT_HEROES = {
    stox: { speed: 1.15, bias: { hint: 1, fill: 0.9, mark: 1.5 }, monster: 'melee', pickLine: true },
    trix: { speed: 0.8, bias: { hint: 0.8, fill: 1.1, mark: 1 }, monster: 'spell', pickLine: false },
    syla: { speed: 1, bias: { hint: 0.9, fill: 1.5, mark: 0.5 }, monster: null, pickLine: false },
};

//------------------------------------------------------------------------
// TUNING
//------------------------------------------------------------------------

// Trust level 0 (a bot summoned before any trust) behaves like level 1;
// anything above 5 like level 5.
function _levelIndex(trustLevel) {
    return Math.min(4, Math.max(0, (Number(trustLevel) || 1) - 1));
}

// All numbers for one hero at one trust level.
export function botTuning(heroId, trustLevel) {
    const hero = BOT_HEROES[heroId];
    if (!hero) return null;
    const i = _levelIndex(trustLevel);
    const weights = {};
    for (const k of ['hint', 'fill', 'mark']) weights[k] = ACTION_WEIGHTS[i][k] * hero.bias[k];
    return {
        heroId,
        level: i + 1,
        actionMs: Math.round(ACTION_SECONDS[i] * hero.speed * 1000),
        weights,
        fillCapShare: FILL_CAP_SHARE[i],
        revealStrength: REVEAL_STRENGTH[i],
        monsterStyle: hero.monster,
        monsterHitShare: hero.monster ? MONSTER_HIT_SHARE[i] : 0,
        monsterMs: 7000,
    };
}

//------------------------------------------------------------------------
// CELL CHOICE
//------------------------------------------------------------------------

// Correct cells the bot may still fill (or hint at): solution cells the
// player has not filled and nothing has revealed yet.
export function fillCandidates(sol, user, revealed) {
    const out = [];
    for (let r = 0; r < sol.length; r++) {
        for (let c = 0; c < sol[r].length; c++) {
            if (sol[r][c] === 1 && user[r][c] !== 1 && !revealed[r][c]) out.push([r, c]);
        }
    }
    return out;
}

// Empty cells that are right to mark as wrong and are not marked yet.
export function markCandidates(sol, user, wrong) {
    const out = [];
    for (let r = 0; r < sol.length; r++) {
        for (let c = 0; c < sol[r].length; c++) {
            if (sol[r][c] === 0 && (user[r][c] === 0 || user[r][c] === 3) && !wrong[r][c]) out.push([r, c]);
        }
    }
    return out;
}

// How many solution cells are still unfilled in a row / column (used to
// find the line that is closest to being finished).
function _linesLeft(sol, user, revealed) {
    const rows = sol.map(() => 0);
    const cols = (sol[0] || []).map(() => 0);
    for (let r = 0; r < sol.length; r++) {
        for (let c = 0; c < sol[r].length; c++) {
            if (sol[r][c] === 1 && user[r][c] !== 1 && !revealed[r][c]) { rows[r]++; cols[c]++; }
        }
    }
    return { rows, cols };
}

// Picks one cell from the candidates. A methodical hero (Stox) takes the
// cell in the line that is closest to being finished; the others pick at
// random. `rand` is a function returning 0..1 so tests can fix the roll.
export function pickCell(heroId, cands, sol, user, revealed, rand) {
    if (!cands.length) return null;
    const hero = BOT_HEROES[heroId];
    if (!hero || !hero.pickLine) return cands[Math.floor(rand() * cands.length)];
    const { rows, cols } = _linesLeft(sol, user, revealed);
    // Lines with nothing left count as "far away" so marks go to lines that still have work.
    const score = ([r, c]) => Math.min(rows[r] || 99, cols[c] || 99);
    const best = Math.min(...cands.map(score));
    const top = cands.filter(cell => score(cell) === best);
    return top[Math.floor(rand() * top.length)];
}

// Chooses hint / fill / mark by the tuning weights, skipping actions that
// have no candidate or whose cap is used up. Returns null when nothing is left.
export function chooseAction(tuning, available, rand) {
    const entries = ['hint', 'fill', 'mark']
        .map(k => [k, available[k] ? tuning.weights[k] : 0])
        .filter(([, w]) => w > 0);
    const total = entries.reduce((a, [, w]) => a + w, 0);
    if (total <= 0) return null;
    let roll = rand() * total;
    for (const [k, w] of entries) { roll -= w; if (roll <= 0) return k; }
    return entries[entries.length - 1][0];
}
