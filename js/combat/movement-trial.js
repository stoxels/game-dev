import { LANG } from '../translation/translations.js';
import { STATE, cur } from '../state.js';
import { Audio_Manager } from '../audio/audio.js';
import { keybindKeyFor } from '../keybinds.js';
import { _animSetDefaultDownImage, _animShouldMirrorFor, _animWarmCacheFor, _playAvatarWalkAnimation, _startAvatarIdleAnimation, _stopAvatarWalkAnimation } from '../sprite/sprite_animations.js';
import { _campaignMonsterLevel } from '../hub/hub-leveling.js';
import { _addItemToStash } from '../hub/hub-stash.js';
import { _generateEquipmentDrop } from '../loot/loot-equipment-generator.js';
import { _showHubTooltip } from '../loot/loot-currency-tooltip.js';
import { _clearTooltip, _moveTooltip } from '../hub/hub-tooltips.js';

//------------------------------------------------------------------------
// MOVEMENT TRIAL
//
// Bonus objective type 'movement' (levels are chosen in
// js/levels/movement-trial-levels.js). After the puzzle is solved a large
// modal opens, counts 5-4-3-2-1 and then the player walks their sprite
// (WASD / arrow keys) in a small arena:
//   - circle arenas: walk into each green circle before the clock runs out;
//     every circle adds a little time back. Some arenas have walls.
//   - mazes: find the treasure chest at the exit before the clock runs out;
//     the chest then offers a few items to take.
// Reaching the goal meets the bonus; running out of time only forfeits it
// (the level itself is already complete). The walls are plain CSS blocks.
//
// Entry: scoring.js -> startMovementTrial(variant, onDone). The win overlay
// is rendered only once onDone(success) fires, so rewards reflect the result.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-------------------TUNING & LAYOUTS-------------------------------------
//------------------------------------------------------------------------

const COLS = 16, ROWS = 9;
const CELL = 72;                    // arena pixels per layout cell (arena is 1152 x 648, scaled to fit)
const WALK_SPEED = 320;             // same as the avatar's walking speed (px/s)
const HALF = 14;                    // half the sprite's collision box
const COUNTDOWN_FROM = 5;
const CIRCLE_R = 40;
const CIRCLE_GOAL = 8;              // circles to reach in a circle arena
const START_TIME_S = 7;
const TIME_GAIN_S = 1.3;            // time added for every circle reached
const TIME_CAP_S = 12;
const CIRCLE_MIN_DIST = 260;        // next circle is at least this far from you...
const CIRCLE_MAX_DIST = 520;        // ...and at most this far
const MAZE_TIME_FACTOR = 1.7;       // maze time = shortest walk * this + MAZE_TIME_PAD_S
const MAZE_TIME_PAD_S = 5;
const CHEST_REACH_PX = 52;
const CHEST_ITEMS = 3;
const RESULT_MS = 1600;
const CHEST_IMG = 'images/Tutorial/Treasure_Chest.webp';

// '#' wall, '.' floor, 'S' maze start, 'E' maze exit (chest).
const MOVEMENT_VARIANTS = [
    { kind: 'circles', name: ['Open Field', 'Offenes Feld'], rows: [
        '................', '................', '................', '................', '................',
        '................', '................', '................', '................'] },
    { kind: 'circles', name: ['Pillars', 'Säulen'], rows: [
        '................', '..##........##..', '................', '....#......#....', '................',
        '....#......#....', '................', '..##........##..', '................'] },
    { kind: 'circles', name: ['Broken Walls', 'Gebrochene Mauern'], rows: [
        '................', '................', '..####....####..', '................', '.......##.......',
        '................', '..####....####..', '................', '................'] },
    { kind: 'maze', name: ['Winding Maze', 'Verwinkeltes Labyrinth'], rows: [
        'S.#.....#.......', '.##.###.#.#####.', '....#...#.....#.', '.####.###.###.#.', '......#...#...#.',
        '.####.#.###.###.', '.#....#.#...#...', '.#.####.#.###.#.', '........#.....#E'] },
    { kind: 'maze', name: ['Long Corridors', 'Lange Gänge'], rows: [
        'S...#.......#...', '.##.#.#####.#.#.', '.#..#.#...#...#.', '.#.##.#.#.#####.', '.#....#.#.....#.',
        '.######.#####.#.', '......#.....#.#.', '.####.#####.#.#.', '......#.....#..E'] },
];

