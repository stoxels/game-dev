//------------------------------------------------------------------------
//-------------------BOSS: THE SWARM (boss_swarm)--------------------------
//------------------------------------------------------------------------
// Galaga homage turned living hive: the drones never sit still — the whole
// arena breathes with them.
//   • SWARM ARC (signature, all fight) — a wedge of 🛸 drones carves a huge
//     arc across the stage; drones trail LAVAL GLOW so the arc edge is the
//     dodge line, and a hatchling 🐝 splinters off mid-arc to keep cutting.
//   • MIMIC QUEEN (60%) — four 🛸 drones halt mid-flight and open like
//     flowers to reveal 👑 larvae. One is real, three are mimics: step on
//     the REAL larva to crush it — royal jelly heals you 15% maxHP (golden
//     flare + toast). Step on a mimic and it bursts a rancid stink cloud
//     (mist-green, 12% hit while you stand in it). Larvae sink after 4s.
//   • HIVE EYE (60%) — the hive blinds you: a probe sweeps from the hive
//     to your position, then BLOOMS a smoke ring that covers everything
//     outside its 150px clear hole for ~6s. Two overlapping blooms in
//     phase 3. Read the ring edge and plan BEFORE the bloom.
//   • 🐝 THE SWARM SINGULARITY (≤10%, one-shot finale) — every drone
//     recalls into a whirling ball of wings; 3 rapid CHARGES from the ball
//     (stand in the marked gap), then the ball implodes into a funnel of
//     24 drones you must SLIP BETWEEN. Survive the funnel: the swarm
//     scatters, the fight resumes.
//
// Charge bar is frozen for the whole finale (gate in _egTickPlayer via
// _egSwFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock, so
// gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (prior_bomb, clue_scramble) live in
// shared-boss-abilities.js and are referenced by handler-name string.
//------------------------------------------------------------------------

