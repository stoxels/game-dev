//------------------------------------------------------------------------
//-------------------BOSS: THE MAELSTROM (boss_maelstrom)-----------------------
//------------------------------------------------------------------------
// Gravity-well homage: a vortex drags your avatar toward its eye — fight
// the pull — then detonates in a nova. Be far from the center when it blows.
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
    boss_maelstrom: {
        id: 'boss_maelstrom', name: 'The Maelstrom', emoji: '🌊',
        baseHP: 1020, baseDamage: 24, chargeMax: 11,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_maelstrom: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'vortex_nova', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechMaelstromVortex' },
            { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechMaelstromVortex(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const pullMs = 4500;
    const pullSpeed = [0, 120, 145, 170][p];
    const novaR = [0, 170, 180, 190][p];
    const dmgPct = [0, 0.26, 0.30, 0.36][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.5;
    const eye = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-vortex', '🌊');
    eye.style.transform = 'translate(' + Math.round(cx - 30) + 'px,' + Math.round(cy - 30) + 'px)';
    // Dashed preview of the nova radius, visible from the very start.
    const nova = _egNkEl(run, 'div', 'eg-nk-ring eg-nk-ring-warn');
    nova.style.left = Math.round(cx - novaR) + 'px';
    nova.style.top = Math.round(cy - novaR) + 'px';
    nova.style.width = novaR * 2 + 'px';
    nova.style.height = novaR * 2 + 'px';
    _egNkToast('eg_mech_vortex', '🌊 The Maelstrom: Vortex! Fight the pull, then clear the nova!');
    let e = 0, detonated = false;
    _egNkLoop(run, (dtS) => {
        e += dtS * 1000;
        if (e < pullMs) {
            const c = _egNkPlayerCenter();
            if (c) {
                const dx = cx - c.x, dy = cy - c.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                // Pull weakens very close to the eye so you can never be
                // sucked into the exact center against your will.
                const falloff = Math.min(1, d / 120);
                _egNkNudgeAvatar((dx / d) * pullSpeed * falloff * dtS, (dy / d) * pullSpeed * falloff * dtS);
            }
            return true;
        }
        if (!detonated) {
            detonated = true;
            nova.classList.remove('eg-nk-ring-warn');
            nova.classList.add('eg-nk-boom');
            const c = _egNkPlayerCenter();
            if (c && Math.hypot(c.x - cx, c.y - cy) <= novaR) {
                const dealt = _egNkHit(dmgPct, 'cold', level);
                _egNkAbilityHitToast(dealt, 'The Maelstrom', 'Vortex Nova');
            } else {
                _egNkToast('eg_blast_dodged', '✅ You dodged the blast!', '#4ade80');
            }
        }
        return e < pullMs + 600;
    });
}
