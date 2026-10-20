import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkDotTick, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkNudgeAvatar, _nkPlayerCenter, _nkPlayerRect, _nkToast, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE OBLIVION (boss_oblivion)-------------------------
//------------------------------------------------------------------------
// Pinnacle gravity: a singularity drags you toward a burning core while
// flame beams sweep the disc. Feed the beams distance, feed the core
// sideways motion - or be unmade.
//
// Shared mechanics (fog_bank) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_oblivion: {
        id: 'boss_oblivion', name: 'The Oblivion', emoji: '🌌',
        baseHP: 1220, baseDamage: 27, chargeMax: 11,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_oblivion: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.60 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.20 },
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'singularity', intervalBase: 19000, intervalVariance: 4000, handler: '_mechSingularity' },
            { name: 'event_beams', intervalBase: 20000, intervalVariance: 4000, handler: '_mechEventBeams' },
            { name: 'fog_bank', intervalBase: 22000, intervalVariance: 5000, handler: '_mechFogBank' },
        ],
    },
});


// A gravity core pulls the player inward and burns anyone who falls in.
// Strafe sideways around it instead of fighting the pull head-on.
export function _mechSingularity(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const pullSpeed = [0, 150, 180, 215][p];
    const coreR = 70;
    const coreDot = [0, 14, 17, 21][p];
    const durMs = 8000;
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5, cy = window.innerHeight * 0.45;
    const core = _nkEl(run, 'div', 'sx-nk-dot sx-nk-singularity', '🌌');
    core.style.transform = 'translate(' + Math.round(cx - 30) + 'px,' + Math.round(cy - 30) + 'px)';
    const ring = _nkEl(run, 'div', 'sx-nk-ring sx-nk-ring-warn');
    ring.style.left = Math.round(cx - coreR) + 'px';
    ring.style.top = Math.round(cy - coreR) + 'px';
    ring.style.width = coreR * 2 + 'px';
    ring.style.height = coreR * 2 + 'px';
    _nkToast('eg_mech_singularity', '🌌 The Oblivion: Singularity! Orbit - do not fall in!');
    let e = 0, dotWarnAt = 0;
    _nkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _nkPlayerCenter();
        if (c) {
            const dx = cx - c.x, dy = cy - c.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const falloff = Math.min(1, d / 140);
            _nkNudgeAvatar((dx / d) * pullSpeed * falloff * dtS, (dy / d) * pullSpeed * falloff * dtS);
            if (d < coreR) {
                _nkDotTick(run, coreDot, dtS, level, 'shadow');
                if (now - dotWarnAt > 2500) {
                    dotWarnAt = now;
                    _nkToast('eg_nk_move', '⚠️ Escape the core!', '#a78bfa');
                }
            } else {
                run.dotAcc = 0;
            }
        }
        return e < durMs;
    });
}

// Rotating flame beams around the arena center; touching one burns.
// Count the rotation and slip between beams as they pass.
export function _mechEventBeams(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const nBeams = [0, 3, 3, 4][p];
    const omega = [0, 0.8, 0.95, 1.15][p];
    const halfW = 20;
    const dmgPct = [0, 0.13, 0.16, 0.20][p];
    const durMs = 7000;
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5, cy = window.innerHeight * 0.45;
    const len = Math.hypot(window.innerWidth, window.innerHeight);
    const beams = [];
    for (let i = 0; i < nBeams; i++) {
        const el = _nkEl(run, 'div', 'sx-nk-beam sx-nk-beam-fire');
        el.style.width = Math.round(len) + 'px';
        el.style.height = halfW * 2 + 'px';
        el.style.left = Math.round(cx) + 'px';
        el.style.top = Math.round(cy - halfW) + 'px';
        beams.push({ off: i * Math.PI * 2 / nBeams, el });
    }
    _nkToast('eg_mech_event', '🌌 The Oblivion: Event Beams! The disc sweeps fast!');
    let e = 0, cdUntil = 0;
    _nkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const pr = _nkPlayerRect();
        const pts = pr ? [
            [pr.left + pr.width / 2, pr.top + pr.height / 2],
            [pr.left, pr.top], [pr.right, pr.top],
            [pr.left, pr.bottom], [pr.right, pr.bottom],
        ] : null;
        beams.forEach(b => {
            const a = b.off + (e / 1000) * omega;
            b.el.style.transform = 'rotate(' + a + 'rad)';
            if (pts && now >= cdUntil) {
                const bx = cx + Math.cos(a) * len, by = cy + Math.sin(a) * len;
                for (const pt of pts) {
                    if (_ptSegDist(pt[0], pt[1], cx, cy, bx, by) < halfW + 6) {
                        cdUntil = now + 900;
                        const dealt = _nkHit(dmgPct, 'fire', level);
                        _nkAbilityHitToast(dealt, 'The Oblivion', 'Event Beams');
                        break;
                    }
                }
            }
        });
        return e < durMs;
    });
}
