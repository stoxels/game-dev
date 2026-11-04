import { BOSS_MECHANICS } from './boss-framework.js';
import { _mntClock, _mntCrumble, _mntPC, _mntPillarSpots, _mntRaisePillar, _mntStrike, _mechMntCharge, _mechMntStomp } from './boss-minotaur.js';
import { _nkBossAlive, _nkDodgeBusy, _nkEl, _nkFrozen, _nkKillRun, _nkLoop, _nkNewRun, _nkRuns } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------MINOTAUR: STAMPEDE AND THE LABYRINTH-----------------------
//------------------------------------------------------------------------
// STAMPEDE (at 70 / 45 / 25% HP): pillars rise, the herd thunders in from
// one side and the whole arena fills red - except the green shadows behind
// the pillars. Crossfire waves come from two sides: only the pillars' shared
// shadow is safe. THE LABYRINTH (10%): the Minotaur is immune and runs a
// long stampede that keeps moving its pillars.
//------------------------------------------------------------------------

const ST_GAP_MS = 650;                             // pause between two waves
const ST_RISE_MS = 900;                            // pillars rise before the first wave
const ST_REACT_MS = 700;                           // reaction time left out of the walk budget
const ST_WALK_PX_S = 300;                          // a little under the avatar's 320 px/s
const ST_HP_MARKS = [
    { at: 0.70, waves: [{ ms: 1800, dmg: 0.26 }, { ms: 1650, dmg: 0.26 }] },
    { at: 0.45, waves: [{ ms: 1700, dmg: 0.30 }, { ms: 1550, dmg: 0.30 }, { ms: 1650, dmg: 0.30, cross: true }] },
    { at: 0.25, waves: [{ ms: 1600, dmg: 0.34 }, { ms: 1650, dmg: 0.34, cross: true }, { ms: 1450, dmg: 0.34 }] },
];
const ST_PILLARS = 5;
const FIN_INTRO_MS = 1800;
const FIN_FAILSAFE_MS = 120000;
const FIN_WAVES = [
    { ms: 1700, dmg: 0.30 }, { ms: 1600, dmg: 0.31 }, { ms: 1700, dmg: 0.32, cross: true },
    { ms: 1500, dmg: 0.33 }, { ms: 1450, dmg: 0.34 }, { ms: 1600, dmg: 0.35, cross: true },
    { ms: 1350, dmg: 0.36 }, { ms: 1300, dmg: 0.38 }, { ms: 1500, dmg: 0.39, cross: true },
    { ms: 1250, dmg: 0.40 }, { ms: 1200, dmg: 0.41 }, { ms: 1400, dmg: 0.42, cross: true },
];
const SIDES = ['left', 'right', 'top', 'bottom'];
const SIDE_PAIRS = [['left', 'top'], ['left', 'bottom'], ['right', 'top'], ['right', 'bottom']];


//------------------------------------------------------------------------
//-------------------SHADOW GEOMETRY----------------------------------------------
//------------------------------------------------------------------------

// The shadow a pillar casts against a herd coming from `side`: the pillar
// itself plus the strip behind it, out to the far edge of the arena.
function _shadow(p, side) {
    const W = window.innerWidth, H = window.innerHeight;
    if (side === 'left') return { left: p.left, right: W, top: p.top, bottom: p.bottom };
    if (side === 'right') return { left: 0, right: p.right, top: p.top, bottom: p.bottom };
    if (side === 'top') return { left: p.left, right: p.right, top: p.top, bottom: H };
    return { left: p.left, right: p.right, top: 0, bottom: p.bottom };
}

// Overlap of two boxes, or null when they do not touch.
function _intersect(a, b) {
    const r = { left: Math.max(a.left, b.left), right: Math.min(a.right, b.right), top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom) };
    return (r.right - r.left > 8 && r.bottom - r.top > 8) ? r : null;
}

