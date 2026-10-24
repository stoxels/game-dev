import { Audio_Manager } from '../../audio/audio.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFlingAvatar, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkToast, _nkWatchFinale } from './shared-boss-abilities.js';
import { _damageTargetById } from '../encounter-monster-damage.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE STACK (boss_stack)--------------------------
//------------------------------------------------------------------------
// The Tetris boss. A 12-wide well stands at the bottom of the arena. The
// Stack builds its walls with a gap cut for the NEXT piece and drops that
// piece from the sky. The falling piece FOLLOWS YOU sideways: walk to line
// it up with the glowing gap. A perfect fit clears the rows (damage to the
// boss, bigger for taller pieces and for back-to-back fits); a miss seals
// the gap into garbage and the stack grows - top out and the garbage floods
// the arena. Around that the Stack keeps you moving: the drifting core,
// HOLD (a giant piece tracks your column), HARD DROP at 60%, LINE CLEAR rows
// at 30%, the GARBAGE RISE charge attack and the TOP OUT finale at 10%.
// One _nkLoop drives every state machine.
//
// probability_shift lives in shared-boss-abilities.js and is referenced by
// handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_stack: {
        id: 'boss_stack', name: 'The Stack', emoji: '🧩',
        baseHP: 1080, baseDamage: 22, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_stack: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            // Kept for schedule compatibility (the boss rig plays its drop
            // pose off this name) - the persistent watcher owns the pieces.
            { name: 'block_fall', intervalBase: 21000, intervalVariance: 5000, handler: '_mechBlockFall' },
            { name: 'hold_slam', intervalBase: 22000, intervalVariance: 5000, handler: '_mechHoldSlam' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_mechProbabilityShift' },
        ],
        onInit: (m) => { _stackArenaInit(m); _nkWatchFinale(m, STK_FINALE); },
    },
});

// TOP OUT finale (shared waves): the board fills to the top.
const STK_FINALE = {
    name: 'The Stack', title: '🧩 TOP OUT', element: null, cls: 'sx-nk-fin-stack', color: '#a5b4fc',
    quiet: true, // no shield-absorbed toasts on finale hits (fight-wide rule)
    toastKey: 'eg_stk_final',
    hint: 'The board is full - read each circle!',
    waves: [
        { kind: 'avoid', ms: 2200, dmg: 0.16, extra: 2, label: 'Top Out' },
        { kind: 'shelter', ms: 2800, dmg: 0.22, label: 'Top Out' },
        { kind: 'avoid', ms: 2000, dmg: 0.16, extra: 4, label: 'Top Out' },
        { kind: 'shelter', ms: 2600, dmg: 0.28, label: 'GAME OVER' },
    ],
};


//------------------------------------------------------------------------
//-------------------TUNING------------------------------------------------
//------------------------------------------------------------------------
const STK_CELL = 46;                                // block size in px
const STK_COLS = 12;                                // well width in blocks
const STK_BASE_PAD = 70;                            // gap under the well (keeps it above the bottom HUD)

// The playable well (index 0 is unused: phases are 1-3)
const STK_FOUND_START = 2;                          // solid garbage rows at the start
const STK_FOUND_MIN = 1;                            // a fit never digs below this
const STK_FOUND_MAX = 5;                            // more than this = TOP OUT
const STK_FIRST_PIECE_MS = 2600;                    // calm before the first piece
const STK_WAIT_MS = [0, 1200, 950, 750];            // pause between pieces
const STK_FALL_MS = [0, 4300, 3700, 3100];          // sky to lock line
const STK_DROP_PX_S = 1100;                         // a fitted piece snaps into the gap this fast
const STK_SLIDE_RATE = 16;                          // how snappily the piece glides sideways (visual only)
const STK_LINE_DMG = [0, 0.02, 0.04, 0.065, 0.10];  // boss maxHP by rows cleared (1-4)
const STK_COMBO_STEP = 0.25;                        // +25% per fit in a row ...
const STK_COMBO_MAX = 3;                            // ... up to +75%
const STK_MISS_R = 95;                              // crash radius when a piece misses
const STK_MISS_DMG = 0.05;                          // %maxHP if you stand in it

// The Core Stack (boss body)
const STK_DRIFT_SPEED = [0, 22, 32, 44];            // px/s per phase
const STK_DRIFT_REPICK_MS = 5400;
const STK_SLAM_DMG = [0, 0.06, 0.07, 0.09];         // %maxHP touching the core
const STK_SLAM_CD_MS = 1000;
const STK_SLAM_FLING = [0, 135, 160, 185];

// Giant pieces (Hold Slam + Hard Drop share them)
const STK_GIANT_TOUCH = 0.09;                       // %maxHP for touching a falling giant
const STK_GIANT_TOUCH_CD_MS = 800;
const STK_FLOOR_DMG = 0.045;                        // %maxHP touching the rubble a giant leaves
// Hold Slam (a giant piece tracks YOUR column)
const STK_HOLD_WARN_MS = 1100;
const STK_HOLD_FALL = 560;                          // px/s
const STK_HOLD_SHOCK_R = 150;
const STK_HOLD_DMG = [0, 0.12, 0.14, 0.16];
const STK_HOLD_FLING = [0, 170, 195, 220];
const STK_HOLD_FLOOR_TTL = 2200;
// Hard Drop (60% gate)
const STK_HD_N = 3;                                 // sequential giant pieces
const STK_HD_WARN_MS = 900;
const STK_HD_FALL = 520;
const STK_HD_SHOCK_R = 175;
const STK_HD_DMG = [0, 0.13, 0.15, 0.18];
const STK_HD_FLING = [0, 160, 185, 210];
const STK_HD_GAP_MS = 1500;
const STK_HD_FLOOR_TTL = 2400;
// Line Clear (30% gate)
const STK_LC_ROWS = 4;
const STK_LC_ROW_H = 66;
const STK_LC_WARN_MS = 1000;
const STK_LC_DET_MS = 260;                          // detonation flash window
const STK_LC_DMG = [0, 0.14, 0.16, 0.19];
const STK_LC_GAP_MS = 1350;
// Garbage Rise (charge attack, also the TOP OUT punishment)
const STK_GR_RISE_MS = 2800;                        // bottom -> flood height
const STK_GR_HOLD_MS = 1700;
const STK_GR_SINK_MS = 1100;
const STK_GR_FLOOD = 0.55;                          // fraction of screen height
const STK_GR_TOP_CAP = 0.16;                        // never rise above this fraction
const STK_GR_DMG = [0, 0.08, 0.10, 0.12];           // per grind tick
const STK_GR_TICK_MS = 700;
const STK_GR_FLING_UP = [0, 210, 235, 260];

