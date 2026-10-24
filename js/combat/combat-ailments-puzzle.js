import { Audio_Manager } from '../audio/audio.js';
import { renderCell } from '../grid.js';
import { applyCell } from '../mouse-button-handlers.js';
import { _fireProjectile, _getElementCentre } from './combat-class-projectiles.js';
import { MONSTER_PROJ_DURATION_MS, _playerTakeDamage } from './encounter.js';
import { _egGetActiveMapModValue } from '../endgame/endgame-map-launch.js';
import { _isActive } from './combat-state.js';
import { cur } from '../state.js';
import { _iceRedirectDepth, _puzzleEffects, _replacePuzzleEffects, _setIceRedirectDepth, _setSparkFollowerEl, _setSparkLastPosition, _setSparkMoveHandler, _setSparkSpawnTimer, _sparkFollowerEl, _sparkLastX, _sparkLastY, _sparkMoveHandler, _sparkSpawnTimer, SPARK_GLYPHS } from './combat-ailments-state.js';
import { PUZZLE_ATTACK_CHANCE_PCT, PUZZLE_EFFECT_DURATION_MS, PUZZLE_HAZARD_CELLS, ICE_SLIP_CHANCE, SHOCK_MARK_STRIP_CHANCE } from './combat-ailments-core.js';

//------------------------------------------------------------------------
//-------------------PUZZLE HAZARDS FROM MONSTERS-------------------------
//------------------------------------------------------------------------
// Effects that monster attacks put on the puzzle itself: lava and ice cells,
// the shocked cursor, arcane bombs and shadow blackouts of a line.
//------------------------------------------------------------------------

// Lets a monster strike the puzzle instead of the player (base chance plus
// the map-mod bonus). Returns true when it did.
function _maybePuzzleAttack(monster) {
    if (!_isActive()) return false;
    if (!monster || !monster.element) return false;
    // Active map run: "Monster Attacks have +#% chance to strike the Puzzle".
    const aggroChance = PUZZLE_ATTACK_CHANCE_PCT +
        ((typeof _egGetActiveMapModValue === 'function')
            ? _egGetActiveMapModValue('map_monster_puzzle_aggro') : 0);
    if (Math.random() * 100 >= aggroChance) return false;

    const sourceCard = document.getElementById(`sx-card-${monster.id}`);
    const grid = document.getElementById('ptable');
    if (!sourceCard || !grid || typeof _fireProjectile !== 'function') return false;
    if (typeof cur === 'undefined' || !cur || !cur.grid || !cur.grid.length) return false;

    const start = (typeof _getElementCentre === 'function') ? _getElementCentre(sourceCard) : null;
    const end = (typeof _getElementCentre === 'function') ? _getElementCentre(grid) : null;
    if (!start || !end) return false;

    Audio_Manager.playSFX('monster_puzzle_attack');
    _fireProjectile(monster.emoji, 'sx-proj-monster sx-proj-puzzle', start, end,
        (typeof MONSTER_PROJ_DURATION_MS !== 'undefined') ? MONSTER_PROJ_DURATION_MS : 600,
        'ease-in',
        () => _applyPuzzleAilment(monster.element));
    return true;
}

// Applies the puzzle hazard that matches a monster's element (lava, ice,
// shocked cursor, shadow blackout...).
function _applyPuzzleAilment(element) {
    if (!_isActive()) return;
    switch (element) {
        case 'fire': _puzzleLava(); break;
        case 'cold': _puzzleIce(); break;
        case 'lightning': _puzzleShockedCursor(); break;
        case 'shadow': _puzzleShadowBlackout(); break;
        // Arcane has no grid hazard - the chaos curse IS the effect
        case 'arcane': _applyPuzzleArcaneBomb(); break;
    }
}

