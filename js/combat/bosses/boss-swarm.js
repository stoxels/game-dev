import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkDotTick, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkMaxHP, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE SWARM (boss_swarm)--------------------------
//------------------------------------------------------------------------
// Living-hive siege: a drone wedge carves arcs across the arena all fight,
// the MIMIC QUEEN guessing game and the blinding HIVE EYE join at 60%, and
// at ≤10% THE SWARM SINGULARITY recalls every drone into charges plus a
// 24-drone funnel to slip between.
//
// Shared mechanics (prior_bomb) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

// DEBUG: slow the Swarm's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Off for ship.
export const _SW_DEBUG_SLOW = false;
export const _SW_DEBUG_MULT = _SW_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_swarm: {
        id: 'boss_swarm', name: 'The Swarm', emoji: '🛸',
        baseHP: 1000, baseDamage: 23, chargeMax: 11,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_swarm: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'swarm_arc', intervalBase: 19000, intervalVariance: 4500, handler: '_mechSwSwarmArc' },
            { name: 'prior_bomb', intervalBase: 18000, intervalVariance: 4000, handler: '_mechPriorBomb' },
            { name: 'mimic_queen', intervalBase: 21000, intervalVariance: 5000, handler: '_mechSwMimicQueen', phase2Only: true },
            { name: 'hive_eye', intervalBase: 23000, intervalVariance: 5000, handler: '_mechSwHiveEye', phase2Only: true },
        ],
        onPhaseEnter: _swOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
export const SW_ARC_DMG     = [0, 0.13, 0.15, 0.18]; // %maxHP drone body hit
export const SW_ARC_DPS     = 14;                   // %maxHP/s inside the glow trail
export const SW_LARVA_HEAL  = 0.15;                  // %maxHP royal jelly heal
export const SW_MIMIC_DMG   = 0.12;                  // %maxHP mimic stink burst
export const SW_CLOUD_DPS   = 3.5;                   // %maxHP/s standing in stink
export const SW_EDGE_DPS    = 5;                     // %maxPS/s grazing bloom edge
export const SW_BLOOM_DMG   = 0.14;                  // %maxHP drone contact in bloom
export const SW_CHARGE_DMG  = [0, 0, 0.16, 0.19];    // %maxHP finale charge hit
export const SW_FUNNEL_DMG  = 0.30;                  // %maxHP failing the drone funnel
export const SW_HIT_CD_MS   = 700;                   // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Swarm hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
export let _swHitCd = 0;
export function _swTouch(pct, level, label) {
    const now = performance.now();
    if (now < _swHitCd) return false;
    const pr = _nkPlayerRect();
    if (!pr) return false;
    _swHitCd = now + SW_HIT_CD_MS;
    const dealt = _nkHit(pct, 'fire', level);
    _nkAbilityHitToast(dealt, 'The Swarm', label);
    return true;
}

