//------------------------------------------------------------------------
//-------------------BOSS: THE BUZZSAW (boss_buzz)------------------------------
//------------------------------------------------------------------------
// IWBTG homage: spinning saws patrol fixed rails (two horizontal, one
// vertical), bouncing off the screen edges. Touching one is a heavy hit.
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
    boss_buzz: {
        id: 'boss_buzz', name: 'The Buzzsaw', emoji: '🪚',
        baseHP: 980, baseDamage: 25, chargeMax: 11,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_buzz: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'rail_saws', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechRailSaws' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
        ],
    },
});


function _egMechRailSaws(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const speed = [0, 170, 200, 240][p];
    const radius = 30;
    const dmgPct = [0, 0.20, 0.24, 0.30][p];
    const durMs = 10000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const mkSaw = (x, y, vx, vy) => {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-saw', '🪚');
        return { x, y, vx, vy, el };
    };
    const saws = [
        mkSaw(60, H * 0.30, speed, 0),
        mkSaw(W - 60, H * 0.70, -speed, 0),
        mkSaw(W * 0.50, 60, 0, speed * 0.9),
    ];
    _egNkToast('eg_mech_saws', '🪚 The Buzzsaw: Rail Saws! They never stop!');
    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const pr = _egNkPlayerRect();
        saws.forEach(s => {
            s.x += s.vx * dtS;
            s.y += s.vy * dtS;
            if (s.x < radius + 8 || s.x > window.innerWidth - radius - 8) s.vx *= -1;
            if (s.y < radius + 8 || s.y > window.innerHeight - radius - 8) s.vy *= -1;
            s.x = Math.max(radius + 8, Math.min(window.innerWidth - radius - 8, s.x));
            s.y = Math.max(radius + 8, Math.min(window.innerHeight - radius - 8, s.y));
            s.el.style.transform = 'translate(' + Math.round(s.x - radius) + 'px,' + Math.round(s.y - radius) + 'px)';
            if (pr && now >= cdUntil && _egNkDotHit(s.el, pr, 0)) {
                cdUntil = now + 1000;
                const dealt = _egNkHit(dmgPct, null, level);
                _egNkAbilityHitToast(dealt, 'The Buzzsaw', 'Rail Saws');
            }
        });
        return e < durMs;
    });
}
