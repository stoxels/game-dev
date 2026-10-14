import { EG_BOSS_DEFS, EG_BOSS_MECHANICS } from './boss-framework.js';
import { _egNkAbilityHitToast, _egNkDodgeBusy, _egNkEl, _egNkFrozen, _egNkHit, _egNkLoop, _egNkNewRun, _egNkPlayerCenter, _egNkToast, _egNkWatchFinale, _egPtSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE WARDEN (boss_warden)-----------------------------
//------------------------------------------------------------------------
// Totem homage: three storm totems rise in a triangle around you and pulse
// in sequence, each blast's reach drawn as a dashed circle while its totem
// charges. The order cycles, so dance ahead of the pulses once you learn
// the rhythm. 60%: ARC LINK - lightning beams snap between totem pairs
// (dashed lines first). ≤10%: LOCKDOWN (shared finale waves).
//
// Shared mechanics (frozen_cells) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_warden: {
        id: 'boss_warden', name: 'The Warden', emoji: '🗼',
        baseHP: 1040, baseDamage: 23, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_warden: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'pulse_totems', intervalBase: 16000, intervalVariance: 4000, handler: '_egMechTotemPulse' },
            { name: 'frozen_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechFrozenCells' },
            { name: 'arc_link', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechWardenArcs', phase2Only: true },
        ],
        onInit: (m) => _egNkWatchFinale(m, EG_WARDEN_FINALE),
    },
});

const EG_WARDEN_BLAST_R = 150;       // px totem blast radius (= the dashed circle)
const EG_WARDEN_TRI_R = 135;         // px triangle radius around the player

// LOCKDOWN finale (shared waves): the totems lock the arena down.
const EG_WARDEN_FINALE = {
    name: 'The Warden', title: '🗼 LOCKDOWN', element: 'lightning', cls: 'eg-nk-fin-storm', color: '#fde047',
    toastKey: 'eg_mech_warden_final',
    hint: 'The totems lock the arena - read each circle!',
    waves: [
        { kind: 'avoid', ms: 2200, dmg: 0.16, extra: 2, label: 'Lockdown Pulse' },
        { kind: 'shelter', ms: 2800, dmg: 0.22, label: 'Lockdown' },
        { kind: 'avoid', ms: 2000, dmg: 0.16, extra: 3, label: 'Lockdown Pulse' },
        { kind: 'shelter', ms: 2600, dmg: 0.28, label: 'Total Lockdown' },
    ],
};

// Three totem spots in a triangle around the player (clamped on screen).
function _egWardenSpots() {
    const W = window.innerWidth, H = window.innerHeight;
    const pc = _egNkPlayerCenter() || { x: W / 2, y: H / 2 };
    const rot = Math.random() * Math.PI * 2;
    return [0, 1, 2].map(i => {
        const a = rot + i * Math.PI * 2 / 3;
        return {
            x: Math.max(60, Math.min(W - 60, pc.x + Math.cos(a) * EG_WARDEN_TRI_R)),
            y: Math.max(60, Math.min(H - 60, pc.y + Math.sin(a) * EG_WARDEN_TRI_R)),
        };
    });
}

function _egWardenTotemEl(run, s) {
    const el = _egNkEl(run, 'div', 'eg-ward-totem');
    el.innerHTML = '<i class="eg-ward-totem-cap"></i>';
    el.style.left = Math.round(s.x - 18) + 'px';
    el.style.top = Math.round(s.y - 34) + 'px';
    return el;
}