// The classic 7 tetrominoes (cell offsets + palette index into STK_COLORS).
const STK_SHAPES = [
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], color: 0 }, // I
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: 3 }, // O
    { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], color: 5 }, // T
    { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], color: 4 }, // S
    { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], color: 6 }, // Z
    { cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: 1 }, // J
    { cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: 2 }, // L
];
const STK_COLORS = ['#22d3ee', '#3b82f6', '#f97316', '#facc15', '#22c55e', '#a855f7', '#ef4444'];

let _stackWatcher = null; // per-fight state (null when the boss is not alive)


//------------------------------------------------------------------------
//-------------------SMALL HELPERS-----------------------------------------
//------------------------------------------------------------------------

// The boss's current phase (1-3).
function _stkPhase(st) {
    const m = globalThis._monsters ? globalThis._monsters.find(x => x && x.id === st.monsterId) : null;
    return m ? Math.max(1, Math.min(3, Number(m.bossPhase) || 1)) : 1;
}

function _stkSfx(name) {
    try { if (Audio_Manager && Audio_Manager.playSFX) Audio_Manager.playSFX('boss_slam_impact', name); } catch (e) {}
}

// Where the well stands: centred, resting just above the bottom HUD.
function _stkWell() {
    const W = window.innerWidth, H = window.innerHeight;
    return { left: Math.round((W - STK_COLS * STK_CELL) / 2), bottom: H - STK_BASE_PAD, W, H };
}

// Top edge of a giant piece that has landed (the well's bottom row).
function _stkFloorY() {
    return _stkWell().bottom - STK_CELL;
}

// A plain block element on the page (tracked by the class sweep at teardown).
function _stkMakeBlock(cls, color) {
    const el = document.createElement('div');
    el.className = cls;
    el.style.width = el.style.height = (STK_CELL - 3) + 'px';
    if (color) el.style.background = color;
    document.body.appendChild(el);
    return el;
}

function _stkMove(el, x, y) {
    el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
}

function _stkRemoveEls(list) {
    (list || []).forEach(el => { try { el.remove(); } catch (e) {} });
}

function _stkRemoveCells(piece) {
    (piece.cells || []).forEach(cl => { try { if (cl.el) cl.el.remove(); } catch (e) {} });
}

// Turns a cell list 90 degrees and slides it back to the top-left corner.
function _stkRotateCells(cells) {
    const turned = cells.map(([x, y]) => [-y, x]);
    const minX = Math.min(...turned.map(c => c[0])), minY = Math.min(...turned.map(c => c[1]));
    return turned.map(([x, y]) => [x - minX, y - minY]);
}

// The cells of one shape, turned `turns` times, plus its width and height.
function _stkOrient(shapeIdx, turns) {
    let cells = STK_SHAPES[shapeIdx % STK_SHAPES.length].cells;
    for (let i = 0; i < turns; i++) cells = _stkRotateCells(cells);
    let w = 0, h = 0;
    cells.forEach(([cx, cy]) => { w = Math.max(w, cx + 1); h = Math.max(h, cy + 1); });
    return { cells, w, h };
}

// Next piece from a shuffled bag of all seven (so a tall I always comes round).
function _stkDrawPiece(st) {
    if (!st.bag.length) {
        st.bag = [0, 1, 2, 3, 4, 5, 6];
        for (let i = st.bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [st.bag[i], st.bag[j]] = [st.bag[j], st.bag[i]];
        }
    }
    return { shapeIdx: st.bag.pop(), turns: Math.floor(Math.random() * 4) };
}

// Removes everything the Stack has put on screen (registered in boss-teardown-hooks).
export function _stackTeardown() {
    if (_stackWatcher) {
        const st = _stackWatcher;
        _stackWatcher = null;
        _stkWipeWell(st);
        (st.pieces || []).forEach(pc => _stkRemoveGiant(pc));
        (st.floors || []).forEach(f => _stkRemoveCells(f));
        _stkRemoveEls((st.rows || []).map(r => r.el));
        _stkRemoveEls((st.shocks || []).map(s => s.el));
        if (st.hold) _stkClearHold(st);
        if (st.hard && st.hard.tele) _stkRemoveTele(st.hard.tele);
        if (st.nextEl) { try { st.nextEl.remove(); } catch (e) {} }
        if (st.garbage) _stkRemoveEls(st.garbage.els);
        try { if (st.run) _nkKillRun(st.run); } catch (e) {} // removes the core
    }
    document.querySelectorAll('[class^="sx-stk-"], [class*=" sx-stk-"]').forEach(el => el.remove());
}


//------------------------------------------------------------------------
//-------------------THE WELL (board + falling piece)-----------------------
//------------------------------------------------------------------------