//------------------------------------------------------------------------
//-------------------LOW-LEVEL HELPERS------------------------------------
//------------------------------------------------------------------------

// Picks the English or German text for the current language.
function _tr(en, de) {
    return LANG === 'de' ? de : en;
}

// True for the layout cell at column x / row y being a wall (outside = wall).
function _isWall(rows, x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
    return rows[y][x] === '#';
}

// Finds the layout cell holding the letter (e.g. 'S'), as { x, y } or null.
function _findCell(rows, letter) {
    for (let y = 0; y < ROWS; y++) {
        const x = rows[y].indexOf(letter);
        if (x >= 0) return { x, y };
    }
    return null;
}

// Number of cell steps from every cell to the start cell (walls excluded),
// as a Map keyed "x,y".
function _walkDistances(rows, from) {
    const dist = new Map([[from.x + ',' + from.y, 0]]);
    const queue = [from];
    while (queue.length) {
        const c = queue.shift();
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
            const nx = c.x + dx, ny = c.y + dy, key = nx + ',' + ny;
            if (_isWall(rows, nx, ny) || dist.has(key)) return;
            dist.set(key, dist.get(c.x + ',' + c.y) + 1);
            queue.push({ x: nx, y: ny });
        });
    }
    return dist;
}

// True when a sprite box centred at (px, py) overlaps any wall cell.
function _hitsWall(rows, px, py) {
    const x0 = Math.floor((px - HALF) / CELL), x1 = Math.floor((px + HALF) / CELL);
    const y0 = Math.floor((py - HALF) / CELL), y1 = Math.floor((py + HALF) / CELL);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (_isWall(rows, x, y)) return true;
    return false;
}

// Centre of a layout cell in arena pixels.
function _cellCentre(cell) {
    return { x: (cell.x + 0.5) * CELL, y: (cell.y + 0.5) * CELL };
}

// Picks where the next green circle goes: a floor cell a walk away from the
// player (not too close, not too far, and reachable around the walls).
function _pickCircleSpot(rows, pos) {
    const here = { x: Math.floor(pos.x / CELL), y: Math.floor(pos.y / CELL) };
    const dist = _walkDistances(rows, here);
    const options = [];
    dist.forEach((steps, key) => {
        const [x, y] = key.split(',').map(Number);
        const c = _cellCentre({ x, y });
        const d = Math.hypot(c.x - pos.x, c.y - pos.y);
        if (d >= CIRCLE_MIN_DIST && d <= CIRCLE_MAX_DIST && steps * CELL <= CIRCLE_MAX_DIST * 1.9) options.push(c);
    });
    if (!options.length) return _cellCentre(here);
    return options[Math.floor(Math.random() * options.length)];
}

// Seconds the player gets for a maze: the shortest walk plus a margin.
function _mazeTimeS(rows) {
    const s = _findCell(rows, 'S'), e = _findCell(rows, 'E');
    const steps = _walkDistances(rows, s).get(e.x + ',' + e.y) || 30;
    return Math.ceil(steps * CELL / WALK_SPEED * MAZE_TIME_FACTOR + MAZE_TIME_PAD_S);
}

//------------------------------------------------------------------------
//-------------------MODAL (DOM) -----------------------------------------
//------------------------------------------------------------------------

// Builds the modal and returns handles to its parts. 'modal-bg show' also
// makes the normal avatar's movement input stand down while it is open.
function _buildModal(variant) {
    const root = document.createElement('div');
    root.id = 'mt-overlay';
    root.className = 'modal-bg show';
    const title = _tr('MOVEMENT TRIAL', 'BEWEGUNGSPRÜFUNG');
    const hint = variant.kind === 'maze'
        ? _tr('Reach the treasure chest before time runs out!', 'Erreiche die Schatztruhe, bevor die Zeit abläuft!')
        : _tr('Walk into the green circles - each one gives you a little time back!', 'Lauf in die grünen Kreise - jeder gibt dir etwas Zeit zurück!');
    root.innerHTML = `<div class="mt-box">
        <div class="mt-head"><span class="mt-title">${title}</span><span class="mt-name">${_tr(variant.name[0], variant.name[1])}</span></div>
        <div class="mt-hint">${hint}</div>
        <div class="mt-hud"><div class="mt-bar"><div class="mt-bar-fill"></div></div><span class="mt-time">0.0</span><span class="mt-progress"></span></div>
        <div class="mt-arena-wrap"><div class="mt-arena" style="width:${COLS * CELL}px;height:${ROWS * CELL}px"></div></div>
        <button class="mt-skip">${_tr('Skip (forfeit bonus)', 'Überspringen (Bonus verfallen)')}</button>
    </div>`;
    document.body.appendChild(root);
    const arena = root.querySelector('.mt-arena');
    const wrap = root.querySelector('.mt-arena-wrap');
    const fit = () => {
        const k = Math.min(1, (window.innerWidth * 0.9) / (COLS * CELL), (window.innerHeight * 0.66) / (ROWS * CELL));
        arena.style.transform = 'scale(' + k + ')';
        wrap.style.width = Math.round(COLS * CELL * k) + 'px';
        wrap.style.height = Math.round(ROWS * CELL * k) + 'px';
    };
    fit();
    window.addEventListener('resize', fit);
    return {
        root, arena, fit,
        barFill: root.querySelector('.mt-bar-fill'),
        timeEl: root.querySelector('.mt-time'),
        progressEl: root.querySelector('.mt-progress'),
        skipBtn: root.querySelector('.mt-skip'),
    };
}

