import { Audio_Manager } from '../../audio/audio.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFlingAvatar, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRectsOverlap } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE TACTICIAN (boss_tactician)------------------
//------------------------------------------------------------------------
// A chess siege. For the whole fight the queen glides across the board
// (touching her flings you) and pawn ranks march up from the bottom with
// one green gap. The attacks are chess moves:
//  - ROOK LANES (all fight): rows and columns through you fill red, then a
//    rook slides through.
//  - KNIGHT FORK (all fight): a knight jumps in L-shapes; every landing
//    spot fills red first.
//  - BISHOP CROSS (60%+) and the CHECKMATE finale (10%):
//    boss-tactician-board.js.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_tactician: {
        id: 'boss_tactician', name: 'The Tactician', emoji: '♟️',
        baseHP: 980, baseDamage: 22, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_tactician: {
        phases: [
            // Basic attacks are steady pressure; the chess moves are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'rook_lanes', intervalBase: 14000, intervalVariance: 3500, handler: '_mechTctRook' },
            { name: 'knight_fork', intervalBase: 16000, intervalVariance: 4000, handler: '_mechTctKnight' },
            { name: 'bishop_cross', intervalBase: 17000, intervalVariance: 4000, handler: '_mechTctBishop', phase2Only: true },
            { name: 'fog_bank', intervalBase: 24000, intervalVariance: 5000, handler: '_mechFogBank' },
        ],
    },
});


//------------------------------------------------------------------------
//-------------------CONSTANTS AND SHARED HELPERS---------------------------------
//------------------------------------------------------------------------
const QUEEN_R = 38;
const QUEEN_SPEED = [0, 42, 58, 76];               // glide (px/s)
const QUEEN_REPICK_MS = 4200;
const QUEEN_DMG = [0, 0.10, 0.12, 0.14];
const QUEEN_FLING = [0, 140, 165, 190];
const QUEEN_CD_MS = 1000;
const PAWN_EVERY_MS = [0, 9000, 7500, 6000];
const PAWN_WARN_MS = 900;
const PAWN_SPEED = 130;                            // march speed (px/s)
const PAWN_ROW_H = 54;
const PAWN_GAP_W = 140;                            // the green gap column
const PAWN_DMG = 0.12;
const HIT_CD_MS = 650;                             // shared hit cooldown

export let _tacticianWatcher = null;               // the running board (one at a time)
let _tctHitUntil = 0;

// The phase number clamped to 1-3.
export function _tctPhase(phase) {
    return Math.max(1, Math.min(3, Number(phase) || 1));
}

// One physical hit with the boss-ability flash and number, behind a short
// shared cooldown so two pieces landing together never stack.
export function _tctStrike(pct, level, label) {
    const now = performance.now();
    if (now < _tctHitUntil) return false;
    _tctHitUntil = now + HIT_CD_MS;
    _nkAbilityHitToast(_nkHit(pct, null, level), 'The Tactician', label, true);
    return true;
}

