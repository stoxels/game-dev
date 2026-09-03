//------------------------------------------------------------------------
//-------------------BOSS: BRUTUS (boss_brutus)---------------------------
//------------------------------------------------------------------------
// PoE Brutus homage: full-width ground-slam band, move vertically.
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
    boss_brutus: {
        id: 'boss_brutus', name: 'Brutus', emoji: '💥',
        baseHP: 1120, baseDamage: 26, chargeMax: 13,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_brutus: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'ground_slam', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechGroundSlam' },
            { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechGroundSlam(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const h = 130;
    const warnMs = 1200;
    const dmgPct = [0, 0.24, 0.27, 0.32][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const c = _egNkPlayerCenter();
    const y = Math.max(h / 2 + 20, Math.min(window.innerHeight - h / 2 - 20,
        c ? c.y : window.innerHeight / 2));
    const band = _egNkEl(run, 'div', 'eg-nk-band');
    band.style.top = Math.round(y - h / 2) + 'px';
    band.style.height = h + 'px';
    _egNkToast('eg_mech_slam', '💥 Brutus: Ground Slam! Clear the band!');
    let e = 0, struck = false;
    _egNkLoop(run, (dtS) => {
        e += dtS * 1000;
        if (!struck && e >= warnMs) {
            struck = true;
            band.classList.add('eg-nk-band-hit');
            const pr = _egNkPlayerRect();
            if (pr && pr.bottom > y - h / 2 && pr.top < y + h / 2) {
                const dealt = _egNkHit(dmgPct, null, level);
                _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
            }
        }
        return e < warnMs + 600;
    });
}