// The safe boxes of one wave: every shadow for one side; for two sides only
// the places that are in a shadow of both.
function _safeRects(pillars, sides) {
    const up = pillars.filter(p => !p.broken);
    const a = up.map(p => _shadow(p, sides[0]));
    if (sides.length < 2) return a;
    const b = up.map(p => _shadow(p, sides[1]));
    const out = [];
    a.forEach(ra => b.forEach(rb => { const r = _intersect(ra, rb); if (r) out.push(r); }));
    return out;
}

// Distance from a point to the nearest edge of a box (0 inside it).
function _distToRect(pt, r) {
    const dx = Math.max(r.left - pt.x, 0, pt.x - r.right);
    const dy = Math.max(r.top - pt.y, 0, pt.y - r.bottom);
    return Math.hypot(dx, dy);
}

// True when the player's centre stands inside one of the boxes.
function _inside(pt, rects) {
    return rects.some(r => pt.x >= r.left - 6 && pt.x <= r.right + 6 && pt.y >= r.top - 6 && pt.y <= r.bottom + 6);
}

// Chooses where one wave comes from so that a safe spot is in walking reach.
// If no direction works, a fresh pillar rises a short walk away (the pillar
// itself is always safe).
function _pickSides(run, pillars, wave) {
    const pc = _mntPC();
    const reach = ST_WALK_PX_S * Math.max(0.3, (wave.ms - ST_REACT_MS) / 1000);
    const pool = (wave.cross ? SIDE_PAIRS : SIDES.map(s => [s])).slice().sort(() => Math.random() - 0.5);
    for (const sides of pool) {
        const rects = _safeRects(pillars, sides);
        const near = rects.some(r => _distToRect(pc, r) <= reach);
        const onIt = _inside(pc, rects);
        if (near && !onIt) return sides;
    }
    const ang = Math.random() * Math.PI * 2, d = Math.min(150, reach * 0.8);
    pillars.push(_mntRaisePillar(run, pc.x + Math.cos(ang) * d, pc.y + Math.sin(ang) * d));
    return pool[0];
}


//------------------------------------------------------------------------
//-------------------DRAWING---------------------------------------------------------
//------------------------------------------------------------------------

// Paints one wave: the whole arena red (stronger as the strike nears), the
// herd's chevrons along its edge(s), and the safe shadows cut out in green.
function _draw(ctx, sides, rects, f, struck) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = struck ? 'rgba(254, 202, 202, 0.75)' : 'rgba(220, 38, 38, ' + (0.16 + 0.34 * f).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
    if (!struck) {
        ctx.fillStyle = 'rgba(254, 226, 226, ' + (0.45 + 0.45 * f).toFixed(3) + ')';
        sides.forEach(s => _chevrons(ctx, s, W, H, f));
    }
    rects.forEach(r => {
        ctx.clearRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
        ctx.fillStyle = 'rgba(74, 222, 128, 0.22)';
        ctx.fillRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
        ctx.strokeStyle = 'rgba(134, 239, 172, 0.95)';
        ctx.lineWidth = 3;
        ctx.strokeRect(r.left + 1.5, r.top + 1.5, r.right - r.left - 3, r.bottom - r.top - 3);
    });
}

// A row of arrow heads along the herd's edge, pushing inward as it nears.
function _chevrons(ctx, side, W, H, f) {
    const horiz = side === 'left' || side === 'right';
    const len = horiz ? H : W, step = 90, depth = 26 + 60 * f;
    for (let a = step / 2; a < len; a += step) {
        ctx.beginPath();
        if (side === 'left') { ctx.moveTo(depth - 26, a - 22); ctx.lineTo(depth, a); ctx.lineTo(depth - 26, a + 22); }
        else if (side === 'right') { ctx.moveTo(W - depth + 26, a - 22); ctx.lineTo(W - depth, a); ctx.lineTo(W - depth + 26, a + 22); }
        else if (side === 'top') { ctx.moveTo(a - 22, depth - 26); ctx.lineTo(a, depth); ctx.lineTo(a + 22, depth - 26); }
        else { ctx.moveTo(a - 22, H - depth + 26); ctx.lineTo(a, H - depth); ctx.lineTo(a + 22, H - depth + 26); }
        ctx.closePath();
        ctx.fill();
    }
}


