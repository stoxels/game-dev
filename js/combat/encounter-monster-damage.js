import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _applyAilmentShockAmpOnMonster, _applyImpaleToHit, _chilledColdTakenMult, _applyIntimidateAmp, _rollCrush, _rollIntimidate, _rollPlayerHitAilments } from './combat-ailments-core.js';
import { _fireProjectile, _getElementCentre, _getProjectileDef } from './combat-class-projectiles.js';
import { DAMAGE_ELEMENTS, _applyDamageConversion, _applyTargetResistances, _hasDamageConversion, _scaleElements } from './combat-calculations-resistances.js';
import { DAMAGE_NUMBER_DURATION_MS } from './encounter-constants.js';
import { _killMonster } from './encounter-kills.js';
import { STAGGER_DURATION_MS } from './encounter-lifecycle.js';
import { _flashDamageCard, _flashImmune, _showDamageNumber, _spawnHitBurst, _updateBars } from './encounter.js';
import { PLAYER_STATS, _computePlayerStats } from '../endgame/endgame-player-stats.js';
import { _isActive } from './combat-state.js';
import { startTimerFreeze } from '../timer/timer-freeze.js';
import { _gainFortify, _gainPowerCharge, _gainRage } from './combat-ailments-state.js';

// Player-to-monster damage: target HP/charge/stagger application, elemental
// resistance and ailment hooks, hit visuals, echo/overkill/ricochet procs,
// and the shared floating status-label helper.