// Draws the well's back panel once (faint columns and side rails).
function _stkBuildWellPanel(st) {
    const wl = _stkWell();
    st.wellEl = _nkEl(st.run, 'div', 'sx-stk-well');
    st.wellEl.style.left = wl.left + 'px';
    st.wellEl.style.width = (STK_COLS * STK_CELL) + 'px';
    st.wellEl.style.top = Math.max(60, wl.bottom - (STK_FOUND_MAX + 4) * STK_CELL) + 'px';
    st.wellEl.style.height = (wl.bottom - Math.max(60, wl.bottom - (STK_FOUND_MAX + 4) * STK_CELL)) + 'px';
}

// Redraws the stacked garbage rows and the glowing gap cut for the current piece.
function _stkRenderBoard(st) {
    _stkRemoveEls(st.boardEls);
    st.boardEls = [];
    st.gapEls = [];
    const wl = _stkWell();
    const put = (col, row, cls, color) => {
        const el = _stkMakeBlock(cls, color);
        _stkMove(el, wl.left + col * STK_CELL, wl.bottom - (row + 1) * STK_CELL);
        st.boardEls.push(el);
        return el;
    };
    for (let row = 0; row < st.found; row++) {
        for (let col = 0; col < STK_COLS; col++) put(col, row, 'sx-stk-cell sx-stk-brick');
    }
    if (!st.carve) return;
    const cv = st.carve;
    for (let r = 0; r < cv.h; r++) {
        for (let col = 0; col < STK_COLS; col++) {
            const isGap = cv.cells.some(([cx, cy]) => cx + cv.x0 === col && cy === cv.h - 1 - r);
            if (isGap) st.gapEls.push(put(col, st.found + r, 'sx-stk-gapcell', cv.color));
            else put(col, st.found + r, 'sx-stk-cell sx-stk-brick');
        }
    }
}

// Removes the well's rows, the piece in the air and its guide strip.
function _stkWipeWell(st) {
    _stkRemoveEls(st.boardEls);
    _stkRemoveEls(st.gapEls);
    st.boardEls = [];
    st.gapEls = [];
    if (st.cur) {
        _stkRemoveEls(st.cur.els);
        if (st.cur.guide) { try { st.cur.guide.remove(); } catch (e) {} }
    }
    st.cur = null;
    st.carve = null;
    if (st.wellEl) { try { st.wellEl.remove(); } catch (e) {} st.wellEl = null; }
}

// The little NEXT chip in the corner: shows the piece that follows the current one.
function _stkRenderNext(st) {
    if (!st.nextEl) {
        st.nextEl = _nkEl(st.run, 'div', 'sx-stk-next');
        st.nextEl.innerHTML = '<div class="sx-stk-next-label">NEXT</div><div class="sx-stk-next-grid"></div><div class="sx-stk-next-combo"></div>';
    }
    const grid = st.nextEl.querySelector('.sx-stk-next-grid');
    const combo = st.nextEl.querySelector('.sx-stk-next-combo');
    if (combo) combo.textContent = st.streak >= 2 ? 'COMBO x' + st.streak : '';
    if (!grid || !st.queue) return;
    const { cells, w, h } = _stkOrient(st.queue.shapeIdx, st.queue.turns);
    const color = STK_COLORS[STK_SHAPES[st.queue.shapeIdx].color % STK_COLORS.length];
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = 'repeat(' + w + ', 14px)';
    grid.style.gridTemplateRows = 'repeat(' + h + ', 14px)';
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const on = cells.some(([cx, cy]) => cx === x && cy === y);
            const d = document.createElement('div');
            d.className = 'sx-stk-next-cell' + (on ? ' on' : '');
            if (on) d.style.background = color;
            grid.appendChild(d);
        }
    }
}

// Cuts a gap for the next piece into the top of the stack and sends the
// piece down from the sky. It starts above wherever you stand.
function _stkBeginPiece(st, p) {
    const pick = st.queue || _stkDrawPiece(st);
    st.queue = _stkDrawPiece(st);
    const { cells, w, h } = _stkOrient(pick.shapeIdx, pick.turns);
    const color = STK_COLORS[STK_SHAPES[pick.shapeIdx].color % STK_COLORS.length];
    let x0 = Math.floor(Math.random() * (STK_COLS - w + 1));
    if (x0 === st.lastX0 && STK_COLS - w > 0) x0 = (x0 + 1 + Math.floor(Math.random() * (STK_COLS - w))) % (STK_COLS - w + 1);
    st.lastX0 = x0;
    st.carve = { x0, w, h, cells, color };
    _stkRenderBoard(st);
    _stkRenderNext(st);

    const wl = _stkWell();
    const boardTop = wl.bottom - (st.found + h) * STK_CELL;
    const lockY = boardTop - h * STK_CELL;
    const startY = -h * STK_CELL - 10;
    const c = _nkPlayerCenter();
    const col = c ? Math.max(0, Math.min(STK_COLS - w, Math.round((c.x - wl.left) / STK_CELL - w / 2))) : Math.floor((STK_COLS - w) / 2);
    const els = cells.map(() => _stkMakeBlock('sx-stk-cell sx-stk-piece', color));
    const guide = _stkMakeBlock('sx-stk-guide');
    guide.style.width = (w * STK_CELL) + 'px';
    guide.style.height = '0px';
    guide.style.background = '';
    st.cur = { cells, w, h, color, els, guide, col, visCol: col, y: startY, lockY, restY: boardTop,
        vy: (lockY - startY) / (STK_FALL_MS[p] / 1000), phase: 'fall', aligned: false };
    if (!st.announced) {
        st.announced = true;
        _nkToast('eg_stk_place', '🧱 THE STACK DROPS PIECES! They follow YOU sideways - line one up with the glowing gap!', '#4ade80');
    }
}

