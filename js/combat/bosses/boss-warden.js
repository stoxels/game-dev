import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkRuns, _nkToast, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE WARDEN (boss_warden)-----------------------------
//------------------------------------------------------------------------
// The prison-keeper of the storm. Four things to read, all fight long:
//  - STORM PYLONS: three tesla pylons rise, creep toward you and keep firing
//    shock rings with ONE gap each (the gap is shown as a green cone before
//    the ring leaves). Ram a pylon twice to short it out; whatever survives
//    its lifetime ends in an OVERLOAD ring. From 60% the live pylons are
//    wired together with arc beams.
//  - SENTRY FIRE: turrets pop out at the arena edge, track you and lock a
//    bolt line through your spot.
//  - SOLITARY (60%+): an electric cage snaps shut around you, shrinks and
//    only opens through a sliding door.
//  - FROZEN CELLS (shared): locks on the puzzle grid.
// At 10%: LOCKDOWN (boss-warden-lockdown.js) - the arena splits into cells.
//
// Sentries and Solitary live in boss-warden-hazards.js; the finale in
// boss-warden-lockdown.js.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_warden: {
        id: 'boss_warden', name: 'The Warden', emoji: '🗼',
        baseHP: 1040, baseDamage: 23, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_warden: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'pulse_totems', intervalBase: 15000, intervalVariance: 4000, handler: '_mechTotemPulse' },
            { name: 'sentry_fire', intervalBase: 13000, intervalVariance: 3500, handler: '_mechWardenSentries' },
            { name: 'frozen_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_mechFrozenCells' },
            { name: 'solitary', intervalBase: 20000, intervalVariance: 4000, handler: '_mechWardenSolitary', phase2Only: true },
        ],
        // onInit (the LOCKDOWN watcher) is attached by boss-warden-lockdown.js.
    },
});


//------------------------------------------------------------------------
//-------------------SHARED HELPERS (also used by the hazards + finale)---------
//------------------------------------------------------------------------

const WARDEN_NAME = 'The Warden';
export const WARDEN_COLOR = '#fde047';
const WARDEN_HIT_CD_MS = 650;       // touch hazards bite at most this often
let _wardenHitCd = 0;

