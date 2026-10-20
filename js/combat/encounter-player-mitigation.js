//------------------------------------------------------------------------
//-------------------PLAYER DEFENSIVE MITIGATION-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Incoming player mitigation: fate negation, grounded charge reduction,
// held/dual-wield parries, and projectile deflection. All tuning and public
// names remain shared with the rest of the encounter system.

import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { DEFLECT_BASE_DMG_PCT, DEFLECT_BASE_PCT, PARRY_BASE_PCT } from './encounter-constants.js';
import { _applyPlayerMissFeedback } from './encounter-monster-attack-feedback.js';
import { _damageTargetById } from './encounter-monster-damage.js';
import { _fireProjectile, _getElementCentre, _getProjectileDef } from './combat-class-projectiles.js';
import { DUAL_WIELD_PARRY_PCT, _computePlayerStats, _scheduleAbsorptionRegen } from '../endgame/endgame-player-stats.js';
import { _isDualWielding } from '../loot/loot-requirements.js';
import { _isActive } from './combat-state.js';


// Rolls fate negation for any incoming non-boss hit. A successful proc
// announces itself, applies miss feedback, and starts Absorption regeneration.
export function _rollFateNegation(stats) {
    const pct = stats.fatePct || 0;
    if (pct <= 0 || Math.random() * 100 >= pct) return false;
    globalThis.showCombatToast(t('eg_fate'));
    Audio_Manager.playSFX('player_fate_negate');
    _applyPlayerMissFeedback(true);
    _scheduleAbsorptionRegen();
    return true;
}

// Rolls Grounded when a monster charge lands. A successful proc reduces that
// hit only; projectiles and other incoming damage pass through unchanged.
export function _applyGroundedReduction(rawDamage) {
    const stats = _computePlayerStats();
    const chance = stats.groundedChancePct || 0;
    const reduction = Math.min(100, stats.groundedReductionPct || 0);
    if (chance <= 0 || reduction <= 0) return rawDamage;
    if (Math.random() * 100 >= chance) return rawDamage;
    globalThis.showCombatToast(t('eg_grounded'));
    Audio_Manager.playSFX('player_grounded');
    return rawDamage * (1 - reduction / 100);
}

// Creates the short-lived HUD label shown after a held or dual-wield parry.
export function _applyPlayerParryFeedback() {
    Audio_Manager.playSFX('player_parry');
    // Reaction strikes (universal-spells.js) open for a few seconds after this.
    try { if (typeof globalThis.noteUniversalReaction === 'function') globalThis.noteUniversalReaction('parry'); } catch (e) { /* optional */ }
    // Tutorial parry lesson counts every successful parry (set by gauntlet.js).
    try { if (typeof globalThis._onPlayerParry === 'function') globalThis._onPlayerParry(); } catch (e) { /* counter optional */ }
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'sx-player-damage sx-player-miss';
    const txt = (typeof t === 'function') ? t('eg_parried') : 'Parried!';
    label.textContent = (txt && txt !== 'eg_parried') ? txt : 'Parried!';
    hud.appendChild(label);
    setTimeout(() => label.remove(), 1050);
}

// Creates the short-lived HUD label shown after redirecting a projectile.
export function _applyPlayerDeflectFeedback() {
    Audio_Manager.playSFX('player_deflect');
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'sx-player-damage sx-player-miss';
    const txt = (typeof t === 'function') ? t('eg_deflected') : 'Deflected!';
    label.textContent = (txt && txt !== 'eg_deflected') ? txt : 'Deflected!';
    hud.appendChild(label);
    setTimeout(() => label.remove(), 1050);
}

// Returns the held-parry chance: the fixed base plus player gear.
export function _getParryChancePct() {
    // The tutorial's parry lesson: a held parry always lands.
    if (globalThis._parryTutorialForce) return 100;
    const base = (typeof PARRY_BASE_PCT !== 'undefined' ? PARRY_BASE_PCT : 50);
    const gear = (_computePlayerStats().parryChancePct || 0);
    return base + gear;
}