// Picks a random valid cell for hazard placement (unfilled, unrevealed).
function _pickHazardCell(existingKeys, radiusCenter) {
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

// Tracks a puzzle effect and schedules its natural expiry.
function _registerPuzzleEffect(effect) {
    effect.until = Date.now() + PUZZLE_EFFECT_DURATION_MS;
    // Natural expiry (vs. encounter cleanup / map swaps) so expiry cues like the
    // soft veil-lift tone only play when the effect actually runs out.
    effect.timer = setTimeout(() => _removePuzzleEffect(effect, true), PUZZLE_EFFECT_DURATION_MS);
    _puzzleEffects.push(effect);
}

// Ends a puzzle effect and cleans up its visuals; 'natural' marks an expiry
// rather than a cleanup.
function _removePuzzleEffect(effect, natural) {
    clearTimeout(effect.timer);
    _replacePuzzleEffects(_puzzleEffects.filter(e => e !== effect));

    if (effect.type === 'lava' || effect.type === 'ice') {
        effect.cells.forEach((spanId) => {
            const span = document.getElementById(spanId);
            if (span) span.remove();
        });
    } else if (effect.type === 'shockcursor') {
        _stopShockedCursor();
    } else if (effect.type === 'shadowline') {
        _restoreLineClues(effect.line);
    } else if (effect.el) {
        effect.el.remove();
    }
}

// Removes ALL active puzzle ailments (encounter stop / new map).
function _clearAllPuzzleEffects() {
    _puzzleEffects.slice().forEach(_removePuzzleEffect);
}


//------------------------------------------------------------------------
//-------------------PUZZLE: LAVA (fire)---------------------------------
//------------------------------------------------------------------------
// Wrong clicks on lava cells count as 2 mistakes and cost double time.
// The doubling itself lives in penalty.js (_isLavaCell check).
//------------------------------------------------------------------------

// Marks a few cells near the grid center as lava for a while.
function _puzzleLava() {
    if (_puzzleEffects.some(e => e.type === 'lava')) return;
    const rows = cur.grid.length, cols = cur.grid[0].length;
    const center = { r: Math.floor(rows / 2), c: Math.floor(cols / 2) };
    const cells = new Map(); // key → overlay span id

    for (let i = 0; i < PUZZLE_HAZARD_CELLS; i++) {
        const pick = _pickHazardCell(cells, i === 0 ? null : center);
        if (!pick) continue;
        const el = document.getElementById(`g-${pick.r}-${pick.c}`);
        if (!el) continue;
        const span = document.createElement('span');
        span.className = 'sx-lava-overlay';
        span.id = `sx-lava-${pick.r}-${pick.c}`;
        span.textContent = '🌋';
        el.appendChild(span);
        cells.set(pick.key, span.id);
    }

    if (cells.size === 0) return;
    _registerPuzzleEffect({ type: 'lava', cells });
    Audio_Manager.playSFX('grid_lava_spawn');
    globalThis.showCombatToast('🌋 Lava cells - wrong clicks hurt double!');
}

// True when the cell is currently lava.
function _isLavaCell(row, col) {
    return _puzzleEffects.some(e => e.type === 'lava' && e.cells.has(`${row}-${col}`));
}


//------------------------------------------------------------------------
//-------------------PUZZLE: ICE (cold)----------------------------------
//------------------------------------------------------------------------
// Clicking an icy cell may slip onto a random orthogonal neighbour instead.
// Registered as a click intercept in mouse-button-handlers.js.
//------------------------------------------------------------------------

// Marks a few cells near the grid center as ice for a while.
function _puzzleIce() {
    if (_puzzleEffects.some(e => e.type === 'ice')) return;
    const rows = cur.grid.length, cols = cur.grid[0].length;
    const center = { r: Math.floor(rows / 2), c: Math.floor(cols / 2) };
    const cells = new Map();

    for (let i = 0; i < PUZZLE_HAZARD_CELLS; i++) {
        const pick = _pickHazardCell(cells, i === 0 ? null : center);
        if (!pick) continue;
        const el = document.getElementById(`g-${pick.r}-${pick.c}`);
        if (!el) continue;
        const span = document.createElement('span');
        span.className = 'sx-ice-overlay';
        span.id = `sx-ice-${pick.r}-${pick.c}`;
        span.textContent = '🧊';
        el.appendChild(span);
        cells.set(pick.key, span.id);
    }

    if (cells.size === 0) return;
    _registerPuzzleEffect({ type: 'ice', cells });
    Audio_Manager.playSFX('grid_ice_patch');
}

// True when the cell is currently ice.
function _isIceCell(row, col) {
    return _puzzleEffects.some(e => e.type === 'ice' && e.cells.has(`${row}-${col}`));
}

// Click intercept: slip the click to a random orthogonal neighbour.
// Returns true when the click was consumed by the slip.
function _puzzleIceRedirect(row, col) {
    if (!_isActive() || _iceRedirectDepth >= 2) return false;
    if (!_isIceCell(row, col)) return false;
    if (Math.random() >= ICE_SLIP_CHANCE) return false;

    const neighbours = [
        [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1],
    ].filter(([r, c]) =>
        r >= 0 && c >= 0 && r < cur.grid.length && c < cur.grid[0].length
        && !globalThis.revealedGrid[r][c]
    );
    if (neighbours.length === 0) return false;

    const [nr, nc] = neighbours[Math.floor(Math.random() * neighbours.length)];
    Audio_Manager.playSFX('grid_ice_slip');
    globalThis.showCombatToast('🧊 Slipped to another cell!');
    _setIceRedirectDepth(_iceRedirectDepth + 1);
    try {
        applyCell(nr, nc); // reuses the same pval → same click type on neighbour
    } finally {
        _setIceRedirectDepth(_iceRedirectDepth - 1);
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

// Starts the shocked-cursor effect once: reveals scatter the player's X
// marks.
function _puzzleShockedCursor() {
    if (_puzzleEffects.some(e => e.type === 'shockcursor')) return;
    _startShockedCursor();
    _registerPuzzleEffect({ type: 'shockcursor' });
    globalThis.showCombatToast('⚡ Shocked - reveals scatter your ✕ marks!');
}

// Adds the spark follower and the cursor styling for the shocked effect.
function _startShockedCursor() {
    if (_sparkFollowerEl) return;
    document.body.classList.add('sx-cursor-shocked');
    const follower = document.createElement('div');
    follower.id = 'sx-cursor-sparks';
    follower.textContent = '⚡';
    document.body.appendChild(follower);
    _setSparkFollowerEl(follower);
    _setSparkLastPosition(window.innerWidth / 2, window.innerHeight / 2);
    const moveHandler = (e) => {
        _setSparkLastPosition(e.clientX, e.clientY);
        _sparkFollowerEl.style.left = `${e.clientX}px`;
        _sparkFollowerEl.style.top = `${e.clientY}px`;
    };
    _setSparkMoveHandler(moveHandler);
    document.addEventListener('mousemove', moveHandler);
    // Continuous lightning sparks crackling around the cursor
    _setSparkSpawnTimer(setInterval(() => {
        if (!_sparkFollowerEl) return;
        const count = 2 + Math.floor(Math.random() * 3); // 2–4 sparks per tick
        for (let i = 0; i < count; i++) _spawnCursorSpark();
    }, 110));
}

// Spawns one spark particle around a point.
function _spawnCursorSpark(x = _sparkLastX, y = _sparkLastY) {
    const spark = document.createElement('div');
    spark.className = 'sx-spark-particle';
    spark.textContent = SPARK_GLYPHS[Math.floor(Math.random() * SPARK_GLYPHS.length)];
    // Start at a small random offset so sparks ring the target point
    const ang = Math.random() * Math.PI * 2;
    const startR = 4 + Math.random() * 10;
    Math.cos(ang) * (14 + Math.random() * 26);
    Math.sin(ang) * (14 + Math.random() * 26) - 6; // slight upward bias
    spark.style.left = `${x + Math.cos(ang) * startR}px`;
    spark.style.top = `${y + Math.sin(ang) * startR}px`;
    spark.style.fontSize = `${(9 + Math.random() * 8).toFixed(1)}px`;
    const life = 0.35 + Math.random() * 0.3;
    spark.style.setProperty('--sx-spark-life', `${life.toFixed(2)}s`);
    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), life * 1000 + 60);
}

// Lightning-zap burst on a ✕ mark that was just stripped by the shocked cursor.
function _spawnCrossZapFX(row, col) {
    const cell = document.getElementById(`g-${row}-${col}`);
    if (!cell) return;
    const rect = cell.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Big electric ✕ flashing over the cell, then burning away
    const fx = document.createElement('div');
    fx.className = 'sx-cross-zap';
    fx.textContent = '✕';
    fx.style.left = `${cx}px`;
    fx.style.top = `${cy}px`;
    fx.style.fontSize = `${Math.max(rect.width, rect.height) * 0.85}px`;
    document.body.appendChild(fx);
    setTimeout(() => fx.remove(), 700);

    // Sparks scattering from the zapped mark
    for (let i = 0; i < 5; i++) _spawnCursorSpark(cx, cy);
}

// Removes the spark follower, handlers and cursor styling.
function _stopShockedCursor() {
    document.body.classList.remove('sx-cursor-shocked');
    if (_sparkSpawnTimer) { clearInterval(_sparkSpawnTimer); _setSparkSpawnTimer(null); }
    if (_sparkFollowerEl) { _sparkFollowerEl.remove(); _setSparkFollowerEl(null); }
    if (_sparkMoveHandler) { document.removeEventListener('mousemove', _sparkMoveHandler); _setSparkMoveHandler(null); }
}

// Called from handleCorrectFill - while the cursor is shocked, each reveal has
// a chance to strip a random ✕ mark anywhere on the grid (distance irrelevant).
function _onCorrectCellPuzzleFX(row, col) {
    if (!_isActive()) return;
    if (!_puzzleEffects.some(e => e.type === 'shockcursor')) return;
    if (Math.random() >= SHOCK_MARK_STRIP_CHANCE) return;

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
    _spawnCrossZapFX(r, c);
    Audio_Manager.playSFX('grid_shock_strip');
    globalThis.showCombatToast('⚡ A ✕ mark was zapped!');
}


//------------------------------------------------------------------------
//-------------------PUZZLE: SHADOW BLACKOUT (shadow)--------------------
//------------------------------------------------------------------------
// One random row OR column clue line goes dark ("?") for a while.
// Scoped variant of the boss-wide Clue Blackout mechanic.
//------------------------------------------------------------------------


// Places an arcane bomb on a random free cell.
function _applyPuzzleArcaneBomb() {
    if (!_isActive() || _puzzleEffects.some(e => e.type === 'arcanebomb')) return;
    const pick = _pickHazardCell(new Set());
    if (!pick) return;
    const cell = document.getElementById(`g-${pick.r}-${pick.c}`);
    if (!cell) return;
    const icon = document.createElement('span');
    icon.className = 'sx-arcane-bomb-overlay';
    icon.textContent = '🔮';
    cell.appendChild(icon);
    const bomb = { type: 'arcanebomb', row: pick.r, col: pick.c, until: Date.now() + PUZZLE_EFFECT_DURATION_MS, el: icon };
    bomb.timer = setTimeout(() => {
        const adjacent = [[pick.r-1,pick.c-1],[pick.r-1,pick.c],[pick.r-1,pick.c+1],[pick.r,pick.c-1],[pick.r,pick.c+1],[pick.r+1,pick.c-1],[pick.r+1,pick.c],[pick.r+1,pick.c+1]];
        const marks = adjacent.filter(([r,c]) => r >= 0 && c >= 0 && r < cur.grid.length && c < cur.grid[0].length && globalThis.userGrid[r][c] === 2).length;
        const amount = Math.max(1, marks * 8);
        _playerTakeDamage(amount, true, 'shadow');
        _removePuzzleEffect(bomb);
    }, PUZZLE_EFFECT_DURATION_MS);
    _puzzleEffects.push(bomb);
    globalThis.showCombatToast('🔮 Arcane bomb - clear nearby ✕ marks!');
}

// Hides the clue numbers of one random row or column for a while.
function _puzzleShadowBlackout() {
    if (_puzzleEffects.some(e => e.type === 'shadowline')) return;
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
        span.classList.add('sx-shadow-clue-blackout');
    });

    _registerPuzzleEffect({ type: 'shadowline', line });
    Audio_Manager.playSFX('grid_veil');
    globalThis.showCombatToast(`🌑 Shadow veils a ${isRow ? 'row' : 'column'}!`);
}

