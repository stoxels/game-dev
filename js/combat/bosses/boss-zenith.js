import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkToast, _nkWatchFinale } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE ZENITH (boss_zenith)-----------------------------
//------------------------------------------------------------------------
// The final throne passes sentence, then crowns itself.
//  - ROYAL DECREE: a golden line is drawn across the arena near you and one
//    side is EXILED (red, "EXILED" on it). When the countdown ends everyone
//    on the exiled side is struck. The line always lies within a short walk,
//    and the exiled side is usually the one you stand on. The last decree of
//    the final phase draws two lines: only the far corner is spared.
//  - CROWN RINGS: the crown lights up at a distance and sends rings across
//    the arena. Every ring has a GAP - slip through it. Each gap opens a
//    little to one side of where you stand, alternating sides.
//  - At 10%: LAST EDICT (shared finale waves).
//
// Shared mechanics (soul_tithe) live in shared-puzzle-mechanics.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_zenith: {
        id: 'boss_zenith', name: 'The Zenith', emoji: '👑',
        baseHP: 1250, baseDamage: 28, chargeMax: 10,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_zenith: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.25 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.50 },
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'royal_decree', intervalBase: 17000, intervalVariance: 4000, handler: '_mechRoyalDecree' },
            { name: 'crown_rings', intervalBase: 18000, intervalVariance: 4000, handler: '_mechCrownRings' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_mechSoulTithe' },
        ],
        onInit: (m) => { _nkWatchFinale(m, ZEN_FINALE); },
    },
});

// LAST EDICT (shared waves): the throne decrees - read each circle.
const ZEN_FINALE = {
    name: 'The Zenith', title: '👑 LAST EDICT', element: null, cls: 'sx-nk-fin-zen', color: '#facc15',
    hint: 'The throne decrees - obey each circle!',
    waves: [
        { kind: 'avoid', ms: 2100, dmg: 0.15, extra: 3, label: 'Last Edict' },
        { kind: 'shelter', ms: 2700, dmg: 0.22, label: 'Last Edict' },
        { kind: 'avoid', ms: 1900, dmg: 0.15, extra: 4, label: 'Last Edict' },
        { kind: 'shelter', ms: 2500, dmg: 0.28, label: 'Final Coronation' },
    ],
};


//------------------------------------------------------------------------
//-------------------SHARED HELPERS-----------------------------------------------
//------------------------------------------------------------------------

// One hit with the boss-ability flash and number.
function _zenStrike(pct, level, abilityName) {
    _nkAbilityHitToast(_nkHit(pct, null, level), 'The Zenith', abilityName, true);
}

function _zenClamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

// Angle difference wrapped to -PI..PI.
function _zenAngDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
}


//------------------------------------------------------------------------
//-------------------ROYAL DECREE (exile across a line)------------------------------
//------------------------------------------------------------------------
const DECREE_WAVES = [0, 3, 3, 4];                 // decrees per cast, by phase
const DECREE_COUNT_MS = [0, 2400, 2200, 2000];     // countdown before the sentence falls
const DECREE_GAP_MS = 700;                         // pause between decrees
const DECREE_LINE_REACH = [70, 230];               // the line lies this far from you (px)
const DECREE_YOUR_SIDE = 0.75;                     // chance the exiled side is the one you stand on
const DECREE_DMG = [0, 0.18, 0.21, 0.25];          // share of max life
const DECREE_EDGE = 28;                            // the line stays this far inside the screen edge

