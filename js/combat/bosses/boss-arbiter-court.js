import { _renderPanel } from '../encounter.js';
import { BOSS_MECHANICS, _bossScheduleMechanics } from './boss-framework.js';
import { _arbBossCentre, _arbPhase, _arbRunScales, _arbStrike, _mechArbScales, _mechStillnessTrial } from './boss-arbiter.js';
import { _nkBossAlive, _nkDodgeBusy, _nkEl, _nkFrozen, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkRuns } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------ARBITER: GAVEL WAVES AND LAST JUDGEMENT--------------------
//------------------------------------------------------------------------
// GAVEL WAVES: rings of force roll out of the Arbiter. Every ring has one gap,
// shown as a green wedge; walk into the gap before the ring reaches you.
// LAST JUDGEMENT (10% HP): the Arbiter turns immune and passes two final
// sentences - fast Scales of Judgement, then fast Gavel Waves.
//------------------------------------------------------------------------

const TAU = Math.PI * 2;
const GV_R0 = 46;                                  // a ring starts this far from the Arbiter's centre
const GV_THICK = 28;                               // painted thickness of a ring (px)
const GV_PAD = 16;                                 // how generously a ring catches the player (px)
const GV_FORM_MS = 750;                            // the green wedge shows this long before a ring rolls
const GV_FIRST_MS = 900;                           // time until the first ring rolls
const GV_SHIFT_DEG = [10, 18];                     // a gap sits this far past the one you stand in
const GV_BY_PHASE = [
    null,
    { rings: 3, gapMs: 1050, speed: 330, gapDeg: 70, dmg: 0.12 },
    { rings: 4, gapMs: 950, speed: 350, gapDeg: 62, dmg: 0.15 },
    { rings: 5, gapMs: 850, speed: 370, gapDeg: 55, dmg: 0.18 },
];

const FIN_INTRO_MS = 1500;
const FIN_SCALES = { verdicts: 5, warnMs: [1300, 850], dmg: 0.30, horizontal: true, label: 'Last Judgement' };
const FIN_GAVEL = { rings: 6, gapMs: 800, speed: 380, gapDeg: 50, dmg: 0.26, label: 'Last Judgement' };


//------------------------------------------------------------------------
//-------------------LOW-LEVEL HELPERS------------------------------------------
//------------------------------------------------------------------------

// Smallest angle between two directions (0 to PI).
function _gvAngleDiff(a, b) {
    const d = Math.abs(a - b) % TAU;
    return d > Math.PI ? TAU - d : d;
}

// Picks where a ring's gap sits: the first one just beside the player's
// direction, the later ones just beside the gap before it, so there is
// always a short, fair walk and never a jump across the whole court.
function _gvPickGap(centre, prevGap, halfRad) {
    const sign = Math.random() < 0.5 ? -1 : 1;
    const shift = halfRad + (GV_SHIFT_DEG[0] + Math.random() * (GV_SHIFT_DEG[1] - GV_SHIFT_DEG[0])) * Math.PI / 180;
    if (prevGap !== null) return prevGap + sign * shift;
    const pc = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight * 0.7 };
    return Math.atan2(pc.y - centre.y, pc.x - centre.x) + sign * shift;
}

