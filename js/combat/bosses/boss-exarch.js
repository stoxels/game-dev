import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFinaleWaves, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkRuns, _nkKillRun, _nkBossAlive } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE EXARCH (boss_exarch)---------------------------
//------------------------------------------------------------------------
// Fire-priest homage: the arena is his pyre. Five ideas, one per mechanic:
//  - CONSTRICTION: a safe circle opens around you and drifts to a green goal
//    ring while it shrinks. Outside it the fire flares in pulses, and every
//    pulse in a row hurts more (the burn builds until you step back in).
//  - EMBER RAIN: circles fill with fire, then burst (one lands on you).
//  - CINDER LANES (boss-exarch-flames.js): fire lanes sweep across the arena.
//  - SEARING TRAIL (60%+, boss-exarch-flames.js): every spot you stand on
//    ignites a moment later - keep moving.
//  - FINAL PYRE (10%): one last, fast constriction, then the shared waves.
// Prior bomb is a shared mechanic referenced by handler-name string.
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
            { name: 'cinder_lanes', intervalBase: 15000, intervalVariance: 3000, handler: '_mechCinderLanes' },
            { name: 'searing_trail', intervalBase: 22000, intervalVariance: 4000, handler: '_mechSearingTrail', phase2Only: true },
            { name: 'prior_bomb', intervalBase: 20000, intervalVariance: 4000, handler: '_mechPriorBomb' },
        ],
        onInit: (m) => { _exaWatchFinale(m); },
    },
});

// The last waves of FINAL PYRE (shared helper): read each circle.
const EXA_FINALE = {
    name: 'The Exarch', title: 'FINAL PYRE', element: 'fire', cls: 'sx-nk-fin-exa', color: '#fdba74',
    quiet: true,
    waves: [
        { kind: 'avoid', ms: 2100, dmg: 0.15, extra: 3, label: 'Final Pyre' },
        { kind: 'shelter', ms: 2600, dmg: 0.22, label: 'Final Pyre' },
        { kind: 'avoid', ms: 1900, dmg: 0.15, extra: 5, label: 'Final Pyre' },
        { kind: 'shelter', ms: 2300, dmg: 0.24, label: 'Final Pyre' },
        { kind: 'avoid', ms: 1800, dmg: 0.17, extra: 6, label: 'Final Pyre' },
        { kind: 'shelter', ms: 2200, dmg: 0.28, label: 'Last Ember' },
    ],
};

// The finale's first act is a fast constriction (all drifts, small end circle).
const EXA_FINALE_CONSTRICT = { legs: 3, r0: 400, r1: 150, shrinkMs: 11000, speed: 125, dmg: 0.12, label: 'Final Pyre' };


//------------------------------------------------------------------------
//-------------------SHARED HELPERS-----------------------------------------------
//------------------------------------------------------------------------
let _exaLastHit = 0;

// One hit with the boss-ability flash and number. `cdMs` (optional) is a shared
// cooldown so overlapping flames of one mechanic never stack several hits at once.
export function _exaStrike(pct, level, abilityName, cdMs) {
    const now = performance.now();
    if (cdMs && now - _exaLastHit < cdMs) return;
    _exaLastHit = now;
    _nkAbilityHitToast(_nkHit(pct, 'fire', level), 'The Exarch', abilityName, true);
}

export function _exaClamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

// Phase 1-3 of the running Exarch (falls back to the phase the framework passed).
export function _exaPhase(phase) {
    return Math.max(1, Math.min(3, Number(phase) || 1));
}


//------------------------------------------------------------------------
//-------------------CONSTRICTION (a shrinking, drifting safe circle)------------------------
//------------------------------------------------------------------------
const CON_BY_PHASE = [
    null,
    { legs: 1, r0: 430, r1: 210, shrinkMs: 9000, speed: 95, dmg: 0.10 },
    { legs: 2, r0: 430, r1: 195, shrinkMs: 8500, speed: 110, dmg: 0.12 },
    { legs: 3, r0: 430, r1: 180, shrinkMs: 8000, speed: 125, dmg: 0.14 },
];
const CON_LEG_DIST = [330, 450];                   // each drift covers this distance
const CON_PULSE_MS = 800;                          // the fire flares this often outside the circle
const CON_FIRST_PULSE_MS = 1000;                   // grace after the circle opens
const CON_BURN_STEP = 0.5;                         // each flare in a row outside hits this much harder ...
const CON_BURN_MAX = 3;                            // ... up to x3 (flare 1 = x1, 2 = x1.5, 3 = x2, ...)
const CON_HOLD_MS = 1500;                          // the circle holds still at the end, then collapses

