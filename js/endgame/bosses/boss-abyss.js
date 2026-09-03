//------------------------------------------------------------------------
//-------------------BOSS: THE ABYSS (boss_abyss)-------------------------------
//------------------------------------------------------------------------
// Delve-darkness homage: the screen drowns in darkness and only a circle of
// light keeps you safe. The light follows you — but it lags behind sharp
// movement and keeps shrinking. Move smoothly and deliberately.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (corrupt_cells, probability_shift, prior_bomb,
// frozen_cells, clue_swap, grid_invert, summons) live in
// shared-boss-abilities.js and are referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_abyss: {
        id: 'boss_abyss', name: 'The Abyss', emoji: '🌑',
        baseHP: 1060, baseDamage: 21, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_abyss: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'fading_light', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechAbyssDark' },
            { name: 'frozen_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechFrozenCells' },
        ],
    },
});


function _egMechAbyssDark(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const r0 = 280, r1 = 100;
    const followSpeed = 260; // px/s — slower than a sprinting avatar
    const dotPct = [0, 9, 11, 13][p];
    const durMs = 9000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const start = _egNkPlayerCenter();
    const light = {
        x: start ? start.x : window.innerWidth / 2,
        y: start ? start.y : window.innerHeight / 2,
    };
    const dark = _egNkEl(run, 'div', 'eg-nk-dark');
    _egNkToast('eg_mech_dark', '🌑 The Abyss: Fading Light! Stay in the glow!');
    let e = 0, dotWarnAt = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const f = Math.min(1, e / durMs);
        const r = Math.round(r0 + (r1 - r0) * f);
        const c = _egNkPlayerCenter();
        if (c) {
            const dx = c.x - light.x, dy = c.y - light.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const step = Math.min(d, followSpeed * dtS);
            light.x += (dx / d) * step;
            light.y += (dy / d) * step;
        }
        dark.style.background =
            'radial-gradient(circle ' + r + 'px at ' + Math.round(light.x) + 'px ' + Math.round(light.y) + 'px,' +
            ' transparent 0, transparent 62%, rgba(0,0,0,0.92) 100%)';
        if (c) {
            const d = Math.hypot(c.x - light.x, c.y - light.y);
            if (d > r) {
                _egNkDotTick(run, dotPct, dtS, level, 'shadow');
                if (now - dotWarnAt > 2500) {
                    dotWarnAt = now;
                    _egNkToast('eg_nk_move', '⚠️ Back into the light!', '#a78bfa');
                }
            } else {
                run.dotAcc = 0;
            }
        }
        return e < durMs;
    });
}
