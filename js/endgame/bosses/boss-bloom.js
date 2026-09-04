//------------------------------------------------------------------------
//-------------------BOSS: THE BLOOM (boss_bloom)-------------------------------
//------------------------------------------------------------------------
// Malenia homage: the Scarlet Bloom. A flower blooms exactly where you
// stand — after a long, readable delay. The blast is only half of it: the
// bloom leaves a rotting zone that punishes anyone who lingered.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (corrupt_cells, probability_shift, prior_bomb,
// frozen_cells, clue_swap, grid_invert, summons, fated_cell, fog_bank,
// clue_scramble, soul_tithe) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_bloom: {
        id: 'boss_bloom', name: 'The Bloom', emoji: '🌸',
        baseHP: 1000, baseDamage: 23, chargeMax: 11,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_bloom: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'scarlet_bloom', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechScarletBloom' },
            { name: 'fated_cell', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechFatedCell' },
            { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
        ],
    },
});


function _egMechScarletBloom(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const blooms = [0, 2, 2, 3][p];
    const warnMs = 1400, radius = 110;
    const rotMs = 6000;
    const dmgPct = [0, 0.20, 0.24, 0.30][p];
    const rotPct = [0, 8, 10, 12][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const queue = [];
    for (let i = 0; i < blooms; i++) {
        const c = _egNkPlayerCenter();
        const x = c ? c.x : window.innerWidth / 2;
        const y = c ? c.y : window.innerHeight / 2;
        const mark = _egNkEl(run, 'div', 'eg-nk-mark');
        mark.style.display = 'none';
        mark.style.width = radius * 2 + 'px';
        mark.style.height = radius * 2 + 'px';
        const flower = _egNkEl(run, 'div', 'eg-nk-dot', '🌸');
        flower.style.display = 'none';
        queue.push({ x, y, t: -i * 1800, struck: false, rotT: 0, rotEl: null, mark, flower });
    }
    _egNkToast('eg_mech_bloom', '🌸 The Bloom: Scarlet Bloom! It blooms where you stood!');
    _egNkLoop(run, (dtS, now) => {
        let pending = false;
        const pr = _egNkPlayerRect();
        queue.forEach(b => {
            b.t += dtS * 1000;
            if (b.t < 0) { pending = true; return; }
            if (!b.struck) {
                pending = true;
                b.mark.style.display = '';
                b.mark.style.left = Math.round(b.x - radius) + 'px';
                b.mark.style.top = Math.round(b.y - radius) + 'px';
                b.flower.style.display = '';
                b.flower.style.transform = 'translate(' + Math.round(b.x - 22) + 'px,' + Math.round(b.y - 22) + 'px)';
                if (b.t >= warnMs) {
                    b.struck = true;
                    b.mark.classList.add('eg-nk-mark-hit');
                    if (_egNkCircleHit(b.x, b.y, radius, pr, 0)) {
                        const dealt = _egNkHit(dmgPct, 'fire', level);
                        _egNkAbilityHitToast(dealt, 'The Bloom', 'Scarlet Bloom');
                    }
                    const rot = _egNkEl(run, 'div', 'eg-nk-rot');
                    rot.style.width = radius * 2 + 'px';
                    rot.style.height = radius * 2 + 'px';
                    rot.style.transform = 'translate(' + Math.round(b.x - radius) + 'px,' + Math.round(b.y - radius) + 'px)';
                    b.rotEl = rot;
                    setTimeout(() => { b.flower.remove(); b.mark.remove(); }, 450);
                }
                return;
            }
            // Rotting aftermath.
            b.rotT += dtS * 1000;
            if (b.rotT < rotMs) {
                pending = true;
                if (pr && _egNkCircleHit(b.x, b.y, radius, pr, 0)) {
                    _egNkDotTick(run, rotPct, dtS, level, 'fire');
                } else {
                    run.dotAcc = 0;
                }
            } else if (b.rotEl) {
                b.rotEl.remove();
                b.rotEl = null;
            }
        });
        return pending;
    });
}
