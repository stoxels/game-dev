import { renderCell } from '../grid.js';
import { applyCell } from '../mouse-button-handlers.js';
import { _egFireProjectile, _egGetElementCentre } from './combat-class-projectiles.js';
import { EG_MONSTER_PROJ_DURATION_MS, _egPlayerTakeDamage } from './encounter.js';
import { _egGetActiveMapModValue } from '../endgame/endgame-map-launch.js';
import { _egIsActive } from './combat-state.js';
import { cur } from '../state.js';
import { _egIceRedirectDepth, _egPuzzleEffects, _egReplacePuzzleEffects, _egSetIceRedirectDepth, _egSetSparkFollowerEl, _egSetSparkLastPosition, _egSetSparkMoveHandler, _egSetSparkSpawnTimer, _egSparkFollowerEl, _egSparkLastX, _egSparkLastY, _egSparkMoveHandler, _egSparkSpawnTimer, EG_SPARK_GLYPHS } from './combat-ailments-state.js';
import { EG_PUZZLE_ATTACK_CHANCE_PCT, EG_PUZZLE_EFFECT_DURATION_MS, EG_PUZZLE_HAZARD_CELLS, EG_ICE_SLIP_CHANCE, EG_SHOCK_MARK_STRIP_CHANCE } from './combat-ailments-core.js';

function _egMaybePuzzleAttack(monster) {
    if (!_egIsActive()) return false;
    if (!monster || !monster.element) return false;
    // Active map run: "Monster Attacks have +#% chance to strike the Puzzle".
    const aggroChance = EG_PUZZLE_ATTACK_CHANCE_PCT +
        ((typeof _egGetActiveMapModValue === 'function')
            ? _egGetActiveMapModValue('map_monster_puzzle_aggro') : 0);
    if (Math.random() * 100 >= aggroChance) return false;

    const sourceCard = document.getElementById(`eg-card-${monster.id}`);
    const grid = document.getElementById('ptable');
    if (!sourceCard || !grid || typeof _egFireProjectile !== 'function') return false;
    if (typeof cur === 'undefined' || !cur || !cur.grid || !cur.grid.length) return false;

    const start = (typeof _egGetElementCentre === 'function') ? _egGetElementCentre(sourceCard) : null;
    const end = (typeof _egGetElementCentre === 'function') ? _egGetElementCentre(grid) : null;
    if (!start || !end) return false;

    _egFireProjectile(monster.emoji, 'eg-proj-monster eg-proj-puzzle', start, end,
        (typeof EG_MONSTER_PROJ_DURATION_MS !== 'undefined') ? EG_MONSTER_PROJ_DURATION_MS : 600,
        'ease-in',
        () => _egApplyPuzzleAilment(monster.element));
    return true;
}

function _egApplyPuzzleAilment(element) {
    if (!_egIsActive()) return;
    switch (element) {
        case 'fire': _egPuzzleLava(); break;
        case 'cold': _egPuzzleIce(); break;
        case 'lightning': _egPuzzleShockedCursor(); break;
        case 'shadow': _egPuzzleShadowBlackout(); break;
        // Arcane has no grid hazard - the chaos curse IS the effect
        case 'arcane': _egApplyPuzzleArcaneBomb(); break;
    }
}

// Picks a random valid cell for hazard placement (unfilled, unrevealed).
function _egPickHazardCell(existingKeys, radiusCenter) {
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    for (let tries = 0; tries < 40; tries++) {
        let r, c;
        if (radiusCenter && tries < 20) {
            // Bias towards the impact zone around the grid centre
            r = radiusCenter.r + Math.floor(Math.random() * 7) - 3;
            c = radiusCenter.c + Math.floor(Math.random() * 7) - 3;
        } else {
            r = Math.floor(Math.random() * rows);
            c = Math.floor(Math.random() * cols);
        }
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        const key = `${r}-${c}`;
        if (existingKeys.has(key)) continue;
        if (globalThis.revealedGrid[r][c] || globalThis.userGrid[r][c] === 1) continue;
        return { r, c, key };
    }
    return null;
}

function _egRegisterPuzzleEffect(effect) {
    effect.until = Date.now() + EG_PUZZLE_EFFECT_DURATION_MS;
    // Natural expiry (vs. encounter cleanup / map swaps) so expiry cues like the
    // soft veil-lift tone only play when the effect actually runs out.
    effect.timer = setTimeout(() => _egRemovePuzzleEffect(effect, true), EG_PUZZLE_EFFECT_DURATION_MS);
    _egPuzzleEffects.push(effect);
}

