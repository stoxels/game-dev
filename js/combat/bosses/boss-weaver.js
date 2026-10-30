import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkToast, _nkWatchFinale, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE WEAVER (boss_weaver)-----------------------------
//------------------------------------------------------------------------
// Spider-at-the-loom homage: the arena is the web.
//  - LOOM: a woven net of violet threads sweeps across the arena with ONE
//    green lane left open. Dashed threads are only a warning; they snap
//    taut a moment later. Nets alternate up-down / left-right, so you walk
//    from lane to lane. The last net of the late phases crosses both ways.
//  - WEB WHEEL: a spoked web opens near you and spins. You start in the gap
//    between two spokes; walk around the hub with the gap (closer to the
//    hub the wheel turns slower). It pauses and reverses in later phases.
//  - At 10%: FINAL WEAVE (shared finale waves).
//
// Shared mechanics (prior_bomb) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_weaver: {
        id: 'boss_weaver', name: 'The Weaver', emoji: '🕸️',
        baseHP: 1060, baseDamage: 24, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_weaver: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'thread_grid', intervalBase: 16000, intervalVariance: 4000, handler: '_mechThreadGrid' },
            { name: 'web_wheel', intervalBase: 18000, intervalVariance: 4000, handler: '_mechWebWheel' },
            { name: 'prior_bomb', intervalBase: 19000, intervalVariance: 4000, handler: '_mechPriorBomb' },
        ],
        onInit: (m) => { _nkWatchFinale(m, WVR_FINALE); },
    },
});

// FINAL WEAVE (shared waves): the loom goes dark - read each circle.
const WVR_FINALE = {
    name: 'The Weaver', title: '🕸️ FINAL WEAVE', element: 'shadow', cls: 'sx-nk-fin-wvr', color: '#c084fc',
    hint: 'The loom goes dark - read each circle!',
    waves: [
        { kind: 'avoid', ms: 2100, dmg: 0.15, extra: 3, label: 'Final Weave' },
        { kind: 'shelter', ms: 2700, dmg: 0.22, label: 'Final Weave' },
        { kind: 'avoid', ms: 1900, dmg: 0.15, extra: 4, label: 'Final Weave' },
        { kind: 'shelter', ms: 2500, dmg: 0.28, label: 'Shroud of Silk' },
    ],
};


//------------------------------------------------------------------------
//-------------------SHARED HELPERS-----------------------------------------------
//------------------------------------------------------------------------

function _wvrClamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

// Height of the play area: the window minus the strip the inventory bar uses.
function _wvrPlayH() {
    return window.innerHeight - 70;
}

// One shadow hit with the boss-ability flash and number.
function _wvrStrike(pct, level, abilityName) {
    _nkAbilityHitToast(_nkHit(pct, 'shadow', level), 'The Weaver', abilityName, true);
}


//------------------------------------------------------------------------
//-------------------LOOM (thread nets with one open lane)-----------------------
//------------------------------------------------------------------------
const LOOM_NETS = [0, 3, 4, 5];                  // nets per cast, by phase
const LOOM_WARN_MS = [0, 1300, 1150, 1000];      // dashed warning before the threads snap taut
const LOOM_LIVE_MS = 550;                        // how long the taut threads burn
const LOOM_STEP_EXTRA_MS = 700;                  // pause after a net's burn before the next net launches
const LOOM_SPACING = 96;                         // distance between two threads
const LOOM_GAP_W = [0, 230, 210, 190];           // width of the open lane
const LOOM_THICK = 10;                           // painted thread width
const LOOM_PLAYER_PAD = 6;                       // player body allowance (forgiving)
const LOOM_DMG = [0, 0.14, 0.17, 0.20];          // share of max life per snag
const LOOM_HIT_CD_MS = 800;                      // threads cannot machine-gun
const LOOM_MIN_OFF = 130;                        // the open lane never opens right on you
const LOOM_REACH = 300;                          // ...and never further than a short walk away

