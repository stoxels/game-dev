//------------------------------------------------------------------------
//-------------------BOSS: THE OBLIVION (boss_oblivion)-------------------------
//------------------------------------------------------------------------
// Pinnacle gravity: a singularity drags you toward a burning core while
// three flame beams sweep the disc. Feed the beams distance, feed the
// core sideways motion — feed both at once, or be unmade.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_oblivion: {
        id: 'boss_oblivion', name: 'The Oblivion', emoji: '🌌',
        baseHP: 1220, baseDamage: 27, chargeMax: 11,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_oblivion: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.60 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.20 },
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'singularity', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechSingularity' },
            { name: 'event_beams', intervalBase: 20000, intervalVariance: 4000, handler: '_egMechEventBeams' },
            { name: 'fog_bank', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechFogBank' },
        ],
    },
});


function _egMechSingularity(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const pullSpeed = [0, 150, 180, 215][p];
    const coreR = 70;
    const coreDot = [0, 14, 17, 21][p];
    const durMs = 8000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5, cy = window.innerHeight * 0.45;
    const core = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-singularity', '🌌');
    core.style.transform = 'translate(' + Math.round(cx - 30) + 'px,' + Math.round(cy - 30) + 'px)';
    const ring = _egNkEl(run, 'div', 'eg-nk-ring eg-nk-ring-warn');
    ring.style.left = Math.round(cx - coreR) + 'px';
    ring.style.top = Math.round(cy - coreR) + 'px';
    ring.style.width = coreR * 2 + 'px';
    ring.style.height = coreR * 2 + 'px';
    _egNkToast('eg_mech_singularity', '🌌 The Oblivion: Singularity! Orbit — do not fall in!');
    let e = 0, dotWarnAt = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        if (c) {
            const dx = cx - c.x, dy = cy - c.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const falloff = Math.min(1, d / 140);
            _egNkNudgeAvatar((dx / d) * pullSpeed * falloff * dtS, (dy / d) * pullSpeed * falloff * dtS);
            if (d < coreR) {
                _egNkDotTick(run, coreDot, dtS, level, 'shadow');
                if (now - dotWarnAt > 2500) {
                    dotWarnAt = now;
                    _egNkToast('eg_nk_move', '⚠️ Escape the core!', '#a78bfa');
                }
            } else {
                run.dotAcc = 0;
            }
        }
        return e < durMs;
    });
}

function _egMechEventBeams(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const nBeams = [0, 3, 3, 4][p];
    const omega = [0, 0.8, 0.95, 1.15][p];
    const halfW = 20;
    const dmgPct = [0, 0.13, 0.16, 0.20][p];
    const durMs = 7000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5, cy = window.innerHeight * 0.45;
    const len = Math.hypot(window.innerWidth, window.innerHeight);
    const beams = [];
    for (let i = 0; i < nBeams; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-beam eg-nk-beam-fire');
        el.style.width = Math.round(len) + 'px';
        el.style.height = halfW * 2 + 'px';
        el.style.left = Math.round(cx) + 'px';
        el.style.top = Math.round(cy - halfW) + 'px';
        beams.push({ off: i * Math.PI * 2 / nBeams, el });
    }
    _egNkToast('eg_mech_event', '🌌 The Oblivion: Event Beams! The disc sweeps fast!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const pr = _egNkPlayerRect();
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
                    if (_egInfernoPtSegDist(pt[0], pt[1], cx, cy, bx, by) < halfW + 6) {
                        cdUntil = now + 900;
                        const dealt = _egNkHit(dmgPct, 'fire', level);
                        _egNkAbilityHitToast(dealt, 'The Oblivion', 'Event Beams');
                        break;
                    }
                }
            }
        });
        return e < durMs;
    });
}
