import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkToast, _nkWatchFinale } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE EXECUTIONER (boss_executioner)-------------------
//------------------------------------------------------------------------
// Pendulum homage: a headsman who passes sentence, then carries it out.
//  - HEADSMAN'S SWING: a great axe on a chain swings along an arc that is
//    drawn on the floor first. Each arc is aimed through the spot you stand
//    on, so the next one catches you where you dodged to: step in or out of
//    the arc (or cross it while the blade is at the far end).
//  - GUILLOTINE: lanes of the arena are condemned. Red stripes show where a
//    blade will fall; the lane aimed at you turns solid red just before the
//    drop. Some volleys leave only narrow safe strips between the lanes.
//  - At 10%: FINAL VERDICT (shared finale waves).
//
// Shared mechanics (prior_bomb) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_executioner: {
        id: 'boss_executioner', name: 'The Executioner', emoji: '🪓',
        baseHP: 1100, baseDamage: 25, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_executioner: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'axe_pendulum', intervalBase: 17000, intervalVariance: 4000, handler: '_mechAxePendulum' },
            { name: 'guillotine', intervalBase: 16000, intervalVariance: 4000, handler: '_mechGuillotine' },
            { name: 'prior_bomb', intervalBase: 19000, intervalVariance: 4000, handler: '_mechPriorBomb' },
        ],
        onInit: (m) => { _nkWatchFinale(m, EXE_FINALE); },
    },
});

// FINAL VERDICT (shared waves): the sentence is read out - read each circle.
const EXE_FINALE = {
    name: 'The Executioner', title: '🪓 FINAL VERDICT', element: null, cls: 'sx-nk-fin-exe', color: '#f87171',
    hint: 'The sentence is read - check each circle!',
    waves: [
        { kind: 'avoid', ms: 2100, dmg: 0.15, extra: 3, label: 'Final Verdict' },
        { kind: 'shelter', ms: 2700, dmg: 0.22, label: 'Final Verdict' },
        { kind: 'avoid', ms: 1900, dmg: 0.15, extra: 4, label: 'Final Verdict' },
        { kind: 'shelter', ms: 2500, dmg: 0.28, label: 'Last Rites' },
    ],
};


//------------------------------------------------------------------------
//-------------------SHARED HELPERS-----------------------------------------------
//------------------------------------------------------------------------

function _exeClamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

// Angle difference wrapped to -PI..PI.
function _exeAngDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
}

// One hit with the boss-ability flash and number.
function _exeStrike(pct, level, abilityName) {
    _nkAbilityHitToast(_nkHit(pct, null, level), 'The Executioner', abilityName, true);
}


//------------------------------------------------------------------------
//-------------------HEADSMAN'S SWING (aimed pendulum arcs)----------------------------
//------------------------------------------------------------------------
const SWING_PASSES = [0, 3, 4, 5];               // arcs per cast, by phase
const SWING_WARN_MS = [0, 1100, 950, 850];       // arc drawn on the floor before the blade moves
const SWING_PASS_MS = [0, 1500, 1300, 1150];     // time for one pass of the blade
const SWING_HALF_ARC = [0, 0.9, 0.95, 1.0];      // half the sweep (radians)
const SWING_DMG = [0, 0.20, 0.24, 0.28];         // share of max life, once per pass
const SWING_BLADE_HALF_R = 50;                   // half the blade across its path
const SWING_BLADE_HALF_LEN = 60;                 // half the blade along its path
const SWING_PLAYER_PAD = 16;                     // player body allowance
const SWING_MIN_R = 220;                         // shortest chain
const SWING_PIVOT_Y = 38;

// Where the chain hangs from: the middle in phase 1, then alternating
// between the left and right third.
function _swingPivot(p, index) {
    const w = window.innerWidth;
    if (p === 1) return { x: w * 0.5, y: SWING_PIVOT_Y };
    return { x: w * (index % 2 === 0 ? 0.3 : 0.7), y: SWING_PIVOT_Y };
}

