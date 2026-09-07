//------------------------------------------------------------------------
//-------------------BOSS: THE AEGIS (boss_aegis)-------------------------
//------------------------------------------------------------------------
// REWORK — guardian-fortress homage, rebuilt as a full bulwark gauntlet.
// The Aegis fights like a castle that learned to walk: it hides behind
// summoned guards, charges you behind its shield, plants sentries that
// hurl tracking orbs, and sweeps the field with a rotating guard rotor —
// then, at the very end, it plants THE LAST BASTION and sweeps the whole
// arena with escalating beams before one final vanguard charge.
//
//   Phase 1 (100–60%) — AEGIS PROTOCOL (signature, upgraded). The boss
//                       summons a guard squad and goes IMMUNE while they
//                       live — kill the guards to break the shield (40s
//                       failsafe). Guards now wear a pulsing guardian ring
//                       and the whole arena gets an "aegis active" glow so
//                       the state reads at a glance.
//                       Plus SHIELD CHARGE. The boss picks your row and
//                       BARRELS across it behind its shield. Out of the
//                       lane! Two charges per cast; three at the end.
//   Phase 2 ( ≤60%)   — SENTRY SHIELDS. Sentry shields plant at the edges
//                       and hurl slow tracking orbs at you for a while.
//                       Strafe the orbs!
//                       Plus GUARD ROTOR. Two guardian orbs tether a beam
//                       that sweeps around a pivot like a radar blade.
//                       Stay off the arms! Everything gets faster.
//   Phase 3 ( ≤30%)   — Three charges, three sentries, a faster rotor. The
//                       gates will not hold much longer.
//   Finale ( ≤10%)    — THE LAST BASTION (one-shot set-piece): the boss
//                       goes immune and shielded and FORTIFIES while a
//                       stone citadel swallow the arena. A bastion plants
//                       at the centre and sweeps the field with two
//                       opposite beams — each beat they spin FASTER (80° →
//                       115° → 150° per second). Then the VANGUARD: the
//                       beams retract and three shield charges barrel
//                       across your row, the last one huge. STAY OFF THE
//                       BEAMS! Charge bar frozen for the whole set-piece
//                       (gate in _egTickPlayer via _egAgFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock,
// so gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//
// DEBUG_SLOW: while true, telegraphs/windups are stretched 2.5× so
// screenshots can catch mid-animation states. Flip to false for ship.
//------------------------------------------------------------------------