// Player centre, falling back to the screen middle when it can't be read.
export function _wardenPC() {
    return _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

// Lightning hit on the player with a shared touch cooldown (a hazard that
// keeps touching you cannot machine-gun). force skips the cooldown.
export function _wardenTouch(pct, level, label, force) {
    const now = performance.now();
    if (!force && now < _wardenHitCd) return false;
    if (!_nkPlayerCenter()) return false;
    _wardenHitCd = now + WARDEN_HIT_CD_MS;
    const dealt = _nkHit(pct, 'lightning', level);
    _nkAbilityHitToast(dealt, WARDEN_NAME, label);
    return true;
}

// A burst of sparks at a spot (visual only, removes itself).
export function _wardenSparks(run, x, y, count) {
    for (let i = 0; i < count; i++) {
        const el = _nkEl(run, 'div', 'sx-ward-spark');
        const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 46;
        el.style.left = Math.round(x) + 'px';
        el.style.top = Math.round(y) + 'px';
        el.style.setProperty('--sx', Math.round(Math.cos(a) * d) + 'px');
        el.style.setProperty('--sy', Math.round(Math.sin(a) * d) + 'px');
        setTimeout(() => { try { el.remove(); } catch (e) { /* run already cleaned up */ } }, 600);
    }
}

// Smallest angle between two directions (radians, 0..PI).
export function _wardenAngDiff(a, b) {
    let d = Math.abs(a - b) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
}

// Writes the CSS variables that cut a gap into a conic-masked element:
// the gap is centred on `centre` (radians, 0 = right, clockwise) and is
// `widthRad` wide.
export function _wardenSetGap(el, centre, widthRad) {
    const deg = 180 / Math.PI;
    el.style.setProperty('--gs', ((centre - widthRad / 2) * deg + 90).toFixed(1));
    el.style.setProperty('--gw', (widthRad * deg).toFixed(1));
}

// Centres a fixed-position element on (x, y).
export function _wardenPlace(el, x, y, halfW, halfH) {
    el.style.left = Math.round(x - halfW) + 'px';
    el.style.top = Math.round(y - halfH) + 'px';
}


//------------------------------------------------------------------------
//-------------------STORM PYLONS (all fight)-------------------------------
//------------------------------------------------------------------------
// Tuning, indexed by boss phase (1..3).
const PYL_LIFE_S = [0, 13, 14, 15];          // seconds the pylons stand
const PYL_CYCLE_S = [0, 6.0, 5.4, 4.8];      // seconds between one pylon's rings (the three take turns, so a ring leaves every third of this)
const PYL_GAP_DEG = [0, 110, 100, 90];         // width of the safe gap in a ring
const PYL_RING_SPEED = [0, 300, 330, 360];   // px/s a ring front travels
const PYL_RING_DMG = [0, 0.17, 0.20, 0.23];  // %maxHP for being caught by a ring
const PYL_ARC_DMG = [0, 0, 0.12, 0.15];      // %maxHP for touching an arc beam
const PYL_CRAWL = [0, 24, 32, 40];           // px/s the pylons creep toward you
const PYL_WARN_S = 0.95;                     // green gap cone shows this long before a ring leaves
const PYL_RAM_HITS = 2;                      // body-checks that short a pylon out
const PYL_OVER_GAP_DEG = 70;                 // the final OVERLOAD ring has a narrow gap
const PYL_OVER_MULT = 1.35;                  // ...and hits harder
const PYL_ARC_WARN_S = 1.4;                  // arc beams are dashed this long after the pylons rise
const PYL_RING_BAND = 14;                    // px thickness of a ring front
const PYL_CRAWL_STOP = 150;                  // pylons stop creeping this close to you
const PYL_RING_MAX = 760;                    // px a ring travels before it fades

let _pylonRun = null;                        // the live pylon cast (one at a time)

// Three pylon spots on a wide triangle around the arena centre.
function _pylonSpots() {
    const W = window.innerWidth, H = window.innerHeight - 70;
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.34;
    const rot = Math.random() * Math.PI * 2;
    return [0, 1, 2].map(i => {
        const a = rot + i * Math.PI * 2 / 3;
        return {
            x: Math.max(70, Math.min(W - 70, cx + Math.cos(a) * R)),
            y: Math.max(80, Math.min(H - 20, cy + Math.sin(a) * R)),
        };
    });
}

// One tesla pylon: base plate, ribbed tower and a crackling orb.
function _pylonEl(run, x, y) {
    const el = _nkEl(run, 'div', 'sx-ward-pylon');
    el.innerHTML = '<i class="sx-ward-pylon-body"></i><i class="sx-ward-pylon-orb"></i>';
    _wardenPlace(el, x, y - 14, 22, 70);
    return el;
}

// The green cone that shows where a ring's gap will be.
function _pylonGapCone(run, p, centre, widthRad) {
    const el = _nkEl(run, 'div', 'sx-ward-cone');
    _wardenSetGap(el, centre, widthRad);
    _wardenPlace(el, p.x, p.y, 560, 560);
    return el;
}

// Releases a ring from a pylon. The ring is a thin expanding band with one
// gap; it keeps travelling until it fades out.
function _pylonFireRing(run, p, gapRad, mult, rings) {
    const el = _nkEl(run, 'div', 'sx-ward-wave' + (p.finalRing ? ' sx-ward-wave-over' : ''));
    _wardenSetGap(el, gapRad, p.gapWidth);
    rings.push({ x: p.x, y: p.y, r: 30, gap: gapRad, gapW: p.gapWidth, mult, el, hit: false });
}

// Moves a ring outward, bites the player if the front crosses them outside
// the gap. Returns false when the ring is finished.
function _pylonStepRing(ring, dtS, speed, pc, dmg, level) {
    ring.r += speed * dtS;
    const r = ring.r;
    ring.el.style.left = Math.round(ring.x - r) + 'px';
    ring.el.style.top = Math.round(ring.y - r) + 'px';
    ring.el.style.width = ring.el.style.height = Math.round(r * 2) + 'px';
    ring.el.style.opacity = r > PYL_RING_MAX - 140 ? String(Math.max(0, (PYL_RING_MAX - r) / 140)) : '1';
    if (!ring.hit && pc) {
        const d = Math.hypot(pc.x - ring.x, pc.y - ring.y);
        if (Math.abs(d - (r - PYL_RING_BAND / 2)) < PYL_RING_BAND / 2 + 13) {
            const ang = Math.atan2(pc.y - ring.y, pc.x - ring.x);
            if (_wardenAngDiff(ang, ring.gap) > ring.gapW / 2) {
                ring.hit = true;
                _wardenTouch(dmg * ring.mult, level, ring.mult > 1 ? 'Overload' : 'Shock Ring', true);
            }
        }
    }
    return r < PYL_RING_MAX;
}

// Shorts a pylon out: it goes dark, its cone and beams vanish.
function _pylonKill(run, p) {
    p.dead = true;
    p.el.classList.remove('sx-ward-pylon-hot', 'sx-ward-pylon-over');
    p.el.classList.add('sx-ward-pylon-off');
    if (p.cone) { try { p.cone.remove(); } catch (e) { /* already gone */ } p.cone = null; }
    _wardenSparks(run, p.x, p.y - 60, 8);
}

// Body-checking a pylon cracks it; leave and come back to hit it again.
function _pylonRam(run, p, pc) {
    const d = Math.hypot(pc.x - p.x, pc.y - p.y);
    if (d > 100) p.armed = true;
    if (!p.armed || d > 46) return;
    p.armed = false;
    p.hp--;
    p.el.classList.add('sx-ward-pylon-hit' + (PYL_RAM_HITS - p.hp));
    _wardenSparks(run, p.x, p.y - 30, 5);
    if (p.hp <= 0) _pylonKill(run, p);
}

// Creeps a pylon toward the player and keeps its element in place.
function _pylonCrawl(p, pc, speed, dtS) {
    const dx = pc.x - p.x, dy = pc.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d > PYL_CRAWL_STOP) {
        p.x += dx / d * speed * dtS;
        p.y += dy / d * speed * dtS;
        _wardenPlace(p.el, p.x, p.y - 14, 22, 70);
    }
    if (p.cone) _wardenPlace(p.cone, p.x, p.y, 560, 560);
}

