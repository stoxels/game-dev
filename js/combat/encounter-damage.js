//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Encounter targeting + incoming player damage: target selection/hotkeys
// and the monster-to-player mitigation pipeline. Player-to-monster hit
// resolution lives in encounter-monster-damage.js. Block-lockout writes flow
// through encounter-constants.js's globalThis accessor.

// Melee-hold vulnerability (Secret-of-Mana risk / reward): while the
// attack key is HELD to charge an overcharge art, the hero stands rooted
// (see _avatarMoveUiBlocked) AND takes amplified damage from every hit
// that lands. Pure - safe to unit-test.
export const MELEE_HOLD_VULNERABILITY_MULT = 1.5;

import { Audio_Manager } from '../audio/audio.js';
import { _uspApplySupportMitigation, _uspGetSupportMitigation, _uspReflectThorns, _uspTryWardNegate } from '../skills/universal-spells.js';
import { t } from '../translation/translations.js';
import { _aimChargingProjectile, _getTarget } from './encounter-charged-shot.js';
import { BLOCK_LOCKOUT_BASE_MS } from './encounter-constants.js';
import { _gameOver } from './encounter-kills.js';
import { _applyPlayerBlockFeedback, _applyPlayerMissFeedback, _showBlockLockoutOverlay } from './encounter-monster-attack-feedback.js';
import { _damageTargetById } from './encounter-monster-damage.js';
import { FORTIFY_DR_PER_STACK, _consumeGhostShroud, _armRiposte, _gainEnduranceCharge, _gainFrenzyCharge, _gainPowerCharge, _getFortifyStacks, _rageOnPlayerHit } from './combat-ailments-state.js';
import { _applyPlayerParryFeedback, _getDualWieldParryChancePct, _getParryChancePct, _isDualWieldParryActive, _rollFateNegation, _tryDeflectProjectile } from './encounter-player-mitigation.js';
import { _getEncounterBaseLevel } from './encounter-spawn-rules.js';
import { _applyPlayerShockAmp, _playerHasAilment, _rollMonsterHitAilment, _rollPlayerStunFromHit, _stunPlayer } from './combat-ailments-core.js';
import { isHoldCasting } from '../skills/spell-casttime.js';
import { _calcPlayerResistanceReduction } from './combat-calculations-resistances.js';
import { _maybeShowAbsorptionBroken } from './encounter-overlays.js';
import { _renderPanel } from './encounter.js';
import { _getPlayerLevel } from '../hub/hub-leveling.js';
import { _isDualWielding } from '../loot/loot-requirements.js';
import { _egGetActiveMapModValue, _egMapDamageTakenAmpMult } from '../endgame/endgame-map-launch.js';
import { _calcArmourMitigation, _calcEvasionDodgeChance, _computePlayerStats, _getAllEquippedItems, _overLevelAvoidMult, _scheduleAbsorptionRegen } from './combat-player-stats.js';
import { _isActive } from './combat-state.js';
import { STATE } from '../state.js';


// Sets the player's target to the given monster and refreshes the panel.
// Called by the onclick handler on monster cards in the rendered panel HTML.
export function _selectTarget(monsterId) {
    if (!_isActive()) return;
    if (globalThis._targetId !== monsterId) Audio_Manager.playSFX('target_select');
    globalThis._targetId = monsterId;
    _renderPanel();

    // Keep the charging projectile aimed at the new target mid-stroke
    if (globalThis._dragChargeStacks > 0) {
        const anchor = ((globalThis._dragChargeRow >= 0 && globalThis._dragChargeCol >= 0)
            && document.getElementById(`g-${globalThis._dragChargeRow}-${globalThis._dragChargeCol}`))
            || document.getElementById('class-hud-drag-handle');
        _aimChargingProjectile(anchor);
    }
}

