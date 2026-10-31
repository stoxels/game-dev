import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkToast, _nkWatchFinale } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE DREADNOUGHT (boss_dreadnought)------------------
//------------------------------------------------------------------------
// Pinnacle battleship: the arena is its gun deck.
//  - BROADSIDES: gun ports light up along the flanks and mark lanes across the
//    arena. After the warning a shell races down each marked lane - cross a
//    lane before the shell arrives or right behind it. One lane is aimed at
//    you; later volleys fire from both flanks at once.
//  - SEARCHLIGHT: a lamp creeps after you, then locks (turns red) and a shell
//    lands in its circle. Walk out of the circle while it is red.
//  - At 10%: FINAL SALVO (shared finale waves).
//
// Shared mechanics (corrupt_cells) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_dreadnought: {
        id: 'boss_dreadnought', name: 'The Dreadnought', emoji: '🛳️',
        baseHP: 1220, baseDamage: 27, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_dreadnought: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.25 },
            { threshold: 0.30, chargeMax: 9, damageMultiplier: 1.50 },
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'broadsides', intervalBase: 17000, intervalVariance: 4000, handler: '_mechBroadsides' },
            { name: 'searchlight', intervalBase: 18000, intervalVariance: 4000, handler: '_mechSearchlight' },
            { name: 'corrupt_cells', intervalBase: 20000, intervalVariance: 4000, handler: '_mechCorruptCells' },
        ],
        onInit: (m) => { _nkWatchFinale(m, DRE_FINALE); },
    },
});

// FINAL SALVO (shared waves): every gun fires - read each circle.
const DRE_FINALE = {
    name: 'The Dreadnought', title: '🛳️ FINAL SALVO', element: 'fire', cls: 'sx-nk-fin-dre', color: '#fb923c',
    hint: 'Every gun fires - check each circle!',
    waves: [
        { kind: 'avoid', ms: 2100, dmg: 0.15, extra: 3, label: 'Final Salvo' },
        { kind: 'shelter', ms: 2700, dmg: 0.22, label: 'Final Salvo' },
        { kind: 'avoid', ms: 1900, dmg: 0.15, extra: 4, label: 'Final Salvo' },
        { kind: 'shelter', ms: 2500, dmg: 0.28, label: 'Broadside Barrage' },
    ],
};


//------------------------------------------------------------------------
//-------------------SHARED HELPERS-----------------------------------------------
//------------------------------------------------------------------------

// One hit with the boss-ability flash and number.
function _dreStrike(pct, level, abilityName) {
    _nkAbilityHitToast(_nkHit(pct, 'fire', level), 'The Dreadnought', abilityName, true);
}

// Keeps a coordinate inside the playable part of the screen (clear of the inventory bar).
function _dreClamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}


//------------------------------------------------------------------------
//-------------------BROADSIDES (marked lanes, racing shells)----------------------------
//------------------------------------------------------------------------
const BROAD_VOLLEYS = [0, 3, 4, 5];              // volleys per cast, by phase
const BROAD_LANES = [0, 2, 3, 3];                // lanes per volley, by phase
const BROAD_WARN_MS = [0, 1250, 1100, 1000];     // lanes shown before the shells leave
const BROAD_STEP_MS = [0, 1700, 1500, 1350];     // time from one volley to the next
const BROAD_SHELL_SPEED = [0, 720, 800, 880];    // px/s
const BROAD_LANE_H = 84;                         // lane height = the shell's hit height
const BROAD_LANE_GAP = 150;                      // clear space kept between two lanes
const BROAD_SHELL_FRONT = 36;                    // how far ahead of its centre a shell hits
const BROAD_SHELL_TAIL = 70;                     // and how far behind
const BROAD_DMG = [0, 0.14, 0.17, 0.20];         // share of max life per shell

// Picks lane heights: the first one aimed at the player, the rest spread out
// with BROAD_LANE_GAP clear between them, so there is always room to stand.
function _broadPickLanes(count, playerY) {
    const H = window.innerHeight;
    const lo = 90 + BROAD_LANE_H / 2, hi = H - 120 - BROAD_LANE_H / 2;
    const ys = [_dreClamp(playerY, lo, hi)];
    const pitch = BROAD_LANE_H + BROAD_LANE_GAP;
    for (let i = 1; i < count; i++) {
        for (let tries = 0; tries < 30; tries++) {
            const y = lo + Math.random() * (hi - lo);
            if (ys.every(o => Math.abs(o - y) >= pitch)) { ys.push(y); break; }
        }
    }
    return ys;
}