// Builds one net: a green lane marker plus thread elements on both sides of
// the open lane. axis 'v' = vertical threads (the lane is a column), 'h' =
// horizontal threads (the lane is a row).
function _loomBuild(run, axis, gapC, p) {
    const span = axis === 'v' ? window.innerWidth : _wvrPlayH() + 70;
    const half = LOOM_GAP_W[p] / 2;
    const lane = _nkEl(run, 'div', 'sx-wvr-lane sx-wvr-lane-' + axis);
    if (axis === 'v') {
        lane.style.left = Math.round(gapC - half) + 'px';
        lane.style.width = Math.round(half * 2) + 'px';
    } else {
        lane.style.top = Math.round(gapC - half) + 'px';
        lane.style.height = Math.round(half * 2) + 'px';
    }
    const threads = [];
    const add = (pos) => {
        if (pos < -10 || pos > span + 10) return;
        const el = _nkEl(run, 'div', 'sx-wvr-thread sx-wvr-thread-' + axis + ' sx-wvr-warn');
        el.style[axis === 'v' ? 'left' : 'top'] = Math.round(pos - LOOM_THICK / 2) + 'px';
        threads.push({ pos, el });
    };
    for (let k = 0; k * LOOM_SPACING < span; k++) {
        add(gapC + half + k * LOOM_SPACING);
        add(gapC - half - k * LOOM_SPACING);
    }
    return { axis, lane, threads, gapC };
}

// Picks the centre of the open lane: a short walk away from where the player
// is expected to be (always flipped inward when it would leave the screen).
function _loomPickGap(axis, here, p) {
    const max = axis === 'v' ? window.innerWidth : _wvrPlayH();
    const half = LOOM_GAP_W[p] / 2;
    const off = LOOM_MIN_OFF + Math.random() * (LOOM_REACH - LOOM_MIN_OFF);
    let dir = Math.random() < 0.5 ? -1 : 1;
    const inside = (c) => c >= half + 30 && c <= max - half - 30;
    if (!inside(here + dir * off)) dir = -dir;
    return _wvrClamp(here + dir * off, half + 30, max - half - 30);
}

// Which nets a cast weaves, in order. 'x' = both directions at once.
function _loomPlan(p) {
    const order = Math.random() < 0.5 ? ['v', 'h'] : ['h', 'v'];
    const out = [];
    for (let i = 0; i < LOOM_NETS[p]; i++) out.push(order[i % 2]);
    if (p === 3) out[out.length - 1] = 'x';
    return out;
}

// True when the player's body overlaps a taut thread of this net.
function _loomCaught(net, pr) {
    const t = LOOM_THICK / 2;
    return net.threads.some(th => net.axis === 'v'
        ? (pr.right - LOOM_PLAYER_PAD > th.pos - t && pr.left + LOOM_PLAYER_PAD < th.pos + t)
        : (pr.bottom - LOOM_PLAYER_PAD > th.pos - t && pr.top + LOOM_PLAYER_PAD < th.pos + t));
}

// Turns a net's dashed threads into taut, burning ones.
function _loomGoLive(layers) {
    layers.forEach(net => {
        net.lane.classList.add('sx-wvr-lane-live');
        net.threads.forEach(th => { th.el.classList.remove('sx-wvr-warn'); th.el.classList.add('sx-wvr-live'); });
    });
}

// Fades a spent net out and removes it shortly after.
function _loomRetire(run, layers) {
    const all = [];
    layers.forEach(net => { all.push(net.lane); net.threads.forEach(th => all.push(th.el)); });
    all.forEach(el => el.classList.add('sx-wvr-spent'));
    run.timers.push(setTimeout(() => all.forEach(el => { try { el.remove(); } catch (e) {} }), 400));
}