// Cycles the target through the live monster list (Shift = reverse).
// Wraps around at both ends; no-op when no monsters are on the field.
export function _cycleTarget(reverse) {
    if (!_isActive() || globalThis._monsters.length === 0) return;

    const idx = globalThis._monsters.findIndex(m => m.id === globalThis._targetId);
    const step = reverse ? -1 : 1;
    const nextIdx = idx === -1
        ? 0
        : (idx + step + globalThis._monsters.length) % globalThis._monsters.length;

    _selectTarget(globalThis._monsters[nextIdx].id);
}

// Tab targeting: registered via keybind system. Only active during an encounter.
// Classless characters (tutorial, campaign levels before a class is picked)
// may also cycle - the old class gate left Tab dead there.
export function _initEgTargetHotkeys() {
    if (typeof onKeybindAction === 'function') {
        globalThis.onKeybindAction('cycle-target', (e) => {
            const encounterActive = (typeof _isActive === 'function') && _isActive();
            if ((!STATE.playerClass || (typeof isClassless === 'function' && globalThis.isClassless())) && !encounterActive) return false;
            _cycleTarget(e.shiftKey);
            return false;
        });
    }
}

// Module-eval timing: the import phase runs before concatenated keybinds.js,
// so registering at top level would silently skip (typeof guard false) and
// leave Tab dead. Defer to DOMContentLoaded - by then the full global
// surface exists (same fix as the skill-hotbar P bug).
if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', _initEgTargetHotkeys);
} else {
    _initEgTargetHotkeys();
}

// Run statistics observer (js/combat/combat-run-stats.js): counts hits that
// never reached the life bar. Read-only; absent in headless unit contexts.
function _rsAvoid(kind) {
    const rs = globalThis.RunStats;
    if (rs) rs.avoided(kind);
    // Character banter: a dodged / parried / blocked hit earns a quip.
    if (typeof globalThis.triggerAvoidBanter === 'function') globalThis.triggerAvoidBanter(kind);
}

