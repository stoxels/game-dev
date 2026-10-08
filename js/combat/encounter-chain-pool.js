import { EG_GRID_SIZE_BUCKETS } from '../loot/loot-map-implicit-parts.js';

//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: PUZZLE POOL CRITERIA---------------
//------------------------------------------------------------------------

let _egChainRecentGis = [];

// ── Encounter-chain size caps (playability) ──────────────────────────
// 15×30 is the widest comfortable map; 20 rows is allowed only when
// columns stay ≤20. Anything beyond those on either axis, or tall+wide
// (>15 rows && >20 cols), is too large for a fun chain step.
const EG_CHAIN_MAX_ROWS = 20;
const EG_CHAIN_MAX_COLS = 30;
const EG_CHAIN_TALL_ROW_THRESHOLD = 15;
const EG_CHAIN_MAX_COLS_WHEN_TALL = 20;

export function _egChainPuzzleSizeAllowed(rows, cols) {
    if (rows > EG_CHAIN_MAX_ROWS || cols > EG_CHAIN_MAX_COLS) return false;
    if (rows > EG_CHAIN_TALL_ROW_THRESHOLD && cols > EG_CHAIN_MAX_COLS_WHEN_TALL) return false;
    return true;
}

function _egPuzzlePassesCriteria(level, criteria) {
    const rows = level.grid.length;
    const cols = level.grid[0].length;
    const cells = rows * cols;

    // Global encounter-chain cap: keep chains fun, never pick mega grids.
    if (!_egChainPuzzleSizeAllowed(rows, cols)) return false;

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

export function _egBuildChainPool(criteria) {
    const avoidRecent = criteria.avoidRecent !== false;

    let pool = globalThis.ALL.filter(level =>
        !level.isEndgameSandbox &&
        !level.isGeneratedPuzzle &&  // generated levels are launched directly
        !level.requiredKills &&
        !level.totalMonsters &&      // also exclude other map-starter levels
        !(typeof isGatedLevel === 'function' && globalThis.isGatedLevel(level.gIdx)) &&  // math gates are campaign-only
        _egPuzzlePassesCriteria(level, criteria)
    );

    if (avoidRecent && pool.length > _egChainRecentGis.length) {
        const filtered = pool.filter(level => !_egChainRecentGis.includes(level.gIdx));
        if (filtered.length > 0) pool = filtered;
    }

    return pool;
}

function _egPickFromPool(pool, recentWindow, rng) {
    const R = rng || Math.random;
    const picked = pool[Math.floor(R() * pool.length)];
    _egChainRecentGis.push(picked.gIdx);
    if (_egChainRecentGis.length > (recentWindow || 8)) _egChainRecentGis.shift();
    return picked.gIdx;
}

export function _egTrackChainRecentGi(gi, recentWindow) {
    _egChainRecentGis.push(gi);
    if (_egChainRecentGis.length > (recentWindow || 8)) {
        _egChainRecentGis.shift();
    }
}

// Picks from the story pool honouring the given criteria; relaxes pure
// size filters when nothing qualifies so the chain never stalls.
// `rng` (optional seeded PRNG) makes the pick deterministic.
export function _egPickStoryChainPuzzleGi(criteria, rng) {
    let pool = _egBuildChainPool(criteria);

    if (pool.length === 0 && (criteria.minCells != null || criteria.maxCells != null)) {
        pool = _egBuildChainPool({ ...criteria, minCells: null, maxCells: null });
    }

    if (pool.length === 0) return null;
    return _egPickFromPool(pool, criteria.recentWindow, rng);
}

// Clones the chain criteria with a grid-size bucket's cell window applied.
export function _egBucketCriteria(criteria, bucket) {
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
export function _egResetChainRecentGis() {
    _egChainRecentGis = [];
}