// A woven net sweeps the arena with one green lane left open. Dashed threads
// warn, then snap taut for half a second: be inside the green lane. Nets
// alternate direction, so you hop from a column lane to a row lane.
export function _mechThreadGrid(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const plan = _loomPlan(p);
    const pc0 = _nkPlayerCenter() || { x: window.innerWidth / 2, y: _wvrPlayH() / 2 };
    const expect = { x: pc0.x, y: pc0.y };      // where the player should be after the last lane
    const nets = [];                             // { layers, t, live }
    const stepMs = LOOM_WARN_MS[p] * 0.55 + LOOM_LIVE_MS + LOOM_STEP_EXTRA_MS;
    let launched = 0, untilNext = 600, cdUntil = 0;
    _nkToast('eg_mech_weaver', '🕸️ The Weaver: Loom! Stand in the green lane!');
    _nkLoop(run, (dtS, now) => {
        const dt = dtS * 1000;
        untilNext -= dt;
        if (launched < plan.length && untilNext <= 0) {
            const kind = plan[launched++];
            untilNext = stepMs;
            const axes = kind === 'x' ? ['v', 'h'] : [kind];
            const layers = axes.map(ax => {
                const key = ax === 'v' ? 'x' : 'y';
                const gap = _loomPickGap(ax, expect[key], p);
                expect[key] = gap;
                return _loomBuild(run, ax, gap, p);
            });
            nets.push({ layers, t: 0, live: false });
        }
        const pr = _nkPlayerRect();
        for (let i = nets.length - 1; i >= 0; i--) {
            const n = nets[i];
            n.t += dt;
            if (!n.live && n.t >= LOOM_WARN_MS[p]) { n.live = true; _loomGoLive(n.layers); }
            if (n.live && pr && now >= cdUntil && n.layers.some(net => _loomCaught(net, pr))) {
                cdUntil = now + LOOM_HIT_CD_MS;
                _wvrStrike(LOOM_DMG[p], level, 'Loom');
            }
            if (n.t >= LOOM_WARN_MS[p] + LOOM_LIVE_MS) {
                _loomRetire(run, n.layers);
                nets.splice(i, 1);
            }
        }
        return launched < plan.length || nets.length > 0;
    });
}


//------------------------------------------------------------------------
//-------------------WEB WHEEL (spoked web that spins)-------------------------------
//------------------------------------------------------------------------
const WHEEL_SPOKES = [0, 5, 6, 6];               // spokes per wheel, by phase
const WHEEL_OMEGA = [0, 0.75, 0.95, 1.1];        // spin speed (rad/s)
const WHEEL_WARN_MS = [0, 1300, 1150, 1000];     // frozen dashed wheel before it starts to spin
const WHEEL_SPIN_MS = [0, 6000, 6500, 7000];
const WHEEL_FLIPS = [0, 0, 1, 2];                // pause-and-reverse count
const WHEEL_PAUSE_MS = 500;                      // the wheel stops this long before reversing
const WHEEL_HUB_DIST = [0, 250, 270, 290];       // hub opens this far from you
const WHEEL_DMG = [0, 0.10, 0.12, 0.14];         // share of max life per spoke touch
const WHEEL_HIT_CD_MS = 700;
const WHEEL_HALF_W = 7;                          // painted spoke half width
const WHEEL_PLAYER_PAD = 18;                     // player body allowance on top of that
const WHEEL_OUT_MS = 300;                        // fade-out at the end
const WHEEL_RINGS = [130, 260, 390];             // decorative web rings

// Picks the hub position: a set distance from the player, kept on screen.
function _wheelPickHub(pc, p) {
    const w = window.innerWidth, h = _wvrPlayH();
    let hub = null;
    for (let i = 0; i < 14 && !hub; i++) {
        const a = Math.random() * Math.PI * 2;
        const x = pc.x + Math.cos(a) * WHEEL_HUB_DIST[p], y = pc.y + Math.sin(a) * WHEEL_HUB_DIST[p];
        if (x > 150 && x < w - 150 && y > 130 && y < h - 130) hub = { x, y };
    }
    return hub || { x: _wvrClamp(pc.x + WHEEL_HUB_DIST[p], 150, w - 150), y: _wvrClamp(pc.y, 130, h - 130) };
}