// Builds one pass: the pivot ring, the floor arc, a ghost blade at the
// starting end and the (hidden) chain. The arc passes through the player.
function _swingMake(run, p, index, pc) {
    const pivot = _swingPivot(p, index);
    const dx = pc.x - pivot.x, dy = pc.y - pivot.y;
    const R = _exeClamp(Math.hypot(dx, dy), SWING_MIN_R, window.innerHeight * 0.92);
    const center = Math.atan2(dy, dx);
    const half = SWING_HALF_ARC[p];
    const dir = index % 2 === 0 ? 1 : -1;
    const a0 = center - half, a1 = center + half;
    const pt = (a) => (pivot.x + Math.cos(a) * R).toFixed(1) + ' ' + (pivot.y + Math.sin(a) * R).toFixed(1);
    const arcEl = _nkEl(run, 'div', 'sx-exe-arc');
    arcEl.innerHTML = '<svg width="' + window.innerWidth + '" height="' + window.innerHeight + '"><path d="M ' + pt(a0)
        + ' A ' + R.toFixed(1) + ' ' + R.toFixed(1) + ' 0 0 1 ' + pt(a1) + '"/></svg>';
    const pivotEl = _nkEl(run, 'div', 'sx-exe-pivot');
    pivotEl.style.transform = 'translate(' + Math.round(pivot.x - 18) + 'px,' + Math.round(pivot.y - 18) + 'px)';
    const chainEl = _nkEl(run, 'div', 'sx-exe-chain');
    chainEl.style.width = Math.round(R) + 'px';
    chainEl.style.display = 'none';
    const axeEl = _nkEl(run, 'div', 'sx-exe-axe sx-exe-axe-ghost');
    const pass = { pivot, R, center, half, dir, arcEl, pivotEl, chainEl, axeEl, t: 0, state: 'warn', hitDone: false, ang: dir > 0 ? a0 : a1 };
    _swingPlace(pass, pass.ang);
    return pass;
}

// Puts the axe head and its chain at an angle on the arc.
function _swingPlace(s, ang) {
    const bx = s.pivot.x + Math.cos(ang) * s.R, by = s.pivot.y + Math.sin(ang) * s.R;
    s.axeEl.style.transform = 'translate(' + Math.round(bx - 60) + 'px,' + Math.round(by - 50) + 'px) rotate(' + (ang + Math.PI / 2).toFixed(4) + 'rad)';
    s.chainEl.style.transform = 'translate(' + Math.round(s.pivot.x) + 'px,' + Math.round(s.pivot.y) + 'px) rotate(' + ang.toFixed(4) + 'rad)';
}

// True when the player's body is inside the blade's box (measured along and
// across the arc, so it does not depend on how the picture is rotated).
function _swingBladeHits(s, ang, pc) {
    const dx = pc.x - s.pivot.x, dy = pc.y - s.pivot.y;
    const rp = Math.hypot(dx, dy);
    const across = Math.abs(rp - s.R);
    const along = Math.abs(_exeAngDiff(Math.atan2(dy, dx), ang)) * rp;
    return across < SWING_BLADE_HALF_R + SWING_PLAYER_PAD && along < SWING_BLADE_HALF_LEN + SWING_PLAYER_PAD;
}