// Draws the wall cells (plain CSS blocks) into the arena.
function _drawWalls(arena, rows) {
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (rows[y][x] !== '#') continue;
            const el = document.createElement('div');
            el.className = 'mt-wall';
            el.style.cssText = `left:${x * CELL}px;top:${y * CELL}px;width:${CELL}px;height:${CELL}px`;
            arena.appendChild(el);
        }
    }
}

const AVATAR_ID = 'mt-avatar-img';
const AVATAR_SIZE = 64;             // drawn size of the sprite (collision box stays HALF)

// Creates the player's sprite: an <img> driven by the regular idle / walk
// animation frames (the same ones the avatar uses on the puzzle screen).
function _makeAvatar(arena) {
    const el = document.createElement('div');
    el.className = 'mt-avatar';
    el.innerHTML = `<img id="${AVATAR_ID}" alt="" draggable="false">`;
    arena.appendChild(el);
    const img = el.firstChild;
    _animSetDefaultDownImage(img);
    _animWarmCacheFor(STATE.playerCharacter, STATE.playerAscendency || STATE.playerClass || 'noclass');
    _startAvatarIdleAnimation(AVATAR_ID);
    return el;
}

// Plays the walk animation for the held direction and mirrors the sprite
// the way the regular avatar does (only the right-facing fallback art
// mirrors when heading left).
function _animateWalk(avatar, dir) {
    if (!dir.dx && !dir.dy) return;
    const face = Math.abs(dir.dx) >= Math.abs(dir.dy) ? (dir.dx > 0 ? 'right' : 'left') : (dir.dy > 0 ? 'down' : 'up');
    _playAvatarWalkAnimation(AVATAR_ID, face);
    const variant = STATE.playerAscendency || STATE.playerClass || 'noclass';
    avatar.firstChild.style.transform = _animShouldMirrorFor(STATE.playerCharacter, variant, face) ? 'scaleX(-1)' : 'scaleX(1)';
}

// Places an element so its centre is at (x, y) in the arena.
function _place(el, x, y, size) {
    el.style.left = Math.round(x - size / 2) + 'px';
    el.style.top = Math.round(y - size / 2) + 'px';
    el.style.width = el.style.height = size + 'px';
}

// Shows a large banner text over the arena (countdown numbers, results).
function _banner(arena, text, cls) {
    let el = arena.querySelector('.mt-banner');
    if (!el) {
        el = document.createElement('div');
        el.className = 'mt-banner';
        arena.appendChild(el);
    }
    el.className = 'mt-banner ' + (cls || '');
    el.textContent = text;
    el.style.display = text ? '' : 'none';
}

//------------------------------------------------------------------------
//-------------------CHEST REWARD-----------------------------------------
//------------------------------------------------------------------------

