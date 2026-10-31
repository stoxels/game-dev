import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkToast, _nkWatchFinale } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE EXARCH (boss_exarch)---------------------------
//------------------------------------------------------------------------
// Fire-priest homage: the arena is his pyre.
//  - CONSTRICTION: a safe circle opens around you; everything outside it is
//    on fire and flares in pulses (a real hit each pulse). The circle shrinks
//    and DRIFTS towards a marked spot - walk with it. Later phases chain
//    two or three drifts.
//  - EMBER RAIN: dashed circles mark where embers will land (one on you, the
//    rest around); get out before they burst.
//  - At 10%: FINAL PYRE (shared finale waves).
//
// Shared mechanics (prior_bomb) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_exarch: {
        id: 'boss_exarch', name: 'The Exarch', emoji: '🔥',
        baseHP: 1100, baseDamage: 24, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_exarch: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'constriction', intervalBase: 19000, intervalVariance: 4000, handler: '_mechConstriction' },
            { name: 'ember_rain', intervalBase: 17000, intervalVariance: 4000, handler: '_mechEmberRain' },
            { name: 'prior_bomb', intervalBase: 20000, intervalVariance: 4000, handler: '_mechPriorBomb' },
        ],
        onInit: (m) => { _nkWatchFinale(m, EXA_FINALE); },
    },
});

// FINAL PYRE (shared waves): the whole arena burns - read each circle.
const EXA_FINALE = {
    name: 'The Exarch', title: '🔥 FINAL PYRE', element: 'fire', cls: 'sx-nk-fin-exa', color: '#fdba74',
    hint: 'The pyre is lit - check each circle!',
    waves: [
        { kind: 'avoid', ms: 2100, dmg: 0.15, extra: 3, label: 'Final Pyre' },
        { kind: 'shelter', ms: 2700, dmg: 0.22, label: 'Final Pyre' },
        { kind: 'avoid', ms: 1900, dmg: 0.15, extra: 4, label: 'Final Pyre' },
        { kind: 'shelter', ms: 2500, dmg: 0.28, label: 'Last Ember' },
    ],
};


//------------------------------------------------------------------------
//-------------------SHARED HELPERS-----------------------------------------------
//------------------------------------------------------------------------

// One hit with the boss-ability flash and number.
function _exaStrike(pct, level, abilityName) {
    _nkAbilityHitToast(_nkHit(pct, 'fire', level), 'The Exarch', abilityName, true);
}

function _exaClamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}


//------------------------------------------------------------------------
//-------------------CONSTRICTION (a shrinking, drifting safe circle)------------------------
//------------------------------------------------------------------------
const CON_R0 = 500;                                // radius when it opens
const CON_R1 = [0, 210, 195, 180];                 // radius it shrinks to, by phase
const CON_SHRINK_MS = [0, 9000, 8500, 8000];       // time to shrink
const CON_LEGS = [0, 1, 2, 3];                     // drifts to a marked spot, by phase
const CON_DRIFT_SPEED = [0, 85, 100, 115];         // px/s - far slower than you walk
const CON_LEG_DIST = [330, 450];                   // each drift covers this distance
const CON_PULSE_MS = 900;                          // the fire flares this often outside the circle
const CON_DMG = [0, 0.09, 0.11, 0.13];             // share of max life per flare
const CON_HOLD_MS = 1500;                          // the circle holds still at the end, then collapses

// Picks the next spot the circle drifts to: 330-450 px away, kept on screen
// with room for the circle at its smallest.
function _conPickTarget(from, p) {
    const W = window.innerWidth, H = window.innerHeight, r = CON_R1[p] + 30;
    for (let tries = 0; tries < 30; tries++) {
        const a = Math.random() * Math.PI * 2;
        const d = CON_LEG_DIST[0] + Math.random() * (CON_LEG_DIST[1] - CON_LEG_DIST[0]);
        const x = from.x + Math.cos(a) * d, y = from.y + Math.sin(a) * d;
        if (x > r && x < W - r && y > r + 40 && y < H - r - 60) return { x, y };
    }
    return { x: _exaClamp(W - from.x, r, W - r), y: _exaClamp(H / 2, r + 40, H - r - 60) };
}

// Paints the red outside of the circle (a cut-out disc) and its rim.
function _conDraw(zoneEl, rimEl, cx, cy, r) {
    zoneEl.style.background = 'radial-gradient(circle at ' + Math.round(cx) + 'px ' + Math.round(cy) + 'px, transparent '
        + Math.round(r) + 'px, rgba(220, 38, 38, 0.34) ' + Math.round(r + 8) + 'px)';
    rimEl.style.left = Math.round(cx - r) + 'px';
    rimEl.style.top = Math.round(cy - r) + 'px';
    rimEl.style.width = rimEl.style.height = Math.round(r * 2) + 'px';
}