// Moves the falling piece: it follows your column until it reaches the stack,
// then it either snaps into the gap (a fit) or crashes (a miss).
function _stkStepPiece(st, live, dtS, p) {
    const cur = st.cur;
    const wl = _stkWell();
    if (cur.phase === 'fall') {
        const c = _nkPlayerCenter();
        if (c) cur.col = Math.max(0, Math.min(STK_COLS - cur.w, Math.round((c.x - wl.left) / STK_CELL - cur.w / 2)));
        cur.visCol += (cur.col - cur.visCol) * Math.min(1, dtS * STK_SLIDE_RATE);
        cur.y += cur.vy * dtS;
        const aligned = cur.col === st.carve.x0;
        if (aligned !== cur.aligned) {
            cur.aligned = aligned;
            cur.els.forEach(el => el.classList.toggle('aligned', aligned));
            cur.guide.classList.toggle('on', aligned);
            st.gapEls.forEach(el => el.classList.toggle('on', aligned));
        }
        if (cur.y >= cur.lockY) {
            cur.y = cur.lockY;
            cur.visCol = cur.col;
            cur.phase = cur.aligned ? 'drop' : 'miss';
            cur.els.forEach(el => el.classList.add('locked'));
        }
    } else if (cur.phase === 'drop') {
        cur.y += STK_DROP_PX_S * dtS;
        if (cur.y >= cur.restY) { cur.y = cur.restY; _stkPlacePiece(cur, wl); _stkResolveFit(st, live); return; }
    } else {
        _stkPlacePiece(cur, wl);
        _stkResolveMiss(st, live);
        return;
    }
    _stkPlacePiece(cur, wl);
}

// Puts the piece's blocks and its guide strip where the piece currently is.
function _stkPlacePiece(cur, wl) {
    const px = wl.left + cur.visCol * STK_CELL;
    cur.cells.forEach(([cx, cy], i) => _stkMove(cur.els[i], px + cx * STK_CELL, cur.y + cy * STK_CELL));
    const top = cur.y + cur.h * STK_CELL;
    _stkMove(cur.guide, px, top);
    cur.guide.style.height = Math.max(0, cur.restY - top) + 'px';
}

// Pops a bright band over a row of the well (rows cleared by a fit).
function _stkFlashRow(st, row) {
    const wl = _stkWell();
    const el = document.createElement('div');
    el.className = 'sx-stk-lineflash';
    el.style.left = wl.left + 'px';
    el.style.width = (STK_COLS * STK_CELL) + 'px';
    el.style.top = (wl.bottom - (row + 1) * STK_CELL) + 'px';
    el.style.height = STK_CELL + 'px';
    document.body.appendChild(el);
    st.run.timers.push(setTimeout(() => { try { el.remove(); } catch (e) {} }, 600));
}

// The piece fits: the rows vanish, the boss is hurt (more for tall pieces and
// back-to-back fits) and the stack shrinks a little.
function _stkResolveFit(st, live) {
    const cur = st.cur;
    const rows = cur.h;
    for (let r = 0; r < rows; r++) _stkFlashRow(st, st.found + r);
    _stkRemoveEls(cur.els);
    try { cur.guide.remove(); } catch (e) {}
    st.cur = null;
    st.carve = null;
    st.streak++;
    st.found = Math.max(STK_FOUND_MIN, st.found - 1);
    const mult = 1 + STK_COMBO_STEP * Math.min(st.streak - 1, STK_COMBO_MAX);
    const bossMax = (live && live.maxHP > 0) ? live.maxHP : 100;
    const frac = STK_LINE_DMG[Math.min(4, rows)] * mult;
    try { _damageTargetById(st.monsterId, Math.max(1, Math.round(bossMax * frac)), null, {}); } catch (e) {}
    if (rows >= 4) _nkToast('eg_stk_tetris', '🟨 TETRIS! A perfect well slams the Stack!', '#facc15');
    else if (rows === 3) _nkToast('eg_stk_triple', '🤟 TRIPLE! The Stack buckles!', '#facc15');
    else if (rows === 2) _nkToast('eg_stk_double', '✌️ DOUBLE! The Stack cracks!', '#facc15');
    else if (st.streak >= 3) _nkToast('eg_stk_combo', '🔥 Back-to-back fits! The damage keeps growing!', '#facc15');
    _stkSfx(rows >= 4 ? 'stk_tetris' : 'stk_lock');
    st.waitMs = STK_WAIT_MS[_stkPhase(st)];
    _stkRenderBoard(st);
    _stkRenderNext(st);
}

// The piece misses: it crashes on the stack, the gap seals into garbage and the
// stack grows. A crash hurts anyone standing under it. Too tall = TOP OUT.
function _stkResolveMiss(st, live) {
    const cur = st.cur;
    const wl = _stkWell();
    const cx = wl.left + (cur.col + cur.w / 2) * STK_CELL;
    const cy = cur.y + cur.h * STK_CELL;
    _stkRemoveEls(cur.els);
    try { cur.guide.remove(); } catch (e) {}
    st.cur = null;
    st.streak = 0;
    const shockEl = _nkEl(st.run, 'div', 'sx-stk-shock soft');
    shockEl.style.left = Math.round(cx) + 'px';
    shockEl.style.top = Math.round(cy) + 'px';
    st.shocks.push({ x: cx, y: cy, t: 0, dur: 380, r: STK_MISS_R, dmg: 0, fling: 0, hit: true, el: shockEl, label: '' });
    const pc = _nkPlayerCenter();
    if (pc && Math.hypot(pc.x - cx, pc.y - cy) <= STK_MISS_R) {
        _nkAbilityHitToast(_nkHit(STK_MISS_DMG, null, st.level), 'The Stack', 'Crash', true);
    }
    st.found += st.carve.h;
    st.carve = null;
    _stkSfx('stk_thud');
    if (st.found > STK_FOUND_MAX) {
        st.found = STK_FOUND_START;
        st.floodPending = true;
        _nkToast('eg_stk_topout', '🧱 TOP OUT! The stack overflows - the garbage floods the arena!', '#f87171');
    } else if (!st.missToast) {
        st.missToast = true;
        _nkToast('eg_stk_miss', '🧱 Missed! The gap sealed itself and the stack grew. Too tall and it floods!', '#f87171');
    }
    st.waitMs = STK_WAIT_MS[_stkPhase(st)];
    _stkRenderBoard(st);
    _stkRenderNext(st);
}

