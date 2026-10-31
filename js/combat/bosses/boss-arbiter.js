import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkToast, _nkWatchFinale } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE ARBITER (boss_arbiter)---------------------------
//------------------------------------------------------------------------
// Stillness Trial: each cast is a run of BLUE waves (hold perfectly still)
// and ORANGE waves (keep moving), strictly alternating, with a countdown on
// the verdict. Read the color, obey the rule.
// At 10%: LAST JUDGEMENT (shared finale waves).
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
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 10, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'stillness_trial', intervalBase: 21000, intervalVariance: 5000, handler: '_mechStillnessTrial' },
            { name: 'fated_cell', intervalBase: 20000, intervalVariance: 5000, handler: '_mechFatedCell' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_mechProbabilityShift' },
        ],
        onInit: (m) => { _nkWatchFinale(m, ARB_FINALE); },
    },
});

// LAST JUDGEMENT (shared waves): the court rises - read each circle.
const ARB_FINALE = {
    name: 'The Arbiter', title: '⚖️ LAST JUDGEMENT', element: 'shadow', cls: 'sx-nk-fin-arb', color: '#c4b5fd',
    hint: 'The court is in session - check each circle!',
    waves: [
        { kind: 'avoid', ms: 2100, dmg: 0.15, extra: 3, label: 'Last Judgement' },
        { kind: 'shelter', ms: 2700, dmg: 0.22, label: 'Last Judgement' },
        { kind: 'avoid', ms: 1900, dmg: 0.15, extra: 4, label: 'Last Judgement' },
        { kind: 'shelter', ms: 2500, dmg: 0.28, label: 'The Sentence' },
    ],
};


// Colored judgment waves: BLUE punishes any movement, ORANGE punishes
// standing still. The rule is telegraphed before each wave goes live.
export function _mechStillnessTrial(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const waves = [0, 2, 2, 3][p];
    const warnMs = 1200, activeMs = 2500, gapMs = 800;
    const moveTol = 24; // px - BLUE forgives tiny jitter, not travel
    const stillTol = 40; // px - ORANGE demands real travel
    const dmgPct = [0, 0.16, 0.19, 0.24][p];
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    let left = waves, stage = 'idle', t = 0, blue = Math.random() < 0.5;
    let tint = null, label = null, judged = false, ax = 0, ay = 0;
    const clearWaveEls = () => {
        if (tint) { tint.remove(); tint = null; }
        if (label) { label.remove(); label = null; }
    };
    const startWave = () => {
        left--;
        blue = !blue;                  // strict alternation: freeze, move, freeze...
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
        if (label) {
            const base = blue ? '💙 FREEZE!' : '🧡 MOVE!';
            label.textContent = stage === 'warn' ? base : base + ' ' + Math.max(0, Math.ceil((activeMs - t) / 1000));
        }
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
