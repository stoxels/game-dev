//------------------------------------------------------------------------
//-------------------BOSS: THE GRAND PRIOR (boss_bayes)---------------------------
//------------------------------------------------------------------------
// Bayesian theme: veil, prior collapse (2-zone choice), summons.
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
    boss_bayes: {
        id: 'boss_bayes', name: 'Bayes', emoji: '🔮',
        baseHP: 1100, baseDamage: 20, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_bayes — "The Grand Prior"
    // Phase 1 (100% → 50%): normal + Probability Shift + Prior Bomb
    // Phase 2 ( 50% → 25%): immune window, Grid Veil activates, all mechanics intensify
    // Phase 3 ( 25% →  0%): final desperation — very fast charge, Deep Freeze joins in
    boss_bayes: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.0 }, // Phase 1
            { threshold: 0.50, chargeMax: 8, damageMultiplier: 1.6 }, // Phase 2 — VEIL
            { threshold: 0.25, chargeMax: 6, damageMultiplier: 2.0 }, // Phase 3 — DESPERATION
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'probability_shift', intervalBase: 12000, intervalVariance: 3000, handler: '_egMechProbabilityShift' },
            { name: 'prior_bomb', intervalBase: 16000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
            { name: 'frozen_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechFrozenCells' },
            { name: 'prior_collapse', intervalBase: 24000, intervalVariance: 6000, handler: '_egMechPriorCollapse', phase2Only: true },
            // Prior Summons — the only deliberate monster-spawn ability: the
            // boss calls 1–2 weak minions into the arena (see _egMechSummonAdds).
            { name: 'prior_summons', intervalBase: 20000, intervalVariance: 6000, handler: '_egMechSummonAdds', phase2Only: true },
            // grid_veil fires once on phase 2 activation; intervalBase is set
            // absurdly high so it never self-reschedules after that first trigger.
            { name: 'grid_veil', intervalBase: 999999999, intervalVariance: 0, handler: '_egMechGridVeil', phase2Only: true },
        ],
    },
});


// Creates and shows the veil overlay element over the puzzle table.
function _egActivateVeil() {
    _egVeilActive = true;
    const tbl = document.getElementById('ptable');
    if (!tbl) return;
    const parent = tbl.parentElement;
    if (!parent) return;

    let veil = document.getElementById('eg-grid-veil');
    if (!veil) {
        veil = document.createElement('div');
        veil.id = 'eg-grid-veil';
        veil.className = 'eg-grid-veil';
        parent.style.position = 'relative';
        parent.appendChild(veil);
    }
    veil.classList.remove('eg-hidden');
    showToast(t('eg_mech_grid_veil'));
}


// Removes the veil overlay element entirely.
function _egRemoveVeil() {
    _egVeilActive = false;
    const veil = document.getElementById('eg-grid-veil');
    if (veil) veil.remove();
}


// Boss mechanic handler — activates the Grid Veil if it isn't already active.
function _egMechGridVeil(monster, phase) {
    if (_egVeilActive) return;
    _egActivateVeil();
}


function _egMechPriorCollapse(monster, phase) {
    const radius = 95;
    const a = _egBlastPickPos(radius);

    // Keep the decoy a fair distance away so the choice reads clearly.
    let b = _egBlastPickPos(radius);
    let guard = 0;
    while (Math.hypot(b.x - a.x, b.y - a.y) < radius * 4 && guard++ < 20) {
        b = _egBlastPickPos(radius);
    }

    const realIsFirst = Math.random() < 0.5;

    _egRunScreenBlast({
        toastKey: 'eg_mech_prior_collapse',
        accent: '#7fd67f',
        activeMs: 5000,
        damagePct: 0.30,
        zones: [{ ...a, radius }, { ...b, radius }],
        realIndex: realIsFirst ? 0 : 1,
        revealFakeAtActive: true,
    });
}