// Advances one pass by dt ms. Returns false once the pass is finished.
function _swingStep(s, dtMs, p, level, pc) {
    s.t += dtMs;
    if (s.state === 'warn') {
        if (s.t < SWING_WARN_MS[p]) return true;
        s.state = 'swing';
        s.t -= SWING_WARN_MS[p];
        s.arcEl.classList.add('sx-exe-arc-live');
        s.axeEl.classList.remove('sx-exe-axe-ghost');
        s.chainEl.style.display = '';
    }
    const u = Math.min(1, s.t / SWING_PASS_MS[p]);
    const sweep = 0.5 - 0.5 * Math.cos(Math.PI * u);     // slow at the ends, fast in the middle
    const start = s.dir > 0 ? s.center - s.half : s.center + s.half;
    s.ang = start + s.dir * s.half * 2 * sweep;
    _swingPlace(s, s.ang);
    if (!s.hitDone && pc && _swingBladeHits(s, s.ang, pc)) {
        s.hitDone = true;
        _exeStrike(SWING_DMG[p], level, "Headsman's Swing");
    }
    if (u < 1) return true;
    [s.arcEl, s.pivotEl, s.chainEl, s.axeEl].forEach(el => { try { el.remove(); } catch (e) {} });
    return false;
}

// A great axe swings along an arc drawn on the floor, aimed through the spot
// you stand on. The next arc is drawn while the last blade is still moving,
// so keep stepping: in, out, or across the arc while the blade is far away.
export function _mechAxePendulum(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const passes = [];
    // pass k starts swinging at WARN + k * PASS; its arc is drawn WARN earlier
    const launchAt = (k) => k * SWING_PASS_MS[p];
    let clock = 0, launched = 0;
    _nkToast('eg_mech_executioner', '🪓 The Executioner: Headsman\'s Swing! Leave the arc!');
    _nkLoop(run, (dtS) => {
        const dt = dtS * 1000;
        clock += dt;
        const pc = _nkPlayerCenter();
        if (pc && launched < SWING_PASSES[p] && clock >= launchAt(launched)) {
            passes.push(_swingMake(run, p, launched, pc));
            launched++;
        }
        for (let i = passes.length - 1; i >= 0; i--) {
            if (!_swingStep(passes[i], dt, p, level, pc)) passes.splice(i, 1);
        }
        return launched < SWING_PASSES[p] || passes.length > 0;
    });
}


//------------------------------------------------------------------------
//-------------------GUILLOTINE (condemned lanes)-----------------------------------
//------------------------------------------------------------------------
const GUILLO_VOLLEYS = [0, 4, 5, 6];             // volleys per cast, by phase
const GUILLO_WARN_MS = [0, 1250, 1100, 1000];    // striped lane shown before the blade falls
const GUILLO_LOCK_MS = 450;                      // the aimed lane stops following you this long before the drop
const GUILLO_STEP_MS = [0, 1500, 1350, 1200];    // time from one volley to the next
const GUILLO_LANE_W = 124;
const GUILLO_DMG = [0, 0.18, 0.22, 0.26];        // share of max life per lane hit
const GUILLO_EXTRAS = [0, 1, 2, 3];              // extra lanes next to the aimed one
const GUILLO_COMB_SPACING = [0, 270, 260, 250];  // comb volley: lane-to-lane distance (strip = spacing - lane width)
const GUILLO_AIM_SPEED = 240;                    // aimed lane drifts after you this fast (px/s) - slower than you walk
const GUILLO_SLAM_MS = 380;                      // how long the fallen blade stays
const GUILLO_PLAYER_PAD = 10;

// Makes one lane element centred at x.
function _guilloLane(run, x) {
    const el = _nkEl(run, 'div', 'sx-exe-lane');
    el.style.width = GUILLO_LANE_W + 'px';
    el.style.transform = 'translateX(' + Math.round(x - GUILLO_LANE_W / 2) + 'px)';
    return el;
}

// Random lane centres at least `gap` px from each other and from `avoid`.
function _guilloExtras(count, avoid, gap) {
    const xs = [];
    const w = window.innerWidth;
    for (let i = 0; i < count; i++) {
        for (let tries = 0; tries < 24; tries++) {
            const x = 60 + Math.random() * (w - 120);
            if (Math.abs(x - avoid) >= gap + 40 && xs.every(o => Math.abs(o - x) >= gap)) { xs.push(x); break; }
        }
    }
    return xs;
}