// Applies incoming monster damage to the player, after dodge/block/resist/
// armour/absorption mitigation. Returns the actual HP lost (0 if dodged/
// blocked/fully absorbed) so callers can show an accurate floating number.
// `isSpell` routes the hit through spell block instead of attack block
// (boss abilities pass true; regular monster attacks use the default).
// `element` is the damage type of the attack ('fire'|'cold'|'lightning'|
// 'shadow'); elemental hits are reduced by the matching resistance % plus
// flat Arcane Resistance. Physical hits (no element) ignore resistances.
// `attackerLevel` feeds the level-scaled evasion benchmark; falls back to the
// current target's level, then the encounter's base level.
// `opts.isBossAbility` marks damage dealt by boss special abilities - those
// hits can never be parried, dodged, blocked or fate-negated; they always
// land unless the telegraphed mechanic itself was avoided by movement.
export function _playerTakeDamage(amount, isSpell = false, element = null, attackerLevel = null, opts = null) {
    if (!_isActive()) return 0;

    // GODMODE - developer/test-only: blocks ALL incoming damage before any
    // mitigation runs, so mechanic testing can ignore the player's health.
    // Toggle with window._godMode = true/false from the console.
    if (window._godMode) return 0;

    const stats = _computePlayerStats();

    // Shadow Inoculation: immune to Shadow damage.
    if (element === 'shadow' && (Number(stats.shadowImmune) || 0) > 0) return 0;
    // Wind Dancer: whether an Attack hit you recently (read before this hit stamps it).
    const attackHitRecently = Date.now() - (Number(globalThis._lastAttackHitAt) || 0) < 4000;

    // Rage: being hit restarts the grace timer before it starts fading.
    _rageOnPlayerHit(Number(stats.rageWhenHitAmount) || 0, Number(stats.rageMax) || 0);

    // Charging a melee hold roots the hero: no evasion, no shield block,
    // and every landed hit is amplified (see
    // MELEE_HOLD_VULNERABILITY_MULT) - the price of the overcharge
    // arts. Read straight off globalThis like the parry-hold flag below
    // (no import cycle back into the weapon-swing module).
    const chargingMelee = (typeof _meleeHoldActive !== 'undefined' && !!globalThis._meleeHoldActive);

    // A stunned hero is helpless: no parry, deflect, evasion or block (fate and
    // the Aegis Ward still work - they are luck / a stored charge, not actions).
    const stunned = _playerHasAilment('stunned');

    // Boss special abilities are never negatable - their damage always lands
    // unless the player avoided the ability by movement/position (the
    // telegraphed dodge mechanics are the only boss abilities assigned to be
    // avoidable). Parry, evasion, block and fate all skip them; element
    // resistances, armour and absorption still mitigate normally.
    const isBossAbility = !!(opts && opts.isBossAbility);

    // Gear: fate - pure-luck chance to negate ANY incoming hit entirely
    // (attacks, spells and charge hits alike), before all other mitigation.
    if (!isBossAbility && _rollFateNegation(stats)) { _rsAvoid('other'); return 0; }

    // Support spells (js/skills/universal-spells.js): the mitigation profile
    // is read once here so the rest of this function never re-derives it.
    // Null when no support buff is up, so an unbuffed player pays nothing.
    const support = (typeof _uspGetSupportMitigation === 'function')
        ? _uspGetSupportMitigation() : null;

    // Aegis Ward - consumes one charge and negates the hit outright. Placed
    // after fate so a lucky fate roll is never "wasted" on a hit the ward
    // would have eaten anyway, and deliberately allowed to swallow boss
    // specials (nothing else in the game can). Called unconditionally (not
    // behind `support`, which only describes mitigation): the ward is its own
    // resource and returns false immediately when no charge is held or the hit
    // is too small to be worth a charge.
    if (typeof _uspTryWardNegate === 'function' && _uspTryWardNegate(amount)) {
        _rsAvoid('other');
        _applyPlayerMissFeedback();
        return 0;
    }

    // Hold-Parry - 50% + gear chance to fully negate projectile and charge
    // attacks while the parry key (R by default) is held. Hazards, monster
    // spells (isSpell=true) and boss special abilities are never parryable.
    // On a successful projectile parry there is a 5% + gear deflect chance to
    // hit another monster for 30% + gear damage. Dual-wielding two 1H weapons
    // grants the same roll at a 15% + gear base WITHOUT holding the key.
    // Over-level attackers are harder to avoid: scales every dodge/block/parry roll below.
    const attackerLvl = Number(attackerLevel)
        || (_getTarget() && _getTarget().level)
        || _getEncounterBaseLevel()
        || _getPlayerLevel();
    const avoidMult = _overLevelAvoidMult(attackerLvl, _getPlayerLevel());
    const holdingE = !stunned && (typeof _holdEPauseActive !== 'undefined' && globalThis._holdEPauseActive);
    const dualWieldParry = !holdingE && !stunned
        && (typeof _isDualWieldParryActive === 'function' && _isDualWieldParryActive());
    if (!isSpell && !isBossAbility && (holdingE || dualWieldParry)) {
        if (typeof _isActive === 'function' && _isActive()) {
            const parryChance = avoidMult * (holdingE
                ? _getParryChancePct()
                : (typeof _getDualWieldParryChancePct === 'function' ? _getDualWieldParryChancePct() : 15));
            if (parryChance > 0 && Math.random() * 100 < parryChance) {
                const isProjectile = !!(opts && opts.isProjectile);
                const attacker = opts && opts.attacker ? opts.attacker : null;
                const parryToast = (typeof t === 'function' ? t('eg_parried') : '');
                globalThis.showCombatToast(parryToast && parryToast !== 'eg_parried' ? parryToast : '🗡️ Parried!');
                _rsAvoid('parry');
                _applyPlayerParryFeedback();
                _scheduleAbsorptionRegen();
                // Sword identity: a successful Parry readies a riposte strike.
                if (stats.isSwordEquipped) _armRiposte(stats.riposteDurationPct);
                if (isProjectile && attacker) _tryDeflectProjectile(attacker, true);
                return 0;
            }
        }
    }

    // Spell parry (passive tree): while the parry key is held, spell damage
    // (not boss abilities / hazards) can also be parried at the tree's chance.
    if (isSpell && !isBossAbility && holdingE
        && typeof _isActive === 'function' && _isActive()) {
        const spellParryChance = (Number(stats.parrySpellChancePct) || 0) * avoidMult;
        if (spellParryChance > 0 && Math.random() * 100 < spellParryChance) {
            const parryToast = (typeof t === 'function' ? t('eg_parried') : '');
            globalThis.showCombatToast(parryToast && parryToast !== 'eg_parried' ? parryToast : '🗡️ Parried!');
            _rsAvoid('parry');
            _applyPlayerParryFeedback();
            _scheduleAbsorptionRegen();
            return 0;
        }
    }

    // Blind (player hits): a blinded attacker misses 50% of the time (scaled by
    // the Blind Effect line). Spells, hazards and boss abilities are unaffected.
    if (!isSpell && !isBossAbility && !chargingMelee && opts && opts.attacker && opts.attacker.id != null) {
        const blindAttacker = (globalThis._monsters || []).find(m => m.id === opts.attacker.id);
        const blindSt = blindAttacker && blindAttacker.statuses && blindAttacker.statuses.blind;
        if (blindSt && blindSt.until > Date.now()) {
            const missPct = Math.min(90, 50 * (1 + (Number(blindSt.effectPct) || 0) / 100));
            if (Math.random() * 100 < missPct) {
                _rsAvoid('other');
                globalThis.showCombatToast(t('eg_blind_miss'));
                _applyPlayerMissFeedback();
                _scheduleAbsorptionRegen();
                return 0;
            }
        }
    }

    // Evasion only applies to physical attacks (melee strikes and monster
    // projectiles) - spells, environmental hazards and boss special abilities
    // cannot be dodged. Neither can a hero rooted mid overcharge-charge.
    if (!isSpell && !isBossAbility && !chargingMelee && !stunned && !((Number(stats.cannotEvade) || 0) > 0)) {
        let dodgeChance = Math.min(75, stats.dodgeChance + _calcEvasionDodgeChance(stats.evasion, attackerLvl)
            + ((support && support.dodgePct) || 0)) * avoidMult;
        // Wind Dancer: more chance to Evade after an Attack hit you recently.
        if (attackHitRecently && (Number(stats.windDancerEvadePct) || 0) > 0) {
            dodgeChance = Math.min(75, dodgeChance * (1 + stats.windDancerEvadePct / 100));
        }
        if (dodgeChance > 0 && Math.random() * 100 < dodgeChance) {
            _rsAvoid('dodge');
            try { if (typeof globalThis.noteUniversalReaction === 'function') globalThis.noteUniversalReaction('dodge'); } catch (e) { /* optional */ }
            globalThis.showCombatToast(t('eg_dodged'));
            _applyPlayerMissFeedback();
            _scheduleAbsorptionRegen();
            return 0;
        }
    }

    // Aspect of Stone (tree): chance to avoid physical damage from hits.
    if (!isSpell && !isBossAbility && !chargingMelee && !stunned && (Number(stats.avoidPhysHitPct) || 0) > 0
        && (!element || element === 'physical') && Math.random() * 100 < Math.min(75, stats.avoidPhysHitPct) * avoidMult) {
        _rsAvoid('dodge');
        try { if (typeof globalThis.noteUniversalReaction === 'function') globalThis.noteUniversalReaction('dodge'); } catch (e) { /* optional */ }
        globalThis.showCombatToast(t('eg_dodged'));
        Audio_Manager.playSFX('player_dodge');
        _scheduleAbsorptionRegen();
        return 0;
    }

    // Block roll: attacks use block chance, spells use spell block chance.
    // A successful block fully negates the hit, but locks out future
    // blocks for a short window (reduced by block recovery). Player can
    // still attack while recovering - only blocking is suppressed.
    // Blocking requires an actual shield in the off-hand - block chance
    // from mods/passives on other slots does nothing without one. Boss
    // special abilities are never blockable - nor is anything, while the
    // hero is rooted charging a melee hold.
    const isBlockLockedOut = Date.now() < globalThis._playerBlockLockoutUntil;
    const hasShieldEquipped = _getAllEquippedItems()
        .some(item => item.slotType === 'shield');
    // Passive tree: conditional block chance (effects pipeline, e.g.
    // reworked node 30255). Fires without a shield while dual-wielding or
    // holding one, attacks only - spells still use spell block alone. The
    // boss / lockout / charging gates below apply to both sides equally.
    const dualWielding = (typeof _isDualWielding === 'function' && _isDualWielding());
    // Shield batch (e.g. reworked nodes 30374/285): extra attack block
    // chance that needs a shield specifically (dual-wielding alone is not
    // enough), stacked on the shared tree bucket.
    const treeBlock = (((hasShieldEquipped || dualWielding) && !isSpell ? stats.blockChanceTree : 0) || 0)
        + ((hasShieldEquipped && !isSpell ? stats.blockChanceShieldPct : 0) || 0)
        + ((dualWielding && !isSpell ? stats.dualBlockPct : 0) || 0)
        + ((stats.isStaffEquipped ? (isSpell ? stats.staffSpellBlockPct : stats.staffBlockPct) : 0) || 0)
        + ((hasShieldEquipped && isSpell ? stats.shieldSpellBlockPct : 0) || 0)
        + ((isSpell ? stats.spellBlockFlat : 0) || 0)
        // block_flawless (tree): only non-zero while no mistake was made this level.
        + (Number(stats.blockFlawlessPct) || 0);
    // Glancing Blows doubles the chance; Versatile Combatant lowers the caps and turns
    // overcapped attack block into spell block.
    const blockMult = (Number(stats.blockDoubled) || 0) > 0 ? 2 : 1;
    const blockCapAttack = Math.max(0, 75 - (Number(stats.blockMaxAttackLess) || 0));
    const blockCapSpell = Math.max(0, 75 - (Number(stats.blockMaxSpellLess) || 0));
    let overcapSpellBonus = 0;
    if (isSpell && (Number(stats.spellBlockPerOvercap) || 0) > 0) {
        const attackRaw = ((stats.blockChance || 0)
            + (((hasShieldEquipped || dualWielding) ? stats.blockChanceTree : 0) || 0)
            + ((hasShieldEquipped ? stats.blockChanceShieldPct : 0) || 0)
            + ((dualWielding ? stats.dualBlockPct : 0) || 0)
            + ((stats.isStaffEquipped ? stats.staffBlockPct : 0) || 0)) * blockMult;
        overcapSpellBonus = Math.max(0, attackRaw - blockCapAttack) * stats.spellBlockPerOvercap;
    }
    // A hero busy channelling / winding up a spell (Disintegrate...) has no
    // hand free to raise a shield: no blocking while a hold-cast is running.
    const castingSpell = (typeof isHoldCasting === 'function') && isHoldCasting();
    const blockChance = (!isBossAbility && !isBlockLockedOut && (hasShieldEquipped || treeBlock > 0) && !chargingMelee && !castingSpell && !stunned)
        ? Math.min(isSpell ? blockCapSpell : blockCapAttack,
            ((isSpell ? stats.spellBlockChance : stats.blockChance) + treeBlock) * blockMult + overcapSpellBonus)
        : 0;
    let blockedHitMult = 1;
    if (blockChance > 0 && Math.random() * 100 < blockChance * avoidMult) {
        // Timestamp for the tree's timed armour pulse (reworked node 337):
        // _computePlayerStats grants the bonus while this is under 10s old.
        globalThis._lastBlockAt = Date.now();
        // Phase B: charges gained on a successful block.
        if ((stats.powerOnBlockPct || 0) > 0 && Math.random() * 100 < Math.min(100, stats.powerOnBlockPct)) {
            _gainPowerCharge(stats.powerChargesMax, stats.powerDurationPct);
        }
        if ((stats.frenzyOnBlockPct || 0) > 0 && Math.random() * 100 < Math.min(100, stats.frenzyOnBlockPct)) {
            _gainFrenzyCharge(stats.frenzyChargesMax, stats.frenzyDurationPct);
        }
        if ((stats.enduranceOnBlockPct || 0) > 0 && Math.random() * 100 < Math.min(100, stats.enduranceOnBlockPct)) {
            _gainEnduranceCharge(stats.enduranceChargesMax, stats.enduranceDurationPct);
        }
        _rsAvoid('block');
        globalThis.showCombatToast(t('eg_blocked'));
        _applyPlayerBlockFeedback();
        _scheduleAbsorptionRegen();

        // Shield bash retaliation: chance to slam the current target for
        // flat physical damage when blocking an attack.
        if (!isSpell
            && stats.shieldBashChancePct > 0
            && stats.shieldBashDamageFlat > 0
            && Math.random() * 100 < stats.shieldBashChancePct) {
            const target = _getTarget();
            if (target) _damageTargetById(target.id, Math.round(stats.shieldBashDamageFlat), null, { isPlayerFlat: true });
        }

        const recoveryFactor = Math.max(0, 1 - Math.min(100, stats.blockRecoveryPct) / 100);
        let lockoutDuration = BLOCK_LOCKOUT_BASE_MS * recoveryFactor;
        // Active map run: block lockouts last #% longer.
        if (typeof _egGetActiveMapModValue === 'function') {
            const lockoutPct = _egGetActiveMapModValue('map_longer_lockout');
            if (lockoutPct > 0) lockoutDuration *= (1 + lockoutPct / 100);
        }
        globalThis._playerBlockLockoutUntil = Date.now() + lockoutDuration;
        _showBlockLockoutOverlay(lockoutDuration);
        // Glancing Blows: a blocked hit still deals a share of its damage.
        if ((Number(stats.blockedHitTakenPct) || 0) > 0) blockedHitMult = stats.blockedHitTakenPct / 100;
        else return 0;
    }
    if (blockedHitMult !== 1) amount *= blockedHitMult;

    // The hit has landed (past parry, evasion and block).
    if (!isSpell) globalThis._lastAttackHitAt = Date.now();
    // Ghost Dance: a Ghost Shroud breaks and restores Absorption from your Evasion.
    if ((Number(stats.ghostShroudRecoverPct) || 0) > 0 && _consumeGhostShroud(stats.ghostShroudMax)) {
        const ghostMax = Number(stats.absorption) || 0;
        const ghostGain = Math.round((Number(stats.evasion) || 0) * stats.ghostShroudRecoverPct / 100);
        globalThis._playerAbsorptionCurrent = Math.min(ghostMax, (Number(globalThis._playerAbsorptionCurrent) || 0) + ghostGain);
    }

    // Retribution - the hit has been confirmed to land (it got past parry,
    // evasion and block), so reflect a share of the RAW incoming amount back
    // at the attacker. Using the raw amount makes the payoff scale with how
    // dangerous the attack was, not with how well it was mitigated.
    if (support && support.thornsPct > 0 && opts && opts.attacker && amount > 0
        && typeof _uspReflectThorns === 'function') {
        _uspReflectThorns(opts.attacker, amount);
    }

    // Passive tree: flat physical retaliation (effects pipeline, e.g.
    // reworked node 13 Enhanced Rewards). Unlike the buff-gated percentage
    // Retribution above, this is always on and fires a FLAT amount - but
    // only against MELEE attackers: the hit must come from a monster
    // (opts.attacker), not be a spell, a projectile or a boss special, and
    // the raw incoming amount must be positive. Placed here so it shares
    // Retribution's "landed hit" semantics (past parry, evasion and block).
    if (!isSpell && !isBossAbility && !(opts && opts.isProjectile)
        && opts && opts.attacker && opts.attacker.id != null && amount > 0
        && stats.reflectPhysFlat > 0) {
        _damageTargetById(opts.attacker.id, Math.round(stats.reflectPhysFlat), null, { isPlayerFlat: true });
    }

    // Elemental resistances (fire/cold/lightning/shadow %) mitigate
    // elemental hits before armour and absorption.
    // Imbalanced Guard caps the Damage Reduction of any type (resistances included).
    const drCap = Number(stats.maxDamageReductionCap) || 0;
    if (element) {
        const preResist = amount;
        amount = _calcPlayerResistanceReduction(amount, stats, element);
        if (drCap > 0) amount = Math.max(amount, preResist * (1 - drCap / 100));
    }

    // Ailments: a shocked player takes amplified damage from all hits.
    if (typeof _applyPlayerShockAmp === 'function') amount = _applyPlayerShockAmp(amount);

    // Melee-hold vulnerability: charging an overcharge art hurts - every
    // landed hit is amplified while the attack key is held (applied here,
    // pre-armour, like the shock amp above).
    if (chargingMelee) amount *= MELEE_HOLD_VULNERABILITY_MULT;

    // Wind Dancer: less Attack damage when no Attack hit you recently, more when one did.
    if (!isSpell) {
        if (attackHitRecently && (Number(stats.windDancerMorePct) || 0) > 0) amount *= 1 + stats.windDancerMorePct / 100;
        else if (!attackHitRecently && (Number(stats.windDancerLessPct) || 0) > 0) amount *= 1 - Math.min(90, stats.windDancerLessPct) / 100;
    }

    // Active map run: Vulnerability - you take #% increased damage.
    if (typeof _egMapDamageTakenAmpMult === 'function') amount *= _egMapDamageTakenAmpMult();

    // Active map run: Armour Pierce - monster hits ignore #% of your armour.
    let effectiveArmour = stats.armour;
    if (!isSpell && typeof _egGetActiveMapModValue === 'function') {
        const pierce = _egGetActiveMapModValue('map_armour_pierce');
        if (pierce > 0) effectiveArmour = Math.max(0, Math.round(stats.armour * (1 - Math.min(90, pierce) / 100)));
    }

    // Bulwark - a temporary armour multiplier applied on top of the character's
    // sheet armour (the sheet itself is untouched, so the buff is invisible to
    // the stats screen and expires cleanly with the buff).
    if (support && support.armourPct > 0) {
        effectiveArmour = Math.round(effectiveArmour * (1 + support.armourPct / 100));
    }

    // Persistence (tree): flat physical damage taken from hits is reduced.
    if (!isSpell && (Number(stats.physTakenFlat) || 0) > 0 && (!element || element === 'physical')) {
        amount = Math.max(1, amount - stats.physTakenFlat);
    }
    // Imbalanced Guard: defend with 200% of Armour.
    if ((Number(stats.armourDefendDouble) || 0) > 0) effectiveArmour *= 2;
    let mitigated = _calcArmourMitigation(amount, effectiveArmour);
    if (drCap > 0) mitigated = Math.max(mitigated, amount * (1 - drCap / 100));

    // Bulwark - flat percentage damage reduction, applied AFTER armour and
    // BEFORE the absorption shield so a Bulwark also stretches the shield.
    if (support) mitigated = _uspApplySupportMitigation(mitigated);

    // Fortification: each live stack takes a share of the damage away.
    const fortifyStacks = _getFortifyStacks();
    if (fortifyStacks > 0) {
        const drPct = Math.min(40, fortifyStacks * FORTIFY_DR_PER_STACK * (1 + (Number(stats.fortifyEffectIncPct) || 0) / 100));
        mitigated *= 1 - drPct / 100;
    }

    // Mind over Matter: a share of the damage is taken from Mana before anything else.
    const momPct = Math.min(100, Number(stats.damageFromManaPct) || 0);
    if (momPct > 0 && mitigated > 0 && (Number(globalThis.playerCurrentMana) || 0) > 0) {
        const fromMana = Math.min(mitigated * momPct / 100, globalThis.playerCurrentMana);
        globalThis.playerCurrentMana = Math.max(0, Math.round(globalThis.playerCurrentMana - fromMana));
        mitigated -= fromMana;
        if (typeof globalThis.updateClassHUDManaBar === 'function') globalThis.updateClassHUDManaBar();
    }

    if (globalThis._playerAbsorptionCurrent > 0) {
        const prevAbs = globalThis._playerAbsorptionCurrent;
        const absorbed = Math.min(globalThis._playerAbsorptionCurrent, mitigated);
        globalThis._playerAbsorptionCurrent -= absorbed;
        mitigated -= absorbed;
        Audio_Manager.playSFX('player_shield_damage_taken');
        if (typeof _maybeShowAbsorptionBroken === 'function') _maybeShowAbsorptionBroken(prevAbs, globalThis._playerAbsorptionCurrent);
    }

    _scheduleAbsorptionRegen();

    mitigated = Math.max(0, Math.round(mitigated));
    if (mitigated <= 0) { _rsAvoid('other'); return 0; }

    globalThis.playerCurrentHP =Math.max(0, globalThis.playerCurrentHP - mitigated);
    globalThis._lastHitTakenAt = Date.now();
    // Stun: forced by the source (opts.stun) or rolled from how much Life the hit took.
    if (globalThis.playerCurrentHP > 0) {
        if (opts && opts.stun) _stunPlayer();
        else _rollPlayerStunFromHit(mitigated);
    }
    if ((Number(stats.enduranceWhenHitPct) || 0) > 0 && Math.random() * 100 < Math.min(100, stats.enduranceWhenHitPct)) {
        _gainEnduranceCharge(stats.enduranceChargesMax, stats.enduranceDurationPct);
    }

    // Life Recoup (passive tree): a share of the Life damage taken is paid
    // back over ~4s by _tickLifeRegen. The pool belongs to one encounter.
    if ((Number(stats.lifeRecoupPct) || 0) > 0 && globalThis.playerCurrentHP > 0) {
        if (globalThis._recoupStamp !== globalThis._encounterStartAt) {
            globalThis._recoupStamp = globalThis._encounterStartAt;
            globalThis._recoupPool = 0;
        }
        globalThis._recoupPool = (Number(globalThis._recoupPool) || 0) + mitigated * stats.lifeRecoupPct / 100;
    }

    // Gear: warding - once per map, a killing blow instead leaves the player
    // at wardingHP health and the ward shatters.
    if (globalThis.playerCurrentHP <= 0 && !globalThis._wardingUsedThisMap) {
        const wardHP = Math.round(stats.wardingHP || 0);
        if (wardHP > 0) {
            globalThis._wardingUsedThisMap = true;
            globalThis.playerCurrentHP = wardHP;
            globalThis.showCombatToast(t('eg_warding'));
            Audio_Manager.playSFX('player_shield_damage_taken');
        }
    }

    // Run statistics: record BEFORE the game-over handler reads the panel.
    if (globalThis.RunStats) {
        globalThis.RunStats.hitTaken(mitigated, globalThis.RunStats.sourceLabel(isBossAbility, opts && opts.attacker),
            { element, hp: globalThis.playerCurrentHP });
    }

    globalThis._renderPlayerHealth();
    // Character banter: react to how much life is left after this hit.
    if (typeof globalThis.triggerHitTakenBanter === 'function') {
        globalThis.triggerHitTakenBanter(mitigated, globalThis.playerCurrentHP, globalThis.playerMaxHP);
    }
    if (globalThis.playerCurrentHP <= 0) _gameOver();

    // Ailments: elemental hits can ignite / chill / shock / shadow-burn the
    // player (rolled from the monster's attack element).
    // The attacker rides along so physical hits can bleed (which needs a
    // real attacker, never self-damage) and the retaliation ward (node
    // 20036) can read its live statuses.
    if (typeof _rollMonsterHitAilment === 'function') _rollMonsterHitAilment(element, mitigated, opts && opts.attacker ? opts.attacker : null);

    // Dev fight log (js/dev/dev-testing.js): attributes the HP actually lost.
    // Read-only observer - absent unless the dev harness registered it.
    if (typeof globalThis.__fightLogHit === 'function') globalThis.__fightLogHit(mitigated, isSpell, element, isBossAbility, opts && opts.attacker);

    return mitigated;
}