// A safe circle opens around you and shrinks while it drifts to a marked
// spot; outside it the fire flares in pulses. Walk with the circle - it is
// much slower than you. Later phases chain more drifts.
export function _mechConstriction(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const c0 = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const centre = { x: _exaClamp(c0.x, 200, window.innerWidth - 200), y: _exaClamp(c0.y, 240, window.innerHeight - 200) };
    const zone = _nkEl(run, 'div', 'sx-exa-zone');
    const rim = _nkEl(run, 'div', 'sx-nk-ring');
    const mark = _nkEl(run, 'div', 'sx-exa-target', '🔥');
    let leg = 0, target = _conPickTarget(centre, p);
    let e = 0, sincePulse = 0, doneAt = 0;
    const placeMark = () => {
        mark.style.left = Math.round(target.x - 34) + 'px';
        mark.style.top = Math.round(target.y - 34) + 'px';
    };
    placeMark();
    _nkToast('eg_mech_constrict', '🔥 The Exarch: Constriction! Walk with the circle - the fire flares outside it!');
    _nkLoop(run, (dtS) => {
        const dt = dtS * 1000;
        e += dt;
        // drift towards the marked spot, then pick the next one (or settle)
        if (leg < CON_LEGS[p]) {
            const dx = target.x - centre.x, dy = target.y - centre.y;
            const d = Math.hypot(dx, dy);
            const step = CON_DRIFT_SPEED[p] * dtS;
            if (d <= step) {
                centre.x = target.x; centre.y = target.y;
                leg++;
                if (leg < CON_LEGS[p]) { target = _conPickTarget(centre, p); placeMark(); }
                else mark.style.display = 'none';
            } else {
                centre.x += dx / d * step; centre.y += dy / d * step;
            }
        }
        const f = Math.min(1, e / CON_SHRINK_MS[p]);
        const r = CON_R0 + (CON_R1[p] - CON_R0) * f;
        _conDraw(zone, rim, centre.x, centre.y, r);
        // the flare
        sincePulse += dt;
        if (sincePulse >= CON_PULSE_MS) {
            sincePulse = 0;
            const c = _nkPlayerCenter();
            rim.classList.add('sx-exa-flare');
            setTimeout(() => { try { rim.classList.remove('sx-exa-flare'); } catch (er) {} }, 220);
            if (c && Math.hypot(c.x - centre.x, c.y - centre.y) > r) _exaStrike(CON_DMG[p], level, 'Constriction');
        }
        if (f >= 1 && leg >= CON_LEGS[p]) {
            if (!doneAt) doneAt = e;
            if (e - doneAt >= CON_HOLD_MS) return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------EMBER RAIN (marked circles, then bursts)-----------------------------
//------------------------------------------------------------------------
const EMBER_VOLLEYS = [0, 2, 3, 3];                // volleys per cast, by phase
const EMBER_COUNT = [0, 4, 5, 6];                  // circles per volley
const EMBER_R = 95;                                // burst radius = the painted circle
const EMBER_WARN_MS = [0, 1400, 1250, 1100];       // circles shown before they burst
const EMBER_STEP_MS = [0, 1700, 1500, 1350];       // time from one volley to the next
const EMBER_SPACING = 2 * EMBER_R + 30;            // circles of one volley never overlap
const EMBER_DMG = [0, 0.14, 0.17, 0.20];           // share of max life

// Circle centres for one volley: the first lands on the player, the others
// are spread over the arena without overlapping.
function _emberSpots(count, pc) {
    const W = window.innerWidth, H = window.innerHeight;
    const spots = [{ x: _exaClamp(pc.x + (Math.random() * 60 - 30), 100, W - 100), y: _exaClamp(pc.y + (Math.random() * 60 - 30), 120, H - 150) }];
    for (let i = 1; i < count; i++) {
        for (let tries = 0; tries < 30; tries++) {
            const s = { x: 100 + Math.random() * (W - 200), y: 120 + Math.random() * (H - 280) };
            if (spots.every(o => Math.hypot(o.x - s.x, o.y - s.y) >= EMBER_SPACING)) { spots.push(s); break; }
        }
    }
    return spots;
}

// Dashed circles mark where embers will land - one on you, the rest around.
// After the warning they burst; being inside one at that moment burns.
export function _mechEmberRain(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const volleys = [];
    let launched = 0, untilNext = 500, tail = 0;
    _nkToast('eg_mech_ember_rain', '🔥 The Exarch: Ember Rain! Leave the marked circles!');
    _nkLoop(run, (dtS) => {
        const dt = dtS * 1000;
        untilNext -= dt;
        if (launched < EMBER_VOLLEYS[p] && untilNext <= 0) {
            const pc = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            const circles = _emberSpots(EMBER_COUNT[p], pc).map(s => {
                const el = _nkEl(run, 'div', 'sx-exa-ember');
                el.style.left = Math.round(s.x - EMBER_R) + 'px';
                el.style.top = Math.round(s.y - EMBER_R) + 'px';
                el.style.width = el.style.height = (EMBER_R * 2) + 'px';
                return { ...s, el };
            });
            volleys.push({ circles, t: 0 });
            launched++;
            untilNext = EMBER_STEP_MS[p];
        }
        for (let i = volleys.length - 1; i >= 0; i--) {
            const v = volleys[i];
            v.t += dt;
            if (v.t < EMBER_WARN_MS[p]) continue;
            const pc = _nkPlayerCenter();
            const hit = pc && v.circles.some(c => Math.hypot(pc.x - c.x, pc.y - c.y) < EMBER_R);
            v.circles.forEach(c => {
                c.el.classList.add('sx-exa-ember-boom');
                setTimeout(() => { try { c.el.remove(); } catch (e) {} }, 450);
            });
            if (hit) _exaStrike(EMBER_DMG[p], level, 'Ember Rain');
            volleys.splice(i, 1);
        }
        if (launched < EMBER_VOLLEYS[p] || volleys.length > 0) return true;
        tail += dt;                        // let the last burst play out
        return tail < 500;
    });
}