// Puts the original clue numbers back on a blacked-out line.
function _restoreLineClues(line) {
    if (!line) return;
    const prefix = line.dir === 'row' ? `rn-${line.idx}-` : `cn-${line.idx}-`;
    document.querySelectorAll(`[id^="${prefix}"]`).forEach(span => {
        if (span.dataset.origText !== undefined) {
            span.textContent = span.dataset.origText;
            delete span.dataset.origText;
        }
        span.classList.remove('sx-shadow-clue-blackout');
    });
}


//------------------------------------------------------------------------
//-------------------LIFECYCLE-------------------------------------------
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------PUZZLE PUBLIC SURFACE----------------------------
//------------------------------------------------------------------------

export {
    _maybePuzzleAttack,
    _applyPuzzleAilment,
    _pickHazardCell,
    _registerPuzzleEffect,
    _removePuzzleEffect,
    _clearAllPuzzleEffects,
    _puzzleLava,
    _isLavaCell,
    _puzzleIce,
    _isIceCell,
    _puzzleIceRedirect,
    _puzzleShockedCursor,
    _startShockedCursor,
    _spawnCursorSpark,
    _spawnCrossZapFX,
    _stopShockedCursor,
    _onCorrectCellPuzzleFX,
    _applyPuzzleArcaneBomb,
    _puzzleShadowBlackout,
    _restoreLineClues,
};