// Builds one volley: a lane band, a glowing gun port at the muzzle end and a
// (not yet flying) shell per lane. dirs: +1 fires left to right, -1 right to left.
function _broadMakeVolley(run, ys, dirs) {
    const W = window.innerWidth;
    return ys.map((y, i) => {
        const dir = dirs[i];
        const laneEl = _nkEl(run, 'div', 'sx-dre-lane sx-dre-lane-warn');
        laneEl.style.transform = 'translateY(' + Math.round(y - BROAD_LANE_H / 2) + 'px)';
        laneEl.style.height = BROAD_LANE_H + 'px';
        const portEl = _nkEl(run, 'div', 'sx-dre-port sx-dre-port-warn');
        portEl.style.transform = 'translate(' + (dir > 0 ? 0 : W - 46) + 'px,' + Math.round(y - 23) + 'px)';
        return { y, dir, laneEl, portEl, shellEl: null, x: dir > 0 ? -BROAD_SHELL_FRONT : W + BROAD_SHELL_FRONT, hitDone: false, state: 'warn', t: 0 };
    });
}

// Advances one lane by dt ms: warning, then a flying shell. Returns false
// once the shell has left the screen.
function _broadStep(run, ln, dtMs, p, level, pr) {
    const W = window.innerWidth;
    ln.t += dtMs;
    if (ln.state === 'warn') {
        if (ln.t < BROAD_WARN_MS[p]) return true;
        ln.state = 'fly';
        ln.laneEl.classList.remove('sx-dre-lane-warn');
        ln.laneEl.classList.add('sx-dre-lane-live');
        ln.portEl.classList.remove('sx-dre-port-warn');
        ln.portEl.classList.add('sx-dre-port-fire');
        ln.shellEl = _nkEl(run, 'div', 'sx-dre-shell' + (ln.dir < 0 ? ' sx-dre-shell-left' : ''));
        ln.shellEl.style.height = BROAD_LANE_H + 'px';
    }
    ln.x += ln.dir * BROAD_SHELL_SPEED[p] * dtMs / 1000;
    ln.shellEl.style.transform = 'translate(' + Math.round(ln.x - (ln.dir > 0 ? BROAD_SHELL_TAIL : BROAD_SHELL_FRONT)) + 'px,' + Math.round(ln.y - BROAD_LANE_H / 2) + 'px)';
    if (!ln.hitDone && pr) {
        const left = ln.x - (ln.dir > 0 ? BROAD_SHELL_TAIL : BROAD_SHELL_FRONT);
        const right = ln.x + (ln.dir > 0 ? BROAD_SHELL_FRONT : BROAD_SHELL_TAIL);
        const inLane = pr.bottom > ln.y - BROAD_LANE_H / 2 && pr.top < ln.y + BROAD_LANE_H / 2;
        if (inLane && pr.right > left && pr.left < right) {
            ln.hitDone = true;
            _dreStrike(BROAD_DMG[p], level, 'Broadsides');
        }
    }
    const gone = ln.dir > 0 ? ln.x > W + BROAD_SHELL_TAIL : ln.x < -BROAD_SHELL_TAIL;
    if (gone) {
        [ln.laneEl, ln.portEl, ln.shellEl].forEach(el => { try { el.remove(); } catch (e) {} });
        return false;
    }
    if (ln.t > BROAD_WARN_MS[p] + 450) ln.portEl.classList.remove('sx-dre-port-fire');
    return true;
}

// Gun ports light up along the flanks and mark lanes; after the warning a
// shell races down each one. Every volley alternates the flank, one lane is
// aimed at you, and the last volleys of the late phases fire from both flanks.
export function _mechBroadsides(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const lanes = [];
    let launched = 0, untilNext = 500;
    _nkToast('eg_mech_dreadnought', '🛳️ The Dreadnought: Broadsides! Leave the marked lanes!');
    _nkLoop(run, (dtS) => {
        const dt = dtS * 1000;
        untilNext -= dt;
        if (launched < BROAD_VOLLEYS[p] && untilNext <= 0) {
            const pc = _nkPlayerCenter();
            const ys = _broadPickLanes(BROAD_LANES[p], pc ? pc.y : window.innerHeight / 2);
            const crossfire = p >= 2 && launched === BROAD_VOLLEYS[p] - 1;
            const dirs = ys.map((_, i) => (crossfire ? (i % 2 === 0 ? 1 : -1) : (launched % 2 === 0 ? 1 : -1)));
            lanes.push(..._broadMakeVolley(run, ys, dirs));
            launched++;
            untilNext = BROAD_STEP_MS[p];
        }
        const pr = _nkPlayerRect();
        for (let i = lanes.length - 1; i >= 0; i--) {
            if (!_broadStep(run, lanes[i], dt, p, level, pr)) lanes.splice(i, 1);
        }
        return launched < BROAD_VOLLEYS[p] || lanes.length > 0;
    });
}