// Paints every ring and the green wedge of its gap on the canvas.
function _gvDraw(ctx, centre, rings, maxR, halfRad) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    rings.forEach(g => {
        if (g.done) return;
        const a0 = g.gap - halfRad, a1 = g.gap + halfRad;
        ctx.fillStyle = 'rgba(74, 222, 128, 0.17)';
        ctx.strokeStyle = 'rgba(134, 239, 172, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centre.x + Math.cos(a0) * g.r, centre.y + Math.sin(a0) * g.r);
        ctx.lineTo(centre.x + Math.cos(a0) * maxR, centre.y + Math.sin(a0) * maxR);
        ctx.arc(centre.x, centre.y, maxR, a0, a1);
        ctx.lineTo(centre.x + Math.cos(a1) * g.r, centre.y + Math.sin(a1) * g.r);
        ctx.arc(centre.x, centre.y, g.r, a1, a0, true);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(centre.x + Math.cos(a0) * g.r, centre.y + Math.sin(a0) * g.r);
        ctx.lineTo(centre.x + Math.cos(a0) * maxR, centre.y + Math.sin(a0) * maxR);
        ctx.moveTo(centre.x + Math.cos(a1) * g.r, centre.y + Math.sin(a1) * g.r);
        ctx.lineTo(centre.x + Math.cos(a1) * maxR, centre.y + Math.sin(a1) * maxR);
        ctx.stroke();
        ctx.strokeStyle = g.rolling ? 'rgba(239, 68, 68, 0.92)' : 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = g.rolling ? GV_THICK : 8;
        ctx.shadowColor = 'rgba(254, 202, 202, 0.9)';
        ctx.shadowBlur = g.rolling ? 18 : 0;
        ctx.beginPath();
        ctx.arc(centre.x, centre.y, g.r, a1, a0 + TAU);
        ctx.stroke();
        ctx.shadowBlur = 0;
    });
}


//------------------------------------------------------------------------
//-------------------GAVEL WAVES (rings with one gap)------------------------------
//------------------------------------------------------------------------

// Runs a series of rings (cfg: rings, gapMs, speed, gapDeg, dmg, label, onDone).
// A ring is struck once if it passes over you outside its gap.
function _gvRun(monster, cfg) {
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const centre = _arbBossCentre(monster);
    const maxR = Math.hypot(Math.max(centre.x, W - centre.x), Math.max(centre.y, H - centre.y)) + GV_THICK;
    const halfRad = cfg.gapDeg * Math.PI / 360;
    const canvas = _nkEl(run, 'canvas', 'sx-arb-canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const rings = [];
    let e = 0, formed = 0, prevGap = null;
    _nkLoop(run, (dtS) => {
        e += dtS * 1000;
        while (formed < cfg.rings && e >= GV_FIRST_MS + formed * cfg.gapMs - GV_FORM_MS) {
            const gap = _gvPickGap(centre, prevGap, halfRad);
            prevGap = gap;
            rings.push({ gap, r: GV_R0, rolling: false, hit: false, done: false, launchAt: GV_FIRST_MS + formed * cfg.gapMs });
            formed++;
        }
        const pc = _nkPlayerCenter();
        rings.forEach(g => {
            if (g.done) return;
            if (!g.rolling && e >= g.launchAt) g.rolling = true;
            if (!g.rolling) return;
            g.r += cfg.speed * dtS;
            if (g.r > maxR) { g.done = true; return; }
            if (g.hit || !pc) return;
            const d = Math.hypot(pc.x - centre.x, pc.y - centre.y);
            if (Math.abs(d - g.r) > GV_THICK / 2 + GV_PAD) return;
            if (_gvAngleDiff(Math.atan2(pc.y - centre.y, pc.x - centre.x), g.gap) > halfRad) {
                g.hit = true;
                _arbStrike(cfg.dmg, level, cfg.label || 'Gavel Waves');
            }
        });
        _gvDraw(ctx, centre, rings, maxR, halfRad);
        if (formed >= cfg.rings && rings.every(g => g.done)) {
            if (cfg.onDone) cfg.onDone();
            return false;
        }
        return true;
    });
    return run;
}

// Rings of force roll out of the Arbiter. Each has one gap (a green wedge):
// be inside it when the ring passes. Later phases send more, faster rings.
export function _mechArbGavel(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    _gvRun(monster, GV_BY_PHASE[_arbPhase(phase)]);
}


//------------------------------------------------------------------------
//-------------------LAST JUDGEMENT (10%: two fast sentences)------------------------
//------------------------------------------------------------------------

// Banner at the top that names the sentence being passed and what to do.
function _finBanner(run, hint) {
    const banner = _nkEl(run, 'div', 'sx-nk-fin-banner sx-nk-fin-arb');
    banner.innerHTML = '<div class="sx-nk-fin-title"></div><div class="sx-nk-fin-hint"></div>';
    banner.querySelector('.sx-nk-fin-title').textContent = 'LAST JUDGEMENT';
    banner.querySelector('.sx-nk-fin-hint').textContent = hint;
}

// Ends the finale (idempotent): releases the boss and restarts its mechanics.
function _finEnd(g) {
    if (g.ended) return;
    g.ended = true;
    if (g.wrap) g.wrap.classList.remove('sx-nk-shielded');
    const m = (globalThis._monsters || []).find(x => x && x.id === g.monsterId);
    if (m) {
        m.bossImmune = false;
        try { _bossScheduleMechanics(m, 3); } catch (e) {}
        try { _renderPanel(); } catch (e) {}
    }
}

// Sets up one act of the finale. If the act's run is killed from outside
// (encounter stopped, boss died) the whole finale ends; an act that hands over
// to the next one marks itself handedOff first so that does not happen.
function _finAct(g, run, hint) {
    _finBanner(run, hint);
    run.onKill = () => { if (!run.handedOff) _finEnd(g); };
}

// Starts the finale: silences the boss's other runs, makes it immune, then
// runs the Scales (act 1) and the Gavel Waves (act 2).
function _finStart(monster) {
    if (monster._arbFinale) return;
    monster._arbFinale = true;
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id && !r.passive) { try { _nkKillRun(r); } catch (e) {} }
    });
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    const g = { monsterId: monster.id, ended: false, wrap };
    monster.bossImmune = true;
    if (wrap) wrap.classList.add('sx-nk-shielded');
    const intro = _nkNewRun(monster.id, true);
    _finAct(g, intro, 'The court passes sentence!');
    let t = 0;
    _nkLoop(intro, (dtS) => {
        t += dtS * 1000;
        if (t < FIN_INTRO_MS) return true;
        intro.handedOff = true;
        const scales = _arbRunScales(monster, {
            ...FIN_SCALES,
            onDone: () => {
                scales.handedOff = true;
                _finAct(g, _gvRun(monster, { ...FIN_GAVEL, onDone: () => _finEnd(g) }), 'Slip through the green gaps!');
            },
        });
        _finAct(g, scales, 'Stand on the green half!');
        return false;
    });
}

