import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkToast, _nkWatchFinale, _ptSegDist } from './shared-boss-abilities.js';

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

Object.assign(BOSS_DEFS, {
    boss_warden: {
        id: 'boss_warden', name: 'The Warden', emoji: '🗼',
        baseHP: 1040, baseDamage: 23, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
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
            { name: 'pulse_totems', intervalBase: 16000, intervalVariance: 4000, handler: '_mechTotemPulse' },
            { name: 'frozen_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_mechFrozenCells' },
            { name: 'arc_link', intervalBase: 17000, intervalVariance: 4000, handler: '_mechWardenArcs', phase2Only: true },
        ],
        onInit: (m) => _nkWatchFinale(m, WARDEN_FINALE),
    },
});

const WARDEN_BLAST_R = 150;       // px totem blast radius (= the dashed circle)
const WARDEN_TRI_R = 135;         // px triangle radius around the player

// LOCKDOWN finale (shared waves): the totems lock the arena down.
const WARDEN_FINALE = {
    name: 'The Warden', title: '🗼 LOCKDOWN', element: 'lightning', cls: 'eg-nk-fin-storm', color: '#fde047',
    toastKey: 'eg_mech_warden_final',
    hint: 'The totems lock the arena - read each circle!',
    waves: [
        // Failing a wave must hurt (the Absorption pool soaks the first
        // chunk): same punishment band as the Colossus waves.
        { kind: 'avoid', ms: 2200, dmg: 0.30, extra: 2, label: 'Lockdown Pulse' },
        { kind: 'shelter', ms: 2800, dmg: 0.38, label: 'Lockdown' },
        { kind: 'avoid', ms: 2000, dmg: 0.30, extra: 3, label: 'Lockdown Pulse' },
        { kind: 'shelter', ms: 2600, dmg: 0.46, label: 'Total Lockdown' },
    ],
};

// Three totem spots in a triangle around the player (clamped on screen).
function _wardenSpots() {
    const W = window.innerWidth, H = window.innerHeight;
    const pc = _nkPlayerCenter() || { x: W / 2, y: H / 2 };
    const rot = Math.random() * Math.PI * 2;
    return [0, 1, 2].map(i => {
        const a = rot + i * Math.PI * 2 / 3;
        return {
            x: Math.max(60, Math.min(W - 60, pc.x + Math.cos(a) * WARDEN_TRI_R)),
            y: Math.max(60, Math.min(H - 60, pc.y + Math.sin(a) * WARDEN_TRI_R)),
        };
    });
}

function _wardenTotemEl(run, s) {
    const el = _nkEl(run, 'div', 'eg-ward-totem');
    el.innerHTML = '<i class="eg-ward-totem-cap"></i>';
    el.style.left = Math.round(s.x - 18) + 'px';
    el.style.top = Math.round(s.y - 34) + 'px';
    return el;
}


