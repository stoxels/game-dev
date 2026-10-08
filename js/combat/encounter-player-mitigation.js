//------------------------------------------------------------------------
//-------------------PLAYER DEFENSIVE MITIGATION-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Incoming player mitigation: fate negation, grounded charge reduction,
// held/dual-wield parries, and projectile deflection. All tuning and public
// names remain shared with the rest of the encounter system.

import { t } from '../translation/translations.js';
import { EG_DEFLECT_BASE_DMG_PCT, EG_DEFLECT_BASE_PCT, EG_PARRY_BASE_PCT } from './encounter-constants.js';
import { _egApplyPlayerMissFeedback } from './encounter-monster-attack-feedback.js';
import { _egDamageTargetById } from './encounter-monster-damage.js';
import { _egFireProjectile, _egGetElementCentre, _egGetProjectileDef } from './combat-class-projectiles.js';
import { EG_DUAL_WIELD_PARRY_PCT, _egComputePlayerStats, _egScheduleAbsorptionRegen } from '../endgame/endgame-player-stats.js';
import { _egIsDualWielding } from '../loot/loot-requirements.js';
import { _egIsActive } from './combat-state.js';


// Rolls fate negation for any incoming non-boss hit. A successful proc
// announces itself, applies miss feedback, and starts Absorption regeneration.
export function _egRollFateNegation(stats) {
    const pct = stats.fatePct || 0;
    if (pct <= 0 || Math.random() * 100 >= pct) return false;
    globalThis.showToast(t('eg_fate'));
    _egApplyPlayerMissFeedback();
    _egScheduleAbsorptionRegen();
    return true;
}

// Rolls Grounded when a monster charge lands. A successful proc reduces that
// hit only; projectiles and other incoming damage pass through unchanged.
export function _egApplyGroundedReduction(rawDamage) {
    const stats = _egComputePlayerStats();
    const chance = stats.groundedChancePct || 0;
    const reduction = Math.min(100, stats.groundedReductionPct || 0);
    if (chance <= 0 || reduction <= 0) return rawDamage;
    if (Math.random() * 100 >= chance) return rawDamage;
    globalThis.showToast(t('eg_grounded'));
    return rawDamage * (1 - reduction / 100);
}

// Creates the short-lived HUD label shown after a held or dual-wield parry.
export function _egApplyPlayerParryFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    const txt = (typeof t === 'function') ? t('eg_parried') : 'Parried!';
    label.textContent = (txt && txt !== 'eg_parried') ? txt : 'Parried!';
    hud.appendChild(label);
    setTimeout(() => label.remove(), 1050);
}

// Creates the short-lived HUD label shown after redirecting a projectile.
export function _egApplyPlayerDeflectFeedback() {
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-player-damage eg-player-miss';
    const txt = (typeof t === 'function') ? t('eg_deflected') : 'Deflected!';
    label.textContent = (txt && txt !== 'eg_deflected') ? txt : 'Deflected!';
    hud.appendChild(label);
    setTimeout(() => label.remove(), 1050);
}

// Returns the held-parry chance: the fixed base plus player gear.
export function _egGetParryChancePct() {
    const base = (typeof EG_PARRY_BASE_PCT !== 'undefined' ? EG_PARRY_BASE_PCT : 50);
    const gear = (_egComputePlayerStats().parryChancePct || 0);
    return base + gear;
}

// Returns the automatic dual-wield parry chance, including player gear.
export function _egGetDualWieldParryChancePct() {
    const base = (typeof EG_DUAL_WIELD_PARRY_PCT !== 'undefined' ? EG_DUAL_WIELD_PARRY_PCT : 15);
    let gear = 0;
    try { gear = (_egComputePlayerStats().parryChancePct || 0); } catch (e) {}
    return base + gear;
}

// Reports whether the player's current weapons enable automatic parrying.
export function _egIsDualWieldParryActive() {
    try {
        if (typeof _egIsDualWielding === 'function') return _egIsDualWielding();
    } catch (e) {}
    return false;
}