// Starts the pending TOP OUT flood as soon as nothing else blocks it.
function _stkTryFlood(st, live) {
    if (!st.floodPending || st.garbage || live.bossImmune) return;
    _stackGarbage(live);
    if (st.garbage) st.floodPending = false;
}

// Decides every tick whether the next piece may begin.
function _stkPieceCadence(st, live, dtS, p) {
    if (st.cur) { _stkStepPiece(st, live, dtS, p); return; }
    st.waitMs -= dtS * 1000;
    const blocked = st.hard || st.hold || st.garbage || live.bossImmune || st.floodPending;
    if (!blocked && st.waitMs <= 0) _stkBeginPiece(st, p);
}


//------------------------------------------------------------------------
//-------------------THE ARENA LOOP-----------------------------------------
//------------------------------------------------------------------------

// Builds the T-shaped Core Stack (the boss body) and the persistent state.
function _stkBuildCore(st, run, monster) {
    const coreEl = _nkEl(run, 'div', 'sx-stk-core');
    st.core = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.3,
        tx: window.innerWidth * 0.5, ty: window.innerHeight * 0.3,
        repickAt: STK_DRIFT_REPICK_MS, cdUntil: 0, cells: [], el: coreEl };
    const color = STK_COLORS[Math.floor(Math.random() * STK_COLORS.length)];
    [[0, 0], [1, 0], [2, 0], [1, 1]].forEach(([cx, cy]) => {
        const cell = document.createElement('div');
        cell.className = 'sx-stk-cell core';
        cell.style.background = color;
        cell.style.width = cell.style.height = (STK_CELL - 3) + 'px';
        coreEl.appendChild(cell);
        st.core.cells.push({ dx: cx * STK_CELL, dy: cy * STK_CELL, el: cell });
    });
    _stkPlaceCore(st);
    void monster;
}

function _stackArenaInit(monster) {
    if (_stackWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        run: null, core: null,
        bag: [], queue: null, cur: null, carve: null, found: STK_FOUND_START,
        boardEls: [], gapEls: [], wellEl: null, nextEl: null,
        waitMs: STK_FIRST_PIECE_MS, streak: 0, lastX0: -1,
        announced: false, missToast: false, floodPending: false,
        pieces: [], floors: [], shocks: [],
        hard: null, hold: null,
        rows: [], lineClear: null, lcTimer: 0, lcSpawned: 0,
        garbage: null,
        gate60Done: false, gate30Done: false,
    };
    _stackWatcher = st;

    // Persistent watcher FIRST (elements must hang off a run).
    const run = _nkNewRun(monsterId, true);
    run.passive = true;
    run.onKill = () => { if (_stackWatcher === st) _stackWatcher = null; };
    st.run = run;
    _stkBuildCore(st, run, monster);
    _stkBuildWellPanel(st);
    st.queue = _stkDrawPiece(st);
    _stkRenderBoard(st);
    _stkRenderNext(st);

    _nkLoop(run, (dtS, now) => {
        if (_stackWatcher !== st) return false;
        const live = globalThis._monsters ? globalThis._monsters.find(m => m.id === st.monsterId) : null;
        if (!live) return false;
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));
        const pr = _nkPlayerRect();

        _stkFinaleCheck(st, live);
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _stkHardDrop(st); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _stkLineClear(st); }

        _stkStepCore(st, dtS, p, now, pr);
        _stkTryFlood(st, live);
        if (!(live._nkFinaleDone && live.bossImmune)) _stkPieceCadence(st, live, dtS, p);
        _stkStepGiants(st, dtS, now, pr, p);
        _stkStepShocks(st, dtS);
        _stkStepHold(st, dtS);
        _stkStepHardDrop(st, dtS);
        _stkStepLineClear(st, dtS);
        _stkStepGarbage(st, dtS, now, pr, p);
        return true;
    });
}

// TOP OUT finale: the shared waves own the arena - sink the garbage, drop the
// gate set-pieces and clear the well.
function _stkFinaleCheck(st, live) {
    if (!(live._nkFinaleDone && live.bossImmune)) return;
    if (st.garbage && st.garbage.phase !== 'sink') { st.garbage.phase = 'sink'; st.garbage.t = 0; }
    if (st.hard && st.hard.tele) _stkRemoveTele(st.hard.tele);
    st.hard = null;
    if (st.hold) _stkClearHold(st);
    st.lineClear = null;
    st.floodPending = false;
    if (st.cur || st.carve || st.boardEls.length) {
        _stkWipeWell(st);
        st.found = STK_FOUND_START;
        st.waitMs = STK_FIRST_PIECE_MS;
        _stkBuildWellPanel(st);
    }
}


