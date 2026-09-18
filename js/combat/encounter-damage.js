//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Targeting + damage application: target selection/hotkeys, hit
// resolution with resistances/crits, overkill spread, echo hits, the
// charged-ricochet and the player-take-damage pipeline. Block-lockout
// writes flow through encounter-constants.js's globalThis accessor.

import { Audio_Manager } from '../audio/audio.js';
import { _uspApplySupportMitigation, _uspGetSupportMitigation, _uspReflectThorns, _uspTryWardNegate } from '../skills/universal-spells.js';
import { t } from '../translation/translations.js';
import { _egAimChargingProjectile, _egGetTarget } from './encounter-charged-shot.js';
import { EG_BLOCK_LOCKOUT_BASE_MS, EG_DAMAGE_NUMBER_DURATION_MS } from './encounter-constants.js';
import { _egGameOver, _egKillMonster } from './encounter-kills.js';
import { EG_STAGGER_DURATION_MS } from './encounter-lifecycle.js';
import { _egApplyPlayerBlockFeedback, _egApplyPlayerMissFeedback, _egShowBlockLockoutOverlay } from './encounter-monster-attacks.js';
import { EG_ECHO_DELAY_MS, _egApplyPlayerParryFeedback, _egGetDualWieldParryChancePct, _egGetParryChancePct, _egIsDualWieldParryActive, _egRollFateNegation, _egTryDeflectProjectile } from './encounter-player-attacks.js';
import { _egGetEncounterBaseLevel } from './encounter-spawn-rules.js';
import { _egApplyAilmentShockAmpOnMonster, _egApplyPlayerShockAmp, _egRollMonsterHitAilment, _egRollPlayerHitAilments } from './combat-ailments.js';
import { _egFireProjectile, _egGetElementCentre, _egGetProjectileDef } from './combat-class-projectiles.js';
import { EG_ELEMENTS, _egApplyTargetResistances, _egCalcPlayerResistanceReduction, _egScaleElements } from './combat-calculations.js';
import { _egMaybeShowAbsorptionBroken } from './encounter-overlays.js';
import { _egFlashDamageCard, _egFlashImmune, _egRenderPanel, _egShowDamageNumber, _egSpawnHitBurst, _egUpdateBars } from './encounter.js';
import { _egGetPlayerLevel } from '../endgame/endgame-leveling.js';
import { _egGetActiveMapModValue, _egMapDamageTakenAmpMult } from '../endgame/endgame-map-launch.js';
import { EG_PLAYER_STATS, _egCalcArmourMitigation, _egCalcEvasionDodgeChance, _egComputePlayerStats, _egGetAllEquippedItems, _egScheduleAbsorptionRegen } from '../endgame/endgame-player-stats.js';
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

// Convenience wrapper - damages the currently selected target.
// Kept for any legacy callers that don't pass an explicit id.
export function _egDamageTarget(amount) {
    _egDamageTargetById(globalThis._egTargetId, amount);
}


//------------------------------------------------------------------------
//-------------------DAMAGE APPLICATION-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies stat changes when a hit lands: reduces HP and pushes back charge.
// Gear: pushback adds extra seconds on top of the base charge pushback;
// gear: stagger rolls a chance to pause the charge timer entirely for 1s.
// Pushback is resisted by high-level monsters (50% at L41, 80% at L90) so
// low-level players cannot permanently stall a T11+ monster by spamming.
export function _egApplyHitToMonster(target, amount) {
    const stats = _egComputePlayerStats();
    target.currentHP = Math.max(0, target.currentHP - amount);
    const basePushback = EG_PLAYER_STATS.chargePushback + (stats.pushbackFlat || 0);
    const lvl = Math.max(1, Number(target.level) || 1);
    // High-level monsters resist pushback: linear 1.5s@L1 -> 0.3s@L90
    const resistFactor = Math.max(0.20, 1 - 0.014 * (lvl - 1)); // 0.44@L41, 0.20@L90
    const totalPushback = basePushback * resistFactor;
    target.currentCharge = Math.max(0, target.currentCharge - totalPushback);

    if (stats.staggerPct > 0 && Math.random() * 100 < stats.staggerPct) {
        target.staggeredUntil = Date.now() + EG_STAGGER_DURATION_MS;
        _egShowStatusLabel(target.id, t('eg_staggered'));
    }
}

// Appends a short floating status label (stagger/snipe/...) to a monster card.
export function _egShowStatusLabel(monsterId, text) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;
    const label = document.createElement('div');
    label.className = 'eg-damage-number eg-status-label';
    label.textContent = text;
    // small random jitter so overlapping labels don't perfectly stack
    label.style.marginLeft = `${(Math.random() * 10 - 5).toFixed(1)}px`;
    card.appendChild(label);
    setTimeout(() => label.remove(), EG_DAMAGE_NUMBER_DURATION_MS);
}