function _egRemovePuzzleEffect(effect, natural) {
    clearTimeout(effect.timer);
    _egReplacePuzzleEffects(_egPuzzleEffects.filter(e => e !== effect));

    if (effect.type === 'lava' || effect.type === 'ice') {
        effect.cells.forEach((spanId) => {
            const span = document.getElementById(spanId);
            if (span) span.remove();
        });
    } else if (effect.type === 'shockcursor') {
        _egStopShockedCursor();
    } else if (effect.type === 'shadowline') {
        _egRestoreLineClues(effect.line);
    } else if (effect.el) {
        effect.el.remove();
    }
}

// Removes ALL active puzzle ailments (encounter stop / new map).
function _egClearAllPuzzleEffects() {
    _egPuzzleEffects.slice().forEach(_egRemovePuzzleEffect);
}


//------------------------------------------------------------------------
//-------------------PUZZLE: LAVA (fire)---------------------------------
//------------------------------------------------------------------------
// Wrong clicks on lava cells count as 2 mistakes and cost double time.
// The doubling itself lives in penalty.js (_egIsLavaCell check).
//------------------------------------------------------------------------

function _egPuzzleLava() {
    if (_egPuzzleEffects.some(e => e.type === 'lava')) return;
    const rows = cur.grid.length, cols = cur.grid[0].length;
    const center = { r: Math.floor(rows / 2), c: Math.floor(cols / 2) };
    const cells = new Map(); // key → overlay span id

    for (let i = 0; i < EG_PUZZLE_HAZARD_CELLS; i++) {
        const pick = _egPickHazardCell(cells, i === 0 ? null : center);
        if (!pick) continue;
        const el = document.getElementById(`g-${pick.r}-${pick.c}`);
        if (!el) continue;
        const span = document.createElement('span');
        span.className = 'eg-lava-overlay';
        span.id = `eg-lava-${pick.r}-${pick.c}`;
        span.textContent = '🌋';
        el.appendChild(span);
        cells.set(pick.key, span.id);
    }

    if (cells.size === 0) return;
    _egRegisterPuzzleEffect({ type: 'lava', cells });
    globalThis.showToast('🌋 The monster scorched the grid - lava cells punish wrong clicks doubly!');
}

function _egIsLavaCell(row, col) {
    return _egPuzzleEffects.some(e => e.type === 'lava' && e.cells.has(`${row}-${col}`));
}


//------------------------------------------------------------------------
//-------------------PUZZLE: ICE (cold)----------------------------------
//------------------------------------------------------------------------
// Clicking an icy cell may slip onto a random orthogonal neighbour instead.
// Registered as a click intercept in mouse-button-handlers.js.
//------------------------------------------------------------------------

function _egPuzzleIce() {
    if (_egPuzzleEffects.some(e => e.type === 'ice')) return;
    const rows = cur.grid.length, cols = cur.grid[0].length;
    const center = { r: Math.floor(rows / 2), c: Math.floor(cols / 2) };
    const cells = new Map();

    for (let i = 0; i < EG_PUZZLE_HAZARD_CELLS; i++) {
        const pick = _egPickHazardCell(cells, i === 0 ? null : center);
        if (!pick) continue;
        const el = document.getElementById(`g-${pick.r}-${pick.c}`);
        if (!el) continue;
        const span = document.createElement('span');
        span.className = 'eg-ice-overlay';
        span.id = `eg-ice-${pick.r}-${pick.c}`;
        span.textContent = '🧊';
        el.appendChild(span);
        cells.set(pick.key, span.id);
    }

    if (cells.size === 0) return;
    _egRegisterPuzzleEffect({ type: 'ice', cells });
    globalThis.showToast('🧊 Ice spreads across the grid - clicks may slip!');
}

function _egIsIceCell(row, col) {
    return _egPuzzleEffects.some(e => e.type === 'ice' && e.cells.has(`${row}-${col}`));
}

// Click intercept: slip the click to a random orthogonal neighbour.
// Returns true when the click was consumed by the slip.
function _egPuzzleIceRedirect(row, col) {
    if (!_egIsActive() || _egIceRedirectDepth >= 2) return false;
    if (!_egIsIceCell(row, col)) return false;
    if (Math.random() >= EG_ICE_SLIP_CHANCE) return false;

    const neighbours = [
        [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1],
    ].filter(([r, c]) =>
        r >= 0 && c >= 0 && r < cur.grid.length && c < cur.grid[0].length
        && !globalThis.revealedGrid[r][c]
    );
    if (neighbours.length === 0) return false;

    const [nr, nc] = neighbours[Math.floor(Math.random() * neighbours.length)];
    globalThis.showToast('🧊 Slippery! Your click slid to another cell.');
    _egSetIceRedirectDepth(_egIceRedirectDepth + 1);
    try {
        applyCell(nr, nc); // reuses the same pval → same click type on neighbour
    } finally {
        _egSetIceRedirectDepth(_egIceRedirectDepth - 1);
    }
    return true;
}