// ── Core Stack: drift + STACK SLAM on touch ──────────────────────────────
function _stkStepCore(st, dtS, p, now, pr) {
    const co = st.core;
    const W = window.innerWidth, H = window.innerHeight;
    const c = _nkPlayerCenter();
    const garbageUp = st.garbage && st.garbage.phase !== 'sink';
    if (!garbageUp) { // the core rides the garbage while it floods
        co.repickAt -= dtS * 1000;
        const cdx = co.tx - co.x, cdy = co.ty - co.y;
        const cd = Math.hypot(cdx, cdy) || 1;
        const cstep = STK_DRIFT_SPEED[p] * dtS;
        if (cd <= cstep || co.repickAt <= 0) {
            co.tx = 80 + Math.random() * Math.max(60, W - 160);
            co.ty = 80 + Math.random() * Math.max(60, H - 240);
            co.repickAt = STK_DRIFT_REPICK_MS;
        } else {
            co.x += (cdx / cd) * cstep;
            co.y += (cdy / cd) * cstep;
        }
    }
    _stkPlaceCore(st);
    if (c && pr && now >= co.cdUntil && _stkCellsHit(co.cells, co.x, co.y, pr)) {
        co.cdUntil = now + STK_SLAM_CD_MS;
        const dx = c.x - co.x - STK_CELL, dy = c.y - co.y - STK_CELL;
        const d = Math.hypot(dx, dy) || 1;
        _nkFlingAvatar((dx / d) * STK_SLAM_FLING[p], (dy / d) * STK_SLAM_FLING[p], co.x + STK_CELL, co.y + STK_CELL);
        _nkAbilityHitToast(_nkHit(STK_SLAM_DMG[p], null, st.level), 'The Stack', 'Stack Slam', true);
        _stkSfx('stk_thud');
    }
}

function _stkPlaceCore(st) {
    st.core.cells.forEach(cl => _stkMove(cl.el, st.core.x + cl.dx, st.core.y + cl.dy));
}

// Cell grid vs player rectangle.
function _stkCellsHit(cells, ox, oy, pr) {
    if (!pr) return false;
    return cells.some(cl => {
        const x = ox + cl.dx, y = oy + cl.dy;
        return pr.right > x && pr.left < x + STK_CELL - 3 && pr.bottom > y && pr.top < y + STK_CELL - 3;
    });
}


// ── Landing shockwaves: expanding rings that damage once ─────────────────
function _stkStepShocks(st, dtS) {
    for (let i = st.shocks.length - 1; i >= 0; i--) {
        const s = st.shocks[i];
        s.t += dtS * 1000;
        const k = s.t / s.dur;
        if (k >= 1) { try { s.el.remove(); } catch (e) {} st.shocks.splice(i, 1); continue; }
        const r = 30 + (s.r - 30) * k;
        s.el.style.width = s.el.style.height = Math.round(r * 2) + 'px';
        s.el.style.marginLeft = s.el.style.marginTop = (-r) + 'px';
        if (s.hit) continue;
        const c2 = _nkPlayerCenter();
        if (c2 && Math.hypot(c2.x - s.x, c2.y - s.y) <= r) {
            s.hit = true;
            const dx = c2.x - s.x, dy = c2.y - s.y;
            const d = Math.hypot(dx, dy) || 1;
            _nkFlingAvatar((dx / d) * s.fling, (dy / d) * s.fling, s.x, s.y);
            _nkAbilityHitToast(_nkHit(s.dmg, null, st.level), 'The Stack', s.label, true);
        }
    }
}


//------------------------------------------------------------------------
//-------------------GIANT PIECES (Hold Slam + Hard Drop)-------------------
//------------------------------------------------------------------------

// The warning column and the dashed ring that shows how far the landing
// shockwave will reach. Both stay until the giant has landed.
function _stkMakeTele(st, x, shockR) {
    const ghost = _nkEl(st.run, 'div', 'sx-stk-warn giant ghost');
    ghost.style.left = Math.round(x) + 'px';
    ghost.style.width = Math.round(STK_CELL * 4) + 'px';
    const ring = _nkEl(st.run, 'div', 'sx-stk-shock-zone');
    const lx = x + STK_CELL * 2, ly = _stkFloorY() + STK_CELL / 2;
    ring.style.left = Math.round(lx - shockR) + 'px';
    ring.style.top = Math.round(ly - shockR) + 'px';
    ring.style.width = ring.style.height = (shockR * 2) + 'px';
    return { ghost, ring };
}

function _stkRemoveTele(tele) {
    if (!tele) return;
    [tele.ghost, tele.ring].forEach(el => { try { if (el) el.remove(); } catch (e) {} });
}

// Builds one falling giant (a four-wide I piece).
function _stkMakeGiant(st, x, kind, tele) {
    const color = STK_COLORS[0];
    const pc = { x, y: -STK_CELL - 10, kind, tele, hitCd: 0, cells: [], floorY: _stkFloorY() };
    pc.speed = kind === 'hold' ? STK_HOLD_FALL : STK_HD_FALL;
    for (let i = 0; i < 4; i++) {
        const el = _stkMakeBlock('sx-stk-cell sx-stk-giant', color);
        pc.cells.push({ dx: i * STK_CELL, dy: 0, el });
    }
    return pc;
}

function _stkRemoveGiant(pc) {
    _stkRemoveCells(pc);
    _stkRemoveTele(pc.tele);
}

// Falling giants: gravity, touch damage, landing; then the rubble they leave.
function _stkStepGiants(st, dtS, now, pr, p) {
    for (let i = st.pieces.length - 1; i >= 0; i--) {
        const pc = st.pieces[i];
        pc.y += pc.speed * dtS;
        if (pc.y >= pc.floorY) {
            pc.y = pc.floorY;
            st.pieces.splice(i, 1);
            _stkLandGiant(st, pc, p);
            continue;
        }
        pc.cells.forEach(cl => _stkMove(cl.el, pc.x + cl.dx, pc.y + cl.dy));
        if (pr && now >= pc.hitCd && _stkCellsHit(pc.cells, pc.x, pc.y, pr)) {
            pc.hitCd = now + STK_GIANT_TOUCH_CD_MS;
            _nkAbilityHitToast(_nkHit(STK_GIANT_TOUCH, null, st.level), 'The Stack', pc.kind === 'hold' ? 'Hold Slam' : 'Hard Drop', true);
        }
    }
    for (let i = st.floors.length - 1; i >= 0; i--) {
        const f = st.floors[i];
        f.t += dtS * 1000;
        f.cells.forEach(cl => { cl.el.style.opacity = String(Math.max(0.25, 1 - f.t / f.ttl)); });
        if (f.t >= f.ttl) { _stkRemoveCells(f); st.floors.splice(i, 1); continue; }
        if (pr && now >= f.hitCd && _stkCellsHit(f.cells, f.x, f.y, pr)) {
            f.hitCd = now + 900;
            _nkAbilityHitToast(_nkHit(STK_FLOOR_DMG, null, st.level), 'The Stack', 'Rubble', true);
        }
    }
}