// DEBUG: slow the Swarm's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Flip to false for ship.
const _EG_SW_DEBUG_SLOW = true;
const _EG_SW_DEBUG_MULT = _EG_SW_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_swarm: {
        id: 'boss_swarm', name: 'The Swarm', emoji: '🛸',
        baseHP: 1000, baseDamage: 23, chargeMax: 11,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_swarm: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'swarm_arc', intervalBase: 19000, intervalVariance: 4500, handler: '_egMechSwSwarmArc' },
            { name: 'prior_bomb', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
            { name: 'mimic_queen', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechSwMimicQueen', phase2Only: true },
            { name: 'hive_eye', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechSwHiveEye', phase2Only: true },
        ],
        onPhaseEnter: _egSwOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_SW_ARC_DMG     = [0, 0.13, 0.15, 0.18]; // %maxHP drone body hit
const EG_SW_ARC_DPS     = 14;                   // %maxHP/s inside the glow trail
const EG_SW_LARVA_HEAL  = 0.15;                  // %maxHP royal jelly heal
const EG_SW_MIMIC_DMG   = 0.12;                  // %maxHP mimic stink burst
const EG_SW_CLOUD_DPS   = 3.5;                   // %maxHP/s standing in stink
const EG_SW_EDGE_DPS    = 5;                     // %maxPS/s grazing bloom edge
const EG_SW_BLOOM_DMG   = 0.14;                  // %maxHP drone contact in bloom
const EG_SW_CHARGE_DMG  = [0, 0, 0.16, 0.19];    // %maxHP finale charge hit
const EG_SW_FUNNEL_DMG  = 0.30;                  // %maxHP failing the drone funnel
const EG_SW_HIT_CD_MS   = 700;                   // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Swarm hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egSwHitCd = 0;
function _egSwTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egSwHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egSwHitCd = now + EG_SW_HIT_CD_MS;
    const dealt = _egNkHit(pct, 'fire', level);
    _egNkAbilityHitToast(dealt, 'The Swarm', label);
    return true;
}

// Circular distance between player centre and a point.
function _egSwPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Royal jelly heal helper (mirrors the Siren's echo-zone heal).
function _egSwHeal(amount) {
    if (typeof playerCurrentHP !== 'number') return;
    const before = playerCurrentHP;
    playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + Math.max(1, Math.round(amount)));
    if (playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
}

// Spawn a hatching-ping: a small expanding ring where a drone peels off.
function _egSwHatchPing(run, x, y) {
    const el = _egNkEl(run, 'div', 'eg-sw-ping');
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    setTimeout(() => { try { el.remove(); } catch (e) {} }, _EG_SW_DEBUG_SLOW ? 2500 : 1000);
    return el;
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: SWARM ARC (all fight)----------------------
//------------------------------------------------------------------------
// A wedge of drones carves one huge readable arc across the stage. Each
// drone trails laval glow; standing in the trail burns. Mid-arc a
// HATCHLING splits off and keeps cutting a tighter arc. Dodge the EDGE,
// not the whole screen.
const EG_SW_WEDGE = 5;                    // drones per wedge
const EG_SW_ARC_SPEED = 175;              // px/s along the arc (divided by debug mult)
const EG_SW_ARC_RADIUS = 520;             // swing radius of the arc pivot
const EG_SW_TRAIL_LIFE = 2.6;             // s a glow trail cell lives

function _egMechSwSwarmArc(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    const side = Math.random() < 0.5 ? -1 : 1;
    const pivotX = side < 0 ? W * 0.5 : W * 0.5;
    const pivotY = -60;
    const startAng = side < 0 ? Math.PI * 0.18 : Math.PI * 0.82;
    const totalSwing = Math.PI * 0.64;                 // ~115° sweep
    const angSpd = (EG_SW_ARC_SPEED / EG_SW_ARC_RADIUS) / _EG_SW_DEBUG_MULT;
    const drones = [];
    for (let i = 0; i < EG_SW_WEDGE; i++) {
        const el = _egNkEl(run, 'div', 'eg-sw-drone', '🛸');
        drones.push({ off: (i - (EG_SW_WEDGE - 1) / 2) * 55, el, x: -100, y: -100 });
    }
    let hatchling = null;                              // { el, x, y, lead }
    const trails = [];                                 // { x, y, el, age }
    let ang = startAng, arcT = 0, hatchAt = 0.45 + Math.random() * 0.2, hatched = false;
    _egNkToast('eg_mech_sw_arc', '🛸 The Swarm: SWARM ARC — ride the edge!', '#ffb37a');

    _egNkLoop(run, (dtS) => {
        arcT += dtS;
        ang -= angSpd * dtS * side;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        // Wedge advance: each drone rides the arc with a lateral offset.
        drones.forEach((d, i) => {
            const swing = (i - (EG_SW_WEDGE - 1) / 2) * 0.055;   // slight fan
            const a2 = ang + swing * side;
            d.x = pivotX + Math.cos(a2) * EG_SW_ARC_RADIUS;
            d.y = pivotY + Math.sin(a2) * EG_SW_ARC_RADIUS;
            d.el.style.left = Math.round(d.x - 22) + 'px';
            d.el.style.top = Math.round(d.y - 22) + 'px';
            // Glow trail: drop a fading burn cell every ~90ms of arc travel.
            d.trailAcc = (d.trailAcc || 0) + dtS;
            if (d.trailAcc >= 0.09) {
                d.trailAcc = 0;
                const t = _egNkEl(run, 'div', 'eg-sw-trail');
                t.style.left = Math.round(d.x) + 'px';
                t.style.top = Math.round(d.y) + 'px';
                trails.push({ x: d.x, y: d.y, el: t, age: 0 });
            }
        });
        // The hatchling peels off mid-arc and cuts a tighter inner arc.
        if (!hatched && arcT > hatchAt) {
            hatched = true;
            const lead = drones[0];
            hatchling = { el: _egNkEl(run, 'div', 'eg-sw-hatch', '🐝'), x: lead.x, y: lead.y, lead: 0.55 };
            _egSwHatchPing(run, lead.x, lead.y);
        }
        if (hatchling) {
            const a2 = ang + hatchling.lead * side;
            hatchling.x = pivotX + Math.cos(a2) * (EG_SW_ARC_RADIUS - 120);
            hatchling.y = pivotY + Math.sin(a2) * (EG_SW_ARC_RADIUS - 120);
            hatchling.el.style.left = Math.round(hatchling.x - 18) + 'px';
            hatchling.el.style.top = Math.round(hatchling.y - 18) + 'px';
        }
        // Trail fade + burn checks (only while the arc still flies).
        const pr = _egNkPlayerRect();
        const pc = _egSwPC();
        for (let i = trails.length - 1; i >= 0; i--) {
            const t = trails[i];
            t.age += dtS;
            if (t.age >= EG_SW_TRAIL_LIFE) { try { t.el.remove(); } catch (e) {} trails.splice(i, 1); continue; }
            if (arcT < totalSwing / angSpd + 1.2 && pr) {
                if (Math.hypot(pc.x - t.x, pc.y - t.y) < 46) {
                    _egNkDotTick(run, EG_SW_ARC_DPS, dtS, level, 'fire');
                }
            }
        }
        // Drone body contact (whole wedge) — per-frame check but rate-limited
        // by the shared touch cooldown inside _egSwTouch.
        if (pr) {
            for (const d of drones) {
                if (Math.hypot(pc.x - d.x, pc.y - d.y) < 40) { _egSwTouch(EG_SW_ARC_DMG[p], level, 'Swarm Arc'); break; }
            }
            if (hatchling && Math.hypot(pc.x - hatchling.x, pc.y - hatchling.y) < 34) {
                _egSwTouch(EG_SW_ARC_DMG[p] * 0.8, level, 'Hatchling');
            }
        }
        // End of the swing: let trails burn out, then release the run.
        if (arcT > totalSwing / angSpd + EG_SW_TRAIL_LIFE + 0.4) {
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
const EG_MIMIC_OPEN_MS = 3400;      // how long larvae sit before sinking
const EG_MIMIC_CLOUD_LIFE = 4.5;    // s the stink cloud bites

function _egMechSwMimicQueen(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
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
    _egNkToast('eg_mech_sw_mimic', '🛸👑 MIMIC QUEEN — crush the REAL larva, mind the mimics!', '#ffd166');
    let resolved = false;
    const clouds = [];   // { x, y, el, age }

    spots.forEach((s, i) => {
        const host = _egNkEl(run, 'div', 'eg-sw-drone eg-sw-host', '🛸');
        host.style.left = Math.round(s.x - 26) + 'px';
        host.style.top = Math.round(s.y - 26) + 'px';
        const larva = _egNkEl(run, 'div', 'eg-sw-larva', '👑');
        larva.style.left = Math.round(s.x - 24) + 'px';
        larva.style.top = Math.round(s.y - 24) + 'px';
        s.host = host; s.larva = larva; s.open = false;
        // Staggered blooming.
        setTimeout(() => {
            if (!_egNkRuns.has(run.id)) return;
            s.open = true;
            host.classList.add('eg-sw-host-open');
            larva.classList.add('eg-sw-larva-on');
        }, 350 + i * 260);
    });

    _egNkLoop(run, (dtS) => {
        const pc = _egSwPC();
        const pr = _egNkPlayerRect();
        // Stink clouds age and bite.
        for (let i = clouds.length - 1; i >= 0; i--) {
            const c = clouds[i];
            c.age += dtS;
            if (c.age >= EG_MIMIC_CLOUD_LIFE) { try { c.el.remove(); } catch (e) {} clouds.splice(i, 1); continue; }
            if (pr && Math.hypot(pc.x - c.x, pc.y - c.y) < 85) {
                _egNkDotTick(run, EG_SW_CLOUD_DPS, dtS, level, 'shadow');
            }
        }
        if (resolved) return clouds.length > 0;
        // Larvae sink after their window.
        spots.forEach(s => {
            if (!s.open || s.sunk) return;
            s.age = (s.age || 0) + dtS;
            if (s.age >= EG_MIMIC_OPEN_MS / 1000) {
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
                    // jelly — a 15% maxHP heal (the Siren's echo-zone
                    // pattern; no vulnerability hook exists in the damage
                    // path, so the reward is survivability, not DPS).
                    resolved = true;
                    const maxHP = ((typeof _egNkMaxHP === 'function') ? _egNkMaxHP() : 0) || 100;
                    const heal = Math.max(1, Math.round(maxHP * EG_SW_LARVA_HEAL));
                    _egSwHeal(heal);
                    _egSwFlareEl(run, s.x, s.y, 'eg-sw-larva-pop', '🍯');
                    _egNkToast('eg_mech_sw_real', '👑 ROYAL JELLY! +' + heal + ' HP — the queen wails in fury!', '#ffd166');
                } else {
                    // Mimic! Stink cloud.
                    const cl = _egNkEl(run, 'div', 'eg-sw-cloud', '☠️');
                    cl.style.left = Math.round(s.x - 60) + 'px';
                    cl.style.top = Math.round(s.y - 60) + 'px';
                    clouds.push({ x: s.x, y: s.y, el: cl, age: 0 });
                    _egSwTouch(EG_SW_MIMIC_DMG, level, 'Mimic Burst');
                    _egNkToast('eg_mech_sw_mimicpop', '☠️ MIMIC! A rancid stink cloud erupts!', '#a3e635');
                }
            }
        }
        // All four gone (sunk or resolved) without a crush: end quietly.
        if (spots.every(s => s.sunk || s.done) && !resolved) {
            resolved = true;
            _egNkToast('eg_mech_sw_larvasunk', '👑 The larvae sank back into the hive.', '#94a3b8');
        }
        return true;
    });
}

// Small sparkle flare helper.
function _egSwFlareEl(run, x, y, cls, glyph) {
    const el = _egNkEl(run, 'div', cls, glyph);
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    setTimeout(() => { try { el.remove(); } catch (e) {} }, _EG_SW_DEBUG_SLOW ? 2500 : 1000);
}


//------------------------------------------------------------------------
//-------------------ACT II: HIVE EYE (60%)--------------------------------
//------------------------------------------------------------------------
// The hive blinds you. A probe 🛸 sweeps from the hive (top centre) to your
// position, then BLOOMS into a smoke ring: everything outside the 150px
// clear hole goes dark for ~6s. Two overlapping blooms in phase 3. Plan
// your position BEFORE the bloom — inside the hole you see everything.
const EG_BLOOM_LIFE = 6;        // s the smoke covers the screen
const EG_BLOOM_HOLE = 150;      // px radius of the clear centre

function _egMechSwHiveEye(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    const bloomCount = p >= 3 ? 2 : 1;
    _egNkToast('eg_mech_sw_eye', '🛸👁 HIVE EYE — the probe marks where the dark will bloom!', '#f59e0b');

    // ONE single loop drives the whole mechanic: each entry is a bloom in
    // flight or bloomed (a second probe launches ~2.6s after the first in
    // phase 3 — two overlapping blooms). Critical: _egNkLoop ends the whole
    // RUN when any tick returns false, so nested per-bloom loops would kill
    // every other bloom mid-flight.
    const blooms = [];
    let launchTimer = 0;
    let launched = 0;

    _egNkLoop(run, (dtS) => {
        launchTimer += dtS;
        if (launched < bloomCount && (launched === 0 || launchTimer >= 2.6)) {
            launched++;
            launchTimer = 0;
            const target = _egSwPC();
            const probe = _egNkEl(run, 'div', 'eg-sw-drone eg-sw-probe', '🛸');
            probe.style.left = Math.round(W / 2 - 22) + 'px';
            probe.style.top = Math.round(60) + 'px';
            blooms.push({
                state: 'fly', t: 0,
                sx: W / 2, sy: 60, tx: target.x, ty: target.y,
                flightS: Math.max(0.9, Math.hypot(target.x - W / 2, target.y - 60) / 520) * _EG_SW_DEBUG_MULT,
                probe, bloom: null, guards: [], age: 0,
            });
        }

        const pr = _egNkPlayerRect();
        const pc = _egSwPC();
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
                    // BLOOM: the probe bursts into a covering smoke ring —
                    // everything outside the clear hole goes dark.
                    try { b.probe.remove(); } catch (e) {}
                    b.state = 'bloom';
                    const bloom = _egNkEl(run, 'div', 'eg-sw-bloom');
                    bloom.style.left = '0px';
                    bloom.style.top = '0px';
                    bloom.style.width = W + 'px';
                    bloom.style.height = H + 'px';
                    bloom.style.background =
                        'radial-gradient(circle ' + EG_BLOOM_HOLE + 'px at ' + Math.round(b.tx) + 'px ' + Math.round(b.ty) + 'px, transparent 0 68%, rgba(6,4,2,0.94) 100%)';
                    b.bloom = bloom;
                    // Drone guards circle the clear hole mouth.
                    for (let k = 0; k < 3; k++) {
                        const gEl = _egNkEl(run, 'div', 'eg-sw-guard', '🛸');
                        b.guards.push({ el: gEl, baseAng: k * (Math.PI * 2 / 3) });
                    }
                }
            } else if (b.state === 'bloom') {
                active++;
                b.age += dtS;
                // Guards orbit the hole mouth.
                b.guards.forEach(g => {
                    const a2 = g.baseAng + b.age * 0.9;
                    const gx = b.tx + Math.cos(a2) * (EG_BLOOM_HOLE + 46);
                    const gy = b.ty + Math.sin(a2) * (EG_BLOOM_HOLE + 46);
                    g.el.style.left = Math.round(gx - 16) + 'px';
                    g.el.style.top = Math.round(gy - 16) + 'px';
                });
                // The bloom edge stings if you graze it while half-blind.
                if (pr) {
                    const dh = Math.hypot(pc.x - b.tx, pc.y - b.ty);
                    if (dh > EG_BLOOM_HOLE - 10 && dh < EG_BLOOM_HOLE + 60) {
                        _egNkDotTick(run, EG_SW_EDGE_DPS, dtS, level, 'fire');
                    }
                    // Guard drones orbiting the hole mouth bite on contact.
                    for (const g of b.guards) {
                        const gx = b.tx + Math.cos(g.baseAng + b.age * 0.9) * (EG_BLOOM_HOLE + 46);
                        const gy = b.ty + Math.sin(g.baseAng + b.age * 0.9) * (EG_BLOOM_HOLE + 46);
                        if (Math.hypot(pc.x - gx, pc.y - gy) < 30) {
                            _egSwTouch(EG_SW_BLOOM_DMG, level, 'Hive Guard');
                            break;
                        }
                    }
                }
                if (b.age >= EG_BLOOM_LIFE) {
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
// from the ball toward your position — each telegraphs a gap in the
// charge line; stand in the gap. Then the ball IMPLODES into a funnel of
// 24 drones streaming down-screen — you must slip BETWEEN the drone
// streams. Survive the funnel: the swarm scatters, the fight resumes.
// Charge bar frozen for the whole set-piece (gate in _egTickPlayer via
// _egSwFinalActive).
const EG_SW_FINALE_CHARGES = 3;
const EG_SW_FINALE_CHARGE_MS = 1600;     // ms telegraph per charge (shrinks)
const EG_SW_FINALE_CHARGE_MIN = 1000;
const EG_SW_FUNNEL_ROWS = 4;
const EG_SW_FUNNEL_ROW_MS = 1150;        // ms between funnel rows

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egSwFinal = null;

function _egSwFinalActive() {
    return !!_egSwFinal && !_egSwFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egSwOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egSwStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egSwStartFinalWatcher(monster) {
    if (!monster || _egSwFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egSwFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egSwFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
function _egSwAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egSwFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

function _egSwFinalStart(monster) {
    if (_egSwFinal || !monster) return;

    // The hive goes quiet: kill every other run of this boss (the finale
    // owns the sky).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
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
    _egSwFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _egNkNewRun(monster.id, true);
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

    _egNkToast('eg_mech_sw_final_cd', '🐝💀 THE SWARM SINGULARITY — find the gap!', '#ffb37a');

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
        const chargeMs = Math.max(EG_SW_FINALE_CHARGE_MIN, EG_SW_FINALE_CHARGE_MS - i * 200) * _EG_SW_DEBUG_MULT;
        const pc = _egSwPC();
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

        _egSwAfter(g, chargeMs, () => {
            if (g.finished) return;
            // The charge fires down the line; the gap is the dodge.
            const pc2 = _egSwPC();
            const inGap = Math.hypot(pc2.x - gapX, pc2.y - gapY) < 74;
            const onLine = (() => {
                // Distance from player to the charge segment.
                const vx = pc2.x - cx, vy = pc2.y - cy;
                const t = Math.max(0, Math.min(len, vx * Math.cos(ang) + vy * Math.sin(ang)));
                const px = cx + Math.cos(ang) * t, py2 = cy + Math.sin(ang) * t;
                return Math.hypot(pc2.x - px, pc2.y - py2) < 52;
            })();
            if (!inGap && onLine) {
                const dealt = _egNkHit(EG_SW_CHARGE_DMG[3], 'fire', level);
                _egNkAbilityHitToast(dealt, 'The Swarm', 'Singularity Charge');
            }
            _egSwBallDart(g, cx, cy, ang, len, () => {
                try { gap.remove(); } catch (e) {}
                try { line.remove(); } catch (e) {}
                if (g.finished) return;
                if (chargeIdx < EG_SW_FINALE_CHARGES) {
                    doCharge();
                } else {
                    g.stage = 'funnel';
                    _egSwFunnel(g, monster, level);
                }
            });
        });
    };
    _egSwAfter(g, 1800 * _EG_SW_DEBUG_MULT, doCharge);

    // ── Stage 2: the funnel of drones ────────────────────────────────────
    // ONE loop on the FX run advances every row's drones together (nested
    // per-row loops would kill the whole run when the first row finished —
    // _egNkLoop ends the run whenever ANY tick returns false).
    function _egSwFunnel(gg, mm, lvl) {
        if (gg.finished) return;
        _egNkToast('eg_mech_sw_funnel', '🐝 THE FUNNEL — slip between the streams!', '#ffb37a');
        const hint = document.querySelector('.eg-sw-cd-hint');
        if (hint) hint.textContent = 'SLIP BETWEEN the drone streams!';
        const activeRows = [];
        let spawned = 0;

        _egNkLoop(gg.fxRun, (fdt) => {
            if (gg.finished) return false;
            const stepPx = 300 * fdt / _EG_SW_DEBUG_MULT;
            const pc = _egSwPC();
            const pr = _egNkPlayerRect();
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
                        _egSwTouch(EG_SW_FUNNEL_DMG, lvl, 'Funnel Wall');
                    }
                }
                if (!anyOnScreen) {
                    row.drones.forEach(d => { try { d.el.remove(); } catch (e) {} });
                    activeRows.splice(i, 1);
                }
            }
            if (spawned >= EG_SW_FUNNEL_ROWS && activeRows.length === 0) {
                _egSwFinalEnd(gg, mm);
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
            if (spawned < EG_SW_FUNNEL_ROWS) {
                _egSwAfter(gg, EG_SW_FUNNEL_ROW_MS * _EG_SW_DEBUG_MULT, spawnRow);
            }
        };
        _egSwAfter(gg, 900 * _EG_SW_DEBUG_MULT, spawnRow);
    }

    // The ball visibly darts along the charge line and snaps back.
    // Frame-counted so a mid-dart game freeze holds the animation instead
    // of flying on (rAF keeps ticking during _egNkFrozen windows).
    function _egSwBallDart(gg, ccx, ccy, aang, llen, onDone) {
        if (gg.finished) { if (onDone) onDone(); return; }
        let f = 0;
        const frames = Math.round(42 * _EG_SW_DEBUG_MULT);
        const step = () => {
            if (gg.finished) { if (onDone) onDone(); return; }
            if (!_egNkFrozen()) f = Math.min(frames, f + 1);
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
function _egSwFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _egNkKillRun(g.fxRun); } catch (e) {}
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
        const m = (typeof _egMonsters !== 'undefined') ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
        if (m) m.bossImmune = false;
    } catch (e) {}
    if (typeof _egNkToast === 'function') {
        _egNkToast('eg_mech_sw_scatter', '🛸 THE SWARM SCATTERS — the fight resumes!', '#ffb37a');
    }
    void monster;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body class this boss ever created.
function _egSwTeardown() {
    if (_egSwFinal) { try { _egSwFinalEnd(_egSwFinal, null); } catch (e) {} _egSwFinal = null; }
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
//   _EG_SW_DEBUG.fire('arc'|'mimic'|'eye', phase) — runs one now
//   _EG_SW_DEBUG.final()                          — SINGULARITY now
if (typeof window !== 'undefined') {
    window._EG_SW_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_swarm') : null;
            if (!monster) return 'no swarm alive';
            const fn = name === 'arc' ? _egMechSwSwarmArc
                : name === 'mimic' ? _egMechSwMimicQueen
                : name === 'eye' ? _egMechSwHiveEye : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'arc' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_swarm') : null;
            if (!monster) return 'no swarm alive';
            _egSwFinalStart(monster);
            return 'THE SWARM SINGULARITY started';
        },
    };
}
