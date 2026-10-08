import { _egChainPuzzleSizeAllowed } from './encounter-chain-pool.js';
import { EG_GEN_BUCKETS, EG_GEN_FONT_STACK, EG_GEN_RANDOM_REVEALS, EG_GEN_SIZES, EG_GEN_SYMBOLS } from './combat-puzzle-generator-data.js';

//------------------------------------------------------------------------
//-------------------COMBAT PUZZLE GENERATOR------------------------------
//------------------------------------------------------------------------
// Procedurally generates nonogram puzzle levels for combat map runs so
// the chain is no longer limited to story puzzles from the world list.
//
// Two generation modes:
//   'symbol' - rasterises a glyph onto an offscreen canvas (Greek letters,
//              math operators, card suits, weather, ... any Unicode symbol)
//              and downsamples the pixels into a binary solution grid
//   'random' - random structures of various sizes: drunkard-walk blobs,
//              refined by cellular-automata smoothing, optionally mirrored
//   'mixed'  - per puzzle: 70% symbol / 30% random
//
// Generated levels are appended to ALL and flagged with isGeneratedPuzzle
// so _egBuildChainPool() never leaks them into the story pool. They carry
// a real world number (random 1..WORLDS.length) so backgrounds, BGM and
// all cur.world consumers keep working unchanged.
//
// Entry point:
//   _egCreateGeneratedLevel(opts) → gi | null
//     opts: { mode:'symbol'|'random'|'mixed', tier:Number, minCells:Number }
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-------------------MODE 1: SYMBOL RASTERISER----------------------------
//------------------------------------------------------------------------

// Draws the given character onto an offscreen canvas at supersampled
// resolution, then downsamples pixel coverage into a rows×cols binary grid.
// Tries progressively lower coverage thresholds until the fill ratio lands
// in a comfortable nonogram band; returns null when nothing was drawable.
function _egRasterizeSymbolGrid(ch, rows, cols) {
    if (typeof document === 'undefined') return null;

    const SS = 6;                       // supersample factor per grid cell
    const W = cols * SS;
    const H = rows * SS;

    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    // Fit the glyph: start large, measure, then scale so it fills ~92% of
    // the box on its dominant axis.
    let fontSize = Math.min(W, H);
    ctx.font = fontSize + 'px ' + EG_GEN_FONT_STACK;
    const m = ctx.measureText(ch);
    const gw = Math.max(1, m.width);
    const gh = Math.max(1,
        (m.actualBoundingBoxAscent || fontSize * 0.7) +
        (m.actualBoundingBoxDescent || fontSize * 0.25));
    const fit = Math.min((W * 0.92) / gw, (H * 0.92) / gh);
    fontSize = Math.max(10, Math.floor(fontSize * fit));
    ctx.font = fontSize + 'px ' + EG_GEN_FONT_STACK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(ch, W / 2, H / 2);

    let data;
    try {
        data = ctx.getImageData(0, 0, W, H).data;
    } catch (e) {
        return null;
    }

    // Average alpha coverage per target cell (supersampling → smooth edges).
    const cover = Array.from({ length: rows }, () => new Float32Array(cols));
    const block = SS * SS;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let sum = 0;
            for (let y = 0; y < SS; y++) {
                const rowBase = ((r * SS + y) * W + c * SS) * 4;
                for (let x = 0; x < SS; x++) sum += data[rowBase + x * 4 + 3];
            }
            cover[r][c] = sum / (block * 255);
        }
    }

    const binarize = th => cover.map(row => Array.from(row, v => v >= th ? 1 : 0));

    let best = null;
    let bestDist = Infinity;
    for (const th of [0.45, 0.35, 0.28, 0.22, 0.16, 0.10]) {
        const grid = binarize(th);
        let filled = 0;
        grid.forEach(row => row.forEach(v => filled += v));
        const ratio = filled / (rows * cols);
        const dist = Math.abs(ratio - 0.38);
        if (dist < bestDist) { bestDist = dist; best = grid; }
        if (ratio >= 0.20 && ratio <= 0.60) return grid;   // comfortable band
    }
    return best;
}


//------------------------------------------------------------------------
//-------------------MODE 2: RANDOM STRUCTURES---------------------------
//------------------------------------------------------------------------

// One cellular-automata smoothing pass: cells with many filled neighbours
// solidify, isolated cells vanish - turns noisy walks into organic blobs.
function _egSmoothStructure(grid, rows, cols) {
    const out = Array.from({ length: rows }, () => new Array(cols).fill(0));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let n = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const rr = r + dr, cc = c + dc;
                    if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) n += grid[rr][cc];
                }
            }
            out[r][c] = n >= 5 ? 1 : (n <= 2 ? 0 : grid[r][c]);
        }
    }
    return out;
}