// Builds the exiled rectangles for one decree. kind 'x' / 'y': one vertical /
// horizontal line; 'quad': two lines, only the corner across both is spared.
function _decreeRects(kind, pc) {
    const W = window.innerWidth, H = window.innerHeight;
    const reach = () => (DECREE_LINE_REACH[0] + Math.random() * (DECREE_LINE_REACH[1] - DECREE_LINE_REACH[0])) * (Math.random() < 0.5 ? -1 : 1);
    if (kind === 'quad') {
        const lx = _zenClamp(pc.x + reach(), DECREE_EDGE + 120, W - DECREE_EDGE - 120);
        const ly = _zenClamp(pc.y + reach(), DECREE_EDGE + 120, H - DECREE_EDGE - 120);
        // the spared corner lies across both lines from the player
        const safeRight = pc.x < lx, safeBottom = pc.y < ly;
        const rects = [];
        [false, true].forEach(right => [false, true].forEach(bottom => {
            if (right === safeRight && bottom === safeBottom) return;
            rects.push({ l: right ? lx : 0, r: right ? W : lx, t: bottom ? ly : 0, b: bottom ? H : ly });
        }));
        return rects;
    }
    const vertical = kind === 'x';
    const size = vertical ? W : H;
    const here = vertical ? pc.x : pc.y;
    const line = _zenClamp(here + reach(), DECREE_EDGE + 120, size - DECREE_EDGE - 120);
    const youAreLow = here < line;                   // you stand on the low side of the line
    const exileLow = Math.random() < DECREE_YOUR_SIDE ? youAreLow : !youAreLow;
    if (vertical) return [exileLow ? { l: 0, r: line, t: 0, b: H } : { l: line, r: W, t: 0, b: H }];
    return [exileLow ? { l: 0, r: W, t: 0, b: line } : { l: 0, r: W, t: line, b: H }];
}

// Draws one exiled rectangle (red, dashed golden rim, "EXILED").
function _decreeDrawRect(run, rc) {
    const el = _nkEl(run, 'div', 'sx-zen-exile');
    el.style.left = Math.round(rc.l) + 'px';
    el.style.top = Math.round(rc.t) + 'px';
    el.style.width = Math.round(rc.r - rc.l) + 'px';
    el.style.height = Math.round(rc.b - rc.t) + 'px';
    el.innerHTML = '<span class="sx-zen-exile-text">EXILED</span><span class="sx-zen-exile-count"></span>';
    return el;
}

