import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRectsOverlap } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE MINOTAUR (boss_minotaur)-------------------------
//------------------------------------------------------------------------
// The Labyrinth's Warden. Stone pillars rise from the floor and the bull
// charges; a pillar stops the charge, so the pillars are your cover:
//  - BULL RUSH (all fight): a red lane fills toward you, then the bull runs
//    it up to the first pillar in its way. From 60% the pillar it smashes
//    bursts in a red cross. HOOF STOMP (all fight): filling circles chase you.
//  - STAMPEDE + THE LABYRINTH finale: boss-minotaur-stampede.js.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_minotaur: {
        id: 'boss_minotaur', name: 'The Minotaur', emoji: '🐂',
        baseHP: 1140, baseDamage: 25, chargeMax: 13,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_minotaur: {
        phases: [
            // Basic attacks are steady pressure; the charges are the real threat.
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 12, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 11, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'labyrinth_walls', intervalBase: 15000, intervalVariance: 3500, handler: '_mechMntCharge' },
            { name: 'hooftread_terrain', intervalBase: 17000, intervalVariance: 4000, handler: '_mechMntStomp' },
            { name: 'prior_bomb', intervalBase: 21000, intervalVariance: 5000, handler: '_mechPriorBomb' },
        ],
    },
});


//------------------------------------------------------------------------
//-------------------CONSTANTS AND SHARED HELPERS---------------------------------
//------------------------------------------------------------------------
const MNT_HIT_CD_MS = 650;                         // shared hit cooldown
const MNT_PILLAR = 96;                             // pillar side (px)
const MNT_MARGIN = { top: 96, bottom: 84, side: 48 };   // keep pillars clear of the HUD
let _mntHitUntil = 0;

// The phase number clamped to 1-3.
export function _mntPhase(phase) {
    return Math.max(1, Math.min(3, Number(phase) || 1));
}

// One hit with the boss-ability flash and number, behind a short shared
// cooldown so two hazards landing together never stack.
export function _mntStrike(pct, level, label) {
    const now = performance.now();
    if (now < _mntHitUntil) return false;
    _mntHitUntil = now + MNT_HIT_CD_MS;
    _nkAbilityHitToast(_nkHit(pct, null, level), 'The Minotaur', label, true);
    return true;
}