// Returns the automatic dual-wield parry chance, including player gear.
export function _getDualWieldParryChancePct() {
    const base = (typeof DUAL_WIELD_PARRY_PCT !== 'undefined' ? DUAL_WIELD_PARRY_PCT : 15);
    let gear = 0;
    try { gear = (_computePlayerStats().parryChancePct || 0); } catch (e) {}
    return base + gear;
}

// Reports whether the player's current weapons enable automatic parrying.
export function _isDualWieldParryActive() {
    try {
        if (typeof _isDualWielding === 'function') return _isDualWielding();
    } catch (e) {}
    return false;
}

// Returns the projectile-deflection chance: the fixed base plus player gear.
export function _getDeflectChancePct() {
    const base = (typeof DEFLECT_BASE_PCT !== 'undefined' ? DEFLECT_BASE_PCT : 5);
    const gear = (_computePlayerStats().deflectChancePct || 0);
    return base + gear;
}

// Returns redirected projectile damage as a percentage of its original hit.
export function _getDeflectDamagePct() {
    const base = (typeof DEFLECT_BASE_DMG_PCT !== 'undefined' ? DEFLECT_BASE_DMG_PCT : 30);
    const gear = (_computePlayerStats().deflectDamagePct || 0);
    return base + gear;
}

// Rolls an available held or dual-wield parry while an encounter is active.
export function _rollParry(attacker, isProjectile) {
    // Hold-parry, or dual-wield auto-parry (two 1H weapons, no key needed)
    const holding = (typeof _holdEPauseActive !== 'undefined' && globalThis._holdEPauseActive);
    const dualWield = (typeof _isDualWieldParryActive === 'function' && _isDualWieldParryActive());
    if (!holding && !dualWield) return false;
    if (typeof _isActive === 'function' && !_isActive()) return false;
    // Hazards and boss spells are not parryable - they flow through isSpell=true,
    // but we also guard here for callers that bypass takeDamage.
    const chance = holding
        ? _getParryChancePct()
        : (typeof _getDualWieldParryChancePct === 'function' ? _getDualWieldParryChancePct() : 15);
    if (chance <= 0) return false;
    if (Math.random() * 100 >= chance) return false;
    globalThis.showCombatToast((typeof t === 'function' ? t('eg_parried') : 'Parried!'));
    _applyPlayerParryFeedback();
    _scheduleAbsorptionRegen();
    return true;
}

// Attempts to redirect a projectile to another living monster. Visual and
// instant fallback paths both apply the same rolled damage exactly once.
export function _tryDeflectProjectile(attacker, isProjectile) {
    if (!isProjectile) return false;
    if (!attacker) return false;
    const others = globalThis._monsters.filter(m => m.id !== attacker.id && m.currentHP > 0);
    if (others.length === 0) return false;
    const chance = _getDeflectChancePct();
    if (chance <= 0 || Math.random() * 100 >= chance) return false;
    const dmgPct = _getDeflectDamagePct();
    const deflectDamage = Math.max(1, Math.round((attacker.damageValue || 0) * dmgPct / 100));
    const victim = others[Math.floor(Math.random() * others.length)];
    // Visual: fire a quick projectile from player/avatar to the victim
    const playerEl = document.getElementById('player-avatar-wrapper') || document.getElementById('player-avatar-simple');
    const targetCard = document.getElementById(`sx-card-${victim.id}`);
    if (playerEl && targetCard && typeof _fireProjectile === 'function') {
        const start = _getElementCentre(playerEl);
        const end = _getElementCentre(targetCard);
        const projDef = (typeof _getProjectileDef === 'function') ? _getProjectileDef() : { emoji: '↩️', cssClass: 'sx-proj-player', duration: 300, easing: 'linear' };
        _fireProjectile(projDef, projDef.cssClass, start, end, 320, 'linear', () => {
            const toastKey = (typeof t === 'function' ? t('eg_deflected') : 'Deflected!');
            globalThis.showCombatToast(toastKey !== 'eg_deflected' ? toastKey : `↩️ Deflected to ${victim.name || 'another monster'}!`);
            _damageTargetById(victim.id, deflectDamage);
        });
    } else {
        _damageTargetById(victim.id, deflectDamage);
        globalThis.showCombatToast((typeof t === 'function' ? t('eg_deflected') : 'Deflected!'));
    }
    _applyPlayerDeflectFeedback();
    return true;
}
