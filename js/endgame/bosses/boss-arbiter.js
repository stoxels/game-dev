//------------------------------------------------------------------------
//-------------------BOSS: THE ARBITER (boss_arbiter)---------------------------
//------------------------------------------------------------------------
// Undertale homage: the Stillness Trial. Each cast is a BLUE wave (hold
// perfectly still — moving is punished) or an ORANGE wave (keep moving —
// standing still is punished). Read the color, obey the rule.
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
    boss_arbiter: {
        id: 'boss_arbiter', name: 'The Arbiter', emoji: '⚖️',
        baseHP: 1020, baseDamage: 23, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_arbiter: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'stillness_trial', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechStillnessTrial' },
            { name: 'fated_cell', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechFatedCell' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
        ],
    },
});


function _egMechStillnessTrial(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const waves = [0, 1, 1, 2][p];
    const warnMs = 1200, activeMs = 2500, gapMs = 800;
    const moveTol = 24; // px — BLUE forgives tiny jitter, not travel
    const stillTol = 40; // px — ORANGE demands real travel
    const dmgPct = [0, 0.16, 0.19, 0.24][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    let left = waves, stage = 'idle', t = 0, blue = true;
    let tint = null, label = null, judged = false, ax = 0, ay = 0;
    const clearWaveEls = () => {
        if (tint) { tint.remove(); tint = null; }
        if (label) { label.remove(); label = null; }
    };
    const startWave = () => {
        left--;
        blue = Math.random() < 0.5;
        stage = 'warn';
        t = 0;
        judged = false;
        tint = _egNkEl(run, 'div', blue ? 'eg-nk-trial-blue' : 'eg-nk-trial-orange');
        label = _egNkEl(run, 'div', 'eg-nk-trial-label', blue ? '💙 FREEZE!' : '🧡 MOVE!');
        _egNkToast('eg_mech_stillness', blue
            ? '⚖️ The Arbiter: BLUE trial — hold perfectly still!'
            : '⚖️ The Arbiter: ORANGE trial — keep moving!');
    };
    _egNkLoop(run, (dtS) => {
        if (stage === 'idle') {
            if (left <= 0) { clearWaveEls(); return false; }
            startWave();
            return true;
        }
        t += dtS * 1000;
        if (stage === 'warn' && t >= warnMs) {
            stage = 'active';
            t = 0;
            const c = _egNkPlayerCenter();
            ax = c ? c.x : 0;
            ay = c ? c.y : 0;
        } else if (stage === 'active') {
            const c = _egNkPlayerCenter();
            if (c && !judged) {
                const moved = Math.hypot(c.x - ax, c.y - ay);
                if ((blue && moved > moveTol) || (!blue && t >= activeMs - 100 && moved < stillTol)) {
                    // BLUE judges instantly; ORANGE judges at the window's end.
                    if (blue || t >= activeMs) {
                        judged = true;
                        const dealt = _egNkHit(dmgPct, 'shadow', level);
                        _egNkAbilityHitToast(dealt, 'The Arbiter', 'Stillness Trial');
                    }
                }
            }
            if (t >= activeMs + gapMs) {
                clearWaveEls();
                stage = 'idle';
                t = 0;
            }
        }
        return true;
    });
}