// Opens the chest panel over the arena with a few items to take. Items are
// taken with a click; "Continue" takes whatever is left, so nothing is lost.
// Calls done() when the panel closes.
function _openChest(modal, done) {
    const level = Math.max(1, Math.round(_campaignMonsterLevel(cur ? cur.gIdx : 0) || 1));
    const items = [];
    for (let i = 0; i < CHEST_ITEMS; i++) {
        try { const it = _generateEquipmentDrop(level); if (it) items.push(it); } catch (e) { /* skip a failed roll */ }
    }
    const panel = document.createElement('div');
    panel.className = 'mt-chest-panel';
    panel.innerHTML = `<img class="mt-chest-img" src="${CHEST_IMG}" alt="" draggable="false">
        <div class="mt-chest-title">${_tr('TREASURE CHEST', 'SCHATZTRUHE')}</div>
        <div class="mt-chest-items"></div>
        <button class="mt-chest-continue">${_tr('Take all & continue', 'Alles nehmen & weiter')}</button>`;
    const list = panel.querySelector('.mt-chest-items');
    const taken = new Set();
    const take = (i, btn) => {
        if (taken.has(i)) return;
        taken.add(i);
        try { _addItemToStash(items[i]); } catch (e) { /* stash failure must not trap the player */ }
        _clearTooltip();
        btn.classList.add('mt-chest-taken');
        btn.disabled = true;
        try { Audio_Manager.playSFX('item_equip'); } catch (e) { /* sound is cosmetic */ }
    };
    items.forEach((it, i) => {
        const btn = document.createElement('button');
        btn.className = 'mt-chest-item';
        btn.innerHTML = `<span class="mt-chest-icon">${it.icon || '📦'}</span><span class="mt-chest-name">${it.name || ''}</span>`;
        btn.addEventListener('click', () => take(i, btn));
        // Hover shows the same item tooltip as the stash.
        btn.addEventListener('mouseenter', (e) => { try { _showHubTooltip(it, e); } catch (err) { /* tooltip is cosmetic */ } });
        btn.addEventListener('mousemove', _moveTooltip);
        btn.addEventListener('mouseleave', _clearTooltip);
        list.appendChild(btn);
    });
    panel.querySelector('.mt-chest-continue').addEventListener('click', () => {
        list.querySelectorAll('.mt-chest-item').forEach((btn, i) => take(i, btn));
        _clearTooltip();
        panel.remove();
        done();
    });
    modal.root.querySelector('.mt-box').appendChild(panel);
}

//------------------------------------------------------------------------
//-------------------THE RUN----------------------------------------------
//------------------------------------------------------------------------

// Reads the held movement keys (rebound keys from settings, plus arrows) as
// a direction vector.
function _readDirection(held) {
    const k = (name, fallback) => keybindKeyFor(name) ?? fallback;
    let dx = 0, dy = 0;
    if (held.has(k('move-up', 'w')) || held.has('arrowup')) dy -= 1;
    if (held.has(k('move-down', 's')) || held.has('arrowdown')) dy += 1;
    if (held.has(k('move-left', 'a')) || held.has('arrowleft')) dx -= 1;
    if (held.has(k('move-right', 'd')) || held.has('arrowright')) dx += 1;
    return { dx, dy };
}

// Moves the player by one frame; each axis separately so walls slide.
function _step(rows, pos, dir, dtS) {
    const len = Math.hypot(dir.dx, dir.dy);
    if (!len) return;
    const dist = WALK_SPEED * dtS;
    const nx = pos.x + dir.dx / len * dist;
    if (!_hitsWall(rows, nx, pos.y)) pos.x = nx;
    const ny = pos.y + dir.dy / len * dist;
    if (!_hitsWall(rows, pos.x, ny)) pos.y = ny;
}