// Convenience wrapper - damages the currently selected target.
// Kept for any legacy callers that don't pass an explicit id.
export function _damageTarget(amount) {
    _damageTargetById(globalThis._targetId, amount);
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
// Minimum share of the melee charge-up bar a strike needs for the mace
// stun roll (node 360): 0.9 = 90% charged.
export const MACE_STUN_MIN_CHARGE = 0.9;

// Stun / stagger length in ms, lengthened by "% increased Stun Duration"
// (plus the heavy-weapon line for melee hits made with a two-hander) and
// doubled by the "chance to double Stun Duration" roll.
export function _stunDurationMs(stats, isMeleeHit = false) {
    const s = stats || {};
    let incPct = Math.max(0, Number(s.stunDurationPct) || 0);
    if (isMeleeHit && s.isHeavyWeaponEquipped) incPct += Math.max(0, Number(s.stunDurationHeavyPct) || 0);
    let ms = STAGGER_DURATION_MS * (1 + incPct / 100);
    const doubleChance = Math.min(100, Number(s.stunDoubleChancePct) || 0);
    if (doubleChance > 0 && Math.random() * 100 < doubleChance) ms *= 2;
    return ms;
}

// Share of its maximum Life a melee-killed enemy deals to nearby enemies
// when it explodes (node 20045).
export const MELEE_EXPLODE_LIFE_SHARE = 0.10;

// Melee-kill explosion: physical damage to the other living enemies in the
// victim's spawn zone. Untagged damage (no isMelee), so it can never chain
// into further explosions.
function _meleeKillExplode(dying) {
    const stats = _computePlayerStats();
    const chance = Math.min(100, Number(stats.meleeKillExplodeChancePct) || 0);
    if (!(chance > 0) || Math.random() * 100 >= chance) return;
    const dealt = Math.max(1, Math.round((Number(dying.maxHP) || 0) * MELEE_EXPLODE_LIFE_SHARE));
    const victims = globalThis._monsters.filter(m => m.id !== dying.id && m.zoneId === dying.zoneId && m.currentHP > 0);
    if (!victims.length) return;
    _showStatusLabel(dying.id, t('eg_corpse_explosion'));
    victims.forEach(m => _damageTargetById(m.id, dealt, null, {}));
}

// freeze_timer_on_stun (tree): stunning an enemy pauses the level Timer. A
// short cooldown keeps repeated stuns from pinning the clock.
const STUN_FREEZE_COOLDOWN_MS = 6000;
function _freezeTimerOnStun(stats) {
    const secs = Number(stats && stats.timerFreezeOnStun) || 0;
    const flags = globalThis.LEVEL_FLAGS;
    if (!(secs > 0) || !flags || globalThis.timerFrozen) return false;
    const now = Date.now();
    if (now < (Number(flags.stunFreezeUntil) || 0)) return false;
    flags.stunFreezeUntil = now + secs * 1000 + STUN_FREEZE_COOLDOWN_MS;
    startTimerFreeze(secs * 1000, { overlay: false });
    return true;
}

// Seconds of attack bar one monster can lose per real second (see below).
const PUSHBACK_BUDGET = 0.5;
const PUSHBACK_BUDGET_BOSS = 0.3;
const PUSHBACK_BURST = 1.6;

export function _applyHitToMonster(target, amount, opts) {
    const stats = _computePlayerStats();
    target.currentHP = Math.max(0, target.currentHP - amount);
    const basePushback = PLAYER_STATS.chargePushback + (stats.pushbackFlat || 0);
    const lvl = Math.max(1, Number(target.level) || 1);
    // High-level monsters resist pushback: linear 1.5s@L1 -> 0.3s@L90
    const resistFactor = Math.max(0.20, 1 - 0.014 * (lvl - 1)); // 0.44@L41, 0.20@L90
    // The gauntlet arena scales pushback down (see gauntlet.js) so melee
    // spam cannot keep every monster's attack bar at zero.
    // Only melee strikes (the attack key) push the attack bar back; spells,
    // grid projectiles and aura ticks never do.
    let totalPushback = (opts && opts.isMelee) ? basePushback * resistFactor : 0;
    if (typeof globalThis._gauntletPushback === 'function') totalPushback = globalThis._gauntletPushback(target, totalPushback);
    // Token bucket for every fight: one full hit always lands, but spam
    // (spells, melee taps, aura ticks) can only refill PUSHBACK_* seconds
    // of pushback per real second, so attack bars are slowed, never frozen.
    {
        const now = Date.now();
        const rate = target.isBoss ? PUSHBACK_BUDGET_BOSS : PUSHBACK_BUDGET;
        const last = target._pbAt || now;
        let tokens = target._pbTokens == null ? PUSHBACK_BURST : target._pbTokens;
        tokens = Math.min(PUSHBACK_BURST, tokens + (now - last) / 1000 * rate);
        totalPushback = Math.min(totalPushback, tokens);
        target._pbTokens = tokens - totalPushback;
        target._pbAt = now;
    }
    target.currentCharge = Math.max(0, target.currentCharge - totalPushback);
    if (stats.staggerPct > 0 && Math.random() * 100 < stats.staggerPct) {
        target.staggeredUntil = Date.now() + _stunDurationMs(stats, !!(opts && opts.isMelee));
        _freezeTimerOnStun(stats);
        _showStatusLabel(target.id, t('eg_staggered'));
        Audio_Manager.playSFX('monster_stunned');
    }
}

// Impact sound for a landed player hit: crit beats element, element wins
// when elemental damage is the larger share, otherwise a physical thump.
function _playHitSound(amount, elements, isCrit) {
    if (isCrit) { Audio_Manager.playSFX('hit_crit'); return; }
    let key = 'hit_flesh';
    if (elements) {
        let best = null;
        let sum = 0;
        for (const el of ['fire', 'cold', 'lightning', 'shadow']) {
            const v = Number(elements[el]) || 0;
            sum += v;
            if (v > 0 && (best === null || v > (Number(elements[best]) || 0))) best = el;
        }
        if (best && sum * 2 >= Math.max(1, amount)) key = 'hit_' + best;
    }
    Audio_Manager.playSFX(key);
}

// Appends a short floating status label (stagger/snipe/...) to a monster card.
export function _showStatusLabel(monsterId, text) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;
    const label = document.createElement('div');
    label.className = 'eg-damage-number eg-status-label';
    label.textContent = text;
    // small random jitter so overlapping labels don't perfectly stack
    label.style.marginLeft = `${(Math.random() * 10 - 5).toFixed(1)}px`;
    card.appendChild(label);
    setTimeout(() => label.remove(), DAMAGE_NUMBER_DURATION_MS);
}