//------------------------------------------------------------------------
//-------------------THE STAMPEDE RUN-------------------------------------------------
//------------------------------------------------------------------------

// Runs a series of stampede waves (cfg: waves, swap, label, onDone) and
// returns the run. Every wave paints red with green shadows, then strikes
// everyone outside the green. With swap, one pillar falls and a new one
// rises after every wave.
function _stampede(monster, cfg) {
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const canvas = _nkEl(run, 'canvas', 'sx-mnt-canvas');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const pillars = _mntPillarSpots(ST_PILLARS).map(s => _mntRaisePillar(run, s.x, s.y));
    const clock = _mntClock();
    let i = -1, stage = 'rise', t = 0, sides = null, rects = [];
    _nkLoop(run, (dtS, now) => {
        t += clock(now);
        if (stage === 'rise' || stage === 'gap') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (t < (stage === 'rise' ? ST_RISE_MS : ST_GAP_MS)) return true;
            i++;
            if (i >= cfg.waves.length) {
                pillars.forEach(_mntCrumble);
                if (cfg.onDone) cfg.onDone();
                return false;
            }
            sides = _pickSides(run, pillars, cfg.waves[i]);
            stage = 'warn'; t = 0;
        }
        const w = cfg.waves[i];
        rects = _safeRects(pillars, sides);
        if (stage === 'warn') {
            _draw(ctx, sides, rects, Math.min(1, t / w.ms), false);
            if (t < w.ms) return true;
            if (!_inside(_mntPC(), rects)) _mntStrike(w.dmg, level, cfg.label || 'Stampede');
            stage = 'strike'; t = 0;
        }
        if (stage === 'strike') {
            _draw(ctx, sides, rects, 1, true);
            if (t < 260) return true;
            if (cfg.swap) {
                const up = pillars.filter(p => !p.broken);
                if (up.length > 2) _mntCrumble(up[Math.floor(Math.random() * up.length)]);
                const s = _mntPillarSpots(2, pillars).slice(-1)[0];
                if (s) pillars.push(_mntRaisePillar(run, s.x, s.y));
            }
            stage = 'gap'; t = 0;
        }
        return true;
    });
    return run;
}


//------------------------------------------------------------------------
//-------------------THE LABYRINTH (10% finale)------------------------------------
//------------------------------------------------------------------------
let _finale = null;                                // the running finale (one at a time)

// Pauses or resumes the player's auto-attack charge bar.
function _finPauseCharge(paused) {
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('sx-charge-paused', paused);
    });
}

// Ends the finale (once): removes the banner and releases the boss.
function _finEnd(g) {
    if (g.finished) return;
    g.finished = true;
    _finPauseCharge(false);
    if (g.wrap) g.wrap.classList.remove('sx-nk-shielded', 'sx-mnt-allin');
    if (g.banner) { try { g.banner.remove(); } catch (e) {} }
    const m = (globalThis._monsters || []).find(x => x && x.id === g.monsterId);
    if (m) m.bossImmune = false;
    if (_finale === g) _finale = null;
}