// Returns the dominant elemental key for visual choice, or 'physical' when none.
export function _egGetDominantElement(elements) {
    if (!elements) return 'physical';
    let best = 'physical';
    let bestVal = 0;
    EG_ELEMENTS.forEach(el => {
        const v = elements[el] || 0;
        if (v > bestVal) { bestVal = v; best = el; }
    });
    return bestVal > 0 ? best : 'physical';
}

// Applies incoming player damage to a specific monster by id.
// Handles boss immunity, elemental resistances, stat changes, phase
// transitions, and kill detection.
// Called by the projectile onfinish callback so the impact matches visually.
// `elements` optionally maps each element to the elemental share of `amount`.
// `opts.isEcho` marks the delayed echo instance so echoes can't chain into
// further echoes (they still trigger on-hit effects like leech/ailments).
// `opts.isCharged` marks a drag-paint charged shot (or its ricochet chain)
// so overkill always ricochets as a smaller projectile.
export function _egDamageTargetById(monsterId, amount, elements, opts) {
    if (!_egIsActive()) return;

    const target = globalThis._egMonsters.find(m => m.id === monsterId);
    if (!target) return;

    // Boss immunity window - ignore damage and show the immune flash
    if (target.bossImmune) {
        _egFlashImmune(target.id);
        return;
    }

    const hpBefore = target.currentHP;

    // Elemental resistances reduce only the elemental share of the hit;
    // the physical portion passes through untouched. opts carries source
    // tags (isMelee) read by Spellproof inside.
    amount = _egApplyTargetResistances(amount, target, elements, opts);

    // Ailments: shocked monsters take amplified damage; elemental hits can
    // ignite / chill / freeze / shock the monster (gear ailment chances).
    if (typeof _egApplyAilmentShockAmpOnMonster === 'function') {
        amount = _egApplyAilmentShockAmpOnMonster(target, amount);
    }
    if (typeof _egRollPlayerHitAilments === 'function') {
        _egRollPlayerHitAilments(target, amount, elements);
    }

    _egApplyHitToMonster(target, amount);
    // Pass crit + elemental info so the number can pop with the right colour/size
    const isCrit = !!(opts && opts.isCrit);
    _egShowDamageNumber(target.id, amount, isCrit, elements);
    _egFlashDamageCard(target.id);
    _egSpawnHitBurst(target.id, elements, isCrit);

    // Gear: echo (rings) - chance for the hit to repeat as a delayed
    // second instance of echoDamagePct of its damage
    if (!(opts && opts.isEcho)) _egTryEchoHit(target.id, amount, elements, isCrit);

    // Check for boss phase transition before checking death
    if (target.isBoss) globalThis._egBossCheckPhase(target);

    if (target.currentHP <= 0) {
        // Charged overkill ricochet - always fires a smaller projectile
        // carrying the surplus damage to the next monster (chainable).
        const isChargedHit = !!(opts && opts.isCharged);
        if (isChargedHit) {
            _egTryChargedOverkillRicochet(target, amount, hpBefore, elements, opts);
        } else {
            // Gear: overkill - chance for excess damage to bleed into another monster
            _egTryOverkillSpread(target, amount, hpBefore, isCrit, elements);
        }
        _egKillMonster(target.id);
        return;
    }

    _egUpdateBars();
}

// Gear: overkill - on every killing blow with excess damage, transfers the
// surplus to a random other living monster. overkillPct increases the amount
// transferred; it is not a chance to transfer.
export function _egTryOverkillSpread(dyingTarget, appliedDamage, hpBefore, isCrit, elements) {
    const stats = _egComputePlayerStats();
    const overkillPct = Math.max(0, stats.overkillPct || 0);

    const overkill = (hpBefore != null)
        ? Math.round(appliedDamage - hpBefore)
        : Math.round(appliedDamage - dyingTarget.currentHP); // fallback: currentHP clamped at 0
    if (overkill <= 0) return;

    const others = globalThis._egMonsters.filter(m => m.id !== dyingTarget.id && m.currentHP > 0);
    if (!others.length) return;
    const victim = others[Math.floor(Math.random() * others.length)];
    const transferredDamage = Math.round(overkill * (1 + overkillPct / 100));
    _egDamageTargetById(victim.id, transferredDamage, elements, { isCrit: !!isCrit });
}