// A giant lands: shockwave plus rubble that lingers for a moment.
function _stkLandGiant(st, pc, p) {
    _stkRemoveTele(pc.tele);
    const hold = pc.kind === 'hold';
    const x = pc.x + STK_CELL * 2;
    const y = pc.floorY + STK_CELL / 2;
    const el = _nkEl(st.run, 'div', 'sx-stk-shock');
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    st.shocks.push({ x, y, t: 0, dur: 520, r: hold ? STK_HOLD_SHOCK_R : STK_HD_SHOCK_R,
        dmg: hold ? STK_HOLD_DMG[p] : STK_HD_DMG[p], fling: hold ? STK_HOLD_FLING[p] : STK_HD_FLING[p],
        hit: false, el, label: hold ? 'Hold Slam' : 'Hard Drop' });
    const floor = { x: pc.x, y: pc.floorY, t: 0, ttl: hold ? STK_HOLD_FLOOR_TTL : STK_HD_FLOOR_TTL, hitCd: 0, cells: [] };
    pc.cells.forEach(cl => {
        cl.el.style.opacity = '1';
        cl.el.classList.add('floor');
        _stkMove(cl.el, pc.x + cl.dx, pc.floorY + cl.dy);
        floor.cells.push({ dx: cl.dx, dy: cl.dy, el: cl.el });
    });
    st.floors.push(floor);
    _stkSfx('stk_thud');
}

// Column x for a giant that will land where the player stands.
function _stkGiantColumn(W) {
    const c = _nkPlayerCenter();
    return c ? Math.max(20, Math.min(W - STK_CELL * 4 - 20, c.x - STK_CELL * 2)) : W / 2 - STK_CELL * 2;
}


// ── Hold Slam: a giant piece tracks YOUR column ──────────────────────────
// Scheduled every ~22 s. The warning column and landing ring are fixed where
// you stand when it starts - be somewhere else when the piece slams down.
export function _mechHoldSlam(monster, phase) {
    void phase;
    const st = _stackWatcher;
    if (!st || st.hold || st.hard) return;
    if (!monster || monster.bossImmune) return;
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const x = _stkGiantColumn(window.innerWidth);
    st.hold = { phase: 'warn', t: 0, x, tele: _stkMakeTele(st, x, STK_HOLD_SHOCK_R) };
    _nkToast('eg_stk_hold', '🧱 HOLD! A giant piece tracks YOUR column - move out of the circle!');
    _stkSfx('stk_thud');
}

function _stkClearHold(st) {
    if (!st.hold) return;
    _stkRemoveTele(st.hold.tele);
    st.hold = null;
}

function _stkStepHold(st, dtS) {
    const hd = st.hold;
    if (!hd) return;
    hd.t += dtS * 1000;
    if (hd.phase === 'warn' && hd.t >= STK_HOLD_WARN_MS) {
        hd.phase = 'fall';
        if (hd.tele.ghost) { hd.tele.ghost.remove(); hd.tele.ghost = null; }
        st.pieces.push(_stkMakeGiant(st, hd.x, 'hold', hd.tele));
    } else if (hd.phase === 'fall' && !st.pieces.some(pc => pc.kind === 'hold')) {
        st.hold = null; // landed
    }
}


// ── 60% gate: Hard Drop ──────────────────────────────────────────────────
function _stkHardDrop(st) {
    if (st.hard) return;
    const x = _stkGiantColumn(window.innerWidth);
    st.hard = { idx: 0, x, phase: 'warn', t: 0, tele: _stkMakeTele(st, x, STK_HD_SHOCK_R) };
    _nkToast('eg_stk_harddrop', '🧱 HARD DROP! Giant pieces slamming your column - get out of the dashed landing circle!');
    _stkSfx('stk_thud');
}

function _stkStepHardDrop(st, dtS) {
    const hd = st.hard;
    if (!hd) return;
    hd.t += dtS * 1000;
    if (hd.phase === 'warn' && hd.t >= STK_HD_WARN_MS) {
        hd.phase = 'fall';
        if (hd.tele.ghost) { hd.tele.ghost.remove(); hd.tele.ghost = null; }
        st.pieces.push(_stkMakeGiant(st, hd.x, 'hard', hd.tele));
    }
    if (hd.phase === 'fall' && !st.pieces.some(pc => pc.kind === 'hard')) {
        hd.phase = 'gap';
        hd.t = 0;
    }
    if (hd.phase === 'gap' && hd.t >= STK_HD_GAP_MS) {
        hd.idx++;
        if (hd.idx >= STK_HD_N) {
            st.hard = null;
            _nkToast('eg_stk_hd_end', '🧱 The Stack sets its foundation.', '#93c5fd');
        } else {
            hd.x = _stkGiantColumn(window.innerWidth);
            hd.phase = 'warn';
            hd.t = 0;
            hd.tele = _stkMakeTele(st, hd.x, STK_HD_SHOCK_R);
        }
    }
}