// Returns the projectile-deflection chance: the fixed base plus player gear.
export function _egGetDeflectChancePct() {
    const base = (typeof EG_DEFLECT_BASE_PCT !== 'undefined' ? EG_DEFLECT_BASE_PCT : 5);
    const gear = (_egComputePlayerStats().deflectChancePct || 0);
    return base + gear;
}

// Returns redirected projectile damage as a percentage of its original hit.
export function _egGetDeflectDamagePct() {
    const base = (typeof EG_DEFLECT_BASE_DMG_PCT !== 'undefined' ? EG_DEFLECT_BASE_DMG_PCT : 30);
    const gear = (_egComputePlayerStats().deflectDamagePct || 0);
    return base + gear;
}

// Rolls an available held or dual-wield parry while an encounter is active.
export function _egRollParry(attacker, isProjectile) {
    // Hold-parry, or dual-wield auto-parry (two 1H weapons, no key needed)
    const holding = (typeof _egHoldEPauseActive !== 'undefined' && globalThis._egHoldEPauseActive);
    const dualWield = (typeof _egIsDualWieldParryActive === 'function' && _egIsDualWieldParryActive());
    if (!holding && !dualWield) return false;
    if (typeof _egIsActive === 'function' && !_egIsActive()) return false;
    // Hazards and boss spells are not parryable - they flow through isSpell=true,
    // but we also guard here for callers that bypass takeDamage.
    const chance = holding
        ? _egGetParryChancePct()
        : (typeof _egGetDualWieldParryChancePct === 'function' ? _egGetDualWieldParryChancePct() : 15);
    if (chance <= 0) return false;
    if (Math.random() * 100 >= chance) return false;
    globalThis.showToast((typeof t === 'function' ? t('eg_parried') : 'Parried!'));
    _egApplyPlayerParryFeedback();
    _egScheduleAbsorptionRegen();
    return true;
}

// Attempts to redirect a projectile to another living monster. Visual and
// instant fallback paths both apply the same rolled damage exactly once.
export function _egTryDeflectProjectile(attacker, isProjectile) {
    if (!isProjectile) return false;
    if (!attacker) return false;
    const others = globalThis._egMonsters.filter(m => m.id !== attacker.id && m.currentHP > 0);
    if (others.length === 0) return false;
    const chance = _egGetDeflectChancePct();
    if (chance <= 0 || Math.random() * 100 >= chance) return false;
    const dmgPct = _egGetDeflectDamagePct();
    const deflectDamage = Math.max(1, Math.round((attacker.damageValue || 0) * dmgPct / 100));
    const victim = others[Math.floor(Math.random() * others.length)];
    // Visual: fire a quick projectile from player/avatar to the victim
    const playerEl = document.getElementById('player-avatar-wrapper') || document.getElementById('player-avatar-simple');
    const targetCard = document.getElementById(`eg-card-${victim.id}`);
    if (playerEl && targetCard && typeof _egFireProjectile === 'function') {
        const start = _egGetElementCentre(playerEl);
        const end = _egGetElementCentre(targetCard);
        const projDef = (typeof _egGetProjectileDef === 'function') ? _egGetProjectileDef() : { emoji: '↩️', cssClass: 'eg-proj-player', duration: 300, easing: 'linear' };
        _egFireProjectile(projDef, projDef.cssClass, start, end, 320, 'linear', () => {
            const toastKey = (typeof t === 'function' ? t('eg_deflected') : 'Deflected!');
            globalThis.showToast(toastKey !== 'eg_deflected' ? toastKey : `↩️ Deflected to ${victim.name || 'another monster'}!`);
            _egDamageTargetById(victim.id, deflectDamage);
        });
    } else {
        _egDamageTargetById(victim.id, deflectDamage);
        globalThis.showToast((typeof t === 'function' ? t('eg_deflected') : 'Deflected!'));
    }
    _egApplyPlayerDeflectFeedback();
    return true;
}