// Starts the finale: silences every other run of the boss, turns it immune
// and runs the long stampede. Every way out goes through _finEnd.
function _finStart(monster) {
    if (_finale || monster._mntFinaleDone) return;
    monster._mntFinaleDone = true;
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    const g = { monsterId: monster.id, finished: false, wrap, banner: null };
    _finale = g;
    monster.bossImmune = true;
    _finPauseCharge(true);
    if (wrap) wrap.classList.add('sx-nk-shielded', 'sx-mnt-allin');
    const banner = document.createElement('div');
    banner.className = 'sx-nk-fin-banner sx-nk-fin-mnt';
    banner.innerHTML = '<div class="sx-nk-fin-title">THE LABYRINTH</div>';
    document.body.appendChild(banner);
    g.banner = banner;
    const intro = _nkNewRun(monster.id, true);
    intro.onKill = () => { if (!intro.handedOff) _finEnd(g); };
    let t = 0;
    const started = performance.now();
    _nkLoop(intro, () => {
        t = performance.now() - started;
        if (t < FIN_INTRO_MS) return true;
        intro.handedOff = true;
        const st = _stampede(monster, { waves: FIN_WAVES, swap: true, label: 'The Labyrinth', onDone: () => _finEnd(g) });
        st.onKill = () => _finEnd(g);
        st.timers.push(setTimeout(() => _nkKillRun(st), FIN_FAILSAFE_MS));
        return false;
    });
}


//------------------------------------------------------------------------
//-------------------HP WATCHER (stampede marks + finale)----------------------------
//------------------------------------------------------------------------

// Passive watcher started when the fight begins: each stampede mark fires
// once when HP drops below it (waiting while another attack is running),
// and at 10% the finale begins.
function _mntOnInit(monster) {
    if (!monster || monster._mntWatch) return;
    monster._mntWatch = true;
    const fired = new Set();
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (monster._mntFinaleDone || !_nkBossAlive(monster.id)) return false;
        if (monster.bossImmune || _nkFrozen() || monster.currentHP <= 0) return true;
        const f = monster.currentHP / monster.maxHP;
        if (f <= 0.10) { _finStart(monster); return false; }
        const mark = ST_HP_MARKS.find(m => f <= m.at && !fired.has(m.at));
        if (mark && !_nkDodgeBusy()) {
            ST_HP_MARKS.forEach(m => { if (f <= m.at) fired.add(m.at); });
            _stampede(monster, { waves: mark.waves, swap: false });
        }
        return true;
    });
}

BOSS_MECHANICS.boss_minotaur.onInit = _mntOnInit;


//------------------------------------------------------------------------
//-------------------TEARDOWN AND DEBUG HOOK------------------------------------------
//------------------------------------------------------------------------

// Called from the boss cleanup on boss death AND on encounter stop: removes
// every element the Minotaur created and frees the charge bar.
export function _mntTeardown() {
    if (_finale) { try { _finEnd(_finale); } catch (e) {} }
    document.querySelectorAll('.sx-mnt-pillar, .sx-mnt-lane, .sx-mnt-bull, .sx-mnt-cross, .sx-mnt-stomp, ' +
        '.sx-mnt-canvas, .sx-nk-fin-mnt').forEach(el => { try { el.remove(); } catch (e) {} });
    document.querySelectorAll('.sx-mnt-allin').forEach(el => el.classList.remove('sx-mnt-allin'));
    _finPauseCharge(false);
}

// Console hook for playtests: _MNT_DEBUG.fire('rush'|'stomp'|'stampede', phase), _MNT_DEBUG.final().
if (typeof window !== 'undefined') {
    const find = () => (globalThis._monsters || []).find(m => m && m.baseId === 'boss_minotaur');
    window._MNT_DEBUG = {
        fire: (name, phase) => {
            const m = find();
            if (!m) return 'no minotaur alive';
            const p = phase || m.bossPhase || 1;
            if (name === 'rush') _mechMntCharge(m, p);
            else if (name === 'stomp') _mechMntStomp(m, p);
            else if (name === 'stampede') _stampede(m, { waves: ST_HP_MARKS[Math.min(2, p - 1)].waves, swap: false });
            else return 'unknown: ' + name;
            return 'fired ' + name;
        },
        final: () => { const m = find(); if (!m) return 'no minotaur alive'; _finStart(m); return 'finale started'; },
    };
}