// ── 30% gate: Line Clear (full-width rows warn, then detonate) ───────────
function _stkLineClear(st) {
    if (st.lineClear) return;
    st.lineClear = { t: 0 };
    st.lcTimer = 0;
    st.lcSpawned = 0;
    _nkToast('eg_stk_lineclear', '✨ LINE CLEAR! Flashing rows are about to detonate!');
    _stkSfx('stk_thud');
}

function _stkQueueRow(st, W, H) {
    const y = 90 + Math.random() * Math.max(80, H - 260);
    const el = _nkEl(st.run, 'div', 'sx-stk-row');
    el.style.left = '0px';
    el.style.top = Math.round(y) + 'px';
    el.style.width = W + 'px';
    el.style.height = STK_LC_ROW_H + 'px';
    st.rows.push({ y, t: 0, warnMs: STK_LC_WARN_MS, detonated: false, dmg: STK_LC_DMG[_stkPhase(st)], el });
}

function _stkStepLineClear(st, dtS) {
    const W = window.innerWidth, H = window.innerHeight;
    if (st.lineClear) {
        st.lcTimer += dtS * 1000;
        if (st.lcSpawned < STK_LC_ROWS && st.lcTimer >= st.lcSpawned * STK_LC_GAP_MS) {
            _stkQueueRow(st, W, H);
            st.lcSpawned++;
        }
        if (st.lcSpawned >= STK_LC_ROWS && st.rows.length === 0) {
            st.lineClear = null;
            _nkToast('eg_stk_lc_end', '✨ Lines cleared. You were not one of them.', '#4ade80');
        }
    }
    for (let i = st.rows.length - 1; i >= 0; i--) {
        const r = st.rows[i];
        r.t += dtS * 1000;
        if (r.t < r.warnMs) {
            r.el.style.opacity = String(0.45 + 0.4 * Math.abs(Math.sin(r.t / 110)));
            continue;
        }
        if (!r.detonated) {
            r.detonated = true;
            r.el.classList.add('boom');
            const pr = _nkPlayerRect();
            if (pr && pr.bottom > r.y && pr.top < r.y + STK_LC_ROW_H) {
                _nkAbilityHitToast(_nkHit(r.dmg, null, st.level), 'The Stack', 'Line Clear', true);
            }
            _stkSfx('stk_thud');
        }
        if (r.t >= r.warnMs + STK_LC_DET_MS) {
            try { r.el.remove(); } catch (e) {}
            st.rows.splice(i, 1);
        }
    }
}


// ── Garbage Rise: charge attack and TOP OUT punishment ───────────────────
export function _stackGarbage(monster) {
    const st = _stackWatcher;
    if (!st || st.garbage || _nkDodgeBusy() || _nkFrozen()) return;
    if (monster && monster.bossImmune) return;   // not during the finale / phase shifts
    const H = window.innerHeight;
    const rows = 3;
    const els = [];
    for (let i = 0; i < rows; i++) {
        const gel = _nkEl(st.run, 'div', 'sx-stk-garbage');
        gel.style.left = '0px';
        gel.style.width = window.innerWidth + 'px';
        // The last row fills down to the floor: everything below the crest
        // hurts, so everything below the crest is painted.
        gel.style.height = (i === rows - 1 ? H : (STK_CELL - 2)) + 'px';
        if (i === rows - 1) gel.classList.add('fill');
        gel.style.top = '0px';
        gel.style.transform = 'translateY(' + H + 'px)';
        els.push(gel);
    }
    st.garbage = { phase: 'rise', t: 0, topY: H, els, hitCd: 0 };
    _nkToast('eg_stk_garbage', '🧱 GARBAGE RISE! Stay high - the floor is rising!');
    _stkSfx('stk_thud');
}

function _stkStepGarbage(st, dtS, now, pr, p) {
    const g = st.garbage;
    if (!g) return;
    const H = window.innerHeight;
    g.t += dtS * 1000;
    const floodPx = STK_GR_FLOOD * H;
    if (g.phase === 'rise') {
        g.topY = H - floodPx * Math.min(1, g.t / STK_GR_RISE_MS);
        if (g.t >= STK_GR_RISE_MS) { g.phase = 'hold'; g.t = 0; }
    } else if (g.phase === 'hold') {
        g.topY = H - floodPx + Math.sin(g.t / 220) * 6; // the crest wobbles
        if (g.t >= STK_GR_HOLD_MS) { g.phase = 'sink'; g.t = 0; }
    } else {
        g.topY = (H - floodPx) + floodPx * Math.min(1, g.t / STK_GR_SINK_MS);
        if (g.t >= STK_GR_SINK_MS) {
            _stkRemoveEls(g.els);
            st.garbage = null;
            _nkToast('eg_stk_gr_end', '🧱 The garbage sinks back down.', '#93c5fd');
            return;
        }
    }
    // At least TOP_CAP of the screen stays clear even at full flood.
    const drawY = Math.max(g.topY, H * STK_GR_TOP_CAP);
    g.els.forEach((gel, idx) => {
        gel.style.transform = 'translateY(' + Math.round(drawY + idx * (STK_CELL - 2)) + 'px)';
    });
    if (pr && pr.bottom > drawY && now >= g.hitCd) {
        g.hitCd = now + STK_GR_TICK_MS;
        const c = _nkPlayerCenter();
        _nkFlingAvatar(0, -STK_GR_FLING_UP[p], c ? c.x : window.innerWidth / 2, drawY);
        _nkAbilityHitToast(_nkHit(STK_GR_DMG[p], null, st.level), 'The Stack', 'Garbage Rise', true);
    }
}


//------------------------------------------------------------------------
//-------------------LEGACY COMPAT SHIM------------------------------------
//------------------------------------------------------------------------
// The old scheduled mechanic is now the persistent piece cycle - keep the
// handler name alive so the schedule (and the boss rig's drop pose) still works.
export function _mechBlockFall(monster, phase) { void monster; void phase; }
