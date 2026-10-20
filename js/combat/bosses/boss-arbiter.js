import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE ARBITER (boss_arbiter)---------------------------
//------------------------------------------------------------------------
// Stillness Trial: each cast is a BLUE wave (hold perfectly still) or an
// ORANGE wave (keep moving). Read the color, obey the rule.
//
// Shared mechanics (fated_cell, probability_shift) live in
// shared-boss-abilities.js and are referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_arbiter: {
        id: 'boss_arbiter', name: 'The Arbiter', emoji: '⚖️',
        baseHP: 1020, baseDamage: 23, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_arbiter: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'stillness_trial', intervalBase: 21000, intervalVariance: 5000, handler: '_mechStillnessTrial' },
            { name: 'fated_cell', intervalBase: 20000, intervalVariance: 5000, handler: '_mechFatedCell' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_mechProbabilityShift' },
        ],
    },
});


// Colored judgment waves: BLUE punishes any movement, ORANGE punishes
// standing still. The rule is telegraphed before each wave goes live.
export function _mechStillnessTrial(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const waves = [0, 1, 1, 2][p];
    const warnMs = 1200, activeMs = 2500, gapMs = 800;
    const moveTol = 24; // px - BLUE forgives tiny jitter, not travel
    const stillTol = 40; // px - ORANGE demands real travel
    const dmgPct = [0, 0.16, 0.19, 0.24][p];
    const run = _nkNewRun(monster && monster.id, true);
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
        tint = _nkEl(run, 'div', blue ? 'sx-nk-trial-blue' : 'sx-nk-trial-orange');
        label = _nkEl(run, 'div', 'sx-nk-trial-label', blue ? '💙 FREEZE!' : '🧡 MOVE!');
        _nkToast('eg_mech_stillness', blue
            ? '⚖️ The Arbiter: BLUE trial - hold perfectly still!'
            : '⚖️ The Arbiter: ORANGE trial - keep moving!');
    };
    _nkLoop(run, (dtS) => {
        if (stage === 'idle') {
            if (left <= 0) { clearWaveEls(); return false; }
            startWave();
            return true;
        }
        t += dtS * 1000;
        if (stage === 'warn' && t >= warnMs) {
            stage = 'active';
            t = 0;
            const c = _nkPlayerCenter();
            ax = c ? c.x : 0;
            ay = c ? c.y : 0;
        } else if (stage === 'active') {
            const c = _nkPlayerCenter();
            if (c && !judged) {
                const moved = Math.hypot(c.x - ax, c.y - ay);
                if ((blue && moved > moveTol) || (!blue && t >= activeMs - 100 && moved < stillTol)) {
                    // BLUE judges instantly; ORANGE judges at the window's end.
                    if (blue || t >= activeMs) {
                        judged = true;
                        const dealt = _nkHit(dmgPct, 'shadow', level);
                        _nkAbilityHitToast(dealt, 'The Arbiter', 'Stillness Trial');
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