// Passive HP watcher: at 10% the finale begins, once.
function _arbWatchFinale(monster) {
    if (!monster || monster._arbFinaleWatch) return;
    monster._arbFinaleWatch = true;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (monster._arbFinale || !_nkBossAlive(monster.id)) return false;
        if (monster.currentHP > 0 && monster.currentHP <= monster.maxHP * 0.10 && !monster.bossImmune && !_nkFrozen()) {
            _finStart(monster);
            return false;
        }
        return true;
    });
}

BOSS_MECHANICS.boss_arbiter.onInit = _arbWatchFinale;


//------------------------------------------------------------------------
//-------------------DEBUG HOOK-------------------------------------------------
//------------------------------------------------------------------------

// Console hook for playtests: _ARB_DEBUG.fire('trial'|'scales'|'gavel', phase), _ARB_DEBUG.final().
if (typeof window !== 'undefined') {
    const find = () => (globalThis._monsters || []).find(m => m && m.baseId === 'boss_arbiter');
    window._ARB_DEBUG = {
        fire: (name, phase) => {
            const m = find();
            const fn = { trial: _mechStillnessTrial, scales: _mechArbScales, gavel: _mechArbGavel }[name];
            if (!m) return 'no arbiter alive';
            if (!fn) return 'unknown: ' + name;
            fn(m, phase || m.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => { const m = find(); if (!m) return 'no arbiter alive'; _finStart(m); return 'finale started'; },
    };
}
