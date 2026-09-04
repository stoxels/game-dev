//------------------------------------------------------------------------
//-------------------BOSS: LAPLACE'S DEMON (boss_laplace)---------------------------
//------------------------------------------------------------------------
// Determinism theme: clue rearrangement, relocating fate zone.
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
    boss_laplace: {
        id: 'boss_laplace', name: "Laplace's Demon", emoji: '👁️',
        baseHP: 950, baseDamage: 24, chargeMax: 11,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_laplace — "Laplace's Demon"
    // He already knows every possible future — so he rearranges yours.
    // Phase 1 (100% → 55%): Clue Swap + Prior Bomb
    // Phase 2 ( 55% → 25%): immune window, Inversion Field joins
    // Phase 3 ( 25% →  0%): total determinism — rapid-fire everything
    boss_laplace: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.0 }, // Phase 1
            { threshold: 0.55, chargeMax: 8, damageMultiplier: 1.5 }, // Phase 2
            { threshold: 0.25, chargeMax: 5, damageMultiplier: 2.2 }, // Phase 3 — DETERMINISM
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'clue_swap', intervalBase: 12000, intervalVariance: 3000, handler: '_egMechClueSwap' },
            { name: 'prior_bomb', intervalBase: 15000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
            { name: 'grid_invert', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechGridInvert', phase2Only: true },
            { name: 'fate_rewrite', intervalBase: 24000, intervalVariance: 5000, handler: '_egMechFateRewrite', phase2Only: true },
        ],
    },
});


function _egMechFateRewrite(monster, phase) {
    const radius = 90;
    const activeMs = phase >= 3 ? 4500 : 5500;

    const first = _egBlastPickPos(radius);
    // Destination on the opposite half of the screen — forces real movement.
    const second = {
        x: Math.max(radius + 40, Math.min(window.innerWidth - radius - 40,
            window.innerWidth - first.x)),
        y: Math.max(radius + 40, Math.min(window.innerHeight - radius - 40,
            window.innerHeight - first.y)),
    };

    _egRunScreenBlast({
        toastKey: 'eg_mech_fate_rewrite',
        bossName: "Laplace's Demon",
        abilityName: 'Rewrite Fate',
        accent: '#c39bd3',
        tierNorm: _egBossTierNorm(monster),
        activeMs,
        damagePct: 0.32,
        zones: [{ ...first, radius }],
        ghost: second,
        relocateAtMs: Math.round(activeMs * 0.55),
    });
}