// Picks the next spot the circle drifts to: 330-450 px away, kept on screen
// with room for the circle at its smallest.
function _conPickTarget(from, r1) {
    const W = window.innerWidth, H = window.innerHeight, r = r1 + 30;
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

// Runs one constriction: the safe circle drifts leg by leg towards a green goal
// ring (the size the circle will end at) while it shrinks. Every flare outside
// the circle is a real hit, harder the longer you stay out. cfg.onDone fires
// once the circle has collapsed.
function _exaConstrict(monster, cfg) {
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const c0 = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const centre = { x: _exaClamp(c0.x, 200, window.innerWidth - 200), y: _exaClamp(c0.y, 240, window.innerHeight - 200) };
    const zone = _nkEl(run, 'div', 'sx-exa-zone');
    const rim = _nkEl(run, 'div', 'sx-nk-ring');
    const goal = _nkEl(run, 'div', 'sx-exa-goal');
    goal.style.width = goal.style.height = (cfg.r1 * 2) + 'px';
    let leg = 0, target = _conPickTarget(centre, cfg.r1);
    let e = 0, sincePulse = -(CON_FIRST_PULSE_MS - CON_PULSE_MS), doneAt = 0, burn = 0;
    const placeGoal = () => {
        goal.style.left = Math.round(target.x - cfg.r1) + 'px';
        goal.style.top = Math.round(target.y - cfg.r1) + 'px';
    };
    placeGoal();
    _nkLoop(run, (dtS) => {
        const dt = dtS * 1000;
        e += dt;
        // drift towards the goal, then pick the next one (or settle)
        if (leg < cfg.legs) {
            const dx = target.x - centre.x, dy = target.y - centre.y;
            const d = Math.hypot(dx, dy);
            const step = cfg.speed * dtS;
            if (d <= step) {
                centre.x = target.x; centre.y = target.y;
                leg++;
                if (leg < cfg.legs) { target = _conPickTarget(centre, cfg.r1); placeGoal(); }
                else goal.style.display = 'none';
            } else {
                centre.x += dx / d * step; centre.y += dy / d * step;
            }
        }
        const f = Math.min(1, e / cfg.shrinkMs);
        const r = cfg.r0 + (cfg.r1 - cfg.r0) * f;
        _conDraw(zone, rim, centre.x, centre.y, r);
        // the flare
        sincePulse += dt;
        if (sincePulse >= CON_PULSE_MS) {
            sincePulse = 0;
            const c = _nkPlayerCenter();
            const outside = !!c && Math.hypot(c.x - centre.x, c.y - centre.y) > r;
            rim.classList.add('sx-exa-flare');
            setTimeout(() => { try { rim.classList.remove('sx-exa-flare'); } catch (er) {} }, 220);
            if (outside) {
                burn = Math.min(CON_BURN_MAX + 1, burn + 1);
                _exaStrike(cfg.dmg * (1 + CON_BURN_STEP * Math.min(CON_BURN_MAX, burn - 1)), level, cfg.label || 'Constriction');
            } else {
                burn = 0;
            }
        }
        if (f >= 1 && leg >= cfg.legs) {
            if (!doneAt) doneAt = e;
            if (e - doneAt >= CON_HOLD_MS) {
                if (cfg.onDone) cfg.onDone();
                return false;
            }
        }
        return true;
    });
    return run;
}

// A safe circle opens around you and shrinks while it drifts to the green goal
// ring; outside it the fire flares, harder with every flare in a row. Walk with
// the circle - it is much slower than you. Later phases chain more drifts.
export function _mechConstriction(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    _exaConstrict(monster, CON_BY_PHASE[_exaPhase(phase)]);
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

// Circles fill with fire, then burst - one lands on you, the rest around.
// Being inside one at the moment it bursts burns.
export function _mechEmberRain(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = _exaPhase(phase);
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const volleys = [];
    let launched = 0, untilNext = 500, tail = 0;
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
                el.style.setProperty('--exa-warn', EMBER_WARN_MS[p] + 'ms');
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


//------------------------------------------------------------------------
//-------------------FINAL PYRE (10%: fast constriction, then waves)---------------------------
//------------------------------------------------------------------------

// At 10% the Exarch turns immune; the arena closes in one last time (a fast
// constriction), then the shared safe/danger waves finish the fight.
function _exaFinale(monster) {
    if (monster._nkFinaleDone || monster._exaFinale) return;
    monster._exaFinale = true;
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id && !r.passive) { try { _nkKillRun(r); } catch (e) {} }
    });
    monster.bossImmune = true;
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.add('sx-nk-shielded');
    const run = _exaConstrict(monster, {
        ...EXA_FINALE_CONSTRICT,
        onDone: () => {
            if (wrap) wrap.classList.remove('sx-nk-shielded');
            monster.bossImmune = false;
            run.handedOff = true;
            _nkFinaleWaves(monster, EXA_FINALE);
        },
    });
    const kill = run.onKill;
    run.onKill = () => {
        if (kill) kill();
        if (run.handedOff) return;
        monster.bossImmune = false;
        if (wrap) wrap.classList.remove('sx-nk-shielded');
    };
    const banner = _nkEl(run, 'div', 'sx-nk-fin-banner sx-nk-fin-exa');
    banner.innerHTML = '<div class="sx-nk-fin-title"></div>';
    banner.querySelector('.sx-nk-fin-title').textContent = EXA_FINALE.title;
}

// Passive HP watcher: at 10% the finale begins, once.
function _exaWatchFinale(monster) {
    if (!monster || monster._exaFinaleWatch) return;
    monster._exaFinaleWatch = true;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (!_nkBossAlive(monster.id) || monster._exaFinale) return false;
        if (monster.currentHP > 0 && monster.currentHP <= monster.maxHP * 0.10 && !monster.bossImmune && !_nkFrozen()) {
            _exaFinale(monster);
            return false;
        }
        return true;
    });
}
