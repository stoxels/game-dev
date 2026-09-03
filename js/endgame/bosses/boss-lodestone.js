//------------------------------------------------------------------------
//-------------------BOSS: THE LODESTONE (boss_lodestone)---------------------------
//------------------------------------------------------------------------
// Magnet-Man homage: polarity drag toward a burning edge.
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
    boss_lodestone: {
        id: 'boss_lodestone', name: 'The Lodestone', emoji: '🧲',
        baseHP: 1050, baseDamage: 21, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_lodestone: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'polarity_field', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechPolarityField' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
        ],
    },
});


function _egMechPolarityField(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const speed = [0, 90, 110, 135][p];
    const dotPct = [0, 10, 12, 14][p];
    const durMs = 5000;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const strip = _egNkEl(run, 'div', dir > 0 ? 'eg-nk-edge eg-nk-edge-right' : 'eg-nk-edge eg-nk-edge-left');
    strip.textContent = '🧲';
    _egNkToast('eg_mech_polarity', '🧲 The Lodestone: Polarity Field! Fight the pull!');
    let el = 0;
    let dotWarnAt = 0;
    _egNkLoop(run, (dtS, now) => {
        el += dtS * 1000;
        _egNkNudgeAvatar(dir * speed * dtS, 0);
        const pr = _egNkPlayerRect();
        if (pr) {
            const nearEdge = dir > 0
                ? pr.right > window.innerWidth - 90
                : pr.left < 90;
            if (nearEdge) {
                _egNkDotTick(run, dotPct, dtS, level, 'lightning');
                if (now - dotWarnAt > 2500) {
                    dotWarnAt = now;
                    _egNkToast('eg_nk_move', '⚠️ Move!', '#f87171');
                }
            } else {
                run.dotAcc = 0;
            }
        }
        return el < durMs;
    });
}