//------------------------------------------------------------------------
//-------------------PUZZLE: SHOCKED CURSOR (lightning)------------------
//------------------------------------------------------------------------
// Lightning sparks orbit the mouse cursor. While active, every revealed
// (correctly filled) cell has a chance to strip a random ✕ mark anywhere on
// the grid, regardless of its distance from the revealed cell.
//------------------------------------------------------------------------

function _egPuzzleShockedCursor() {
    if (_egPuzzleEffects.some(e => e.type === 'shockcursor')) return;
    _egStartShockedCursor();
    _egRegisterPuzzleEffect({ type: 'shockcursor' });
    globalThis.showToast('⚡ Your cursor is shocked - reveals may scatter your ✕ marks!');
}

function _egStartShockedCursor() {
    if (_egSparkFollowerEl) return;
    document.body.classList.add('eg-cursor-shocked');
    const follower = document.createElement('div');
    follower.id = 'eg-cursor-sparks';
    follower.textContent = '⚡';
    document.body.appendChild(follower);
    _egSetSparkFollowerEl(follower);
    _egSetSparkLastPosition(window.innerWidth / 2, window.innerHeight / 2);
    const moveHandler = (e) => {
        _egSetSparkLastPosition(e.clientX, e.clientY);
        _egSparkFollowerEl.style.left = `${e.clientX}px`;
        _egSparkFollowerEl.style.top = `${e.clientY}px`;
    };
    _egSetSparkMoveHandler(moveHandler);
    document.addEventListener('mousemove', moveHandler);
    // Continuous lightning sparks crackling around the cursor
    _egSetSparkSpawnTimer(setInterval(() => {
        if (!_egSparkFollowerEl) return;
        const count = 2 + Math.floor(Math.random() * 3); // 2–4 sparks per tick
        for (let i = 0; i < count; i++) _egSpawnCursorSpark();
    }, 110));
}

function _egSpawnCursorSpark(x = _egSparkLastX, y = _egSparkLastY) {
    const spark = document.createElement('div');
    spark.className = 'eg-spark-particle';
    spark.textContent = EG_SPARK_GLYPHS[Math.floor(Math.random() * EG_SPARK_GLYPHS.length)];
    // Start at a small random offset so sparks ring the target point
    const ang = Math.random() * Math.PI * 2;
    const startR = 4 + Math.random() * 10;
    Math.cos(ang) * (14 + Math.random() * 26);
    Math.sin(ang) * (14 + Math.random() * 26) - 6; // slight upward bias
    spark.style.left = `${x + Math.cos(ang) * startR}px`;
    spark.style.top = `${y + Math.sin(ang) * startR}px`;
    spark.style.fontSize = `${(9 + Math.random() * 8).toFixed(1)}px`;
    const life = 0.35 + Math.random() * 0.3;
    spark.style.setProperty('--eg-spark-life', `${life.toFixed(2)}s`);
    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), life * 1000 + 60);
}

// Lightning-zap burst on a ✕ mark that was just stripped by the shocked cursor.
function _egSpawnCrossZapFX(row, col) {
    const cell = document.getElementById(`g-${row}-${col}`);
    if (!cell) return;
    const rect = cell.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Big electric ✕ flashing over the cell, then burning away
    const fx = document.createElement('div');
    fx.className = 'eg-cross-zap';
    fx.textContent = '✕';
    fx.style.left = `${cx}px`;
    fx.style.top = `${cy}px`;
    fx.style.fontSize = `${Math.max(rect.width, rect.height) * 0.85}px`;
    document.body.appendChild(fx);
    setTimeout(() => fx.remove(), 700);

    // Sparks scattering from the zapped mark
    for (let i = 0; i < 5; i++) _egSpawnCursorSpark(cx, cy);
}

function _egStopShockedCursor() {
    document.body.classList.remove('eg-cursor-shocked');
    if (_egSparkSpawnTimer) { clearInterval(_egSparkSpawnTimer); _egSetSparkSpawnTimer(null); }
    if (_egSparkFollowerEl) { _egSparkFollowerEl.remove(); _egSetSparkFollowerEl(null); }
    if (_egSparkMoveHandler) { document.removeEventListener('mousemove', _egSparkMoveHandler); _egSetSparkMoveHandler(null); }
}

// Called from handleCorrectFill - while the cursor is shocked, each reveal has
// a chance to strip a random ✕ mark anywhere on the grid (distance irrelevant).
function _egOnCorrectCellPuzzleFX(row, col) {
    if (!_egIsActive()) return;
    if (!_egPuzzleEffects.some(e => e.type === 'shockcursor')) return;
    if (Math.random() >= EG_SHOCK_MARK_STRIP_CHANCE) return;

    // Collect all currently ✕-marked cells, regardless of distance from reveal
    const marked = [];
    for (let r = 0; r < cur.grid.length; r++) {
        for (let c = 0; c < cur.grid[0].length; c++) {
            if (globalThis.userGrid[r][c] === 2) marked.push([r, c]);
        }
    }
    if (!marked.length) return;

    const [r, c] = marked[Math.floor(Math.random() * marked.length)];
    globalThis.userGrid[r][c] = 0;
    globalThis.systemMarkedGrid[r][c] = false;
    renderCell(r, c);
    _egSpawnCrossZapFX(r, c);
    globalThis.showToast('⚡ A spark zapped one of your ✕ marks!');
}


