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
export const EG_MELEE_HOLD_VULNERABILITY_MULT = 1.5;

import { Audio_Manager } from '../audio/audio.js';
import { _uspApplySupportMitigation, _uspGetSupportMitigation, _uspReflectThorns, _uspTryWardNegate } from '../skills/universal-spells.js';
import { t } from '../translation/translations.js';
import { _egAimChargingProjectile, _egGetTarget } from './encounter-charged-shot.js';
import { EG_BLOCK_LOCKOUT_BASE_MS } from './encounter-constants.js';
import { _egGameOver } from './encounter-kills.js';
import { _egApplyPlayerBlockFeedback, _egApplyPlayerMissFeedback, _egShowBlockLockoutOverlay } from './encounter-monster-attack-feedback.js';
import { _egDamageTargetById } from './encounter-monster-damage.js';
import { _egApplyPlayerParryFeedback, _egGetDualWieldParryChancePct, _egGetParryChancePct, _egIsDualWieldParryActive, _egRollFateNegation, _egTryDeflectProjectile } from './encounter-player-mitigation.js';
import { _egGetEncounterBaseLevel } from './encounter-spawn-rules.js';
import { _egApplyPlayerShockAmp, _egRollMonsterHitAilment } from './combat-ailments-core.js';
import { _egCalcPlayerResistanceReduction } from './combat-calculations-resistances.js';
import { _egMaybeShowAbsorptionBroken } from './encounter-overlays.js';
import { _egRenderPanel } from './encounter.js';
import { _egGetPlayerLevel } from '../endgame/endgame-leveling.js';
import { _egIsDualWielding } from '../loot/loot-requirements.js';
import { _egGetActiveMapModValue, _egMapDamageTakenAmpMult } from '../endgame/endgame-map-launch.js';
import { _egCalcArmourMitigation, _egCalcEvasionDodgeChance, _egComputePlayerStats, _egGetAllEquippedItems, _egScheduleAbsorptionRegen } from '../endgame/endgame-player-stats.js';
import { _egIsActive } from './combat-state.js';
import { STATE } from '../state.js';


// Sets the player's target to the given monster and refreshes the panel.
// Called by the onclick handler on monster cards in the rendered panel HTML.
export function _egSelectTarget(monsterId) {
    if (!_egIsActive()) return;
    globalThis._egTargetId = monsterId;
    _egRenderPanel();

    // Keep the charging projectile aimed at the new target mid-stroke
    if (globalThis._egDragChargeStacks > 0) {
        const anchor = ((globalThis._egDragChargeRow >= 0 && globalThis._egDragChargeCol >= 0)
            && document.getElementById(`g-${globalThis._egDragChargeRow}-${globalThis._egDragChargeCol}`))
            || document.getElementById('class-hud-drag-handle');
        _egAimChargingProjectile(anchor);
    }
}

// Cycles the target through the live monster list (Shift = reverse).
// Wraps around at both ends; no-op when no monsters are on the field.
export function _egCycleTarget(reverse) {
    if (!_egIsActive() || globalThis._egMonsters.length === 0) return;

    const idx = globalThis._egMonsters.findIndex(m => m.id === globalThis._egTargetId);
    const step = reverse ? -1 : 1;
    const nextIdx = idx === -1
        ? 0
        : (idx + step + globalThis._egMonsters.length) % globalThis._egMonsters.length;

    _egSelectTarget(globalThis._egMonsters[nextIdx].id);
}