// Three totems take turns charging (dashed reach circle, 1s), then
// blasting that circle. They rise around you, so the middle is never safe
// for long: step out of each charging circle in turn.
export function _egMechTotemPulse(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const rounds = [0, 2, 2, 3][p];
    const warnMs = 1000, expandMs = 350, gapMs = [0, 450, 350, 250][p];
    const blastR = EG_WARDEN_BLAST_R;
    const dmgPct = [0, 0.11, 0.13, 0.15][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const totems = _egWardenSpots().map(s => ({ ...s, el: _egWardenTotemEl(run, s) }));
    _egNkToast('eg_mech_totems', '🗼 PULSE TOTEMS - step out of each glowing circle before it fires!');
    const order = [];
    for (let r = 0; r < rounds; r++) for (let i = 0; i < 3; i++) order.push(i);
    let idx = 0, stage = 'idle', t = 0, ringEl = null, zoneEl = null, hitDone = false;
    _egNkLoop(run, (dtS) => {
        if (idx >= order.length) return false;
        const tot = totems[order[idx]];
        t += dtS * 1000;
        if (stage === 'idle') {
            stage = 'warn';
            t = 0;
            hitDone = false;
            tot.el.classList.add('eg-ward-totem-hot');
            zoneEl = _egNkEl(run, 'div', 'eg-ward-zone');
            zoneEl.style.left = Math.round(tot.x - blastR) + 'px';
            zoneEl.style.top = Math.round(tot.y - blastR) + 'px';
            zoneEl.style.width = zoneEl.style.height = (blastR * 2) + 'px';
        } else if (stage === 'warn') {
            if (t >= warnMs) {
                stage = 'blast';
                t = 0;
                tot.el.classList.remove('eg-ward-totem-hot');
                ringEl = _egNkEl(run, 'div', 'eg-nk-ring eg-ward-ring');
            }
        } else if (stage === 'blast') {
            const f = Math.min(1, t / expandMs);
            const r = Math.max(1, Math.round(blastR * f));
            if (ringEl) {
                ringEl.style.left = Math.round(tot.x - r) + 'px';
                ringEl.style.top = Math.round(tot.y - r) + 'px';
                ringEl.style.width = r * 2 + 'px';
                ringEl.style.height = r * 2 + 'px';
            }
            if (!hitDone && f >= 1) {
                hitDone = true;
                const c = _egNkPlayerCenter();
                if (c && Math.hypot(c.x - tot.x, c.y - tot.y) <= blastR) {
                    const dealt = _egNkHit(dmgPct, 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Warden', 'Totem Pulse');
                }
            }
            if (t >= expandMs + gapMs) {
                if (ringEl) { ringEl.remove(); ringEl = null; }
                if (zoneEl) { zoneEl.remove(); zoneEl = null; }
                stage = 'idle';
                t = 0;
                idx++;
            }
        }
        return true;
    });
}


// 60%: ARC LINK - three totems rise around you, then two (phase 3: all
// three) lightning arcs snap between totem pairs. Dashed lines show the
// arcs for 1.2s; the live arc burns for 1.4s - don't stand on a line.
export function _egMechWardenArcs(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const spots = _egWardenSpots();
    spots.forEach(s => _egWardenTotemEl(run, s).classList.add('eg-ward-totem-hot'));
    const pairs = p >= 3 ? [[0, 1], [1, 2], [2, 0]] : [[0, 1], [1, 2]];
    const arcs = pairs.map(([a, b]) => {
        const A = spots[a], B = spots[b];
        const el = _egNkEl(run, 'div', 'eg-ward-arc eg-ward-arc-warn');
        const len = Math.hypot(B.x - A.x, B.y - A.y);
        el.style.left = Math.round(A.x) + 'px';
        el.style.top = Math.round(A.y - 9) + 'px';
        el.style.width = Math.round(len) + 'px';
        el.style.transform = 'rotate(' + Math.atan2(B.y - A.y, B.x - A.x) + 'rad)';
        return { A, B, el };
    });
    _egNkToast('eg_mech_warden_arcs', '🗼⚡ ARC LINK - lightning will snap along the dashed lines. Step off them!', '#fde047');
    const warnMs = 1200, liveMs = 1400;
    let t = 0, live = false, cd = 0;
    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        if (!live && t >= warnMs) {
            live = true;
            arcs.forEach(a => { a.el.classList.remove('eg-ward-arc-warn'); a.el.classList.add('eg-ward-arc-live'); });
        }
        if (live) {
            const c = _egNkPlayerCenter();
            if (c && t >= cd && arcs.some(a => _egPtSegDist(c.x, c.y, a.A.x, a.A.y, a.B.x, a.B.y) < 9 + 16)) {
                cd = t + 700;
                const dealt = _egNkHit([0, 0, 0.13, 0.15][p], 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Warden', 'Arc Link');
            }
        }
        return t < warnMs + liveMs;
    });
}