// Counts fill stats used to accept/reject a candidate structure.
function _egStructureStats(grid, rows, cols) {
    let filled = 0;
    let liveRows = 0;
    let liveCols = 0;
    for (let r = 0; r < rows; r++) {
        let rowHas = false;
        for (let c = 0; c < cols; c++) {
            if (!grid[r][c]) continue;
            filled++;
            rowHas = true;
        }
        if (rowHas) liveRows++;
    }
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (grid[r][c]) { liveCols++; break; }
        }
    }
    return { filled, liveRows, liveCols };
}

// Generates one random structure: drunkard-walk blobs with directional
// momentum, CA smoothing, optional mirroring. Returns null if no valid
// candidate is found within the retry budget.
function _egGenerateRandomStructure(rows, cols, rng) {
    const R = rng || Math.random;
    const cells = rows * cols;

    for (let attempt = 0; attempt < 12; attempt++) {
        const targetFill = 0.32 + R() * 0.26;
        let grid = Array.from({ length: rows }, () => new Array(cols).fill(0));

        // 1–3 walkers carve the shape; momentum keeps runs straight so the
        // result reads as structure instead of pure noise.
        const walkerCount = cells > 220 ? 3 : (cells > 80 ? 2 : 1);
        const walkers = Array.from({ length: walkerCount }, () => ({
            r: Math.floor(R() * rows),
            c: Math.floor(R() * cols),
            dr: 0,
            dc: 0,
        }));
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const steps = Math.ceil(targetFill * cells);

        for (let i = 0; i < steps; i++) {
            const w = walkers[i % walkerCount];
            grid[w.r][w.c] = 1;
            // 60% keep direction, else turn
            if (!(w.dr === 0 && w.dc === 0) && R() < 0.6) {
                // keep
            } else {
                const d = dirs[Math.floor(R() * dirs.length)];
                w.dr = d[0];
                w.dc = d[1];
            }
            w.r = Math.min(rows - 1, Math.max(0, w.r + w.dr));
            w.c = Math.min(cols - 1, Math.max(0, w.c + w.dc));
        }

        // Organic refinement
        grid = _egSmoothStructure(grid, rows, cols);
        if (R() < 0.5) grid = _egSmoothStructure(grid, rows, cols);

        // Optional symmetry - mirrored halves feel far more "designed"
        const symRoll = R();
        if (symRoll < 0.45) {          // horizontal mirror
            for (let r = 0; r < rows; r++)
                for (let c = 0; c < cols >> 1; c++)
                    grid[r][cols - 1 - c] = grid[r][c];
        } else if (symRoll < 0.65) {   // vertical mirror
            for (let r = 0; r < rows >> 1; r++)
                for (let c = 0; c < cols; c++)
                    grid[rows - 1 - r][c] = grid[r][c];
        }

        // Acceptance check: sane density and enough clue-bearing lines
        const s = _egStructureStats(grid, rows, cols);
        const ratio = s.filled / cells;
        if (ratio < 0.20 || ratio > 0.70) continue;
        if (s.liveRows < rows * 0.7 || s.liveCols < cols * 0.7) continue;
        return grid;
    }

    // Fallback: seeded scatter + heavy smoothing - always yields something
    let grid = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => R() < 0.42 ? 1 : 0));
    grid = _egSmoothStructure(_egSmoothStructure(grid, rows, cols), rows, cols);
    return grid;
}


//------------------------------------------------------------------------
//-------------------LEVEL FACTORY---------------------------------------
//------------------------------------------------------------------------