// Tab targeting: registered via keybind system. Only active during an encounter.
// Classless characters (tutorial, campaign levels before a class is picked)
// may also cycle - the old class gate left Tab dead there.
export function _initEgTargetHotkeys() {
    if (typeof onKeybindAction === 'function') {
        globalThis.onKeybindAction('cycle-target', (e) => {
            const encounterActive = (typeof _egIsActive === 'function') && _egIsActive();
            if ((!STATE.playerClass || (typeof isClassless === 'function' && globalThis.isClassless())) && !encounterActive) return false;
            _egCycleTarget(e.shiftKey);
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
export function _egPlayerTakeDamage(amount, isSpell = false, element = null, attackerLevel = null, opts = null) {
    if (!_egIsActive()) return 0;

    // GODMODE - developer/test-only: blocks ALL incoming damage before any
    // mitigation runs, so mechanic testing can ignore the player's health.
    // Toggle with window._egGodMode = true/false from the console.
    if (window._egGodMode) return 0;

    const stats = _egComputePlayerStats();

    // Charging a melee hold roots the hero: no evasion, no shield block,
    // and every landed hit is amplified (see
    // EG_MELEE_HOLD_VULNERABILITY_MULT) - the price of the overcharge
    // arts. Read straight off globalThis like the parry-hold flag below
    // (no import cycle back into the weapon-swing module).
    const chargingMelee = (typeof _egMeleeHoldActive !== 'undefined' && !!globalThis._egMeleeHoldActive);

    // Boss special abilities are never negatable - their damage always lands
    // unless the player avoided the ability by movement/position (the
    // telegraphed dodge mechanics are the only boss abilities assigned to be
    // avoidable). Parry, evasion, block and fate all skip them; element
    // resistances, armour and absorption still mitigate normally.
    const isBossAbility = !!(opts && opts.isBossAbility);

    // Gear: fate - pure-luck chance to negate ANY incoming hit entirely
    // (attacks, spells and charge hits alike), before all other mitigation.
    if (!isBossAbility && _egRollFateNegation(stats)) return 0;

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
        _egApplyPlayerMissFeedback();
        return 0;
    }

    // Hold-Parry - 50% + gear chance to fully negate projectile and charge
    // attacks while the parry key (R by default) is held. Hazards, monster
    // spells (isSpell=true) and boss special abilities are never parryable.
    // On a successful projectile parry there is a 5% + gear deflect chance to
    // hit another monster for 30% + gear damage. Dual-wielding two 1H weapons
    // grants the same roll at a 15% + gear base WITHOUT holding the key.
    const holdingE = (typeof _egHoldEPauseActive !== 'undefined' && globalThis._egHoldEPauseActive);
    const dualWieldParry = !holdingE
        && (typeof _egIsDualWieldParryActive === 'function' && _egIsDualWieldParryActive());
    if (!isSpell && !isBossAbility && (holdingE || dualWieldParry)) {
        if (typeof _egIsActive === 'function' && _egIsActive()) {
            const parryChance = holdingE
                ? _egGetParryChancePct()
                : (typeof _egGetDualWieldParryChancePct === 'function' ? _egGetDualWieldParryChancePct() : 15);
            if (parryChance > 0 && Math.random() * 100 < parryChance) {
                const isProjectile = !!(opts && opts.isProjectile);
                const attacker = opts && opts.attacker ? opts.attacker : null;
                const parryToast = (typeof t === 'function' ? t('eg_parried') : '');
                globalThis.showToast(parryToast && parryToast !== 'eg_parried' ? parryToast : '🗡️ Parried!');
                _egApplyPlayerParryFeedback();
                _egScheduleAbsorptionRegen();
                if (isProjectile && attacker) _egTryDeflectProjectile(attacker, true);
                return 0;
            }
        }
    }

    // Evasion only applies to physical attacks (melee strikes and monster
    // projectiles) - spells, environmental hazards and boss special abilities
    // cannot be dodged. Neither can a hero rooted mid overcharge-charge.
    if (!isSpell && !isBossAbility && !chargingMelee) {
        const attackerLvl = Number(attackerLevel)
            || (_egGetTarget() && _egGetTarget().level)
            || _egGetEncounterBaseLevel()
            || _egGetPlayerLevel();
        const dodgeChance = Math.min(75, stats.dodgeChance + _egCalcEvasionDodgeChance(stats.evasion, attackerLvl)
            + ((support && support.dodgePct) || 0));
        if (dodgeChance > 0 && Math.random() * 100 < dodgeChance) {
            globalThis.showToast(t('eg_dodged'));
            _egApplyPlayerMissFeedback();
            _egScheduleAbsorptionRegen();
            return 0;
        }
    }

    // Block roll: attacks use block chance, spells use spell block chance.
    // A successful block fully negates the hit, but locks out future
    // blocks for a short window (reduced by block recovery). Player can
    // still attack while recovering - only blocking is suppressed.
    // Blocking requires an actual shield in the off-hand - block chance
    // from mods/passives on other slots does nothing without one. Boss
    // special abilities are never blockable - nor is anything, while the
    // hero is rooted charging a melee hold.
    const isBlockLockedOut = Date.now() < globalThis._egPlayerBlockLockoutUntil;
    const hasShieldEquipped = _egGetAllEquippedItems()
        .some(item => item.slotType === 'shield');
    // Passive tree: conditional block chance (effects pipeline, e.g.
    // reworked node 30255). Fires without a shield while dual-wielding or
    // holding one, attacks only - spells still use spell block alone. The
    // boss / lockout / charging gates below apply to both sides equally.
    const dualWielding = (typeof _egIsDualWielding === 'function' && _egIsDualWielding());
    const treeBlock = ((hasShieldEquipped || dualWielding) && !isSpell ? stats.blockChanceTree : 0) || 0;
    const blockChance = (!isBossAbility && !isBlockLockedOut && (hasShieldEquipped || treeBlock > 0) && !chargingMelee)
        ? Math.min(75, (isSpell ? stats.spellBlockChance : stats.blockChance) + treeBlock)
        : 0;
    if (blockChance > 0 && Math.random() * 100 < blockChance) {
        // Timestamp for the tree's timed armour pulse (reworked node 337):
        // _egComputePlayerStats grants the bonus while this is under 10s old.
        globalThis._egLastBlockAt = Date.now();
        globalThis.showToast(t('eg_blocked'));
        _egApplyPlayerBlockFeedback();
        _egScheduleAbsorptionRegen();

        // Shield bash retaliation: chance to slam the current target for
        // flat physical damage when blocking an attack.
        if (!isSpell
            && stats.shieldBashChancePct > 0
            && stats.shieldBashDamageFlat > 0
            && Math.random() * 100 < stats.shieldBashChancePct) {
            const target = _egGetTarget();
            if (target) _egDamageTargetById(target.id, Math.round(stats.shieldBashDamageFlat));
        }

        const recoveryFactor = Math.max(0, 1 - Math.min(100, stats.blockRecoveryPct) / 100);
        let lockoutDuration = EG_BLOCK_LOCKOUT_BASE_MS * recoveryFactor;
        // Active map run: block lockouts last #% longer.
        if (typeof _egGetActiveMapModValue === 'function') {
            const lockoutPct = _egGetActiveMapModValue('map_longer_lockout');
            if (lockoutPct > 0) lockoutDuration *= (1 + lockoutPct / 100);
        }
        globalThis._egPlayerBlockLockoutUntil = Date.now() + lockoutDuration;
        _egShowBlockLockoutOverlay(lockoutDuration);
        return 0;
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
        _egDamageTargetById(opts.attacker.id, Math.round(stats.reflectPhysFlat));
    }

    // Elemental resistances (fire/cold/lightning/shadow %) mitigate
    // elemental hits before armour and absorption.
    if (element) amount = _egCalcPlayerResistanceReduction(amount, stats, element);

    // Ailments: a shocked player takes amplified damage from all hits.
    if (typeof _egApplyPlayerShockAmp === 'function') amount = _egApplyPlayerShockAmp(amount);

    // Melee-hold vulnerability: charging an overcharge art hurts - every
    // landed hit is amplified while the attack key is held (applied here,
    // pre-armour, like the shock amp above).
    if (chargingMelee) amount *= EG_MELEE_HOLD_VULNERABILITY_MULT;

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

    let mitigated = _egCalcArmourMitigation(amount, effectiveArmour);

    // Bulwark - flat percentage damage reduction, applied AFTER armour and
    // BEFORE the absorption shield so a Bulwark also stretches the shield.
    if (support) mitigated = _uspApplySupportMitigation(mitigated);

    if (globalThis._egPlayerAbsorptionCurrent > 0) {
        const prevAbs = globalThis._egPlayerAbsorptionCurrent;
        const absorbed = Math.min(globalThis._egPlayerAbsorptionCurrent, mitigated);
        globalThis._egPlayerAbsorptionCurrent -= absorbed;
        mitigated -= absorbed;
        Audio_Manager.playSFX('player_shield_damage_taken');
        if (typeof _egMaybeShowAbsorptionBroken === 'function') _egMaybeShowAbsorptionBroken(prevAbs, globalThis._egPlayerAbsorptionCurrent);
    }

    _egScheduleAbsorptionRegen();

    mitigated = Math.max(0, Math.round(mitigated));
    if (mitigated <= 0) return 0;

    globalThis.playerCurrentHP = Math.max(0, globalThis.playerCurrentHP - mitigated);

    // Gear: warding - once per map, a killing blow instead leaves the player
    // at wardingHP health and the ward shatters.
    if (globalThis.playerCurrentHP <= 0 && !globalThis._egWardingUsedThisMap) {
        const wardHP = Math.round(stats.wardingHP || 0);
        if (wardHP > 0) {
            globalThis._egWardingUsedThisMap = true;
            globalThis.playerCurrentHP = wardHP;
            globalThis.showToast(t('eg_warding'));
            Audio_Manager.playSFX('player_shield_damage_taken');
        }
    }

    globalThis._renderPlayerHealth();
    if (globalThis.playerCurrentHP <= 0) _egGameOver();

    // Ailments: elemental hits can ignite / chill / shock / shadow-burn the
    // player (rolled from the monster's attack element).
    // The attacker rides along so physical hits can bleed (which needs a
    // real attacker, never self-damage) and the retaliation ward (node
    // 20036) can read its live statuses.
    if (typeof _egRollMonsterHitAilment === 'function') _egRollMonsterHitAilment(element, mitigated, opts && opts.attacker ? opts.attacker : null);

    return mitigated;
}