// Builds the hub, the decorative rings and the spokes. The wheel is aimed so
// the player starts in the middle of a gap between two spokes.
function _wheelBuild(run, hub, pc, p) {
    const n = WHEEL_SPOKES[p];
    const wedge = Math.PI * 2 / n;
    const playerAng = Math.atan2(pc.y - hub.y, pc.x - hub.x);
    const len = Math.max(window.innerWidth, window.innerHeight) * 1.2;
    WHEEL_RINGS.forEach(r => {
        const ring = _nkEl(run, 'div', 'sx-wvr-ring');
        ring.style.width = ring.style.height = (r * 2) + 'px';
        ring.style.left = Math.round(hub.x - r) + 'px';
        ring.style.top = Math.round(hub.y - r) + 'px';
    });
    const spokes = [];
    for (let k = 0; k < n; k++) {
        const el = _nkEl(run, 'div', 'sx-wvr-spoke sx-wvr-spoke-warn');
        el.style.width = Math.round(len) + 'px';
        spokes.push({ base: playerAng + wedge / 2 + k * wedge, el });
    }
    const hubEl = _nkEl(run, 'div', 'sx-wvr-hub');
    hubEl.style.left = Math.round(hub.x - 32) + 'px';
    hubEl.style.top = Math.round(hub.y - 32) + 'px';
    return { spokes, hubEl, len };
}

// Places every spoke for the current wheel angle. (One transform string -
// the separate `rotate` property orbits the screen corner on fixed
// elements in Chromium.)
function _wheelPlace(wheel, hub, ang) {
    wheel.spokes.forEach(s => {
        s.el.style.transform = 'translate(' + Math.round(hub.x) + 'px,' + Math.round(hub.y) + 'px) rotate(' + (s.base + ang).toFixed(4) + 'rad)';
    });
}

// True when the player's body touches any spoke.
function _wheelTouched(wheel, hub, ang, pc) {
    return wheel.spokes.some(s => {
        const a = s.base + ang;
        const ex = hub.x + Math.cos(a) * wheel.len, ey = hub.y + Math.sin(a) * wheel.len;
        return _ptSegDist(pc.x, pc.y, hub.x, hub.y, ex, ey) < WHEEL_HALF_W + WHEEL_PLAYER_PAD;
    });
}

// A spoked web opens a short walk from you with you standing in a gap. After
// a dashed warning it spins: walk around the hub with the gap (the wheel is
// slower close to the hub). In later phases it stops, flashes and reverses.
export function _mechWebWheel(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const pc = _nkPlayerCenter();
    if (!pc) return;
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const hub = _wheelPickHub(pc, p);
    const wheel = _wheelBuild(run, hub, pc, p);
    const flipAt = [];
    for (let i = 1; i <= WHEEL_FLIPS[p]; i++) flipAt.push(WHEEL_SPIN_MS[p] * i / (WHEEL_FLIPS[p] + 1));
    let t = 0, spin = 0, ang = 0, dir = Math.random() < 0.5 ? -1 : 1, pause = 0, cdUntil = 0, state = 'warn';
    _wheelPlace(wheel, hub, 0);
    _nkToast('eg_mech_weaver_wheel', '🕸️ The Weaver: Web Wheel! Walk with the gap!');
    _nkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        if (state === 'warn' && t >= WHEEL_WARN_MS[p]) {
            state = 'spin';
            wheel.spokes.forEach(s => { s.el.classList.remove('sx-wvr-spoke-warn'); });
        } else if (state === 'spin') {
            if (pause > 0) {
                pause -= dtS * 1000;
                if (pause <= 0) { dir = -dir; wheel.hubEl.classList.remove('sx-wvr-hub-flash'); }
            } else {
                spin += dtS * 1000;
                ang += dir * WHEEL_OMEGA[p] * dtS;
                if (flipAt.length && spin >= flipAt[0]) {
                    flipAt.shift();
                    pause = WHEEL_PAUSE_MS;
                    wheel.hubEl.classList.add('sx-wvr-hub-flash');
                }
            }
            _wheelPlace(wheel, hub, ang);
            const pcNow = _nkPlayerCenter();
            if (pcNow && now >= cdUntil && _wheelTouched(wheel, hub, ang, pcNow)) {
                cdUntil = now + WHEEL_HIT_CD_MS;
                _wvrStrike(WHEEL_DMG[p], level, 'Web Wheel');
            }
            if (spin >= WHEEL_SPIN_MS[p]) {
                state = 'out';
                t = 0;
                wheel.spokes.forEach(s => s.el.classList.add('sx-wvr-spent'));
                wheel.hubEl.classList.add('sx-wvr-spent');
            }
        } else if (state === 'out' && t >= WHEEL_OUT_MS) {
            return false;
        }
        return true;
    });
}