//------------------------------------------------------------------------
//-------------------PUZZLE: SHADOW BLACKOUT (shadow)--------------------
//------------------------------------------------------------------------
// One random row OR column clue line goes dark ("?") for a while.
// Scoped variant of the boss-wide Clue Blackout mechanic.
//------------------------------------------------------------------------


function _egApplyPuzzleArcaneBomb() {
    if (!_egIsActive() || _egPuzzleEffects.some(e => e.type === 'arcanebomb')) return;
    const pick = _egPickHazardCell(new Set());
    if (!pick) return;
    const cell = document.getElementById(`g-${pick.r}-${pick.c}`);
    if (!cell) return;
    const icon = document.createElement('span');
    icon.className = 'eg-arcane-bomb-overlay';
    icon.textContent = '🔮';
    cell.appendChild(icon);
    const bomb = { type: 'arcanebomb', row: pick.r, col: pick.c, until: Date.now() + EG_PUZZLE_EFFECT_DURATION_MS, el: icon };
    bomb.timer = setTimeout(() => {
        const adjacent = [[pick.r-1,pick.c-1],[pick.r-1,pick.c],[pick.r-1,pick.c+1],[pick.r,pick.c-1],[pick.r,pick.c+1],[pick.r+1,pick.c-1],[pick.r+1,pick.c],[pick.r+1,pick.c+1]];
        const marks = adjacent.filter(([r,c]) => r >= 0 && c >= 0 && r < cur.grid.length && c < cur.grid[0].length && globalThis.userGrid[r][c] === 2).length;
        const amount = Math.max(1, marks * 8);
        _egPlayerTakeDamage(amount, true, 'shadow');
        _egRemovePuzzleEffect(bomb);
    }, EG_PUZZLE_EFFECT_DURATION_MS);
    _egPuzzleEffects.push(bomb);
    globalThis.showToast('🔮 An arcane bomb appeared - remove adjacent ✕ marks before it detonates!');
}

function _egPuzzleShadowBlackout() {
    if (_egPuzzleEffects.some(e => e.type === 'shadowline')) return;
    const rows = cur.grid.length, cols = cur.grid[0].length;
    const isRow = Math.random() < 0.5;
    const idx = isRow ? Math.floor(Math.random() * rows) : Math.floor(Math.random() * cols);
    const prefix = isRow ? `rn-${idx}-` : `cn-${idx}-`;
    const line = { dir: isRow ? 'row' : 'col', idx };

    const spans = document.querySelectorAll(`[id^="${prefix}"]`);
    if (!spans.length) return;

    spans.forEach(span => {
        span.dataset.origText = span.textContent;
        span.textContent = '?';
        span.classList.add('eg-shadow-clue-blackout');
    });

    _egRegisterPuzzleEffect({ type: 'shadowline', line });
    globalThis.showToast(`🌑 Shadow veils a ${isRow ? 'row' : 'column'} of clue numbers!`);
}

function _egRestoreLineClues(line) {
    if (!line) return;
    const prefix = line.dir === 'row' ? `rn-${line.idx}-` : `cn-${line.idx}-`;
    document.querySelectorAll(`[id^="${prefix}"]`).forEach(span => {
        if (span.dataset.origText !== undefined) {
            span.textContent = span.dataset.origText;
            delete span.dataset.origText;
        }
        span.classList.remove('eg-shadow-clue-blackout');
    });
}


//------------------------------------------------------------------------
//-------------------LIFECYCLE-------------------------------------------
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------PUZZLE PUBLIC SURFACE----------------------------
//------------------------------------------------------------------------

export {
    _egMaybePuzzleAttack,
    _egApplyPuzzleAilment,
    _egPickHazardCell,
    _egRegisterPuzzleEffect,
    _egRemovePuzzleEffect,
    _egClearAllPuzzleEffects,
    _egPuzzleLava,
    _egIsLavaCell,
    _egPuzzleIce,
    _egIsIceCell,
    _egPuzzleIceRedirect,
    _egPuzzleShockedCursor,
    _egStartShockedCursor,
    _egSpawnCursorSpark,
    _egSpawnCrossZapFX,
    _egStopShockedCursor,
    _egOnCorrectCellPuzzleFX,
    _egApplyPuzzleArcaneBomb,
    _egPuzzleShadowBlackout,
    _egRestoreLineClues,
};