// Three totems take turns charging (dashed reach circle, 1s), then
// blasting that circle. They rise around you, so the middle is never safe
// for long: step out of each charging circle in turn.
export function _mechTotemPulse(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const rounds = [0, 3, 3, 4][p];
    const warnMs = [0, 950, 850, 750][p], expandMs = 300, gapMs = [0, 300, 250, 200][p];
    const blastR = WARDEN_BLAST_R;
    const dmgPct = [0, 0.28, 0.32, 0.36][p];
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const totems = _wardenSpots().map(s => ({ ...s, el: _wardenTotemEl(run, s) }));
    _nkToast('eg_mech_totems', '🗼 PULSE TOTEMS - step out of each glowing circle before it fires!');
    const order = [];
    for (let r = 0; r < rounds; r++) for (let i = 0; i < 3; i++) order.push(i);
    let idx = 0, stage = 'idle', t = 0, ringEl = null, zoneEl = null, hitDone = false;
    _nkLoop(run, (dtS) => {
        if (idx >= order.length) return false;
        const tot = totems[order[idx]];
        t += dtS * 1000;
        if (stage === 'idle') {
            stage = 'warn';
            t = 0;
            hitDone = false;
            tot.el.classList.add('eg-ward-totem-hot');
            zoneEl = _nkEl(run, 'div', 'eg-ward-zone');
            zoneEl.style.left = Math.round(tot.x - blastR) + 'px';
            zoneEl.style.top = Math.round(tot.y - blastR) + 'px';
            zoneEl.style.width = zoneEl.style.height = (blastR * 2) + 'px';
        } else if (stage === 'warn') {
            if (t >= warnMs) {
                stage = 'blast';
                t = 0;
                tot.el.classList.remove('eg-ward-totem-hot');
                ringEl = _nkEl(run, 'div', 'eg-nk-ring eg-ward-ring');
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
                const c = _nkPlayerCenter();
                if (c && Math.hypot(c.x - tot.x, c.y - tot.y) <= blastR) {
                    const dealt = _nkHit(dmgPct, 'lightning', level);
                    _nkAbilityHitToast(dealt, 'The Warden', 'Totem Pulse');
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


// 60%: ARC LINK - three totems rise around you, then lightning arcs snap
// between ALL totem pairs (a fence). Dashed lines show the arcs for 1.1s;
// then the live fence burns for 2.2s while the triangle spins and CLOSES IN,
// sweeping its beams across the middle - so standing still inside it is
// no longer safe: leave the triangle before it contracts onto you.
export function _mechWardenArcs(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const spots = _wardenSpots();
    const cx = spots.reduce((a, s) => a + s.x, 0) / 3, cy = spots.reduce((a, s) => a + s.y, 0) / 3;
    const base = spots.map(s => ({ a: Math.atan2(s.y - cy, s.x - cx), r: Math.hypot(s.x - cx, s.y - cy) }));
    const totemEls = spots.map(s => {
        const el = _wardenTotemEl(run, s);
        el.classList.add('eg-ward-totem-hot');
        return el;
    });
    const pairs = [[0, 1], [1, 2], [2, 0]];
    const arcs = pairs.map(([a, b]) => {
        const el = _nkEl(run, 'div', 'eg-ward-arc eg-ward-arc-warn');
        return { a, b, el };
    });
    const place = () => arcs.forEach(arc => {
        const A = spots[arc.a], B = spots[arc.b];
        const len = Math.hypot(B.x - A.x, B.y - A.y);
        arc.el.style.left = Math.round(A.x) + 'px';
        arc.el.style.top = Math.round(A.y - 9) + 'px';
        arc.el.style.width = Math.round(len) + 'px';
        arc.el.style.transform = 'rotate(' + Math.atan2(B.y - A.y, B.x - A.x) + 'rad)';
    });
    place();
    _nkToast('eg_mech_warden_arcs', '🗼⚡ ARC LINK - the fence will close in. Get OUT of the triangle and off the lines!', '#fde047');
    const warnMs = 1100, liveMs = 2200, spin = (p >= 3 ? 1.1 : 0.7);
    const closeTo = 0.18;                      // triangle shrinks to 18% of its size
    let t = 0, live = false, cd = 0;
    _nkLoop(run, (dtS) => {
        t += dtS * 1000;
        if (!live && t >= warnMs) {
            live = true;
            arcs.forEach(a => { a.el.classList.remove('eg-ward-arc-warn'); a.el.classList.add('eg-ward-arc-live'); });
        }
        if (live) {
            const f = Math.min(1, (t - warnMs) / liveMs);
            const k = 1 - (1 - closeTo) * f;
            const rot = (t - warnMs) / 1000 * spin;
            spots.forEach((s, i) => {
                s.x = cx + Math.cos(base[i].a + rot) * base[i].r * k;
                s.y = cy + Math.sin(base[i].a + rot) * base[i].r * k;
                totemEls[i].style.left = Math.round(s.x - 18) + 'px';
                totemEls[i].style.top = Math.round(s.y - 34) + 'px';
            });
            place();
            const c = _nkPlayerCenter();
            if (c && t >= cd && arcs.some(a => _ptSegDist(c.x, c.y, spots[a.a].x, spots[a.a].y, spots[a.b].x, spots[a.b].y) < 9 + 18)) {
                cd = t + 500;
                const dealt = _nkHit([0, 0, 0.24, 0.28][p], 'lightning', level);
                _nkAbilityHitToast(dealt, 'The Warden', 'Arc Link');
            }
        }
        return t < warnMs + liveMs;
    });
}