// Circular distance between player centre and a point.
export function _swPC() { const c = _nkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Royal jelly heal helper (mirrors the Siren's echo-zone heal).
export function _swHeal(amount) {
    if (typeof playerCurrentHP !== 'number') return;
    const before = globalThis.playerCurrentHP;
    globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + (globalThis._lifeGain ? globalThis._lifeGain(Math.max(1, Math.round(amount))) : (Math.max(1, Math.round(amount)))));
    if (globalThis.playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
}

// Spawn a hatching-ping: a small expanding ring where a drone peels off.
export function _swHatchPing(run, x, y) {
    const el = _nkEl(run, 'div', 'eg-sw-ping');
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    setTimeout(() => { try { el.remove(); } catch (e) {} }, _SW_DEBUG_SLOW ? 2500 : 1000);
    return el;
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: SWARM ARC (all fight)----------------------
//------------------------------------------------------------------------
// A wedge of drones carves one huge readable arc across the stage. Each
// drone trails laval glow; standing in the trail burns. Mid-arc a
// HATCHLING splits off and keeps cutting a tighter arc. Dodge the EDGE,
// not the whole screen.
export const SW_WEDGE = 5;                    // drones per wedge
export const SW_ARC_SPEED = 175;              // px/s along the arc (divided by debug mult)
export const SW_ARC_RADIUS = 520;             // swing radius of the arc pivot
export const SW_TRAIL_LIFE = 2.6;             // s a glow trail cell lives

export function _mechSwSwarmArc(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth;
    const run = _nkNewRun(monster && monster.id, true);
    const side = Math.random() < 0.5 ? -1 : 1;
    const pivotX = side < 0 ? W * 0.5 : W * 0.5;
    const pivotY = -60;
    const startAng = side < 0 ? Math.PI * 0.18 : Math.PI * 0.82;
    const totalSwing = Math.PI * 0.64;                 // ~115° sweep
    const angSpd = (SW_ARC_SPEED / SW_ARC_RADIUS) / _SW_DEBUG_MULT;
    const drones = [];
    for (let i = 0; i < SW_WEDGE; i++) {
        const el = _nkEl(run, 'div', 'eg-sw-drone', '🛸');
        drones.push({ off: (i - (SW_WEDGE - 1) / 2) * 55, el, x: -100, y: -100 });
    }
    let hatchling = null;                              // { el, x, y, lead }
    const trails = [];                                 // { x, y, el, age }
    let ang = startAng, arcT = 0, hatchAt = 0.45 + Math.random() * 0.2, hatched = false;
    _nkToast('eg_mech_sw_arc', '🛸 The Swarm: SWARM ARC - ride the edge!', '#ffb37a');

    _nkLoop(run, (dtS) => {
        arcT += dtS;
        ang -= angSpd * dtS * side;
        Math.cos(ang), Math.sin(ang);
        // Wedge advance: each drone rides the arc with a lateral offset.
        drones.forEach((d, i) => {
            const swing = (i - (SW_WEDGE - 1) / 2) * 0.055;   // slight fan
            const a2 = ang + swing * side;
            d.x = pivotX + Math.cos(a2) * SW_ARC_RADIUS;
            d.y = pivotY + Math.sin(a2) * SW_ARC_RADIUS;
            d.el.style.left = Math.round(d.x - 22) + 'px';
            d.el.style.top = Math.round(d.y - 22) + 'px';
            // Glow trail: drop a fading burn cell every ~90ms of arc travel.
            d.trailAcc = (d.trailAcc || 0) + dtS;
            if (d.trailAcc >= 0.09) {
                d.trailAcc = 0;
                const t = _nkEl(run, 'div', 'eg-sw-trail');
                t.style.left = Math.round(d.x) + 'px';
                t.style.top = Math.round(d.y) + 'px';
                trails.push({ x: d.x, y: d.y, el: t, age: 0 });
            }
        });
        // The hatchling peels off mid-arc and cuts a tighter inner arc.
        if (!hatched && arcT > hatchAt) {
            hatched = true;
            const lead = drones[0];
            hatchling = { el: _nkEl(run, 'div', 'eg-sw-hatch', '🐝'), x: lead.x, y: lead.y, lead: 0.55 };
            _swHatchPing(run, lead.x, lead.y);
        }
        if (hatchling) {
            const a2 = ang + hatchling.lead * side;
            hatchling.x = pivotX + Math.cos(a2) * (SW_ARC_RADIUS - 120);
            hatchling.y = pivotY + Math.sin(a2) * (SW_ARC_RADIUS - 120);
            hatchling.el.style.left = Math.round(hatchling.x - 18) + 'px';
            hatchling.el.style.top = Math.round(hatchling.y - 18) + 'px';
        }
        // Trail fade + burn checks (only while the arc still flies).
        const pr = _nkPlayerRect();
        const pc = _swPC();
        for (let i = trails.length - 1; i >= 0; i--) {
            const t = trails[i];
            t.age += dtS;
            if (t.age >= SW_TRAIL_LIFE) { try { t.el.remove(); } catch (e) {} trails.splice(i, 1); continue; }
            if (arcT < totalSwing / angSpd + 1.2 && pr) {
                if (Math.hypot(pc.x - t.x, pc.y - t.y) < 46) {
                    _nkDotTick(run, SW_ARC_DPS, dtS, level, 'fire');
                }
            }
        }
        // Drone body contact (whole wedge) - per-frame check but rate-limited
        // by the shared touch cooldown inside _swTouch.
        if (pr) {
            for (const d of drones) {
                if (Math.hypot(pc.x - d.x, pc.y - d.y) < 40) { _swTouch(SW_ARC_DMG[p], level, 'Swarm Arc'); break; }
            }
            if (hatchling && Math.hypot(pc.x - hatchling.x, pc.y - hatchling.y) < 34) {
                _swTouch(SW_ARC_DMG[p] * 0.8, level, 'Hatchling');
            }
        }
        // End of the swing: let trails burn out, then release the run.
        if (arcT > totalSwing / angSpd + SW_TRAIL_LIFE + 0.4) {
            drones.forEach(d => { try { d.el.remove(); } catch (e) {} });
            if (hatchling) { try { hatchling.el.remove(); } catch (e) {} }
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: MIMIC QUEEN (60%)-----------------------------
//------------------------------------------------------------------------
// Four drones halt mid-flight and open like flowers to reveal 👑 larvae.
// Four drones halt mid-flight and open like flowers to reveal 👑 larvae.
// One is REAL, three are MIMICS. Step on the real larva to crush it: royal
// jelly heals you 15% maxHP. Step on a mimic and it bursts a rancid stink
// cloud that bites while you stand in it. Larvae sink after ~4s of opening.
export const MIMIC_OPEN_MS = 3400;      // how long larvae sit before sinking
export const MIMIC_CLOUD_LIFE = 4.5;    // s the stink cloud bites

export function _mechSwMimicQueen(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    // Four spread interior positions, kept off the very edges.
    const spots = [];
    for (let i = 0; i < 4; i++) {
        let x, y, ok = false, tries = 0;
        while (!ok && tries++ < 30) {
            x = W * (0.16 + Math.random() * 0.68);
            y = H * (0.18 + Math.random() * 0.6);
            ok = spots.every(s => Math.hypot(s.x - x, s.y - y) > 220);
        }
        spots.push({ x, y });
    }
    const realIdx = Math.floor(Math.random() * 4);
    _nkToast('eg_mech_sw_mimic', '🛸👑 MIMIC QUEEN - crush the REAL larva, mind the mimics!', '#ffd166');
    let resolved = false;
    const clouds = [];   // { x, y, el, age }

    spots.forEach((s, i) => {
        const host = _nkEl(run, 'div', 'eg-sw-drone eg-sw-host', '🛸');
        host.style.left = Math.round(s.x - 26) + 'px';
        host.style.top = Math.round(s.y - 26) + 'px';
        const larva = _nkEl(run, 'div', 'eg-sw-larva', '👑');
        larva.style.left = Math.round(s.x - 24) + 'px';
        larva.style.top = Math.round(s.y - 24) + 'px';
        s.host = host; s.larva = larva; s.open = false;
        // Staggered blooming.
        setTimeout(() => {
            if (!_nkRuns.has(run.id)) return;
            s.open = true;
            host.classList.add('eg-sw-host-open');
            larva.classList.add('eg-sw-larva-on');
        }, 350 + i * 260);
    });

    _nkLoop(run, (dtS) => {
        const pc = _swPC();
        const pr = _nkPlayerRect();
        // Stink clouds age and bite.
        for (let i = clouds.length - 1; i >= 0; i--) {
            const c = clouds[i];
            c.age += dtS;
            if (c.age >= MIMIC_CLOUD_LIFE) { try { c.el.remove(); } catch (e) {} clouds.splice(i, 1); continue; }
            if (pr && Math.hypot(pc.x - c.x, pc.y - c.y) < 85) {
                _nkDotTick(run, SW_CLOUD_DPS, dtS, level, 'shadow');
            }
        }
        if (resolved) return clouds.length > 0;
        // Larvae sink after their window.
        spots.forEach(s => {
            if (!s.open || s.sunk) return;
            s.age = (s.age || 0) + dtS;
            if (s.age >= MIMIC_OPEN_MS / 1000) {
                s.sunk = true;
                try { s.larva.remove(); } catch (e) {}
                try { s.host.remove(); } catch (e) {}
            }
        });
        // Player contact with an open larva.
        if (!pr) return true;
        for (let i = 0; i < spots.length; i++) {
            const s = spots[i];
            if (!s.open || s.sunk || s.done) continue;
            if (Math.hypot(pc.x - s.x, pc.y - s.y) < 44) {
                s.done = true;
                try { s.larva.remove(); } catch (e) {}
                try { s.host.remove(); } catch (e) {}
                if (i === realIdx) {
                    // REAL larva crushed: the queen wails and bleeds royal
                    // jelly - a 15% maxHP heal (the Siren's echo-zone
                    // pattern; no vulnerability hook exists in the damage
                    // path, so the reward is survivability, not DPS).
                    resolved = true;
                    const maxHP = ((typeof _nkMaxHP === 'function') ? _nkMaxHP() : 0) || 100;
                    const heal = Math.max(1, Math.round(maxHP * SW_LARVA_HEAL));
                    _swHeal(heal);
                    _swFlareEl(run, s.x, s.y, 'eg-sw-larva-pop', '🍯');
                    _nkToast('eg_mech_sw_real', '👑 ROYAL JELLY! +' + heal + ' HP - the queen wails in fury!', '#ffd166');
                } else {
                    // Mimic! Stink cloud.
                    const cl = _nkEl(run, 'div', 'eg-sw-cloud', '☠️');
                    cl.style.left = Math.round(s.x - 60) + 'px';
                    cl.style.top = Math.round(s.y - 60) + 'px';
                    clouds.push({ x: s.x, y: s.y, el: cl, age: 0 });
                    _swTouch(SW_MIMIC_DMG, level, 'Mimic Burst');
                    _nkToast('eg_mech_sw_mimicpop', '☠️ MIMIC! A rancid stink cloud erupts!', '#a3e635');
                }
            }
        }
        // All four gone (sunk or resolved) without a crush: end quietly.
        if (spots.every(s => s.sunk || s.done) && !resolved) {
            resolved = true;
            _nkToast('eg_mech_sw_larvasunk', '👑 The larvae sank back into the hive.', '#94a3b8');
        }
        return true;
    });
}

// Small sparkle flare helper.
export function _swFlareEl(run, x, y, cls, glyph) {
    const el = _nkEl(run, 'div', cls, glyph);
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    setTimeout(() => { try { el.remove(); } catch (e) {} }, _SW_DEBUG_SLOW ? 2500 : 1000);
}


//------------------------------------------------------------------------
//-------------------ACT II: HIVE EYE (60%)--------------------------------
//------------------------------------------------------------------------
// The hive blinds you. A probe 🛸 sweeps from the hive (top centre) to your
// position, then BLOOMS into a smoke ring: everything outside the 150px
// clear hole goes dark for ~6s. Two overlapping blooms in phase 3. Plan
// your position BEFORE the bloom - inside the hole you see everything.
export const BLOOM_LIFE = 6;        // s the smoke covers the screen
export const BLOOM_HOLE = 150;      // px radius of the clear centre

export function _mechSwHiveEye(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    const bloomCount = p >= 3 ? 2 : 1;
    _nkToast('eg_mech_sw_eye', '🛸👁 HIVE EYE - the probe marks where the dark will bloom!', '#f59e0b');

    // ONE single loop drives the whole mechanic: each entry is a bloom in
    // flight or bloomed (a second probe launches ~2.6s after the first in
    // phase 3 - two overlapping blooms). Critical: _nkLoop ends the whole
    // RUN when any tick returns false, so nested per-bloom loops would kill
    // every other bloom mid-flight.
    const blooms = [];
    let launchTimer = 0;
    let launched = 0;

    _nkLoop(run, (dtS) => {
        launchTimer += dtS;
        if (launched < bloomCount && (launched === 0 || launchTimer >= 2.6)) {
            launched++;
            launchTimer = 0;
            const target = _swPC();
            const probe = _nkEl(run, 'div', 'eg-sw-drone eg-sw-probe', '🛸');
            probe.style.left = Math.round(W / 2 - 22) + 'px';
            probe.style.top = Math.round(60) + 'px';
            blooms.push({
                state: 'fly', t: 0,
                sx: W / 2, sy: 60, tx: target.x, ty: target.y,
                flightS: Math.max(0.9, Math.hypot(target.x - W / 2, target.y - 60) / 520) * _SW_DEBUG_MULT,
                probe, bloom: null, guards: [], age: 0,
            });
        }

        const pr = _nkPlayerRect();
        const pc = _swPC();
        let active = 0;
        for (const b of blooms) {
            if (b.state === 'fly') {
                active++;
                b.t += dtS;
                const f = Math.min(1, b.t / b.flightS);
                const ease = f * f * (3 - 2 * f);
                b.probe.style.left = Math.round(b.sx + (b.tx - b.sx) * ease - 22) + 'px';
                b.probe.style.top = Math.round(b.sy + (b.ty - b.sy) * ease - 22) + 'px';
                if (f >= 1) {
                    // BLOOM: the probe bursts into a covering smoke ring -
                    // everything outside the clear hole goes dark.
                    try { b.probe.remove(); } catch (e) {}
                    b.state = 'bloom';
                    const bloom = _nkEl(run, 'div', 'eg-sw-bloom');
                    bloom.style.left = '0px';
                    bloom.style.top = '0px';
                    bloom.style.width = W + 'px';
                    bloom.style.height = H + 'px';
                    bloom.style.background =
                        'radial-gradient(circle ' + BLOOM_HOLE + 'px at ' + Math.round(b.tx) + 'px ' + Math.round(b.ty) + 'px, transparent 0 68%, rgba(6,4,2,0.94) 100%)';
                    b.bloom = bloom;
                    // Drone guards circle the clear hole mouth.
                    for (let k = 0; k < 3; k++) {
                        const gEl = _nkEl(run, 'div', 'eg-sw-guard', '🛸');
                        b.guards.push({ el: gEl, baseAng: k * (Math.PI * 2 / 3) });
                    }
                }
            } else if (b.state === 'bloom') {
                active++;
                b.age += dtS;
                // Guards orbit the hole mouth.
                b.guards.forEach(g => {
                    const a2 = g.baseAng + b.age * 0.9;
                    const gx = b.tx + Math.cos(a2) * (BLOOM_HOLE + 46);
                    const gy = b.ty + Math.sin(a2) * (BLOOM_HOLE + 46);
                    g.el.style.left = Math.round(gx - 16) + 'px';
                    g.el.style.top = Math.round(gy - 16) + 'px';
                });
                // The bloom edge stings if you graze it while half-blind.
                if (pr) {
                    const dh = Math.hypot(pc.x - b.tx, pc.y - b.ty);
                    if (dh > BLOOM_HOLE - 10 && dh < BLOOM_HOLE + 60) {
                        _nkDotTick(run, SW_EDGE_DPS, dtS, level, 'fire');
                    }
                    // Guard drones orbiting the hole mouth bite on contact.
                    for (const g of b.guards) {
                        const gx = b.tx + Math.cos(g.baseAng + b.age * 0.9) * (BLOOM_HOLE + 46);
                        const gy = b.ty + Math.sin(g.baseAng + b.age * 0.9) * (BLOOM_HOLE + 46);
                        if (Math.hypot(pc.x - gx, pc.y - gy) < 30) {
                            _swTouch(SW_BLOOM_DMG, level, 'Hive Guard');
                            break;
                        }
                    }
                }
                if (b.age >= BLOOM_LIFE) {
                    b.guards.forEach(g => { try { g.el.remove(); } catch (e) {} });
                    try { b.bloom.remove(); } catch (e) {}
                    b.state = 'done';
                }
            }
        }
        return active > 0;
    });
}


//------------------------------------------------------------------------
//-------------------THE SWARM SINGULARITY (≤10%, finale)------------------
//------------------------------------------------------------------------
// Every drone recalls into a whirling ball of wings. THREE rapid charges
// from the ball toward your position - each telegraphs a gap in the
// charge line; stand in the gap. Then the ball IMPLODES into a funnel of
// 24 drones streaming down-screen - you must slip BETWEEN the drone
// streams. Survive the funnel: the swarm scatters, the fight resumes.
// Charge bar frozen for the whole set-piece (gate in _tickPlayer via
// _swFinalActive).
export const SW_FINALE_CHARGES = 3;
export const SW_FINALE_CHARGE_MS = 1600;     // ms telegraph per charge (shrinks)
export const SW_FINALE_CHARGE_MIN = 1000;
export const SW_FUNNEL_ROWS = 4;
export const SW_FUNNEL_ROW_MS = 1150;        // ms between funnel rows

// Set while the finale runs (read by _tickPlayer's charge-freeze gate).
export let _swFinal = null;

export function _swFinalActive() {
    return !!_swFinal && !_swFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _swOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _swStartFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _swStartFinalWatcher(monster) {
    if (!monster || _swFinal) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (_swFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _swFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
export function _swAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_swFinal) return;
        if (_nkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

export function _swFinalStart(monster) {
    if (_swFinal || !monster) return;

    // The hive goes quiet: kill every other run of this boss (the finale
    // owns the sky).
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const cx = W / 2, cy = H * 0.32;
    const g = {
        monsterId: monster.id,
        finished: false,
        stage: 'charges',           // charges → funnel → done
        fxRun: null, overlay: null, ball: null,
        telegraphs: [],
    };
    _swFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _tickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _nkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // The whirling ball of wings.
    const ball = document.createElement('div');
    ball.className = 'eg-sw-ball';
    ball.style.left = Math.round(cx - 95) + 'px';
    ball.style.top = Math.round(cy - 95) + 'px';
    document.body.appendChild(ball);
    g.ball = ball;
    g.fxRun.els.push(ball);

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-sw-cd';
    ov.innerHTML =
        '<div class="eg-sw-cd-label">🐝 THE SWARM SINGULARITY</div>' +
        '<div class="eg-sw-cd-hint">Stand in the marked gap when the ball charges!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _nkToast('eg_mech_sw_final_cd', '🐝💀 THE SWARM SINGULARITY - find the gap!', '#ffb37a');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the swarm-crown while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-sw-enraged');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;

    // ── Stage 1: three rapid charges ─────────────────────────────────────
    let chargeIdx = 0;
    const doCharge = () => {
        if (g.finished || g.stage !== 'charges') return;
        const i = chargeIdx++;
        const chargeMs = Math.max(SW_FINALE_CHARGE_MIN, SW_FINALE_CHARGE_MS - i * 200) * _SW_DEBUG_MULT;
        const pc = _swPC();
        const ang = Math.atan2(pc.y - cy, pc.x - cx);
        // The safe gap sits opposite the charge line (visible immediately).
        const gapAng = ang + Math.PI;
        const gapR = 300;
        const gapX = Math.max(80, Math.min(W - 80, cx + Math.cos(gapAng) * gapR));
        const gapY = Math.max(150, Math.min(H - 80, cy + Math.sin(gapAng) * gapR));
        const gap = document.createElement('div');
        gap.className = 'eg-sw-gap';
        gap.style.left = Math.round(gapX - 60) + 'px';
        gap.style.top = Math.round(gapY - 60) + 'px';
        document.body.appendChild(gap);
        g.fxRun.els.push(gap);

        // Charge telegraph: a fat line from the ball to your position.
        const line = document.createElement('div');
        line.className = 'eg-sw-chargeline';
        const len = Math.hypot(pc.x - cx, pc.y - cy);
        line.style.width = Math.round(len) + 'px';
        line.style.height = '46px';
        line.style.left = Math.round(cx) + 'px';
        line.style.top = Math.round(cy - 23) + 'px';
        line.style.transformOrigin = '0 50%';
        line.style.transform = 'rotate(' + ang + 'rad)';
        document.body.appendChild(line);
        g.fxRun.els.push(line);

        _swAfter(g, chargeMs, () => {
            if (g.finished) return;
            // The charge fires down the line; the gap is the dodge.
            const pc2 = _swPC();
            const inGap = Math.hypot(pc2.x - gapX, pc2.y - gapY) < 74;
            const onLine = (() => {
                // Distance from player to the charge segment.
                const vx = pc2.x - cx, vy = pc2.y - cy;
                const t = Math.max(0, Math.min(len, vx * Math.cos(ang) + vy * Math.sin(ang)));
                const px = cx + Math.cos(ang) * t, py2 = cy + Math.sin(ang) * t;
                return Math.hypot(pc2.x - px, pc2.y - py2) < 52;
            })();
            if (!inGap && onLine) {
                const dealt = _nkHit(SW_CHARGE_DMG[3], 'fire', level);
                _nkAbilityHitToast(dealt, 'The Swarm', 'Singularity Charge');
            }
            _swBallDart(g, cx, cy, ang, len, () => {
                try { gap.remove(); } catch (e) {}
                try { line.remove(); } catch (e) {}
                if (g.finished) return;
                if (chargeIdx < SW_FINALE_CHARGES) {
                    doCharge();
                } else {
                    g.stage = 'funnel';
                    _swFunnel(g, monster, level);
                }
            });
        });
    };
    _swAfter(g, 1800 * _SW_DEBUG_MULT, doCharge);

    // ── Stage 2: the funnel of drones ────────────────────────────────────
    // ONE loop on the FX run advances every row's drones together (nested
    // per-row loops would kill the whole run when the first row finished -
    // _nkLoop ends the run whenever ANY tick returns false).
    function _swFunnel(gg, mm, lvl) {
        if (gg.finished) return;
        _nkToast('eg_mech_sw_funnel', '🐝 THE FUNNEL - slip between the streams!', '#ffb37a');
        const hint = document.querySelector('.eg-sw-cd-hint');
        if (hint) hint.textContent = 'SLIP BETWEEN the drone streams!';
        const activeRows = [];
        let spawned = 0;

        _nkLoop(gg.fxRun, (fdt) => {
            if (gg.finished) return false;
            const stepPx = 300 * fdt / _SW_DEBUG_MULT;
            const pc = _swPC();
            const pr = _nkPlayerRect();
            for (let i = activeRows.length - 1; i >= 0; i--) {
                const row = activeRows[i];
                let anyOnScreen = false;
                for (const d of row.drones) {
                    if (d.dead) continue;
                    d.y += stepPx;
                    d.el.style.top = Math.round(d.y) + 'px';
                    if (d.y <= H + 60) anyOnScreen = true;
                    if (pr && Math.hypot(pc.x - d.x, pc.y - d.y) < 34) {
                        d.dead = true;
                        try { d.el.remove(); } catch (e) {}
                        _swTouch(SW_FUNNEL_DMG, lvl, 'Funnel Wall');
                    }
                }
                if (!anyOnScreen) {
                    row.drones.forEach(d => { try { d.el.remove(); } catch (e) {} });
                    activeRows.splice(i, 1);
                }
            }
            if (spawned >= SW_FUNNEL_ROWS && activeRows.length === 0) {
                _swFinalEnd(gg, mm);
                return false;
            }
            return true;
        });

        const spawnRow = () => {
            if (gg.finished) return;
            const gapCell = 1 + Math.floor(Math.random() * 6);
            const row = { drones: [] };
            const cellW = W / 8;
            for (let c = 0; c < 8; c++) {
                if (c === gapCell || c === gapCell + 1) continue;  // 2-cell gap
                const el = document.createElement('div');
                el.className = 'eg-sw-funnel-drone';
                el.textContent = '🛸';
                el.style.left = Math.round(c * cellW) + 'px';
                el.style.top = Math.round(H * 0.08 - 40) + 'px';
                document.body.appendChild(el);
                gg.fxRun.els.push(el);
                row.drones.push({ el, x: c * cellW + cellW / 2, y: H * 0.08 - 40 });
            }
            activeRows.push(row);
            spawned++;
            if (spawned < SW_FUNNEL_ROWS) {
                _swAfter(gg, SW_FUNNEL_ROW_MS * _SW_DEBUG_MULT, spawnRow);
            }
        };
        _swAfter(gg, 900 * _SW_DEBUG_MULT, spawnRow);
    }

    // The ball visibly darts along the charge line and snaps back.
    // Frame-counted so a mid-dart game freeze holds the animation instead
    // of flying on (rAF keeps ticking during _nkFrozen windows).
    function _swBallDart(gg, ccx, ccy, aang, llen, onDone) {
        if (gg.finished) { if (onDone) onDone(); return; }
        let f = 0;
        const frames = Math.round(42 * _SW_DEBUG_MULT);
        const step = () => {
            if (gg.finished) { if (onDone) onDone(); return; }
            if (!_nkFrozen()) f = Math.min(frames, f + 1);
            const t = f / frames;
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            gg.ball.style.left = Math.round(ccx + Math.cos(aang) * llen * ease - 95) + 'px';
            gg.ball.style.top = Math.round(ccy + Math.sin(aang) * llen * ease - 95) + 'px';
            if (t < 1) requestAnimationFrame(step);
            else {
                gg.ball.style.left = Math.round(ccx - 95) + 'px';
                gg.ball.style.top = Math.round(ccy - 95) + 'px';
                if (onDone) onDone();
            }
        };
        requestAnimationFrame(step);
    }
}

// Ends the finale: scatter burst, release immunity and the charge bar.
export function _swFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _nkKillRun(g.fxRun); } catch (e) {}
    try { if (g.ball) g.ball.remove(); } catch (e) {}
    try { if (g.overlay) g.overlay.remove(); } catch (e) {}
    document.querySelectorAll('.eg-sw-chargeline, .eg-sw-gap, .eg-sw-funnel-drone').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('eg-sw-enraged');
        wrap.classList.remove('eg-nk-shielded');
    }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    try {
        const m = (typeof _monsters !== 'undefined') ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
        if (m) m.bossImmune = false;
    } catch (e) {}
    if (typeof _nkToast === 'function') {
        _nkToast('eg_mech_sw_scatter', '🛸 THE SWARM SCATTERS - the fight resumes!', '#ffb37a');
    }
    void monster;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN----------------------------------------------
//------------------------------------------------------------------------
// Called from _bossCleanup on boss death AND from the encounter stop -
// removes every run element, overlay and body class this boss ever created.
export function _swTeardown() {
    if (_swFinal) { try { _swFinalEnd(_swFinal, null); } catch (e) {} _swFinal = null; }
    document.querySelectorAll('.eg-sw-drone, .eg-sw-host, .eg-sw-larva, .eg-sw-cloud, ' +
        '.eg-sw-trail, .eg-sw-ping, .eg-sw-probe, .eg-sw-bloom, .eg-sw-guard, ' +
        '.eg-sw-ball, .eg-sw-cd, .eg-sw-chargeline, .eg-sw-gap, .eg-sw-funnel-drone, ' +
        '.eg-sw-larva-pop').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-sw-enraged').forEach(el => el.classList.remove('eg-sw-enraged'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _SW_DEBUG.fire('arc'|'mimic'|'eye', phase) - runs one now
//   _SW_DEBUG.final()                          - SINGULARITY now
if (typeof window !== 'undefined') {
    window._SW_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_swarm') : null;
            if (!monster) return 'no swarm alive';
            const fn = name === 'arc' ? _mechSwSwarmArc
                : name === 'mimic' ? _mechSwMimicQueen
                : name === 'eye' ? _mechSwHiveEye : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'arc' && _nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_swarm') : null;
            if (!monster) return 'no swarm alive';
            _swFinalStart(monster);
            return 'THE SWARM SINGULARITY started';
        },
    };
}
