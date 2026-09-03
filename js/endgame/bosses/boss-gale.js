//------------------------------------------------------------------------
//-------------------BOSS: THE GALE (boss_gale)---------------------------
//------------------------------------------------------------------------
// Air-Man homage: homing cyclone funnels + wind DoT inside.
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
    boss_gale: {
        id: 'boss_gale', name: 'The Gale', emoji: '🌪️',
        baseHP: 1000, baseDamage: 22, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_gale: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'gale_vault', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechGaleVault' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
        ],
    },
});


function _egMechGaleVault(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = p >= 3 ? 4 : 3;
    const speed = [0, 120, 150, 185][p];
    const dotPct = [0, 7, 9, 12][p];
    const durMs = 8000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const funnels = [];
    for (let i = 0; i < count; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-funnel', '🌪️');
        const f = {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            el, warned: false,
        };
        el.style.transform = 'translate(' + Math.round(f.x - 30) + 'px,' + Math.round(f.y - 30) + 'px)';
        funnels.push(f);
    }
    _egNkToast('eg_mech_gale', '🌪️ The Gale: Cyclone Vault! Outrun the funnels!');
    let el = 0;
    let dotWarnAt = 0;
    _egNkLoop(run, (dtS, now) => {
        el += dtS * 1000;
        const c = _egNkPlayerCenter();
        funnels.forEach((f, idx) => {
            if (c) {
                const dx = c.x - f.x, dy = c.y - f.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                f.x += (dx / d) * speed * 0.55 * dtS;
                f.y += (dy / d) * speed * 0.55 * dtS;
            } else {
                f.x += speed * 0.3 * dtS * (idx % 2 ? 1 : -1);
            }
            if (f.x < -70) f.x = window.innerWidth + 60;
            if (f.x > window.innerWidth + 70) f.x = -60;
            if (f.y < -70) f.y = window.innerHeight + 60;
            if (f.y > window.innerHeight + 70) f.y = -60;
            f.el.style.transform = 'translate(' + Math.round(f.x - 30) + 'px,' + Math.round(f.y - 30) + 'px)';
        });
        const pr = _egNkPlayerRect();
        if (pr) {
            let inside = false;
            for (const f of funnels) {
                if (_egNkCircleHit(f.x, f.y, 52, pr, 0)) { inside = true; break; }
            }
            if (inside) {
                _egNkDotTick(run, dotPct, dtS, level, 'cold');
                if (now - dotWarnAt > 3000) {
                    dotWarnAt = now;
                    _egNkToast('eg_nk_move', '⚠️ Move!', '#7dd3fc');
                }
            } else {
                run.dotAcc = 0;
            }
        }
        return el < durMs;
    });
}