// Builds a volley. 'aim': one lane follows you plus extras. 'comb': evenly
// spaced lanes with narrow safe strips between them.
function _guilloVolley(run, kind, p, playerX) {
    const lanes = [];
    if (kind === 'aim') {
        lanes.push({ x: playerX, aimed: true, el: _guilloLane(run, playerX) });
        _guilloExtras(GUILLO_EXTRAS[p], playerX, 190).forEach(x => lanes.push({ x, aimed: false, el: _guilloLane(run, x) }));
    } else {
        const sp = GUILLO_COMB_SPACING[p];
        const base = Math.random() * sp - GUILLO_LANE_W;
        for (let x = base; x < window.innerWidth + GUILLO_LANE_W; x += sp) lanes.push({ x, aimed: false, el: _guilloLane(run, x) });
    }
    lanes.forEach(l => l.el.classList.add('sx-exe-lane-warn'));
    return { lanes, t: 0, state: 'warn', hitDone: false };
}

// Advances one volley by dt ms. Returns false once it is finished.
function _guilloStep(v, dtMs, p, level, pr) {
    v.t += dtMs;
    const warn = GUILLO_WARN_MS[p];
    if (v.state === 'warn') {
        if (v.t < warn - GUILLO_LOCK_MS) {
            const pc = _nkPlayerCenter();
            v.lanes.forEach(l => {
                if (!l.aimed || !pc) return;
                const d = pc.x - l.x, step = GUILLO_AIM_SPEED * dtMs / 1000;
                l.x += Math.abs(d) <= step ? d : Math.sign(d) * step;
                l.el.style.transform = 'translateX(' + Math.round(l.x - GUILLO_LANE_W / 2) + 'px)';
            });
        } else {
            v.lanes.forEach(l => { l.el.classList.add('sx-exe-lane-lock'); });
        }
        if (v.t >= warn) {
            v.state = 'slam';
            v.lanes.forEach(l => {
                l.el.classList.remove('sx-exe-lane-warn', 'sx-exe-lane-lock');
                l.el.classList.add('sx-exe-lane-slam');
            });
        }
    }
    if (v.state === 'slam') {
        if (!v.hitDone && pr) {
            v.hitDone = true;
            const hit = v.lanes.some(l => pr.right - GUILLO_PLAYER_PAD > l.x - GUILLO_LANE_W / 2 && pr.left + GUILLO_PLAYER_PAD < l.x + GUILLO_LANE_W / 2);
            if (hit) _exeStrike(GUILLO_DMG[p], level, 'Guillotine');
        }
        if (v.t >= warn + GUILLO_SLAM_MS) {
            v.lanes.forEach(l => { try { l.el.remove(); } catch (e) {} });
            return false;
        }
    }
    return true;
}

// Lanes of the arena are condemned: striped red lanes show where blades will
// fall, and the lane aimed at you turns solid just before the drop. Volleys
// alternate between "one lane on you" and "a comb with narrow safe strips".
export function _mechGuillotine(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const volleys = [];
    let launched = 0, untilNext = 500;
    _nkToast('eg_mech_executioner_guillotine', '🪓 The Executioner: Guillotine! Leave the red lanes!');
    _nkLoop(run, (dtS) => {
        const dt = dtS * 1000;
        untilNext -= dt;
        if (launched < GUILLO_VOLLEYS[p] && untilNext <= 0) {
            const pc = _nkPlayerCenter();
            volleys.push(_guilloVolley(run, launched % 2 === 0 ? 'aim' : 'comb', p, pc ? pc.x : window.innerWidth / 2));
            launched++;
            untilNext = GUILLO_STEP_MS[p];
        }
        const pr = _nkPlayerRect();
        for (let i = volleys.length - 1; i >= 0; i--) {
            if (!_guilloStep(volleys[i], dt, p, level, pr)) volleys.splice(i, 1);
        }
        return launched < GUILLO_VOLLEYS[p] || volleys.length > 0;
    });
}