// One pylon's ring clock: charge (cone + hot orb), fire, rest. The last ring
// before the pylon's life ends is the OVERLOAD.
function _pylonCycle(run, p, ctx) {
    const { cyc, dtS, life, t, rings, gapDeg } = ctx;
    p.clock += dtS;
    if (!p.charging && p.clock >= cyc - PYL_WARN_S) {
        p.charging = true;
        p.finalRing = t + cyc >= life;
        p.gapWidth = (p.finalRing ? PYL_OVER_GAP_DEG : gapDeg) * Math.PI / 180;
        // The gap opens roughly toward you (off to one side by a random amount),
        // so one clear step into the cone is enough - the rings never need a
        // gap lined up with all three pylons at once.
        const pc = _nkPlayerCenter();
        const toPlayer = pc ? Math.atan2(pc.y - p.y, pc.x - p.x) : Math.random() * Math.PI * 2;
        p.gapAt = toPlayer + (Math.random() * 2 - 1) * p.gapWidth * 0.35;
        p.cone = _pylonGapCone(run, p, p.gapAt, p.gapWidth);
        p.el.classList.add(p.finalRing ? 'sx-ward-pylon-over' : 'sx-ward-pylon-hot');
    }
    if (p.charging && p.clock >= cyc) {
        p.clock = 0;
        p.charging = false;
        p.el.classList.remove('sx-ward-pylon-hot', 'sx-ward-pylon-over');
        if (p.cone) { try { p.cone.remove(); } catch (e) { /* already gone */ } p.cone = null; }
        _pylonFireRing(run, p, p.gapAt, p.finalRing ? PYL_OVER_MULT : 1, rings);
        _wardenSparks(run, p.x, p.y - 60, 6);
        if (p.finalRing) p.spent = true;
    }
}

