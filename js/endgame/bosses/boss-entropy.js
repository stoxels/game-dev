//------------------------------------------------------------------------
//-------------------BOSS: ENTROPY (boss_entropy)---------------------------
//------------------------------------------------------------------------
// Thermodynamics theme: inversion field, shrinking heat-bloom refuge.
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
    boss_entropy: {
        id: 'boss_entropy', name: 'Entropy', emoji: '♾️',
        baseHP: 1000, baseDamage: 22, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_entropy — "The Second Law"
    // Phase 1 (100% → 60%): Inversion Field + Probability Shift
    // Phase 2 ( 60% → 30%): immune window, Deep Freeze joins the rotation
    // Phase 3 ( 30% →  0%): heat death — everything at maximum frequency
    boss_entropy: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.0 }, // Phase 1
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.5 }, // Phase 2
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.1 }, // Phase 3 — HEAT DEATH
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'grid_invert', intervalBase: 14000, intervalVariance: 3000, handler: '_egMechGridInvert' },
            { name: 'probability_shift', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechProbabilityShift' },
            { name: 'frozen_cells', intervalBase: 16000, intervalVariance: 4000, handler: '_egMechFrozenCells', phase2Only: true },
            { name: 'heat_bloom', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechHeatBloom', phase2Only: true },
        ],
    },
});


function _egMechHeatBloom(monster, phase) {
    const radius = 110;

    _egRunScreenBlast({
        toastKey: 'eg_mech_heat_bloom',
        accent: '#ff8c3c',
        activeMs: phase >= 3 ? 4200 : 5000,
        damagePct: 0.30,
        zones: [_egBlastPickPos(radius)].map(p => ({ ...p, radius })),
        shrinkToRadius: 70,
    });
}
