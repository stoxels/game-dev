import { _renderPanel } from '../encounter.js';
import { BOSS_MECHANICS } from './boss-framework.js';
import { _mechTctKnight, _mechTctRook, _tacticianArenaInit, _tacticianWatcher, _tctBody, _tctClock, _tctPC, _tctPhase, _tctSfx, _tctStrike } from './boss-tactician.js';
import { _nkBossAlive, _nkDodgeBusy, _nkEl, _nkFrozen, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkRuns, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------TACTICIAN: BISHOP CROSS AND CHECKMATE-----------------------
//------------------------------------------------------------------------
// BISHOP CROSS (60%+): two diagonal bands cross on your spot and fill red.
// CHECKMATE (10%): the Tactician is immune and the arena becomes a chess
// board. Each round rooks and bishops are placed; every square they attack
// (their rows, columns or diagonals) turns red, the free squares green.
// Be on a green square when the red is full. Ten rounds, faster each time.
//------------------------------------------------------------------------

const DIAG_W = 84;                                 // width of a bishop band (px)
const BISHOP_EVERY_MS = 900;
const BISHOP_BY_PHASE = [null, null, { n: 2, warnMs: 1250, dmg: 0.17 }, { n: 3, warnMs: 1150, dmg: 0.20 }];
const FIN_TOP = 96, FIN_BOTTOM = 80;               // keep the board clear of the HUD and toolbar
const FIN_INTRO_MS = 1800;
const FIN_GAP_MS = 550;
const FIN_FAILSAFE_MS = 120000;
const FIN_ROUNDS = [                               // pieces placed, time until the strike, hit
    { k: 2, ms: 2700, dmg: 0.28 }, { k: 2, ms: 2500, dmg: 0.29 }, { k: 3, ms: 2500, dmg: 0.30 },
    { k: 3, ms: 2300, dmg: 0.32 }, { k: 3, ms: 2200, dmg: 0.33 }, { k: 4, ms: 2300, dmg: 0.34 },
    { k: 4, ms: 2100, dmg: 0.36 }, { k: 4, ms: 2000, dmg: 0.37 }, { k: 4, ms: 1900, dmg: 0.39 },
    { k: 4, ms: 1800, dmg: 0.40 },
];

let _finale = null;                                // the running finale (one at a time)


//------------------------------------------------------------------------
//-------------------BISHOP CROSS (diagonals through you)--------------------------------
//------------------------------------------------------------------------

// Paints one diagonal cross (two bands at +-45 degrees) centred on the
// player; returns the two band segments for the hit test.
function _crossPaint(run, warnMs) {
    const c = _tctPC(), len = Math.hypot(window.innerWidth, window.innerHeight) * 2;
    return [45, -45].map(deg => {
        const el = _nkEl(run, 'div', 'sx-tct-diag');
        el.style.left = Math.round(c.x - len / 2) + 'px';
        el.style.top = Math.round(c.y - DIAG_W / 2) + 'px';
        el.style.width = Math.round(len) + 'px';
        el.style.height = DIAG_W + 'px';
        el.style.transform = 'rotate(' + deg + 'deg)';
        el.style.setProperty('--tct-warn', warnMs + 'ms');
        const a = deg * Math.PI / 180, h = len / 2;
        return { el, ax: c.x - Math.cos(a) * h, ay: c.y - Math.sin(a) * h, bx: c.x + Math.cos(a) * h, by: c.y + Math.sin(a) * h };
    });
}

// Bishop Cross (phase 2+): two diagonal bands cross on your spot and fill
// red, then strike; the next cross starts on your new spot.
export function _mechTctBishop(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = BISHOP_BY_PHASE[Math.max(2, _tctPhase(phase))];
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const crosses = [];
    const clock = _tctClock();
    let t = 0;
    _nkLoop(run, (dtS, now) => {
        t += clock(now);
        while (crosses.length < cfg.n && t >= crosses.length * BISHOP_EVERY_MS) {
            crosses.push({ bands: _crossPaint(run, cfg.warnMs), at: crosses.length * BISHOP_EVERY_MS + cfg.warnMs, done: false });
        }
        crosses.forEach(cr => {
            if (cr.done || t < cr.at) return;
            cr.done = true;
            _tctSfx();
            const pc = _nkPlayerCenter(), reach = DIAG_W / 2 + _tctBody();
            if (pc && cr.bands.some(b => _ptSegDist(pc.x, pc.y, b.ax, b.ay, b.bx, b.by) <= reach)) _tctStrike(cfg.dmg, level, 'Bishop');
            cr.bands.forEach(b => b.el.classList.add('hot'));
            run.timers.push(setTimeout(() => cr.bands.forEach(b => { try { b.el.remove(); } catch (e) {} }), 420));
        });
        return !(crosses.length >= cfg.n && crosses.every(cr => cr.done) && t > crosses[crosses.length - 1].at + 500);
    });
}


//------------------------------------------------------------------------
//-------------------CHECKMATE: THE BOARD---------------------------------------------
//------------------------------------------------------------------------

// Size of the finale board: 6 x 4 squares (4 x 4 on narrow screens).
function _boardSize() {
    const cols = window.innerWidth < 900 ? 4 : 6, rows = 4;
    const cw = window.innerWidth / cols, ch = (window.innerHeight - FIN_TOP - FIN_BOTTOM) / rows;
    return { cols, rows, cw, ch };
}

// The board square under a screen point (clamped to the board).
function _squareAt(b, x, y) {
    return {
        c: Math.max(0, Math.min(b.cols - 1, Math.floor(x / b.cw))),
        r: Math.max(0, Math.min(b.rows - 1, Math.floor((y - FIN_TOP) / b.ch))),
    };
}

// Which squares a set of pieces attacks: a rook its row and column, a
// bishop its diagonals; a piece's own square counts as attacked.
function _attacked(b, pieces) {
    const hot = new Set();
    for (let r = 0; r < b.rows; r++) {
        for (let c = 0; c < b.cols; c++) {
            if (pieces.some(p => (p.rook ? (p.r === r || p.c === c) : Math.abs(p.r - r) === Math.abs(p.c - c)))) hot.add(r * b.cols + c);
        }
    }
    return hot;
}

// Places k pieces so that your square is attacked and a free square is at
// most one step away (tries random layouts until one fits).
function _placePieces(b, k) {
    const pc = _tctPC(), me = _squareAt(b, pc.x, pc.y);
    let best = null;
    for (let tries = 0; tries < 200; tries++) {
        const pieces = [];
        while (pieces.length < k) {
            const p = { r: Math.floor(Math.random() * b.rows), c: Math.floor(Math.random() * b.cols), rook: Math.random() < 0.5 };
            if ((p.r === me.r && p.c === me.c) || pieces.some(q => q.r === p.r && q.c === p.c)) continue;
            pieces.push(p);
        }
        const hot = _attacked(b, pieces);
        const free = b.rows * b.cols - hot.size;
        const near = [...Array(b.rows * b.cols).keys()].some(i => !hot.has(i) && Math.abs(Math.floor(i / b.cols) - me.r) <= 1 && Math.abs(i % b.cols - me.c) <= 1);
        if (!near || free < 2) continue;
        best = { pieces, hot };
        if (hot.has(me.r * b.cols + me.c)) return best;
    }
    return best || { pieces: [], hot: new Set() };
}

// Draws one round: red squares (fill until the strike), green free squares
// and the pieces themselves.
function _dealRound(run, b, k, ms) {
    const { pieces, hot } = _placePieces(b, k);
    const cells = [];
    for (let i = 0; i < b.rows * b.cols; i++) {
        const el = _nkEl(run, 'div', 'sx-tct-cell ' + (hot.has(i) ? 'bad' : 'safe') + ((Math.floor(i / b.cols) + i % b.cols) % 2 ? ' dark' : ''));
        el.style.left = Math.round((i % b.cols) * b.cw + 4) + 'px';
        el.style.top = Math.round(FIN_TOP + Math.floor(i / b.cols) * b.ch + 4) + 'px';
        el.style.width = Math.round(b.cw - 8) + 'px';
        el.style.height = Math.round(b.ch - 8) + 'px';
        el.style.setProperty('--tct-warn', ms + 'ms');
        cells.push(el);
    }
    pieces.forEach(p => {
        const el = _nkEl(run, 'div', 'sx-tct-piece ' + (p.rook ? 'rook' : 'bishop'));
        el.style.left = Math.round(p.c * b.cw + b.cw / 2 - 28) + 'px';
        el.style.top = Math.round(FIN_TOP + p.r * b.ch + b.ch / 2 - 34) + 'px';
        cells.push(el);
    });
    return { cells, hot };
}

// Pauses or resumes the player's auto-attack charge bar.
function _pauseCharge(paused) {
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('sx-charge-paused', paused);
    });
}