const _EG_AG_DEBUG_SLOW = true;
const _EG_AG_DEBUG_MULT = _EG_AG_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_aegis: {
        id: 'boss_aegis', name: 'The Aegis', emoji: '🛡️',
        baseHP: 1150, baseDamage: 20, chargeMax: 14,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_aegis: {
        phases: [
            { threshold: 1.00, chargeMax: 14, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.45 },
            { threshold: 0.30, chargeMax: 7, damageMultiplier: 1.90 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'aegis_protocol', intervalBase: 24000, intervalVariance: 5000, handler: '_egMechAgAegisProtocol' },
            { name: 'shield_charge', intervalBase: 19000, intervalVariance: 4500, handler: '_egMechAgShieldCharge' },
            { name: 'sentry_shields', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechAgSentries', phase2Only: true },
            { name: 'guard_rotor', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechAgGuardRotor', phase2Only: true },
        ],
        onPhaseEnter: _egAgOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_AG_CHARGE_DMG = [0, 0.18, 0.21, 0.24];   // shield charge lane
const EG_AG_ORB_DMG    = [0, 0, 0.13, 0.16];      // sentry orb contact
const EG_AG_ROTOR_DMG  = [0, 0, 0.12, 0.15];      // rotor arm contact
const EG_AG_BEAM_DMG   = 0.10;                    // bastion beam contact
const EG_AG_VANG_DMG   = 0.12;                    // vanguard charge clip
const EG_AG_FINAL_DMG  = 0.32;                    // the final vanguard charge
const EG_AG_HIT_CD_MS  = 700;                     // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Aegis hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egAgHitCd = 0;
function _egAgTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egAgHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egAgHitCd = now + EG_AG_HIT_CD_MS;
    const dealt = _egNkHit(pct, 'cold', level);
    _egNkAbilityHitToast(dealt, 'The Aegis', label);
    return true;
}

// Arena-wide glow so the shielded state reads at a glance (managed element,
// not a body class — flashes own the body pseudo-elements).
let _egAgGlowEl = null;
function _egAgAegisGlow(on) {
    if (on) {
        if (_egAgGlowEl) return;
        _egAgGlowEl = document.createElement('div');
        _egAgGlowEl.className = 'eg-ag-aegisglow';
        document.body.appendChild(_egAgGlowEl);
    } else {
        if (_egAgGlowEl) { try { _egAgGlowEl.remove(); } catch (e) {} _egAgGlowEl = null; }
    }
}

// Stone-shard burst where a slam or charge lands (visual only, body-level
// so it survives the run ending in the same frame).
function _egAgDebris(x, y, big) {
    const layer = document.createElement('div');
    layer.className = 'eg-ag-debris' + (big ? ' eg-ag-debris-big' : '');
    layer.style.left = Math.round(x) + 'px';
    layer.style.top = Math.round(y) + 'px';
    document.body.appendChild(layer);
    for (let i = 0; i < (big ? 11 : 6); i++) {
        const s = document.createElement('div');
        s.className = 'eg-ag-shard';
        const ang = Math.random() * Math.PI * 2;
        const dist = 22 + Math.random() * (big ? 86 : 48);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 26) + 'px');
        s.style.setProperty('--rot', Math.round((Math.random() * 2 - 1) * 420) + 'deg');
        s.style.animationDelay = (Math.random() * 100) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, _EG_AG_DEBUG_SLOW ? 1800 : 900);
}


//------------------------------------------------------------------------
//-------------------MECHANIC: AEGIS PROTOCOL (signature)-------------------
//------------------------------------------------------------------------
// The boss summons a guard squad and goes IMMUNE while they live — kill
// the guards to break the shield (40s failsafe). Upgraded: guards wear a
// pulsing guardian ring and the arena glows while the aegis is up, so the
// state reads at a glance.
function _egMechAgAegisProtocol(monster, phase) {
    if (!monster || monster.aegisUp || _egNkFrozen()) return;
    if (typeof _egSpawnMonster !== 'function') return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = p >= 3 ? 3 : 2;
    const level = Math.max(1, Math.round(monster.level || 1));
    const pool = ['slime', 'ghost', 'rat', 'bat', 'bee'];
    const cap = (typeof EG_MAX_CONCURRENT_MONSTERS !== 'undefined') ? EG_MAX_CONCURRENT_MONSTERS : 6;
    const before = (typeof _egMonsters !== 'undefined') ? _egMonsters.length : 0;
    let made = 0;
    for (let i = 0; i < count; i++) {
        if (typeof _egMonsters !== 'undefined' && _egMonsters.length >= cap) break;
        _egSpawnMonster(pool[Math.floor(Math.random() * pool.length)], level);
        made++;
    }
    const fresh = (typeof _egMonsters !== 'undefined')
        ? _egMonsters.slice(before).filter(m => !m.isBoss) : [];
    fresh.forEach(a => { a.aegisOf = monster.id; });
    if (fresh.length === 0) return;

    monster.aegisUp = true;
    monster.bossImmune = true;
    const card = document.getElementById('eg-card-' + monster.id);
    if (card) card.classList.add('eg-nk-shielded');
    // Arena glow so the shielded state reads at a glance.
    _egAgAegisGlow(true);
    _egNkToast('eg_mech_aegis', '🛡️ The Aegis: Aegis Protocol! Kill the guards to break the shield!', '#7dd3fc');
    if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }

    const run = _egNkNewRun(monster.id, false);
    let e = 0;
    _egNkLoop(run, (dtS) => {
        e += dtS * 1000;
        const boss = (typeof _egMonsters !== 'undefined')
            ? _egMonsters.find(m => m.id === monster.id) : null;
        if (!boss) {
            _egAgAegisGlow(false);
            return false;
        }
        const alive = (typeof _egMonsters !== 'undefined')
            && _egMonsters.some(m => m.aegisOf === monster.id && m.currentHP > 0);
        if (!alive || e > 40000) {
            boss.aegisUp = false;
            boss.bossImmune = false;
            const c2 = document.getElementById('eg-card-' + monster.id);
            if (c2) c2.classList.remove('eg-nk-shielded');
            _egAgAegisGlow(false);
            _egNkToast('eg_mech_aegis_down', '🛡️ Aegis shield down — burn the boss!', '#4ade80');
            if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e2) {} }
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
const EG_AG_CHARGE_COUNT = [0, 2, 2, 3];
const EG_AG_CHARGE_BAND  = [0, 120, 130, 140];
const EG_AG_CHARGE_SPEED = [0, 620, 700, 780];

function _egMechAgShieldCharge(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = EG_AG_CHARGE_COUNT[p];
    const bandH = EG_AG_CHARGE_BAND[p];
    const speed = EG_AG_CHARGE_SPEED[p] / _EG_AG_DEBUG_MULT;
    const warnMs = 1100 * _EG_AG_DEBUG_MULT;
    const gapMs = 1700 * _EG_AG_DEBUG_MULT;
    const dmgPct = EG_AG_CHARGE_DMG[p];

    const charges = [];
    const c0 = _egNkPlayerCenter();
    let lastY = c0 ? c0.y : H / 2;
    for (let i = 0; i < count; i++) {
        const y = i === 0 ? lastY
            : Math.max(90, Math.min(H - 90, lastY + (Math.random() * 2 - 1) * 260));
        lastY = y;
        const fromLeft = Math.random() < 0.5;
        const warn = _egNkEl(run, 'div', 'eg-ag-chargewarn');
        warn.style.left = '0px';
        warn.style.width = W + 'px';
        warn.style.top = Math.round(y - bandH / 2) + 'px';
        warn.style.height = bandH + 'px';
        warn.classList.add(fromLeft ? 'eg-ag-from-left' : 'eg-ag-from-right');
        charges.push({ y, fromLeft, warn, el: null, at: warnMs + i * gapMs, x: 0, done: false });
    }

    _egNkToast('eg_mech_ag_charge', '🛡️ The Aegis: SHIELD CHARGE — out of the lane!', '#e2e8f0');

    let t = 0, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _egNkPlayerRect();
        let active = false;
        charges.forEach(ch => {
            if (ch.done) return;
            if (!ch.el) {
                if (t < ch.at) return;
                try { ch.warn.remove(); } catch (e) {}
                const el = _egNkEl(run, 'div', 'eg-ag-charger');
                el.style.top = Math.round(ch.y - bandH * 0.45) + 'px';
                el.style.height = Math.round(bandH * 0.9) + 'px';
                ch.x = ch.fromLeft ? -110 : W + 20;
                el.style.left = Math.round(ch.x) + 'px';
                el.classList.add(ch.fromLeft ? 'eg-ag-from-left' : 'eg-ag-from-right');
                ch.el = el;
                _egAgDebris(ch.fromLeft ? 40 : W - 40, ch.y, false);
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
                    touchCd = now + EG_AG_HIT_CD_MS;
                    _egAgTouch(dmgPct, level, 'Shield Charge');
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
// a while. Strafe the orbs — they home, but they are slow.
const EG_AG_SENTRY_COUNT = [0, 0, 2, 3];
const EG_AG_SENTRY_LIFE  = 6500;
const EG_AG_ORB_SPEED    = 130;
const EG_AG_ORB_LIFE     = 6000;

function _egMechAgSentries(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = EG_AG_SENTRY_COUNT[p];
    const durMs = EG_AG_SENTRY_LIFE * _EG_AG_DEBUG_MULT;
    const fireGap = 1600 * _EG_AG_DEBUG_MULT;
    const orbSpeed = EG_AG_ORB_SPEED / _EG_AG_DEBUG_MULT;
    const dmgPct = EG_AG_ORB_DMG[p];

    const edges = [
        [70, 90], [W - 70, 90], [70, H * 0.55], [W - 70, H * 0.55],
    ];
    const sentries = [];
    for (let i = 0; i < count; i++) {
        const spot = edges.splice(Math.floor(Math.random() * edges.length), 1)[0] || [W / 2, 70];
        const el = _egNkEl(run, 'div', 'eg-ag-sentry');
        el.style.left = Math.round(spot[0] - 26) + 'px';
        el.style.top = Math.round(spot[1] - 26) + 'px';
        sentries.push({ x: spot[0], y: spot[1], el, nextFire: 900 * _EG_AG_DEBUG_MULT + i * 500 * _EG_AG_DEBUG_MULT });
    }

    _egNkToast('eg_mech_ag_sentries', '🛡️ The Aegis: SENTRY SHIELDS — dodge the orbs!', '#e2e8f0');

    const orbs = [];
    let t = 0, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const c = _egNkPlayerCenter();
        sentries.forEach(s => {
            if (t >= s.nextFire && orbs.filter(o => !o.dead && o.home === s).length < 2) {
                s.nextFire = t + fireGap;
                const el = _egNkEl(run, 'div', 'eg-ag-orb');
                el.style.left = Math.round(s.x - 13) + 'px';
                el.style.top = Math.round(s.y - 13) + 'px';
                const dx = c ? c.x - s.x : 1, dy = c ? c.y - s.y : 0;
                const dl = Math.hypot(dx, dy) || 1;
                orbs.push({ x: s.x, y: s.y, vx: dx / dl * orbSpeed, vy: dy / dl * orbSpeed, home: s, el, born: t, dead: false });
            }
        });
        const pr = _egNkPlayerRect();
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
            if (pr && now >= touchCd && _egNkCircleHit(o.x, o.y, 16, pr, 0)) {
                touchCd = now + EG_AG_HIT_CD_MS;
                o.dead = true;
                try { o.el.remove(); } catch (e) {}
                _egAgTouch(dmgPct, level, 'Sentry Orb');
                return;
            }
            if (t - o.born > EG_AG_ORB_LIFE * _EG_AG_DEBUG_MULT || o.x < -40 || o.x > W + 40 || o.y < -40 || o.y > H + 40) {
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
const EG_AG_ROTOR_LIFE = [0, 0, 6500, 7500];
const EG_AG_ROTOR_OMEGA = [0, 0, 75, 95];
const EG_AG_ROTOR_INNER = 80;

function _egMechAgGuardRotor(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const durMs = EG_AG_ROTOR_LIFE[p] * _EG_AG_DEBUG_MULT;
    const warnMs = 1300 * _EG_AG_DEBUG_MULT;
    const omega = EG_AG_ROTOR_OMEGA[p] / _EG_AG_DEBUG_MULT;
    const dmgPct = EG_AG_ROTOR_DMG[p];
    const maxR = Math.hypot(W, H);

    const c = _egNkPlayerCenter() || { x: W / 2, y: H / 2 };
    const px = Math.max(260, Math.min(W - 260, c.x));
    const py = Math.max(240, Math.min(H - 240, c.y));

    const pivot = _egNkEl(run, 'div', 'eg-ag-rotor-pivot');
    pivot.style.left = Math.round(px) + 'px';
    pivot.style.top = Math.round(py) + 'px';
    const arms = [0, 180].map(() => {
        const el = _egNkEl(run, 'div', 'eg-ag-rotor-arm');
        el.style.left = Math.round(px) + 'px';
        el.style.top = Math.round(py - 11) + 'px';
        el.style.width = Math.round(maxR) + 'px';
        return el;
    });

    _egNkToast('eg_mech_ag_rotor', '🛡️ The Aegis: GUARD ROTOR — stay off the arms!', '#e2e8f0');

    let t = 0, ang = Math.random() * 360, touchCd = 0, live = false;
    _egNkLoop(run, (dtS, now) => {
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
        const pc = _egNkPlayerCenter();
        if (pc && now >= touchCd) {
            const dx = pc.x - px, dy = pc.y - py;
            const d = Math.hypot(dx, dy);
            if (d > EG_AG_ROTOR_INNER) {
                const pa = Math.atan2(dy, dx) * 180 / Math.PI;
                for (let i = 0; i < 2; i++) {
                    const diff = ((pa - (ang + i * 180)) % 360 + 360) % 360;
                    if (diff < 4 || diff > 356) {
                        touchCd = now + EG_AG_HIT_CD_MS;
                        _egAgTouch(dmgPct, level, 'Guard Rotor');
                        break;
                    }
                }
            }
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------🏰… THE LAST BASTION (≤10% HP one-shot finale)---------
//------------------------------------------------------------------------
// The boss goes immune + shielded and FORTIFIES while a stone citadel
// swallows the arena. A bastion plants at the centre and sweeps the field
// with two opposite beams — each beat they spin faster. Then the VANGUARD:
// the beams retract and three shield charges barrel across your row, the
// last one huge. Charge bar frozen for the whole set-piece (gate in
// _egTickPlayer via _egAgFinalActive).
const EG_AG_FINAL_TICK_MS = 1200;
const EG_AG_FINAL_TICKS = 3;
const EG_AG_BEAM_OMEGAS = [80, 115, 150];   // deg/s per stage
const EG_AG_VANG_GAP = 900;
const EG_AG_VANG_WARN = 450;

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egAgFinal = null;

function _egAgFinalActive() {
    return !!_egAgFinal && !_egAgFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egAgOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egAgStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egAgStartFinalWatcher(monster) {
    if (!monster || _egAgFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egAgFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egAgFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

function _egAgFinalStart(monster) {
    if (_egAgFinal || !monster) return;

    // The gates close: kill every other run of this boss and drop any
    // active aegis shield (the finale takes over the immunity).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });
    monster.aegisUp = false;

    const g = {
        monsterId: monster.id,
        finished: false,
        count: EG_AG_FINAL_TICKS,
        omega: EG_AG_BEAM_OMEGAS[0],
        arm: Math.random() * 360,
        beamOn: true,
        px: 0, py: 0,
        bastion: null,
        beams: [],
        citadel: null,
        overlay: null,
        fxRun: null,
        cdTimer: null,
    };
    _egAgFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds bastion, beams and the sweep loop.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Stone citadel overlay.
    const citadel = document.createElement('div');
    citadel.className = 'eg-ag-citadel';
    document.body.appendChild(citadel);
    g.citadel = citadel;
    requestAnimationFrame(() => citadel.classList.add('eg-ag-citadel-on'));

    // Bastion pivot at the arena centre.
    const W = window.innerWidth, H = window.innerHeight;
    g.px = W / 2;
    g.py = H / 2;
    const bastion = document.createElement('div');
    bastion.className = 'eg-ag-bastion';
    bastion.style.left = Math.round(g.px - 46) + 'px';
    bastion.style.top = Math.round(g.py - 46) + 'px';
    document.body.appendChild(bastion);
    g.bastion = bastion;
    g.fxRun.els.push(bastion);

    // Two opposite sweeping beams, anchored at the pivot.
    const maxR = Math.hypot(W, H);
    g.beams = [0, 180].map(() => {
        const el = document.createElement('div');
        el.className = 'eg-ag-beam';
        el.style.left = Math.round(g.px) + 'px';
        el.style.top = Math.round(g.py - 13) + 'px';
        el.style.width = Math.round(maxR) + 'px';
        document.body.appendChild(el);
        g.fxRun.els.push(el);
        return el;
    });

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-ag-cd';
    ov.innerHTML =
        '<div class="eg-ag-cd-label">🛡️ THE LAST BASTION</div>' +
        '<div class="eg-ag-cd-num eg-bmb-cd-pop">' + g.count + '</div>' +
        '<div class="eg-ag-cd-hint">The bastion sweeps the field — stay off the beams!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_ag_final_cd', '🏰💀 THE LAST BASTION — off the beams!', '#e2e8f0');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss fortifies.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-ag-fortified');
        wrap.classList.add('eg-nk-shielded');
    }

    // The sweep: beams rotate; each metronome beat they spin faster. Pause /
    // death / inactive hold the sweep (debug: extra-long beats).
    const level = monster.level || 1;
    let touchCd = 0;
    _egNkLoop(g.fxRun, (dtS, now) => {
        if (!g.beamOn) return true;   // idle — the vanguard's loop now drives the run
        if (_egNkFrozen()) return true;
        g.arm += g.omega * dtS;
        g.beams.forEach((el, i) => { el.style.rotate = (g.arm + i * 180) + 'deg'; });
        const c = _egNkPlayerCenter();
        if (c && now >= touchCd) {
            const dx = c.x - g.px, dy = c.y - g.py;
            const d = Math.hypot(dx, dy);
            if (d > 70) {
                const pa = Math.atan2(dy, dx) * 180 / Math.PI;
                for (let i = 0; i < 2; i++) {
                    const diff = ((pa - (g.arm + i * 180)) % 360 + 360) % 360;
                    if (diff < 4 || diff > 356) {
                        touchCd = now + EG_AG_HIT_CD_MS;
                        _egAgTouch(EG_AG_BEAM_DMG, level, 'Bastion Beam');
                        break;
                    }
                }
            }
        }
        return true;
    });

    // Metronome: each beat the beams spin faster; at zero, the VANGUARD.
    const cdTick = EG_AG_FINAL_TICK_MS * (_EG_AG_DEBUG_SLOW ? 8 : 1);
    g.cdTimer = setInterval(() => {
        if (!_egAgFinal || _egAgFinal !== g || g.finished) return;
        if (_egNkFrozen()) return;
        g.count--;
        if (g.count <= 0) {
            clearInterval(g.cdTimer);
            g.cdTimer = null;
            try { g.overlay.remove(); } catch (e) {}
            g.overlay = null;
            // Beams retract; the vanguard charges begin.
            g.beamOn = false;
            g.beams.forEach(b => b.classList.add('eg-ag-beam-retract'));
            _egNkToast('eg_mech_ag_final_bang', '🏰💀 VANGUARD CHARGE!', '#e2e8f0');
            _egAgVanguard(g, monster);
            return;
        }
        g.omega = EG_AG_BEAM_OMEGAS[EG_AG_FINAL_TICKS - g.count];
        const num = g.overlay && g.overlay.querySelector('.eg-ag-cd-num');
        if (num) {
            num.textContent = g.count;
            num.classList.remove('eg-bmb-cd-pop');
            void num.offsetWidth;
            num.classList.add('eg-bmb-cd-pop');
        }
    }, cdTick);
}

// THE VANGUARD: three rapid shield charges barrel across the player's row,
// the last one huge. Then the bastion stands down.
function _egAgVanguard(g, monster) {
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const bandH = 150;
    const speed = 820 / _EG_AG_DEBUG_MULT;
    const warnMs = EG_AG_VANG_WARN * _EG_AG_DEBUG_MULT;
    const gapMs = EG_AG_VANG_GAP * _EG_AG_DEBUG_MULT;

    const c0 = _egNkPlayerCenter() || { x: W / 2, y: H / 2 };
    const lanes = [];
    let lastY = c0.y;
    for (let i = 0; i < 3; i++) {
        const y = i === 0 ? lastY
            : Math.max(90, Math.min(H - 90, lastY + (Math.random() * 2 - 1) * 240));
        lastY = y;
        lanes.push({ y, at: i * gapMs, fired: false, el: null, x: 0, fromLeft: Math.random() < 0.5, done: false });
    }

    let t = 0, touchCd = 0;
    _egNkLoop(g.fxRun, (dtS, now) => {
        t += dtS * 1000;
        const pr = _egNkPlayerRect();
        let active = false;
        lanes.forEach((ln, i) => {
            if (ln.done) return;
            if (!ln.el) {
                if (t < ln.at) return;
                const el = document.createElement('div');
                el.className = 'eg-ag-vangwarn';
                el.style.left = '0px';
                el.style.width = W + 'px';
                el.style.top = Math.round(ln.y - bandH / 2) + 'px';
                el.style.height = bandH + 'px';
                document.body.appendChild(el);
                g.fxRun.els.push(el);
                ln.el = { warn: el, charger: null };
                ln.warnAt = t + warnMs;
                return;
            }
            if (!ln.el.charger) {
                if (t < ln.warnAt) { active = true; return; }
                try { ln.el.warn.remove(); } catch (e) {}
                const big = i === 2;
                const charger = document.createElement('div');
                charger.className = 'eg-ag-charger' + (big ? ' eg-ag-charger-big' : '');
                charger.style.top = Math.round(ln.y - bandH * (big ? 0.5 : 0.45)) + 'px';
                charger.style.height = Math.round(bandH * (big ? 1 : 0.9)) + 'px';
                ln.x = ln.fromLeft ? -130 : W + 30;
                charger.style.left = Math.round(ln.x) + 'px';
                document.body.appendChild(charger);
                g.fxRun.els.push(charger);
                ln.el.charger = charger;
                _egAgDebris(ln.fromLeft ? 40 : W - 40, ln.y, big);
                return;
            }
            ln.x += (ln.fromLeft ? 1 : -1) * speed * dtS;
            ln.el.charger.style.left = Math.round(ln.x) + 'px';
            if (ln.x < -150 || ln.x > W + 150) {
                ln.done = true;
                try { ln.el.charger.remove(); } catch (e) {}
                if (i === 2) {
                    document.body.classList.add('eg-ag-flash');
                    const fid = setTimeout(() => document.body.classList.remove('eg-ag-flash'), 700);
                    g.fxRun.timers.push(fid);
                }
                return;
            }
            active = true;
            if (pr && now >= touchCd) {
                const py = pr.top + pr.height / 2;
                if (Math.abs(py - ln.y) < bandH / 2 + 8) {
                    touchCd = now + EG_AG_HIT_CD_MS;
                    _egAgTouch(i === 2 ? EG_AG_FINAL_DMG : EG_AG_VANG_DMG, level,
                        i === 2 ? 'THE LAST BASTION' : 'Vanguard Charge');
                }
            }
        });
        if (!active && lanes.every(ln => ln.done)) {
            const id = setTimeout(() => _egAgFinalEnd(g), _EG_AG_DEBUG_SLOW ? 5500 : 1200);
            g.fxRun.timers.push(id);
            return false;
        }
        return true;
    });
}

function _egAgFinalEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    g.beamOn = false;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.citadel) { try { g.citadel.remove(); } catch (e) {} g.citadel = null; }
    if (g.bastion) { try { g.bastion.remove(); } catch (e) {} g.bastion = null; }
    g.beams.forEach(b => { try { b.remove(); } catch (e) {} });
    g.beams = [];
    if (g.fxRun) { try { _egNkKillRun(g.fxRun); } catch (e) {} g.fxRun = null; }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    document.body.classList.remove('eg-ag-flash');
    _egAgAegisGlow(false);
    document.querySelectorAll('.eg-ag-fortified').forEach(el => el.classList.remove('eg-ag-fortified'));

    const m = (g.monsterId && typeof _egMonsters !== 'undefined')
        ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _egBossScheduleMechanics === 'function') {
            try { _egBossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
    }
    if (_egAgFinal === g) _egAgFinal = null;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body class this boss ever created.
function _egAgTeardown() {
    if (_egAgFinal) { try { _egAgFinalEnd(_egAgFinal); } catch (e) {} _egAgFinal = null; }
    document.querySelectorAll('.eg-ag-chargewarn, .eg-ag-charger, .eg-ag-vangwarn, .eg-ag-sentry, ' +
        '.eg-ag-orb, .eg-ag-rotor-pivot, .eg-ag-rotor-arm, .eg-ag-bastion, .eg-ag-beam, ' +
        '.eg-ag-citadel, .eg-ag-cd, .eg-ag-debris').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.body.classList.remove('eg-ag-flash');
    _egAgAegisGlow(false);
    document.querySelectorAll('.eg-ag-fortified').forEach(el => el.classList.remove('eg-ag-fortified'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_AG_DEBUG.fire('protocol'|'charge'|'sentries'|'rotor') — runs one now
//   _EG_AG_DEBUG.final()                                      — BASTION now
if (typeof window !== 'undefined') {
    window._EG_AG_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_aegis') : null;
            if (!monster) return 'no aegis alive';
            const fn = name === 'protocol' ? _egMechAgAegisProtocol
                : name === 'charge' ? _egMechAgShieldCharge
                : name === 'sentries' ? _egMechAgSentries
                : name === 'rotor' ? _egMechAgGuardRotor : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'protocol' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_aegis') : null;
            if (!monster) return 'no aegis alive';
            _egAgFinalStart(monster);
            return 'THE LAST BASTION started';
        },
    };
}