// Returns the dominant elemental key for visual choice, or 'physical' when none.
export function _getDominantElement(elements) {
    if (!elements) return 'physical';
    let best = 'physical';
    let bestVal = 0;
    DAMAGE_ELEMENTS.forEach(el => {
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
// so overkill can ricochet as a smaller projectile (gear chance).
export function _damageTargetById(monsterId, amount, elements, opts) {
    if (!_isActive()) return;

    const target = globalThis._monsters.find(m => m.id === monsterId);
    if (!target) return;

    // Boss immunity window - ignore damage and show the immune flash
    if (target.bossImmune) {
        _flashImmune(target.id);
        return;
    }

    if (opts && opts.isPlayerSpell) target._lastSpellHitAt = Date.now();

    const hpBefore = target.currentHP;
    // Crush (node 331) is decided on the state BEFORE the hit: only an
    // enemy that was at full Life when the melee strike landed is crushed.
    const wasFullLife = target.maxHP > 0 && hpBefore >= target.maxHP;

    // Flat player damage that carries no element breakdown (shield bash,
    // reflect, channel release) is physical; the Primal Flame keystone
    // (fire conversion / fire-only) converts or drops it like any other hit.
    if (opts && opts.isPlayerFlat && !elements) {
        const flatStats = _computePlayerStats();
        if (_hasDamageConversion(flatStats) === true) {
            const flat = _applyDamageConversion(flatStats, amount, {});
            elements = flat.elements;
            amount = Math.max(1, Math.round(flat.physical
                + elements.fire + elements.cold + elements.lightning + elements.shadow));
        }
    }

    // Intimidate (node 125): melee hits on an intimidated enemy deal more.
    // Applied before resistances so it scales the whole hit.
    amount = _applyIntimidateAmp(target, amount, opts);

    // Phase C-1 conditional damage (tree): enemies on Low Life (<=35%), recently Shocked an enemy.
    if (opts && (opts.isMelee || opts.isPlayerHit || opts.isPlayerSpell)) {
        const cs = _computePlayerStats();
        let condInc = 0;
        if ((Number(cs.dmgVsLowLifePct) || 0) > 0 && target.maxHP > 0 && hpBefore / target.maxHP <= 0.35) condInc += cs.dmgVsLowLifePct;
        if ((Number(cs.dmgRecentShockPct) || 0) > 0 && Date.now() - (Number(globalThis._lastShockAt) || 0) < 4000) condInc += cs.dmgRecentShockPct;
        if (condInc > 0) amount = Math.max(1, Math.round(amount * (1 + condInc / 100)));
    }

    // Keystone "more" lines: Elemental Overload (after a crit), Pain Attunement (spells
    // on Low Life), Precise Technique (accuracy above max Life), Bitter Frost (chilled).
    if (opts && (opts.isMelee || opts.isPlayerHit || opts.isPlayerSpell)) {
        const ks = _computePlayerStats();
        let kMult = 1;
        const el = elements || {};
        const elemSum = (el.fire || 0) + (el.cold || 0) + (el.lightning || 0) + (el.shadow || 0);
        if ((Number(ks.elementalOverloadPct) || 0) > 0 && elemSum > 0
            && Date.now() - (Number(globalThis._lastCritAt) || 0) < 4000) {
            kMult *= 1 + (ks.elementalOverloadPct / 100) * Math.min(1, elemSum / Math.max(1, amount));
        }
        if (opts.isPlayerSpell && (Number(ks.spellDmgLowLifeMorePct) || 0) > 0 && globalThis.playerMaxHP > 0
            && globalThis.playerCurrentHP <= globalThis.playerMaxHP * 0.35) {
            kMult *= 1 + ks.spellDmgLowLifeMorePct / 100;
        }
        if ((opts.isMelee || opts.isPlayerHit) && (Number(ks.preciseTechniquePct) || 0) > 0
            && (Number(ks.accuracy) || 0) > (Number(globalThis.playerMaxHP) || 0)) {
            kMult *= 1 + ks.preciseTechniquePct / 100;
        }
        if ((Number(ks.chilledColdTaken) || 0) > 0 && (el.cold || 0) > 0) {
            kMult *= _chilledColdTakenMult(target, ks, Math.min(1, (el.cold || 0) / Math.max(1, amount)));
        }
        // Elemental Equilibrium: single-element hits deal more, but enemies resist the
        // element you used last. Overcharge reads the last-attack stamp.
        globalThis._lastPlayerAttackAt = Date.now();
        if ((Number(ks.singleElementMorePct) || 0) > 0 || (Number(ks.lastElementResistPct) || 0) > 0) {
            const used = DAMAGE_ELEMENTS.filter(e => (el[e] || 0) > 0);
            const physShare = Math.max(0, amount - elemSum);
            if (used.length === 1 && physShare <= amount * 0.05) kMult *= 1 + (Number(ks.singleElementMorePct) || 0) / 100;
            const last = globalThis._lastElementUsed;
            if ((Number(ks.lastElementResistPct) || 0) > 0 && last && (el[last] || 0) > 0) {
                kMult *= 1 - (ks.lastElementResistPct / 100) * Math.min(1, (el[last] || 0) / Math.max(1, amount));
            }
            if (used.length) globalThis._lastElementUsed = used.reduce((a, b) => ((el[b] || 0) > (el[a] || 0) ? b : a));
        }
        if (kMult !== 1) amount = Math.max(1, Math.round(amount * kMult));
    }

    // Armour pierce (node 147): per-hit roll to skip the target's physical
    // reduction. Only tagged player hits (melee strikes / primary projectile
    // hits) roll; untagged boss and monster-side damage never does.
    if (opts && (opts.isMelee || opts.isPlayerHit)
        && ((target.resistances && target.resistances.physical) || 0) > 0) {
        const pierce = Math.min(100, Number(_computePlayerStats().ignorePhysReductionPct) || 0);
        if (pierce > 0 && Math.random() * 100 < pierce) opts = Object.assign({}, opts, { ignorePhysReduction: true });
    }

    // Elemental resistances reduce only the elemental share of the hit;
    // the physical portion passes through untouched. opts carries source
    // tags (isMelee) read by Spellproof inside.
    // Penetration (tree lines pen_*): player hits ignore a share of the
    // monster's elemental resistance. Untagged boss / monster damage is untouched.
    if (opts && (opts.isMelee || opts.isPlayerHit || opts.isPlayerSpell)) {
        const penStats = _computePlayerStats();
        const penAll = Number(penStats.penElementalPct) || 0;
        const pen = {
            fire: penAll + (Number(penStats.penFirePct) || 0),
            cold: penAll + (Number(penStats.penColdPct) || 0),
            lightning: penAll + (Number(penStats.penLightningPct) || 0),
            shadow: Number(penStats.penShadowPct) || 0,
        };
        if (pen.fire || pen.cold || pen.lightning || pen.shadow) opts = Object.assign({}, opts, { penetration: pen });
    }
    amount = _applyTargetResistances(amount, target, elements, opts);

    // Ailments: shocked monsters take amplified damage; elemental hits can
    // ignite / chill / freeze / shock the monster (gear ailment chances).
    if (typeof _applyAilmentShockAmpOnMonster === 'function') {
        amount = _applyAilmentShockAmpOnMonster(target, amount);
    }
    if (typeof _rollPlayerHitAilments === 'function') {
        _rollPlayerHitAilments(target, amount, elements, opts);
    }
    // Impale (heavy-weapon batch): any hit on an impaled enemy deals its
    // stored damage on top; a heavy melee hit can impale. Runs after the
    // ailment roll so the extra damage never feeds bleed/ignite sizing.
    if (typeof _applyImpaleToHit === 'function') {
        const impaleBefore = target.impale;
        amount = _applyImpaleToHit(target, amount, elements, opts);
        if (target.impale && target.impale !== impaleBefore) _showStatusLabel(target.id, t('eg_impaled'));
    }

    // Intimidate roll: after the hit's own damage so the hit that
    // intimidates does not benefit from the amp it just caused.
    if (_rollIntimidate(target, opts)) _showStatusLabel(target.id, t('eg_intimidated'));

    // Crush (node 331): applied after the hit, like Intimidate, so the
    // strike that crushes does not benefit from its own debuff.
    if (_rollCrush(target, opts, wasFullLife)) _showStatusLabel(target.id, t('eg_crushed'));

    // Rage (axe notable 369): melee hits while wielding an Axe grant Rage.
    if (opts && opts.isMelee) {
        const rageStats = _computePlayerStats();
        if (rageStats.isAxeEquipped && (rageStats.rageOnHitAxe || 0) > 0) {
            _gainRage(rageStats.rageOnHitAxe, rageStats.rageMax);
        }
        // Mace stun (node 360): a (nearly) fully charged strike with a Mace
        // or Sceptre may stun - the monster's charge timer pauses.
        // Heavy-weapon stun (node 30249): any melee hit with a two-hander.
        // The two rolls are independent; either one stuns.
        const maceStunPct = Math.min(100, Number(rageStats.stunChanceMaceChargedPct) || 0);
        const maceStun = rageStats.isMaceEquipped && maceStunPct > 0
            && (Number(opts.chargePct) || 0) >= MACE_STUN_MIN_CHARGE
            && Math.random() * 100 < maceStunPct;
        const heavyStunPct = Math.min(100, Number(rageStats.stunChanceHeavyPct) || 0);
        const heavyStun = rageStats.isHeavyWeaponEquipped && heavyStunPct > 0
            && Math.random() * 100 < heavyStunPct;
        const genericStunPct = Math.min(100, Number(rageStats.stunChancePct) || 0);
        const genericStun = genericStunPct > 0 && Math.random() * 100 < genericStunPct;
        if (maceStun || heavyStun || genericStun) {
            target.staggeredUntil = Date.now() + _stunDurationMs(rageStats, true);
            _freezeTimerOnStun(rageStats);
            _showStatusLabel(target.id, t('eg_stunned'));
            Audio_Manager.playSFX('monster_stunned');
            // Charges that trigger on a melee stun (Power, Fortify).
            if ((rageStats.powerOnStunPct || 0) > 0 && Math.random() * 100 < Math.min(100, rageStats.powerOnStunPct)) {
                _gainPowerCharge(rageStats.powerChargesMax, rageStats.powerDurationPct);
            }
            if ((rageStats.fortifyOnStunPct || 0) > 0 && Math.random() * 100 < Math.min(100, rageStats.fortifyOnStunPct)) {
                _gainFortify(rageStats.fortifyMax, rageStats.fortifyDurationPct);
            }
        }
    }

    _applyHitToMonster(target, amount, opts);
    if (globalThis.RunStats) globalThis.RunStats.hitDealt(amount, opts);
    // Pass crit + elemental info so the number can pop with the right colour/size
    const isCrit = !!(opts && opts.isCrit);
    _showDamageNumber(target.id, amount, isCrit, elements);
    _flashDamageCard(target.id);
    _spawnHitBurst(target.id, elements, isCrit);
    if (!(opts && opts.uspSfx)) _playHitSound(amount, elements, isCrit);

    // Gear: echo (rings) - chance for the hit to repeat as a delayed
    // second instance of echoDamagePct of its damage
    if (!(opts && opts.isEcho)) _tryEchoHit(target.id, amount, elements, isCrit);

    // Check for boss phase transition before checking death
    if (target.isBoss) globalThis._bossCheckPhase(target);

    if (target.currentHP <= 0) {
        // Charged overkill ricochet - with the gear overkill chance, fires a
        // smaller projectile carrying the surplus to the next monster (chainable).
        const isChargedHit = !!(opts && opts.isCharged);
        if (isChargedHit) {
            _tryChargedOverkillRicochet(target, amount, hpBefore, elements, opts);
        } else {
            // Gear: overkill - chance for excess damage to bleed into another monster
            _tryOverkillSpread(target, amount, hpBefore, isCrit, elements);
        }
        if (opts && opts.isMelee) _meleeKillExplode(target);
        _killMonster(target.id);
        return;
    }

    _updateBars();
}

// Gear: overkill - overkillPct is the % chance that a killing blow's excess
// damage carries over to another monster. Nobody spreads overkill without
// gear; the same roll gates the charged-shot ricochet below.
function _rollOverkillSpread() {
    const chance = Math.min(100, Math.max(0, _computePlayerStats().overkillPct || 0));
    return chance > 0 && Math.random() * 100 < chance;
}

// On a successful roll, transfers the surplus of a killing blow to a random
// other living monster (the exact overkill amount).
export function _tryOverkillSpread(dyingTarget, appliedDamage, hpBefore, isCrit, elements) {
    if (!_rollOverkillSpread()) return;

    const overkill = (hpBefore != null)
        ? Math.round(appliedDamage - hpBefore)
        : Math.round(appliedDamage - dyingTarget.currentHP); // fallback: currentHP clamped at 0
    if (overkill <= 0) return;

    const others = globalThis._monsters.filter(m => m.id !== dyingTarget.id && m.currentHP > 0);
    if (!others.length) return;
    const victim = others[Math.floor(Math.random() * others.length)];
    Audio_Manager.playSFX('overkill_spread');
    _damageTargetById(victim.id, overkill, elements, { isCrit: !!isCrit });
}

// Drag-paint charged overkill ricochet - when a charged projectile overkills
// its target, a smaller projectile flies from the dying monster to the next
// living monster dealing the exact overkill amount. Chains if that hit also
// overkills (each hop rolls the gear overkill chance again).
export const CHARGED_RICOCHET_SCALE = 0.62;

export const CHARGED_RICOCHET_DURATION_MS = 350;

export function _tryChargedOverkillRicochet(dyingTarget, appliedDamage, hpBefore, elements, opts) {
    if (!_rollOverkillSpread()) return;
    const overkill = Math.round(appliedDamage - (hpBefore != null ? hpBefore : 0));
    if (overkill <= 0) return;

    const others = globalThis._monsters.filter(m => m.id !== dyingTarget.id && m.currentHP > 0);
    if (!others.length) return;
    const victim = others[Math.floor(Math.random() * others.length)];

    // Scale element share proportionally so resistances still apply correctly
    let ricochetElements = null;
    if (elements && appliedDamage > 0) {
        const factor = overkill / appliedDamage;
        ricochetElements = _scaleElements(elements, factor);
        // If finalDamage had bonus, elements were for the pre-bonus damage;
        // factor above already approximates; true scaled share is fine for visuals/resist.
    }

    Audio_Manager.playSFX('overkill_spread');
    const sourceCard = document.getElementById(`eg-card-${dyingTarget.id}`);
    const targetCard = document.getElementById(`eg-card-${victim.id}`);
    if (sourceCard && targetCard) {
        const start = _getElementCentre(sourceCard);
        const end = _getElementCentre(targetCard);
        const projDef = _getProjectileDef();
        // Build a smaller visual copy of the class projectile
        const cssExtra = 'eg-proj-ricochet';
        _fireProjectile(projDef, `${projDef.cssClass} ${cssExtra}`, start, end, CHARGED_RICOCHET_DURATION_MS, 'linear', () => {
            const olabel = t('eg_overkill');
            _showStatusLabel(victim.id, olabel !== 'eg_overkill' ? olabel : 'Overkill!');
            _damageTargetById(victim.id, overkill, ricochetElements, { isCharged: true, isRicochet: true, isCrit: !!(opts && opts.isCrit) });
        }, null, CHARGED_RICOCHET_SCALE);
    } else {
        // No visual path available - apply damage instantly so it is not lost
        _damageTargetById(victim.id, overkill, ricochetElements, { isCharged: true, isRicochet: true, isCrit: !!(opts && opts.isCrit) });
    }
}

// Delay before an echo's second instance lands.
export const ECHO_DELAY_MS = 450;

// Gear: echo (ring suffix) - rolls against echoChancePct and schedules a
// delayed second hit worth echoDamagePct of the original applied damage.
// Echo instances are flagged so they cannot chain into further echoes.
export function _tryEchoHit(targetId, appliedAmount, elements, isCrit) {
    const stats = _computePlayerStats();
    const chance = stats.echoChancePct || 0;
    const dmgPct = stats.echoDamagePct || 0;
    if (chance <= 0 || dmgPct <= 0) return;
    if (!appliedAmount || appliedAmount <= 0) return;
    if (Math.random() * 100 >= chance) return;

    setTimeout(() => {
        if (!_isActive()) return;
        const target = globalThis._monsters.find(m => m.id === targetId);
        if (!target) return;
        _showStatusLabel(targetId, t('eg_echo'));
        Audio_Manager.playSFX('echo_hit');
        _damageTargetById(targetId, Math.max(1, Math.round(appliedAmount * dmgPct / 100)), elements, { isEcho: true, isCrit: !!isCrit });
    }, ECHO_DELAY_MS);
}