// Ends the finale (once): releases the Tactician and hands the board back.
function _finEnd(g) {
    if (g.finished) return;
    g.finished = true;
    _pauseCharge(false);
    if (_tacticianWatcher) _tacticianWatcher.hold = false;
    if (g.wrap) g.wrap.classList.remove('sx-nk-shielded');
    const m = (globalThis._monsters || []).find(x => x && x.id === g.monsterId);
    if (m) { m.bossImmune = false; try { _renderPanel(); } catch (e) {} }
    if (_finale === g) _finale = null;
}

// Starts the finale: silences every other attack (the queen steps aside),
// turns the Tactician immune and plays the rounds in one loop.
function _finStart(monster) {
    if (_finale || monster._tctFinaleDone) return;
    monster._tctFinaleDone = true;
    const board = _tacticianWatcher;
    Array.from(_nkRuns.values()).forEach(r => { if (r.bossId === monster.id && (!board || r !== board.run)) { try { _nkKillRun(r); } catch (e) {} } });
    if (board) board.hold = true;
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    const g = { monsterId: monster.id, finished: false, wrap };
    _finale = g;
    monster.bossImmune = true;
    _pauseCharge(true);
    if (wrap) wrap.classList.add('sx-nk-shielded');
    const run = _nkNewRun(monster.id, true);
    run.onKill = () => _finEnd(g);
    _nkEl(run, 'div', 'sx-nk-fin-banner sx-nk-fin-tct').innerHTML = '<div class="sx-nk-fin-title">CHECKMATE</div>';
    const level = monster.level || 1;
    const clock = _tctClock();
    let stage = 'intro', t = 0, total = 0, round = 0, deal = null, b = null;
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        t += dt; total += dt;
        if (total > FIN_FAILSAFE_MS || !_nkBossAlive(monster.id)) return false;
        if (stage === 'intro' || stage === 'gap') {
            if (t < (stage === 'intro' ? FIN_INTRO_MS : FIN_GAP_MS)) return true;
            if (round >= FIN_ROUNDS.length) return false;
            b = _boardSize();
            deal = _dealRound(run, b, FIN_ROUNDS[round].k, FIN_ROUNDS[round].ms);
            stage = 'round'; t = 0;
            return true;
        }
        if (t < FIN_ROUNDS[round].ms) return true;
        const pc = _tctPC(), sq = _squareAt(b, pc.x, pc.y);
        if (deal.hot.has(sq.r * b.cols + sq.c)) _tctStrike(FIN_ROUNDS[round].dmg, level, 'Checkmate');
        _tctSfx();
        deal.cells.forEach(el => el.classList.add('hot'));
        const old = deal.cells;
        run.timers.push(setTimeout(() => old.forEach(el => { try { el.remove(); } catch (e) {} }), 450));
        round++; stage = 'gap'; t = 0;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------HP WATCHER, DEBUG HOOK-------------------------------------------
//------------------------------------------------------------------------

// Starts the board and a passive HP watcher: at 10% the finale begins, once.
function _tctOnInit(monster) {
    _tacticianArenaInit(monster);
    if (!monster || monster._tctWatch) return;
    monster._tctWatch = true;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (monster._tctFinaleDone || !_nkBossAlive(monster.id)) return false;
        if (monster.currentHP > 0 && monster.currentHP <= monster.maxHP * 0.10 && !monster.bossImmune && !_nkFrozen()) {
            _finStart(monster);
            return false;
        }
        return true;
    });
}

BOSS_MECHANICS.boss_tactician.onInit = _tctOnInit;

// Console hook for playtests: _TCT_DEBUG.fire('rook'|'knight'|'bishop', phase), _TCT_DEBUG.final().
if (typeof window !== 'undefined') {
    const find = () => (globalThis._monsters || []).find(m => m && m.baseId === 'boss_tactician');
    window._TCT_DEBUG = {
        fire: (name, phase) => {
            const m = find();
            const fn = { rook: _mechTctRook, knight: _mechTctKnight, bishop: _mechTctBishop }[name];
            if (!m) return 'no tactician alive';
            if (!fn) return 'unknown: ' + name;
            fn(m, phase || m.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => { const m = find(); if (!m) return 'no tactician alive'; _finStart(m); return 'finale started'; },
    };
}