// Player centre, or the screen centre when there is no avatar.
export function _mntPC() {
    return _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

// The player's box shrunk by a few pixels, so grazing an edge is forgiven.
export function _mntPlayerBox() {
    const r = _nkPlayerRect();
    if (!r) return null;
    return { left: r.left + 6, top: r.top + 6, right: r.right - 6, bottom: r.bottom - 6 };
}

// A clock that follows real time (clamped to 0.1 s per frame), so the
// fills drawn by CSS and the strikes in code never drift apart.
export function _mntClock() {
    let last = performance.now();
    return (now) => {
        const dt = Math.min(100, Math.max(0, now - last));
        last = now;
        return dt;
    };
}


//------------------------------------------------------------------------
//-------------------PILLARS (the bull's walls, your cover)------------------------
//------------------------------------------------------------------------

// Raises one stone pillar centred on (x, y), kept inside the arena.
export function _mntRaisePillar(run, x, y) {
    const W = window.innerWidth, H = window.innerHeight, h = MNT_PILLAR / 2;
    const cx = Math.max(MNT_MARGIN.side + h, Math.min(W - MNT_MARGIN.side - h, x));
    const cy = Math.max(MNT_MARGIN.top + h, Math.min(H - MNT_MARGIN.bottom - h, y));
    const el = _nkEl(run, 'div', 'sx-mnt-pillar');
    el.style.left = Math.round(cx - h) + 'px';
    el.style.top = Math.round(cy - h) + 'px';
    el.style.width = el.style.height = MNT_PILLAR + 'px';
    return { x: cx, y: cy, left: cx - h, top: cy - h, right: cx + h, bottom: cy + h, el, broken: false };
}

// Smashes a pillar: it bursts into rubble and stops blocking.
export function _mntCrumble(pillar) {
    if (!pillar || pillar.broken) return;
    pillar.broken = true;
    pillar.el.classList.add('sx-mnt-pillar-crumble');
    const el = pillar.el;
    setTimeout(() => { try { el.remove(); } catch (e) {} }, 520);
}

// Picks n well-spread pillar spots: the arena is cut into a grid of cells,
// n random cells get one pillar each (jittered inside the cell). One pillar
// always lands near the player so cover is in reach. Spots never overlap
// each other or the standing pillars in `avoid`.
export function _mntPillarSpots(n, avoid = []) {
    const W = window.innerWidth, H = window.innerHeight;
    const x0 = MNT_MARGIN.side + MNT_PILLAR, x1 = W - MNT_MARGIN.side - MNT_PILLAR;
    const y0 = MNT_MARGIN.top + MNT_PILLAR, y1 = H - MNT_MARGIN.bottom - MNT_PILLAR;
    const cols = 4, rows = 3, cells = [];
    for (let i = 0; i < cols * rows; i++) cells.push(i);
    const spots = [];
    const pc = _mntPC();
    const ang = Math.random() * Math.PI * 2;
    const taken = avoid.filter(p => !p.broken).map(p => ({ x: p.x, y: p.y }));
    const clash = (x, y) => spots.concat(taken).some(s => Math.abs(s.x - x) < MNT_PILLAR * 1.6 && Math.abs(s.y - y) < MNT_PILLAR * 1.6);
    const nx = pc.x + Math.cos(ang) * 170, ny = pc.y + Math.sin(ang) * 170;
    if (!clash(nx, ny)) spots.push({ x: nx, y: ny });
    while (spots.length < n && cells.length) {
        const c = cells.splice(Math.floor(Math.random() * cells.length), 1)[0];
        const cw = (x1 - x0) / cols, ch = (y1 - y0) / rows;
        const sx = x0 + (c % cols + 0.2 + Math.random() * 0.6) * cw;
        const sy = y0 + (Math.floor(c / cols) + 0.2 + Math.random() * 0.6) * ch;
        if (clash(sx, sy)) continue;
        spots.push({ x: sx, y: sy });
    }
    return spots;
}


//------------------------------------------------------------------------
//-------------------BULL RUSH (lane up to the first pillar)------------------------
//------------------------------------------------------------------------
const RUSH_LANE = 110;                             // lane width (px)
const RUSH_SPEED = 1600;                           // bull speed (px/s)
const RUSH_BODY = 120;                             // bull length (px)
const RUSH_RISE_MS = 900;                          // pillars rise before the first lane
const RUSH_GAP_MS = 450;
const RUSH_BLOCK_PX = 40;                          // a pillar this deep in the lane stops the bull
const CROSS_ARM = 84;                              // width of a cross arm (px)
const CROSS_LEN = 300;                             // reach of a cross arm from the pillar (px)
const CROSS_WARN_MS = 1050;
const RUSH_BY_PHASE = [
    null,
    { rushes: 2, warnMs: 1250, dmg: 0.20, pillars: 3, cross: 0 },
    { rushes: 3, warnMs: 1150, dmg: 0.24, pillars: 4, cross: 0.15 },
    { rushes: 3, warnMs: 1000, dmg: 0.28, pillars: 4, cross: 0.18 },
];
const DIRS = [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
];

// Picks the lane of one rush: a direction (never the same twice in a row),
// the line through the player, and the first standing pillar that reaches
// well into the lane (the bull stops there).
// Returns the lane box from the bull's edge up to that pillar.
function _rushLane(pillars, prevDir) {
    const W = window.innerWidth, H = window.innerHeight, pc = _mntPC();
    const choices = DIRS.filter(d => d !== prevDir);
    const dir = choices[Math.floor(Math.random() * choices.length)];
    const horiz = dir.dy === 0;
    const c = horiz ? Math.max(RUSH_LANE / 2, Math.min(H - RUSH_LANE / 2, pc.y))
        : Math.max(RUSH_LANE / 2, Math.min(W - RUSH_LANE / 2, pc.x));
    let blocker = null;
    pillars.forEach(p => {
        if (p.broken) return;
        const lo = horiz ? p.top : p.left, hi = horiz ? p.bottom : p.right;
        const onLine = Math.min(hi, c + RUSH_LANE / 2) - Math.max(lo, c - RUSH_LANE / 2) >= RUSH_BLOCK_PX;
        if (!onLine) return;
        const key = horiz ? (dir.dx > 0 ? p.left : -p.right) : (dir.dy > 0 ? p.top : -p.bottom);
        const best = blocker ? (horiz ? (dir.dx > 0 ? blocker.left : -blocker.right) : (dir.dy > 0 ? blocker.top : -blocker.bottom)) : Infinity;
        if (key < best) blocker = p;
    });
    const half = RUSH_LANE / 2;
    let box;
    if (horiz) {
        box = dir.dx > 0 ? { left: 0, right: blocker ? blocker.left : W } : { left: blocker ? blocker.right : 0, right: W };
        box.top = c - half; box.bottom = c + half;
    } else {
        box = dir.dy > 0 ? { top: 0, bottom: blocker ? blocker.top : H } : { top: blocker ? blocker.bottom : 0, bottom: H };
        box.left = c - half; box.right = c + half;
    }
    return { dir, horiz, c, blocker, box };
}

// Paints a lane box whose red fill wipes in from the bull's side.
function _rushPaint(run, lane, warnMs) {
    const el = _nkEl(run, 'div', 'sx-mnt-lane');
    const b = lane.box;
    el.style.left = Math.round(b.left) + 'px';
    el.style.top = Math.round(b.top) + 'px';
    el.style.width = Math.round(b.right - b.left) + 'px';
    el.style.height = Math.round(b.bottom - b.top) + 'px';
    el.style.setProperty('--mnt-warn', warnMs + 'ms');
    const from = lane.horiz ? (lane.dir.dx > 0 ? 'left' : 'right') : (lane.dir.dy > 0 ? 'top' : 'bottom');
    el.classList.add('sx-mnt-lane-' + from);
    return el;
}

// Paints the red cross a smashed pillar bursts into (two arms through it).
function _crossPaint(run, p) {
    const W = window.innerWidth, H = window.innerHeight, half = CROSS_ARM / 2;
    const arms = [
        { left: Math.max(0, p.x - CROSS_LEN), right: Math.min(W, p.x + CROSS_LEN), top: p.y - half, bottom: p.y + half },
        { left: p.x - half, right: p.x + half, top: Math.max(0, p.y - CROSS_LEN), bottom: Math.min(H, p.y + CROSS_LEN) },
    ];
    arms.forEach(a => {
        a.el = _nkEl(run, 'div', 'sx-mnt-cross');
        a.el.style.left = Math.round(a.left) + 'px';
        a.el.style.top = Math.round(a.top) + 'px';
        a.el.style.width = Math.round(a.right - a.left) + 'px';
        a.el.style.height = Math.round(a.bottom - a.top) + 'px';
        a.el.style.setProperty('--mnt-warn', CROSS_WARN_MS + 'ms');
    });
    return arms;
}

// Moves the bull one frame along its lane; true once it reached the end.
// Hits the player once if the bull's body passes over them.
function _rushStep(r, dtMs, level, cfg) {
    const b = r.lane.box, d = r.lane.dir;
    const prev = r.front;
    r.front += RUSH_SPEED * dtMs / 1000;
    const end = r.lane.horiz ? (b.right - b.left) : (b.bottom - b.top);
    const front = Math.min(end, r.front), back = Math.max(0, prev - RUSH_BODY);
    let body;
    if (r.lane.horiz) {
        body = d.dx > 0 ? { left: b.left + back, right: b.left + front } : { left: b.right - front, right: b.right - back };
        body.top = b.top; body.bottom = b.bottom;
    } else {
        body = d.dy > 0 ? { top: b.top + back, bottom: b.top + front } : { top: b.bottom - front, bottom: b.bottom - back };
        body.left = b.left; body.right = b.right;
    }
    if (!r.hit && _nkRectsOverlap(_mntPlayerBox(), body)) {
        r.hit = true;
        _mntStrike(cfg.dmg, level, 'Bull Rush');
    }
    const tipX = r.lane.horiz ? (d.dx > 0 ? b.left + front : b.right - front) : r.lane.c;
    const tipY = r.lane.horiz ? r.lane.c : (d.dy > 0 ? b.top + front : b.bottom - front);
    const ang = Math.atan2(d.dy, d.dx) * 180 / Math.PI;
    r.bull.style.transform = 'translate(' + Math.round(tipX - RUSH_BODY) + 'px,' + Math.round(tipY - 40) + 'px) rotate(' + ang + 'deg)';
    return r.front >= end;
}

// Bull Rush: pillars rise, then lane after lane fills red toward you and the
// bull runs it up to the first pillar on its line. Behind a pillar is safe.
// From phase 2 the pillar the bull smashes bursts in a red cross.
export function _mechMntCharge(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = RUSH_BY_PHASE[_mntPhase(phase)];
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const pillars = _mntPillarSpots(cfg.pillars).map(s => _mntRaisePillar(run, s.x, s.y));
    const crosses = [];
    const clock = _mntClock();
    let stage = 'rise', t = 0, done = 0, prevDir = null, r = null;
    _nkLoop(run, (dtS, now) => {
        const dt = clock(now);
        t += dt;
        crosses.forEach(cr => {
            cr.t += dt;
            if (cr.struck || cr.t < CROSS_WARN_MS) return;
            cr.struck = true;
            cr.arms.forEach(a => a.el.classList.add('sx-mnt-cross-hit'));
            if (cr.arms.some(a => _nkRectsOverlap(_mntPlayerBox(), a))) _mntStrike(cfg.cross, level, 'Shattered Pillar');
            run.timers.push(setTimeout(() => cr.arms.forEach(a => { try { a.el.remove(); } catch (e) {} }), 420));
        });
        if (stage === 'rise' || stage === 'gap') {
            if (t < (stage === 'rise' ? RUSH_RISE_MS : RUSH_GAP_MS)) return true;
            if (done >= cfg.rushes) {
                if (crosses.some(cr => !cr.struck)) return true;
                pillars.forEach(_mntCrumble);
                return t < RUSH_GAP_MS + 600;
            }
            const lane = _rushLane(pillars, prevDir);
            prevDir = lane.dir;
            r = { lane, el: _rushPaint(run, lane, cfg.warnMs), front: 0, hit: false, bull: null };
            stage = 'warn'; t = 0;
        } else if (stage === 'warn') {
            if (t < cfg.warnMs) return true;
            r.el.classList.add('sx-mnt-lane-live');
            r.bull = _nkEl(run, 'div', 'sx-mnt-bull');
            stage = 'run'; t = 0;
        } else if (stage === 'run' && _rushStep(r, dt, level, cfg)) {
            if (r.lane.blocker) {
                _mntCrumble(r.lane.blocker);
                if (cfg.cross) crosses.push({ arms: _crossPaint(run, r.lane.blocker), t: 0, struck: false });
            }
            const old = [r.el, r.bull];
            run.timers.push(setTimeout(() => old.forEach(el => { try { el.remove(); } catch (e) {} }), 200));
            done++; stage = 'gap'; t = 0;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------HOOF STOMP (filling circles chase you)------------------------
//------------------------------------------------------------------------
const STOMP_R = 100;                               // stomp radius (px)
const STOMP_WARN_MS = 1150;
const STOMP_EVERY_MS = 700;                        // a new circle this often, on your spot
const STOMP_BY_PHASE = [null, { n: 3, dmg: 0.13 }, { n: 4, dmg: 0.15 }, { n: 5, dmg: 0.17 }];

// Hoof Stomp: a red circle fills under you; while it fills the next one
// already starts on your new spot. Keep walking.
export function _mechMntStomp(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = STOMP_BY_PHASE[_mntPhase(phase)];
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const stomps = [];
    const clock = _mntClock();
    let t = 0;
    _nkLoop(run, (dtS, now) => {
        t += clock(now);
        while (stomps.length < cfg.n && t >= stomps.length * STOMP_EVERY_MS) {
            const pc = _mntPC();
            const el = _nkEl(run, 'div', 'sx-mnt-stomp');
            el.style.left = Math.round(pc.x - STOMP_R) + 'px';
            el.style.top = Math.round(pc.y - STOMP_R) + 'px';
            el.style.width = el.style.height = (STOMP_R * 2) + 'px';
            el.style.setProperty('--mnt-warn', STOMP_WARN_MS + 'ms');
            stomps.push({ x: pc.x, y: pc.y, at: stomps.length * STOMP_EVERY_MS + STOMP_WARN_MS, el, done: false });
        }
        stomps.forEach(s => {
            if (s.done || t < s.at) return;
            s.done = true;
            s.el.classList.add('sx-mnt-stomp-hit');
            if (_nkCircleHit(s.x, s.y, STOMP_R, _mntPlayerBox(), 0)) _mntStrike(cfg.dmg, level, 'Hoof Stomp');
            const el = s.el;
            run.timers.push(setTimeout(() => { try { el.remove(); } catch (e) {} }, 420));
        });
        return !(stomps.length >= cfg.n && stomps.every(s => s.done) && t > stomps[stomps.length - 1].at + 450);
    });
}