// The decrees: a golden line appears near you, one side is exiled, and after
// the countdown that side is struck. Decrees alternate vertical / horizontal
// lines; the last one of the final phase is a double line.
export function _mechRoyalDecree(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    let n = 0, stage = 'gap', t = 0, rects = [], els = [];
    _nkToast('eg_mech_zenith', '👑 The Zenith: Royal Decree! Leave the exiled side before it falls!');
    _nkLoop(run, (dtS) => {
        t += dtS * 1000;
        const pc = _nkPlayerCenter();
        if (stage === 'gap') {
            if (t < (n === 0 ? 500 : DECREE_GAP_MS)) return true;
            if (n >= DECREE_WAVES[p]) return false;
            if (!pc) return true;
            const kind = (p === 3 && n === DECREE_WAVES[p] - 1) ? 'quad' : (n % 2 === 0 ? 'x' : 'y');
            n++;
            rects = _decreeRects(kind, pc);
            els = rects.map(rc => _decreeDrawRect(run, rc));
            stage = 'count'; t = 0;
            return true;
        }
        const left = DECREE_COUNT_MS[p] - t;
        els.forEach(el => { const c = el.querySelector('.sx-zen-exile-count'); if (c) c.textContent = left > 0 ? String(Math.ceil(left / 1000)) : ''; });
        if (left > 0) return true;
        const hit = pc && rects.some(rc => pc.x > rc.l && pc.x < rc.r && pc.y > rc.t && pc.y < rc.b);
        els.forEach(el => el.classList.add(hit ? 'sx-zen-exile-hit' : 'sx-zen-exile-strike'));
        if (hit) _zenStrike(DECREE_DMG[p], level, 'Royal Decree');
        const old = els;
        els = [];
        setTimeout(() => old.forEach(el => { try { el.remove(); } catch (e) {} }), 500);
        stage = 'gap'; t = 0;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------CROWN RINGS (rings with a gap)------------------------------------
//------------------------------------------------------------------------
const RING_COUNT = [0, 3, 4, 4];                  // rings per cast, by phase
const RING_SPEED = [0, 300, 335, 370];            // px/s
const RING_SPACING_MS = [0, 1150, 1050, 950];     // time from one ring to the next
const RING_WARN_MS = 1200;                        // crown glows this long before the first ring
const RING_GAP = [0, 1.7, 1.5, 1.35];             // opening of the gap (radians)
const RING_GAP_SIDE = [0.5, 0.85];                // the gap centre lies this far (rad) off your direction
const RING_THICK = 34;                            // painted band thickness = the hit band
const RING_HIT_PAD = 6;                           // forgiveness added to the band's half width
const RING_START_DIST = [400, 560];               // the crown lights up this far from you
const RING_DMG = [0, 0.18, 0.22, 0.26];           // share of max life per ring

// Where the crown stands: 400-560 px from the player, kept on screen.
function _ringCrownPoint(pc) {
    const W = window.innerWidth, H = window.innerHeight;
    for (let tries = 0; tries < 30; tries++) {
        const a = Math.random() * Math.PI * 2;
        const d = RING_START_DIST[0] + Math.random() * (RING_START_DIST[1] - RING_START_DIST[0]);
        const x = pc.x + Math.cos(a) * d, y = pc.y + Math.sin(a) * d;
        if (x > 120 && x < W - 120 && y > 130 && y < H - 150) return { x, y };
    }
    return { x: _zenClamp(W - pc.x, 120, W - 120), y: _zenClamp(H * 0.45, 130, H - 150) };
}

// Draws a ring of radius r around (cx, cy) with an opening centred on gapAng.
function _ringPlace(ring, cx, cy, r) {
    const outer = Math.round(r + RING_THICK / 2);
    ring.el.style.left = Math.round(cx - outer) + 'px';
    ring.el.style.top = Math.round(cy - outer) + 'px';
    ring.el.style.width = ring.el.style.height = (outer * 2) + 'px';
}

// Launches ring k: its gap opens to one side of where the player stands now,
// alternating sides from ring to ring.
function _ringLaunch(run, crown, k, p, pc) {
    const toPlayer = pc ? Math.atan2(pc.y - crown.y, pc.x - crown.x) : 0;
    const side = k % 2 === 0 ? 1 : -1;
    const off = RING_GAP_SIDE[0] + Math.random() * (RING_GAP_SIDE[1] - RING_GAP_SIDE[0]);
    const gapAng = toPlayer + side * off;
    const el = _nkEl(run, 'div', 'sx-zen-ring');
    const fromDeg = (gapAng - RING_GAP[p] / 2) * 180 / Math.PI + 90;
    el.style.setProperty('--gap-from', fromDeg.toFixed(1) + 'deg');
    el.style.setProperty('--gap-deg', (RING_GAP[p] * 180 / Math.PI).toFixed(1) + 'deg');
    const ring = { el, r: 30, gapAng, hitDone: false };
    _ringPlace(ring, crown.x, crown.y, ring.r);
    return ring;
}

// The crown lights up away from you and sends rings across the arena; every
// ring has a gap that opens beside your position - slip through it. A ring
// only hurts where its band has no gap, and only once.
export function _mechCrownRings(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const start = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const crown = _ringCrownPoint(start);
    const rMax = Math.hypot(window.innerWidth, window.innerHeight);
    const crownEl = _nkEl(run, 'div', 'sx-zen-crown', '👑');
    crownEl.style.transform = 'translate(' + Math.round(crown.x - 34) + 'px,' + Math.round(crown.y - 34) + 'px)';
    const rings = [];
    let e = 0, launched = 0;
    _nkToast('eg_mech_crown', '👑 The Zenith: Crown Rings! Slip through the gap in each ring!');
    _nkLoop(run, (dtS) => {
        const dt = dtS * 1000;
        e += dt;
        const pc = _nkPlayerCenter();
        if (e >= RING_WARN_MS && launched < RING_COUNT[p] && e >= RING_WARN_MS + launched * RING_SPACING_MS[p]) {
            rings.push(_ringLaunch(run, crown, launched, p, pc));
            launched++;
        }
        for (let i = rings.length - 1; i >= 0; i--) {
            const rg = rings[i];
            rg.r += RING_SPEED[p] * dtS;
            if (rg.r > rMax + RING_THICK) { try { rg.el.remove(); } catch (er) {} rings.splice(i, 1); continue; }
            _ringPlace(rg, crown.x, crown.y, rg.r);
            if (!rg.hitDone && pc) {
                const dist = Math.hypot(pc.x - crown.x, pc.y - crown.y);
                const inBand = Math.abs(dist - rg.r) < RING_THICK / 2 + RING_HIT_PAD;
                const inGap = Math.abs(_zenAngDiff(Math.atan2(pc.y - crown.y, pc.x - crown.x), rg.gapAng)) < RING_GAP[p] / 2;
                if (inBand && !inGap) {
                    rg.hitDone = true;
                    _zenStrike(RING_DMG[p], level, 'Crown Rings');
                }
            }
        }
        return launched < RING_COUNT[p] || rings.length > 0;
    });
}