// Runs the whole trial: countdown, play, result. onDone(success) fires once
// the result banner (and, for a won maze, the chest) is finished.
export function startMovementTrial(variantIndex, onDone) {
    const variant = MOVEMENT_VARIANTS[Math.max(0, Math.min(MOVEMENT_VARIANTS.length - 1, Number(variantIndex) || 0))];
    const rows = variant.rows;
    const modal = _buildModal(variant);
    _drawWalls(modal.arena, rows);
    const maze = variant.kind === 'maze';
    const startCell = maze ? _findCell(rows, 'S') : { x: 7, y: 3 };
    const pos = _cellCentre(startCell);
    const avatar = _makeAvatar(modal.arena);
    _place(avatar, pos.x, pos.y, AVATAR_SIZE);

    let goal = null, goalEl = null, reached = 0, timeLeft = 0, timeMax = 0;
    const held = new Set();
    let phase = 'countdown', raf = 0, last = 0, finished = false;
    const timers = [];

    // Stops capturing keys, so Alt (item compare) and Esc behave normally in
    // the chest screen once the run itself is over.
    const releaseKeys = () => {
        held.clear();
        document.removeEventListener('keydown', onKeyDown, true);
        document.removeEventListener('keyup', onKeyUp, true);
    };

    const finish = (success) => {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf);
        timers.forEach(clearTimeout);
        releaseKeys();
        window.removeEventListener('resize', modal.fit);
        modal.root.remove();
        _stopAvatarWalkAnimation();
        _startAvatarIdleAnimation('avatar-sprite-img-simple');
        onDone(success);
    };

    const showGoal = (p) => {
        goal = p;
        if (!goalEl) { goalEl = document.createElement('div'); modal.arena.appendChild(goalEl); }
        goalEl.className = maze ? 'mt-chest' : 'mt-circle';
        goalEl.innerHTML = maze ? `<img src="${CHEST_IMG}" alt="" draggable="false">` : '';
        _place(goalEl, p.x, p.y, maze ? 80 : CIRCLE_R * 2);
    };

    const updateHud = () => {
        modal.timeEl.textContent = Math.max(0, timeLeft).toFixed(1) + 's';
        modal.barFill.style.width = Math.max(0, Math.min(100, timeLeft / timeMax * 100)) + '%';
        modal.progressEl.textContent = maze ? '' : reached + ' / ' + CIRCLE_GOAL;
    };

    const end = (success) => {
        phase = 'result';
        releaseKeys();
        _banner(modal.arena, success ? _tr('SUCCESS!', 'GESCHAFFT!') : _tr("TIME'S UP!", 'ZEIT ABGELAUFEN!'), success ? 'mt-win' : 'mt-lose');
        try { Audio_Manager.playSFX(success ? 'win' : 'lose'); } catch (e) { /* sound is cosmetic */ }
        timers.push(setTimeout(() => {
            if (success && maze) _openChest(modal, () => finish(true));
            else finish(success);
        }, RESULT_MS));
    };

    const onGoalReached = () => {
        reached++;
        try { Audio_Manager.playSFX('toast_reward'); } catch (e) { /* sound is cosmetic */ }
        if (maze || reached >= CIRCLE_GOAL) { end(true); return; }
        timeLeft = Math.min(TIME_CAP_S, timeLeft + TIME_GAIN_S);
        timeMax = Math.max(timeMax, timeLeft);
        showGoal(_pickCircleSpot(rows, pos));
    };

    const tick = (ts) => {
        const dtS = Math.min(0.05, (ts - last) / 1000);
        last = ts;
        if (phase === 'play') {
            const dir = _readDirection(held);
            _step(rows, pos, dir, dtS);
            _animateWalk(avatar, dir);
            _place(avatar, pos.x, pos.y, AVATAR_SIZE);
            timeLeft -= dtS;
            updateHud();
            const reach = maze ? CHEST_REACH_PX : CIRCLE_R;
            if (goal && Math.hypot(pos.x - goal.x, pos.y - goal.y) <= reach) onGoalReached();
            else if (timeLeft <= 0) end(false);
        }
        if (!finished) raf = requestAnimationFrame(tick);
    };

    const beginPlay = () => {
        _banner(modal.arena, _tr('GO!', 'LOS!'), 'mt-go');
        timers.push(setTimeout(() => _banner(modal.arena, ''), 700));
        timeLeft = timeMax = maze ? _mazeTimeS(rows) : START_TIME_S;
        showGoal(maze ? _cellCentre(_findCell(rows, 'E')) : _pickCircleSpot(rows, pos));
        phase = 'play';
    };

    const runCountdown = (n) => {
        if (n === 0) { beginPlay(); return; }
        _banner(modal.arena, String(n), 'mt-count');
        try { Audio_Manager.playSFX('toast_info'); } catch (e) { /* sound is cosmetic */ }
        timers.push(setTimeout(() => runCountdown(n - 1), 1000));
    };

    // Movement keys are swallowed so the page behind the modal never sees them.
    function onKeyDown(e) {
        const key = String(e.key).toLowerCase();
        if (key === 'escape') { e.preventDefault(); finish(false); return; }
        held.add(key);
        e.preventDefault();
        e.stopPropagation();
    }
    function onKeyUp(e) {
        held.delete(String(e.key).toLowerCase());
        e.stopPropagation();
    }

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    modal.skipBtn.addEventListener('click', () => finish(false));
    updateHud();
    last = performance.now();
    raf = requestAnimationFrame(tick);
    runCountdown(COUNTDOWN_FROM);
}