// Drag-paint charged overkill ricochet - when a charged projectile overkills
// its target, a smaller projectile flies from the dying monster to the next
// living monster dealing the exact overkill amount. Chains if that hit also
// overkills (always triggers, no gear check required).
export const EG_CHARGED_RICOCHET_SCALE = 0.62;

export const EG_CHARGED_RICOCHET_DURATION_MS = 350;

export function _egTryChargedOverkillRicochet(dyingTarget, appliedDamage, hpBefore, elements, opts) {
    const overkill = Math.round(appliedDamage - (hpBefore != null ? hpBefore : 0));
    if (overkill <= 0) return;

    const others = globalThis._egMonsters.filter(m => m.id !== dyingTarget.id && m.currentHP > 0);
    if (!others.length) return;
    const victim = others[Math.floor(Math.random() * others.length)];

    // Scale element share proportionally so resistances still apply correctly
    let ricochetElements = null;
    if (elements && appliedDamage > 0) {
        const factor = overkill / appliedDamage;
        ricochetElements = _egScaleElements(elements, factor);
        // If finalDamage had bonus, elements were for the pre-bonus damage;
        // factor above already approximates; true scaled share is fine for visuals/resist.
    }

    const sourceCard = document.getElementById(`eg-card-${dyingTarget.id}`);
    const targetCard = document.getElementById(`eg-card-${victim.id}`);
    if (sourceCard && targetCard) {
        const start = _egGetElementCentre(sourceCard);
        const end = _egGetElementCentre(targetCard);
        const projDef = _egGetProjectileDef();
        // Build a smaller visual copy of the class projectile
        const cssExtra = 'eg-proj-ricochet';
        _egFireProjectile(projDef, `${projDef.cssClass} ${cssExtra}`, start, end, EG_CHARGED_RICOCHET_DURATION_MS, 'linear', () => {
            const olabel = t('eg_overkill');
            _egShowStatusLabel(victim.id, olabel !== 'eg_overkill' ? olabel : 'Overkill!');
            _egDamageTargetById(victim.id, overkill, ricochetElements, { isCharged: true, isRicochet: true, isCrit: !!(opts && opts.isCrit) });
        }, null, EG_CHARGED_RICOCHET_SCALE);
    } else {
        // No visual path available - apply damage instantly so it is not lost
        _egDamageTargetById(victim.id, overkill, ricochetElements, { isCharged: true, isRicochet: true, isCrit: !!(opts && opts.isCrit) });
    }
}

// Gear: echo (ring suffix) - rolls against echoChancePct and schedules a
// delayed second hit worth echoDamagePct of the original applied damage.
// Echo instances are flagged so they cannot chain into further echoes.
export function _egTryEchoHit(targetId, appliedAmount, elements, isCrit) {
    const stats = _egComputePlayerStats();
    const chance = stats.echoChancePct || 0;
    const dmgPct = stats.echoDamagePct || 0;
    if (chance <= 0 || dmgPct <= 0) return;
    if (!appliedAmount || appliedAmount <= 0) return;
    if (Math.random() * 100 >= chance) return;

    setTimeout(() => {
        if (!_egIsActive()) return;
        const target = globalThis._egMonsters.find(m => m.id === targetId);
        if (!target) return;
        _egShowStatusLabel(targetId, t('eg_echo'));
        _egDamageTargetById(targetId, Math.max(1, Math.round(appliedAmount * dmgPct / 100)), elements, { isEcho: true, isCrit: !!isCrit });
    }, EG_ECHO_DELAY_MS);
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
    // cannot be dodged.
    if (!isSpell && !isBossAbility) {
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
    // special abilities are never blockable.
    const isBlockLockedOut = Date.now() < globalThis._egPlayerBlockLockoutUntil;
    const hasShieldEquipped = _egGetAllEquippedItems()
        .some(item => item.slotType === 'shield');
    const blockChance = (!isBossAbility && !isBlockLockedOut && hasShieldEquipped)
        ? Math.min(75, isSpell ? stats.spellBlockChance : stats.blockChance)
        : 0;
    if (blockChance > 0 && Math.random() * 100 < blockChance) {
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

    // Elemental resistances (fire/cold/lightning/shadow % + flat Arcane
    // Resistance) mitigate elemental hits before armour and absorption.
    if (element) amount = _egCalcPlayerResistanceReduction(amount, stats, element);

    // Ailments: a shocked player takes amplified damage from all hits.
    if (typeof _egApplyPlayerShockAmp === 'function') amount = _egApplyPlayerShockAmp(amount);

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
    if (typeof _egRollMonsterHitAilment === 'function') _egRollMonsterHitAilment(element, mitigated);

    return mitigated;
}
