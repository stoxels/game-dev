import { EG_GRID_SIZE_BUCKETS } from '../loot/loot-map-implicit-parts.js';

//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: PUZZLE POOL CRITERIA---------------
//------------------------------------------------------------------------

let _chainRecentGis = [];

// ── Encounter-chain size caps (playability) ──────────────────────────
// 15×30 is the widest comfortable map; 20 rows is allowed only when
// columns stay ≤20. Anything beyond those on either axis, or tall+wide
// (>15 rows && >20 cols), is too large for a fun chain step.
const CHAIN_MAX_ROWS = 20;
const CHAIN_MAX_COLS = 30;
const CHAIN_TALL_ROW_THRESHOLD = 15;
const CHAIN_MAX_COLS_WHEN_TALL = 20;

// True when a puzzle is small enough for an encounter chain (row and column
// caps, with a tighter column cap for tall grids).
export function _chainPuzzleSizeAllowed(rows, cols) {
    if (rows > CHAIN_MAX_ROWS || cols > CHAIN_MAX_COLS) return false;
    if (rows > CHAIN_TALL_ROW_THRESHOLD && cols > CHAIN_MAX_COLS_WHEN_TALL) return false;
    return true;
}

// True when a level fits the chain criteria (size cap and the criteria's own
// filters).
function _puzzlePassesCriteria(level, criteria) {
    const rows = level.grid.length;
    const cols = level.grid[0].length;
    const cells = rows * cols;

    // Global encounter-chain cap: keep chains fun, never pick mega grids.
    if (!_chainPuzzleSizeAllowed(rows, cols)) return false;

    if (criteria.minCells != null && cells < criteria.minCells) return false;
    if (criteria.maxCells != null && cells > criteria.maxCells) return false;
    if (criteria.minRows != null && rows < criteria.minRows) return false;
    if (criteria.maxRows != null && rows > criteria.maxRows) return false;
    if (criteria.minCols != null && cols < criteria.minCols) return false;
    if (criteria.maxCols != null && cols > criteria.maxCols) return false;

    if (criteria.worlds != null && !criteria.worlds.includes(level.world)) return false;
    if (criteria.excludeWorlds != null && criteria.excludeWorlds.includes(level.world)) return false;

    return true;
}

// Builds the list of levels a chain may pick from, skipping sandbox,
// generated, kill-gated and (unless told otherwise) recently used levels.
export function _buildChainPool(criteria) {
    const avoidRecent = criteria.avoidRecent !== false;

    let pool = globalThis.ALL.filter(level =>
        !level.isEndgameSandbox &&
        !level.isGeneratedPuzzle &&  // generated levels are launched directly
        !level.requiredKills &&
        !level.totalMonsters &&      // also exclude other map-starter levels
        !(typeof isGatedLevel === 'function' && globalThis.isGatedLevel(level.gIdx)) &&  // math gates are campaign-only
        _puzzlePassesCriteria(level, criteria)
    );

    if (avoidRecent && pool.length > _chainRecentGis.length) {
        const filtered = pool.filter(level => !_chainRecentGis.includes(level.gIdx));
        if (filtered.length > 0) pool = filtered;
    }

    return pool;
}

// Picks a random level from the pool and remembers it as recent.
function _pickFromPool(pool, recentWindow, rng) {
    const R = rng || Math.random;
    const picked = pool[Math.floor(R() * pool.length)];
    _chainRecentGis.push(picked.gIdx);
    if (_chainRecentGis.length > (recentWindow || 8)) _chainRecentGis.shift();
    return picked.gIdx;
}

// Remembers a level as recently used (keeps the last few).
export function _trackChainRecentGi(gi, recentWindow) {
    _chainRecentGis.push(gi);
    if (_chainRecentGis.length > (recentWindow || 8)) {
        _chainRecentGis.shift();
    }
}

// Picks from the story pool honouring the given criteria; relaxes pure
// size filters when nothing qualifies so the chain never stalls.
// `rng` (optional seeded PRNG) makes the pick deterministic.
export function _pickStoryChainPuzzleGi(criteria, rng) {
    let pool = _buildChainPool(criteria);

    if (pool.length === 0 && (criteria.minCells != null || criteria.maxCells != null)) {
        pool = _buildChainPool({ ...criteria, minCells: null, maxCells: null });
    }

    if (pool.length === 0) return null;
    return _pickFromPool(pool, criteria.recentWindow, rng);
}

// Clones the chain criteria with a grid-size bucket's cell window applied.
export function _bucketCriteria(criteria, bucket) {
    const range = (typeof EG_GRID_SIZE_BUCKETS !== 'undefined')
        ? EG_GRID_SIZE_BUCKETS[bucket] : null;
    const c = { ...criteria };
    if (range) {
        c.minCells = Math.max(criteria.minCells || 0, range[0]);
        c.maxCells = range[1] === Infinity ? null : range[1];
    }
    return c;
}

// Clears the recent-puzzle memory when a chain run is cleaned up.
export function _resetChainRecentGis() {
    _chainRecentGis = [];
}
