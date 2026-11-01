import { Audio_Manager } from '../../audio/audio.js';
import { _renderPanel, _spawnMonster } from '../encounter.js';
import { MAX_CONCURRENT_MONSTERS } from '../combat-monsters.js';
import { BOSS_DEFS, BOSS_MECHANICS, _bossScheduleMechanics } from './boss-framework.js';
import { _nkAbilityHitToast, _nkCircleHit, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE AEGIS (boss_aegis)-------------------------
//------------------------------------------------------------------------
// Walking-castle bulwark gauntlet: a guard squad shields the boss until
// killed, shield charges barrel down your row, sentry orbs and a sweeping
// guard rotor join at 60%; at ≤10% THE LAST BASTION: sweeping beams, and
// green breach rings to fill one by one to crack the boss's shield.
//------------------------------------------------------------------------

export const _AG_DEBUG_SLOW = false;
export const _AG_DEBUG_MULT = _AG_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_aegis: {
        id: 'boss_aegis', name: 'The Aegis', emoji: '🛡️',
        baseHP: 1150, baseDamage: 20, chargeMax: 14,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_aegis: {
        phases: [
            { threshold: 1.00, chargeMax: 14, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 12, damageMultiplier: 1.25 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.50 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'aegis_protocol', intervalBase: 24000, intervalVariance: 5000, handler: '_mechAgAegisProtocol' },
            { name: 'shield_charge', intervalBase: 19000, intervalVariance: 4500, handler: '_mechAgShieldCharge' },
            { name: 'sentry_shields', intervalBase: 20000, intervalVariance: 5000, handler: '_mechAgSentries', phase2Only: true },
            { name: 'guard_rotor', intervalBase: 21000, intervalVariance: 5000, handler: '_mechAgGuardRotor', phase2Only: true },
        ],
        onPhaseEnter: _agOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
export const AG_CHARGE_DMG = [0, 0.18, 0.21, 0.24];   // shield charge lane
export const AG_ORB_DMG    = [0, 0, 0.13, 0.16];      // sentry orb contact
export const AG_ROTOR_DMG  = [0, 0, 0.12, 0.15];      // rotor arm contact
export const AG_BEAM_DMG   = 0.12;                    // bastion beam contact
export const AG_HIT_CD_MS  = 700;                     // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Aegis hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
export let _agHitCd = 0;
export function _agTouch(pct, level, label) {
    const now = performance.now();
    if (now < _agHitCd) return false;
    const pr = _nkPlayerRect();
    if (!pr) return false;
    _agHitCd = now + AG_HIT_CD_MS;
    const dealt = _nkHit(pct, 'cold', level);
    _nkAbilityHitToast(dealt, 'The Aegis', label);
    return true;
}

// Arena-wide glow so the shielded state reads at a glance (managed element,
// not a body class - flashes own the body pseudo-elements).
export let _agGlowEl = null;
export function _agAegisGlow(on) {
    if (on) {
        if (_agGlowEl) return;
        _agGlowEl = document.createElement('div');
        _agGlowEl.className = 'sx-ag-aegisglow';
        document.body.appendChild(_agGlowEl);
    } else {
        if (_agGlowEl) { try { _agGlowEl.remove(); } catch (e) {} _agGlowEl = null; }
    }
}

// Stone-shard burst where a slam or charge lands (visual only, body-level
// so it survives the run ending in the same frame).
export function _agDebris(x, y, big) {
    const layer = document.createElement('div');
    layer.className = 'sx-ag-debris' + (big ? ' sx-ag-debris-big' : '');
    layer.style.left = Math.round(x) + 'px';
    layer.style.top = Math.round(y) + 'px';
    document.body.appendChild(layer);
    for (let i = 0; i < (big ? 11 : 6); i++) {
        const s = document.createElement('div');
        s.className = 'sx-ag-shard';
        const ang = Math.random() * Math.PI * 2;
        const dist = 22 + Math.random() * (big ? 86 : 48);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 26) + 'px');
        s.style.setProperty('--rot', Math.round((Math.random() * 2 - 1) * 420) + 'deg');
        s.style.animationDelay = (Math.random() * 100) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, _AG_DEBUG_SLOW ? 1800 : 900);
}


//------------------------------------------------------------------------
//-------------------MECHANIC: AEGIS PROTOCOL (signature)-------------------
//------------------------------------------------------------------------
// The boss summons a guard squad and goes IMMUNE while they live - kill
// the guards to break the shield (40s failsafe). Upgraded: guards wear a
// pulsing guardian ring and the arena glows while the aegis is up, so the
// state reads at a glance.
export function _mechAgAegisProtocol(monster, phase) {
    if (!monster || monster.aegisUp || _nkFrozen() || _agFinalActive()) return;
    if (typeof _spawnMonster !== 'function') return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = p >= 3 ? 3 : 2;
    const level = Math.max(1, Math.round(monster.level || 1));
    const pool = ['slime', 'ghost', 'rat', 'bat', 'bee'];
    const cap = (typeof MAX_CONCURRENT_MONSTERS !== 'undefined') ? MAX_CONCURRENT_MONSTERS : 6;
    const before = (typeof _monsters !== 'undefined') ? globalThis._monsters.length : 0;
    for (let i = 0; i < count; i++) {
        if (typeof _monsters !== 'undefined' && globalThis._monsters.length >= cap) break;
        _spawnMonster(pool[Math.floor(Math.random() * pool.length)], level);
    }
    const fresh = (typeof _monsters !== 'undefined')
        ? globalThis._monsters.slice(before).filter(m => !m.isBoss) : [];
    fresh.forEach(a => { a.aegisOf = monster.id; });
    if (fresh.length === 0) return;

    monster.aegisUp = true;
    monster.bossImmune = true;
    const card = document.getElementById('sx-card-' + monster.id);
    if (card) card.classList.add('sx-nk-shielded');
    Audio_Manager.playSFX('boss_shield_up');
    // Arena glow so the shielded state reads at a glance.
    _agAegisGlow(true);
    _nkToast('eg_mech_aegis', '🛡️ The Aegis: Aegis Protocol! Kill the guards to break the shield!', '#7dd3fc');
    if (typeof _renderPanel === 'function') { try { _renderPanel(); } catch (e) {} }

    const run = _nkNewRun(monster.id, false);
    let e = 0;
    _nkLoop(run, (dtS) => {
        e += dtS * 1000;
        const boss = (typeof _monsters !== 'undefined')
            ? globalThis._monsters.find(m => m.id === monster.id) : null;
        if (!boss) {
            _agAegisGlow(false);
            return false;
        }
        const alive = (typeof _monsters !== 'undefined')
            && globalThis._monsters.some(m => m.aegisOf === monster.id && m.currentHP > 0);
        if (_agFinalActive()) { _agAegisGlow(false); return false; }
        if (!alive || e > 40000) {
            boss.aegisUp = false;
            boss.bossImmune = false;
            const c2 = document.getElementById('sx-card-' + monster.id);
            if (c2) c2.classList.remove('sx-nk-shielded');
            Audio_Manager.playSFX('boss_shield_down');
            _agAegisGlow(false);
            _nkToast('eg_mech_aegis_down', '🛡️ Aegis shield down - burn the boss!', '#4ade80');
            if (typeof _renderPanel === 'function') { try { _renderPanel(); } catch (e2) {} }
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: SHIELD CHARGE--------------------------------
//------------------------------------------------------------------------
// The boss picks your row and BARRELS across it behind its shield. The
// first charge aims at your current row; the rest aim nearby. Standing in
// an active lane bites.
export const AG_CHARGE_COUNT = [0, 2, 2, 3];
export const AG_CHARGE_BAND  = [0, 120, 130, 140];
export const AG_CHARGE_SPEED = [0, 620, 700, 780];

export function _mechAgShieldCharge(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = AG_CHARGE_COUNT[p];
    const bandH = AG_CHARGE_BAND[p];
    const speed = AG_CHARGE_SPEED[p] / _AG_DEBUG_MULT;
    const warnMs = 1100 * _AG_DEBUG_MULT;
    const gapMs = 1700 * _AG_DEBUG_MULT;
    const dmgPct = AG_CHARGE_DMG[p];

    const charges = [];
    const c0 = _nkPlayerCenter();
    let lastY = c0 ? c0.y : H / 2;
    for (let i = 0; i < count; i++) {
        const y = i === 0 ? lastY
            : Math.max(90, Math.min(H - 90, lastY + (Math.random() * 2 - 1) * 260));
        lastY = y;
        const fromLeft = Math.random() < 0.5;
        const warn = _nkEl(run, 'div', 'sx-ag-chargewarn');
        warn.style.left = '0px';
        warn.style.width = W + 'px';
        warn.style.top = Math.round(y - bandH / 2) + 'px';
        warn.style.height = bandH + 'px';
        warn.classList.add(fromLeft ? 'sx-ag-from-left' : 'sx-ag-from-right');
        charges.push({ y, fromLeft, warn, el: null, at: warnMs + i * gapMs, x: 0, done: false });
    }

    _nkToast('eg_mech_ag_charge', '🛡️ The Aegis: SHIELD CHARGE - out of the lane!', '#e2e8f0');

    let t = 0, touchCd = 0;
    _nkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _nkPlayerRect();
        let active = false;
        charges.forEach(ch => {
            if (ch.done) return;
            if (!ch.el) {
                if (t < ch.at) return;
                try { ch.warn.remove(); } catch (e) {}
                const el = _nkEl(run, 'div', 'sx-ag-charger');
                el.style.top = Math.round(ch.y - bandH * 0.45) + 'px';
                el.style.height = Math.round(bandH * 0.9) + 'px';
                ch.x = ch.fromLeft ? -110 : W + 20;
                el.style.left = Math.round(ch.x) + 'px';
                el.classList.add(ch.fromLeft ? 'sx-ag-from-left' : 'sx-ag-from-right');
                ch.el = el;
                _agDebris(ch.fromLeft ? 40 : W - 40, ch.y, false);
                return;
            }
            ch.x += (ch.fromLeft ? 1 : -1) * speed * dtS;
            ch.el.style.left = Math.round(ch.x) + 'px';
            if (ch.x < -130 || ch.x > W + 130) {
                ch.done = true;
                try { ch.el.remove(); } catch (e) {}
                return;
            }
            active = true;
            // Standing in an active lane bites.
            if (pr && now >= touchCd) {
                const py = pr.top + pr.height / 2;
                if (Math.abs(py - ch.y) < bandH / 2 + 8) {
                    touchCd = now + AG_HIT_CD_MS;
                    _agTouch(dmgPct, level, 'Shield Charge');
                }
            }
        });
        return active || charges.some(ch => !ch.done);
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: SENTRY SHIELDS (phase 2+)--------------------
//------------------------------------------------------------------------
// Sentry shields plant at the edges and hurl slow tracking orbs at you for
// a while. Strafe the orbs - they home, but they are slow.
export const AG_SENTRY_COUNT = [0, 0, 2, 3];
export const AG_SENTRY_LIFE  = 6500;
export const AG_ORB_SPEED    = 130;
export const AG_ORB_LIFE     = 6000;

export function _mechAgSentries(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = AG_SENTRY_COUNT[p];
    const durMs = AG_SENTRY_LIFE * _AG_DEBUG_MULT;
    const fireGap = 1600 * _AG_DEBUG_MULT;
    const orbSpeed = AG_ORB_SPEED / _AG_DEBUG_MULT;
    const dmgPct = AG_ORB_DMG[p];

    const edges = [
        [70, 90], [W - 70, 90], [70, H * 0.55], [W - 70, H * 0.55],
    ];
    const sentries = [];
    for (let i = 0; i < count; i++) {
        const spot = edges.splice(Math.floor(Math.random() * edges.length), 1)[0] || [W / 2, 70];
        const el = _nkEl(run, 'div', 'sx-ag-sentry');
        el.style.left = Math.round(spot[0] - 26) + 'px';
        el.style.top = Math.round(spot[1] - 26) + 'px';
        sentries.push({ x: spot[0], y: spot[1], el, nextFire: 900 * _AG_DEBUG_MULT + i * 500 * _AG_DEBUG_MULT });
    }

    _nkToast('eg_mech_ag_sentries', '🛡️ The Aegis: SENTRY SHIELDS - dodge the orbs!', '#e2e8f0');

    const orbs = [];
    let t = 0, touchCd = 0;
    _nkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const c = _nkPlayerCenter();
        sentries.forEach(s => {
            if (t >= s.nextFire && orbs.filter(o => !o.dead && o.home === s).length < 2) {
                s.nextFire = t + fireGap;
                const el = _nkEl(run, 'div', 'sx-ag-orb');
                el.style.left = Math.round(s.x - 13) + 'px';
                el.style.top = Math.round(s.y - 13) + 'px';
                const dx = c ? c.x - s.x : 1, dy = c ? c.y - s.y : 0;
                const dl = Math.hypot(dx, dy) || 1;
                orbs.push({ x: s.x, y: s.y, vx: dx / dl * orbSpeed, vy: dy / dl * orbSpeed, home: s, el, born: t, dead: false });
            }
        });
        const pr = _nkPlayerRect();
        orbs.forEach(o => {
            if (o.dead) return;
            if (c) {
                // Slow homing: re-aim every tick.
                const dx = c.x - o.x, dy = c.y - o.y;
                const dl = Math.hypot(dx, dy) || 1;
                o.vx += (dx / dl * orbSpeed - o.vx) * 0.08;
                o.vy += (dy / dl * orbSpeed - o.vy) * 0.08;
            }
            o.x += o.vx * dtS;
            o.y += o.vy * dtS;
            o.el.style.left = Math.round(o.x - 13) + 'px';
            o.el.style.top = Math.round(o.y - 13) + 'px';
            if (pr && now >= touchCd && _nkCircleHit(o.x, o.y, 16, pr, 0)) {
                touchCd = now + AG_HIT_CD_MS;
                o.dead = true;
                try { o.el.remove(); } catch (e) {}
                _agTouch(dmgPct, level, 'Sentry Orb');
                return;
            }
            if (t - o.born > AG_ORB_LIFE * _AG_DEBUG_MULT || o.x < -40 || o.x > W + 40 || o.y < -40 || o.y > H + 40) {
                o.dead = true;
                try { o.el.remove(); } catch (e) {}
            }
        });
        if (t >= durMs) {
            sentries.forEach(s => { try { s.el.remove(); } catch (e) {} });
            orbs.forEach(o => { if (!o.dead) { o.dead = true; try { o.el.remove(); } catch (e) {} } });
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: GUARD ROTOR (field, phase 2+)----------------
//------------------------------------------------------------------------
// Two guardian orbs tether a beam that sweeps around a pivot like a radar
// blade. Stay off the arms!
export const AG_ROTOR_LIFE = [0, 0, 6500, 7500];
export const AG_ROTOR_OMEGA = [0, 0, 75, 95];
export const AG_ROTOR_INNER = 80;
const AG_ROTOR_HALF = 11;                  // half the drawn arm width

export function _mechAgGuardRotor(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const durMs = AG_ROTOR_LIFE[p] * _AG_DEBUG_MULT;
    const warnMs = 1300 * _AG_DEBUG_MULT;
    const omega = AG_ROTOR_OMEGA[p] / _AG_DEBUG_MULT;
    const dmgPct = AG_ROTOR_DMG[p];
    const maxR = Math.hypot(W, H);

    const c = _nkPlayerCenter() || { x: W / 2, y: H / 2 };
    const px = Math.max(260, Math.min(W - 260, c.x));
    const py = Math.max(240, Math.min(H - 240, c.y));

    const pivot = _nkEl(run, 'div', 'sx-ag-rotor-pivot');
    pivot.style.left = Math.round(px) + 'px';
    pivot.style.top = Math.round(py) + 'px';
    const arms = [0, 180].map(() => {
        const el = _nkEl(run, 'div', 'sx-ag-rotor-arm');
        el.style.left = Math.round(px) + 'px';
        el.style.top = Math.round(py - 11) + 'px';
        el.style.width = Math.round(maxR) + 'px';
        return el;
    });

    _nkToast('eg_mech_ag_rotor', '🛡️ The Aegis: GUARD ROTOR - stay off the arms!', '#e2e8f0');

    let t = 0, ang = Math.random() * 360, touchCd = 0, live = false;
    _nkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        if (!live) {
            if (t < warnMs) return true;
            live = true;
        }
        if (t >= warnMs + durMs) {
            arms.forEach(a => { try { a.remove(); } catch (e) {} });
            try { pivot.remove(); } catch (e) {}
            return false;
        }
        ang += omega * dtS;
        arms.forEach((el, i) => { el.style.rotate = (ang + i * 180) + 'deg'; });
        const pc = _nkPlayerCenter();
        if (pc && now >= touchCd) {
            for (let i = 0; i < 2; i++) {
                if (_agArmTouches(pc, px, py, ang + i * 180, AG_ROTOR_INNER, AG_ROTOR_HALF)) {
                    touchCd = now + AG_HIT_CD_MS;
                    _agTouch(dmgPct, level, 'Guard Rotor');
                    break;
                }
            }
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------THE LAST BASTION (≤10% HP finale)---------------------
//------------------------------------------------------------------------
// The boss goes immune behind a stone citadel. A bastion hub at the centre
// sweeps two opposite beams that speed up each time you succeed. Green
// breach rings light up one at a time; stand inside one until it fills to
// crack the shield. The beams cross every ring, so you step out, wait for
// the beam to pass, and step back. The hub itself is safe: cross the arena
// through it. Four rings and the shield breaks. Charge bar frozen for the
// whole set-piece (gate in _tickPlayer via _agFinalActive).
const AG_FINAL_RINGS = 4;
const AG_RING_R = 78;                      // breach ring radius (px)
const AG_RING_HOLD_MS = 2200;              // time inside a ring to fill it
const AG_RING_DRAIN = 0.6;                 // fill lost per second spent outside (× hold speed)
const AG_RING_DIST = [230, 320];           // ring distance from the hub
const AG_HUB_R = 70;                       // safe hub radius (drawn = hit)
const AG_BEAM_HALF = 13;                   // half the drawn beam width
const AG_PLAYER_PAD = 14;                  // the hero's body counts this far from its centre
const AG_BEAM_OMEGA_START = 45;            // deg/s
const AG_BEAM_OMEGA_STEP = 12;             // faster after each ring
const AG_FINAL_INTRO_MS = 2200;            // beams are only a faint warning for this long
const AG_FINAL_RING_GAP_MS = 700;          // pause before the next ring appears
const AG_FINAL_FAILSAFE_MS = 90000;        // the shield never holds forever

// Set while the finale runs (read by _tickPlayer's charge-freeze gate).
export let _agFinal = null;

export function _agFinalActive() {
    return !!_agFinal && !_agFinal.finished;
}

// True when a point (the hero's centre) touches a straight arm that leaves a
// pivot at `arm` degrees: farther than `inner` from the pivot, and closer to
// the arm's centre line than half its drawn width plus the hero's body.
function _agArmTouches(pc, px, py, arm, inner, half) {
    const dx = pc.x - px, dy = pc.y - py;
    if (Math.hypot(dx, dy) <= inner) return false;
    const a = arm * Math.PI / 180;
    const ux = Math.cos(a), uy = Math.sin(a);
    if (dx * ux + dy * uy <= 0) return false;
    return Math.abs(dx * uy - dy * ux) <= half + AG_PLAYER_PAD;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _agOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _agStartFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _agStartFinalWatcher(monster) {
    if (!monster || _agFinal) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (_agFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _agFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Picks where the next breach ring goes: 230-320 px from the hub, on the
// opposite half of the arena from the last one, kept fully on screen.
function _agPickRing(g) {
    const W = window.innerWidth, H = window.innerHeight;
    for (let tries = 0; tries < 24; tries++) {
        const ang = (g.lastRingAng == null ? Math.random() * 360 : g.lastRingAng + 110 + Math.random() * 140) * Math.PI / 180;
        const dist = AG_RING_DIST[0] + Math.random() * (AG_RING_DIST[1] - AG_RING_DIST[0]);
        const x = g.px + Math.cos(ang) * dist, y = g.py + Math.sin(ang) * dist;
        if (x > AG_RING_R + 30 && x < W - AG_RING_R - 30 && y > AG_RING_R + 90 && y < H - AG_RING_R - 90) {
            g.lastRingAng = ang * 180 / Math.PI;
            return { x, y };
        }
    }
    g.lastRingAng = null;
    return { x: g.px + AG_RING_DIST[0], y: g.py };
}

// Shows the next breach ring.
function _agSpawnRing(g) {
    const spot = _agPickRing(g);
    const el = document.createElement('div');
    el.className = 'sx-ag-breach';
    el.style.left = Math.round(spot.x - AG_RING_R) + 'px';
    el.style.top = Math.round(spot.y - AG_RING_R) + 'px';
    el.style.width = el.style.height = (AG_RING_R * 2) + 'px';
    document.body.appendChild(el);
    g.fxRun.els.push(el);
    g.ring = { x: spot.x, y: spot.y, el, p: 0 };
}

// One look at the ring: fills while the hero stands inside, drains slowly
// while outside, and finishes the step (faster beams, next ring) when full.
function _agRingStep(g, dtS) {
    const ring = g.ring;
    if (!ring) {
        g.ringWait -= dtS * 1000;
        if (g.ringWait <= 0) _agSpawnRing(g);
        return;
    }
    const pc = _nkPlayerCenter();
    const inside = !!pc && Math.hypot(pc.x - ring.x, pc.y - ring.y) <= AG_RING_R - 8;
    ring.p = Math.max(0, Math.min(1, ring.p + (inside ? dtS * 1000 : -dtS * 1000 * AG_RING_DRAIN) / AG_RING_HOLD_MS));
    ring.el.style.setProperty('--p', (ring.p * 100).toFixed(1));
    ring.el.classList.toggle('sx-ag-breach-on', inside);
    if (ring.p < 1) return;
    ring.el.classList.add('sx-ag-breach-done');
    g.pips[g.ringIdx].classList.add('on');
    g.ringIdx++;
    g.omega += AG_BEAM_OMEGA_STEP;
    g.ring = null;
    g.ringWait = AG_FINAL_RING_GAP_MS;
}

// Sweeps the two beams and hurts a hero standing on one.
function _agBeamStep(g, dtS, now, level) {
    g.arm += g.omega * dtS;
    g.beams.forEach((el, i) => { el.style.rotate = (g.arm + i * 180) + 'deg'; });
    const pc = _nkPlayerCenter();
    if (!pc || now < g.touchCd) return;
    for (let i = 0; i < 2; i++) {
        if (_agArmTouches(pc, g.px, g.py, g.arm + i * 180, AG_HUB_R, AG_BEAM_HALF)) {
            g.touchCd = now + AG_HIT_CD_MS;
            _agTouch(AG_BEAM_DMG, level, 'Bastion Beam');
            return;
        }
    }
}

// Builds the citadel, hub, beams, ring pips and the title that fades away.
function _agBuildFinale(g) {
    const W = window.innerWidth, H = window.innerHeight;
    g.px = W / 2;
    g.py = H / 2;
    const add = (cls, parent) => {
        const el = document.createElement('div');
        el.className = cls;
        (parent || document.body).appendChild(el);
        if (!parent) g.fxRun.els.push(el);
        return el;
    };
    g.citadel = add('sx-ag-citadel');
    requestAnimationFrame(() => { if (g.citadel) g.citadel.classList.add('sx-ag-citadel-on'); });
    g.bastion = add('sx-ag-bastion');
    g.bastion.style.left = Math.round(g.px - AG_HUB_R) + 'px';
    g.bastion.style.top = Math.round(g.py - AG_HUB_R) + 'px';
    g.bastion.style.width = g.bastion.style.height = (AG_HUB_R * 2) + 'px';
    const maxR = Math.hypot(W, H);
    g.beams = [0, 180].map(() => {
        const el = add('sx-ag-beam sx-ag-beam-warn');
        el.style.left = Math.round(g.px) + 'px';
        el.style.top = Math.round(g.py - AG_BEAM_HALF) + 'px';
        el.style.width = Math.round(maxR) + 'px';
        return el;
    });
    const pips = add('sx-ag-pips');
    g.pips = [];
    for (let i = 0; i < AG_FINAL_RINGS; i++) g.pips.push(add('sx-ag-pip', pips));
    const title = add('sx-ag-cd');
    title.innerHTML = '<div class="sx-ag-cd-label">THE LAST BASTION</div>';
}

export function _agFinalStart(monster) {
    if (_agFinal || !monster) return;

    // The gates close: kill every other run of this boss and drop any
    // active aegis shield (the finale takes over the immunity).
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });
    monster.aegisUp = false;
    _agAegisGlow(false);

    const g = {
        monsterId: monster.id,
        finished: false,
        t: 0,
        omega: AG_BEAM_OMEGA_START,
        arm: Math.random() * 360,
        px: 0, py: 0,
        bastion: null, beams: [], citadel: null, pips: [],
        ring: null, ringIdx: 0, ringWait: AG_FINAL_INTRO_MS, lastRingAng: null,
        touchCd: 0,
        fxRun: null,
    };
    _agFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _tickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('sx-charge-paused');
    });

    // One loop owns everything. Every way the run can die (boss death,
    // encounter stop, finishing) resolves the set-piece through onKill, so
    // the boss can never stay immune behind a leftover citadel.
    // Not passive: an active dodge run makes every other Aegis mechanic stand down.
    g.fxRun = _nkNewRun(monster.id, true);
    g.fxRun.onKill = () => _agFinalEnd(g, false);
    _agBuildFinale(g);

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('sx-ag-fortified');
        wrap.classList.add('sx-nk-shielded');
    }

    const level = monster.level || 1;
    let live = false;
    _nkLoop(g.fxRun, (dtS, now) => {
        if (g.finished) return false;
        if (_nkFrozen()) return true;
        g.t += dtS * 1000;
        // Nothing may lift the shield early (a late guard-squad release would).
        monster.bossImmune = true;
        if (g.t >= AG_FINAL_FAILSAFE_MS) { _agFinalEnd(g, false); return false; }
        if (!live && g.t >= AG_FINAL_INTRO_MS) {
            live = true;
            g.beams.forEach(b => b.classList.remove('sx-ag-beam-warn'));
        }
        // Beams turn from the start (faint while they only warn) but hurt only once live.
        if (live) _agBeamStep(g, dtS, now, level);
        else {
            g.arm += g.omega * dtS;
            g.beams.forEach((el, i) => { el.style.rotate = (g.arm + i * 180) + 'deg'; });
        }
        _agRingStep(g, dtS);
        if (g.ringIdx >= AG_FINAL_RINGS) { _agFinalEnd(g, true); return false; }
        return true;
    });
}

// Ends the set-piece and hands the boss back, damageable again. `won` (all
// rings filled) cracks the shield with a flash; the other paths (failsafe,
// boss death, encounter stop) just clean up.
export function _agFinalEnd(g, won) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.citadel) { try { g.citadel.remove(); } catch (e) {} g.citadel = null; }
    g.beams = [];
    const run = g.fxRun;
    g.fxRun = null;
    if (run) { try { _nkKillRun(run); } catch (e) {} }
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
    _agAegisGlow(false);
    document.querySelectorAll('.sx-ag-fortified').forEach(el => el.classList.remove('sx-ag-fortified'));
    if (won) {
        document.body.classList.add('sx-ag-flash');
        setTimeout(() => document.body.classList.remove('sx-ag-flash'), 700);
    }

    const m = (g.monsterId && typeof _monsters !== 'undefined')
        ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        const c = document.getElementById('sx-card-' + g.monsterId);
        if (c) {
            c.classList.remove('sx-nk-shielded');
            c.querySelectorAll('.sx-nk-shielded').forEach(el => el.classList.remove('sx-nk-shielded'));
        }
        if (typeof _bossScheduleMechanics === 'function') {
            try { _bossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _renderPanel === 'function') { try { _renderPanel(); } catch (e) {} }
    }
    if (_agFinal === g) _agFinal = null;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _bossCleanup on boss death AND from the encounter stop -
// removes every run element, overlay and body class this boss ever created.
export function _agTeardown() {
    if (_agFinal) { try { _agFinalEnd(_agFinal, false); } catch (e) {} _agFinal = null; }
    document.querySelectorAll('.sx-ag-chargewarn, .sx-ag-charger, .sx-ag-vangwarn, .sx-ag-sentry, ' +
        '.sx-ag-orb, .sx-ag-rotor-pivot, .sx-ag-rotor-arm, .sx-ag-bastion, .sx-ag-beam, ' +
        '.sx-ag-citadel, .sx-ag-cd, .sx-ag-debris, .sx-ag-breach, .sx-ag-pips').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.body.classList.remove('sx-ag-flash');
    _agAegisGlow(false);
    document.querySelectorAll('.sx-ag-fortified').forEach(el => el.classList.remove('sx-ag-fortified'));
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _AG_DEBUG.fire('protocol'|'charge'|'sentries'|'rotor') - runs one now
//   _AG_DEBUG.final()                                      - BASTION now
if (typeof window !== 'undefined') {
    window._AG_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_aegis') : null;
            if (!monster) return 'no aegis alive';
            const fn = name === 'protocol' ? _mechAgAegisProtocol
                : name === 'charge' ? _mechAgShieldCharge
                : name === 'sentries' ? _mechAgSentries
                : name === 'rotor' ? _mechAgGuardRotor : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'protocol' && _nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_aegis') : null;
            if (!monster) return 'no aegis alive';
            _agFinalStart(monster);
            return 'THE LAST BASTION started';
        },
    };
}