// Player centre, or the screen centre when there is no avatar.
export function _tctPC() {
    return _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

// Half the player's body width (for line hit tests that use the centre).
export function _tctBody() {
    const pr = _nkPlayerRect();
    return pr ? Math.min(pr.right - pr.left, pr.bottom - pr.top) / 2 - 4 : 0;
}

// A clock that follows real time (clamped to 0.1 s per frame), so the CSS
// fills and the strikes in code never drift apart.
export function _tctClock() {
    let last = performance.now();
    return (now) => { const dt = Math.min(100, Math.max(0, now - last)); last = now; return dt; };
}

// Plays the board's move sound (quietly ignored when audio is off).
export function _tctSfx() {
    try { Audio_Manager.playSFX('tct_move'); } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------THE BOARD (queen + pawn ranks, whole fight)----------------------
//------------------------------------------------------------------------

// Glides the queen along straight and diagonal lines; touching her hits and
// flings you. She stays put (and harmless) while the finale holds the board.
function _stepQueen(st, dtS, now, p) {
    const q = st.queen, W = window.innerWidth, H = window.innerHeight;
    q.el.style.display = st.hold ? 'none' : '';
    if (st.hold) return;
    q.repick -= dtS * 1000;
    const dx = q.tx - q.x, dy = q.ty - q.y, d = Math.hypot(dx, dy) || 1, step = QUEEN_SPEED[p] * dtS;
    if (d <= step || q.repick <= 0) {
        if (Math.random() < 0.5) { q.tx = 80 + Math.random() * Math.max(60, W - 160); q.ty = q.y; }
        else {
            const dd = (Math.random() < 0.5 ? 1 : -1) * (200 + Math.random() * 300);
            q.tx = Math.max(80, Math.min(W - 80, q.x + dd));
            q.ty = Math.max(110, Math.min(H - 160, q.y + (Math.random() < 0.5 ? 1 : -1) * Math.abs(dd)));
        }
        q.repick = QUEEN_REPICK_MS;
    } else { q.x += dx / d * step; q.y += dy / d * step; }
    q.el.style.transform = 'translate(' + Math.round(q.x - QUEEN_R) + 'px,' + Math.round(q.y - QUEEN_R) + 'px)';
    if (now < q.cd || !_nkCircleHit(q.x, q.y, QUEEN_R * 0.9, _nkPlayerRect(), 0)) return;
    if (!_tctStrike(QUEEN_DMG[p], st.level, 'Queen')) return;
    q.cd = now + QUEEN_CD_MS;
    const c = _tctPC(), fx = c.x - q.x, fy = c.y - q.y, fd = Math.hypot(fx, fy) || 1;
    _nkFlingAvatar(fx / fd * QUEEN_FLING[p], fy / fd * QUEEN_FLING[p], q.x, q.y);
    _tctSfx();
}

// Starts a pawn rank at the bottom: the whole row shows red, its gap column
// green; after the warning it marches up.
function _queuePawns(st) {
    const W = window.innerWidth, H = window.innerHeight;
    const n = Math.max(3, Math.floor(W / 90)), cw = W / n;
    const gap = Math.floor(Math.random() * n);
    const row = _nkEl(st.run, 'div', 'sx-tct-rank warn');
    row.style.top = Math.round(H - 70) + 'px';
    row.style.height = PAWN_ROW_H + 'px';
    for (let k = 0; k < n; k++) {
        const cell = document.createElement('div');
        cell.className = k === gap ? 'sx-tct-rank-gap' : 'sx-tct-pawn';
        row.appendChild(cell);
    }
    const lane = _nkEl(st.run, 'div', 'sx-tct-gaplane');
    lane.style.left = Math.round(gap * cw + cw / 2 - PAWN_GAP_W / 2) + 'px';
    lane.style.width = PAWN_GAP_W + 'px';
    st.pawns.push({ y: H - 70, row, lane, gapL: gap * cw + cw / 2 - PAWN_GAP_W / 2, wait: PAWN_WARN_MS, cd: 0 });
}

// Marches the pawn ranks up; touching a rank outside its gap hits you.
// While the finale holds the board, every rank is cleared away.
function _stepPawns(st, dtMs, now, p) {
    if (st.hold) {
        st.pawns.forEach(pw => { try { pw.row.remove(); pw.lane.remove(); } catch (e) {} });
        st.pawns = [];
        st.pawnAcc = 0;
        return;
    }
    st.pawnAcc += dtMs;
    if (st.pawnAcc >= PAWN_EVERY_MS[p]) { st.pawnAcc = 0; _queuePawns(st); }
    const W = window.innerWidth, pr = _nkPlayerRect(), pc = _nkPlayerCenter();
    st.pawns = st.pawns.filter(pw => {
        if (pw.wait > 0) {
            pw.wait -= dtMs;
            if (pw.wait <= 0) pw.row.classList.remove('warn');
            return true;
        }
        pw.y -= PAWN_SPEED * dtMs / 1000;
        pw.row.style.top = Math.round(pw.y) + 'px';
        const inGap = pc && pc.x >= pw.gapL && pc.x <= pw.gapL + PAWN_GAP_W;
        if (now >= pw.cd && !inGap && _nkRectsOverlap(pr, { left: 0, right: W, top: pw.y + 6, bottom: pw.y + PAWN_ROW_H - 6 })) {
            if (_tctStrike(PAWN_DMG, st.level, 'Pawn March')) pw.cd = now + 900;
        }
        if (pw.y > -PAWN_ROW_H) return true;
        try { pw.row.remove(); pw.lane.remove(); } catch (e) {}
        return false;
    });
}

// Sets up the board when the fight begins: the queen and the pawn ranks
// run in one passive loop until the boss is gone.
export function _tacticianArenaInit(monster) {
    if (_tacticianWatcher || !monster) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;                            // must not block the boss's other attacks
    const W = window.innerWidth, H = window.innerHeight;
    const el = _nkEl(run, 'div', 'sx-tct-queen');
    el.style.width = el.style.height = (QUEEN_R * 2) + 'px';
    const st = {
        monsterId: monster.id, level: monster.level || 1, run, hold: false, pawns: [], pawnAcc: 0,
        queen: { x: W / 2, y: H * 0.3, tx: W / 2, ty: H * 0.3, repick: QUEEN_REPICK_MS, cd: 0, el },
    };
    _tacticianWatcher = st;
    run.onKill = () => { if (_tacticianWatcher === st) _tacticianWatcher = null; };
    const clock = _tctClock();
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        const live = (globalThis._monsters || []).find(m => m && m.id === st.monsterId);
        if (!live) return false;
        const p = _tctPhase(live.bossPhase);
        _stepQueen(st, dt / 1000, now, p);
        _stepPawns(st, dt, now, p);
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------ROOK LANES (rows and columns through you)--------------------------
//------------------------------------------------------------------------
const ROOK_LANE = 92;
const ROOK_EVERY_MS = 750;
const ROOK_BY_PHASE = [null, { n: 2, warnMs: 1250, dmg: 0.18 }, { n: 3, warnMs: 1150, dmg: 0.21 }, { n: 3, warnMs: 1050, dmg: 0.24 }];

// Paints one rook lane (a row or a column through the player) whose red
// fill wipes in from the rook's side.
function _rookLane(run, horiz, warnMs) {
    const W = window.innerWidth, H = window.innerHeight, pc = _tctPC();
    const fromStart = Math.random() < 0.5;
    const c = horiz ? Math.max(ROOK_LANE / 2, Math.min(H - ROOK_LANE / 2, pc.y)) : Math.max(ROOK_LANE / 2, Math.min(W - ROOK_LANE / 2, pc.x));
    const box = horiz ? { left: 0, right: W, top: c - ROOK_LANE / 2, bottom: c + ROOK_LANE / 2 }
        : { left: c - ROOK_LANE / 2, right: c + ROOK_LANE / 2, top: 0, bottom: H };
    const el = _nkEl(run, 'div', 'sx-tct-lane sx-tct-lane-' + (horiz ? (fromStart ? 'left' : 'right') : (fromStart ? 'top' : 'bottom')));
    el.style.left = Math.round(box.left) + 'px';
    el.style.top = Math.round(box.top) + 'px';
    el.style.width = Math.round(box.right - box.left) + 'px';
    el.style.height = Math.round(box.bottom - box.top) + 'px';
    el.style.setProperty('--tct-warn', warnMs + 'ms');
    return { el, box, horiz, fromStart };
}

// Rook Lanes: rows and columns through where you stand fill red one after
// another (alternating); when one is full a rook slides through it.
export function _mechTctRook(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = ROOK_BY_PHASE[_tctPhase(phase)];
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const lanes = [];
    const clock = _tctClock();
    const firstHoriz = Math.random() < 0.5;
    let t = 0;
    _nkLoop(run, (dtS, now) => {
        t += clock(now);
        while (lanes.length < cfg.n && t >= lanes.length * ROOK_EVERY_MS) {
            const l = _rookLane(run, (lanes.length % 2 === 0) === firstHoriz, cfg.warnMs);
            l.at = lanes.length * ROOK_EVERY_MS + cfg.warnMs;
            lanes.push(l);
        }
        lanes.forEach(l => {
            if (l.done || t < l.at) return;
            l.done = true;
            l.el.classList.add('hot');
            _tctSfx();
            if (_nkRectsOverlap(_nkPlayerRect(), l.box)) _tctStrike(cfg.dmg, level, 'Rook');
            const el = l.el;
            run.timers.push(setTimeout(() => { try { el.remove(); } catch (e) {} }, 450));
        });
        return !(lanes.length >= cfg.n && lanes.every(l => l.done) && t > lanes[lanes.length - 1].at + 500);
    });
}


//------------------------------------------------------------------------
//-------------------KNIGHT FORK (L-jumps, landings fill red)----------------------------
//------------------------------------------------------------------------
const KNIGHT_R = 100;
const KNIGHT_STEP = 115;                           // one "square" of an L-jump (px)
const KNIGHT_EVERY_MS = 500;
const KNIGHT_BY_PHASE = [null, { n: 3, warnMs: 1250, dmg: 0.15 }, { n: 3, warnMs: 1150, dmg: 0.18 }, { n: 4, warnMs: 1050, dmg: 0.21 }];
const L_MOVES = [[2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]];

// The next landing spot of a fork: the first on you, then an L-jump away
// from the last landing (kept on screen).
function _knightSpot(prev) {
    const W = window.innerWidth, H = window.innerHeight;
    if (!prev) return _tctPC();
    const [a, b] = L_MOVES[Math.floor(Math.random() * L_MOVES.length)];
    return {
        x: Math.max(60, Math.min(W - 60, prev.x + a * KNIGHT_STEP)),
        y: Math.max(110, Math.min(H - 90, prev.y + b * KNIGHT_STEP)),
    };
}

// Knight Fork: a knight jumps in L-shapes - first onto you, then away from
// its last landing. Every landing circle fills red before the knight lands.
export function _mechTctKnight(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = KNIGHT_BY_PHASE[_tctPhase(phase)];
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const marks = [];
    const knight = _nkEl(run, 'div', 'sx-tct-knight');
    knight.style.display = 'none';
    const clock = _tctClock();
    let t = 0, prev = null;
    _nkLoop(run, (dtS, now) => {
        t += clock(now);
        while (marks.length < cfg.n && t >= marks.length * KNIGHT_EVERY_MS) {
            const s = _knightSpot(prev);
            prev = s;
            const el = _nkEl(run, 'div', 'sx-tct-landing');
            el.style.left = Math.round(s.x - KNIGHT_R) + 'px';
            el.style.top = Math.round(s.y - KNIGHT_R) + 'px';
            el.style.width = el.style.height = (KNIGHT_R * 2) + 'px';
            el.style.setProperty('--tct-warn', cfg.warnMs + 'ms');
            marks.push({ x: s.x, y: s.y, el, at: marks.length * KNIGHT_EVERY_MS + cfg.warnMs, done: false });
        }
        marks.forEach(mk => {
            if (mk.done || t < mk.at) return;
            mk.done = true;
            mk.el.classList.add('hot');
            knight.style.display = '';
            knight.style.transform = 'translate(' + Math.round(mk.x - 28) + 'px,' + Math.round(mk.y - 36) + 'px)';
            _tctSfx();
            if (_nkCircleHit(mk.x, mk.y, KNIGHT_R, _nkPlayerRect(), 0)) _tctStrike(cfg.dmg, level, 'Knight Fork');
            const el = mk.el;
            run.timers.push(setTimeout(() => { try { el.remove(); } catch (e) {} }, 420));
        });
        return !(marks.length >= cfg.n && marks.every(mk => mk.done) && t > marks[marks.length - 1].at + 500);
    });
}


//------------------------------------------------------------------------
//-------------------TEARDOWN----------------------------------------------------------
//------------------------------------------------------------------------

// Called from the boss cleanup on boss death AND on encounter stop: ends the
// board and removes every element the Tactician created.
export function _tacticianTeardown() {
    const st = _tacticianWatcher;
    _tacticianWatcher = null;
    if (st && st.run) { try { _nkKillRun(st.run); } catch (e) {} }
    document.querySelectorAll('.sx-tct-queen, .sx-tct-rank, .sx-tct-gaplane, .sx-tct-lane, .sx-tct-landing, .sx-tct-knight, ' +
        '.sx-tct-diag, .sx-tct-cell, .sx-tct-piece, .sx-nk-fin-tct').forEach(el => { try { el.remove(); } catch (e) {} });
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
}