//------------------------------------------------------------------------
//-------------------SEARCHLIGHT (creeping lamp, locked shell)----------------------------
//------------------------------------------------------------------------
const LAMP_COUNT = [0, 1, 1, 2];                 // lamps per cast, by phase
const LAMP_RADIUS = [0, 118, 108, 100];          // circle radius (the shell's hit area)
const LAMP_SPEED = 175;                          // px/s - the lamp creeps slower than you walk
const LAMP_TRACK_MS = [0, 2400, 2100, 1900];     // lamp follows you this long ...
const LAMP_LOCK_MS = [0, 1000, 950, 900];        // ... then turns red and stays put this long
const LAMP_ROUNDS = [0, 3, 3, 3];                // locks per lamp
const LAMP_DMG = [0, 0.16, 0.19, 0.22];          // share of max life per shell
const LAMP_STAGGER_MS = 1300;                    // the second lamp starts this much later
const LAMP_START_DIST = [380, 480];              // a lamp starts this far from you

// Where a lamp starts: a random point 380-480 px from the player, kept on screen.
function _lampStartPoint(pc) {
    const W = window.innerWidth, H = window.innerHeight;
    const a = Math.random() * Math.PI * 2;
    const d = LAMP_START_DIST[0] + Math.random() * (LAMP_START_DIST[1] - LAMP_START_DIST[0]);
    return { x: _dreClamp(pc.x + Math.cos(a) * d, 80, W - 80), y: _dreClamp(pc.y + Math.sin(a) * d, 120, H - 130) };
}

// Moves/draws one lamp circle.
function _lampPlace(lamp, r) {
    lamp.el.style.left = Math.round(lamp.x - r) + 'px';
    lamp.el.style.top = Math.round(lamp.y - r) + 'px';
    lamp.el.style.width = lamp.el.style.height = (r * 2) + 'px';
}

// Advances one lamp by dt ms. Returns false once all its rounds are done.
function _lampStep(run, lamp, dtMs, p, level, pc) {
    const r = LAMP_RADIUS[p];
    if (lamp.delay > 0) { lamp.delay -= dtMs; return true; }
    if (!lamp.el) {
        lamp.el = _nkEl(run, 'div', 'sx-nk-searchlight');
        _lampPlace(lamp, r);
    }
    lamp.t += dtMs;
    if (lamp.state === 'track') {
        if (pc) {
            const dx = pc.x - lamp.x, dy = pc.y - lamp.y;
            const d = Math.hypot(dx, dy) || 1;
            const step = Math.min(d, LAMP_SPEED * dtMs / 1000);
            lamp.x += dx / d * step;
            lamp.y += dy / d * step;
            _lampPlace(lamp, r);
        }
        if (lamp.t >= LAMP_TRACK_MS[p]) { lamp.state = 'lock'; lamp.t = 0; lamp.el.classList.add('sx-dre-lamp-lock'); }
    } else if (lamp.state === 'lock') {
        if (lamp.t >= LAMP_LOCK_MS[p]) {
            lamp.state = 'boom'; lamp.t = 0;
            lamp.el.classList.remove('sx-dre-lamp-lock');
            lamp.el.classList.add('sx-dre-lamp-boom');
            if (pc && Math.hypot(pc.x - lamp.x, pc.y - lamp.y) <= r) _dreStrike(LAMP_DMG[p], level, 'Searchlight');
        }
    } else if (lamp.t >= 380) {
        lamp.el.classList.remove('sx-dre-lamp-boom');
        lamp.round++;
        if (lamp.round >= LAMP_ROUNDS[p]) { try { lamp.el.remove(); } catch (e) {} return false; }
        lamp.state = 'track'; lamp.t = 0;
    }
    return true;
}

// A lamp creeps after you, then locks and turns red; a shell lands in its
// circle. Walk out of the circle while it is red - the lamp is slower than you.
export function _mechSearchlight(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const start = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const lamps = [];
    for (let i = 0; i < LAMP_COUNT[p]; i++) {
        const pt = _lampStartPoint(start);
        lamps.push({ x: pt.x, y: pt.y, el: null, state: 'track', t: 0, round: 0, delay: i * LAMP_STAGGER_MS });
    }
    _nkToast('eg_mech_searchlight', '🛳️ The Dreadnought: Searchlight! When it turns red, walk out!');
    _nkLoop(run, (dtS) => {
        const dt = dtS * 1000;
        const pc = _nkPlayerCenter();
        for (let i = lamps.length - 1; i >= 0; i--) {
            if (!_lampStep(run, lamps[i], dt, p, level, pc)) lamps.splice(i, 1);
        }
        return lamps.length > 0;
    });
}