// Arc beams between every pair of live pylons (phase 2+). Dashed first, then
// live; they follow the pylons as they creep.
function _pylonArcs(run, pylons, arcs, t, pc, dmg, level) {
    const live = t >= PYL_ARC_WARN_S;
    for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
            const key = i + '-' + j, A = pylons[i], B = pylons[j];
            const on = !A.dead && !B.dead && !A.spent && !B.spent;
            if (!on) {
                if (arcs[key]) { try { arcs[key].remove(); } catch (e) { /* already gone */ } delete arcs[key]; }
                continue;
            }
            if (!arcs[key]) arcs[key] = _nkEl(run, 'div', 'sx-ward-arc sx-ward-arc-warn');
            const el = arcs[key], ax = A.x, ay = A.y - 72, bx = B.x, by = B.y - 72;
            el.style.left = Math.round(ax) + 'px';
            el.style.top = Math.round(ay - 9) + 'px';
            el.style.width = Math.round(Math.hypot(bx - ax, by - ay)) + 'px';
            el.style.transform = 'rotate(' + Math.atan2(by - ay, bx - ax) + 'rad)';
            if (live && el.classList.contains('sx-ward-arc-warn')) {
                el.classList.remove('sx-ward-arc-warn');
                el.classList.add('sx-ward-arc-live');
            }
            if (live && pc && _ptSegDist(pc.x, pc.y, ax, ay, bx, by) < 9 + 16) {
                _wardenTouch(dmg, level, 'Arc Link');
            }
        }
    }
}

// Storm Pylons (the signature move): see the header comment.
export function _mechTotemPulse(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen() || (monster && monster._wardenLockdown)) return;
    if (_pylonRun && _nkRuns.has(_pylonRun.id)) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    // Passive: the pylons layer with the other casts instead of blocking them.
    run.passive = true;
    _pylonRun = run;
    // While the pylons stand, Sentry Fire holds off (boss-warden-hazards.js reads this flag).
    if (monster) monster._wardenPylons = true;
    run.onKill = () => {
        if (_pylonRun === run) _pylonRun = null;
        if (monster) monster._wardenPylons = false;
    };

    const pylons = _pylonSpots().map((s, i) => ({
        x: s.x, y: s.y, el: _pylonEl(run, s.x, s.y), hp: PYL_RAM_HITS,
        // Staggered clocks (negative = grace after the rise) so rings never leave together.
        clock: -0.9 - i * PYL_CYCLE_S[p] / 3, charging: false, finalRing: false,
        gapAt: 0, gapWidth: 0, cone: null, armed: true, dead: false, spent: false,
    }));
    const rings = [], arcs = {};
    _nkToast('eg_mech_totems', '🗼 STORM PYLONS - read each green gap, slip through the rings, ram a pylon to short it out!', WARDEN_COLOR);
    let t = 0, announced = false;

    _nkLoop(run, (dtS) => {
        t += dtS;
        const pc = _nkPlayerCenter();
        const ctx = { cyc: PYL_CYCLE_S[p], dtS, life: PYL_LIFE_S[p], t, rings, gapDeg: PYL_GAP_DEG[p] };
        for (const py of pylons) {
            if (py.dead || py.spent) continue;
            if (pc) { _pylonCrawl(py, pc, PYL_CRAWL[p], dtS); _pylonRam(run, py, pc); }
            if (!py.dead) _pylonCycle(run, py, ctx);
        }
        if (p >= 2) _pylonArcs(run, pylons, arcs, t, pc, PYL_ARC_DMG[p], level);
        for (let i = rings.length - 1; i >= 0; i--) {
            if (!_pylonStepRing(rings[i], dtS, PYL_RING_SPEED[p], pc, PYL_RING_DMG[p], level)) {
                try { rings[i].el.remove(); } catch (e) { /* already gone */ }
                rings.splice(i, 1);
            }
        }
        // A pylon that fired its OVERLOAD winds down.
        for (const py of pylons) {
            if (py.spent && !py.dead) _pylonKill(run, py);
        }
        const standing = pylons.some(py => !py.dead);
        if (!standing && !announced && t < PYL_LIFE_S[p]) {
            announced = true;
            _nkToast('eg_mech_totems_down', '⚡ Pylons shorted out!', '#4ade80');
        }
        return standing || rings.length > 0;
    });
}
