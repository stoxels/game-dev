//------------------------------------------------------------------------
//-------------------BOSS: THE STORMCALLER (boss_sirus)---------------------------
//------------------------------------------------------------------------
// PoE Sirus homage: lingering hunting storms, heavy DoT inside.
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
    boss_sirus: {
        id: 'boss_sirus', name: 'The Stormcaller', emoji: '⛈️',
        baseHP: 1060, baseDamage: 23, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_sirus: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'hunting_storms', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechHuntingStorms' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
        ],
    },
});


function _egMechHuntingStorms(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const speed = [0, 55, 68, 85][p];
    const dotPct = [0, 10, 12, 14][p];
    const radius = 105;
    const durMs = 9000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const storms = [];
    for (let i = 0; i < 2; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-storm');
        el.style.width = radius * 2 + 'px';
        el.style.height = radius * 2 + 'px';
        const s = {
            x: i === 0 ? 60 : window.innerWidth - 60,
            y: 60 + Math.random() * Math.max(60, window.innerHeight - 120),
            el,
        };
        el.style.transform = 'translate(' + Math.round(s.x - radius) + 'px,' + Math.round(s.y - radius) + 'px)';
        storms.push(s);
    }
    _egNkToast('eg_mech_storms', '⛈️ The Stormcaller: Hunting Storms! Keep your distance!');
    let e = 0, dotWarnAt = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        storms.forEach(s => {
            if (c) {
                const dx = c.x - s.x, dy = c.y - s.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                s.x += (dx / d) * speed * dtS;
                s.y += (dy / d) * speed * dtS;
            }
            s.el.style.transform = 'translate(' + Math.round(s.x - radius) + 'px,' + Math.round(s.y - radius) + 'px)';
        });
        const pr = _egNkPlayerRect();
        if (pr) {
            let inside = false;
            for (const s of storms) {
                if (_egNkCircleHit(s.x, s.y, radius, pr, 0)) { inside = true; break; }
            }
            if (inside) {
                _egNkDotTick(run, dotPct, dtS, level, 'lightning');
                if (now - dotWarnAt > 3000) {
                    dotWarnAt = now;
                    _egNkToast('eg_nk_move', '⚠️ Move!', '#f87171');
                }
            } else {
                run.dotAcc = 0;
            }
        }
        return e < durMs;
    });
}
