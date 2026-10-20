import { AIL_IGNITE_DMG_SHARE, AIL_MIN_DOT_DAMAGE, _applyPlayerAilment } from '../combat-ailments-core.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkMaxHP, _nkNewRun, _nkPlayerRect, _nkRectsOverlap, _nkTierDamageFactor, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE EMBER (boss_ember)-------------------------------
//------------------------------------------------------------------------
// First-steps fight: slow embers drift straight down with generous
// telegraphs. Every ember that touches you ignites - it IS a flame, and
// the boss itself sits at the 75% fire resistance cap.
//
// Shared mechanics (prior_bomb) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_ember: {
        id: 'boss_ember', name: 'The Ember', emoji: '🔥',
        baseHP: 850, baseDamage: 18, chargeMax: 14,
        // A living flame: fire sits at the hard resistance cap (75%), so
        // fire skills deal only a quarter of their damage to it.
        element: 'fire', resistances: { fire: 75, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_ember: {
        phases: [
            { threshold: 1.00, chargeMax: 14, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 11, damageMultiplier: 1.30 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.70 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'ember_drift', intervalBase: 18000, intervalVariance: 4000, handler: '_mechEmberDrift' },
            { name: 'prior_bomb', intervalBase: 20000, intervalVariance: 5000, handler: '_mechPriorBomb' },
        ],
    },
});


// Slow falling embers that burn and ignite on contact. Drift sideways
// between lanes; standing still under a lane is the only real danger.
export function _mechEmberDrift(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = [0, 6, 8, 10][p];
    const speed = [0, 90, 110, 135][p];
    // %maxHP per contact. Tuned after the hit-detection fix: every visible
    // flame contact now lands AND ignites, so per-hit damage sits lower than
    // the old miss-heavy values - a caught (standing-in-lane) player loses
    // roughly a quarter of their HP per wave, a drifting player ~nothing.
    const dmgPct = [0, 0.04, 0.05, 0.06][p];
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const embers = [];
    for (let i = 0; i < count; i++) {
        const el = _nkEl(run, 'div', 'eg-nk-dot eg-nk-ember', '🔥');
        el.style.display = 'none';
        embers.push({
            x: 40 + Math.random() * Math.max(40, window.innerWidth - 80),
            y: -30 - i * (120 + Math.random() * 120),
            cdUntil: 0, el,
        });
    }
    _nkToast('eg_mech_ember', '🔥 The Ember: Ember Drift! Drift between the embers!');
    _nkLoop(run, (dtS, now) => {
        let pending = false;
        const pr = _nkPlayerRect();
        embers.forEach(o => {
            if (o.y > window.innerHeight + 40) return;
            pending = true;
            o.y += speed * dtS;
            o.el.style.display = '';
            o.el.style.transform = 'translate(' + Math.round(o.x - 14) + 'px,' + Math.round(o.y - 14) + 'px)';
            if (pr && now >= o.cdUntil) {
                // Hit test against the flame's ACTUAL rendered box instead of
                // an idealized point-circle: the collision then matches what
                // the player sees, so a flame that visibly touches the sprite
                // always registers (and the CSS wiggle can't skew the hitbox).
                const fr = o.el.getBoundingClientRect();
                if (fr.width > 0 && _nkRectsOverlap(
                    { left: fr.left - 2, right: fr.right + 2, top: fr.top - 2, bottom: fr.bottom + 2 },
                    pr
                )) {
                    o.cdUntil = now + 800;
                    const dealt = _nkHit(dmgPct, 'fire', level);
                    _nkAbilityHitToast(dealt, 'The Ember', 'Ember Drift');
                    // A living flame burns on contact: guaranteed ignite (fire
                    // DoT) at the standard ignite share of the triggering hit.
                    const igniteDps = Math.max(AIL_MIN_DOT_DAMAGE,
                        Math.max(1, Math.round(_nkMaxHP() * dmgPct * _nkTierDamageFactor(level)))
                        * AIL_IGNITE_DMG_SHARE);
                    _applyPlayerAilment('ignite', igniteDps);
                }
            }
        });
        return pending;
    });
}