// Picks a grid size: honours the minCells floor from map mods and, when a
// size bucket is requested, only draws sizes inside that bucket's range.
// maxRows / maxCols (optional) hard-cap the dimensions - used by boss
// arenas to keep the fight on a small board.
// Biases toward bigger grids as the map tier climbs. Falls back to the
// closest eligible size when no size sits inside the window.
function _egPickGeneratedSize(tier, minCells, bucket, maxRows, maxCols, rng) {
    let lo = minCells || 0;
    let hi = Infinity;
    if (bucket && EG_GEN_BUCKETS[bucket]) {
        lo = Math.max(lo, EG_GEN_BUCKETS[bucket][0]);
        hi = EG_GEN_BUCKETS[bucket][1];
    }

    const fits = s => {
        if (maxRows != null && s.rows > maxRows) return false;
        if (maxCols != null && s.cols > maxCols) return false;
        return true;
    };
    // Encounter-chain global caps (15×30 max, 20×20 max when tall).
    // Keep generated puzzles inside the fun window even when the caller
    // did not pass explicit maxRows/maxCols (e.g. regular chain buckets).
    const chainOk = s => {
        if (typeof _egChainPuzzleSizeAllowed === 'function') return _egChainPuzzleSizeAllowed(s.rows, s.cols);
        if (s.rows > 20 || s.cols > 30) return false;
        if (s.rows > 15 && s.cols > 20) return false;
        return true;
    };

    let list = EG_GEN_SIZES.filter(s => {
        const cells = s.rows * s.cols;
        return cells >= lo && cells <= hi && fits(s) && chainOk(s);
    });

    // Nothing inside the window (e.g. tiny bucket + high minCells floor):
    // use the smallest size that still satisfies the floor.
    if (!list.length) {
        const above = EG_GEN_SIZES
            .filter(s => s.rows * s.cols >= lo && fits(s) && chainOk(s))
            .sort((a, b) => (a.rows * a.cols) - (b.rows * b.cols));
        list = above.length ? [above[0]] : [EG_GEN_SIZES.filter(chainOk).slice(-1)[0] || EG_GEN_SIZES[EG_GEN_SIZES.length - 1]];
    }

    const weights = list.map((s, i) => 1 + i * Math.min(0.6, tier * 0.08));
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = (rng || Math.random)() * total;
    for (let i = 0; i < list.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return list[i];
    }
    return list[list.length - 1];
}

// Chooses a symbol description from the shared symbol pool.
function _egPickRandomSymbol(rng) {
    const R = rng || Math.random;
    return EG_GEN_SYMBOLS[Math.floor(R() * EG_GEN_SYMBOLS.length)];
}

// Builds one generated puzzle level, appends it to ALL and returns its gi.
// opts: { mode, tier, minCells, bucket, maxRows, maxCols, rng } - mode
// defaults to 'mixed'. When opts.rng (a seeded PRNG function) is given,
// EVERY random decision (mode coin flip, size roll, glyph, structure walk,
// flavour text, world) derives from it, so the same seed always produces
// the same grid - used by the atlas chain blueprints for per-map chains.
// Returns null only if even the random fallback failed.
export function _egCreateGeneratedLevel(opts) {
    if (typeof ALL === 'undefined') return null;
    opts = opts || {};
    const tier = Math.max(1, opts.tier || 1);
    const mode = opts.mode || 'mixed';
    const rng = opts.rng || null;
    const R = rng || Math.random;

    let effMode = mode;
    if (mode === 'mixed') effMode = R() < 0.7 ? 'symbol' : 'random';

    const size = _egPickGeneratedSize(tier, opts.minCells, opts.bucket, opts.maxRows, opts.maxCols, rng);

    let grid = null;
    let symbolMeta = null;

    if (effMode === 'symbol') {
        // Try a few different glyphs - exotic characters may render empty
        // depending on installed fonts.
        for (let attempt = 0; attempt < 4 && !grid; attempt++) {
            symbolMeta = _egPickRandomSymbol(rng);
            grid = _egRasterizeSymbolGrid(symbolMeta.ch, size.rows, size.cols);
        }
        if (!grid) effMode = 'random';
    }

    if (!grid) {
        grid = _egGenerateRandomStructure(size.rows, size.cols, rng);
        symbolMeta = null;
    }
    if (!grid) return null;

    const gi = globalThis.ALL.length;
    const level = {
        world: 1 + Math.floor(R() * (typeof WORLDS !== 'undefined' ? globalThis.WORLDS.length : 1)),
        li: 0,
        gIdx: gi,
        size: size.cols,
        grid: grid,
        timer: 1800,
        bonusType: 'nomiss',
        bonusParam: 0,
        isGeneratedPuzzle: true,
        genMode: effMode,
    };

    if (symbolMeta) {
        level.hint = `${symbolMeta.ch} ${symbolMeta.en}`;
        level.hintDE = `${symbolMeta.ch} ${symbolMeta.de}`;
        level.reveal = `The sigil of ${symbolMeta.en} emerges from the static.`;
        level.revealDE = `Das Sigill von ${symbolMeta.de} erscheint aus dem Rauschen.`;
        level.bonusHint = 'Finish without mistakes';
        level.bonusHintDE = 'Beende das Level ohne Fehler';
    } else {
        level.hint = 'Stochastic Pattern';
        level.hintDE = 'Stochastisches Muster';
        const flavor = EG_GEN_RANDOM_REVEALS[Math.floor(R() * EG_GEN_RANDOM_REVEALS.length)];
        level.reveal = flavor.en;
        level.revealDE = flavor.de;
        level.bonusHint = 'Finish without mistakes';
        level.bonusHintDE = 'Beende das Level ohne Fehler';
    }

    globalThis.ALL.push(level);
    return gi;
}
